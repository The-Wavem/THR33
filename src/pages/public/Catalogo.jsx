import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { Search, X, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import FilterSidebar from '../../components/catalog/FilterSidebar';
import ProductCard from '../../components/catalog/ProductCard';
import { PRODUCTS_DATA } from '../../data/productsData';
import styles from './Catalogo.module.css';

export function Catalogo() {
  const [searchParams] = useSearchParams();
  const { categorySlug } = useParams();
  const topRef = useRef(null);

  // Estados de Filtros e Busca
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [filters, setFilters] = useState({
    category: categorySlug || searchParams.get('categoria') || '',
    fit: searchParams.get('modelagem') || searchParams.get('fit') || '',
    drop: searchParams.get('drop') || '',
    size: searchParams.get('tamanho') || searchParams.get('size') || ''
  });

  const [sortOrder, setSortOrder] = useState('newest');
  
  // Estados de Paginação & Itens por Página (Escalabilidade)
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [currentPage, setCurrentPage] = useState(1);

  // Toggle do menu de filtros no mobile
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Sincronização inicial com URL
  useEffect(() => {
    const cat = categorySlug || searchParams.get('categoria') || '';
    const fit = searchParams.get('modelagem') || searchParams.get('fit') || '';
    const drop = searchParams.get('drop') || '';
    const size = searchParams.get('tamanho') || searchParams.get('size') || '';
    const query = searchParams.get('search') || '';

    if (cat || fit || drop || size || query) {
      setFilters(prev => ({
        ...prev,
        ...(cat && { category: cat }),
        ...(fit && { fit }),
        ...(drop && { drop }),
        ...(size && { size })
      }));
      if (query) setSearchQuery(query);
    }
  }, [categorySlug, searchParams]);

  // Sempre que os filtros ou busca mudarem, volta para a página 1
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchQuery, itemsPerPage, sortOrder]);

  const handleReset = () => {
    setFilters({ category: '', fit: '', drop: '', size: '' });
    setSearchQuery('');
    setSortOrder('newest');
    setCurrentPage(1);
  };

  const removeFilter = (filterKey) => {
    setFilters(prev => ({ ...prev, [filterKey]: '' }));
  };

  // Motor de Filtragem e Ordenação
  const filteredProducts = useMemo(() => {
    return PRODUCTS_DATA.filter((product) => {
      // Busca textual
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = product.name?.toLowerCase().includes(q);
        const matchDesc = product.description?.toLowerCase().includes(q);
        const matchTag = product.tag?.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchTag) return false;
      }
      // Filtros de atributos
      if (filters.category && product.category.toLowerCase() !== filters.category.toLowerCase()) return false;
      if (filters.fit && product.fit.toLowerCase() !== filters.fit.toLowerCase()) return false;
      if (filters.drop && product.drop.toLowerCase() !== filters.drop.toLowerCase()) return false;
      if (filters.size && !product.sizes.includes(filters.size)) return false;
      return true;
    }).sort((a, b) => {
      if (sortOrder === 'price-low') return a.price - b.price;
      if (sortOrder === 'price-high') return b.price - a.price;
      return (b.isRelease ? 1 : 0) - (a.isRelease ? 1 : 0); // Lançamentos primeiro
    });
  }, [filters, searchQuery, sortOrder]);

  // Cálculo de Paginação
  const totalItems = filteredProducts.length;
  const isAll = itemsPerPage === 999;
  const effectivePerPage = isAll ? Math.max(1, totalItems) : itemsPerPage;
  const totalPages = Math.ceil(totalItems / effectivePerPage) || 1;

  // Ajuste se a página atual ultrapassar o total
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * effectivePerPage;
  const endIndex = Math.min(startIndex + effectivePerPage, totalItems);
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
      // Rolagem suave para o topo da lista de produtos
      if (topRef.current) {
        topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Contagem de filtros ativos
  const activeFiltersCount = Object.values(filters).filter(Boolean).length + (searchQuery.trim() ? 1 : 0);

  return (
    <main className={styles.catalogPage} ref={topRef}>
      {/* HEADER DA PÁGINA */}
      <header className={styles.header}>
        <div>
          <span className={styles.breadcrumb}>HOME / CATÁLOGO</span>
          <h1 className={styles.title}>VESTUÁRIO & CONCEITO</h1>
        </div>

        {/* BARRA DE PESQUISA & CONTROLES */}
        <div className={styles.topActions}>
          <div className={styles.searchBox}>
            <Search size={16} className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Buscar peça ou conceito..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')} 
                className={styles.clearSearchBtn}
                aria-label="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className={styles.controlGroup}>
            {/* ITENS POR PÁGINA */}
            <div className={styles.selectWrapper}>
              <label htmlFor="perPageSelect" className={styles.controlLabel}>EXIBIR:</label>
              <select
                id="perPageSelect"
                className={styles.selectInput}
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
              >
                <option value={6}>6 ITENS</option>
                <option value={12}>12 ITENS</option>
                <option value={24}>24 ITENS</option>
                <option value={999}>TODOS</option>
              </select>
            </div>

            {/* ORDENAÇÃO */}
            <div className={styles.selectWrapper}>
              <label htmlFor="sortSelect" className={styles.controlLabel}>ORDENAR:</label>
              <select 
                id="sortSelect" 
                className={styles.selectInput}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="newest">LANÇAMENTOS</option>
                <option value="price-low">MENOR PREÇO</option>
                <option value="price-high">MAIOR PREÇO</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* BOTÃO MOBILE PARA TOGGLE DE FILTROS */}
      <div className={styles.mobileFilterBar}>
        <button 
          onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)} 
          className={styles.mobileFilterToggle}
        >
          <SlidersHorizontal size={16} />
          <span>FILTROS {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
        </button>
      </div>

      {/* CHIPS DE FILTROS ATIVOS (QUALIDADE DE VIDA) */}
      {activeFiltersCount > 0 && (
        <div className={styles.activeFiltersRow}>
          <span className={styles.activeFiltersLabel}>FILTROS ATIVOS:</span>
          {searchQuery && (
            <span className={styles.filterChip}>
              BUSCA: "{searchQuery}"
              <button onClick={() => setSearchQuery('')} aria-label="Remover filtro de busca">
                <X size={12} />
              </button>
            </span>
          )}
          {filters.category && (
            <span className={styles.filterChip}>
              CATEGORIA: {filters.category.toUpperCase()}
              <button onClick={() => removeFilter('category')} aria-label="Remover categoria">
                <X size={12} />
              </button>
            </span>
          )}
          {filters.fit && (
            <span className={styles.filterChip}>
              MODELAGEM: {filters.fit.toUpperCase()}
              <button onClick={() => removeFilter('fit')} aria-label="Remover modelagem">
                <X size={12} />
              </button>
            </span>
          )}
          {filters.drop && (
            <span className={styles.filterChip}>
              DROP: {filters.drop === 'leak-two' ? 'LEAK TWO' : 'DROPS PASSADOS'}
              <button onClick={() => removeFilter('drop')} aria-label="Remover drop">
                <X size={12} />
              </button>
            </span>
          )}
          {filters.size && (
            <span className={styles.filterChip}>
              TAMANHO: {filters.size}
              <button onClick={() => removeFilter('size')} aria-label="Remover tamanho">
                <X size={12} />
              </button>
            </span>
          )}
          <button onClick={handleReset} className={styles.clearAllLink}>
            LIMPAR TODOS
          </button>
        </div>
      )}

      {/* CORPO DO CATÁLOGO: SIDEBAR + GRADE DE PRODUTOS */}
      <div className={styles.contentLayout}>
        <div className={`${styles.sidebarWrapper} ${isMobileFilterOpen ? styles.sidebarMobileOpen : ''}`}>
          <FilterSidebar filters={filters} onReset={handleReset} setFilters={setFilters} />
        </div>

        <section className={styles.productsArea}>
          {/* BARRA DE CONTAGEM E STATUS */}
          <div className={styles.resultsBar}>
            <div className={styles.resultsCount}>
              {totalItems > 0 ? (
                <>EXIBINDO <strong>{startIndex + 1}–{endIndex}</strong> DE <strong>{totalItems}</strong> PEÇAS</>
              ) : (
                '0 PEÇAS ENCONTRADAS'
              )}
            </div>

            {!isAll && totalPages > 1 && (
              <span className={styles.pageIndicatorMini}>
                PÁGINA {currentPage} DE {totalPages}
              </span>
            )}
          </div>

          {/* GRADE DE PRODUTOS */}
          {paginatedProducts.length > 0 ? (
            <>
              <div className={styles.grid}>
                {paginatedProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* BARRA DE PAGINAÇÃO COMPLETA */}
              {!isAll && totalPages > 1 && (
                <div className={styles.paginationContainer} aria-label="Navegação entre páginas">
                  <button
                    className={styles.pageBtn}
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft size={16} />
                    <span>ANTERIOR</span>
                  </button>

                  <div className={styles.pageNumbers}>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        className={`${styles.pageNumberBtn} ${page === currentPage ? styles.activePageNumber : ''}`}
                        onClick={() => handlePageChange(page)}
                        aria-label={`Ir para a página ${page}`}
                        aria-current={page === currentPage ? 'page' : undefined}
                      >
                        {String(page).padStart(2, '0')}
                      </button>
                    ))}
                  </div>

                  <button
                    className={styles.pageBtn}
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="Próxima página"
                  >
                    <span>PRÓXIMA</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className={styles.emptyState}>
              <p>Nenhuma peça encontrada com os filtros selecionados.</p>
              <button onClick={handleReset} className={styles.resetBtn}>LIMPAR FILTROS</button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default Catalogo;
