import { httpsCallable } from 'firebase/functions';
import { functions } from './firebaseConfig';

/**
 * Trava em memória para impedir chamadas duplicadas simultâneas (race condition)
 * para a mesma operação na mesma sessão do navegador.
 */
const inFlightKeys = new Set();

function buildDedupeKey(payload) {
  const type = payload?.type || 'unknown';
  if (type === 'drop_broadcast_campaign') {
    return null; // Broadcast/teste pode ser acionado repetidas vezes pelo admin
  }
  const idPart =
    payload?.uid ||
    payload?.orderId ||
    payload?.subscriberId ||
    (payload?.email ? String(payload.email).trim().toLowerCase() : '');
  return idPart ? `${type}:${idPart}` : null;
}

/**
 * Serviço de Disparo Transacional de E-mails (Resend via Cloud Functions)
 * Todas as chamadas são assíncronas, idempotentes (com trava transacional no Firestore)
 * e 100% não-bloqueantes para não interferir na experiência de navegação ou checkout.
 */
async function invokeTransactionalEmail(payload) {
  const dedupeKey = buildDedupeKey(payload);
  if (dedupeKey) {
    if (inFlightKeys.has(dedupeKey)) {
      return { sent: false, deduplicatedClientSide: true };
    }
    inFlightKeys.add(dedupeKey);
  }

  try {
    const primaryCallable = httpsCallable(functions, 'createPagBankOrder');
    const res = await primaryCallable({
      action: 'sendTransactionalEmail',
      ...payload
    });
    return res?.data || { sent: false };
  } catch (primaryErr) {
    try {
      const dedicatedCallable = httpsCallable(functions, 'sendTransactionalEmail');
      const fallbackRes = await dedicatedCallable(payload);
      return fallbackRes?.data || { sent: false };
    } catch (fallbackErr) {
      if (dedupeKey) {
        inFlightKeys.delete(dedupeKey);
      }
      console.warn('Aviso não-bloqueante ao disparar e-mail transacional:', fallbackErr.message || primaryErr.message);
      return { sent: false };
    }
  }
}

export const emailService = {
  /**
   * Gatilho A — Boas-vindas ao Criar Conta (welcome_register)
   */
  triggerWelcomeEmail({ uid, email, name }) {
    if (!uid || !email) return Promise.resolve({ sent: false });
    return invokeTransactionalEmail({
      type: 'welcome_register',
      uid,
      email,
      name: name || 'Cliente THR33'
    });
  },

  /**
   * Gatilho B — Pedido Recebido / Aguardando PIX (order_created_pix)
   */
  triggerOrderPixEmail(orderId) {
    if (!orderId) return Promise.resolve({ sent: false });
    return invokeTransactionalEmail({
      type: 'order_created_pix',
      orderId
    });
  },

  /**
   * Gatilho C — Pagamento Confirmado & Resumo da Compra (order_paid)
   */
  triggerOrderPaidEmail(orderId) {
    if (!orderId) return Promise.resolve({ sent: false });
    return invokeTransactionalEmail({
      type: 'order_paid',
      orderId
    });
  },

  /**
   * Gatilho D — Pedido Enviado + Código de Rastreio (order_shipped)
   */
  triggerOrderShippedEmail(orderId) {
    if (!orderId) return Promise.resolve({ sent: false });
    return invokeTransactionalEmail({
      type: 'order_shipped',
      orderId
    });
  },

  /**
   * Feature 2.A — E-mail Imediato de Confirmação de Pré-Registro / Lista VIP (drop_waitlist_welcome)
   */
  triggerDropWaitlistWelcome({ email, name, dropId, dropName, source, subscriberId }) {
    if (!email) return Promise.resolve({ sent: false });
    return invokeTransactionalEmail({
      type: 'drop_waitlist_welcome',
      email,
      name: name || '',
      dropId: dropId || 'drop-cactus-01',
      dropName: dropName || 'UTOPIA PROCESS // CACTUS STREETS',
      source: source || 'home_newsletter',
      subscriberId
    });
  },

  /**
   * Feature 2.B — Disparo de Campanha de Drop em Lotes ou Teste (drop_broadcast_campaign)
   */
  sendDropBroadcastCampaign(broadcastData) {
    return invokeTransactionalEmail({
      type: 'drop_broadcast_campaign',
      ...broadcastData
    });
  },

  /**
   * Feature 3 — Disparo de E-mail de Recuperação de Carrinho Abandonado (abandoned_cart)
   */
  triggerAbandonedCartEmail({ uid, forceTest = false }) {
    if (!uid) return Promise.resolve({ sent: false });
    return invokeTransactionalEmail({
      type: 'abandoned_cart',
      uid,
      forceTest
    });
  }
};

export default emailService;
