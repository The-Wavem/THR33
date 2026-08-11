import React, { useState, useEffect } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import styles from './FilterSidebar.module.css';

export function FilterSidebar({ 
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
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    if (onSearchClear) {
      onSearchClear();
    }
  };

  // Funções de toggle multi-seleção
  const toggleCategory = (cat) => {
    setFilters(prev => {
      const current = prev.categories || [];
      const updated = current.includes(cat)
        ? current.filter(c => c !== cat)
        : [...current, cat];
      return { ...prev, categories: updated };
    });
  };

  const toggleFit = (fit) => {
    setFilters(prev => {
      const current = prev.fits || [];
      const updated = current.includes(fit)
        ? current.filter(f => f !== fit)
        : [...current, fit];
      return { ...prev, fits: updated };
    });
  };

  const toggleDrop = (drop) => {
    setFilters(prev => {
      const current = prev.drops || [];
      const updated = current.includes(drop)
        ? current.filter(d => d !== drop)
        : [...current, drop];
      return { ...prev, drops: updated };
    });
  };

  const toggleSize = (size) => {
    setFilters(prev => {
      const current = prev.sizes || [];
      const updated = current.includes(size)
        ? current.filter(s => s !== size)
        : [...current, size];
      return { ...prev, sizes: updated };
    });
  };

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

      {/* Categorias (Multi-Seleção) */}
      <div className={styles.filterGroup}>
        <span className={styles.groupLabel}>CATEGORIAS</span>
        <div className={styles.optionsList}>
          {[
            { id: 'camisa', label: 'CAMISA' },
            { id: 'calca', label: 'CALÇA' },
            { id: 'jaqueta', label: 'JAQUETA & HOODIE' }
          ].map(({ id, label }) => {
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
              </button>
            );
          })}
        </div>
      </div>

      {/* Modelagem (Multi-Seleção) */}
      <div className={styles.filterGroup}>
        <span className={styles.groupLabel}>MODELAGEM</span>
        <div className={styles.optionsList}>
          {[
            { id: 'boxy', label: 'BOXY' },
            { id: 'oversized', label: 'OVERSIZED' },
            { id: 'normal', label: 'NORMAL' },
            { id: 'regata', label: 'REGATA' }
          ].map(({ id, label }) => {
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
              </button>
            );
          })}
        </div>
      </div>

      {/* Drops (Multi-Seleção) */}
      <div className={styles.filterGroup}>
        <span className={styles.groupLabel}>DROP</span>
        <div className={styles.optionsList}>
          {[
            { id: 'leak-two', label: 'LEAK TWO (NOVO)' },
            { id: 'drop-01', label: 'DROPS PASSADOS' }
          ].map(({ id, label }) => {
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
