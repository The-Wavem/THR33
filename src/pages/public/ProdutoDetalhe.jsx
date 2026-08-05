import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  Star, 
  Truck, 
  ShieldCheck, 
  RefreshCw, 
  Check, 
  X,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Search
} from 'lucide-react';
import { productsData } from '../../data/productsData';
import styles from './ProdutoDetalhe.module.css';

export function ProdutoDetalhe({ onAddToCart }) {
  const { slug } = useParams();
  const navigate = useNavigate();

  const product = productsData.find(p => p.slug === slug) || productsData[0];

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState('M');
  const [activeTab, setActiveTab] = useState('descricao');
  const [isAddedFeedback, setIsAddedFeedback] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  
  // LIGHTBOX & HOVER ZOOM STATES
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const galleryList = product?.gallery || [product?.image, product?.hoverImage].filter(Boolean);

  useEffect(() => {
    if (product) {
      setSelectedImageIndex(0);
      if (product.sizes && product.sizes.length > 0) {
        setSelectedSize(product.sizes[0]);
      }
    }
  }, [slug, product]);

  // NAVEGAÇÃO DA GALERIA
  const handlePrevImage = useCallback(() => {
    setIsZoomed(false);
    setSelectedImageIndex((prev) => (prev === 0 ? galleryList.length - 1 : prev - 1));
  }, [galleryList.length]);

  const handleNextImage = useCallback(() => {
    setIsZoomed(false);
    setSelectedImageIndex((prev) => (prev === galleryList.length - 1 ? 0 : prev + 1));
  }, [galleryList.length]);

  // CÁLCULO DE COORDENADAS PARA O ZOOM
  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - left) / width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - top) / height) * 100));
    setMousePos({ x, y });
  };

  // NAVEGAÇÃO POR TECLADO (SETAS E ESC)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isLightboxOpen) return;
      if (e.key === 'ArrowLeft') handlePrevImage();
      if (e.key === 'ArrowRight') handleNextImage();
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
        setIsZoomed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, handlePrevImage, handleNextImage]);

  if (!product) {
    return (
      <div className={styles.notFoundContainer}>
        <h2>PEÇA NÃO ENCONTRADA // ARCHIVED</h2>
        <button onClick={() => navigate('/catalogo')} className={styles.btnBack}>
          VOLTAR AO CATÁLOGO
        </button>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart({ ...product, selectedSize });
    }
    setIsAddedFeedback(true);
    setTimeout(() => setIsAddedFeedback(false), 2500);
  };

  const currentImage = galleryList[selectedImageIndex] || product.image;

  return (
    <div className={styles.pdpContainer}>
      <div className={styles.wrapper}>
        
        {/* BREADCRUMB */}
        <div className={styles.breadcrumbBar}>
          <Link to="/" className={styles.breadLink}>HOME</Link>
          <span className={styles.breadSep}>/</span>
          <Link to="/catalogo" className={styles.breadLink}>CATÁLOGO</Link>
          <span className={styles.breadSep}>/</span>
          <strong className={styles.breadActive}>{product.title}</strong>
        </div>

        {/* MAIN PDP GRID */}
        <div className={styles.pdpGrid}>
          
          {/* LEFT: GALLERY */}
          <div className={styles.galleryColumn}>
            <div 
              className={styles.mainImageFrame}
              onClick={() => setIsLightboxOpen(true)}
              title="Clique para Maximizar e Navegar na Galeria"
            >
              <AnimatePresence mode="wait">
                <motion.img 
                  key={currentImage}
                  src={currentImage} 
                  alt={product.title}
                  initial={{ opacity: 0.4, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0.4 }}
                  transition={{ duration: 0.2 }}
                  className={styles.mainImage}
                />
              </AnimatePresence>

              <span className={styles.tagBadge}>{product.tag || 'FOR THE FEW'}</span>

              <div className={styles.zoomHint}>
                <ZoomIn size={14} />
                <span>EXPANDIR (FOTO {selectedImageIndex + 1}/{galleryList.length})</span>
              </div>
            </div>

            {/* THUMBNAILS */}
            {galleryList.length > 1 && (
              <div className={styles.thumbnailRow}>
                {galleryList.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={selectedImageIndex === idx ? styles.thumbActive : styles.thumbBtn}
                  >
                    <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: INFO PANEL */}
          <div className={styles.infoColumn}>
            <div className={styles.headerBlock}>
              <div className={styles.titleRow}>
                <h1 className={styles.productTitle}>{product.title}</h1>
                <button 
                  onClick={() => setIsWishlisted(!isWishlisted)} 
                  className={styles.wishlistBtn}
                  title="Guardar na Lista"
                >
                  <Star size={18} className={isWishlisted ? styles.starActive : ''} />
                </button>
              </div>
              <span className={styles.fabricSub}>{product.fabric}</span>
            </div>

            <div className={styles.priceBlock}>
              <strong className={styles.priceText}>{product.price}</strong>
              <span className={styles.installmentText}>
                OU 6X DE R$ {(product.priceNum / 6).toFixed(2)} SEM JUROS
              </span>
            </div>

            <div className={styles.sizeBlock}>
              <div className={styles.sizeHeader}>
                <span>TAMANHO DISPONÍVEL:</span>
                <strong className={styles.selectedSizeLabel}>({selectedSize})</strong>
              </div>
              <div className={styles.sizeGrid}>
                {product.sizes.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setSelectedSize(sz)}
                    className={selectedSize === sz ? styles.sizeActive : styles.sizeBtn}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleAddToCart} className={styles.btnAddToCart}>
              <ShoppingBag size={16} />
              <span>
                {isAddedFeedback 
                  ? `✓ ADICIONADO AO CARRINHO (${selectedSize})` 
                  : `ADICIONAR AO CARRINHO (${selectedSize})`}
              </span>
            </button>

            {/* TABS SYSTEM */}
            <div className={styles.tabsContainer}>
              <div className={styles.tabsHeader}>
                {[
                  { id: 'descricao', label: 'DESCRIÇÃO' },
                  { id: 'medidas', label: 'TABELA DE MEDIDAS' },
                  { id: 'cuidados', label: 'CUIDADOS' },
                  { id: 'politicas', label: 'POLÍTICAS' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={activeTab === tab.id ? styles.tabBtnActive : styles.tabBtn}
                  >
                    {activeTab === tab.id && (
                      <motion.div 
                        layoutId="activeTabIndicator"
                        className={styles.tabActiveBg}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className={styles.tabLabel}>{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className={styles.tabBody}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                  >
                    {activeTab === 'descricao' && (
                      <div className={styles.tabContent}>
                        <p className={styles.descParagraph}>
                          {product.description || 'Modelagem autêntica com caimento estruturado e fluido. Peça confeccionada em algodão pesado com tingimento industrial reverso e toque suave.'}
                        </p>
                        <ul className={styles.specList}>
                          <li><strong>MODELAGEM:</strong> {product.fit || 'BOXY OVERSIZED'}</li>
                          <li><strong>COMPOSIÇÃO:</strong> {product.fabric}</li>
                          <li><strong>ORIGEM:</strong> FABRICADO NO BRASIL // ATELIÊ R.U.A</li>
                        </ul>
                      </div>
                    )}

                    {activeTab === 'medidas' && (
                      <div className={styles.tabContent}>
                        <div className={styles.measurementsGrid}>
                          <div className={styles.tableWrapper}>
                            <table className={styles.measureTable}>
                              <thead>
                                <tr>
                                  <th>TAM</th>
                                  <th>LARGURA</th>
                                  <th>COMPRIMENTO</th>
                                  <th>MANGA</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(product.measurements?.chart || [
                                  { size: 'P', length: '72 cm', width: '56 cm', sleeve: '22 cm' },
                                  { size: 'M', length: '74 cm', width: '59 cm', sleeve: '23 cm' },
                                  { size: 'G', length: '76 cm', width: '62 cm', sleeve: '24 cm' },
                                  { size: 'GG', length: '78 cm', width: '65 cm', sleeve: '25 cm' },
                                ]).map((row) => (
                                  <tr 
                                    key={row.size} 
                                    className={selectedSize === row.size ? styles.rowHighlight : ''}
                                  >
                                    <td><strong>{row.size}</strong></td>
                                    <td>{row.width}</td>
                                    <td>{row.length}</td>
                                    <td>{row.sleeve}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'cuidados' && (
                      <div className={styles.tabContent}>
                        <ul className={styles.careList}>
                          {(product.care || [
                            'Lavar à mão ou máquina em ciclo delicado com água fria.',
                            'Não utilizar alvejante ou branqueadores ópticos.',
                            'Secar à sombra em varal horizontal.',
                            'Passar do avesso em temperatura média (máx 150°C).'
                          ]).map((item, idx) => (
                            <li key={idx}>
                              <Check size={14} className={styles.checkIcon} />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {activeTab === 'politicas' && (
                      <div className={styles.tabContent}>
                        <div className={styles.policiesList}>
                          <div className={styles.policyItem}>
                            <Truck size={16} />
                            <div>
                              <strong>FRETE TÁTICO EXPRESSO</strong>
                              <p>Envio prioritário em embalagem selada anti-violação.</p>
                            </div>
                          </div>
                          <div className={styles.policyItem}>
                            <ShieldCheck size={16} />
                            <div>
                              <strong>GARANTIA THR33 AUTHENTIC</strong>
                              <p>Acompanha número de série exclusivo e selo da marca.</p>
                            </div>
                          </div>
                          <div className={styles.policyItem}>
                            <RefreshCw size={16} />
                            <div>
                              <strong>TROCA SIMPLIFICADA</strong>
                              <p>30 dias para solicitação de troca com etiqueta intacta.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* FULLSCREEN LIGHTBOX MODAL WITH HOVER ZOOM LENS */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.lightboxOverlay}
            onClick={() => {
              setIsLightboxOpen(false);
              setIsZoomed(false);
            }}
          >
            <motion.div 
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={styles.lightboxModal}
              onClick={(e) => e.stopPropagation()}
            >
              {/* CLOSE BUTTON */}
              <button 
                onClick={() => {
                  setIsLightboxOpen(false);
                  setIsZoomed(false);
                }} 
                className={styles.closeLightboxBtn}
                title="Fechar (Esc)"
              >
                <X size={18} />
              </button>

              {/* CAROUSEL ARROW PREV */}
              {galleryList.length > 1 && (
                <button 
                  onClick={handlePrevImage} 
                  className={styles.lightboxArrowLeft}
                  title="Foto Anterior (Seta Esquerda)"
                >
                  <ChevronLeft size={22} />
                </button>
              )}

              {/* IMAGE CONTAINER WITH COORDINATE HOVER ZOOM */}
              <div 
                className={styles.lightboxImageContainer}
                onMouseEnter={() => setIsZoomed(true)}
                onMouseLeave={() => setIsZoomed(false)}
                onMouseMove={handleMouseMove}
              >
                <AnimatePresence mode="wait">
                  <motion.img 
                    key={selectedImageIndex}
                    src={currentImage} 
                    alt={product.title} 
                    initial={{ opacity: 0.3 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0.3 }}
                    transition={{ duration: 0.15 }}
                    className={styles.lightboxImage}
                    style={{
                      transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
                      transform: isZoomed ? 'scale(2.2)' : 'scale(1)'
                    }}
                  />
                </AnimatePresence>

                {/* ZOOM STATUS BADGE */}
                <div className={isZoomed ? styles.zoomBadgeActive : styles.zoomBadgeHint}>
                  <Search size={12} />
                  <span>
                    {isZoomed 
                      ? `LENTE TÁTIL 2.2X // [${Math.round(mousePos.x)}%, ${Math.round(mousePos.y)}%]` 
                      : 'PASSE O MOUSE PARA AMPLIAR O TECIDO'}
                  </span>
                </div>
              </div>

              {/* CAROUSEL ARROW NEXT */}
              {galleryList.length > 1 && (
                <button 
                  onClick={handleNextImage} 
                  className={styles.lightboxArrowRight}
                  title="Próxima Foto (Seta Direita)"
                >
                  <ChevronRight size={22} />
                </button>
              )}

              {/* FOOTER BAR */}
              <div className={styles.lightboxFooter}>
                <div className={styles.lightboxDetails}>
                  <strong>{product.title}</strong>
                  <span>{product.fabric}</span>
                </div>
                {galleryList.length > 1 && (
                  <span className={styles.lightboxCounter}>
                    FOTO [{String(selectedImageIndex + 1).padStart(2, '0')} / {String(galleryList.length).padStart(2, '0')}]
                  </span>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default ProdutoDetalhe;
