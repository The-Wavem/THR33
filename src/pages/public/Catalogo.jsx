import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams, useParams } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import FilterSidebar from '../../components/catalog/FilterSidebar';
import LookbookSplitSkeleton from '../../components/catalog/LookbookSplitSkeleton';
import LookbookSplitSection from '../../sections/catalogo/LookbookSplitSection';
import { catalogService, fetchProducts } from '../../services/catalogService';
import { fetchActiveDiscounts } from '../../services/campaignService';
import { logPageView } from '../../services/analyticsService';
import { normalizeFitSlug, formatFitLabel } from '../../utils/fitUtils';
import { SEO } from '../../components/common/SEO';
import { buildBreadcrumbSchema } from '../../utils/seoSchemas';
import styles from './Catalogo.module.css';

export function Catalogo() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { categorySlug } = useParams();
  const topRef = useRef(null);

  // Produtos e Campanhas carregados do Firestore
  const [products, setProducts] = useState([]);
  const [activeDiscounts, setActiveDiscounts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Estados de Filtros Multi-Seleção e Busca
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    categories: [],
    fits: [],
    drops: [],
    sizes: []
  });
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [onlyInStock, setOnlyInStock] = useState(false);

  const [sortOrder, setSortOrder] = useState('newest');
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // 0. Telemetria e Busca de Produtos e Descontos Ativos no Firestore
  useEffect(() => {
    logPageView('/catalogo');
    async function loadCatalogData() {
      setLoadingProducts(true);
      try {
        const [productsData, discountsData] = await Promise.all([
          fetchProducts ? fetchProducts() : catalogService.getAllProducts(),
          fetchActiveDiscounts()
        ]);
        setProducts(productsData || []);
        setActiveDiscounts(discountsData || []);
      } catch (err) {
        console.error('Erro ao carregar catálogo:', err);
      } finally {
        setLoadingProducts(false);
      }
    }
    loadCatalogData();
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

  // Transição suave para paginação e filtros
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [filters, searchQuery, itemsPerPage, sortOrder, currentPage]);

  const handleReset = () => {
    const emptyFilters = { categories: [], fits: [], drops: [], sizes: [] };
    setFilters(emptyFilters);
    setSearchQuery('');
    setPriceRange([0, 10000]);
    setOnlyInStock(false);
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
  const removeFit = (fit) => {
    const norm = normalizeFitSlug(fit);
    const updated = (filters.fits || []).filter(f => normalizeFitSlug(f) !== norm && f !== fit);
    const newFilters = { ...filters, fits: updated };
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

  // Motor de Filtragem e Ordenação Multi-Critério
  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        // Ignora brindes da listagem geral de vestuário se type for brinde
        if (product.type === 'brinde') return false;

        // 1. Busca textual confirmada
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = product.name?.toLowerCase().includes(q);
          const matchDesc = product.description?.toLowerCase().includes(q);
          const matchTag =
            product.customBadge?.toLowerCase().includes(q) ||
            product.tag?.toLowerCase().includes(q);
          if (!matchName && !matchDesc && !matchTag) return false;
        }
        // 2. Categorias (Multi-Seleção: OR)
        if (filters.categories && filters.categories.length > 0) {
          if (!filters.categories.includes(product.category?.toLowerCase())) return false;
        }
        // 3. Modelagens Dinâmicas (Multi-Seleção: OR)
        if (filters.fits && filters.fits.length > 0) {
          const prodFitNorm = normalizeFitSlug(product.fit);
          const matchFit = filters.fits.some((f) => {
            const filterNorm = normalizeFitSlug(f);
            return (
              filterNorm === prodFitNorm ||
              product.fit?.toLowerCase() === f.toLowerCase() ||
              product.fit?.toLowerCase().includes(f.toLowerCase()) ||
              f.toLowerCase().includes(product.fit?.toLowerCase())
            );
          });
          if (!matchFit) return false;
        }
        // 4. Drops (Multi-Seleção: OR)
        if (filters.drops && filters.drops.length > 0) {
          if (!filters.drops.includes(product.drop?.toLowerCase())) return false;
        }
        // 5. Tamanhos (Multi-Seleção: OR)
        if (filters.sizes && filters.sizes.length > 0) {
          const hasMatchingSize =
            (product.sizes && product.sizes.some((sz) => filters.sizes.includes(sz))) ||
            (product.stock && filters.sizes.some((sz) => Number(product.stock[sz]) > 0));
          if (!hasMatchingSize) return false;
        }
        // 6. Faixa de preço
        const itemPrice = Number(product.discountPrice || product.price || 0);
        if (priceRange && (itemPrice < priceRange[0] || itemPrice > priceRange[1])) {
          return false;
        }
        // 7. Apenas em estoque
        if (onlyInStock) {
          const outOfStock =
            (product.stock !== undefined && typeof product.stock !== 'object' && Number(product.stock) <= 0) ||
            (product.stock &&
              typeof product.stock === 'object' &&
              Object.values(product.stock).reduce((a, b) => a + (Number(b) || 0), 0) <= 0) ||
            (product.totalStock !== undefined && Number(product.totalStock) <= 0);
          if (outOfStock) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'price-low') return Number(a.price || 0) - Number(b.price || 0);
        if (sortOrder === 'price-high') return Number(b.price || 0) - Number(a.price || 0);
        return (b.isRelease ? 1 : 0) - (a.isRelease ? 1 : 0);
      });
  }, [products, filters, searchQuery, sortOrder, priceRange, onlyInStock]);

  // Cálculo de Paginação
  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

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
  const selectedFits = filters.fits || [];
  const selectedSizes = filters.sizes || [];
  const activeFiltersCount =
    selectedFits.length + selectedSizes.length + (searchQuery.trim() ? 1 : 0);
  const totalActiveWithSort = activeFiltersCount + (sortOrder !== 'newest' ? 1 : 0);

  // Categoria / modelagem selecionada estável para SEO (evita recálculos em busca, paginação ou sliders)
  const selectedCategory = categorySlug || (selectedFits.length === 1 ? selectedFits[0] : '');

  const seoTitle = useMemo(() => {
    if (selectedCategory) {
      return `${formatFitLabel(selectedCategory)} — Catálogo`;
    }
    return 'Catálogo Completo — Streetwear Autoral & Lotes Limitados';
  }, [selectedCategory]);

  const seoDescription = useMemo(() => {
    if (selectedCategory) {
      return `Explore peças ${formatFitLabel(selectedCategory)} da THR33 Streetwear. Modelagens autorais exclusivas e alta gramatura produzidas sob demanda.`;
    }
    return 'Confira a coleção completa da THR33 Streetwear. Camisetas Boxy, Oversized Heavyweight e peças exclusivas produzidas sob demanda.';
  }, [selectedCategory]);

  const breadcrumbsSchema = useMemo(() => {
    const list = [
      { name: 'Início', url: '/' },
      { name: 'Catálogo', url: '/catalogo' }
    ];
    if (selectedCategory) {
      list.push({
        name: formatFitLabel(selectedCategory),
        url: categorySlug ? `/categoria/${selectedCategory}` : `/catalogo?fit=${selectedCategory}`
      });
    }
    return buildBreadcrumbSchema(list);
  }, [selectedCategory, categorySlug]);

  return (
    <main className={styles.catalogPage} ref={topRef}>
      <SEO
        title={seoTitle}
        description={seoDescription}
        url={categorySlug ? `/categoria/${categorySlug}` : '/catalogo'}
        jsonLd={breadcrumbsSchema}
      />
      {/* HEADER DA PÁGINA COM BREADCRUMB DINÂMICO E VISÍVEL */}
      <header className={styles.header}>
        <div>
          <nav aria-label="Breadcrumb" className={styles.breadcrumbNav}>
            <Link to="/" className={styles.breadcrumbLink}>HOME</Link>
            <span className={styles.breadcrumbSeparator}>/</span>
            <Link
              to="/catalogo"
              onClick={() => {
                if (activeFiltersCount > 0) {
                  handleReset();
                }
              }}
              className={activeFiltersCount === 0 ? styles.breadcrumbActive : styles.breadcrumbLink}
            >
              CATÁLOGO
            </Link>

            {selectedFits.length === 1 && (
              <>
                <span className={styles.breadcrumbSeparator}>/</span>
                <span className={styles.breadcrumbActive}>
                  {formatFitLabel(selectedFits[0])}
                </span>
              </>
            )}
          </nav>

          <h1 className={styles.title}>VESTUÁRIO & CONCEITO</h1>
        </div>
      </header>

      {/* BARRA SUPERIOR DE CONTROLE: BOTÃO BRUTALISTA DE GAVETA + CONTAGEM DE PEÇAS */}
      <div className={styles.resultsHeader}>
        <button
          type="button"
          onClick={() => setIsFilterDrawerOpen(true)}
          className={styles.filterDrawerTrigger}
          aria-label="Abrir gaveta de filtros e ordenação"
        >
          <SlidersHorizontal size={15} />
          <span>FILTRAR & ORDENAR</span>
          {totalActiveWithSort > 0 && (
            <span className={styles.filterTriggerBadge}>{totalActiveWithSort}</span>
          )}
        </button>

        <div className={styles.resultsMetaGroup}>
          <div className={styles.resultsCount}>
            {totalItems > 0 ? (
              <>
                EXIBINDO <strong>{startIndex + 1}–{endIndex}</strong> DE{' '}
                <strong>{totalItems}</strong> PEÇAS
              </>
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
          {selectedFits.map((fit) => (
            <span key={fit} className={styles.filterChip}>
              MODELAGEM: {formatFitLabel(fit)}
              <button onClick={() => removeFit(fit)} aria-label={`Remover modelagem ${fit}`}>
                <X size={12} />
              </button>
            </span>
          ))}
          {selectedSizes.map((size) => (
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

      {/* GAVETA LATERAL UNIFICADA (DESKTOP & MOBILE) */}
      <FilterSidebar
        products={products}
        filters={filters}
        setFilters={handleFiltersChange}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        onReset={handleReset}
        searchQuery={searchQuery}
        onSearchSubmit={handleSearchSubmit}
        onSearchClear={handleSearchClear}
        isOpen={isFilterDrawerOpen}
        isMobileOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        onCloseMobile={() => setIsFilterDrawerOpen(false)}
        totalResults={totalItems}
      />

      {/* CONTEÚDO PRINCIPAL 100% LARGURA: LOOKBOOK EDITORIAL SPLIT-SCREEN */}
      <div className={styles.catalogLayout}>
        <section className={styles.mainContent}>
          {loadingProducts || isLoading ? (
            <LookbookSplitSkeleton rows={2} startIndex={startIndex} />
          ) : paginatedProducts.length > 0 ? (
            <>
              <LookbookSplitSection
                products={paginatedProducts}
                activeDiscounts={activeDiscounts}
                startIndex={startIndex}
              />

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
                    <span className={styles.pageBtnText}>ANTERIOR</span>
                  </button>

                  <div className={styles.pageNumbers}>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        className={`${styles.pageNumberBtn} ${
                          page === currentPage ? styles.activePageNumber : ''
                        }`}
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
                    <span className={styles.pageBtnText}>PRÓXIMA</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className={styles.emptyState}>
              <p>Nenhuma peça encontrada com os filtros selecionados.</p>
              <button onClick={handleReset} className={styles.resetBtn}>
                LIMPAR FILTROS
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default Catalogo;
