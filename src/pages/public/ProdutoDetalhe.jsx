import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  Star, 
  Truck, 
  ShieldCheck, 
  RotateCcw, 
  Check, 
  X,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus
} from 'lucide-react';
import { productsData } from '../../data/productsData';
import { buttonTactile } from '../../utils/motionVariants';
import styles from './ProdutoDetalhe.module.css';

export function ProdutoDetalhe({ onAddToCart }) {
  const { slug } = useParams();
  const navigate = useNavigate();

  const product = productsData.find(p => p.slug === slug) || productsData[0];

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState('M');
  const [quantity, setQuantity] = useState(1);
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
      setQuantity(1);
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
      onAddToCart(product, selectedSize, quantity);
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
                <motion.button 
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setIsWishlisted(!isWishlisted)} 
                  className={styles.wishlistBtn}
                  title="Guardar na Lista"
                >
                  <Star size={18} className={isWishlisted ? styles.starActive : ''} />
                </motion.button>
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

            {/* 1. CONTROLE DE QUANTIDADE TÁTICO & BOTÃO ADICIONAR */}
            <div className={styles.actionRow}>
              <div className={styles.quantitySelector}>
                <motion.button 
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                  className={styles.btnQty}
                  title="Diminuir Quantidade"
                >
                  <Minus size={14} />
                </motion.button>
                <span className={styles.qtyNumDisplay}>{String(quantity).padStart(2, '0')}</span>
                <motion.button 
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setQuantity(prev => prev + 1)}
                  className={styles.btnQty}
                  title="Aumentar Quantidade"
                >
                  <Plus size={14} />
                </motion.button>
              </div>

              <motion.button 
                variants={buttonTactile}
                initial="rest"
                whileHover="hover"
                whileTap="tap"
                onClick={handleAddToCart} 
                className={styles.btnAddToCart}
              >
                <ShoppingBag size={16} />
                <span>
                  {isAddedFeedback 
                    ? `✓ ADICIONADO (${quantity}x ${selectedSize})` 
                    : `ADICIONAR AO CARRINHO (${quantity}x ${selectedSize})`}
                </span>
              </motion.button>
            </div>

            {/* 2. SISTEMA DE ABAS BRUTALISTA REFINADO */}
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
                    className={activeTab === tab.id ? styles.tabActive : styles.tabBtn}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className={styles.tabContent}>
                {activeTab === 'descricao' && (
                  <div>
                    <p className={styles.tabParagraph}>{product.description}</p>
                    <ul className={styles.specList}>
                      <li>▪ <strong>MODELAGEM:</strong> BOXY OVERSIZED</li>
                      <li>▪ <strong>GRAMATURA:</strong> 280GSM HEAVYWEIGHT</li>
                      <li>▪ <strong>GOLA:</strong> CANELADA REFORÇADA 3CM</li>
                      <li>▪ <strong>PRODUÇÃO:</strong> EDIÇÃO LIMITADA NUMERADA</li>
                    </ul>
                  </div>
                )}

                {activeTab === 'medidas' && (
                  <div className={styles.tableWrapper}>
                    <table className={styles.measureTable}>
                      <thead>
                        <tr>
                          <th>TAMANHO</th>
                          <th>TÓRAX (CM)</th>
                          <th>COMPRIMENTO (CM)</th>
                          <th>MANGA (CM)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr><td>P</td><td>56</td><td>72</td><td>22</td></tr>
                        <tr><td>M</td><td>59</td><td>75</td><td>23</td></tr>
                        <tr><td>G</td><td>62</td><td>78</td><td>24</td></tr>
                        <tr><td>GG</td><td>65</td><td>81</td><td>25</td></tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'cuidados' && (
                  <ul className={styles.specList}>
                    <li>▪ <strong>LAVAGEM:</strong> Lavar à mão ou no ciclo delicado com água fria.</li>
                    <li>▪ <strong>ALVEJANTE:</strong> Não utilizar produtos à base de cloro.</li>
                    <li>▪ <strong>PASSADOR:</strong> Passar do avesso em temperatura média.</li>
                    <li>▪ <strong>SECAGEM:</strong> Secar à sombra para conservar o pigmento original.</li>
                  </ul>
                )}

                {activeTab === 'politicas' && (
                  <ul className={styles.specList}>
                    <li>▪ <strong>FRETE DESPACHO:</strong> Envio expresso prioritário em até 48h úteis.</li>
                    <li>▪ <strong>POLÍTICA DE TROCAS:</strong> 30 dias após recebimento mantendo o lacre.</li>
                    <li>▪ <strong>GARANTIA R.U.A:</strong> Autenticidade garantida THR33 ATELIÊ.</li>
                  </ul>
                )}
              </div>
            </div>

            {/* 3. BARRA DE CONFIANÇA & SELOS (TRUST BADGES GRID) */}
            <div className={styles.trustBannerGrid}>
              <div className={styles.trustItem}>
                <Truck size={18} className={styles.trustIcon} />
                <div className={styles.trustTextGroup}>
                  <strong>FRETE EXPRESSO</strong>
                  <span>DESPACHO TÁTICO 48H</span>
                </div>
              </div>

              <div className={styles.trustDivider} />

              <div className={styles.trustItem}>
                <ShieldCheck size={18} className={styles.trustIcon} />
                <div className={styles.trustTextGroup}>
                  <strong>PAGAMENTO SECURE</strong>
                  <span>PIX OU ATÉ 6X</span>
                </div>
              </div>

              <div className={styles.trustDivider} />

              <div className={styles.trustItem}>
                <RotateCcw size={18} className={styles.trustIcon} />
                <div className={styles.trustTextGroup}>
                  <strong>30 DIAS DE TROCA</strong>
                  <span>GARANTIA TOTAL</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* LIGHTBOX MODAL DA GALERIA */}
      <AnimatePresence>
        {isLightboxOpen && (
          <div className={styles.lightboxOverlay} onClick={() => { setIsLightboxOpen(false); setIsZoomed(false); }}>
            <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => { setIsLightboxOpen(false); setIsZoomed(false); }} 
                className={styles.btnCloseLightbox}
                title="Fechar (ESC)"
              >
                <X size={20} />
              </button>

              <button onClick={handlePrevImage} className={styles.lightboxNavLeft}>
                <ChevronLeft size={24} />
              </button>

              <div 
                className={`${styles.lightboxImageWrapper} ${isZoomed ? styles.zoomedActive : ''}`}
                onMouseMove={handleMouseMove}
                onClick={() => setIsZoomed(!isZoomed)}
              >
                <img 
                  src={currentImage} 
                  alt={product.title} 
                  className={styles.lightboxImage}
                  style={isZoomed ? {
                    transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
                    transform: 'scale(2.4)'
                  } : {}}
                />
              </div>

              <button onClick={handleNextImage} className={styles.lightboxNavRight}>
                <ChevronRight size={24} />
              </button>

              <div className={styles.lightboxFooter}>
                <span>{product.title} // IMAGEM {selectedImageIndex + 1} DE {galleryList.length}</span>
                <span className={styles.zoomToggleHint}>
                  {isZoomed ? 'CLIQUE PARA REDUZIR' : 'CLIQUE EM QUALQUER PONTO PARA ZOOM LUPA (2.4X)'}
                </span>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default ProdutoDetalhe;
