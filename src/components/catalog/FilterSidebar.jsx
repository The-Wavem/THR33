import React from 'react';
import styles from './FilterSidebar.module.css';

export function FilterSidebar({ 
  availableFilters,
  selectedCategories, 
  onCategoryChange, 
  selectedFits, 
  onFitChange, 
  maxPrice, 
  onPriceChange, 
  selectedSize, 
  onSizeChange,
  onResetFilters 
}) {
  const { categories = [], fits = [], sizes = [], minPrice = 0, maxPriceLimit = 500 } = availableFilters || {};

  return (
    <aside className={styles.sidebarContainer}>
      <div className={styles.sidebarHeader}>
        <h3>PAINEL DE FILTROS</h3>
        <span className={styles.versionBadge}>DYNAMIC v2.0</span>
      </div>

      <div className={styles.divider} />

      {/* 1. CATEGORIAS EXTRAÍDAS DINAMICAMENTE */}
      {categories.length > 0 && (
        <div className={styles.filterGroup}>
          <label className={styles.groupLabel}>CATEGORIAS EM ESTOQUE</label>
          <div className={styles.checkboxList}>
            {categories.map((cat) => (
              <label key={cat.slug} className={styles.checkboxItem}>
                <input 
                  type="checkbox"
                  checked={selectedCategories.includes(cat.slug)}
                  onChange={() => onCategoryChange(cat.slug)}
                />
                <span>{cat.label} ({cat.count})</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className={styles.divider} />

      {/* 2. FIT / CORTE DINÂMICO */}
      {fits.length > 0 && (
        <div className={styles.filterGroup}>
          <label className={styles.groupLabel}>FIT / CORTE DISPONÍVEL</label>
          <div className={styles.fitGrid}>
            {fits.map((fit) => (
              <button
                key={fit}
                onClick={() => onFitChange(fit)}
                className={selectedFits.includes(fit) ? styles.fitBtnActive : styles.fitBtn}
              >
                {fit}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.divider} />

      {/* 3. FAIXA DE PREÇO CALCULADA */}
      <div className={styles.filterGroup}>
        <div className={styles.priceLabelRow}>
          <label className={styles.groupLabel}>FAIXA DE PREÇO</label>
          <strong className={styles.priceVal}>ATÉ R$ {maxPrice}</strong>
        </div>
        <input 
          type="range"
          min={minPrice}
          max={maxPriceLimit}
          step="10"
          value={maxPrice}
          onChange={(e) => onPriceChange(Number(e.target.value))}
          className={styles.priceRangeInput}
        />
        <div className={styles.priceMinMax}>
          <span>R$ {minPrice}</span>
          <span>R$ {maxPriceLimit}</span>
        </div>
      </div>

      <div className={styles.divider} />

      {/* 4. TAMANHOS EXISTENTES */}
      {sizes.length > 0 && (
        <div className={styles.filterGroup}>
          <label className={styles.groupLabel}>TAMANHO DISPONÍVEL</label>
          <div className={styles.sizeGrid}>
            {sizes.map((sz) => (
              <button
                key={sz}
                onClick={() => onSizeChange(sz)}
                className={selectedSize === sz ? styles.sizeBoxActive : styles.sizeBox}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.divider} />

      <div className={styles.actionBlock}>
        <button onClick={onResetFilters} className={styles.btnReset}>
          [ LIMPAR FILTROS ]
        </button>
      </div>
    </aside>
  );
}

export default FilterSidebar;
