import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import FilterSidebar from '../../components/catalog/FilterSidebar';
import ProductCard from '../../components/catalog/ProductCard';
import ProductCardSkeleton from '../../components/catalog/ProductCardSkeleton';
import { PRODUCTS_DATA } from '../../data/productsData';
import { analyticsService } from '../../services/analyticsService';
import styles from './Catalogo.module.css';

// Variantes de animação staggered para a grade de cards
const gridVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02
    }
  },
  exit: { opacity: 0, transition: { duration: 0.15 } }
};

const cardItemVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 280,
      damping: 24
    }
  }
};

export function Catalogo() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { categorySlug } = useParams();
  const topRef = useRef(null);

  // Estados de Filtros Multi-Seleção e Busca
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    categories: [],
    fits: [],
    drops: [],
    sizes: []
  });

  const [sortOrder, setSortOrder] = useState('newest');
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // 0. Telemetria: Registra visualização de página do Catálogo
  useEffect(() => {
    analyticsService.trackPageView('catalogo');
  }, []);

  // 1. SINCRONIZAÇÃO: Ler parâmetros da URL e atualizar estados internos
  useEffect(() => {
    const catParam = categorySlug || searchParams.get('categoria') || '';
    const fitParam = searchParams.get('fit') || searchParams.get('modelagem') || '';
    const dropParam = searchParams.get('drop') || '';
    const sizeParam = searchParams.get('tamanho') || searchParams.get('size') || '';
    const searchParam = searchParams.get('search') || '';
    const sortParam = searchParams.get('ordenar') || 'newest';
    const pageParam = parseInt(searchParams.get('pagina'), 10) || 1;
    const perPageParam = parseInt(searchParams.get('por_pagina'), 10) || 6;

    const newCategories = catParam ? catParam.split(',').filter(Boolean) : [];
    const newFits = fitParam ? fitParam.split(',').filter(Boolean) : [];
    const newDrops = dropParam ? dropParam.split(',').filter(Boolean) : [];
    const newSizes = sizeParam ? sizeParam.split(',').filter(Boolean) : [];

    setFilters({
      categories: newCategories,
      fits: newFits,
      drops: newDrops,
      sizes: newSizes
    });
    setSearchQuery(searchParam);
    setSortOrder(sortParam);
    setCurrentPage(pageParam);
    setItemsPerPage(perPageParam);
  }, [categorySlug, searchParams.toString()]);

  // 2. HELPER: Atualiza a URL mantendo todos os parâmetros ativos
  const applyUrlParams = useCallback((newFilters, newSearch, newSort, newPage, newPerPage) => {
    const params = new URLSearchParams();

    if (newFilters.categories && newFilters.categories.length > 0) {
      params.set('categoria', newFilters.categories.join(','));
    }
    if (newFilters.fits && newFilters.fits.length > 0) {
      params.set('fit', newFilters.fits.join(','));
    }
    if (newFilters.drops && newFilters.drops.length > 0) {
      params.set('drop', newFilters.drops.join(','));
    }
    if (newFilters.sizes && newFilters.sizes.length > 0) {
      params.set('tamanho', newFilters.sizes.join(','));
    }
    if (newSearch && newSearch.trim()) {
      params.set('search', newSearch.trim());
    }
    if (newSort && newSort !== 'newest') {
      params.set('ordenar', newSort);
    }
    if (newPage && newPage > 1) {
      params.set('pagina', String(newPage));
    }
    if (newPerPage && newPerPage !== 6) {
      params.set('por_pagina', String(newPerPage));
    }

    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  // Handler de atualização de filtros vindo da FilterSidebar
  const handleFiltersChange = (updater) => {
    setFilters((prev) => {
      const nextFilters = typeof updater === 'function' ? updater(prev) : updater;
      applyUrlParams(nextFilters, searchQuery, sortOrder, 1, itemsPerPage);
      return nextFilters;
    });
    setCurrentPage(1);
  };

  // Simulação de carregamento assíncrono para paginação e filtros
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [filters, searchQuery, itemsPerPage, sortOrder, currentPage]);

  const handleReset = () => {
    const emptyFilters = { categories: [], fits: [], drops: [], sizes: [] };
    setFilters(emptyFilters);
    setSearchQuery('');
    setSortOrder('newest');
    setCurrentPage(1);
    setSearchParams({}, { replace: true });
  };

  const handleSearchSubmit = (term) => {
    setSearchQuery(term);
    setCurrentPage(1);
    applyUrlParams(filters, term, sortOrder, 1, itemsPerPage);
  };

  const handleSearchClear = () => {
    setSearchQuery('');
    applyUrlParams(filters, '', sortOrder, 1, itemsPerPage);
  };

  // Remoções individuais de filtros (chips)
  const removeCategory = (cat) => {
    const updated = (filters.categories || []).filter(c => c !== cat);
    const newFilters = { ...filters, categories: updated };
    setFilters(newFilters);
    applyUrlParams(newFilters, searchQuery, sortOrder, 1, itemsPerPage);
  };

  const removeFit = (fit) => {
    const updated = (filters.fits || []).filter(f => f !== fit);
    const newFilters = { ...filters, fits: updated };
    setFilters(newFilters);
    applyUrlParams(newFilters, searchQuery, sortOrder, 1, itemsPerPage);
  };

  const removeDrop = (drop) => {
    const updated = (filters.drops || []).filter(d => d !== drop);
    const newFilters = { ...filters, drops: updated };
    setFilters(newFilters);
    applyUrlParams(newFilters, searchQuery, sortOrder, 1, itemsPerPage);
  };

  const removeSize = (size) => {
    const updated = (filters.sizes || []).filter(s => s !== size);
    const newFilters = { ...filters, sizes: updated };
    setFilters(newFilters);
    applyUrlParams(newFilters, searchQuery, sortOrder, 1, itemsPerPage);
  };

  const handleSortChange = (newOrder) => {
    setSortOrder(newOrder);
    applyUrlParams(filters, searchQuery, newOrder, currentPage, itemsPerPage);
  };

  const handlePerPageChange = (newPerPage) => {
    setItemsPerPage(newPerPage);
    setCurrentPage(1);
    applyUrlParams(filters, searchQuery, sortOrder, 1, newPerPage);
  };

  // Motor de Filtragem e Ordenação Multi-Critério
  const filteredProducts = useMemo(() => {
    return PRODUCTS_DATA.filter((product) => {
      // 1. Busca textual confirmada
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = product.name?.toLowerCase().includes(q);
        const matchDesc = product.description?.toLowerCase().includes(q);
        const matchTag = product.tag?.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchTag) return false;
      }
      // 2. Categorias (Multi-Seleção: OR)
      if (filters.categories && filters.categories.length > 0) {
        if (!filters.categories.includes(product.category?.toLowerCase())) return false;
      }
      // 3. Modelagens (Multi-Seleção: OR)
      if (filters.fits && filters.fits.length > 0) {
        if (!filters.fits.includes(product.fit?.toLowerCase())) return false;
      }
      // 4. Drops (Multi-Seleção: OR)
      if (filters.drops && filters.drops.length > 0) {
        if (!filters.drops.includes(product.drop?.toLowerCase())) return false;
      }
      // 5. Tamanhos (Multi-Seleção: Se o produto tiver qualquer um dos tamanhos selecionados)
      if (filters.sizes && filters.sizes.length > 0) {
        const hasMatchingSize = product.sizes?.some(sz => filters.sizes.includes(sz));
        if (!hasMatchingSize) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortOrder === 'price-low') return a.price - b.price;
      if (sortOrder === 'price-high') return b.price - a.price;
      return (b.isRelease ? 1 : 0) - (a.isRelease ? 1 : 0);
    });
  }, [filters, searchQuery, sortOrder]);

  // Cálculo de Paginação
  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  // Ajuste se a página atual ultrapassar o total
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
      applyUrlParams(filters, searchQuery, sortOrder, newPage, itemsPerPage);

      // Rolagem suave com offset para o topo da lista de produtos
      if (topRef.current) {
        const headerOffset = 80;
        const elementPosition = topRef.current.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: Math.max(0, offsetPosition),
          behavior: 'smooth'
        });
      }
    }
  };

  // Contagem de filtros ativos
  const selectedCategories = filters.categories || [];
  const selectedFits = filters.fits || [];
  const selectedDrops = filters.drops || [];
  const selectedSizes = filters.sizes || [];

  const activeFiltersCount = selectedCategories.length + selectedFits.length + selectedDrops.length + selectedSizes.length + (searchQuery.trim() ? 1 : 0);

  return (
    <main className={styles.catalogPage} ref={topRef}>
      {/* HEADER DA PÁGINA COM BREADCRUMB DINÂMICO E VISÍVEL */}
      <header className={styles.header}>
        <div>
          <nav aria-label="Breadcrumb" className={styles.breadcrumbNav}>
            <Link to="/" className={styles.breadcrumbLink}>HOME</Link>
            <span className={styles.breadcrumbSeparator}>/</span>
            <Link 
              to="/catalogo" 
              onClick={(e) => {
                if (activeFiltersCount > 0) {
                  handleReset();
                }
              }}
              className={activeFiltersCount === 0 ? styles.breadcrumbActive : styles.breadcrumbLink}
            >
              CATÁLOGO
            </Link>

            {selectedCategories.length === 1 && (
              <>
                <span className={styles.breadcrumbSeparator}>/</span>
                <span className={styles.breadcrumbActive}>
                  {selectedCategories[0] === 'camisa' ? 'CAMISAS' : selectedCategories[0] === 'calca' ? 'CALÇAS' : selectedCategories[0] === 'jaqueta' ? 'JAQUETAS & HOODIES' : selectedCategories[0].toUpperCase()}
                </span>
              </>
            )}

            {selectedCategories.length > 1 && (
              <>
                <span className={styles.breadcrumbSeparator}>/</span>
                <span className={styles.breadcrumbActive}>
                  MÚLTIPLAS CATEGORIAS ({selectedCategories.length})
                </span>
              </>
            )}

            {selectedDrops.length === 1 && selectedCategories.length === 0 && (
              <>
                <span className={styles.breadcrumbSeparator}>/</span>
                <span className={styles.breadcrumbActive}>
                  {selectedDrops[0] === 'leak-two' ? 'LEAK TWO' : 'DROPS PASSADOS'}
                </span>
              </>
            )}
          </nav>

          <h1 className={styles.title}>VESTUÁRIO & CONCEITO</h1>
        </div>

        {/* CONTROLES DO TOPO: ITENS POR PÁGINA & ORDENAÇÃO */}
        <div className={styles.topActions}>
          <div className={styles.controlGroup}>
            {/* ITENS POR PÁGINA */}
            <div className={styles.selectWrapper}>
              <label htmlFor="perPageSelect" className={styles.controlLabel}>EXIBIR:</label>
              <select
                id="perPageSelect"
                className={styles.selectInput}
                value={itemsPerPage}
                onChange={(e) => handlePerPageChange(Number(e.target.value))}
              >
                <option value={6}>6 ITENS</option>
                <option value={12}>12 ITENS</option>
                <option value={24}>24 ITENS</option>
              </select>
            </div>

            {/* ORDENAÇÃO */}
            <div className={styles.selectWrapper}>
              <label htmlFor="sortSelect" className={styles.controlLabel}>ORDENAR:</label>
              <select 
                id="sortSelect" 
                className={styles.selectInput}
                value={sortOrder}
                onChange={(e) => handleSortChange(e.target.value)}
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

      {/* CHIPS DE FILTROS ATIVOS (MULTI-SELEÇÃO) */}
      {activeFiltersCount > 0 && (
        <div className={styles.activeFiltersRow}>
          <span className={styles.activeFiltersLabel}>FILTROS ATIVOS:</span>
          {searchQuery && (
            <span className={styles.filterChip}>
              BUSCA: "{searchQuery}"
              <button onClick={handleSearchClear} aria-label="Remover filtro de busca">
                <X size={12} />
              </button>
            </span>
          )}
          {selectedCategories.map(cat => (
            <span key={cat} className={styles.filterChip}>
              CATEGORIA: {cat === 'calca' ? 'CALÇA' : cat.toUpperCase()}
              <button onClick={() => removeCategory(cat)} aria-label={`Remover categoria ${cat}`}>
                <X size={12} />
              </button>
            </span>
          ))}
          {selectedFits.map(fit => (
            <span key={fit} className={styles.filterChip}>
              MODELAGEM: {fit.toUpperCase()}
              <button onClick={() => removeFit(fit)} aria-label={`Remover modelagem ${fit}`}>
                <X size={12} />
              </button>
            </span>
          ))}
          {selectedDrops.map(drop => (
            <span key={drop} className={styles.filterChip}>
              DROP: {drop === 'leak-two' ? 'LEAK TWO' : 'DROPS PASSADOS'}
              <button onClick={() => removeDrop(drop)} aria-label={`Remover drop ${drop}`}>
                <X size={12} />
              </button>
            </span>
          ))}
          {selectedSizes.map(size => (
            <span key={size} className={styles.filterChip}>
              TAMANHO: {size}
              <button onClick={() => removeSize(size)} aria-label={`Remover tamanho ${size}`}>
                <X size={12} />
              </button>
            </span>
          ))}
          <button onClick={handleReset} className={styles.clearAllLink}>
            LIMPAR TODOS
          </button>
        </div>
      )}

      {/* CORPO DO CATÁLOGO: SIDEBAR + GRADE DE PRODUTOS */}
      <div className={styles.contentLayout}>
        <div className={`${styles.sidebarWrapper} ${isMobileFilterOpen ? styles.sidebarMobileOpen : ''}`}>
          <FilterSidebar 
            filters={filters} 
            setFilters={handleFiltersChange} 
            onReset={handleReset} 
            searchQuery={searchQuery}
            onSearchSubmit={handleSearchSubmit}
            onSearchClear={handleSearchClear}
          />
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

            {totalPages > 1 && (
              <span className={styles.pageIndicatorMini}>
                PÁGINA {currentPage} DE {totalPages}
              </span>
            )}
          </div>

          {/* SKELETON LOADING OU GRADE ANIMADA DE PRODUTOS */}
          {isLoading ? (
            <div className={styles.grid}>
              {Array.from({ length: Math.min(itemsPerPage, totalItems || itemsPerPage) }).map((_, idx) => (
                <ProductCardSkeleton key={idx} />
              ))}
            </div>
          ) : paginatedProducts.length > 0 ? (
            <>
              <motion.div 
                key={`page-${currentPage}-${sortOrder}-${itemsPerPage}-${JSON.stringify(filters)}-${searchQuery}`}
                variants={gridVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={styles.grid}
              >
                {paginatedProducts.map(product => (
                  <motion.div key={product.id} variants={cardItemVariants}>
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </motion.div>

              {/* BARRA DE PAGINAÇÃO COMPLETA */}
              {totalPages > 1 && (
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
