import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import FilterSidebar from '../../components/catalog/FilterSidebar';
import ProductCard from '../../components/catalog/ProductCard';
import { PRODUCTS_DATA } from '../../data/productsData';
import styles from './Catalogo.module.css';

export function Catalogo() {
  const [searchParams] = useSearchParams();
  const { categorySlug } = useParams();

  const [filters, setFilters] = useState({
    category: categorySlug || searchParams.get('categoria') || '',
    fit: searchParams.get('modelagem') || searchParams.get('fit') || '',
    drop: searchParams.get('drop') || '',
    size: searchParams.get('tamanho') || searchParams.get('size') || ''
  });

  const [sortOrder, setSortOrder] = useState('newest');

  useEffect(() => {
    const cat = categorySlug || searchParams.get('categoria') || '';
    const fit = searchParams.get('modelagem') || searchParams.get('fit') || '';
    const drop = searchParams.get('drop') || '';
    const size = searchParams.get('tamanho') || searchParams.get('size') || '';

    if (cat || fit || drop || size) {
      setFilters(prev => ({
        ...prev,
        ...(cat && { category: cat }),
        ...(fit && { fit }),
        ...(drop && { drop }),
        ...(size && { size })
      }));
    }
  }, [categorySlug, searchParams]);

  const handleReset = () => {
    setFilters({ category: '', fit: '', drop: '', size: '' });
    setSortOrder('newest');
  };

  // Lógica de Filtragem e Ordenação
  const filteredProducts = useMemo(() => {
    return PRODUCTS_DATA.filter((product) => {
      if (filters.category && product.category.toLowerCase() !== filters.category.toLowerCase()) return false;
      if (filters.fit && product.fit.toLowerCase() !== filters.fit.toLowerCase()) return false;
      if (filters.drop && product.drop.toLowerCase() !== filters.drop.toLowerCase()) return false;
      if (filters.size && !product.sizes.includes(filters.size)) return false;
      return true;
    }).sort((a, b) => {
      if (sortOrder === 'price-low') return a.price - b.price;
      if (sortOrder === 'price-high') return b.price - a.price;
      return (b.isRelease ? 1 : 0) - (a.isRelease ? 1 : 0); // newest
    });
  }, [filters, sortOrder]);

  return (
    <main className={styles.catalogPage}>
      <header className={styles.header}>
        <div>
          <span className={styles.breadcrumb}>HOME / CATÁLOGO</span>
          <h1 className={styles.title}>VESTUÁRIO & CONCEITO</h1>
        </div>

        {/* Ordenação */}
        <div className={styles.sortWrapper}>
          <label htmlFor="sortSelect" className={styles.sortLabel}>ORDENAR POR:</label>
          <select 
            id="sortSelect" 
            className={styles.sortSelect}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="newest">LANÇAMENTOS</option>
            <option value="price-low">MENOR PREÇO</option>
            <option value="price-high">MAIOR PREÇO</option>
          </select>
        </div>
      </header>

      <div className={styles.contentLayout}>
        <FilterSidebar filters={filters} onReset={handleReset} setFilters={setFilters} />

        <section className={styles.productsArea}>
          <div className={styles.resultsCount}>
            {filteredProducts.length} PRODUTO(S) ENCONTRADO(S)
          </div>

          {filteredProducts.length > 0 ? (
            <div className={styles.grid}>
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p>Nenhum produto encontrado para os filtros selecionados.</p>
              <button onClick={handleReset} className={styles.resetBtn}>LIMPAR FILTROS</button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default Catalogo;
