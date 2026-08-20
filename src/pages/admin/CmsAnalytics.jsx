import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, setDoc, onSnapshot } from 'firebase/firestore';
import { 
  RotateCw, 
  ArrowRight, 
  TrendingUp, 
  ShoppingBag, 
  Eye, 
  EyeOff,
  CheckCircle2, 
  Layers, 
  Filter, 
  AlertTriangle,
  BarChart3,
  Flame,
  Zap,
  Tag,
  X,
  Package,
  Ruler,
  AlertCircle,
  Clock,
  Save,
  Check,
  Sparkles,
  Calendar
} from 'lucide-react';
import { db } from '../../services/firebaseConfig';
import { InfoTooltip } from '../../components/ui/InfoTooltip';
import { calculateDynamicMetrics } from '../../services/analyticsService';
import { 
  useCmsPeriodFilter, 
  parseOrderDate, 
  getTodayStr, 
  formatShortDate 
} from '../../hooks/useCmsPeriodFilter';
import styles from './CmsAnalytics.module.css';

const COLOR_CONFIG = {
  'preto_piano': { name: 'Preto Piano', hex: '#000000' },
  'off_white': { name: 'Off-White', hex: '#f5f5f0' },
  'grafite': { name: 'Grafite / Chumbo', hex: '#383838' },
  'cinza_mescla': { name: 'Cinza Mescla', hex: '#7a7a7a' }
};

const CATEGORY_LABELS = {
  'camisa': 'Camisetas / Camisas',
  'jaqueta': 'Jaquetas & Casacos',
  'calca': 'Calças & Bermudas',
  'brinde': 'Vales & Brindes'
};

// Avaliador dos 7 Estados de Saúde e Performance do Produto
export const getProductStatusDetails = (prod, totalStock, daysIdle, purchases, views, adds, conversion) => {
  // 1. Oculto / Desativado pelo lojista
  if (prod.active === false) {
    return {
      key: 'HIDDEN',
      label: 'OCULTO',
      description: 'Produto desativado pelo administrador (oculto no catálogo da loja).'
    };
  }

  // 2. Ruptura Total (Esgotado em todas as grades)
  if (totalStock === 0) {
    return {
      key: 'OUT_OF_STOCK',
      label: 'ESGOTADO',
      description: 'Estoque zerado em todas as grades. Reposição necessária.'
    };
  }

  // 3. Dead Stock (Sem vendas há mais de 45 dias com estoque disponível)
  if (daysIdle >= 45 && totalStock > 0) {
    return {
      key: 'DEAD_STOCK',
      label: 'DEAD STOCK',
      description: `${daysIdle} dias sem nenhuma venda registrada. Estoque estagnado (${totalStock} un.).`
    };
  }

  // 4. Best Seller (Alta tração de compras)
  if (purchases >= 15 || (purchases >= 5 && views > 0 && parseFloat(conversion) >= 5)) {
    return {
      key: 'BEST_SELLER',
      label: 'BEST SELLER',
      description: `Alta performance: ${purchases} un. vendidas e ${conversion}% de conversão.`
    };
  }

  // 5. Alerta de Fricção (Muitas adições ao carrinho mas pouca/nenhuma compra)
  if (adds >= 5 && purchases === 0) {
    return {
      key: 'FRICTION',
      label: 'ALERTA FRICÇÃO',
      description: `${adds} adições à sacola, porém nenhuma conversão em pedido. Possível barreira de preço/frete.`
    };
  }

  // 6. Baixa Visibilidade (Poucas visualizações na PDP)
  if (views < 10) {
    return {
      key: 'LOW_VIEWS',
      label: 'BAIXA VISIBILIDADE',
      description: `Apenas ${views} acessos registrados. Requer destaque em campanhas ou vitrine.`
    };
  }

  // 7. Regular / Saudável
  return {
    key: 'STABLE',
    label: 'ESTÁVEL',
    description: 'Estoque balanceado (> 5 un.), giro regular e conversão saudável.'
  };
};

export function CmsAnalytics() {
  const navigate = useNavigate();
  const [summaryData, setSummaryData] = useState({});
  const [productsList, setProductsList] = useState([]);
  const [orders, setOrders] = useState([]);
  const [checkoutSessions, setCheckoutSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtro de Período Sincronizado Globalmente
  const {
    periodFilter,
    setPeriodFilter,
    customStartDate,
    customEndDate,
    showCustomPicker,
    setShowCustomPicker,
    dateValidationErr,
    handleStartDateChange,
    handleEndDateChange,
    handleApplyCustomDate,
    periodLabel
  } = useCmsPeriodFilter();

  // Controle de Tabs e Modal de Raio-X
  const [activeTab, setActiveTab] = useState('attributes'); // 'attributes' | 'products' | 'deadstock' | 'funnel'
  const [selectedSkuDetail, setSelectedSkuDetail] = useState(null);
  const [editableStock, setEditableStock] = useState({ PP: 0, P: 0, M: 0, G: 0, GG: 0 });
  const [isAvailableInCatalog, setIsAvailableInCatalog] = useState(true);
  const [savingStock, setSavingStock] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Trava a rolagem do fundo (eixo Y) quando o drawer estiver aberto
  useEffect(() => {
    if (selectedSkuDetail) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [selectedSkuDetail]);

  // Filtra e unifica apenas pedidos/sessões finalizadas com sucesso no período selecionado
  const completedOrders = useMemo(() => {
    const combined = [];
    const seenIds = new Set();

    // Pedidos da coleção 'orders'
    (orders || []).forEach(ord => {
      if (ord.id && !seenIds.has(ord.id)) {
        seenIds.add(ord.id);
        combined.push(ord);
      }
    });

    // Sessões finalizadas com completed === true da coleção 'checkout_sessions'
    (checkoutSessions || []).forEach(session => {
      if (session.completed === true && session.id && !seenIds.has(session.id)) {
        seenIds.add(session.id);
        combined.push(session);
      }
    });

    if (periodFilter === 'all') return combined;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    return combined.filter(order => {
      const orderDate = parseOrderDate(order);
      if (!orderDate) return false;

      if (periodFilter === 'today') {
        return orderDate >= startOfToday && orderDate <= endOfToday;
      }

      if (periodFilter === '7days') {
        const start7DaysAgo = new Date(startOfToday);
        start7DaysAgo.setDate(start7DaysAgo.getDate() - 6);
        return orderDate >= start7DaysAgo && orderDate <= endOfToday;
      }

      if (periodFilter === '30days') {
        const start30DaysAgo = new Date(startOfToday);
        start30DaysAgo.setDate(start30DaysAgo.getDate() - 29);
        return orderDate >= start30DaysAgo && orderDate <= endOfToday;
      }

      if (periodFilter === 'custom') {
        if (!customStartDate || !customEndDate) return true;
        const [sYear, sMonth, sDay] = customStartDate.split('-').map(Number);
        const [eYear, eMonth, eDay] = customEndDate.split('-').map(Number);
        const start = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
        const end = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);
        return orderDate >= start && orderDate <= end;
      }

      return true;
    });
  }, [orders, checkoutSessions, periodFilter, customStartDate, customEndDate]);

  // 1. Carrega dados consolidados do Firestore
  async function loadFullAnalytics() {
    try {
      setRefreshing(true);

      // 1. Telemetria agregada (analytics/summary)
      const summaryRef = doc(db, 'analytics', 'summary');
      const summarySnap = await getDoc(summaryRef);
      if (summarySnap.exists()) {
        setSummaryData(summarySnap.data() || {});
      } else {
        setSummaryData({});
      }

      // 2. Produtos do Firestore (products)
      const prodSnap = await getDocs(collection(db, 'products'));
      const prods = [];
      prodSnap.forEach(d => prods.push({ id: d.id, ...d.data() }));
      setProductsList(prods);

      // 3. Pedidos do Firestore (orders)
      const ordersSnap = await getDocs(collection(db, 'orders'));
      const ords = [];
      ordersSnap.forEach(d => ords.push({ id: d.id, ...d.data() }));
      setOrders(ords);

      // 4. Sessões de checkout (checkout_sessions)
      const sessionSnap = await getDocs(collection(db, 'checkout_sessions'));
      const sessions = [];
      sessionSnap.forEach(d => sessions.push({ id: d.id, ...d.data() }));
      setCheckoutSessions(sessions);

    } catch (err) {
      console.warn("Aviso ao carregar dados de analytics:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadFullAnalytics();

    // Listener em tempo real para sincronia imediata de visualizações e métricas
    const unsub = onSnapshot(doc(db, 'analytics', 'summary'), (snap) => {
      if (snap.exists()) {
        setSummaryData(snap.data() || {});
      }
    }, (err) => {
      console.warn("Aviso listener analytics:", err.message);
    });

    return () => unsub();
  }, []);

  // 2. Abertura do Drawer com dados de estoque editáveis
  const handleOpenSkuMatrix = (product) => {
    setSelectedSkuDetail(product);
    setEditableStock({
      PP: Number(product.stock?.PP || 0),
      P: Number(product.stock?.P || 0),
      M: Number(product.stock?.M || 0),
      G: Number(product.stock?.G || 0),
      GG: Number(product.stock?.GG || 0)
    });
    setIsAvailableInCatalog(product.active !== false);
    setSaveSuccess(false);
  };

  // 3. Salvar alterações de estoque e visibilidade no Firestore
  const handleSaveStockChanges = async () => {
    if (!selectedSkuDetail?.id) return;
    setSavingStock(true);
    setSaveSuccess(false);

    try {
      const productRef = doc(db, 'products', selectedSkuDetail.id);
      await setDoc(productRef, {
        stock: editableStock,
        active: isAvailableInCatalog,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Atualiza lista local
      setProductsList(prev => prev.map(p => p.id === selectedSkuDetail.id ? {
        ...p,
        stock: editableStock,
        active: isAvailableInCatalog
      } : p));

      setSelectedSkuDetail(prev => ({
        ...prev,
        stock: editableStock,
        active: isAvailableInCatalog
      }));

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Erro ao salvar estoque:", err);
      alert("Falha ao salvar estoque no Firestore.");
    } finally {
      setSavingStock(false);
    }
  };

  // 4. Performance Granulada e Dead Stock de Produtos
  const productMetrics = useMemo(() => {
    const rawTelemetry = summaryData.products || {};
    const telemetryKeys = Object.keys(rawTelemetry);

    return productsList.map(p => {
      const cleanId = String(p.id || '').replace(/[./#$\[\]]/g, '_');
      const cleanSlug = p.slug ? String(p.slug).replace(/[./#$\[\]]/g, '_') : '';
      const cleanName = p.name ? String(p.name).toLowerCase().replace(/[./#$\[\]\s]/g, '_') : '';

      // Tenta encontrar dados de telemetria em todas as variações de chave (id, slug, name, fuzzy)
      const dataFromId = rawTelemetry[p.id] || (cleanId ? rawTelemetry[cleanId] : null);
      const dataFromSlug = (p.slug ? rawTelemetry[p.slug] : null) || (cleanSlug ? rawTelemetry[cleanSlug] : null);
      const dataFromName = (p.name ? rawTelemetry[p.name] : null) || (cleanName ? rawTelemetry[cleanName] : null);

      const matchedKey = telemetryKeys.find(k => 
        k === String(p.id) ||
        (p.slug && k === String(p.slug)) ||
        (p.slug && k.replace(/_/g, '-') === String(p.slug).replace(/_/g, '-')) ||
        (p.name && k.toLowerCase().replace(/[\s_-]/g, '') === String(p.name).toLowerCase().replace(/[\s_-]/g, ''))
      );
      const dataFromMatch = matchedKey ? rawTelemetry[matchedKey] : null;

      const idViews = Number(dataFromId?.views || 0);
      const slugViews = (dataFromSlug && dataFromSlug !== dataFromId) ? Number(dataFromSlug?.views || 0) : 0;
      const nameViews = (dataFromName && dataFromName !== dataFromId && dataFromName !== dataFromSlug) ? Number(dataFromName?.views || 0) : 0;

      const idAdds = Number(dataFromId?.addedToCart || 0);
      const slugAdds = (dataFromSlug && dataFromSlug !== dataFromId) ? Number(dataFromSlug?.addedToCart || 0) : 0;
      const nameAdds = (dataFromName && dataFromName !== dataFromId && dataFromName !== dataFromSlug) ? Number(dataFromName?.addedToCart || 0) : 0;
      const adds = Math.max(
        Number(p.addedToCart || 0), 
        idAdds + slugAdds + nameAdds, 
        Number(dataFromId?.addedToCart || 0), 
        Number(dataFromSlug?.addedToCart || 0),
        Number(dataFromMatch?.addedToCart || 0)
      );

      const idRemoves = Number(dataFromId?.removedFromCart || 0);
      const slugRemoves = (dataFromSlug && dataFromSlug !== dataFromId) ? Number(dataFromSlug?.removedFromCart || 0) : 0;
      const nameRemoves = (dataFromName && dataFromName !== dataFromId && dataFromName !== dataFromSlug) ? Number(dataFromName?.removedFromCart || 0) : 0;
      const removes = Math.max(
        Number(p.removedFromCart || 0), 
        idRemoves + slugRemoves + nameRemoves, 
        Number(dataFromId?.removedFromCart || 0), 
        Number(dataFromSlug?.removedFromCart || 0),
        Number(dataFromMatch?.removedFromCart || 0)
      );

      // 1. Contagem exata de unidades vendidas e pedidos únicos por item (sem duplicação)
      let unitsFromOrders = 0;
      let uniqueOrdersCount = 0;
      let lastSaleTimestamp = 0;

      completedOrders.forEach(order => {
        let orderMatched = false;
        (order.items || []).forEach(it => {
          const itId = String(it?.id || '');
          const itSlug = String(it?.slug || '');
          const itName = it?.name ? String(it.name).trim().toLowerCase() : '';
          const pName = p.name ? String(p.name).trim().toLowerCase() : '';

          const isMatch = (
            (itId && (itId === String(p.id) || itId === String(p.slug) || itId === cleanId)) ||
            (itSlug && (itSlug === String(p.id) || itSlug === String(p.slug) || itSlug === cleanSlug)) ||
            (itName && pName && itName === pName)
          );

          if (isMatch) {
            unitsFromOrders += (Number(it.quantity) || 1);
            orderMatched = true;
          }
        });

        if (orderMatched) {
          uniqueOrdersCount += 1;
          const orderDate = parseOrderDate(order)?.getTime() || 0;
          if (orderDate > lastSaleTimestamp) {
            lastSaleTimestamp = orderDate;
          }
        }
      });

      // Volume total de peças vendidas (se houver pedidos reais na coleção 'orders', usa a contagem exata)
      const realPurchases = completedOrders.length > 0 
        ? unitsFromOrders 
        : (periodFilter === 'all' ? Math.max(Number(p.purchases || 0), Number(dataFromId?.purchases || 0), Number(dataFromSlug?.purchases || 0)) : 0);

      const uniqueOrders = completedOrders.length > 0 
        ? uniqueOrdersCount 
        : (realPurchases > 0 ? 1 : 0);

      // Views não podem ser menores que os pedidos únicos registrados
      const rawViews = Math.max(Number(p.views || 0), idViews + slugViews + nameViews, Number(dataFromId?.views || 0), Number(dataFromSlug?.views || 0));
      const views = Math.max(rawViews, uniqueOrders);

      // Taxa de Adição à Sacola (Add-to-cart rate)
      let addToCartRate = '0.0';
      if (views > 0) {
        addToCartRate = Math.min(100, (adds / views) * 100).toFixed(1);
      }

      // Taxa de Conversão Real (Pedidos Únicos / Views)
      let conversionRate = '0.0';
      if (views > 0) {
        conversionRate = Math.min(100, (uniqueOrders / views) * 100).toFixed(1);
      } else if (uniqueOrders > 0) {
        conversionRate = '100.0';
      }

      // Taxa de Abandono de Item (Remoções / Adições)
      let abandonmentRate = '0.0';
      if (adds > 0) {
        abandonmentRate = Math.min(100, (removes / adds) * 100).toFixed(1);
      }

      // Calcula tempo ocioso em dias
      let daysIdle = 0;
      if (lastSaleTimestamp > 0) {
        daysIdle = Math.max(0, Math.floor((Date.now() - lastSaleTimestamp) / (1000 * 60 * 60 * 24)));
      } else if (p.createdAt) {
        daysIdle = Math.max(0, Math.floor((Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
      } else {
        daysIdle = Number(p.daysWithoutSale || (realPurchases > 0 ? 2 : 48));
      }

      // Parse e consolidação da grade de estoque (PP, P, M, G, GG)
      let parsedStock = { PP: 0, P: 0, M: 0, G: 0, GG: 0 };
      if (p.stock && typeof p.stock === 'object') {
        parsedStock = {
          PP: Number(p.stock.PP ?? 0),
          P: Number(p.stock.P ?? 0),
          M: Number(p.stock.M ?? 0),
          G: Number(p.stock.G ?? 0),
          GG: Number(p.stock.GG ?? 0)
        };
      } else if (Array.isArray(p.variants) && p.variants.length > 0) {
        p.variants.forEach(v => {
          const sz = String(v.size || '').toUpperCase();
          if (parsedStock[sz] !== undefined) {
            parsedStock[sz] = Number(v.stock ?? v.inventory ?? 0);
          }
        });
      } else if (p.totalStock !== undefined || p.inventory !== undefined) {
        const total = Number(p.totalStock ?? p.inventory ?? 0);
        parsedStock = {
          PP: Math.floor(total * 0.1),
          P: Math.floor(total * 0.25),
          M: Math.floor(total * 0.35),
          G: Math.floor(total * 0.2),
          GG: Math.floor(total * 0.1)
        };
      } else if (Array.isArray(p.sizes) && p.sizes.length > 0) {
        p.sizes.forEach(s => {
          const sz = String(s).toUpperCase();
          if (parsedStock[sz] !== undefined) {
            parsedStock[sz] = 12;
          }
        });
      } else {
        parsedStock = { PP: 2, P: 8, M: 12, G: 8, GG: 4 };
      }

      const totalStock = Object.values(parsedStock).reduce((a, b) => Number(a) + Number(b), 0);
      const isDeadStock = daysIdle >= 45 && totalStock > 0;
      const statusInfo = getProductStatusDetails(p, totalStock, daysIdle, realPurchases, views, adds, conversionRate);

      return {
        id: p.id,
        name: p.name || 'Produto THR33',
        category: p.category || 'camisa',
        fit: p.fit || 'boxy',
        price: Number(p.price || 0),
        image: p.image || (p.images && p.images[0]) || '',
        stock: parsedStock,
        active: p.active !== false,
        totalStock,
        views,
        adds,
        removes,
        purchases: realPurchases,
        uniqueOrders,
        addToCartRate,
        conversion: conversionRate,
        abandonmentRate,
        daysIdle,
        isDeadStock,
        statusInfo,
        skuPrefix: `THR33-${(p.category || 'TS').slice(0, 2).toUpperCase()}`,
        status: statusInfo.key
      };
    });
  }, [productsList, summaryData, completedOrders, periodFilter]);

  // Itens em Dead Stock (> 45 dias sem saída e com estoque positivo)
  const deadStockItems = useMemo(() => {
    return productMetrics.filter(p => p.isDeadStock);
  }, [productMetrics]);

  // Telemetria real da peça aberta no Drawer
  const activeDrawerTelemetry = useMemo(() => {
    if (!selectedSkuDetail?.id) return { views: 0, adds: 0, removes: 0, purchases: 0, uniqueOrders: 0, addToCartRate: '0.0', conversion: '0.0', abandonmentRate: '0.0' };
    const found = productMetrics.find(p => p.id === selectedSkuDetail.id);
    if (found) {
      return {
        views: found.views,
        adds: found.adds,
        removes: found.removes,
        purchases: found.purchases,
        uniqueOrders: found.uniqueOrders,
        addToCartRate: found.addToCartRate,
        conversion: found.conversionRate,
        abandonmentRate: found.abandonmentRate
      };
    }
    return { views: 0, adds: 0, removes: 0, purchases: 0, uniqueOrders: 0, addToCartRate: '0.0', conversion: '0.0', abandonmentRate: '0.0' };
  }, [selectedSkuDetail, productMetrics]);

  // 1. AGREGAÇÃO DINÂMICA DE CORES, TAMANHOS E CATEGORIAS (BASEADA NO CATÁLOGO ATIVO E VENDAS REAIS)
  const { categories: categoryMetrics, sizes: sizeMetrics, colors: colorMetrics } = useMemo(() => {
    return calculateDynamicMetrics(productsList, completedOrders);
  }, [productsList, completedOrders]);

  const maxColorSales = useMemo(() => Math.max(...colorMetrics.map(c => c.units), 1), [colorMetrics]);
  const maxSizeSales = useMemo(() => Math.max(...sizeMetrics.map(s => s.sales), 1), [sizeMetrics]);
  const maxCatUnits = useMemo(() => Math.max(...categoryMetrics.map(c => c.units), 1), [categoryMetrics]);

  // 2. GERAÇÃO DINÂMICA DAS DIRETRIZES DE PRODUÇÃO E CORTE
  const dynamicInsights = useMemo(() => {
    const totalPiecesSold = sizeMetrics.reduce((acc, s) => acc + s.sales, 0);

    // Cor Líder
    const topColor = colorMetrics[0] || { name: 'Preto Piano', units: 0 };
    const topColorUnits = Number(topColor.units || 0);
    const topColorPct = totalPiecesSold > 0 ? Math.round((topColorUnits / totalPiecesSold) * 100) : 0;

    // Participação M + G
    const mSales = sizeMetrics.find(s => s.size === 'M')?.sales || 0;
    const gSales = sizeMetrics.find(s => s.size === 'G')?.sales || 0;
    const mgPct = totalPiecesSold > 0 ? Math.round(((mSales + gSales) / totalPiecesSold) * 100) : 0;

    // Categoria Líder
    const topCategory = categoryMetrics[0] || { label: 'Camisetas / Camisas', revenue: 0 };

    return {
      topColorName: topColor.name,
      topColorPct,
      mgPct,
      topCategoryLabel: topCategory.label,
      topCategoryRevenue: Number(topCategory.revenue || 0)
    };
  }, [colorMetrics, sizeMetrics, categoryMetrics]);

  // Distribuição Real de Vendas por Tamanho
  const sizeDistribution = useMemo(() => {
    const rawSizes = summaryData.sizes || {};
    const sizesCount = {
      PP: periodFilter === 'all' ? Number(rawSizes.PP || 0) : 0,
      P: periodFilter === 'all' ? Number(rawSizes.P || 0) : 0,
      M: periodFilter === 'all' ? Number(rawSizes.M || 0) : 0,
      G: periodFilter === 'all' ? Number(rawSizes.G || 0) : 0,
      GG: periodFilter === 'all' ? Number(rawSizes.GG || 0) : 0
    };

    completedOrders.forEach(order => {
      order.items?.forEach(item => {
        const sz = String(item.size || 'M').toUpperCase();
        if (sizesCount.hasOwnProperty(sz)) {
          sizesCount[sz] += (Number(item.quantity) || 1);
        }
      });
    });

    const maxVal = Math.max(...Object.values(sizesCount), 1);
    return Object.entries(sizesCount).map(([size, count]) => ({
      size,
      count,
      percent: count > 0 ? Math.round((count / maxVal) * 100) : 0
    }));
  }, [summaryData, completedOrders, periodFilter]);

  // 1. CONSOLIDAÇÃO DO FUNIL COM RECONCILIAÇÃO REAL & IDENTIFICAÇÃO DE GARGALO
  const funnel = useMemo(() => {
    const rawFunnel = summaryData.funnel || {};
    const rawProducts = summaryData.products || {};
    const rawPageViews = summaryData.pageViews || {};

    // 1. Visualizações PDP (Etapa 1)
    const sumTelemetryViews = Object.values(rawProducts).reduce((acc, p) => acc + (Number(p?.views) || 0), 0);
    const sumProductsViews = productsList.reduce((acc, p) => acc + (Number(p?.views) || 0), 0);
    const pdpPageViews = Number(rawPageViews.produto_detalhe || 0);
    const funnelPdpViews = Number(rawFunnel.pdpViews || 0);
    const rawViews = Math.max(funnelPdpViews, pdpPageViews, sumTelemetryViews, sumProductsViews);

    // 2. Adições à Sacola (Etapa 2)
    const sumTelemetryAdds = Object.values(rawProducts).reduce((acc, p) => acc + (Number(p?.addedToCart) || 0), 0);
    const sumProductsAdds = productsList.reduce((acc, p) => acc + (Number(p?.addedToCart) || 0), 0);
    const sumColorsAdds = Object.values(summaryData.colors || {}).reduce((acc, v) => acc + (Number(v) || 0), 0);
    const funnelCartAdds = Number(rawFunnel.cartAdds || 0);
    const rawCartAdds = Math.max(funnelCartAdds, sumTelemetryAdds, sumProductsAdds, sumColorsAdds);

    // 3. Remoções / Desistências da Sacola
    const sumTelemetryRemoves = Object.values(rawProducts).reduce((acc, p) => acc + (Number(p?.removedFromCart) || 0), 0);
    const sumProductsRemoves = productsList.reduce((acc, p) => acc + (Number(p?.removedFromCart) || 0), 0);
    const funnelCartRemoves = Number(rawFunnel.cartRemoves || 0);
    const cartRemoves = Math.max(funnelCartRemoves, sumTelemetryRemoves, sumProductsRemoves);

    // 4. Inícios de Checkout (Etapa 3)
    const funnelCheckoutStarts = Number(rawFunnel.checkoutStarts || 0);
    const checkoutPageViews = Number(rawPageViews.checkout || 0);
    const totalSessions = (checkoutSessions || []).length;
    const rawCheckoutStarts = Math.max(funnelCheckoutStarts, checkoutPageViews, totalSessions);

    // 5. Pedidos Pagos (Etapa 4)
    const funnelPurchases = Number(rawFunnel.purchases || 0);
    const totalOrders = (orders || []).length;
    const completedSessions = (completedOrders || []).length;
    const purchases = Math.max(totalOrders, completedSessions, funnelPurchases);

    // Reconciliação coerente
    const checkoutStarts = Math.max(rawCheckoutStarts, purchases);
    const cartAdds = Math.max(rawCartAdds, purchases > 0 && rawCartAdds === 0 ? checkoutStarts : rawCartAdds);
    const views = Math.max(rawViews, cartAdds);

    // Taxa Geral (Views PDP -> Pedidos Pagos)
    const overallConversionRate = views > 0 ? Math.min(100, (purchases / views) * 100).toFixed(1) : '0.0';

    // Abandono de Sacola
    let cartAbandonmentRate = '0.0';
    if (cartAdds > 0) {
      const abandoned = Math.max(0, cartAdds - purchases);
      cartAbandonmentRate = Math.min(100, (abandoned / cartAdds) * 100).toFixed(1);
    }

    // Taxas de passagem (Step-to-step)
    const step2Rate = views > 0 ? Math.min(100, (cartAdds / views) * 100).toFixed(1) : '0.0';
    const step3Rate = cartAdds > 0 ? Math.min(100, (checkoutStarts / cartAdds) * 100).toFixed(1) : '0.0';
    const step4Rate = checkoutStarts > 0 ? Math.min(100, (purchases / checkoutStarts) * 100).toFixed(1) : '0.0';

    // Perdas em cada transição para identificar o gargalo (Ponto de Fuga)
    const drop1to2 = views > 0 ? (100 - Number(step2Rate)) : 0;
    const drop2to3 = cartAdds > 0 ? (100 - Number(step3Rate)) : 0;
    const drop3to4 = checkoutStarts > 0 ? (100 - Number(step4Rate)) : 0;

    let bottleneck = 'none';
    if (drop1to2 >= drop2to3 && drop1to2 >= drop3to4 && drop1to2 > 0) bottleneck = 'step2';
    else if (drop2to3 >= drop1to2 && drop2to3 >= drop3to4 && drop2to3 > 0) bottleneck = 'step3';
    else if (drop3to4 > 0) bottleneck = 'step4';

    return {
      views,
      cartAdds,
      cartRemoves,
      checkoutStarts,
      purchases,
      overallConversionRate,
      cartAbandonmentRate,
      step2Rate,
      step3Rate,
      step4Rate,
      bottleneck
    };
  }, [summaryData, productsList, orders, checkoutSessions, completedOrders]);

  // Modelagens mais buscadas pelos clientes
  const fitDistribution = useMemo(() => {
    const filters = summaryData.filters || {};
    return [
      { label: "Boxy Fit", count: Number(filters.modelagem_boxy || 0) },
      { label: "Oversized Fit", count: Number(filters.modelagem_oversized || 0) },
      { label: "Normal Fit", count: Number(filters.modelagem_normal || 0) },
      { label: "Regata", count: Number(filters.modelagem_regata || 0) }
    ];
  }, [summaryData]);

  const maxFitCount = Math.max(...fitDistribution.map(f => f.count), 1);

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <span className={styles.breadcrumb}>CMS // INTELIGÊNCIA DE PRODUTO & VENDAS</span>
            <h1 className={styles.title}>MÉTRICAS DE ATRIBUTOS, SKUS & ATIVIDADES</h1>
          </div>

          {/* FILTRO DE PERÍODO COM SELETOR DE DATAS */}
          <div className={styles.periodControlWrapper}>
            <div className={styles.periodFilterGroup}>
              <button 
                className={`${styles.filterBtn} ${periodFilter === 'today' ? styles.activeFilter : ''}`}
                onClick={() => { setPeriodFilter('today'); setShowCustomPicker(false); }}
              >
                Hoje
              </button>
              <button 
                className={`${styles.filterBtn} ${periodFilter === '7days' ? styles.activeFilter : ''}`}
                onClick={() => { setPeriodFilter('7days'); setShowCustomPicker(false); }}
              >
                7 Dias
              </button>
              <button 
                className={`${styles.filterBtn} ${periodFilter === '30days' ? styles.activeFilter : ''}`}
                onClick={() => { setPeriodFilter('30days'); setShowCustomPicker(false); }}
              >
                30 Dias
              </button>
              <button 
                className={`${styles.filterBtn} ${periodFilter === 'all' ? styles.activeFilter : ''}`}
                onClick={() => { setPeriodFilter('all'); setShowCustomPicker(false); }}
              >
                Todo o Período
              </button>
              <button 
                className={`${styles.filterBtn} ${styles.customPeriodBtn} ${periodFilter === 'custom' ? styles.activeFilter : ''}`}
                onClick={() => setShowCustomPicker(prev => !prev)}
                title="Filtrar por intervalo de datas personalizado"
              >
                <Calendar size={13} />
                <span>
                  {periodFilter === 'custom' && customStartDate && customEndDate
                    ? `${formatShortDate(customStartDate)} - ${formatShortDate(customEndDate)}`
                    : 'Datas'}
                </span>
              </button>
              <button 
                onClick={loadFullAnalytics} 
                disabled={refreshing} 
                className={styles.refreshBtn}
                title="Atualizar Métricas"
                aria-label="Atualizar dados"
              >
                <RotateCw size={13} className={refreshing ? styles.spinning : ''} />
              </button>
            </div>

            {/* PAINEL FLUTUANTE DE SELEÇÃO DE DATA */}
            {showCustomPicker && (
              <div className={styles.customDateBar}>
                <div className={styles.dateField}>
                  <label>DE</label>
                  <input 
                    type="date" 
                    value={customStartDate} 
                    max={customEndDate || getTodayStr()}
                    onChange={handleStartDateChange}
                    className={styles.dateInput}
                  />
                </div>
                <span className={styles.dateDivider}>—</span>
                <div className={styles.dateField}>
                  <label>ATÉ</label>
                  <input 
                    type="date" 
                    value={customEndDate} 
                    min={customStartDate}
                    max={getTodayStr()}
                    onChange={handleEndDateChange}
                    className={styles.dateInput}
                  />
                </div>
                <button 
                  onClick={handleApplyCustomDate}
                  className={styles.applyDateBtn}
                  title="Aplicar intervalo"
                >
                  <Check size={13} />
                  <span>APLICAR</span>
                </button>
                <button 
                  onClick={() => setShowCustomPicker(false)}
                  className={styles.closeDateBtn}
                  title="Fechar"
                >
                  <X size={13} />
                </button>
                {dateValidationErr && (
                  <span className={styles.dateErrorText}>{dateValidationErr}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* NAVEGAÇÃO DE TABS */}
        <div className={styles.headerNav}>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'attributes' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('attributes')}
          >
            <BarChart3 size={13} />
            <span>Cores, Tamanhos & Tipos</span>
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'products' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('products')}
          >
            <ShoppingBag size={13} />
            <span>Raio-X por Produto ({productMetrics.length})</span>
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'deadstock' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('deadstock')}
          >
            <AlertTriangle size={13} color={deadStockItems.length > 0 ? '#f87171' : 'currentColor'} />
            <span>Alerta Dead Stock ({deadStockItems.length})</span>
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'funnel' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('funnel')}
          >
            <TrendingUp size={13} />
            <span>Funil de Conversão</span>
          </button>
        </div>
      </header>

      {/* TAB 1: GRÁFICOS DE CORES, TAMANHOS, CATEGORIAS E INSIGHTS DE PRODUÇÃO */}
      {activeTab === 'attributes' && (
        <div className={styles.attributesLayout}>
          {/* GRID 3 COLUNAS DE GRÁFICOS */}
          <div className={styles.threeColsGrid}>
            {/* 1. CORES CADASTRADAS */}
            <div className={styles.graphCard}>
              <div className={styles.cardHeader}>
                <div className={styles.thWithTooltip}>
                  <Sparkles size={16} />
                  <h3>CORES CADASTRADAS ({colorMetrics.length})</h3>
                  <InfoTooltip 
                    text="Mapeamento de saída real gerado exclusivamente a partir das cores ativas no catálogo." 
                    title="Distribuição por Cor"
                    position="bottom"
                    align="left"
                    width="280px"
                  />
                </div>
              </div>
              <div className={styles.barsList}>
                {colorMetrics.length === 0 ? (
                  <p className={styles.emptyAttributeState}>Nenhuma cor ativa no catálogo.</p>
                ) : (
                  colorMetrics.map(c => {
                    const pct = c.units > 0 ? Math.round((c.units / maxColorSales) * 100) : 0;
                    return (
                      <div key={c.name} className={styles.barItem}>
                        <div className={styles.barMeta}>
                          <span className={styles.colorLabel}>
                            <span 
                              className={styles.colorDot} 
                              style={{ 
                                backgroundColor: c.hex, 
                                border: (c.hex === '#000000' || c.hex === '#0a0a0a' || c.hex === '#0f0f0f') ? '1px solid #444' : 'none' 
                              }}
                            />
                            {c.name}
                          </span>
                          <strong>{c.units} peças</strong>
                        </div>
                        <div className={styles.barTrack}>
                          <div className={styles.barFill} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 2. DEMANDA POR GRADE DE TAMANHO */}
            <div className={styles.graphCard}>
              <div className={styles.cardHeader}>
                <div className={styles.thWithTooltip}>
                  <Layers size={16} />
                  <h3>GRADE DE TAMANHOS ({sizeMetrics.length})</h3>
                  <InfoTooltip 
                    text="Curva de tamanhos cadastrados no vestuário da marca cruzada com os pedidos aprovados." 
                    title="Demanda de Tamanhos"
                    position="bottom"
                    align="center"
                    width="280px"
                  />
                </div>
              </div>
              <div className={styles.barsList}>
                {sizeMetrics.length === 0 ? (
                  <p className={styles.emptyAttributeState}>Nenhum tamanho configurado.</p>
                ) : (
                  sizeMetrics.map(s => {
                    const pct = s.sales > 0 ? Math.round((s.sales / maxSizeSales) * 100) : 0;
                    return (
                      <div key={s.size} className={styles.barItem}>
                        <div className={styles.barMeta}>
                          <span>TAMANHO {s.size}</span>
                          <strong>{s.sales} vendas</strong>
                        </div>
                        <div className={styles.barTrack}>
                          <div className={`${styles.barFill} ${styles.blueFill}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 3. VENDAS POR CATEGORIA */}
            <div className={styles.graphCard}>
              <div className={styles.cardHeader}>
                <div className={styles.thWithTooltip}>
                  <Tag size={16} />
                  <h3>CATEGORIAS & TIPOS ({categoryMetrics.length})</h3>
                  <InfoTooltip 
                    text="Divisão de faturamento e volume entre as categorias cadastradas no catálogo ativo." 
                    title="Performance por Categoria"
                    position="bottom"
                    align="right"
                    width="280px"
                  />
                </div>
              </div>
              <div className={styles.barsList}>
                {categoryMetrics.length === 0 ? (
                  <p className={styles.emptyAttributeState}>Nenhuma categoria encontrada.</p>
                ) : (
                  categoryMetrics.map(cat => {
                    const pct = cat.units > 0 ? Math.round((cat.units / maxCatUnits) * 100) : 0;
                    return (
                      <div key={cat.key || cat.label} className={styles.barItem}>
                        <div className={styles.barMeta}>
                          <span>{cat.label}</span>
                          <strong>{cat.units} un.</strong>
                        </div>
                        <div className={styles.barTrack}>
                          <div className={`${styles.barFill} ${styles.greenFill}`} style={{ width: `${pct}%` }} />
                        </div>
                        <small className={styles.cartHint}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cat.revenue)} faturados
                        </small>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* PAINEL DE DIRETRIZES DE PRODUÇÃO DINÂMICAS */}
          <div className={styles.productionInsightsBox}>
            <div className={styles.insightsHeader}>
              <Zap size={18} color="#facc15" />
              <h3>DIRETRIZES DE CORTE & ANÚNCIOS (INTELIGÊNCIA THR33)</h3>
            </div>
            <div className={styles.insightsGrid}>
              <div className={styles.insightCard}>
                <strong>Dominância de {dynamicInsights.topColorName}</strong>
                <p>
                  {dynamicInsights.topColorPct > 0 
                    ? `A cor ${dynamicInsights.topColorName} representa ${dynamicInsights.topColorPct}% das vendas totais da marca. Priorize estoque abundante nessa paleta.`
                    : 'Aguardando primeiros pedidos para computar a cor líder.'}
                </p>
              </div>
              <div className={styles.insightCard}>
                <strong>Concentração na Grade M e G</strong>
                <p>
                  {dynamicInsights.mgPct > 0
                    ? `Juntos, os tamanhos M e G somam ${dynamicInsights.mgPct}% de toda a saída de vestuário streetwear da THR33.`
                    : 'Aguardando pedidos para consolidar a curva de tamanhos.'}
                </p>
              </div>
              <div className={styles.insightCard}>
                <strong>{dynamicInsights.topCategoryLabel} lidera a receita</strong>
                <p>
                  {dynamicInsights.topCategoryRevenue > 0
                    ? `Categoria responsável por R$ ${dynamicInsights.topCategoryRevenue.toFixed(2)} em vendas brutas no e-commerce.`
                    : 'Aguardando fechamento de pedidos no catálogo.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RAIO-X COMPLETO POR PRODUTO */}
      {activeTab === 'products' && (
        <section className={styles.sectionCard}>
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>PRODUTO</th>
                  <th>
                    <div className={styles.thWithTooltip}>
                      <span>STATUS</span>
                      <InfoTooltip 
                        title="Guia de Status do Inventário"
                        position="bottom"
                        align="left"
                        width="340px"
                        text={
                          "• ESTÁVEL: Estoque balanceado (> 5 un.) e giro regular.\n" +
                          "• ESTOQUE BAIXO: Restam 5 ou menos unidades no total.\n" +
                          "• ESGOTADO: Estoque zerado (0 un.), demanda reposição.\n" +
                          "• DEAD STOCK: Mais de 45 dias sem vendas com peças paradas.\n" +
                          "• ALTA SAÍDA: Bestseller com vendas aceleradas.\n" +
                          "• BAIXA CONVERSÃO: Muito visto, mas com atrito na compra.\n" +
                          "• OCULTO: Produto desativado da vitrine pelo lojista."
                        }
                      />
                    </div>
                  </th>
                  <th>
                    <div className={styles.thWithTooltip}>
                      <span>VIEWS PDP</span>
                      <InfoTooltip text="Total de acessos e visualizações na página individual desta peça." title="Visualizações" position="bottom" align="left" width="260px" />
                    </div>
                  </th>
                  <th>
                    <div className={styles.thWithTooltip}>
                      <span>ADICIONADOS</span>
                      <InfoTooltip text="Total de unidades colocadas na sacola pelos clientes." title="Adições à Sacola" position="bottom" align="left" width="260px" />
                    </div>
                  </th>
                  <th>
                    <div className={styles.thWithTooltip}>
                      <span>REMOÇÕES</span>
                      <InfoTooltip text="Total de unidades excluídas da sacola antes da compra." title="Desistências" position="bottom" align="right" width="260px" />
                    </div>
                  </th>
                  <th>
                    <div className={styles.thWithTooltip}>
                      <span>VENDAS PAGAS</span>
                      <InfoTooltip text="Total de peças vendidas e quantidade de pedidos únicos correspondentes." title="Vendas Concluídas" position="bottom" align="right" width="280px" />
                    </div>
                  </th>
                  <th>
                    <div className={styles.thWithTooltip}>
                      <span>CONVERSÃO REAL</span>
                      <InfoTooltip 
                        title="Conversão Real"
                        position="bottom"
                        align="right"
                        width="290px"
                        text="Taxa de visitantes que compraram esta peça (Pedidos Únicos / Views PDP)."
                      />
                    </div>
                  </th>
                  <th>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" className={styles.centerText}>Carregando métricas reais do Firestore...</td></tr>
                ) : productMetrics.length === 0 ? (
                  <tr><td colSpan="8" className={styles.centerText}>Nenhum produto cadastrado no momento.</td></tr>
                ) : (
                  productMetrics.map(prod => (
                    <tr key={prod.id}>
                      <td>
                        <div className={styles.prodInfoCell}>
                          {prod.image ? (
                            <img src={prod.image} alt={prod.name} className={styles.thumb} />
                          ) : (
                            <div className={styles.thumbPlaceholder}><Package size={16} /></div>
                          )}
                          <div>
                            <strong className={styles.prodName}>{prod.name}</strong>
                            <small className={styles.subText}>{prod.fit?.toUpperCase()} • R$ {Number(prod.price).toFixed(2)}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span 
                          className={`${styles.statusPill} ${styles[prod.statusInfo.key]}`}
                          title={prod.statusInfo.description}
                        >
                          {prod.statusInfo.key === 'HOT' && <Flame size={11} className={styles.pillIcon} />}
                          {prod.statusInfo.key === 'DEAD_STOCK' && <Clock size={11} className={styles.pillIcon} />}
                          {prod.statusInfo.key === 'LOW_STOCK' && <AlertTriangle size={11} className={styles.pillIcon} />}
                          {prod.statusInfo.key === 'OUT_OF_STOCK' && <AlertCircle size={11} className={styles.pillIcon} />}
                          {prod.statusInfo.key === 'HIGH_INTEREST' && <Eye size={11} className={styles.pillIcon} />}
                          {prod.statusInfo.key === 'HIDDEN' && <EyeOff size={11} className={styles.pillIcon} />}
                          {prod.statusInfo.key === 'STABLE' && <Zap size={11} className={styles.pillIcon} />}
                          <span>{prod.statusInfo.label}</span>
                        </span>
                      </td>
                      <td><strong>{prod.views}</strong></td>
                      <td><span className={styles.addText}>+{prod.adds}</span></td>
                      <td><span className={styles.removeText}>-{prod.removes}</span></td>
                      <td>
                        <div className={styles.salesMetricCell}>
                          <strong className={styles.salesText}>{prod.purchases} un.</strong>
                          <small className={styles.ordersCountText}>({prod.uniqueOrders} ped.)</small>
                        </div>
                      </td>
                      <td>
                        <div className={styles.conversionBox}>
                          <div className={styles.conversionHeader}>
                            <strong>{prod.conversion}%</strong>
                            <small className={styles.intentHint}>Add: {prod.addToCartRate}%</small>
                          </div>
                          <div className={styles.miniBar}>
                            <div style={{ width: `${Math.min(Number(prod.conversion), 100)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <button onClick={() => handleOpenSkuMatrix(prod)} className={styles.detailBtn}>
                          Raio-X / Estoque
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 2: ALERTA DE DEAD STOCK (> 45 DIAS) */}
      {activeTab === 'deadstock' && (
        <section className={styles.sectionCard}>
          <div className={styles.deadStockBanner}>
            <div className={styles.deadStockInfo}>
              <div className={styles.alertTagGroup}>
                <AlertTriangle size={14} color="#f87171" />
                <span className={styles.alertTag}>AÇÃO DE MARKETING NECESSÁRIA</span>
              </div>
              <h2>SKUS ENCALHADOS PARADOS HÁ MAIS DE 45 DIAS</h2>
              <p>
                Peças com estoque físico disponível no Firestore mas sem vendas nos últimos 45 dias. Crie cupons promocionais ou ajuste o preço para acelerar o giro de capital.
              </p>
            </div>
            <div className={styles.deadStockKpi}>
              <strong>{deadStockItems.length} SKUs</strong>
              <small>Necessitam de queima / ação</small>
            </div>
          </div>

          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>FOTO</th>
                  <th>SKU / CÓDIGO</th>
                  <th>PEÇA & MODELAGEM</th>
                  <th>ESTOQUE DISPONÍVEL</th>
                  <th>TEMPO OCIOSO</th>
                  <th>AÇÃO RECOMENDADA</th>
                </tr>
              </thead>
              <tbody>
                {deadStockItems.length === 0 ? (
                  <tr>
                    <td colSpan="6" className={styles.centerText}>
                      Nenhum produto encalhado no momento. Giro de estoque 100% saudável!
                    </td>
                  </tr>
                ) : (
                  deadStockItems.map(item => (
                    <tr key={item.id}>
                      <td>
                        {item.image ? (
                          <img src={item.image} alt={item.name} className={styles.thumb} />
                        ) : (
                          <div className={styles.thumbPlaceholder}><Package size={16} /></div>
                        )}
                      </td>
                      <td><code>{item.skuPrefix}-ALL</code></td>
                      <td>
                        <strong className={styles.prodName}>{item.name}</strong>
                        <small className={styles.subText}>{item.fit?.toUpperCase()} • {item.category?.toUpperCase()}</small>
                      </td>
                      <td><strong className={styles.stockVal}>{item.totalStock} un.</strong></td>
                      <td>
                        <span className={styles.daysBadge}>{item.daysIdle} dias sem saída</span>
                      </td>
                      <td>
                        <button 
                          onClick={() => navigate(`/cms/cupons?productId=${item.id}`)} 
                          className={styles.promoActionBtn}
                        >
                          <Tag size={12} />
                          <span>Criar Desconto</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}



      {/* TAB 4: FUNIL DE CONVERSÃO */}
      {activeTab === 'funnel' && (
        <section className={styles.funnelSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.panelTitleRow}>
              <BarChart3 size={18} />
              <h2>FUNIL DE CONVERSÃO & JORNADA DO CLIENTE</h2>
            </div>
            <p>Acompanhe o caminho exato do cliente: da visualização da peça até a aprovação do pedido.</p>
          </div>

          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <span className={styles.kpiLabel}>
                  CONVERSÃO GERAL
                  <InfoTooltip text="Porcentagem de visitantes que visualizaram uma peça e concluíram o pagamento (benchmark ideal: 2% a 4%)." title="Taxa de Conversão" />
                </span>
                <TrendingUp size={14} color="#4ade80" />
              </div>
              <strong className={styles.kpiValue}>{funnel.overallConversionRate}%</strong>
              <small className={styles.kpiSub}>Visitas PDP → Compras Pagas</small>
            </div>

            <div className={`${styles.kpiCard} ${Number(funnel.cartAbandonmentRate) > 50 ? styles.alertKpi : ''}`}>
              <div className={styles.kpiHeader}>
                <span className={styles.kpiLabel}>
                  ABANDONO DE SACOLA
                  <InfoTooltip text="Mede quantos clientes adicionaram produtos ao carrinho mas fecharam o navegador antes de concluir a compra." title="Abandono de Sacola" />
                </span>
                <AlertCircle size={14} color={Number(funnel.cartAbandonmentRate) > 50 ? '#f87171' : '#a3a3a3'} />
              </div>
              <strong className={styles.kpiValue}>{funnel.cartAbandonmentRate}%</strong>
              <small className={styles.kpiSub}>Itens adicionados sem compra</small>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <span className={styles.kpiLabel}>
                  DESISTÊNCIAS / REMOÇÕES
                  <InfoTooltip text="Quantidade de vezes que um cliente deletou manualmente uma peça da sacola após ver o frete ou valor total." title="Atrito no Carrinho" />
                </span>
                <ShoppingBag size={14} color="#f87171" />
              </div>
              <strong className={styles.kpiValue}>{funnel.cartRemoves} itens</strong>
              <small className={styles.kpiSub}>Peças excluídas da sacola</small>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <span className={styles.kpiLabel}>
                  VIEWS DETALHADAS
                  <InfoTooltip text="Total de acessos e visualizações profundas nas páginas detalhadas de produtos da vitrine." title="Visualizações PDP" />
                </span>
                <Eye size={14} color="#60a5fa" />
              </div>
              <strong className={styles.kpiValue}>{funnel.views}</strong>
              <small className={styles.kpiSub}>Visitas em páginas de peça</small>
            </div>
          </div>

          <div className={styles.funnelFlowWrapper}>
            {/* ETAPA 1 */}
            <div className={styles.funnelStageCard}>
              <span className={styles.stageNumber}>ETAPA 1</span>
              <strong>{funnel.views}</strong>
              <span>Visualizações de Produto</span>
              <span className={styles.baselineTag}>100% da base</span>
            </div>

            <div className={styles.flowArrow}>
              <ArrowRight size={18} />
            </div>

            {/* ETAPA 2 */}
            <div className={`${styles.funnelStageCard} ${funnel.bottleneck === 'step2' ? styles.bottleneckCard : ''}`}>
              {funnel.bottleneck === 'step2' && (
                <span className={styles.bottleneckBadge}>
                  <AlertTriangle size={10} />
                  <span>MAIOR PONTO DE FUGA</span>
                </span>
              )}
              <span className={styles.stageNumber}>ETAPA 2</span>
              <strong className={styles.blueStageVal}>{funnel.cartAdds}</strong>
              <span>Adições à Sacola</span>
              <small>{funnel.step2Rate}% das visitas</small>
            </div>

            <div className={styles.flowArrow}>
              <ArrowRight size={18} />
            </div>

            {/* ETAPA 3 */}
            <div className={`${styles.funnelStageCard} ${funnel.bottleneck === 'step3' ? styles.bottleneckCard : ''}`}>
              {funnel.bottleneck === 'step3' && (
                <span className={styles.bottleneckBadge}>
                  <AlertTriangle size={10} />
                  <span>MAIOR PONTO DE FUGA</span>
                </span>
              )}
              <span className={styles.stageNumber}>ETAPA 3</span>
              <strong className={styles.yellowStageVal}>{funnel.checkoutStarts}</strong>
              <span>Inícios de Checkout</span>
              <small>{funnel.step3Rate}% da sacola</small>
            </div>

            <div className={styles.flowArrow}>
              <ArrowRight size={18} />
            </div>

            {/* ETAPA 4 */}
            <div className={`${styles.funnelStageCard} ${styles.stageSuccessCard} ${funnel.bottleneck === 'step4' ? styles.bottleneckCard : ''}`}>
              {funnel.bottleneck === 'step4' && (
                <span className={styles.bottleneckBadge}>
                  <AlertTriangle size={10} />
                  <span>MAIOR PONTO DE FUGA</span>
                </span>
              )}
              <span className={styles.stageNumber}>ETAPA 4 (FINAL)</span>
              <strong className={styles.greenStageVal}>{funnel.purchases}</strong>
              <span>Pedidos Pagos</span>
              <small>{funnel.step4Rate}% do checkout</small>
            </div>
          </div>
        </section>
      )}

      {/* MODAL / DRAWER: RAIO-X DO PRODUTO // SKU MATRIX */}
      {selectedSkuDetail && (
        <div className={styles.modalBackdrop} onClick={() => setSelectedSkuDetail(null)}>
          <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerTop}>
              <div className={styles.drawerTitleGroup}>
                <Package size={18} />
                <h2>RAIO-X DO PRODUTO // SKU MATRIX</h2>
              </div>
              <button 
                onClick={() => setSelectedSkuDetail(null)} 
                className={styles.closeBtn}
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.drawerContent}>
              {/* CARD DE RESUMO */}
              <div className={styles.prodSummaryCard}>
                {selectedSkuDetail.image ? (
                  <img src={selectedSkuDetail.image} alt={selectedSkuDetail.name} />
                ) : (
                  <div className={styles.thumbPlaceholder}><Package size={24} /></div>
                )}
                <div className={styles.prodSummaryMeta}>
                  <h3>{selectedSkuDetail.name}</h3>
                  <p>Preço de Tabela: <strong>R$ {Number(selectedSkuDetail.price).toFixed(2)}</strong></p>
                  <p>Modelagem: <strong>{selectedSkuDetail.fit?.toUpperCase()}</strong></p>
                  <span className={selectedSkuDetail.daysIdle >= 45 ? styles.dangerText : styles.idleText}>
                    Tempo Ocioso: <strong>{selectedSkuDetail.daysIdle || 0} dias sem novas vendas</strong>
                  </span>
                </div>
              </div>

              {/* CONTROLE DE DISPONIBILIDADE NA VITRINE */}
              <div className={styles.visibilityCard}>
                <label className={styles.toggleLabel}>
                  <input 
                    type="checkbox" 
                    checked={isAvailableInCatalog} 
                    onChange={(e) => setIsAvailableInCatalog(e.target.checked)} 
                  />
                  <span>Disponível e Visível no Catálogo da Loja</span>
                </label>
              </div>

              {/* GRADE DE ESTOQUE EDITÁVEL POR TAMANHO & SKU */}
              <div className={styles.stockMatrixSection}>
                <div className={styles.matrixHeader}>
                  <h3>DISPONIBILIDADE POR TAMANHO & SKU</h3>
                  <small>Edite as unidades diretamente abaixo e salve no Firestore:</small>
                </div>

                <div className={styles.matrixGrid}>
                  {['PP', 'P', 'M', 'G', 'GG'].map((size) => (
                    <div key={size} className={styles.matrixBox}>
                      <span className={styles.sizeTitle}>TAM {size}</span>
                      <input 
                        type="number"
                        min="0"
                        value={editableStock[size] ?? 0}
                        onChange={(e) => setEditableStock({
                          ...editableStock,
                          [size]: Math.max(0, parseInt(e.target.value, 10) || 0)
                        })}
                        className={styles.stockInput}
                        aria-label={`Estoque tamanho ${size}`}
                      />
                      <small className={styles.skuTag}>
                        THR33-{(selectedSkuDetail.category || 'TS').slice(0, 2).toUpperCase()}-{size}
                      </small>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={handleSaveStockChanges} 
                  disabled={savingStock} 
                  className={`${styles.saveStockBtn} ${saveSuccess ? styles.saveSuccess : ''}`}
                >
                  {savingStock ? (
                    <>
                      <RotateCw size={14} className={styles.spinning} />
                      <span>SALVANDO NA NUVEM...</span>
                    </>
                  ) : saveSuccess ? (
                    <>
                      <Check size={14} />
                      <span>ESTOQUE ATUALIZADO NO FIRESTORE!</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>SALVAR ALTERAÇÕES DE ESTOQUE</span>
                    </>
                  )}
                </button>
              </div>

              {/* JORNADA INDIVIDUAL DESTA PEÇA (TELEMETRIA REAL) */}
              <div className={styles.telemetrySection}>
                <h3>JORNADA INDIVIDUAL DESTA PEÇA</h3>
                <div className={styles.telemetryGrid}>
                  <div className={styles.telemetryCard}>
                    <span>Visualizações PDP</span>
                    <strong className={styles.whiteVal}>{activeDrawerTelemetry.views}</strong>
                    <small className={styles.telemetryCardSub}>Sessões únicas</small>
                  </div>

                  <div className={styles.telemetryCard}>
                    <span>Taxa de Adição</span>
                    <strong className={styles.blueVal}>+{activeDrawerTelemetry.adds}</strong>
                    <small className={styles.telemetryCardSub}>{activeDrawerTelemetry.addToCartRate}% das views</small>
                  </div>

                  <div className={styles.telemetryCard}>
                    <span>Desistências</span>
                    <strong className={styles.redVal}>-{activeDrawerTelemetry.removes}</strong>
                    <small className={styles.telemetryCardSub}>{activeDrawerTelemetry.abandonmentRate}% das adições</small>
                  </div>

                  <div className={styles.telemetryCard}>
                    <span>Vendas Aprovadas</span>
                    <strong className={styles.greenVal}>{activeDrawerTelemetry.purchases} un.</strong>
                    <small className={styles.telemetryCardSub}>{activeDrawerTelemetry.uniqueOrders || 0} pedidos únicos ({activeDrawerTelemetry.conversion}%)</small>
                  </div>
                </div>
              </div>

              {/* BOTÃO DE AÇÃO PARA PROMOÇÃO */}
              <button 
                onClick={() => {
                  setSelectedSkuDetail(null);
                  navigate(`/cms/cupons?productId=${selectedSkuDetail.id}`);
                }} 
                className={styles.createPromoBtn}
              >
                <Tag size={15} />
                <span>Criar Cupom de Desconto para Esta Peça</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CmsAnalytics;
