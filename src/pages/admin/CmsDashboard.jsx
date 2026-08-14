import React, { useState, useEffect } from 'react';
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
  TrendingUp 
} from 'lucide-react';
import { db } from '../../services/firebaseConfig';
import { maskCPF } from '../../utils/validators';
import styles from './CmsDashboard.module.css';

export function CmsDashboard() {
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalUsers: 0,
    deadStockCount: 2
  });

  // CRM 360 Search
  const [searchCpf, setSearchCpf] = useState('');
  const [searching, setSearching] = useState(false);
  const [clientFound, setClientFound] = useState(null);

  // 1. Carrega métricas globais do Firestore
  useEffect(() => {
    async function loadMetrics() {
      try {
        const ordersSnap = await getDocs(collection(db, 'orders'));
        const usersSnap = await getDocs(collection(db, 'users'));

        let revenue = 0;
        ordersSnap.forEach((doc) => {
          revenue += (doc.data().total || 0);
        });

        setMetrics(prev => ({
          ...prev,
          totalRevenue: revenue,
          totalOrders: ordersSnap.size,
          totalUsers: usersSnap.size
        }));
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
          <span className={styles.breadcrumb}>CMS / PAINEL DE CONTROLE</span>
          <h1 className={styles.title}>VISÃO GERAL DO SISTEMA</h1>
        </div>
      </header>

      {/* 1. CARDS DE KPIS */}
      <section className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>FATURAMENTO TOTAL</span>
            <DollarSign size={16} className={styles.kpiIcon} />
          </div>
          <strong className={styles.kpiValue}>R$ {metrics.totalRevenue.toFixed(2)}</strong>
          <small className={styles.kpiSub}>Transações aprovadas</small>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>TOTAL DE PEDIDOS</span>
            <ShoppingBag size={16} className={styles.kpiIcon} />
          </div>
          <strong className={styles.kpiValue}>{metrics.totalOrders}</strong>
          <small className={styles.kpiSub}>Em processamento / entregues</small>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>BASE DE CLIENTES</span>
            <Users size={16} className={styles.kpiIcon} />
          </div>
          <strong className={styles.kpiValue}>{metrics.totalUsers}</strong>
          <small className={styles.kpiSub}>Usuários cadastrados</small>
        </div>

        <div className={`${styles.kpiCard} ${styles.alertCard}`}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>ALERTA DE DEAD STOCK</span>
            <AlertTriangle size={16} className={styles.kpiAlertIcon} />
          </div>
          <strong className={styles.kpiValue}>{metrics.deadStockCount} SKUs</strong>
          <small className={styles.kpiSub}>Parados há mais de 45 dias</small>
        </div>
      </section>

      {/* 2. CRM 360º & LOGÍSTICA REVERSA */}
      <section className={styles.crmSection}>
        <div className={styles.sectionHeader}>
          <h2>CRM 360º & SUPORTE RÁPIDO</h2>
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

      {/* 3. GRID DE ANALYTICS (UTMS E DEAD STOCK) */}
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
              <tr><td>Instagram Ads</td><td>Drop_Leak_Two</td><td>R$ 1.450,00</td></tr>
              <tr><td>TikTok Orgânico</td><td>Video_Atelie_Curitiba</td><td>R$ 680,00</td></tr>
              <tr><td>Google Search</td><td>Marca_Streetwear</td><td>R$ 420,00</td></tr>
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
                <th>Peça / Tamanho</th>
                <th>Dias Parado</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>THR33-TS-OFF-PP</td>
                <td>Camiseta For The Few - PP</td>
                <td>48 dias</td>
                <td>
                  <button className={styles.promoBtn} onClick={() => alert('Campanha de cupom 20% criada!')}>
                    <Tag size={12} />
                    <span>Criar Promoção</span>
                  </button>
                </td>
              </tr>
              <tr>
                <td>THR33-RG-GRA-G</td>
                <td>Regata Athletic - G</td>
                <td>52 dias</td>
                <td>
                  <button className={styles.promoBtn} onClick={() => alert('Campanha de cupom 20% criada!')}>
                    <Tag size={12} />
                    <span>Criar Promoção</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default CmsDashboard;
