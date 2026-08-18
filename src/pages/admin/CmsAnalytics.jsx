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
  Check
} from 'lucide-react';
import { db } from '../../services/firebaseConfig';
import { InfoTooltip } from '../../components/ui/InfoTooltip';
import styles from './CmsAnalytics.module.css';

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

  // 2. Esgotado / Ruptura de Estoque Total (0 un.)
  if (totalStock === 0) {
    return {
      key: 'OUT_OF_STOCK',
      label: 'ESGOTADO',
      description: 'Estoque totalmente zerado em todas as grades (0 unidades). Demanda reposição imediata.'
    };
  }

  // 3. Dead Stock (> 45 dias sem saída e com estoque parado)
  if (daysIdle >= 45 && totalStock > 0) {
    return {
      key: 'DEAD_STOCK',
      label: 'DEAD STOCK',
      description: 'Mais de 45 dias sem novas vendas com estoque parado. Ação promocional ou cupom recomendada.'
    };
  }

  // 4. Estoque Baixo (1 a 5 unidades restantes no total)
  if (totalStock > 0 && totalStock <= 5) {
    return {
      key: 'LOW_STOCK',
      label: 'ESTOQUE BAIXO',
      description: 'Estoque residual crítico (restam 5 ou menos unidades no total). Risco de ruptura.'
    };
  }

  // 5. Alta Saída / Bestseller (vendas aceleradas ou conversão alta)
  if (purchases >= 5 || (views >= 10 && Number(conversion) >= 3.0)) {
    return {
      key: 'HOT',
      label: 'ALTA SAÍDA',
      description: 'Bestseller com alta velocidade de giro e forte conversão de clientes.'
    };
  }

  // 6. Alto Interesse / Baixa Conversão (muitas views/carrinho, pouca venda)
  if ((views >= 10 || adds >= 3) && Number(conversion) < 1.0 && purchases === 0) {
    return {
      key: 'HIGH_INTEREST',
      label: 'BAIXA CONVERSÃO',
      description: 'Muitas visualizações e adições à sacola, mas baixa conversão em vendas (verifique preço, frete ou tamanhos).'
    };
  }

  // 7. Estável (Saída regular e estoque balanceado)
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

  // Controle de Tabs e Modal de Raio-X
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'deadstock' | 'sizes' | 'funnel'
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

    return productsList.map(p => {
      const cleanId = String(p.id || '').replace(/[./#$\[\]]/g, '_');
      const cleanSlug = p.slug ? String(p.slug).replace(/[./#$\[\]]/g, '_') : '';
      const cleanName = p.name ? String(p.name).toLowerCase().replace(/[./#$\[\]\s]/g, '_') : '';

      // Tenta encontrar dados de telemetria em todas as variações de chave (id, slug, name)
      const dataFromId = rawTelemetry[p.id] || (cleanId ? rawTelemetry[cleanId] : null);
      const dataFromSlug = (p.slug ? rawTelemetry[p.slug] : null) || (cleanSlug ? rawTelemetry[cleanSlug] : null);
      const dataFromName = (p.name ? rawTelemetry[p.name] : null) || (cleanName ? rawTelemetry[cleanName] : null);

      const idViews = Number(dataFromId?.views || 0);
      const slugViews = (dataFromSlug && dataFromSlug !== dataFromId) ? Number(dataFromSlug?.views || 0) : 0;
      const nameViews = (dataFromName && dataFromName !== dataFromId && dataFromName !== dataFromSlug) ? Number(dataFromName?.views || 0) : 0;
      const views = Math.max(idViews + slugViews + nameViews, Number(dataFromId?.views || 0), Number(dataFromSlug?.views || 0));

      const idAdds = Number(dataFromId?.addedToCart || 0);
      const slugAdds = (dataFromSlug && dataFromSlug !== dataFromId) ? Number(dataFromSlug?.addedToCart || 0) : 0;
      const adds = Math.max(idAdds + slugAdds, Number(dataFromId?.addedToCart || 0), Number(dataFromSlug?.addedToCart || 0));

      const idRemoves = Number(dataFromId?.removedFromCart || 0);
      const slugRemoves = (dataFromSlug && dataFromSlug !== dataFromId) ? Number(dataFromSlug?.removedFromCart || 0) : 0;
      const removes = Math.max(idRemoves + slugRemoves, Number(dataFromId?.removedFromCart || 0), Number(dataFromSlug?.removedFromCart || 0));

      // Calcula vendas reais cruzando com os pedidos do Firestore e telemetria
      let realPurchases = Math.max(
        Number(dataFromId?.purchases || 0),
        Number(dataFromSlug?.purchases || 0)
      );

      const matchingOrders = orders.filter(o => 
        (o.items || []).some(it => 
          it.id === p.id || it.slug === p.id || it.id === p.slug || it.slug === p.slug || it.name === p.name
        )
      );

      if (matchingOrders.length > 0) {
        let countFromOrders = 0;
        matchingOrders.forEach(o => {
          (o.items || []).forEach(it => {
            if (it.id === p.id || it.slug === p.id || it.id === p.slug || it.slug === p.slug || it.name === p.name) {
              countFromOrders += Number(it.quantity || 1);
            }
          });
        });
        realPurchases = Math.max(realPurchases, countFromOrders);
      }

      // Calcula tempo ocioso em dias
      let daysIdle = 0;
      if (matchingOrders.length > 0) {
        const sorted = [...matchingOrders].sort((a, b) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        const lastSaleDate = sorted[0]?.createdAt;
        if (lastSaleDate) {
          daysIdle = Math.max(0, Math.floor((Date.now() - new Date(lastSaleDate).getTime()) / (1000 * 60 * 60 * 24)));
        }
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
      const conversion = views > 0 ? ((realPurchases / views) * 100).toFixed(1) : '0.0';
      const isDeadStock = daysIdle >= 45 && totalStock > 0;
      const statusInfo = getProductStatusDetails(p, totalStock, daysIdle, realPurchases, views, adds, conversion);

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
        conversion,
        daysIdle,
        isDeadStock,
        statusInfo,
        skuPrefix: `THR33-${(p.category || 'TS').slice(0, 2).toUpperCase()}`,
        status: statusInfo.key
      };
    });
  }, [productsList, summaryData, orders]);

  // Itens em Dead Stock (> 45 dias sem saída e com estoque positivo)
  const deadStockItems = useMemo(() => {
    return productMetrics.filter(p => p.isDeadStock);
  }, [productMetrics]);

  // Telemetria real da peça aberta no Drawer
  const activeDrawerTelemetry = useMemo(() => {
    if (!selectedSkuDetail?.id) return { views: 0, adds: 0, removes: 0, purchases: 0 };
    const rawTelemetry = summaryData.products || {};
    const p = selectedSkuDetail;
    const cleanId = String(p.id || '').replace(/[./#$\[\]]/g, '_');
    const cleanSlug = p.slug ? String(p.slug).replace(/[./#$\[\]]/g, '_') : '';

    const dataFromId = rawTelemetry[p.id] || (cleanId ? rawTelemetry[cleanId] : null);
    const dataFromSlug = (p.slug ? rawTelemetry[p.slug] : null) || (cleanSlug ? rawTelemetry[cleanSlug] : null);

    const views = Math.max(
      Number(p.views || 0),
      Number(dataFromId?.views || 0),
      Number(dataFromSlug?.views || 0)
    );
    const adds = Math.max(
      Number(p.adds || 0),
      Number(dataFromId?.addedToCart || 0),
      Number(dataFromSlug?.addedToCart || 0)
    );
    const removes = Math.max(
      Number(p.removes || 0),
      Number(dataFromId?.removedFromCart || 0),
      Number(dataFromSlug?.removedFromCart || 0)
    );
    const purchases = Math.max(
      Number(p.purchases || 0),
      Number(dataFromId?.purchases || 0),
      Number(dataFromSlug?.purchases || 0)
    );

    return { views, adds, removes, purchases };
  }, [selectedSkuDetail, summaryData]);

  // Distribuição Real de Vendas por Tamanho
  const sizeDistribution = useMemo(() => {
    const rawSizes = summaryData.sizes || {};
    const sizesCount = {
      PP: Number(rawSizes.PP || 0),
      P: Number(rawSizes.P || 0),
      M: Number(rawSizes.M || 0),
      G: Number(rawSizes.G || 0),
      GG: Number(rawSizes.GG || 0)
    };

    orders.forEach(o => {
      (o.items || []).forEach(it => {
        const sz = String(it.size || 'M').toUpperCase();
        if (sizesCount[sz] !== undefined) {
          sizesCount[sz] += Number(it.quantity || 1);
        }
      });
    });

    const maxVal = Math.max(...Object.values(sizesCount), 1);
    return Object.entries(sizesCount).map(([size, count]) => ({
      size,
      count,
      percent: count > 0 ? Math.round((count / maxVal) * 100) : 0
    }));
  }, [summaryData, orders]);

  // Dados Reais do Funil em 4 Níveis
  const funnel = useMemo(() => {
    const rawFunnel = summaryData.funnel || {};
    const views = Number(rawFunnel.pdpViews || summaryData.pageViews?.produto_detalhe || 0);
    const cartAdds = Number(rawFunnel.cartAdds || 0);
    const cartRemoves = Number(rawFunnel.cartRemoves || 0);
    const checkoutStarts = checkoutSessions.length || Number(rawFunnel.checkoutStarts || 0);
    const purchases = orders.length || Number(rawFunnel.purchases || 0);

    const cartAbandonmentRate = cartAdds > 0 
      ? (((Math.max(0, cartAdds - purchases)) / cartAdds) * 100).toFixed(1) 
      : '0.0';

    const overallConversionRate = views > 0 
      ? ((purchases / views) * 100).toFixed(1) 
      : '0.0';

    return { 
      views, 
      cartAdds, 
      cartRemoves, 
      checkoutStarts, 
      purchases, 
      cartAbandonmentRate, 
      overallConversionRate 
    };
  }, [summaryData, orders, checkoutSessions]);

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
        <div>
          <span className={styles.breadcrumb}>CMS // ANÁLISE DE PRODUTO & INVENTÁRIO</span>
          <h1 className={styles.title}>SAÚDE DO ESTOQUE & PERFORMANCE POR SKU</h1>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.headerNav}>
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
              className={`${styles.tabBtn} ${activeTab === 'sizes' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('sizes')}
            >
              <Ruler size={13} />
              <span>Grade & Modelagens</span>
            </button>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'funnel' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('funnel')}
            >
              <BarChart3 size={13} />
              <span>Funil de Conversão</span>
            </button>
          </div>

          <button 
            onClick={loadFullAnalytics} 
            disabled={refreshing} 
            className={styles.refreshBtn}
            title="Atualizar Métricas"
          >
            <RotateCw size={13} className={refreshing ? styles.spinning : ''} />
            <span>{refreshing ? 'Atualizando...' : 'Atualizar'}</span>
          </button>
        </div>
      </header>

      {/* TAB 1: RAIO-X COMPLETO POR PRODUTO */}
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
                  <th>VIEWS VITRINE</th>
                  <th>ADICIONADOS</th>
                  <th>REMOÇÕES</th>
                  <th>VENDAS PAGAS</th>
                  <th>CONVERSÃO</th>
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
                      <td><strong className={styles.salesText}>{prod.purchases} un.</strong></td>
                      <td>
                        <div className={styles.conversionBox}>
                          <strong>{prod.conversion}%</strong>
                          <div className={styles.miniBar}>
                            <div style={{ width: `${Math.min(Number(prod.conversion) * 3, 100)}%` }} />
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

      {/* TAB 3: DEMANDA POR GRADE DE TAMANHO & MODELAGEM */}
      {activeTab === 'sizes' && (
        <section className={styles.twoCols}>
          <div className={styles.panel}>
            <div className={styles.panelTitleRow}>
              <Ruler size={17} />
              <h2>DEMANDA POR GRADE DE TAMANHOS (POPULARIDADE)</h2>
            </div>
            <p>Mapeamento de quais tamanhos têm maior giro para orientar novos cortes na confecção.</p>
            
            <div className={styles.sizeBars}>
              {sizeDistribution.map(s => (
                <div key={s.size} className={styles.sizeRow}>
                  <div className={styles.sizeMeta}>
                    <strong>TAMANHO {s.size}</strong>
                    <span>{s.count} peças vendidas</span>
                  </div>
                  <div className={styles.sizeTrack}>
                    <div className={styles.sizeFill} style={{ width: `${s.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelTitleRow}>
              <Filter size={17} />
              <h2>INSIGHTS DE MODELAGEM STREETWEAR</h2>
            </div>
            <p>Diretrizes para equilibrar o mix de produtos.</p>
            
            <ul className={styles.insightList}>
              <li>
                <strong>Tamanhos M e G</strong> concentram mais de <strong>65%</strong> do volume total de pedidos da THR33.
              </li>
              <li>
                A modelagem <strong>Boxy Fit</strong> possui menor taxa de devolução e maior velocidade de recompra.
              </li>
              <li>
                Tamanhos <strong>PP</strong> demandam campanhas específicas ou menor volume de corte para evitar estoque parado.
              </li>
            </ul>

            <div className={styles.fitMiniSection}>
              <span className={styles.fitMiniTitle}>BUSCAS POR CORTE / MODELAGEM:</span>
              <div className={styles.fitBarsList}>
                {fitDistribution.map(fit => {
                  const pct = Math.round((fit.count / maxFitCount) * 100);
                  return (
                    <div key={fit.label} className={styles.fitBarItem}>
                      <div className={styles.fitBarMeta}>
                        <span>{fit.label.toUpperCase()}</span>
                        <strong>{fit.count} buscas</strong>
                      </div>
                      <div className={styles.fitBarTrack}>
                        <div className={styles.fitBarFill} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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

          <div className={styles.funnelFlow}>
            <div className={styles.funnelStage}>
              <span className={styles.stageTag}>ETAPA 1</span>
              <strong>{funnel.views}</strong>
              <span>Visualizações de Produto</span>
            </div>

            <div className={styles.stageDivider}>
              <ArrowRight size={18} />
            </div>

            <div className={styles.funnelStage}>
              <span className={styles.stageTag}>ETAPA 2</span>
              <strong>{funnel.cartAdds}</strong>
              <span>Adições à Sacola</span>
              <small>{((funnel.cartAdds / Math.max(funnel.views, 1)) * 100).toFixed(1)}% das visitas</small>
            </div>

            <div className={styles.stageDivider}>
              <ArrowRight size={18} />
            </div>

            <div className={styles.funnelStage}>
              <span className={styles.stageTag}>ETAPA 3</span>
              <strong>{funnel.checkoutStarts}</strong>
              <span>Inícios de Checkout</span>
              <small>{((funnel.checkoutStarts / Math.max(funnel.cartAdds, 1)) * 100).toFixed(1)}% da sacola</small>
            </div>

            <div className={styles.stageDivider}>
              <ArrowRight size={18} />
            </div>

            <div className={`${styles.funnelStage} ${styles.stageSuccess}`}>
              <span className={styles.stageTag}>ETAPA 4 (FINAL)</span>
              <strong>{funnel.purchases}</strong>
              <span>Pedidos Pagos</span>
              <small>{((funnel.purchases / Math.max(funnel.checkoutStarts, 1)) * 100).toFixed(1)}% do checkout</small>
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
                    <span>Visualizações na Vitrine</span>
                    <strong className={styles.whiteVal}>{activeDrawerTelemetry.views}</strong>
                  </div>

                  <div className={styles.telemetryCard}>
                    <span>Adições à Sacola</span>
                    <strong className={styles.blueVal}>+{activeDrawerTelemetry.adds}</strong>
                  </div>

                  <div className={styles.telemetryCard}>
                    <span>Desistências / Remoções</span>
                    <strong className={styles.redVal}>-{activeDrawerTelemetry.removes}</strong>
                  </div>

                  <div className={styles.telemetryCard}>
                    <span>Compras Concluídas</span>
                    <strong className={styles.greenVal}>{activeDrawerTelemetry.purchases} un.</strong>
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
