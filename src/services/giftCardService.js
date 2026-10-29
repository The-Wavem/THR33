import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  runTransaction, 
  increment 
} from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Gera um código exclusivo e legível para o Vale-Presente da THR33
 * Padrão: THR33-GIFT-XXXX-XXXX
 */
export function generateGiftCardCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let segment1 = '';
  let segment2 = '';
  for (let i = 0; i < 4; i++) {
    segment1 += chars.charAt(Math.floor(Math.random() * chars.length));
    segment2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `THR33-GIFT-${segment1}-${segment2}`;
}

export const giftCardService = {
  /**
   * Processa os vales-presentes contidos em um pedido após a confirmação do pagamento.
   * Totalmente idempotente: verifica a trava 'giftCardsProcessed' para nunca duplicar.
   * 
   * @param {string} orderId ID do pedido
   * @param {object} orderData Dados completos do pedido
   * @returns {Promise<{ success: boolean, giftCardsGenerated: Array, alreadyProcessed?: boolean }>}
   */
  processOrderGiftCards: async (orderId, orderData) => {
    if (!orderId || !orderData) {
      return { success: false, reason: 'missing_order_data' };
    }

    // Trava de idempotência estrita
    if (orderData.giftCardsProcessed === true) {
      return { 
        success: true, 
        alreadyProcessed: true, 
        giftCardsGenerated: orderData.giftCardsGenerated || [] 
      };
    }

    const items = Array.isArray(orderData.items) ? orderData.items : [];
    const giftCardItems = items.filter(i => 
      Boolean(i.isGiftCard || i.category === 'gift-card' || String(i.id || '').includes('vale'))
    );

    if (giftCardItems.length === 0) {
      return { success: true, giftCardsGenerated: [] };
    }

    // Só emite ou credita se o pedido estiver com pagamento aprovado
    const rawStatus = String(orderData.status || '').toLowerCase();
    const isPaid = [
      'pago', 
      'paid', 
      'aprovado', 
      'approved', 
      'pagamento_aprovado', 
      'em_producao', 
      'em_separacao', 
      'enviado', 
      'entregue'
    ].includes(rawStatus);

    if (!isPaid) {
      return { success: false, reason: 'payment_not_approved' };
    }

    const buyerUid = String(orderData.userId || orderData.clientId || orderData.uid || '').trim();
    const buyerEmail = String(orderData.clientEmail || orderData.customer?.email || '').trim();
    const buyerName = String(orderData.clientName || orderData.customer?.name || '').trim();

    const giftCardsGenerated = [];

    for (const item of giftCardItems) {
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const unitPrice = Number(item.price || 0);
      const deliveryMode = item.giftDeliveryMode === 'self' ? 'self' : 'code';
      const recipientName = String(item.recipientName || '').trim();
      const giftMessage = String(item.giftMessage || '').trim();

      for (let u = 0; u < qty; u++) {
        const code = generateGiftCardCode();

        if (deliveryMode === 'self' && buyerUid) {
          // Modo Minha Conta: Credita diretamente na carteira do comprador
          const userRef = doc(db, 'users', buyerUid);
          await setDoc(userRef, {
            walletBalance: increment(unitPrice),
            lastWalletCreditAt: new Date().toISOString()
          }, { merge: true });

          // Registra o vale já como resgatado no histórico
          await setDoc(doc(db, 'gift_cards', code), {
            code,
            initialValue: unitPrice,
            remainingValue: 0,
            deliveryMode: 'self',
            status: 'redeemed',
            orderId,
            buyerUid,
            buyerName,
            buyerEmail,
            recipientName: buyerName || 'Minha Conta',
            giftMessage: 'Ativado automaticamente na carteira do comprador.',
            redeemedByUid: buyerUid,
            redeemedByEmail: buyerEmail,
            redeemedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
          });

          giftCardsGenerated.push({
            code,
            amount: unitPrice,
            deliveryMode: 'self',
            status: 'redeemed',
            recipientName: buyerName || 'Minha Conta',
            giftMessage: ''
          });
        } else {
          // Modo Código para Presentear: Gera código ativo para resgate posterior
          await setDoc(doc(db, 'gift_cards', code), {
            code,
            initialValue: unitPrice,
            remainingValue: unitPrice,
            deliveryMode: 'code',
            status: 'active',
            orderId,
            buyerUid,
            buyerName,
            buyerEmail,
            recipientName,
            giftMessage,
            redeemedByUid: null,
            redeemedByEmail: null,
            redeemedAt: null,
            createdAt: new Date().toISOString()
          });

          giftCardsGenerated.push({
            code,
            amount: unitPrice,
            deliveryMode: 'code',
            status: 'active',
            recipientName,
            giftMessage
          });
        }
      }
    }

    // Salva os códigos e a trava de processado dentro do pedido
    const orderRef = doc(db, 'orders', orderId);
    await setDoc(orderRef, {
      giftCardsGenerated,
      giftCardsProcessed: true,
      hasGiftCard: true,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return { success: true, giftCardsGenerated };
  },

  /**
   * Resgate seguro e transacional de código de Vale-Presente.
   * Utiliza runTransaction para garantir atomicidade e evitar qualquer resgate duplo.
   * 
   * @param {string} rawCode Código informado pelo usuário
   * @param {string} userUid UID do usuário autenticado
   * @param {string} userEmail E-mail do usuário autenticado
   * @returns {Promise<{ success: boolean, code: string, creditedAmount: number, newWalletBalance: number }>}
   */
  redeemGiftCardCode: async (rawCode, userUid, userEmail) => {
    const cleanCode = String(rawCode || '').trim().toUpperCase();
    if (!cleanCode) {
      throw new Error('Por favor, digite o código do vale-presente.');
    }
    if (!userUid) {
      throw new Error('Você precisa estar conectado à sua conta para ativar o vale-presente.');
    }

    return await runTransaction(db, async (transaction) => {
      const cardRef = doc(db, 'gift_cards', cleanCode);
      const cardSnap = await transaction.get(cardRef);

      if (!cardSnap.exists()) {
        throw new Error('Código de vale-presente não encontrado. Verifique os caracteres e tente novamente.');
      }

      const cardData = cardSnap.data();

      if (cardData.status === 'redeemed') {
        throw new Error('Este código de vale-presente já foi utilizado anteriormente.');
      }
      if (cardData.status === 'pending_payment') {
        throw new Error('O pagamento deste vale-presente ainda está aguardando confirmação.');
      }
      if (cardData.status === 'cancelled') {
        throw new Error('Este vale-presente foi cancelado e não pode ser utilizado.');
      }
      if (cardData.status !== 'active') {
        throw new Error('Este código de vale-presente não está ativo.');
      }

      const amount = Number(cardData.remainingValue ?? cardData.initialValue ?? 0);
      if (amount <= 0) {
        throw new Error('Este vale-presente não possui saldo disponível.');
      }

      // Lê saldo atual do usuário
      const userRef = doc(db, 'users', userUid);
      const userSnap = await transaction.get(userRef);
      const currentWallet = userSnap.exists() ? Number(userSnap.data().walletBalance || 0) : 0;
      const newWallet = currentWallet + amount;

      // Queima o cartão
      transaction.update(cardRef, {
        status: 'redeemed',
        remainingValue: 0,
        redeemedByUid: userUid,
        redeemedByEmail: userEmail || '',
        redeemedAt: new Date().toISOString()
      });

      // Credita saldo na carteira digital
      transaction.set(userRef, {
        walletBalance: newWallet,
        lastRedeemedAt: new Date().toISOString(),
        lastRedeemedCode: cleanCode
      }, { merge: true });

      return {
        success: true,
        code: cleanCode,
        creditedAmount: amount,
        newWalletBalance: newWallet
      };
    });
  },

  /**
   * Consulta os dados de um vale-presente pelo código (leitura de conferência).
   */
  getGiftCardByCode: async (rawCode) => {
    const cleanCode = String(rawCode || '').trim().toUpperCase();
    if (!cleanCode) return null;
    const snap = await getDoc(doc(db, 'gift_cards', cleanCode));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  }
};

export default giftCardService;
