import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Star, Plus } from 'lucide-react';
import { PRODUCTS_DATA } from '../../data/productsData';
import { analyticsService } from '../../services/analyticsService';
import styles from './ProdutoDetalhe.module.css';

// MOCK PADRÃO / FALLBACK COMPLETO DO PRODUTO
const DEFAULT_PRODUCT = {
  id: "thr33-boxy-black",
  name: "Camiseta THR33 Boxy Logo",
  fit: "Boxy Fit",
  drop: "LEAK TWO",
  price: 189.90,
  installments: 3,
  description: "Desenvolvida em algodão heavy-weight de 260g/m², a Camiseta THR33 Boxy Logo traz modelagem quadrada exclusiva com ombros caídos e gola anelada de 3cm. Peça inspirada na cultura streetwear curitibana com a assinatura da marca no peito.",
  images: [
    "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=800&auto=format&fit=crop"
  ],
  sizes: ["P", "M", "G", "GG"],
  colors: [
    { id: "preto", name: "Preto Piano", hex: "#0a0a0a" },
    { id: "off-white", name: "Off-White", hex: "#f2f0eb" },
    { id: "grafite", name: "Grafite Mineral", hex: "#262626" }
  ],
  sizeChart: [
    { size: "P", chest: "56 cm", length: "70 cm", sleeve: "22 cm" },
    { size: "M", chest: "58 cm", length: "72 cm", sleeve: "23 cm" },
    { size: "G", chest: "60 cm", length: "74 cm", sleeve: "24 cm" },
    { size: "GG", chest: "62 cm", length: "76 cm", sleeve: "25 cm" }
  ],
  careInstructions: [
    "Lavar à mão ou na máquina em ciclo delicado com água fria.",
    "Não utilizar alvejantes ou branqueadores ópticos.",
    "Secar à sombra (não usar secadora).",
    "Passar do avesso em temperatura média evitando a estampa."
  ],
  reviews: [
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
  ]
};

export function ProdutoDetalhe({ onAddToCart }) {
  const { slug, id } = useParams();
  const currentParam = slug || id;

  // Busca o produto correspondente no banco mock ou usa o padrão
  const matched = PRODUCTS_DATA.find(p => p.id === currentParam || p.slug === currentParam);
  
  const product = matched ? {
    ...DEFAULT_PRODUCT,
    ...matched,
    name: matched.name || matched.title || DEFAULT_PRODUCT.name,
    fit: matched.fit ? `${matched.fit.toUpperCase()} FIT` : DEFAULT_PRODUCT.fit,
    drop: matched.drop === 'leak-two' ? 'LEAK TWO' : matched.drop === 'drop-01' ? 'DROP ANTERIOR' : DEFAULT_PRODUCT.drop,
    price: matched.price || matched.priceNum || DEFAULT_PRODUCT.price,
    images: matched.images || [matched.image, matched.hoverImage, DEFAULT_PRODUCT.images[2]].filter(Boolean),
    colors: matched.colors || DEFAULT_PRODUCT.colors,
    reviews: matched.reviews || DEFAULT_PRODUCT.reviews,
    description: matched.description || DEFAULT_PRODUCT.description
  } : DEFAULT_PRODUCT;

  // Estados de Interação
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || DEFAULT_PRODUCT.colors[0]);
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] || 'M');
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [openAccordion, setOpenAccordion] = useState('measures'); // 'description', 'measures', 'care'
  const [isAddedFeedback, setIsAddedFeedback] = useState(false);

  // Cálculo de Frete Compacto
  const [cepInput, setCepInput] = useState('');
  const [shippingOptions, setShippingOptions] = useState(null);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
  const [shippingError, setShippingError] = useState(null);

  // Sincroniza parâmetros quando o produto muda e registra telemetria
  useEffect(() => {
    setSelectedImageIndex(0);
    setQuantity(1);
    setShippingOptions(null);
    setShippingError(null);
    if (product.colors && product.colors.length > 0) {
      setSelectedColor(product.colors[0]);
    }
    if (product.sizes && product.sizes.length > 0) {
      setSelectedSize(product.sizes[0]);
    }

    if (product.id || currentParam) {
      analyticsService.trackProductView(
        product.id || currentParam, 
        product.name, 
        product.category || 'camisa', 
        product.fit || 'boxy'
      );
      analyticsService.trackPageView('produto_detalhe');
    }
  }, [currentParam, product.id, product.name, product.category, product.fit]);

  const handlePrevImage = () => {
    setSelectedImageIndex((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setSelectedImageIndex((prev) => (prev === product.images.length - 1 ? 0 : prev + 1));
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
    if (onAddToCart) {
      onAddToCart(product, selectedSize, quantity, selectedColor);
    }
    setIsAddedFeedback(true);
    setTimeout(() => setIsAddedFeedback(false), 2500);
  };

  const installmentsCount = product.installments || 3;
  const installmentValue = (product.price / installmentsCount).toFixed(2);

  return (
    <main className={styles.container}>
      {/* NAVEGAÇÃO BREADCRUMB FUNCIONAL E VISÍVEL */}
      <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
        <Link to="/" className={styles.breadcrumbLink}>HOME</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <Link to="/catalogo" className={styles.breadcrumbLink}>CATÁLOGO</Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbActive}>{product.name.toUpperCase()}</span>
      </nav>

      {/* GRADE PRINCIPAL: GALERIA + INFOS DE COMPRA */}
      <div className={styles.productGrid}>
        {/* GALERIA DE IMAGENS COM CARROSSEL E SETAS */}
        <section className={styles.gallerySection} aria-label="Galeria de fotos do produto">
          <div className={styles.mainImageWrapper}>
            <button onClick={handlePrevImage} className={`${styles.navArrow} ${styles.prevArrow}`} aria-label="Imagem anterior">
              &#10094;
            </button>
            <img 
              src={product.images[selectedImageIndex]} 
              alt={`${product.name} - Imagem ${selectedImageIndex + 1}`} 
              className={styles.mainImage}
            />
            <button onClick={handleNextImage} className={`${styles.navArrow} ${styles.nextArrow}`} aria-label="Próxima imagem">
              &#10095;
            </button>
          </div>

          <div className={styles.thumbnailsList}>
            {product.images.map((img, idx) => (
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
              <span className={styles.fitBadge}>{product.fit}</span>
              <span className={styles.dropBadge}>{product.drop}</span>
            </div>
            <h1 className={styles.title}>{product.name}</h1>
            <div className={styles.priceContainer}>
              <span className={styles.price}>R$ {product.price.toFixed(2)}</span>
              <span className={styles.installments}>
                ou {installmentsCount}x de R$ {installmentValue} sem juros
              </span>
            </div>
          </div>

          {/* SELEÇÃO DE COR (PALETA STREETWEAR) */}
          <div className={styles.selectorGroup}>
            <div className={styles.labelRow}>
              <span className={styles.groupLabel}>
                COR: <strong className={styles.highlightedValue}>{selectedColor?.name?.toUpperCase()}</strong>
              </span>
            </div>
            <div className={styles.colorsGrid}>
              {product.colors?.map((col) => {
                const isSelected = selectedColor?.id === col.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    className={`${styles.colorSwatchBtn} ${isSelected ? styles.activeColorSwatch : ''}`}
                    onClick={() => setSelectedColor(col)}
                    aria-label={`Selecionar cor ${col.name}`}
                    title={col.name}
                  >
                    <span 
                      className={styles.colorDot} 
                      style={{ backgroundColor: col.hex }} 
                    />
                    <span className={styles.colorBtnText}>{col.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SELEÇÃO DE TAMANHO */}
          <div className={styles.selectorGroup}>
            <div className={styles.labelRow}>
              <span className={styles.groupLabel}>
                TAMANHO: <strong className={styles.highlightedValue}>{selectedSize}</strong>
              </span>
              <button 
                type="button"
                className={styles.textLink} 
                onClick={() => setOpenAccordion('measures')}
              >
                Guia de Medidas
              </button>
            </div>
            <div className={styles.sizesGrid}>
              {product.sizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`${styles.sizeBtn} ${selectedSize === size ? styles.activeSize : ''}`}
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* SELEÇÃO DE QUANTIDADE E AÇÕES DE COMPRA */}
          <div className={styles.actionGroup}>
            <div className={styles.quantityPicker}>
              <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))} aria-label="Diminuir quantidade">-</button>
              <span>{String(quantity).padStart(2, '0')}</span>
              <button type="button" onClick={() => setQuantity(q => q + 1)} aria-label="Aumentar quantidade">+</button>
            </div>

            <button 
              type="button"
              onClick={handleAddToCart}
              className={`${styles.addToCartBtn} ${isAddedFeedback ? styles.addToCartAdded : ''}`}
            >
              {isAddedFeedback 
                ? `✓ ADICIONADO (${quantity}x ${selectedSize} • ${selectedColor?.name})` 
                : `ADICIONAR AO CARRINHO (${quantity}x ${selectedSize})`}
            </button>

            <button 
              type="button"
              className={`${styles.favoriteBtn} ${isFavorite ? styles.activeFavorite : ''}`}
              onClick={() => setIsFavorite(!isFavorite)}
              aria-label="Adicionar aos favoritos"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.72-8.72 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
          </div>

          {/* CÁLCULO DE FRETE COMPACTO */}
          <div className={styles.shippingCompactSection}>
            <div className={styles.shippingHeaderRow}>
              <div className={styles.shippingHeaderTitle}>
                <Truck size={14} className={styles.toolIcon} />
                <span className={styles.groupLabel}>CALCULAR FRETE</span>
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

          {/* ACCORDIONS DE INFORMAÇÕES TÉCNICAS (COM ANIMAÇÃO SUAVE E SEM QUEBRA DE LAYOUT) */}
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
                      <p>{product.description}</p>
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
                          {product.sizeChart.map((row) => (
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
                        {product.careInstructions.map((instruction, idx) => (
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

      {/* SEÇÃO DEDICADA DE AVALIAÇÕES / SOCIAL PROOF DA COMUNIDADE */}
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
          {product.reviews.map((rev) => (
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
