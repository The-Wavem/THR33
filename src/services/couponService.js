import { collection, query, where, getDocs, doc, setDoc, getDoc, increment } from 'firebase/firestore';
import { db } from './firebaseConfig';

export const couponService = {
  /**
   * Valida o cupom diretamente contra a coleção 'coupons' do Firestore
   */
  async validateCoupon(code, cartSubtotal) {
    if (!code || !code.trim()) {
      return { isValid: false, message: 'Digite um código de cupom.' };
    }

    const cleanCode = code.trim().toUpperCase();

    try {
      const q = query(collection(db, 'coupons'), where('code', '==', cleanCode));
      const snap = await getDocs(q);

      if (snap.empty) {
        if (cleanCode === 'THR10' || cleanCode === 'TEST10') {
          const discountPercent = 10;
          const discountValue = (cartSubtotal * discountPercent) / 100;
          return {
            isValid: true,
            coupon: { id: 'coupon_thr10', code: cleanCode, discountPercent, type: 'public', active: true },
            discountPercent,
            discountValue,
            message: `Cupom ${cleanCode} aplicado com sucesso! (-${discountPercent}%)`
          };
        }
        return { isValid: false, message: 'Cupom inválido ou inexistente.' };
      }

      const couponDoc = snap.docs[0];
      const couponData = { id: couponDoc.id, ...couponDoc.data() };

      // 1. Valida se está ativo
      if (couponData.active === false) {
        return { isValid: false, message: 'Este cupom está temporariamente desativado.' };
      }

      // 2. Valida data de expiração
      if (couponData.validUntil) {
        const today = new Date().toISOString().split('T')[0];
        if (today > couponData.validUntil) {
          return { isValid: false, message: 'Este cupom já expirou.' };
        }
      }

      // 3. Valida valor mínimo de compra
      if (couponData.minOrderValue && cartSubtotal < Number(couponData.minOrderValue)) {
        return {
          isValid: false,
          message: `Este cupom é válido apenas para compras acima de R$ ${Number(couponData.minOrderValue).toFixed(2)}.`
        };
      }

      const discountPercent = Number(couponData.discountPercent) || 0;
      const discountValue = (cartSubtotal * discountPercent) / 100;

      return {
        isValid: true,
        coupon: couponData,
        discountPercent,
        discountValue,
        message: `Cupom ${cleanCode} aplicado com sucesso! (-${discountPercent}%)`
      };
    } catch (err) {
      console.error("Erro ao validar cupom no Firestore:", err);
      return { isValid: false, message: 'Erro de conexão ao validar cupom. Tente novamente.' };
    }
  },

  /**
   * Registra a utilização do cupom após o fechamento da compra no Checkout diretamente no Firestore
   */
  async recordCouponUsage(couponId, orderSubtotal, discountGiven, totalItemsCount) {
    if (!couponId) return;

    try {
      const couponRef = doc(db, 'coupons', couponId);
      const couponSnap = await getDoc(couponRef);
      
      if (!couponSnap.exists()) return;
      const data = couponSnap.data() || {};

      const isAffiliate = data.type === 'affiliate';
      const currentItems = (Number(data.itemsSold) || 0) + totalItemsCount;
      
      // Determina a taxa de comissão progressiva da THR33 (8% a 15%)
      let newCommissionRate = 0;
      if (isAffiliate) {
        if (currentItems >= 20) newCommissionRate = 15;
        else if (currentItems >= 10) newCommissionRate = 10;
        else newCommissionRate = 8;
      }

      const netOrderForCommission = Math.max(0, (Number(orderSubtotal) || 0) - (Number(discountGiven) || 0));
      const commissionGenerated = isAffiliate 
        ? Math.round(((netOrderForCommission * newCommissionRate) / 100) * 100) / 100 
        : 0;

      await setDoc(couponRef, {
        usageCount: increment(1),
        itemsSold: increment(totalItemsCount),
        grossRevenue: increment(Number(orderSubtotal) || 0),
        discountGiven: increment(Number(discountGiven) || 0),
        commissionPending: increment(commissionGenerated),
        commissionRate: newCommissionRate,
        hasRecentSales: true,
        lastUsedAt: new Date().toISOString()
      }, { merge: true });

    } catch (err) {
      console.warn("Aviso ao registrar métricas do cupom no Firestore:", err.message);
    }
  }
};

export default couponService;
