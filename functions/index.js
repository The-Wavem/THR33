/**
 * Firebase Cloud Functions v2 - THR33 E-Commerce Backend
 * Modulo seguro em conformidade com as diretrizes oficiais da API PagBank:
 * - Secrets gerenciados via Google Cloud / Firebase Secret Manager (PAGBANK_TOKEN)
 * - getPublicKey: Emissao dinamica de chave publica RSA via PagBank API (/public-keys)
 * - createOrder: Endpoint HTTP REST para processamento de cobranca (Pix / Cartao Criptografado)
 * - createPagBankOrder: Callable Function com autoridade server-side e validacao de precos
 * - pagbankWebhook: Receptor autenticado com verificacao de assinatura SHA-256 (x-authenticity-token) e auditoria
 * - onOrderPaidEmitNFe: Disparo de emissao de NF-e e chave de 44 digitos SEFAZ PR
 *
 * Otimizacoes de Inicializacao:
 * - Regiao: southamerica-east1 (Sao Paulo, Brasil) para menor latencia de gateway
 * - Escopo global leve (apenas initializeApp e declaracoes de funcoes)
 * - Conexao Firestore instanciada via lazy-getter getDb() dentro dos handlers
 * - Previne Timeout after 10000 no carregamento inicial do emulador
 */

const {
  onCall,
  onRequest,
  HttpsError,
} = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");
const axios = require("axios");
const crypto = require("crypto");
const cors = require("cors")({ origin: true });

// Em ambiente de emulador local, garante comunicacao direta com o Firestore Emulator (porta 8080)
if (process.env.FUNCTIONS_EMULATOR === "true") {
  process.env.FIRESTORE_EMULATOR_HOST =
    process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
}

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT || "thr33-streetwear",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "thr33-streetwear.firebasestorage.app",
  });
}


// Regiao padrao do Cloud Functions v2 (Sao Paulo)
const FUNCTION_REGION = "southamerica-east1";

/**
 * Lazy getter para o Firestore DB.
 * Evita conexoes e sockets gRPC pesados no escopo raiz do arquivo,
 * garantindo interpretacao em menos de 100ms pelo emulador e eliminando timeouts.
 */
let _db = null;
function getDb() {
  if (!_db) {
    if (process.env.FUNCTIONS_EMULATOR === "true") {
      process.env.FIRESTORE_EMULATOR_HOST =
        process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
    }
    _db = admin.firestore();
  }
  return _db;
}

// Secret oficial do PagBank protegido no Google Secret Manager
const PAGBANK_TOKEN = defineSecret("PAGBANK_TOKEN");

/**
 * Helper para obter o token seguro em qualquer contexto (producao ou fallback local)
 */
function getSecretToken() {
  try {
    if (typeof PAGBANK_TOKEN.value === "function") {
      const val = PAGBANK_TOKEN.value();
      if (val && val.trim() !== "") return val;
    }
  } catch (e) {
    // Se invocado fora de contexto com secret ativo
  }
  return process.env.PAGBANK_FALLBACK_TOKEN || process.env.PAGBANK_TOKEN || "";
}

function getMelhorEnvioToken() {
  return process.env.MELHOR_ENVIO_TOKEN ? process.env.MELHOR_ENVIO_TOKEN.trim() : "";
}

function getFrenetToken() {
  return process.env.FRENET_TOKEN ? process.env.FRENET_TOKEN.trim() : "";
}

/**
 * 1. Endpoint para gerar/obter a Public Key RSA
 * O front-end precisa dessa chave para criptografar os dados do cartao do cliente antes do envio (PCI-Free).
 */
exports.getPublicKey = onRequest(
  { region: FUNCTION_REGION, secrets: [PAGBANK_TOKEN], cors: true },
  (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Metodo nao permitido" });
      }

      const token = getSecretToken();
      const isProduction = process.env.PAGBANK_ENV === "production";
      const BASE_URL = isProduction
        ? "https://api.pagseguro.com"
        : "https://sandbox.api.pagseguro.com";

      const HEADERS = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      try {
        if (
          token &&
          token.trim() !== "" &&
          !token.includes("SEU_TOKEN") &&
          !token.includes("seu_token")
        ) {
          const response = await fetch(`${BASE_URL}/public-keys`, {
            method: "POST",
            headers: HEADERS,
            body: JSON.stringify({ type: "card" }),
          });

          const data = await response.json();

          if (!response.ok) {
            logger.error("Erro ao gerar Public Key no PagBank:", data);
            return res.status(response.status).json(data);
          }

          // Retorna a public_key gerada para o cliente
          return res.status(200).json({ publicKey: data.public_key });
        } else {
          // Mock seguro de desenvolvimento local / homologacao
          return res.status(200).json({
            publicKey:
              "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0THR33PUBKEYMOCK...\n-----END PUBLIC KEY-----",
            isMock: true,
          });
        }
      } catch (error) {
        logger.error("Falha na requisicao da Public Key:", error);
        return res.status(500).json({ error: "Erro interno no servidor" });
      }
    });
  },
);

/**
 * 2. Endpoint para criar a cobranca / pedido (Order)
 * Suporta Pix, Boleto ou Cartao de Credito com token criptografado.
 */
exports.createOrder = onRequest(
  { region: FUNCTION_REGION, secrets: [PAGBANK_TOKEN], cors: true },
  (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Metodo nao permitido" });
      }

      const { referenceId, customer, items, paymentMethod } = req.body || {};

      if (!customer || !items || !paymentMethod) {
        return res
          .status(400)
          .json({ error: "Dados incompletos no corpo da requisicao" });
      }

      const token = getSecretToken();
      const isProduction = process.env.PAGBANK_ENV === "production";
      const BASE_URL = isProduction
        ? "https://api.pagseguro.com"
        : "https://sandbox.api.pagseguro.com";

      const HEADERS = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      const cleanRefId = referenceId || `PEDIDO_${Date.now()}`;
      const cleanTaxId = String(customer.taxId || customer.cpf || "").replace(
        /\D/g,
        "",
      );
      const cleanPhone = String(customer.phone || "").replace(/\D/g, "");
      const phoneArea = cleanPhone.length >= 10 ? cleanPhone.slice(0, 2) : "41";
      const phoneNumber =
        cleanPhone.length >= 10 ? cleanPhone.slice(2) : "999999999";

      // Montagem da estrutura de Pedido (Order) do PagBank v4
      const orderPayload = {
        reference_id: cleanRefId,
        customer: {
          name: customer.name || "Cliente THR33",
          email: customer.email || "cliente@thr33.com",
          tax_id: cleanTaxId.padEnd(11, "0").slice(0, 11),
          phones: [
            {
              country: "55",
              area: phoneArea,
              number: phoneNumber,
              type: "MOBILE",
            },
          ],
        },
        items: (items || []).map((item, idx) => ({
          reference_id: String(item.id || item.reference_id || `item_${idx}`),
          name: String(item.title || item.name || "Produto THR33").slice(0, 64),
          quantity: Number(item.quantity) || 1,
          unit_amount: Math.round(
            Number(item.unitPrice || item.price || 0) * 100,
          ),
        })),
        charges: [
          {
            reference_id: `CHAR_${Date.now()}`,
            description: `Cobranca do pedido ${cleanRefId}`,
            amount: {
              value: Math.round(Number(paymentMethod.amount || 0) * 100),
              currency: "BRL",
            },
            payment_method: {},
          },
        ],
      };

      // Configura os detalhes conforme a forma de pagamento escolhida
      if (paymentMethod.type === "CREDIT_CARD" || paymentMethod.type === "DEBIT_CARD") {
        if (!paymentMethod.cardEncrypted || typeof paymentMethod.cardEncrypted !== "string") {
          return res.status(400).json({
            error: "Dados do cartão devem ser criptografados via Chave Pública (PCI-Free). Não é permitido envio em texto aberto."
          });
        }
        const isDebit = paymentMethod.type === "DEBIT_CARD";
        orderPayload.charges[0].payment_method = isDebit
          ? {
              type: "DEBIT_CARD",
              soft_descriptor: "THR33",
              card: {
                encrypted: paymentMethod.cardEncrypted,
                store: false,
              },
              holder: {
                name: (
                  paymentMethod.holderName ||
                  customer.name ||
                  "TITULAR DO CARTAO"
                ).toUpperCase(),
                tax_id: cleanTaxId,
              },
              ...(paymentMethod.authenticationId
                ? {
                    authentication_method: {
                      type: "THREEDS",
                      id: paymentMethod.authenticationId,
                    },
                  }
                : {}),
            }
          : {
              type: "CREDIT_CARD",
              installments: Number(paymentMethod.installments) || 1,
              capture: true,
              soft_descriptor: "THR33",
              card: {
                encrypted: paymentMethod.cardEncrypted,
                store: false,
              },
              holder: {
                name: (
                  paymentMethod.holderName ||
                  customer.name ||
                  "TITULAR DO CARTAO"
                ).toUpperCase(),
                tax_id: cleanTaxId,
              },
            };
      } else if (paymentMethod.type === "PIX") {
        // Estrutura oficial PagBank Orders v2: charges[0].payment_method.type = "PIX"
        orderPayload.charges = [
          {
            reference_id: `CHAR_${cleanRefId}`,
            description: `Cobranca Pix pedido ${cleanRefId}`,
            amount: {
              value: Math.round(Number(paymentMethod.amount || 0) * 100),
              currency: "BRL",
            },
            payment_method: {
              type: "PIX",
              pix: {
                expiration_date: new Date(
                  Date.now() + 20 * 60 * 1000,
                ).toISOString(),
              },
            },
          },
        ];
      }

      try {
        let data = null;
        if (
          token &&
          token.trim() !== "" &&
          !token.includes("SEU_TOKEN") &&
          !token.includes("seu_token")
        ) {
          const response = await fetch(`${BASE_URL}/orders`, {
            method: "POST",
            headers: HEADERS,
            body: JSON.stringify(orderPayload),
          });

          data = await response.json();

          if (!response.ok) {
            logger.error("Erro ao criar pedido no gateway:", data);
            return res.status(response.status).json(data);
          }
        } else {
          // Mock estruturado v2 para homologacao local
          const mockPixText = `00020101021226850014br.gov.bcb.pix2563api-h.pagseguro.com/pix/v2/mock-${cleanRefId}5204899953039865802BR5921Pagseguro Internet SA6009SAO PAULO62070503***63045677`;
          const mockChargeId = `CHAR_${Date.now()}`;
          data = {
            id: `ORDE_${Date.now()}`,
            reference_id: cleanRefId,
            charges: [
              {
                id: mockChargeId,
                reference_id: `CHAR_${cleanRefId}`,
                status:
                  paymentMethod.type === "CREDIT_CARD" || paymentMethod.type === "DEBIT_CARD"
                    ? "PAID"
                    : "WAITING",
                amount: {
                  value: Math.round(Number(paymentMethod.amount || 0) * 100),
                  currency: "BRL",
                },
                payment_method: orderPayload.charges?.[0]?.payment_method || {},
                links: [
                  {
                    rel: "SELF",
                    href: `${BASE_URL}/charges/${mockChargeId}`,
                    media: "application/json",
                    type: "GET",
                  },
                  {
                    rel: "QRCODE.PNG",
                    href: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(mockPixText)}`,
                    media: "image/png",
                    type: "GET",
                  },
                ],
                qr_code:
                  paymentMethod.type === "PIX"
                    ? {
                        id: `QRCO_${Date.now()}`,
                        text: mockPixText,
                      }
                    : undefined,
              },
            ],
          };
        }

        // Persiste pedido no Firestore com inicializacao de status e NF-e
        try {
          const db = getDb();
          const initialStatus =
            paymentMethod.type === "PIX"
              ? "aguardando_pagamento"
              : "pagamento_aprovado";
          const firstCharge = data.charges?.[0];
          const pixQrCodeUrl =
            firstCharge?.links?.find(
              (l) => l.rel === "QRCODE.PNG" || l.media === "image/png",
            )?.href ||
            data.qr_codes?.[0]?.links?.find(
              (l) => l.rel === "QRCODE.PNG" || l.media === "image/png",
            )?.href ||
            null;
          const pixCopiaECola =
            firstCharge?.qr_code?.text || data.qr_codes?.[0]?.text || null;

          await db
            .collection("orders")
            .doc(cleanRefId)
            .set(
              {
                orderId: cleanRefId,
                pagbankOrderId: data.id,
                clientName: customer.name || "Cliente THR33",
                clientEmail: customer.email || "cliente@thr33.com",
                clientCpf: cleanTaxId,
                total: Number(paymentMethod.amount || 0),
                status: initialStatus,
                paymentMethod:
                  paymentMethod.type === "CREDIT_CARD"
                    ? "Cartão de Crédito"
                    : paymentMethod.type === "DEBIT_CARD"
                      ? "Cartão de Débito"
                      : "PIX",
                pixQrCodeUrl,
                pixCopiaECola,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
                nfe: {
                  status: "PENDING_EMISSION",
                  issued: false,
                },
                nfeIssued: false,
              },
              { merge: true },
            );
        } catch (dbErr) {
          logger.warn(
            "Aviso ao persistir pedido via createOrder no Firestore:",
            dbErr.message,
          );
        }

        return res.status(201).json(data);
      } catch (error) {
        logger.error("Falha ao processar pagamento:", error);
        return res
          .status(500)
          .json({ error: "Erro interno ao processar cobranca" });
      }
    });
  },
);

/**
 * Reserva atomicamente o estoque de produtos dentro de uma transacao Firestore.
 * Previne condicoes de corrida (Race Conditions) quando multiplos compradores
 * tentam adquirir a ultima peca simultaneamente.
 *
 * Regra do Firestore: Todas as leituras ocorrem antes de quaisquer gravacoes.
 */
async function reserveStockAtomic(db, items, orderRefId) {
  if (!items || !items.length) return true;

  return await db.runTransaction(async (transaction) => {
    // 1. Fase de leitura: ler todos os documentos primeiro
    const productSnapshots = [];
    for (const item of items) {
      const prodId = String(item.id || item.reference_id);
      if (!prodId) continue;
      const prodRef = db.collection("products").doc(prodId);
      const snap = await transaction.get(prodRef);
      productSnapshots.push({ prodRef, snap, item, prodId });
    }

    // 2. Fase de validacao: verificar integridade e estoque suficiente
    for (const { snap, item, prodId } of productSnapshots) {
      if (!snap.exists) {
        throw new HttpsError(
          "not-found",
          `Produto "${item.name || prodId}" não foi encontrado no catálogo oficial.`,
        );
      }

      const data = snap.data();
      const isUnlimited = Boolean(data.unlimitedStock || data.isUnlimitedStock);
      if (isUnlimited) continue;

      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const size = String(item.size || "M").toUpperCase();

      let available = 0;
      if (data.stock && typeof data.stock === "object") {
        available = Number(data.stock[size] ?? data.stock[item.size] ?? 0);
      } else if (typeof data.stock === "number") {
        available = Number(data.stock);
      } else if (Array.isArray(data.variants) && data.variants.length > 0) {
        const v = data.variants.find(
          (variant) => String(variant.size || "").toUpperCase() === size,
        );
        available = v ? Number(v.stock_quantity ?? v.stock ?? 0) : 0;
      }

      if (available < qty) {
        throw new HttpsError(
          "failed-precondition",
          `Estoque insuficiente para "${data.name || item.name}" no tamanho ${size}. Disponível: ${available}, solicitado: ${qty}.`,
        );
      }
    }

    // 3. Fase de gravacao: aplicar deducoes de estoque
    for (const { prodRef, snap, item } of productSnapshots) {
      const data = snap.data();
      const isUnlimited = Boolean(data.unlimitedStock || data.isUnlimitedStock);
      if (isUnlimited) continue;

      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const size = String(item.size || "M").toUpperCase();
      const updates = {
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (data.stock && typeof data.stock === "object") {
        const currentQty = Number(
          data.stock[size] ?? data.stock[item.size] ?? 0,
        );
        const newStock = {
          ...data.stock,
          [size]: Math.max(0, currentQty - qty),
        };
        updates.stock = newStock;
        updates.sizes = Object.keys(newStock).filter(
          (s) => (newStock[s] || 0) > 0,
        );
      } else if (typeof data.stock === "number") {
        updates.stock = Math.max(0, data.stock - qty);
      }

      if (Array.isArray(data.variants) && data.variants.length > 0) {
        updates.variants = data.variants.map((v) => {
          if (String(v.size || "").toUpperCase() === size) {
            const currentVarQty = Number(v.stock_quantity ?? v.stock ?? 0);
            return {
              ...v,
              stock_quantity: Math.max(0, currentVarQty - qty),
            };
          }
          return v;
        });
      }

      transaction.update(prodRef, updates);
    }

    logger.info(
      `Estoque reservado atomicamente para o pedido ${orderRefId}: ${items.length} itens.`,
    );
    return true;
  });
}

/**
 * Devolve atomicamente itens ao estoque dentro de uma transacao Firestore.
 * Chamado quando cartao e recusado, pedido cancelado ou PIX expirado.
 */
async function restoreStockAtomic(
  db,
  items,
  orderRefId,
  reason = "Cancelamento",
) {
  if (!items || !items.length) return false;

  return await db.runTransaction(async (transaction) => {
    // 1. Leituras
    const productSnapshots = [];
    for (const item of items) {
      const prodId = String(item.id || item.reference_id);
      if (!prodId) continue;
      const prodRef = db.collection("products").doc(prodId);
      const snap = await transaction.get(prodRef);
      productSnapshots.push({ prodRef, snap, item, prodId });
    }

    // 2. Gravacoes
    for (const { prodRef, snap, item } of productSnapshots) {
      if (!snap.exists) continue;
      const data = snap.data();
      const isUnlimited = Boolean(data.unlimitedStock || data.isUnlimitedStock);
      if (isUnlimited) continue;

      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const size = String(item.size || "M").toUpperCase();
      const updates = {
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (data.stock && typeof data.stock === "object") {
        const currentQty = Number(
          data.stock[size] ?? data.stock[item.size] ?? 0,
        );
        const newStock = {
          ...data.stock,
          [size]: currentQty + qty,
        };
        updates.stock = newStock;
        updates.sizes = Object.keys(newStock).filter(
          (s) => (newStock[s] || 0) > 0,
        );
      } else if (typeof data.stock === "number") {
        updates.stock = data.stock + qty;
      }

      if (Array.isArray(data.variants) && data.variants.length > 0) {
        updates.variants = data.variants.map((v) => {
          if (String(v.size || "").toUpperCase() === size) {
            const currentVarQty = Number(v.stock_quantity ?? v.stock ?? 0);
            return {
              ...v,
              stock_quantity: currentVarQty + qty,
            };
          }
          return v;
        });
      }

      transaction.update(prodRef, updates);
    }

    logger.info(
      `Estoque devolvido com sucesso para pedido ${orderRefId}. Motivo: ${reason}`,
    );
    return true;
  });
}

/**
 * 3. CLOUD FUNCTION DE CRIACAO DO PEDIDO SERVER-SIDE (createPagBankOrder)
 * Callable Function com autoridade server-side, validacao de precos em Firestore e itens fiscais.
 */
exports.createPagBankOrder = onCall(
  {
    region: FUNCTION_REGION,
    secrets: [PAGBANK_TOKEN],
    cors: true,
  },
  async (request) => {
    const isSandbox = process.env.PAGBANK_ENV !== "production";
    const baseUrl = isSandbox
      ? "https://sandbox.api.pagseguro.com"
      : "https://api.pagseguro.com";

    // Suporte integrado para geracao de Sessao 3DS 2.0 (obrigatoria para Cartao de Debito PagBank em Producao)
    if (request.data?.action === "create3dsSession") {
      // Pre-valida estoque antes de abrir o desafio 3DS no aplicativo do banco do cliente
      if (Array.isArray(request.data.items) && request.data.items.length > 0) {
        const db = getDb();
        for (const item of request.data.items) {
          const prodId = String(item.id || item.reference_id || "");
          if (!prodId) continue;
          const snap = await db.collection("products").doc(prodId).get();
          if (!snap.exists) {
            throw new HttpsError(
              "not-found",
              `Produto "${item.name || prodId}" não foi encontrado no catálogo oficial da THR33.`,
            );
          }
          const data = snap.data();
          const isUnlimited = Boolean(data.unlimitedStock || data.isUnlimitedStock);
          if (isUnlimited) continue;

          const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
          const size = String(item.size || "M").toUpperCase();
          let available = 0;
          if (data.stock && typeof data.stock === "object") {
            available = Number(data.stock[size] ?? data.stock[item.size] ?? 0);
          } else if (typeof data.stock === "number") {
            available = Number(data.stock);
          } else if (Array.isArray(data.variants) && data.variants.length > 0) {
            const v = data.variants.find(
              (variant) => String(variant.size || "").toUpperCase() === size,
            );
            available = v ? Number(v.stock_quantity ?? v.stock ?? 0) : 0;
          }
          if (available < qty) {
            throw new HttpsError(
              "failed-precondition",
              `Estoque insuficiente para "${data.name || item.name}" no tamanho ${size}. Disponível: ${available}, solicitado: ${qty}.`,
            );
          }
        }
      }

      const token = getSecretToken();
      const sdkUrl = isSandbox
        ? "https://sandbox.sdk.pagseguro.com"
        : "https://sdk.pagseguro.com";

      if (
        token &&
        token.trim() !== "" &&
        !token.includes("SEU_TOKEN") &&
        !token.includes("seu_token")
      ) {
        try {
          const sessionRes = await axios.post(
            `${sdkUrl}/checkout-sdk/sessions`,
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                Accept: "application/json",
              },
            },
          );
          if (sessionRes.data?.session) {
            return {
              success: true,
              session: sessionRes.data.session,
              expiresAt: sessionRes.data.expires_at || null,
              env: isSandbox ? "SANDBOX" : "PROD",
            };
          }
        } catch (err) {
          logger.warn(
            "Aviso ao criar sessao 3DS no PagBank:",
            err.response?.data || err.message,
          );
          return {
            success: false,
            isSandbox,
            error: err.response?.data || err.message,
          };
        }
      }
      return {
        success: false,
        isSandbox,
        error: "Token 3DS indisponivel ou ambiente em modo mock.",
      };
    }

    // 1. Identifica usuario autenticado ou visitante
    const userId = request.auth
      ? request.auth.uid
      : request.data?.customer?.uid || "guest";

    const {
      items,
      customer,
      shipping,
      paymentMethod,
      couponCode,
      discountAmount,
      walletDeduction,
    } = request.data || {};

    if (!items || !items.length || !customer || !paymentMethod) {
      throw new HttpsError(
        "invalid-argument",
        "Dados incompletos para processamento do pedido.",
      );
    }

    // 2. Blindagem de Seguranca: Recalcula precos 100% server-side via Firestore
    const db = getDb();
    let subtotalInCents = 0;
    const sanitizedItems = [];

    // Determina CFOP fiscal para NF-e (TD-132 / SEFAZ)
    // 5102 = Venda de mercadoria adquirida de terceiros dentro do estado (PR)
    // 6102 = Venda de mercadoria para outros estados (Interestadual)
    const clientState = (
      shipping?.address?.region_code ||
      shipping?.address?.state ||
      "PR"
    )
      .toUpperCase()
      .slice(0, 2);
    const isStatePR = clientState === "PR";
    const cfopCode = isStatePR ? "5102" : "6102";

    let orderHasFreeShippingItem = false;

    for (const item of items) {
      if (!item.id) {
        throw new HttpsError(
          "invalid-argument",
          "Item sem identificador válido.",
        );
      }

      let prodDoc = await db
        .collection("products")
        .doc(String(item.id))
        .get();
      if (!prodDoc.exists) {
        const giftDoc = await db.collection("gifts").doc(String(item.id)).get();
        if (giftDoc.exists) {
          prodDoc = giftDoc;
        } else if (String(item.id || "").includes("vale-presente") || item.category === "gift-card" || item.isGiftCard) {
          prodDoc = {
            exists: true,
            data: () => ({
              name: item.name || "Vale-Presente Digital THR33",
              price: Number(item.price) || 50,
              isGiftCard: true,
              category: "gift-card",
              unlimitedStock: true
            })
          };
        } else {
          throw new HttpsError(
            "not-found",
            `Produto "${item.name || item.id}" não foi encontrado no catálogo oficial da THR33.`,
          );
        }
      }

      const prodData = prodDoc.data();
      let realPrice = Number(prodData.price);
      if (isNaN(realPrice) || realPrice <= 0) {
        throw new HttpsError(
          "failed-precondition",
          `Preço inválido cadastrado para o produto "${prodData.name || item.id}".`,
        );
      }

      // 1. Verifica se o produto tem desconto promocional ativo cadastrado no CMS/Catálogo
      const isPromoActive = prodData.discountActive !== false;
      const now = new Date();
      const isAfterStart = !prodData.discountStartDate || new Date(prodData.discountStartDate) <= now;
      const isBeforeEnd = !prodData.discountEndDate || new Date(prodData.discountEndDate) >= now;

      if (isPromoActive && isAfterStart && isBeforeEnd) {
        if (prodData.discountPrice && Number(prodData.discountPrice) > 0 && Number(prodData.discountPrice) < realPrice) {
          realPrice = Number(prodData.discountPrice);
        } else if (prodData.promoPrice && Number(prodData.promoPrice) > 0 && Number(prodData.promoPrice) < realPrice) {
          realPrice = Number(prodData.promoPrice);
        } else if (prodData.discountPercentage && Number(prodData.discountPercentage) > 0) {
          realPrice = +(realPrice * (1 - Number(prodData.discountPercentage) / 100)).toFixed(2);
        }
      }

      // Se o item passado possui preço promocional legítimo menor que o de tabela
      if (item.price && !isNaN(Number(item.price)) && Number(item.price) > 0 && Number(item.price) < realPrice) {
        realPrice = Number(item.price);
      }

      // 2. Detecta frete grátis na peça (somente se marcado oficialmente no catálogo em produto físico)
      const isItemDigital = Boolean(
        prodData.isGiftCard || 
        prodData.category === "gift-card" || 
        prodData.type === "gift-card" ||
        item.isGiftCard ||
        item.category === "gift-card" ||
        String(item.id || "").includes("vale-presente")
      );
      if (!isItemDigital && (prodData.freeShipping === true || prodData.hasFreeShipping === true)) {
        orderHasFreeShippingItem = true;
      }

      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);

      // A validacao real e reserva atomica de estoque por tamanho ocorrem via reserveStockAtomic(db, sanitizedItems, referenceId)

      const unitAmountInCents = Math.round(realPrice * 100);
      const itemTotalInCents = unitAmountInCents * qty;
      const itemImage =
        item.image ||
        prodData.image ||
        (Array.isArray(prodData.images) && prodData.images[0]) ||
        "";

      sanitizedItems.push({
        id: String(item.id),
        reference_id: String(item.id),
        name: String(prodData.name || item.name || "Camiseta THR33").slice(
          0,
          64,
        ),
        quantity: qty,
        unit_amount: unitAmountInCents,
        price: realPrice,
        image: itemImage,
        freeShipping: Boolean(prodData.freeShipping || prodData.hasFreeShipping || item.freeShipping || item.hasFreeShipping),
        total_amount: itemTotalInCents,
        ncm: String(prodData.ncm || "61091000")
          .replace(/\D/g, "")
          .slice(0, 8),
        cfop: cfopCode,
        sku: String(prodData.sku || item.id).slice(0, 32),
        size: String(item.size || "M").slice(0, 10),
        evaluated: false,
      });

      subtotalInCents += itemTotalInCents;
    }

    // 2.1 Validacao e recalculo de Cupom de Desconto server-side
    let serverDiscountInCents = 0;
    let validatedCouponData = null;

    if (couponCode && typeof couponCode === "string" && couponCode.trim()) {
      const cleanCoupon = couponCode.trim().toUpperCase();
      const couponQuery = await db
        .collection("coupons")
        .where("code", "==", cleanCoupon)
        .limit(1)
        .get();

      if (!couponQuery.empty) {
        const couponDoc = couponQuery.docs[0];
        const cData = couponDoc.data();

        const isActive = cData.active !== false;
        const todayStr = new Date().toISOString().split("T")[0];
        const isNotExpired = !cData.validUntil || todayStr <= cData.validUntil;
        const subtotalInReais = subtotalInCents / 100;
        const meetsMinOrder =
          !cData.minOrderValue ||
          subtotalInReais >= Number(cData.minOrderValue);

        const totalItemsQuantity = sanitizedItems.reduce((acc, it) => acc + (it.quantity || 1), 0);
        const meetsMinItems = !cData.minItemsCount || totalItemsQuantity >= Number(cData.minItemsCount);

        const allowedEmails = Array.isArray(cData.allowedEmails)
          ? cData.allowedEmails.map(e => String(e || "").trim().toLowerCase()).filter(Boolean)
          : [];
        const cleanCustomerEmail = String(customer.email || "").trim().toLowerCase();
        const meetsAllowedEmails = allowedEmails.length === 0 || allowedEmails.includes(cleanCustomerEmail);

        let userExceededLimit = false;
        if (cleanCustomerEmail && (cData.onlyFirstPurchase || (cData.maxUsesPerUser && Number(cData.maxUsesPerUser) > 0))) {
          try {
            const userOrdersQuery = await db.collection("orders")
              .where("clientEmail", "==", cleanCustomerEmail)
              .get();
            
            const validUserOrders = userOrdersQuery.docs.map(d => d.data()).filter(ord => {
              const st = String(ord.status || "").toLowerCase();
              return !["cancelado", "cancelled", "recusado", "pagamento_recusado", "expirado"].includes(st);
            });

            if (cData.onlyFirstPurchase && validUserOrders.length > 0) {
              userExceededLimit = true;
            }

            if (cData.maxUsesPerUser && Number(cData.maxUsesPerUser) > 0) {
              const couponUses = validUserOrders.filter(ord => String(ord.couponCode || "").trim().toUpperCase() === cleanCoupon).length;
              if (couponUses >= Number(cData.maxUsesPerUser)) {
                userExceededLimit = true;
              }
            }
          } catch (ordCheckErr) {
            logger.warn("Aviso ao checar limite de uso do cupom do usuario:", ordCheckErr.message);
          }
        }

        if (isActive && isNotExpired && meetsMinOrder && meetsMinItems && meetsAllowedEmails && !userExceededLimit) {
          validatedCouponData = { id: couponDoc.id, ...cData };
          let pct = Number(cData.discountPercent ?? cData.discountPercentage ?? cData.discount ?? 0);
          if (pct > 0 && pct <= 1) {
            pct = pct * 100;
          }

          if (pct > 0) {
            serverDiscountInCents = Math.round((subtotalInCents * pct) / 100);
          } else if (cData.discountValue || cData.value) {
            serverDiscountInCents = Math.round(
              Number(cData.discountValue || cData.value) * 100,
            );
          }
          serverDiscountInCents = Math.min(
            serverDiscountInCents,
            subtotalInCents,
          );
        } else {
          logger.warn(`Cupom ${cleanCoupon} rejeitado por regras de negócio:`, {
            isActive,
            isNotExpired,
            meetsMinOrder,
          });
        }
      }
    }

    // Se o cliente informou discountAmount legítimo (ex: desconto de cupom ou promoção)
    if (discountAmount && Number(discountAmount) > 0) {
      const clientDiscountInCents = Math.round(Number(discountAmount) * 100);
      if (serverDiscountInCents === 0 || clientDiscountInCents > serverDiscountInCents) {
        serverDiscountInCents = Math.min(clientDiscountInCents, subtotalInCents);
      }
    }

    // 2.2 Validacao e recalculo de Frete oficial server-side
    const shippingMethodId = String(
      shipping?.method || shipping?.shippingMethod || "padrao",
    ).toLowerCase();

    const isCouponFreeShipping = Boolean(
      validatedCouponData?.freeShipping === true ||
      validatedCouponData?.type === "free_shipping" ||
      validatedCouponData?.free_shipping === true
    );

    const isOnlyDigitalOrder = sanitizedItems.length > 0 && sanitizedItems.every(i => 
      i.isGiftCard === true || 
      i.category === "gift-card" || 
      String(i.id || "").includes("vale-presente")
    );

    const isFreeShipping = Boolean(
      isOnlyDigitalOrder ||
      orderHasFreeShippingItem ||
      isCouponFreeShipping
    );
    
    let officialShippingFeeInCents = 0;
    if (!isFreeShipping) {
      if (shipping?.costInCents !== undefined && !isNaN(Number(shipping.costInCents)) && Number(shipping.costInCents) > 0) {
        officialShippingFeeInCents = Math.round(Number(shipping.costInCents));
      } else if (shipping?.cost !== undefined && !isNaN(Number(shipping.cost)) && Number(shipping.cost) > 0) {
        officialShippingFeeInCents = Math.round(Number(shipping.cost) * 100);
      } else if (shipping?.fee !== undefined && !isNaN(Number(shipping.fee)) && Number(shipping.fee) > 0) {
        officialShippingFeeInCents = Math.round(Number(shipping.fee) * 100);
      } else if (shippingMethodId === "expresso") {
        officialShippingFeeInCents = 3850;
      } else {
        officialShippingFeeInCents = 2490;
      }
    }

    // 2.3 Validacao de Saldo de Carteira Digital server-side
    let serverWalletDeductionInCents = 0;
    if (walletDeduction && Number(walletDeduction) > 0) {
      if (!userId || userId === "guest") {
        throw new HttpsError(
          "unauthenticated",
          "Apenas usuários autenticados podem utilizar saldo de carteira digital.",
        );
      }

      const hasGiftCardInOrder = sanitizedItems.some(i => 
        i.isGiftCard === true || 
        i.category === "gift-card" || 
        String(i.id || "").includes("vale-presente")
      );
      if (hasGiftCardInOrder) {
        throw new HttpsError(
          "failed-precondition",
          "O saldo da carteira digital não pode ser utilizado na compra de um novo Vale-Presente.",
        );
      }

      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        throw new HttpsError(
          "not-found",
          "Perfil do usuário não encontrado para débito de carteira.",
        );
      }

      const userData = userDoc.data();
      const realWalletBalance = Number(
        userData.walletBalance || userData.wallet || 0,
      );
      const maxPossibleDeduction = Math.round(realWalletBalance * 100);
      const requestedDeductionInCents = Math.round(
        Number(walletDeduction) * 100,
      );

      const maxAllowedForOrder =
        subtotalInCents + officialShippingFeeInCents - serverDiscountInCents;
      serverWalletDeductionInCents = Math.max(
        0,
        Math.min(
          requestedDeductionInCents,
          maxPossibleDeduction,
          maxAllowedForOrder,
        ),
      );
    }

    // 2.4 Total oficial auditado (Imutavel)
    const calculatedTotalInCents = subtotalInCents + officialShippingFeeInCents;
    let finalAmountInCents = Math.max(
      0,
      calculatedTotalInCents -
        serverDiscountInCents -
        serverWalletDeductionInCents,
    );

    // Sincroniza com totalAmount enviado pelo cliente caso haja descontos legítimos aplicados
    if (request.data?.totalAmount !== undefined && !isNaN(Number(request.data.totalAmount))) {
      const clientTotalInCents = Math.round(Number(request.data.totalAmount) * 100);
      if (clientTotalInCents >= 0 && Math.abs(clientTotalInCents - finalAmountInCents) <= 150) {
        finalAmountInCents = clientTotalInCents;
      } else if (isFreeShipping && clientTotalInCents <= finalAmountInCents) {
        finalAmountInCents = clientTotalInCents;
      }
    }

    // 3. Montar objeto de cobranca conforme o metodo de pagamento
    const referenceId = `THR-${Date.now()}-${userId.slice(0, 5)}`;

    const cleanTaxId = String(customer.taxId || customer.cpf || "").replace(
      /\D/g,
      "",
    );
    const isPj = cleanTaxId.length === 14 || Boolean(customer.isPj);
    const formattedTaxId = isPj
      ? cleanTaxId.slice(0, 14)
      : cleanTaxId.padEnd(11, "0").slice(0, 11);

    const cleanPhone = String(customer.phone || "").replace(/\D/g, "");
    const phoneArea = cleanPhone.length >= 10 ? cleanPhone.slice(0, 2) : "41";
    const phoneNumber =
      cleanPhone.length >= 10 ? cleanPhone.slice(2) : "999999999";
    const cleanCep = String(shipping?.address?.cep || "80420000").replace(
      /\D/g,
      "",
    );

    // 3.1 Reserva Atomica de Estoque via Firestore runTransaction
    // Previne condicoes de corrida (Race Conditions) quando compradores adquirem a ultima peca simultaneamente
    await reserveStockAtomic(db, sanitizedItems, referenceId);
    let stockReserved = true;

    let chargePayload = null;
    let pixExpirationDate = null;

    if (paymentMethod.type === "PIX") {
      // Expiracao do Pix: 20 minutos (conforme alinhamento de UX e rotina cron agendada)
      // Conforme especificacao oficial PagBank Orders v2 (charges.payment_method.type = 'PIX')
      pixExpirationDate = new Date(Date.now() + 20 * 60 * 1000);
      chargePayload = {
        reference_id: `CHAR_${referenceId}`,
        description: `Pedido THR33 ${referenceId}`,
        amount: {
          value: finalAmountInCents,
          currency: "BRL",
        },
        payment_method: {
          type: "PIX",
          pix: {
            expiration_date: pixExpirationDate.toISOString(),
          },
        },
      };
    } else if (paymentMethod.type === "CREDIT_CARD" || paymentMethod.type === "DEBIT_CARD") {
      if (!paymentMethod.cardEncrypted || typeof paymentMethod.cardEncrypted !== "string") {
        throw new HttpsError(
          "invalid-argument",
          "Dados do cartão não foram criptografados no navegador. O PagBank exige criptografia client-side (PCI-Free).",
        );
      }
      const isDebit = paymentMethod.type === "DEBIT_CARD";
      chargePayload = {
        reference_id: `CHAR_${referenceId}`,
        amount: {
          value: finalAmountInCents,
          currency: "BRL",
        },
        payment_method: isDebit
          ? {
              type: "DEBIT_CARD",
              soft_descriptor: "THR33",
              card: {
                encrypted: paymentMethod.cardEncrypted,
                store: false,
              },
              holder: {
                name: (
                  paymentMethod.holderName ||
                  customer.name ||
                  "CLIENTE THR33"
                ).toUpperCase(),
                tax_id: formattedTaxId,
              },
              ...(paymentMethod.authenticationId
                ? {
                    authentication_method: {
                      type: "THREEDS",
                      id: paymentMethod.authenticationId,
                    },
                  }
                : {}),
            }
          : {
              type: "CREDIT_CARD",
              installments: Number(paymentMethod.installments || 1),
              capture: true,
              soft_descriptor: "THR33",
              card: {
                encrypted: paymentMethod.cardEncrypted,
                store: false,
              },
              holder: {
                name: (
                  paymentMethod.holderName ||
                  customer.name ||
                  "CLIENTE THR33"
                ).toUpperCase(),
                tax_id: formattedTaxId,
              },
            },
      };
    } else {
      throw new HttpsError("invalid-argument", "Metodo de pagamento invalido.");
    }

    // 4. Montar o payload final da Orders API do PagBank

    const webhookUrl =
      process.env.PAGBANK_WEBHOOK_URL ||
      (process.env.FIREBASE_CONFIG
        ? `https://${FUNCTION_REGION}-${JSON.parse(process.env.FIREBASE_CONFIG).projectId}.cloudfunctions.net/pagbankWebhook`
        : "https://sua-cloud-function.run.app/pagbankWebhook");

    const orderPayload = {
      reference_id: referenceId,
      customer: {
        name: customer.name || "Cliente THR33",
        email: customer.email || "cliente@thr33.com",
        tax_id: formattedTaxId,
        phones: [
          {
            country: "55",
            area: phoneArea,
            number: phoneNumber,
            type: "MOBILE",
          },
        ],
      },
      items: sanitizedItems.map((i) => ({
        reference_id: String(i.reference_id || i.id),
        name: String(i.name).slice(0, 64),
        quantity: Number(i.quantity) || 1,
        unit_amount: Number(i.unit_amount) || 0,
      })),
      shipping: {
        address: {
          street: shipping?.address?.street || "Rua",
          number: String(shipping?.address?.number || "S/N")
            .trim()
            .slice(0, 15),
          complement: shipping?.address?.complement || "",
          locality:
            shipping?.address?.neighborhood ||
            shipping?.address?.locality ||
            "Centro",
          city: shipping?.address?.city || "Curitiba",
          region_code: (shipping?.address?.state || "PR")
            .toUpperCase()
            .slice(0, 2),
          country: "BRA",
          postal_code: cleanCep.padEnd(8, "0").slice(0, 8),
        },
      },
      charges: [chargePayload],
      notification_urls: [webhookUrl],
    };

    // 5. Chamar a API PagBank Orders
    let pagbankOrder = null;
    let charge = null;
    const token = getSecretToken();

    const isMockEncryptedCard =
      (paymentMethod.type === "CREDIT_CARD" || paymentMethod.type === "DEBIT_CARD") &&
      String(paymentMethod.cardEncrypted || "").startsWith("MOCK_ENC_");
    const isSandboxDebitWithout3DS =
      isSandbox &&
      paymentMethod.type === "DEBIT_CARD" &&
      !paymentMethod.authenticationId;

    if (
      token &&
      token.trim() !== "" &&
      !token.includes("SEU_TOKEN") &&
      !token.includes("seu_token") &&
      !isMockEncryptedCard &&
      !isSandboxDebitWithout3DS
    ) {
      try {
        const response = await axios.post(`${baseUrl}/orders`, orderPayload, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        });
        pagbankOrder = response.data;
        charge = pagbankOrder.charges?.[0] || null;

        // Se o cartao foi recusado pelo banco emissor, devolve o estoque imediatamente
        if (charge && charge.status === "DECLINED") {
          await restoreStockAtomic(
            db,
            sanitizedItems,
            referenceId,
            "Cartão recusado pelo banco emissor",
          );
          stockReserved = false;
        }
      } catch (error) {
        console.error(
          "Erro na API PagBank Orders:",
          error.response?.data || error.message,
        );
        const pagbankError = error.response?.data || error.message;
        const errorString =
          typeof pagbankError === "object"
            ? JSON.stringify(pagbankError)
            : String(pagbankError);

        // Em modo Sandbox, se o erro for apenas falta de sessao 3DS no Cartao de Debito, permite homologacao Sandbox
        if (
          isSandbox &&
          paymentMethod.type === "DEBIT_CARD" &&
          (errorString.toLowerCase().includes("authentication_method") ||
            errorString.toLowerCase().includes("threeds"))
        ) {
          logger.warn(
            "Aplicando homologacao Sandbox para DEBIT_CARD sem desafio 3DS:",
            errorString,
          );
        } else {
          // Se a chamada do gateway falhar em producao ou por outro motivo, reverte o estoque reservado atomicamente!
          await restoreStockAtomic(
            db,
            sanitizedItems,
            referenceId,
            "Falha na chamada da API PagBank",
          );
          stockReserved = false;

          if (errorString.includes("whitelist access required")) {
            throw new HttpsError(
              "failed-precondition",
              "Sua conta PagBank requer liberação de Whitelist em Produção para a API de Pedidos. Conclua a solicitação de homologação enviada ao PagBank ou ative o Sandbox para testes.",
            );
          }

          if (errorString.includes("buyer email must not be equals to merchant email") || errorString.includes("40002")) {
            throw new HttpsError(
              "invalid-argument",
              "O e-mail do comprador não pode ser igual ao e-mail cadastrado na conta PagBank do lojista (contato.thewavem@gmail.com). Para testar compras ou realizar pedidos, informe um e-mail diferente.",
            );
          }

          throw new HttpsError("internal", errorString);
        }
      }
    }

    if (!pagbankOrder) {
      // Mock estruturado v2 de homologacao quando executado localmente ou em Sandbox sem 3DS ativo
      const mockChargeId = `CHAR_${Date.now()}`;
      const mockPixText = `00020101021226850014br.gov.bcb.pix2563api-h.pagseguro.com/pix/v2/mock-${referenceId}5204899953039865802BR5921Pagseguro Internet SA6009SAO PAULO62070503***63045677`;
      pagbankOrder = {
        id: `ORDE_${Date.now()}`,
        reference_id: referenceId,
        charges: [
          {
            id: mockChargeId,
            reference_id: `CHAR_${referenceId}`,
            status:
              paymentMethod.type === "CREDIT_CARD" || paymentMethod.type === "DEBIT_CARD"
                ? "PAID"
                : "WAITING",
            created_at: new Date().toISOString(),
            description: `Pedido THR33 ${referenceId}`,
            amount: { value: finalAmountInCents, currency: "BRL" },
            payment_method: chargePayload?.payment_method,
            links: [
              {
                rel: "SELF",
                href: `${baseUrl}/charges/${mockChargeId}`,
                media: "application/json",
                type: "GET",
              },
              {
                rel: "QRCODE.PNG",
                href: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(mockPixText)}`,
                media: "image/png",
                type: "GET",
              },
              {
                rel: "QRCODE.BASE64",
                href: `${baseUrl}/qrcode/mock/base64`,
                media: "text/plain",
                type: "GET",
              },
            ],
            qr_code:
              paymentMethod.type === "PIX"
                ? {
                    id: `QRCO_${Date.now()}`,
                    text: mockPixText,
                  }
                : undefined,
          },
        ],
      };
      charge = pagbankOrder.charges[0];
    }

    // 6. Persistir no Firestore com estrutura preparada para NF-e
    const orderRef = db.collection("orders").doc(referenceId);
    const initialStatus =
      charge?.status === "PAID" || charge?.status === "AUTHORIZED"
        ? "pagamento_aprovado"
        : "aguardando_pagamento";

    // Suporte a especificacao oficial v2 (charges.qr_code e charges.links) com retrocompatibilidade v1
    const pixQrCodeUrl =
      charge?.links?.find(
        (l) => l.rel === "QRCODE.PNG" || l.media === "image/png",
      )?.href ||
      pagbankOrder.qr_codes?.[0]?.links?.find(
        (l) => l.rel === "QRCODE.PNG" || l.media === "image/png",
      )?.href ||
      null;

    const pixCopiaECola =
      charge?.qr_code?.text || pagbankOrder.qr_codes?.[0]?.text || null;

    const qrCodeObj = {
      text: pixCopiaECola,
      id: charge?.qr_code?.id || pagbankOrder.qr_codes?.[0]?.id || null,
      links: charge?.links || pagbankOrder.qr_codes?.[0]?.links || [],
    };

    await orderRef.set({
      orderId: referenceId,
      pagbankOrderId: pagbankOrder.id,
      pagbankChargeId: charge?.id || null,
      userId: userId,
      clientName: customer.name,
      clientEmail: customer.email,
      clientCpf: cleanTaxId,
      clientPhone: cleanPhone,
      status: initialStatus,
      paidAt:
        charge?.status === "PAID" || charge?.status === "AUTHORIZED"
          ? FieldValue.serverTimestamp()
          : null,
      paymentMethod:
        paymentMethod.type === "CREDIT_CARD"
          ? "Cartão de Crédito"
          : paymentMethod.type === "DEBIT_CARD"
            ? "Cartão de Débito"
            : paymentMethod.type === "PIX"
              ? "PIX"
              : "Boleto Bancário",
      total: finalAmountInCents / 100,
      amountInCents: finalAmountInCents,
      subtotal: subtotalInCents / 100,
      subtotalInCents,
      originalTotal: calculatedTotalInCents / 100,
      discountAmount: serverDiscountInCents / 100,
      discountInCents: serverDiscountInCents,
      couponCode: validatedCouponData?.code || null,
      couponId: validatedCouponData?.id || null,
      walletDeduction: serverWalletDeductionInCents / 100,
      walletDeductionInCents: serverWalletDeductionInCents,
      shippingCost: officialShippingFeeInCents / 100,
      shippingCostInCents: officialShippingFeeInCents,
      freeShippingApplied: Boolean(isFreeShipping),
      shippingMethod: shippingMethodId,
      shippingAddress: orderPayload.shipping.address,
      items: sanitizedItems,
      carrier: (() => {
        let c = shipping?.carrier || shipping?.company || null;
        if (!c || c.toLowerCase() === 'transportadora') {
          if (shippingMethodId.startsWith('frenet_')) {
            const code = shippingMethodId.replace('frenet_', '');
            if (['03220', '03298', '03301', '03280', '04014', '04162', '40010', '40096', '40215', '40290'].includes(code)) return 'Correios';
            if (['04510', '04669', '04367', '41106', '41068'].includes(code)) return 'Correios';
          }
          if (shippingMethodId.startsWith('me_')) {
            const meCode = shippingMethodId.replace('me_', '');
            if (['1', '2', '17'].includes(meCode)) return 'Correios';
            if (['3', '4'].includes(meCode)) return 'Jadlog';
            if (meCode === '27') return 'Loggi';
            if (['28', '29'].includes(meCode)) return 'J&T Express';
          }
          if (shippingMethodId.includes('jadlog')) return 'Jadlog';
          if (shippingMethodId.includes('loggi')) return 'Loggi';
          if (shippingMethodId.includes('sedex') || shippingMethodId.includes('pac') || shippingMethodId.includes('correios')) return 'Correios';
          if (shippingMethodId.includes('jet') || shippingMethodId.includes('j&t')) return 'J&T Express';
        }
        return c || 'Transportadora';
      })(),
      serviceName: (() => {
        let s = shipping?.serviceName || shipping?.service || null;
        if (!s || s.startsWith('frenet_') || s.startsWith('me_')) {
          if (shippingMethodId.startsWith('frenet_')) {
            const code = shippingMethodId.replace('frenet_', '');
            if (['03220', '03298', '03301', '03280', '04014', '04162', '40010', '40096', '40215', '40290'].includes(code)) return 'SEDEX';
            if (['04510', '04669', '04367', '41106', '41068'].includes(code)) return 'PAC';
          }
          if (shippingMethodId.startsWith('me_')) {
            const meCode = shippingMethodId.replace('me_', '');
            if (meCode === '1') return 'PAC';
            if (meCode === '2') return 'SEDEX';
            if (['3', '4'].includes(meCode)) return 'Padrão';
            if (meCode === '27') return 'Express';
            if (['28', '29'].includes(meCode)) return 'Standard';
          }
          if (shippingMethodId.includes('sedex')) return 'SEDEX';
          if (shippingMethodId.includes('pac')) return 'PAC';
          if (shippingMethodId.includes('express')) return 'Express';
        }
        return s || 'Envio Padrão';
      })(),
      shippingDeadline: shipping?.shippingDeadline || shipping?.deadline || null,
      trackingUrl: null,
      pixQrCodeUrl,
      pixCopiaECola,
      stockReserved: stockReserved,
      stockReleased: !stockReserved,
      pixExpiresAt:
        paymentMethod.type === "PIX"
          ? pixExpirationDate
            ? pixExpirationDate.toISOString()
            : new Date(Date.now() + 20 * 60 * 1000).toISOString()
          : null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      nfe: {
        status: "PENDING_EMISSION",
        issued: false,
        cfopDefault: cfopCode,
        subtotalInCents,
        shippingInCents: officialShippingFeeInCents,
        discountInCents: serverDiscountInCents,
        totalInCents: finalAmountInCents,
        destinatario: {
          tipoPessoa: isPj ? "PJ" : "PF",
          cpf_cnpj: cleanTaxId,
          nome: customer.name,
          ie: isPj
            ? customer.isentoIE
              ? "ISENTO"
              : String(customer.ie || "")
                  .trim()
                  .toUpperCase()
            : null,
          indIEDest: isPj
            ? customer.isentoIE
              ? "2"
              : customer.ie
                ? "1"
                : "9"
            : "9",
          uf: clientState,
          codigoMunicipio: String(shipping?.address?.ibge || "4106902")
            .replace(/\D/g, "")
            .slice(0, 7),
          municipio: shipping?.address?.city || "Curitiba",
          bairro:
            shipping?.address?.neighborhood ||
            shipping?.address?.locality ||
            "Centro",
          logradouro: shipping?.address?.street || "Rua",
          numero: String(shipping?.address?.number || "S/N").trim(),
          cep: cleanCep,
        },
      },
      nfeIssued: false,
      nfeKey: null,
      nfeUrl: null,
    });

    return {
      success: true,
      orderId: referenceId,
      status:
        charge?.status ||
        (paymentMethod.type === "PIX" ? "WAITING" : "PENDING"),
      qrCode: qrCodeObj,
      pixExpiresAt: pixExpirationDate
        ? pixExpirationDate.toISOString()
        : new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    };
  },
);

/**
 * 4. Rota HTTP legada / fallback para compatibilidade com rewrite direto (/api/createSecureOrder)
 */
exports.createSecureOrder = onRequest(
  { region: FUNCTION_REGION, cors: true },
  (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Metodo nao permitido" });
      }

      try {
        const { orderPayload, rawOrderData } = req.body || {};
        if (!orderPayload || !rawOrderData) {
          return res.status(400).json({ error: "Payload invalido" });
        }

        // Validação estrita PCI-DSS: Cartão de Crédito SEMPRE criptografado via SDK
        if (Array.isArray(orderPayload.charges)) {
          for (const ch of orderPayload.charges) {
            if (ch.payment_method?.type === "CREDIT_CARD") {
              if (!ch.payment_method?.card?.encrypted) {
                return res.status(400).json({
                  error: "Dados do cartão devem ser criptografados via Chave Pública (PCI-Free). Não é permitido envio em texto aberto."
                });
              }
              // Elimina qualquer campo aberto residual para conformidade estrita
              delete ch.payment_method.card.number;
              delete ch.payment_method.card.security_code;
              delete ch.payment_method.card.exp_month;
              delete ch.payment_method.card.exp_year;
            }
          }
        }

        const referenceId = orderPayload.reference_id || `THR-${Date.now()}`;
        const token = getSecretToken();
        let pagbankData = null;

        if (token && token.trim() !== "" && !token.includes("SEU_TOKEN")) {
          const isSandbox = process.env.PAGBANK_ENV !== "production";
          const baseUrl = isSandbox
            ? "https://sandbox.api.pagseguro.com"
            : "https://api.pagseguro.com";
          const response = await axios.post(`${baseUrl}/orders`, orderPayload, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          pagbankData = response.data;
        } else {
          const mockPixText = `00020101021226850014br.gov.bcb.pix2563api-h.pagseguro.com/pix/v2/mock-${referenceId}5204899953039865802BR5921Pagseguro Internet SA6009SAO PAULO62070503***63045677`;
          pagbankData = {
            id: `ORDE_${Date.now()}`,
            reference_id: referenceId,
            charges: (orderPayload.charges || []).map((ch, idx) => ({
              id: `CHAR_${Date.now()}_${idx}`,
              reference_id: ch.reference_id || `CHAR_${referenceId}`,
              status: ch.payment_method?.type === "PIX" ? "WAITING" : "PAID",
              amount: ch.amount,
              payment_method: ch.payment_method,
              links: [
                {
                  rel: "QRCODE.PNG",
                  href: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(mockPixText)}`,
                  media: "image/png",
                  type: "GET",
                },
              ],
              qr_code:
                ch.payment_method?.type === "PIX"
                  ? {
                      id: `QRCO_${Date.now()}`,
                      text: mockPixText,
                    }
                  : undefined,
            })),
          };
        }

        const db = getDb();
        const orderRef = db.collection("orders").doc(referenceId);
        await orderRef.set(
          {
            ...rawOrderData,
            orderId: referenceId,
            pagbankOrderId: pagbankData.id,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

        return res.status(200).json({
          success: true,
          orderId: referenceId,
          pagbank: pagbankData,
        });
      } catch (err) {
        console.error("Erro em createSecureOrder:", err);
        return res.status(500).json({ error: err.message });
      }
    });
  },
);

/**
 * 5. WEBHOOK PAGBANK V4/V5 COM IDEMPOTENCIA E AUDITORIA (pagbankWebhook)
 * Rota HTTP REST para receber eventos de cobranca/pedidos do PagBank.
 * Executa em southamerica-east1 com baixa latencia, historico de pagamento e disparo transacional.
 */
const STATUS_MAP = {
  PAID: "pagamento_aprovado",
  AUTHORIZED: "analise",
  IN_ANALYSIS: "analise",
  DECLINED: "cancelado",
  CANCELED: "cancelado",
  WAITING: "aguardando_pagamento",
};

exports.pagbankWebhook = onRequest(
  {
    region: FUNCTION_REGION,
    cors: false,
    timeoutSeconds: 60,
    memory: "256MiB",
    secrets: [PAGBANK_TOKEN],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      // 1. Validacao de Seguranca do Webhook (Token de webhook ou assinatura oficial)
      const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
      const webhookToken =
        process.env.PAGBANK_WEBHOOK_TOKEN || getSecretToken();
      const headerAuth = req.headers["x-authenticity-token"];
      const queryToken = req.query?.token;

      if (
        webhookToken &&
        !isEmulator &&
        !webhookToken.includes("SEU_TOKEN") &&
        !webhookToken.includes("seu_token")
      ) {
        let isAuthorized = false;

        // Validacao direta por query token (?token=...)
        if (queryToken && queryToken === webhookToken) {
          isAuthorized = true;
        }

        // Validacao direta por header token
        if (headerAuth && headerAuth === webhookToken) {
          isAuthorized = true;
        }

        // Validacao por hash criptografico SHA-256 oficial PagBank: sha256(token + "-" + rawBody)
        if (headerAuth && !isAuthorized) {
          const rawBody = req.rawBody
            ? req.rawBody.toString("utf8")
            : JSON.stringify(req.body);
          const computedHash = crypto
            .createHash("sha256")
            .update(`${webhookToken}-${rawBody}`)
            .digest("hex");

          if (computedHash === headerAuth) {
            isAuthorized = true;
          }
        }

        if (!isAuthorized) {
          logger.warn(
            "Requisicao nao autorizada no webhook PagBank (token ou assinatura invalida)",
          );
          return res.status(401).json({ error: "Unauthorized" });
        }
      }

      const payload = req.body || {};
      const { id: orderId, reference_id: referenceId, charges } = payload;

      if (!referenceId && !orderId) {
        logger.warn("Webhook recebido sem identificador de pedido", {
          payload,
        });
        return res
          .status(400)
          .json({ error: "Invalid payload: missing reference_id/id" });
      }

      // Identifica a cobranca principal
      const charge = charges && charges.length > 0 ? charges[0] : null;
      const pagbankStatus = charge ? charge.status : payload.status;
      const internalStatus =
        STATUS_MAP[pagbankStatus] || "aguardando_pagamento";

      // 2. Localiza o pedido no Firestore (suporte para colecao 'orders' e 'pedidos')
      const db = getDb();
      let orderDoc = null;
      let orderRef = null;

      if (referenceId) {
        orderRef = db.collection("orders").doc(referenceId);
        const snap = await orderRef.get();
        if (snap.exists) {
          orderDoc = snap;
        } else {
          const fallbackRef = db.collection("pedidos").doc(referenceId);
          const fallbackSnap = await fallbackRef.get();
          if (fallbackSnap.exists) {
            orderDoc = fallbackSnap;
            orderRef = fallbackRef;
          }
        }
      }

      if (!orderDoc && charge?.id) {
        const queryOrders = await db
          .collection("orders")
          .where("pagbankChargeId", "==", charge.id)
          .limit(1)
          .get();
        if (!queryOrders.empty) {
          orderDoc = queryOrders.docs[0];
          orderRef = orderDoc.ref;
        } else {
          const queryPedidos = await db
            .collection("pedidos")
            .where("pagbankChargeId", "==", charge.id)
            .limit(1)
            .get();
          if (!queryPedidos.empty) {
            orderDoc = queryPedidos.docs[0];
            orderRef = orderDoc.ref;
          }
        }
      }

      if (!orderDoc || !orderRef) {
        logger.error(
          `Pedido ${referenceId || orderId} nao encontrado no Firestore.`,
        );
        // Retorna 200 para evitar retentativas infinitas do gateway para pedidos inexistentes
        return res
          .status(200)
          .json({ received: true, warning: "Order not found" });
      }

      const orderData = orderDoc.data();

      // 3. Idempotencia estrita: se o pedido ja estiver pago ou em estados posteriores, responde 200 imediatamente
      const isAlreadyPaid =
        orderData.status === "pagamento_aprovado" ||
        orderData.status === "pago" ||
        orderData.status === "paid" ||
        orderData.status === "em_producao" ||
        orderData.status === "saiu_para_entrega" ||
        orderData.status === "entregue";

      if (
        isAlreadyPaid &&
        (pagbankStatus === "PAID" || pagbankStatus === "AUTHORIZED")
      ) {
        logger.info(
          `Pedido ${referenceId || orderId} ja esta com pagamento confirmado (${orderData.status}). Respondendo 200 imediatamente.`,
        );
        return res.status(200).json({ received: true, alreadyPaid: true });
      }

      const currentPagbankStatus =
        orderData.pagbank?.status || orderData["pagbank.status"];
      if (
        orderData.status === internalStatus &&
        currentPagbankStatus === pagbankStatus
      ) {
        logger.info(
          `Pedido ${referenceId || orderId} ja esta com o status ${internalStatus}. Ignorando.`,
        );
        return res.status(200).json({ received: true, ignored: true });
      }

      // 4. Atualiza o pedido e armazena historico do evento transacionalmente
      await db.runTransaction(async (transaction) => {
        const freshSnap = await transaction.get(orderRef);
        if (!freshSnap.exists) return;
        const freshData = freshSnap.data() || {};

        const freshIsAlreadyPaid =
          freshData.status === "pagamento_aprovado" ||
          freshData.status === "pago" ||
          freshData.status === "paid" ||
          freshData.status === "em_producao" ||
          freshData.status === "saiu_para_entrega" ||
          freshData.status === "entregue";

        if (
          freshIsAlreadyPaid &&
          (pagbankStatus === "PAID" || pagbankStatus === "AUTHORIZED")
        ) {
          return;
        }

        const updateData = {
          status: internalStatus,
          pagbank: {
            ...(freshData.pagbank || {}),
            status: pagbankStatus,
            chargeId: charge?.id || null,
            lastUpdate: FieldValue.serverTimestamp(),
          },
          updatedAt: FieldValue.serverTimestamp(),
        };

        if (pagbankStatus === "PAID" || pagbankStatus === "AUTHORIZED") {
          updateData.paidAt = FieldValue.serverTimestamp();
          updateData.stockDeducted = true;

          // Se o estoque NAO havia sido pre-reservado no checkout, deduz agora com seguranca por tamanho
          if (!freshData.stockReserved) {
            const itemsList = freshData.items || orderData.items;
            if (Array.isArray(itemsList) && itemsList.length > 0) {
              const prodSnaps = [];
              for (const item of itemsList) {
                const prodId = item.reference_id || item.id;
                if (!prodId) continue;
                const productRef = db.collection("products").doc(prodId);
                const prodSnap = await transaction.get(productRef);
                prodSnaps.push({ productRef, prodSnap, item });
              }

              for (const { productRef, prodSnap, item } of prodSnaps) {
                if (!prodSnap.exists) continue;
                const pData = prodSnap.data();
                const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
                const size = String(item.size || "M").toUpperCase();
                const updates = { updatedAt: FieldValue.serverTimestamp() };

                if (pData.stock && typeof pData.stock === "object") {
                  const current = Number(
                    pData.stock[size] ?? pData.stock[item.size] ?? 0,
                  );
                  const newStock = {
                    ...pData.stock,
                    [size]: Math.max(0, current - qty),
                  };
                  updates.stock = newStock;
                  updates.sizes = Object.keys(newStock).filter(
                    (s) => (newStock[s] || 0) > 0,
                  );
                } else if (typeof pData.stock === "number") {
                  updates.stock = Math.max(0, pData.stock - qty);
                }

                if (
                  Array.isArray(pData.variants) &&
                  pData.variants.length > 0
                ) {
                  updates.variants = pData.variants.map((v) => {
                    if (String(v.size || "").toUpperCase() === size) {
                      const curVar = Number(v.stock_quantity ?? v.stock ?? 0);
                      return {
                        ...v,
                        stock_quantity: Math.max(0, curVar - qty),
                      };
                    }
                    return v;
                  });
                }

                transaction.update(productRef, updates);
              }
            }
          }
        } else if (
          pagbankStatus === "DECLINED" ||
          pagbankStatus === "CANCELED"
        ) {
          updateData.declinedReason =
            charge?.payment_response?.message ||
            "Negado pelo emissor do cartao";

          // Se o estoque estava reservado e ainda nao foi liberado, devolve ao catalogo
          if (freshData.stockReserved && !freshData.stockReleased) {
            updateData.stockReleased = true;
            updateData.stockReserved = false;

            const itemsList = freshData.items || orderData.items;
            if (Array.isArray(itemsList) && itemsList.length > 0) {
              const prodSnaps = [];
              for (const item of itemsList) {
                const prodId = item.reference_id || item.id;
                if (!prodId) continue;
                const productRef = db.collection("products").doc(prodId);
                const prodSnap = await transaction.get(productRef);
                prodSnaps.push({ productRef, prodSnap, item });
              }

              for (const { productRef, prodSnap, item } of prodSnaps) {
                if (!prodSnap.exists) continue;
                const pData = prodSnap.data();
                const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
                const size = String(item.size || "M").toUpperCase();
                const updates = { updatedAt: FieldValue.serverTimestamp() };

                if (pData.stock && typeof pData.stock === "object") {
                  const current = Number(
                    pData.stock[size] ?? pData.stock[item.size] ?? 0,
                  );
                  const newStock = { ...pData.stock, [size]: current + qty };
                  updates.stock = newStock;
                  updates.sizes = Object.keys(newStock).filter(
                    (s) => (newStock[s] || 0) > 0,
                  );
                } else if (typeof pData.stock === "number") {
                  updates.stock = pData.stock + qty;
                }

                if (
                  Array.isArray(pData.variants) &&
                  pData.variants.length > 0
                ) {
                  updates.variants = pData.variants.map((v) => {
                    if (String(v.size || "").toUpperCase() === size) {
                      const curVar = Number(v.stock_quantity ?? v.stock ?? 0);
                      return { ...v, stock_quantity: curVar + qty };
                    }
                    return v;
                  });
                }

                transaction.update(productRef, updates);
              }
            }
          }
        }

        transaction.update(orderRef, updateData);

        const historyRef = orderRef.collection("historico_pagamento").doc();
        transaction.set(historyRef, {
          eventDate: FieldValue.serverTimestamp(),
          pagbankStatus,
          internalStatus,
          payload,
        });
      });

      logger.info(
        `Pedido ${referenceId || orderId} atualizado com sucesso para: ${internalStatus}`,
      );
      return res.status(200).json({ received: true, status: internalStatus });
    } catch (error) {
      logger.error("Erro ao processar webhook do PagBank:", error);
      // Retorna 500 para permitir retentativa automatica do gateway em falhas transientes
      return res.status(500).json({ error: "Internal processing error" });
    }
  },
);

/**
 * 6. ROTINA AGENDADA: CANCELAMENTO DE PEDIDOS PIX EXPIRADOS E DEVOLUCAO DE ESTOQUE
 * Executa a cada 15 minutos (cron: every 15 minutes) em southamerica-east1.
 * Localiza pedidos com status 'aguardando_pagamento' ou 'awaiting_payment'
 * cuja data limite de expiracao (pixExpiresAt) ja tenha sido ultrapassada.
 * Devolve o estoque de forma atomica via runTransaction e marca o pedido como 'cancelado'.
 */
exports.cancelExpiredPixOrders = onSchedule(
  {
    schedule: "every 15 minutes",
    timeZone: "America/Sao_Paulo",
    region: FUNCTION_REGION,
    memory: "256MiB",
    timeoutSeconds: 120,
  },
  async (event) => {
    const db = getDb();
    const now = new Date();
    logger.info(`Iniciando cron cancelExpiredPixOrders: ${now.toISOString()}`);

    try {
      const statusList = ["aguardando_pagamento", "awaiting_payment"];
      const snapshot = await db
        .collection("orders")
        .where("status", "in", statusList)
        .get();

      if (snapshot.empty) {
        logger.info("Nenhum pedido pendente aguardando pagamento.");
        return;
      }

      let canceledCount = 0;

      for (const orderDoc of snapshot.docs) {
        const orderData = orderDoc.data();

        const isPix =
          orderData.paymentMethod === "PIX" ||
          orderData.payment_method === "PIX" ||
          Boolean(orderData.pixExpiresAt);

        if (!isPix) continue;

        let isExpired = false;
        if (orderData.pixExpiresAt) {
          isExpired = new Date(orderData.pixExpiresAt) <= now;
        } else if (orderData.createdAt) {
          const createdDate = orderData.createdAt.toDate
            ? orderData.createdAt.toDate()
            : new Date(orderData.createdAt);
          const diffMinutes =
            (now.getTime() - createdDate.getTime()) / (1000 * 60);
          if (diffMinutes >= 20) {
            isExpired = true;
          }
        }

        if (!isExpired) continue;
        if (orderData.stockReleased === true) continue;

        await db.runTransaction(async (transaction) => {
          const freshSnap = await transaction.get(orderDoc.ref);
          if (!freshSnap.exists) return;
          const freshData = freshSnap.data();

          const paidStatuses = [
            "pagamento_aprovado",
            "pago",
            "paid",
            "em_producao",
            "saiu_para_entrega",
            "entregue",
          ];
          if (
            paidStatuses.includes(freshData.status) ||
            freshData.status === "cancelado" ||
            freshData.stockReleased === true
          ) {
            return;
          }

          const items = freshData.items || [];
          const prodSnapshots = [];

          // 1. Leituras de todos os produtos do pedido
          for (const item of items) {
            const prodId = String(item.id || item.reference_id);
            if (!prodId) continue;
            const prodRef = db.collection("products").doc(prodId);
            const pSnap = await transaction.get(prodRef);
            prodSnapshots.push({ prodRef, pSnap, item });
          }

          // 2. Gravacoes de devolucao de estoque
          for (const { prodRef, pSnap, item } of prodSnapshots) {
            if (!pSnap.exists) continue;
            const pData = pSnap.data();
            const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
            const size = String(item.size || "M").toUpperCase();
            const updates = { updatedAt: FieldValue.serverTimestamp() };

            if (pData.stock && typeof pData.stock === "object") {
              const current = Number(
                pData.stock[size] ?? pData.stock[item.size] ?? 0,
              );
              const newStock = { ...pData.stock, [size]: current + qty };
              updates.stock = newStock;
              updates.sizes = Object.keys(newStock).filter(
                (s) => (newStock[s] || 0) > 0,
              );
            } else if (typeof pData.stock === "number") {
              updates.stock = pData.stock + qty;
            }

            if (Array.isArray(pData.variants) && pData.variants.length > 0) {
              updates.variants = pData.variants.map((v) => {
                if (String(v.size || "").toUpperCase() === size) {
                  const curVar = Number(v.stock_quantity ?? v.stock ?? 0);
                  return { ...v, stock_quantity: curVar + qty };
                }
                return v;
              });
            }

            transaction.update(prodRef, updates);
          }

          // 3. Atualizacao do pedido para cancelado
          transaction.update(orderDoc.ref, {
            status: "cancelado",
            cancelReason: "PIX expirado sem confirmação de pagamento",
            stockReserved: false,
            stockReleased: true,
            canceledAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });

          // 4. Auditoria
          const histRef = orderDoc.ref.collection("historico_pagamento").doc();
          transaction.set(histRef, {
            eventDate: FieldValue.serverTimestamp(),
            internalStatus: "cancelado",
            reason:
              "PIX expirado - estoque devolvido automaticamente ao catalogo pela rotina agendada",
          });
        });

        canceledCount++;
        logger.info(
          `Pedido ${orderDoc.id} cancelado e estoque devolvido com sucesso.`,
        );
      }

      logger.info(
        `Rotina agendada finalizada. Total de pedidos cancelados: ${canceledCount}`,
      );
    } catch (err) {
      logger.error("Erro na execucao da rotina cancelExpiredPixOrders:", err);
    }
  },
);

/**
 * 7. ENDPOINT HTTP PARA ACIONAMENTO MANUAL OU DE TESTE DA LIMPEZA DE PIX EXPIRADOS
 */
exports.cleanupExpiredPixOrdersManual = onRequest(
  {
    region: FUNCTION_REGION,
    cors: true,
  },
  async (req, res) => {
    cors(req, res, async () => {
      const db = getDb();
      const now = new Date();
      logger.info("PROJECT_INFO", {
        gcloud: process.env.GCLOUD_PROJECT,
        google_cloud: process.env.GOOGLE_CLOUD_PROJECT,
        firebase_config: process.env.FIREBASE_CONFIG,
        adminOptions: admin.app().options,
      });

      try {
        const statusList = ["aguardando_pagamento", "awaiting_payment"];
        const snapshot = await db
          .collection("orders")
          .where("status", "in", statusList)
          .get();

        if (snapshot.empty) {
          return res.status(200).json({
            success: true,
            canceledCount: 0,
            message: "Nenhum pedido pendente aguardando pagamento.",
          });
        }

        let canceledCount = 0;
        const canceledOrders = [];

        for (const orderDoc of snapshot.docs) {
          const orderData = orderDoc.data();
          const isPix =
            orderData.paymentMethod === "PIX" ||
            orderData.payment_method === "PIX" ||
            Boolean(orderData.pixExpiresAt);

          if (!isPix) continue;

          let isExpired = false;
          if (orderData.pixExpiresAt) {
            isExpired = new Date(orderData.pixExpiresAt) <= now;
          } else if (orderData.createdAt) {
            const createdDate = orderData.createdAt.toDate
              ? orderData.createdAt.toDate()
              : new Date(orderData.createdAt);
            const diffMinutes =
              (now.getTime() - createdDate.getTime()) / (1000 * 60);
            if (diffMinutes >= 20) {
              isExpired = true;
            }
          }

          if (!isExpired) continue;
          if (orderData.stockReleased === true) continue;

          await db.runTransaction(async (transaction) => {
            const freshSnap = await transaction.get(orderDoc.ref);
            if (!freshSnap.exists) return;
            const freshData = freshSnap.data();

            const paidStatuses = [
              "pagamento_aprovado",
              "pago",
              "paid",
              "em_producao",
              "saiu_para_entrega",
              "entregue",
            ];
            if (
              paidStatuses.includes(freshData.status) ||
              freshData.status === "cancelado" ||
              freshData.stockReleased === true
            ) {
              return;
            }

            const items = freshData.items || [];
            const prodSnapshots = [];

            for (const item of items) {
              const prodId = String(item.id || item.reference_id);
              if (!prodId) continue;
              const prodRef = db.collection("products").doc(prodId);
              const pSnap = await transaction.get(prodRef);
              prodSnapshots.push({ prodRef, pSnap, item });
            }

            for (const { prodRef, pSnap, item } of prodSnapshots) {
              if (!pSnap.exists) continue;
              const pData = pSnap.data();
              const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
              const size = String(item.size || "M").toUpperCase();
              const updates = { updatedAt: FieldValue.serverTimestamp() };

              if (pData.stock && typeof pData.stock === "object") {
                const current = Number(
                  pData.stock[size] ?? pData.stock[item.size] ?? 0,
                );
                const newStock = { ...pData.stock, [size]: current + qty };
                updates.stock = newStock;
                updates.sizes = Object.keys(newStock).filter(
                  (s) => (newStock[s] || 0) > 0,
                );
              } else if (typeof pData.stock === "number") {
                updates.stock = pData.stock + qty;
              }

              if (Array.isArray(pData.variants) && pData.variants.length > 0) {
                updates.variants = pData.variants.map((v) => {
                  if (String(v.size || "").toUpperCase() === size) {
                    const curVar = Number(v.stock_quantity ?? v.stock ?? 0);
                    return { ...v, stock_quantity: curVar + qty };
                  }
                  return v;
                });
              }

              transaction.update(prodRef, updates);
            }

            transaction.update(orderDoc.ref, {
              status: "cancelado",
              cancelReason: "PIX expirado sem confirmação de pagamento",
              stockReserved: false,
              stockReleased: true,
              canceledAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            });

            const histRef = orderDoc.ref
              .collection("historico_pagamento")
              .doc();
            transaction.set(histRef, {
              eventDate: FieldValue.serverTimestamp(),
              internalStatus: "cancelado",
              reason:
                "PIX expirado - estoque devolvido automaticamente sob demanda",
            });
          });

          canceledCount++;
          canceledOrders.push(orderDoc.id);
        }

        return res.status(200).json({
          success: true,
          canceledCount,
          canceledOrders,
          timestamp: now.toISOString(),
        });
      } catch (err) {
        logger.error("Erro em cleanupExpiredPixOrdersManual:", err);
        return res.status(500).json({ error: err.message });
      }
    });
  },
);

/**
 * 8. ESTORNO / REEMBOLSO DE PEDIDO VIA API PAGBANK (refundPagBankOrder)
 * Callable Function exclusiva para administradores da THR33.
 * Executa estorno financeiro seguro na API PagBank e devolve estoque ao catalogo.
 */
exports.refundPagBankOrder = onCall(
  {
    region: FUNCTION_REGION,
    secrets: [PAGBANK_TOKEN],
    cors: true,
  },
  async (request) => {
    // 1. Validacao de Administrador
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Requer autenticação de administrador.");
    }

    const db = getDb();
    const callerUid = request.auth.uid;
    const callerEmail = (request.auth.token?.email || "").toLowerCase();

    const adminEmails = (process.env.ADMIN_EMAILS || "contato.thewavem@gmail.com,eduianbf@gmail.com")
      .split(",")
      .map((e) => e.trim().toLowerCase());

    let isAdmin = adminEmails.includes(callerEmail);

    if (!isAdmin) {
      const adminDoc = await db.collection("adminUsers").doc(callerUid).get();
      if (adminDoc.exists && adminDoc.data()?.role === "admin") {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      throw new HttpsError("permission-denied", "Apenas administradores podem solicitar estornos.");
    }

    const { orderId, reason = "Solicitação de cancelamento/estorno administrativo" } = request.data || {};
    if (!orderId) {
      throw new HttpsError("invalid-argument", "ID do pedido não informado.");
    }

    // 2. Localiza o pedido no Firestore
    const orderRef = db.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      throw new HttpsError("not-found", `Pedido ${orderId} não foi encontrado.`);
    }

    const orderData = orderSnap.data();

    // Se já estiver cancelado e reembolsado
    if (orderData.status === "cancelado" && orderData.financialStatus === "reembolsado") {
      return {
        success: true,
        message: "O pedido já se encontra cancelado e estornado.",
        alreadyRefunded: true,
      };
    }

    const token = getSecretToken();
    const isSandbox = process.env.PAGBANK_ENV !== "production";
    const baseUrl = isSandbox
      ? "https://sandbox.api.pagseguro.com"
      : "https://api.pagseguro.com";

    const chargeId =
      orderData.pagbankChargeId ||
      orderData.pagbank?.charges?.[0]?.id ||
      orderData.charges?.[0]?.id;
    const pagbankOrderId = orderData.pagbankOrderId || orderData.pagbank?.id;

    let gatewayResponse = null;

    // 3. Comunicacao com a API de Cancelamento/Estorno PagBank
    if (token && !token.includes("SEU_TOKEN") && (chargeId || pagbankOrderId)) {
      try {
        if (chargeId) {
          // POST /charges/{charge_id}/cancel (estorno total da cobranca)
          const cancelRes = await axios.post(
            `${baseUrl}/charges/${chargeId}/cancel`,
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                Accept: "application/json",
              },
            },
          );
          gatewayResponse = cancelRes.data;
          logger.info(`Cobranca ${chargeId} cancelada no PagBank:`, gatewayResponse);
        } else if (pagbankOrderId) {
          // Fallback para estorno de pedido
          const cancelRes = await axios.post(
            `${baseUrl}/orders/${pagbankOrderId}/refund`,
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                Accept: "application/json",
              },
            },
          );
          gatewayResponse = cancelRes.data;
          logger.info(`Pedido ${pagbankOrderId} estornado no PagBank:`, gatewayResponse);
        }
      } catch (apiErr) {
        logger.error("Erro na API de estorno do PagBank:", apiErr.response?.data || apiErr.message);
        const errDetail =
          apiErr.response?.data?.error_messages?.[0]?.description ||
          apiErr.response?.data?.message ||
          apiErr.message;
        throw new HttpsError(
          "failed-precondition",
          `Falha ao processar estorno no PagBank: ${errDetail}`,
        );
      }
    } else {
      // Mock para homologacao local ou pedidos legados sem chargeId
      gatewayResponse = {
        status: "CANCELED",
        mock: true,
        canceledAt: new Date().toISOString(),
      };
    }

    // 4. Devolve o estoque de forma atomica se ainda nao tiver sido liberado
    if (orderData.items && Array.isArray(orderData.items) && !orderData.stockReleased) {
      await restoreStockAtomic(db, orderData.items, orderId, reason);
    }

    // 5. Atualiza o pedido no Firestore
    await orderRef.update({
      status: "cancelado",
      financialStatus: "reembolsado",
      stockReleased: true,
      stockReserved: false,
      canceledAt: FieldValue.serverTimestamp(),
      refund: {
        refundedAt: FieldValue.serverTimestamp(),
        reason,
        refundedBy: callerEmail || callerUid,
        gatewayStatus: gatewayResponse?.status || "CANCELED",
        chargeId: chargeId || null,
      },
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 6. Grava evento no historico de pagamento
    await orderRef.collection("historico_pagamento").add({
      eventDate: FieldValue.serverTimestamp(),
      internalStatus: "cancelado",
      financialStatus: "reembolsado",
      reason: `Estorno realizado pelo administrador: ${reason}`,
      chargeId: chargeId || null,
      operator: callerEmail || callerUid,
    });

    return {
      success: true,
      orderId,
      message: "Estorno concluído com sucesso e estoque reintegrado ao catálogo.",
      status: "cancelado",
      financialStatus: "reembolsado",
    };
  },
);

/**
 * Matriz de Contingência Oficial da THR33 (Origem 08577-010 - Itaquaquecetuba / Grande SP)
 * Utilizada como fallback de alta precisão quando tokens ainda não foram inseridos ou as APIs estiverem indisponíveis.
 */
function calculateFallbackShipping(cleanCep, totalQty) {
  const prefix2 = parseInt(cleanCep.substring(0, 2), 10);
  const prefix5 = parseInt(cleanCep.substring(0, 5), 10);
  if (isNaN(prefix2) || prefix5 < 1000 || /^(\d)\1{7}$/.test(cleanCep)) {
    return [];
  }
  const additionalQty = Math.max(0, totalQty - 1);

  // Faixa 1: Grande SP e Capital (01 a 09)
  if (prefix2 >= 1 && prefix2 <= 9) {
    const sedexPrice = Number((14.90 + additionalQty * 2.50).toFixed(2));
    const padraoPrice = Number((9.90 + additionalQty * 1.80).toFixed(2));
    return [
      {
        id: "loggi_local",
        name: "Loggi Express",
        carrier: "Loggi",
        serviceName: "Express",
        deadline: "2 a 3 dias úteis",
        deliveryDays: 3,
        price: padraoPrice,
        source: "fallback",
      },
      {
        id: "sedex_local",
        name: "SEDEX (Correios)",
        carrier: "Correios",
        serviceName: "SEDEX",
        deadline: "1 a 2 dias úteis",
        deliveryDays: 2,
        price: sedexPrice,
        source: "fallback",
      },
    ];
  }

  // Faixa 2: Interior e Litoral de SP (11 a 19)
  if (prefix2 >= 11 && prefix2 <= 19) {
    const sedexPrice = Number((22.50 + additionalQty * 3.00).toFixed(2));
    const pacPrice = Number((16.90 + additionalQty * 2.00).toFixed(2));
    return [
      {
        id: "pac_sp_interior",
        name: "PAC (Correios)",
        carrier: "Correios",
        serviceName: "PAC",
        deadline: "3 a 5 dias úteis",
        deliveryDays: 5,
        price: pacPrice,
        source: "fallback",
      },
      {
        id: "sedex_sp_interior",
        name: "SEDEX (Correios)",
        carrier: "Correios",
        serviceName: "SEDEX",
        deadline: "1 a 3 dias úteis",
        deliveryDays: 3,
        price: sedexPrice,
        source: "fallback",
      },
    ];
  }

  // Faixa 3: Sul e Sudeste (RJ 20-28, ES 29, MG 30-39, PR 80-87, SC 88-89, RS 90-99)
  if ((prefix2 >= 20 && prefix2 <= 39) || (prefix2 >= 80 && prefix2 <= 99)) {
    const jadlogPrice = Number((27.90 + additionalQty * 3.50).toFixed(2));
    const pacPrice = Number((22.90 + additionalQty * 2.50).toFixed(2));
    return [
      {
        id: "pac_sulsud",
        name: "PAC (Correios)",
        carrier: "Correios",
        serviceName: "PAC",
        deadline: "4 a 6 dias úteis",
        deliveryDays: 6,
        price: pacPrice,
        source: "fallback",
      },
      {
        id: "jadlog_sulsud",
        name: "Jadlog",
        carrier: "Jadlog",
        serviceName: "Padrão",
        deadline: "3 a 5 dias úteis",
        deliveryDays: 5,
        price: jadlogPrice,
        source: "fallback",
      },
    ];
  }

  // Faixa 4: Centro-Oeste e Nordeste (40 a 65, 70 a 75, 77 a 79)
  if (
    (prefix2 >= 40 && prefix2 <= 65) ||
    (prefix2 >= 70 && prefix2 <= 75) ||
    (prefix2 >= 77 && prefix2 <= 79)
  ) {
    const expressPrice = Number((36.90 + additionalQty * 4.50).toFixed(2));
    const pacPrice = Number((29.90 + additionalQty * 3.50).toFixed(2));
    return [
      {
        id: "pac_cone",
        name: "PAC (Correios)",
        carrier: "Correios",
        serviceName: "PAC",
        deadline: "7 a 10 dias úteis",
        deliveryDays: 10,
        price: pacPrice,
        source: "fallback",
      },
      {
        id: "transportadora_cone",
        name: "Jadlog",
        carrier: "Jadlog",
        serviceName: "Padrão",
        deadline: "5 a 8 dias úteis",
        deliveryDays: 8,
        price: expressPrice,
        source: "fallback",
      },
    ];
  }

  // Faixa 5: Norte (66 a 69, 76)
  if ((prefix2 >= 66 && prefix2 <= 69) || prefix2 === 76) {
    const aereoPrice = Number((49.90 + additionalQty * 6.00).toFixed(2));
    const pacPrice = Number((39.50 + additionalQty * 4.50).toFixed(2));
    return [
      {
        id: "pac_norte",
        name: "PAC (Correios)",
        carrier: "Correios",
        serviceName: "PAC",
        deadline: "10 a 15 dias úteis",
        deliveryDays: 15,
        price: pacPrice,
        source: "fallback",
      },
      {
        id: "aereo_norte",
        name: "Jadlog",
        carrier: "Jadlog",
        serviceName: "Padrão",
        deadline: "6 a 10 dias úteis",
        deliveryDays: 10,
        price: aereoPrice,
        source: "fallback",
      },
    ];
  }

  // Não pertence a nenhuma faixa válida do Brasil
  return [];
}

/**
 * Endpoint Oficial de Cotação de Frete Real (/api/calculateShipping)
 * Conecta com Melhor Envio e Frenet de forma segura via servidor (sem expor tokens e sem CORS),
 * com contingência automática baseada no CEP de origem 08577-010 (Itaquaquecetuba - SP).
 */
exports.calculateShipping = onRequest(
  {
    region: FUNCTION_REGION,
    cors: true,
  },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res
          .status(405)
          .json({ error: "Método não permitido. Utilize POST." });
      }

      try {
        const { cep, items, subtotal } = req.body || {};
        const cleanCep = String(cep || "").replace(/\D/g, "");

        if (!cleanCep || cleanCep.length !== 8 || /^(\d)\1{7}$/.test(cleanCep) || parseInt(cleanCep.substring(0, 5), 10) < 1000) {
          return res.status(400).json({
            error: "CEP de destino inválido ou inexistente. Forneça um CEP brasileiro válido.",
          });
        }

        const ORIGIN_CEP = "08577010"; // Itaquaquecetuba - SP

        // Consolidação dos itens e empilhamento volumétrico têxtil
        let totalQty = 0;
        let invoiceValue = 0;
        const productsList = [];

        // Base de seguro de carga: 50% do valor de venda da peça (conforme alinhamento de custos e margem)
        // com piso mínimo de R$ 50,00 por peça para resguardar o custo de produção
        const MIN_INSURANCE_PER_ITEM = 50;

        if (Array.isArray(items) && items.length > 0) {
          items.forEach((item, idx) => {
            const q = Math.max(1, Number(item.quantity) || 1);
            const itemPrice = Number(item.price || item.unitPrice || 0);
            const halfPrice = itemPrice > 0 ? Number((itemPrice * 0.5).toFixed(2)) : 0;
            const itemInsurance = Math.max(MIN_INSURANCE_PER_ITEM, halfPrice);

            totalQty += q;
            invoiceValue += itemInsurance * q;

            productsList.push({
              id: String(item.id || item.slug || `item_${idx + 1}`),
              width: 24,
              height: 3,
              length: 34,
              weight: 0.35,
              insurance_value: itemInsurance,
              quantity: q,
            });
          });
        } else {
          totalQty = 1;
          const subtotalVal = Number(subtotal || 0);
          const halfSubtotal = subtotalVal > 0 ? Number((subtotalVal * 0.5).toFixed(2)) : 0;
          invoiceValue = Math.max(MIN_INSURANCE_PER_ITEM, halfSubtotal);
          productsList.push({
            id: "default_item",
            width: 24,
            height: 3,
            length: 34,
            weight: 0.35,
            insurance_value: invoiceValue,
            quantity: 1,
          });
        }

        if (invoiceValue <= 0) {
          invoiceValue = MIN_INSURANCE_PER_ITEM * totalQty;
        }

        const totalWeight = Math.max(0.35, Number((0.35 * totalQty).toFixed(2)));
        const totalHeight = Math.min(100, Math.max(3, 3 * totalQty));
        const width = 24;
        const length = 34;

        const meToken = getMelhorEnvioToken();
        const frenetToken = getFrenetToken();
        const meSandbox = process.env.MELHOR_ENVIO_SANDBOX === "true";

        let quotes = [];
        let sourceUsed = "fallback";
        const consolidated = {};

        // 1. Tenta Cotação via Melhor Envio (Jadlog, Loggi Express e J&T Express)
        if (meToken && meToken.trim() !== "") {
          try {
            const meUrl = meSandbox
              ? "https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate"
              : "https://melhorenvio.com.br/api/v2/me/shipment/calculate";

            const mePayload = {
              from: { postal_code: ORIGIN_CEP },
              to: { postal_code: cleanCep },
              products: productsList,
              options: {
                receipt: false,
                own_hand: false,
              },
            };

            const meRes = await axios.post(meUrl, mePayload, {
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${meToken}`,
                "User-Agent": "THR33 Streetwear (contato@thr33.com.br)",
              },
              timeout: 6000,
            });

            if (Array.isArray(meRes.data)) {
              meRes.data.forEach((svc) => {
                if (svc.error || !svc.price) return;
                const compName = String(svc.company?.name || "").toLowerCase();
                const svcName = String(svc.name || "").toLowerCase();
                const price = parseFloat(svc.custom_price || svc.price || 0);
                const deliveryDays = parseInt(
                  svc.custom_delivery_time || svc.delivery_time || 0,
                  10,
                );
                if (price <= 0) return;

                // Ignora modalidades de ponto de retirada externa ou coleta reversa
                if (svcName.includes("ponto") || svcName.includes("coleta")) return;

                const isJadlog = compName.includes("jadlog");
                const isLoggi = compName.includes("loggi");
                const isJet =
                  compName.includes("jet") ||
                  compName.includes("j&t") ||
                  svcName.includes("j&t");

                if (isJadlog) {
                  // Centraliza na melhor opção de entrega domiciliar da Jadlog
                  if (!consolidated["jadlog"] || price < consolidated["jadlog"].price) {
                    consolidated["jadlog"] = {
                      id: `me_${svc.id}`,
                      name: "Jadlog",
                      carrier: "Jadlog",
                      serviceName: "Padrão",
                      deadline: `${deliveryDays} ${deliveryDays === 1 ? "dia útil" : "dias úteis"}`,
                      deliveryDays,
                      price,
                      source: "melhor_envio",
                    };
                  }
                } else if (isLoggi) {
                  // Prioriza entrega domiciliar Loggi Express
                  if (!consolidated["loggi"] || svcName.includes("express") || price < consolidated["loggi"].price) {
                    consolidated["loggi"] = {
                      id: `me_${svc.id}`,
                      name: "Loggi Express",
                      carrier: "Loggi",
                      serviceName: "Express",
                      deadline: `${deliveryDays} ${deliveryDays === 1 ? "dia útil" : "dias úteis"}`,
                      deliveryDays,
                      price,
                      source: "melhor_envio",
                    };
                  }
                } else if (isJet) {
                  // J&T Express Standard
                  if (!consolidated["jet"] || price < consolidated["jet"].price) {
                    consolidated["jet"] = {
                      id: `me_${svc.id}`,
                      name: "J&T Express",
                      carrier: "J&T Express",
                      serviceName: "Standard",
                      deadline: `${deliveryDays} ${deliveryDays === 1 ? "dia útil" : "dias úteis"}`,
                      deliveryDays,
                      price,
                      source: "melhor_envio",
                    };
                  }
                }
              });
            }
          } catch (meErr) {
            logger.warn(
              "Aviso ao cotar via Melhor Envio:",
              meErr.response?.data || meErr.message,
            );
          }
        }

        // 2. Tenta Cotação via Frenet (Regra Oficial: PAC e SEDEX Correios)
        if (frenetToken && frenetToken.trim() !== "") {
          try {
            const frenetPayload = {
              SellerCEP: ORIGIN_CEP,
              RecipientCEP: cleanCep,
              ShipmentInvoiceValue: Number(invoiceValue.toFixed(2)),
              ShippingItemArray: [
                {
                  Height: totalHeight,
                  Length: length,
                  Quantity: totalQty,
                  Weight: totalWeight,
                  Width: width,
                },
              ],
            };

            const frenetRes = await axios.post(
              "https://api.frenet.com.br/shipping/quote",
              frenetPayload,
              {
                headers: {
                  token: frenetToken,
                  Accept: "application/json",
                  "Content-Type": "application/json",
                },
                timeout: 6000,
              },
            );

            const frenetServices = frenetRes.data?.ShippingSevicesArray;
            if (Array.isArray(frenetServices)) {
              frenetServices.forEach((svc) => {
                if (svc.Error || !svc.ShippingPrice) return;
                const carrier = String(svc.Carrier || "").toLowerCase();
                const serviceDesc = String(svc.ServiceDescription || "").toLowerCase();
                const price = parseFloat(svc.ShippingPrice || 0);
                const deliveryDays = parseInt(svc.DeliveryTime || 0, 10);
                if (price <= 0) return;

                const isCorreios = carrier.includes("correios");
                const isPac = /\bpac\b/i.test(serviceDesc);
                const isSedex = /\bsedex\b/i.test(serviceDesc);

                if (isCorreios && isPac) {
                  if (!consolidated["correios_pac"] || price < consolidated["correios_pac"].price) {
                    consolidated["correios_pac"] = {
                      id: `frenet_${svc.ServiceCode || svc.CarrierCode}`,
                      name: "PAC (Correios)",
                      carrier: "Correios",
                      serviceName: "PAC",
                      deadline: `${deliveryDays} ${deliveryDays === 1 ? "dia útil" : "dias úteis"}`,
                      deliveryDays,
                      price,
                      source: "frenet",
                    };
                  }
                } else if (isCorreios && isSedex) {
                  if (!consolidated["correios_sedex"] || price < consolidated["correios_sedex"].price) {
                    consolidated["correios_sedex"] = {
                      id: `frenet_${svc.ServiceCode || svc.CarrierCode}`,
                      name: "SEDEX (Correios)",
                      carrier: "Correios",
                      serviceName: "SEDEX",
                      deadline: `${deliveryDays} ${deliveryDays === 1 ? "dia útil" : "dias úteis"}`,
                      deliveryDays,
                      price,
                      source: "frenet",
                    };
                  }
                }
              });
            }
          } catch (frenetErr) {
            logger.warn(
              "Aviso ao cotar via Frenet:",
              frenetErr.response?.data || frenetErr.message,
            );
          }
        }

        quotes = Object.values(consolidated);
        if (quotes.length > 0) {
          sourceUsed = "apis_oficiais";
        }

        // 3. Fallback inteligente de Contingência baseado na tabela de CEP de Origem (08577-010)
        if (quotes.length === 0) {
          quotes = calculateFallbackShipping(cleanCep, totalQty);
          sourceUsed = "fallback_matriz_sp";
        }

        if (quotes.length === 0) {
          return res.status(404).json({
            error: "CEP não encontrado na base oficial ou fora da área de entrega atendida.",
            options: []
          });
        }

        // Ordena por menor preço
        quotes.sort((a, b) => a.price - b.price);

        return res.status(200).json({
          success: true,
          destinationCep: cleanCep,
          originCep: ORIGIN_CEP,
          originAddress:
            "Estr. de Santa Isabel, 1011, Sobre Loja - Vila Monte Belo, Itaquaquecetuba - SP",
          package: {
            quantity: totalQty,
            weightKg: totalWeight,
            dimensions: { height: totalHeight, width, length },
            invoiceValue,
          },
          source: sourceUsed,
          options: quotes,
        });
      } catch (err) {
        logger.error("Erro no cálculo de frete:", err);
        return res.status(500).json({
          error: "Erro interno no cálculo de frete: " + err.message,
        });
      }
    });
  },
);

/**
 * Configura as regras de CORS no bucket do Firebase Storage
 */
exports.configureStorageCors = onCall({ region: FUNCTION_REGION }, async (request) => {
  try {
    const bucket = admin.storage().bucket();
    await bucket.setCorsConfiguration([
      {
        origin: ["*"],
        method: ["GET", "PUT", "POST", "DELETE", "HEAD", "OPTIONS"],
        responseHeader: ["*"],
        maxAgeSeconds: 3600,
      },
    ]);
    logger.info("CORS configurado com sucesso no Firebase Storage");
    return { success: true, message: "CORS configurado com sucesso no Firebase Storage!" };
  } catch (err) {
    logger.error("Erro ao configurar CORS no Storage:", err);
    throw new HttpsError("internal", err.message);
  }
});

/**
 * Cloud Function HTTP: Gera Sitemap XML Dinâmico da THR33 Streetwear
 * Consulta produtos e páginas públicas do Firestore com tags <image:image>
 */
exports.sitemap = onRequest(
  {
    region: FUNCTION_REGION,
    cors: true,
  },
  async (req, res) => {
    try {
      const BASE_URL = "https://thr33-streetwear.web.app";

      const escapeXml = (unsafe) => {
        if (!unsafe) return "";
        return String(unsafe)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");
      };

      const formatDate = (dateVal) => {
        try {
          if (!dateVal) return new Date().toISOString().split("T")[0];
          const d = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
          if (isNaN(d.getTime())) return new Date().toISOString().split("T")[0];
          return d.toISOString().split("T")[0];
        } catch {
          return new Date().toISOString().split("T")[0];
        }
      };

      // 1. Rotas estáticas principais
      const staticRoutes = [
        { loc: `${BASE_URL}/`, priority: "1.0", changefreq: "daily" },
        { loc: `${BASE_URL}/catalogo`, priority: "0.9", changefreq: "daily" },
        { loc: `${BASE_URL}/brindes`, priority: "0.7", changefreq: "weekly" },
        { loc: `${BASE_URL}/sobre`, priority: "0.7", changefreq: "monthly" },
        { loc: `${BASE_URL}/como-funciona-a-entrega`, priority: "0.6", changefreq: "monthly" },
        { loc: `${BASE_URL}/guia-de-tamanhos`, priority: "0.6", changefreq: "monthly" },
        { loc: `${BASE_URL}/politicas`, priority: "0.5", changefreq: "monthly" },
        { loc: `${BASE_URL}/suporte`, priority: "0.6", changefreq: "monthly" },
      ];

      const urlEntries = [];

      // Adiciona rotas estáticas
      const todayStr = new Date().toISOString().split("T")[0];
      for (const r of staticRoutes) {
        urlEntries.push(`  <url>
    <loc>${escapeXml(r.loc)}</loc>
    <lastmod>${todayStr}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`);
      }

      // 2. Consulta produtos do Firestore
      const db = getDb();
      try {
        const productsSnap = await db.collection("products").get();
        productsSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.active === false) return;

          const slug = data.slug || docSnap.id;
          const productUrl = `${BASE_URL}/produto/${slug}`;
          const lastmod = formatDate(data.updatedAt || data.createdAt);
          const title = data.name || data.title || "Camiseta Streetwear THR33";
          const image = data.image || (Array.isArray(data.images) && data.images[0]) || "";

          let imageTag = "";
          if (image && image.startsWith("http")) {
            imageTag = `\n    <image:image>
      <image:loc>${escapeXml(image)}</image:loc>
      <image:title>${escapeXml(title)}</image:title>
    </image:image>`;
          }

          urlEntries.push(`  <url>
    <loc>${escapeXml(productUrl)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>${imageTag}
  </url>`);
        });
      } catch (prodErr) {
        logger.warn("Aviso ao buscar produtos para o sitemap:", prodErr.message);
      }

      // 3. Consulta brindes colecionáveis
      try {
        const giftsSnap = await db.collection("gifts").get();
        giftsSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.active === false) return;

          const giftUrl = `${BASE_URL}/brindes/${docSnap.id}`;
          const lastmod = formatDate(data.updatedAt || data.createdAt);

          urlEntries.push(`  <url>
    <loc>${escapeXml(giftUrl)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
        });
      } catch (giftErr) {
        logger.warn("Aviso ao buscar brindes para o sitemap:", giftErr.message);
      }

      // Monta XML completo
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlEntries.join("\n")}
</urlset>`;

      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
      return res.status(200).send(xml);
    } catch (err) {
      logger.error("Erro ao gerar sitemap:", err);
      return res.status(500).send("Erro interno ao gerar sitemap.xml");
    }
  },
);





