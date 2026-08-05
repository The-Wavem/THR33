import React from 'react';
import styles from './FilterSidebar.module.css';

export function FilterSidebar({ 
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
  const categoriesList = [
    { id: 't-shirts', label: 'T-Shirts' },
    { id: 'moletons', label: 'Moletons' },
    { id: 'calcas', label: 'Calças' },
    { id: 'jaquetas', label: 'Jaquetas' },
    { id: 'drops-passados', label: 'Drops Passados' }
  ];

  const fitsList = ['BOXY', 'OVERSIZED', 'HEAVYWEIGHT', 'BAGGY'];
  const sizesList = ['P', 'M', 'G', 'GG'];

  return (
    <aside className={styles.sidebarContainer}>
      <div className={styles.sidebarHeader}>
        <h3>PAINEL DE FILTROS</h3>
        <span className={styles.versionBadge}>v2.026</span>
      </div>

      <div className={styles.divider} />

      {/* 1. CATEGORIA */}
      <div className={styles.filterGroup}>
        <label className={styles.groupLabel}>CATEGORIA</label>
        <div className={styles.checkboxList}>
          {categoriesList.map((cat) => (
            <label key={cat.id} className={styles.checkboxItem}>
              <input 
                type="checkbox"
                checked={selectedCategories.includes(cat.id)}
                onChange={() => onCategoryChange(cat.id)}
              />
              <span>{cat.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.divider} />

      {/* 2. FIT / CORTE */}
      <div className={styles.filterGroup}>
        <label className={styles.groupLabel}>FIT / CORTE</label>
        <div className={styles.fitGrid}>
          {fitsList.map((fit) => (
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

      <div className={styles.divider} />

      {/* 3. FAIXA DE PREÇO */}
      <div className={styles.filterGroup}>
        <div className={styles.priceLabelRow}>
          <label className={styles.groupLabel}>FAIXA DE PREÇO</label>
          <strong className={styles.priceVal}>ATÉ R$ {maxPrice}</strong>
        </div>
        <input 
          type="range"
          min="100"
          max="500"
          step="10"
          value={maxPrice}
          onChange={(e) => onPriceChange(Number(e.target.value))}
          className={styles.priceRangeInput}
        />
        <div className={styles.priceMinMax}>
          <span>R$ 100</span>
          <span>R$ 500</span>
        </div>
      </div>

      <div className={styles.divider} />

      {/* 4. TAMANHO */}
      <div className={styles.filterGroup}>
        <label className={styles.groupLabel}>TAMANHO</label>
        <div className={styles.sizeGrid}>
          {sizesList.map((sz) => (
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

      <div className={styles.divider} />

      {/* BOTOES DE ACAO */}
      <div className={styles.actionBlock}>
        <button onClick={onResetFilters} className={styles.btnReset}>
          [ LIMPAR FILTROS ]
        </button>
      </div>
    </aside>
  );
}
