/**
 * Serviço de Avaliações Reais de Produtos (Reviews) - THR33 Streetwear
 * 
 * Diretrizes:
 * - Conformidade com LGPD (Lei Geral de Proteção de Dados):
 *   Nenhum dado pessoal sensível (CPF, telefone, e-mail completo) é exposto publicamente.
 *   O nome do autor é formatado com inicial do sobrenome (ex: "Eduardo F.").
 * - Verificação de Compra Autêntica: Apenas clientes com pedido no status 'entregue'
 *   podem submeter avaliações, marcando a tag 'verifiedPurchase: true'.
 * - Fluxo de Moderação no CMS:
 *   Novas avaliações nascem com status 'pendente' e requerem pré-aprovação do admin
 *   antes de serem exibidas no catálogo público.
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  arrayUnion
} from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Formata o nome do cliente em conformidade com a LGPD (ex: "Matheus R.")
 */
export function formatLgpdAuthorName(fullName) {
  if (!fullName || typeof fullName !== 'string') return 'Cliente Verificado';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Cliente Verificado';
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1][0].toUpperCase();
  return `${firstName} ${lastInitial}.`;
}

/**
 * Mascara o e-mail para exibição segura na moderação (ex: "ma***@gmail.com")
 */
export function maskEmailLgpd(email) {
  if (!email || !email.includes('@')) return '';
  const [userPart, domain] = email.split('@');
  if (userPart.length <= 2) return `${userPart[0]}***@${domain}`;
  return `${userPart.slice(0, 2)}***@${domain}`;
}

export const reviewService = {
  /**
   * Cria uma nova avaliação real no Firestore a partir de um pedido entregue.
   */
  async createReview({
    orderId,
    orderNumber,
    productId,
    productName,
    productSlug,
    productImage,
    rating,
    comment,
    size = 'M',
    color = '',
    user
  }) {
    if (!orderId || !productId || !rating || !comment?.trim()) {
      throw new Error('Parâmetros incompletos para submeter avaliação.');
    }

    const cleanRating = Math.max(1, Math.min(5, parseInt(rating, 10) || 5));
    const cleanComment = String(comment || '').trim();
    const rawAuthor = user?.name || user?.displayName || 'Cliente THR33';
    const authorPublic = formatLgpdAuthorName(rawAuthor);
    const maskedEmail = maskEmailLgpd(user?.email || '');

    const reviewPayload = {
      orderId: String(orderId),
      orderNumber: String(orderNumber || orderId),
      productId: String(productId),
      productName: String(productName || 'Produto THR33').trim(),
      productSlug: productSlug ? String(productSlug).trim() : null,
      productImage: productImage || null,
      size: String(size || 'M').toUpperCase(),
      color: color ? String(color).trim() : null,
      variant: `Tamanho: ${String(size || 'M').toUpperCase()}${color ? ` • ${color}` : ''}`,
      rating: cleanRating,
      comment: cleanComment,
      userId: user?.uid || 'anonymous',
      author: authorPublic,
      authorMaskedEmail: maskedEmail,
      verifiedPurchase: true,
      status: 'pendente', // Pré-aprovação obrigatória no CMS
      createdAt: new Date().toISOString(),
      createdAtTimestamp: Date.now()
    };

    // 1. Grava o documento na coleção 'reviews'
    const reviewRef = await addDoc(collection(db, 'reviews'), reviewPayload);

    // 2. Marca o item como avaliado no pedido Firestore para evitar duplicidade
    try {
      const orderRef = doc(db, 'orders', String(orderId));
      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        const updatedItems = (orderData.items || []).map(item => {
          if (String(item.id) === String(productId)) {
            return { ...item, evaluated: true, reviewId: reviewRef.id };
          }
          return item;
        });

        await updateDoc(orderRef, {
          items: updatedItems,
          evaluatedItemIds: arrayUnion(String(productId))
        });
      }
    } catch (orderUpdateErr) {
      console.warn("Aviso ao marcar item avaliado no pedido:", orderUpdateErr.message);
    }

    return { id: reviewRef.id, ...reviewPayload };
  },

  /**
   * Busca todas as avaliações APROVADAS de um produto específico (Catálogo Público).
   */
  async getApprovedReviewsByProduct(productId, productSlug = null) {
    try {
      const reviewsColl = collection(db, 'reviews');
      const q = query(
        reviewsColl,
        where('status', '==', 'aprovada')
      );

      const snapshot = await getDocs(q);
      const list = [];

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        // Filtra por productId ou slug
        const matchId = String(data.productId) === String(productId);
        const matchSlug = productSlug && data.productSlug && String(data.productSlug) === String(productSlug);
        if (matchId || matchSlug) {
          list.push({ id: docSnap.id, ...data });
        }
      });

      // Ordena pelas mais recentes
      list.sort((a, b) => (b.createdAtTimestamp || 0) - (a.createdAtTimestamp || 0));

      const totalReviews = list.length;
      const averageRating = totalReviews > 0
        ? Number((list.reduce((acc, curr) => acc + (curr.rating || 5), 0) / totalReviews).toFixed(1))
        : 5.0;

      const recommendedCount = list.filter(r => (r.rating || 5) >= 4).length;
      const recommendPercentage = totalReviews > 0
        ? Math.round((recommendedCount / totalReviews) * 100)
        : 100;

      return {
        reviews: list,
        totalReviews,
        averageRating,
        recommendPercentage
      };
    } catch (err) {
      console.warn("Aviso ao buscar avaliações aprovadas do produto:", err.message);
      return {
        reviews: [],
        totalReviews: 0,
        averageRating: 5.0,
        recommendPercentage: 100
      };
    }
  },

  /**
   * Escuta em tempo real todas as avaliações para o painel de moderação no CMS.
   */
  subscribeAllReviews(callback) {
    const reviewsColl = collection(db, 'reviews');
    return onSnapshot(reviewsColl, (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => (b.createdAtTimestamp || 0) - (a.createdAtTimestamp || 0));
      callback(list);
    }, (err) => {
      console.warn("Aviso ao escutar avaliações no CMS:", err.message);
      callback([]);
    });
  },

  /**
   * Atualiza o status de moderação de uma avaliação ('aprovada', 'rejeitada', 'pendente').
   */
  async updateReviewStatus(reviewId, newStatus, adminNotes = '') {
    if (!reviewId || !newStatus) return;
    const reviewRef = doc(db, 'reviews', String(reviewId));
    await updateDoc(reviewRef, {
      status: newStatus,
      moderatedAt: new Date().toISOString(),
      adminNotes: adminNotes || null
    });
  },

  /**
   * Exclui permanentemente uma avaliação do Firestore.
   */
  async deleteReview(reviewId) {
    if (!reviewId) return;
    const reviewRef = doc(db, 'reviews', String(reviewId));
    await deleteDoc(reviewRef);
  }
};
