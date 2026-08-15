import { collection, getDocs, doc, getDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from './firebaseConfig';

export const catalogService = {
  /**
   * Busca todos os produtos ativos do catálogo ordenados por atualização
   */
  async getAllProducts() {
    try {
      const q = query(collection(db, 'products'), orderBy('updatedAt', 'desc'));
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      return list;
    } catch (err) {
      // Fallback sem orderBy caso índice composto não exista imediatamente
      try {
        const snap = await getDocs(collection(db, 'products'));
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        return list;
      } catch (e) {
        console.error("Erro ao buscar produtos no Firestore:", e);
        return [];
      }
    }
  },

  /**
   * Busca produto individual por ID ou Slug
   */
  async getProductById(idOrSlug) {
    if (!idOrSlug) return null;
    try {
      // 1. Tenta buscar diretamente pelo ID do documento
      const docRef = doc(db, 'products', idOrSlug);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }

      // 2. Tenta buscar por campo slug ou id caso seja slug customizado
      const q = query(collection(db, 'products'), where('slug', '==', idOrSlug));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        const d = querySnap.docs[0];
        return { id: d.id, ...d.data() };
      }

      return null;
    } catch (err) {
      console.error(`Erro ao buscar produto ${idOrSlug}:`, err);
      return null;
    }
  },

  /**
   * Busca apenas lançamentos / releases
   */
  async getReleases() {
    try {
      const q = query(collection(db, 'products'), where('isRelease', '==', true));
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      return list;
    } catch (err) {
      console.error("Erro ao buscar lançamentos:", err);
      return [];
    }
  },

  /**
   * Busca produtos do tipo brinde / vale-presente
   */
  async getGifts() {
    try {
      const q = query(collection(db, 'products'), where('type', '==', 'brinde'));
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      return list;
    } catch (err) {
      console.error("Erro ao buscar brindes:", err);
      return [];
    }
  },

  /**
   * Busca brinde / vale-presente individual por ID
   */
  async getGiftById(id) {
    return this.getProductById(id);
  },

  /**
   * Busca produtos filtrados por categoria
   */
  async getProductsByCategory(category) {
    try {
      const q = query(collection(db, 'products'), where('category', '==', category));
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      return list;
    } catch (err) {
      console.error(`Erro ao buscar produtos da categoria ${category}:`, err);
      return [];
    }
  }
};

export default catalogService;
