import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { analyticsService } from '../../services/analyticsService';
import styles from './FilterSidebar.module.css';

export function FilterSidebar({ 
  products = [],
  filters, 
  setFilters, 
  onReset,
  searchQuery = '',
  onSearchSubmit,
  onSearchClear
}) {
  const [searchTerm, setSearchTerm] = useState(searchQuery);

  useEffect(() => {
    setSearchTerm(searchQuery);
  }, [searchQuery]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (onSearchSubmit) {
      onSearchSubmit(searchTerm.trim());
      if (searchTerm.trim()) {
        analyticsService.trackFilterUse('busca', searchTerm.trim());
      }
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    if (onSearchClear) {
      onSearchClear();
    }
  };

  // Funções de toggle multi-seleção com telemetria atômica
  const toggleCategory = (cat) => {
    const current = filters.categories || [];
    const isSelecting = !current.includes(cat);
    if (isSelecting) {
      analyticsService.trackFilterUse('categoria', cat);
    }
    setFilters(prev => {
      const prevCats = prev.categories || [];
      const updated = prevCats.includes(cat)
        ? prevCats.filter(c => c !== cat)
        : [...prevCats, cat];
      return { ...prev, categories: updated };
    });
  };

  const toggleFit = (fit) => {
    const current = filters.fits || [];
    const isSelecting = !current.includes(fit);
    if (isSelecting) {
      analyticsService.trackFilterUse('modelagem', fit);
    }
    setFilters(prev => {
      const prevFits = prev.fits || [];
      const updated = prevFits.includes(fit)
        ? prevFits.filter(f => f !== fit)
        : [...prevFits, fit];
      return { ...prev, fits: updated };
    });
  };

  const toggleDrop = (drop) => {
    const current = filters.drops || [];
    const isSelecting = !current.includes(drop);
    if (isSelecting) {
      analyticsService.trackFilterUse('drop', drop);
    }
    setFilters(prev => {
      const prevDrops = prev.drops || [];
      const updated = prevDrops.includes(drop)
        ? prevDrops.filter(d => d !== drop)
        : [...prevDrops, drop];
      return { ...prev, drops: updated };
    });
  };

  const toggleSize = (size) => {
    const current = filters.sizes || [];
    const isSelecting = !current.includes(size);
    if (isSelecting) {
      analyticsService.trackFilterUse('tamanho', size);
    }
    setFilters(prev => {
      const prevSizes = prev.sizes || [];
      const updated = prevSizes.includes(size)
        ? prevSizes.filter(s => s !== size)
        : [...prevSizes, size];
      return { ...prev, sizes: updated };
    });
  };

  // Extração Dinâmica de Categorias presentes nos produtos do Firestore
  const availableCategories = useMemo(() => {
    const counts = {};
    (products || []).forEach(p => {
      if (p.type === 'brinde' || p.category === 'brinde' || p.category === 'gift-card') return;
      const cat = (p.category || 'camisa').toLowerCase().trim();
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const CATEGORY_MAP = {
      'camisa': 'CAMISA',
      'jaqueta': 'JAQUETA & HOODIE',
      'calca': 'CALÇA',
      'shorts': 'SHORTS & BERMUDAS',
      'short': 'SHORTS & BERMUDAS',
      'bone': 'BONÉ & ACESSÓRIOS',
      'bones': 'BONÉS & ACESSÓRIOS',
      'moletom': 'MOLETOM & HOODIE',
      'moletons': 'MOLETONS & HOODIES',
      'acessorios': 'ACESSÓRIOS',
      'acessorio': 'ACESSÓRIOS'
    };

    const keys = Object.keys(counts);
    if (keys.length === 0) {
      return [
        { id: 'camisa', label: 'CAMISA' },
        { id: 'calca', label: 'CALÇA' },
        { id: 'jaqueta', label: 'JAQUETA & HOODIE' }
      ];
    }

    return keys.sort().map(catKey => ({
      id: catKey,
      label: CATEGORY_MAP[catKey] || catKey.toUpperCase().replace(/[-_]/g, ' '),
      count: counts[catKey]
    }));
  }, [products]);

  // Extração Dinâmica de Modelagens (Fits) presentes nos produtos do Firestore
  const availableFits = useMemo(() => {
    const counts = {};
    (products || []).forEach(p => {
      if (p.type === 'brinde' || p.category === 'brinde') return;
      const fit = String(p.fit || '').trim().toLowerCase();
      if (!fit || fit === 'único' || fit === 'unico' || fit === 'padrão' || fit === 'padrao') return;
      counts[fit] = (counts[fit] || 0) + 1;
    });

    const FIT_MAP = {
      'boxy': 'BOXY',
      'oversized': 'OVERSIZED',
      'normal': 'NORMAL',
      'regular': 'NORMAL',
      'regata': 'REGATA',
      'slim': 'SLIM',
      'wide_leg': 'WIDE LEG',
      'wide-leg': 'WIDE LEG',
      'cargo': 'CARGO',
      'cropped': 'CROPPED',
      'drop_shoulder': 'DROP SHOULDER',
      'drop-shoulder': 'DROP SHOULDER',
      'street': 'STREET'
    };

    const keys = Object.keys(counts);
    if (keys.length === 0) {
      return [
        { id: 'boxy', label: 'BOXY' },
        { id: 'oversized', label: 'OVERSIZED' },
        { id: 'normal', label: 'NORMAL' },
        { id: 'regata', label: 'REGATA' }
      ];
    }

    return keys.sort().map(fitKey => ({
      id: fitKey,
      label: FIT_MAP[fitKey] || fitKey.toUpperCase().replace(/[-_]/g, ' '),
      count: counts[fitKey]
    }));
  }, [products]);

  // Extração Dinâmica de Drops presentes nos produtos do Firestore
  const availableDrops = useMemo(() => {
    const counts = {};
    (products || []).forEach(p => {
      const drop = (p.drop || 'leak-two').toLowerCase().trim();
      counts[drop] = (counts[drop] || 0) + 1;
    });

    const DROP_MAP = {
      'leak-two': 'LEAK TWO (NOVO)',
      'drop-01': 'DROPS PASSADOS'
    };

    const keys = Object.keys(counts);
    if (keys.length === 0) {
      return [
        { id: 'leak-two', label: 'LEAK TWO (NOVO)' },
        { id: 'drop-01', label: 'DROPS PASSADOS' }
      ];
    }

    return keys.sort().map(dropKey => ({
      id: dropKey,
      label: DROP_MAP[dropKey] || dropKey.toUpperCase().replace(/[-_]/g, ' '),
      count: counts[dropKey]
    }));
  }, [products]);

  const isSearchDirty = searchTerm.trim() !== searchQuery.trim() || (searchTerm.trim() && !searchQuery.trim());

  const selectedCategories = filters.categories || [];
  const selectedFits = filters.fits || [];
  const selectedDrops = filters.drops || [];
  const selectedSizes = filters.sizes || [];

  return (
    <aside className={styles.sidebar} aria-label="Filtros do Catálogo">
      <div className={styles.header}>
        <h3 className={styles.title}>FILTROS</h3>
        <button onClick={onReset} className={styles.clearBtn}>LIMPAR TUDO</button>
      </div>

      {/* Busca Manual com Botão de Ação */}
      <form onSubmit={handleFormSubmit} className={styles.searchSection}>
        <span className={styles.groupLabel}>BUSCAR PEÇA</span>
        <div className={styles.searchInputWrapper}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Ex: Boxy, Hoodie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.sidebarSearchInput}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className={styles.clearSearchBtn}
              aria-label="Limpar busca"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {searchTerm.trim() && (
          <button
            type="submit"
            className={`${styles.btnApplySearch} ${isSearchDirty ? styles.btnApplySearchHighlight : ''}`}
          >
            <span>BUSCAR</span>
            <ArrowRight size={13} />
          </button>
        )}
      </form>

      {/* Categorias (Multi-Seleção Dinâmica) */}
      <div className={styles.filterGroup}>
        <span className={styles.groupLabel}>CATEGORIAS</span>
        <div className={styles.optionsList}>
          {availableCategories.map(({ id, label, count }) => {
            const isSelected = selectedCategories.includes(id);
            return (
              <button
                key={id}
                type="button"
                className={`${styles.optionBtn} ${isSelected ? styles.activeOption : ''}`}
                onClick={() => toggleCategory(id)}
              >
                <span className={`${styles.checkboxBox} ${isSelected ? styles.checkboxActive : ''}`}>
                  {isSelected && <span className={styles.checkboxInner} />}
                </span>
                <span className={styles.optionLabelText}>{label}</span>
                {count !== undefined && <small style={{ marginLeft: 'auto', opacity: 0.5, fontSize: '0.65rem' }}>({count})</small>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Modelagem (Multi-Seleção Dinâmica) */}
      <div className={styles.filterGroup}>
        <span className={styles.groupLabel}>MODELAGEM</span>
        <div className={styles.optionsList}>
          {availableFits.map(({ id, label, count }) => {
            const isSelected = selectedFits.includes(id);
            return (
              <button
                key={id}
                type="button"
                className={`${styles.optionBtn} ${isSelected ? styles.activeOption : ''}`}
                onClick={() => toggleFit(id)}
              >
                <span className={`${styles.checkboxBox} ${isSelected ? styles.checkboxActive : ''}`}>
                  {isSelected && <span className={styles.checkboxInner} />}
                </span>
                <span className={styles.optionLabelText}>{label}</span>
                {count !== undefined && <small style={{ marginLeft: 'auto', opacity: 0.5, fontSize: '0.65rem' }}>({count})</small>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Drops (Multi-Seleção Dinâmica) */}
      <div className={styles.filterGroup}>
        <span className={styles.groupLabel}>DROP</span>
        <div className={styles.optionsList}>
          {availableDrops.map(({ id, label }) => {
            const isSelected = selectedDrops.includes(id);
            return (
              <button
                key={id}
                type="button"
                className={`${styles.optionBtn} ${isSelected ? styles.activeOption : ''}`}
                onClick={() => toggleDrop(id)}
              >
                <span className={`${styles.checkboxBox} ${isSelected ? styles.checkboxActive : ''}`}>
                  {isSelected && <span className={styles.checkboxInner} />}
                </span>
                <span className={styles.optionLabelText}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tamanho Superior (PP - GG) */}
      <div className={styles.filterGroup}>
        <span className={styles.groupLabel}>TAMANHO (VESTUÁRIO)</span>
        <div className={styles.gridSizes}>
          {['PP', 'P', 'M', 'G', 'GG'].map((size) => {
            const isSelected = selectedSizes.includes(size);
            return (
              <button
                key={size}
                type="button"
                className={`${styles.sizeBtn} ${isSelected ? styles.activeSize : ''}`}
                onClick={() => toggleSize(size)}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tamanho Calças (Numeração 38 - 44) */}
      <div className={styles.filterGroup}>
        <span className={styles.groupLabel}>TAMANHO (CALÇAS)</span>
        <div className={styles.gridSizes}>
          {['38', '40', '42', '44'].map((size) => {
            const isSelected = selectedSizes.includes(size);
            return (
              <button
                key={size}
                type="button"
                className={`${styles.sizeBtn} ${isSelected ? styles.activeSize : ''}`}
                onClick={() => toggleSize(size)}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

export default FilterSidebar;
