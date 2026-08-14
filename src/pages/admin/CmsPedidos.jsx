import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
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
  FileText
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

// Pedidos mock de exemplo caso o Firestore ainda não tenha transações
const MOCK_ORDERS = [
  {
    id: "ord_8921a4f0",
    clientName: "Lucas Mendonça",
    clientCpf: "12345678900",
    clientEmail: "lucas.mendonca@gmail.com",
    clientPhone: "(41) 99876-5432",
    total: 379.80,
    paymentMethod: "PIX",
    status: "Aprovado",
    trackingCode: "BR982173641TH",
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    shippingAddress: {
      street: "Rua Brigadeiro Franco",
      number: "1820",
      complement: "Apto 402",
      neighborhood: "Batel",
      city: "Curitiba",
      state: "PR",
      cep: "80250-030"
    },
    items: [
      {
        id: "thr33-boxy-black",
        name: "Camiseta THR33 Boxy Logo",
        size: "M",
        fit: "Boxy Fit",
        quantity: 2,
        price: 189.90,
        image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop"
      }
    ]
  },
  {
    id: "ord_7312b9c1",
    clientName: "Mariana Siqueira",
    clientCpf: "98765432199",
    clientEmail: "mari.siqueira@outlook.com",
    clientPhone: "(11) 98123-4567",
    total: 459.90,
    paymentMethod: "Cartão de Crédito",
    status: "Em Trânsito",
    trackingCode: "BR741289654TH",
    createdAt: new Date(Date.now() - 3600000 * 28).toISOString(),
    shippingAddress: {
      street: "Av. Paulista",
      number: "1000",
      complement: "Conj 81",
      neighborhood: "Bela Vista",
      city: "São Paulo",
      state: "SP",
      cep: "01310-100"
    },
    items: [
      {
        id: "jaqueta-street-atelie",
        name: "Jaqueta Street Ateliê",
        size: "G",
        fit: "Normal Fit",
        quantity: 1,
        price: 459.90,
        image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=600&auto=format&fit=crop"
      }
    ]
  },
  {
    id: "ord_6541f8e2",
    clientName: "Gabriel Ferreira",
    clientCpf: "45678912300",
    clientEmail: "gabriel.f@gmail.com",
    clientPhone: "(41) 99111-2233",
    total: 199.90,
    paymentMethod: "PIX",
    status: "Troca Solicitada",
    trackingCode: "BR412896325TH",
    createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    reverseLogistics: {
      code: "REV-84910238BR",
      reason: "Tamanho Boxy menor que o esperado",
      generatedAt: new Date(Date.now() - 3600000 * 12).toISOString()
    },
    shippingAddress: {
      street: "Rua XV de Novembro",
      number: "450",
      complement: "",
      neighborhood: "Centro",
      city: "Curitiba",
      state: "PR",
      cep: "80020-310"
    },
    items: [
      {
        id: "for-the-few-oversized",
        name: "Camiseta For The Few Heavy",
        size: "P",
        fit: "Oversized Fit",
        quantity: 1,
        price: 199.90,
        image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=600&auto=format&fit=crop"
      }
    ]
  }
];

export function CmsPedidos() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal de Detalhes & Logística Reversa
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [exchangeReason, setExchangeReason] = useState('tamanho-boxy-pequeno');
  const [generatingLabel, setGeneratingLabel] = useState(false);

  // 1. Busca os pedidos reais no Firestore (com fallback para MOCK_ORDERS)
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
        setOrders(MOCK_ORDERS);
      }
    } catch (err) {
      console.warn("Aviso ao carregar pedidos do Firestore:", err.message);
      setOrders(MOCK_ORDERS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // 2. Atualizar Status do Pedido no Firestore
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { status: newStatus });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.warn("Aviso ao atualizar status no Firestore:", err.message);
      // Fallback de atualização em memória
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus }));
      }
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

  // Métricas Calculadas
  const metrics = useMemo(() => {
    const total = orders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
    const count = orders.length;
    const exchanges = orders.filter(o => o.status === 'Troca Solicitada' || o.status === 'Devolvido').length;
    const exchangeRate = count > 0 ? ((exchanges / count) * 100).toFixed(1) : '0.0';
    const averageTicket = count > 0 ? (total / count).toFixed(2) : '0.00';

    return { total, count, exchanges, exchangeRate, averageTicket };
  }, [orders]);

  // Filtragem
  const filteredOrders = orders.filter(order => {
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

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <header className={styles.header}>
        <div>
          <span className={styles.breadcrumb}>CMS / GESTÃO DE VENDAS & SUPORTE</span>
          <h1 className={styles.title}>PEDIDOS & LOGÍSTICA REVERSA</h1>
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
      </header>

      {/* CARDS DE KPIS */}
      <section className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <DollarSign size={16} className={styles.kpiIconGreen} />
            <span className={styles.kpiLabel}>FATURAMENTO TOTAL</span>
          </div>
          <strong className={styles.kpiValue}>R$ {metrics.total.toFixed(2)}</strong>
          <small className={styles.kpiSub}>Total em vendas confirmadas</small>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <Package size={16} className={styles.kpiIconBlue} />
            <span className={styles.kpiLabel}>TOTAL DE PEDIDOS</span>
          </div>
          <strong className={styles.kpiValue}>{metrics.count}</strong>
          <small className={styles.kpiSub}>Transações registradas</small>
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
          <small className={styles.kpiSub}>{metrics.exchanges} solicitações ativas</small>
        </div>
      </section>

      {/* CONTROLE DE BUSCA E FILTROS */}
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
            TODOS ({orders.length})
          </button>
          {STATUS_OPTIONS.map(st => (
            <button
              key={st.value}
              className={`${styles.filterBtn} ${statusFilter === st.value ? styles.activeFilter : ''}`}
              onClick={() => setStatusFilter(st.value)}
            >
              {st.label.toUpperCase()}
            </button>
          ))}
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
                    <span>Nenhum pedido encontrado para estes filtros.</span>
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
                      <strong className={styles.orderCode}>#{order.id.slice(0, 8).toUpperCase()}</strong>
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
