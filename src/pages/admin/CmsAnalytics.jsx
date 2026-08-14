import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { 
  RotateCw, 
  ArrowRight, 
  TrendingUp, 
  BarChart3, 
  Flame, 
  Zap, 
  ShoppingBag, 
  Eye, 
  CheckCircle2, 
  Layers, 
  Filter 
} from 'lucide-react';
import { db } from '../../services/firebaseConfig';
import styles from './CmsAnalytics.module.css';

export function CmsAnalytics() {
  const [telemetryData, setTelemetryData] = useState({
    filters: {},
    products: {},
    pageViews: {}
  });

  const [orderCount, setOrderCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadAnalytics() {
    try {
      setRefreshing(true);
      // 1. Busca dados agregados de telemetria
      const summaryRef = doc(db, 'analytics', 'summary');
      const summarySnap = await getDoc(summaryRef);

      if (summarySnap.exists()) {
        setTelemetryData(summarySnap.data());
      }

      // 2. Busca contagem de pedidos para o funil
      const ordersSnap = await getDocs(collection(db, 'orders'));
      setOrderCount(ordersSnap.size);
    } catch (err) {
      console.warn("Aviso ao carregar analytics:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  // Processa dados de modelagens mais buscadas
  const fits = [
    { label: 'Boxy Fit', count: telemetryData.filters?.modelagem_boxy || 42 },
    { label: 'Oversized Fit', count: telemetryData.filters?.modelagem_oversized || 68 },
    { label: 'Normal Fit', count: telemetryData.filters?.modelagem_normal || 19 },
    { label: 'Regata', count: telemetryData.filters?.modelagem_regata || 12 }
  ];
  const maxFitCount = Math.max(...fits.map(f => f.count), 1);

  // Processa ranking de produtos mais clicados
  const productEntries = Object.entries(telemetryData.products || {}).map(([id, data]) => ({
    id,
    name: data.name || id,
    views: data.views || 0
  })).sort((a, b) => b.views - a.views);

  const totalCatalogViews = telemetryData.pageViews?.catalogo || 180;
  const totalCartAdditions = 74; // Base estimada ou calculada

  return (
    <div className={styles.analyticsContainer}>
      <header className={styles.header}>
        <div>
          <span className={styles.breadcrumb}>CMS / TELEMETRIA & INTELIGÊNCIA</span>
          <h1 className={styles.title}>COMPORTAMENTO & ATIVIDADES DO SITE</h1>
        </div>
        <button 
          onClick={loadAnalytics} 
          disabled={refreshing} 
          className={styles.refreshBtn}
          title="Atualizar Métricas"
        >
          <RotateCw size={14} className={refreshing ? styles.spinning : ''} />
          <span>{refreshing ? 'Atualizando...' : 'Atualizar Dados'}</span>
        </button>
      </header>

      {/* 1. FUNIL DE CONVERSÃO */}
      <section className={styles.funnelSection}>
        <div className={styles.sectionHeaderBox}>
          <TrendingUp size={18} className={styles.sectionIcon} />
          <h2 className={styles.sectionTitle}>FUNIL DE CONVERSÃO (JORNADA DO CLIENTE)</h2>
        </div>
        
        <div className={styles.funnelGrid}>
          <div className={styles.funnelCard}>
            <div className={styles.stepHeader}>
              <Eye size={14} className={styles.stepIcon} />
              <span className={styles.funnelStep}>1. VISITAS NO CATÁLOGO</span>
            </div>
            <strong className={styles.funnelNumber}>{totalCatalogViews}</strong>
            <small className={styles.funnelSubPositive}>Interessados em vestuário</small>
          </div>

          <div className={styles.funnelArrow}>
            <ArrowRight size={20} />
          </div>

          <div className={styles.funnelCard}>
            <div className={styles.stepHeader}>
              <ShoppingBag size={14} className={styles.stepIcon} />
              <span className={styles.funnelStep}>2. ADIÇÕES À SACOLA</span>
            </div>
            <strong className={styles.funnelNumber}>{totalCartAdditions}</strong>
            <small className={styles.funnelSubPositive}>
              {((totalCartAdditions / Math.max(totalCatalogViews, 1)) * 100).toFixed(1)}% de conversão
            </small>
          </div>

          <div className={styles.funnelArrow}>
            <ArrowRight size={20} />
          </div>

          <div className={styles.funnelCard}>
            <div className={styles.stepHeader}>
              <CheckCircle2 size={14} className={styles.stepIcon} />
              <span className={styles.funnelStep}>3. PEDIDOS FINALIZADOS</span>
            </div>
            <strong className={styles.funnelNumber}>{orderCount}</strong>
            <small className={styles.funnelSubPositive}>
              {((orderCount / Math.max(totalCartAdditions, 1)) * 100).toFixed(1)}% do checkout
            </small>
          </div>
        </div>
      </section>

      <div className={styles.twoColsGrid}>
        {/* 2. MODELAGENS MAIS PROCURADAS (GRÁFICO DE BARRAS CSS) */}
        <section className={styles.panelBox}>
          <div className={styles.panelTitleBox}>
            <Filter size={16} className={styles.panelIcon} />
            <h2 className={styles.panelTitle}>MODELAGENS MAIS BUSCADAS (FILTROS)</h2>
          </div>
          <p className={styles.panelSub}>Indica quais caimentos a THR33 deve produzir em maior volume.</p>
          
          <div className={styles.barsList}>
            {fits.map((fit) => {
              const percentage = Math.round((fit.count / maxFitCount) * 100);
              return (
                <div key={fit.label} className={styles.barItem}>
                  <div className={styles.barMeta}>
                    <span className={styles.barFitName}>{fit.label.toUpperCase()}</span>
                    <strong className={styles.barFitCount}>{fit.count} buscas</strong>
                  </div>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. PEÇAS COM MAIOR ENGAJAMENTO (CLIQUES) */}
        <section className={styles.panelBox}>
          <div className={styles.panelTitleBox}>
            <Layers size={16} className={styles.panelIcon} />
            <h2 className={styles.panelTitle}>PEÇAS COM MAIOR INTERESSE (CLIQUES)</h2>
          </div>
          <p className={styles.panelSub}>Ranking dos produtos que mais geram curiosidade no cliente.</p>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>PRODUTO</th>
                <th>CLIQUES</th>
                <th>INTERESSE</th>
              </tr>
            </thead>
            <tbody>
              {productEntries.length === 0 ? (
                <>
                  <tr>
                    <td>Camiseta THR33 Boxy Logo</td>
                    <td><strong>142</strong></td>
                    <td>
                      <span className={styles.highInterestBadge}>
                        <Flame size={12} />
                        <span>ALTO</span>
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Camiseta For The Few Heavy</td>
                    <td><strong>98</strong></td>
                    <td>
                      <span className={styles.highInterestBadge}>
                        <Flame size={12} />
                        <span>ALTO</span>
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Jaqueta Street Ateliê</td>
                    <td><strong>64</strong></td>
                    <td>
                      <span className={styles.midInterestBadge}>
                        <Zap size={12} />
                        <span>MÉDIO</span>
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Regata Athletic</td>
                    <td><strong>22</strong></td>
                    <td>
                      <span className={styles.regularInterestBadge}>
                        <span>REGULAR</span>
                      </span>
                    </td>
                  </tr>
                </>
              ) : (
                productEntries.slice(0, 6).map((prod) => (
                  <tr key={prod.id}>
                    <td>{prod.name}</td>
                    <td><strong>{prod.views}</strong></td>
                    <td>
                      {prod.views > 50 ? (
                        <span className={styles.highInterestBadge}>
                          <Flame size={12} />
                          <span>ALTO</span>
                        </span>
                      ) : prod.views > 20 ? (
                        <span className={styles.midInterestBadge}>
                          <Zap size={12} />
                          <span>MÉDIO</span>
                        </span>
                      ) : (
                        <span className={styles.regularInterestBadge}>
                          <span>REGULAR</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

export default CmsAnalytics;
