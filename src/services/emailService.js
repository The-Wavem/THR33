import { httpsCallable } from 'firebase/functions';
import { functions } from './firebaseConfig';

/**
 * Serviço de Disparo Transacional de E-mails (Resend via Cloud Functions)
 * Todas as chamadas são assíncronas, idempotentes (com trava no Firestore)
 * e 100% não-bloqueantes para não interferir na experiência de navegação ou checkout.
 */
async function invokeTransactionalEmail(payload) {
  try {
    // Utiliza o callable createPagBankOrder (com action: 'sendTransactionalEmail')
    // que já está publicado e ativo em southamerica-east1, com fallback para sendTransactionalEmail
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
  }
};

export default emailService;
