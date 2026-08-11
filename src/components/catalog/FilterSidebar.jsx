import React from 'react';
import styles from './FilterSidebar.module.css';

export function FilterSidebar({ filters, setFilters, onReset }) {
  const handleCategoryChange = (cat) => {
    setFilters(prev => ({ ...prev, category: prev.category === cat ? '' : cat }));
  };

  const handleFitChange = (fit) => {
    setFilters(prev => ({ ...prev, fit: prev.fit === fit ? '' : fit }));
  };

  const handleDropChange = (drop) => {
    setFilters(prev => ({ ...prev, drop: prev.drop === drop ? '' : drop }));
  };

  const handleSizeChange = (size) => {
    setFilters(prev => ({ ...prev, size: prev.size === size ? '' : size }));
  };

  return (
    <aside className={styles.sidebar} aria-label="Filtros do Catálogo">
      <div className={styles.header}>
        <h3 className={styles.title}>FILTROS</h3>
        <button onClick={onReset} className={styles.clearBtn}>LIMPAR TUDO</button>
      </div>

      {/* Categoria */}
      <div className={styles.filterGroup}>
        <span className={styles.groupLabel}>CATEGORIAS</span>
        <div className={styles.optionsList}>
          {['camisa', 'calca', 'jaqueta'].map((cat) => (
            <button
              key={cat}
              className={`${styles.optionBtn} ${filters.category === cat ? styles.activeOption : ''}`}
              onClick={() => handleCategoryChange(cat)}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Modelagem */}
      <div className={styles.filterGroup}>
        <span className={styles.groupLabel}>MODELAGEM</span>
        <div className={styles.optionsList}>
          {['boxy', 'oversized', 'normal', 'regata'].map((fit) => (
            <button
              key={fit}
              className={`${styles.optionBtn} ${filters.fit === fit ? styles.activeOption : ''}`}
              onClick={() => handleFitChange(fit)}
            >
              {fit.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Drops */}
      <div className={styles.filterGroup}>
        <span className={styles.groupLabel}>DROP</span>
        <div className={styles.optionsList}>
          <button
            className={`${styles.optionBtn} ${filters.drop === 'leak-two' ? styles.activeOption : ''}`}
            onClick={() => handleDropChange('leak-two')}
          >
            LEAK TWO (NOVO)
          </button>
          <button
            className={`${styles.optionBtn} ${filters.drop === 'drop-01' ? styles.activeOption : ''}`}
            onClick={() => handleDropChange('drop-01')}
          >
            DROPS PASSADOS
          </button>
        </div>
      </div>

      {/* Tamanho */}
      <div className={styles.filterGroup}>
        <span className={styles.groupLabel}>TAMANHO</span>
        <div className={styles.gridSizes}>
          {['PP', 'P', 'M', 'G', 'GG'].map((size) => (
            <button
              key={size}
              className={`${styles.sizeBtn} ${filters.size === size ? styles.activeSize : ''}`}
              onClick={() => handleSizeChange(size)}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default FilterSidebar;
