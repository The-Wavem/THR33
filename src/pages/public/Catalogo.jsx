import React, { useState, useMemo } from 'react';
import { productsData } from '../../data/productsData';
import { ProductCard } from '../../components/catalog/ProductCard';
import { FilterSidebar } from '../../components/catalog/FilterSidebar';
import styles from './Catalogo.module.css';

export function Catalogo({ defaultCategory = null, onAddToCart }) {
  const [selectedCategories, setSelectedCategories] = useState(
    defaultCategory ? [defaultCategory] : []
  );
  const [selectedFits, setSelectedFits] = useState([]);
  const [maxPrice, setMaxPrice] = useState(500);
  const [selectedSize, setSelectedSize] = useState(null);
  const [sortBy, setSortBy] = useState('destaques');
  const [wishlist, setWishlist] = useState([]);

  // TOGGLE FILTERS
  const handleCategoryChange = (catId) => {
    setSelectedCategories(prev => 
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  };

  const handleFitChange = (fit) => {
    setSelectedFits(prev => 
      prev.includes(fit) ? prev.filter(f => f !== fit) : [...prev, fit]
    );
  };

  const handleSizeChange = (sz) => {
    setSelectedSize(prev => prev === sz ? null : sz);
  };

  const handleToggleWishlist = (id) => {
    setWishlist(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleResetFilters = () => {
    setSelectedCategories([]);
    setSelectedFits([]);
    setMaxPrice(500);
    setSelectedSize(null);
  };

  // FILTER & SORT ENGINE
  const filteredProducts = useMemo(() => {
    return productsData.filter(item => {
      // Category Filter
      if (selectedCategories.length > 0) {
        if (!selectedCategories.includes(item.category)) return false;
      }
      // Fit Filter
      if (selectedFits.length > 0) {
        if (!selectedFits.includes(item.fit)) return false;
      }
      // Price Filter
      if (item.priceNum > maxPrice) return false;
      // Size Filter
      if (selectedSize) {
        if (!item.sizes.includes(selectedSize)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'menor-preco') return a.priceNum - b.priceNum;
      if (sortBy === 'maior-preco') return b.priceNum - a.priceNum;
      return 0; // Destaques / Padrão
    });
  }, [selectedCategories, selectedFits, maxPrice, selectedSize, sortBy]);

  return (
    <div className={styles.catalogPage}>
      <div className={styles.container}>
        {/* BREADCRUMB & SORT BAR */}
        <div className={styles.topControlBar}>
          <div className={styles.breadcrumb}>
            HOME / CATÁLOGO / <strong>[{filteredProducts.length} PEÇAS ENCONTRADAS]</strong>
          </div>

          <div className={styles.sortWrapper}>
            <label>ORDENAR POR:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className={styles.sortSelect}
            >
              <option value="destaques">DESTAQUES</option>
              <option value="menor-preco">MENOR PREÇO</option>
              <option value="maior-preco">MAIOR PREÇO</option>
            </select>
          </div>
        </div>

        {/* MAIN LAYOUT: SIDEBAR + GRID */}
        <div className={styles.mainGrid}>
          <div className={styles.sidebarCol}>
            <FilterSidebar 
              selectedCategories={selectedCategories}
              onCategoryChange={handleCategoryChange}
              selectedFits={selectedFits}
              onFitChange={handleFitChange}
              maxPrice={maxPrice}
              onPriceChange={setMaxPrice}
              selectedSize={selectedSize}
              onSizeChange={handleSizeChange}
              onResetFilters={handleResetFilters}
            />
          </div>

          <div className={styles.gridCol}>
            {filteredProducts.length > 0 ? (
              <div className={styles.productsGrid}>
                {filteredProducts.map(product => (
                  <ProductCard 
                    key={product.id}
                    product={product}
                    onAddToCart={onAddToCart}
                    onToggleWishlist={handleToggleWishlist}
                    isWishlisted={wishlist.includes(product.id)}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <h3>NENHUMA PEÇA ENCONTRADA COM ESSES FILTROS</h3>
                <p>Tente redefinir a faixa de preço ou limpar as categorias selecionadas.</p>
                <button onClick={handleResetFilters} className={styles.btnResetState}>
                  LIMPAR FILTROS
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Catalogo;
