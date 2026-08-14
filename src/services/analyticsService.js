import { doc, setDoc, increment } from 'firebase/firestore';
import { db } from './firebaseConfig';

const SUMMARY_DOC_REF = doc(db, 'analytics', 'summary');

export const analyticsService = {
  /**
   * Registra a seleção de um filtro no catálogo (Ex: fit_boxy, cat_camisa)
   */
  async trackFilterUse(filterGroup, value) {
    if (!value) return;
    const cleanGroup = String(filterGroup).toLowerCase().replace(/\s+/g, '_');
    const cleanValue = String(value).toLowerCase().replace(/\s+/g, '_');
    const fieldKey = `filters.${cleanGroup}_${cleanValue}`;
    try {
      await setDoc(SUMMARY_DOC_REF, {
        [fieldKey]: increment(1),
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn("Aviso telemetria (filtro):", err.message);
    }
  },

  /**
   * Registra a visualização/clique em um produto
   */
  async trackProductView(productId, productName) {
    if (!productId) return;
    const cleanId = String(productId).replace(/[./#$\[\]]/g, '_');
    const countKey = `products.${cleanId}.views`;
    const nameKey = `products.${cleanId}.name`;
    try {
      await setDoc(SUMMARY_DOC_REF, {
        [countKey]: increment(1),
        [nameKey]: productName || productId,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn("Aviso telemetria (produto):", err.message);
    }
  },

  /**
   * Registra visualização de uma página específica
   */
  async trackPageView(pageName) {
    if (!pageName) return;
    const cleanName = String(pageName).replace(/[./#$\[\]]/g, '_');
    const pageKey = `pageViews.${cleanName}`;
    try {
      await setDoc(SUMMARY_DOC_REF, {
        [pageKey]: increment(1),
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn("Aviso telemetria (pageView):", err.message);
    }
  }
};

export default analyticsService;
