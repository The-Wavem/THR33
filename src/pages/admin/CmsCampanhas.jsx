import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { 
  Target, 
  DollarSign, 
  TrendingUp, 
  BarChart3, 
  Link2, 
  Copy, 
  Check, 
  RotateCw, 
  ExternalLink,
  Share2,
  Sparkles,
  Layers
} from 'lucide-react';
import { db } from '../../services/firebaseConfig';
import { InfoTooltip } from '../../components/ui/InfoTooltip';
import styles from './CmsCampanhas.module.css';

export function CmsCampanhas() {
  const [campaignData, setCampaignData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Determina a URL base dinâmica do site
  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://thr33-streetwear.web.app';

  // Estados do Gerador de UTM
  const [generator, setGenerator] = useState({
    baseUrl: `${siteOrigin}/catalogo`,
    source: 'instagram',
    medium: 'stories',
    campaign: 'leak_two_promo',
    term: '',
    content: ''
  });

  const [copied, setCopied] = useState(false);

  // 1. Busca pedidos do Firestore para calcular atribuição de vendas real
  const loadCampaignMetrics = async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      const snap = await getDocs(collection(db, 'orders'));
      if (!snap.empty) {
        const map = {};
        snap.forEach(d => {
          const data = d.data();
          const src = data.utm_source || 'Direto / Orgânico';
          const med = data.utm_medium || 'web';
          const camp = data.utm_campaign || 'Geral';
          const key = `${src}_${camp}`;

          if (!map[key]) {
            map[key] = { source: src, medium: med, campaign: camp, orders: 0, revenue: 0 };
          }
          map[key].orders += 1;
          map[key].revenue += (Number(data.total) || 0);
        });

        const list = Object.values(map);
        list.sort((a, b) => b.revenue - a.revenue);
        setCampaignData(list);
      } else {
        setCampaignData([]);
      }
    } catch (err) {
      console.warn("Aviso ao buscar atribuição de UTMs:", err.message);
      setCampaignData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCampaignMetrics();
  }, []);

  // Totais e Métricas
  const totalAttributedRevenue = useMemo(() => {
    return campaignData.reduce((acc, c) => acc + c.revenue, 0);
  }, [campaignData]);

  const totalAttributedOrders = useMemo(() => {
    return campaignData.reduce((acc, c) => acc + c.orders, 0);
  }, [campaignData]);

  const maxCampaignRevenue = useMemo(() => {
    return Math.max(...campaignData.map(c => c.revenue), 1);
  }, [campaignData]);

  // Gera o Link Final Formatado
  const generatedUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (generator.source.trim()) params.append('utm_source', generator.source.trim());
    if (generator.medium.trim()) params.append('utm_medium', generator.medium.trim());
    if (generator.campaign.trim()) params.append('utm_campaign', generator.campaign.trim());
    if (generator.term.trim()) params.append('utm_term', generator.term.trim());
    if (generator.content.trim()) params.append('utm_content', generator.content.trim());

    const qs = params.toString();
    return qs ? `${generator.baseUrl}?${qs}` : generator.baseUrl;
  }, [generator]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error("Falha ao copiar:", e);
    }
  };

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <header className={styles.header}>
        <div>
          <span className={styles.breadcrumb}>CMS / INTELIGÊNCIA DE VENDAS & CAC</span>
          <h1 className={styles.title}>RASTREAMENTO DE CAMPANHAS & UTMS</h1>
        </div>
        <button 
          onClick={loadCampaignMetrics} 
          disabled={refreshing} 
          className={styles.refreshBtn}
          title="Recarregar Métricas de Campanhas"
        >
          <RotateCw size={14} className={refreshing ? styles.spinning : ''} />
          <span>{refreshing ? 'Sincronizando...' : 'Sincronizar Atribuição'}</span>
        </button>
      </header>

      {/* 1. CARDS DE DESEMPENHO DE MARKETING */}
      <section className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <DollarSign size={16} className={styles.kpiIconGreen} />
            <span className={styles.kpiLabel}>RECEITA ATRIBUÍDA A MARKETING</span>
          </div>
          <strong className={styles.kpiValue}>R$ {totalAttributedRevenue.toFixed(2)}</strong>
          <small className={styles.kpiSub}>{totalAttributedOrders} pedidos via links rastreados</small>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <TrendingUp size={16} className={styles.kpiIconBlue} />
            <span className={styles.kpiLabel}>CANAL Nº 1 EM VENDAS</span>
          </div>
          <strong className={styles.kpiValue}>{campaignData[0]?.source || 'Instagram Ads'}</strong>
          <small className={styles.kpiSub}>Maior faturamento acumulado</small>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <Target size={16} className={styles.kpiIconYellow} />
            <span className={styles.kpiLabel}>CAMPANHA LÍDER</span>
          </div>
          <strong className={styles.kpiValue}>{campaignData[0]?.campaign || 'Drop_Leak_Two'}</strong>
          <small className={styles.kpiSub}>R$ {Number(campaignData[0]?.revenue || 0).toFixed(2)} gerados</small>
        </div>
      </section>

      {/* 2. GERADOR DE LINKS UTM (TOOL INTERNA) */}
      <section className={styles.generatorSection}>
        <div className={styles.generatorHeader}>
          <div className={styles.generatorTitleRow}>
            <Link2 size={18} className={styles.generatorIcon} />
            <h2>GERADOR DE LINKS RASTREADOS (UTM BUILDER)</h2>
          </div>
          <p>
            Crie links customizados para campanhas no Instagram, TikTok, parcerias de influenciadores e grupos de WhatsApp para rastrear a origem real de cada compra.
          </p>
        </div>

        <div className={styles.generatorGrid}>
          <div className={styles.inputGroup}>
            <label>URL DE DESTINO *</label>
            <select 
              value={generator.baseUrl} 
              onChange={(e) => setGenerator({ ...generator, baseUrl: e.target.value })}
              className={styles.selectInput}
            >
              <option value={`${siteOrigin}/catalogo`}>Página de Catálogo (/catalogo)</option>
              <option value={`${siteOrigin}/`}>Página Inicial / Home (/)</option>
              <option value={`${siteOrigin}/lancamentos`}>Lançamentos & Drops (/lancamentos)</option>
              <option value={`${siteOrigin}/brindes`}>Vales-Presente & Brindes (/brindes)</option>
              <option value={`${siteOrigin}/sobre`}>Sobre a Marca (/sobre)</option>
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label>
              ORIGEM (UTM_SOURCE) *
              <InfoTooltip text="De onde veio o usuário. Exemplos: instagram, tiktok, google, whatsapp." title="Fonte de Tráfego" />
            </label>
            <input 
              type="text" 
              placeholder="Ex: instagram, tiktok, whatsapp, google" 
              value={generator.source}
              onChange={(e) => setGenerator({ ...generator, source: e.target.value })}
            />
          </div>

          <div className={styles.inputGroup}>
            <label>
              MÍDIA (UTM_MEDIUM) *
              <InfoTooltip text="O formato do link divulgado. Exemplos: stories, bio, reels, cpc, influencer." title="Meio / Canal" />
            </label>
            <input 
              type="text" 
              placeholder="Ex: stories, bio, reels, cpc, newsletter" 
              value={generator.medium}
              onChange={(e) => setGenerator({ ...generator, medium: e.target.value })}
            />
          </div>

          <div className={styles.inputGroup}>
            <label>
              CAMPANHA (UTM_CAMPAIGN) *
              <InfoTooltip text="Identificador único da ação. Exemplos: leak_two, dia_dos_pais, lancamento_boxy." title="Nome da Campanha" />
            </label>
            <input 
              type="text" 
              placeholder="Ex: leak_two, atelie_curitiba, for_the_few" 
              value={generator.campaign}
              onChange={(e) => setGenerator({ ...generator, campaign: e.target.value })}
            />
          </div>
        </div>

        {/* OUTPUT DA URL COM BOTÃO COPIAR */}
        <div className={styles.outputBox}>
          <div className={styles.urlDisplay}>
            <code>{generatedUrl}</code>
          </div>
          <button 
            type="button" 
            onClick={handleCopyLink} 
            className={`${styles.copyBtn} ${copied ? styles.copiedSuccess : ''}`}
          >
            {copied ? (
              <>
                <Check size={14} />
                <span>LINK COPIADO!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>COPIAR LINK</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* 3. PERFORMANCE POR CANAL & TABELA DE CAMPANHAS */}
      <div className={styles.twoColsGrid}>
        {/* GRÁFICO DE DISTRIBUIÇÃO */}
        <section className={styles.panelBox}>
          <div className={styles.panelTitleRow}>
            <BarChart3 size={16} className={styles.panelIcon} />
            <h2 className={styles.panelTitle}>DISTRIBUIÇÃO DE RECEITA POR CANAL</h2>
          </div>
          <p className={styles.panelSub}>Comparativo visual de receita gerada entre as fontes de tráfego.</p>

          <div className={styles.barsList}>
            {campaignData.map((item, idx) => {
              const percentage = Math.round((item.revenue / maxCampaignRevenue) * 100);
              return (
                <div key={idx} className={styles.barItem}>
                  <div className={styles.barMeta}>
                    <span>{item.source.toUpperCase()} — {item.campaign}</span>
                    <strong>R$ {Number(item.revenue || 0).toFixed(2)}</strong>
                  </div>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${percentage}%` }}></div>
                  </div>
                  <div className={styles.barSubMeta}>
                    <small>{item.orders} vendas registradas</small>
                    <small>{percentage}% do líder</small>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* TABELA DE ATRIBUIÇÃO */}
        <section className={styles.panelBox}>
          <div className={styles.panelTitleRow}>
            <Layers size={16} className={styles.panelIcon} />
            <h2 className={styles.panelTitle}>TABELA DE ATRIBUIÇÃO DE VENDAS</h2>
          </div>
          <p className={styles.panelSub}>Histórico detalhado de vendas registradas com UTM.</p>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ORIGEM</th>
                  <th>CAMPANHA</th>
                  <th>PEDIDOS</th>
                  <th>RECEITA</th>
                </tr>
              </thead>
              <tbody>
                {campaignData.map((row, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong className={styles.sourceText}>{row.source}</strong>
                      <small className={styles.mediumTag}>{row.medium}</small>
                    </td>
                    <td>
                      <span className={styles.campaignTag}>{row.campaign}</span>
                    </td>
                    <td>
                      <span className={styles.ordersBadge}>{row.orders} vendas</span>
                    </td>
                    <td>
                      <strong className={styles.revenueText}>R$ {Number(row.revenue || 0).toFixed(2)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

export default CmsCampanhas;
