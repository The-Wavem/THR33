import { 
  doc, 
  setDoc, 
  increment, 
  collection, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
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
   * Retorna o UTM ativo da sessão com validação de janela temporal de atribuição
   * Expira ao fechar o navegador/aba ou após 24 horas
   */
  getActiveUtm() {
    if (typeof window === 'undefined') return null;
    try {
      // 1. Tenta sessionStorage (limpo automaticamente ao fechar a aba/navegador)
      let raw = sessionStorage.getItem('thr33_active_utm');
      
      // 2. Fallback de localStorage caso tenha mudado de aba/contexto
      if (!raw) {
        raw = localStorage.getItem('thr33_active_utm');
      }

      if (!raw) return null;

      const data = JSON.parse(raw);
      if (!data || (!data.utm_campaign && !data.utm_source)) return null;

      // Janela de atribuição máxima: 24 horas
      const MAX_UTM_AGE_MS = 24 * 60 * 60 * 1000;
      const age = Date.now() - Number(data.timestamp || 0);
      if (age > MAX_UTM_AGE_MS) {
        this.clearActiveUtm();
        return null;
      }

      return data;
    } catch (_) {
      return null;
    }
  },

  /**
   * Limpa a atribuição UTM ativa
   */
  clearActiveUtm() {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.removeItem('thr33_active_utm');
      sessionStorage.removeItem('thr33_utm_source');
      sessionStorage.removeItem('thr33_utm_medium');
      sessionStorage.removeItem('thr33_utm_campaign');
      localStorage.removeItem('thr33_active_utm');
    } catch (_) {}
  },

  /**
   * Captura, congela e atribui clique de UTM na URL atual
   * Salva no sessionStorage (expira ao fechar) e incrementa cliques no Firestore
   */
  async checkAndTrackUtm() {
    if (typeof window === 'undefined') return;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const utm_campaign = urlParams.get('utm_campaign');
      const utm_source = urlParams.get('utm_source');
      const utm_medium = urlParams.get('utm_medium');

      // Se não há novos parâmetros UTM na rota atual, preserva o UTM ativo na sessão
      if (!utm_campaign && !utm_source) return;

      const cleanUtm = utm_campaign 
        ? String(utm_campaign).toLowerCase().trim().replace(/[./#$\[\]\s]/g, '_')
        : '';
      const cleanSource = utm_source 
        ? String(utm_source).toLowerCase().trim().replace(/[./#$\[\]\s]/g, '_')
        : 'instagram';
      const cleanMedium = utm_medium 
        ? String(utm_medium).toLowerCase().trim().replace(/[./#$\[\]\s]/g, '_')
        : 'stories';

      // Salva o UTM ativo congelado na sessão
      const utmData = { 
        utm_campaign: cleanUtm, 
        utm_source: cleanSource, 
        utm_medium: cleanMedium, 
        timestamp: Date.now() 
      };

      sessionStorage.setItem('thr33_active_utm', JSON.stringify(utmData));
      if (cleanSource) sessionStorage.setItem('thr33_utm_source', cleanSource);
      if (cleanMedium) sessionStorage.setItem('thr33_utm_medium', cleanMedium);
      if (cleanUtm) sessionStorage.setItem('thr33_utm_campaign', cleanUtm);
      localStorage.setItem('thr33_active_utm', JSON.stringify(utmData));

      if (cleanUtm) {
        const sessionKey = `tracked_utm_${cleanUtm}`;
        const alreadyTracked = sessionStorage.getItem(sessionKey);

        if (!alreadyTracked) {
          sessionStorage.setItem(sessionKey, 'true');

          // Incrementa clique na campanha correspondente
          const q = query(collection(db, 'campaigns'), where('utm_campaign', '==', cleanUtm));
          const snap = await getDocs(q);

          if (!snap.empty) {
            const campDoc = snap.docs[0];
            await setDoc(doc(db, 'campaigns', campDoc.id), {
              clicks: increment(1),
              lastClickAt: new Date().toISOString()
            }, { merge: true });
          }

          // Registra no sumário global
          await setDoc(SUMMARY_DOC_REF, {
            [`utm_clicks.${cleanUtm}`]: increment(1),
            lastUpdated: new Date().toISOString()
          }, { merge: true });
        }
      }
    } catch (err) {
      console.warn("Aviso ao registrar clique UTM:", err.message);
    }
  },

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
   * Rastreia adição de item ao carrinho com atribuição de campanha UTM
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

      // 3. Atribuição UTM na Sacola com validação de expiração
      const activeUtm = this.getActiveUtm();
      if (activeUtm?.utm_campaign) {
        const q = query(collection(db, 'campaigns'), where('utm_campaign', '==', activeUtm.utm_campaign));
        const snap = await getDocs(q);
        if (!snap.empty) {
          await setDoc(doc(db, 'campaigns', snap.docs[0].id), {
            cartAdds: increment(qty),
            lastCartAddAt: now
          }, { merge: true });
        }
      }
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
   * Rastreia conversão final da compra por produto, tamanho, cor, categoria e atribuição UTM
   */
  async trackPurchase(items = [], totalAmount = 0) {
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

      // Atribuição UTM na Compra & Faturamento
      const activeUtm = this.getActiveUtm();
      if (activeUtm?.utm_campaign) {
        const q = query(collection(db, 'campaigns'), where('utm_campaign', '==', activeUtm.utm_campaign));
        const snap = await getDocs(q);
        if (!snap.empty) {
          await setDoc(doc(db, 'campaigns', snap.docs[0].id), {
            purchases: increment(1),
            revenue: increment(Number(totalAmount) || 0),
            lastPurchaseAt: now
          }, { merge: true });
        }

        // Incrementa faturamento no sumário global por UTM
        await setDoc(SUMMARY_DOC_REF, {
          [`utm_purchases.${activeUtm.utm_campaign}`]: increment(1),
          [`utm_revenue.${activeUtm.utm_campaign}`]: increment(Number(totalAmount) || 0),
          lastUpdated: now
        }, { merge: true });
      }
    } catch (err) {
      console.warn("Aviso telemetria (compra concluída):", err.message);
    }
  },

  /**
   * Rastreia visualização de páginas gerais e checa parâmetros UTM
   */
  async trackPageView(pageName) {
    if (!pageName) return;
    const cleanName = String(pageName).replace(/[./#$\[\]]/g, '_');
    const eventKey = `page:${cleanName}`;

    // Dispara captura de UTM se presente na query string
    this.checkAndTrackUtm();

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

const DEFAULT_COLOR_HEX = {
  'preto_piano': '#000000',
  'preto': '#000000',
  'off_white': '#f5f5f0',
  'off-white': '#f5f5f0',
  'grafite': '#383838',
  'grafite_/_chumbo': '#383838',
  'cinza_mescla': '#7a7a7a',
  'cinza': '#7a7a7a'
};

const CATEGORY_NAMES = {
  'camisa': 'Camisetas / Camisas',
  'jaqueta': 'Jaquetas & Casacos',
  'calca': 'Calças & Bermudas',
  'brinde': 'Vales & Brindes'
};

/**
 * Agregação 100% Dinâmica baseada no catálogo ativo e histórico de pedidos aprovados
 */
export function calculateDynamicMetrics(activeProducts = [], completedOrders = []) {
  // 1. Dicionários baseados exclusivamente nos produtos do catálogo ativo
  const categoriesMap = {};
  const sizesMap = {};
  const colorsMap = {};

  // Inicializa a estrutura a partir do catálogo
  activeProducts.forEach((product) => {
    // Categorias ativas
    const rawCat = product.category || 'camisa';
    const catLabel = CATEGORY_NAMES[String(rawCat).toLowerCase()] || product.category || 'Outros';
    const catKey = String(rawCat).toLowerCase();
    if (!categoriesMap[catKey]) {
      categoriesMap[catKey] = { key: catKey, label: catLabel, units: 0, revenue: 0 };
    }

    // Grades de tamanhos cadastradas no produto
    if (Array.isArray(product.sizes)) {
      product.sizes.forEach((size) => {
        const sz = String(size).toUpperCase();
        if (!sizesMap[sz]) sizesMap[sz] = 0;
      });
    } else if (product.stock && typeof product.stock === 'object') {
      Object.keys(product.stock).forEach((size) => {
        const sz = String(size).toUpperCase();
        if (!sizesMap[sz]) sizesMap[sz] = 0;
      });
    } else {
      ['PP', 'P', 'M', 'G', 'GG'].forEach(sz => {
        if (!sizesMap[sz]) sizesMap[sz] = 0;
      });
    }

    // Cores cadastradas no produto
    if (Array.isArray(product.colors)) {
      product.colors.forEach((color) => {
        const colorName = typeof color === 'string' ? color : (color?.name || color?.id);
        const cleanKey = String(colorName).toLowerCase().replace(/\s+/g, '_');
        const colorHex = typeof color === 'object' ? (color?.hex || DEFAULT_COLOR_HEX[cleanKey] || '#ffffff') : (DEFAULT_COLOR_HEX[cleanKey] || '#ffffff');
        if (colorName && !colorsMap[colorName]) {
          colorsMap[colorName] = { key: cleanKey, name: colorName, units: 0, hex: colorHex };
        }
      });
    } else if (product.color) {
      const colorName = typeof product.color === 'string' ? product.color : (product.color?.name || product.color?.id);
      const cleanKey = String(colorName).toLowerCase().replace(/\s+/g, '_');
      const colorHex = typeof product.color === 'object' ? (product.color?.hex || DEFAULT_COLOR_HEX[cleanKey] || '#ffffff') : (DEFAULT_COLOR_HEX[cleanKey] || '#ffffff');
      if (colorName && !colorsMap[colorName]) {
        colorsMap[colorName] = { key: cleanKey, name: colorName, units: 0, hex: colorHex };
      }
    }
  });

  if (Object.keys(sizesMap).length === 0) {
    ['PP', 'P', 'M', 'G', 'GG'].forEach(sz => { sizesMap[sz] = 0; });
  }

  // 2. Itera sobre pedidos e sessões completas
  completedOrders.forEach((order) => {
    if (!Array.isArray(order.items)) return;

    order.items.forEach((item) => {
      const itemId = String(item.id || item.slug || '');
      const itemName = item.name ? String(item.name).trim().toLowerCase() : '';

      const currentProduct = activeProducts.find((p) => 
        String(p.id) === itemId || 
        String(p.slug) === itemId || 
        (p.name && String(p.name).trim().toLowerCase() === itemName)
      );

      const qty = Number(item.quantity || item.qty || 1);
      const price = Number(item.price || currentProduct?.price || 0);

      // Soma na Categoria
      const rawCat = String(currentProduct?.category || item.category || 'camisa').toLowerCase();
      if (categoriesMap[rawCat]) {
        categoriesMap[rawCat].units += qty;
        categoriesMap[rawCat].revenue += price * qty;
      } else {
        const catLabel = CATEGORY_NAMES[rawCat] || rawCat;
        categoriesMap[rawCat] = { key: rawCat, label: catLabel, units: qty, revenue: price * qty };
      }

      // Soma no Tamanho
      const rawSize = String(item.size || 'M').toUpperCase();
      if (sizesMap[rawSize] !== undefined) {
        sizesMap[rawSize] += qty;
      } else {
        sizesMap[rawSize] = qty;
      }

      // Soma na Cor
      let rawColorName = typeof item.color === 'object' ? (item.color?.name || item.color?.id) : item.color;
      if (!rawColorName && currentProduct) {
        rawColorName = typeof currentProduct.color === 'object' ? (currentProduct.color?.name || currentProduct.color?.id) : currentProduct.color;
      }
      if (!rawColorName && currentProduct?.colors && currentProduct.colors[0]) {
        rawColorName = typeof currentProduct.colors[0] === 'object' ? (currentProduct.colors[0]?.name || currentProduct.colors[0]?.id) : currentProduct.colors[0];
      }
      if (!rawColorName) rawColorName = 'Preto Piano';

      const colorMatchKey = Object.keys(colorsMap).find(k => k.toLowerCase() === String(rawColorName).toLowerCase());
      if (colorMatchKey && colorsMap[colorMatchKey]) {
        colorsMap[colorMatchKey].units += qty;
      } else {
        const cleanKey = String(rawColorName).toLowerCase().replace(/\s+/g, '_');
        const hex = DEFAULT_COLOR_HEX[cleanKey] || '#000000';
        colorsMap[rawColorName] = { key: cleanKey, name: rawColorName, units: qty, hex };
      }
    });
  });

  // 3. Converte em arrays ordenados
  const categoriesList = Object.values(categoriesMap).sort((a, b) => b.revenue - a.revenue || b.units - a.units);
  
  const standardSizeOrder = ['PP', 'P', 'M', 'G', 'GG'];
  const sizesList = Object.entries(sizesMap).map(([size, sales]) => ({
    size,
    sales
  })).sort((a, b) => {
    const idxA = standardSizeOrder.indexOf(a.size);
    const idxB = standardSizeOrder.indexOf(b.size);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    return b.sales - a.sales;
  });

  const colorsList = Object.values(colorsMap).sort((a, b) => b.units - a.units);

  return {
    categories: categoriesList,
    sizes: sizesList,
    colors: colorsList
  };
}

export default analyticsService;
