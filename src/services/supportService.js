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
import { httpsCallable } from 'firebase/functions';
import { db, functions, auth } from './firebaseConfig';

const TICKETS_COLLECTION = 'support_tickets';

export const supportService = {
  /**
   * Cria novo chamado de suporte pelo cliente
   */
  async createTicket(ticketData) {
    try {
      // 1. Tenta via Cloud Function com autoridade server-side se disponivel
      if (functions) {
        try {
          const createSupportTicketFn = httpsCallable(functions, 'createSupportTicket');
          const res = await createSupportTicketFn(ticketData);
          if (res?.data?.success && res?.data?.ticketId) {
            return { success: true, ticketId: res.data.ticketId };
          }
        } catch (fnErr) {
          // Cloud function nao declarada ou sem permissao no backend - segue para persistencia Firestore
        }
      }

      // 2. Persistencia Firestore resiliente
      const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}`;
      const docRef = doc(db, TICKETS_COLLECTION, ticketId);

      const resolvedUserId = ticketData.userId || auth?.currentUser?.uid || '';
      const resolvedUserEmail = ticketData.customerEmail || auth?.currentUser?.email || '';

      const payload = {
        id: ticketId,
        orderId: ticketData.orderId || '',
        userId: resolvedUserId,
        customerName: ticketData.customerName || 'Cliente',
        customerEmail: resolvedUserEmail,
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

      let directDocCreated = false;
      try {
        await setDoc(docRef, payload);
        directDocCreated = true;
      } catch (docErr) {
        console.warn("Aviso ao gravar na colecao support_tickets (tentando sincronizacao direta no pedido):", docErr.message);
      }

      // Sincroniza flag, status e payload completo do chamado no documento do pedido correspondente
      let orderUpdated = false;
      if (ticketData.orderId) {
        try {
          const orderRef = doc(db, 'orders', ticketData.orderId);
          await setDoc(orderRef, { 
            hasOpenTicket: true, 
            lastTicketId: ticketId,
            lastTicketStatus: 'ABERTO',
            supportTicket: payload,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          orderUpdated = true;
        } catch (syncErr) {
          console.warn("Aviso ao sincronizar ticket com pedido:", syncErr.message);
        }
      }

      // Se ao menos uma das formas de gravacao teve sucesso, o chamado foi salvo
      if (directDocCreated || orderUpdated) {
        return { success: true, ticketId, payload };
      }

      // Se ambas falharam (regras em ambos os documentos), lanca erro explicito
      throw new Error("Permissão insuficiente para criar o chamado de suporte.");
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

    // 1. Tenta buscar na colecao oficial support_tickets
    try {
      const q = query(collection(db, TICKETS_COLLECTION), where('orderId', '==', orderId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const tickets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        tickets.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        return tickets[0];
      }
    } catch (err) {
      console.warn("Aviso ao buscar ticket na colecao oficial, buscando no pedido:", err.message);
    }

    // 2. Fallback: busca diretamente no documento do pedido
    try {
      const orderRef = doc(db, 'orders', orderId);
      const snap = await getDoc(orderRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.supportTicket) {
          return data.supportTicket;
        }
      }
    } catch (orderErr) {
      console.warn("Aviso ao buscar ticket no pedido:", orderErr.message);
    }

    return null;
  },

  /**
   * Busca chamado por ID do ticket
   */
  async getTicketById(ticketId, orderId = null) {
    if (!ticketId) return null;

    // 1. Tenta buscar na colecao oficial support_tickets
    try {
      const snap = await getDoc(doc(db, TICKETS_COLLECTION, ticketId));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
    } catch (err) {
      console.warn("Aviso ao buscar ticket por ID na colecao oficial:", err.message);
    }

    // 2. Se orderId foi informado, busca dentro do pedido correspondente
    if (orderId) {
      try {
        const snap = await getDoc(doc(db, 'orders', orderId));
        if (snap.exists()) {
          const data = snap.data();
          if (data.supportTicket && (data.supportTicket.id === ticketId || data.lastTicketId === ticketId)) {
            return data.supportTicket;
          }
        }
      } catch (orderErr) {
        console.warn("Aviso ao buscar ticket no documento do pedido:", orderErr.message);
      }
    }

    return null;
  },

  /**
   * Busca todos os chamados para o painel CMS
   */
  async getAllTickets() {
    const list = [];
    const seenIds = new Set();

    // 1. Busca tickets da colecao oficial
    try {
      const snap = await getDocs(collection(db, TICKETS_COLLECTION));
      snap.docs.forEach(d => {
        const tkt = { id: d.id, ...d.data() };
        list.push(tkt);
        seenIds.add(tkt.id);
        if (tkt.orderId) seenIds.add(tkt.orderId);
      });
    } catch (err) {
      console.warn("Aviso ao buscar chamados em support_tickets:", err.message);
    }

    // 2. Complementa com pedidos que tenham ticket gravado diretamente
    try {
      const qOrders = query(collection(db, 'orders'), where('hasOpenTicket', '==', true));
      const ordersSnap = await getDocs(qOrders);
      ordersSnap.forEach(d => {
        const oData = d.data();
        if (oData.supportTicket && !seenIds.has(oData.supportTicket.id) && !seenIds.has(d.id)) {
          list.push(oData.supportTicket);
          seenIds.add(oData.supportTicket.id);
        }
      });
    } catch (err) {
      console.warn("Aviso ao buscar chamados complementares nos pedidos:", err.message);
    }

    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return list;
  },

  /**
   * Busca chamados de um usuario especifico
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
      console.error("Erro ao buscar chamados do usuario:", err);
      return [];
    }
  },

  /**
   * Atualiza status e resposta do chamado pelo Admin
   */
  async updateTicketStatus(ticketId, orderId, status, adminNotes = '') {
    const now = new Date().toISOString();

    // 1. Atualiza na colecao oficial support_tickets se possivel
    try {
      const docRef = doc(db, TICKETS_COLLECTION, ticketId);
      await updateDoc(docRef, {
        status,
        adminNotes,
        updatedAt: now
      });
    } catch (err) {
      console.warn("Aviso ao atualizar na colecao oficial support_tickets:", err.message);
    }

    // 2. Sincroniza flag, status e resposta no pedido correspondente
    if (orderId) {
      try {
        const orderRef = doc(db, 'orders', orderId);
        const orderSnap = await getDoc(orderRef);
        const existingTicket = orderSnap.exists() ? (orderSnap.data().supportTicket || {}) : {};

        await setDoc(orderRef, { 
          hasOpenTicket: status === 'ABERTO' || status === 'EM_ANALISE',
          lastTicketStatus: status,
          supportTicket: {
            ...existingTicket,
            status,
            adminNotes,
            updatedAt: now
          },
          updatedAt: now
        }, { merge: true });
      } catch (syncErr) {
        console.warn("Aviso ao sincronizar pedido na atualizacao de status:", syncErr.message);
      }
    }

    return true;
  }
};
