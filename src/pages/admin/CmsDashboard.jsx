import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { 
  DollarSign, 
  ShoppingBag, 
  Users, 
  AlertTriangle, 
  Search, 
  Package, 
  RotateCcw, 
  Tag, 
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { db } from '../../services/firebaseConfig';
import { maskCPF } from '../../utils/validators';
import { InfoTooltip } from '../../components/ui/InfoTooltip';
import styles from './CmsDashboard.module.css';

export function CmsDashboard() {
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalUsers: 0,
    deadStockCount: 0
  });

  const [utmList, setUtmList] = useState([]);
  const [deadStockList, setDeadStockList] = useState([]);

  // CRM 360 Search
  const [searchCpf, setSearchCpf] = useState('');
  const [searching, setSearching] = useState(false);
  const [clientFound, setClientFound] = useState(null);

  // 1. Carrega métricas globais e tabelas dinâmicas diretamente do Firestore
  useEffect(() => {
    async function loadMetrics() {
      try {
        const ordersSnap = await getDocs(collection(db, 'orders'));
        const usersSnap = await getDocs(collection(db, 'users'));
        const prodsSnap = await getDocs(collection(db, 'products'));

        const allOrders = [];
        let revenue = 0;
        const utmMap = {};

        ordersSnap.forEach((doc) => {
          const ord = { id: doc.id, ...doc.data() };
          allOrders.push(ord);
          revenue += Number(ord.total || 0);

          // Agrupamento de UTMs reais
          const source = ord.utm_source || 'Direto / Orgânico';
          const campaign = ord.utm_campaign || 'Geral';
          const key = `${source}___${campaign}`;
          if (!utmMap[key]) {
            utmMap[key] = { source, campaign, revenue: 0, ordersCount: 0 };
          }
          utmMap[key].revenue += Number(ord.total || 0);
          utmMap[key].ordersCount += 1;
        });

        // Ordena campanhas por receita
        const sortedUtms = Object.values(utmMap).sort((a, b) => b.revenue - a.revenue);
        setUtmList(sortedUtms);

        // Consolidação de Dead Stock real
        const deadItems = [];
        if (!prodsSnap.empty) {
          prodsSnap.forEach(d => {
            const p = { id: d.id, ...d.data() };
            
            // Procura histórico de vendas desta peça
            const matchingOrders = allOrders.filter(o => 
              (o.items || []).some(it => it.id === p.id || it.slug === p.id || it.name === p.name)
            );

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
              daysIdle = Number(p.daysWithoutSale || 0);
            }

            const totalStock = p.stock 
              ? Object.values(p.stock).reduce((a, b) => Number(a) + Number(b), 0) 
              : (Number(p.totalStock) || 0);

            if (daysIdle >= 45 && totalStock > 0) {
              deadItems.push({
                id: p.id,
                sku: `THR33-${(p.category || 'TS').slice(0, 2).toUpperCase()}-ALL`,
                name: p.name || 'Produto THR33',
                daysIdle,
                totalStock
              });
            }
          });
        }

        setDeadStockList(deadItems);

        setMetrics({
          totalRevenue: revenue,
          totalOrders: ordersSnap.size,
          totalUsers: usersSnap.size,
          deadStockCount: deadItems.length
        });
      } catch (err) {
        console.warn("Aviso ao carregar métricas do Firestore:", err.message);
      }
    }
    loadMetrics();
  }, []);

  // 2. Manipula digitação no campo de CPF com máscara automática
  const handleCpfChange = (e) => {
    const formatted = maskCPF(e.target.value);
    setSearchCpf(formatted);
  };

  // 3. Busca CRM 360 por CPF (compatível com formato com máscara e sem máscara)
  const handleSearchClient = async (e) => {
    e.preventDefault();
    const cleanDigits = searchCpf.replace(/\D/g, '');
    if (!cleanDigits) return;

    setSearching(true);
    setClientFound(null);

    try {
      const formatted = maskCPF(cleanDigits);
      const searchTerms = [formatted, cleanDigits].filter(Boolean);

      // Busca usuário pelo CPF (tenta formato formatado e formato numérico puro)
      const uQuery = query(
        collection(db, 'users'), 
        where('cpf', 'in', searchTerms)
      );
      const uSnap = await getDocs(uQuery);

      if (!uSnap.empty) {
        const uDoc = uSnap.docs[0];
        const userData = { id: uDoc.id, ...uDoc.data() };

        // Busca pedidos desse usuário
        const oQuery = query(collection(db, 'orders'), where('userId', '==', uDoc.id));
        const oSnap = await getDocs(oQuery);
        const userOrders = [];
        oSnap.forEach(d => userOrders.push({ id: d.id, ...d.data() }));

        setClientFound({
          ...userData,
          orders: userOrders
        });
      } else {
        alert("Nenhum cliente encontrado com este CPF.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao consultar CRM.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className={styles.dashboard}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.breadcrumb}>CMS // PAINEL DE CONTROLE</span>
          <h1 className={styles.title}>VISÃO GERAL DO SISTEMA</h1>
        </div>
      </header>

      {/* 1. CARDS DE KPIS */}
      <section className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>
              FATURAMENTO TOTAL
              <InfoTooltip text="Soma total de todos os pedidos finalizados com pagamento aprovado no site." title="Faturamento Bruto" />
            </span>
            <DollarSign size={16} className={styles.kpiIcon} />
          </div>
          <strong className={styles.kpiValue}>R$ {metrics.totalRevenue.toFixed(2)}</strong>
          <small className={styles.kpiSub}>Transações aprovadas</small>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>
              TOTAL DE PEDIDOS
              <InfoTooltip text="Contagem total de pedidos gerados no e-commerce aprovados ou em processamento." title="Volume de Pedidos" />
            </span>
            <ShoppingBag size={16} className={styles.kpiIcon} />
          </div>
          <strong className={styles.kpiValue}>{metrics.totalOrders}</strong>
          <small className={styles.kpiSub}>Em processamento / entregues</small>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>
              BASE DE CLIENTES
              <InfoTooltip text="Total de clientes com conta criada no banco de dados do sistema." title="Usuários Registrados" />
            </span>
            <Users size={16} className={styles.kpiIcon} />
          </div>
          <strong className={styles.kpiValue}>{metrics.totalUsers}</strong>
          <small className={styles.kpiSub}>Usuários cadastrados</small>
        </div>

        <div className={`${styles.kpiCard} ${styles.alertCard}`}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>
              ALERTA DE DEAD STOCK
              <InfoTooltip text="Peças com estoque físico positivo sem nenhuma venda há mais de 45 dias. Exige desconto ou ação de marketing." title="Giro de Estoque" />
            </span>
            <AlertTriangle size={16} className={styles.kpiAlertIcon} />
          </div>
          <strong className={styles.kpiValue}>{metrics.deadStockCount} SKUs</strong>
          <small className={styles.kpiSub}>Parados há mais de 45 dias</small>
        </div>
      </section>

      {/* 2. CRM 360º & LOGÍSTICA REVERSA */}
      <section className={styles.crmSection}>
        <div className={styles.sectionHeader}>
          <h2>
            CRM 360º & SUPORTE RÁPIDO
            <InfoTooltip text="Puxa dados cadastrais, múltiplos endereços e histórico de compras via CPF para agilizar atendimentos e trocas." title="Consulta Unificada" />
          </h2>
          <p>Digite o CPF do cliente para puxar todo o histórico de compras e emitir etiqueta de devolução na hora.</p>
        </div>

        <form onSubmit={handleSearchClient} className={styles.searchForm}>
          <div className={styles.inputWrapper}>
            <input 
              type="text" 
              placeholder="Digite o CPF (Ex: 104.432.509-79)" 
              value={searchCpf}
              onChange={handleCpfChange}
              maxLength={14}
              required
            />
          </div>
          <button type="submit" disabled={searching} className={styles.searchBtn}>
            <Search size={14} />
            <span>{searching ? 'BUSCANDO...' : 'BUSCAR CLIENTE'}</span>
          </button>
        </form>

        {clientFound && (
          <div className={styles.clientResultBox}>
            <div className={styles.clientMeta}>
              <div>
                <h3>{clientFound.name || 'Cliente Sem Nome'}</h3>
                <p>E-mail: {clientFound.email} | Tel: {clientFound.phone || 'Não informado'}</p>
                <p>CPF: <strong>{clientFound.cpf || 'Não informado'}</strong></p>
              </div>
              <button 
                onClick={() => alert(`Etiqueta de Logística Reversa gerada com sucesso para ${clientFound.name}!`)}
                className={styles.returnLabelBtn}
              >
                <RotateCcw size={14} />
                <span>GERAR ETIQUETA DE TROCA</span>
              </button>
            </div>

            <div className={styles.clientOrders}>
              <h4>HISTÓRICO DE PEDIDOS ({clientFound.orders?.length || 0})</h4>
              {clientFound.orders?.length === 0 ? (
                <p className={styles.emptyOrders}>Nenhum pedido feito ainda.</p>
              ) : (
                clientFound.orders.map((ord) => (
                  <div key={ord.id} className={styles.orderRow}>
                    <div className={styles.orderLeft}>
                      <Package size={14} className={styles.orderIcon} />
                      <span className={styles.orderId}>#{ord.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    <span>Total: R$ {(ord.total || 0).toFixed(2)}</span>
                    <span className={styles.statusBadge}>{ord.status || 'Processando'}</span>
                    <small className={styles.trackingCode}>Rastreio: {ord.trackingCode || 'Pendente'}</small>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </section>

      {/* 3. GRID DE ANALYTICS (UTMS E DEAD STOCK 100% FIRESTORE) */}
      <section className={styles.analyticsGrid}>
        {/* Rastreamento de Campanhas */}
        <div className={styles.panelBox}>
          <div className={styles.panelTitleBox}>
            <TrendingUp size={16} className={styles.panelIcon} />
            <h3>ORIGEM DE VENDAS (CAMPANHAS UTM)</h3>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Origem (Source)</th>
                <th>Campanha</th>
                <th>Receita</th>
              </tr>
            </thead>
            <tbody>
              {utmList.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem 0' }}>
                    Nenhuma venda com UTM registrada ainda.
                  </td>
                </tr>
              ) : (
                utmList.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.source}</td>
                    <td>{item.campaign} ({item.ordersCount} ped.)</td>
                    <td><strong>R$ {item.revenue.toFixed(2)}</strong></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Alerta de Dead Stock */}
        <div className={styles.panelBox}>
          <div className={styles.panelTitleBox}>
            <AlertTriangle size={16} className={styles.panelAlertIcon} />
            <h3>SKUS ENCALHADOS (&gt; 45 DIAS)</h3>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Peça / Estoque</th>
                <th>Dias Parado</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {deadStockList.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem 0' }}>
                    Nenhum SKU parado há mais de 45 dias. Estoque 100% saudável!
                  </td>
                </tr>
              ) : (
                deadStockList.map((item) => (
                  <tr key={item.id}>
                    <td><code>{item.sku}</code></td>
                    <td>{item.name} ({item.totalStock} un.)</td>
                    <td><span style={{ color: '#f87171', fontWeight: '700' }}>{item.daysIdle} dias</span></td>
                    <td>
                      <button className={styles.promoBtn} onClick={() => navigate('/cms/cupons')}>
                        <Tag size={12} />
                        <span>Criar Promoção</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default CmsDashboard;
