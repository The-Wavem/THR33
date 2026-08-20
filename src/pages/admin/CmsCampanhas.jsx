import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { 
  Plus, 
  RotateCw, 
  Copy, 
  Check, 
  Pencil, 
  Trash2, 
  X, 
  Link2, 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  MousePointer, 
  ExternalLink,
  Sparkles,
  Layers,
  AlertCircle,
  Calendar,
  Settings2,
  SlidersHorizontal,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { db } from '../../services/firebaseConfig';
import { campaignService } from '../../services/campaignService';
import { InfoTooltip } from '../../components/ui/InfoTooltip';
import { 
  useCmsPeriodFilter, 
  parseOrderDate, 
  isDateInPeriod,
  getTodayStr, 
  formatShortDate 
} from '../../hooks/useCmsPeriodFilter';
import styles from './CmsCampanhas.module.css';

const DEFAULT_SOURCES = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'facebook_ads', label: 'Facebook Ads' },
  { value: 'whatsapp', label: 'WhatsApp / Lista VIP' },
  { value: 'influencer', label: 'Parceria / Influenciador' },
  { value: 'email', label: 'E-mail Marketing' },
  { value: 'youtube', label: 'YouTube' }
];

const DEFAULT_MEDIUMS = [
  { value: 'stories', label: 'Stories' },
  { value: 'feed', label: 'Feed / Reels' },
  { value: 'bio', label: 'Link da Bio' },
  { value: 'cpc', label: 'CPC / Tráfego Pago' },
  { value: 'direct_message', label: 'DM / Mensagem Direta' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'parceria', label: 'Parceria / Publi' }
];

const CATALOG_CATEGORIES = [
  { id: 'camisa', label: 'CAMISA' },
  { id: 'calca', label: 'CALÇA' },
  { id: 'jaqueta', label: 'JAQUETA & HOODIE' }
];

const CATALOG_FITS = [
  { id: 'boxy', label: 'BOXY' },
  { id: 'oversized', label: 'OVERSIZED' },
  { id: 'normal', label: 'NORMAL' },
  { id: 'regata', label: 'REGATA' }
];

const CATALOG_DROPS = [
  { id: 'leak_two', label: 'LEAK TWO (NOVO)' },
  { id: 'drops_passados', label: 'DROPS PASSADOS' }
];

const CATALOG_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XGG'];

export function CmsCampanhas() {
  const [campaigns, setCampaigns] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Opções customizadas de Origem e Mídia (gravadas no Firestore)
  const [customSources, setCustomSources] = useState([]);
  const [customMediums, setCustomMediums] = useState([]);

  // Estados dos painéis inline para adicionar nova opção no seletor
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSourceLabel, setNewSourceLabel] = useState('');
  const [newSourceValue, setNewSourceValue] = useState('');

  const [showAddMedium, setShowAddMedium] = useState(false);
  const [newMediumLabel, setNewMediumLabel] = useState('');
  const [newMediumValue, setNewMediumValue] = useState('');

  // Assistente de Filtros do Catálogo
  const [showCatalogFilterHelper, setShowCatalogFilterHelper] = useState(true);

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

  // Filtros de busca, origem, status e ordenação da Tabela
  const [campaignSearchQuery, setCampaignSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'none' });

  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [saving, setSaving] = useState(false);

  // Campos do Formulário
  const [name, setName] = useState('');
  const [utmSource, setUtmSource] = useState('instagram');
  const [utmMedium, setUtmMedium] = useState('stories');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [targetPath, setTargetPath] = useState('/catalogo');

  // Trava scroll da página quando modal estiver aberto
  useEffect(() => {
    if (isModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isModalOpen]);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://thr33-streetwear.web.app';

  // Lista consolidada de Origens (Padrão + Customizadas + Usadas em Campanhas)
  const allSources = useMemo(() => {
    const list = [...DEFAULT_SOURCES, ...customSources];
    campaigns.forEach(c => {
      if (c.utm_source && !list.some(s => s.value === c.utm_source)) {
        list.push({ value: c.utm_source, label: c.utm_source.toUpperCase() });
      }
    });
    return list;
  }, [customSources, campaigns]);

  // Lista consolidada de Mídias (Padrão + Customizadas + Usadas em Campanhas)
  const allMediums = useMemo(() => {
    const list = [...DEFAULT_MEDIUMS, ...customMediums];
    campaigns.forEach(c => {
      if (c.utm_medium && !list.some(m => m.value === c.utm_medium)) {
        list.push({ value: c.utm_medium, label: c.utm_medium });
      }
    });
    return list;
  }, [customMediums, campaigns]);

  // Parser dos filtros do catálogo ativos dentro de targetPath
  const parsedCatalogFilters = useMemo(() => {
    if (!targetPath.startsWith('/catalogo')) {
      return { categories: [], fits: [], drops: [], sizes: [], search: '', sort: '' };
    }
    const [, queryString] = targetPath.split('?');
    if (!queryString) {
      return { categories: [], fits: [], drops: [], sizes: [], search: '', sort: '' };
    }
    const params = new URLSearchParams(queryString);
    return {
      categories: params.get('categoria') ? params.get('categoria').split(',').filter(Boolean) : [],
      fits: params.get('fit') ? params.get('fit').split(',').filter(Boolean) : [],
      drops: params.get('drop') ? params.get('drop').split(',').filter(Boolean) : [],
      sizes: params.get('tamanho') ? params.get('tamanho').split(',').filter(Boolean) : [],
      search: params.get('search') || '',
      sort: params.get('ordenar') || ''
    };
  }, [targetPath]);

  // Contador de filtros aplicados
  const activeCatalogFiltersCount = useMemo(() => {
    const { categories, fits, drops, sizes, search, sort } = parsedCatalogFilters;
    let count = categories.length + fits.length + drops.length + sizes.length;
    if (search.trim()) count += 1;
    if (sort) count += 1;
    return count;
  }, [parsedCatalogFilters]);

  // Atualizador bidirecional de filtros do catálogo na URL
  const toggleCatalogFilter = (type, value, isArray = true) => {
    const [basePath] = targetPath.split('?');
    const current = { ...parsedCatalogFilters };

    if (isArray) {
      const arr = current[type] || [];
      current[type] = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
    } else {
      current[type] = value;
    }

    const params = new URLSearchParams();
    if (current.search && current.search.trim()) params.set('search', current.search.trim());
    if (current.categories && current.categories.length > 0) params.set('categoria', current.categories.join(','));
    if (current.fits && current.fits.length > 0) params.set('fit', current.fits.join(','));
    if (current.drops && current.drops.length > 0) params.set('drop', current.drops.join(','));
    if (current.sizes && current.sizes.length > 0) params.set('tamanho', current.sizes.join(','));
    if (current.sort && current.sort !== 'newest') params.set('ordenar', current.sort);

    const queryStr = params.toString();
    setTargetPath(queryStr ? `${basePath}?${queryStr}` : basePath);
  };

  const handleClearCatalogFilters = () => {
    const [basePath] = targetPath.split('?');
    setTargetPath(basePath || '/catalogo');
  };

  // Gerador de URL Completa Dinâmica combinando filtros do catálogo e parâmetros UTM
  const generatedUrl = useMemo(() => {
    const cleanPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
    const cleanCampaign = (utmCampaign || 'campanha').toLowerCase().trim().replace(/[\s_-]+/g, '_');
    
    const [pathOnly, existingQuery] = cleanPath.split('?');
    const params = new URLSearchParams(existingQuery || '');
    
    params.set('utm_source', utmSource || 'instagram');
    params.set('utm_medium', utmMedium || 'social');
    params.set('utm_campaign', cleanCampaign);

    return `${baseUrl}${pathOnly}?${params.toString()}`;
  }, [baseUrl, targetPath, utmSource, utmMedium, utmCampaign]);

  // Carrega campanhas, opções customizadas e pedidos para cruzamento temporal
  const loadCampaigns = async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      const [camps, ordersSnap, sessionsSnap, customOpts] = await Promise.all([
        campaignService.getAllCampaigns(),
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'checkout_sessions')).catch(() => ({ forEach: () => {} })),
        campaignService.getCustomUtmOptions()
      ]);

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
      setCampaigns(camps || []);
      setCustomSources(customOpts.sources || []);
      setCustomMediums(customOpts.mediums || []);
    } catch (err) {
      console.warn("Aviso ao carregar campanhas:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  // Adicionar Nova Origem Customizada
  const handleAddNewSource = async (e) => {
    if (e) e.preventDefault();
    if (!newSourceLabel.trim()) return;
    const cleanVal = (newSourceValue || newSourceLabel).toLowerCase().trim().replace(/[\s_-]+/g, '_');
    
    try {
      const updated = await campaignService.addCustomUtmOption('source', {
        label: newSourceLabel.trim(),
        value: cleanVal
      });
      setCustomSources(updated);
      setUtmSource(cleanVal);
      setNewSourceLabel('');
      setNewSourceValue('');
      setShowAddSource(false);
    } catch (err) {
      alert("Erro ao adicionar nova origem.");
    }
  };

  // Adicionar Nova Mídia Customizada
  const handleAddNewMedium = async (e) => {
    if (e) e.preventDefault();
    if (!newMediumLabel.trim()) return;
    const cleanVal = (newMediumValue || newMediumLabel).toLowerCase().trim().replace(/[\s_-]+/g, '_');
    
    try {
      const updated = await campaignService.addCustomUtmOption('medium', {
        label: newMediumLabel.trim(),
        value: cleanVal
      });
      setCustomMediums(updated);
      setUtmMedium(cleanVal);
      setNewMediumLabel('');
      setNewMediumValue('');
      setShowAddMedium(false);
    } catch (err) {
      alert("Erro ao adicionar nova mídia.");
    }
  };

  // 1. FILTRAGEM TEMPORAL DE PEDIDOS CONFORME PERÍODO SELECIONADO
  const filteredOrders = useMemo(() => {
    if (periodFilter === 'all') return orders;
    return orders.filter(order => isDateInPeriod(order, periodFilter, customStartDate, customEndDate));
  }, [orders, periodFilter, customStartDate, customEndDate]);

  // 2. PROCESSAMENTO DINÂMICO DE MÉTRICAS POR CAMPANHA
  const processedCampaigns = useMemo(() => {
    return campaigns.map(camp => {
      const cleanCampaign = String(camp.utm_campaign || '').toLowerCase().trim();
      const cleanCampName = String(camp.name || '').toLowerCase().trim();
      const cleanSource = String(camp.utm_source || '').toLowerCase().trim();

      const matchingOrders = filteredOrders.filter(o => {
        const orderCamp = String(o.utm_campaign || '').toLowerCase().trim();
        const orderSrc = String(o.utm_source || '').toLowerCase().trim();

        if (orderCamp && orderCamp !== 'nenhuma' && orderCamp !== 'null' && orderCamp !== 'undefined') {
          if (cleanCampaign && (orderCamp === cleanCampaign || orderCamp.replace(/_/g, '') === cleanCampaign.replace(/_/g, ''))) return true;
          if (cleanCampName && (orderCamp === cleanCampName || cleanCampName.includes(orderCamp) || orderCamp.includes(cleanCampName))) return true;
        }

        if ((!orderCamp || orderCamp === 'nenhuma' || orderCamp === 'null') && cleanSource && orderSrc && orderSrc === cleanSource) {
          return true;
        }
        return false;
      });

      const ordersPurchases = matchingOrders.length;
      const ordersRevenue = matchingOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

      const firestorePurchases = Number(camp.purchases || 0);
      const firestoreRevenue = Number(camp.revenue || 0);

      const hasRecentPurchaseInPeriod = camp.lastPurchaseAt 
        ? isDateInPeriod(camp.lastPurchaseAt, periodFilter, customStartDate, customEndDate) 
        : false;

      let periodPurchases = 0;
      let periodRevenue = 0;

      if (periodFilter === 'all') {
        periodPurchases = Math.max(ordersPurchases, firestorePurchases);
        periodRevenue = ordersPurchases > 0 ? ordersRevenue : firestoreRevenue;
      } else {
        if (ordersPurchases > 0) {
          periodPurchases = ordersPurchases;
          periodRevenue = ordersRevenue;
        } else if (hasRecentPurchaseInPeriod && firestorePurchases > 0) {
          periodPurchases = firestorePurchases;
          periodRevenue = firestoreRevenue;
        } else {
          periodPurchases = 0;
          periodRevenue = 0;
        }
      }

      const clicks = Number(camp.clicks || 0);
      const cartAdds = Number(camp.cartAdds || 0);
      const conversion = clicks > 0 
        ? Math.min(100, (periodPurchases / clicks) * 100).toFixed(1) 
        : (periodPurchases > 0 ? '100.0' : '0.0');

      return {
        ...camp,
        clicks,
        cartAdds,
        purchases: periodPurchases,
        revenue: periodRevenue,
        conversion
      };
    }).sort((a, b) => (Number(b.revenue || 0) - Number(a.revenue || 0)) || (Number(b.clicks || 0) - Number(a.clicks || 0)));
  }, [campaigns, filteredOrders, periodFilter, customStartDate, customEndDate]);

  // KPIs Consolidados para o período selecionado
  const totalKpis = useMemo(() => {
    return processedCampaigns.reduce((acc, c) => ({
      clicks: acc.clicks + (Number(c.clicks) || 0),
      cartAdds: acc.cartAdds + (Number(c.cartAdds) || 0),
      purchases: acc.purchases + (Number(c.purchases) || 0),
      revenue: acc.revenue + (Number(c.revenue) || 0)
    }), { clicks: 0, cartAdds: 0, purchases: 0, revenue: 0 });
  }, [processedCampaigns]);

  // Opções de origens / canais com contagem de campanhas
  const sourceOptions = useMemo(() => {
    const counts = {};
    processedCampaigns.forEach(c => {
      const src = (c.utm_source || 'instagram').toLowerCase();
      counts[src] = (counts[src] || 0) + 1;
    });

    const knownSources = allSources.map(s => s.value);
    const allKeys = Array.from(new Set([...knownSources, ...Object.keys(counts)]));

    return allKeys
      .filter(k => (counts[k] || 0) > 0 || allSources.some(s => s.value === k))
      .map(k => {
        const found = allSources.find(s => s.value === k);
        return {
          key: k,
          label: found ? found.label : (k.charAt(0).toUpperCase() + k.slice(1)),
          count: counts[k] || 0
        };
      });
  }, [processedCampaigns, allSources]);

  // Manipulador de ordenação com 3 estados (Maior/A-Z -> Menor/Z-A -> Padrão)
  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key !== key || prev.direction === 'none') {
        const initialDir = (key === 'name' || key === 'target' || key === 'status') ? 'asc' : 'desc';
        return { key, direction: initialDir };
      }
      const isText = key === 'name' || key === 'target' || key === 'status';
      if (isText) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key: null, direction: 'none' };
      } else {
        if (prev.direction === 'desc') return { key, direction: 'asc' };
        if (prev.direction === 'asc') return { key: null, direction: 'none' };
      }
      return { key: null, direction: 'none' };
    });
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key || sortConfig.direction === 'none') {
      return <ArrowUpDown size={12} className={styles.sortIconInactive} />;
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp size={12} className={styles.sortIconActive} />;
    }
    return <ArrowDown size={12} className={styles.sortIconActive} />;
  };

  const getSortLabel = (key) => {
    switch (key) {
      case 'name': return 'Campanha/Canal';
      case 'target': return 'Destino/UTM';
      case 'clicks': return 'Cliques';
      case 'cartAdds': return 'Sacola';
      case 'purchases': return 'Vendas';
      case 'revenue': return 'Receita';
      case 'conversion': return 'Conversão';
      case 'status': return 'Status';
      default: return '';
    }
  };

  // Limpa todos os filtros e ordenações da tabela
  const handleClearAllFilters = () => {
    setCampaignSearchQuery('');
    setSourceFilter('all');
    setStatusFilter('all');
    setSortConfig({ key: null, direction: 'none' });
  };

  // Campanhas filtradas por busca, origem, status e ordenadas
  const displayedCampaigns = useMemo(() => {
    let list = [...processedCampaigns];

    // 1. Filtro por Origem (Canal)
    if (sourceFilter !== 'all') {
      list = list.filter(c => (c.utm_source || '').toLowerCase() === sourceFilter.toLowerCase());
    }

    // 2. Filtro por Status
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') list = list.filter(c => c.active !== false);
      if (statusFilter === 'paused') list = list.filter(c => c.active === false);
      if (statusFilter === 'with_sales') list = list.filter(c => Number(c.purchases || 0) > 0);
    }

    // 3. Busca por texto
    if (campaignSearchQuery && campaignSearchQuery.trim()) {
      const q = campaignSearchQuery.toLowerCase().trim();
      list = list.filter(c => {
        const name = (c.name || '').toLowerCase();
        const src = (c.utm_source || '').toLowerCase();
        const med = (c.utm_medium || '').toLowerCase();
        const utm = (c.utm_campaign || '').toLowerCase();
        const target = (c.targetPath || '').toLowerCase();
        return name.includes(q) || src.includes(q) || med.includes(q) || utm.includes(q) || target.includes(q);
      });
    }

    // 4. Ordenação Interativa
    if (sortConfig.key && sortConfig.direction !== 'none') {
      const { key, direction } = sortConfig;
      list.sort((a, b) => {
        if (key === 'name') {
          const comp = String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base' });
          return direction === 'asc' ? comp : -comp;
        }
        if (key === 'target') {
          const comp = String(a.targetPath || '').localeCompare(String(b.targetPath || ''), 'pt-BR', { sensitivity: 'base' });
          return direction === 'asc' ? comp : -comp;
        }
        if (key === 'clicks') {
          const valA = Number(a.clicks || 0);
          const valB = Number(b.clicks || 0);
          return direction === 'asc' ? valA - valB : valB - valA;
        }
        if (key === 'cartAdds') {
          const valA = Number(a.cartAdds || 0);
          const valB = Number(b.cartAdds || 0);
          return direction === 'asc' ? valA - valB : valB - valA;
        }
        if (key === 'purchases') {
          const valA = Number(a.purchases || 0);
          const valB = Number(b.purchases || 0);
          return direction === 'asc' ? valA - valB : valB - valA;
        }
        if (key === 'revenue') {
          const valA = Number(a.revenue || 0);
          const valB = Number(b.revenue || 0);
          return direction === 'asc' ? valA - valB : valB - valA;
        }
        if (key === 'conversion') {
          const valA = parseFloat(a.conversion || 0);
          const valB = parseFloat(b.conversion || 0);
          return direction === 'asc' ? valA - valB : valB - valA;
        }
        if (key === 'status') {
          const valA = a.active !== false ? 1 : 0;
          const valB = b.active !== false ? 1 : 0;
          return direction === 'asc' ? valA - valB : valB - valA;
        }
        return 0;
      });
    }

    return list;
  }, [processedCampaigns, sourceFilter, statusFilter, campaignSearchQuery, sortConfig]);

  const handleOpenModal = (camp = null) => {
    setShowAddSource(false);
    setShowAddMedium(false);
    if (camp) {
      setEditingCampaign(camp);
      setName(camp.name || '');
      setUtmSource(camp.utm_source || 'instagram');
      setUtmMedium(camp.utm_medium || 'stories');
      setUtmCampaign(camp.utm_campaign || '');
      setTargetPath(camp.targetPath || '/catalogo');
    } else {
      setEditingCampaign(null);
      setName('');
      setUtmSource('instagram');
      setUtmMedium('stories');
      setUtmCampaign('');
      setTargetPath('/catalogo');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim() || !utmCampaign.trim()) {
      alert("Preencha o nome e o código UTM da campanha.");
      return;
    }

    setSaving(true);
    try {
      const cleanCampaign = utmCampaign.toLowerCase().trim().replace(/[\s_-]+/g, '_');
      await campaignService.saveCampaign({
        id: editingCampaign?.id,
        name: name.trim(),
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: cleanCampaign,
        targetPath: targetPath.trim() || '/catalogo',
        fullUrl: generatedUrl,
        active: editingCampaign ? editingCampaign.active : true,
        clicks: editingCampaign ? Number(editingCampaign.clicks || 0) : 0,
        cartAdds: editingCampaign ? Number(editingCampaign.cartAdds || 0) : 0,
        purchases: editingCampaign ? Number(editingCampaign.purchases || 0) : 0,
        revenue: editingCampaign ? Number(editingCampaign.revenue || 0) : 0
      });

      setIsModalOpen(false);
      await loadCampaigns();
    } catch (err) {
      alert("Erro ao salvar campanha no Firestore.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente excluir este link de campanha?")) return;
    try {
      await campaignService.deleteCampaign(id);
      setCampaigns(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert("Erro ao excluir campanha.");
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await campaignService.toggleCampaignStatus(id, currentStatus);
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, active: !currentStatus } : c));
    } catch (err) {
      alert("Erro ao alterar status da campanha.");
    }
  };

  const handleCopyLink = (url, id) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <header className={styles.header}>
        <div>
          <span className={styles.breadcrumb}>CMS // MARKETING & RASTREIOS</span>
          <h1 className={styles.title}>CAMPANHAS, UTMS & LINKS RASTREÁVEIS</h1>
        </div>

        <div className={styles.headerActions}>
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
                onClick={loadCampaigns} 
                disabled={refreshing} 
                className={styles.refreshBtn}
                title="Atualizar Campanhas"
                aria-label="Atualizar dados"
              >
                <RotateCw size={13} className={refreshing ? styles.spinning : ''} />
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

          <button onClick={() => handleOpenModal()} className={styles.createBtn}>
            <Plus size={14} />
            <span>NOVA CAMPANHA / UTM</span>
          </button>
        </div>
      </header>

      {/* 4 CARDS DE KPIS */}
      <section className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>CLIQUES TOTAIS (UTM)</span>
            <InfoTooltip 
              text="Total de acessos únicos originados exclusivamente por links de campanha rastreados." 
              title="Cliques em Links UTM"
              position="bottom"
              align="right"
              width="260px"
            />
          </div>
          <strong className={styles.kpiValue}>{totalKpis.clicks}</strong>
          <small className={styles.kpiSub}>Acessos registrados via tráfego</small>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>ADIÇÕES À SACOLA</span>
            <InfoTooltip 
              text="Itens colocados na sacola por visitantes vindos diretamente de campanhas com UTM ativo." 
              title="Adições via Campanha"
              position="bottom"
              align="right"
              width="260px"
            />
          </div>
          <strong className={styles.blueValue}>+{totalKpis.cartAdds} un.</strong>
          <small className={styles.kpiSub}>Itens adicionados no carrinho</small>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>PEDIDOS PAGOS ({periodLabel})</span>
            <InfoTooltip 
              text="Compras concluídas no período selecionado atribuídas aos links de tráfego de origem." 
              title="Conversão de Pedidos"
              position="bottom"
              align="right"
              width="260px"
            />
          </div>
          <strong className={styles.greenValue}>{totalKpis.purchases} ped.</strong>
          <small className={styles.kpiSub}>
            Taxa média: {totalKpis.clicks > 0 ? ((totalKpis.purchases / totalKpis.clicks) * 100).toFixed(1) : '0.0'}% de conversão
          </small>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>FATURAMENTO VIA UTMS ({periodLabel})</span>
            <InfoTooltip 
              text="Receita líquida total gerada no período pelos canais de marketing e links parametrizados." 
              title="Receita Atribuída"
              position="bottom"
              align="right"
              width="260px"
            />
          </div>
          <strong className={styles.greenValue}>
            R$ {totalKpis.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </strong>
          <small className={styles.kpiSub}>Retorno sobre investimento</small>
        </div>
      </section>

      {/* BARRA DE CONTROLES E FILTROS */}
      <div className={styles.controlBar}>
        <div className={styles.controlBarTop}>
          <div className={styles.searchBox}>
            <Search size={14} className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Buscar por campanha, origem, mídia, UTM ou destino..." 
              value={campaignSearchQuery}
              onChange={(e) => setCampaignSearchQuery(e.target.value)}
            />
            {campaignSearchQuery && (
              <button 
                onClick={() => setCampaignSearchQuery('')} 
                className={styles.clearSearchBtn} 
                title="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className={styles.filtersGroup}>
            <div className={styles.filterSelectWrapper}>
              <Layers size={13} className={styles.filterSelectIcon} />
              <select 
                value={sourceFilter} 
                onChange={(e) => setSourceFilter(e.target.value)} 
                className={styles.filterSelect}
              >
                <option value="all">TODAS AS ORIGENS ({processedCampaigns.length})</option>
                {sourceOptions.map(opt => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label.toUpperCase()} ({opt.count})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterSelectWrapper}>
              <Filter size={13} className={styles.filterSelectIcon} />
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)} 
                className={styles.filterSelect}
              >
                <option value="all">TODOS OS STATUS</option>
                <option value="active">APENAS ATIVOS</option>
                <option value="paused">APENAS PAUSADOS</option>
                <option value="with_sales">COM VENDAS NO PERÍODO</option>
              </select>
            </div>
          </div>
        </div>

        <div className={styles.controlBarBottom}>
          <div className={styles.tableMetaInfo}>
            <span className={styles.tableMetaCount}>
              {displayedCampaigns.length} {displayedCampaigns.length === 1 ? 'campanha listada' : 'campanhas listadas'}
              {(campaignSearchQuery || sourceFilter !== 'all' || statusFilter !== 'all') && ` (de ${processedCampaigns.length})`}
            </span>
            {(campaignSearchQuery || sourceFilter !== 'all' || statusFilter !== 'all' || (sortConfig.key && sortConfig.direction !== 'none')) && (
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
      </div>

      {/* TABELA DE LINKS & PERFORMANCE */}
      <section className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <h3>LINKS ATIVOS & DESEMPENHO DE CANAIS ({displayedCampaigns.length}) — {periodLabel}</h3>
        </div>

        <div className={styles.tableResponsive}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th
                  onClick={() => handleSort('name')}
                  className={styles.sortableTh}
                  title="Clique para ordenar por Campanha & Canal"
                >
                  <div className={styles.thSortContent}>
                    <span>CAMPANHA & CANAL</span>
                    {renderSortIcon('name')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('target')}
                  className={styles.sortableTh}
                  title="Clique para ordenar por Destino & Identificador"
                >
                  <div className={styles.thSortContent}>
                    <span>DESTINO & IDENTIFICADOR</span>
                    {renderSortIcon('target')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('clicks')}
                  className={styles.sortableTh}
                  title="Clique para ordenar por Cliques"
                >
                  <div className={styles.thSortContent}>
                    <span>CLIQUES</span>
                    {renderSortIcon('clicks')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('cartAdds')}
                  className={styles.sortableTh}
                  title="Clique para ordenar por Sacola"
                >
                  <div className={styles.thSortContent}>
                    <span>SACOLA</span>
                    {renderSortIcon('cartAdds')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('purchases')}
                  className={styles.sortableTh}
                  title="Clique para ordenar por Vendas"
                >
                  <div className={styles.thSortContent}>
                    <span>VENDAS</span>
                    {renderSortIcon('purchases')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('revenue')}
                  className={styles.sortableTh}
                  title="Clique para ordenar por Receita"
                >
                  <div className={styles.thSortContent}>
                    <span>RECEITA</span>
                    {renderSortIcon('revenue')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('conversion')}
                  className={styles.sortableTh}
                  title="Clique para ordenar por Conversão"
                >
                  <div className={styles.thSortContent}>
                    <span>CONVERSÃO</span>
                    {renderSortIcon('conversion')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className={styles.sortableTh}
                  title="Clique para ordenar por Status"
                >
                  <div className={styles.thSortContent}>
                    <span>STATUS</span>
                    {renderSortIcon('status')}
                  </div>
                </th>
                <th>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className={styles.centerText}>
                    <RotateCw size={18} className={styles.spinning} />
                    <span>Carregando campanhas do Firestore...</span>
                  </td>
                </tr>
              ) : displayedCampaigns.length === 0 ? (
                <tr>
                  <td colSpan="9" className={styles.centerText}>
                    <span>
                      {campaignSearchQuery || sourceFilter !== 'all' || statusFilter !== 'all'
                        ? 'Nenhuma campanha encontrada com os filtros selecionados.'
                        : 'Nenhum link de campanha cadastrado. Clique no botão acima para criar o primeiro!'}
                    </span>
                  </td>
                </tr>
              ) : (
                displayedCampaigns.map(camp => {
                  const clicks = Number(camp.clicks) || 0;
                  const purchases = Number(camp.purchases) || 0;
                  const revenue = Number(camp.revenue) || 0;
                  const conversion = camp.conversion || (clicks > 0 ? Math.min(100, (purchases / clicks) * 100).toFixed(1) : '0.0');

                  return (
                    <tr key={camp.id}>
                      <td>
                        <div className={styles.campInfo}>
                          <strong>{camp.name}</strong>
                          <div className={styles.tagsRow}>
                            <span className={styles.sourceTag}>{camp.utm_source?.toUpperCase()}</span>
                            <span className={styles.mediumTag}>{camp.utm_medium}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.urlCell}>
                          <code>{camp.targetPath || '/catalogo'}</code>
                          <small className={styles.utmTag}>utm_campaign={camp.utm_campaign}</small>
                        </div>
                      </td>
                      <td><strong>{clicks}</strong></td>
                      <td><span className={styles.blueText}>+{camp.cartAdds || 0}</span></td>
                      <td><strong className={styles.greenText}>{purchases} un.</strong></td>
                      <td>
                        <strong>R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                      </td>
                      <td>
                        <div className={styles.conversionBox}>
                          <strong>{conversion}%</strong>
                          <div className={styles.miniBar}>
                            <div style={{ width: `${Math.min(Number(conversion) * 3, 100)}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <button 
                          onClick={() => handleToggleStatus(camp.id, camp.active)}
                          className={`${styles.statusPill} ${camp.active ? styles.statusActive : styles.statusPaused}`}
                          title="Clique para alternar o status"
                        >
                          {camp.active ? 'ATIVO' : 'PAUSADO'}
                        </button>
                      </td>
                      <td>
                        <div className={styles.actionsRow}>
                          <button 
                            onClick={() => handleCopyLink(camp.fullUrl || generatedUrl, camp.id)}
                            className={`${styles.copyBtn} ${copiedId === camp.id ? styles.copiedBtnActive : ''}`}
                            title="Copiar Link Parametrizado"
                          >
                            {copiedId === camp.id ? (
                              <>
                                <Check size={12} />
                                <span>COPIADO</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>COPIAR</span>
                              </>
                            )}
                          </button>
                          <button 
                            onClick={() => handleOpenModal(camp)} 
                            className={styles.editBtn} 
                            title="Editar Campanha"
                            aria-label="Editar"
                          >
                            <Pencil size={13} />
                          </button>
                          <button 
                            onClick={() => handleDelete(camp.id)} 
                            className={styles.deleteBtn} 
                            title="Excluir Campanha"
                            aria-label="Excluir"
                          >
                            <Trash2 size={13} />
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
      </section>

      {/* MODAL: CRIAR / EDITAR CAMPANHA & GERADOR UTM */}
      {isModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <Link2 size={18} />
                <h2>{editingCampaign ? 'EDITAR CAMPANHA & UTM' : 'NOVO LINK PERSONALIZADO // UTM'}</h2>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className={styles.closeBtn}
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Nome Interno da Campanha *</label>
                <input 
                  type="text" 
                  placeholder="Ex: Dia dos Pais - Calças e Bermudas" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  required 
                />
              </div>

              <div className={styles.formRow}>
                {/* SELETOR DE ORIGEM COM SUPORTE A CUSTOM */}
                <div className={styles.formGroup}>
                  <div className={styles.labelWithAction}>
                    <label>Origem (utm_source) *</label>
                    <button 
                      type="button" 
                      onClick={() => { setShowAddSource(prev => !prev); setShowAddMedium(false); }}
                      className={styles.addOptionToggleBtn}
                      title="Adicionar nova origem personalizada"
                    >
                      <Plus size={11} />
                      <span>NOVA ORIGEM</span>
                    </button>
                  </div>

                  <select 
                    value={utmSource} 
                    onChange={(e) => {
                      if (e.target.value === '__add_new__') {
                        setShowAddSource(true);
                        setShowAddMedium(false);
                      } else {
                        setUtmSource(e.target.value);
                      }
                    }}
                  >
                    <optgroup label="Origens Disponíveis">
                      {allSources.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </optgroup>
                    <option value="__add_new__">+ Criar Nova Origem...</option>
                  </select>

                  {/* PAINEL INLINE: ADICIONAR NOVA ORIGEM */}
                  {showAddSource && (
                    <div className={styles.inlineAddBox}>
                      <div className={styles.inlineAddHeader}>
                        <span>CRIAR NOVA ORIGEM DE TRÁFEGO</span>
                        <button type="button" onClick={() => setShowAddSource(false)} className={styles.inlineCloseBtn}>
                          <X size={12} />
                        </button>
                      </div>
                      <div className={styles.inlineAddBody}>
                        <input 
                          type="text" 
                          placeholder="Nome (ex: Pinterest, Telegram, Kwai, Taboola)" 
                          value={newSourceLabel}
                          onChange={(e) => {
                            setNewSourceLabel(e.target.value);
                            setNewSourceValue(e.target.value.toLowerCase().replace(/[\s_-]+/g, '_'));
                          }}
                          className={styles.inlineInput}
                          autoFocus
                        />
                        <div className={styles.inlineActionRow}>
                          <input 
                            type="text" 
                            placeholder="Tag UTM (ex: pinterest_ads)" 
                            value={newSourceValue}
                            onChange={(e) => setNewSourceValue(e.target.value)}
                            className={styles.inlineInputSmall}
                          />
                          <button 
                            type="button" 
                            onClick={handleAddNewSource} 
                            disabled={!newSourceLabel.trim()}
                            className={styles.inlineSaveBtn}
                          >
                            <Check size={12} />
                            <span>SALVAR</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* SELETOR DE MÍDIA COM SUPORTE A CUSTOM */}
                <div className={styles.formGroup}>
                  <div className={styles.labelWithAction}>
                    <label>Mídia (utm_medium) *</label>
                    <button 
                      type="button" 
                      onClick={() => { setShowAddMedium(prev => !prev); setShowAddSource(false); }}
                      className={styles.addOptionToggleBtn}
                      title="Adicionar nova mídia personalizada"
                    >
                      <Plus size={11} />
                      <span>NOVA MÍDIA</span>
                    </button>
                  </div>

                  <select 
                    value={utmMedium} 
                    onChange={(e) => {
                      if (e.target.value === '__add_new__') {
                        setShowAddMedium(true);
                        setShowAddSource(false);
                      } else {
                        setUtmMedium(e.target.value);
                      }
                    }}
                  >
                    <optgroup label="Mídias Disponíveis">
                      {allMediums.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </optgroup>
                    <option value="__add_new__">+ Criar Nova Mídia...</option>
                  </select>

                  {/* PAINEL INLINE: ADICIONAR NOVA MÍDIA */}
                  {showAddMedium && (
                    <div className={styles.inlineAddBox}>
                      <div className={styles.inlineAddHeader}>
                        <span>CRIAR NOVA MÍDIA / FORMATO</span>
                        <button type="button" onClick={() => setShowAddMedium(false)} className={styles.inlineCloseBtn}>
                          <X size={12} />
                        </button>
                      </div>
                      <div className={styles.inlineAddBody}>
                        <input 
                          type="text" 
                          placeholder="Nome (ex: Banner Topo, SMS, QR Code, Podcast)" 
                          value={newMediumLabel}
                          onChange={(e) => {
                            setNewMediumLabel(e.target.value);
                            setNewMediumValue(e.target.value.toLowerCase().replace(/[\s_-]+/g, '_'));
                          }}
                          className={styles.inlineInput}
                          autoFocus
                        />
                        <div className={styles.inlineActionRow}>
                          <input 
                            type="text" 
                            placeholder="Tag UTM (ex: qr_code)" 
                            value={newMediumValue}
                            onChange={(e) => setNewMediumValue(e.target.value)}
                            className={styles.inlineInputSmall}
                          />
                          <button 
                            type="button" 
                            onClick={handleAddNewMedium} 
                            disabled={!newMediumLabel.trim()}
                            className={styles.inlineSaveBtn}
                          >
                            <Check size={12} />
                            <span>SALVAR</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Identificador da Campanha (utm_campaign) *</label>
                  <input 
                    type="text" 
                    placeholder="Ex: pais_calcas_2026" 
                    value={utmCampaign} 
                    onChange={(e) => setUtmCampaign(e.target.value)}
                    required 
                  />
                  <small>Sem espaços ou caracteres especiais.</small>
                </div>

                <div className={styles.formGroup}>
                  <div className={styles.labelWithAction}>
                    <label>Página de Destino (Rota da Loja) *</label>
                    {targetPath.startsWith('/catalogo') && (
                      <button 
                        type="button" 
                        onClick={() => setShowCatalogFilterHelper(prev => !prev)}
                        className={styles.catalogFilterToggleBtn}
                        title="Abrir configurador de filtros do catálogo"
                      >
                        <SlidersHorizontal size={11} />
                        <span>
                          {showCatalogFilterHelper ? 'OCULTAR FILTROS' : `FILTRAR CATÁLOGO (${activeCatalogFiltersCount})`}
                        </span>
                      </button>
                    )}
                  </div>

                  <input 
                    type="text" 
                    placeholder="Ex: /catalogo ou /produtos/sua-peca" 
                    value={targetPath} 
                    onChange={(e) => setTargetPath(e.target.value)}
                    required 
                  />
                  <small>Caminho relativo da página na loja.</small>
                </div>
              </div>

              {/* ASSISTENTE VISUAL DE FILTROS DO CATÁLOGO (QUANDO ROTA É /catalogo) */}
              {targetPath.startsWith('/catalogo') && showCatalogFilterHelper && (
                <div className={styles.catalogHelperBox}>
                  <div className={styles.catalogHelperHeader}>
                    <div className={styles.catalogHelperTitle}>
                      <SlidersHorizontal size={14} />
                      <span>FILTROS DO CATÁLOGO DE DESTINO</span>
                      {activeCatalogFiltersCount > 0 && (
                        <span className={styles.activeFilterCountBadge}>{activeCatalogFiltersCount} ativo(s)</span>
                      )}
                    </div>
                    {activeCatalogFiltersCount > 0 && (
                      <button 
                        type="button" 
                        onClick={handleClearCatalogFilters} 
                        className={styles.clearCatalogFilterBtn}
                        title="Limpar todos os filtros do catálogo"
                      >
                        <RotateCw size={11} />
                        <span>LIMPAR FILTROS</span>
                      </button>
                    )}
                  </div>

                  <div className={styles.catalogHelperGrid}>
                    {/* BUSCA POR PEÇA */}
                    <div className={styles.catalogHelperColFull}>
                      <span className={styles.helperGroupTitle}>BUSCAR PEÇA</span>
                      <div className={styles.helperSearchWrapper}>
                        <Search size={13} className={styles.helperSearchIcon} />
                        <input 
                          type="text" 
                          placeholder="Ex: Boxy, Hoodie, Calça..."
                          value={parsedCatalogFilters.search}
                          onChange={(e) => toggleCatalogFilter('search', e.target.value, false)}
                          className={styles.helperSearchInput}
                        />
                        {parsedCatalogFilters.search && (
                          <button 
                            type="button" 
                            onClick={() => toggleCatalogFilter('search', '', false)} 
                            className={styles.helperClearSearch}
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* CATEGORIAS */}
                    <div className={styles.catalogHelperCol}>
                      <span className={styles.helperGroupTitle}>CATEGORIAS</span>
                      <div className={styles.helperPillsList}>
                        {CATALOG_CATEGORIES.map(cat => {
                          const isSelected = parsedCatalogFilters.categories.includes(cat.id);
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => toggleCatalogFilter('categories', cat.id, true)}
                              className={`${styles.helperFilterPill} ${isSelected ? styles.helperPillActive : ''}`}
                            >
                              <span className={`${styles.helperCheckbox} ${isSelected ? styles.helperCheckboxActive : ''}`}>
                                {isSelected && <Check size={10} />}
                              </span>
                              <span>{cat.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* MODELAGEM */}
                    <div className={styles.catalogHelperCol}>
                      <span className={styles.helperGroupTitle}>MODELAGEM</span>
                      <div className={styles.helperPillsList}>
                        {CATALOG_FITS.map(fit => {
                          const isSelected = parsedCatalogFilters.fits.includes(fit.id);
                          return (
                            <button
                              key={fit.id}
                              type="button"
                              onClick={() => toggleCatalogFilter('fits', fit.id, true)}
                              className={`${styles.helperFilterPill} ${isSelected ? styles.helperPillActive : ''}`}
                            >
                              <span className={`${styles.helperCheckbox} ${isSelected ? styles.helperCheckboxActive : ''}`}>
                                {isSelected && <Check size={10} />}
                              </span>
                              <span>{fit.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* DROPS */}
                    <div className={styles.catalogHelperCol}>
                      <span className={styles.helperGroupTitle}>DROP</span>
                      <div className={styles.helperPillsList}>
                        {CATALOG_DROPS.map(drop => {
                          const isSelected = parsedCatalogFilters.drops.includes(drop.id);
                          return (
                            <button
                              key={drop.id}
                              type="button"
                              onClick={() => toggleCatalogFilter('drops', drop.id, true)}
                              className={`${styles.helperFilterPill} ${isSelected ? styles.helperPillActive : ''}`}
                            >
                              <span className={`${styles.helperCheckbox} ${isSelected ? styles.helperCheckboxActive : ''}`}>
                                {isSelected && <Check size={10} />}
                              </span>
                              <span>{drop.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* TAMANHOS */}
                    <div className={styles.catalogHelperCol}>
                      <span className={styles.helperGroupTitle}>TAMANHO (VESTUÁRIO)</span>
                      <div className={styles.helperSizesRow}>
                        {CATALOG_SIZES.map(sz => {
                          const isSelected = parsedCatalogFilters.sizes.includes(sz);
                          return (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => toggleCatalogFilter('sizes', sz, true)}
                              className={`${styles.helperSizeBtn} ${isSelected ? styles.helperSizeBtnActive : ''}`}
                            >
                              {sz}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PRÉVIA DO LINK GERADO */}
              <div className={styles.previewBox}>
                <div className={styles.previewTop}>
                  <span className={styles.previewLabel}>LINK COMPLETO GERADO:</span>
                  <button 
                    type="button" 
                    onClick={() => handleCopyLink(generatedUrl, 'modal_preview')}
                    className={styles.previewCopyBtn}
                    title="Copiar URL gerada"
                  >
                    {copiedId === 'modal_preview' ? (
                      <>
                        <Check size={11} />
                        <span>COPIADO</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span>COPIAR URL</span>
                      </>
                    )}
                  </button>
                </div>
                <code className={styles.previewUrl}>{generatedUrl}</code>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" onClick={() => setIsModalOpen(false)} className={styles.cancelBtn}>
                  CANCELAR
                </button>
                <button type="submit" disabled={saving} className={styles.saveBtn}>
                  {saving ? (
                    <>
                      <RotateCw size={13} className={styles.spinning} />
                      <span>SALVANDO NA NUVEM...</span>
                    </>
                  ) : editingCampaign ? (
                    <>
                      <Check size={13} />
                      <span>SALVAR ALTERAÇÕES</span>
                    </>
                  ) : (
                    <>
                      <Plus size={13} />
                      <span>CRIAR LINK DE CAMPANHA</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CmsCampanhas;
