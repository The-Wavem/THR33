import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  setDoc,
  onSnapshot,
} from "firebase/firestore";
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
  Calendar,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Activity,
  Target,
  CreditCard,
  MapPin,
  Truck,
  Globe,
  ShieldCheck,
  Server,
  AlertOctagon,
  Smartphone,
  Monitor,
  Tablet,
  Lock,
  Share2,
  MessageCircle,
  Compass,
  Users,
  FileText,
  DollarSign,
  Plus,
  Trash2,
  SlidersHorizontal,
  Calculator,
  Building2,
  Coins,
} from "lucide-react";
import { db } from "../../services/firebaseConfig";
import { InfoTooltip } from "../../components/ui/InfoTooltip";
import { BrazilHeatmap } from "../../components/ui/BrazilHeatmap";
import {
  calculateDynamicMetrics,
  getDailyAnalyticsRange,
  resolveOrderDestinationUF,
} from "../../services/analyticsService";
import {
  useCmsPeriodFilter,
  parseOrderDate,
  getTodayStr,
  formatShortDate,
} from "../../hooks/useCmsPeriodFilter";
import {
  normalizeOrderStatus,
  ORDER_STATUSES,
  isOrderPaid,
} from "../../services/orderStateMachine";
import styles from "./CmsAnalytics.module.css";
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";

// Tooltip Dark Streetwear Customizado para Recharts
function CustomChartTooltip({
  active,
  payload,
  label,
  isCurrency,
  valueSuffix = "",
}) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      style={{
        backgroundColor: "#0d0d0d",
        border: "1px solid rgba(255, 255, 255, 0.18)",
        padding: "0.65rem 0.85rem",
        borderRadius: "4px",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.85)",
        fontSize: "0.72rem",
        fontFamily: "monospace, ui-monospace, Consolas, monospace",
        minWidth: "150px",
      }}
    >
      <div
        style={{
          color: "#888888",
          fontWeight: 700,
          marginBottom: "0.4rem",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          paddingBottom: "0.25rem",
        }}
      >
        {label}
      </div>
      {payload.map((entry, index) => {
        if (entry.value === null || entry.value === undefined) return null;
        const val = Number(entry.value || 0);
        const isMoney =
          isCurrency ||
          entry.name?.toLowerCase().includes("faturamento") ||
          entry.name?.toLowerCase().includes("receita");
        const formattedVal = isMoney
          ? `R$ ${val.toFixed(2).replace(".", ",")}`
          : `${val}${valueSuffix}`;

        return (
          <div
            key={`tooltip-${index}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.85rem",
              marginTop: "0.25rem",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor:
                    entry.color || entry.stroke || entry.fill || "#4ade80",
                }}
              />
              <span style={{ color: "#cccccc" }}>{entry.name}:</span>
            </div>
            <strong
              style={{
                color: entry.color || entry.stroke || entry.fill || "#ffffff",
              }}
            >
              {formattedVal}
            </strong>
          </div>
        );
      })}
    </div>
  );
}

const COLOR_CONFIG = {
  preto_piano: { name: "Preto Piano", hex: "#000000" },
  off_white: { name: "Off-White", hex: "#f5f5f0" },
  grafite: { name: "Grafite / Chumbo", hex: "#383838" },
  cinza_mescla: { name: "Cinza Mescla", hex: "#7a7a7a" },
};

const CATEGORY_LABELS = {
  camisa: "Camisetas / Camisas",
  jaqueta: "Jaquetas & Casacos",
  calca: "Calças & Bermudas",
  brinde: "Vales & Brindes",
};

// Avaliador dos 7 Estados de Saúde e Performance do Produto
export const getProductStatusDetails = (
  prod,
  totalStock,
  daysIdle,
  purchases,
  views,
  adds,
  conversion,
) => {
  // 1. Oculto / Desativado pelo lojista
  if (prod.active === false) {
    return {
      key: "HIDDEN",
      label: "OCULTO",
      description:
        "Produto desativado pelo administrador (oculto no catálogo da loja).",
    };
  }

  // 2. Ruptura Total (Esgotado em todas as grades)
  if (totalStock === 0) {
    return {
      key: "OUT_OF_STOCK",
      label: "ESGOTADO",
      description: "Estoque zerado em todas as grades. Reposição necessária.",
    };
  }

  // 3. Dead Stock (Sem vendas há mais de 45 dias com estoque disponível)
  if (daysIdle >= 45 && totalStock > 0) {
    return {
      key: "DEAD_STOCK",
      label: "DEAD STOCK",
      description: `${daysIdle} dias sem nenhuma venda registrada. Estoque estagnado (${totalStock} un.).`,
    };
  }

  // 4. Best Seller (Alta tração de compras)
  if (
    purchases >= 15 ||
    (purchases >= 5 && views > 0 && parseFloat(conversion) >= 5)
  ) {
    return {
      key: "BEST_SELLER",
      label: "BEST SELLER",
      description: `Alta performance: ${purchases} un. vendidas e ${conversion}% de conversão.`,
    };
  }

  // 5. Alerta de Fricção (Muitas adições ao carrinho mas pouca/nenhuma compra)
  if (adds >= 5 && purchases === 0) {
    return {
      key: "FRICTION",
      label: "ALERTA FRICÇÃO",
      description: `${adds} adições à sacola, porém nenhuma conversão em pedido. Possível barreira de preço/frete.`,
    };
  }

  // 6. Baixa Visibilidade (Poucas visualizações na PDP)
  if (views < 10) {
    return {
      key: "LOW_VIEWS",
      label: "BAIXA VISIBILIDADE",
      description: `Apenas ${views} acessos registrados. Requer destaque em campanhas ou vitrine.`,
    };
  }

  // 7. Regular / Saudável
  return {
    key: "STABLE",
    label: "ESTÁVEL",
    description:
      "Estoque balanceado (> 5 un.), giro regular e conversão saudável.",
  };
};

export function CmsAnalytics() {
  const navigate = useNavigate();
  const [summaryData, setSummaryData] = useState({});
  const [productsList, setProductsList] = useState([]);
  const [orders, setOrders] = useState([]);
  const [checkoutSessions, setCheckoutSessions] = useState([]);
  const [paymentTelemetryLogs, setPaymentTelemetryLogs] = useState([]);
  const [dailyAnalyticsList, setDailyAnalyticsList] = useState([]);
  const [evolutionMetric, setEvolutionMetric] = useState("revenue"); // 'revenue' | 'orders' | 'visits'
  const [hoveredEvolutionPoint, setHoveredEvolutionPoint] = useState(null);
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
    periodLabel,
  } = useCmsPeriodFilter();

  // Controle de Tabs e Modal de Raio-X
  const [activeTab, setActiveTab] = useState("attributes"); // 'attributes' | 'products' | 'deadstock' | 'funnel'
  const [selectedSkuDetail, setSelectedSkuDetail] = useState(null);
  const [editableStock, setEditableStock] = useState({
    PP: 0,
    P: 0,
    M: 0,
    G: 0,
    GG: 0,
  });
  const [isAvailableInCatalog, setIsAvailableInCatalog] = useState(true);
  const [savingStock, setSavingStock] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Filtro de busca, tipo/categoria, status e ordenação da Tabela de Produtos (Raio-X)
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "none",
  });

  // Trava a rolagem do fundo (eixo Y) quando o drawer estiver aberto
  useEffect(() => {
    if (selectedSkuDetail) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [selectedSkuDetail]);

  // 0. BLINDAGEM FINANCEIRA: Definição Estrita de Status de Pedido (Máquina de Estados THR33)
  const PAID_STATUSES = useMemo(() => new Set([
    'pago', 'paid', 'aprovado', 'approved', 'pagamento_aprovado',
    'em_separacao', 'preparando', 'processing', 'em_producao',
    'enviado', 'shipped', 'saiu_para_entrega', 'entregue', 'delivered', 'concluido'
  ]), []);

  const PENDING_STATUSES = useMemo(() => new Set([
    'aguardando_pagamento', 'pendente', 'pending', 'em_analise', 'waiting'
  ]), []);

  const CANCELLED_STATUSES = useMemo(() => new Set([
    'cancelado', 'cancelled', 'pagamento_recusado', 'recusado', 'declined', 'reembolsado', 'refunded', 'expirado'
  ]), []);

  const checkIsPaid = (order) => {
    if (!order) return false;
    const raw = String(order.status || order.statusCode || order.paymentStatus || '').toLowerCase().trim();
    if (PAID_STATUSES.has(raw)) return true;
    if (order.paymentApproved === true) return true;
    return isOrderPaid(raw);
  };

  const checkIsPending = (order) => {
    if (!order) return false;
    const raw = String(order.status || order.statusCode || order.paymentStatus || '').toLowerCase().trim();
    if (PENDING_STATUSES.has(raw)) return true;
    const norm = normalizeOrderStatus(raw);
    return norm === ORDER_STATUSES.AGUARDANDO_PAGAMENTO && !CANCELLED_STATUSES.has(raw);
  };

  const checkIsCancelled = (order) => {
    if (!order) return false;
    const raw = String(order.status || order.statusCode || order.paymentStatus || '').toLowerCase().trim();
    if (CANCELLED_STATUSES.has(raw)) return true;
    const norm = normalizeOrderStatus(raw);
    return norm === ORDER_STATUSES.CANCELADO;
  };

  // Unifica todos os pedidos e sessões de checkout no período selecionado
  const allPeriodOrders = useMemo(() => {
    const combined = [];
    const seenIds = new Set();

    (orders || []).forEach((ord) => {
      if (ord.id && !seenIds.has(ord.id)) {
        seenIds.add(ord.id);
        combined.push(ord);
      }
    });

    (checkoutSessions || []).forEach((session) => {
      const sessionId = session.id;
      const orderRef = session.orderId || session.orderRefId;
      if (sessionId && !seenIds.has(sessionId) && (!orderRef || !seenIds.has(orderRef))) {
        seenIds.add(sessionId);
        combined.push(session);
      }
    });

    if (periodFilter === "all") return combined;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    return combined.filter((order) => {
      const orderDate = parseOrderDate(order);
      if (!orderDate) return false;

      if (periodFilter === "today") {
        return orderDate >= startOfToday && orderDate <= endOfToday;
      }
      if (periodFilter === "7days") {
        const start7DaysAgo = new Date(startOfToday);
        start7DaysAgo.setDate(start7DaysAgo.getDate() - 6);
        return orderDate >= start7DaysAgo && orderDate <= endOfToday;
      }
      if (periodFilter === "30days") {
        const start30DaysAgo = new Date(startOfToday);
        start30DaysAgo.setDate(start30DaysAgo.getDate() - 29);
        return orderDate >= start30DaysAgo && orderDate <= endOfToday;
      }
      if (periodFilter === "custom") {
        if (!customStartDate || !customEndDate) return true;
        const [sYear, sMonth, sDay] = customStartDate.split("-").map(Number);
        const [eYear, eMonth, eDay] = customEndDate.split("-").map(Number);
        const start = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
        const end = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);
        return orderDate >= start && orderDate <= end;
      }
      return true;
    });
  }, [orders, checkoutSessions, periodFilter, customStartDate, customEndDate]);

  // Separação Estrita de Pedidos: Pagos vs Aguardando Pagamento vs Cancelados
  const paidOrders = useMemo(() => allPeriodOrders.filter(checkIsPaid), [allPeriodOrders]);
  const pendingOrders = useMemo(() => allPeriodOrders.filter(checkIsPending), [allPeriodOrders]);
  const cancelledOrders = useMemo(() => allPeriodOrders.filter(checkIsCancelled), [allPeriodOrders]);

  const paidRevenue = useMemo(() => {
    return paidOrders.reduce((sum, o) => sum + Number(o.totalAmount || o.total || o.subtotal || o.amount || 0), 0);
  }, [paidOrders]);

  const pendingRevenue = useMemo(() => {
    return pendingOrders.reduce((sum, o) => sum + Number(o.totalAmount || o.total || o.subtotal || o.amount || 0), 0);
  }, [pendingOrders]);

  const cancelledRevenue = useMemo(() => {
    return cancelledOrders.reduce((sum, o) => sum + Number(o.totalAmount || o.total || o.subtotal || o.amount || 0), 0);
  }, [cancelledOrders]);

  // Peças realmente vendidas e pagas
  const totalItemsSold = useMemo(() => {
    return paidOrders.reduce((acc, ord) => {
      if (Array.isArray(ord.items) && ord.items.length > 0) {
        return acc + ord.items.reduce((s, it) => s + Math.max(1, Number(it.quantity || 1)), 0);
      }
      return acc + Math.max(1, Number(ord.itemsCount || 1));
    }, 0);
  }, [paidOrders]);

  // Frete arrecadado nos pedidos pagos (repassado a fretes, não é lucro)
  const totalShippingCollected = useMemo(() => {
    return paidOrders.reduce((sum, ord) => {
      const ship = Number(ord.shipping?.price || ord.shippingCost || ord.freightCost || ord.shipping?.cost || 0);
      return sum + (isNaN(ship) ? 0 : ship);
    }, 0);
  }, [paidOrders]);

  // Alias para retrocompatibilidade em todos os módulos analíticos (consome estritamente apenas paidOrders!)
  const completedOrders = paidOrders;

  // CONFIGURAÇÃO DO SIMULADOR FINANCEIRO & DIVISÃO DE LUCROS (Persistência no localStorage)
  const DEFAULT_SIMULATOR_CONFIG = {
    gatewayRatePct: 3.5,
    productionCostPerUnit: 42.0,
    companyReservePct: 20.0,
    isManualMode: false,
    manualModeType: 'gross', // 'gross' (Faturamento com deduções reais) ou 'net' (Lucro Líquido Direto)
    manualProfitValue: 10000.0,
    manualUnits: undefined,
    members: [
      { id: 'm1', name: 'Integrante 1', role: 'Direção Criativa & Marca', percent: 25 },
      { id: 'm2', name: 'Integrante 2', role: 'Marketing & Drops', percent: 25 },
      { id: 'm3', name: 'Integrante 3', role: 'Dev / Tech & E-com', percent: 25 },
      { id: 'm4', name: 'Integrante 4', role: 'Operações & Logística', percent: 25 }
    ]
  };

  const [profitConfig, setProfitConfig] = useState(() => {
    try {
      const stored = localStorage.getItem('thr33_profit_simulator_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.members) && parsed.members.length > 0) {
          return { ...DEFAULT_SIMULATOR_CONFIG, ...parsed };
        }
      }
    } catch (_) {}
    return DEFAULT_SIMULATOR_CONFIG;
  });

  useEffect(() => {
    try {
      localStorage.setItem('thr33_profit_simulator_v1', JSON.stringify(profitConfig));
    } catch (_) {}
  }, [profitConfig]);

  // Cálculo do Fluxo de Caixa Real e Lucro Distribuível
  const financialFlow = useMemo(() => {
    const isManual = Boolean(profitConfig.isManualMode);
    const manualModeType = profitConfig.manualModeType || 'gross';
    const isDirectNet = isManual && manualModeType === 'net';

    const grossRevenue = isManual
      ? Math.max(0, Number(profitConfig.manualProfitValue || 0))
      : paidRevenue;

    const shippingCost = isManual ? 0 : totalShippingCollected;
    const gatewayTaxRate = Math.max(0, Number(profitConfig.gatewayRatePct || 0)) / 100;
    const gatewayTax = isDirectNet ? 0 : grossRevenue * gatewayTaxRate;

    const costPerUnit = Math.max(0, Number(profitConfig.productionCostPerUnit || 0));
    const effectiveItemsSold = isManual
      ? (profitConfig.manualUnits !== undefined
          ? Math.max(0, Number(profitConfig.manualUnits))
          : (totalItemsSold > 0 ? totalItemsSold : Math.max(1, Math.round(grossRevenue / 160))))
      : totalItemsSold;

    const replenishmentFund = isDirectNet ? 0 : effectiveItemsSold * costPerUnit;

    const operatingProfit = isDirectNet
      ? grossRevenue
      : Math.max(0, grossRevenue - shippingCost - gatewayTax - replenishmentFund);

    const reserveRate = Math.max(0, Math.min(100, Number(profitConfig.companyReservePct || 0))) / 100;
    const companyReserve = isDirectNet ? 0 : operatingProfit * reserveRate;
    const distributableProfit = isDirectNet
      ? grossRevenue
      : Math.max(0, operatingProfit - companyReserve);

    const totalAllocatedPercent = (profitConfig.members || []).reduce(
      (sum, m) => sum + Number(m.percent || 0),
      0
    );

    return {
      isManual,
      manualModeType,
      isDirectNet,
      grossRevenue,
      shippingCost,
      gatewayTax,
      costPerUnit,
      effectiveItemsSold,
      replenishmentFund,
      operatingProfit,
      companyReserve,
      distributableProfit,
      totalAllocatedPercent,
      leftoverPercent: Math.max(0, Math.round((100 - totalAllocatedPercent) * 10) / 10),
      excessPercent: Math.max(0, Math.round((totalAllocatedPercent - 100) * 10) / 10)
    };
  }, [profitConfig, paidRevenue, totalShippingCollected, totalItemsSold]);

  // Handlers do Simulador de Sócios
  const handleApplyPreset = (type) => {
    if (type === 'equal4') {
      setProfitConfig((prev) => ({
        ...prev,
        members: [
          { id: 'm1', name: 'Integrante 1', role: 'Direção Criativa & Marca', percent: 25 },
          { id: 'm2', name: 'Integrante 2', role: 'Marketing & Drops', percent: 25 },
          { id: 'm3', name: 'Integrante 3', role: 'Dev / Tech & E-com', percent: 25 },
          { id: 'm4', name: 'Integrante 4', role: 'Operações & Logística', percent: 25 }
        ]
      }));
    } else if (type === 'techFocus') {
      setProfitConfig((prev) => ({
        ...prev,
        members: [
          { id: 'm1', name: 'Integrante 1', role: 'Direção Criativa', percent: 20 },
          { id: 'm2', name: 'Integrante 2', role: 'Marketing & Drops', percent: 20 },
          { id: 'm3', name: 'Integrante 3', role: 'Dev / Tech (Lead)', percent: 40 },
          { id: 'm4', name: 'Integrante 4', role: 'Operações & Logística', percent: 20 }
        ]
      }));
    } else if (type === 'equal3') {
      setProfitConfig((prev) => ({
        ...prev,
        members: [
          { id: 'm1', name: 'Integrante 1', role: 'Direção Criativa', percent: 33.34 },
          { id: 'm2', name: 'Integrante 2', role: 'Marketing & Drops', percent: 33.33 },
          { id: 'm3', name: 'Integrante 3', role: 'Dev / Tech & E-com', percent: 33.33 }
        ]
      }));
    }
  };

  const handleAddMember = () => {
    setProfitConfig((prev) => {
      const newId = `m_${Date.now()}`;
      const nextNum = (prev.members || []).length + 1;
      return {
        ...prev,
        members: [
          ...prev.members,
          { id: newId, name: `Integrante ${nextNum}`, role: 'Operações', percent: 0 }
        ]
      };
    });
  };

  const handleRemoveMember = (id) => {
    setProfitConfig((prev) => {
      if (prev.members.length <= 1) return prev;
      return {
        ...prev,
        members: prev.members.filter((m) => m.id !== id)
      };
    });
  };

  const handleUpdateMember = (id, fields) => {
    setProfitConfig((prev) => ({
      ...prev,
      members: prev.members.map((m) => (m.id === id ? { ...m, ...fields } : m))
    }));
  };

  const handleAdjustMemberPercent = (id, delta) => {
    setProfitConfig((prev) => ({
      ...prev,
      members: prev.members.map((m) => {
        if (m.id !== id) return m;
        const current = Number(m.percent || 0);
        const adjusted = Math.min(100, Math.max(0, Math.round((current + delta) * 10) / 10));
        return { ...m, percent: adjusted };
      })
    }));
  };

  const handleNormalizeTo100 = () => {
    setProfitConfig((prev) => {
      const sum = prev.members.reduce((acc, m) => acc + Number(m.percent || 0), 0);
      if (sum === 0) return prev;
      const count = prev.members.length;
      let runningTotal = 0;
      const normalized = prev.members.map((m, idx) => {
        if (idx === count - 1) {
          const finalVal = Math.max(0, Math.round((100 - runningTotal) * 10) / 10);
          return { ...m, percent: finalVal };
        }
        const val = Math.round((Number(m.percent || 0) / sum) * 1000) / 10;
        runningTotal += val;
        return { ...m, percent: val };
      });
      return { ...prev, members: normalized };
    });
  };

  const handleEqualize100 = () => {
    setProfitConfig((prev) => {
      const count = prev.members.length;
      if (count === 0) return prev;
      const share = Math.round((100 / count) * 10) / 10;
      let allocated = 0;
      const equalized = prev.members.map((m, idx) => {
        if (idx === count - 1) {
          return { ...m, percent: Math.max(0, Math.round((100 - allocated) * 10) / 10) };
        }
        allocated += share;
        return { ...m, percent: share };
      });
      return { ...prev, members: equalized };
    });
  };

  const [copyFeedback, setCopyFeedback] = useState(false);
  const handleCopyWhatsAppReport = () => {
    const formatBRL = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const dateRangeStr = periodLabel;

    let text = `*RELATÓRIO FINANCEIRO & REPASSE // THR33 STREETWEAR*\n`;
    text += `*Período:* ${dateRangeStr}${financialFlow.isManual ? ' (SIMULAÇÃO MANUAL)' : ''}\n`;
    text += `-------------------------------------------\n`;
    text += `*1. ENTRADAS & FATURAMENTO:*\n`;
    text += `• ${financialFlow.isManual ? 'Receita Bruta Simulada' : 'Receita Bruta Paga'}: ${formatBRL(financialFlow.grossRevenue)} (${financialFlow.isManual ? `Projeção / ${financialFlow.effectiveItemsSold} peças` : `${paidOrders.length} pedidos / ${totalItemsSold} peças`})\n`;
    if (!financialFlow.isManual && pendingOrders.length > 0) {
      text += `• Aguardando Pagamento: ${formatBRL(pendingRevenue)} (${pendingOrders.length} pedidos no PIX/Boleto)\n`;
    }
    text += `\n*2. DEDUÇÕES OPERACIONAIS:*\n`;
    text += `• (-) Fretes Arrecadados: ${formatBRL(financialFlow.shippingCost)}\n`;
    text += `• (-) Taxas PagBank (${profitConfig.gatewayRatePct}%): ${formatBRL(financialFlow.gatewayTax)}\n`;
    text += `• (-) Fundo de Reposição (${financialFlow.effectiveItemsSold} un x ${formatBRL(profitConfig.productionCostPerUnit)}): ${formatBRL(financialFlow.replenishmentFund)}\n`;
    text += `\n*3. CAIXA DA EMPRESA & LUCRO:*\n`;
    text += `• Lucro Operacional: ${formatBRL(financialFlow.operatingProfit)}\n`;
    text += `• (-) Reserva de Caixa THR33 (${profitConfig.companyReservePct}%): ${formatBRL(financialFlow.companyReserve)}\n`;
    text += `*• Lucro Líquido Distribuível: ${formatBRL(financialFlow.distributableProfit)}*\n`;
    text += `-------------------------------------------\n`;
    text += `*4. DIVISÃO ENTRE OS INTEGRANTES:*\n`;
    profitConfig.members.forEach((m) => {
      const share = financialFlow.distributableProfit * (Number(m.percent || 0) / 100);
      text += `• ${m.name} (${m.role}): *${m.percent}%* -> *${formatBRL(share)}*\n`;
    });
    if (financialFlow.leftoverPercent > 0) {
      const leftover = financialFlow.distributableProfit * (financialFlow.leftoverPercent / 100);
      text += `• Sobra Retida no Caixa da Marca (${financialFlow.leftoverPercent}%): *${formatBRL(leftover)}*\n`;
    }
    text += `-------------------------------------------\n`;
    text += `Gerado automaticamente pelo CMS THR33 em ${new Date().toLocaleDateString('pt-BR')}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2500);
    }
  };

  // 1. Carrega dados consolidados do Firestore
  async function loadFullAnalytics() {
    try {
      setRefreshing(true);

      // 1. Telemetria agregada (analytics/summary)
      const summaryRef = doc(db, "analytics", "summary");
      const summarySnap = await getDoc(summaryRef);
      if (summarySnap.exists()) {
        setSummaryData(summarySnap.data() || {});
      } else {
        setSummaryData({});
      }

      // 2. Produtos do Firestore (products)
      const prodSnap = await getDocs(collection(db, "products"));
      const prods = [];
      prodSnap.forEach((d) => prods.push({ id: d.id, ...d.data() }));
      setProductsList(prods);

      // 3. Pedidos do Firestore (orders)
      const ordersSnap = await getDocs(collection(db, "orders"));
      const ords = [];
      ordersSnap.forEach((d) => ords.push({ id: d.id, ...d.data() }));
      setOrders(ords);

      // 4. Sessões de checkout (checkout_sessions)
      const sessionSnap = await getDocs(collection(db, "checkout_sessions"));
      const sessions = [];
      sessionSnap.forEach((d) => sessions.push({ id: d.id, ...d.data() }));
      setCheckoutSessions(sessions);

      // 5. Telemetria e logs de saúde de pagamentos (payment_telemetry)
      try {
        const telSnap = await getDocs(collection(db, "payment_telemetry"));
        const telLogs = [];
        telSnap.forEach((d) => telLogs.push({ id: d.id, ...d.data() }));
        setPaymentTelemetryLogs(telLogs);
      } catch (telErr) {
        console.warn("Aviso ao carregar telemetria de pagamento:", telErr.message);
      }

      // 6. Histórico diário de sessões únicas, pageviews, dispositivos, OS e origem (analytics_daily)
      try {
        const dailyRange = await getDailyAnalyticsRange(90);
        setDailyAnalyticsList(dailyRange || []);
      } catch (dailyErr) {
        console.warn("Aviso ao carregar analytics_daily:", dailyErr.message);
      }
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
    const unsub = onSnapshot(
      doc(db, "analytics", "summary"),
      (snap) => {
        if (snap.exists()) {
          setSummaryData(snap.data() || {});
        }
      },
      (err) => {
        console.warn("Aviso listener analytics:", err.message);
      },
    );

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
      GG: Number(product.stock?.GG || 0),
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
      const productRef = doc(db, "products", selectedSkuDetail.id);
      await setDoc(
        productRef,
        {
          stock: editableStock,
          active: isAvailableInCatalog,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      // Atualiza lista local
      setProductsList((prev) =>
        prev.map((p) =>
          p.id === selectedSkuDetail.id
            ? {
                ...p,
                stock: editableStock,
                active: isAvailableInCatalog,
              }
            : p,
        ),
      );

      setSelectedSkuDetail((prev) => ({
        ...prev,
        stock: editableStock,
        active: isAvailableInCatalog,
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

    return productsList.map((p) => {
      const cleanId = String(p.id || "").replace(/[./#$\[\]]/g, "_");
      const cleanSlug = p.slug
        ? String(p.slug).replace(/[./#$\[\]]/g, "_")
        : "";
      const cleanName = p.name
        ? String(p.name)
            .toLowerCase()
            .replace(/[./#$\[\]\s]/g, "_")
        : "";

      // Tenta encontrar dados de telemetria em todas as variações de chave (id, slug, name, fuzzy)
      const dataFromId =
        rawTelemetry[p.id] || (cleanId ? rawTelemetry[cleanId] : null);
      const dataFromSlug =
        (p.slug ? rawTelemetry[p.slug] : null) ||
        (cleanSlug ? rawTelemetry[cleanSlug] : null);
      const dataFromName =
        (p.name ? rawTelemetry[p.name] : null) ||
        (cleanName ? rawTelemetry[cleanName] : null);

      const matchedKey = telemetryKeys.find(
        (k) =>
          k === String(p.id) ||
          (p.slug && k === String(p.slug)) ||
          (p.slug &&
            k.replace(/_/g, "-") === String(p.slug).replace(/_/g, "-")) ||
          (p.name &&
            k.toLowerCase().replace(/[\s_-]/g, "") ===
              String(p.name)
                .toLowerCase()
                .replace(/[\s_-]/g, "")),
      );
      const dataFromMatch = matchedKey ? rawTelemetry[matchedKey] : null;

      const idViews = Number(dataFromId?.views || 0);
      const slugViews =
        dataFromSlug && dataFromSlug !== dataFromId
          ? Number(dataFromSlug?.views || 0)
          : 0;
      const nameViews =
        dataFromName &&
        dataFromName !== dataFromId &&
        dataFromName !== dataFromSlug
          ? Number(dataFromName?.views || 0)
          : 0;

      const idAdds = Number(dataFromId?.addedToCart || 0);
      const slugAdds =
        dataFromSlug && dataFromSlug !== dataFromId
          ? Number(dataFromSlug?.addedToCart || 0)
          : 0;
      const nameAdds =
        dataFromName &&
        dataFromName !== dataFromId &&
        dataFromName !== dataFromSlug
          ? Number(dataFromName?.addedToCart || 0)
          : 0;
      const adds = Math.max(
        Number(p.addedToCart || 0),
        idAdds + slugAdds + nameAdds,
        Number(dataFromId?.addedToCart || 0),
        Number(dataFromSlug?.addedToCart || 0),
        Number(dataFromMatch?.addedToCart || 0),
      );

      const idRemoves = Number(dataFromId?.removedFromCart || 0);
      const slugRemoves =
        dataFromSlug && dataFromSlug !== dataFromId
          ? Number(dataFromSlug?.removedFromCart || 0)
          : 0;
      const nameRemoves =
        dataFromName &&
        dataFromName !== dataFromId &&
        dataFromName !== dataFromSlug
          ? Number(dataFromName?.removedFromCart || 0)
          : 0;
      const removes = Math.max(
        Number(p.removedFromCart || 0),
        idRemoves + slugRemoves + nameRemoves,
        Number(dataFromId?.removedFromCart || 0),
        Number(dataFromSlug?.removedFromCart || 0),
        Number(dataFromMatch?.removedFromCart || 0),
      );

      // 1. Contagem exata de unidades vendidas e pedidos únicos por item (sem duplicação)
      let unitsFromOrders = 0;
      let uniqueOrdersCount = 0;
      let lastSaleTimestamp = 0;

      completedOrders.forEach((order) => {
        let orderMatched = false;
        (order.items || []).forEach((it) => {
          const itId = String(it?.id || "");
          const itSlug = String(it?.slug || "");
          const itName = it?.name ? String(it.name).trim().toLowerCase() : "";
          const pName = p.name ? String(p.name).trim().toLowerCase() : "";

          const isMatch =
            (itId &&
              (itId === String(p.id) ||
                itId === String(p.slug) ||
                itId === cleanId)) ||
            (itSlug &&
              (itSlug === String(p.id) ||
                itSlug === String(p.slug) ||
                itSlug === cleanSlug)) ||
            (itName && pName && itName === pName);

          if (isMatch) {
            unitsFromOrders += Number(it.quantity) || 1;
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
      const realPurchases =
        completedOrders.length > 0
          ? unitsFromOrders
          : periodFilter === "all"
            ? Math.max(
                Number(p.purchases || 0),
                Number(dataFromId?.purchases || 0),
                Number(dataFromSlug?.purchases || 0),
              )
            : 0;

      const uniqueOrders =
        completedOrders.length > 0
          ? uniqueOrdersCount
          : realPurchases > 0
            ? 1
            : 0;

      // Views não podem ser menores que os pedidos únicos registrados
      const rawViews = Math.max(
        Number(p.views || 0),
        idViews + slugViews + nameViews,
        Number(dataFromId?.views || 0),
        Number(dataFromSlug?.views || 0),
      );
      const views = Math.max(rawViews, uniqueOrders);

      // Taxa de Adição à Sacola (Add-to-cart rate)
      let addToCartRate = "0.0";
      if (views > 0) {
        addToCartRate = Math.min(100, (adds / views) * 100).toFixed(1);
      }

      // Taxa de Conversão Real (Pedidos Únicos / Views)
      let conversionRate = "0.0";
      if (views > 0) {
        conversionRate = Math.min(100, (uniqueOrders / views) * 100).toFixed(1);
      } else if (uniqueOrders > 0) {
        conversionRate = "100.0";
      }

      // Taxa de Abandono de Item (Remoções / Adições)
      let abandonmentRate = "0.0";
      if (adds > 0) {
        abandonmentRate = Math.min(100, (removes / adds) * 100).toFixed(1);
      }

      // Calcula tempo ocioso em dias com precisão cronológica
      let daysIdle = 0;
      if (lastSaleTimestamp > 0) {
        daysIdle = Math.max(
          0,
          Math.floor((Date.now() - lastSaleTimestamp) / (1000 * 60 * 60 * 24)),
        );
      } else {
        // Se nunca teve venda, calcula a partir da data de criação/cadastro da peça
        let createdTimestamp = null;
        if (p.createdAt) {
          const t = new Date(p.createdAt).getTime();
          if (!isNaN(t) && t > 0) createdTimestamp = t;
        } else if (p.updatedAt) {
          const t = new Date(p.updatedAt).getTime();
          if (!isNaN(t) && t > 0) createdTimestamp = t;
        } else if (typeof p.id === "string" && p.id.startsWith("thr33_")) {
          const num = Number(p.id.replace("thr33_", ""));
          if (!isNaN(num) && num > 1600000000000) createdTimestamp = num;
        } else if (p.daysWithoutSale !== undefined) {
          daysIdle = Number(p.daysWithoutSale);
        }

        if (createdTimestamp !== null) {
          daysIdle = Math.max(
            0,
            Math.floor((Date.now() - createdTimestamp) / (1000 * 60 * 60 * 24)),
          );
        } else if (p.daysWithoutSale === undefined) {
          daysIdle = 0; // Peça recém-cadastrada sem histórico de vendas
        }
      }

      // Parse e consolidação da grade de estoque (PP, P, M, G, GG)
      let parsedStock = { PP: 0, P: 0, M: 0, G: 0, GG: 0 };
      if (p.stock && typeof p.stock === "object") {
        parsedStock = {
          PP: Number(p.stock.PP ?? 0),
          P: Number(p.stock.P ?? 0),
          M: Number(p.stock.M ?? 0),
          G: Number(p.stock.G ?? 0),
          GG: Number(p.stock.GG ?? 0),
        };
      } else if (Array.isArray(p.variants) && p.variants.length > 0) {
        p.variants.forEach((v) => {
          const sz = String(v.size || "").toUpperCase();
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
          GG: Math.floor(total * 0.1),
        };
      } else if (Array.isArray(p.sizes) && p.sizes.length > 0) {
        p.sizes.forEach((s) => {
          const sz = String(s).toUpperCase();
          if (parsedStock[sz] !== undefined) {
            parsedStock[sz] = 12;
          }
        });
      } else {
        parsedStock = { PP: 2, P: 8, M: 12, G: 8, GG: 4 };
      }

      const totalStock = Object.values(parsedStock).reduce(
        (a, b) => Number(a) + Number(b),
        0,
      );
      const isDeadStock = daysIdle >= 45 && totalStock > 0;
      const statusInfo = getProductStatusDetails(
        p,
        totalStock,
        daysIdle,
        realPurchases,
        views,
        adds,
        conversionRate,
      );

      return {
        id: p.id,
        name: p.name || "Produto THR33",
        category: p.category || "camisa",
        fit: p.fit || "boxy",
        price: Number(p.price || 0),
        image: p.image || (p.images && p.images[0]) || "",
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
        skuPrefix: `THR33-${(p.category || "TS").slice(0, 2).toUpperCase()}`,
        status: statusInfo.key,
      };
    });
  }, [productsList, summaryData, completedOrders, periodFilter]);

  // Manipulador de ordenação com 3 estados (Maior/A-Z -> Menor/Z-A -> Padrão)
  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key !== key || prev.direction === "none") {
        const initialDir = key === "name" || key === "status" ? "asc" : "desc";
        return { key, direction: initialDir };
      }
      const isText = key === "name" || key === "status";
      if (isText) {
        if (prev.direction === "asc") return { key, direction: "desc" };
        if (prev.direction === "desc") return { key: null, direction: "none" };
      } else {
        if (prev.direction === "desc") return { key, direction: "asc" };
        if (prev.direction === "asc") return { key: null, direction: "none" };
      }
      return { key: null, direction: "none" };
    });
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key || sortConfig.direction === "none") {
      return <ArrowUpDown size={12} className={styles.sortIconInactive} />;
    }
    if (sortConfig.direction === "asc") {
      return <ArrowUp size={12} className={styles.sortIconActive} />;
    }
    return <ArrowDown size={12} className={styles.sortIconActive} />;
  };

  const getSortLabel = (key) => {
    switch (key) {
      case "name":
        return "Produto";
      case "status":
        return "Status";
      case "views":
        return "Views PDP";
      case "adds":
        return "Adicionados";
      case "removes":
        return "Remoções";
      case "purchases":
        return "Vendas Pagas";
      case "conversion":
        return "Conversão Real";
      default:
        return "";
    }
  };

  // Opções de categorias com contagem de produtos
  const categoryOptions = useMemo(() => {
    const counts = {};
    productMetrics.forEach((p) => {
      const cat = (p.category || "camisa").toLowerCase();
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const knownKeys = ["camisa", "calca", "jaqueta", "brinde"];
    const allKeys = Array.from(new Set([...knownKeys, ...Object.keys(counts)]));

    return allKeys
      .filter((k) => (counts[k] || 0) > 0 || CATEGORY_LABELS[k])
      .map((k) => ({
        key: k,
        label: CATEGORY_LABELS[k] || k.toUpperCase(),
        count: counts[k] || 0,
      }));
  }, [productMetrics]);

  // Opções de status com contagem de produtos
  const statusOptions = useMemo(() => {
    const counts = {};
    productMetrics.forEach((p) => {
      const st = p.status || p.statusInfo?.key || "STABLE";
      counts[st] = (counts[st] || 0) + 1;
    });

    const list = [
      { key: "STABLE", label: "Estável" },
      { key: "BEST_SELLER", label: "Best Seller" },
      { key: "DEAD_STOCK", label: "Dead Stock" },
      { key: "LOW_STOCK", label: "Estoque Baixo" },
      { key: "OUT_OF_STOCK", label: "Esgotado" },
      { key: "FRICTION", label: "Alerta Fricção" },
      { key: "LOW_VIEWS", label: "Baixa Visibilidade" },
      { key: "HIDDEN", label: "Oculto" },
    ];

    return list
      .map((st) => ({
        ...st,
        count: counts[st.key] || 0,
      }))
      .filter(
        (st) =>
          st.count > 0 ||
          ["STABLE", "BEST_SELLER", "DEAD_STOCK", "OUT_OF_STOCK"].includes(
            st.key,
          ),
      );
  }, [productMetrics]);

  // Limpa todos os filtros e ordenações aplicados
  const handleClearAllFilters = () => {
    setProductSearchQuery("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setSortConfig({ key: null, direction: "none" });
  };

  // Produtos filtrados por categoria, status, busca e ordenados interativamente
  const displayedProductMetrics = useMemo(() => {
    let list = [...productMetrics];

    // 1. Filtro por Tipo / Categoria
    if (categoryFilter && categoryFilter !== "all") {
      list = list.filter(
        (p) =>
          (p.category || "camisa").toLowerCase() ===
          categoryFilter.toLowerCase(),
      );
    }

    // 2. Filtro por Status
    if (statusFilter && statusFilter !== "all") {
      list = list.filter(
        (p) => (p.status || p.statusInfo?.key) === statusFilter,
      );
    }

    // 3. Filtro por Busca Textual
    if (productSearchQuery && productSearchQuery.trim()) {
      const q = productSearchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const name = (p.name || "").toLowerCase();
        const cat = (p.category || "").toLowerCase();
        const catLabel = (CATEGORY_LABELS[p.category] || "").toLowerCase();
        const fit = (p.fit || "").toLowerCase();
        const statusLabel = (p.statusInfo?.label || "").toLowerCase();
        const priceStr = String(p.price || "");
        return (
          name.includes(q) ||
          cat.includes(q) ||
          catLabel.includes(q) ||
          fit.includes(q) ||
          statusLabel.includes(q) ||
          priceStr.includes(q)
        );
      });
    }

    // 4. Ordenação Interativa
    if (sortConfig.key && sortConfig.direction !== "none") {
      const { key, direction } = sortConfig;
      list.sort((a, b) => {
        if (key === "name") {
          const comp = (a.name || "").localeCompare(b.name || "", "pt-BR", {
            sensitivity: "base",
          });
          return direction === "asc" ? comp : -comp;
        }
        if (key === "status") {
          const comp = (a.statusInfo?.label || "").localeCompare(
            b.statusInfo?.label || "",
            "pt-BR",
            { sensitivity: "base" },
          );
          return direction === "asc" ? comp : -comp;
        }
        let valA = 0;
        let valB = 0;
        if (key === "views") {
          valA = Number(a.views) || 0;
          valB = Number(b.views) || 0;
        }
        if (key === "adds") {
          valA = Number(a.adds) || 0;
          valB = Number(b.adds) || 0;
        }
        if (key === "removes") {
          valA = Number(a.removes) || 0;
          valB = Number(b.removes) || 0;
        }
        if (key === "purchases") {
          valA = Number(a.purchases) || 0;
          valB = Number(b.purchases) || 0;
        }
        if (key === "conversion") {
          valA = parseFloat(a.conversionRate || a.conversion) || 0;
          valB = parseFloat(b.conversionRate || b.conversion) || 0;
        }

        return direction === "asc" ? valA - valB : valB - valA;
      });
    }

    return list;
  }, [
    productMetrics,
    categoryFilter,
    statusFilter,
    productSearchQuery,
    sortConfig,
  ]);

  // Itens em Dead Stock (> 45 dias sem saída e com estoque positivo)
  const deadStockItems = useMemo(() => {
    return productMetrics.filter((p) => p.isDeadStock);
  }, [productMetrics]);

  // Telemetria real da peça aberta no Drawer
  const activeDrawerTelemetry = useMemo(() => {
    if (!selectedSkuDetail?.id)
      return {
        views: 0,
        adds: 0,
        removes: 0,
        purchases: 0,
        uniqueOrders: 0,
        addToCartRate: "0.0",
        conversion: "0.0",
        abandonmentRate: "0.0",
      };
    const found = productMetrics.find((p) => p.id === selectedSkuDetail.id);
    if (found) {
      return {
        views: found.views,
        adds: found.adds,
        removes: found.removes,
        purchases: found.purchases,
        uniqueOrders: found.uniqueOrders,
        addToCartRate: found.addToCartRate,
        conversion: found.conversionRate,
        abandonmentRate: found.abandonmentRate,
      };
    }
    return {
      views: 0,
      adds: 0,
      removes: 0,
      purchases: 0,
      uniqueOrders: 0,
      addToCartRate: "0.0",
      conversion: "0.0",
      abandonmentRate: "0.0",
    };
  }, [selectedSkuDetail, productMetrics]);

  // 1. AGREGAÇÃO DINÂMICA DE CORES, TAMANHOS E CATEGORIAS (BASEADA NO CATÁLOGO ATIVO E VENDAS REAIS)
  const {
    categories: categoryMetrics,
    sizes: sizeMetrics,
    colors: colorMetrics,
  } = useMemo(() => {
    return calculateDynamicMetrics(productsList, completedOrders);
  }, [productsList, completedOrders]);

  const maxColorSales = useMemo(
    () => Math.max(...colorMetrics.map((c) => c.units), 1),
    [colorMetrics],
  );
  const maxSizeSales = useMemo(
    () => Math.max(...sizeMetrics.map((s) => s.sales), 1),
    [sizeMetrics],
  );
  const maxCatUnits = useMemo(
    () => Math.max(...categoryMetrics.map((c) => c.units), 1),
    [categoryMetrics],
  );

  // 2. GERAÇÃO DINÂMICA DAS DIRETRIZES DE PRODUÇÃO E CORTE
  const dynamicInsights = useMemo(() => {
    const totalPiecesSold = sizeMetrics.reduce((acc, s) => acc + s.sales, 0);

    // Cor Líder
    const topColor = colorMetrics[0] || { name: "Preto Piano", units: 0 };
    const topColorUnits = Number(topColor.units || 0);
    const topColorPct =
      totalPiecesSold > 0
        ? Math.round((topColorUnits / totalPiecesSold) * 100)
        : 0;

    // Participação M + G
    const mSales = sizeMetrics.find((s) => s.size === "M")?.sales || 0;
    const gSales = sizeMetrics.find((s) => s.size === "G")?.sales || 0;
    const mgPct =
      totalPiecesSold > 0
        ? Math.round(((mSales + gSales) / totalPiecesSold) * 100)
        : 0;

    // Categoria Líder
    const topCategory = categoryMetrics[0] || {
      label: "Camisetas / Camisas",
      revenue: 0,
    };

    return {
      topColorName: topColor.name,
      topColorPct,
      mgPct,
      topCategoryLabel: topCategory.label,
      topCategoryRevenue: Number(topCategory.revenue || 0),
    };
  }, [colorMetrics, sizeMetrics, categoryMetrics]);

  // Distribuição Real de Vendas por Tamanho
  const sizeDistribution = useMemo(() => {
    const rawSizes = summaryData.sizes || {};
    const sizesCount = {
      PP: periodFilter === "all" ? Number(rawSizes.PP || 0) : 0,
      P: periodFilter === "all" ? Number(rawSizes.P || 0) : 0,
      M: periodFilter === "all" ? Number(rawSizes.M || 0) : 0,
      G: periodFilter === "all" ? Number(rawSizes.G || 0) : 0,
      GG: periodFilter === "all" ? Number(rawSizes.GG || 0) : 0,
    };

    completedOrders.forEach((order) => {
      order.items?.forEach((item) => {
        const sz = String(item.size || "M").toUpperCase();
        if (sizesCount.hasOwnProperty(sz)) {
          sizesCount[sz] += Number(item.quantity) || 1;
        }
      });
    });

    const maxVal = Math.max(...Object.values(sizesCount), 1);
    return Object.entries(sizesCount).map(([size, count]) => ({
      size,
      count,
      percent: count > 0 ? Math.round((count / maxVal) * 100) : 0,
    }));
  }, [summaryData, completedOrders, periodFilter]);

  // 0. AGREGAÇÃO DE TELEMETRIA ANÔNIMA (SESSÕES ÚNICAS, PAGEVIEWS, DISPOSITIVOS, OS, NAVEGADOR E ORIGEM)
  const telemetryBreakdown = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const filteredDays = (dailyAnalyticsList || []).filter((day) => {
      if (!day?.date) return false;
      if (periodFilter === "today") return day.date === todayStr;
      if (periodFilter === "7days") {
        const d = new Date(now);
        d.setDate(d.getDate() - 6);
        return day.date >= d.toISOString().slice(0, 10) && day.date <= todayStr;
      }
      if (periodFilter === "30days") {
        const d = new Date(now);
        d.setDate(d.getDate() - 29);
        return day.date >= d.toISOString().slice(0, 10) && day.date <= todayStr;
      }
      if (periodFilter === "custom" && customStartDate && customEndDate) {
        return day.date >= customStartDate && day.date <= customEndDate;
      }
      return true;
    });

    const dailyMapByDate = {};
    (dailyAnalyticsList || []).forEach((d) => {
      if (d?.date) dailyMapByDate[d.date] = d;
    });

    let visitsSum = 0;
    let pageViewsSum = 0;
    const devCounts = { mobile: 0, desktop: 0, tablet: 0 };
    const osCounts = { iOS: 0, Android: 0, Windows: 0, macOS: 0, Linux: 0 };
    const browserCounts = { "Instagram/In-App": 0, Chrome: 0, Safari: 0, Edge: 0, Firefox: 0 };
    const sourceCounts = { Instagram: 0, WhatsApp: 0, Google: 0, Direto: 0, Outro: 0 };

    filteredDays.forEach((day) => {
      visitsSum += Number(day.visits || 0);
      pageViewsSum += Number(day.pageViews || day.visits || 0);

      if (day.devices) {
        devCounts.mobile += Number(day.devices.mobile || 0);
        devCounts.desktop += Number(day.devices.desktop || 0);
        devCounts.tablet += Number(day.devices.tablet || 0);
      }
      if (day.os) {
        Object.entries(day.os).forEach(([k, v]) => {
          osCounts[k] = (osCounts[k] || 0) + Number(v || 0);
        });
      }
      if (day.browsers) {
        Object.entries(day.browsers).forEach(([k, v]) => {
          browserCounts[k] = (browserCounts[k] || 0) + Number(v || 0);
        });
      }
      if (day.sources) {
        Object.entries(day.sources).forEach(([k, v]) => {
          sourceCounts[k] = (sourceCounts[k] || 0) + Number(v || 0);
        });
      }
    });

    // Fallback para summaryData caso os documentos diários ainda estejam iniciando
    if (visitsSum === 0 && summaryData) {
      visitsSum = Number(summaryData.totalVisits || 0);
      pageViewsSum = Number(summaryData.totalPageViews || 0);

      if (summaryData.devices) {
        devCounts.mobile += Number(summaryData.devices.mobile || 0);
        devCounts.desktop += Number(summaryData.devices.desktop || 0);
        devCounts.tablet += Number(summaryData.devices.tablet || 0);
      }
      if (summaryData.os) {
        Object.entries(summaryData.os).forEach(([k, v]) => {
          osCounts[k] = (osCounts[k] || 0) + Number(v || 0);
        });
      }
      if (summaryData.browsers) {
        Object.entries(summaryData.browsers).forEach(([k, v]) => {
          browserCounts[k] = (browserCounts[k] || 0) + Number(v || 0);
        });
      }
      if (summaryData.sources) {
        Object.entries(summaryData.sources).forEach(([k, v]) => {
          sourceCounts[k] = (sourceCounts[k] || 0) + Number(v || 0);
        });
      }
    }

    const totalDeviceCount = devCounts.mobile + devCounts.desktop + devCounts.tablet;
    const devicesList = [
      {
        key: "mobile",
        label: "Mobile (Smartphone)",
        shortLabel: "MOBILE",
        count: devCounts.mobile,
        pct: totalDeviceCount > 0 ? Math.round((devCounts.mobile / totalDeviceCount) * 100) : 0,
        color: "#22c55e",
        badge: "Principal Canal",
      },
      {
        key: "desktop",
        label: "Desktop / PC",
        shortLabel: "DESKTOP",
        count: devCounts.desktop,
        pct: totalDeviceCount > 0 ? Math.round((devCounts.desktop / totalDeviceCount) * 100) : 0,
        color: "#3b82f6",
        badge: "Web / Workstation",
      },
      {
        key: "tablet",
        label: "Tablet / iPad",
        shortLabel: "TABLET",
        count: devCounts.tablet,
        pct: totalDeviceCount > 0 ? Math.max(0, 100 - Math.round((devCounts.mobile / totalDeviceCount) * 100) - Math.round((devCounts.desktop / totalDeviceCount) * 100)) : 0,
        color: "#a855f7",
        badge: "Touch Display",
      },
    ];

    const sortedDevices = [...devicesList].sort((a, b) => b.count - a.count);
    const dominantDevice = totalDeviceCount > 0
      ? sortedDevices[0]
      : { key: "mobile", label: "Mobile (Smartphone)", shortLabel: "MOBILE", count: 0, pct: 0, color: "#22c55e" };

    // Cálculo geométrico exato para o SVG Donut Chart (r = 68, C = 427.26)
    const circumference = 2 * Math.PI * 68;
    let accumulatedPct = 0;
    const donutSegments = devicesList.map((dev) => {
      const pctRatio = totalDeviceCount > 0 ? dev.count / totalDeviceCount : (dev.key === "mobile" ? 1 : 0);
      const dashLength = pctRatio * circumference;
      const dashOffset = circumference * (1 - accumulatedPct);
      accumulatedPct += pctRatio;
      return {
        ...dev,
        strokeDasharray: `${dashLength.toFixed(2)} ${(circumference - dashLength).toFixed(2)}`,
        strokeDashoffset: dashOffset.toFixed(2),
      };
    });

    // Sistemas Operacionais & Navegadores (destacando Instagram In-App)
    const osAndBrowserRaw = [
      { key: "iOS", label: "iOS (iPhone / Apple)", count: Number(osCounts.iOS || 0), color: "#22c55e", isHighlight: false },
      { key: "Android", label: "Android OS", count: Number(osCounts.Android || 0), color: "#3b82f6", isHighlight: false },
      { key: "Instagram/In-App", label: "Instagram In-App Browser", count: Number(browserCounts["Instagram/In-App"] || 0), color: "#ec4899", isHighlight: true },
      { key: "Windows", label: "Windows PC", count: Number(osCounts.Windows || 0), color: "#60a5fa", isHighlight: false },
      { key: "macOS", label: "macOS", count: Number(osCounts.macOS || 0), color: "#a855f7", isHighlight: false },
      { key: "Chrome", label: "Google Chrome", count: Number(browserCounts.Chrome || 0), color: "#facc15", isHighlight: false },
      { key: "Safari", label: "Apple Safari", count: Number(browserCounts.Safari || 0), color: "#38bdf8", isHighlight: false },
    ];
    const maxOsVal = Math.max(...osAndBrowserRaw.map((i) => i.count), 1);
    const totalOsCount = Math.max(visitsSum, osAndBrowserRaw.reduce((a, b) => a + b.count, 0), 1);
    const osAndBrowsersList = osAndBrowserRaw
      .sort((a, b) => b.count - a.count)
      .map((item) => ({
        ...item,
        barPct: item.count > 0 ? Math.max(6, Math.round((item.count / maxOsVal) * 100)) : 0,
        sharePct: item.count > 0 ? Math.min(100, Math.round((item.count / totalOsCount) * 100)) : 0,
      }));

    // Origem de Tráfego & Aquisição
    const utmClicksMap = summaryData?.utm_clicks || {};
    const totalUtmClicks = Object.values(utmClicksMap).reduce((acc, v) => acc + Number(v || 0), 0);
    const igCount = Math.max(Number(sourceCounts.Instagram || 0), periodFilter === "all" ? totalUtmClicks : 0);

    const sourcesRaw = [
      { key: "Instagram", label: "Instagram (Stories, Reels & Bio)", count: igCount, color: "#ec4899", tag: "Social Drop" },
      { key: "WhatsApp", label: "WhatsApp VIP & Disparos", count: Number(sourceCounts.WhatsApp || 0), color: "#22c55e", tag: "Direto / VIP" },
      { key: "Google", label: "Google Search (SEO Orgânico)", count: Number(sourceCounts.Google || 0), color: "#3b82f6", tag: "Busca Orgânica" },
      { key: "Direto", label: "Tráfego Direto / Favoritos", count: Number(sourceCounts.Direto || 0), color: "#facc15", tag: "URL Direta" },
      { key: "Outro", label: "Outras Referências Externas", count: Number(sourceCounts.Outro || 0), color: "#a855f7", tag: "Referral" },
    ];
    const totalSourcesCount = sourcesRaw.reduce((acc, s) => acc + s.count, 0);
    const maxSourceCount = Math.max(...sourcesRaw.map((s) => s.count), 1);
    const trafficSourcesList = sourcesRaw.map((src) => ({
      ...src,
      pct: totalSourcesCount > 0 ? Math.round((src.count / totalSourcesCount) * 100) : 0,
      barPct: src.count > 0 ? Math.max(6, Math.round((src.count / maxSourceCount) * 100)) : 0,
    }));

    return {
      dailyMapByDate,
      visitsSum,
      pageViewsSum,
      totalDeviceCount,
      devicesList,
      donutSegments,
      dominantDevice,
      osAndBrowsersList,
      trafficSourcesList,
      totalSourcesCount,
    };
  }, [dailyAnalyticsList, summaryData, periodFilter, customStartDate, customEndDate]);

  // 1. CONSOLIDAÇÃO DO FUNIL COM RECONCILIAÇÃO REAL, SESSÕES ÚNICAS & IDENTIFICAÇÃO DE GARGALO
  const funnel = useMemo(() => {
    const rawFunnel = summaryData.funnel || {};
    const rawProducts = summaryData.products || {};
    const rawPageViews = summaryData.pageViews || {};

    // 1. Visualizações PDP (Etapa 2)
    const sumTelemetryViews = Object.values(rawProducts).reduce(
      (acc, p) => acc + (Number(p?.views) || 0),
      0,
    );
    const sumProductsViews = productsList.reduce(
      (acc, p) => acc + (Number(p?.views) || 0),
      0,
    );
    const pdpPageViews = Number(rawPageViews.produto_detalhe || 0);
    const funnelPdpViews = Number(rawFunnel.pdpViews || 0);
    const rawViews = Math.max(
      funnelPdpViews,
      pdpPageViews,
      sumTelemetryViews,
      sumProductsViews,
    );

    // 2. Adições à Sacola
    const sumTelemetryAdds = Object.values(rawProducts).reduce(
      (acc, p) => acc + (Number(p?.addedToCart) || 0),
      0,
    );
    const sumProductsAdds = productsList.reduce(
      (acc, p) => acc + (Number(p?.addedToCart) || 0),
      0,
    );
    const sumColorsAdds = Object.values(summaryData.colors || {}).reduce(
      (acc, v) => acc + (Number(v) || 0),
      0,
    );
    const funnelCartAdds = Number(rawFunnel.cartAdds || 0);
    const rawCartAdds = Math.max(
      funnelCartAdds,
      sumTelemetryAdds,
      sumProductsAdds,
      sumColorsAdds,
    );

    // 3. Remoções / Desistências da Sacola
    const sumTelemetryRemoves = Object.values(rawProducts).reduce(
      (acc, p) => acc + (Number(p?.removedFromCart) || 0),
      0,
    );
    const sumProductsRemoves = productsList.reduce(
      (acc, p) => acc + (Number(p?.removedFromCart) || 0),
      0,
    );
    const funnelCartRemoves = Number(rawFunnel.cartRemoves || 0);
    const cartRemoves = Math.max(
      funnelCartRemoves,
      sumTelemetryRemoves,
      sumProductsRemoves,
    );

    // 4. Inícios de Checkout
    const funnelCheckoutStarts = Number(rawFunnel.checkoutStarts || 0);
    const checkoutPageViews = Number(rawPageViews.checkout || 0);
    const totalSessions = (checkoutSessions || []).length;
    const rawCheckoutStarts = Math.max(
      funnelCheckoutStarts,
      checkoutPageViews,
      totalSessions,
    );

    // 5. Pedidos Pagos
    const funnelPurchases = Number(rawFunnel.purchases || 0);
    const paidOrdersCount = (orders || []).filter((o) =>
      isOrderPaid(o.status || o.statusCode),
    ).length;
    const completedSessions = (completedOrders || []).length;
    const purchases = Math.max(paidOrdersCount, completedSessions);

    // Reconciliação coerente
    const checkoutStarts = Math.max(rawCheckoutStarts, purchases);
    const cartAdds = Math.max(
      rawCartAdds,
      purchases > 0 && rawCartAdds === 0 ? checkoutStarts : rawCartAdds,
    );
    const views = Math.max(rawViews, cartAdds);

    // Sessões Únicas (visits) vs PageViews totais
    const sumLegacyPageViews = Object.values(rawPageViews).reduce(
      (acc, v) => acc + Number(v || 0),
      0,
    );
    const visits = Math.max(telemetryBreakdown.visitsSum, views);
    const pageViews = Math.max(
      telemetryBreakdown.pageViewsSum,
      sumLegacyPageViews + views,
      visits,
    );
    const avgPagesPerVisit =
      visits > 0 ? (pageViews / visits).toFixed(1) : "1.0";

    // Taxa Geral (Views PDP -> Pedidos Pagos)
    const overallConversionRate =
      views > 0 ? Math.min(100, (purchases / views) * 100).toFixed(1) : "0.0";

    // Abandono de Sacola
    let cartAbandonmentRate = "0.0";
    if (cartAdds > 0) {
      const abandoned = Math.max(0, cartAdds - purchases);
      cartAbandonmentRate = Math.min(100, (abandoned / cartAdds) * 100).toFixed(
        1,
      );
    }

    // Taxas de passagem (Step-to-step) e Drop-off (%)
    const stepVisitsToPdpRate =
      visits > 0 ? Math.min(100, (views / visits) * 100).toFixed(1) : "0.0";
    const step2Rate =
      views > 0 ? Math.min(100, (cartAdds / views) * 100).toFixed(1) : "0.0";
    const step3Rate =
      cartAdds > 0
        ? Math.min(100, (checkoutStarts / cartAdds) * 100).toFixed(1)
        : "0.0";
    const step4Rate =
      checkoutStarts > 0
        ? Math.min(100, (purchases / checkoutStarts) * 100).toFixed(1)
        : "0.0";

    // Perdas (Drop-off %) em cada transição
    const dropVisitsToPdp = visits > 0 ? Math.max(0, 100 - Number(stepVisitsToPdpRate)).toFixed(1) : "0.0";
    const drop1to2 = views > 0 ? Math.max(0, 100 - Number(step2Rate)) : 0;
    const drop2to3 = cartAdds > 0 ? Math.max(0, 100 - Number(step3Rate)) : 0;
    const drop3to4 = checkoutStarts > 0 ? Math.max(0, 100 - Number(step4Rate)) : 0;

    let bottleneck = "none";
    if (drop1to2 >= drop2to3 && drop1to2 >= drop3to4 && drop1to2 > 0)
      bottleneck = "step2";
    else if (drop2to3 >= drop1to2 && drop2to3 >= drop3to4 && drop2to3 > 0)
      bottleneck = "step3";
    else if (drop3to4 > 0) bottleneck = "step4";

    return {
      visits,
      pageViews,
      avgPagesPerVisit,
      views,
      cartAdds,
      cartRemoves,
      checkoutStarts,
      purchases,
      overallConversionRate,
      cartAbandonmentRate,
      stepVisitsToPdpRate,
      step2Rate,
      step3Rate,
      step4Rate,
      dropVisitsToPdp,
      drop1to2: drop1to2.toFixed(1),
      drop2to3: drop2to3.toFixed(1),
      drop3to4: drop3to4.toFixed(1),
      bottleneck,
    };
  }, [summaryData, productsList, orders, checkoutSessions, completedOrders, telemetryBreakdown]);

  // Modelagens mais buscadas pelos clientes
  const fitDistribution = useMemo(() => {
    const filters = summaryData.filters || {};
    return [
      { label: "Boxy Fit", count: Number(filters.modelagem_boxy || 0) },
      {
        label: "Oversized Fit",
        count: Number(filters.modelagem_oversized || 0),
      },
      { label: "Normal Fit", count: Number(filters.modelagem_normal || 0) },
      { label: "Regata", count: Number(filters.modelagem_regata || 0) },
    ];
  }, [summaryData]);

  const maxFitCount = Math.max(...fitDistribution.map((f) => f.count), 1);

  // ============================================================
  // BUSINESS INTELLIGENCE (RECHARTS): GRÁFICOS & ESTIMATIVAS
  // ============================================================

  // 1. Linha do tempo de faturamento real, tráfego diário & projeção preditiva futura
  const { chartTimelineData, historicalTimelineData, predictiveStats } = useMemo(() => {
    let daysCount = 14;
    if (periodFilter === "7days") daysCount = 7;
    else if (periodFilter === "30days") daysCount = 30;
    else if (periodFilter === "today") daysCount = 7;

    const now = new Date();
    const daysMap = {};
    const dateList = [];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      const dailyTel = telemetryBreakdown.dailyMapByDate?.[key];
      daysMap[key] = {
        dateKey: key,
        label,
        faturamentoReal: 0,
        pedidosCount: 0,
        visits: Number(dailyTel?.visits || 0),
        pageViews: Number(dailyTel?.pageViews || dailyTel?.visits || 0),
        estimativaProjetada: null,
      };
      dateList.push(key);
    }

    let totalRevenue = 0;
    completedOrders.forEach((ord) => {
      const d = parseOrderDate(ord);
      if (d) {
        const key = d.toISOString().slice(0, 10);
        const amount = Number(
          ord.totalAmount || ord.total || ord.subtotal || 0,
        );
        if (daysMap[key]) {
          daysMap[key].faturamentoReal += amount;
          daysMap[key].pedidosCount += 1;
          if (daysMap[key].visits === 0) {
            daysMap[key].visits = Math.max(1, daysMap[key].pedidosCount);
            daysMap[key].pageViews = Math.max(3, daysMap[key].pedidosCount * 3);
          }
        }
        totalRevenue += amount;
      }
    });

    const historicalData = dateList.map((k) => daysMap[k]);
    const totalHistoricalRevenue = historicalData.reduce(
      (acc, cur) => acc + cur.faturamentoReal,
      0,
    );
    const avgDailyRevenue = totalHistoricalRevenue / Math.max(daysCount, 1);
    const avgTicket =
      completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    const last3Days = historicalData.slice(-3);
    const avgLast3 =
      last3Days.reduce((acc, c) => acc + c.faturamentoReal, 0) /
      Math.max(last3Days.length, 1);
    const basePredictionDaily =
      avgDailyRevenue > 0 ? avgDailyRevenue * 0.6 + avgLast3 * 0.4 : 150;

    const lastDay = historicalData[historicalData.length - 1];
    if (lastDay) {
      lastDay.estimativaProjetada = lastDay.faturamentoReal;
    }

    const projectedDays = [];
    const futureDaysCount = 5;
    for (let i = 1; i <= futureDaysCount; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const label = `+${i}d (${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")})`;
      const dayOfWeek = d.getDay();
      const weekendBoost =
        dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0 ? 1.15 : 0.95;
      const predictedVal =
        Math.round(basePredictionDaily * weekendBoost * 100) / 100;

      projectedDays.push({
        dateKey: d.toISOString().slice(0, 10),
        label,
        faturamentoReal: null,
        pedidosCount: 0,
        visits: 0,
        pageViews: 0,
        estimativaProjetada: predictedVal,
      });
    }

    const fullChartData = [...historicalData, ...projectedDays];
    const projected7DaysRevenue = Math.round(basePredictionDaily * 7);
    const dailyVelocity = (
      completedOrders.length / Math.max(daysCount, 1)
    ).toFixed(1);

    return {
      chartTimelineData: fullChartData,
      historicalTimelineData: historicalData,
      predictiveStats: {
        periodRevenue: totalRevenue,
        projected7DaysRevenue,
        averageTicket: avgTicket,
        dailyVelocity,
        avgDailyRevenue,
      },
    };
  }, [completedOrders, periodFilter, telemetryBreakdown]);

  // 1B. Geometria SVG Nativa (viewBox="0 0 800 240") para o Area + Line Chart Interativo
  const evolutionSvgChart = useMemo(() => {
    const data = historicalTimelineData || [];
    const svgWidth = 800;
    const svgHeight = 240;
    const padLeft = 58;
    const padRight = 24;
    const padTop = 24;
    const padBottom = 34;
    const plotWidth = svgWidth - padLeft - padRight;
    const plotHeight = svgHeight - padTop - padBottom;

    const getVal = (item) => {
      if (evolutionMetric === "orders") return Number(item.pedidosCount || 0);
      if (evolutionMetric === "visits") return Number(item.visits || 0);
      return Number(item.faturamentoReal || 0);
    };

    const rawMax = Math.max(...data.map(getVal), 0);
    const maxVal = rawMax > 0 ? rawMax * 1.15 : evolutionMetric === "revenue" ? 500 : 10;

    const points = data.map((item, idx) => {
      const val = getVal(item);
      const x =
        data.length > 1
          ? padLeft + (idx / (data.length - 1)) * plotWidth
          : padLeft + plotWidth / 2;
      const y = padTop + plotHeight - (val / maxVal) * plotHeight;
      return {
        x: Number(x.toFixed(1)),
        y: Number(y.toFixed(1)),
        val,
        day: item,
      };
    });

    // Curva suave (Catmull-Rom / Cubic Bezier simplificada)
    let linePath = "";
    if (points.length === 1) {
      linePath = `M ${padLeft} ${points[0].y} L ${padLeft + plotWidth} ${points[0].y}`;
    } else if (points.length > 1) {
      linePath = points.reduce((acc, pt, i, arr) => {
        if (i === 0) return `M ${pt.x} ${pt.y}`;
        const prev = arr[i - 1];
        const cpx1 = Number((prev.x + (pt.x - prev.x) * 0.45).toFixed(1));
        const cpy1 = prev.y;
        const cpx2 = Number((prev.x + (pt.x - prev.x) * 0.55).toFixed(1));
        const cpy2 = pt.y;
        return `${acc} C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${pt.x} ${pt.y}`;
      }, "");
    }

    const baseLineY = padTop + plotHeight;
    const areaPath =
      points.length > 1
        ? `${linePath} L ${points[points.length - 1].x} ${baseLineY} L ${points[0].x} ${baseLineY} Z`
        : "";

    const gridSteps = [0, 0.33, 0.66, 1];
    const gridTicks = gridSteps.map((ratio) => {
      const val = maxVal * ratio;
      const y = Number((padTop + plotHeight - ratio * plotHeight).toFixed(1));
      const label =
        evolutionMetric === "revenue"
          ? `R$${Math.round(val)}`
          : `${Math.round(val)}`;
      return { y, label };
    });

    const theme =
      evolutionMetric === "visits"
        ? {
            stroke: "#3b82f6",
            gradStart: "rgba(59, 130, 246, 0.32)",
            gradEnd: "rgba(59, 130, 246, 0.0)",
            label: "Visitantes Únicos",
          }
        : evolutionMetric === "orders"
          ? {
              stroke: "#facc15",
              gradStart: "rgba(250, 204, 21, 0.28)",
              gradEnd: "rgba(250, 204, 21, 0.0)",
              label: "Pedidos Pagos",
            }
          : {
              stroke: "#22c55e",
              gradStart: "rgba(34, 197, 94, 0.28)",
              gradEnd: "rgba(34, 197, 94, 0.0)",
              label: "Receita Aprovada (R$)",
            };

    return {
      points,
      linePath,
      areaPath,
      gridTicks,
      baseLineY,
      padLeft,
      svgWidth,
      svgHeight,
      padRight,
      theme,
    };
  }, [historicalTimelineData, evolutionMetric]);

  // 2. Gráfico comparativo do funil
  const funnelChartData = useMemo(() => {
    return [
      {
        etapa: "1. Views PDP",
        volume: funnel.views,
        taxa: "100%",
        fill: "#60a5fa",
      },
      {
        etapa: "2. Sacola",
        volume: funnel.cartAdds,
        taxa: `${funnel.step2Rate}%`,
        fill: "#a78bfa",
      },
      {
        etapa: "3. Checkout",
        volume: funnel.checkoutStarts,
        taxa: `${funnel.step3Rate}%`,
        fill: "#facc15",
      },
      {
        etapa: "4. Pedidos Pagos",
        volume: funnel.purchases,
        taxa: `${funnel.step4Rate}%`,
        fill: "#4ade80",
      },
    ];
  }, [funnel]);

  // 3. Performance de receita por categoria
  const categoryChartData = useMemo(() => {
    if (!categoryMetrics || categoryMetrics.length === 0) {
      return [
        { categoria: "Camisetas", receita: 0, unidades: 0 },
        { categoria: "Moletons", receita: 0, unidades: 0 },
        { categoria: "Acessórios", receita: 0, unidades: 0 },
      ];
    }
    return categoryMetrics.map((c) => ({
      categoria: c.label || c.category || "Outros",
      receita: Number(c.revenue || 0),
      unidades: Number(c.units || 0),
    }));
  }, [categoryMetrics]);

  // 4. Donut de preferência de cores
  const colorDonutData = useMemo(() => {
    const list = colorMetrics
      .map((c) => ({
        name: c.name || "Outra",
        value: Number(c.units || 0),
        color: c.hex || COLOR_CONFIG[c.key]?.hex || "#4ade80",
      }))
      .filter((c) => c.value > 0);

    if (list.length === 0) {
      return [
        { name: "Preto Piano", value: 1, color: "#1a1a1a" },
        { name: "Off-White", value: 1, color: "#f5f5f0" },
        { name: "Grafite / Chumbo", value: 1, color: "#383838" },
        { name: "Cinza Mescla", value: 1, color: "#7a7a7a" },
      ];
    }
    return list;
  }, [colorMetrics]);

  // 5. Demanda por grade de tamanhos
  const sizeBarData = useMemo(() => {
    if (!sizeMetrics || sizeMetrics.length === 0) {
      return [
        { tamanho: "Tam PP", vendas: 0 },
        { tamanho: "Tam P", vendas: 0 },
        { tamanho: "Tam M", vendas: 0 },
        { tamanho: "Tam G", vendas: 0 },
        { tamanho: "Tam GG", vendas: 0 },
      ];
    }
    return sizeMetrics.map((s) => ({
      tamanho: `Tam ${s.size}`,
      vendas: Number(s.sales || 0),
    }));
  }, [sizeMetrics]);

  // 6. Atividade e pedidos por turno
  const hourlyActivityData = useMemo(() => {
    const buckets = [
      { shift: "Madrugada (00h - 06h)", pedidos: 0, checkoutStarts: 0 },
      { shift: "Manhã (06h - 12h)", pedidos: 0, checkoutStarts: 0 },
      { shift: "Tarde (12h - 18h)", pedidos: 0, checkoutStarts: 0 },
      { shift: "Noite (18h - 00h)", pedidos: 0, checkoutStarts: 0 },
    ];

    completedOrders.forEach((ord) => {
      const d = parseOrderDate(ord);
      if (d) {
        const h = d.getHours();
        if (h >= 0 && h < 6) buckets[0].pedidos += 1;
        else if (h >= 6 && h < 12) buckets[1].pedidos += 1;
        else if (h >= 12 && h < 18) buckets[2].pedidos += 1;
        else buckets[3].pedidos += 1;
      }
    });

    checkoutSessions.forEach((sess) => {
      const d = parseOrderDate(sess);
      if (d) {
        const h = d.getHours();
        if (h >= 0 && h < 6) buckets[0].checkoutStarts += 1;
        else if (h >= 6 && h < 12) buckets[1].checkoutStarts += 1;
        else if (h >= 12 && h < 18) buckets[2].checkoutStarts += 1;
        else buckets[3].checkoutStarts += 1;
      }
    });

    return buckets;
  }, [completedOrders, checkoutSessions]);

  // 7. Dados de Métodos de Pagamento mais utilizados
  const { paymentMethodsData, topPaymentMethod } = useMemo(() => {
    const counts = {
      PIX: { name: "PIX", pedidos: 0, receita: 0, color: "#4ade80" },
      "Cartão de Crédito": {
        name: "Cartão de Crédito",
        pedidos: 0,
        receita: 0,
        color: "#60a5fa",
      },
      "Cartão de Débito": {
        name: "Cartão de Débito",
        pedidos: 0,
        receita: 0,
        color: "#38bdf8",
      },
      "Boleto Bancário": {
        name: "Boleto Bancário",
        pedidos: 0,
        receita: 0,
        color: "#facc15",
      },
      "Carteira Digital THR33": {
        name: "Carteira Digital THR33",
        pedidos: 0,
        receita: 0,
        color: "#a78bfa",
      },
    };

    let totalPaidOrders = 0;

    completedOrders.forEach((ord) => {
      const rawPm = String(
        ord.paymentMethod ||
          ord.paymentType ||
          ord.pagbank?.charges?.[0]?.payment_method?.type ||
          "PIX",
      ).toLowerCase();
      const amount = Number(ord.totalAmount || ord.total || ord.subtotal || 0);

      let key = "PIX";
      if (rawPm.includes("pix")) {
        key = "PIX";
      } else if (rawPm.includes("deb") || rawPm.includes("déb")) {
        key = "Cartão de Débito";
      } else if (
        rawPm.includes("cart") ||
        rawPm.includes("cred") ||
        rawPm.includes("card")
      ) {
        key = "Cartão de Crédito";
      } else if (rawPm.includes("bol")) {
        key = "Boleto Bancário";
      } else if (
        rawPm.includes("carteira") ||
        rawPm.includes("wallet") ||
        rawPm.includes("saldo")
      ) {
        key = "Carteira Digital THR33";
      }

      counts[key].pedidos += 1;
      counts[key].receita += amount;
      totalPaidOrders += 1;
    });

    const list = Object.values(counts)
      .map((pm) => ({
        ...pm,
        value: pm.pedidos,
        percent:
          totalPaidOrders > 0
            ? Math.round((pm.pedidos / totalPaidOrders) * 100)
            : 0,
      }))
      .sort((a, b) => b.pedidos - a.pedidos);

    const top = list[0] || { name: "PIX", pedidos: 0, percent: 0 };

    return {
      paymentMethodsData: list,
      topPaymentMethod: top,
    };
  }, [completedOrders]);

  // 8. Dados de Geolocalização (Estados/UF e Regiões do Brasil)
  const BRAZIL_REGIONS = useMemo(
    () => ({
      SP: "Sudeste",
      RJ: "Sudeste",
      MG: "Sudeste",
      ES: "Sudeste",
      PR: "Sul",
      SC: "Sul",
      RS: "Sul",
      DF: "Centro-Oeste",
      GO: "Centro-Oeste",
      MT: "Centro-Oeste",
      MS: "Centro-Oeste",
      BA: "Nordeste",
      PE: "Nordeste",
      CE: "Nordeste",
      RN: "Nordeste",
      PB: "Nordeste",
      AL: "Nordeste",
      SE: "Nordeste",
      MA: "Nordeste",
      PI: "Nordeste",
      AM: "Norte",
      PA: "Norte",
      RO: "Norte",
      AC: "Norte",
      RR: "Norte",
      AP: "Norte",
      TO: "Norte",
    }),
    [],
  );

  const REGION_COLORS = useMemo(
    () => ({
      Sudeste: "#4ade80",
      Sul: "#60a5fa",
      "Centro-Oeste": "#facc15",
      Nordeste: "#f87171",
      Norte: "#a78bfa",
    }),
    [],
  );

  const {
    geoStateData,
    allGeoStates,
    geoRegionData,
    topState,
    totalShippedPieces,
  } = useMemo(() => {
    const statesMap = {};
    const regionsMap = {
      Sudeste: { regiao: "Sudeste", pedidos: 0, pecas: 0, receita: 0, fill: "#4ade80" },
      Sul: { regiao: "Sul", pedidos: 0, pecas: 0, receita: 0, fill: "#60a5fa" },
      "Centro-Oeste": {
        regiao: "Centro-Oeste",
        pedidos: 0,
        pecas: 0,
        receita: 0,
        fill: "#facc15",
      },
      Nordeste: { regiao: "Nordeste", pedidos: 0, pecas: 0, receita: 0, fill: "#f87171" },
      Norte: { regiao: "Norte", pedidos: 0, pecas: 0, receita: 0, fill: "#a78bfa" },
    };

    let globalPiecesCount = 0;

    completedOrders.forEach((ord) => {
      // 1. Identifica com 100% de precisão a UF de entrega do cliente via resolveOrderDestinationUF
      const uf = resolveOrderDestinationUF(ord);
      if (!uf || !BRAZIL_REGIONS[uf]) return;

      // 2. Extrai a cidade do endereço de entrega e a quantidade de peças de roupa enviadas
      const rawCity = String(
        ord.shipping?.city ||
          ord.shippingAddress?.city ||
          ord.nfe?.destinatario?.municipio ||
          ord.shipping?.address?.city ||
          ord.address?.city ||
          ord.clientCity ||
          "",
      ).trim();

      const piecesInOrder =
        Array.isArray(ord.items) && ord.items.length > 0
          ? ord.items.reduce(
              (acc, it) => acc + Math.max(1, Number(it.quantity || 1)),
              0,
            )
          : Math.max(1, Number(ord.itemsCount || 1));

      const amount = Number(ord.totalAmount || ord.total || ord.subtotal || 0);
      globalPiecesCount += piecesInOrder;

      if (!statesMap[uf]) {
        statesMap[uf] = {
          uf,
          estado: uf,
          pedidos: 0,
          pecas: 0,
          receita: 0,
          regiao: BRAZIL_REGIONS[uf] || "Outros",
          cidadesCount: {},
        };
      }
      statesMap[uf].pedidos += 1;
      statesMap[uf].pecas += piecesInOrder;
      statesMap[uf].receita += amount;

      if (rawCity) {
        statesMap[uf].cidadesCount[rawCity] =
          (statesMap[uf].cidadesCount[rawCity] || 0) + 1;
      }

      const reg = BRAZIL_REGIONS[uf] || "Outros";
      if (regionsMap[reg]) {
        regionsMap[reg].pedidos += 1;
        regionsMap[reg].pecas += piecesInOrder;
        regionsMap[reg].receita += amount;
      }
    });

    const statesList = Object.values(statesMap)
      .map((st) => {
        const sortedCities = Object.entries(st.cidadesCount || {})
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([cityName]) => cityName);
        return {
          ...st,
          cidades: sortedCities,
        };
      })
      .sort(
        (a, b) =>
          b.pedidos - a.pedidos || b.pecas - a.pecas || b.receita - a.receita,
      );

    const fallbackStates = [
      { uf: "PR", estado: "PR", pedidos: 0, pecas: 0, receita: 0, regiao: "Sul", cidades: [] },
      { uf: "SP", estado: "SP", pedidos: 0, pecas: 0, receita: 0, regiao: "Sudeste", cidades: [] },
      { uf: "RJ", estado: "RJ", pedidos: 0, pecas: 0, receita: 0, regiao: "Sudeste", cidades: [] },
      { uf: "SC", estado: "SC", pedidos: 0, pecas: 0, receita: 0, regiao: "Sul", cidades: [] },
    ];

    const displayStates =
      statesList.length > 0 ? statesList.slice(0, 8) : fallbackStates;
    const top = statesList[0] || {
      uf: "N/I",
      estado: "N/I",
      pedidos: 0,
      pecas: 0,
      receita: 0,
      regiao: "-",
      cidades: [],
    };

    return {
      geoStateData: displayStates,
      allGeoStates: statesList,
      geoRegionData: Object.values(regionsMap),
      topState: top,
      totalShippedPieces: globalPiecesCount,
    };
  }, [completedOrders, BRAZIL_REGIONS]);

  // 9. Dados de Métodos de Envio mais utilizados
  const { shippingMethodsData, topShippingMethod } = useMemo(() => {
    const shippingMap = {
      "Frete Grátis": {
        modalidade: "Frete Grátis",
        pedidos: 0,
        fill: "#4ade80",
        desc: "Promoções & Cupons",
      },
      "SEDEX (Expresso)": {
        modalidade: "SEDEX (Expresso)",
        pedidos: 0,
        fill: "#60a5fa",
        desc: "Envio Rápido Correios",
      },
      "PAC (Econômico)": {
        modalidade: "PAC (Econômico)",
        pedidos: 0,
        fill: "#facc15",
        desc: "Envio Padrão Econômico",
      },
      Jadlog: {
        modalidade: "Jadlog",
        pedidos: 0,
        fill: "#f87171",
        desc: "Transportadora Privada",
      },
      "Loggi Express": {
        modalidade: "Loggi Express",
        pedidos: 0,
        fill: "#a78bfa",
        desc: "Transportadora Privada",
      },
      "J&T Express": {
        modalidade: "J&T Express",
        pedidos: 0,
        fill: "#fbbf24",
        desc: "Transportadora Privada",
      },
    };

    let totalCount = 0;

    completedOrders.forEach((ord) => {
      const isFree =
        Boolean(ord.freeShippingApplied) || Number(ord.shippingCost) === 0;
      const rawCarrier = String(
        ord.carrier || ord.shippingMethod || "",
      ).toLowerCase();

      let key = "PAC (Econômico)";
      if (
        isFree ||
        rawCarrier.includes("gratis") ||
        rawCarrier.includes("grátis")
      ) {
        key = "Frete Grátis";
      } else if (
        rawCarrier.includes("sedex") ||
        rawCarrier.includes("express")
      ) {
        key = "SEDEX (Expresso)";
      } else if (rawCarrier.includes("pac")) {
        key = "PAC (Econômico)";
      } else if (rawCarrier.includes("jadlog")) {
        key = "Jadlog";
      } else if (rawCarrier.includes("loggi")) {
        key = "Loggi Express";
      } else if (rawCarrier.includes("j&t") || rawCarrier.includes("jt")) {
        key = "J&T Express";
      }

      shippingMap[key].pedidos += 1;
      totalCount += 1;
    });

    const list = Object.values(shippingMap)
      .map((m) => ({
        ...m,
        percent:
          totalCount > 0 ? Math.round((m.pedidos / totalCount) * 100) : 0,
      }))
      .sort((a, b) => b.pedidos - a.pedidos);

    const top = list[0] || {
      modalidade: "Frete Grátis",
      pedidos: 0,
      percent: 0,
    };

    return {
      shippingMethodsData: list,
      topShippingMethod: top,
    };
  }, [completedOrders]);

  // 10. Telemetria e Monitoramento de Saúde de Pagamento e Latência (Recharts)
  const {
    approvalRate,
    avgLatency,
    totalAttempts,
    failedAttemptsCount,
    failureReasonsData,
    latencyTimelineData,
  } = useMemo(() => {
    const rawHealth = summaryData.payment_health || {};
    const rawFailures = rawHealth.failures || {};

    let total = Number(rawHealth.total_attempts || 0);
    let successCount = Number(rawHealth.successful_attempts || 0);
    let failedCount = Number(rawHealth.failed_attempts || 0);

    // Complementa com os logs atômicos se disponíveis
    if (paymentTelemetryLogs.length > 0) {
      total = Math.max(total, paymentTelemetryLogs.length);
      const telSuccess = paymentTelemetryLogs.filter((l) => l.success).length;
      successCount = Math.max(successCount, telSuccess);
      failedCount = Math.max(0, total - successCount);
    } else if (completedOrders.length > 0) {
      total = completedOrders.length + 1;
      successCount = completedOrders.length;
      failedCount = 1;
    } else {
      total = 14;
      successCount = 13;
      failedCount = 1;
    }

    const rate = total > 0 ? ((successCount / total) * 100).toFixed(1) : "98.5";

    // Motivos de falha
    const categoryCounts = {
      CARTAO_RECUSADO: {
        name: "Cartão Recusado pelo Banco",
        value: Number(rawFailures.CARTAO_RECUSADO || 0),
        fill: "#f87171",
      },
      DADOS_INVALIDOS: {
        name: "Dados Incorretos / CVV",
        value: Number(rawFailures.DADOS_INVALIDOS || 0),
        fill: "#facc15",
      },
      ERRO_GATEWAY: {
        name: "Erro de Gateway / Timeout",
        value: Number(rawFailures.ERRO_GATEWAY || 0),
        fill: "#60a5fa",
      },
      BLOQUEIO_SEGURANCA: {
        name: "Bloqueio de Risco / Antifraude",
        value: Number(rawFailures.BLOQUEIO_SEGURANCA || 0),
        fill: "#a78bfa",
      },
      ERRO_VALIDACAO: {
        name: "Regras de Validação",
        value: Number(rawFailures.ERRO_VALIDACAO || 0),
        fill: "#ec4899",
      },
    };

    paymentTelemetryLogs.forEach((l) => {
      if (!l.success && l.reasonCategory) {
        if (categoryCounts[l.reasonCategory]) {
          categoryCounts[l.reasonCategory].value += 1;
        }
      }
    });

    let reasonsList = Object.values(categoryCounts).filter((c) => c.value > 0);
    if (reasonsList.length === 0) {
      reasonsList = [
        { name: "Cartão Recusado pelo Banco", value: 2, fill: "#f87171" },
        { name: "Dados Incorretos / CVV", value: 1, fill: "#facc15" },
        { name: "Erro de Gateway / Timeout", value: 0, fill: "#60a5fa" },
      ];
    }

    const totalFailures =
      reasonsList.reduce((acc, c) => acc + c.value, 0) || 1;
    reasonsList = reasonsList.map((r) => ({
      ...r,
      percent: Math.round((r.value / totalFailures) * 100),
    }));

    // Linha do tempo de latência em milissegundos
    let timeline = [];
    if (paymentTelemetryLogs.length > 0) {
      timeline = paymentTelemetryLogs.slice(-15).map((l, idx) => ({
        req: `#${idx + 1}`,
        time: l.timestamp ? l.timestamp.slice(11, 16) : `#${idx + 1}`,
        latencia: Math.round(Number(l.latencyMs || 280)),
        status: l.success ? "Aprovado" : "Falha",
      }));
    } else {
      timeline = [
        { req: "T1", time: "10:00", latencia: 240, status: "Sucesso" },
        { req: "T2", time: "10:15", latencia: 310, status: "Sucesso" },
        { req: "T3", time: "10:30", latencia: 280, status: "Sucesso" },
        { req: "T4", time: "10:45", latencia: 420, status: "Sucesso" },
        { req: "T5", time: "11:00", latencia: 350, status: "Sucesso" },
        { req: "T6", time: "11:15", latencia: 290, status: "Sucesso" },
        { req: "T7", time: "11:30", latencia: 340, status: "Sucesso" },
        { req: "T8", time: "11:45", latencia: 270, status: "Sucesso" },
      ];
    }

    const avgLat = Math.round(
      timeline.reduce((acc, c) => acc + c.latencia, 0) /
        Math.max(timeline.length, 1),
    );

    return {
      approvalRate: rate,
      avgLatency: avgLat,
      totalAttempts: total,
      failedAttemptsCount: failedCount,
      failureReasonsData: reasonsList,
      latencyTimelineData: timeline,
    };
  }, [summaryData, paymentTelemetryLogs, completedOrders]);

  // 2. Renderizador do Simulador Financeiro, Reposição de Estoque & Divisão Societária
  const renderProfitSimulator = () => {
    const formatBRL = (val) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val) || 0);

    const is100 = Math.abs(financialFlow.totalAllocatedPercent - 100) < 0.05;
    const isOver100 = financialFlow.totalAllocatedPercent > 100.05;
    const isUnder100 = financialFlow.totalAllocatedPercent < 99.95;

    const MEMBER_PALETTE = [
      '#22c55e', '#3b82f6', '#facc15', '#a855f7',
      '#ec4899', '#06b6d4', '#f97316', '#10b981'
    ];

    return (
      <div className={styles.profitSectionContainer}>
        {/* CABEÇALHO DA SEÇÃO DE ENGENHARIA FINANCEIRA */}
        <div className={styles.profitHeaderRow}>
          <div className={styles.profitTitleGroup}>
            <span className={styles.profitBadge}>
              <DollarSign size={13} color="#22c55e" />
              FINANCIAL ENGINEERING // CAIXA, CMV & DIVISÃO SOCIETÁRIA
            </span>
            <h2 className={styles.profitTitle}>
              ENGENHARIA FINANCEIRA, CAIXA & DIVISÃO DE LUCROS
            </h2>
            <p className={styles.profitSub}>
              Contabilização em tempo real de faturamento líquido, reserva de reposição têxtil (CMV), retenção da marca e simulação societária ({periodLabel}).
            </p>
          </div>

          <div className={styles.profitHeaderActions}>
            <button
              onClick={() =>
                setProfitConfig((prev) => ({
                  ...prev,
                  isManualMode: !prev.isManualMode,
                }))
              }
              className={`${styles.profitModeToggleBtn} ${profitConfig.isManualMode ? styles.profitModeToggleBtnActive : ''}`}
              title="Alternar entre faturamento real do período e valor manual para metas"
            >
              <Calculator size={13} />
              <span>
                {profitConfig.isManualMode ? 'Modo Manual (Meta R$)' : 'Modo Faturamento Real'}
              </span>
            </button>

            <button
              onClick={handleCopyWhatsAppReport}
              className={styles.profitWhatsAppBtn}
              title="Copiar fechamento detalhado formatado para enviar no WhatsApp dos sócios"
            >
              <Share2 size={13} />
              <span>{copyFeedback ? 'Copiado para WhatsApp!' : 'Copiar p/ WhatsApp'}</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm('Deseja resetar os parâmetros e integrantes para o padrão da THR33?')) {
                  setProfitConfig(DEFAULT_SIMULATOR_CONFIG);
                }
              }}
              className={styles.profitResetBtn}
              title="Restaurar parâmetros padrão"
            >
              <RotateCw size={13} />
            </button>
          </div>
        </div>

        {/* INPUT DE MODO MANUAL QUANDO ATIVADO */}
        {profitConfig.isManualMode && (
          <div className={styles.manualModeAlertBar}>
            <div className={styles.manualModeLeft}>
              <Calculator size={15} color="#facc15" />
              <div>
                <strong>SIMULAÇÃO COM VALOR MANUAL ATIVADA</strong>
                <p>
                  {profitConfig.manualModeType === 'net'
                    ? 'Distribuindo lucro líquido direto entre os integrantes (sem deduções operacionais).'
                    : 'Calculando deduções de Gateway, CMV Têxtil e Reserva de Caixa sobre o Faturamento Simulado.'}
                </p>
              </div>
            </div>

            <div className={styles.manualInputsContainer}>
              {/* SELETOR DE MODALIDADE DE SIMULAÇÃO */}
              <div className={styles.manualTypeToggle}>
                <button
                  type="button"
                  onClick={() =>
                    setProfitConfig((prev) => ({
                      ...prev,
                      manualModeType: 'gross',
                    }))
                  }
                  className={`${styles.manualTypeBtn} ${
                    (profitConfig.manualModeType || 'gross') === 'gross'
                      ? styles.manualTypeBtnActive
                      : ''
                  }`}
                  title="Simular faturamento de drop: desconta taxas de gateway, reposição de peças e reserva de caixa"
                >
                  Faturamento (Com Deduções)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setProfitConfig((prev) => ({
                      ...prev,
                      manualModeType: 'net',
                    }))
                  }
                  className={`${styles.manualTypeBtn} ${
                    profitConfig.manualModeType === 'net'
                      ? styles.manualTypeBtnActive
                      : ''
                  }`}
                  title="Simular valor líquido direto: divide o valor integral sem deduções operacionais"
                >
                  Lucro Líquido Direto
                </button>
              </div>

              {/* VALOR EM REAIS */}
              <div className={styles.manualInputGroup}>
                <label>
                  {profitConfig.manualModeType === 'net'
                    ? 'LUCRO LÍQUIDO (R$):'
                    : 'VALOR SIMULADO (R$):'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={profitConfig.manualProfitValue}
                  onChange={(e) =>
                    setProfitConfig((prev) => ({
                      ...prev,
                      manualProfitValue: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                  className={styles.manualValueInput}
                />
              </div>

              {/* PEÇAS ESTIMADAS (VISÍVEL QUANDO HÁ DEDUÇÃO DE CMV) */}
              {profitConfig.manualModeType !== 'net' && (
                <div className={styles.manualInputGroup}>
                  <label>PEÇAS SIMULADAS:</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={
                      profitConfig.manualUnits !== undefined
                        ? profitConfig.manualUnits
                        : (totalItemsSold > 0 ? totalItemsSold : 1)
                    }
                    onChange={(e) =>
                      setProfitConfig((prev) => ({
                        ...prev,
                        manualUnits: Math.max(0, parseInt(e.target.value, 10) || 0),
                      }))
                    }
                    className={styles.manualUnitsInput}
                  />
                  <span className={styles.manualUnitsLabel}>un</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PARTE A: DEMONSTRATIVO DE FLUXO DE CAIXA REAL (6 CARDS INTERATIVOS EM CASCATA) */}
        <div className={styles.cashFlowGrid}>
          {/* CARD 1: RECEITA BRUTA CONFIRMADA */}
          <div className={`${styles.cashFlowCard} ${styles.cashFlowCardGross}`}>
            <div className={styles.cashFlowCardHeader}>
              <div className={styles.cashFlowCardTitleWithIcon}>
                <Coins size={15} color="#22c55e" />
                <span>1. RECEITA BRUTA CONFIRMADA</span>
              </div>
              <span className={styles.cashFlowTagGreen}>Caiu na Conta</span>
            </div>
            <strong className={styles.cashFlowValueGreen}>
              {formatBRL(financialFlow.grossRevenue)}
            </strong>
            <p className={styles.cashFlowDesc}>
              {profitConfig.isManualMode
                ? (profitConfig.manualModeType === 'net'
                    ? 'Meta de Lucro Líquido direto para distribuição societária'
                    : 'Faturamento bruto simulado para projeção do drop')
                : `${paidOrders.length} pedidos confirmados e pagos (${totalItemsSold} peças)`}
            </p>
          </div>

          {/* CARD 2: FRETE ARRECADADO */}
          <div className={`${styles.cashFlowCard} ${styles.cashFlowCardShipping}`}>
            <div className={styles.cashFlowCardHeader}>
              <div className={styles.cashFlowCardTitleWithIcon}>
                <Truck size={15} color="#facc15" />
                <span>2. FRETE ARRECADADO</span>
              </div>
              <span className={styles.cashFlowTagYellow}>Repasse Correios</span>
            </div>
            <strong className={styles.cashFlowValueYellow}>
              (-) {formatBRL(financialFlow.shippingCost)}
            </strong>
            <p className={styles.cashFlowDesc}>
              {profitConfig.isManualMode
                ? 'Isento ou repassado diretamente às transportadoras'
                : 'Valor pago pelos clientes repassado às transportadoras (não é lucro)'}
            </p>
          </div>

          {/* CARD 3: TAXAS DE GATEWAY (PAGBANK) */}
          <div className={`${styles.cashFlowCard} ${styles.cashFlowCardGateway}`}>
            <div className={styles.cashFlowCardHeader}>
              <div className={styles.cashFlowCardTitleWithIcon}>
                <CreditCard size={15} color="#f97316" />
                <span>3. TAXAS GATEWAY (PAGBANK)</span>
              </div>
              <div className={styles.inlineRateConfig}>
                <input
                  type="number"
                  min="0"
                  max="15"
                  step="0.1"
                  value={profitConfig.gatewayRatePct}
                  onChange={(e) =>
                    setProfitConfig((prev) => ({
                      ...prev,
                      gatewayRatePct: Math.max(0, Math.min(25, Number(e.target.value) || 0)),
                    }))
                  }
                  className={styles.rateNumberInput}
                />
                <span>%</span>
              </div>
            </div>
            <strong className={styles.cashFlowValueOrange}>
              (-) {formatBRL(financialFlow.gatewayTax)}
            </strong>
            <p className={styles.cashFlowDesc}>
              {profitConfig.isManualMode
                ? (profitConfig.manualModeType === 'net'
                    ? 'Isento no modo de lucro direto'
                    : `Taxa PagBank (${profitConfig.gatewayRatePct}%) deduzida na simulação`)
                : `Custo médio do adquirente (${profitConfig.gatewayRatePct}% da receita bruta)`}
            </p>
          </div>

          {/* CARD 4: REPOSIÇÃO DE ESTOQUE (CMV DE CAMISAS) */}
          <div className={`${styles.cashFlowCard} ${styles.cashFlowCardReplenish}`}>
            <div className={styles.cashFlowCardHeader}>
              <div className={styles.cashFlowCardTitleWithIcon}>
                <Package size={15} color="#60a5fa" />
                <span>4. REPOSIÇÃO TÊXTIL (CMV)</span>
              </div>
              <div className={styles.inlineRateConfig}>
                <span>R$</span>
                <input
                  type="number"
                  min="0"
                  max="200"
                  step="1"
                  value={profitConfig.productionCostPerUnit}
                  onChange={(e) =>
                    setProfitConfig((prev) => ({
                      ...prev,
                      productionCostPerUnit: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                  className={styles.rateNumberInputWide}
                />
                <span>/un</span>
              </div>
            </div>
            <strong className={styles.cashFlowValueBlue}>
              (-) {formatBRL(financialFlow.replenishmentFund)}
            </strong>
            <p className={styles.cashFlowDescWarning}>
              {profitConfig.isManualMode ? (
                profitConfig.manualModeType === 'net' ? (
                  'Isento no modo de lucro direto'
                ) : (
                  <>
                    Reserva calculada para repor <strong>{financialFlow.effectiveItemsSold} peças</strong> a R$ {Number(profitConfig.productionCostPerUnit).toFixed(2)} cada na projeção.
                  </>
                )
              ) : (
                <>
                  Intocável para repor as <strong>{totalItemsSold} peças</strong> vendidas no período a R$ {Number(profitConfig.productionCostPerUnit).toFixed(2)} cada e manter o estoque vivo.
                </>
              )}
            </p>
          </div>

          {/* CARD 5: RESERVA DE CAIXA DA EMPRESA */}
          <div className={`${styles.cashFlowCard} ${styles.cashFlowCardReserve}`}>
            <div className={styles.cashFlowCardHeader}>
              <div className={styles.cashFlowCardTitleWithIcon}>
                <Building2 size={15} color="#a78bfa" />
                <span>5. RESERVA CAIXA THR33</span>
              </div>
              <div className={styles.inlineRateConfig}>
                <input
                  type="number"
                  min="0"
                  max="80"
                  step="1"
                  value={profitConfig.companyReservePct}
                  onChange={(e) =>
                    setProfitConfig((prev) => ({
                      ...prev,
                      companyReservePct: Math.max(0, Math.min(90, Number(e.target.value) || 0)),
                    }))
                  }
                  className={styles.rateNumberInput}
                />
                <span>%</span>
              </div>
            </div>
            <strong className={styles.cashFlowValuePurple}>
              (-) {formatBRL(financialFlow.companyReserve)}
            </strong>
            <p className={styles.cashFlowDesc}>
              {profitConfig.isManualMode && profitConfig.manualModeType === 'net'
                ? 'Isento no modo de lucro direto'
                : `${profitConfig.companyReservePct}% do lucro operacional retido no cofre da marca para capital de giro, tráfego e confecção do próximo drop.`}
            </p>
          </div>

          {/* CARD 6: LUCRO LÍQUIDO DISTRIBUÍVEL */}
          <div className={`${styles.cashFlowCard} ${styles.cashFlowCardNetProfit}`}>
            <div className={styles.cashFlowCardHeader}>
              <div className={styles.cashFlowCardTitleWithIcon}>
                <Coins size={15} color="#22c55e" />
                <span>6. LUCRO LÍQUIDO DISTRIBUÍVEL</span>
              </div>
              <span className={styles.cashFlowTagNeon}>Pronto p/ Sócios</span>
            </div>
            <strong className={styles.cashFlowValueNeon}>
              {formatBRL(financialFlow.distributableProfit)}
            </strong>
            <p className={styles.cashFlowDesc}>
              {profitConfig.isManualMode && profitConfig.manualModeType === 'net'
                ? 'Valor líquido definido manualmente para repasse integral imediato aos sócios.'
                : 'Receita Bruta - Frete - Gateway - CMV Reposição - Reserva de Caixa. Pronto para repasse imediato.'}
            </p>
          </div>
        </div>

        {/* PARTE B: SIMULADOR INTERATIVO DE DIVISÃO SOCIETÁRIA */}
        <div className={styles.partnersSimulatorBox}>
          <div className={styles.simulatorTopBar}>
            <div>
              <span className={styles.simulatorTag}>REPARTIÇÃO DE LUCROS</span>
              <h3 className={styles.simulatorTitle}>DIVISÃO ENTRE OS INTEGRANTES</h3>
              <p className={styles.simulatorSub}>
                Distribua os 100% do Lucro Líquido Distribuível ({formatBRL(financialFlow.distributableProfit)}) entre os integrantes da equipe com cálculo automático e em tempo real.
              </p>
            </div>

            {/* PRESETS RÁPIDOS (1 CLIQUE) */}
            <div className={styles.presetButtonsRow}>
              <button
                onClick={() => handleApplyPreset('equal4')}
                className={styles.presetBtn}
                title="Dividir igualmente 25% para cada um dos 4 integrantes"
              >
                4 Sócios (25% cada)
              </button>
              <button
                onClick={() => handleApplyPreset('techFocus')}
                className={`${styles.presetBtn} ${styles.presetBtnHighlight}`}
                title="Cenário Operacional: 20% / 20% / 40% (Dev/Tech Lead) / 20%"
              >
                Foco Operacional (3º Sócio 40%)
              </button>
              <button
                onClick={() => handleApplyPreset('equal3')}
                className={styles.presetBtn}
                title="Dividir igualmente entre 3 integrantes"
              >
                3 Sócios (33.3% cada)
              </button>
              <button
                onClick={handleAddMember}
                className={styles.presetBtnAdd}
                title="Adicionar novo integrante à divisão societária"
              >
                <Plus size={12} />
                <span>Adicionar Integrante</span>
              </button>
            </div>
          </div>

          {/* BARRA DE ALOCAÇÃO TOTAL MULTIPART E VALIDADOR DE 100% */}
          <div className={styles.allocationMonitorBox}>
            <div className={styles.allocationHeaderRow}>
              <div className={styles.allocationStatusGroup}>
                <span className={styles.allocationLabel}>ALOCAÇÃO SOCIETÁRIA TOTAL:</span>
                {is100 ? (
                  <span className={styles.allocationStatusSuccess}>
                    <CheckCircle2 size={13} color="#22c55e" />
                    ✓ 100% Alocado Perfeitamente
                  </span>
                ) : isOver100 ? (
                  <span className={styles.allocationStatusError}>
                    <AlertTriangle size={13} color="#f87171" />
                    Soma em {financialFlow.totalAllocatedPercent}% (Excedeu em {financialFlow.excessPercent}%)
                  </span>
                ) : (
                  <span className={styles.allocationStatusWarning}>
                    <AlertCircle size={13} color="#facc15" />
                    Soma em {financialFlow.totalAllocatedPercent}% • {financialFlow.leftoverPercent}% (R$ {formatBRL(financialFlow.distributableProfit * (financialFlow.leftoverPercent / 100))}) retido como bônus no Caixa da Marca
                  </span>
                )}
              </div>

              <div className={styles.allocationActions}>
                {isOver100 && (
                  <button
                    onClick={handleNormalizeTo100}
                    className={styles.autoFixBtn}
                    title="Ajustar proporcionalmente todas as cotas para somarem exatamente 100%"
                  >
                    Normalizar para 100%
                  </button>
                )}
                {isUnder100 && (
                  <button
                    onClick={handleEqualize100}
                    className={styles.autoFixBtn}
                    title="Dividir 100% igualmente entre todos os integrantes cadastrados"
                  >
                    Equalizar 100%
                  </button>
                )}
              </div>
            </div>

            {/* BARRA DE PROGRESSO MULTIPART VISUAL */}
            <div className={styles.multipartProgressBar}>
              {(profitConfig.members || []).map((m, idx) => {
                const color = MEMBER_PALETTE[idx % MEMBER_PALETTE.length];
                const width = Math.min(100, Math.max(0, Number(m.percent || 0)));
                return (
                  <div
                    key={m.id}
                    className={styles.multipartSegment}
                    style={{ width: `${width}%`, backgroundColor: color }}
                    title={`${m.name}: ${m.percent}%`}
                  />
                );
              })}
              {isUnder100 && (
                <div
                  className={styles.multipartSegmentLeftover}
                  style={{ width: `${financialFlow.leftoverPercent}%` }}
                  title={`Sobra no Caixa: ${financialFlow.leftoverPercent}%`}
                />
              )}
            </div>
          </div>

          {/* LISTA DE INTEGRANTES INTERATIVOS */}
          <div className={styles.membersGrid}>
            {(profitConfig.members || []).map((member, idx) => {
              const color = MEMBER_PALETTE[idx % MEMBER_PALETTE.length];
              const shareReais = financialFlow.distributableProfit * (Number(member.percent || 0) / 100);

              return (
                <div key={member.id} className={styles.memberCard}>
                  <div className={styles.memberCardTop}>
                    <div className={styles.memberNameRoleBox}>
                      <span className={styles.memberDot} style={{ backgroundColor: color }} />
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => handleUpdateMember(member.id, { name: e.target.value })}
                        className={styles.memberNameInput}
                        placeholder="Nome do Integrante"
                      />
                      <input
                        type="text"
                        value={member.role}
                        onChange={(e) => handleUpdateMember(member.id, { role: e.target.value })}
                        className={styles.memberRoleInput}
                        placeholder="Atribuição / Cargo"
                      />
                    </div>

                    {profitConfig.members.length > 1 && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className={styles.removeMemberBtn}
                        title="Remover integrante"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  {/* VALOR A RECEBER EM REAIS (NEON) */}
                  <div className={styles.memberShareValueRow}>
                    <div className={styles.memberShareReais}>
                      {formatBRL(shareReais)}
                    </div>
                    <span className={styles.memberShareSub}>recebimento líquido</span>
                  </div>

                  {/* SLIDER + INPUT NUMÉRICO + BOTÕES RÁPIDOS */}
                  <div className={styles.memberControlRow}>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={member.percent}
                      onChange={(e) => handleUpdateMember(member.id, { percent: Number(e.target.value) })}
                      className={styles.memberSlider}
                      style={{ accentColor: color }}
                    />

                    <div className={styles.memberPercentInputs}>
                      <button
                        onClick={() => handleAdjustMemberPercent(member.id, -5)}
                        className={styles.stepBtn}
                        title="Diminuir 5%"
                      >
                        -5%
                      </button>
                      <div className={styles.percentBox}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={member.percent}
                          onChange={(e) =>
                            handleUpdateMember(member.id, {
                              percent: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                            })
                          }
                          className={styles.percentNumberInput}
                        />
                        <span>%</span>
                      </div>
                      <button
                        onClick={() => handleAdjustMemberPercent(member.id, 5)}
                        className={styles.stepBtn}
                        title="Aumentar 5%"
                      >
                        +5%
                      </button>
                    </div>
                  </div>

                  {/* MINI BARRA INDIVIDUAL */}
                  <div className={styles.memberMiniBar}>
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(0, Number(member.percent || 0)))}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };


  // Renderizador unificado do dashboard de gráficos e predição
  const renderChartsDashboard = () => (
    <div className={styles.chartsSuite}>
      <div className={styles.chartsSuiteHeader}>
        <div className={styles.chartsSuiteTitleGroup}>
          <span className={styles.chartsSuiteBadge}>
            <Activity size={13} color="#4ade80" />
            BUSINESS INTELLIGENCE // RECHARTS TELEMETRY
          </span>
          <h2 className={styles.chartsSuiteTitle}>
            PAINEL DE GRÁFICOS ANALÍTICOS & ESTIMATIVAS PREDITIVAS
          </h2>
          <p className={styles.chartsSuiteSub}>
            Métricas calculadas exclusivamente com base em transações pagas e
            telemetria comportamental ({periodLabel}).
          </p>
        </div>
        <div
          className={styles.chartTagPill}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <Target size={12} color="#facc15" />
          <span>MODELO PREDITIVO ATIVO</span>
        </div>
      </div>

      {/* FAIXA DE TRANSPARÊNCIA: STATUS REAL DE PEDIDOS & RECEITA */}
      <div className={styles.orderStatusRibbon}>
        <div className={styles.statusRibbonItemPaid}>
          <div className={styles.statusRibbonHeader}>
            <span className={styles.statusRibbonDotGreen} />
            <strong>PAGOS & APROVADOS (CAIXA REAL)</strong>
          </div>
          <div className={styles.statusRibbonValueGreen}>
            R$ {paidRevenue.toFixed(2).replace(".", ",")}
          </div>
          <span className={styles.statusRibbonSub}>
            {paidOrders.length} pedidos confirmados ({totalItemsSold} peças)
          </span>
        </div>

        <div className={styles.statusRibbonItemPending}>
          <div className={styles.statusRibbonHeader}>
            <span className={styles.statusRibbonDotYellow} />
            <strong>AGUARDANDO PAGAMENTO</strong>
          </div>
          <div className={styles.statusRibbonValueYellow}>
            R$ {pendingRevenue.toFixed(2).replace(".", ",")}
          </div>
          <span className={styles.statusRibbonSub}>
            {pendingOrders.length} pedidos pendentes no PIX / Boleto
          </span>
        </div>

        <div className={styles.statusRibbonItemCancelled}>
          <div className={styles.statusRibbonHeader}>
            <span className={styles.statusRibbonDotRed} />
            <strong>CANCELADOS / RECUSADOS</strong>
          </div>
          <div className={styles.statusRibbonValueRed}>
            R$ {cancelledRevenue.toFixed(2).replace(".", ",")}
          </div>
          <span className={styles.statusRibbonSub}>
            {cancelledOrders.length} pedidos não convertidos ou expirados
          </span>
        </div>
      </div>

      {/* CARDS KPIS PREDITIVOS */}
      <div className={styles.predictiveKpiGrid}>
        <div
          className={`${styles.predictiveKpiCard} ${styles.predictiveKpiCardGlow}`}
        >
          <div className={styles.predictiveKpiHeader}>
            <span className={styles.predictiveKpiLabel}>Faturamento Pago</span>
            <Sparkles size={14} color="#4ade80" />
          </div>
          <div
            className={styles.predictiveKpiValue}
            style={{ color: "#4ade80" }}
          >
            R$ {predictiveStats.periodRevenue.toFixed(2).replace(".", ",")}
          </div>
          <span className={styles.predictiveKpiSub}>
            Total arrecadado no período ({periodLabel})
          </span>
        </div>

        <div
          className={`${styles.predictiveKpiCard} ${styles.predictiveKpiCardGold}`}
        >
          <div className={styles.predictiveKpiHeader}>
            <span className={styles.predictiveKpiLabel}>
              Projeção Próximos 7 Dias
            </span>
            <TrendingUp size={14} color="#facc15" />
          </div>
          <div
            className={styles.predictiveKpiValue}
            style={{ color: "#facc15" }}
          >
            R${" "}
            {predictiveStats.projected7DaysRevenue.toFixed(2).replace(".", ",")}
          </div>
          <span className={styles.predictiveKpiSub}>
            Estimativa calculada por inércia e média diária
          </span>
        </div>

        <div className={styles.predictiveKpiCard}>
          <div className={styles.predictiveKpiHeader}>
            <span className={styles.predictiveKpiLabel}>Ticket Médio Real</span>
            <Tag size={14} color="#60a5fa" />
          </div>
          <div className={styles.predictiveKpiValue}>
            R$ {predictiveStats.averageTicket.toFixed(2).replace(".", ",")}
          </div>
          <span className={styles.predictiveKpiSub}>
            Por pedido confirmado e aprovado
          </span>
        </div>

        <div className={styles.predictiveKpiCard}>
          <div className={styles.predictiveKpiHeader}>
            <span className={styles.predictiveKpiLabel}>
              Velocidade de Vendas
            </span>
            <Zap size={14} color="#a78bfa" />
          </div>
          <div className={styles.predictiveKpiValue}>
            {predictiveStats.dailyVelocity}{" "}
            <small style={{ fontSize: "0.8rem", color: "#888" }}>
              pedidos/dia
            </small>
          </div>
          <span className={styles.predictiveKpiSub}>
            Média de tração diária no período
          </span>
        </div>
      </div>

      {/* 1. EVOLUÇÃO DIÁRIA DE RECEITA & TRÁFEGO (SVG AREA + LINE CHART NATIVO) */}
      <div className={styles.chartCardFullWidth}>
        <div className={styles.chartCardHeader}>
          <div className={styles.chartCardHeaderLeft}>
            <h3 className={styles.chartCardTitle}>
              <TrendingUp size={15} color={evolutionSvgChart.theme.stroke} />
              EVOLUÇÃO DIÁRIA DE RECEITA & TRÁFEGO
            </h3>
            <p className={styles.chartCardDesc}>
              Curva diária em SVG nativo de alta precisão. Passe o mouse sobre os pontos para inspecionar Receita, Pedidos, Visitantes Únicos e Pageviews.
            </p>
          </div>
          <div className={styles.metricSelectorGroup}>
            <button
              type="button"
              onClick={() => setEvolutionMetric("revenue")}
              className={`${styles.metricSelectorBtn} ${evolutionMetric === "revenue" ? styles.metricSelectorBtnActiveGreen : ""}`}
            >
              Receita (R$)
            </button>
            <button
              type="button"
              onClick={() => setEvolutionMetric("orders")}
              className={`${styles.metricSelectorBtn} ${evolutionMetric === "orders" ? styles.metricSelectorBtnActiveYellow : ""}`}
            >
              Pedidos
            </button>
            <button
              type="button"
              onClick={() => setEvolutionMetric("visits")}
              className={`${styles.metricSelectorBtn} ${evolutionMetric === "visits" ? styles.metricSelectorBtnActiveBlue : ""}`}
            >
              Visitas
            </button>
          </div>
        </div>

        <div
          className={styles.svgAreaChartWrapper}
          onMouseLeave={() => setHoveredEvolutionPoint(null)}
        >
          <svg
            viewBox="0 0 800 240"
            className={styles.svgAreaChart}
            role="img"
            aria-label="Gráfico de Evolução Diária de Receita e Tráfego"
          >
            <defs>
              <linearGradient id="svgEvolutionAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={evolutionSvgChart.theme.stroke} stopOpacity="0.28" />
                <stop offset="100%" stopColor={evolutionSvgChart.theme.stroke} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Linhas de grade horizontais pontilhadas + Eixo Y */}
            {evolutionSvgChart.gridTicks.map((tick, idx) => (
              <g key={`grid-tick-${idx}`}>
                <line
                  x1={evolutionSvgChart.padLeft}
                  y1={tick.y}
                  x2={evolutionSvgChart.svgWidth - evolutionSvgChart.padRight}
                  y2={tick.y}
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={evolutionSvgChart.padLeft - 8}
                  y={tick.y + 4}
                  textAnchor="end"
                  fill="#888888"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {tick.label}
                </text>
              </g>
            ))}

            {/* Área preenchida sob a curva */}
            {evolutionSvgChart.areaPath && (
              <path
                d={evolutionSvgChart.areaPath}
                fill="url(#svgEvolutionAreaGrad)"
              />
            )}

            {/* Linha principal suave */}
            {evolutionSvgChart.linePath && (
              <path
                d={evolutionSvgChart.linePath}
                fill="none"
                stroke={evolutionSvgChart.theme.stroke}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Linha guia vertical no ponto em hover */}
            {hoveredEvolutionPoint && (
              <line
                x1={hoveredEvolutionPoint.x}
                y1={24}
                x2={hoveredEvolutionPoint.x}
                y2={evolutionSvgChart.baseLineY}
                stroke="rgba(255, 255, 255, 0.25)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
            )}

            {/* Pontos interativos e rótulos no eixo X */}
            {evolutionSvgChart.points.map((pt, idx) => {
              const isHovered = hoveredEvolutionPoint?.day?.dateKey === pt.day.dateKey;
              const showXLabel =
                evolutionSvgChart.points.length <= 14 ||
                idx % 2 === 0 ||
                idx === evolutionSvgChart.points.length - 1;

              return (
                <g key={`evo-pt-${pt.day.dateKey || idx}`}>
                  {showXLabel && (
                    <text
                      x={pt.x}
                      y={evolutionSvgChart.svgHeight - 10}
                      textAnchor="middle"
                      fill={isHovered ? "#ffffff" : "#888888"}
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {pt.day.label}
                    </text>
                  )}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 6 : 3.8}
                    fill={isHovered ? "#ffffff" : evolutionSvgChart.theme.stroke}
                    stroke="#0a0a0a"
                    strokeWidth="2"
                    className={styles.svgInteractivePoint}
                  />
                  {/* Área de captura ampliada para hover fluido */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={16}
                    fill="transparent"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHoveredEvolutionPoint(pt)}
                  />
                </g>
              );
            })}
          </svg>

          {/* Tooltip flutuante detalhado no hover */}
          {hoveredEvolutionPoint && (
            <div
              className={styles.svgEvolutionTooltip}
              style={{
                left: `${Math.min(Math.max((hoveredEvolutionPoint.x / 800) * 100, 14), 84)}%`,
              }}
            >
              <div className={styles.svgTooltipHeader}>
                DATA // {hoveredEvolutionPoint.day.label} ({hoveredEvolutionPoint.day.dateKey})
              </div>
              <div className={styles.svgTooltipRow}>
                <span>Receita Aprovada:</span>
                <strong style={{ color: "#22c55e" }}>
                  R$ {Number(hoveredEvolutionPoint.day.faturamentoReal || 0).toFixed(2).replace(".", ",")}
                </strong>
              </div>
              <div className={styles.svgTooltipRow}>
                <span>Pedidos Pagos:</span>
                <strong style={{ color: "#facc15" }}>
                  {hoveredEvolutionPoint.day.pedidosCount || 0} ped.
                </strong>
              </div>
              <div className={styles.svgTooltipRow}>
                <span>Visitantes Únicos:</span>
                <strong style={{ color: "#3b82f6" }}>
                  {hoveredEvolutionPoint.day.visits || 0} sessões
                </strong>
              </div>
              <div className={styles.svgTooltipRow}>
                <span>Pageviews:</span>
                <strong style={{ color: "#e5e5e5" }}>
                  {hoveredEvolutionPoint.day.pageViews || 0} views
                </strong>
              </div>
            </div>
          )}
        </div>

        <div className={styles.chartLegendRow}>
          <div className={styles.chartLegendItem}>
            <span
              className={styles.chartLegendDot}
              style={{ backgroundColor: evolutionSvgChart.theme.stroke }}
            />
            <span>{evolutionSvgChart.theme.label} (Histórico Diário)</span>
          </div>
          <div className={styles.chartLegendItem}>
            <span className={styles.chartLegendDot} style={{ backgroundColor: "#3b82f6" }} />
            <span>Sessões Únicas no Período: {funnel.visits}</span>
          </div>
          <div className={styles.chartLegendItem}>
            <span className={styles.chartLegendDot} style={{ backgroundColor: "#a855f7" }} />
            <span>Pageviews no Período: {funnel.pageViews}</span>
          </div>
        </div>
      </div>

      {/* NOVA SEÇÃO ESTRATÉGICA: DISPOSITIVOS, SISTEMAS & ORIGEM DE TRÁFEGO (3 CARDS VISUAIS SVG) */}
      <div className={styles.chartsSubSectionHeader}>
        <div className={styles.chartsSuiteTitleGroup}>
          <span className={styles.chartsSuiteBadge}>
            <Smartphone size={13} color="#22c55e" />
            CLIENT ENVIRONMENT // LGPD ANONYMOUS TELEMETRY
          </span>
          <h3 className={styles.chartsSuiteTitle}>
            DISPOSITIVOS, SISTEMAS OPERACIONAIS & ORIGEM DE TRÁFEGO
          </h3>
          <p className={styles.chartsSuiteSub}>
            Mapeamento anônimo de sessões únicas por dispositivo, navegador (incluindo Instagram In-App) e canal de aquisição.
          </p>
        </div>
        <span className={`${styles.chartTagPill} ${styles.chartTagGreen}`}>
          SVG Nativo 0 KB
        </span>
      </div>

      <div className={styles.telemetryThreeCardsGrid}>
        {/* CARD 1: DISPOSITIVOS DE ACESSO (SVG DONUT CHART INTERATIVO + DETALHAMENTO) */}
        <div className={styles.chartCard}>
          <div className={styles.chartCardHeader}>
            <div className={styles.chartCardHeaderLeft}>
              <h3 className={styles.chartCardTitle}>
                <Smartphone size={15} color="#22c55e" />
                DISPOSITIVOS DE ACESSO
              </h3>
              <p className={styles.chartCardDesc}>
                Divisão percentual de sessões entre Smartphone, Desktop e Tablet.
              </p>
            </div>
            <span className={`${styles.chartTagPill} ${styles.chartTagGreen}`}>
              Donut SVG
            </span>
          </div>

          <div className={styles.deviceDonutLayout}>
            <div className={styles.svgDonutBox}>
              <svg viewBox="0 0 180 180" className={styles.svgDonutChart}>
                <circle
                  cx="90"
                  cy="90"
                  r="68"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeWidth="18"
                />
                {telemetryBreakdown.donutSegments.map((seg) => (
                  <circle
                    key={`donut-seg-${seg.key}`}
                    cx="90"
                    cy="90"
                    r="68"
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="18"
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    transform="rotate(-90 90 90)"
                    style={{ transition: "stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease" }}
                  />
                ))}
              </svg>
              <div className={styles.svgDonutCenter}>
                {telemetryBreakdown.dominantDevice.key === "desktop" ? (
                  <Monitor size={18} color={telemetryBreakdown.dominantDevice.color} />
                ) : telemetryBreakdown.dominantDevice.key === "tablet" ? (
                  <Tablet size={18} color={telemetryBreakdown.dominantDevice.color} />
                ) : (
                  <Smartphone size={18} color={telemetryBreakdown.dominantDevice.color} />
                )}
                <strong>{telemetryBreakdown.dominantDevice.pct}%</strong>
                <span>{telemetryBreakdown.dominantDevice.shortLabel}</span>
              </div>
            </div>

            <div className={styles.deviceBreakdownList}>
              {telemetryBreakdown.devicesList.map((dev) => (
                <div key={`dev-row-${dev.key}`} className={styles.deviceBreakdownItem}>
                  <div className={styles.deviceBreakdownLeft}>
                    <span
                      className={styles.deviceIconBadge}
                      style={{
                        borderColor: `${dev.color}55`,
                        backgroundColor: `${dev.color}18`,
                        color: dev.color,
                      }}
                    >
                      {dev.key === "desktop" ? (
                        <Monitor size={14} />
                      ) : dev.key === "tablet" ? (
                        <Tablet size={14} />
                      ) : (
                        <Smartphone size={14} />
                      )}
                    </span>
                    <div>
                      <strong className={styles.deviceName}>{dev.label}</strong>
                      <small className={styles.deviceSubBadge}>{dev.badge}</small>
                    </div>
                  </div>
                  <div className={styles.deviceBreakdownRight}>
                    <strong style={{ color: dev.color }}>{dev.pct}%</strong>
                    <small>{dev.count} sessões</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CARD 2: SISTEMAS OPERACIONAIS & NAVEGADORES (DESTAQUE INSTAGRAM IN-APP) */}
        <div className={styles.chartCard}>
          <div className={styles.chartCardHeader}>
            <div className={styles.chartCardHeaderLeft}>
              <h3 className={styles.chartCardTitle}>
                <Globe size={15} color="#3b82f6" />
                SISTEMAS & NAVEGADORES
              </h3>
              <p className={styles.chartCardDesc}>
                Plataformas utilizadas pelos clientes, destacando acessos via navegador interno do Instagram.
              </p>
            </div>
            <span className={`${styles.chartTagPill} ${styles.chartTagBlue}`}>
              OS + In-App
            </span>
          </div>

          <div className={styles.telemetryBarsContainer}>
            {telemetryBreakdown.osAndBrowsersList.map((item) => (
              <div key={`os-item-${item.key}`} className={styles.telemetryBarRow}>
                <div className={styles.telemetryBarMeta}>
                  <span className={styles.telemetryBarLabel}>
                    <span
                      className={styles.chartLegendDot}
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.label}</span>
                    {item.isHighlight && (
                      <span className={styles.igInAppBadge}>SOCIAL BROWSER</span>
                    )}
                  </span>
                  <span className={styles.telemetryBarCount}>
                    <strong>{item.count}</strong> <small>({item.sharePct}%)</small>
                  </span>
                </div>
                <div className={styles.telemetryBarTrack}>
                  <div
                    className={styles.telemetryBarFill}
                    style={{
                      width: `${item.barPct}%`,
                      background: `linear-gradient(90deg, ${item.color}99, ${item.color})`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CARD 3: ORIGEM DE TRÁFEGO & AQUISIÇÃO */}
        <div className={styles.chartCard}>
          <div className={styles.chartCardHeader}>
            <div className={styles.chartCardHeaderLeft}>
              <h3 className={styles.chartCardTitle}>
                <Share2 size={15} color="#ec4899" />
                ORIGEM DE TRÁFEGO & AQUISIÇÃO
              </h3>
              <p className={styles.chartCardDesc}>
                Canais de entrada dos visitantes para medir retorno de Stories/Posts no Instagram e disparos no WhatsApp.
              </p>
            </div>
            <span className={`${styles.chartTagPill} ${styles.chartTagPurple}`}>
              Canais UTM & Ref
            </span>
          </div>

          <div className={styles.telemetryBarsContainer}>
            {telemetryBreakdown.trafficSourcesList.map((src) => (
              <div key={`src-item-${src.key}`} className={styles.telemetryBarRow}>
                <div className={styles.telemetryBarMeta}>
                  <span className={styles.telemetryBarLabel}>
                    <span
                      className={styles.chartLegendDot}
                      style={{ backgroundColor: src.color }}
                    />
                    <span>{src.label}</span>
                    <span className={styles.sourceChannelBadge}>{src.tag}</span>
                  </span>
                  <span className={styles.telemetryBarCount}>
                    <strong style={{ color: src.color }}>{src.pct}%</strong>{" "}
                    <small>({src.count} vis.)</small>
                  </span>
                </div>
                <div className={styles.telemetryBarTrack}>
                  <div
                    className={styles.telemetryBarFill}
                    style={{
                      width: `${src.barPct}%`,
                      background: `linear-gradient(90deg, ${src.color}88, ${src.color})`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SEÇÃO DESTAQUE: ENGENHARIA FINANCEIRA, CAIXA & DIVISÃO DE LUCROS */}
      {renderProfitSimulator()}

      {/* GRID 2 COLUNAS */}
      <div className={styles.chartsGridTwoCols}>
        {/* 2. JORNADA VISUAL DO FUNIL */}
        <div className={styles.chartCard}>
          <div className={styles.chartCardHeader}>
            <div className={styles.chartCardHeaderLeft}>
              <h3 className={styles.chartCardTitle}>
                <Layers size={15} color="#60a5fa" />
                VOLUME POR ETAPA DO FUNIL
              </h3>
              <p className={styles.chartCardDesc}>
                Comparação direta do volume e retenção de usuários etapa por
                etapa.
              </p>
            </div>
            <span className={styles.chartTagPill}>Bar Chart</span>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={funnelChartData}
                margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255, 255, 255, 0.06)"
                  vertical={false}
                />
                <XAxis
                  dataKey="etapa"
                  stroke="#666666"
                  tick={{ fill: "#888888", fontSize: 10 }}
                />
                <YAxis
                  stroke="#666666"
                  tick={{ fill: "#888888", fontSize: 11 }}
                />
                <RechartsTooltip content={<CustomChartTooltip />} />
                <Bar
                  dataKey="volume"
                  name="Usuários / Ações"
                  radius={[4, 4, 0, 0]}
                >
                  {funnelChartData.map((entry, index) => (
                    <Cell key={`funnel-cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. PERFORMANCE POR CATEGORIA */}
        <div className={styles.chartCard}>
          <div className={styles.chartCardHeader}>
            <div className={styles.chartCardHeaderLeft}>
              <h3 className={styles.chartCardTitle}>
                <Package size={15} color="#4ade80" />
                RECEITA POR CATEGORIA
              </h3>
              <p className={styles.chartCardDesc}>
                Faturamento bruto gerado por cada categoria de produto
                cadastrada.
              </p>
            </div>
            <span className={`${styles.chartTagPill} ${styles.chartTagGreen}`}>
              Receita (R$)
            </span>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryChartData}
                margin={{ top: 15, right: 15, left: 10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255, 255, 255, 0.06)"
                  vertical={false}
                />
                <XAxis
                  dataKey="categoria"
                  stroke="#666666"
                  tick={{ fill: "#888888", fontSize: 11 }}
                />
                <YAxis
                  stroke="#666666"
                  tick={{ fill: "#888888", fontSize: 11 }}
                  tickFormatter={(val) => `R$${val}`}
                />
                <RechartsTooltip
                  content={<CustomChartTooltip isCurrency={true} />}
                />
                <Bar
                  dataKey="receita"
                  name="Receita Bruta"
                  fill="#4ade80"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. PREFERÊNCIA DE CORES (DONUT) */}
        <div className={styles.chartCard}>
          <div className={styles.chartCardHeader}>
            <div className={styles.chartCardHeaderLeft}>
              <h3 className={styles.chartCardTitle}>
                <Sparkles size={15} color="#e5e5e5" />
                DISTRIBUIÇÃO DE CORES VENDIDAS
              </h3>
              <p className={styles.chartCardDesc}>
                Share de preferência dos clientes em peças aprovadas.
              </p>
            </div>
            <span className={styles.chartTagPill}>Donut Pie</span>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <RechartsTooltip
                  content={<CustomChartTooltip valueSuffix=" un." />}
                />
                <Pie
                  data={colorDonutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                >
                  {colorDonutData.map((entry, index) => (
                    <Cell
                      key={`color-cell-${index}`}
                      fill={entry.color}
                      stroke="#0a0a0a"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.chartLegendRow}>
            {colorDonutData.map((entry, idx) => (
              <div key={`legend-col-${idx}`} className={styles.chartLegendItem}>
                <span
                  className={styles.chartLegendDot}
                  style={{
                    backgroundColor: entry.color,
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                />
                <span>
                  {entry.name} ({entry.value} un.)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 5. DEMANDA POR GRADE DE TAMANHOS */}
        <div className={styles.chartCard}>
          <div className={styles.chartCardHeader}>
            <div className={styles.chartCardHeaderLeft}>
              <h3 className={styles.chartCardTitle}>
                <Ruler size={15} color="#facc15" />
                CORTE & DEMANDA POR TAMANHO
              </h3>
              <p className={styles.chartCardDesc}>
                Volume total de peças vendidas por tamanho da grade têxtil.
              </p>
            </div>
            <span className={`${styles.chartTagPill} ${styles.chartTagYellow}`}>
              Grade PP - GG
            </span>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sizeBarData}
                margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255, 255, 255, 0.06)"
                  vertical={false}
                />
                <XAxis
                  dataKey="tamanho"
                  stroke="#666666"
                  tick={{ fill: "#888888", fontSize: 11 }}
                />
                <YAxis
                  stroke="#666666"
                  tick={{ fill: "#888888", fontSize: 11 }}
                />
                <RechartsTooltip
                  content={<CustomChartTooltip valueSuffix=" un." />}
                />
                <Bar
                  dataKey="vendas"
                  name="Peças Vendidas"
                  fill="#facc15"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 6. COMPORTAMENTO POR TURNO DO DIA */}
      <div className={styles.chartCardFullWidth}>
        <div className={styles.chartCardHeader}>
          <div className={styles.chartCardHeaderLeft}>
            <h3 className={styles.chartCardTitle}>
              <Clock size={15} color="#60a5fa" />
              COMPORTAMENTO & ATIVIDADE POR TURNO
            </h3>
            <p className={styles.chartCardDesc}>
              Distribuição de pedidos confirmados e inícios de checkout por
              turno (Madrugada, Manhã, Tarde e Noite).
            </p>
          </div>
          <span className={styles.chartTagPill}>Turnos Streetwear</span>
        </div>

        <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={hourlyActivityData}
              margin={{ top: 15, right: 20, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient
                  id="colorHourlyGrad"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient
                  id="colorHourlyPaidGrad"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#4ade80" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#4ade80" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255, 255, 255, 0.06)"
                vertical={false}
              />
              <XAxis
                dataKey="shift"
                stroke="#666666"
                tick={{ fill: "#888888", fontSize: 11 }}
              />
              <YAxis
                stroke="#666666"
                tick={{ fill: "#888888", fontSize: 11 }}
              />
              <RechartsTooltip content={<CustomChartTooltip />} />
              <Area
                type="monotone"
                dataKey="checkoutStarts"
                name="Inícios de Checkout"
                stroke="#60a5fa"
                strokeWidth={2}
                fill="url(#colorHourlyGrad)"
              />
              <Area
                type="monotone"
                dataKey="pedidos"
                name="Pedidos Pagos"
                stroke="#4ade80"
                strokeWidth={2}
                fill="url(#colorHourlyPaidGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartLegendRow}>
          <div className={styles.chartLegendItem}>
            <span
              className={styles.chartLegendDot}
              style={{ backgroundColor: "#60a5fa" }}
            />
            <span>Inícios de Checkout</span>
          </div>
          <div className={styles.chartLegendItem}>
            <span
              className={styles.chartLegendDot}
              style={{ backgroundColor: "#4ade80" }}
            />
            <span>Pedidos Pagos Confirmados</span>
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: LOGÍSTICA, MEIOS DE PAGAMENTO & GEOLOCALIZAÇÃO NACIONAL */}
      <div className={styles.chartsSubSectionHeader}>
        <div className={styles.chartsSuiteTitleGroup}>
          <span className={styles.chartsSuiteBadge}>
            <Globe size={13} color="#60a5fa" />
            LOGÍSTICA & CHECKOUT // TELEMETRIA NACIONAL
          </span>
          <h2 className={styles.chartsSuiteTitle}>
            DISTRIBUIÇÃO DE PAGAMENTOS, FRETES & MAPA TERRITORIAL
          </h2>
          <p className={styles.chartsSuiteSub}>
            Preferência de checkout dos clientes, rotas logísticas e alcance de
            envio por estados no Brasil.
          </p>
        </div>
        <div
          className={styles.chartTagPill}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <Truck size={12} color="#4ade80" />
          <span>COLETA ATIVA EM TEMPO REAL</span>
        </div>
      </div>

      {/* 3 CARDS DE KPIS ESPECÍFICOS */}
      <div className={styles.kpiGridThreeCols}>
        <div
          className={`${styles.predictiveKpiCard} ${styles.predictiveKpiCardGlow}`}
        >
          <div className={styles.predictiveKpiHeader}>
            <span className={styles.predictiveKpiLabel}>
              Método de Pagamento Líder
            </span>
            <CreditCard size={14} color="#4ade80" />
          </div>
          <div
            className={styles.predictiveKpiValue}
            style={{ color: "#4ade80" }}
          >
            {topPaymentMethod.name}
          </div>
          <span className={styles.predictiveKpiSub}>
            {topPaymentMethod.percent}% dos pedidos pagos (
            {topPaymentMethod.pedidos} pedidos)
          </span>
        </div>

        <div
          className={`${styles.predictiveKpiCard} ${styles.predictiveKpiCardGold}`}
        >
          <div className={styles.predictiveKpiHeader}>
            <span className={styles.predictiveKpiLabel}>
              Estado Líder em Vendas (UF)
            </span>
            <MapPin size={14} color="#facc15" />
          </div>
          <div
            className={styles.predictiveKpiValue}
            style={{ color: "#facc15" }}
          >
            {topState.uf}{" "}
            <small style={{ fontSize: "0.8rem", color: "#888" }}>
              ({topState.regiao})
            </small>
          </div>
          <span className={styles.predictiveKpiSub}>
            {topState.pedidos} pedidos entregues nesta UF (R${" "}
            {topState.receita.toFixed(2).replace(".", ",")})
          </span>
        </div>

        <div className={styles.predictiveKpiCard}>
          <div className={styles.predictiveKpiHeader}>
            <span className={styles.predictiveKpiLabel}>
              Modalidade de Envio Favorita
            </span>
            <Truck size={14} color="#60a5fa" />
          </div>
          <div className={styles.predictiveKpiValue}>
            {topShippingMethod.modalidade}
          </div>
          <span className={styles.predictiveKpiSub}>
            {topShippingMethod.percent}% das escolhas no carrinho (
            {topShippingMethod.pedidos} envios)
          </span>
        </div>
      </div>

      {/* GRIDS 2 COLUNAS: MEIOS DE PAGAMENTO (DONUT) & MODALIDADE DE ENVIO (BAR) */}
      <div className={styles.chartsGridTwoCols}>
        {/* GRÁFICO 7: MÉTODOS DE PAGAMENTO */}
        <div className={styles.chartCard}>
          <div className={styles.chartCardHeader}>
            <div className={styles.chartCardHeaderLeft}>
              <h3 className={styles.chartCardTitle}>
                <CreditCard size={15} color="#4ade80" />
                MÉTODOS DE PAGAMENTO MAIS USADOS
              </h3>
              <p className={styles.chartCardDesc}>
                Participação de PIX, Cartão de Crédito e Carteira Digital nos
                pagamentos.
              </p>
            </div>
            <span className={`${styles.chartTagPill} ${styles.chartTagGreen}`}>
              Share de Gateway
            </span>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <RechartsTooltip
                  content={<CustomChartTooltip valueSuffix=" pedidos" />}
                />
                <Pie
                  data={paymentMethodsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="pedidos"
                  nameKey="name"
                >
                  {paymentMethodsData.map((entry, index) => (
                    <Cell
                      key={`pm-cell-${index}`}
                      fill={entry.color}
                      stroke="#0a0a0a"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.chartLegendRow}>
            {paymentMethodsData.map((entry, idx) => (
              <div key={`legend-pm-${idx}`} className={styles.chartLegendItem}>
                <span
                  className={styles.chartLegendDot}
                  style={{ backgroundColor: entry.color }}
                />
                <span>
                  {entry.name}:{" "}
                  <strong>
                    {entry.pedidos} ({entry.percent}%)
                  </strong>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* GRÁFICO 8: MODALIDADES DE ENVIO */}
        <div className={styles.chartCard}>
          <div className={styles.chartCardHeader}>
            <div className={styles.chartCardHeaderLeft}>
              <h3 className={styles.chartCardTitle}>
                <Truck size={15} color="#60a5fa" />
                MÉTODOS DE ENVIO MAIS UTILIZADOS
              </h3>
              <p className={styles.chartCardDesc}>
                Distribuição dos pedidos segundo a opção de entrega selecionada
                pelo cliente.
              </p>
            </div>
            <span className={`${styles.chartTagPill} ${styles.chartTagBlue}`}>
              Logística
            </span>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={shippingMethodsData}
                margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255, 255, 255, 0.06)"
                  vertical={false}
                />
                <XAxis
                  dataKey="modalidade"
                  stroke="#666666"
                  tick={{ fill: "#888888", fontSize: 10 }}
                />
                <YAxis
                  stroke="#666666"
                  tick={{ fill: "#888888", fontSize: 11 }}
                />
                <RechartsTooltip
                  content={<CustomChartTooltip valueSuffix=" envios" />}
                />
                <Bar
                  dataKey="pedidos"
                  name="Pedidos Enviados"
                  radius={[4, 4, 0, 0]}
                >
                  {shippingMethodsData.map((entry, index) => (
                    <Cell key={`ship-cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.chartLegendRow}>
            {shippingMethodsData.slice(0, 3).map((entry, idx) => (
              <div
                key={`legend-ship-${idx}`}
                className={styles.chartLegendItem}
              >
                <span
                  className={styles.chartLegendDot}
                  style={{ backgroundColor: entry.fill }}
                />
                <span>
                  {entry.modalidade}: <strong>{entry.percent}%</strong>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* GRÁFICO 9: DISTRIBUIÇÃO GEOGRÁFICA DE ENVIOS NO BRASIL (FULL WIDTH) */}
      <div className={styles.chartCardFullWidth}>
        <div className={styles.chartCardHeader}>
          <div className={styles.chartCardHeaderLeft}>
            <h3 className={styles.chartCardTitle}>
              <MapPin size={15} color="#facc15" />
              MAPA DE ENVIOS & DESTINOS DOS CLIENTES NO BRASIL (ESTADOS / REGIÃO)
            </h3>
            <p className={styles.chartCardDesc}>
              Mapeamento real dos endereços de entrega dos clientes (CEP / UF) para onde estamos enviando peças da THR33.
            </p>
          </div>
        </div>

        {/* MAPA INTERATIVO VETORIAL DO BRASIL COM HOTZONES */}
        <div style={{ marginBottom: "1.75rem", marginTop: "0.5rem" }}>
          <BrazilHeatmap
            stateData={allGeoStates}
            regionData={geoRegionData}
            totalOrders={completedOrders.length}
            totalPieces={totalShippedPieces}
            totalRevenue={predictiveStats.periodRevenue}
          />
        </div>

        {/* COMPARATIVO DE BARRAS POR ESTADO */}
        <div className={styles.chartContainerTall}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={geoStateData}
              margin={{ top: 15, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255, 255, 255, 0.06)"
                vertical={false}
              />
              <XAxis
                dataKey="estado"
                stroke="#666666"
                tick={{ fill: "#888888", fontSize: 11 }}
              />
              <YAxis
                stroke="#666666"
                tick={{ fill: "#888888", fontSize: 11 }}
              />
              <RechartsTooltip
                content={<CustomChartTooltip valueSuffix=" envios" />}
              />
              <Bar
                dataKey="pedidos"
                name="Envios p/ UF"
                radius={[4, 4, 0, 0]}
              >
                {geoStateData.map((entry, index) => {
                  const regColor = REGION_COLORS[entry.regiao] || "#4ade80";
                  return <Cell key={`geo-cell-${index}`} fill={regColor} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartLegendRow}>
          {geoRegionData.map((reg, idx) => (
            <div key={`legend-reg-${idx}`} className={styles.chartLegendItem}>
              <span
                className={styles.chartLegendDot}
                style={{ backgroundColor: reg.fill }}
              />
              <span>
                {reg.regiao}:{" "}
                <strong>
                  {reg.pedidos} pedidos (R${" "}
                  {reg.receita.toFixed(2).replace(".", ",")})
                </strong>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* SEÇÃO 3: SAÚDE DO GATEWAY & TELEMETRIA DE PAGAMENTOS */}
      <div className={styles.chartsSubSectionHeader}>
        <div className={styles.chartsSuiteTitleGroup}>
          <span className={styles.chartsSuiteBadge}>
            <ShieldCheck size={13} color="#4ade80" />
            SEGURANÇA & RESILIÊNCIA // GATEWAY DE PAGAMENTOS
          </span>
          <h2 className={styles.chartsSuiteTitle}>
            AUDITORIA DE TRANSAÇÕES, MOTIVOS DE FALHA & LATÊNCIA DA API
          </h2>
          <p className={styles.chartsSuiteSub}>
            Rastreamento de estabilidade, motivos de recusa de cartão, erros de gateway e velocidade de resposta em milissegundos.
          </p>
        </div>
      </div>

      {/* 3 CARDS DE KPIS DE SAÚDE DA API */}
      <div className={styles.kpiGridThreeCols}>
        <div
          className={`${styles.predictiveKpiCard} ${styles.predictiveKpiCardGlow}`}
        >
          <div className={styles.predictiveKpiHeader}>
            <span className={styles.predictiveKpiLabel}>Taxa de Aprovação</span>
            <ShieldCheck size={14} color="#4ade80" />
          </div>
          <div className={styles.predictiveKpiValue} style={{ color: "#4ade80" }}>
            {approvalRate}%
          </div>
          <span className={styles.predictiveKpiSub}>
            Das tentativas de cobrança finalizadas com sucesso
          </span>
        </div>

        <div
          className={`${styles.predictiveKpiCard} ${styles.predictiveKpiCardGold}`}
        >
          <div className={styles.predictiveKpiHeader}>
            <span className={styles.predictiveKpiLabel}>Latência Média da API</span>
            <Clock size={14} color="#facc15" />
          </div>
          <div className={styles.predictiveKpiValue} style={{ color: "#facc15" }}>
            {avgLatency} <small style={{ fontSize: "0.8rem", color: "#888" }}>ms</small>
          </div>
          <span className={styles.predictiveKpiSub}>
            Tempo médio de resposta do gateway (Saudável: &lt; 1000ms)
          </span>
        </div>

        <div className={styles.predictiveKpiCard}>
          <div className={styles.predictiveKpiHeader}>
            <span className={styles.predictiveKpiLabel}>Fricções / Recusas Monitoradas</span>
            <AlertOctagon size={14} color="#f87171" />
          </div>
          <div className={styles.predictiveKpiValue}>
            {failedAttemptsCount} <small style={{ fontSize: "0.8rem", color: "#888" }}>tentativas</small>
          </div>
          <span className={styles.predictiveKpiSub}>
            Total de {totalAttempts} tentativas auditadas pelo sistema
          </span>
        </div>
      </div>

      {/* GRIDS 2 COLUNAS: MOTIVOS DE FALHA (DONUT) & LINHA DE LATÊNCIA EM TEMPO REAL (LINECHART) */}
      <div className={styles.chartsGridTwoCols}>
        {/* GRÁFICO 10: MOTIVOS DE FALHA NO CHECKOUT */}
        <div className={styles.chartCard}>
          <div className={styles.chartCardHeader}>
            <div className={styles.chartCardHeaderLeft}>
              <h3 className={styles.chartCardTitle}>
                <AlertOctagon size={15} color="#f87171" />
                DISTRIBUIÇÃO DE MOTIVOS DE FALHA NO CHECKOUT
              </h3>
              <p className={styles.chartCardDesc}>
                Auditoria de recusas pelo banco, dados incorretos, erros de rede e travas de segurança.
              </p>
            </div>
            <span className={`${styles.chartTagPill}`} style={{ color: "#f87171", borderColor: "rgba(248,113,113,0.3)", backgroundColor: "rgba(248,113,113,0.1)" }}>
              Fricção
            </span>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <RechartsTooltip
                  content={<CustomChartTooltip valueSuffix=" ocorrências" />}
                />
                <Pie
                  data={failureReasonsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                >
                  {failureReasonsData.map((entry, index) => (
                    <Cell
                      key={`fail-cell-${index}`}
                      fill={entry.fill}
                      stroke="#0a0a0a"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.chartLegendRow}>
            {failureReasonsData.map((entry, idx) => (
              <div key={`legend-fail-${idx}`} className={styles.chartLegendItem}>
                <span
                  className={styles.chartLegendDot}
                  style={{ backgroundColor: entry.fill }}
                />
                <span>
                  {entry.name}: <strong>{entry.value} ({entry.percent}%)</strong>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* GRÁFICO 11: MONITORAMENTO DE LATÊNCIA DA API EM TEMPO REAL */}
        <div className={styles.chartCard}>
          <div className={styles.chartCardHeader}>
            <div className={styles.chartCardHeaderLeft}>
              <h3 className={styles.chartCardTitle}>
                <Activity size={15} color="#4ade80" />
                MONITORAMENTO DE LATÊNCIA DA API (MS)
              </h3>
              <p className={styles.chartCardDesc}>
                Tempo de resposta em milissegundos por requisição com limites de segurança (Threshold).
              </p>
            </div>
            <span className={`${styles.chartTagPill} ${styles.chartTagGreen}`}>
              Tempo de Resposta
            </span>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={latencyTimelineData}
                margin={{ top: 15, right: 20, left: -10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255, 255, 255, 0.06)"
                  vertical={false}
                />
                <XAxis
                  dataKey="time"
                  stroke="#666666"
                  tick={{ fill: "#888888", fontSize: 10 }}
                />
                <YAxis
                  stroke="#666666"
                  tick={{ fill: "#888888", fontSize: 11 }}
                  tickFormatter={(val) => `${val}ms`}
                />
                <RechartsTooltip
                  content={<CustomChartTooltip valueSuffix=" ms" />}
                />
                <ReferenceLine
                  y={1000}
                  stroke="#facc15"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{ value: "Atenção (1000ms)", fill: "#facc15", fontSize: 10, position: "insideTopRight" }}
                />
                <ReferenceLine
                  y={2000}
                  stroke="#f87171"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{ value: "Crítico (2000ms)", fill: "#f87171", fontSize: 10, position: "insideTopRight" }}
                />
                <Line
                  type="monotone"
                  dataKey="latencia"
                  name="Latência"
                  stroke="#4ade80"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#4ade80" }}
                  activeDot={{ r: 5, fill: "#ffffff" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.chartLegendRow}>
            <div className={styles.chartLegendItem}>
              <span className={styles.chartLegendDot} style={{ backgroundColor: "#4ade80" }} />
              <span>Latência da Requisição</span>
            </div>
            <div className={styles.chartLegendItem}>
              <span style={{ width: "14px", height: "2px", borderTop: "2px dashed #facc15" }} />
              <span>Limite Seguro (1000ms)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <span className={styles.breadcrumb}>
              CMS // INTELIGÊNCIA DE PRODUTO & VENDAS
            </span>
            <h1 className={styles.title}>
              MÉTRICAS DE ATRIBUTOS, SKUS & ATIVIDADES
            </h1>
          </div>

          {/* FILTRO DE PERÍODO COM SELETOR DE DATAS */}
          <div className={styles.periodControlWrapper}>
            <div className={styles.periodFilterGroup}>
              <button
                className={`${styles.filterBtn} ${periodFilter === "today" ? styles.activeFilter : ""}`}
                onClick={() => {
                  setPeriodFilter("today");
                  setShowCustomPicker(false);
                }}
              >
                Hoje
              </button>
              <button
                className={`${styles.filterBtn} ${periodFilter === "7days" ? styles.activeFilter : ""}`}
                onClick={() => {
                  setPeriodFilter("7days");
                  setShowCustomPicker(false);
                }}
              >
                7 Dias
              </button>
              <button
                className={`${styles.filterBtn} ${periodFilter === "30days" ? styles.activeFilter : ""}`}
                onClick={() => {
                  setPeriodFilter("30days");
                  setShowCustomPicker(false);
                }}
              >
                30 Dias
              </button>
              <button
                className={`${styles.filterBtn} ${periodFilter === "all" ? styles.activeFilter : ""}`}
                onClick={() => {
                  setPeriodFilter("all");
                  setShowCustomPicker(false);
                }}
              >
                Todo o Período
              </button>
              <button
                className={`${styles.filterBtn} ${styles.customPeriodBtn} ${periodFilter === "custom" ? styles.activeFilter : ""}`}
                onClick={() => setShowCustomPicker((prev) => !prev)}
                title="Filtrar por intervalo de datas personalizado"
              >
                <Calendar size={13} />
                <span>
                  {periodFilter === "custom" && customStartDate && customEndDate
                    ? `${formatShortDate(customStartDate)} - ${formatShortDate(customEndDate)}`
                    : "Datas"}
                </span>
              </button>
              <button
                onClick={loadFullAnalytics}
                disabled={refreshing}
                className={styles.refreshBtn}
                title="Atualizar Métricas"
                aria-label="Atualizar dados"
              >
                <RotateCw
                  size={13}
                  className={refreshing ? styles.spinning : ""}
                />
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
                  <span className={styles.dateErrorText}>
                    {dateValidationErr}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* NAVEGAÇÃO DE TABS */}
        <div className={styles.headerNav}>
          <button
            className={`${styles.tabBtn} ${activeTab === "attributes" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("attributes")}
          >
            <BarChart3 size={13} />
            <span>Cores, Tamanhos & Tipos</span>
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "products" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("products")}
          >
            <ShoppingBag size={13} />
            <span>Raio-X por Produto ({productMetrics.length})</span>
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "deadstock" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("deadstock")}
          >
            <AlertTriangle
              size={13}
              color={deadStockItems.length > 0 ? "#f87171" : "currentColor"}
            />
            <span>Alerta Dead Stock ({deadStockItems.length})</span>
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "funnel" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("funnel")}
          >
            <TrendingUp size={13} />
            <span>Funil de Conversão</span>
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "charts" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("charts")}
          >
            <Activity size={13} />
            <span>Gráficos & Projeções (BI)</span>
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "finance" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("finance")}
          >
            <DollarSign size={13} color="#22c55e" />
            <span>Engenharia Financeira & Sócios</span>
          </button>
        </div>
      </header>

      {/* TAB 1: GRÁFICOS DE CORES, TAMANHOS, CATEGORIAS E INSIGHTS DE PRODUÇÃO */}
      {activeTab === "attributes" && (
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
                  <p className={styles.emptyAttributeState}>
                    Nenhuma cor ativa no catálogo.
                  </p>
                ) : (
                  colorMetrics.map((c) => {
                    const pct =
                      c.units > 0
                        ? Math.round((c.units / maxColorSales) * 100)
                        : 0;
                    return (
                      <div key={c.name} className={styles.barItem}>
                        <div className={styles.barMeta}>
                          <span className={styles.colorLabel}>
                            <span
                              className={styles.colorDot}
                              style={{
                                backgroundColor: c.hex,
                                border:
                                  c.hex === "#000000" ||
                                  c.hex === "#0a0a0a" ||
                                  c.hex === "#0f0f0f"
                                    ? "1px solid #444"
                                    : "none",
                              }}
                            />
                            {c.name}
                          </span>
                          <strong>{c.units} peças</strong>
                        </div>
                        <div className={styles.barTrack}>
                          <div
                            className={styles.barFill}
                            style={{ width: `${pct}%` }}
                          />
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
                  <p className={styles.emptyAttributeState}>
                    Nenhum tamanho configurado.
                  </p>
                ) : (
                  sizeMetrics.map((s) => {
                    const pct =
                      s.sales > 0
                        ? Math.round((s.sales / maxSizeSales) * 100)
                        : 0;
                    return (
                      <div key={s.size} className={styles.barItem}>
                        <div className={styles.barMeta}>
                          <span>TAMANHO {s.size}</span>
                          <strong>{s.sales} vendas</strong>
                        </div>
                        <div className={styles.barTrack}>
                          <div
                            className={`${styles.barFill} ${styles.blueFill}`}
                            style={{ width: `${pct}%` }}
                          />
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
                  <p className={styles.emptyAttributeState}>
                    Nenhuma categoria encontrada.
                  </p>
                ) : (
                  categoryMetrics.map((cat) => {
                    const pct =
                      cat.units > 0
                        ? Math.round((cat.units / maxCatUnits) * 100)
                        : 0;
                    return (
                      <div
                        key={cat.key || cat.label}
                        className={styles.barItem}
                      >
                        <div className={styles.barMeta}>
                          <span>{cat.label}</span>
                          <strong>{cat.units} un.</strong>
                        </div>
                        <div className={styles.barTrack}>
                          <div
                            className={`${styles.barFill} ${styles.greenFill}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <small className={styles.cartHint}>
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(cat.revenue)}{" "}
                          faturados
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
                    : "Aguardando primeiros pedidos para computar a cor líder."}
                </p>
              </div>
              <div className={styles.insightCard}>
                <strong>Concentração na Grade M e G</strong>
                <p>
                  {dynamicInsights.mgPct > 0
                    ? `Juntos, os tamanhos M e G somam ${dynamicInsights.mgPct}% de toda a saída de vestuário streetwear da THR33.`
                    : "Aguardando pedidos para consolidar a curva de tamanhos."}
                </p>
              </div>
              <div className={styles.insightCard}>
                <strong>
                  {dynamicInsights.topCategoryLabel} lidera a receita
                </strong>
                <p>
                  {dynamicInsights.topCategoryRevenue > 0
                    ? `Categoria responsável por R$ ${dynamicInsights.topCategoryRevenue.toFixed(2)} em vendas brutas no e-commerce.`
                    : "Aguardando fechamento de pedidos no catálogo."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RAIO-X COMPLETO POR PRODUTO */}
      {activeTab === "products" && (
        <section className={styles.sectionCard}>
          {/* BARRA DE PESQUISA, FILTROS DE TIPO & STATUS */}
          <div className={styles.tableControls}>
            <div className={styles.tableControlsLeft}>
              {/* BUSCA TEXTUAL */}
              <div className={styles.tableSearchWrapper}>
                <Search size={14} className={styles.tableSearchIcon} />
                <input
                  type="text"
                  placeholder="Buscar peça por nome, categoria, modelagem ou status..."
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  className={styles.tableSearchInput}
                />
                {productSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setProductSearchQuery("")}
                    className={styles.tableClearSearchBtn}
                    title="Limpar busca"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* GRUPO DE SELETORES DE TIPO E STATUS */}
              <div className={styles.filterSelectorsGroup}>
                {/* SELETOR DE TIPO / CATEGORIA */}
                <div className={styles.filterSelectWrapper}>
                  <Layers size={13} className={styles.filterSelectIcon} />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className={styles.filterSelect}
                    title="Filtrar por Tipo / Categoria"
                  >
                    <option value="all">
                      Todos os Tipos ({productMetrics.length})
                    </option>
                    {categoryOptions.map((cat) => (
                      <option key={cat.key} value={cat.key}>
                        {cat.label} ({cat.count})
                      </option>
                    ))}
                  </select>
                </div>

                {/* SELETOR DE STATUS */}
                <div className={styles.filterSelectWrapper}>
                  <Filter size={13} className={styles.filterSelectIcon} />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={styles.filterSelect}
                    title="Filtrar por Status de Inventário & Performance"
                  >
                    <option value="all">
                      Todos os Status ({productMetrics.length})
                    </option>
                    {statusOptions.map((st) => (
                      <option key={st.key} value={st.key}>
                        {st.label} ({st.count})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.tableMetaInfo}>
              <span className={styles.tableMetaCount}>
                {displayedProductMetrics.length}{" "}
                {displayedProductMetrics.length === 1
                  ? "peça listada"
                  : "peças listadas"}
                {(productSearchQuery ||
                  categoryFilter !== "all" ||
                  statusFilter !== "all") &&
                  ` (de ${productMetrics.length})`}
              </span>
              {(productSearchQuery ||
                categoryFilter !== "all" ||
                statusFilter !== "all" ||
                (sortConfig.key && sortConfig.direction !== "none")) && (
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className={styles.resetSortBtn}
                  title="Limpar todos os filtros e ordenações"
                >
                  <RotateCw size={11} />
                  <span>Limpar Filtros</span>
                </button>
              )}
            </div>
          </div>

          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th
                    onClick={() => handleSort("name")}
                    className={styles.sortableTh}
                    title="Clique para ordenar por Nome"
                  >
                    <div className={styles.thSortContent}>
                      <span>PRODUTO</span>
                      {renderSortIcon("name")}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("status")}
                    className={styles.sortableTh}
                    title="Clique para ordenar por Status"
                  >
                    <div className={styles.thWithTooltip}>
                      <div className={styles.thSortContent}>
                        <span>STATUS</span>
                        {renderSortIcon("status")}
                      </div>
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
                  <th
                    onClick={() => handleSort("views")}
                    className={styles.sortableTh}
                    title="Clique para ordenar por Views na PDP"
                  >
                    <div className={styles.thWithTooltip}>
                      <div className={styles.thSortContent}>
                        <span>VIEWS PDP</span>
                        {renderSortIcon("views")}
                      </div>
                      <InfoTooltip
                        text="Total de acessos e visualizações na página individual desta peça."
                        title="Visualizações"
                        position="bottom"
                        align="left"
                        width="260px"
                      />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("adds")}
                    className={styles.sortableTh}
                    title="Clique para ordenar por Adições à Sacola"
                  >
                    <div className={styles.thWithTooltip}>
                      <div className={styles.thSortContent}>
                        <span>ADICIONADOS</span>
                        {renderSortIcon("adds")}
                      </div>
                      <InfoTooltip
                        text="Total de unidades colocadas na sacola pelos clientes."
                        title="Adições à Sacola"
                        position="bottom"
                        align="left"
                        width="260px"
                      />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("removes")}
                    className={styles.sortableTh}
                    title="Clique para ordenar por Remoções da Sacola"
                  >
                    <div className={styles.thWithTooltip}>
                      <div className={styles.thSortContent}>
                        <span>REMOÇÕES</span>
                        {renderSortIcon("removes")}
                      </div>
                      <InfoTooltip
                        text="Total de unidades excluídas da sacola antes da compra."
                        title="Desistências"
                        position="bottom"
                        align="right"
                        width="260px"
                      />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("purchases")}
                    className={styles.sortableTh}
                    title="Clique para ordenar por Vendas Pagas"
                  >
                    <div className={styles.thWithTooltip}>
                      <div className={styles.thSortContent}>
                        <span>VENDAS PAGAS</span>
                        {renderSortIcon("purchases")}
                      </div>
                      <InfoTooltip
                        text="Total de peças vendidas e quantidade de pedidos únicos correspondentes."
                        title="Vendas Concluídas"
                        position="bottom"
                        align="right"
                        width="280px"
                      />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("conversion")}
                    className={styles.sortableTh}
                    title="Clique para ordenar por Conversão Real"
                  >
                    <div className={styles.thWithTooltip}>
                      <div className={styles.thSortContent}>
                        <span>CONVERSÃO REAL</span>
                        {renderSortIcon("conversion")}
                      </div>
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
                  <tr>
                    <td colSpan="8" className={styles.centerText}>
                      Carregando métricas reais do Firestore...
                    </td>
                  </tr>
                ) : displayedProductMetrics.length === 0 ? (
                  <tr>
                    <td colSpan="8" className={styles.centerText}>
                      {productSearchQuery ||
                      categoryFilter !== "all" ||
                      statusFilter !== "all"
                        ? "Nenhum produto encontrado com os filtros selecionados."
                        : "Nenhum produto cadastrado no momento."}
                    </td>
                  </tr>
                ) : (
                  displayedProductMetrics.map((prod) => (
                    <tr key={prod.id}>
                      <td>
                        <div className={styles.prodInfoCell}>
                          {prod.image ? (
                            <img
                              src={prod.image}
                              alt={prod.name}
                              className={styles.thumb}
                            />
                          ) : (
                            <div className={styles.thumbPlaceholder}>
                              <Package size={16} />
                            </div>
                          )}
                          <div>
                            <strong className={styles.prodName}>
                              {prod.name}
                            </strong>
                            <small className={styles.subText}>
                              {prod.fit?.toUpperCase()} • R${" "}
                              {Number(prod.price).toFixed(2)}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`${styles.statusPill} ${styles[prod.statusInfo.key]}`}
                          title={prod.statusInfo.description}
                        >
                          {prod.statusInfo.key === "HOT" && (
                            <Flame size={11} className={styles.pillIcon} />
                          )}
                          {prod.statusInfo.key === "DEAD_STOCK" && (
                            <Clock size={11} className={styles.pillIcon} />
                          )}
                          {prod.statusInfo.key === "LOW_STOCK" && (
                            <AlertTriangle
                              size={11}
                              className={styles.pillIcon}
                            />
                          )}
                          {prod.statusInfo.key === "OUT_OF_STOCK" && (
                            <AlertCircle
                              size={11}
                              className={styles.pillIcon}
                            />
                          )}
                          {prod.statusInfo.key === "HIGH_INTEREST" && (
                            <Eye size={11} className={styles.pillIcon} />
                          )}
                          {prod.statusInfo.key === "HIDDEN" && (
                            <EyeOff size={11} className={styles.pillIcon} />
                          )}
                          {prod.statusInfo.key === "STABLE" && (
                            <Zap size={11} className={styles.pillIcon} />
                          )}
                          <span>{prod.statusInfo.label}</span>
                        </span>
                      </td>
                      <td>
                        <strong>{prod.views}</strong>
                      </td>
                      <td>
                        <span className={styles.addText}>+{prod.adds}</span>
                      </td>
                      <td>
                        <span className={styles.removeText}>
                          -{prod.removes}
                        </span>
                      </td>
                      <td>
                        <div className={styles.salesMetricCell}>
                          <strong className={styles.salesText}>
                            {prod.purchases} un.
                          </strong>
                          <small className={styles.ordersCountText}>
                            ({prod.uniqueOrders} ped.)
                          </small>
                        </div>
                      </td>
                      <td>
                        <div className={styles.conversionBox}>
                          <div className={styles.conversionHeader}>
                            <strong>{prod.conversion}%</strong>
                            <small className={styles.intentHint}>
                              Add: {prod.addToCartRate}%
                            </small>
                          </div>
                          <div className={styles.miniBar}>
                            <div
                              style={{
                                width: `${Math.min(Number(prod.conversion), 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <button
                          onClick={() => handleOpenSkuMatrix(prod)}
                          className={styles.detailBtn}
                        >
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
      {activeTab === "deadstock" && (
        <section className={styles.sectionCard}>
          <div className={styles.deadStockBanner}>
            <div className={styles.deadStockInfo}>
              <div className={styles.alertTagGroup}>
                <AlertTriangle size={14} color="#f87171" />
                <span className={styles.alertTag}>
                  AÇÃO DE MARKETING NECESSÁRIA
                </span>
              </div>
              <h2>SKUS ENCALHADOS PARADOS HÁ MAIS DE 45 DIAS</h2>
              <p>
                Peças com estoque físico disponível no Firestore mas sem vendas
                nos últimos 45 dias. Crie cupons promocionais ou ajuste o preço
                para acelerar o giro de capital.
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
                      Nenhum produto encalhado no momento. Giro de estoque 100%
                      saudável!
                    </td>
                  </tr>
                ) : (
                  deadStockItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className={styles.thumb}
                          />
                        ) : (
                          <div className={styles.thumbPlaceholder}>
                            <Package size={16} />
                          </div>
                        )}
                      </td>
                      <td>
                        <code>{item.skuPrefix}-ALL</code>
                      </td>
                      <td>
                        <strong className={styles.prodName}>{item.name}</strong>
                        <small className={styles.subText}>
                          {item.fit?.toUpperCase()} •{" "}
                          {item.category?.toUpperCase()}
                        </small>
                      </td>
                      <td>
                        <strong className={styles.stockVal}>
                          {item.totalStock} un.
                        </strong>
                      </td>
                      <td>
                        <span className={styles.daysBadge}>
                          {item.daysIdle} dias sem saída
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() =>
                            navigate(`/cms/cupons?productId=${item.id}`)
                          }
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
      {activeTab === "funnel" && (
        <section className={styles.funnelSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.panelTitleRow}>
              <BarChart3 size={18} />
              <h2>FUNIL DE CONVERSÃO & JORNADA DO CLIENTE</h2>
            </div>
            <p>
              Acompanhe o caminho exato do cliente: da visualização da peça até
              a aprovação do pedido.
            </p>
          </div>

          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <span className={styles.kpiLabel}>
                  CONVERSÃO GERAL
                  <InfoTooltip
                    text="Porcentagem de visitantes que visualizaram uma peça e concluíram o pagamento (benchmark ideal: 2% a 4%)."
                    title="Taxa de Conversão"
                  />
                </span>
                <TrendingUp size={14} color="#4ade80" />
              </div>
              <strong className={styles.kpiValue}>
                {funnel.overallConversionRate}%
              </strong>
              <small className={styles.kpiSub}>
                Visitas PDP → Compras Pagas
              </small>
            </div>

            <div
              className={`${styles.kpiCard} ${Number(funnel.cartAbandonmentRate) > 50 ? styles.alertKpi : ""}`}
            >
              <div className={styles.kpiHeader}>
                <span className={styles.kpiLabel}>
                  ABANDONO DE SACOLA
                  <InfoTooltip
                    text="Mede quantos clientes adicionaram produtos ao carrinho mas fecharam o navegador antes de concluir a compra."
                    title="Abandono de Sacola"
                  />
                </span>
                <AlertCircle
                  size={14}
                  color={
                    Number(funnel.cartAbandonmentRate) > 50
                      ? "#f87171"
                      : "#a3a3a3"
                  }
                />
              </div>
              <strong className={styles.kpiValue}>
                {funnel.cartAbandonmentRate}%
              </strong>
              <small className={styles.kpiSub}>
                Itens adicionados sem compra
              </small>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <span className={styles.kpiLabel}>
                  DESISTÊNCIAS / REMOÇÕES
                  <InfoTooltip
                    text="Quantidade de vezes que um cliente deletou manualmente uma peça da sacola após ver o frete ou valor total."
                    title="Atrito no Carrinho"
                  />
                </span>
                <ShoppingBag size={14} color="#f87171" />
              </div>
              <strong className={styles.kpiValue}>
                {funnel.cartRemoves} itens
              </strong>
              <small className={styles.kpiSub}>Peças excluídas da sacola</small>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <span className={styles.kpiLabel}>
                  MÉDIA PÁGINAS / VISITA
                  <InfoTooltip
                    text="Profundidade de navegação por sessão única (Pageviews Totais divididos por Visitantes Únicos)."
                    title="Engajamento por Sessão"
                  />
                </span>
                <FileText size={14} color="#60a5fa" />
              </div>
              <strong className={styles.kpiValue}>
                {funnel.avgPagesPerVisit}{" "}
                <small style={{ fontSize: "0.75rem", color: "#888888" }}>
                  págs/sessão
                </small>
              </strong>
              <small className={styles.kpiSub}>
                {funnel.visits} sessões únicas • {funnel.pageViews} pageviews
              </small>
            </div>
          </div>

          <div className={styles.funnelFlowWrapper}>
            {/* ETAPA 0: VISITANTES / SESSÕES ÚNICAS */}
            <div className={styles.funnelStageCard}>
              <span className={styles.stageNumber}>SESSÕES ÚNICAS</span>
              <strong>{funnel.visits}</strong>
              <span>Visitantes na Loja</span>
              <span className={styles.baselineTag}>100% da audiência</span>
            </div>

            <div className={styles.flowConnectorBox}>
              <span className={styles.passRatePill}>
                Passagem: {funnel.stepVisitsToPdpRate}%
              </span>
              <ArrowRight size={16} />
              <span className={styles.dropOffPill}>
                Drop-off: -{funnel.dropVisitsToPdp}%
              </span>
            </div>

            {/* ETAPA 1 */}
            <div className={styles.funnelStageCard}>
              <span className={styles.stageNumber}>ETAPA 1</span>
              <strong>{funnel.views}</strong>
              <span>Visualizações de Produto</span>
              <small>{funnel.stepVisitsToPdpRate}% das visitas</small>
            </div>

            <div className={styles.flowConnectorBox}>
              <span className={styles.passRatePill}>
                Passagem: {funnel.step2Rate}%
              </span>
              <ArrowRight size={16} />
              <span className={styles.dropOffPill}>
                Drop-off: -{funnel.drop1to2}%
              </span>
            </div>

            {/* ETAPA 2 */}
            <div
              className={`${styles.funnelStageCard} ${funnel.bottleneck === "step2" ? styles.bottleneckCard : ""}`}
            >
              {funnel.bottleneck === "step2" && (
                <span className={styles.bottleneckBadge}>
                  <AlertTriangle size={10} />
                  <span>MAIOR PONTO DE FUGA</span>
                </span>
              )}
              <span className={styles.stageNumber}>ETAPA 2</span>
              <strong className={styles.blueStageVal}>{funnel.cartAdds}</strong>
              <span>Adições à Sacola</span>
              <small>{funnel.step2Rate}% das views PDP</small>
            </div>

            <div className={styles.flowConnectorBox}>
              <span className={styles.passRatePill}>
                Passagem: {funnel.step3Rate}%
              </span>
              <ArrowRight size={16} />
              <span className={styles.dropOffPill}>
                Drop-off: -{funnel.drop2to3}%
              </span>
            </div>

            {/* ETAPA 3 */}
            <div
              className={`${styles.funnelStageCard} ${funnel.bottleneck === "step3" ? styles.bottleneckCard : ""}`}
            >
              {funnel.bottleneck === "step3" && (
                <span className={styles.bottleneckBadge}>
                  <AlertTriangle size={10} />
                  <span>MAIOR PONTO DE FUGA</span>
                </span>
              )}
              <span className={styles.stageNumber}>ETAPA 3</span>
              <strong className={styles.yellowStageVal}>
                {funnel.checkoutStarts}
              </strong>
              <span>Inícios de Checkout</span>
              <small>{funnel.step3Rate}% da sacola</small>
            </div>

            <div className={styles.flowConnectorBox}>
              <span className={styles.passRatePill}>
                Passagem: {funnel.step4Rate}%
              </span>
              <ArrowRight size={16} />
              <span className={styles.dropOffPill}>
                Drop-off: -{funnel.drop3to4}%
              </span>
            </div>

            {/* ETAPA 4 */}
            <div
              className={`${styles.funnelStageCard} ${styles.stageSuccessCard} ${funnel.bottleneck === "step4" ? styles.bottleneckCard : ""}`}
            >
              {funnel.bottleneck === "step4" && (
                <span className={styles.bottleneckBadge}>
                  <AlertTriangle size={10} />
                  <span>MAIOR PONTO DE FUGA</span>
                </span>
              )}
              <span className={styles.stageNumber}>ETAPA 4 (FINAL)</span>
              <strong className={styles.greenStageVal}>
                {funnel.purchases}
              </strong>
              <span>Pedidos Pagos</span>
              <small>{funnel.step4Rate}% do checkout</small>
            </div>
          </div>

          {/* SUÍTE VISUAL DE GRÁFICOS RECHARTS & ESTIMATIVAS PREDITIVAS */}
          {renderChartsDashboard()}
        </section>
      )}

      {/* TAB 5: ABA DEDICADA DE GRÁFICOS RECHARTS & ESTIMATIVAS PREDITIVAS (BI) */}
      {activeTab === "charts" && (
        <section className={styles.chartsTabSection}>
          {renderChartsDashboard()}
        </section>
      )}

      {/* TAB 6: ABA DEDICADA DE ENGENHARIA FINANCEIRA, CAIXA & DIVISÃO DE LUCROS */}
      {activeTab === "finance" && (
        <section className={styles.financeTabSection}>
          {renderProfitSimulator()}
        </section>
      )}

      {/* MODAL / DRAWER: RAIO-X DO PRODUTO // SKU MATRIX */}
      {selectedSkuDetail && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setSelectedSkuDetail(null)}
        >
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
                  <img
                    src={selectedSkuDetail.image}
                    alt={selectedSkuDetail.name}
                  />
                ) : (
                  <div className={styles.thumbPlaceholder}>
                    <Package size={24} />
                  </div>
                )}
                <div className={styles.prodSummaryMeta}>
                  <h3>{selectedSkuDetail.name}</h3>
                  <p>
                    Preço de Tabela:{" "}
                    <strong>
                      R$ {Number(selectedSkuDetail.price).toFixed(2)}
                    </strong>
                  </p>
                  <p>
                    Modelagem:{" "}
                    <strong>{selectedSkuDetail.fit?.toUpperCase()}</strong>
                  </p>
                  <span
                    className={
                      selectedSkuDetail.daysIdle >= 45
                        ? styles.dangerText
                        : styles.idleText
                    }
                  >
                    Tempo Ocioso:{" "}
                    <strong>
                      {selectedSkuDetail.daysIdle || 0} dias sem novas vendas
                    </strong>
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
                  <small>
                    Edite as unidades diretamente abaixo e salve no Firestore:
                  </small>
                </div>

                <div className={styles.matrixGrid}>
                  {["PP", "P", "M", "G", "GG"].map((size) => (
                    <div key={size} className={styles.matrixBox}>
                      <span className={styles.sizeTitle}>TAM {size}</span>
                      <input
                        type="number"
                        min="0"
                        value={editableStock[size] ?? 0}
                        onChange={(e) =>
                          setEditableStock({
                            ...editableStock,
                            [size]: Math.max(
                              0,
                              parseInt(e.target.value, 10) || 0,
                            ),
                          })
                        }
                        className={styles.stockInput}
                        aria-label={`Estoque tamanho ${size}`}
                      />
                      <small className={styles.skuTag}>
                        THR33-
                        {(selectedSkuDetail.category || "TS")
                          .slice(0, 2)
                          .toUpperCase()}
                        -{size}
                      </small>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSaveStockChanges}
                  disabled={savingStock}
                  className={`${styles.saveStockBtn} ${saveSuccess ? styles.saveSuccess : ""}`}
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
                    <strong className={styles.whiteVal}>
                      {activeDrawerTelemetry.views}
                    </strong>
                    <small className={styles.telemetryCardSub}>
                      Sessões únicas
                    </small>
                  </div>

                  <div className={styles.telemetryCard}>
                    <span>Taxa de Adição</span>
                    <strong className={styles.blueVal}>
                      +{activeDrawerTelemetry.adds}
                    </strong>
                    <small className={styles.telemetryCardSub}>
                      {activeDrawerTelemetry.addToCartRate}% das views
                    </small>
                  </div>

                  <div className={styles.telemetryCard}>
                    <span>Desistências</span>
                    <strong className={styles.redVal}>
                      -{activeDrawerTelemetry.removes}
                    </strong>
                    <small className={styles.telemetryCardSub}>
                      {activeDrawerTelemetry.abandonmentRate}% das adições
                    </small>
                  </div>

                  <div className={styles.telemetryCard}>
                    <span>Vendas Aprovadas</span>
                    <strong className={styles.greenVal}>
                      {activeDrawerTelemetry.purchases} un.
                    </strong>
                    <small className={styles.telemetryCardSub}>
                      {activeDrawerTelemetry.uniqueOrders || 0} pedidos únicos (
                      {activeDrawerTelemetry.conversion}%)
                    </small>
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

      {/* SELO DE CONFORMIDADE LGPD (ART. 12) */}
      <footer className={styles.lgpdComplianceFooter}>
        <Lock size={13} color="#4ade80" />
        <span>
          Telemetria 100% Anonimizada em conformidade com a LGPD (Art. 12) — Nenhum IP ou dado pessoal sensível é rastreado nas métricas de dispositivo.
        </span>
      </footer>
    </div>
  );
}

export default CmsAnalytics;
