import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { 
  RotateCw, 
  Search, 
  Package, 
  DollarSign, 
  TrendingUp, 
  RefreshCw, 
  Truck, 
  User, 
  MapPin, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  FileText,
  Calendar,
  Headphones,
  Save
} from 'lucide-react';
import { db } from '../../services/firebaseConfig';
import { maskCPF } from '../../utils/validators';
import styles from './CmsPedidos.module.css';

const STATUS_OPTIONS = [
  { value: 'Aprovado', label: 'Aprovado', color: '#4ade80' },
  { value: 'Em Separação', label: 'Em Separação', color: '#facc15' },
  { value: 'Em Trânsito', label: 'Em Trânsito', color: '#60a5fa' },
  { value: 'Entregue', label: 'Entregue', color: '#a3a3a3' },
  { value: 'Troca Solicitada', label: 'Troca Solicitada', color: '#f87171' },
  { value: 'Devolvido', label: 'Devolvido', color: '#c084fc' }
];

// Helper para obter datas formatadas no formato YYYY-MM-DD
const getTodayISO = () => new Date().toISOString().split('T')[0];

const getDaysAgoISO = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};

const formatDateBR = (isoStr) => {
  if (!isoStr) return '';
  const [year, month, day] = isoStr.split('-');
  return `${day}/${month}/${year}`;
};

export function CmsPedidos() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filtros de Data & Período
  const [dateRangePreset, setDateRangePreset] = useState('all'); // '1d' | '7d' | '30d' | 'custom' | 'all'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const todayStr = getTodayISO();

  // Modal de Detalhes & Logística Reversa
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [exchangeReason, setExchangeReason] = useState('tamanho-boxy-pequeno');
  const [generatingLabel, setGeneratingLabel] = useState(false);

  // Edição de Rastreio & NF-e no Drawer
  const [drawerTracking, setDrawerTracking] = useState('');
  const [drawerNfeKey, setDrawerNfeKey] = useState('');
  const [savingLogistics, setSavingLogistics] = useState(false);

  useEffect(() => {
    if (selectedOrder) {
      setDrawerTracking(selectedOrder.trackingCode && !selectedOrder.trackingCode.includes('Processando') ? selectedOrder.trackingCode : '');
      setDrawerNfeKey(selectedOrder.nfeKey || selectedOrder.nfeUrl || '');
    }
  }, [selectedOrder]);

  // 1. Busca os pedidos reais no Firestore
  const fetchOrders = async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      const snap = await getDocs(collection(db, 'orders'));
      if (!snap.empty) {
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setOrders(list);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.warn("Aviso ao carregar pedidos do Firestore:", err.message);
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Trava a rolagem do fundo (eixo Y) quando o drawer de detalhes do pedido estiver aberto
  useEffect(() => {
    if (selectedOrder) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [selectedOrder]);

  // Handlers do Seletor de Período Rápido
  const handlePresetChange = (preset) => {
    setDateRangePreset(preset);
    const today = getTodayISO();

    if (preset === '1d') {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === '7d') {
      setStartDate(getDaysAgoISO(7));
      setEndDate(today);
    } else if (preset === '30d') {
      setStartDate(getDaysAgoISO(30));
      setEndDate(today);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Handler de Data Customizada com Validação Rigorosa
  const handleCustomDateChange = (type, value) => {
    const today = getTodayISO();
    let validatedVal = value;

    // 1. Validação: Não permitir datas no futuro
    if (validatedVal > today) {
      validatedVal = today;
    }

    if (type === 'start') {
      // 2. Validação: Se a data inicial for maior que a final atual, ajusta a final para a inicial
      if (endDate && validatedVal > endDate) {
        setEndDate(validatedVal);
      }
      setStartDate(validatedVal);
    } else if (type === 'end') {
      // 3. Validação: Se a data final for menor que a data inicial atual, ajusta a inicial para a final
      if (startDate && validatedVal < startDate) {
        setStartDate(validatedVal);
      }
      setEndDate(validatedVal);
    }

    setDateRangePreset('custom');
  };

  // 2. Atualizar Status do Pedido no Firestore com Validação de Rastreio
  const handleStatusChange = async (orderId, newStatus) => {
    const currentOrder = orders.find(o => o.id === orderId);

    // Validação: se estiver mudando para 'Em Trânsito' ou 'ENVIADO', o rastreio deve ser informado
    if (newStatus === 'Em Trânsito' || newStatus === 'ENVIADO') {
      const hasValidTracking = currentOrder?.trackingCode && 
        !currentOrder.trackingCode.toLowerCase().includes('processando') && 
        !currentOrder.trackingCode.toLowerCase().includes('aguardando');

      let trackingToSave = currentOrder?.trackingCode;

      if (!hasValidTracking) {
        const inputTracking = prompt(
          "⚠️ VALIDAÇÃO DE RASTREIO OBRIGATÓRIO:\nInforme o Código de Rastreio dos Correios/Transportadora para marcar o pedido como ENVIADO (Ex: BR920851843PR):"
        );

        if (!inputTracking || !inputTracking.trim()) {
          alert("❌ Ação bloqueada: É obrigatório informar o Código de Rastreio para avançar o pedido para 'Em Trânsito' / 'ENVIADO'!");
          return;
        }

        trackingToSave = inputTracking.trim().toUpperCase();
      }

      try {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, { 
          status: newStatus,
          trackingCode: trackingToSave,
          shippedAt: currentOrder?.shippedAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        const updated = {
          ...currentOrder,
          status: newStatus,
          trackingCode: trackingToSave,
          shippedAt: currentOrder?.shippedAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(updated);
        }
      } catch (err) {
        console.error("Erro ao atualizar status e rastreio:", err);
      }
      return;
    }

    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { 
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, updatedAt: new Date().toISOString() } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus, updatedAt: new Date().toISOString() }));
      }
    } catch (err) {
      console.warn("Aviso ao atualizar status no Firestore:", err.message);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus }));
      }
    }
  };

  // Salvar Rastreio e NF-e diretamente pelo Drawer de CRM
  const handleSaveLogistics = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSavingLogistics(true);

    try {
      const orderRef = doc(db, 'orders', selectedOrder.id);
      await updateDoc(orderRef, {
        trackingCode: drawerTracking.trim().toUpperCase(),
        nfeKey: drawerNfeKey.trim(),
        updatedAt: new Date().toISOString()
      });

      const updated = {
        ...selectedOrder,
        trackingCode: drawerTracking.trim().toUpperCase(),
        nfeKey: drawerNfeKey.trim(),
        updatedAt: new Date().toISOString()
      };

      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updated : o));
      setSelectedOrder(updated);
      alert("✅ Dados logísticos e código de rastreamento salvos com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar dados logísticos:", err);
      alert("Falha ao salvar dados de rastreio no Firestore.");
    } finally {
      setSavingLogistics(false);
    }
  };

  // 3. Gerar Etiqueta de Logística Reversa na Hora
  const handleGenerateReverseLabel = async () => {
    if (!selectedOrder) return;
    setGeneratingLabel(true);

    const reverseCode = `REV-${Math.floor(10000000 + Math.random() * 90000000)}BR`;
    const reverseData = {
      code: reverseCode,
      reason: exchangeReason,
      generatedAt: new Date().toISOString()
    };

    try {
      const orderRef = doc(db, 'orders', selectedOrder.id);
      await updateDoc(orderRef, {
        status: 'Troca Solicitada',
        reverseLogistics: reverseData
      });

      const updatedOrder = {
        ...selectedOrder,
        status: 'Troca Solicitada',
        reverseLogistics: reverseData
      };

      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updatedOrder : o));
      setSelectedOrder(updatedOrder);
    } catch (err) {
      console.warn("Aviso ao salvar logística reversa no Firestore:", err.message);
      const updatedOrder = {
        ...selectedOrder,
        status: 'Troca Solicitada',
        reverseLogistics: reverseData
      };
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updatedOrder : o));
      setSelectedOrder(updatedOrder);
    } finally {
      setGeneratingLabel(false);
    }
  };

  // Filtragem Geral (Por Data, Status e Busca Textual/CPF)
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // 1. Filtro por Período de Datas
      if (startDate || endDate) {
        if (!order.createdAt) return false;
        const orderDateStr = new Date(order.createdAt).toISOString().split('T')[0];
        if (startDate && endDate) {
          if (orderDateStr < startDate || orderDateStr > endDate) return false;
        } else if (startDate && orderDateStr < startDate) {
          return false;
        } else if (endDate && orderDateStr > endDate) {
          return false;
        }
      }

      // 2. Filtro por Status
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }

      // 3. Filtro por Busca
      if (searchTerm.trim()) {
        const client = (order.clientName || '').toLowerCase();
        const cpf = (order.clientCpf || '').replace(/\D/g, '');
        const id = (order.id || '').toLowerCase();
        const email = (order.clientEmail || '').toLowerCase();
        const search = searchTerm.toLowerCase().replace(/\D/g, '');
        const textSearch = searchTerm.toLowerCase();

        const matchesSearch = 
          client.includes(textSearch) || 
          id.includes(textSearch) || 
          email.includes(textSearch) || 
          (search && cpf.includes(search));

        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [orders, startDate, endDate, statusFilter, searchTerm]);

  // Métricas Calculadas sobre os Pedidos Filtrados por Período
  const metrics = useMemo(() => {
    // Calcula métricas sobre os pedidos dentro do período selecionado
    const ordersInPeriod = orders.filter(order => {
      if (!startDate && !endDate) return true;
      if (!order.createdAt) return false;
      const orderDateStr = new Date(order.createdAt).toISOString().split('T')[0];
      if (startDate && endDate) {
        return orderDateStr >= startDate && orderDateStr <= endDate;
      }
      if (startDate) return orderDateStr >= startDate;
      if (endDate) return orderDateStr <= endDate;
      return true;
    });

    const total = ordersInPeriod.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
    const count = ordersInPeriod.length;
    const exchanges = ordersInPeriod.filter(o => o.status === 'Troca Solicitada' || o.status === 'Devolvido').length;
    const exchangeRate = count > 0 ? ((exchanges / count) * 100).toFixed(1) : '0.0';
    const averageTicket = count > 0 ? (total / count).toFixed(2) : '0.00';

    return { total, count, exchanges, exchangeRate, averageTicket, ordersInPeriodCount: count };
  }, [orders, startDate, endDate]);

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <header className={styles.header}>
        <div>
          <span className={styles.breadcrumb}>CMS / GESTÃO DE VENDAS & SUPORTE</span>
          <h1 className={styles.title}>PEDIDOS & LOGÍSTICA REVERSA</h1>
        </div>

        {/* BARRA DE CONTROLES DO TOPO (SELETOR DE PERÍODOS + SINCRONIZAÇÃO) */}
        <div className={styles.headerRightControls}>
          {/* SELETOR DE PERÍODO & DATAS */}
          <div className={styles.dateFilterBox}>
            <div className={styles.datePresetsRow}>
              <button 
                type="button" 
                className={`${styles.presetBtn} ${dateRangePreset === '1d' ? styles.activePreset : ''}`}
                onClick={() => handlePresetChange('1d')}
              >
                1 Dia
              </button>
              <button 
                type="button" 
                className={`${styles.presetBtn} ${dateRangePreset === '7d' ? styles.activePreset : ''}`}
                onClick={() => handlePresetChange('7d')}
              >
                7 Dias
              </button>
              <button 
                type="button" 
                className={`${styles.presetBtn} ${dateRangePreset === '30d' ? styles.activePreset : ''}`}
                onClick={() => handlePresetChange('30d')}
              >
                30 Dias
              </button>
              <button 
                type="button" 
                className={`${styles.presetBtn} ${dateRangePreset === 'all' ? styles.activePreset : ''}`}
                onClick={() => handlePresetChange('all')}
              >
                Todos
              </button>
            </div>

            <div className={styles.customDateInputs}>
              <div className={styles.dateInputGroup}>
                <Calendar size={12} className={styles.dateInputIcon} />
                <input 
                  type="date" 
                  value={startDate}
                  max={endDate || todayStr}
                  onChange={(e) => handleCustomDateChange('start', e.target.value)}
                  title="Data Inicial (não pode ser posterior à final)"
                  aria-label="Data Inicial"
                />
              </div>
              <span className={styles.dateSeparator}>até</span>
              <div className={styles.dateInputGroup}>
                <Calendar size={12} className={styles.dateInputIcon} />
                <input 
                  type="date" 
                  value={endDate}
                  min={startDate}
                  max={todayStr}
                  onChange={(e) => handleCustomDateChange('end', e.target.value)}
                  title="Data Final (máximo até hoje)"
                  aria-label="Data Final"
                />
              </div>
              {(startDate || endDate) && (
                <button 
                  type="button" 
                  onClick={() => handlePresetChange('all')} 
                  className={styles.clearDateBtn}
                  title="Limpar filtro de período"
                  aria-label="Limpar datas"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <button 
            onClick={fetchOrders} 
            disabled={refreshing} 
            className={styles.refreshBtn}
            title="Sincronizar Pedidos"
          >
            <RotateCw size={14} className={refreshing ? styles.spinning : ''} />
            <span>{refreshing ? 'Sincronizando...' : 'Sincronizar Pedidos'}</span>
          </button>
        </div>
      </header>

      {/* FEEDBACK VISUAL DO PERÍODO SELECIONADO */}
      {(startDate || endDate) && (
        <div className={styles.activePeriodBadge}>
          <Calendar size={13} className={styles.periodBadgeIcon} />
          <span>
            Exibindo dados de <strong>{startDate ? formatDateBR(startDate) : 'Início'}</strong> até <strong>{endDate ? formatDateBR(endDate) : 'Hoje'}</strong> • <strong>{metrics.ordersInPeriodCount}</strong> pedidos no período
          </span>
        </div>
      )}

      {/* CARDS DE KPIS */}
      <section className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <DollarSign size={16} className={styles.kpiIconGreen} />
            <span className={styles.kpiLabel}>FATURAMENTO TOTAL</span>
          </div>
          <strong className={styles.kpiValue}>R$ {metrics.total.toFixed(2)}</strong>
          <small className={styles.kpiSub}>Total no período selecionado</small>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <Package size={16} className={styles.kpiIconBlue} />
            <span className={styles.kpiLabel}>TOTAL DE PEDIDOS</span>
          </div>
          <strong className={styles.kpiValue}>{metrics.count}</strong>
          <small className={styles.kpiSub}>Transações no período</small>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <TrendingUp size={16} className={styles.kpiIconYellow} />
            <span className={styles.kpiLabel}>TICKET MÉDIO</span>
          </div>
          <strong className={styles.kpiValue}>R$ {metrics.averageTicket}</strong>
          <small className={styles.kpiSub}>Média por transação</small>
        </div>

        <div className={`${styles.kpiCard} ${Number(metrics.exchangeRate) > 5 ? styles.alertKpi : ''}`}>
          <div className={styles.kpiHeader}>
            <RefreshCw size={16} className={styles.kpiIconRed} />
            <span className={styles.kpiLabel}>TAXA DE TROCAS / DEVOLUÇÕES</span>
          </div>
          <strong className={styles.kpiValue}>{metrics.exchangeRate}%</strong>
          <small className={styles.kpiSub}>{metrics.exchanges} solicitações no período</small>
        </div>
      </section>

      {/* CONTROLE DE BUSCA E FILTROS DE STATUS */}
      <div className={styles.controlBar}>
        <div className={styles.searchBox}>
          <Search size={15} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Buscar por Nome do Cliente, CPF ou ID do Pedido..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className={styles.clearSearchBtn} aria-label="Limpar busca">
              <X size={14} />
            </button>
          )}
        </div>

        <div className={styles.statusFilters}>
          <button 
            className={`${styles.filterBtn} ${statusFilter === 'all' ? styles.activeFilter : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            TODOS ({filteredOrders.length})
          </button>
          {STATUS_OPTIONS.map(st => {
            const countForStatus = orders.filter(o => {
              if (startDate || endDate) {
                if (!o.createdAt) return false;
                const dStr = new Date(o.createdAt).toISOString().split('T')[0];
                if (startDate && endDate && (dStr < startDate || dStr > endDate)) return false;
                if (startDate && dStr < startDate) return false;
                if (endDate && dStr > endDate) return false;
              }
              return o.status === st.value;
            }).length;

            return (
              <button
                key={st.value}
                className={`${styles.filterBtn} ${statusFilter === st.value ? styles.activeFilter : ''}`}
                onClick={() => setStatusFilter(st.value)}
              >
                {st.label.toUpperCase()} ({countForStatus})
              </button>
            );
          })}
        </div>
      </div>

      {/* TABELA DE PEDIDOS */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>PEDIDO</th>
              <th>DATA</th>
              <th>CLIENTE & CONTATO</th>
              <th>ITENS & GRADE</th>
              <th>TOTAL</th>
              <th>PAGAMENTO</th>
              <th>STATUS DO PEDIDO</th>
              <th>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className={styles.centerText}>
                  <div className={styles.loadingWrapper}>
                    <RotateCw size={18} className={styles.spinning} />
                    <span>Buscando pedidos no Firestore...</span>
                  </div>
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="8" className={styles.centerText}>
                  <div className={styles.emptyWrapper}>
                    <AlertCircle size={18} />
                    <span>Nenhum pedido encontrado para o período e filtros selecionados.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredOrders.map(order => {
                const statusColor = STATUS_OPTIONS.find(s => s.value === order.status)?.color || '#ffffff';
                const formattedCpf = order.clientCpf ? maskCPF(order.clientCpf) : 'Não informado';

                return (
                  <tr key={order.id} className={styles.tableRow}>
                    <td>
                      <div className={styles.orderCodeWrapper}>
                        <strong className={styles.orderCode}>#{order.id.slice(0, 8).toUpperCase()}</strong>
                        {order.hasOpenTicket && (
                          <span className={styles.openTicketPulseTag} title="Cliente abriu chamado de suporte para este pedido">
                            <Headphones size={10} />
                            <span>CHAMADO ABERTO</span>
                          </span>
                        )}
                      </div>
                      <span className={styles.trackingBadge}>
                        <Truck size={10} />
                        <span>{order.trackingCode || 'Sem rastreio'}</span>
                      </span>
                    </td>
                    <td>
                      <span className={styles.dateText}>
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('pt-BR') : 'Hoje'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.clientInfo}>
                        <strong>{order.clientName || 'Cliente'}</strong>
                        <small>CPF: {formattedCpf}</small>
                        <small className={styles.clientEmailText}>{order.clientEmail}</small>
                      </div>
                    </td>
                    <td>
                      <div className={styles.itemsSummary}>
                        {order.items?.map((it, idx) => (
                          <span key={idx} className={styles.itemTag}>
                            {it.quantity}x {it.name} <small>({it.size})</small>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <strong className={styles.totalValue}>R$ {Number(order.total || 0).toFixed(2)}</strong>
                    </td>
                    <td>
                      <span className={styles.paymentMethod}>
                        {(order.paymentMethod || 'PIX').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div className={styles.statusSelectWrapper} style={{ borderColor: statusColor }}>
                        <span className={styles.statusDotSmall} style={{ backgroundColor: statusColor }}></span>
                        <select
                          value={order.status || 'Aprovado'}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className={styles.statusSelect}
                        >
                          {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td>
                      <button 
                        onClick={() => setSelectedOrder(order)} 
                        className={styles.actionBtn}
                        title="Ver Detalhes do Pedido e CRM"
                      >
                        <span>Ver / Suporte</span>
                        <ArrowRight size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* DRAWER LATERAL: CRM 360º & GERENCIADOR DE TROCAS */}
      {selectedOrder && (
        <div className={styles.modalBackdrop} onClick={() => setSelectedOrder(null)}>
          <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <span className={styles.drawerTag}>CRM 360º & SUPORTE AO CLIENTE</span>
                <h2>PEDIDO #{selectedOrder.id.slice(0, 8).toUpperCase()}</h2>
              </div>
              <button onClick={() => setSelectedOrder(null)} className={styles.closeBtn} aria-label="Fechar">
                <X size={18} />
              </button>
            </div>

            <div className={styles.drawerContent}>
              {/* ALERTA DE CHAMADO DE SUPORTE ABERTO */}
              {selectedOrder.hasOpenTicket && (
                <div className={styles.openTicketAlertBox}>
                  <div className={styles.openTicketAlertHeader}>
                    <Headphones size={18} color="#f87171" />
                    <div>
                      <strong>🚨 CHAMADO DE SUPORTE ABERTO PELO CLIENTE</strong>
                      <p>O cliente registrou uma solicitação no SAC para este pedido.</p>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                      setSelectedOrder(null);
                      navigate('/cms/suporte');
                    }} 
                    className={styles.goToSupportBtn}
                  >
                    <span>Abrir Gestão de SAC</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              )}

              {/* DADOS DO CLIENTE */}
              <div className={styles.sectionBlock}>
                <div className={styles.sectionHeaderLine}>
                  <User size={15} className={styles.sectionIcon} />
                  <h3>DADOS DO CLIENTE</h3>
                </div>
                <div className={styles.metaGrid}>
                  <div><small>NOME COMPLETO:</small> <strong>{selectedOrder.clientName}</strong></div>
                  <div><small>DOCUMENTO (CPF):</small> <strong>{selectedOrder.clientCpf ? maskCPF(selectedOrder.clientCpf) : 'Não informado'}</strong></div>
                  <div><small>E-MAIL:</small> <span>{selectedOrder.clientEmail}</span></div>
                  <div><small>WHATSAPP / TELEFONE:</small> <span>{selectedOrder.clientPhone || 'Não informado'}</span></div>
                </div>
              </div>

              {/* ENDEREÇO DE ENTREGA */}
              <div className={styles.sectionBlock}>
                <div className={styles.sectionHeaderLine}>
                  <MapPin size={15} className={styles.sectionIcon} />
                  <h3>ENDEREÇO DE ENTREGA</h3>
                </div>
                <p className={styles.addressText}>
                  {selectedOrder.shippingAddress?.street}, {selectedOrder.shippingAddress?.number} {selectedOrder.shippingAddress?.complement ? `• ${selectedOrder.shippingAddress.complement}` : ''}<br/>
                  {selectedOrder.shippingAddress?.neighborhood ? `${selectedOrder.shippingAddress.neighborhood} — ` : ''}{selectedOrder.shippingAddress?.city}/{selectedOrder.shippingAddress?.state}<br/>
                  CEP: {selectedOrder.shippingAddress?.cep}
                </p>
              </div>

              {/* ITENS COMPRADOS */}
              <div className={styles.sectionBlock}>
                <div className={styles.sectionHeaderLine}>
                  <FileText size={15} className={styles.sectionIcon} />
                  <h3>PEÇAS DO PEDIDO</h3>
                </div>
                <div className={styles.itemsList}>
                  {selectedOrder.items?.map((it, idx) => (
                    <div key={idx} className={styles.itemRow}>
                      <img src={it.image} alt={it.name} className={styles.itemThumb} />
                      <div className={styles.itemDetails}>
                        <strong>{it.name}</strong>
                        <span>Tamanho: <strong>{it.size}</strong> {it.fit ? `• ${it.fit}` : ''}</span>
                        <small>Qtd: {it.quantity} • R$ {Number(it.price || 0).toFixed(2)} un.</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CONTROLE LOGÍSTICO & RASTREIO SOB DEMANDA */}
              <div className={styles.sectionBlock}>
                <div className={styles.sectionHeaderLine}>
                  <Truck size={15} className={styles.sectionIcon} />
                  <h3>CONTROLE LOGÍSTICO & RASTREIO SOB DEMANDA</h3>
                </div>
                <form onSubmit={handleSaveLogistics} className={styles.logisticsForm}>
                  <div className={styles.inputGroup}>
                    <label>CÓDIGO DE RASTREIO (CORREIOS / TRANSPORTADORA) *</label>
                    <input 
                      type="text" 
                      placeholder="Ex: BR920851843PR"
                      value={drawerTracking}
                      onChange={(e) => setDrawerTracking(e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>CHAVE / URL DA NOTA FISCAL (NF-E)</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Chave de 44 dígitos ou URL do documento"
                      value={drawerNfeKey}
                      onChange={(e) => setDrawerNfeKey(e.target.value)}
                    />
                  </div>
                  <button type="submit" disabled={savingLogistics} className={styles.saveLogisticsBtn}>
                    <Save size={13} />
                    <span>{savingLogistics ? 'SALVANDO...' : 'SALVAR RASTREIO & NF-E'}</span>
                  </button>
                </form>
              </div>

              {/* AUTOMAÇÃO DE LOGÍSTICA REVERSA / TROCAS */}
              <div className={`${styles.sectionBlock} ${styles.exchangeBox}`}>
                <div className={styles.sectionHeaderLine}>
                  <Truck size={15} className={styles.exchangeIcon} />
                  <h3>LOGÍSTICA REVERSA (TROCA OU DEVOLUÇÃO)</h3>
                </div>
                <p className={styles.exchangeDescription}>
                  Gere o código de postagem reversa imediatamente para que o cliente realize a postagem da peça sem custos.
                </p>

                {selectedOrder.reverseLogistics ? (
                  <div className={styles.reverseActiveBox}>
                    <div className={styles.reverseHeader}>
                      <span className={styles.reverseCodeLabel}>CÓDIGO DE POSTAGEM REVERSA:</span>
                      <strong className={styles.reverseCodeValue}>{selectedOrder.reverseLogistics.code}</strong>
                    </div>
                    <small className={styles.reverseReason}>
                      Motivo: <strong>{selectedOrder.reverseLogistics.reason}</strong>
                    </small>
                    <small className={styles.reverseDate}>
                      Gerado em: {new Date(selectedOrder.reverseLogistics.generatedAt).toLocaleString('pt-BR')}
                    </small>
                  </div>
                ) : (
                  <div className={styles.exchangeForm}>
                    <label>MOTIVO DA SOLICITAÇÃO:</label>
                    <select 
                      value={exchangeReason} 
                      onChange={(e) => setExchangeReason(e.target.value)}
                      className={styles.selectInput}
                    >
                      <option value="Tamanho Boxy menor que o esperado">Tamanho Boxy menor que o esperado</option>
                      <option value="Tamanho Oversized muito amplo">Tamanho Oversized muito amplo</option>
                      <option value="Trocar por outra estampa / modelo">Trocar por outra estampa / modelo</option>
                      <option value="Defeito de fábrica / costura">Defeito de fábrica / costura</option>
                      <option value="Direito de arrependimento (7 dias)">Direito de arrependimento (7 dias)</option>
                    </select>

                    <button 
                      onClick={handleGenerateReverseLabel}
                      disabled={generatingLabel}
                      className={styles.generateLabelBtn}
                    >
                      {generatingLabel ? (
                        <>
                          <RotateCw size={14} className={styles.spinning} />
                          <span>EMITINDO ETIQUETA...</span>
                        </>
                      ) : (
                        <>
                          <Truck size={15} />
                          <span>EMITIR ETIQUETA DE LOGÍSTICA REVERSA</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CmsPedidos;
