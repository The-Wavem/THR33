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
  Save,
  ExternalLink,
  Link2
} from 'lucide-react';
import { db } from '../../services/firebaseConfig';
import { maskCPF } from '../../utils/validators';
import { 
  ORDER_STATUSES, 
  normalizeOrderStatus, 
  getOrderStatusMeta 
} from '../../services/orderStateMachine';
import styles from './CmsPedidos.module.css';

const STATUS_OPTIONS = [
  { value: ORDER_STATUSES.AGUARDANDO_PAGAMENTO, label: 'Aguardando Pagamento', color: '#facc15' },
  { value: ORDER_STATUSES.PAGAMENTO_APROVADO, label: 'Pagamento Aprovado', color: '#4ade80' },
  { value: ORDER_STATUSES.EM_PRODUCAO, label: 'Em Produção', color: '#60a5fa' },
  { value: ORDER_STATUSES.SAIU_PARA_ENTREGA, label: 'Saiu para Entrega', color: '#c084fc' },
  { value: ORDER_STATUSES.ENTREGUE, label: 'Entregue', color: '#4ade80' },
  { value: ORDER_STATUSES.CANCELADO, label: 'Cancelado', color: '#f87171' }
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
  const [drawerNfeUrl, setDrawerNfeUrl] = useState('');
  const [savingLogistics, setSavingLogistics] = useState(false);

  // Modal de Despacho Obrigatório (Saiu para Entrega)
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [dispatchTargetOrder, setDispatchTargetOrder] = useState(null);
  const [dispatchForm, setDispatchForm] = useState({
    trackingCode: '',
    carrier: 'Correios SEDEX',
    trackingUrl: ''
  });
  const [savingDispatch, setSavingDispatch] = useState(false);
  const [dispatchError, setDispatchError] = useState('');

  // Modal de Anexar NF-e (PDF)
  const [nfeModalOpen, setNfeModalOpen] = useState(false);
  const [nfeTargetOrder, setNfeTargetOrder] = useState(null);
  const [nfeForm, setNfeForm] = useState({
    nfeUrl: '',
    nfeKey: ''
  });
  const [savingNfe, setSavingNfe] = useState(false);
  const [nfeError, setNfeError] = useState('');
  const [nfeSuccess, setNfeSuccess] = useState('');

  useEffect(() => {
    if (selectedOrder) {
      setDrawerTracking(selectedOrder.trackingCode && !selectedOrder.trackingCode.includes('Processando') ? selectedOrder.trackingCode : '');
      setDrawerNfeKey(selectedOrder.nfeKey || '');
      setDrawerNfeUrl(selectedOrder.nfeUrl || '');
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

  // Transições Canônicas da Máquina de Estados
  const handleMoveToProduction = async (order) => {
    if (!order) return;
    try {
      const orderRef = doc(db, 'orders', order.id);
      const updates = {
        status: ORDER_STATUSES.EM_PRODUCAO,
        inProductionAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await updateDoc(orderRef, updates);
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, ...updates } : o));
      if (selectedOrder?.id === order.id) {
        setSelectedOrder(prev => ({ ...prev, ...updates }));
      }
    } catch (err) {
      console.error("Erro ao mover pedido para produção:", err);
      alert("Erro ao mover pedido para produção.");
    }
  };

  const handleOpenDispatchModal = (order) => {
    if (!order) return;
    setDispatchTargetOrder(order);
    const existingCode = order.trackingCode && !order.trackingCode.toLowerCase().includes('processando') && !order.trackingCode.toLowerCase().includes('aguardando') ? order.trackingCode : '';
    const carrier = order.carrier || 'Correios SEDEX';
    setDispatchForm({
      trackingCode: existingCode,
      carrier: carrier,
      trackingUrl: order.trackingUrl || (existingCode && carrier.includes('Correios') ? `https://rastreamento.correios.com.br/app/index.php?codigo=${existingCode}` : '')
    });
    setDispatchError('');
    setDispatchModalOpen(true);
  };

  const handleConfirmDispatch = async (e) => {
    e.preventDefault();
    if (!dispatchTargetOrder) return;
    const code = dispatchForm.trackingCode.trim().toUpperCase();
    if (!code) {
      setDispatchError("O Código de Rastreamento é obrigatório para despachar a peça!");
      return;
    }
    setSavingDispatch(true);
    setDispatchError('');
    try {
      const trackingUrl = dispatchForm.trackingUrl.trim() || 
        (dispatchForm.carrier.includes('Correios') 
          ? `https://rastreamento.correios.com.br/app/index.php?codigo=${code}` 
          : `https://www.google.com/search?q=${code}`);

      const orderRef = doc(db, 'orders', dispatchTargetOrder.id);
      const updates = {
        status: ORDER_STATUSES.SAIU_PARA_ENTREGA,
        trackingCode: code,
        carrier: dispatchForm.carrier,
        trackingUrl: trackingUrl,
        shippedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await updateDoc(orderRef, updates);
      setOrders(prev => prev.map(o => o.id === dispatchTargetOrder.id ? { ...o, ...updates } : o));
      if (selectedOrder?.id === dispatchTargetOrder.id) {
        setSelectedOrder(prev => ({ ...prev, ...updates }));
      }
      setDispatchModalOpen(false);
      setDispatchTargetOrder(null);
    } catch (err) {
      console.error("Erro ao despachar pedido:", err);
      setDispatchError("Falha ao salvar despacho no Firestore.");
    } finally {
      setSavingDispatch(false);
    }
  };

  const handleMarkAsDelivered = async (order) => {
    if (!order) return;
    const confirmed = window.confirm(`Confirmar que o pedido #${order.id.slice(0, 8).toUpperCase()} foi entregue ao cliente?`);
    if (!confirmed) return;
    try {
      const orderRef = doc(db, 'orders', order.id);
      const updates = {
        status: ORDER_STATUSES.ENTREGUE,
        deliveredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await updateDoc(orderRef, updates);
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, ...updates } : o));
      if (selectedOrder?.id === order.id) {
        setSelectedOrder(prev => ({ ...prev, ...updates }));
      }
    } catch (err) {
      console.error("Erro ao marcar pedido como entregue:", err);
      alert("Erro ao marcar pedido como entregue.");
    }
  };

  // 2. Atualizar Status do Pedido no Firestore
  const handleStatusChange = async (orderId, newStatus) => {
    const currentOrder = orders.find(o => o.id === orderId);
    if (!currentOrder) return;

    if (newStatus === ORDER_STATUSES.SAIU_PARA_ENTREGA) {
      handleOpenDispatchModal(currentOrder);
      return;
    }

    if (newStatus === ORDER_STATUSES.EM_PRODUCAO) {
      handleMoveToProduction(currentOrder);
      return;
    }

    if (newStatus === ORDER_STATUSES.ENTREGUE) {
      handleMarkAsDelivered(currentOrder);
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

  // Handlers para Anexar NF-e (PDF)
  const handleOpenNfeModal = (order) => {
    if (!order) return;
    setNfeTargetOrder(order);
    setNfeForm({
      nfeUrl: order.nfeUrl || '',
      nfeKey: order.nfeKey || ''
    });
    setNfeError('');
    setNfeSuccess('');
    setNfeModalOpen(true);
  };

  const handleSaveNfe = async (e) => {
    e.preventDefault();
    if (!nfeTargetOrder) return;
    const url = nfeForm.nfeUrl.trim();
    if (!url) {
      setNfeError("Insira a URL / link direto do arquivo PDF da NF-e.");
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      setNfeError("O link da NF-e deve começar com http:// ou https://");
      return;
    }

    setSavingNfe(true);
    setNfeError('');
    setNfeSuccess('');

    try {
      const orderRef = doc(db, 'orders', nfeTargetOrder.id);
      const updates = {
        nfeUrl: url,
        nfeKey: nfeForm.nfeKey.trim() || nfeTargetOrder.nfeKey || null,
        nfeIssued: true,
        nfeIssuedAt: nfeTargetOrder.nfeIssuedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await updateDoc(orderRef, updates);

      // Atualiza lista local
      setOrders(prev => prev.map(o => o.id === nfeTargetOrder.id ? { ...o, ...updates } : o));
      if (selectedOrder?.id === nfeTargetOrder.id) {
        setSelectedOrder(prev => ({ ...prev, ...updates }));
      }

      setNfeSuccess("Nota fiscal (PDF) anexada com sucesso!");
      setTimeout(() => {
        setNfeModalOpen(false);
        setNfeTargetOrder(null);
      }, 1000);
    } catch (err) {
      console.error("Erro ao salvar NF-e no pedido:", err);
      setNfeError("Falha ao salvar a NF-e no Firestore.");
    } finally {
      setSavingNfe(false);
    }
  };

  const handleRemoveNfe = async () => {
    if (!nfeTargetOrder) return;
    const confirm = window.confirm(`Deseja desanexar a NF-e do pedido #${nfeTargetOrder.id.slice(0, 8).toUpperCase()}?`);
    if (!confirm) return;

    setSavingNfe(true);
    setNfeError('');
    try {
      const orderRef = doc(db, 'orders', nfeTargetOrder.id);
      const updates = {
        nfeUrl: null,
        nfeIssued: false,
        updatedAt: new Date().toISOString()
      };
      await updateDoc(orderRef, updates);
      setOrders(prev => prev.map(o => o.id === nfeTargetOrder.id ? { ...o, ...updates } : o));
      if (selectedOrder?.id === nfeTargetOrder.id) {
        setSelectedOrder(prev => ({ ...prev, ...updates }));
      }
      setNfeModalOpen(false);
      setNfeTargetOrder(null);
    } catch (err) {
      console.error("Erro ao remover anexo de NF-e:", err);
      setNfeError("Falha ao remover o anexo de NF-e.");
    } finally {
      setSavingNfe(false);
    }
  };

  // Salvar Rastreio e NF-e diretamente pelo Drawer de CRM
  const handleSaveLogistics = async (e) => {
    e.preventDefault();
    if (!selectedOrder?.id) return;
    setSavingLogistics(true);

    try {
      const orderRef = doc(db, 'orders', selectedOrder.id);
      const updates = {
        trackingCode: drawerTracking.trim() ? drawerTracking.trim().toUpperCase() : (selectedOrder.trackingCode || null),
        nfeKey: drawerNfeKey.trim() || selectedOrder.nfeKey || null,
        nfeUrl: drawerNfeUrl.trim() || null,
        updatedAt: new Date().toISOString()
      };

      if (drawerNfeKey.trim() || drawerNfeUrl.trim()) {
        updates.nfeIssued = true;
        updates.nfeIssuedAt = selectedOrder.nfeIssuedAt || new Date().toISOString();
      }

      await setDoc(orderRef, updates, { merge: true });

      // Atualiza estado local
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, ...updates } : o));
      setSelectedOrder(prev => ({ ...prev, ...updates }));

      alert("Dados logísticos e Nota Fiscal (NF-e) atualizados com sucesso no Firestore.");
    } catch (err) {
      console.error("Erro ao salvar dados fiscais:", err);
      alert("Falha ao salvar dados no pedido.");
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
      if (statusFilter !== 'all') {
        const norm = normalizeOrderStatus(order.status);
        if (norm !== statusFilter) {
          return false;
        }
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

  // Exportação do Lote Semanal para a Fábrica (CSV)
  const handleExportWeeklyBatch = () => {
    // Filtra pedidos em fila para corte e produção
    const batchOrders = orders.filter(o => {
      const norm = normalizeOrderStatus(o.status);
      return norm === ORDER_STATUSES.PAGAMENTO_APROVADO || norm === ORDER_STATUSES.EM_PRODUCAO;
    });

    if (batchOrders.length === 0) {
      alert("Nenhum pedido com status 'Pagamento Aprovado' ou 'Em Produção' para exportação no momento.");
      return;
    }

    const csvRows = [
      ['ID PEDIDO', 'DATA', 'CLIENTE', 'TELEFONE', 'ENDERECO COMPLETO', 'ITEM', 'MODELAGEM', 'TAMANHO', 'QTD', 'VALOR UNITARIO']
    ];

    batchOrders.forEach(order => {
      const addr = order.shippingAddress 
        ? `"${order.shippingAddress.street || ''}, ${order.shippingAddress.number || ''} - ${order.shippingAddress.neighborhood || ''}, ${order.shippingAddress.city || ''}/${order.shippingAddress.state || ''} CEP: ${order.shippingAddress.cep || ''}"`
        : 'Endereço não informado';

      order.items?.forEach(item => {
        csvRows.push([
          order.id,
          new Date(order.createdAt).toLocaleDateString('pt-BR'),
          `"${order.clientName || order.customerName || 'Cliente'}"`,
          order.clientPhone || order.customerPhone || '',
          addr,
          `"${item.name}"`,
          item.fit || 'Padrão',
          item.size || 'M',
          item.quantity || 1,
          Number(item.price || 0).toFixed(2)
        ]);
      });
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(";")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `LOTE_FABRICA_THR33_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <header className={styles.header}>
        <div>
          <span className={styles.breadcrumb}>CMS / GESTÃO DE VENDAS & SUPORTE</span>
          <h1 className={styles.title}>PEDIDOS & LOGÍSTICA REVERSA</h1>
        </div>

        {/* BARRA DE CONTROLES DO TOPO (SELETOR DE PERÍODOS + SINCRONIZAÇÃO + EXPORTAÇÃO) */}
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
            type="button"
            onClick={handleExportWeeklyBatch}
            className={styles.exportBatchBtn}
            title="Exportar Lote Semanal para a Fábrica"
          >
            EXPORTAR LOTE SEMANAL (CSV)
          </button>

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
              return normalizeOrderStatus(o.status) === st.value;
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
                const normStatus = normalizeOrderStatus(order.status);
                const statusMeta = getOrderStatusMeta(normStatus);
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
                      <div className={styles.orderBadgesStack}>
                        <span className={styles.trackingBadge}>
                          <Truck size={10} />
                          <span>{order.trackingCode || 'Sem rastreio'}</span>
                        </span>

                        {order.nfeUrl ? (
                          <a 
                            href={order.nfeUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className={styles.nfeTableBadge}
                            title="Abrir DANFE (PDF) em nova aba"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FileText size={10} />
                            <span>DANFE (PDF)</span>
                            <ExternalLink size={9} />
                          </a>
                        ) : (
                          <button 
                            type="button" 
                            onClick={() => handleOpenNfeModal(order)} 
                            className={styles.nfeAttachQuickBtn}
                            title="Anexar link do PDF da NF-e"
                          >
                            <FileText size={10} />
                            <span>+ Anexar NF-e</span>
                          </button>
                        )}
                      </div>
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
                      <div className={styles.statusSelectWrapper} style={{ borderColor: statusMeta.color }}>
                        <span className={styles.statusDotSmall} style={{ backgroundColor: statusMeta.color }}></span>
                        <select
                          value={normStatus}
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

                      {/* AÇÕES RÁPIDAS DA MÁQUINA DE ESTADOS */}
                      {normStatus === ORDER_STATUSES.PAGAMENTO_APROVADO && (
                        <button 
                          type="button" 
                          onClick={() => handleMoveToProduction(order)} 
                          className={`${styles.quickActionBtn} ${styles.quickActionBtnBlue}`}
                          title="Avançar para corte e costura"
                        >
                          <Package size={11} />
                          <span>Mover p/ Produção</span>
                        </button>
                      )}

                      {normStatus === ORDER_STATUSES.EM_PRODUCAO && (
                        <button 
                          type="button" 
                          onClick={() => handleOpenDispatchModal(order)} 
                          className={`${styles.quickActionBtn} ${styles.quickActionBtnPurple}`}
                          title="Despachar peça e anexar rastreamento real"
                        >
                          <Truck size={11} />
                          <span>Despachar Peça</span>
                        </button>
                      )}

                      {normStatus === ORDER_STATUSES.SAIU_PARA_ENTREGA && (
                        <button 
                          type="button" 
                          onClick={() => handleMarkAsDelivered(order)} 
                          className={`${styles.quickActionBtn} ${styles.quickActionBtnGreen}`}
                          title="Confirmar entrega ao cliente"
                        >
                          <CheckCircle2 size={11} />
                          <span>Marcar Entregue</span>
                        </button>
                      )}
                    </td>
                    <td>
                      <div className={styles.tableActionsCol}>
                        <button 
                          onClick={() => setSelectedOrder(order)} 
                          className={styles.actionBtn}
                          title="Ver Detalhes do Pedido e CRM"
                        >
                          <span>Ver / Suporte</span>
                          <ArrowRight size={12} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenNfeModal(order)}
                          className={`${styles.nfeActionRowBtn} ${order.nfeUrl ? styles.nfeActionRowBtnActive : ''}`}
                          title={order.nfeUrl ? "Editar ou visualizar link do PDF da NF-e" : "Anexar link do PDF da NF-e"}
                        >
                          <FileText size={11} />
                          <span>{order.nfeUrl ? 'Gerenciar NF-e' : 'Anexar NF-e'}</span>
                        </button>
                      </div>
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
                      <strong>CHAMADO DE SUPORTE ABERTO PELO CLIENTE</strong>
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

              {/* STATUS ATUAL & MÁQUINA DE ESTADOS */}
              {(() => {
                const normStatus = normalizeOrderStatus(selectedOrder.status);
                const statusMeta = getOrderStatusMeta(normStatus);
                return (
                  <div className={styles.sectionBlock} style={{ borderColor: statusMeta.borderColor, backgroundColor: statusMeta.bgColor }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          STATUS DO PEDIDO
                        </span>
                        <strong style={{ fontSize: '1rem', color: statusMeta.color, display: 'block', marginTop: '0.2rem' }}>
                          {statusMeta.label.toUpperCase()}
                        </strong>
                      </div>

                      {normStatus === ORDER_STATUSES.PAGAMENTO_APROVADO && (
                        <button
                          type="button"
                          onClick={() => handleMoveToProduction(selectedOrder)}
                          className={`${styles.quickActionBtn} ${styles.quickActionBtnBlue}`}
                          style={{ margin: 0, padding: '0.5rem 0.85rem' }}
                        >
                          <Package size={13} />
                          <span>Mover para Produção</span>
                        </button>
                      )}

                      {normStatus === ORDER_STATUSES.EM_PRODUCAO && (
                        <button
                          type="button"
                          onClick={() => handleOpenDispatchModal(selectedOrder)}
                          className={`${styles.quickActionBtn} ${styles.quickActionBtnPurple}`}
                          style={{ margin: 0, padding: '0.5rem 0.85rem' }}
                        >
                          <Truck size={13} />
                          <span>Despachar / Saiu para Entrega</span>
                        </button>
                      )}

                      {normStatus === ORDER_STATUSES.SAIU_PARA_ENTREGA && (
                        <button
                          type="button"
                          onClick={() => handleMarkAsDelivered(selectedOrder)}
                          className={`${styles.quickActionBtn} ${styles.quickActionBtnGreen}`}
                          style={{ margin: 0, padding: '0.5rem 0.85rem' }}
                        >
                          <CheckCircle2 size={13} />
                          <span>Marcar como Entregue</span>
                        </button>
                      )}
                    </div>

                    {selectedOrder.trackingCode && (
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          Rastreio: <strong style={{ color: 'var(--text-primary)' }}>{selectedOrder.trackingCode}</strong> {selectedOrder.carrier ? `(${selectedOrder.carrier})` : ''}
                        </span>
                        {selectedOrder.trackingUrl && (
                          <a
                            href={selectedOrder.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '0.75rem', color: '#c084fc', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <span>Rastrear Objeto</span>
                            <ArrowRight size={11} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

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
                  <div className={styles.fieldGroup}>
                    <label>CÓDIGO DE RASTREAMENTO (OPCIONAL NO ATO DA NF-E)</label>
                    <input 
                      type="text" 
                      placeholder="Ex: BR920851843PR" 
                      value={drawerTracking} 
                      onChange={(e) => setDrawerTracking(e.target.value)}
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label>CHAVE DE ACESSO NF-E (44 DÍGITOS)</label>
                    <input 
                      type="text" 
                      placeholder="Ex: 4126 0900 0000 0001 0055 0010 0000 0001 2345 6789" 
                      maxLength={54}
                      value={drawerNfeKey} 
                      onChange={(e) => setDrawerNfeKey(e.target.value)}
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <label style={{ margin: 0 }}>LINK DO DANFE / PDF DA NOTA FISCAL</label>
                      {drawerNfeUrl && (
                        <a 
                          href={drawerNfeUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ fontSize: '0.68rem', color: '#a855f7', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                        >
                          <FileText size={10} />
                          <span>Abrir PDF Atual</span>
                          <ExternalLink size={9} />
                        </a>
                      )}
                    </div>
                    <input 
                      type="url" 
                      placeholder="https://.../danfe.pdf" 
                      value={drawerNfeUrl} 
                      onChange={(e) => setDrawerNfeUrl(e.target.value)}
                    />
                  </div>

                  <button type="submit" disabled={savingLogistics} className={styles.saveLogisticsBtn}>
                    <Save size={13} />
                    <span>{savingLogistics ? 'SALVANDO...' : 'SALVAR RASTREIO & DADOS FISCAIS'}</span>
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

      {/* MODAL DE DESPACHO OBRIGATÓRIO (SAIU PARA ENTREGA) */}
      {dispatchModalOpen && dispatchTargetOrder && (
        <div className={styles.dispatchModalBackdrop} onClick={() => setDispatchModalOpen(false)}>
          <div className={styles.dispatchModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.dispatchModalHeader}>
              <h3>DESPACHAR PEDIDO #{dispatchTargetOrder.id.slice(0, 8).toUpperCase()}</h3>
              <button 
                type="button" 
                onClick={() => setDispatchModalOpen(false)} 
                className={styles.closeBtn}
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmDispatch}>
              <div className={styles.dispatchModalBody}>
                <div className={styles.dispatchOrderSummary}>
                  <div>
                    <strong>{dispatchTargetOrder.clientName || 'Cliente THR33'}</strong>
                    <div><span>{dispatchTargetOrder.shippingAddress?.city || 'Curitiba'} / {dispatchTargetOrder.shippingAddress?.state || 'PR'}</span></div>
                  </div>
                  <div>
                    <strong>R$ {Number(dispatchTargetOrder.total || 0).toFixed(2)}</strong>
                    <div><span>{dispatchTargetOrder.itemsCount || dispatchTargetOrder.items?.length || 1} item(ns)</span></div>
                  </div>
                </div>

                {dispatchError && (
                  <div className={styles.dispatchErrorNotice}>
                    <AlertCircle size={14} />
                    <span>{dispatchError}</span>
                  </div>
                )}

                <div className={styles.fieldGroup}>
                  <label>TRANSPORTADORA / MODALIDADE *</label>
                  <select
                    value={dispatchForm.carrier}
                    onChange={(e) => {
                      const newCarrier = e.target.value;
                      const code = dispatchForm.trackingCode.trim().toUpperCase();
                      setDispatchForm(prev => ({
                        ...prev,
                        carrier: newCarrier,
                        trackingUrl: code && newCarrier.includes('Correios') 
                          ? `https://rastreamento.correios.com.br/app/index.php?codigo=${code}`
                          : prev.trackingUrl
                      }));
                    }}
                    style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.75rem', fontSize: '0.8rem' }}
                  >
                    <option value="Correios SEDEX">Correios SEDEX</option>
                    <option value="Correios PAC">Correios PAC</option>
                    <option value="Loggi Express">Loggi Express</option>
                    <option value="Jadlog .Package">Jadlog .Package</option>
                    <option value="Total Express">Total Express</option>
                    <option value="Motoboy Curitiba / Entrega Expressa">Motoboy Curitiba / Entrega Expressa</option>
                  </select>
                </div>

                <div className={styles.fieldGroup}>
                  <label>CÓDIGO DE RASTREAMENTO REAL (OBRIGATÓRIO) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: BR920851843PR ou LOG12345678"
                    value={dispatchForm.trackingCode}
                    onChange={(e) => {
                      const code = e.target.value.toUpperCase();
                      setDispatchForm(prev => ({
                        ...prev,
                        trackingCode: code,
                        trackingUrl: prev.carrier.includes('Correios') && code
                          ? `https://rastreamento.correios.com.br/app/index.php?codigo=${code}`
                          : prev.trackingUrl
                      }));
                      if (dispatchError) setDispatchError('');
                    }}
                    autoFocus
                  />
                  <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    O front-end não gera códigos fictícios. Insira o código emitido pelo sistema logístico.
                  </small>
                </div>

                <div className={styles.fieldGroup}>
                  <label>LINK DIRETO DE RASTREAMENTO</label>
                  <input
                    type="url"
                    placeholder="https://rastreamento.correios.com.br/..."
                    value={dispatchForm.trackingUrl}
                    onChange={(e) => setDispatchForm(prev => ({ ...prev, trackingUrl: e.target.value }))}
                  />
                </div>
              </div>

              <div className={styles.dispatchModalFooter}>
                <button
                  type="button"
                  onClick={() => setDispatchModalOpen(false)}
                  className={styles.cancelModalBtn}
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  disabled={savingDispatch || !dispatchForm.trackingCode.trim()}
                  className={styles.confirmDispatchBtn}
                >
                  <Truck size={14} />
                  <span>{savingDispatch ? 'DESPACHANDO...' : 'CONFIRMAR DESPACHO'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DEDICADO: ANEXAR NF-E (LINK PDF) */}
      {nfeModalOpen && nfeTargetOrder && (
        <div className={styles.dispatchModalBackdrop} onClick={() => setNfeModalOpen(false)}>
          <div className={styles.dispatchModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.dispatchModalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <FileText size={18} color="#a855f7" />
                <h3>ANEXAR NF-E (PDF) • #{nfeTargetOrder.id.slice(0, 8).toUpperCase()}</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setNfeModalOpen(false)} 
                className={styles.closeBtn}
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveNfe} className={styles.dispatchModalBody}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Cole o link direto do arquivo PDF da Nota Fiscal (DANFE). O documento ficará disponível para download imediato na tela de pedidos do cliente.
              </p>

              <div className={styles.dispatchOrderSummary}>
                <div>
                  <strong>{nfeTargetOrder.clientName || 'Cliente'}</strong>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Total: R$ {Number(nfeTargetOrder.total || 0).toFixed(2)} • {nfeTargetOrder.items?.length || 0} item(ns)
                  </span>
                </div>
                <span className={styles.statusDotSmall} style={{ backgroundColor: getOrderStatusMeta(normalizeOrderStatus(nfeTargetOrder.status)).color }} />
              </div>

              {nfeError && (
                <div className={styles.dispatchErrorNotice}>
                  <AlertCircle size={14} />
                  <span>{nfeError}</span>
                </div>
              )}

              {nfeSuccess && (
                <div style={{ backgroundColor: 'rgba(74, 222, 128, 0.12)', border: '1px solid rgba(74, 222, 128, 0.4)', color: '#4ade80', padding: '0.65rem 0.85rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={14} />
                  <span>{nfeSuccess}</span>
                </div>
              )}

              <div className={styles.fieldGroup}>
                <label>LINK DIRETO DO PDF DA NF-E (DANFE) *</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="url" 
                    placeholder="https://.../danfe-pedido.pdf" 
                    value={nfeForm.nfeUrl} 
                    onChange={(e) => {
                      setNfeForm(prev => ({ ...prev, nfeUrl: e.target.value }));
                      if (nfeError) setNfeError('');
                    }}
                    style={{ flex: 1 }}
                    required
                    autoFocus
                  />
                  {nfeForm.nfeUrl.trim() && (
                    <a 
                      href={nfeForm.nfeUrl.trim()} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={styles.refreshBtn}
                      style={{ padding: '0 0.85rem', height: 'auto', textDecoration: 'none' }}
                      title="Testar abertura do link em nova aba"
                    >
                      <ExternalLink size={13} />
                      <span>Testar PDF</span>
                    </a>
                  )}
                </div>
                <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Aceita links diretos do Google Drive, AWS S3, Cloud Storage, Bling, Tiny ou ERP emissor.
                </small>
              </div>

              <div className={styles.fieldGroup}>
                <label>CHAVE DE ACESSO NF-E (44 DÍGITOS - OPCIONAL)</label>
                <input 
                  type="text" 
                  placeholder="Ex: 4126 0900 0000 0001 0055 0010 0000 0001 2345 6789" 
                  maxLength={54}
                  value={nfeForm.nfeKey} 
                  onChange={(e) => setNfeForm(prev => ({ ...prev, nfeKey: e.target.value }))}
                />
              </div>

              <div className={styles.dispatchModalFooter} style={{ padding: 0, border: 'none', background: 'transparent' }}>
                {nfeTargetOrder.nfeUrl && (
                  <button 
                    type="button" 
                    onClick={handleRemoveNfe} 
                    disabled={savingNfe}
                    style={{ marginRight: 'auto', background: 'transparent', border: '1px solid rgba(248, 113, 113, 0.4)', color: '#f87171', padding: '0.65rem 1rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Desanexar NF-e
                  </button>
                )}

                <button 
                  type="button" 
                  onClick={() => setNfeModalOpen(false)} 
                  className={styles.cancelModalBtn}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={savingNfe} 
                  className={styles.confirmDispatchBtn}
                  style={{ backgroundColor: '#a855f7', color: '#ffffff' }}
                >
                  <Save size={13} />
                  <span>{savingNfe ? 'Salvando...' : 'Salvar e Anexar NF-e'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CmsPedidos;
