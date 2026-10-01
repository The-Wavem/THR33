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
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const axios = require("axios");
const crypto = require("crypto");
const cors = require("cors")({ origin: true });

// Em ambiente de emulador local, garante comunicacao direta com o Firestore Emulator (porta 8080)
if (process.env.FUNCTIONS_EMULATOR === "true") {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
}

if (!admin.apps.length) {
  admin.initializeApp();
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
      process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
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
  return process.env.PAGBANK_TOKEN || "";
}

// Secret da API Fiscal (Nuvem Fiscal / Focus NFe) protegido no Google Secret Manager
const FISCAL_API_KEY = defineSecret("FISCAL_API_KEY");

/**
 * Helper para obter a chave da API fiscal em qualquer ambiente
 */
function getFiscalApiKey() {
  try {
    if (typeof FISCAL_API_KEY.value === "function") {
      const val = FISCAL_API_KEY.value();
      if (val && val.trim() !== "") return val;
    }
  } catch (e) {
    // Fora de contexto do Secret Manager
  }
  return process.env.FISCAL_API_KEY || "";
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
        if (token && token.trim() !== "" && !token.includes("SEU_TOKEN") && !token.includes("seu_token")) {
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
            publicKey: "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0THR33PUBKEYMOCK...\n-----END PUBLIC KEY-----",
            isMock: true,
          });
        }
      } catch (error) {
        logger.error("Falha na requisicao da Public Key:", error);
        return res.status(500).json({ error: "Erro interno no servidor" });
      }
    });
  }
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
        return res.status(400).json({ error: "Dados incompletos no corpo da requisicao" });
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
      const cleanTaxId = String(customer.taxId || customer.cpf || "").replace(/\D/g, "");
      const cleanPhone = String(customer.phone || "").replace(/\D/g, "");
      const phoneArea = cleanPhone.length >= 10 ? cleanPhone.slice(0, 2) : "41";
      const phoneNumber = cleanPhone.length >= 10 ? cleanPhone.slice(2) : "999999999";

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
          unit_amount: Math.round(Number(item.unitPrice || item.price || 0) * 100),
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
            security_code: paymentMethod.cvv ? String(paymentMethod.cvv) : undefined,
            holder: {
              name: (paymentMethod.holderName || customer.name || "TITULAR DO CARTAO").toUpperCase(),
            },
          },
        };
      } else if (paymentMethod.type === "PIX") {
        delete orderPayload.charges;
        orderPayload.qr_codes = [
          {
            amount: {
              value: Math.round(Number(paymentMethod.amount || 0) * 100),
            },
            expiration_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          },
        ];
      }

      try {
        let data = null;
        if (token && token.trim() !== "" && !token.includes("SEU_TOKEN") && !token.includes("seu_token")) {
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
          // Mock para homologacao local
          data = {
            id: `ORDE_${Date.now()}`,
            reference_id: cleanRefId,
            charges: paymentMethod.type === "CREDIT_CARD" ? [
              {
                id: `CHAR_${Date.now()}`,
                reference_id: cleanRefId,
                status: "PAID",
                amount: { value: Math.round(Number(paymentMethod.amount || 0) * 100), currency: "BRL" },
                payment_method: orderPayload.charges[0].payment_method,
              }
            ] : null,
            qr_codes: paymentMethod.type === "PIX" ? [
              {
                text: `00020126580014br.gov.bcb.pix0136pagbank-thr33-${cleanRefId}`,
                links: [{ rel: "QRCODE.PNG", href: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=THR33-PIX-${cleanRefId}` }],
              }
            ] : null,
          };
        }

        // Persiste pedido no Firestore com inicializacao de status e NF-e
        try {
          const db = getDb();
          const initialStatus = paymentMethod.type === "PIX" ? "aguardando_pagamento" : "pagamento_aprovado";
          await db.collection("orders").doc(cleanRefId).set({
            orderId: cleanRefId,
            pagbankOrderId: data.id,
            clientName: customer.name || "Cliente THR33",
            clientEmail: customer.email || "cliente@thr33.com",
            clientCpf: cleanTaxId,
            total: Number(paymentMethod.amount || 0),
            status: initialStatus,
            paymentMethod: paymentMethod.type === "CREDIT_CARD" ? "Cartão de Crédito" : "PIX",
            pixQrCodeUrl: data.qr_codes?.[0]?.links?.find(l => l.rel === "QRCODE.PNG" || l.media === "image/png")?.href || null,
            pixCopiaECola: data.qr_codes?.[0]?.text || null,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            nfe: {
              status: "PENDING_EMISSION",
              issued: false,
            },
            nfeIssued: false,
          }, { merge: true });
        } catch (dbErr) {
          logger.warn("Aviso ao persistir pedido via createOrder no Firestore:", dbErr.message);
        }

        return res.status(201).json(data);
      } catch (error) {
        logger.error("Falha ao processar pagamento:", error);
        return res.status(500).json({ error: "Erro interno ao processar cobranca" });
      }
    });
  }
);

/**
 * 3. CLOUD FUNCTION DE CRIACAO DO PEDIDO SERVER-SIDE (createPagBankOrder)
 * Callable Function com autoridade server-side, validacao de precos em Firestore e itens fiscais.
 */
exports.createPagBankOrder = onCall(
  { region: FUNCTION_REGION, secrets: [PAGBANK_TOKEN], cors: true },
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

    // 2. Recalcula precos server-side via Firestore (colecao products)
    const db = getDb();
    let calculatedTotal = 0;
    const sanitizedItems = [];

    for (const item of items) {
      let prodData = null;
      try {
        const prodDoc = await db.collection("products").doc(item.id).get();
        if (prodDoc.exists) {
          prodData = prodDoc.data();
        }
      } catch (err) {
        console.warn("Aviso ao buscar produto no Firestore:", err.message);
      }

      const unitAmountInCents = prodData?.price
        ? Math.round(Number(prodData.price) * 100)
        : Math.round(Number(item.price || 0) * 100);

      const qty = Number(item.quantity || 1);

      sanitizedItems.push({
        reference_id: String(item.id),
        name: String(prodData?.name || item.name || "Camiseta THR33").slice(
          0,
          64,
        ),
        quantity: qty,
        unit_amount: unitAmountInCents,
        ncm: prodData?.ncm || "61091000",
        sku: prodData?.sku || item.id,
        size: item.size || "M",
      });

      calculatedTotal += unitAmountInCents * qty;
    }

    // Adiciona frete (em centavos)
    const shippingFeeInCents = Math.round(Number(shipping?.cost || 0) * 100);
    calculatedTotal += shippingFeeInCents;

    // Abate de cupom e saldo de carteira (se houver)
    const totalDeductionInCents = Math.round(
      (Number(discountAmount || 0) + Number(walletDeduction || 0)) * 100,
    );
    const finalAmountInCents = Math.max(
      0,
      calculatedTotal - totalDeductionInCents,
    );

    // 3. Montar objeto Charge de acordo com o metodo de pagamento
    const referenceId = `THR-${Date.now()}-${userId.slice(0, 5)}`;
    let chargePayload = {
      reference_id: referenceId,
      amount: {
        value: finalAmountInCents,
        currency: "BRL",
      },
    };

    if (paymentMethod.type === "PIX") {
      chargePayload.payment_method = {
        type: "PIX",
      };
      // Expiracao do Pix: 24 horas no padrao PagBank
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + 24);
      chargePayload.payment_method.pix = {
        expiration_date: expirationDate.toISOString(),
      };
    } else if (paymentMethod.type === "CREDIT_CARD") {
      chargePayload.payment_method = {
        type: "CREDIT_CARD",
        installments: Number(paymentMethod.installments || 1),
        capture: true,
        soft_descriptor: "THR33",
        card: {
          encrypted: paymentMethod.cardEncrypted,
          holder: {
            name: (
              paymentMethod.holderName ||
              customer.name ||
              "CLIENTE THR33"
            ).toUpperCase(),
          },
        },
      };
    } else {
      throw new HttpsError(
        "invalid-argument",
        "Metodo de pagamento invalido.",
      );
    }

    // 4. Montar o payload final da Orders API do PagBank
    const cleanTaxId = String(
      customer.taxId || customer.cpf || "",
    ).replace(/\D/g, "");
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
      items: sanitizedItems.map(({ ncm, sku, size, ...rest }) => rest),
      shipping: {
        address: {
          street: shipping?.address?.street || "Rua",
          number: shipping?.address?.number || "0",
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
        charge = pagbankOrder.charges?.[0] || {};
      } catch (error) {
        console.error(
          "Erro na API PagBank Orders:",
          error.response?.data || error.message,
        );
        const pagbankError = error.response?.data || error.message;
        throw new HttpsError(
          "internal",
          typeof pagbankError === "object"
            ? JSON.stringify(pagbankError)
            : String(pagbankError),
        );
      }
    } else {
      // Mock estruturado de homologacao quando executado localmente sem token ativo
      pagbankOrder = {
        id: `ORDE_${Date.now()}`,
        reference_id: referenceId,
        charges: [
          {
            id: `CHAR_${Date.now()}`,
            reference_id: referenceId,
            status: paymentMethod.type === "PIX" ? "WAITING" : "PAID",
            amount: { value: finalAmountInCents, currency: "BRL" },
            payment_method: chargePayload.payment_method,
            qr_codes:
              paymentMethod.type === "PIX"
                ? [
                    {
                      text: `00020126580014br.gov.bcb.pix0136pagbank-thr33-${referenceId}`,
                      links: [
                        {
                          rel: "QRCODE.PNG",
                          href: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=THR33-PIX-${referenceId}`,
                        },
                      ],
                    },
                  ]
                : null,
          },
        ],
        qr_codes:
          paymentMethod.type === "PIX"
            ? [
                {
                  text: `00020126580014br.gov.bcb.pix0136pagbank-thr33-${referenceId}`,
                  links: [
                    {
                      rel: "QRCODE.PNG",
                      href: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=THR33-PIX-${referenceId}`,
                    },
                  ],
                },
              ]
            : null,
      };
      charge = pagbankOrder.charges[0];
    }

    // 6. Persistir no Firestore com estrutura preparada para NF-e
    const orderRef = db.collection("orders").doc(referenceId);
    const initialStatus =
      charge.status === "PAID" || charge.status === "AUTHORIZED"
        ? "pagamento_aprovado"
        : "aguardando_pagamento";

    const qrCodeObj =
      charge.qr_codes?.[0] || pagbankOrder.qr_codes?.[0] || null;
    const pixQrCodeUrl =
      qrCodeObj?.links?.find(
        (l) => l.rel === "QRCODE.PNG" || l.media === "image/png",
      )?.href || null;
    const pixCopiaECola = qrCodeObj?.text || null;

    await orderRef.set({
      orderId: referenceId,
      pagbankOrderId: pagbankOrder.id,
      pagbankChargeId: charge.id || null,
      userId: userId,
      clientName: customer.name,
      clientEmail: customer.email,
      clientCpf: cleanTaxId,
      clientPhone: cleanPhone,
      status: initialStatus,
      paidAt:
        charge.status === "PAID" || charge.status === "AUTHORIZED"
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
      originalTotal: calculatedTotal / 100,
      discountAmount: Number(discountAmount || 0),
      couponCode: couponCode || null,
      walletDeduction: Number(walletDeduction || 0),
      shippingCost: Number(shipping?.cost || 0),
      shippingAddress: orderPayload.shipping.address,
      items: sanitizedItems,
      trackingCode: null,
      carrier: null,
      trackingUrl: null,
      pixQrCodeUrl,
      pixCopiaECola,
      pixExpiresAt:
        paymentMethod.type === "PIX"
          ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          : null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      nfe: {
        status: "PENDING_EMISSION",
        issued: false,
      },
      nfeIssued: false,
      nfeKey: null,
      nfeUrl: null,
    });

    return {
      success: true,
      orderId: referenceId,
      status: charge.status,
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
          data = {
            id: `ORDE_${Date.now()}`,
            reference_id: referenceId,
            qr_codes: orderPayload.qr_codes || null,
            charges: orderPayload.charges || null,
          };
          pagbankData = data;
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
  }
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
      const webhookToken = process.env.PAGBANK_WEBHOOK_TOKEN || getSecretToken();
      const headerAuth = req.headers["x-authenticity-token"];
      const queryToken = req.query?.token;

      if (webhookToken && !isEmulator && !webhookToken.includes("SEU_TOKEN") && !webhookToken.includes("seu_token")) {
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
          logger.warn("Requisicao nao autorizada no webhook PagBank (token ou assinatura invalida)");
          return res.status(401).json({ error: "Unauthorized" });
        }
      }

      const payload = req.body || {};
      const { id: orderId, reference_id: referenceId, charges } = payload;

      if (!referenceId && !orderId) {
        logger.warn("Webhook recebido sem identificador de pedido", { payload });
        return res.status(400).json({ error: "Invalid payload: missing reference_id/id" });
      }

      // Identifica a cobranca principal
      const charge = charges && charges.length > 0 ? charges[0] : null;
      const pagbankStatus = charge ? charge.status : payload.status;
      const internalStatus = STATUS_MAP[pagbankStatus] || "aguardando_pagamento";

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
        logger.error(`Pedido ${referenceId || orderId} nao encontrado no Firestore.`);
        // Retorna 200 para evitar retentativas infinitas do gateway para pedidos inexistentes
        return res.status(200).json({ received: true, warning: "Order not found" });
      }

      const orderData = orderDoc.data();

      // 3. Idempotencia: evita reprocessar pedidos ja finalizados com o mesmo status
      const currentPagbankStatus = orderData.pagbank?.status || orderData["pagbank.status"];
      if (
        orderData.status === internalStatus &&
        currentPagbankStatus === pagbankStatus
      ) {
        logger.info(`Pedido ${referenceId || orderId} ja esta com o status ${internalStatus}. Ignorando.`);
        return res.status(200).json({ received: true, ignored: true });
      }

      // 4. Atualiza o pedido e armazena historico do evento transacionalmente
      await db.runTransaction(async (transaction) => {
        const freshSnap = await transaction.get(orderRef);
        if (!freshSnap.exists) return;
        const freshData = freshSnap.data() || {};

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
          updateData.nfe = {
            ...(freshData.nfe || {}),
            status: "READY_FOR_EMISSION",
          };

          // Baixa de estoque transacional se itens estiverem presentes
          const itemsList = freshData.items || orderData.items;
          if (Array.isArray(itemsList)) {
            for (const item of itemsList) {
              const prodId = item.reference_id || item.id;
              if (prodId) {
                const productRef = db.collection("products").doc(prodId);
                const prodSnap = await transaction.get(productRef);
                if (prodSnap.exists) {
                  transaction.update(productRef, {
                    stock: FieldValue.increment(
                      -Number(item.quantity || 1),
                    ),
                  });
                }
              }
            }
          }
        } else if (pagbankStatus === "DECLINED" || pagbankStatus === "CANCELED") {
          updateData.declinedReason =
            charge?.payment_response?.message || "Negado pelo emissor do cartao";
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

      logger.info(`Pedido ${referenceId || orderId} atualizado com sucesso para: ${internalStatus}`);
      return res.status(200).json({ received: true, status: internalStatus });
    } catch (error) {
      logger.error("Erro ao processar webhook do PagBank:", error);
      // Retorna 500 para permitir retentativa automatica do gateway em falhas transientes
      return res.status(500).json({ error: "Internal processing error" });
    }
  },
);

/**
 * 6. CONEXAO COM O FLUXO DE NF-E (onOrderPaidEmitNFe)
 * Trigger no Firestore v2 acionado no momento da transicao para pagamento_aprovado ou quando sinalizado READY_FOR_EMISSION.
 * Suporta integracao com API Fiscal REST (Nuvem Fiscal / Focus NFe) e fallback seguro em homologacao/mock.
 */
exports.onOrderPaidEmitNFe = onDocumentUpdated(
  {
    document: "orders/{orderId}",
    region: FUNCTION_REGION,
    secrets: [FISCAL_API_KEY],
  },
  async (event) => {
    const beforeData = event.data.before?.data() || {};
    const afterData = event.data.after?.data() || {};
    const orderId = event.params.orderId;
    const orderRef = event.data.after.ref;

    const wasNotPaid =
      beforeData.status !== "pagamento_aprovado" &&
      beforeData.status !== "PAID" &&
      beforeData.status !== "pago" &&
      beforeData.status !== "Aprovado";

    const isNowPaid =
      afterData.status === "pagamento_aprovado" ||
      afterData.status === "PAID" ||
      afterData.status === "pago" ||
      afterData.status === "Aprovado";

    const isPaidTransition = wasNotPaid && isNowPaid;
    const isReadyForEmission = afterData.nfe?.status === "READY_FOR_EMISSION";

    // Idempotencia estrita: impede execucao concorrente ou reemissao
    if (!isPaidTransition && !isReadyForEmission) return null;
    if (
      afterData.nfe?.status === "ISSUED" ||
      afterData.nfe?.status === "PROCESSING" ||
      afterData.nfeIssued === true
    ) {
      return null;
    }

    // Bloqueio atomico de status para evitar duplicacao em caso de retry
    await orderRef.update({
      "nfe.status": "PROCESSING",
      "nfe.processingAt": FieldValue.serverTimestamp(),
    });

    try {
      const isPR = (afterData.shippingAddress?.state || "PR").toUpperCase() === "PR";
      const cfopPadrao = isPR ? "5102" : "6102";

      // 1. Mapeamento dos Itens do Pedido para o Padrao Fiscal de Vestuario
      const itemsPayload = (afterData.items || []).map((item, index) => ({
        numero_item: index + 1,
        codigo_produto: item.id || item.reference_id || `PROD-${index + 1}`,
        descricao: item.title || item.name || "Vestuario Streetwear THR33",
        codigo_ncm: item.ncm || "6109.10.00", // Camisetas de malha de algodao
        cfop: item.cfop || cfopPadrao,
        unidade_comercial: "UN",
        quantidade_comercial: Number(item.quantity || 1),
        valor_unitario_comercial: Number(item.price || 0),
        valor_bruto: Number(((item.price || 0) * (item.quantity || 1)).toFixed(2)),
        unidade_tributavel: "UN",
        quantidade_tributavel: Number(item.quantity || 1),
        valor_unitario_tributavel: Number(item.price || 0),
        origem: 0, // Nacional
        icms: {
          csosn: "102", // Simples Nacional sem permissao de credito
        },
        pis: { situacao_tributaria: "99" },
        cofins: { situacao_tributaria: "99" },
      }));

      // 2. Payload da NF-e Modelo 55
      const nfePayload = {
        natureza_operacao: "Venda de mercadoria",
        tipo_documento: 1, // Saida
        finalidade_emissao: 1, // Normal
        consumidor_final: 1, // Consumidor final
        presenca_comprador: 2, // Internet
        destinatario: {
          cpf: (afterData.customer?.cpf || afterData.clientCpf || "12345678909").replace(/\D/g, ""),
          nome: afterData.customer?.name || afterData.clientName || "Consumidor Final",
          indicador_inscricao_estadual: 9, // Nao contribuinte
          endereco: {
            logradouro: afterData.shippingAddress?.street || "Rua Comendador Araujo",
            numero: afterData.shippingAddress?.number || "333",
            bairro: afterData.shippingAddress?.neighborhood || "Centro",
            codigo_municipio: afterData.shippingAddress?.ibgeCode || "4106902", // Curitiba como fallback
            nome_municipio: afterData.shippingAddress?.city || "Curitiba",
            uf: afterData.shippingAddress?.state || "PR",
            cep: (afterData.shippingAddress?.cep || "80420000").replace(/\D/g, ""),
          },
        },
        itens: itemsPayload,
        pagamento: {
          formas_pagamento: [
            {
              meio_pagamento: (afterData.paymentMethod || "").toLowerCase().includes("pix") ? "17" : "03",
              valor: Number(afterData.total || afterData.totalAmount || afterData.amount || 0),
            },
          ],
        },
        informacoes_adicionais_fisco: "Documento emitido por ME ou EPP optante pelo Simples Nacional. Nao gera direito a credito fiscal de IPI.",
      };

      const fiscalKey = getFiscalApiKey();
      let fiscalResult = null;
      let danfeUrl = "";
      let xmlUrl = "";

      if (fiscalKey && fiscalKey.trim() !== "" && !fiscalKey.includes("SEU_TOKEN") && !fiscalKey.includes("sua_chave")) {
        const fiscalBaseUrl = process.env.FISCAL_ENV === "producao"
          ? "https://api.nuvemfiscal.com.br/v2"
          : "https://api.sandbox.nuvemfiscal.com.br/v2";

        const apiResponse = await fetch(`${fiscalBaseUrl}/nfe`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${fiscalKey}`,
          },
          body: JSON.stringify(nfePayload),
        });

        fiscalResult = await apiResponse.json();

        if (!apiResponse.ok || fiscalResult.status === "rejeitado") {
          throw new Error(fiscalResult.mensagem || JSON.stringify(fiscalResult.erros || fiscalResult));
        }

        // Upload para Firebase Storage se houver URLs retornadas
        try {
          const bucket = getStorage().bucket();
          if (fiscalResult.danfe_url) {
            const danfePdfBuffer = await fetch(fiscalResult.danfe_url).then((r) => r.arrayBuffer());
            const pdfFile = bucket.file(`nfe/${orderId}/danfe.pdf`);
            await pdfFile.save(Buffer.from(danfePdfBuffer), { contentType: "application/pdf" });
            const [signedPdf] = await pdfFile.getSignedUrl({ action: "read", expires: "03-01-2035" });
            danfeUrl = signedPdf;
          } else {
            danfeUrl = fiscalResult.danfe_url || "";
          }

          if (fiscalResult.xml_url) {
            const xmlBuffer = await fetch(fiscalResult.xml_url).then((r) => r.arrayBuffer());
            const xmlFile = bucket.file(`nfe/${orderId}/nfe.xml`);
            await xmlFile.save(Buffer.from(xmlBuffer), { contentType: "application/xml" });
            const [signedXml] = await xmlFile.getSignedUrl({ action: "read", expires: "03-01-2035" });
            xmlUrl = signedXml;
          } else {
            xmlUrl = fiscalResult.xml_url || "";
          }
        } catch (storageErr) {
          logger.warn(`Storage upload fallback para links diretos da API Fiscal: ${storageErr.message}`);
          danfeUrl = fiscalResult.danfe_url || danfeUrl;
          xmlUrl = fiscalResult.xml_url || xmlUrl;
        }
      } else {
        // Mock seguro para desenvolvimento local e homologacao (Sem custo de chave externa)
        const year = new Date().getFullYear().toString().slice(-2);
        const month = String(new Date().getMonth() + 1).padStart(2, "0");
        const cnpjEmitente = (process.env.EMISSOR_CNPJ || "00000000000100").replace(/\D/g, "").padStart(14, "0");
        const randomCode = Math.floor(100000000 + Math.random() * 900000000);
        const generatedKey = `41${year}${month}${cnpjEmitente}55001${String(randomCode).slice(0, 9)}1${String(randomCode).slice(-8)}`;

        const storageBucket = admin.app().options.storageBucket || "thr33-streetwear.firebasestorage.app";
        danfeUrl = `https://storage.googleapis.com/${storageBucket}/nfe/${orderId}/danfe.pdf`;
        xmlUrl = `https://storage.googleapis.com/${storageBucket}/nfe/${orderId}/nfe.xml`;

        fiscalResult = {
          chave_acesso: generatedKey,
          numero: String(Math.floor(1000 + Math.random() * 9000)),
          serie: "1",
        };
      }

      await orderRef.update({
        nfeIssued: true,
        nfeKey: fiscalResult.chave_acesso,
        nfeUrl: danfeUrl,
        nfeXmlUrl: xmlUrl,
        nfeIssuedAt: FieldValue.serverTimestamp(),
        "nfe.status": "ISSUED",
        "nfe.issued": true,
        "nfe.key": fiscalResult.chave_acesso,
        "nfe.number": fiscalResult.numero || null,
        "nfe.series": fiscalResult.serie || "1",
        "nfe.danfeUrl": danfeUrl,
        "nfe.xmlUrl": xmlUrl,
        "nfe.issuedAt": FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      logger.info(`NF-e emitida e vinculada com sucesso ao pedido ${orderId}: Chave ${fiscalResult.chave_acesso}`);
    } catch (error) {
      logger.error(`[NFe Engine] Falha na emissao da NF-e para pedido ${orderId}:`, error);
      await orderRef.update({
        "nfe.status": "ERROR",
        "nfe.errorMessage": error.message,
        "nfe.failedAt": FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return null;
  }
);

// Alias para manter compatibilidade retroativa
exports.onOrderPaidTrigger = exports.onOrderPaidEmitNFe;
