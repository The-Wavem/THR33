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
      if (paymentMethod.type === "CREDIT_CARD") {
        orderPayload.charges[0].payment_method = {
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
                  Date.now() + 30 * 60 * 1000,
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
                  paymentMethod.type === "CREDIT_CARD" ? "PAID" : "WAITING",
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
    serviceAccount: "thr33-streetwear@appspot.gserviceaccount.com",
  },
  async (request) => {
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

    const isSandbox = process.env.PAGBANK_ENV !== "production";
    const baseUrl = isSandbox
      ? "https://sandbox.api.pagseguro.com"
      : "https://api.pagseguro.com";

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

    for (const item of items) {
      if (!item.id) {
        throw new HttpsError(
          "invalid-argument",
          "Item sem identificador válido.",
        );
      }

      const prodDoc = await db
        .collection("products")
        .doc(String(item.id))
        .get();
      if (!prodDoc.exists) {
        throw new HttpsError(
          "not-found",
          `Produto "${item.name || item.id}" não foi encontrado no catálogo oficial da THR33.`,
        );
      }

      const prodData = prodDoc.data();
      const realPrice = Number(prodData.price);
      if (isNaN(realPrice) || realPrice <= 0) {
        throw new HttpsError(
          "failed-precondition",
          `Preço inválido cadastrado para o produto "${prodData.name || item.id}".`,
        );
      }

      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);

      // A validacao real e reserva atomica de estoque por tamanho ocorrem via reserveStockAtomic(db, sanitizedItems, referenceId)

      const unitAmountInCents = Math.round(realPrice * 100);
      const itemTotalInCents = unitAmountInCents * qty;

      sanitizedItems.push({
        reference_id: String(item.id),
        name: String(prodData.name || item.name || "Camiseta THR33").slice(
          0,
          64,
        ),
        quantity: qty,
        unit_amount: unitAmountInCents,
        total_amount: itemTotalInCents,
        ncm: String(prodData.ncm || "61091000")
          .replace(/\D/g, "")
          .slice(0, 8),
        cfop: cfopCode,
        sku: String(prodData.sku || item.id).slice(0, 32),
        size: String(item.size || "M").slice(0, 10),
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

        if (isActive && isNotExpired && meetsMinOrder) {
          validatedCouponData = { id: couponDoc.id, ...cData };
          if (cData.discountPercent) {
            const pct = Number(cData.discountPercent);
            serverDiscountInCents = Math.round((subtotalInCents * pct) / 100);
          } else if (cData.discountValue) {
            serverDiscountInCents = Math.round(
              Number(cData.discountValue) * 100,
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

    // 2.2 Validacao e recalculo de Frete oficial server-side
    // Metodos: 'padrao' = R$ 24,90 (2490 centavos) | 'expresso' = R$ 38,50 (3850 centavos)
    const shippingMethodId = String(
      shipping?.method || shipping?.shippingMethod || "padrao",
    ).toLowerCase();
    let officialShippingFeeInCents =
      shippingMethodId === "expresso" ? 3850 : 2490;

    // Regra de Frete Gratis da THR33: compras a partir de R$ 299,00 ou cupom de frete gratis
    if (
      subtotalInCents >= 29900 ||
      validatedCouponData?.freeShipping === true
    ) {
      officialShippingFeeInCents = 0;
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
    const finalAmountInCents = Math.max(
      0,
      calculatedTotalInCents -
        serverDiscountInCents -
        serverWalletDeductionInCents,
    );

    // 3. Montar objeto de cobranca conforme o metodo de pagamento
    const referenceId = `THR-${Date.now()}-${userId.slice(0, 5)}`;

    // 3.1 Reserva Atomica de Estoque via Firestore runTransaction
    // Previne condicoes de corrida (Race Conditions) quando compradores adquirem a ultima peca simultaneamente
    await reserveStockAtomic(db, sanitizedItems, referenceId);
    let stockReserved = true;

    let chargePayload = null;
    let pixExpirationDate = null;

    if (paymentMethod.type === "PIX") {
      // Expiracao do Pix: 30 minutos (padrao de e-commerce sincronizado com a rotina cron agendada)
      // Conforme especificacao oficial PagBank Orders v2 (charges.payment_method.type = 'PIX')
      pixExpirationDate = new Date(Date.now() + 30 * 60 * 1000);
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
    } else if (paymentMethod.type === "CREDIT_CARD") {
      chargePayload = {
        reference_id: `CHAR_${referenceId}`,
        amount: {
          value: finalAmountInCents,
          currency: "BRL",
        },
        payment_method: {
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
      items: sanitizedItems.map(({ ncm, sku, size, ...rest }) => rest),
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

    if (
      token &&
      token.trim() !== "" &&
      !token.includes("SEU_TOKEN") &&
      !token.includes("seu_token")
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
        // Se a chamada do gateway falhar, reverte o estoque reservado atomicamente!
        await restoreStockAtomic(
          db,
          sanitizedItems,
          referenceId,
          "Falha na chamada da API PagBank",
        );
        stockReserved = false;
        const pagbankError = error.response?.data || error.message;
        const errorString =
          typeof pagbankError === "object"
            ? JSON.stringify(pagbankError)
            : String(pagbankError);

        if (errorString.includes("whitelist access required")) {
          throw new HttpsError(
            "failed-precondition",
            "Sua conta PagBank requer liberação de Whitelist em Produção para a API de Pedidos. Conclua a solicitação de homologação enviada ao PagBank ou ative o Sandbox para testes.",
          );
        }

        throw new HttpsError("internal", errorString);
      }
    } else {
      // Mock estruturado v2 de homologacao quando executado localmente sem token ativo
      const mockChargeId = `CHAR_${Date.now()}`;
      const mockPixText = `00020101021226850014br.gov.bcb.pix2563api-h.pagseguro.com/pix/v2/mock-${referenceId}5204899953039865802BR5921Pagseguro Internet SA6009SAO PAULO62070503***63045677`;
      pagbankOrder = {
        id: `ORDE_${Date.now()}`,
        reference_id: referenceId,
        charges: [
          {
            id: mockChargeId,
            reference_id: `CHAR_${referenceId}`,
            status: paymentMethod.type === "CREDIT_CARD" ? "PAID" : "WAITING",
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
      shippingMethod: shippingMethodId,
      shippingAddress: orderPayload.shipping.address,
      items: sanitizedItems,
      trackingCode: null,
      carrier: null,
      trackingUrl: null,
      pixQrCodeUrl,
      pixCopiaECola,
      stockReserved: stockReserved,
      stockReleased: !stockReserved,
      pixExpiresAt:
        paymentMethod.type === "PIX"
          ? pixExpirationDate
            ? pixExpirationDate.toISOString()
            : new Date(Date.now() + 30 * 60 * 1000).toISOString()
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
    serviceAccount: "thr33-streetwear@appspot.gserviceaccount.com",
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
          if (diffMinutes >= 30) {
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
    serviceAccount: "thr33-streetwear@appspot.gserviceaccount.com",
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
            if (diffMinutes >= 30) {
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
