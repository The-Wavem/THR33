import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from './firebaseConfig';

const TICKETS_COLLECTION = 'support_tickets';

export const supportService = {
  /**
   * Cria novo chamado de suporte pelo cliente
   */
  async createTicket(ticketData) {
    try {
      const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}`;
      const docRef = doc(db, TICKETS_COLLECTION, ticketId);

      const payload = {
        id: ticketId,
        orderId: ticketData.orderId || '',
        userId: ticketData.userId || '',
        customerName: ticketData.customerName || 'Cliente',
        customerEmail: ticketData.customerEmail || '',
        customerPhone: ticketData.customerPhone || '',
        productId: ticketData.productId || '',
        productName: ticketData.productName || 'Todos os itens',
        productSize: ticketData.productSize || '',
        orderStatusAtOpen: ticketData.orderStatus || 'PAGAMENTO_APROVADO',
        reason: ticketData.reason || 'Dúvida Geral',
        message: ticketData.message || '',
        status: 'ABERTO', // 'ABERTO' | 'EM_ANALISE' | 'RESOLVIDO' | 'RECUSADO'
        adminNotes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(docRef, payload);

      // Marca flag no pedido correspondente para alertar o CMS
      if (ticketData.orderId) {
        const orderRef = doc(db, 'orders', ticketData.orderId);
        await setDoc(orderRef, { hasOpenTicket: true, lastTicketId: ticketId }, { merge: true });
      }

      return { success: true, ticketId };
    } catch (err) {
      console.error("Erro ao criar ticket de suporte:", err);
      throw err;
    }
  },

  /**
   * Busca todos os chamados para o painel CMS
   */
  async getAllTickets() {
    try {
      const snap = await getDocs(collection(db, TICKETS_COLLECTION));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      return list;
    } catch (err) {
      console.error("Erro ao buscar chamados:", err);
      return [];
    }
  },

  /**
   * Busca chamados de um usuário específico
   */
  async getTicketsByUserId(userId) {
    if (!userId) return [];
    try {
      const q = query(collection(db, TICKETS_COLLECTION), where('userId', '==', userId));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      return list;
    } catch (err) {
      console.error("Erro ao buscar chamados do usuário:", err);
      return [];
    }
  },

  /**
   * Atualiza status e resposta do chamado pelo Admin
   */
  async updateTicketStatus(ticketId, orderId, status, adminNotes = '') {
    try {
      const docRef = doc(db, TICKETS_COLLECTION, ticketId);
      await updateDoc(docRef, {
        status,
        adminNotes,
        updatedAt: new Date().toISOString()
      });

      // Se resolvido ou recusado, remove flag de chamado pendente do pedido
      if (orderId && (status === 'RESOLVIDO' || status === 'RECUSADO')) {
        const orderRef = doc(db, 'orders', orderId);
        await setDoc(orderRef, { hasOpenTicket: false }, { merge: true });
      }

      return true;
    } catch (err) {
      console.error("Erro ao atualizar status do ticket:", err);
      throw err;
    }
  }
};
