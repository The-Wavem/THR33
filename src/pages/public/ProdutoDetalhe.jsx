import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PRODUCTS_DATA } from '../../data/productsData';
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
    { id: 1, author: "Lucas M.", rating: 5, date: "02/08/2026", comment: "Caimento impecável! O tecido é bem encorpado e a gola é firme." },
    { id: 2, author: "Gabriel S.", rating: 5, date: "28/07/2026", comment: "Modelagem Boxy de verdade. Chegou muito rápido aqui em Curitiba." }
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
    description: matched.description || DEFAULT_PRODUCT.description
  } : DEFAULT_PRODUCT;

  // Estados de Interação
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] || 'M');
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [openAccordion, setOpenAccordion] = useState('measures'); // 'description', 'measures', 'care', 'reviews'
  const [isAddedFeedback, setIsAddedFeedback] = useState(false);
  
  // Cupom
  const [couponCode, setCouponCode] = useState('');
  const [couponMessage, setCouponMessage] = useState(null);

  // Sincroniza tamanho padrão quando o produto muda
  useEffect(() => {
    setSelectedImageIndex(0);
    setQuantity(1);
    if (product.sizes && product.sizes.length > 0) {
      setSelectedSize(product.sizes[0]);
    }
  }, [currentParam]);

  const handlePrevImage = () => {
    setSelectedImageIndex((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setSelectedImageIndex((prev) => (prev === product.images.length - 1 ? 0 : prev + 1));
  };

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    if (couponCode.trim().toUpperCase() === 'FORTHEFEW') {
      setCouponMessage({ type: 'success', text: 'Cupom aplicado: 10% de desconto!' });
    } else {
      setCouponMessage({ type: 'error', text: 'Cupom inválido ou expirado.' });
    }
  };

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(product, selectedSize, quantity);
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

          {/* SELEÇÃO DE TAMANHO */}
          <div className={styles.selectorGroup}>
            <div className={styles.labelRow}>
              <span className={styles.groupLabel}>TAMANHO DISPONÍVEL</span>
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
              {isAddedFeedback ? `✓ ADICIONADO (${quantity}x ${selectedSize})` : `ADICIONAR AO CARRINHO (${quantity}x ${selectedSize})`}
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

          {/* TESTADOR DE CUPOM DE DESCONTO */}
          <div className={styles.couponSection}>
            <span className={styles.groupLabel}>TESTAR CUPOM DE DESCONTO</span>
            <form onSubmit={handleApplyCoupon} className={styles.couponForm}>
              <input 
                type="text" 
                placeholder="Ex: FORTHEFEW" 
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className={styles.couponInput}
              />
              <button type="submit" className={styles.couponBtn}>APLICAR</button>
            </form>
            {couponMessage && (
              <p className={couponMessage.type === 'success' ? styles.successMsg : styles.errorMsg}>
                {couponMessage.text}
              </p>
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
              >
                <span>DESCRIÇÃO E DETALHES</span>
                <span className={styles.accordionSign}>{openAccordion === 'description' ? '−' : '+'}</span>
              </button>
              {openAccordion === 'description' && (
                <div className={styles.accordionBody}>
                  <p>{product.description}</p>
                </div>
              )}
            </div>

            {/* Tabela de Medidas */}
            <div className={styles.accordionItem}>
              <button 
                type="button"
                className={styles.accordionHeader} 
                onClick={() => setOpenAccordion(openAccordion === 'measures' ? null : 'measures')}
              >
                <span>TABELA DE MEDIDAS (CM)</span>
                <span className={styles.accordionSign}>{openAccordion === 'measures' ? '−' : '+'}</span>
              </button>
              {openAccordion === 'measures' && (
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
              )}
            </div>

            {/* Cuidados com a Peça */}
            <div className={styles.accordionItem}>
              <button 
                type="button"
                className={styles.accordionHeader} 
                onClick={() => setOpenAccordion(openAccordion === 'care' ? null : 'care')}
              >
                <span>CUIDADOS COM A PEÇA</span>
                <span className={styles.accordionSign}>{openAccordion === 'care' ? '−' : '+'}</span>
              </button>
              {openAccordion === 'care' && (
                <div className={styles.accordionBody}>
                  <ul className={styles.careList}>
                    {product.careInstructions.map((instruction, idx) => (
                      <li key={idx}>{instruction}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Avaliações de Clientes */}
            <div className={styles.accordionItem}>
              <button 
                type="button"
                className={styles.accordionHeader} 
                onClick={() => setOpenAccordion(openAccordion === 'reviews' ? null : 'reviews')}
              >
                <span>AVALIAÇÕES DOS CLIENTES ({product.reviews.length})</span>
                <span className={styles.accordionSign}>{openAccordion === 'reviews' ? '−' : '+'}</span>
              </button>
              {openAccordion === 'reviews' && (
                <div className={styles.accordionBody}>
                  <div className={styles.reviewsList}>
                    {product.reviews.map((rev) => (
                      <div key={rev.id} className={styles.reviewCard}>
                        <div className={styles.reviewHeader}>
                          <strong>{rev.author}</strong>
                          <span className={styles.reviewDate}>{rev.date}</span>
                        </div>
                        <p className={styles.reviewComment}>"{rev.comment}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default ProdutoDetalhe;
