import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  setDoc, 
  updateDoc, 
  query, 
  where 
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
        productName: ticketData.productName || 'Geral do Pedido',
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

      // Sincroniza flag e status no pedido correspondente
      if (ticketData.orderId) {
        const orderRef = doc(db, 'orders', ticketData.orderId);
        await setDoc(orderRef, { 
          hasOpenTicket: true, 
          lastTicketId: ticketId,
          lastTicketStatus: 'ABERTO',
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      return { success: true, ticketId };
    } catch (err) {
      console.error("Erro ao criar ticket de suporte:", err);
      throw err;
    }
  },

  /**
   * Busca chamado pelo ID do pedido
   */
  async getTicketByOrderId(orderId) {
    if (!orderId) return null;
    try {
      const q = query(collection(db, TICKETS_COLLECTION), where('orderId', '==', orderId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const tickets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        tickets.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        return tickets[0];
      }
      return null;
    } catch (err) {
      console.error("Erro ao buscar ticket por pedido:", err);
      return null;
    }
  },

  /**
   * Busca chamado por ID do ticket
   */
  async getTicketById(ticketId) {
    if (!ticketId) return null;
    try {
      const snap = await getDoc(doc(db, TICKETS_COLLECTION, ticketId));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
      return null;
    } catch (err) {
      console.error("Erro ao buscar ticket por id:", err);
      return null;
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
      const now = new Date().toISOString();

      await updateDoc(docRef, {
        status,
        adminNotes,
        updatedAt: now
      });

      // Sincroniza flag e status no pedido correspondente
      if (orderId) {
        const orderRef = doc(db, 'orders', orderId);
        await setDoc(orderRef, { 
          hasOpenTicket: status === 'ABERTO' || status === 'EM_ANALISE',
          lastTicketStatus: status,
          updatedAt: now
        }, { merge: true });
      }

      return true;
    } catch (err) {
      console.error("Erro ao atualizar status do ticket:", err);
      throw err;
    }
  }
};
