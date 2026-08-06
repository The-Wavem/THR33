import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, 
  ArrowRight, 
  ShoppingBag, 
  Check, 
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  Bell
} from 'lucide-react';
import { carouselSlides, verticalProducts } from '../../data/homeData';
import styles from './HomeContent.module.css';

export function HomeContent({ onOpenCatalogo, onAddToCart }) {
  // Carousel State
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  // Quick Size Selections
  const [selectedSizes, setSelectedSizes] = useState({
    'v-prod-1': 'M',
    'v-prod-2': 'G',
    'v-prod-3': 'M',
    'v-prod-4': 'G'
  });

  // Hover and Tilt States
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tilts, setTilts] = useState({});

  // Interatividades & Modais
  const [wishlistSaved, setWishlistSaved] = useState({});
  const [emailInput, setEmailInput] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [restockModal, setRestockModal] = useState(false);
  const [restockRequested, setRestockRequested] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(null);
  const [activeMoodboardPhoto, setActiveMoodboardPhoto] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 6500);
    return () => clearInterval(timer);
  }, [currentSlideIndex]);

  const nextSlide = () => {
    setDirection(1);
    setCurrentSlideIndex((prev) => (prev + 1) % carouselSlides.length);
  };

  const prevSlide = () => {
    setDirection(-1);
    setCurrentSlideIndex((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length);
  };

  const toggleWishlist = (id) => {
    setWishlistSaved(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCardMouseMove = (id, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 8;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -8;
    setTilts(prev => ({ ...prev, [id]: { x, y } }));
  };

  const handleCardMouseLeave = (id) => {
    setHoveredCard(null);
    setTilts(prev => ({ ...prev, [id]: { x: 0, y: 0 } }));
  };

  const handleQuickAdd = (prod) => {
    const size = selectedSizes[prod.id] || 'M';
    if (onAddToCart) {
      onAddToCart({
        id: prod.id,
        title: prod.title,
        selectedSize: size,
        price: prod.price
      });
    }
    setAddedFeedback(`${prod.title} (${size}) ADICIONADO!`);
    setTimeout(() => setAddedFeedback(null), 3000);
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (emailInput.trim()) {
      setEmailSubmitted(true);
      setTimeout(() => {
        setEmailSubmitted(false);
        setEmailInput('');
      }, 4000);
    }
  };

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir < 0 ? '100%' : '-100%', opacity: 0 })
  };

  return (
    <div className={styles.container}>
      {/* Toast Feedback */}
      <AnimatePresence>
        {addedFeedback && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={styles.toast}
          >
            <Check size={16} />
            <span>{addedFeedback}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.wrapper}>
        {/* SECTION 1: HERO CAROUSEL */}
        <section className={styles.heroSection}>
          <div className={styles.heroBox}>
            <AnimatePresence initial={false} custom={direction}>
              <motion.div 
                key={carouselSlides[currentSlideIndex].id}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ x: { type: "spring", stiffness: 220, damping: 26 }, opacity: { duration: 0.3 } }}
                className={styles.slideImageWrapper}
              >
                <img 
                  src={carouselSlides[currentSlideIndex].image} 
                  alt={carouselSlides[currentSlideIndex].title}
                  className={styles.slideImage}
                />
                <div className={styles.slideVignette} />
              </motion.div>
            </AnimatePresence>

            <div className={styles.heroTopTagBar}>
              <span className={styles.tagBadge}>{carouselSlides[currentSlideIndex].tag}</span>
              <span className={styles.subBadge}>{carouselSlides[currentSlideIndex].sub}</span>
            </div>

            <div className={styles.heroContentBlock}>
              <div className={styles.heroCard}>
                <h1 className={styles.heroTitle}>THR33: THE STREETS ARE OURS</h1>
                <p className={styles.heroCaption}>{carouselSlides[currentSlideIndex].caption}</p>
                <div className={styles.heroButtons}>
                  <button onClick={onOpenCatalogo} className={styles.btnPrimary}>
                    <span>EXPLORAR CATÁLOGO</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.heroControls}>
              <div className={styles.indicators}>
                {carouselSlides.map((_, idx) => (
                  <button 
                    key={idx}
                    onClick={() => {
                      setDirection(idx > currentSlideIndex ? 1 : -1);
                      setCurrentSlideIndex(idx);
                    }}
                    className={idx === currentSlideIndex ? styles.indicatorActive : styles.indicatorInactive}
                  />
                ))}
              </div>
              <div className={styles.arrows}>
                <button onClick={prevSlide} className={styles.btnArrow}><ChevronLeft size={16} /></button>
                <button onClick={nextSlide} className={styles.btnArrow}><ChevronRight size={16} /></button>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: LANÇAMENTOS GRID */}
        <section className={styles.gridSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionHeaderLeft}>
              <span className={styles.dotPulse} />
              <h2>LANÇAMENTOS RECENTES // COMPRE AGORA</h2>
            </div>
            <span className={styles.sectionSubtext}>[DROP 02 EXCLUSIVO • ESTOQUE LIMITADO]</span>
          </div>

          <div className={styles.productGrid}>
            {verticalProducts.map((prod) => {
              const isHovered = hoveredCard === prod.id;
              const cardTilt = tilts[prod.id] || { x: 0, y: 0 };
              const currentSize = selectedSizes[prod.id] || 'M';

              return (
                <div 
                  key={prod.id}
                  onMouseEnter={() => setHoveredCard(prod.id)}
                  onMouseMove={(e) => handleCardMouseMove(prod.id, e)}
                  onMouseLeave={() => handleCardMouseLeave(prod.id)}
                  style={{
                    transform: isHovered 
                      ? `perspective(1000px) rotateX(${cardTilt.y}deg) rotateY(${cardTilt.x}deg) translateY(-4px)`
                      : 'none'
                  }}
                  className={`${styles.productCard} ${isHovered ? styles.productCardHovered : ''}`}
                >
                  <div className={styles.cardTop}>
                    <span className={styles.prodTag}>{prod.tag}</span>
                    <button onClick={() => toggleWishlist(prod.id)} className={styles.btnWishlist}>
                      <Star size={16} className={wishlistSaved[prod.id] ? styles.starFilled : ''} />
                    </button>
                  </div>

                  <div onClick={onOpenCatalogo} className={styles.imageFrame}>
                    <img src={prod.image} alt={prod.title} className={styles.prodImage} />
                    <div className={styles.priceBadge}>{prod.price}</div>

                    <AnimatePresence>
                      {isHovered && (
                        <motion.div 
                          initial={{ y: '100%' }}
                          animate={{ y: 0 }}
                          exit={{ y: '100%' }}
                          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                          className={styles.sizeBar}
                        >
                          <span className={styles.sizeLabel}>SELECIONE O TAMANHO:</span>
                          <div className={styles.sizeButtons}>
                            {prod.sizes.map((sz) => (
                              <button
                                key={sz}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSizes(prev => ({ ...prev, [prod.id]: sz }));
                                }}
                                className={currentSize === sz ? styles.sizeBtnActive : styles.sizeBtn}
                              >
                                {sz}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className={styles.cardDetails}>
                    <div>
                      <h3 className={styles.prodTitle}>{prod.title}</h3>
                      <p className={styles.prodSub}>{prod.sub}</p>
                    </div>
                    <button 
                      onClick={() => handleQuickAdd(prod)}
                      className={isHovered ? styles.btnBuyHovered : styles.btnBuy}
                    >
                      <ShoppingBag size={14} />
                      <span>[COMPRAR AGORA]</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION 3: MANIFESTO & BENTO GRID */}
        <section className={styles.bentoSection}>
          <div className={styles.bentoHeader}>
            <div>
              <span className={styles.bentoPreTitle}>[MANIFESTO & ARQUIVO HISTÓRICO]</span>
              <h2>CULTURA & PROCESSO</h2>
            </div>
            <div className={styles.bentoBadge}>
              <span className={styles.greenPulse} />
              <span>● PROPRIEDADE THR33 ★ FOR THE FEW</span>
            </div>
          </div>

          <div className={styles.bentoGrid}>
            {/* MANIFESTO CARD */}
            <div className={styles.manifestoCard}>
              <div>
                <div className={styles.manifestoTag}>
                  <span className={styles.amberDot} />
                  <span>● MANIFESTO // R.U.A</span>
                </div>
                <h3 className={styles.manifestoTitle}>FOR THE FEW.</h3>
                <p className={styles.manifestoSub}>A RUA NÃO É APENAS CENÁRIO, É NOSSO ATELIÊ.</p>
                <p className={styles.manifestoBody}>
                  Construímos modelagens brutas para suportar o ritmo urbano e permanecer no tempo. Não produzimos em massa. Cada peça carrega número de série e acabamento manual.
                </p>
              </div>
              <div className={styles.manifestoFooter}>
                <span>SÃO PAULO // 2026</span>
                <span>[THR33 ATELIÊ ORIGINAL]</span>
              </div>
            </div>

            {/* LIFESTYLE CARD */}
            <div className={styles.lifestyleCard}>
              <div 
                onClick={() => setActiveMoodboardPhoto({
                  title: 'ATITUDE & LIFESTYLE // ESTILO DE VIDA THR33',
                  url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=1200',
                  caption: 'DESATURATED 35MM FILM • SÃO PAULO NIGHT FLASH'
                })}
                className={styles.lifestyleFrame}
              >
                <img 
                  src="https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=1200" 
                  alt="ESTILO DE VIDA THR33"
                  className={styles.lifestyleImage}
                />
                <div className={styles.lifestyleTopTag}>FOR THE FEW</div>
                <div className={styles.lifestyleBottomLabel}>
                  <span className={styles.blackDot} />
                  <span>[ATITUDE & LIFESTYLE // ESTILO DE VIDA THR33]</span>
                </div>
              </div>
            </div>
          </div>

          {/* ARCHIVE & NEWSLETTER ROW */}
          <div className={styles.archiveRow}>
            <div className={styles.archiveCard}>
              <div className={styles.archiveHeader}>
                <span className={styles.archTag}>COLEÇÃO DE ARQUIVO</span>
                <span className={styles.archSub}>DROP 01</span>
              </div>
              <div className={styles.archiveFrame}>
                <img 
                  src="https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=600" 
                  alt="MOLETOM HEAVY OFF" 
                  className={styles.archImage}
                />
                <div className={styles.archOverlay}>
                  <div className={styles.archBadge}>
                    <span className={styles.archBadgeTitle}>DROPS PASSADOS // ARCHIVED (ESGOTADO)</span>
                    <span className={styles.archBadgeSub}>[SOLD OUT // FOR THE FEW]</span>
                  </div>
                </div>
              </div>
              <h4>MOLETOM HEAVY OFF</h4>
              <p className={styles.archSubText}>380GSM HEAVYWEIGHT • ED. PRIVADA</p>
              <button onClick={() => setRestockModal(true)} className={styles.btnRestock}>
                <Bell size={14} />
                <span>[SOLICITAR RESTOCK]</span>
              </button>
            </div>

            <div className={styles.newsletterCard}>
              <div>
                <div className={styles.newsTag}>
                  <Sparkles size={14} />
                  <span>DROP PROTOCOL // PRE-RELEASE</span>
                </div>
                <h3>ALERTAS EXCLUSIVOS DE DROP</h3>
                <p>Receba a senha de acesso e link direto 15 minutos antes da abertura oficial do estoque.</p>
              </div>

              <form onSubmit={handleEmailSubmit} className={styles.newsForm}>
                <input 
                  type="email" 
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="DIGITE SEU E-MAIL PARA ALERTAS EXCLUSIVOS DE DROP"
                  required
                />
                <button type="submit" className={styles.btnNews}>
                  <span>ENTRAR PARA OS POUCOS</span>
                  <ArrowRight size={16} />
                </button>
                {emailSubmitted && (
                  <div className={styles.newsSuccess}>
                    <Check size={16} />
                    <span>✓ CADASTRADO COM SUCESSO // VOCÊ RECEBERÁ O PROTOCOLO DE ACESSO</span>
                  </div>
                )}
              </form>
            </div>
          </div>
        </section>
      </div>

      {/* MODAIS (ACCESS VERIFICATION & RESTOCK) */}


      {/* RESTOCK MODAL */}
      <AnimatePresence>
        {restockModal && (
          <div className={styles.modalOverlay} onClick={() => setRestockModal(false)}>
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className={styles.modalBox}
            >
              <button onClick={() => setRestockModal(false)} className={styles.btnClose}><X size={16} /></button>
              <div className={styles.modalHeader}>
                <Bell size={16} />
                <span>RESTOCK PROTOCOL</span>
              </div>
              <h3>SOLICITAR RESTOCK // MOLETOM HEAVY OFF</h3>
              <p className={styles.modalText}>
                Edição esgotada. Insira seu e-mail para entrar na lista de espera prioritária em caso de nova tiragem.
              </p>
              {!restockRequested ? (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    setRestockRequested(true);
                    setTimeout(() => {
                      setRestockModal(false);
                      setRestockRequested(false);
                    }, 2000);
                  }}
                  className={styles.newsForm}
                >
                  <input type="email" placeholder="DIGITE SEU E-MAIL" required />
                  <button type="submit" className={styles.btnValidate}>
                    <span>REGISTRAR INTERESSE</span>
                  </button>
                </form>
              ) : (
                <div className={styles.modalSuccess}>
                  <Check size={18} />
                  <span>INTERESSE REGISTRADO COM SUCESSO!</span>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
