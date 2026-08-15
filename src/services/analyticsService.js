import { doc, setDoc, increment } from 'firebase/firestore';
import { db } from './firebaseConfig';

const SUMMARY_DOC_REF = doc(db, 'analytics', 'summary');

// Cache em memória para evitar registros duplicados em curto intervalo (StrictMode do React, double-clicks, bubbling)
const recentEvents = new Map();
const DEDUPLICATION_WINDOW_MS = 1000;

function shouldTrack(eventKey) {
  const now = Date.now();
  const lastTime = recentEvents.get(eventKey) || 0;
  if (now - lastTime < DEDUPLICATION_WINDOW_MS) {
    return false;
  }
  recentEvents.set(eventKey, now);

  // Limpeza de cache antigo periodicamente para não acumular memória
  if (recentEvents.size > 100) {
    for (const [key, timestamp] of recentEvents.entries()) {
      if (now - timestamp > DEDUPLICATION_WINDOW_MS * 5) {
        recentEvents.delete(key);
      }
    }
  }
  return true;
}

function sanitizePayload(obj) {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizePayload);
  const clean = {};
  for (const [k, v] of Object.entries(obj)) {
    clean[k] = v === undefined ? null : sanitizePayload(v);
  }
  return clean;
}

export const analyticsService = {
  /**
   * Registra a seleção de um filtro no catálogo (Ex: fit_boxy, cat_camisa)
   */
  async trackFilterUse(filterGroup, value) {
    if (!value) return;
    const cleanGroup = String(filterGroup).toLowerCase().replace(/\s+/g, '_');
    const cleanValue = String(value).toLowerCase().replace(/\s+/g, '_');
    const eventKey = `filter:${cleanGroup}_${cleanValue}`;

    if (!shouldTrack(eventKey)) return;

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
    const eventKey = `product:${cleanId}`;

    if (!shouldTrack(eventKey)) return;

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
    const eventKey = `page:${cleanName}`;

    if (!shouldTrack(eventKey)) return;

    const pageKey = `pageViews.${cleanName}`;
    try {
      await setDoc(SUMMARY_DOC_REF, {
        [pageKey]: increment(1),
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn("Aviso telemetria (pageView):", err.message);
    }
  },

  /**
   * Registra a etapa atual do Checkout para monitoramento de abandono de carrinho
   */
  async trackCheckoutSession(sessionId, sessionData) {
    if (!sessionId) return;
    try {
      const sessionRef = doc(db, 'checkout_sessions', sessionId);
      const cleanData = sanitizePayload(sessionData);
      await setDoc(sessionRef, {
        ...cleanData,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn("Aviso telemetria (checkout session):", err.message);
    }
  }
};

export default analyticsService;
