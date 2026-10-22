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
  Link2,
  Copy,
  Send,
  Printer,
  Download,
  CheckSquare,
  Square,
  FileSpreadsheet,
  Layers,
  Scissors,
  Eye,
  EyeOff,
  Tag
} from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../services/firebaseConfig';
import { maskCPF } from '../../utils/validators';
import { formatFitBadgeLabel } from '../../utils/fitUtils';
import { 
  ORDER_STATUSES, 
  normalizeOrderStatus, 
  getOrderStatusMeta 
} from '../../services/orderStateMachine';
import styles from './CmsPedidos.module.css';

// Helper robusto para identificação e normalização de cor de itens de vestuário
export const extractItemColor = (item) => {
  if (!item) return 'Preto';

  let raw = '';
  if (typeof item.color === 'object' && item.color !== null) {
    raw = item.color.name || item.color.label || item.color.id || '';
  } else if (typeof item.color === 'string') {
    raw = item.color;
  } else if (item.selectedColor) {
    raw = typeof item.selectedColor === 'object' ? (item.selectedColor.name || item.selectedColor.id) : item.selectedColor;
  } else if (item.colorName) {
    raw = item.colorName;
  }

  const clean = String(raw || '').trim();
  const isPlaceholder = !clean || ['padrao', 'padrão', 'default', 'standard', 'unica', 'única'].includes(clean.toLowerCase());

  if (!isPlaceholder) {
    const lower = clean.toLowerCase();
    if (lower === 'preto' || lower === 'black') return 'Preto';
    if (lower === 'branco' || lower === 'white') return 'Branco';
    if (lower === 'off-white' || lower === 'offwhite' || lower === 'off white') return 'Off-White';
    if (lower === 'grafite' || lower === 'graphite') return 'Grafite';
    if (lower === 'cinza mescla' || lower === 'cinza' || lower === 'mescla') return 'Cinza Mescla';
    if (lower === 'marrom terra' || lower === 'marrom') return 'Marrom Terra';
    if (lower === 'bege areia' || lower === 'bege') return 'Bege Areia';
    if (lower === 'azul noite' || lower === 'azul') return 'Azul Noite';
    if (lower === 'verde militar' || lower === 'verde') return 'Verde Militar';
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  // Tenta extrair a cor declarada no título ou nome do produto
  const title = String(item.name || item.title || '').toLowerCase();
  if (title.includes('off-white') || title.includes('off white')) return 'Off-White';
  if (title.includes('preta') || title.includes('preto') || title.includes('black')) return 'Preto';
  if (title.includes('branca') || title.includes('branco') || title.includes('white')) return 'Branco';
  if (title.includes('grafite') || title.includes('graphite')) return 'Grafite';
  if (title.includes('cinza') || title.includes('mescla') || title.includes('grey') || title.includes('gray')) return 'Cinza Mescla';
  if (title.includes('marrom') || title.includes('brown')) return 'Marrom Terra';
  if (title.includes('bege') || title.includes('sand')) return 'Bege Areia';
  if (title.includes('azul') || title.includes('blue')) return 'Azul Noite';
  if (title.includes('verde') || title.includes('green')) return 'Verde Militar';

  // Padrão canônico do streetwear autoral THR33
  return 'Preto';
};

// Helper para consolidar informacoes financeiras e de frete do pedido
export const resolveOrderFinancials = (order) => {
  if (!order) return null;

  const rawSubtotal = Number(order.subtotal);
  const calculatedItemsSubtotal = Array.isArray(order.items)
    ? order.items.reduce((acc, it) => acc + (Number(it.price || 0) * Number(it.quantity || 1)), 0)
    : 0;
  const subtotal = !isNaN(rawSubtotal) && rawSubtotal > 0 ? rawSubtotal : calculatedItemsSubtotal;

  const rawShippingCost = order.shippingCost ?? order.freightCost;
  const shippingCost = Number(rawShippingCost || 0);

  const isRetirada = order.shippingMethod === 'retirada_atelie' || String(order.carrier || '').toLowerCase().includes('retirada');
  const isFreeShipping = Boolean(
    order.freeShippingApplied || 
    order.isFreeShipping || 
    (shippingCost === 0 && (order.freeShippingReason || isRetirada || subtotal > 0))
  );

  let freeReasonLabel = '';
  if (isRetirada) {
    freeReasonLabel = 'Retirada no Ateliê';
  } else if (order.freeShippingReason === 'item_and_coupon') {
    freeReasonLabel = 'Item promocional + Cupom';
  } else if (order.freeShippingReason === 'coupon') {
    freeReasonLabel = 'Cupom de frete grátis';
  } else if (order.freeShippingReason === 'item') {
    freeReasonLabel = 'Peça com frete cortesia';
  } else if (order.freeShippingReason === 'order_value') {
    freeReasonLabel = 'Faixa de valor promocional';
  } else if (isFreeShipping) {
    freeReasonLabel = 'Frete Grátis';
  }

  let carrierName = order.carrier || '';
  if (!carrierName) {
    if (isRetirada) carrierName = 'Retirada';
    else if (order.shippingMethod?.toLowerCase().includes('jadlog')) carrierName = 'Jadlog';
    else if (order.shippingMethod?.toLowerCase().includes('correios') || order.shippingMethod === 'pac' || order.shippingMethod === 'sedex') carrierName = 'Correios';
    else if (order.shippingMethod?.toLowerCase().includes('loggi')) carrierName = 'Loggi';
    else carrierName = 'Transportadora';
  }

  let serviceName = order.shippingMethod || '';
  if (serviceName.toLowerCase() === 'retirada_atelie') serviceName = 'Retirada no Ateliê';
  else if (serviceName.toLowerCase() === 'padrao') serviceName = 'Econômico / Padrão';
  else if (serviceName.toLowerCase() === 'expresso') serviceName = 'Expresso';
  else if (serviceName.toUpperCase() === 'PAC') serviceName = 'PAC';
  else if (serviceName.toUpperCase() === 'SEDEX') serviceName = 'SEDEX';
  else if (serviceName.toLowerCase() === '.package') serviceName = '.Package';
  else if (serviceName.toLowerCase() === '.com') serviceName = '.Com';

  const deadline = order.shippingDeadline || order.deliveryTime || '';

  const discountAmount = Number(order.discountAmount || order.discount || 0);
  const couponCode = order.couponCode || order.coupon || '';
  const walletDeduction = Number(order.walletDeduction || 0);
  const total = Number(order.total || 0);
  const paymentMethod = (order.paymentMethod || 'PIX').toUpperCase();

  return {
    subtotal,
    shippingCost,
    isFreeShipping,
    freeReasonLabel,
    carrierName,
    serviceName,
    deadline,
    discountAmount,
    couponCode,
    walletDeduction,
    total,
    paymentMethod
  };
};

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

// Helper robusto para extrair timestamp numerico em ms de qualquer formato de pedido
const parseOrderTimestamp = (orderOrData) => {
  if (!orderOrData) return 0;
  const createdAt = orderOrData.createdAt;
  if (createdAt) {
    if (typeof createdAt.toDate === 'function') {
      const ms = createdAt.toDate().getTime();
      if (!isNaN(ms)) return ms;
    }
    if (typeof createdAt.seconds === 'number') {
      return createdAt.seconds * 1000;
    }
    if (typeof createdAt === 'number' && !isNaN(createdAt)) {
      return createdAt < 10000000000 ? createdAt * 1000 : createdAt;
    }
    if (typeof createdAt === 'string') {
      const ms = new Date(createdAt).getTime();
      if (!isNaN(ms)) return ms;
    }
  }

  const updatedAt = orderOrData.updatedAt;
  if (updatedAt) {
    if (typeof updatedAt.toDate === 'function') {
      const ms = updatedAt.toDate().getTime();
      if (!isNaN(ms)) return ms;
    }
    if (typeof updatedAt.seconds === 'number') {
      return updatedAt.seconds * 1000;
    }
    if (typeof updatedAt === 'string') {
      const ms = new Date(updatedAt).getTime();
      if (!isNaN(ms)) return ms;
    }
  }

  const idStr = String(orderOrData.id || orderOrData.rawId || '');
  const match = idStr.match(/(\d{10,13})/);
  if (match) {
    const num = Number(match[1]);
    if (!isNaN(num)) {
      return num < 10000000000 ? num * 1000 : num;
    }
  }

  return 0;
};

// Helper para converter a data do pedido em YYYY-MM-DD com seguranca estrita contra Invalid Date
const getOrderDateISO = (order) => {
  const ms = parseOrderTimestamp(order);
  if (!ms) return null;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
};

// Helper para exibicao de data em formato pt-BR amigavel
const formatOrderDate = (order) => {
  const ms = parseOrderTimestamp(order);
  if (!ms) return 'Hoje';
  const d = new Date(ms);
  if (isNaN(d.getTime())) return 'Hoje';
  return d.toLocaleDateString('pt-BR');
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

  // Seleção múltipla e Ordem de Produção (PDF / Fábrica)
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [productionModalOpen, setProductionModalOpen] = useState(false);
  const [hideFinancials, setHideFinancials] = useState(false);

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
  const [copiedKey, setCopiedKey] = useState(false);
  const [nfeError, setNfeError] = useState('');
  const [nfeSuccess, setNfeSuccess] = useState('');

  // Modal de Estorno / Reembolso PagBank
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundTargetOrder, setRefundTargetOrder] = useState(null);
  const [refundReason, setRefundReason] = useState('Devolução por arrependimento (CDC 7 dias)');
  const [savingRefund, setSavingRefund] = useState(false);
  const [refundError, setRefundError] = useState('');
  const [refundSuccess, setRefundSuccess] = useState('');

  useEffect(() => {
    if (selectedOrder) {
      setDrawerTracking(selectedOrder.trackingCode && !selectedOrder.trackingCode.includes('Processando') ? selectedOrder.trackingCode : '');
      setDrawerNfeKey(selectedOrder.nfe?.key || selectedOrder.nfeKey || '');
      setDrawerNfeUrl(selectedOrder.nfe?.danfeUrl || selectedOrder.nfeUrl || '');
    }
  }, [selectedOrder]);

  // 1. Busca os pedidos reais no Firestore e vincula histórico de chamados de suporte
  const fetchOrders = async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      // Busca tickets de suporte para vincular histórico com cada pedido
      const ticketOrderIds = new Set();
      try {
        const tSnap = await getDocs(collection(db, 'support_tickets'));
        tSnap.forEach(tDoc => {
          const tData = tDoc.data();
          if (tData.orderId) ticketOrderIds.add(tData.orderId);
        });
      } catch (tErr) {
        console.warn("Aviso ao carregar chamados de suporte para métricas:", tErr.message);
      }

      const snap = await getDocs(collection(db, 'orders'));
      if (!snap.empty) {
        const list = [];
        snap.forEach(d => {
          const oData = d.data();
          const hasSupportRequest = Boolean(
            oData.hasOpenTicket ||
            oData.supportTicket ||
            oData.lastTicketId ||
            (Array.isArray(oData.supportHistory) && oData.supportHistory.length > 0) ||
            ticketOrderIds.has(d.id) ||
            oData.status === 'Troca Solicitada' ||
            oData.status === 'Devolvido'
          );
          list.push({ id: d.id, ...oData, hasSupportRequest });
        });
        list.sort((a, b) => parseOrderTimestamp(b) - parseOrderTimestamp(a));
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

  const handleOpenRefundModal = (order) => {
    if (!order) return;
    setRefundTargetOrder(order);
    setRefundReason('Devolução solicitada pelo cliente / atendimento');
    setRefundError('');
    setRefundSuccess('');
    setRefundModalOpen(true);
  };

  const handleConfirmRefund = async (e) => {
    e.preventDefault();
    if (!refundTargetOrder) return;
    setSavingRefund(true);
    setRefundError('');
    setRefundSuccess('');
    try {
      const refundFn = httpsCallable(functions, 'refundPagBankOrder');
      const res = await refundFn({
        orderId: refundTargetOrder.id,
        reason: refundReason
      });

      if (res?.data?.success) {
        setRefundSuccess(res.data.message || 'Estorno concluído com sucesso!');
        const updates = {
          status: ORDER_STATUSES.CANCELADO,
          financialStatus: 'reembolsado',
          canceledAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setOrders(prev => prev.map(o => o.id === refundTargetOrder.id ? { ...o, ...updates } : o));
        if (selectedOrder?.id === refundTargetOrder.id) {
          setSelectedOrder(prev => ({ ...prev, ...updates }));
        }
        setTimeout(() => {
          setRefundModalOpen(false);
          setRefundTargetOrder(null);
        }, 1800);
      }
    } catch (err) {
      console.error("Erro ao estornar pedido via PagBank:", err);
      setRefundError(err.message || "Falha ao processar estorno. Verifique o painel do PagBank.");
    } finally {
      setSavingRefund(false);
    }
  };

  // 2. Atualizar Status do Pedido no Firestore
  const handleStatusChange = async (orderId, newStatus) => {
    const currentOrder = orders.find(o => o.id === orderId);
    if (!currentOrder) return;

    if (newStatus === ORDER_STATUSES.CANCELADO) {
      handleOpenRefundModal(currentOrder);
      return;
    }

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

  // Handlers para NF-e (Emissao SEFAZ e Anexo Manual)
  const handleOpenNfeModal = (order) => {
    if (!order) return;
    setNfeTargetOrder(order);
    setNfeForm({
      nfeUrl: order.nfe?.danfeUrl || order.nfeUrl || '',
      nfeKey: order.nfe?.chave || order.nfe?.key || order.nfeKey || ''
    });
    setNfeError('');
    setNfeSuccess('');
    setNfeModalOpen(true);
  };

  const handleCopyKey = (key) => {
    if (!key) return;
    navigator.clipboard.writeText(key.replace(/\s+/g, ''));
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
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
    const result = orders.filter(order => {
      // 1. Filtro por Período de Datas
      if (startDate || endDate) {
        const orderDateStr = getOrderDateISO(order);
        if (!orderDateStr) return false;
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

    // Garante que os pedidos mais recentes sempre sejam exibidos primeiro (decrescente)
    result.sort((a, b) => parseOrderTimestamp(b) - parseOrderTimestamp(a));

    return result;
  }, [orders, startDate, endDate, statusFilter, searchTerm]);

  // Métricas Calculadas sobre os Pedidos Filtrados por Período
  const metrics = useMemo(() => {
    // Calcula métricas sobre os pedidos dentro do período selecionado
    const ordersInPeriod = orders.filter(order => {
      if (!startDate && !endDate) return true;
      const orderDateStr = getOrderDateISO(order);
      if (!orderDateStr) return false;
      if (startDate && endDate) {
        return orderDateStr >= startDate && orderDateStr <= endDate;
      }
      if (startDate) return orderDateStr >= startDate;
      if (endDate) return orderDateStr <= endDate;
      return true;
    });

    // Filtra exclusivamente pedidos que tiveram pagamento aprovado em diante (dinheiro real em conta)
    // Exclui pedidos aguardando pagamento e pedidos cancelados
    const paidOrdersInPeriod = ordersInPeriod.filter(order => {
      const norm = normalizeOrderStatus(order.status || order.statusCode);
      return norm !== ORDER_STATUSES.AGUARDANDO_PAGAMENTO && norm !== ORDER_STATUSES.CANCELADO;
    });

    const total = paidOrdersInPeriod.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
    const count = ordersInPeriod.length;
    const paidCount = paidOrdersInPeriod.length;

    // Pedidos que tiveram alguma requisição de suporte no período selecionado
    const supportOrders = ordersInPeriod.filter(o => 
      o.hasSupportRequest || 
      o.hasOpenTicket || 
      Boolean(o.supportTicket) || 
      Boolean(o.lastTicketId) ||
      o.status === 'Troca Solicitada' || 
      o.status === 'Devolvido'
    );
    const supportCount = supportOrders.length;
    const supportRate = count > 0 ? ((supportCount / count) * 100).toFixed(1) : '0.0';
    const avgOrdersPerSupport = supportCount > 0 ? (count / supportCount).toFixed(1) : null;
    const averageTicket = paidCount > 0 ? (total / paidCount).toFixed(2) : '0.00';

    // Mantém exchanges e exchangeRate para retrocompatibilidade
    const exchanges = supportCount;
    const exchangeRate = supportRate;

    return { 
      total, 
      count, 
      paidCount,
      supportCount, 
      supportRate, 
      avgOrdersPerSupport, 
      exchanges, 
      exchangeRate, 
      averageTicket, 
      ordersInPeriodCount: count 
    };
  }, [orders, startDate, endDate]);

  // Pedidos selecionados ou em fila de produção para o Lote
  const batchOrders = useMemo(() => {
    if (selectedOrderIds.length > 0) {
      return orders.filter(o => selectedOrderIds.includes(o.id));
    }
    const queueOrders = filteredOrders.filter(o => {
      const norm = normalizeOrderStatus(o.status);
      return norm === ORDER_STATUSES.PAGAMENTO_APROVADO || norm === ORDER_STATUSES.EM_PRODUCAO;
    });
    return queueOrders.length > 0 ? queueOrders : filteredOrders;
  }, [orders, selectedOrderIds, filteredOrders]);

  // Resumo consolidado de grade e métricas para a fábrica e para o Edu
  const productionSummary = useMemo(() => {
    let totalPieces = 0;
    let totalValue = 0;
    const sizeTotals = { PP: 0, P: 0, M: 0, G: 0, GG: 0, XG: 0, OUTROS: 0 };
    const colorTotals = {};
    const groupedItems = {};

    batchOrders.forEach(order => {
      totalValue += Number(order.total || 0);

      (order.items || []).forEach(item => {
        const qty = Number(item.quantity || 1);
        totalPieces += qty;

        const name = (item.name || 'Camiseta').trim();
        const fit = formatFitBadgeLabel(item.fit) || 'Boxy Fit';
        const color = extractItemColor(item);
        const rawSize = (item.size || 'M').trim().toUpperCase();
        const sizeKey = ['PP', 'P', 'M', 'G', 'GG', 'XG'].includes(rawSize) ? rawSize : 'OUTROS';

        sizeTotals[sizeKey] = (sizeTotals[sizeKey] || 0) + qty;
        colorTotals[color] = (colorTotals[color] || 0) + qty;

        const groupKey = `${name}:::${fit}:::${color}`;
        if (!groupedItems[groupKey]) {
          groupedItems[groupKey] = {
            name,
            fit,
            color,
            sizes: { PP: 0, P: 0, M: 0, G: 0, GG: 0, XG: 0, OUTROS: 0 },
            total: 0
          };
        }
        groupedItems[groupKey].sizes[sizeKey] = (groupedItems[groupKey].sizes[sizeKey] || 0) + qty;
        groupedItems[groupKey].total += qty;
      });
    });

    return {
      orders: batchOrders,
      totalOrders: batchOrders.length,
      totalPieces,
      totalValue,
      sizeTotals,
      colorTotals,
      groupedItems: Object.values(groupedItems),
      batchId: `LOTE-PROD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(batchOrders.length).padStart(3, '0')}`,
      generatedAt: new Date().toLocaleString('pt-BR')
    };
  }, [batchOrders]);


  // Gestão de Seleção de Pedidos
  const isAllSelected = useMemo(() => {
    if (filteredOrders.length === 0) return false;
    return filteredOrders.every(o => selectedOrderIds.includes(o.id));
  }, [filteredOrders, selectedOrderIds]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedOrderIds(prev => prev.filter(id => !filteredOrders.some(o => o.id === id)));
    } else {
      const allFilteredIds = filteredOrders.map(o => o.id);
      setSelectedOrderIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleToggleOrder = (orderId) => {
    setSelectedOrderIds(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const handleSelectApprovedAndProduction = () => {
    const queueIds = filteredOrders
      .filter(o => {
        const norm = normalizeOrderStatus(o.status);
        return norm === ORDER_STATUSES.PAGAMENTO_APROVADO || norm === ORDER_STATUSES.EM_PRODUCAO;
      })
      .map(o => o.id);

    if (queueIds.length === 0) {
      alert("Nenhum pedido com status 'Pagamento Aprovado' ou 'Em Produção' encontrado no período selecionado.");
      return;
    }
    setSelectedOrderIds(queueIds);
  };

  const handleOpenProductionModal = () => {
    if (batchOrders.length === 0) {
      alert("Nenhum pedido encontrado ou selecionado para gerar a ordem de produção.");
      return;
    }
    setProductionModalOpen(true);
  };

  const handleExportBatchCsv = () => {
    if (batchOrders.length === 0) {
      alert("Nenhum pedido selecionado para exportação.");
      return;
    }

    const csvRows = [
      ['ID PEDIDO', 'DATA', 'CLIENTE', 'TELEFONE', 'ENDERECO COMPLETO', 'ITEM', 'MODELAGEM', 'COR', 'TAMANHO', 'QTD', 'VALOR UNITARIO']
    ];

    batchOrders.forEach(order => {
      const addr = order.shippingAddress 
        ? `"${order.shippingAddress.street || ''}, ${order.shippingAddress.number || ''} - ${order.shippingAddress.neighborhood || ''}, ${order.shippingAddress.city || ''}/${order.shippingAddress.state || ''} CEP: ${order.shippingAddress.cep || ''}"`
        : 'Endereço não informado';

      order.items?.forEach(item => {
        csvRows.push([
          order.id,
          formatOrderDate(order),
          `"${order.clientName || order.customerName || 'Cliente'}"`,
          order.clientPhone || order.customerPhone || '',
          addr,
          `"${item.name || 'Camiseta'}"`,
          formatFitBadgeLabel(item.fit) || 'Boxy Fit',
          extractItemColor(item),
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
    link.setAttribute("download", `LOTE_PRODUCAO_THR33_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintProductionOrder = () => {
    const printArea = document.getElementById('production-order-print-area');
    if (!printArea) {
      window.print();
      return;
    }

    // Remove qualquer frame de impressao residual
    const prevFrame = document.getElementById('thr33-production-print-frame');
    if (prevFrame) prevFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'thr33-production-print-frame';
    iframe.setAttribute('style', 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;');
    document.body.appendChild(iframe);

    // Coleta todas as tags de estilo e links de stylesheet do documento para manter a fidelidade visual exata
    const styleTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(node => node.outerHTML)
      .join('\n');

    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Ordem_Producao_${productionSummary.batchId}</title>
        ${styleTags}
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 10mm 12mm 10mm;
          }
          * {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #09090b !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
            font-size: 11px !important;
            line-height: 1.4 !important;
            height: auto !important;
            overflow: visible !important;
          }
          [class*="productionDocContainer"], #production-order-print-area {
            display: block !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
          [class*="productionDocSheet"] {
            display: block !important;
            background: #ffffff !important;
            color: #09090b !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
          }
          [class*="pageBreakBefore"] {
            page-break-before: always !important;
            break-before: page !important;
            margin-top: 10mm !important;
          }
          [class*="pageBreakAvoid"] {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          [class*="docOrderCard"] {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border: 1px solid #a1a1aa !important;
            margin-bottom: 12px !important;
            background-color: #fafafa !important;
          }
          table {
            page-break-inside: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          [class*="productionActionBar"], button {
            display: none !important;
          }
        </style>
      </head>
      <body>
        ${printArea.outerHTML}
      </body>
      </html>
    `);
    iframeDoc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.warn("Aviso ao imprimir via iframe, utilizando fallback direto:", err);
        window.print();
      }
    }, 350);
  };

  const handleOpenProductionTab = () => {
    const printArea = document.getElementById('production-order-print-area');
    if (!printArea) return;

    const styleTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(node => node.outerHTML)
      .join('\n');

    const newTab = window.open('', '_blank');
    if (!newTab) {
      alert("Por favor, permita pop-ups para visualizar a ordem de produção em nova aba.");
      return;
    }

    newTab.document.open();
    newTab.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Ordem de Produção - ${productionSummary.batchId}</title>
        ${styleTags}
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          * { box-sizing: border-box !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body {
            background: #e4e4e7;
            margin: 0;
            padding: 24px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            justify-content: center;
          }
          [class*="productionDocContainer"] {
            background: transparent !important;
            padding: 0 !important;
          }
          [class*="productionDocSheet"] {
            background: #ffffff !important;
            color: #09090b !important;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
            max-width: 900px !important;
            width: 100% !important;
          }
          @media print {
            body { background: #ffffff !important; padding: 0 !important; }
            [class*="productionDocSheet"] { box-shadow: none !important; }
          }
        </style>
      </head>
      <body>
        ${printArea.outerHTML}
      </body>
      </html>
    `);
    newTab.document.close();
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
            onClick={handleOpenProductionModal}
            className={styles.exportBatchBtn}
            title="Gerar Ordem de Produção e Separação em Lote (PDF)"
          >
            <FileText size={14} />
            <span>
              {selectedOrderIds.length > 0 
                ? `EXPORTAR LOTE (${selectedOrderIds.length})` 
                : 'EXPORTAR LOTE (PDF)'}
            </span>
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
          <small className={styles.kpiSub}>
            {metrics.paidCount} {metrics.paidCount === 1 ? 'pedido aprovado' : 'pedidos aprovados'} no período
          </small>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <Package size={16} className={styles.kpiIconBlue} />
            <span className={styles.kpiLabel}>TOTAL DE PEDIDOS</span>
          </div>
          <strong className={styles.kpiValue}>{metrics.count}</strong>
          <small className={styles.kpiSub}>
            {metrics.paidCount} {metrics.paidCount === 1 ? 'pago' : 'pagos'} • {metrics.count - metrics.paidCount} pendentes/cancelados
          </small>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <TrendingUp size={16} className={styles.kpiIconYellow} />
            <span className={styles.kpiLabel}>TICKET MÉDIO</span>
          </div>
          <strong className={styles.kpiValue}>R$ {metrics.averageTicket}</strong>
          <small className={styles.kpiSub}>Média por pedido aprovado</small>
        </div>

        <div className={`${styles.kpiCard} ${Number(metrics.supportRate) > 10 ? styles.alertKpi : ''}`}>
          <div className={styles.kpiHeader}>
            <Headphones size={16} className={styles.kpiIconPurple} />
            <span className={styles.kpiLabel}>TAXA DE SOLICITAÇÃO DE SUPORTE</span>
          </div>
          <strong className={styles.kpiValue}>{metrics.supportRate}%</strong>
          <small className={styles.kpiSub}>
            {metrics.supportCount > 0 
              ? `${metrics.supportCount} ${metrics.supportCount === 1 ? 'pedido com chamado' : 'pedidos com chamados'} • Média 1 a cada ${metrics.avgOrdersPerSupport} pedidos`
              : '0 solicitações no período'}
          </small>
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
                const dStr = getOrderDateISO(o);
                if (!dStr) return false;
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

          <button 
            type="button"
            className={styles.quickQueueBtn}
            onClick={handleSelectApprovedAndProduction}
            title="Selecionar todos os pedidos com Pagamento Aprovado e Em Produção"
          >
            <CheckSquare size={13} />
            <span>SELECIONAR FILA DE PRODUÇÃO</span>
          </button>
        </div>
      </div>

      {/* BARRA DE SELEÇÃO E AÇÕES RÁPIDAS DE LOTE */}
      {selectedOrderIds.length > 0 && (
        <div className={styles.selectionBar}>
          <div className={styles.selectionCount}>
            <CheckSquare size={16} className={styles.selectionIcon} />
            <span>
              <strong>{selectedOrderIds.length}</strong> {selectedOrderIds.length === 1 ? 'pedido selecionado' : 'pedidos selecionados'} para produção
            </span>
          </div>

          <div className={styles.selectionActions}>
            <button 
              type="button" 
              onClick={handleOpenProductionModal}
              className={styles.generatePdfActionBtn}
              title="Visualizar e Imprimir Ordem de Produção em PDF"
            >
              <Printer size={14} />
              <span>GERAR ORDEM DE PRODUÇÃO (PDF)</span>
            </button>

            <button 
              type="button" 
              onClick={handleExportBatchCsv}
              className={styles.exportCsvActionBtn}
              title="Baixar planilha CSV dos pedidos selecionados"
            >
              <Download size={14} />
              <span>BAIXAR CSV</span>
            </button>

            <button 
              type="button" 
              onClick={() => setSelectedOrderIds([])}
              className={styles.clearSelectionBtn}
              title="Desmarcar todos"
            >
              <X size={13} />
              <span>Limpar Seleção</span>
            </button>
          </div>
        </div>
      )}

      {/* TABELA DE PEDIDOS */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkboxTh}>
                <input 
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleToggleSelectAll}
                  className={styles.checkboxInput}
                  title="Selecionar todos os pedidos visíveis"
                  aria-label="Selecionar todos os pedidos"
                />
              </th>
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
                <td colSpan="9" className={styles.centerText}>
                  <div className={styles.loadingWrapper}>
                    <RotateCw size={18} className={styles.spinning} />
                    <span>Buscando pedidos no Firestore...</span>
                  </div>
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="9" className={styles.centerText}>
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
                  <tr key={order.id} className={`${styles.tableRow} ${selectedOrderIds.includes(order.id) ? styles.selectedTableRow : ''}`}>
                    <td className={styles.checkboxTd} onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox"
                        checked={selectedOrderIds.includes(order.id)}
                        onChange={() => handleToggleOrder(order.id)}
                        className={styles.checkboxInput}
                        aria-label={`Selecionar pedido ${order.id}`}
                      />
                    </td>
                    <td>
                      <div className={styles.orderCodeWrapper}>
                        <strong className={styles.orderCode}>#{order.id.toUpperCase().startsWith('THR-') ? order.id.toUpperCase() : order.id.slice(0, 8).toUpperCase()}</strong>
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

                        {(order.nfe?.danfeUrl || order.nfeUrl) ? (
                          <a 
                            href={order.nfe?.danfeUrl || order.nfeUrl} 
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
                        {formatOrderDate(order)}
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
                            {it.quantity}x {it.name} <small>({it.size} • {extractItemColor(it)})</small>
                          </span>
                        ))}
                      </div>

                    </td>
                    <td>
                      {(() => {
                        const fin = resolveOrderFinancials(order);
                        return (
                          <div className={styles.totalColWrapper}>
                            <strong className={styles.totalValue}>R$ {fin.total.toFixed(2)}</strong>
                            <div className={styles.orderFinanceMiniStack}>
                              <span className={styles.financeMiniItem} title="Subtotal das peças">
                                Itens: R$ {fin.subtotal.toFixed(2)}
                              </span>
                              {fin.isFreeShipping ? (
                                <span className={styles.financeMiniFreeShipping} title={fin.freeReasonLabel || 'Frete Grátis'}>
                                  FRETE GRÁTIS
                                </span>
                              ) : fin.shippingCost > 0 ? (
                                <span className={styles.financeMiniShipping} title={`Frete: ${fin.carrierName}`}>
                                  Frete: R$ {fin.shippingCost.toFixed(2)}
                                </span>
                              ) : null}
                              {fin.discountAmount > 0 && (
                                <span className={styles.financeMiniDiscount} title={fin.couponCode ? `Cupom: ${fin.couponCode}` : 'Desconto aplicado'}>
                                  Desc: -R$ {fin.discountAmount.toFixed(2)}
                                </span>
                              )}
                              {fin.walletDeduction > 0 && (
                                <span className={styles.financeMiniDiscount} title="Saldo da carteira utilizado">
                                  Saldo: -R$ {fin.walletDeduction.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
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
                          className={`${styles.nfeActionRowBtn} ${(order.nfe?.danfeUrl || order.nfeUrl) ? styles.nfeActionRowBtnActive : ''}`}
                          title={(order.nfe?.danfeUrl || order.nfeUrl) ? "Visualizar ou gerenciar NF-e" : "Emitir ou gerenciar NF-e"}
                        >
                          <FileText size={11} />
                          <span>{(order.nfe?.danfeUrl || order.nfeUrl) ? 'Gerenciar NF-e' : 'NF-e'}</span>
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

                      {normStatus !== ORDER_STATUSES.CANCELADO && (
                        <button
                          type="button"
                          onClick={() => handleOpenRefundModal(selectedOrder)}
                          style={{
                            margin: 0,
                            padding: '0.5rem 0.85rem',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            border: '1px solid rgba(248, 113, 113, 0.4)',
                            backgroundColor: 'rgba(248, 113, 113, 0.08)',
                            color: '#f87171',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <AlertCircle size={13} />
                          <span>Estornar no PagBank</span>
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
                  {selectedOrder.shippingAddress?.street || selectedOrder.nfe?.destinatario?.logradouro}, {selectedOrder.shippingAddress?.number || selectedOrder.nfe?.destinatario?.numero} {selectedOrder.shippingAddress?.complement ? `• ${selectedOrder.shippingAddress.complement}` : ''}<br/>
                  {(selectedOrder.shippingAddress?.neighborhood || selectedOrder.shippingAddress?.locality || selectedOrder.nfe?.destinatario?.bairro) ? `${selectedOrder.shippingAddress?.neighborhood || selectedOrder.shippingAddress?.locality || selectedOrder.nfe?.destinatario?.bairro} — ` : ''}{selectedOrder.shippingAddress?.city || selectedOrder.nfe?.destinatario?.municipio || selectedOrder.clientCity}/{selectedOrder.shippingAddress?.state || selectedOrder.shippingAddress?.region_code || selectedOrder.shippingAddress?.uf || selectedOrder.nfe?.destinatario?.uf || selectedOrder.clientState}<br/>
                  CEP: {selectedOrder.shippingAddress?.cep || selectedOrder.shippingAddress?.postal_code || selectedOrder.nfe?.destinatario?.cep}
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
                        <span>Tamanho: <strong>{it.size}</strong> • Cor: <strong>{extractItemColor(it)}</strong> {it.fit ? `• ${formatFitBadgeLabel(it.fit)}` : ''}</span>
                        <small>Qtd: {it.quantity} un. • R$ {Number(it.price || 0).toFixed(2)} un.</small>
                      </div>

                    </div>
                  ))}
                </div>
              </div>

              {/* DISCRIMINAÇÃO FINANCEIRA & FRETE */}
              {(() => {
                const fin = resolveOrderFinancials(selectedOrder);
                if (!fin) return null;
                return (
                  <div className={styles.sectionBlock}>
                    <div className={styles.sectionHeaderLine}>
                      <DollarSign size={15} className={styles.sectionIcon} />
                      <h3>DISCRIMINAÇÃO FINANCEIRA & FRETE</h3>
                    </div>

                    <div className={styles.financialBreakdownBox}>
                      {/* Subtotal das Peças */}
                      <div className={styles.financialRow}>
                        <div className={styles.financialLabelCol}>
                          <span className={styles.financialLabel}>Subtotal das Peças</span>
                          <span className={styles.financialSubtext}>
                            {selectedOrder.items?.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0) || 1} {selectedOrder.items?.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0) === 1 ? 'peça' : 'peças'}
                          </span>
                        </div>
                        <div className={styles.financialValueCol}>
                          <span className={styles.financialValue}>R$ {fin.subtotal.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Frete / Envio Selecionado */}
                      <div className={styles.financialRow}>
                        <div className={styles.financialLabelCol}>
                          <span className={styles.financialLabel}>
                            Frete Selecionado: <strong>{fin.carrierName}</strong> {fin.serviceName ? `(${fin.serviceName})` : ''}
                          </span>
                          {fin.deadline && (
                            <span className={styles.financialSubtext}>
                              Prazo estimado: {fin.deadline}
                            </span>
                          )}
                        </div>
                        <div className={styles.financialValueCol}>
                          {fin.isFreeShipping ? (
                            <span className={styles.freeShippingBadge}>
                              {fin.freeReasonLabel || 'FRETE GRÁTIS'}
                            </span>
                          ) : (
                            <span className={styles.financialValue}>R$ {fin.shippingCost.toFixed(2)}</span>
                          )}
                        </div>
                      </div>

                      {/* Desconto / Cupom se houver */}
                      {fin.discountAmount > 0 && (
                        <div className={styles.financialRowDiscount}>
                          <div className={styles.financialLabelCol}>
                            <span className={styles.financialLabelDiscount}>
                              <Tag size={12} />
                              <span>Desconto Promocional</span>
                              {fin.couponCode && (
                                <span className={styles.couponTagText}>{fin.couponCode.toUpperCase()}</span>
                              )}
                            </span>
                          </div>
                          <div className={styles.financialValueCol}>
                            <span className={styles.financialValueDiscount}>- R$ {fin.discountAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      )}

                      {/* Dedução de Carteira se houver */}
                      {fin.walletDeduction > 0 && (
                        <div className={styles.financialRowDiscount}>
                          <div className={styles.financialLabelCol}>
                            <span className={styles.financialLabelDiscount}>
                              <span>Crédito da Carteira / Troca</span>
                            </span>
                          </div>
                          <div className={styles.financialValueCol}>
                            <span className={styles.financialValueDiscount}>- R$ {fin.walletDeduction.toFixed(2)}</span>
                          </div>
                        </div>
                      )}

                      {/* Total Líquido Pago */}
                      <div className={styles.financialTotalRow}>
                        <div>
                          <div className={styles.financialTotalLabel}>TOTAL PAGO PELO CLIENTE</div>
                          <div className={styles.financialPaymentMethodSub}>
                            Forma de pagamento: {fin.paymentMethod}
                          </div>
                        </div>
                        <div>
                          <span className={styles.financialTotalValue}>R$ {fin.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

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
      {/* MODAL DEDICADO: GERENCIAR NF-E (MODELO 55) */}
      {nfeModalOpen && nfeTargetOrder && (
        <div className={styles.dispatchModalBackdrop} onClick={() => setNfeModalOpen(false)}>
          <div className={styles.dispatchModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.dispatchModalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <FileText size={18} color="#a855f7" />
                <h3>GERENCIAR NF-E (MODELO 55) • #{nfeTargetOrder.id.slice(0, 8).toUpperCase()}</h3>
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

            <div className={styles.dispatchModalBody}>
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

              {/* CARD DE STATUS SEFAZ */}
              {(nfeTargetOrder.nfe?.status === 'AUTHORIZED' || (nfeTargetOrder.nfeIssued && (nfeTargetOrder.nfe?.danfeUrl || nfeTargetOrder.nfeUrl))) ? (
                <div className={styles.nfeAuthorizedCard}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#4ade80', fontSize: '0.75rem', fontWeight: 700 }}>
                      <CheckCircle2 size={14} />
                      <span>NF-E AUTORIZADA PELA SEFAZ-PR</span>
                    </div>
                    {nfeTargetOrder.nfe?.issuedAt && (
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {new Date(nfeTargetOrder.nfe.issuedAt.toDate ? nfeTargetOrder.nfe.issuedAt.toDate() : nfeTargetOrder.nfe.issuedAt).toLocaleString('pt-BR')}
                      </span>
                    )}
                  </div>

                  {(nfeTargetOrder.nfe?.chave || nfeTargetOrder.nfe?.key || nfeTargetOrder.nfeKey) && (
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem', letterSpacing: '0.05em' }}>
                        CHAVE DE ACESSO (44 DÍGITOS):
                      </span>
                      <div className={styles.nfeKeyDisplay}>
                        <span>{nfeTargetOrder.nfe?.chave || nfeTargetOrder.nfe?.key || nfeTargetOrder.nfeKey}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyKey(nfeTargetOrder.nfe?.chave || nfeTargetOrder.nfe?.key || nfeTargetOrder.nfeKey)}
                          className={styles.copyKeyBtn}
                          title="Copiar Chave de Acesso"
                        >
                          <Copy size={11} />
                          <span>{copiedKey ? 'COPIADO' : 'COPIAR'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                    {(nfeTargetOrder.nfe?.danfeUrl || nfeTargetOrder.nfeUrl) && (
                      <a
                        href={nfeTargetOrder.nfe?.danfeUrl || nfeTargetOrder.nfeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.nfeEmitActionBtn}
                        style={{ padding: '0.5rem 0.85rem', fontSize: '0.7rem', textDecoration: 'none' }}
                      >
                        <FileText size={12} />
                        <span>ABRIR DANFE (PDF)</span>
                        <ExternalLink size={10} />
                      </a>
                    )}
                    {(nfeTargetOrder.nfe?.xmlUrl || nfeTargetOrder.nfeXmlUrl) && (
                      <a
                        href={nfeTargetOrder.nfe?.xmlUrl || nfeTargetOrder.nfeXmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#ffffff',
                          padding: '0.5rem 0.85rem',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          cursor: 'pointer'
                        }}
                      >
                        <FileText size={12} />
                        <span>BAIXAR XML SEFAZ</span>
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              ) : null}

              {/* FORMULÁRIO DE ANEXO MANUAL */}
              <form onSubmit={handleSaveNfe} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>
                  VINCULAÇÃO MANUAL OU AJUSTE DE LINKS (OPCIONAL)
                </span>

                <div className={styles.fieldGroup}>
                  <label>LINK DIRETO DO PDF DA NF-E (DANFE)</label>
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
                </div>

                <div className={styles.fieldGroup}>
                  <label>CHAVE DE ACESSO NF-E (44 DÍGITOS)</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 4126 0900 0000 0001 0055 0010 0000 0001 2345 6789" 
                    maxLength={54}
                    value={nfeForm.nfeKey} 
                    onChange={(e) => setNfeForm(prev => ({ ...prev, nfeKey: e.target.value }))}
                  />
                </div>

                <div className={styles.dispatchModalFooter} style={{ padding: 0, border: 'none', background: 'transparent', marginTop: '0.5rem' }}>
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
                    Fechar
                  </button>
                  <button 
                    type="submit" 
                    disabled={savingNfe} 
                    className={styles.confirmDispatchBtn}
                    style={{ backgroundColor: '#a855f7', color: '#ffffff' }}
                  >
                    <Save size={13} />
                    <span>{savingNfe ? 'Salvando...' : 'Salvar Alterações'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DEDICADO: ESTORNO / REEMBOLSO PAGBANK */}
      {refundModalOpen && refundTargetOrder && (
        <div className={styles.dispatchModalBackdrop} onClick={() => !savingRefund && setRefundModalOpen(false)}>
          <div className={styles.dispatchModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.dispatchModalHeader} style={{ borderBottomColor: 'rgba(248, 113, 113, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <AlertCircle size={18} color="#f87171" />
                <h3>SOLICITAR ESTORNO (PAGBANK) • #{refundTargetOrder.id.slice(0, 8).toUpperCase()}</h3>
              </div>
              <button 
                type="button" 
                onClick={() => !savingRefund && setRefundModalOpen(false)} 
                className={styles.closeBtn}
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmRefund}>
              <div className={styles.dispatchModalBody}>
                <div className={styles.dispatchOrderSummary} style={{ borderColor: 'rgba(248, 113, 113, 0.3)', backgroundColor: 'rgba(248, 113, 113, 0.05)' }}>
                  <div>
                    <strong>{refundTargetOrder.clientName || 'Cliente'}</strong>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Valor da Compra: R$ {Number(refundTargetOrder.total || 0).toFixed(2)} • {refundTargetOrder.paymentMethod || 'PagBank'}
                    </span>
                    {(refundTargetOrder.pagbankChargeId || refundTargetOrder.pagbank?.charges?.[0]?.id) && (
                      <span style={{ display: 'block', fontSize: '0.7rem', color: '#a3a3a3', marginTop: '0.2rem' }}>
                        Cobrança PagBank: <code>{refundTargetOrder.pagbankChargeId || refundTargetOrder.pagbank?.charges?.[0]?.id}</code>
                      </span>
                    )}
                  </div>
                  <span className={styles.statusDotSmall} style={{ backgroundColor: '#f87171' }} />
                </div>

                {refundError && (
                  <div className={styles.dispatchErrorNotice}>
                    <AlertCircle size={14} />
                    <span>{refundError}</span>
                  </div>
                )}

                {refundSuccess && (
                  <div style={{ backgroundColor: 'rgba(74, 222, 128, 0.12)', border: '1px solid rgba(74, 222, 128, 0.4)', color: '#4ade80', padding: '0.65rem 0.85rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={14} />
                    <span>{refundSuccess}</span>
                  </div>
                )}

                <div className={styles.fieldGroup}>
                  <label>MOTIVO DO ESTORNO / DEVOLUÇÃO</label>
                  <select
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.75rem', fontSize: '0.8rem' }}
                  >
                    <option value="Devolução por arrependimento (CDC 7 dias)">Devolução por arrependimento (CDC 7 dias)</option>
                    <option value="Troca / Devolução solicitada pelo cliente">Troca / Devolução solicitada pelo cliente</option>
                    <option value="Cancelamento antes do despacho">Cancelamento antes do despacho</option>
                    <option value="Produto devolvido ao remetente">Produto devolvido ao remetente</option>
                    <option value="Avaria / Defeito de fabricação">Avaria / Defeito de fabricação</option>
                    <option value="Outro motivo acordado no suporte">Outro motivo acordado no suporte</option>
                  </select>
                </div>

                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', padding: '0.75rem 1rem', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Ao confirmar, o sistema enviará a chamada à API do PagBank para cancelamento da transação (cartão ou Pix). O estoque das peças será automaticamente devolvido ao catálogo e o pedido passará para o status <strong>Cancelado / Reembolsado</strong>.
                </div>
              </div>

              <div className={styles.dispatchModalFooter}>
                <button
                  type="button"
                  onClick={() => setRefundModalOpen(false)}
                  disabled={savingRefund}
                  className={styles.cancelModalBtn}
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  disabled={savingRefund}
                  className={styles.confirmDispatchBtn}
                  style={{ backgroundColor: '#ef4444', color: '#ffffff' }}
                >
                  <RotateCw size={13} className={savingRefund ? styles.spinIcon : ''} />
                  <span>{savingRefund ? 'PROCESSANDO ESTORNO...' : 'CONFIRMAR ESTORNO PAGBANK'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ORDEM DE PRODUÇÃO & SEPARAÇÃO (PDF / FÁBRICA) */}
      {productionModalOpen && (
        <div className={styles.productionModalOverlay} onClick={() => setProductionModalOpen(false)}>
          <div className={styles.productionModalCard} onClick={(e) => e.stopPropagation()}>
            {/* BARRA DE AÇÕES DO MODAL (NÃO IMPRESSA) */}
            <div className={styles.productionActionBar}>
              <div className={styles.productionActionTitle}>
                <FileText size={18} className={styles.productionTitleIcon} />
                <div>
                  <h3>ORDEM DE PRODUÇÃO & SEPARAÇÃO EM LOTE</h3>
                  <span>{productionSummary.totalOrders} pedidos selecionados • {productionSummary.totalPieces} peças no total</span>
                </div>
              </div>

              <div className={styles.productionActionButtons}>
                <button
                  type="button"
                  onClick={() => setHideFinancials(prev => !prev)}
                  className={`${styles.actionToggleBtn} ${hideFinancials ? styles.actionToggleBtnActive : ''}`}
                  title={hideFinancials ? "Exibir valores financeiros" : "Ocultar valores financeiros para envio direto à fábrica"}
                >
                  {hideFinancials ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>{hideFinancials ? 'Valores Ocultos (Modo Fábrica)' : 'Ocultar Valores (R$)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportBatchCsv}
                  className={styles.actionCsvBtn}
                  title="Exportar planilha Excel/CSV dos pedidos selecionados"
                >
                  <Download size={14} />
                  <span>Baixar CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenProductionTab}
                  className={styles.actionTabBtn}
                  title="Abrir a ficha de produção em uma nova aba para visualização completa"
                >
                  <ExternalLink size={14} />
                  <span>Abrir em Nova Aba</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintProductionOrder}
                  className={styles.actionPrintBtn}
                  title="Imprimir ou Salvar como PDF (A4)"
                >
                  <Printer size={15} />
                  <span>IMPRIMIR / GERAR PDF</span>
                </button>


                <button
                  type="button"
                  onClick={() => setProductionModalOpen(false)}
                  className={styles.actionCloseBtn}
                  aria-label="Fechar"
                  title="Fechar visualizador"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* DOCUMENTO DA ORDEM DE PRODUÇÃO (IMPRESSO / FORMATADO EM FOLHA A4) */}
            <div className={styles.productionDocContainer} id="production-order-print-area">
              <div className={styles.productionDocSheet}>
                {/* CABEÇALHO DA FICHA */}
                <div className={styles.docHeader}>
                  <div className={styles.docBrand}>
                    <span className={styles.docBrandLogo}>THR33</span>
                    <span className={styles.docBrandSub}>STREETWEAR AUTORAL • CURITIBA / BR</span>
                  </div>
                  <div className={styles.docBatchMeta}>
                    <div className={styles.docBatchTag}>
                      <span>IDENTIFICADOR DO LOTE:</span>
                      <strong>{productionSummary.batchId}</strong>
                    </div>
                    <span className={styles.docMetaDate}>EMISSÃO: {productionSummary.generatedAt}</span>
                    <span className={styles.docMetaOrigin}>EXPEDIÇÃO: ESTR. DE SANTA ISABEL, 1011 - SOBRE LOJA - ITAQUAQUECETUBA - SP (08577-010)</span>
                  </div>
                </div>

                {/* ESTATÍSTICAS E TOTAIS DO LOTE */}
                <div className={styles.docStatsGrid}>
                  <div className={styles.docStatCard}>
                    <span>TOTAL DE PEDIDOS</span>
                    <strong>{productionSummary.totalOrders}</strong>
                    <small>Pedidos no lote</small>
                  </div>
                  <div className={styles.docStatCard}>
                    <span>TOTAL DE PEÇAS</span>
                    <strong>{productionSummary.totalPieces}</strong>
                    <small>Unidades para corte/confecção</small>
                  </div>
                  {!hideFinancials && (
                    <div className={styles.docStatCard}>
                      <span>VALOR TOTAL DO LOTE</span>
                      <strong>R$ {productionSummary.totalValue.toFixed(2)}</strong>
                      <small>Faturamento bruto dos pedidos</small>
                    </div>
                  )}
                  <div className={styles.docStatCard}>
                    <span>DISTRIBUIÇÃO GERAL POR TAMANHO</span>
                    <div className={styles.docSizeDistribution}>
                      <span>PP: <strong>{productionSummary.sizeTotals.PP}</strong></span>
                      <span>P: <strong>{productionSummary.sizeTotals.P}</strong></span>
                      <span>M: <strong>{productionSummary.sizeTotals.M}</strong></span>
                      <span>G: <strong>{productionSummary.sizeTotals.G}</strong></span>
                      <span>GG: <strong>{productionSummary.sizeTotals.GG}</strong></span>
                      <span>XG: <strong>{productionSummary.sizeTotals.XG}</strong></span>
                      {productionSummary.sizeTotals.OUTROS > 0 && <span>Outros: <strong>{productionSummary.sizeTotals.OUTROS}</strong></span>}
                    </div>
                  </div>
                  <div className={styles.docStatCard}>
                    <span>DISTRIBUIÇÃO GERAL POR COR</span>
                    <div className={styles.docSizeDistribution}>
                      {Object.entries(productionSummary.colorTotals || {}).map(([colName, colQty]) => (
                        <span key={colName}>
                          {colName}: <strong>{colQty} un.</strong>
                        </span>
                      ))}
                    </div>
                    <small>Total de blanks/tecidos por cor</small>
                  </div>
                </div>

                {/* SEÇÃO 1: TABELA CONSOLIDADA PARA A FÁBRICA / CORTE & ESTAMPARIA */}
                <div className={styles.docSection}>
                  <div className={styles.docSectionTitle}>
                    <Scissors size={14} />
                    <h4>1. GRADE DE CORTE & ESTAMPARIA CONSOLIDADA (FÁBRICA)</h4>
                  </div>
                  <p className={styles.docSectionDesc}>
                    Grade consolidada somando todos os pedidos do lote. Utilize esta tabela para preparar tecidos, blanks, corte, costura e estamparia.
                  </p>

                  <table className={styles.docTable}>
                    <thead>
                      <tr>
                        <th>ITEM / MODELO</th>
                        <th>MODELAGEM</th>
                        <th>COR</th>
                        <th className={styles.sizeTh}>PP</th>
                        <th className={styles.sizeTh}>P</th>
                        <th className={styles.sizeTh}>M</th>
                        <th className={styles.sizeTh}>G</th>
                        <th className={styles.sizeTh}>GG</th>
                        <th className={styles.sizeTh}>XG</th>
                        <th className={styles.totalTh}>TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productionSummary.groupedItems.map((prod, pIdx) => (
                        <tr key={pIdx}>
                          <td><strong>{prod.name}</strong></td>
                          <td>{prod.fit}</td>
                          <td><span className={styles.docColorTag}>{prod.color}</span></td>
                          <td className={styles.sizeTd}>{prod.sizes.PP || '-'}</td>
                          <td className={styles.sizeTd}>{prod.sizes.P || '-'}</td>
                          <td className={styles.sizeTd}>{prod.sizes.M || '-'}</td>
                          <td className={styles.sizeTd}>{prod.sizes.G || '-'}</td>
                          <td className={styles.sizeTd}>{prod.sizes.GG || '-'}</td>
                          <td className={styles.sizeTd}>{prod.sizes.XG || '-'}</td>
                          <td className={styles.totalTd}><strong>{prod.total} un.</strong></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className={styles.docTableFooterRow}>
                        <td colSpan="3"><strong>TOTAL CONSOLIDADO DO LOTE</strong></td>
                        <td className={styles.sizeTd}><strong>{productionSummary.sizeTotals.PP}</strong></td>
                        <td className={styles.sizeTd}><strong>{productionSummary.sizeTotals.P}</strong></td>
                        <td className={styles.sizeTd}><strong>{productionSummary.sizeTotals.M}</strong></td>
                        <td className={styles.sizeTd}><strong>{productionSummary.sizeTotals.G}</strong></td>
                        <td className={styles.sizeTd}><strong>{productionSummary.sizeTotals.GG}</strong></td>
                        <td className={styles.sizeTd}><strong>{productionSummary.sizeTotals.XG}</strong></td>
                        <td className={styles.totalTd}><strong>{productionSummary.totalPieces} PEÇAS</strong></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* SEÇÃO 2: DETALHAMENTO DE SEPARAÇÃO INDIVIDUAL POR PEDIDO (PACKING LIST) */}
                <div className={`${styles.docSection} ${styles.pageBreakBefore}`}>
                  <div className={styles.docSectionTitle}>
                    <Layers size={14} />
                    <h4>2. DETALHAMENTO DE SEPARAÇÃO INDIVIDUAL POR PEDIDO (PACKING LIST)</h4>
                  </div>
                  <p className={styles.docSectionDesc}>
                    Use a lista abaixo para conferir, dobrar, ensacar e etiquetar cada pacote individualmente.
                  </p>

                  <div className={styles.docOrdersList}>
                    {productionSummary.orders.map((ord, oIdx) => {
                      const addr = ord.shippingAddress;
                      const addrLine = addr 
                        ? `${addr.street || ''}, ${addr.number || ''}${addr.complement ? ` (${addr.complement})` : ''} - ${addr.neighborhood || ''}, ${addr.city || ''}/${addr.state || ''} - CEP ${addr.cep || ''}`
                        : 'Endereço não informado';

                      return (
                        <div key={ord.id} className={styles.docOrderCard}>
                          <div className={styles.docOrderCardHeader}>
                            <div className={styles.docOrderCardTitle}>
                              <strong>#{oIdx + 1} • PEDIDO #{ord.id.toUpperCase().startsWith('THR-') ? ord.id.toUpperCase() : ord.id.slice(0, 8).toUpperCase()}</strong>
                              <span>Data: {formatOrderDate(ord)}</span>
                            </div>
                            <div className={styles.docOrderCardClient}>
                              <span>Cliente: <strong>{ord.clientName || 'Cliente'}</strong></span>
                              <span>Contato: {ord.clientPhone || ord.clientEmail || 'N/A'}</span>
                              {!hideFinancials && (
                                <span className={styles.docOrderTotal}>Total: <strong>R$ {Number(ord.total || 0).toFixed(2)}</strong></span>
                              )}
                            </div>
                          </div>

                          <div className={styles.docOrderAddress}>
                            <MapPin size={11} />
                            <span><strong>Destino:</strong> {addrLine}</span>
                          </div>

                          <table className={styles.docOrderItemsTable}>
                            <thead>
                              <tr>
                                <th style={{ width: '40px', textAlign: 'center' }}>CHECK</th>
                                <th>ITEM / PEÇA</th>
                                <th>MODELAGEM</th>
                                <th>COR</th>
                                <th>TAMANHO</th>
                                <th style={{ textAlign: 'center', width: '60px' }}>QTD</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(ord.items || []).map((it, iIdx) => (
                                <tr key={iIdx}>
                                  <td style={{ textAlign: 'center' }}>
                                    <span className={styles.printCheckbox}>[ ]</span>
                                  </td>
                                  <td><strong>{it.name}</strong></td>
                                  <td>{formatFitBadgeLabel(it.fit) || 'Boxy Fit'}</td>
                                  <td><span className={styles.docColorTag}>{extractItemColor(it)}</span></td>
                                  <td><strong>{it.size}</strong></td>
                                  <td style={{ textAlign: 'center' }}><strong>{it.quantity} un.</strong></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                </div>


                {/* SEÇÃO 3: CONTROLE DE QUALIDADE & ASSINATURAS */}
                <div className={`${styles.docSection} ${styles.pageBreakAvoid}`}>
                  <div className={styles.docSectionTitle}>
                    <ShieldCheck size={14} />
                    <h4>3. PROTOCOLO DE CONFERÊNCIA & LIBERAÇÃO DA PRODUÇÃO</h4>
                  </div>
                  <div className={styles.docSignGrid}>
                    <div className={styles.docSignBox}>
                      <span className={styles.docSignTitle}>[ ] CORTE CONCLUÍDO</span>
                      <div className={styles.docSignLine}>Data: _____/_____/_________</div>
                      <div className={styles.docSignLine}>Responsável: _____________________________</div>
                    </div>

                    <div className={styles.docSignBox}>
                      <span className={styles.docSignTitle}>[ ] ESTAMPA / SILK OK</span>
                      <div className={styles.docSignLine}>Data: _____/_____/_________</div>
                      <div className={styles.docSignLine}>Responsável: _____________________________</div>
                    </div>

                    <div className={styles.docSignBox}>
                      <span className={styles.docSignTitle}>[ ] COSTURA & REVISÃO OK</span>
                      <div className={styles.docSignLine}>Data: _____/_____/_________</div>
                      <div className={styles.docSignLine}>Responsável: _____________________________</div>
                    </div>

                    <div className={styles.docSignBox}>
                      <span className={styles.docSignTitle}>[ ] EMBALAGEM & EXPEDIÇÃO</span>
                      <div className={styles.docSignLine}>Data: _____/_____/_________</div>
                      <div className={styles.docSignLine}>Responsável: _____________________________</div>
                    </div>
                  </div>
                </div>

                {/* RODAPÉ DO DOCUMENTO */}
                <div className={styles.docFooter}>
                  <span>THR33 STREETWEAR — DOCUMENTO INTERNO DE PRODUÇÃO E EXPEDIÇÃO</span>
                  <span>GERADO EM {productionSummary.generatedAt} • SISTEMA CMS THR33</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CmsPedidos;
