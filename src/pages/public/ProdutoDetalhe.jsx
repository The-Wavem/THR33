import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, Star, Plus, Heart, ShoppingBag, ArrowLeft, Check, Package, 
  ShieldCheck, Flame, HelpCircle, Maximize2, X, ChevronLeft, ChevronRight 
} from 'lucide-react';
import ProductCard from '../../components/catalog/ProductCard';
import { catalogService } from '../../services/catalogService';
import { reviewService } from '../../services/reviewService';
import { shippingService } from '../../services/shippingService';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { analyticsService } from '../../services/analyticsService';
import { formatFitBadgeLabel, formatCategoryBadgeLabel } from '../../utils/fitUtils';
import styles from './ProdutoDetalhe.module.css';

const DEFAULT_SIZE_CHART = [
  { size: "P", chest: "56 cm", length: "70 cm", sleeve: "22 cm" },
  { size: "M", chest: "58 cm", length: "72 cm", sleeve: "23 cm" },
  { size: "G", chest: "60 cm", length: "74 cm", sleeve: "24 cm" },
  { size: "GG", chest: "62 cm", length: "76 cm", sleeve: "25 cm" }
];

const DEFAULT_CARE_INSTRUCTIONS = [
  "Lavar à mão ou na máquina em ciclo delicado com água fria.",
  "Não utilizar alvejantes ou branqueadores ópticos.",
  "Secar à sombra (não usar secadora).",
  "Passar do avesso em temperatura média evitando a estampa."
];

export function ProdutoDetalhe({ onAddToCart }) {
  const { slug, id } = useParams();
  const currentParam = slug || id;
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [suggestedProducts, setSuggestedProducts] = useState([]);

  // Contextos
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  // Estados de Interação
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState('M');
  const [quantity, setQuantity] = useState(1);
  const [openAccordion, setOpenAccordion] = useState('measures');
  const [isAddedFeedback, setIsAddedFeedback] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Cálculo de Frete
  const [cepInput, setCepInput] = useState('');
  const [shippingOptions, setShippingOptions] = useState(null);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
  const [shippingError, setShippingError] = useState(null);

  // Avaliações Reais do Produto (Firestore)
  const [approvedReviews, setApprovedReviews] = useState([]);
  const [reviewsStats, setReviewsStats] = useState({
    totalReviews: 0,
    averageRating: 5.0,
    recommendPercentage: 100
  });
  const [loadingReviews, setLoadingReviews] = useState(true);

  // Carrega avaliações aprovadas reais do Firestore para o produto
  useEffect(() => {
    async function loadApprovedReviews() {
      if (!product?.id) return;
      setLoadingReviews(true);
      try {
        const result = await reviewService.getApprovedReviewsByProduct(product.id, product.slug);
        setApprovedReviews(result.reviews || []);
        setReviewsStats({
          totalReviews: result.totalReviews || 0,
          averageRating: result.averageRating || 5.0,
          recommendPercentage: result.recommendPercentage || 100
        });
      } catch (err) {
        console.warn("Aviso ao carregar avaliações do produto:", err.message);
        setApprovedReviews([]);
      } finally {
        setLoadingReviews(false);
      }
    }
    loadApprovedReviews();
  }, [product?.id, product?.slug]);

  useEffect(() => {
    let isMounted = true;
    async function loadProduct() {
      setLoading(true);
      try {
        // 1. Busca direta pelo produto por ID ou Slug
        let data = await catalogService.getProductById(currentParam);
        
        // 2. Fallback buscando no catálogo completo caso slug ou ID seja variante
        if (!data) {
          const all = await catalogService.getAllProducts();
          data = all.find(p => p.id === currentParam || p.slug === currentParam) || null;
        }

        if (!isMounted) return;

        if (data) {
          setProduct(data);
          let defaultSize = 'M';
          if (data.stock && typeof data.stock === 'object') {
            const firstAvail = ['PP', 'P', 'M', 'G', 'GG'].find(sz => Number(data.stock[sz] ?? 0) > 0);
            if (firstAvail) defaultSize = firstAvail;
          }
          setSelectedSize(defaultSize);

          if (Array.isArray(data.colors) && data.colors.length > 0) {
            setSelectedColor(data.colors[0]);
          } else {
            setSelectedColor({ id: 'preto', name: 'Preto', hex: '#000000' });
          }

          if (Array.isArray(data.imagesGallery) && data.imagesGallery.length > 0) {
            const coverIdx = data.imagesGallery.findIndex(img => img.isCover);
            setSelectedImageIndex(coverIdx >= 0 ? coverIdx : 0);
          } else {
            setSelectedImageIndex(0);
          }
          analyticsService.trackProductView(data.id, data.name, data.category || 'camisa', data.fit || 'boxy', data.slug);
          analyticsService.trackPageView('produto_detalhe');
        } else {
          setProduct(null);
          // Busca sugestões em destaque para exibir na tela 404
          try {
            const suggestions = await catalogService.getFeaturedProducts(4);
            if (isMounted) setSuggestedProducts(suggestions || []);
          } catch (featErr) {
            console.warn("Aviso ao carregar sugestões 404:", featErr);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar produto:", err);
        if (isMounted) {
          setProduct(null);
          try {
            const suggestions = await catalogService.getFeaturedProducts(4);
            if (isMounted) setSuggestedProducts(suggestions || []);
          } catch (featErr) {
            // Silencia erro secundário
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [currentParam]);

  // Consolidação da grade de estoque (com suporte a estoque individual por cor)
  const parsedStock = useMemo(() => {
    if (product?.hasColorStock && product?.colorStock && selectedColor?.id && product.colorStock[selectedColor.id]) {
      const cStock = product.colorStock[selectedColor.id];
      return {
        PP: Number(cStock.PP ?? 0),
        P: Number(cStock.P ?? 0),
        M: Number(cStock.M ?? 0),
        G: Number(cStock.G ?? 0),
        GG: Number(cStock.GG ?? 0)
      };
    }
    if (product?.stock && typeof product.stock === 'object') {
      return {
        PP: Number(product.stock.PP ?? 0),
        P: Number(product.stock.P ?? 0),
        M: Number(product.stock.M ?? 0),
        G: Number(product.stock.G ?? 0),
        GG: Number(product.stock.GG ?? 0)
      };
    }
    if (Array.isArray(product?.variants) && product.variants.length > 0) {
      const s = { PP: 0, P: 0, M: 0, G: 0, GG: 0 };
      product.variants.forEach(v => {
        if (selectedColor?.id && v.colorId && v.colorId !== selectedColor.id) return;
        const sz = String(v.size || '').toUpperCase();
        if (s[sz] !== undefined) s[sz] = Number(v.stock_quantity ?? v.stock ?? v.inventory ?? 0);
      });
      return s;
    }
    if (Array.isArray(product?.sizes) && product.sizes.length > 0) {
      const s = { PP: 0, P: 0, M: 0, G: 0, GG: 0 };
      product.sizes.forEach(sz => {
        const upper = String(sz).toUpperCase();
        if (s[upper] !== undefined) s[upper] = 10;
      });
      return s;
    }
    return { PP: 0, P: 0, M: 0, G: 0, GG: 0 };
  }, [product, selectedColor]);

  const availableStock = parsedStock[selectedSize] ?? 0;
  const isAllOutOfStock = Object.values(parsedStock).every(q => q <= 0);

  // Dados consolidados do produto e galeria com suporte a vínculos de cor
  const imagesGallery = useMemo(() => {
    if (Array.isArray(product?.imagesGallery) && product.imagesGallery.length > 0) {
      return product.imagesGallery;
    }
    if (Array.isArray(product?.images) && product.images.length > 0) {
      return product.images.map((url, idx) => ({
        id: `img_${idx}`,
        url,
        colorId: ''
      }));
    }
    if (product?.image) {
      return [{ id: 'img_0', url: product.image, colorId: '' }];
    }
    return [{ id: 'img_0', url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800', colorId: '' }];
  }, [product]);

  const images = useMemo(() => imagesGallery.map(img => img.url), [imagesGallery]);
  
  const colors = Array.isArray(product?.colors) && product.colors.length > 0
    ? product.colors
    : null;

  const handleSelectColor = (color) => {
    setSelectedColor(color);
    if (!color) return;

    // Vinculação de imagem à cor: busca no carrossel a foto atrelada a esta cor
    const linkedImageIdx = imagesGallery.findIndex(img => img.colorId === color.id);
    if (linkedImageIdx >= 0) {
      setSelectedImageIndex(linkedImageIdx);
    }

    // Se o produto gerencia estoque individual por cor, recalcula disponibilidade
    if (product?.hasColorStock && product?.colorStock?.[color.id]) {
      const colorSizes = product.colorStock[color.id];
      if (Number(colorSizes[selectedSize] ?? 0) <= 0) {
        const firstAvailable = ['PP', 'P', 'M', 'G', 'GG'].find(sz => Number(colorSizes[sz] ?? 0) > 0);
        if (firstAvailable) {
          setSelectedSize(firstAvailable);
        }
      }
    }
  };

  const sizeChart = product?.sizeChart || DEFAULT_SIZE_CHART;
  const careInstructions = product?.careInstructions || DEFAULT_CARE_INSTRUCTIONS;

  const priceNum = Number(product?.price || 0);
  const discountPriceNum = Number(product?.discountPrice || 0);
  const hasDiscount = Boolean(discountPriceNum > 0 && discountPriceNum < priceNum && product?.discountActive !== false);
  const hasFreeShipping = Boolean(product?.freeShipping || product?.hasFreeShipping);
  const effectivePrice = hasDiscount ? discountPriceNum : priceNum;
  const discountPercentage = hasDiscount ? Math.round(((priceNum - discountPriceNum) / priceNum) * 100) : 0;

  const installmentsCount = product?.installments || 3;
  const installmentValue = (effectivePrice / installmentsCount).toFixed(2).replace('.', ',');

  const isFavorite = product?.id ? isInWishlist(product.id) : false;

  const handlePrevImage = () => {
    setSelectedImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setSelectedImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  // Bloqueio de scroll da página (eixo Y) e atalhos de teclado (Esc, Setas) para modal de tela cheia
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      } else if (e.key === 'ArrowLeft') {
        setSelectedImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
      } else if (e.key === 'ArrowRight') {
        setSelectedImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
      }
    };

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, images.length]);

  const handleCepChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
    const formatted = raw.length > 5 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : raw;
    setCepInput(formatted);
  };

  const handleCalculateShipping = async (e) => {
    e.preventDefault();
    const cleanCep = cepInput.replace(/\D/g, '');
    
    if (cleanCep.length !== 8) {
      setShippingError('Digite um CEP válido com 8 dígitos.');
      setShippingOptions(null);
      return;
    }

    setShippingError(null);
    setIsCalculatingShipping(true);

    try {
      const items = [{
        id: product?.id || product?.slug || 'item_1',
        name: product?.name || 'Peça THR33',
        price: effectivePrice,
        quantity: quantity || 1,
        freeShipping: hasFreeShipping
      }];
      const result = await shippingService.calculateShipping(cleanCep, items, effectivePrice * (quantity || 1));
      if (result.options && result.options.length > 0) {
        setShippingOptions(result.options);
      } else {
        setShippingError('Nenhuma opção de entrega encontrada para este CEP.');
        setShippingOptions(null);
      }
    } catch (err) {
      setShippingError(err.message || 'Falha ao cotar frete.');
      setShippingOptions(null);
    } finally {
      setIsCalculatingShipping(false);
    }
  };

  const handleAddToCart = () => {
    if (availableStock <= 0) return;
    
    const linkedImg = selectedColor?.id 
      ? imagesGallery.find(img => img.colorId === selectedColor.id)?.url 
      : null;
    const currentImg = linkedImg || images[selectedImageIndex] || product?.image;

    const finalColor = selectedColor || (colors && colors[0]) || { id: 'preto', name: 'Preto', hex: '#000000' };

    const cartProduct = {
      ...product,
      price: effectivePrice,
      originalPrice: priceNum,
      image: currentImg,
      color: finalColor,
      category: product?.category || 'camisa',
      freeShipping: hasFreeShipping
    };

    if (onAddToCart) {
      onAddToCart(cartProduct, selectedSize, quantity, finalColor);
    } else {
      addToCart(cartProduct, selectedSize, quantity, finalColor);
    }


    setIsAddedFeedback(true);
    setTimeout(() => setIsAddedFeedback(false), 2500);
  };

  if (loading) {
    return (
      <main className={styles.container}>
        <div className={styles.loadingWrapper} aria-live="polite">
          <div className={styles.loadingCard}>
            <div className={styles.loadingSpinnerContainer}>
              <div className={styles.loadingSpinnerRing} />
              <Package size={24} className={styles.loadingIcon} />
            </div>
            <div className={styles.loadingBadge}>
              <span className={styles.loadingDot} />
              <span>THR33 // ATELIÊ STREETWEAR</span>
            </div>
            <h2 className={styles.loadingTitle}>CONSULTANDO ACERVO</h2>
            <p className={styles.loadingSubtitle}>
              Sincronizando especificações técnicas, grade de medidas e disponibilidade em estoque.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className={styles.container}>
        <div className={styles.notFoundWrapper}>
          <motion.div 
            className={styles.notFoundCard}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <div className={styles.notFoundBadgeRow}>
              <span className={styles.notFoundBadge}>
                <span className={styles.notFoundDot} />
                PEÇA NÃO LOCALIZADA // ACERVO THR33
              </span>
            </div>

            <h1 className={styles.notFoundCode}>404</h1>

            <h2 className={styles.notFoundTitle}>PEÇA NÃO ENCONTRADA OU FORA DE CATÁLOGO</h2>

            {currentParam && (
              <div className={styles.notFoundParamBadge}>
                <span className={styles.paramLabel}>REFERÊNCIA BUSCADA:</span>
                <code className={styles.paramValue}>/produto/{currentParam}</code>
              </div>
            )}

            <p className={styles.notFoundText}>
              A peça que você tentou acessar não foi localizada em nosso acervo ativo. Ela pode pertencer a um drop anterior já encerrado, ter tido seu link atualizado ou estar temporariamente indisponível. Nossas coleções contam com tiragens limitadas e cortes exclusivos.
            </p>

            <div className={styles.notFoundActions}>
              <button 
                type="button" 
                onClick={() => navigate(-1)} 
                className={styles.notFoundBackBtn}
                title="Voltar à página anterior"
              >
                <ArrowLeft size={16} />
                <span>VOLTAR</span>
              </button>

              <Link to="/catalogo" className={styles.notFoundPrimaryBtn}>
                <ShoppingBag size={16} />
                <span>EXPLORAR CATÁLOGO</span>
              </Link>

              <Link to="/lancamentos" className={styles.notFoundSecondaryBtn}>
                <Flame size={16} />
                <span>LANÇAMENTOS VIP</span>
              </Link>
            </div>

            <div className={styles.notFoundSupport}>
              <span>Procurava uma edição específica ou modelo sob demanda?</span>
              <Link to="/suporte" className={styles.notFoundSupportLink}>
                <HelpCircle size={14} />
                <span>Fale com o Ateliê</span>
              </Link>
            </div>
          </motion.div>

          {/* GRADE DE RECOMENDAÇÕES DA VITRINE PARA RECUPERAÇÃO DO CLIENTE */}
          {suggestedProducts.length > 0 && (
            <section className={styles.suggestionsSection} aria-label="Peças recomendadas">
              <header className={styles.suggestionsHeader}>
                <span className={styles.suggestionsSuperTitle}>RECOMENDAÇÕES // FOR THE FEW</span>
                <h3 className={styles.suggestionsTitle}>OUTRAS PEÇAS EM DESTAQUE NO ATELIÊ</h3>
              </header>

              <div className={styles.suggestionsGrid}>
                {suggestedProducts.map((suggested) => (
                  <ProductCard key={suggested.id} product={suggested} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      {/* NAVEGAÇÃO BREADCRUMB */}
      <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
        <Link to="/" className={styles.breadcrumbLink}>HOME</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <Link to="/catalogo" className={styles.breadcrumbLink}>CATÁLOGO</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbActive}>{String(product?.name || product?.title || 'PRODUTO').toUpperCase()}</span>
      </nav>

      {/* GRADE PRINCIPAL: GALERIA + INFOS DE COMPRA */}
      <div className={styles.productGrid}>
        {/* GALERIA DE IMAGENS */}
        <section className={styles.gallerySection} aria-label="Galeria de fotos do produto">
          <div 
            className={styles.mainImageWrapper}
            onClick={() => setIsFullscreen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsFullscreen(true); } }}
            aria-label="Clique para ampliar a imagem em tela cheia"
          >
            {/* FAIXA TRANSVERSAL DIAGONAL NO CANTO SUPERIOR (FRETE GRÁTIS) */}
            {hasFreeShipping && (
              <div className={styles.cornerRibbonWrapper} title="Peça com Frete Grátis">
                <div className={styles.cornerRibbon}>
                  FRETE GRÁTIS
                </div>
              </div>
            )}

            {images.length > 1 && (
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); handlePrevImage(); }} 
                className={`${styles.navArrow} ${styles.prevArrow}`} 
                aria-label="Imagem anterior"
              >
                &#10094;
              </button>
            )}
            <img 
              src={images[selectedImageIndex] || images[0]} 
              alt={`${product?.name || product?.title || 'Produto'} - Foto ${selectedImageIndex + 1}`} 
              className={styles.mainImage}
            />
            {images.length > 1 && (
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); handleNextImage(); }} 
                className={`${styles.navArrow} ${styles.nextArrow}`} 
                aria-label="Próxima imagem"
              >
                &#10095;
              </button>
            )}
            <button 
              type="button" 
              className={styles.expandBadge} 
              onClick={(e) => { e.stopPropagation(); setIsFullscreen(true); }}
              aria-label="Abrir imagem em tela cheia"
              title="Clique para ampliar em detalhes"
            >
              <Maximize2 size={14} />
              <span>AMPLIAR</span>
            </button>
          </div>

          <div className={styles.thumbnailsList}>
            {images.map((img, idx) => (
              <button
                key={idx}
                className={`${styles.thumbBtn} ${idx === selectedImageIndex ? styles.activeThumb : ''}`}
                onClick={() => setSelectedImageIndex(idx)}
                aria-label={`Selecionar foto ${idx + 1}`}
              >
                <img src={img} alt={`Miniatura ${idx + 1}`} />
              </button>
            ))}
          </div>
        </section>

        {/* DETALHES E COMPRA */}
        <section className={styles.infoSection}>
          <div className={styles.headerInfo}>
            <div className={styles.badgeRow}>
              <span className={styles.categoryBadge}>{formatCategoryBadgeLabel(product?.category)}</span>
              {formatFitBadgeLabel(product?.fit) && (
                <span className={styles.fitBadge}>{formatFitBadgeLabel(product?.fit)}</span>
              )}
            </div>
            <h1 className={styles.title}>{product?.name || product?.title || 'Produto THR33'}</h1>
            
            {/* Bloco de Preços */}
            <div className={styles.priceContainer}>
              {hasDiscount ? (
                <div className={styles.discountPriceWrapper}>
                  <span className={styles.originalPriceStriked}>
                    R$ {priceNum.toFixed(2).replace('.', ',')}
                  </span>
                  <span className={styles.currentPriceHighlight}>
                    R$ {discountPriceNum.toFixed(2).replace('.', ',')}
                  </span>
                  <span className={styles.discountBadge}>
                    -{discountPercentage}% OFF
                  </span>
                </div>
              ) : (
                <span className={styles.currentPrice}>
                  R$ {priceNum.toFixed(2).replace('.', ',')}
                </span>
              )}
              <span className={styles.installments}>
                ou {installmentsCount}x de R$ {installmentValue} sem juros
              </span>
            </div>
          </div>

          {/* SELETOR DE COR */}
          {colors && colors.length > 0 && (
            <div className={styles.colorSelector}>
              <div className={styles.selectorHeader}>
                <span className={styles.selectorLabel}>COR:</span>
                <span className={styles.selectedValue}>{selectedColor?.name || selectedColor?.id || 'Padrão'}</span>
              </div>
              <div className={styles.colorSwatches}>
                {colors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`${styles.colorBtn} ${selectedColor?.id === c.id ? styles.activeColor : ''}`}
                    onClick={() => handleSelectColor(c)}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                    aria-label={`Cor ${c.name}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* SELETOR DE TAMANHO */}
          <div className={styles.sizeSelector}>
            <div className={styles.selectorHeader}>
              <span className={styles.selectorLabel}>TAMANHO:</span>
              <span className={styles.selectedValue}>
                {selectedSize} {availableStock <= 0 ? '(ESGOTADO)' : ''}
              </span>
            </div>
            <div className={styles.sizeOptions}>
              {['PP', 'P', 'M', 'G', 'GG'].map((size) => {
                const stockQty = parsedStock[size] ?? 0;
                const isOutOfStock = stockQty <= 0;

                return (
                  <button
                    key={size}
                    type="button"
                    disabled={isOutOfStock}
                    className={`${styles.sizeBtn} ${selectedSize === size ? styles.activeSize : ''} ${isOutOfStock ? styles.disabledSize : ''}`}
                    onClick={() => !isOutOfStock && setSelectedSize(size)}
                    title={isOutOfStock ? `Tamanho ${size} ESGOTADO` : `Tamanho ${size} (${stockQty} un. em estoque)`}
                    aria-label={`Tamanho ${size} ${isOutOfStock ? 'Esgotado' : ''}`}
                  >
                    <span>{size}</span>
                    {isOutOfStock && <span className={styles.outOfStockLine} />}
                  </button>
                );
              })}
            </div>
            <small className={`${styles.stockNotice} ${availableStock <= 0 ? styles.stockNoticeAlert : ''}`}>
              {availableStock > 0 
                ? `${availableStock} unidades disponíveis no tamanho ${selectedSize}` 
                : isAllOutOfStock
                  ? 'Todos os tamanhos estão esgotados no momento.'
                  : `Tamanho ${selectedSize} esgotado no estoque.`}
            </small>
          </div>

          {/* Bloco de Ações e Quantidade */}
          <div className={styles.actionsRow}>
            <div className={styles.quantityControl}>
              <button 
                type="button" 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1 || availableStock === 0}
                aria-label="Diminuir quantidade"
              >
                -
              </button>
              <span className={styles.quantityValue}>{quantity}</span>
              <button 
                type="button" 
                onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                disabled={quantity >= availableStock || availableStock === 0}
                aria-label="Aumentar quantidade"
              >
                +
              </button>
            </div>

            <button 
              type="button"
              className={`${styles.addToBagButton} ${isAddedFeedback ? styles.addedSuccess : ''} ${availableStock <= 0 ? styles.disabledBagBtn : ''}`}
              onClick={handleAddToCart}
              disabled={availableStock <= 0}
            >
              <ShoppingBag size={18} />
              <span>
                {isAddedFeedback 
                  ? 'ADICIONADO À SACOLA!' 
                  : availableStock > 0 
                    ? 'ADICIONAR À SACOLA' 
                    : 'TAMANHO ESGOTADO'}
              </span>
            </button>

            <button 
              type="button"
              className={`${styles.wishlistButton} ${isFavorite ? styles.favorited : ''}`}
              onClick={() => toggleWishlist(product)}
              title={isFavorite ? "Remover dos favoritos" : "Salvar nos favoritos"}
              aria-label="Favoritar produto"
            >
              <Heart size={18} fill={isFavorite ? "#ef4444" : "none"} stroke={isFavorite ? "#ef4444" : "currentColor"} />
            </button>
          </div>

          {/* CÁLCULO DE FRETE COMPACTO */}
          <div className={styles.shippingCalculator}>
            {hasFreeShipping && (
              <div className={styles.freeShippingPdpHighlight}>
                <span>ESTA PEÇA CONTA COM FRETE GRÁTIS // THR33 OFICIAL</span>
              </div>
            )}

            <div className={styles.shippingHeader}>
              <div className={styles.shippingTitleGroup}>
                <Truck size={16} />
                <span className={styles.shippingTitle}>SIMULAR FRETE E PRAZO</span>
              </div>
              <a 
                href="https://buscacepinter.correios.com.br/app/endereco/index.php" 
                target="_blank" 
                rel="noreferrer" 
                className={styles.cepLink}
              >
                Não sei meu CEP
              </a>
            </div>

            <form onSubmit={handleCalculateShipping} className={styles.shippingFormCompact}>
              <input 
                type="text" 
                placeholder="00000-000" 
                value={cepInput}
                onChange={handleCepChange}
                className={styles.shippingInputCompact}
                maxLength={9}
              />
              <button type="submit" className={styles.shippingBtnCompact} disabled={isCalculatingShipping}>
                {isCalculatingShipping ? '...' : 'CALCULAR'}
              </button>
            </form>

            {shippingError && <p className={styles.errorMsg}>{shippingError}</p>}

            {shippingOptions && (
              <div className={styles.shippingResultsCompact}>
                {shippingOptions.map(opt => (
                  <div key={opt.id} className={styles.shippingRowCompact}>
                    <div className={styles.shippingInfoCompact}>
                      <span className={styles.shippingNameCompact}>{opt.name}</span>
                      <span className={styles.shippingDeadlineCompact}>{opt.deadline}</span>
                    </div>
                    <span className={styles.shippingPriceCompact}>
                      {opt.price === 0 ? 'GRÁTIS' : `R$ ${opt.price.toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ACCORDIONS DE INFORMAÇÕES TÉCNICAS */}
          <div className={styles.accordions}>
            {/* Descrição */}
            <div className={styles.accordionItem}>
              <button 
                type="button"
                className={styles.accordionHeader} 
                onClick={() => setOpenAccordion(openAccordion === 'description' ? null : 'description')}
                aria-expanded={openAccordion === 'description'}
              >
                <span>DESCRIÇÃO E DETALHES</span>
                <motion.span 
                  className={styles.accordionSign}
                  animate={{ rotate: openAccordion === 'description' ? 45 : 0 }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                >
                  <Plus size={15} />
                </motion.span>
              </button>
              
              <AnimatePresence initial={false}>
                {openAccordion === 'description' && (
                  <motion.div 
                    key="desc-body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.04, 0.62, 0.23, 0.98] }}
                    className={styles.accordionBodyWrapper}
                  >
                    <div className={styles.accordionBody}>
                      <p>{product.description || "Modelagem exclusiva THR33 com acabamento premium e alta densidade."}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Tabela de Medidas */}
            <div className={styles.accordionItem}>
              <button 
                type="button"
                className={styles.accordionHeader} 
                onClick={() => setOpenAccordion(openAccordion === 'measures' ? null : 'measures')}
                aria-expanded={openAccordion === 'measures'}
              >
                <span>TABELA DE MEDIDAS (CM)</span>
                <motion.span 
                  className={styles.accordionSign}
                  animate={{ rotate: openAccordion === 'measures' ? 45 : 0 }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                >
                  <Plus size={15} />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {openAccordion === 'measures' && (
                  <motion.div 
                    key="measures-body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.04, 0.62, 0.23, 0.98] }}
                    className={styles.accordionBodyWrapper}
                  >
                    <div className={styles.accordionBody}>
                      <table className={styles.measuresTable}>
                        <thead>
                          <tr>
                            <th>Tamanho</th>
                            <th>Tórax</th>
                            <th>Comprimento</th>
                            <th>Manga</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sizeChart.map((row) => (
                            <tr key={row.size}>
                              <td><strong>{row.size}</strong></td>
                              <td>{row.chest}</td>
                              <td>{row.length}</td>
                              <td>{row.sleeve}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Cuidados com a Peça */}
            <div className={styles.accordionItem}>
              <button 
                type="button"
                className={styles.accordionHeader} 
                onClick={() => setOpenAccordion(openAccordion === 'care' ? null : 'care')}
                aria-expanded={openAccordion === 'care'}
              >
                <span>CUIDADOS COM A PEÇA</span>
                <motion.span 
                  className={styles.accordionSign}
                  animate={{ rotate: openAccordion === 'care' ? 45 : 0 }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                >
                  <Plus size={15} />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {openAccordion === 'care' && (
                  <motion.div 
                    key="care-body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.04, 0.62, 0.23, 0.98] }}
                    className={styles.accordionBodyWrapper}
                  >
                    <div className={styles.accordionBody}>
                      <ul className={styles.careList}>
                        {careInstructions.map((instruction, idx) => (
                          <li key={idx}>{instruction}</li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>
      </div>

      {/* SEÇÃO DEDICADA DE AVALIAÇÕES REAIS (SEM MOCKS) */}
      <section className={styles.reviewsSection} aria-label="Avaliações dos clientes">
        <header className={styles.reviewsHeader}>
          <div className={styles.reviewsTitleGroup}>
            <span className={styles.reviewsSuperTitle}>FEEDBACK REAL // FOR THE FEW</span>
            <h2 className={styles.reviewsMainTitle}>AVALIAÇÕES DA COMUNIDADE</h2>
          </div>

          {approvedReviews.length > 0 && (
            <div className={styles.ratingSummaryCard}>
              <div className={styles.ratingScore}>{reviewsStats.averageRating.toFixed(1)}</div>
              <div className={styles.ratingMeta}>
                <div className={styles.starsRow} aria-label={`Nota ${reviewsStats.averageRating} de 5 estrelas`}>
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      size={15} 
                      fill={i < Math.round(reviewsStats.averageRating) ? "#ffffff" : "none"} 
                      color={i < Math.round(reviewsStats.averageRating) ? "#ffffff" : "#525252"} 
                    />
                  ))}
                </div>
                <span className={styles.recommendText}>
                  {reviewsStats.recommendPercentage}% dos compradores recomendam ({reviewsStats.totalReviews} {reviewsStats.totalReviews === 1 ? 'avaliação' : 'avaliações'})
                </span>
              </div>
            </div>
          )}
        </header>

        {/* GRADE DE COMENTÁRIOS DOS CLIENTES */}
        <div className={styles.reviewsGrid}>
          {approvedReviews.length > 0 ? (
            approvedReviews.map((rev) => (
              <article key={rev.id} className={styles.reviewCardItem}>
                <div className={styles.reviewCardTop}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <strong className={styles.reviewAuthor}>{rev.author}</strong>
                    <span className={styles.verifiedBuyerTag}>
                      <ShieldCheck size={11} />
                      COMPRADOR VERIFICADO
                    </span>
                  </div>
                  <span className={styles.reviewDate}>
                    {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('pt-BR') : 'Recente'}
                  </span>
                </div>

                <div className={styles.reviewStars}>
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      size={12} 
                      fill={i < (rev.rating || 5) ? "#ffffff" : "none"} 
                      color={i < (rev.rating || 5) ? "#ffffff" : "#525252"} 
                    />
                  ))}
                </div>

                {rev.variant && (
                  <span className={styles.reviewVariantTag}>{rev.variant}</span>
                )}

                <blockquote className={styles.reviewText}>
                  "{rev.comment}"
                </blockquote>
              </article>
            ))
          ) : (
            <div className={styles.emptyReviewsBox}>
              <h3 className={styles.emptyReviewsTitle}>NENHUMA AVALIAÇÃO AINDA</h3>
              <p className={styles.emptyReviewsText}>
                Esta peça é produzida sob demanda com alto padrão têxtil. Seja um dos primeiros clientes a adquirir e avaliar o caimento após a entrega confirmada.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* MODAL LIGHTBOX EM TELA CHEIA */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div 
            className={styles.lightboxOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsFullscreen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Visualização de imagem em tela cheia"
          >
            <div className={styles.lightboxHeader} onClick={(e) => e.stopPropagation()}>
              <div className={styles.lightboxInfo}>
                <span className={styles.lightboxTitle}>{product?.name || product?.title || 'PRODUTO THR33'}</span>
                <span className={styles.lightboxCounter}>{selectedImageIndex + 1} / {images.length}</span>
              </div>
              <button 
                type="button" 
                className={styles.lightboxCloseBtn} 
                onClick={() => setIsFullscreen(false)}
                aria-label="Fechar tela cheia"
                title="Fechar (Esc)"
              >
                <X size={22} />
              </button>
            </div>

            <div className={styles.lightboxContent}>
              {images.length > 1 && (
                <button 
                  type="button"
                  className={`${styles.lightboxArrow} ${styles.lightboxPrev}`}
                  onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
                  aria-label="Imagem anterior"
                  title="Anterior (Seta esquerda)"
                >
                  <ChevronLeft size={32} />
                </button>
              )}

              <motion.img 
                key={selectedImageIndex}
                src={images[selectedImageIndex] || images[0]}
                alt={`${product?.name || product?.title || 'Produto'} - Foto ${selectedImageIndex + 1}`}
                className={styles.lightboxImage}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.18 }}
                onClick={(e) => e.stopPropagation()}
              />

              {images.length > 1 && (
                <button 
                  type="button"
                  className={`${styles.lightboxArrow} ${styles.lightboxNext}`}
                  onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                  aria-label="Próxima imagem"
                  title="Próxima (Seta direita)"
                >
                  <ChevronRight size={32} />
                </button>
              )}
            </div>

            {images.length > 1 && (
              <div className={styles.lightboxThumbnails} onClick={(e) => e.stopPropagation()}>
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`${styles.lightboxThumbBtn} ${idx === selectedImageIndex ? styles.activeLightboxThumb : ''}`}
                    onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(idx); }}
                    aria-label={`Ver foto ${idx + 1}`}
                  >
                    <img src={img} alt={`Miniatura ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default ProdutoDetalhe;
