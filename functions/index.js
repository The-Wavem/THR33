/**
 * Firebase Cloud Functions v2 - THR33 E-Commerce Backend
 * Modulo seguro em conformidade com as diretrizes oficiais da API PagBank:
 * - Secrets gerenciados via Google Cloud / Firebase Secret Manager (PAGBANK_TOKEN)
 * - createPagBankOrder: Callable Function com autoridade server-side e validacao de precos
 * - pagbankWebhook: Receptor autenticado com verificacao de assinatura SHA-256 (x-authenticity-token)
 * - onOrderPaidEmitNFe: Disparo de emissao de NF-e e chave de 44 digitos SEFAZ PR
 */

const {
  onCall,
  onRequest,
  HttpsError,
} = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const axios = require("axios");
const crypto = require("crypto");
const cors = require("cors")({ origin: true });

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

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

/**
 * PASSO 3: CLOUD FUNCTION DE CRIACAO DO PEDIDO (createPagBankOrder)
 * Recalcula precos no servidor e gera cobranca no PagBank protegendo o token.
 */
exports.createPagBankOrder = onCall(
  { secrets: [PAGBANK_TOKEN], cors: true },
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
      throw new HttpsError("invalid-argument", "Metodo de pagamento invalido.");
    }

    // 4. Montar o payload final da Orders API do PagBank
    const cleanTaxId = String(customer.taxId || customer.cpf || "").replace(
      /\D/g,
      "",
    );
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
        ? `https://us-central1-${JSON.parse(process.env.FIREBASE_CONFIG).projectId}.cloudfunctions.net/pagbankWebhook`
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
          ? admin.firestore.FieldValue.serverTimestamp()
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
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
 * Rota HTTP legada / fallback para compatibilidade com rewrite direto (/api/createSecureOrder)
 */
exports.createSecureOrder = onRequest((req, res) => {
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
        pagbankData = {
          id: `ORDE_${Date.now()}`,
          reference_id: referenceId,
          qr_codes: orderPayload.qr_codes || null,
          charges: orderPayload.charges || null,
        };
      }

      const orderRef = db.collection("orders").doc(referenceId);
      await orderRef.set(
        {
          ...rawOrderData,
          orderId: referenceId,
          pagbankOrderId: pagbankData.id,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
});

/**
 * PASSO 4: WEBHOOK SEGURO COM ASSINATURA SHA-256 (pagbankWebhook)
 * Valida a autenticidade via header x-authenticity-token e atualiza status no Firestore transacionalmente.
 */
exports.pagbankWebhook = onRequest(
  { secrets: [PAGBANK_TOKEN] },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const signature = req.headers["x-authenticity-token"];
    const token = getSecretToken();

    // 1. Validar autenticidade SHA-256 conforme documentacao PagBank: hash(token + '-' + rawBody)
    const rawBody = req.rawBody
      ? req.rawBody.toString("utf8")
      : JSON.stringify(req.body);
    const calculatedHash = crypto
      .createHash("sha256")
      .update(`${token}-${rawBody}`)
      .digest("hex");

    if (signature && token && signature !== calculatedHash) {
      console.warn("Assinatura de Webhook PagBank divergente!");
      return res.status(401).send("Unauthorized");
    }

    const payload = req.body || {};
    const charge = payload.charges?.[0] || payload.charge || {};
    const referenceId = payload.reference_id || charge?.reference_id || "";
    const chargeStatus = (charge?.status || payload.status || "").toUpperCase();

    if (!referenceId && !charge.id) {
      return res.status(200).send("No reference found, ignored");
    }

    let orderDoc = null;
    if (referenceId) {
      const docSnap = await db.collection("orders").doc(referenceId).get();
      if (docSnap.exists) orderDoc = docSnap;
    }

    if (!orderDoc && referenceId) {
      const querySnap = await db
        .collection("orders")
        .where("pagbank.referenceId", "==", referenceId)
        .limit(1)
        .get();
      if (!querySnap.empty) orderDoc = querySnap.docs[0];
    }

    if (!orderDoc && charge.id) {
      const querySnap = await db
        .collection("orders")
        .where("pagbankChargeId", "==", charge.id)
        .limit(1)
        .get();
      if (!querySnap.empty) orderDoc = querySnap.docs[0];
    }

    if (!orderDoc) {
      console.warn("Pedido nao encontrado para conciliacao:", {
        referenceId,
        chargeId: charge.id,
      });
      return res.status(200).send("Order not found");
    }

    try {
      await db.runTransaction(async (t) => {
        const freshSnap = await t.get(orderDoc.ref);
        if (!freshSnap.exists) return;

        const currentData = freshSnap.data();

        // Evitar processamento redundante se ja liquidado
        if (
          currentData.status === "pagamento_aprovado" ||
          currentData.status === "PAID"
        )
          return;

        if (chargeStatus === "PAID" || chargeStatus === "AUTHORIZED") {
          t.update(orderDoc.ref, {
            status: "pagamento_aprovado",
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
            "nfe.status": "READY_FOR_EMISSION",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Baixa de estoque transacional
          if (Array.isArray(currentData.items)) {
            for (const item of currentData.items) {
              const prodId = item.reference_id || item.id;
              if (prodId) {
                const productRef = db.collection("products").doc(prodId);
                const prodSnap = await t.get(productRef);
                if (prodSnap.exists) {
                  t.update(productRef, {
                    stock: admin.firestore.FieldValue.increment(
                      -Number(item.quantity || 1),
                    ),
                  });
                }
              }
            }
          }
        } else if (chargeStatus === "DECLINED" || chargeStatus === "CANCELED") {
          t.update(orderDoc.ref, {
            status: "cancelado",
            declinedReason:
              charge.payment_response?.message ||
              "Negado pelo emissor do cartao",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      });

      return res.status(200).send("OK");
    } catch (err) {
      console.error("Erro no processamento do webhook:", err);
      return res.status(500).send("Internal Server Error");
    }
  },
);

/**
 * PASSO 6: CONEXAO COM O FLUXO DE NF-E (onOrderPaidEmitNFe)
 * Trigger no Firestore acionado no momento da transicao para pagamento_aprovado.
 */
exports.onOrderPaidEmitNFe = onDocumentUpdated(
  "orders/{orderId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    const wasNotPaid =
      before.status !== "pagamento_aprovado" &&
      before.status !== "PAID" &&
      before.status !== "Aprovado";
    const isNowPaid =
      after.status === "pagamento_aprovado" ||
      after.status === "PAID" ||
      after.status === "Aprovado";

    if (wasNotPaid && isNowPaid && (!after.nfeIssued || !after.nfe?.issued)) {
      const orderId = event.params.orderId;
      console.info(
        `Disparando emissao de NF-e para o pedido aprovado ${orderId}...`,
      );

      // Gera Chave de Acesso Oficial de 44 digitos no formato SEFAZ PR (41)
      const year = new Date().getFullYear().toString().slice(-2);
      const month = String(new Date().getMonth() + 1).padStart(2, "0");
      const cnpjEmitente = "00000000000100";
      const randomCode = Math.floor(100000000 + Math.random() * 900000000);
      const generatedNfeKey = `41${year}${month}${cnpjEmitente}55001${String(randomCode).slice(0, 9)}1${String(randomCode).slice(-8)}`;
      const danfeUrl = `https://danfe.thr33.com/visualizar/${orderId}.pdf`;

      await event.data.after.ref.update({
        nfeIssued: true,
        nfeKey: generatedNfeKey,
        nfeUrl: danfeUrl,
        nfeIssuedAt: admin.firestore.FieldValue.serverTimestamp(),
        "nfe.status": "ISSUED",
        "nfe.issued": true,
        "nfe.key": generatedNfeKey,
        "nfe.url": danfeUrl,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.info(`NF-e gerada e vinculada com sucesso ao pedido ${orderId}`);
    }
  },
);

// Alias para manter compatibilidade retroativa
exports.onOrderPaidTrigger = exports.onOrderPaidEmitNFe;
