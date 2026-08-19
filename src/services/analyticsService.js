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
   * Rastreia visualização detalhada da peça na PDP e Vitrine
   * Registra a visualização na coleção products/{productId} e no analytics/summary
   */
  async trackProductView(productId, productName = '', category = '', fit = '', slug = '') {
    if (!productId) return;
    const cleanId = String(productId).replace(/[./#$\[\]]/g, '_');
    const cleanSlug = slug ? String(slug).replace(/[./#$\[\]]/g, '_') : '';
    const eventKey = `productView:${cleanId}`;

    if (!shouldTrack(eventKey)) return;

    try {
      const now = new Date().toISOString();
      const productDocRef = doc(db, 'products', cleanId);

      // 1. Incrementa o contador diretamente no documento do produto
      await setDoc(productDocRef, {
        views: increment(1),
        lastViewedAt: now
      }, { merge: true });

      if (cleanSlug && cleanSlug !== cleanId) {
        try {
          const slugDocRef = doc(db, 'products', cleanSlug);
          await setDoc(slugDocRef, {
            views: increment(1),
            lastViewedAt: now
          }, { merge: true });
        } catch (_) {}
      }

      // 2. Incrementa o sumário global de analytics e funil
      const updates = {
        [`products.${cleanId}.views`]: increment(1),
        [`products.${cleanId}.name`]: productName || cleanId,
        [`products.${cleanId}.category`]: category || 'camisa',
        [`products.${cleanId}.fit`]: fit || 'boxy',
        'funnel.pdpViews': increment(1),
        lastUpdated: now
      };

      if (cleanSlug && cleanSlug !== cleanId) {
        updates[`products.${cleanSlug}.views`] = increment(1);
        updates[`products.${cleanSlug}.name`] = productName || cleanSlug;
        updates[`products.${cleanSlug}.category`] = category || 'camisa';
        updates[`products.${cleanSlug}.fit`] = fit || 'boxy';
      }

      await setDoc(SUMMARY_DOC_REF, updates, { merge: true });
    } catch (err) {
      console.warn("Aviso ao registrar view do produto:", err.message);
    }
  },

  /**
   * Rastreia adição de item ao carrinho
   */
  async trackAddToCart(item) {
    if (!item?.id && !item?.slug) return;
    const cleanId = String(item.id || item.slug).replace(/[./#$\[\]]/g, '_');
    const cleanSlug = item.slug ? String(item.slug).replace(/[./#$\[\]]/g, '_') : '';
    const qty = Number(item.quantity) || 1;
    const rawColor = typeof item.color === 'object' ? (item.color?.name || item.color?.id) : item.color;
    const colorKey = rawColor ? `colors.${String(rawColor).toLowerCase().replace(/\s+/g, '_')}` : 'colors.preto_piano';
    const sizeKey = item.size ? `sizes.${item.size}` : 'sizes.M';
    const catKey = item.category ? `categories.${item.category}` : 'categories.camisa';

    try {
      const now = new Date().toISOString();
      const productRef = doc(db, 'products', cleanId);

      // 1. Grava diretamente no documento do produto
      await setDoc(productRef, {
        addedToCart: increment(qty),
        lastAddedToCartAt: now
      }, { merge: true });

      if (cleanSlug && cleanSlug !== cleanId) {
        try {
          const slugRef = doc(db, 'products', cleanSlug);
          await setDoc(slugRef, {
            addedToCart: increment(qty),
            lastAddedToCartAt: now
          }, { merge: true });
        } catch (_) {}
      }

      // 2. Grava no sumário global
      const updates = {
        [`products.${cleanId}.addedToCart`]: increment(qty),
        [`products.${cleanId}.name`]: item.name || cleanId,
        [`products.${cleanId}.fit`]: item.fit || 'boxy',
        [colorKey]: increment(qty),
        [sizeKey]: increment(qty),
        [catKey]: increment(qty),
        'funnel.cartAdds': increment(qty),
        lastUpdated: now
      };

      if (cleanSlug && cleanSlug !== cleanId) {
        updates[`products.${cleanSlug}.addedToCart`] = increment(qty);
      }

      await setDoc(SUMMARY_DOC_REF, updates, { merge: true });
    } catch (err) {
      console.warn("Aviso telemetria (add carrinho):", err.message);
    }
  },

  /**
   * Rastreia remoção/desistência de item do carrinho
   */
  async trackRemoveFromCart(item, qty = 1) {
    if (!item?.id && !item?.slug) return;
    const cleanId = String(item.id || item.slug).replace(/[./#$\[\]]/g, '_');
    const cleanSlug = item.slug ? String(item.slug).replace(/[./#$\[\]]/g, '_') : '';
    const removeQty = Number(qty) || Number(item.quantity) || 1;

    try {
      const now = new Date().toISOString();
      const productRef = doc(db, 'products', cleanId);

      // 1. Grava diretamente no documento do produto
      await setDoc(productRef, {
        removedFromCart: increment(removeQty),
        lastRemovedFromCartAt: now
      }, { merge: true });

      if (cleanSlug && cleanSlug !== cleanId) {
        try {
          const slugRef = doc(db, 'products', cleanSlug);
          await setDoc(slugRef, {
            removedFromCart: increment(removeQty),
            lastRemovedFromCartAt: now
          }, { merge: true });
        } catch (_) {}
      }

      // 2. Grava no sumário global
      const updates = {
        [`products.${cleanId}.removedFromCart`]: increment(removeQty),
        'funnel.cartRemoves': increment(removeQty),
        lastUpdated: now
      };

      if (cleanSlug && cleanSlug !== cleanId) {
        updates[`products.${cleanSlug}.removedFromCart`] = increment(removeQty);
      }

      await setDoc(SUMMARY_DOC_REF, updates, { merge: true });
    } catch (err) {
      console.warn("Aviso telemetria (remove carrinho):", err.message);
    }
  },

  /**
   * Rastreia início da sessão de checkout (Etapa 3 do Funil)
   */
  async trackCheckoutStart() {
    try {
      await setDoc(SUMMARY_DOC_REF, {
        'funnel.checkoutStarts': increment(1),
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn("Aviso telemetria (inicio checkout):", err.message);
    }
  },

  /**
   * Rastreia conversão final da compra por produto, tamanho, cor e categoria
   */
  async trackPurchase(items = []) {
    if (!items || items.length === 0) return;
    const now = new Date().toISOString();
    const updates = {
      'funnel.purchases': increment(1),
      lastUpdated: now
    };

    for (const item of items) {
      const cleanId = String(item.id || item.slug || 'item').replace(/[./#$\[\]]/g, '_');
      const cleanSlug = item.slug ? String(item.slug).replace(/[./#$\[\]]/g, '_') : '';
      const qty = Number(item.quantity) || 1;
      const sz = String(item.size || 'M').toUpperCase();
      const rawColor = typeof item.color === 'object' ? (item.color?.name || item.color?.id) : item.color;
      const col = rawColor ? String(rawColor).toLowerCase().replace(/\s+/g, '_') : 'preto_piano';
      const cat = String(item.category || 'camisa').toLowerCase();

      updates[`products.${cleanId}.purchases`] = increment(qty);
      if (cleanSlug && cleanSlug !== cleanId) {
        updates[`products.${cleanSlug}.purchases`] = increment(qty);
      }
      updates[`sizes.${sz}`] = increment(qty);
      updates[`sales_sizes.${sz}`] = increment(qty);
      updates[`sales_colors.${col}`] = increment(qty);
      updates[`sales_categories.${cat}`] = increment(qty);

      // Atualiza vendas no documento do produto
      try {
        const productRef = doc(db, 'products', cleanId);
        await setDoc(productRef, {
          purchases: increment(qty),
          lastSoldAt: now
        }, { merge: true });

        if (cleanSlug && cleanSlug !== cleanId) {
          const slugRef = doc(db, 'products', cleanSlug);
          await setDoc(slugRef, {
            purchases: increment(qty),
            lastSoldAt: now
          }, { merge: true });
        }
      } catch (e) {
        console.warn("Erro ao atualizar compra no produto:", e.message);
      }
    }

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
