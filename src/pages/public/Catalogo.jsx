import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { catalogService } from '../../services/catalogService';
import { ProductCard } from '../../components/catalog/ProductCard';
import { FilterSidebar } from '../../components/catalog/FilterSidebar';
import styles from './Catalogo.module.css';

export function Catalogo({ onAddToCart }) {
  const { categorySlug } = useParams();
  const navigate = useNavigate();

  // Buscar meta-dados dinâmicos do banco/serviço
  const metadata = useMemo(() => catalogService.getDynamicMetadata(), []);

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedFits, setSelectedFits] = useState([]);
  const [maxPrice, setMaxPrice] = useState(metadata.maxPrice);
  const [selectedSize, setSelectedSize] = useState(null);
  const [sortBy, setSortBy] = useState('destaques');
  const [wishlist, setWishlist] = useState([]);

  // Sincronizar parâmetro da URL com o estado de categorias
  useEffect(() => {
    if (categorySlug && categorySlug !== 'todos') {
      setSelectedCategories([categorySlug.toLowerCase()]);
    } else {
      setSelectedCategories([]);
    }
  }, [categorySlug]);

  const allProducts = useMemo(() => catalogService.getAllProducts(), []);

  // TOGGLES
  const handleCategoryChange = (catSlug) => {
    setSelectedCategories(prev => {
      const next = prev.includes(catSlug) ? prev.filter(c => c !== catSlug) : [...prev, catSlug];
      if (next.length === 1) {
        navigate(`/categoria/${next[0]}`);
      } else {
        navigate('/catalogo');
      }
      return next;
    });
  };

  const handleFitChange = (fit) => {
    setSelectedFits(prev => prev.includes(fit) ? prev.filter(f => f !== fit) : [...prev, fit]);
  };

  const handleSizeChange = (sz) => {
    setSelectedSize(prev => prev === sz ? null : sz);
  };

  const handleToggleWishlist = (id) => {
    setWishlist(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleResetFilters = () => {
    setSelectedCategories([]);
    setSelectedFits([]);
    setMaxPrice(metadata.maxPrice);
    setSelectedSize(null);
    navigate('/catalogo');
  };

  // MOTOR DE FILTRAGEM DINÂMICO
  const filteredProducts = useMemo(() => {
    return allProducts.filter(item => {
      if (selectedCategories.length > 0 && !selectedCategories.includes(item.category.toLowerCase())) {
        return false;
      }
      if (selectedFits.length > 0 && !selectedFits.includes(item.fit)) {
        return false;
      }
      if (item.priceNum > maxPrice) {
        return false;
      }
      if (selectedSize && !item.sizes.includes(selectedSize)) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'menor-preco') return a.priceNum - b.priceNum;
      if (sortBy === 'maior-preco') return b.priceNum - a.priceNum;
      return 0;
    });
  }, [allProducts, selectedCategories, selectedFits, maxPrice, selectedSize, sortBy]);

  return (
    <div className={styles.catalogPage}>
      <div className={styles.container}>
        
        {/* BREADCRUMB DINÂMICO */}
        <div className={styles.topControlBar}>
          <div className={styles.breadcrumb}>
            HOME / {categorySlug ? categorySlug.toUpperCase() : 'CATÁLOGO GERAL'} / 
            <strong> [{filteredProducts.length} PEÇAS ENCONTRADAS]</strong>
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

        {/* MAIN LAYOUT */}
        <div className={styles.mainGrid}>
          <div className={styles.sidebarCol}>
            <FilterSidebar 
              availableFilters={{
                categories: metadata.categories,
                fits: metadata.fits,
                sizes: metadata.sizes,
                minPrice: metadata.minPrice,
                maxPriceLimit: metadata.maxPrice
              }}
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
                <p>O catálogo ajustou dinamicamente as opções para o estoque ativo.</p>
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
