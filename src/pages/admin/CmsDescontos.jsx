import React, { useState, useEffect, useMemo } from 'react';
import { 
  Percent, 
  Sparkles, 
  TrendingDown, 
  RotateCw, 
  Search, 
  Check, 
  X, 
  Save, 
  AlertCircle, 
  Calendar, 
  DollarSign, 
  Flame, 
  Clock, 
  Eye, 
  ShoppingBag,
  SlidersHorizontal,
  ArrowUpRight,
  Layers,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { catalogService } from '../../services/catalogService';
import { seedService } from '../../services/seedService';
import { InfoTooltip } from '../../components/ui/InfoTooltip';
import styles from './CmsDescontos.module.css';

export function CmsDescontos() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'active_promo' | 'suggested' | 'full_price'
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'camisa' | 'jaqueta' | 'calca' | 'brinde'
  const [fitFilter, setFitFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'none' });

  // Modal de Edição de Promoção Individual
  const [editingProduct, setEditingProduct] = useState(null);
  const [promoForm, setPromoForm] = useState({
    discountPrice: '',
    discountActive: true,
    discountStartDate: '',
    discountEndDate: ''
  });
  const [savingId, setSavingId] = useState(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState(null);

  // Carrega produtos do Firestore
  const loadProducts = async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      await seedService.seedCatalogIfEmpty();
      const all = await catalogService.getAllProducts();
      setProducts(all);
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Análise de Produtos Sugeridos para Promoção (Inteligência Operacional)
  const suggestedProducts = useMemo(() => {
    return products.filter(p => {
      let daysIdle = 0;
      if (p.createdAt) {
        const t = new Date(p.createdAt).getTime();
        if (!isNaN(t) && t > 0) daysIdle = Math.max(0, Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24)));
      } else if (p.updatedAt) {
        const t = new Date(p.updatedAt).getTime();
        if (!isNaN(t) && t > 0) daysIdle = Math.max(0, Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24)));
      } else if (typeof p.id === 'string' && p.id.startsWith('thr33_')) {
        const num = Number(p.id.replace('thr33_', ''));
        if (!isNaN(num) && num > 1600000000000) daysIdle = Math.max(0, Math.floor((Date.now() - num) / (1000 * 60 * 60 * 24)));
      } else if (p.daysWithoutSale !== undefined) {
        daysIdle = Number(p.daysWithoutSale);
      }
      const stock = Number(p.totalStock || (p.stock ? Object.values(p.stock).reduce((a, b) => a + (Number(b) || 0), 0) : 0));
      const views = Number(p.views || 0);
      const purchases = Number(p.purchases || 0);
      const isPromo = Boolean(p.discountPrice && p.discountPrice < p.price && p.discountActive !== false);

      if (isPromo) return false;
      // Critério 1: Estoque parado há mais de 30 dias com estoque positivo
      if (daysIdle >= 30 && stock > 0) return true;
      // Critério 2: Alto tráfego (>= 50 views) mas 0 compras (fricção de preço)
      if (views >= 50 && purchases === 0 && stock > 0) return true;

      return false;
    });
  }, [products]);

  // Contagem dinâmica de categorias disponíveis
  const categoryCounts = useMemo(() => {
    const counts = { all: products.length };
    products.forEach(p => {
      const cat = (p.category || p.type || 'camisa').toLowerCase();
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Opções dinâmicas de categoria para o seletor de filtros
  const categoryOptions = useMemo(() => {
    const counts = {};
    products.forEach(p => {
      const cat = (p.category || p.type || 'camisa').toLowerCase();
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const CATEGORY_LABELS = {
      'camisa': 'Camisetas',
      'jaqueta': 'Jaquetas',
      'calca': 'Calças',
      'brinde': 'Brindes',
      'gift-card': 'Vales-Presente',
      'shorts': 'Shorts & Bermudas',
      'short': 'Shorts & Bermudas',
      'bone': 'Bonés & Acessórios',
      'bones': 'Bonés & Acessórios'
    };

    return Object.keys(counts).sort().map(k => ({
      key: k,
      label: CATEGORY_LABELS[k] || (k.charAt(0).toUpperCase() + k.slice(1).replace(/[-_]/g, ' ')),
      count: counts[k] || 0
    }));
  }, [products]);

  // Modelagens (Fits) dinâmicas mapeadas exclusivamente dos produtos cadastrados no sistema
  const fitOptions = useMemo(() => {
    const counts = {};
    products.forEach(p => {
      if (p.type === 'brinde' || p.category === 'brinde') return;
      const fit = String(p.fit || '').trim().toLowerCase();
      if (!fit || fit === 'único' || fit === 'unico' || fit === 'padrão' || fit === 'padrao') return;
      counts[fit] = (counts[fit] || 0) + 1;
    });

    const FIT_LABELS = {
      'boxy': 'Boxy Fit',
      'oversized': 'Oversized Fit',
      'normal': 'Normal / Regular Fit',
      'regular': 'Normal / Regular Fit',
      'regata': 'Regata',
      'slim': 'Slim Fit',
      'wide_leg': 'Wide Leg',
      'wide-leg': 'Wide Leg',
      'cargo': 'Cargo Fit',
      'cropped': 'Cropped Fit',
      'drop_shoulder': 'Drop Shoulder Fit',
      'drop-shoulder': 'Drop Shoulder Fit',
      'street': 'Street Fit'
    };

    return Object.keys(counts).sort().map(fitKey => {
      const formattedLabel = FIT_LABELS[fitKey] || (
        fitKey.charAt(0).toUpperCase() + fitKey.slice(1).replace(/[-_]/g, ' ') + ' Fit'
      );
      return {
        key: fitKey,
        label: formattedLabel,
        count: counts[fitKey]
      };
    });
  }, [products]);

  // Manipulador de ordenação com 3 estados (Maior/A-Z -> Menor/Z-A -> Padrão)
  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key !== key || prev.direction === 'none') {
        const initialDir = (key === 'name' || key === 'fit' || key === 'status') ? 'asc' : 'desc';
        return { key, direction: initialDir };
      }
      const isText = key === 'name' || key === 'fit' || key === 'status';
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
      case 'name': return 'Produto';
      case 'fit': return 'Modelagem/Drop';
      case 'stock': return 'Estoque';
      case 'price': return 'Preço Original';
      case 'promoPrice': return 'Preço Promocional';
      case 'discount': return 'Desconto';
      case 'status': return 'Status da Promo';
      default: return '';
    }
  };

  // Limpa todos os filtros e ordenações da tabela
  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilterMode('all');
    setCategoryFilter('all');
    setFitFilter('all');
    setStockFilter('all');
    setSortConfig({ key: null, direction: 'none' });
  };

  // Filtro e Ordenação Completa na Tabela de Promoções
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // 1. Categoria (Tipo)
    if (categoryFilter !== 'all') {
      list = list.filter(p => (p.category === categoryFilter || p.type === categoryFilter));
    }

    // 2. Modelagem (Fit Dinâmico)
    if (fitFilter !== 'all') {
      list = list.filter(p => (p.fit || '').toLowerCase() === fitFilter.toLowerCase());
    }

    // 3. Modo de Filtro
    if (filterMode !== 'all') {
      list = list.filter(p => {
        const origPrice = Number(p.price || 0);
        const discountPrice = Number(p.discountPrice || 0);
        const isPromo = Boolean(discountPrice > 0 && discountPrice < origPrice && p.discountActive !== false);

        if (filterMode === 'active_promo') return isPromo;
        if (filterMode === 'suggested') return suggestedProducts.some(s => s.id === p.id);
        if (filterMode === 'full_price') return !isPromo;
        return true;
      });
    }

    // 4. Filtro de Estoque
    if (stockFilter !== 'all') {
      list = list.filter(p => {
        const totalStock = p.stock 
          ? Object.values(p.stock).reduce((a, b) => a + (Number(b) || 0), 0)
          : (p.totalStock ?? 50);

        if (stockFilter === 'in_stock') return totalStock > 5;
        if (stockFilter === 'low_stock') return totalStock > 0 && totalStock <= 5;
        if (stockFilter === 'out_of_stock') return totalStock === 0;
        return true;
      });
    }

    // 5. Busca Textual
    if (searchTerm && searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(p => {
        const name = (p.name || '').toLowerCase();
        const slug = (p.slug || p.id || '').toLowerCase();
        const fit = (p.fit || '').toLowerCase();
        const drop = (p.drop || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        return name.includes(q) || slug.includes(q) || fit.includes(q) || drop.includes(q) || cat.includes(q);
      });
    }

    // 6. Ordenação Interativa
    if (sortConfig.key && sortConfig.direction !== 'none') {
      const { key, direction } = sortConfig;
      list.sort((a, b) => {
        if (key === 'name') {
          const nameA = a.name || a.title || '';
          const nameB = b.name || b.title || '';
          const comp = nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
          return direction === 'asc' ? comp : -comp;
        }
        if (key === 'fit') {
          const fitA = `${a.fit || ''} ${a.drop || ''}`;
          const fitB = `${b.fit || ''} ${b.drop || ''}`;
          const comp = fitA.localeCompare(fitB, 'pt-BR', { sensitivity: 'base' });
          return direction === 'asc' ? comp : -comp;
        }
        if (key === 'stock') {
          const stA = a.stock ? Object.values(a.stock).reduce((s, v) => s + (Number(v) || 0), 0) : (a.totalStock ?? 50);
          const stB = b.stock ? Object.values(b.stock).reduce((s, v) => s + (Number(v) || 0), 0) : (b.totalStock ?? 50);
          return direction === 'asc' ? stA - stB : stB - stA;
        }
        if (key === 'price') {
          const prA = Number(a.price || a.priceNum || 0);
          const prB = Number(b.price || b.priceNum || 0);
          return direction === 'asc' ? prA - prB : prB - prA;
        }
        if (key === 'promoPrice') {
          const prA = a.discountPrice ? Number(a.discountPrice) : Number(a.price || 0);
          const prB = b.discountPrice ? Number(b.discountPrice) : Number(b.price || 0);
          return direction === 'asc' ? prA - prB : prB - prA;
        }
        if (key === 'discount') {
          const origA = Number(a.price || 0);
          const discA = Number(a.discountPrice || 0);
          const pctA = (discA > 0 && discA < origA && a.discountActive !== false) ? Math.round(((origA - discA) / origA) * 100) : 0;

          const origB = Number(b.price || 0);
          const discB = Number(b.discountPrice || 0);
          const pctB = (discB > 0 && discB < origB && b.discountActive !== false) ? Math.round(((origB - discB) / origB) * 100) : 0;

          return direction === 'asc' ? pctA - pctB : pctB - pctA;
        }
        if (key === 'status') {
          const isPromoA = Boolean(a.discountPrice && a.discountPrice < a.price && a.discountActive !== false) ? 1 : 0;
          const isPromoB = Boolean(b.discountPrice && b.discountPrice < b.price && b.discountActive !== false) ? 1 : 0;
          return direction === 'asc' ? isPromoA - isPromoB : isPromoB - isPromoA;
        }
        return 0;
      });
    }

    return list;
  }, [products, categoryFilter, fitFilter, filterMode, stockFilter, searchTerm, sortConfig, suggestedProducts]);

  // Abertura do Modal de Edição
  const handleOpenPromoModal = (prod) => {
    setEditingProduct(prod);
    const originalPrice = Number(prod.price || 0);
    const existingDiscount = prod.discountPrice ? Number(prod.discountPrice) : (originalPrice * 0.85); // 15% OFF sugerido

    setPromoForm({
      discountPrice: existingDiscount.toFixed(2),
      discountActive: prod.discountActive !== false,
      discountStartDate: prod.discountStartDate || new Date().toISOString().split('T')[0],
      discountEndDate: prod.discountEndDate || ''
    });
  };

  // Aplicação Rápida de Desconto Sugerido (ex: 20% OFF)
  const handleQuickApplyDiscount = async (prod, percentOff = 20) => {
    const originalPrice = Number(prod.price || 0);
    const promoPrice = +(originalPrice * (1 - percentOff / 100)).toFixed(2);
    setSavingId(prod.id);

    try {
      const docRef = doc(db, 'products', prod.id);
      await updateDoc(docRef, {
        discountPrice: promoPrice,
        discountActive: true,
        discountPercentage: percentOff,
        discountStartDate: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString()
      });

      setProducts(prev => prev.map(p => p.id === prod.id ? {
        ...p,
        discountPrice: promoPrice,
        discountActive: true,
        discountPercentage: percentOff
      } : p));

      setFeedbackSuccess(`Desconto de ${percentOff}% aplicado a ${prod.name}!`);
      setTimeout(() => setFeedbackSuccess(null), 3000);
    } catch (err) {
      console.error("Erro ao aplicar desconto rápido:", err);
      alert("Erro ao salvar desconto no Firestore.");
    } finally {
      setSavingId(null);
    }
  };

  // Salvar Promoção do Modal
  const handleSavePromo = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    const originalPrice = Number(editingProduct.price || 0);
    const promoPrice = parseFloat(String(promoForm.discountPrice).replace(',', '.'));

    if (isNaN(promoPrice) || promoPrice <= 0 || promoPrice >= originalPrice) {
      alert("O preço promocional deve ser menor que o preço original e maior que zero.");
      return;
    }

    const calculatedPercent = Math.round(((originalPrice - promoPrice) / originalPrice) * 100);
    setSavingId(editingProduct.id);

    try {
      const docRef = doc(db, 'products', editingProduct.id);
      const updateData = {
        discountPrice: promoPrice,
        discountActive: promoForm.discountActive,
        discountPercentage: calculatedPercent,
        discountStartDate: promoForm.discountStartDate || null,
        discountEndDate: promoForm.discountEndDate || null,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(docRef, updateData);

      setProducts(prev => prev.map(p => p.id === editingProduct.id ? {
        ...p,
        ...updateData
      } : p));

      setEditingProduct(null);
      setFeedbackSuccess(`Promoção salva para ${editingProduct.name}!`);
      setTimeout(() => setFeedbackSuccess(null), 3000);
    } catch (err) {
      console.error("Erro ao salvar promoção:", err);
      alert("Erro ao salvar dados no Firestore.");
    } finally {
      setSavingId(null);
    }
  };

  // Desativar / Remover Desconto
  const handleRemoveDiscount = async (prod) => {
    if (!window.confirm(`Deseja remover a promoção da peça "${prod.name}" e voltar ao preço cheio?`)) return;
    setSavingId(prod.id);

    try {
      const docRef = doc(db, 'products', prod.id);
      await updateDoc(docRef, {
        discountPrice: null,
        discountActive: false,
        discountPercentage: null,
        discountStartDate: null,
        discountEndDate: null,
        updatedAt: new Date().toISOString()
      });

      setProducts(prev => prev.map(p => p.id === prod.id ? {
        ...p,
        discountPrice: null,
        discountActive: false,
        discountPercentage: null
      } : p));

      setFeedbackSuccess(`Promoção removida de ${prod.name}!`);
      setTimeout(() => setFeedbackSuccess(null), 3000);
    } catch (err) {
      console.error("Erro ao remover promoção:", err);
      alert("Erro ao remover dados no Firestore.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className={styles.container}>
      {/* HEADER DA PÁGINA */}
      <header className={styles.header}>
        <div>
          <span className={styles.breadcrumb}>CMS // MARKETING & PRECIFICAÇÃO</span>
          <h1 className={styles.title}>GESTÃO DE DESCONTOS & LIQUIDAÇÃO</h1>
        </div>

        <div className={styles.headerActions}>
          <button 
            type="button" 
            onClick={loadProducts} 
            disabled={refreshing} 
            className={styles.refreshBtn}
            title="Recarregar catálogo do Firestore"
          >
            <RotateCw size={14} className={refreshing ? styles.spinning : ''} />
            <span>{refreshing ? 'ATUALIZANDO...' : 'SINCRONIZAR'}</span>
          </button>
        </div>
      </header>

      {/* FEEDBACK TOAST */}
      {feedbackSuccess && (
        <div className={styles.toastSuccess}>
          <Check size={16} />
          <span>{feedbackSuccess}</span>
        </div>
      )}

      {/* CARDS DE INTELIGÊNCIA OPERACIONAL DE PREÇO */}
      <section className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>EM PROMOÇÃO ATIVA</span>
            <Percent size={16} className={styles.metricIcon} />
          </div>
          <strong className={styles.metricValue}>
            {products.filter(p => p.discountPrice && p.discountActive !== false).length}
          </strong>
          <span className={styles.metricHint}>Peças com preço riscado no site</span>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>SUGESTÕES DE LIQUIDAÇÃO</span>
            <Flame size={16} style={{ color: '#f87171' }} />
          </div>
          <strong className={styles.metricValue} style={{ color: '#f87171' }}>
            {suggestedProducts.length}
          </strong>
          <span className={styles.metricHint}>Itens &gt;30 dias sem giro ou com atrito de conversão</span>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>PREÇO CHEIO / BASE</span>
            <DollarSign size={16} className={styles.metricIcon} />
          </div>
          <strong className={styles.metricValue}>
            {products.filter(p => !p.discountPrice || p.discountActive === false).length}
          </strong>
          <span className={styles.metricHint}>Itens operando com margem integral</span>
        </div>
      </section>

      {/* SEÇÃO DE SUGESTÕES INTELIGENTES (SMART PRICING) */}
      {suggestedProducts.length > 0 && (
        <section className={styles.smartPricingSection}>
          <div className={styles.smartHeader}>
            <div className={styles.smartTitleGroup}>
              <Sparkles size={16} style={{ color: '#facc15' }} />
              <h3>SMART PRICING // OPORTUNIDADES DE GIRO RÁPIDO</h3>
              <InfoTooltip 
                title="Inteligência de Liquidação" 
                text="Peças com estoque parado há mais de 30 dias ou com alta visualização e zero compras. A aplicação de desconto estimula a conversão imediata."
                position="right"
              />
            </div>
          </div>

          <div className={styles.smartGrid}>
            {suggestedProducts.slice(0, 4).map(prod => {
              const origPrice = Number(prod.price || 0);
              const promo20 = (origPrice * 0.8).toFixed(2);

              return (
                <div key={prod.id} className={styles.smartCard}>
                  <div className={styles.smartCardImageWrapper}>
                    <img src={prod.image || (prod.images && prod.images[0])} alt={prod.name} />
                    <span className={styles.stagnantTag}>
                      {prod.daysWithoutSale ? `${prod.daysWithoutSale} dias sem giro` : 'Alta fricção'}
                    </span>
                  </div>
                  <div className={styles.smartCardBody}>
                    <h4>{prod.name}</h4>
                    <div className={styles.smartPrices}>
                      <span className={styles.origPrice}>R$ {origPrice.toFixed(2)}</span>
                      <span className={styles.suggestedPromo}>Sugerido: R$ {promo20} (-20%)</span>
                    </div>
                    <div className={styles.smartActions}>
                      <button
                        type="button"
                        onClick={() => handleQuickApplyDiscount(prod, 20)}
                        disabled={savingId === prod.id}
                        className={styles.btnApplyQuick}
                      >
                        {savingId === prod.id ? 'APLICANDO...' : 'APLICAR -20%'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenPromoModal(prod)}
                        className={styles.btnCustomize}
                      >
                        CUSTOMIZAR
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* BARRA DE BUSCA E FILTROS */}
      <div className={styles.filterBar}>
        <div className={styles.filterBarTop}>
          <div className={styles.searchBox}>
            <Search size={15} className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Buscar peça por nome, estampa, modelagem ou código..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
            {searchTerm && (
              <button 
                type="button" 
                onClick={() => setSearchTerm('')} 
                className={styles.clearSearchBtn}
                title="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className={styles.filterModes}>
            <button 
              type="button" 
              className={`${styles.modeBtn} ${filterMode === 'all' ? styles.activeMode : ''}`}
              onClick={() => setFilterMode('all')}
            >
              TODOS ({products.length})
            </button>
            <button 
              type="button" 
              className={`${styles.modeBtn} ${filterMode === 'active_promo' ? styles.activeMode : ''}`}
              onClick={() => setFilterMode('active_promo')}
            >
              EM PROMOÇÃO ({products.filter(p => p.discountPrice && p.discountActive !== false).length})
            </button>
            <button 
              type="button" 
              className={`${styles.modeBtn} ${filterMode === 'suggested' ? styles.activeMode : ''}`}
              onClick={() => setFilterMode('suggested')}
            >
              SUGERIDOS ({suggestedProducts.length})
            </button>
            <button 
              type="button" 
              className={`${styles.modeBtn} ${filterMode === 'full_price' ? styles.activeMode : ''}`}
              onClick={() => setFilterMode('full_price')}
            >
              PREÇO CHEIO ({products.filter(p => !p.discountPrice || p.discountActive === false).length})
            </button>
          </div>
        </div>

        {/* SUB-BARRA COM SELETORES DE TIPO, MODELAGEM, ESTOQUE & METADADOS */}
        <div className={styles.filterBarBottom}>
          <div className={styles.filterSelectorsGroup}>
            {/* SELETOR DE CATEGORIA / TIPO */}
            <div className={styles.filterSelectWrapper}>
              <Layers size={13} className={styles.filterSelectIcon} />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={styles.filterSelect}
                title="Filtrar por Categoria / Tipo"
              >
                <option value="all">Todos os Tipos ({products.length})</option>
                {categoryOptions.map(cat => (
                  <option key={cat.key} value={cat.key}>
                    {cat.label} ({cat.count})
                  </option>
                ))}
              </select>
            </div>

            {/* SELETOR DE MODELAGEM / FIT DINÂMICO */}
            <div className={styles.filterSelectWrapper}>
              <Layers size={13} className={styles.filterSelectIcon} />
              <select 
                value={fitFilter}
                onChange={(e) => setFitFilter(e.target.value)}
                className={styles.filterSelect}
                title="Filtrar por Modelagem Disponível"
              >
                <option value="all">Todas as Modelagens ({fitOptions.reduce((acc, f) => acc + f.count, 0)})</option>
                {fitOptions.map(f => (
                  <option key={f.key} value={f.key}>
                    {f.label} ({f.count})
                  </option>
                ))}
              </select>
            </div>

            {/* SELETOR DE ESTOQUE */}
            <div className={styles.filterSelectWrapper}>
              <Filter size={13} className={styles.filterSelectIcon} />
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className={styles.filterSelect}
                title="Filtrar por Volume de Estoque"
              >
                <option value="all">Todos os Estoques</option>
                <option value="in_stock">Estoque Saudável (&gt; 5 un.)</option>
                <option value="low_stock">Estoque Baixo (≤ 5 un.)</option>
                <option value="out_of_stock">Esgotados (0 un.)</option>
              </select>
            </div>
          </div>

          <div className={styles.tableMetaInfo}>
            <span className={styles.tableMetaCount}>
              {filteredProducts.length} {filteredProducts.length === 1 ? 'produto listado' : 'produtos listados'}
              {(searchTerm || categoryFilter !== 'all' || fitFilter !== 'all' || filterMode !== 'all' || stockFilter !== 'all') && ` (de ${products.length})`}
            </span>
            {(searchTerm || categoryFilter !== 'all' || fitFilter !== 'all' || filterMode !== 'all' || stockFilter !== 'all' || (sortConfig.key && sortConfig.direction !== 'none')) && (
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

      {/* TABELA DE PRODUTOS & PREÇOS */}
      <div className={styles.tableWrapper}>
        <table className={styles.promoTable}>
          <thead>
            <tr>
              <th
                onClick={() => handleSort('name')}
                className={styles.sortableTh}
                title="Clique para ordenar por Produto"
              >
                <div className={styles.thSortContent}>
                  <span>PRODUTO</span>
                  {renderSortIcon('name')}
                </div>
              </th>
              <th
                onClick={() => handleSort('fit')}
                className={styles.sortableTh}
                title="Clique para ordenar por Modelagem / Drop"
              >
                <div className={styles.thSortContent}>
                  <span>MODELAGEM / DROP</span>
                  {renderSortIcon('fit')}
                </div>
              </th>
              <th
                onClick={() => handleSort('stock')}
                className={styles.sortableTh}
                title="Clique para ordenar por Estoque"
              >
                <div className={styles.thSortContent}>
                  <span>ESTOQUE</span>
                  {renderSortIcon('stock')}
                </div>
              </th>
              <th
                onClick={() => handleSort('price')}
                className={styles.sortableTh}
                title="Clique para ordenar por Preço Original"
              >
                <div className={styles.thSortContent}>
                  <span>PREÇO ORIGINAL</span>
                  {renderSortIcon('price')}
                </div>
              </th>
              <th
                onClick={() => handleSort('promoPrice')}
                className={styles.sortableTh}
                title="Clique para ordenar por Preço Promocional"
              >
                <div className={styles.thSortContent}>
                  <span>PREÇO PROMOCIONAL</span>
                  {renderSortIcon('promoPrice')}
                </div>
              </th>
              <th
                onClick={() => handleSort('discount')}
                className={styles.sortableTh}
                title="Clique para ordenar por % de Desconto"
              >
                <div className={styles.thSortContent}>
                  <span>DESCONTO</span>
                  {renderSortIcon('discount')}
                </div>
              </th>
              <th
                onClick={() => handleSort('status')}
                className={styles.sortableTh}
                title="Clique para ordenar por Status da Promoção"
              >
                <div className={styles.thSortContent}>
                  <span>STATUS DA PROMO</span>
                  {renderSortIcon('status')}
                </div>
              </th>
              <th style={{ textAlign: 'right' }}>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  <RotateCw size={24} className={styles.spinning} style={{ margin: '0 auto 0.5rem' }} />
                  <p>Carregando catálogo do Firestore...</p>
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  Nenhum produto encontrado com os filtros selecionados.
                </td>
              </tr>
            ) : (
              filteredProducts.map(prod => {
                const origPrice = Number(prod.price || 0);
                const discountPrice = Number(prod.discountPrice || 0);
                const isPromo = Boolean(discountPrice > 0 && discountPrice < origPrice && prod.discountActive !== false);
                const percent = isPromo ? Math.round(((origPrice - discountPrice) / origPrice) * 100) : 0;

                return (
                  <tr key={prod.id}>
                    <td>
                      <div className={styles.productCell}>
                        <img 
                          src={prod.image || (prod.images && prod.images[0]) || ''} 
                          alt={prod.name} 
                          className={styles.productThumb} 
                        />
                        <div className={styles.productMeta}>
                          <strong>{prod.name}</strong>
                          <span className={styles.slug}>{prod.slug || prod.id}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={styles.tagBadge}>{(prod.fit || 'boxy').toUpperCase()}</span>
                    </td>
                    <td>
                      <strong>{prod.totalStock || 0} un.</strong>
                    </td>
                    <td>
                      <span className={isPromo ? styles.priceCrossed : styles.priceNormal}>
                        R$ {origPrice.toFixed(2).replace('.', ',')}
                      </span>
                    </td>
                    <td>
                      {isPromo ? (
                        <strong className={styles.promoHighlight}>
                          R$ {discountPrice.toFixed(2).replace('.', ',')}
                        </strong>
                      ) : (
                        <span className={styles.mutedDash}>—</span>
                      )}
                    </td>
                    <td>
                      {isPromo ? (
                        <span className={styles.discountPill}>-{percent}%</span>
                      ) : (
                        <span className={styles.mutedDash}>0%</span>
                      )}
                    </td>
                    <td>
                      {isPromo ? (
                        <span className={styles.statusActive}>● Ativa</span>
                      ) : (
                        <span className={styles.statusInactive}>○ Preço Cheio</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className={styles.actionsCell}>
                        <button
                          type="button"
                          onClick={() => handleOpenPromoModal(prod)}
                          className={styles.btnEditPromo}
                          title="Configurar desconto"
                        >
                          {isPromo ? 'EDITAR DESCONTO' : 'CRIAR PROMOÇÃO'}
                        </button>
                        {isPromo && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDiscount(prod)}
                            disabled={savingId === prod.id}
                            className={styles.btnRemovePromo}
                            title="Remover desconto"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE CONFIGURAÇÃO DE DESCONTO */}
      {editingProduct && (
        <div className={styles.modalBackdrop} onClick={() => setEditingProduct(null)}>
          <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
            <header className={styles.modalHeader}>
              <div>
                <span className={styles.modalPreTitle}>PRECIFICAÇÃO PROMOCIONAL</span>
                <h3>{editingProduct.name}</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingProduct(null)} 
                className={styles.modalCloseBtn}
              >
                <X size={18} />
              </button>
            </header>

            <form onSubmit={handleSavePromo} className={styles.modalForm}>
              <div className={styles.pricingSummaryRow}>
                <div className={styles.summaryItem}>
                  <span>Preço de Tabela:</span>
                  <strong>R$ {Number(editingProduct.price || 0).toFixed(2).replace('.', ',')}</strong>
                </div>
                <div className={styles.summaryItem}>
                  <span>Novo Preço:</span>
                  <strong style={{ color: '#ff0055' }}>
                    R$ {parseFloat(String(promoForm.discountPrice || 0).replace(',', '.')).toFixed(2).replace('.', ',')}
                  </strong>
                </div>
                <div className={styles.summaryItem}>
                  <span>Economia do Cliente:</span>
                  <strong>
                    {Math.max(0, Math.round(((Number(editingProduct.price || 0) - parseFloat(String(promoForm.discountPrice || 0).replace(',', '.'))) / Number(editingProduct.price || 1)) * 100))}% OFF
                  </strong>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>PREÇO COM DESCONTO (R$) *</label>
                <input 
                  type="text" 
                  placeholder="Ex: 149.90" 
                  value={promoForm.discountPrice} 
                  onChange={(e) => setPromoForm(prev => ({ ...prev, discountPrice: e.target.value }))}
                  required 
                />
              </div>

              {/* ATALHOS DE DESCONTO RÁPIDO */}
              <div className={styles.quickChipsRow}>
                <span>SUGESTÕES RÁPIDAS:</span>
                {[10, 15, 20, 30].map(pct => {
                  const calculated = (Number(editingProduct.price || 0) * (1 - pct / 100)).toFixed(2);
                  return (
                    <button
                      key={pct}
                      type="button"
                      className={styles.quickChip}
                      onClick={() => setPromoForm(prev => ({ ...prev, discountPrice: calculated }))}
                    >
                      -{pct}% (R$ {calculated})
                    </button>
                  );
                })}
              </div>

              <div className={styles.gridTwo}>
                <div className={styles.inputGroup}>
                  <label>INÍCIO DA PROMOÇÃO</label>
                  <input 
                    type="date" 
                    value={promoForm.discountStartDate} 
                    onChange={(e) => setPromoForm(prev => ({ ...prev, discountStartDate: e.target.value }))}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>TÉRMINO (OPCIONAL)</label>
                  <input 
                    type="date" 
                    value={promoForm.discountEndDate} 
                    onChange={(e) => setPromoForm(prev => ({ ...prev, discountEndDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className={styles.checkboxGroup}>
                <label className={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    checked={promoForm.discountActive} 
                    onChange={(e) => setPromoForm(prev => ({ ...prev, discountActive: e.target.checked }))} 
                  />
                  <span>Desconto Ativo no Catálogo e na PDP</span>
                </label>
              </div>

              <footer className={styles.modalFooter}>
                <button 
                  type="button" 
                  onClick={() => setEditingProduct(null)} 
                  className={styles.btnCancel}
                >
                  CANCELAR
                </button>
                <button 
                  type="submit" 
                  disabled={savingId === editingProduct.id} 
                  className={styles.btnSave}
                >
                  <Save size={15} />
                  <span>{savingId === editingProduct.id ? 'GRAVANDO...' : 'SALVAR PROMOÇÃO'}</span>
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CmsDescontos;
