import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { 
  DollarSign, 
  ShoppingBag, 
  Users, 
  AlertTriangle, 
  Search, 
  Package, 
  RotateCw, 
  TrendingUp,
  ArrowRight,
  Flame,
  CheckCircle2,
  Tag,
  Clock,
  Calendar,
  Check,
  X
} from 'lucide-react';
import { db } from '../../services/firebaseConfig';
import { catalogService } from '../../services/catalogService';
import { maskCPF } from '../../utils/validators';
import { InfoTooltip } from '../../components/ui/InfoTooltip';
import { 
  useCmsPeriodFilter, 
  parseOrderDate, 
  getTodayStr, 
  formatShortDate 
} from '../../hooks/useCmsPeriodFilter';
import styles from './CmsDashboard.module.css';

export function CmsDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [usersCount, setUsersCount] = useState(0);
  const [summaryData, setSummaryData] = useState({});

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

  const [cpfSearch, setCpfSearch] = useState('');
  const [crmResult, setCrmResult] = useState(null);
  const [crmLoading, setCrmLoading] = useState(false);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [prods, ordersSnap, usersSnap, summarySnap, sessionsSnap] = await Promise.all([
        catalogService.getAllProducts(),
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'users')),
        getDoc(doc(db, 'analytics', 'summary')),
        getDocs(collection(db, 'checkout_sessions')).catch(() => ({ forEach: () => {} }))
      ]);

      setProducts(prods || []);

      const ords = [];
      const seenIds = new Set();

      ordersSnap.forEach(d => {
        if (!seenIds.has(d.id)) {
          seenIds.add(d.id);
          ords.push({ id: d.id, ...d.data() });
        }
      });

      if (sessionsSnap && sessionsSnap.forEach) {
        sessionsSnap.forEach(d => {
          const data = d.data();
          if (data.completed === true && !seenIds.has(d.id)) {
            seenIds.add(d.id);
            ords.push({ id: d.id, ...data });
          }
        });
      }

      setOrders(ords);
      setUsersCount(usersSnap.size || 0);

      if (summarySnap.exists()) {
        setSummaryData(summarySnap.data() || {});
      } else {
        setSummaryData({});
      }
    } catch (err) {
      console.warn("Aviso ao carregar Visão Geral:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // 1. FILTRAGEM TEMPORAL DE PEDIDOS
  const filteredOrders = useMemo(() => {
    if (periodFilter === 'all') return orders;

    const now = new Date();
    // Início de hoje (00:00:00.000)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    // Fim de hoje (23:59:59.999)
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    return orders.filter(order => {
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
  }, [orders, periodFilter, customStartDate, customEndDate]);

  // 2. MÉTRICAS FINANCEIRAS DO PERÍODO
  const financialMetrics = useMemo(() => {
    const revenue = filteredOrders.reduce((acc, o) => acc + (Number(o.total) || Number(o.amount) || 0), 0);
    const orderCount = filteredOrders.length;
    const aov = orderCount > 0 ? (revenue / orderCount) : 0;

    return {
      revenue,
      orderCount,
      aov
    };
  }, [filteredOrders]);

  // 3. INVENTÁRIO & ALERTA DE ESTOQUE BAIXO / CRÍTICO
  const inventoryMetrics = useMemo(() => {
    let totalUnits = 0;
    const lowStockAlerts = [];

    products.forEach(p => {
      let parsedStock = { PP: 0, P: 0, M: 0, G: 0, GG: 0 };
      if (p.stock && typeof p.stock === 'object') {
        parsedStock = {
          PP: Number(p.stock.PP ?? 0),
          P: Number(p.stock.P ?? 0),
          M: Number(p.stock.M ?? 0),
          G: Number(p.stock.G ?? 0),
          GG: Number(p.stock.GG ?? 0)
        };
      } else if (p.totalStock !== undefined) {
        const total = Number(p.totalStock || 0);
        parsedStock = {
          PP: Math.floor(total * 0.1),
          P: Math.floor(total * 0.25),
          M: Math.floor(total * 0.35),
          G: Math.floor(total * 0.2),
          GG: Math.floor(total * 0.1)
        };
      }

      const productTotal = Object.values(parsedStock).reduce((a, b) => Number(a) + Number(b), 0);
      totalUnits += productTotal;

      const hasZeroSizes = Object.entries(parsedStock).some(([_, qty]) => Number(qty) === 0);

      if (productTotal <= 5 || hasZeroSizes) {
        lowStockAlerts.push({
          ...p,
          totalStock: productTotal,
          hasZeroSizes,
          stockBreakdown: parsedStock
        });
      }
    });

    return {
      totalUnits,
      lowStockAlerts: lowStockAlerts.sort((a, b) => a.totalStock - b.totalStock)
    };
  }, [products]);

  // 5. PRODUTOS MAIS ACESSADOS (RANKING)
  const topViewedProducts = useMemo(() => {
    const rawTelemetry = summaryData.products || {};
    const telemetryKeys = Object.keys(rawTelemetry);

    const prodsWithViews = products.map(p => {
      const cleanId = String(p.id || '').replace(/[./#$\[\]]/g, '_');
      const cleanSlug = p.slug ? String(p.slug).replace(/[./#$\[\]]/g, '_') : '';
      const cleanName = p.name ? String(p.name).toLowerCase().replace(/[./#$\[\]\s]/g, '_') : '';

      const matchedKey = telemetryKeys.find(k => 
        k === String(p.id) ||
        (p.slug && k === String(p.slug)) ||
        (p.slug && k.replace(/_/g, '-') === String(p.slug).replace(/_/g, '-')) ||
        (p.name && k.toLowerCase().replace(/[\s_-]/g, '') === String(p.name).toLowerCase().replace(/[\s_-]/g, ''))
      );
      const dataFromMatch = matchedKey ? rawTelemetry[matchedKey] : null;

      const dataFromId = rawTelemetry[p.id] || (cleanId ? rawTelemetry[cleanId] : null);
      const dataFromSlug = (p.slug ? rawTelemetry[p.slug] : null) || (cleanSlug ? rawTelemetry[cleanSlug] : null);
      const dataFromName = (p.name ? rawTelemetry[p.name] : null) || (cleanName ? rawTelemetry[cleanName] : null);

      const views = Math.max(
        Number(p.views || 0),
        Number(dataFromId?.views || 0),
        Number(dataFromSlug?.views || 0),
        Number(dataFromName?.views || 0),
        Number(dataFromMatch?.views || 0)
      );

      return { 
        ...p, 
        views,
        image: p.image || (p.images && p.images[0]) || ''
      };
    }).filter(p => p.views > 0).sort((a, b) => b.views - a.views);

    const maxViews = Math.max(...prodsWithViews.map(p => p.views), 1);
    return prodsWithViews.slice(0, 5).map(p => ({
      ...p,
      percent: Math.round((p.views / maxViews) * 100)
    }));
  }, [products, summaryData]);

  // 6. IDENTIFICAÇÃO REAL DE DEAD STOCK (> 45 DIAS SEM GIRO COM ESTOQUE POSITIVO)
  const deadStockList = useMemo(() => {
    const deadItems = [];

    products.forEach(p => {
      let parsedStock = { PP: 0, P: 0, M: 0, G: 0, GG: 0 };
      if (p.stock && typeof p.stock === 'object') {
        parsedStock = {
          PP: Number(p.stock.PP ?? 0),
          P: Number(p.stock.P ?? 0),
          M: Number(p.stock.M ?? 0),
          G: Number(p.stock.G ?? 0),
          GG: Number(p.stock.GG ?? 0)
        };
      } else if (p.totalStock !== undefined) {
        const total = Number(p.totalStock || 0);
        parsedStock = {
          PP: Math.floor(total * 0.1),
          P: Math.floor(total * 0.25),
          M: Math.floor(total * 0.35),
          G: Math.floor(total * 0.2),
          GG: Math.floor(total * 0.1)
        };
      }
      const totalStock = Object.values(parsedStock).reduce((a, b) => Number(a) + Number(b), 0);

      const cleanId = String(p.id || '').replace(/[./#$\[\]]/g, '_');
      const cleanSlug = p.slug ? String(p.slug).replace(/[./#$\[\]]/g, '_') : '';
      const pName = p.name ? String(p.name).trim().toLowerCase() : '';

      let lastSaleTimestamp = 0;
      let hasSale = false;

      orders.forEach(order => {
        (order.items || []).forEach(it => {
          const itId = String(it?.id || '');
          const itSlug = String(it?.slug || '');
          const itName = it?.name ? String(it.name).trim().toLowerCase() : '';

          const isMatch = (
            (itId && (itId === String(p.id) || itId === String(p.slug) || itId === cleanId)) ||
            (itSlug && (itSlug === String(p.id) || itSlug === String(p.slug) || itSlug === cleanSlug)) ||
            (itName && pName && itName === pName)
          );

          if (isMatch) {
            hasSale = true;
            const orderDate = order.createdAt ? new Date(order.createdAt).getTime() : 0;
            if (orderDate > lastSaleTimestamp) {
              lastSaleTimestamp = orderDate;
            }
          }
        });
      });

      let daysIdle = 0;
      if (lastSaleTimestamp > 0) {
        daysIdle = Math.max(0, Math.floor((Date.now() - lastSaleTimestamp) / (1000 * 60 * 60 * 24)));
      } else {
        let createdTimestamp = null;
        if (p.createdAt) {
          const t = new Date(p.createdAt).getTime();
          if (!isNaN(t) && t > 0) createdTimestamp = t;
        } else if (p.updatedAt) {
          const t = new Date(p.updatedAt).getTime();
          if (!isNaN(t) && t > 0) createdTimestamp = t;
        } else if (typeof p.id === 'string' && p.id.startsWith('thr33_')) {
          const num = Number(p.id.replace('thr33_', ''));
          if (!isNaN(num) && num > 1600000000000) createdTimestamp = num;
        } else if (p.daysWithoutSale !== undefined) {
          daysIdle = Number(p.daysWithoutSale);
        }

        if (createdTimestamp !== null) {
          daysIdle = Math.max(0, Math.floor((Date.now() - createdTimestamp) / (1000 * 60 * 60 * 24)));
        } else if (p.daysWithoutSale === undefined) {
          daysIdle = 0;
        }
      }

      if (daysIdle >= 45 && totalStock > 0) {
        deadItems.push({
          ...p,
          totalStock,
          daysIdle,
          skuPrefix: `THR33-${(p.category || 'TS').slice(0, 2).toUpperCase()}-ALL`,
          image: p.image || (p.images && p.images[0]) || ''
        });
      }
    });

    return deadItems.sort((a, b) => b.daysIdle - a.daysIdle);
  }, [products, orders]);

  // 6. BUSCA CRM 360 POR CPF
  const handleSearchCpf = async (e) => {
    e.preventDefault();
    if (!cpfSearch.trim()) return;

    setCrmLoading(true);
    setCrmResult(null);

    const cleanCpf = cpfSearch.replace(/\D/g, '');
    const foundOrders = orders.filter(o => 
      (o.customerCpf || o.cpf || o.clientCpf || '').replace(/\D/g, '') === cleanCpf
    );

    if (foundOrders.length > 0) {
      const totalSpent = foundOrders.reduce((acc, o) => acc + (Number(o.total) || Number(o.amount) || 0), 0);
      const firstOrder = foundOrders[0];
      setCrmResult({
        cpf: maskCPF(cleanCpf),
        name: firstOrder.customerName || firstOrder.name || firstOrder.clientName || 'Cliente THR33',
        email: firstOrder.customerEmail || firstOrder.email || firstOrder.clientEmail || '',
        ordersCount: foundOrders.length,
        totalSpent,
        orders: foundOrders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      });
    } else {
      setCrmResult({ notFound: true, cpf: maskCPF(cleanCpf) });
    }
    setCrmLoading(false);
  };

  const handleCpfChange = (e) => {
    setCpfSearch(maskCPF(e.target.value));
  };

  return (
    <div className={styles.container}>
      {/* HEADER EXECUTIVO COM FILTRO TEMPORAL */}
      <header className={styles.header}>
        <div>
          <span className={styles.breadcrumb}>CMS // PAINEL EXECUTIVO</span>
          <h1 className={styles.title}>VISÃO GERAL DO SISTEMA</h1>
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
              onClick={loadDashboardData} 
              className={styles.refreshBtn}
              title="Atualizar dados em tempo real"
              aria-label="Atualizar dados"
            >
              <RotateCw size={14} className={loading ? styles.spinning : ''} />
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
      </header>

      {/* 4 CARDS DE KPIS EXECUTIVOS */}
      <section className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>
              FATURAMENTO ({periodLabel})
            </span>
            <InfoTooltip text="Receita líquida total dos pedidos aprovados no período selecionado." title="Faturamento" position="bottom" align="left" />
          </div>
          <strong className={styles.kpiValue}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialMetrics.revenue)}
          </strong>
          <small className={styles.kpiSub}>Transações aprovadas</small>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>PEDIDOS ({periodLabel})</span>
            <InfoTooltip text="Total de compras finalizadas e pagas no intervalo selecionado." title="Pedidos" position="bottom" align="left" />
          </div>
          <strong className={styles.kpiValue}>{financialMetrics.orderCount}</strong>
          <small className={styles.kpiSub}>
            Ticket Médio: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialMetrics.aov)}
          </small>
        </div>

        <div className={`${styles.kpiCard} ${inventoryMetrics.lowStockAlerts.length > 0 ? styles.kpiAlertCard : ''}`}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>ESTOQUE CRÍTICO / ALERTA</span>
            <InfoTooltip text="Peças com estoque total menor ou igual a 5 unidades ou grades esgotadas." title="Alerta de Reposição" position="bottom" align="right" />
          </div>
          <strong className={styles.kpiAlertValue}>{inventoryMetrics.lowStockAlerts.length} Peças</strong>
          <small className={styles.kpiSub}>Total em estoque: {inventoryMetrics.totalUnits} un.</small>
        </div>

        <div className={`${styles.kpiCard} ${deadStockList.length > 0 ? styles.kpiAlertCard : ''}`}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>DEAD STOCK (&gt; 45 DIAS)</span>
            <InfoTooltip text="SKUs com estoque positivo sem nenhuma venda há mais de 45 dias." title="Dead Stock" position="bottom" align="right" />
          </div>
          <strong className={deadStockList.length > 0 ? styles.kpiAlertValue : styles.kpiValue}>
            {deadStockList.length} SKUs
          </strong>
          <small className={styles.kpiSub}>{deadStockList.length > 0 ? 'Exigem ação de queima' : 'Giro 100% saudável'}</small>
        </div>
      </section>

      {/* SEÇÃO PRINCIPAL: PRODUTOS MAIS VISUALIZADOS E REPOSIÇÃO DE ESTOQUE */}
      <div className={styles.mainGrid}>
        {/* COLUNA ESQUERDA: TOP PRODUTOS MAIS ACESSADOS */}
        <div className={styles.cardBox}>
          <div className={styles.boxHeader}>
            <div className={styles.titleWithIcon}>
              <Flame size={16} color="#f97316" />
              <h3>PRODUTOS MAIS VISUALIZADOS</h3>
            </div>
            <InfoTooltip text="Peças que mais despertam interesse e cliques do público streetwear." title="Top Peças" position="bottom" align="left" />
          </div>
          <div className={styles.topProductsList}>
            {topViewedProducts.length === 0 ? (
              <p className={styles.emptyText}>Nenhuma visualização registrada ainda.</p>
            ) : (
              topViewedProducts.map((p, idx) => (
                <div key={p.id} className={styles.topProdRow}>
                  <span className={styles.rankNum}>#{idx + 1}</span>
                  {p.image ? (
                    <img src={p.image} alt={p.name} className={styles.thumb} />
                  ) : (
                    <div className={styles.thumbPlaceholder}><Package size={16} /></div>
                  )}
                  <div className={styles.topProdInfo}>
                    <strong className={styles.topProdName}>{p.name}</strong>
                    <small className={styles.topProdSub}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price || 0)} • {p.views} visualizações
                    </small>
                    <div className={styles.miniBar}>
                      <div style={{ width: `${p.percent}%` }} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: REPOSIÇÃO PRIORITÁRIA DE ESTOQUE */}
        <div className={styles.cardBox}>
          <div className={styles.boxHeader}>
            <div className={styles.titleWithIcon}>
              <AlertTriangle size={16} color="#f87171" />
              <h3>REPOSIÇÃO PRIORITÁRIA DE ESTOQUE</h3>
            </div>
            <InfoTooltip text="Peças com risco imediato de ruptura ou com tamanhos esgotados." title="Estoque Crítico" position="bottom" align="right" />
          </div>
          
          <div className={styles.alertTableWrapper}>
            {inventoryMetrics.lowStockAlerts.length === 0 ? (
              <div className={styles.healthyStockBox}>
                <CheckCircle2 size={36} color="#4ade80" />
                <strong>Estoque 100% Equilibrado</strong>
                <p>Nenhuma peça com risco de ruptura no momento.</p>
              </div>
            ) : (
              <div className={styles.stockAlertsList}>
                {inventoryMetrics.lowStockAlerts.map(item => (
                  <div key={item.id} className={styles.stockAlertCard}>
                    {item.image ? (
                      <img src={item.image} alt={item.name} className={styles.alertThumb} />
                    ) : (
                      <div className={styles.thumbPlaceholder}><Package size={16} /></div>
                    )}
                    <div className={styles.alertMeta}>
                      <div className={styles.alertTitleRow}>
                        <strong className={styles.alertProdName}>{item.name}</strong>
                        <span className={styles.stockBadge}>{item.totalStock} un. totais</span>
                      </div>
                      <div className={styles.gradeBreakdown}>
                        {Object.entries(item.stockBreakdown || {}).map(([sz, q]) => (
                          <span key={sz} className={Number(q) === 0 ? styles.zeroSize : styles.sizeTag}>
                            {sz}: {q}
                          </span>
                        ))}
                      </div>
                      <button 
                        onClick={() => navigate('/cms/metricas')} 
                        className={styles.adjustStockBtn}
                      >
                        <span>Ajustar Grade no Raio-X</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SEÇÃO DEAD STOCK // SKUS ENCALHADOS */}
      <section className={styles.deadStockSection}>
        <div className={styles.deadStockHeader}>
          <div className={styles.titleWithIcon}>
            <Clock size={18} color="#f87171" />
            <h3>SKUS EM DEAD STOCK (&gt; 45 DIAS SEM GIRO)</h3>
          </div>
          <InfoTooltip text="Peças com estoque físico positivo no Firestore sem nenhuma saída nos últimos 45 dias. Crie cupons promocionais para acelerar o giro de capital." title="Dead Stock" position="bottom" align="right" />
        </div>

        {deadStockList.length === 0 ? (
          <div className={styles.healthyDeadStockBox}>
            <CheckCircle2 size={36} color="#4ade80" />
            <div>
              <strong>Giro de Estoque 100% Saudável!</strong>
              <p>Nenhuma peça com estoque físico está há mais de 45 dias sem saída no momento.</p>
            </div>
          </div>
        ) : (
          <div className={styles.deadStockGrid}>
            {deadStockList.map(item => (
              <div key={item.id} className={styles.deadStockCard}>
                {item.image ? (
                  <img src={item.image} alt={item.name} className={styles.deadStockThumb} />
                ) : (
                  <div className={styles.thumbPlaceholder}><Package size={20} /></div>
                )}
                <div className={styles.deadStockMeta}>
                  <div className={styles.deadStockTopRow}>
                    <strong className={styles.deadStockName}>{item.name}</strong>
                    <span className={styles.daysIdleBadge}>{item.daysIdle} dias sem saída</span>
                  </div>
                  <div className={styles.deadStockSubRow}>
                    <code>{item.skuPrefix}</code>
                    <span>Estoque: <strong>{item.totalStock} un.</strong></span>
                  </div>
                  <button 
                    onClick={() => navigate(`/cms/cupons?productId=${item.id}`)}
                    className={styles.deadStockActionBtn}
                  >
                    <Tag size={12} />
                    <span>Criar Desconto / Promoção</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SEÇÃO CRM 360 & BUSCA DE CLIENTE */}
      <section className={styles.crmSection}>
        <div className={styles.crmHeader}>
          <div className={styles.titleWithIcon}>
            <Search size={18} />
            <h3>CRM 360º & SUPORTE RÁPIDO</h3>
          </div>
          <p>Digite o CPF do cliente para puxar o histórico consolidado de pedidos e faturamento.</p>
        </div>

        <form onSubmit={handleSearchCpf} className={styles.searchForm}>
          <input 
            type="text" 
            placeholder="Digite o CPF (Ex: 000.000.000-00)" 
            value={cpfSearch} 
            onChange={handleCpfChange}
            className={styles.cpfInput}
            maxLength={14}
          />
          <button type="submit" disabled={crmLoading} className={styles.searchBtn}>
            {crmLoading ? 'BUSCANDO...' : 'BUSCAR CLIENTE'}
          </button>
        </form>

        {crmResult && (
          <div className={styles.crmResultCard}>
            {crmResult.notFound ? (
              <p className={styles.notFoundText}>Nenhum pedido encontrado para o CPF {crmResult.cpf}.</p>
            ) : (
              <div className={styles.crmProfile}>
                <div className={styles.crmTopInfo}>
                  <div>
                    <strong className={styles.crmName}>{crmResult.name}</strong>
                    <small className={styles.crmCpf}>CPF: {crmResult.cpf} {crmResult.email && `• ${crmResult.email}`}</small>
                  </div>
                  <div className={styles.crmKpis}>
                    <span>{crmResult.ordersCount} {crmResult.ordersCount === 1 ? 'pedido aprovado' : 'pedidos aprovados'}</span>
                    <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(crmResult.totalSpent)} acumulados</strong>
                  </div>
                </div>

                <div className={styles.crmOrdersList}>
                  {crmResult.orders.map(o => (
                    <div key={o.id} className={styles.crmOrderItem}>
                      <div>
                        <span>Pedido #{o.id.slice(0, 8).toUpperCase()}</span>
                        <small>{o.createdAt ? new Date(o.createdAt).toLocaleDateString('pt-BR') : 'Data recente'}</small>
                      </div>
                      <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(o.total) || 0)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default CmsDashboard;
