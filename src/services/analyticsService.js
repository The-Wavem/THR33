import { doc, setDoc, increment } from 'firebase/firestore';
import { db } from './firebaseConfig';

const SUMMARY_DOC_REF = doc(db, 'analytics', 'summary');

// Cache em memória para evitar registros duplicados em curto intervalo
const recentEvents = new Map();
const DEDUPLICATION_WINDOW_MS = 1000;

function shouldTrack(eventKey) {
  const now = Date.now();
  const lastTime = recentEvents.get(eventKey) || 0;
  if (now - lastTime < DEDUPLICATION_WINDOW_MS) {
    return false;
  }
  recentEvents.set(eventKey, now);

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
   * Rastreia uso de filtros no catálogo (Ex: fit_boxy, cat_camisa)
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
   * Rastreia visualização detalhada da peça na PDP
   */
  async trackProductView(productId, productName, category = '', fit = '') {
    if (!productId) return;
    const cleanId = String(productId).replace(/[./#$\[\]]/g, '_');
    const eventKey = `productView:${cleanId}`;

    if (!shouldTrack(eventKey)) return;

    try {
      await setDoc(SUMMARY_DOC_REF, {
        [`products.${cleanId}.views`]: increment(1),
        [`products.${cleanId}.name`]: productName || cleanId,
        [`products.${cleanId}.category`]: category || 'camisa',
        [`products.${cleanId}.fit`]: fit || 'boxy',
        'funnel.pdpViews': increment(1),
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn("Aviso telemetria (view produto):", err.message);
    }
  },

  /**
   * Rastreia adição de item ao carrinho
   */
  async trackAddToCart(item) {
    if (!item?.id && !item?.slug) return;
    const cleanId = String(item.id || item.slug).replace(/[./#$\[\]]/g, '_');
    const qty = Number(item.quantity) || 1;

    try {
      await setDoc(SUMMARY_DOC_REF, {
        [`products.${cleanId}.addedToCart`]: increment(qty),
        [`products.${cleanId}.name`]: item.name || cleanId,
        [`products.${cleanId}.fit`]: item.fit || 'boxy',
        [`sizes.${item.size || 'M'}`]: increment(qty),
        'funnel.cartAdds': increment(qty),
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn("Aviso telemetria (add carrinho):", err.message);
    }
  },

  /**
   * Rastreia remoção/desistência de item do carrinho
   */
  async trackRemoveFromCart(item) {
    if (!item?.id && !item?.slug) return;
    const cleanId = String(item.id || item.slug).replace(/[./#$\[\]]/g, '_');
    const qty = Number(item.quantity) || 1;

    try {
      await setDoc(SUMMARY_DOC_REF, {
        [`products.${cleanId}.removedFromCart`]: increment(qty),
        'funnel.cartRemoves': increment(qty),
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn("Aviso telemetria (remove carrinho):", err.message);
    }
  },

  /**
   * Rastreia conversão final da compra por produto
   */
  async trackPurchase(items = []) {
    if (!items || items.length === 0) return;
    const updates = {
      'funnel.purchases': increment(1),
      lastUpdated: new Date().toISOString()
    };

    items.forEach(item => {
      const cleanId = String(item.id || item.slug || 'item').replace(/[./#$\[\]]/g, '_');
      const qty = Number(item.quantity) || 1;
      updates[`products.${cleanId}.purchases`] = increment(qty);
    });

    try {
      await setDoc(SUMMARY_DOC_REF, updates, { merge: true });
    } catch (err) {
      console.warn("Aviso telemetria (compra concluída):", err.message);
    }
  },

  /**
   * Rastreia visualização de páginas gerais
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
   * Rastreia sessões ativas no Checkout
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
