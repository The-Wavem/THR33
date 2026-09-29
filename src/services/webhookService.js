/**
 * Serviço de Webhook de Conciliação PagBank & Notificações Internas
 * Concilia eventos assíncronos do PagBank e atualiza a máquina de estados no Firestore.
 */

import { doc, updateDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { ORDER_STATUSES } from './orderStateMachine';

export const webhookService = {
  /**
   * Notificação Interna para a Equipe THR33 (Discord / Slack / Telegram)
   */
  notifyInternalTeam: async ({ orderId, clientName, total, items, paymentMethod }) => {
    const discordWebhookUrl = import.meta.env.VITE_DISCORD_ORDERS_WEBHOOK || '';

    const summaryPayload = {
      orderId,
      clientName: clientName || 'Cliente THR33',
      total: Number(total || 0).toFixed(2),
      paymentMethod: paymentMethod || 'PIX',
      itemsCount: items?.length || 0,
      timestamp: new Date().toISOString()
    };

    console.info("[THR33 OPERACIONAL] Novo pedido aprovado para confecção:", summaryPayload);

    if (discordWebhookUrl && discordWebhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      try {
        await fetch(discordWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `NOVO PEDIDO APROVADO // THR33 STREETWEAR\n` +
              `Pedido: #${orderId}\n` +
              `Cliente: ${clientName}\n` +
              `Valor: R$ ${summaryPayload.total} (${paymentMethod})\n` +
              `Itens: ${items?.map(it => `${it.quantity}x ${it.name} [Tam ${it.size}]`).join(', ') || 'Peças diversas'}\n` +
              `Status: Mover para lote de produção sob demanda.`
          })
        });
      } catch (err) {
        console.warn("Aviso ao disparar webhook Discord:", err.message);
      }
    }
  },

  /**
   * Processa o payload de notificação do PagBank
   */
  processWebhookEvent: async (eventPayload) => {
    if (!eventPayload) return { success: false, message: 'Payload vazio' };

    try {
      const charge = eventPayload.charges?.[0] || eventPayload.charge || null;
      const chargeStatus = (charge?.status || eventPayload.status || '').toUpperCase();
      const referenceId = eventPayload.reference_id || charge?.reference_id || '';
      const transactionId = charge?.id || eventPayload.id || '';

      if (!referenceId && !transactionId) {
        return { success: false, message: 'Identificador do pedido não localizado' };
      }

      // Localiza o pedido no Firestore
      let targetOrderDoc = null;
      if (referenceId) {
        const q = query(collection(db, 'orders'), where('pagbank.referenceId', '==', referenceId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          targetOrderDoc = snap.docs[0];
        }
      }

      if (!targetOrderDoc && referenceId.startsWith('THR-')) {
        // Tenta busca direta por ID do documento
        const directId = referenceId.replace('THR-', '').toLowerCase();
        const qDirect = query(collection(db, 'orders'));
        const snapAll = await getDocs(qDirect);
        targetOrderDoc = snapAll.docs.find(d => d.id.toLowerCase().startsWith(directId) || d.id === referenceId);
      }

      if (!targetOrderDoc) {
        return { success: false, message: 'Pedido correspondente não encontrado no Firestore' };
      }

      const orderRef = doc(db, 'orders', targetOrderDoc.id);
      const orderData = targetOrderDoc.data();

      // Mapeamento de status PagBank -> Máquina de Estados THR33
      if (chargeStatus === 'PAID' || chargeStatus === 'AUTHORIZED') {
        const updates = {
          status: ORDER_STATUSES.PAGAMENTO_APROVADO,
          paidAt: new Date().toISOString(),
          'pagbank.status': chargeStatus,
          'pagbank.chargeId': transactionId || orderData.pagbank?.chargeId || null,
          updatedAt: new Date().toISOString()
        };

        await updateDoc(orderRef, updates);

        // Notifica equipe interna
        await webhookService.notifyInternalTeam({
          orderId: targetOrderDoc.id,
          clientName: orderData.clientName,
          total: orderData.total,
          items: orderData.items,
          paymentMethod: orderData.paymentMethod
        });

        return { success: true, newStatus: ORDER_STATUSES.PAGAMENTO_APROVADO };
      }

      if (chargeStatus === 'DECLINED' || chargeStatus === 'CANCELED') {
        await updateDoc(orderRef, {
          status: ORDER_STATUSES.CANCELADO,
          canceledAt: new Date().toISOString(),
          'pagbank.status': chargeStatus,
          updatedAt: new Date().toISOString()
        });
        return { success: true, newStatus: ORDER_STATUSES.CANCELADO };
      }

      return { success: true, message: 'Evento recebido sem alteração de status' };
    } catch (err) {
      console.error("Erro ao processar webhook PagBank:", err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Simulação manual de aprovação de pagamento para ambiente de testes locais
   */
  simulatePaymentApproval: async (orderId) => {
    if (!orderId) return;
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: ORDER_STATUSES.PAGAMENTO_APROVADO,
        paidAt: new Date().toISOString(),
        'pagbank.status': 'PAID',
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (err) {
      console.error("Erro ao simular aprovação:", err);
      return { success: false, error: err.message };
    }
  }
};

export default webhookService;
