import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { analyticsService } from '../../services/analyticsService';
import { extractAvailableFits, normalizeFitSlug } from '../../utils/fitUtils';
import styles from './FilterSidebar.module.css';

export function FilterSidebar({
  products = [],
  filters = {},
  setFilters,
  sortOrder = 'newest',
  onSortChange,
  onReset,
  searchQuery = '',
  onSearchSubmit,
  onSearchClear,
  isOpen = false,
  isMobileOpen = false,
  onClose,
  onCloseMobile,
  totalResults
}) {
  const [searchTerm, setSearchTerm] = useState(searchQuery);

  const drawerOpen = Boolean(isOpen || isMobileOpen);
  const handleClose = onClose || onCloseMobile;

  // Modelagens dinâmicas computadas a partir do catálogo e CMS
  const availableFits = useMemo(() => {
    return extractAvailableFits(products);
  }, [products]);

  // Bloqueio de scroll do body e atalho ESC quando a gaveta estiver aberta (Desktop & Mobile)
  useEffect(() => {
    if (!drawerOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && handleClose) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [drawerOpen, handleClose]);

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
    if (onSearchClear) onSearchClear();
  };

  const toggleFit = (fitId) => {
    const current = filters.fits || [];
    const isAlreadySelected = current.some(
      (f) => normalizeFitSlug(f) === fitId || f === fitId
    );
    if (!isAlreadySelected) {
      analyticsService.trackFilterUse('modelagem', fitId);
    }

    setFilters((prev) => {
      const prevFits = prev.fits || [];
      const updated = isAlreadySelected
        ? prevFits.filter((f) => normalizeFitSlug(f) !== fitId && f !== fitId)
        : [...prevFits, fitId];
      return { ...prev, fits: updated };
    });
  };

  const toggleSize = (size) => {
    const current = filters.sizes || [];
    const isSelecting = !current.includes(size);
    if (isSelecting) analyticsService.trackFilterUse('tamanho', size);

    setFilters((prev) => {
      const prevSizes = prev.sizes || [];
      const updated = prevSizes.includes(size)
        ? prevSizes.filter((s) => s !== size)
        : [...prevSizes, size];
      return { ...prev, sizes: updated };
    });
  };

  const selectedFits = filters.fits || [];
  const selectedSizes = filters.sizes || [];
  const activeCount =
    selectedFits.length +
    selectedSizes.length +
    (searchQuery.trim() ? 1 : 0) +
    (sortOrder !== 'newest' ? 1 : 0);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`${styles.drawerRoot} ${drawerOpen ? styles.drawerRootOpen : ''}`}
      aria-hidden={!drawerOpen}
    >
      {/* BACKDROP ESCURO COM BLUR */}
      <div
        className={`${styles.backdrop} ${drawerOpen ? styles.backdropOpen : ''}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* GAVETA LATERAL ESQUERDA (DESKTOP & MOBILE) */}
      <aside
        className={`${styles.drawer} ${drawerOpen ? styles.open : ''}`}
        aria-label="Filtros e Ordenação do Catálogo"
      >
        <div className={styles.drawerHeader}>
          <div className={styles.drawerTitleRow}>
            <SlidersHorizontal size={16} />
            <h3 className={styles.drawerTitle}>FILTRAR & ORDENAR</h3>
            {activeCount > 0 && (
              <span className={styles.drawerActiveBadge}>{activeCount}</span>
            )}
          </div>
          <button
            type="button"
            className={styles.drawerCloseBtn}
            onClick={handleClose}
            aria-label="Fechar gaveta de filtros"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.drawerBody}>
          {/* 1. ORDENAÇÃO UNIFICADA */}
          <div className={styles.filterGroup}>
            <span className={styles.groupLabel}>ORDENAR POR</span>
            <div className={styles.sortOptionsList}>
              {[
                { id: 'newest', label: 'LANÇAMENTOS RECENTES' },
                { id: 'price-low', label: 'MENOR PREÇO' },
                { id: 'price-high', label: 'MAIOR PREÇO' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`${styles.optionBtn} ${
                    sortOrder === opt.id ? styles.activeOption : ''
                  }`}
                  onClick={() => onSortChange && onSortChange(opt.id)}
                >
                  <span
                    className={`${styles.radioBox} ${
                      sortOrder === opt.id ? styles.radioActive : ''
                    }`}
                  >
                    {sortOrder === opt.id && <span className={styles.radioInner} />}
                  </span>
                  <span className={styles.optionLabelText}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. BUSCA DE PEÇA */}
          <form onSubmit={handleFormSubmit} className={styles.searchSection}>
            <span className={styles.groupLabel}>BUSCAR PEÇA</span>
            <div className={styles.searchInputWrapper}>
              <Search className={styles.searchIcon} size={15} />
              <input
                type="text"
                placeholder="Ex: Boxy, Heavy, Preto..."
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
          </form>

          {/* 3. MODELAGEM (DINÂMICA CONFORME ITENS DO CMS/CATÁLOGO) */}
          <div className={styles.filterGroup}>
            <span className={styles.groupLabel}>MODELAGEM OFICIAL</span>
            <div className={styles.optionsList}>
              {availableFits.map((fit) => {
                const isSelected = selectedFits.some(
                  (f) => normalizeFitSlug(f) === fit.id || f === fit.id
                );
                return (
                  <button
                    key={fit.id}
                    type="button"
                    className={`${styles.optionBtn} ${
                      isSelected ? styles.activeOption : ''
                    }`}
                    onClick={() => toggleFit(fit.id)}
                  >
                    <span
                      className={`${styles.checkboxBox} ${
                        isSelected ? styles.checkboxActive : ''
                      }`}
                    >
                      {isSelected && <span className={styles.checkboxInner} />}
                    </span>
                    <span className={styles.optionLabelText}>{fit.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. GRADE DE TAMANHOS DE VESTUÁRIO (PP AO GG) */}
          <div className={styles.filterGroup}>
            <span className={styles.groupLabel}>TAMANHO</span>
            <div className={styles.gridSizes}>
              {['PP', 'P', 'M', 'G', 'GG'].map((size) => {
                const isSelected = selectedSizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    className={`${styles.sizeBtn} ${
                      isSelected ? styles.activeSize : ''
                    }`}
                    onClick={() => toggleSize(size)}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className={styles.drawerStickyFooter}>
          <button
            type="button"
            className={styles.drawerResetBtn}
            onClick={onReset}
          >
            LIMPAR TUDO
          </button>
          <button
            type="button"
            className={styles.drawerApplyBtn}
            onClick={handleClose}
          >
            VER PEÇAS {totalResults !== undefined ? `(${totalResults})` : ''}
          </button>
        </div>
      </aside>
    </div>,
    document.body
  );
}

export default FilterSidebar;
