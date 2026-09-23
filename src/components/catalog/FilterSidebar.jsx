import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { analyticsService } from '../../services/analyticsService';
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
  isMobileOpen = false,
  onCloseMobile,
  totalResults
}) {
  const [searchTerm, setSearchTerm] = useState(searchQuery);

  // Bloqueio de scroll do body quando o drawer mobile estiver aberto
  useEffect(() => {
    if (isMobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isMobileOpen]);

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

  const toggleFit = (fit) => {
    const current = filters.fits || [];
    const isSelecting = !current.includes(fit);
    if (isSelecting) analyticsService.trackFilterUse('modelagem', fit);

    setFilters(prev => {
      const prevFits = prev.fits || [];
      const updated = prevFits.includes(fit)
        ? prevFits.filter(f => f !== fit)
        : [...prevFits, fit];
      return { ...prev, fits: updated };
    });
  };

  const toggleSize = (size) => {
    const current = filters.sizes || [];
    const isSelecting = !current.includes(size);
    if (isSelecting) analyticsService.trackFilterUse('tamanho', size);

    setFilters(prev => {
      const prevSizes = prev.sizes || [];
      const updated = prevSizes.includes(size)
        ? prevSizes.filter(s => s !== size)
        : [...prevSizes, size];
      return { ...prev, sizes: updated };
    });
  };

  const selectedFits = filters.fits || [];
  const selectedSizes = filters.sizes || [];
  const activeCount = selectedFits.length + selectedSizes.length + (searchQuery.trim() ? 1 : 0) + (sortOrder !== 'newest' ? 1 : 0);

  const renderFiltersBody = () => (
    <>
      {/* 1. ORDENAÇÃO UNIFICADA DENTRO DOS FILTROS */}
      <div className={styles.filterGroup}>
        <span className={styles.groupLabel}>ORDENAR POR</span>
        <div className={styles.sortOptionsList}>
          {[
            { id: 'newest', label: 'LANÇAMENTOS RECENTES' },
            { id: 'price-low', label: 'MENOR PREÇO' },
            { id: 'price-high', label: 'MAIOR PREÇO' }
          ].map(opt => (
            <button
              key={opt.id}
              type="button"
              className={`${styles.optionBtn} ${sortOrder === opt.id ? styles.activeOption : ''}`}
              onClick={() => onSortChange && onSortChange(opt.id)}
            >
              <span className={`${styles.radioBox} ${sortOrder === opt.id ? styles.radioActive : ''}`}>
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
            <button type="button" onClick={handleClear} className={styles.clearSearchBtn} aria-label="Limpar busca">
              <X size={14} />
            </button>
          )}
        </div>
      </form>

      {/* 3. MODELAGEM (EXCLUSIVAS DE CAMISETAS CONFORME PLANILHA) */}
      <div className={styles.filterGroup}>
        <span className={styles.groupLabel}>MODELAGEM OFICIAL</span>
        <div className={styles.optionsList}>
          {[
            { id: 'boxy', label: 'BOXY FIT' },
            { id: 'oversized', label: 'OVERSIZED (HEAVY & CLÁSSICA)' }
          ].map(fit => {
            const isSelected = selectedFits.includes(fit.id);
            return (
              <button
                key={fit.id}
                type="button"
                className={`${styles.optionBtn} ${isSelected ? styles.activeOption : ''}`}
                onClick={() => toggleFit(fit.id)}
              >
                <span className={`${styles.checkboxBox} ${isSelected ? styles.checkboxActive : ''}`}>
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
                className={`${styles.sizeBtn} ${isSelected ? styles.activeSize : ''}`}
                onClick={() => toggleSize(size)}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      {/* BOTAO PARA FECHAR DRAWER NO MOBILE CASO NÃO USE STICKY FOOTER */}
      {onCloseMobile && !isMobileOpen && (
        <button type="button" onClick={onCloseMobile} className={styles.mobileApplyBtn}>
          VER RESULTADOS
        </button>
      )}
    </>
  );

  return (
    <>
      {/* SIDEBAR TRADICIONAL PARA DESKTOP */}
      <aside className={styles.sidebar} aria-label="Filtros do Catálogo">
        <div className={styles.header}>
          <h3 className={styles.title}>FILTROS</h3>
          <button onClick={onReset} className={styles.clearBtn}>LIMPAR TUDO</button>
        </div>
        {renderFiltersBody()}
      </aside>

      {/* DRAWER / BOTTOM SHEET PARA MOBILE (PORTAL DIRETAMENTE NO BODY) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isMobileOpen && (
            <div className={styles.mobileDrawerWrapper}>
              <motion.div 
                className={styles.backdrop}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onCloseMobile}
                aria-hidden="true"
              />

              <motion.div 
                className={styles.mobileDrawer}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                aria-label="Filtros Móveis"
              >
                <div className={styles.drawerHeader}>
                  <div className={styles.drawerTitleRow}>
                    <SlidersHorizontal size={16} />
                    <h3 className={styles.drawerTitle}>FILTROS</h3>
                    {activeCount > 0 && (
                      <span className={styles.drawerActiveBadge}>{activeCount} ativos</span>
                    )}
                  </div>
                  <button 
                    type="button" 
                    className={styles.drawerCloseBtn}
                    onClick={onCloseMobile}
                    aria-label="Fechar filtros"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className={styles.drawerBody}>
                  {renderFiltersBody()}
                </div>

                <div className={styles.drawerStickyFooter}>
                  <button 
                    type="button" 
                    className={styles.drawerResetBtn}
                    onClick={onReset}
                  >
                    LIMPAR FILTROS
                  </button>
                  <button 
                    type="button" 
                    className={styles.drawerApplyBtn}
                    onClick={onCloseMobile}
                  >
                    VER RESULTADOS {totalResults !== undefined ? `(${totalResults})` : ''}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

export default FilterSidebar;
