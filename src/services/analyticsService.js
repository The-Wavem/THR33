import { 
  doc, 
  setDoc, 
  increment, 
  collection, 
  getDocs, 
  query, 
  where,
  serverTimestamp 
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
   * Rastreia conversão final da compra por produto, tamanho, cor, categoria, método de pagamento, destino e atribuição UTM
   */
  async trackPurchase(items = [], totalAmount = 0, metadata = {}) {
    if (!items || items.length === 0) return;
    const now = new Date().toISOString();
    const updates = {
      'funnel.purchases': increment(1),
      lastUpdated: now
    };

    // Coleta adicional de telemetria de pagamento, local de entrega e modalidade de envio
    if (metadata.paymentMethod) {
      const pmKey = String(metadata.paymentMethod).toLowerCase().replace(/[\s\-_]+/g, '_').replace(/ç/g, 'c').replace(/ã/g, 'a').replace(/é/g, 'e');
      updates[`payment_methods.${pmKey}`] = increment(1);
    }
    if (metadata.shippingState) {
      const stKey = String(metadata.shippingState).toUpperCase().trim();
      if (stKey.length === 2) {
        updates[`shipping_states.${stKey}`] = increment(1);
      }
    }
    if (metadata.carrier || metadata.shippingMethod) {
      const shipKey = String(metadata.carrier || metadata.shippingMethod).toLowerCase().replace(/[\s\-_]+/g, '_').replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i');
      updates[`shipping_methods.${shipKey}`] = increment(1);
    }

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
  },

  /**
   * Rastreia telemetria e integridade de pagamentos (latência em ms, erros de gateway, recusas de cartão)
   */
  async trackPaymentTelemetry({
    success = true,
    latencyMs = 0,
    paymentMethod = 'PIX',
    reasonCategory = 'SUCESSO',
    errorCode = null,
    errorMessage = null,
    orderId = null
  }) {
    const now = new Date().toISOString();
    const cleanCategory = String(reasonCategory || 'OUTRO').toUpperCase().replace(/[\s\-_]+/g, '_');

    try {
      // 1. Atualiza métricas agregadas em analytics/summary
      const updates = {
        'payment_health.total_attempts': increment(1),
        [success ? 'payment_health.successful_attempts' : 'payment_health.failed_attempts']: increment(1),
        lastUpdated: now
      };

      if (!success) {
        updates[`payment_health.failures.${cleanCategory}`] = increment(1);
      }

      await setDoc(SUMMARY_DOC_REF, updates, { merge: true });

      // 2. Grava evento atômico na coleção payment_telemetry para auditoria e linha temporal de latência
      const logRef = doc(collection(db, 'payment_telemetry'));
      await setDoc(logRef, {
        timestamp: now,
        success: Boolean(success),
        latencyMs: Math.max(0, Math.round(Number(latencyMs) || 0)),
        paymentMethod: String(paymentMethod || 'PIX'),
        reasonCategory: cleanCategory,
        errorCode: errorCode ? String(errorCode) : null,
        errorMessage: errorMessage ? String(errorMessage).slice(0, 255) : null,
        orderId: orderId ? String(orderId) : null
      });
    } catch (err) {
      console.warn("Aviso ao registrar telemetria de pagamento:", err.message);
    }
  },

  /**
   * Rastreia simulação de frete no catálogo ou PDP (interesse territorial por UF)
   */
  async trackShippingSimulation(stateUf = 'SP') {
    if (!stateUf) return;
    const cleanUf = String(stateUf).toUpperCase().trim();
    if (cleanUf.length !== 2) return;
    const eventKey = `cep_sim:${cleanUf}`;
    if (!shouldTrack(eventKey)) return;

    try {
      await setDoc(SUMMARY_DOC_REF, {
        [`shipping_simulations.${cleanUf}`]: increment(1),
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn("Aviso ao registrar simulação de frete:", err.message);
    }
  },

  /**
   * Detector Leve e 100% Anônimo de Ambiente (LGPD Art. 12 — Zero IP ou dados pessoais)
   */
  getClientTelemetry() {
    return getClientTelemetry();
  },

  /**
   * Separação estrita entre Visitantes/Sessões Únicas (visits) e Visualizações de Página (pageViews)
   * Coleta telemetria de Dispositivo, OS, Navegador e Origem de Tráfego apenas 1x por sessão
   */
  trackSessionVisit(path = '/') {
    if (typeof window === 'undefined') return;
    // Ignora rotas administrativas do CMS para não poluir métricas da loja
    if (String(path).startsWith('/cms') || String(path).startsWith('/admin')) return;

    const cleanPath =
      String(path || '/')
        .split('?')[0]
        .split('#')[0]
        .replace(/^\/+/, '')
        .replace(/[./#$\[\]\/]/g, '_') || 'home';

    const todayKey = new Date().toISOString().slice(0, 10);
    const dailyDocRef = doc(db, 'analytics_daily', todayKey);

    try {
      const isSessionRecorded = sessionStorage.getItem('thr33_telemetry_v2_recorded');
      const lastTrackedPath = sessionStorage.getItem('thr33_last_tracked_path');

      if (!isSessionRecorded) {
        // 1. NOVA SESSÃO ÚNICA (Força coleta imediata de telemetria mesmo em abas já abertas)
        sessionStorage.setItem('thr33_telemetry_v2_recorded', '1');
        sessionStorage.setItem('thr33_last_tracked_path', cleanPath);

        const { deviceType, os, browser, trafficSource } = getClientTelemetry();

        const recordInitialSession = async () => {
          try {
            await setDoc(
              dailyDocRef,
              {
                date: todayKey,
                visits: increment(1),
                pageViews: increment(1),
                devices: { [deviceType]: increment(1) },
                os: { [os]: increment(1) },
                browsers: { [browser]: increment(1) },
                sources: { [trafficSource]: increment(1) },
                pages: { [cleanPath]: increment(1) },
                updatedAt: serverTimestamp()
              },
              { merge: true }
            );

            // Sincroniza também no sumário global para resiliência de leitura
            await setDoc(
              SUMMARY_DOC_REF,
              {
                totalVisits: increment(1),
                totalPageViews: increment(1),
                devices: { [deviceType]: increment(1) },
                os: { [os]: increment(1) },
                browsers: { [browser]: increment(1) },
                sources: { [trafficSource]: increment(1) },
                lastUpdated: new Date().toISOString()
              },
              { merge: true }
            );
          } catch (err) {
            console.warn('Aviso ao registrar sessão inicial:', err.message);
          }
        };

        // Disparo imediato sem atraso na montagem
        recordInitialSession();
      } else if (lastTrackedPath !== cleanPath) {
        // 2. NAVEGAÇÃO INTERNA NA MESMA SESSÃO (Apenas pageViews)
        sessionStorage.setItem('thr33_last_tracked_path', cleanPath);

        const recordInternalPageView = async () => {
          try {
            await setDoc(
              dailyDocRef,
              {
                date: todayKey,
                pageViews: increment(1),
                pages: { [cleanPath]: increment(1) },
                updatedAt: serverTimestamp()
              },
              { merge: true }
            );

            await setDoc(
              SUMMARY_DOC_REF,
              {
                totalPageViews: increment(1),
                lastUpdated: new Date().toISOString()
              },
              { merge: true }
            );
          } catch (err) {
            console.warn('Aviso ao registrar pageView interno:', err.message);
          }
        };

        recordInternalPageView();
      }
    } catch (e) {
      // Fallback caso sessionStorage esteja restrito
    }
  },

  /**
   * Busca e normaliza o histórico diário da coleção analytics_daily com fallback seguro para dados legados
   */
  async getDailyAnalyticsRange(days = 30) {
    return getDailyAnalyticsRange(days);
  }
};

/**
 * Detector puro e instantâneo de Telemetria de Ambiente (100% Anônimo — LGPD Art. 12)
 */
export function getClientTelemetry() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      deviceType: 'desktop',
      os: 'Outro',
      browser: 'Outro',
      trafficSource: 'Direto'
    };
  }

  const ua = navigator.userAgent || '';
  const width = window.innerWidth || 1024;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // 1. Device Type ('mobile' | 'tablet' | 'desktop')
  let deviceType = 'desktop';
  const isTabletUA = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua);
  const isMobileUA = /Mobi|iPhone|iPod|Android.*Mobile|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  if (isTabletUA || (width >= 768 && width <= 1024 && hasTouch && !isMobileUA)) {
    deviceType = 'tablet';
  } else if (isMobileUA || width < 768) {
    deviceType = 'mobile';
  }

  // 2. Sistema Operacional ('iOS' | 'Android' | 'Windows' | 'macOS' | 'Linux' | 'Outro')
  let os = 'Outro';
  if (/iPhone|iPad|iPod/i.test(ua) || (/Mac/i.test(ua) && hasTouch)) {
    os = 'iOS';
  } else if (/Android/i.test(ua)) {
    os = 'Android';
  } else if (/Windows/i.test(ua)) {
    os = 'Windows';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'macOS';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
  }

  // 3. Navegador ('Instagram/In-App' | 'Chrome' | 'Safari' | 'Edge' | 'Firefox' | 'Outro')
  let browser = 'Outro';
  if (/Instagram|FBAN|FBAV/i.test(ua)) {
    browser = 'Instagram/In-App';
  } else if (/Edg\//i.test(ua)) {
    browser = 'Edge';
  } else if (/Firefox|FxiOS/i.test(ua)) {
    browser = 'Firefox';
  } else if (/Chrome|CriOS/i.test(ua) && !/Edg\//i.test(ua)) {
    browser = 'Chrome';
  } else if (/Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua)) {
    browser = 'Safari';
  }

  // 4. Origem de Tráfego ('Instagram' | 'WhatsApp' | 'Google' | 'Direto' | 'Outro')
  let trafficSource = 'Direto';
  try {
    const ref = (document.referrer || '').toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const utmSource = (params.get('utm_source') || sessionStorage.getItem('thr33_utm_source') || '').toLowerCase();

    if (
      utmSource.includes('instagram') ||
      utmSource.includes('ig') ||
      ref.includes('instagram.com') ||
      browser === 'Instagram/In-App'
    ) {
      trafficSource = 'Instagram';
    } else if (
      utmSource.includes('whatsapp') ||
      utmSource.includes('wpp') ||
      ref.includes('wa.me') ||
      ref.includes('whatsapp.com')
    ) {
      trafficSource = 'WhatsApp';
    } else if (utmSource.includes('google') || ref.includes('google.')) {
      trafficSource = 'Google';
    } else if (utmSource || (ref && !ref.includes(window.location.hostname))) {
      trafficSource = 'Outro';
    }
  } catch (_) {
    trafficSource = 'Direto';
  }

  return {
    deviceType,
    os,
    browser,
    trafficSource
  };
}

/**
 * Helper de normalização que recupera tanto objetos aninhados reais quanto campos gravados com ponto
 */
export const extractNested = (data, prefix, defaults = {}) => {
  const result = { ...defaults, ...(data && typeof data[prefix] === 'object' ? data[prefix] : {}) };
  if (!data || typeof data !== 'object') return result;

  Object.keys(data).forEach(k => {
    if (k.startsWith(`${prefix}.`)) {
      const subKey = k.slice(prefix.length + 1);
      result[subKey] = (result[subKey] || 0) + (Number(data[k]) || 0);
    }
  });
  return result;
};

/**
 * Busca e normaliza documentos de analytics_daily para o intervalo solicitado
 */
export async function getDailyAnalyticsRange(days = 30) {
  try {
    const snap = await getDocs(collection(db, 'analytics_daily'));
    const docsByDate = {};

    snap.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const dateKey = data.date || docSnap.id;
      const devices = extractNested(data, 'devices', { mobile: 0, desktop: 0, tablet: 0 });
      const os = extractNested(data, 'os', {});
      const browsers = extractNested(data, 'browsers', {});
      const sources = extractNested(data, 'sources', {});
      const pages = extractNested(data, 'pages', {});

      const visits = Number(data.visits || 0);
      const pageViews = Number(data.pageViews || visits || 0);

      docsByDate[dateKey] = {
        id: docSnap.id,
        date: dateKey,
        visits,
        pageViews,
        devices,
        os,
        browsers,
        sources,
        pages
      };
    });

    const result = [];
    const now = new Date();
    const count = Math.max(1, Number(days) || 30);

    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const existing = docsByDate[key];
      result.push(
        existing || {
          id: key,
          date: key,
          visits: 0,
          pageViews: 0,
          devices: { mobile: 0, desktop: 0, tablet: 0 },
          os: {},
          browsers: {},
          sources: {},
          pages: {}
        }
      );
    }

    return result;
  } catch (err) {
    console.warn('Aviso ao carregar analytics_daily:', err.message);
    return [];
  }
}

/**
 * Identifica com 100% de precisão para qual Estado (UF) a encomenda do cliente está sendo enviada.
 * Verifica os campos de endereço de entrega e, como fallback seguro, extrai o CEP e converte pela faixa postal dos Correios.
 * NUNCA recorre a fallback cego de 'SP'. Retorna null se não identificado.
 */
export function resolveOrderDestinationUF(order) {
  if (!order || typeof order !== 'object') return null;

  // 1. Primeiro verifica os campos de endereço de entrega do pedido
  const rawState =
    order.shipping?.state ||
    order.shipping?.uf ||
    order.shippingAddress?.state ||
    order.shippingAddress?.region_code ||
    order.shippingAddress?.uf ||
    order.address?.state ||
    order.address?.uf ||
    order.shipping?.address?.state ||
    order.shipping?.address?.region_code ||
    order.shipping?.address?.uf ||
    order.customer?.state ||
    order.customer?.uf ||
    order.clientState ||
    order.nfe?.destinatario?.uf ||
    order.uf ||
    order.state;

  if (rawState && typeof rawState === 'string') {
    const cleanState = rawState
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();

    const STATE_NAME_TO_UF = {
      ACRE: 'AC',
      ALAGOAS: 'AL',
      AMAPA: 'AP',
      AMAZONAS: 'AM',
      BAHIA: 'BA',
      CEARA: 'CE',
      'DISTRITO FEDERAL': 'DF',
      'ESPIRITO SANTO': 'ES',
      GOIAS: 'GO',
      MARANHAO: 'MA',
      'MATO GROSSO': 'MT',
      'MATO GROSSO DO SUL': 'MS',
      'MINAS GERAIS': 'MG',
      PARA: 'PA',
      PARAIBA: 'PB',
      PARANA: 'PR',
      PERNAMBUCO: 'PE',
      PIAUI: 'PI',
      'RIO DE JANEIRO': 'RJ',
      'RIO GRANDE DO NORTE': 'RN',
      'RIO GRANDE DO SUL': 'RS',
      RONDONIA: 'RO',
      RORAIMA: 'RR',
      'SANTA CATARINA': 'SC',
      'SAO PAULO': 'SP',
      SERGIPE: 'SE',
      TOCANTINS: 'TO'
    };

    if (STATE_NAME_TO_UF[cleanState]) {
      return STATE_NAME_TO_UF[cleanState];
    }

    const VALID_UFS = new Set([
      'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
      'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
      'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    ]);

    if (VALID_UFS.has(cleanState)) {
      return cleanState;
    }
  }

  // 2. Se não houver state explícito, extrai o CEP de destino do cliente e deduz pela faixa postal oficial dos Correios
  const rawCep =
    order.shipping?.cep ||
    order.shipping?.postal_code ||
    order.shippingAddress?.cep ||
    order.shippingAddress?.postal_code ||
    order.shipping?.address?.cep ||
    order.shipping?.address?.postal_code ||
    order.address?.cep ||
    order.address?.postal_code ||
    order.customer?.cep ||
    order.customer?.postal_code ||
    order.nfe?.destinatario?.cep ||
    order.cep;

  const cep = String(rawCep || '').replace(/\D/g, '');
  if (cep.length >= 2) {
    const prefix2 = parseInt(cep.slice(0, 2), 10);
    const prefix5 = cep.length >= 5 ? parseInt(cep.slice(0, 5), 10) : prefix2 * 1000;

    if (prefix2 >= 1 && prefix2 <= 19) return 'SP';
    if (prefix2 >= 20 && prefix2 <= 28) return 'RJ';
    if (prefix2 === 29) return 'ES';
    if (prefix2 >= 30 && prefix2 <= 39) return 'MG';
    if (prefix2 >= 40 && prefix2 <= 48) return 'BA';
    if (prefix2 === 49) return 'SE';
    if (prefix2 >= 50 && prefix2 <= 56) return 'PE';
    if (prefix2 === 57) return 'AL';
    if (prefix2 === 58) return 'PB';
    if (prefix2 === 59) return 'RN';
    if (prefix2 >= 60 && prefix2 <= 63) return 'CE';
    if (prefix2 === 64) return 'PI';
    if (prefix2 === 65) return 'MA';
    if (prefix2 >= 66 && prefix2 <= 68) {
      if (prefix5 >= 68900 && prefix5 <= 68999) return 'AP';
      return 'PA';
    }
    if (prefix2 === 69) {
      if (prefix5 >= 69300 && prefix5 <= 69399) return 'RR';
      if (prefix5 >= 69900 && prefix5 <= 69999) return 'AC';
      return 'AM';
    }
    if (prefix2 >= 70 && prefix2 <= 73) {
      if (prefix5 >= 72800 && prefix5 <= 72999) return 'GO';
      if (prefix5 >= 73700 && prefix5 <= 76799) return 'GO';
      return 'DF';
    }
    if (prefix2 >= 74 && prefix2 <= 76) return 'GO';
    if (prefix2 === 77) return 'TO';
    if (prefix2 === 78) {
      if (prefix5 >= 76800 && prefix5 <= 76999) return 'RO';
      return 'MT';
    }
    if (prefix2 === 79) return 'MS';
    if (prefix2 >= 80 && prefix2 <= 87) return 'PR';
    if (prefix2 >= 88 && prefix2 <= 89) return 'SC';
    if (prefix2 >= 90 && prefix2 <= 99) return 'RS';
  }

  // 3. Sem fallback cego para 'SP'!
  return null;
}

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

export function logProductCardClick(productId, productName = '', source = 'Catalog', category = '', fit = '', slug = '') {
  return analyticsService.trackProductView(productId, productName, category, fit, slug);
}

export function logPageView(pagePath = '/catalogo') {
  const cleanPage = String(pagePath).replace(/^\/+/, '') || 'catalogo';
  return analyticsService.trackPageView(cleanPage);
}

export default analyticsService;
