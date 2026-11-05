import { httpsCallable } from 'firebase/functions';
import { functions } from './firebaseConfig';

/**
 * Trava em memória para impedir chamadas duplicadas simultâneas (race condition)
 * para a mesma operação na mesma sessão do navegador.
 */
const sentSessionLocks = new Set();

function buildLockKey(payload) {
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
  const lockKey = buildLockKey(payload);
  if (lockKey) {
    if (sentSessionLocks.has(lockKey)) {
      return { sent: false, deduplicatedClientSide: true };
    }
    sentSessionLocks.add(lockKey);
  }

  try {
    const primaryCallable = httpsCallable(functions, 'createPagBankOrder');
    const res = await primaryCallable({
      action: 'sendTransactionalEmail',
      ...payload
    });
    const result = res?.data || { sent: false };

    if (!result.sent && !result.alreadySent && lockKey) {
      sentSessionLocks.delete(lockKey);
    }
    return result;
  } catch (primaryErr) {
    try {
      const dedicatedCallable = httpsCallable(functions, 'sendTransactionalEmail');
      const fallbackRes = await dedicatedCallable(payload);
      const result = fallbackRes?.data || { sent: false };

      if (!result.sent && !result.alreadySent && lockKey) {
        sentSessionLocks.delete(lockKey);
      }
      return result;
    } catch (fallbackErr) {
      if (lockKey) {
        sentSessionLocks.delete(lockKey);
      }
      return {
        sent: false,
        error: primaryErr?.message || fallbackErr?.message || 'Falha na comunicação com o servidor de e-mail.'
      };
    }
  }
}

export const emailService = {
  /**
   * Gatilho A — Boas-vindas ao Criar Conta (welcome_register)
   */
  triggerWelcomeEmail({ uid, email, name, forceTest = false }) {
    if (!email) return Promise.resolve({ sent: false });
    return invokeTransactionalEmail({
      type: 'welcome_register',
      uid: uid || 'welcome_test_user',
      email,
      name: name || 'Cliente THR33',
      forceTest: Boolean(forceTest)
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
   * Gatilho E — Peça em Produção / Corte e Costura (order_in_production)
   */
  triggerOrderInProductionEmail(orderId) {
    if (!orderId) return Promise.resolve({ sent: false });
    return invokeTransactionalEmail({
      type: 'order_in_production',
      orderId
    });
  },

  /**
   * Gatilho F — Pedido Entregue + Convite para Avaliação (order_delivered)
   */
  triggerOrderDeliveredEmail(orderId) {
    if (!orderId) return Promise.resolve({ sent: false });
    return invokeTransactionalEmail({
      type: 'order_delivered',
      orderId
    });
  },

  /**
   * Gatilho G — Pedido Cancelado / Estorno Confirmado (order_canceled)
   */
  triggerOrderCanceledEmail(orderId, reason = '') {
    if (!orderId) return Promise.resolve({ sent: false });
    return invokeTransactionalEmail({
      type: 'order_canceled',
      orderId,
      reason
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
      dropId: dropId || 'drop-thr33',
      dropName: dropName || 'PRÓXIMO DROP THR33',
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
  triggerAbandonedCartEmail({ uid, email, forceTest = false, items, subtotal, name } = {}) {
    if (!uid && !email) return Promise.resolve({ sent: false, reason: 'missing_recipient' });
    return invokeTransactionalEmail({
      type: 'abandoned_cart',
      uid,
      email,
      forceTest,
      items,
      subtotal,
      name
    });
  }
};

export default emailService;
