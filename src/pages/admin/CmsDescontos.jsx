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
  ArrowUpRight
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
      const daysIdle = Number(p.daysWithoutSale || 0);
      const stock = Number(p.totalStock || 0);
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

  // Filtro da Tabela
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const name = (p.name || '').toLowerCase();
      const slug = (p.slug || p.id || '').toLowerCase();
      const query = searchTerm.toLowerCase();
      const matchesSearch = name.includes(query) || slug.includes(query);

      if (!matchesSearch) return false;

      const isPromo = Boolean(p.discountPrice && p.discountPrice < p.price && p.discountActive !== false);

      if (filterMode === 'active_promo') return isPromo;
      if (filterMode === 'suggested') return suggestedProducts.some(s => s.id === p.id);
      if (filterMode === 'full_price') return !isPromo;

      return true;
    });
  }, [products, searchTerm, filterMode, suggestedProducts]);

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
        <div className={styles.searchBox}>
          <Search size={15} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Buscar peça por nome, modelagem ou código..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
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

      {/* TABELA DE PRODUTOS & PREÇOS */}
      <div className={styles.tableWrapper}>
        <table className={styles.promoTable}>
          <thead>
            <tr>
              <th>PRODUTO</th>
              <th>MODELAGEM / DROP</th>
              <th>ESTOQUE</th>
              <th>PREÇO ORIGINAL</th>
              <th>PREÇO PROMOCIONAL</th>
              <th>DESCONTO</th>
              <th>STATUS DA PROMO</th>
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
