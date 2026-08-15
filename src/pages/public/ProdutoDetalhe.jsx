import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Star, Plus, Heart, ShoppingBag, ArrowLeft, Check, Package } from 'lucide-react';
import { catalogService } from '../../services/catalogService';
import { seedService } from '../../services/seedService';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { analyticsService } from '../../services/analyticsService';
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

const DEFAULT_REVIEWS = [
  { 
    id: 1, 
    author: "Lucas M.", 
    rating: 5, 
    date: "02/08/2026", 
    variant: "Tamanho: M • Cor: Preto Piano",
    comment: "Caimento impecável! O tecido é realmente pesado (heavyweight) e a gola é bem grossa, não deforma de jeito nenhum." 
  },
  { 
    id: 2, 
    author: "Gabriel S.", 
    rating: 5, 
    date: "28/07/2026", 
    variant: "Tamanho: G • Cor: Off-White",
    comment: "Modelagem Boxy autêntica. Ombros bem posicionados e entrega rápida aqui em Curitiba." 
  },
  { 
    id: 3, 
    author: "Matheus K.", 
    rating: 5, 
    date: "15/07/2026", 
    variant: "Tamanho: M • Cor: Preto Piano",
    comment: "Qualidade do algodão é absurda, muito superior a outras marcas nacionais. Vale cada centavo do investimento." 
  }
];

export function ProdutoDetalhe({ onAddToCart }) {
  const { slug, id } = useParams();
  const currentParam = slug || id;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  // Contextos
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  // Estados de Interação
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState({ id: "preto", name: "Preto Piano", hex: "#0a0a0a" });
  const [selectedSize, setSelectedSize] = useState('M');
  const [quantity, setQuantity] = useState(1);
  const [openAccordion, setOpenAccordion] = useState('measures');
  const [isAddedFeedback, setIsAddedFeedback] = useState(false);

  // Cálculo de Frete
  const [cepInput, setCepInput] = useState('');
  const [shippingOptions, setShippingOptions] = useState(null);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
  const [shippingError, setShippingError] = useState(null);

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      try {
        await seedService.seedCatalogIfEmpty();
        let data = await catalogService.getProductById(currentParam);
        
        if (!data) {
          // Tenta carregar catálogo completo e encontrar por slug/id
          const all = await catalogService.getAllProducts();
          data = all.find(p => p.id === currentParam || p.slug === currentParam) || null;
        }

        if (data) {
          setProduct(data);
          // Determina tamanho padrão disponível
          if (data.stock) {
            const firstAvailable = Object.entries(data.stock).find(([_, qty]) => Number(qty) > 0);
            if (firstAvailable) {
              setSelectedSize(firstAvailable[0]);
            }
          }
          // Telemetria
          analyticsService.trackProductView(data.id, data.name, data.category || 'camisa', data.fit || 'boxy');
          analyticsService.trackPageView('produto_detalhe');
        }
      } catch (err) {
        console.error("Erro ao carregar produto:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [currentParam]);

  if (loading) {
    return (
      <main className={styles.container}>
        <div style={{ textAlign: 'center', padding: '6rem 1rem', color: 'var(--text-secondary)' }}>
          <Package size={32} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 1rem' }} />
          <p>Carregando detalhes da peça no Firestore...</p>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className={styles.container}>
        <div style={{ textAlign: 'center', padding: '6rem 1rem' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', marginBottom: '1rem' }}>PEÇA NÃO ENCONTRADA</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>O produto que você procura não está disponível no estoque ou foi descontinuado.</p>
          <Link to="/catalogo" style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)', padding: '0.8rem 1.5rem', fontWeight: 800, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={16} />
            <span>VOLTAR AO CATÁLOGO</span>
          </Link>
        </div>
      </main>
    );
  }

  // Dados consolidados do produto
  const images = product.images && product.images.length > 0 
    ? product.images 
    : [product.image || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800'];
  
  const colors = product.colors || [
    { id: "preto", name: "Preto Piano", hex: "#0a0a0a" },
    { id: "off-white", name: "Off-White", hex: "#f2f0eb" },
    { id: "grafite", name: "Grafite Mineral", hex: "#262626" }
  ];

  const sizeChart = product.sizeChart || DEFAULT_SIZE_CHART;
  const careInstructions = product.careInstructions || DEFAULT_CARE_INSTRUCTIONS;
  const reviews = product.reviews || DEFAULT_REVIEWS;

  const priceNum = Number(product.price || 0);
  const originalPriceNum = Number(product.originalPrice || 0);
  const installmentsCount = product.installments || 3;
  const installmentValue = (priceNum / installmentsCount).toFixed(2);

  const availableStock = product.stock 
    ? Number(product.stock[selectedSize] || 0) 
    : (Number(product.totalStock) || 10);

  const isFavorite = isInWishlist(product.id);

  const handlePrevImage = () => {
    setSelectedImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setSelectedImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleCepChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
    const formatted = raw.length > 5 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : raw;
    setCepInput(formatted);
  };

  const handleCalculateShipping = (e) => {
    e.preventDefault();
    const cleanCep = cepInput.replace(/\D/g, '');
    
    if (cleanCep.length !== 8) {
      setShippingError('Digite um CEP válido com 8 dígitos.');
      setShippingOptions(null);
      return;
    }

    setShippingError(null);
    setIsCalculatingShipping(true);

    setTimeout(() => {
      setIsCalculatingShipping(false);
      const isCuritiba = cleanCep.startsWith('80') || cleanCep.startsWith('81') || cleanCep.startsWith('82') || cleanCep.startsWith('83');
      
      setShippingOptions([
        {
          id: 'sedex',
          name: 'SEDEX EXPRESSO',
          deadline: isCuritiba ? 'Chega amanhã' : '1 a 3 dias úteis',
          price: isCuritiba ? 14.90 : 28.50
        },
        {
          id: 'pac',
          name: 'PAC STANDARD',
          deadline: isCuritiba ? '2 a 3 dias úteis' : '5 a 8 dias úteis',
          price: isCuritiba ? 9.90 : 18.90
        },
        {
          id: 'retirada',
          name: 'RETIRADA ATELIÊ (CURITIBA)',
          deadline: 'Disponível em 24h',
          price: 0
        }
      ]);
    }, 400);
  };

  const handleAddToCart = () => {
    if (availableStock <= 0) return;
    
    if (onAddToCart) {
      onAddToCart(product, selectedSize, quantity, selectedColor);
    } else {
      addToCart(product, selectedSize, quantity, selectedColor);
    }

    setIsAddedFeedback(true);
    setTimeout(() => setIsAddedFeedback(false), 2500);
  };

  return (
    <main className={styles.container}>
      {/* NAVEGAÇÃO BREADCRUMB */}
      <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
        <Link to="/" className={styles.breadcrumbLink}>HOME</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <Link to="/catalogo" className={styles.breadcrumbLink}>CATÁLOGO</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbActive}>{product.name.toUpperCase()}</span>
      </nav>

      {/* GRADE PRINCIPAL: GALERIA + INFOS DE COMPRA */}
      <div className={styles.productGrid}>
        {/* GALERIA DE IMAGENS */}
        <section className={styles.gallerySection} aria-label="Galeria de fotos do produto">
          <div className={styles.mainImageWrapper}>
            <button onClick={handlePrevImage} className={`${styles.navArrow} ${styles.prevArrow}`} aria-label="Imagem anterior">
              &#10094;
            </button>
            <img 
              src={images[selectedImageIndex] || images[0]} 
              alt={`${product.name} - Foto ${selectedImageIndex + 1}`} 
              className={styles.mainImage}
            />
            <button onClick={handleNextImage} className={`${styles.navArrow} ${styles.nextArrow}`} aria-label="Próxima imagem">
              &#10095;
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
              <span className={styles.fitBadge}>{(product.fit || 'boxy').toUpperCase()} FIT</span>
              <span className={styles.dropBadge}>{product.drop === 'leak-two' ? 'LEAK TWO' : (product.drop?.toUpperCase() || 'DROP EXCLUSIVO')}</span>
            </div>
            <h1 className={styles.title}>{product.name}</h1>
            <div className={styles.priceContainer}>
              <span className={styles.price}>R$ {priceNum.toFixed(2)}</span>
              {originalPriceNum > priceNum && (
                <span className={styles.oldPrice}>R$ {originalPriceNum.toFixed(2)}</span>
              )}
              <span className={styles.installments}>
                ou {installmentsCount}x de R$ {installmentValue} sem juros
              </span>
            </div>
          </div>

          {/* SELETOR DE COR */}
          <div className={styles.colorSelector}>
            <div className={styles.selectorHeader}>
              <span className={styles.selectorLabel}>COR:</span>
              <span className={styles.selectedValue}>{selectedColor.name}</span>
            </div>
            <div className={styles.colorSwatches}>
              {colors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`${styles.colorBtn} ${selectedColor.id === c.id ? styles.activeColor : ''}`}
                  onClick={() => setSelectedColor(c)}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                  aria-label={`Cor ${c.name}`}
                />
              ))}
            </div>
          </div>

          {/* SELETOR DE TAMANHO */}
          <div className={styles.sizeSelector}>
            <div className={styles.selectorHeader}>
              <span className={styles.selectorLabel}>TAMANHO:</span>
              <span className={styles.selectedValue}>TAM {selectedSize}</span>
            </div>
            <div className={styles.sizeOptions}>
              {['PP', 'P', 'M', 'G', 'GG'].map((size) => {
                const stockQty = product.stock ? Number(product.stock[size] || 0) : 10;
                const isOutOfStock = stockQty === 0;

                return (
                  <button
                    key={size}
                    type="button"
                    disabled={isOutOfStock}
                    className={`${styles.sizeBtn} ${selectedSize === size ? styles.activeSize : ''} ${isOutOfStock ? styles.disabledSize : ''}`}
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
            <small className={styles.stockNotice}>
              {availableStock > 0 ? `${availableStock} unidades disponíveis no tamanho ${selectedSize}` : `Tamanho ${selectedSize} esgotado no momento`}
            </small>
          </div>

          {/* QUANTIDADE E BOTÕES DE AÇÃO */}
          <div className={styles.purchaseControls}>
            <div className={styles.quantitySelector}>
              <button 
                type="button"
                className={styles.qtyBtn} 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1 || availableStock === 0}
              >
                -
              </button>
              <span className={styles.qtyValue}>{quantity}</span>
              <button 
                type="button"
                className={styles.qtyBtn} 
                onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                disabled={quantity >= availableStock || availableStock === 0}
              >
                +
              </button>
            </div>

            <button 
              type="button"
              className={`${styles.addToCartBtn} ${isAddedFeedback ? styles.addedSuccess : ''}`}
              onClick={handleAddToCart}
              disabled={availableStock === 0}
            >
              <ShoppingBag size={17} />
              <span>
                {isAddedFeedback 
                  ? 'ADICIONADO À SACOLA!' 
                  : availableStock > 0 ? 'ADICIONAR À SACOLA' : 'ESGOTADO'}
              </span>
            </button>

            <button 
              type="button"
              className={`${styles.wishlistBtn} ${isFavorite ? styles.favorited : ''}`}
              onClick={() => toggleWishlist(product)}
              title={isFavorite ? "Remover dos favoritos" : "Salvar nos favoritos"}
              aria-label="Favoritar produto"
            >
              <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
            </button>
          </div>

          {/* CÁLCULO DE FRETE COMPACTO */}
          <div className={styles.shippingCalculator}>
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

      {/* SEÇÃO DEDICADA DE AVALIAÇÕES */}
      <section className={styles.reviewsSection} aria-label="Avaliações dos clientes">
        <header className={styles.reviewsHeader}>
          <div className={styles.reviewsTitleGroup}>
            <span className={styles.reviewsSuperTitle}>FEEDBACK REAL // FOR THE FEW</span>
            <h2 className={styles.reviewsMainTitle}>AVALIAÇÕES DA COMUNIDADE</h2>
          </div>

          <div className={styles.ratingSummaryCard}>
            <div className={styles.ratingScore}>5.0</div>
            <div className={styles.ratingMeta}>
              <div className={styles.starsRow} aria-label="Nota 5 de 5 estrelas">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="#ffffff" color="#ffffff" />
                ))}
              </div>
              <span className={styles.recommendText}>100% dos compradores recomendam</span>
            </div>
          </div>
        </header>

        {/* GRADE DE COMENTÁRIOS DOS CLIENTES */}
        <div className={styles.reviewsGrid}>
          {reviews.map((rev) => (
            <article key={rev.id} className={styles.reviewCardItem}>
              <div className={styles.reviewCardTop}>
                <strong className={styles.reviewAuthor}>{rev.author}</strong>
                <span className={styles.reviewDate}>{rev.date}</span>
              </div>

              <div className={styles.reviewStars}>
                {[...Array(rev.rating || 5)].map((_, i) => (
                  <Star key={i} size={12} fill="#ffffff" color="#ffffff" />
                ))}
              </div>

              {rev.variant && (
                <span className={styles.reviewVariantTag}>{rev.variant}</span>
              )}

              <blockquote className={styles.reviewText}>
                "{rev.comment}"
              </blockquote>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default ProdutoDetalhe;
