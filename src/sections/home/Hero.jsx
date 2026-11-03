import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../../components/ui/Button';
import largoDaOrdemBg from '@assets/images/largo-da-ordem-bg.jpeg';
import largoDaOrdemBg2 from '@assets/images/largo-da-ordem-bg2.jpeg';
import styles from './Hero.module.css';

const DEFAULT_HERO_SLIDES = [
  {
    id: 'slide_1',
    title: 'A RUA É NOSSA ESSÊNCIA',
    subtitle: 'LEAK TWO — DROP EXCLUSIVO',
    badge: 'NOVO DROP',
    bgImage: largoDaOrdemBg,
    active: true,
    buttons: [
      { id: 'btn_1', text: 'VER LANÇAMENTOS', link: '/catalogo', variant: 'primary' },
      { id: 'btn_2', text: 'CONHEÇA A MARCA', link: '/sobre', variant: 'secondary' }
    ]
  },
  {
    id: 'slide_2',
    title: 'FOR THE FEW.',
    subtitle: 'STREETWEAR URBANO & CURITIBANO',
    badge: 'COLEÇÃO 2026',
    bgImage: largoDaOrdemBg2,
    active: true,
    buttons: [
      { id: 'btn_1', text: 'EXPLORAR CATÁLOGO', link: '/catalogo', variant: 'primary' },
      { id: 'btn_2', text: 'CONHEÇA A MARCA', link: '/sobre', variant: 'secondary' }
    ]
  }
];

const AUTOPLAY_DELAY = 5000; // 5 segundos por slide

// Fallback circular brutalista para modelos 3D ou mídia em carregamento no Hero
export function HeroBadgeFallback() {
  return (
    <div className={styles.modelFallbackPulse} aria-hidden="true">
      <div className={styles.modelFallbackRing} />
      <span className={styles.modelFallbackCode}>THR33 // 3D</span>
    </div>
  );
}

// Animação refinada para o background do slide
const bgVariants = {
  initial: {
    opacity: 0,
    scale: 1.04
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1]
    }
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1]
    }
  }
};

// Animação de entrada e saída dos textos
const textVariants = {
  initial: {
    opacity: 0,
    y: 16
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay: 0.08,
      ease: [0.16, 1, 0.3, 1]
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.25,
      ease: 'easeIn'
    }
  }
};

export function Hero({ bannerData, isLoading = false, children }) {
  const [slides, setSlides] = useState(DEFAULT_HERO_SLIDES);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isHovered, setIsHovered] = useState(false);
  const [timerKey, setTimerKey] = useState(0);

  // Sincroniza dados da prop bannerData recebida do Firestore
  useEffect(() => {
    if (!bannerData) return;

    if (Array.isArray(bannerData.slides) && bannerData.slides.length > 0) {
      const active = bannerData.slides.filter((s) => s.active !== false);
      if (active.length > 1) {
        setSlides(active);
      } else if (active.length === 1) {
        const remaining = DEFAULT_HERO_SLIDES.filter((ds) => ds.id !== active[0].id);
        setSlides([active[0], ...remaining]);
      }
    } else if (Array.isArray(bannerData) && bannerData.length > 0) {
      const active = bannerData.filter((s) => s.active !== false);
      if (active.length > 1) {
        setSlides(active);
      } else if (active.length === 1) {
        const remaining = DEFAULT_HERO_SLIDES.filter((ds) => ds.id !== active[0].id);
        setSlides([active[0], ...remaining]);
      }
    } else if (bannerData.title || bannerData.mediaUrl || bannerData.bgImage) {
      setSlides([
        {
          id: bannerData.id || 'hero_banner_1',
          title: bannerData.title || 'THR33 STREETWEAR',
          subtitle: bannerData.subtitle || 'A RUA É NOSSA ESSÊNCIA',
          badge: bannerData.badge || 'DESTAQUE',
          bgImage: bannerData.mediaUrl || bannerData.bgImage || DEFAULT_HERO_SLIDES[0].bgImage,
          type: bannerData.type || 'image',
          mediaUrl: bannerData.mediaUrl,
          active: true,
          buttons: bannerData.buttons || [
            { id: 'btn_1', text: 'VER CATÁLOGO', link: '/catalogo', variant: 'primary' }
          ]
        },
        DEFAULT_HERO_SLIDES[1]
      ]);
    }
  }, [bannerData]);

  const nextSlide = useCallback(() => {
    setDirection(1);
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setTimerKey((k) => k + 1);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setDirection(-1);
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setTimerKey((k) => k + 1);
  }, [slides.length]);

  const goToSlide = (index) => {
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
    setTimerKey((k) => k + 1);
  };

  // Pré-carregamento imediato de todas as imagens do carrossel na memória e cache do navegador
  useEffect(() => {
    if (!Array.isArray(slides) || slides.length === 0) return;

    slides.forEach((s, idx) => {
      const url = s.bgImage || s.mediaUrl;
      if (url && typeof url === 'string' && !url.match(/\.(mp4|webm|ogg)$/i)) {
        // Pré-carrega no cache de imagem do navegador e força decodificação na GPU
        const img = new Image();
        img.src = url;
        if (img.decode) {
          img.decode().catch(() => {});
        }
        // Registra link preload de alta prioridade no head
        if (typeof document !== 'undefined') {
          const selector = `link[rel="preload"][href="${CSS.escape(url)}"]`;
          try {
            if (!document.querySelector(selector)) {
              const link = document.createElement('link');
              link.rel = 'preload';
              link.as = 'image';
              link.href = url;
              if (idx === 0) link.fetchPriority = 'high';
              document.head.appendChild(link);
            }
          } catch {
            // Em caso de caractere especial no seletor, ignora
          }
        }
      }
    });
  }, [slides]);

  // Timer automático para o carrossel ir mudando sozinho
  useEffect(() => {
    if (isHovered || slides.length <= 1) return;

    const timer = setInterval(() => {
      nextSlide();
    }, AUTOPLAY_DELAY);

    return () => clearInterval(timer);
  }, [nextSlide, isHovered, slides.length, timerKey]);

  // Manipulador de arraste (drag / swipe horizontal)
  const handleDragEnd = (e, { offset, velocity }) => {
    const swipeConfidenceThreshold = 10000;
    const swipePower = Math.abs(offset.x) * velocity.x;

    if (offset.x < -50 || swipePower < -swipeConfidenceThreshold) {
      nextSlide();
    } else if (offset.x > 50 || swipePower > swipeConfidenceThreshold) {
      prevSlide();
    }
  };

  const slide = slides[currentSlide] || slides[0];
  const isVideo =
    slide.type === 'video' || (slide.mediaUrl && slide.mediaUrl.match(/\.(mp4|webm|ogg)$/i));

  return (
    <section className={styles.heroSection} aria-label="Destaques THR33">
      {/* Camada Persistente de Backgrounds Pré-carregados (Crossfade Suave Sem Recarregar) */}
      <div className={styles.backgroundLayer} aria-hidden="true">
        {slides.map((s, idx) => {
          const isCurrent = idx === currentSlide;
          const isVid =
            s.type === 'video' || (s.mediaUrl && s.mediaUrl.match(/\.(mp4|webm|ogg)$/i));
          const mediaSrc = s.bgImage || s.mediaUrl;
          if (!mediaSrc && !isVid) return null;

          return (
            <motion.div
              key={`hero-bg-${s.id || idx}`}
              className={styles.slideBackground}
              initial={false}
              animate={{
                opacity: isCurrent ? 1 : 0,
                scale: isCurrent ? 1 : 1.05,
              }}
              transition={{
                opacity: { duration: 0.65, ease: [0.16, 1, 0.3, 1] },
                scale: { duration: 6, ease: 'easeOut' }
              }}
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: isCurrent ? 1 : 0,
                pointerEvents: 'none'
              }}
            >
              {!isVid && mediaSrc && (
                <img
                  src={mediaSrc}
                  alt={s.title || 'Destaque THR33'}
                  loading="eager"
                  decoding="async"
                  fetchPriority={idx === 0 ? 'high' : 'auto'}
                  className={styles.heroPreloadedImage}
                />
              )}
              {isVid && (
                <video
                  src={mediaSrc}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className={styles.heroPreloadedImage}
                />
              )}
            </motion.div>
          );
        })}
        <div className={styles.overlay} />
      </div>

      {/* Área Arrastável com AnimatePresence para os Textos */}
      <motion.div
        className={styles.dragWrapper}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
      >
        <div className={styles.slideMotionContainer}>
          {/* Suporte a Modelo 3D opcional no Hero com Suspense e Pulso Brutalista */}
          {children && (
            <div className={styles.modelWrapper}>
              <Suspense fallback={<HeroBadgeFallback />}>{children}</Suspense>
            </div>
          )}

          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={`hero-text-${slide.id || currentSlide}`}
              variants={textVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className={styles.contentContainer}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {slide.badge && (
                <div className={styles.badge}>
                  <span className={styles.badgeDot} />
                  <span className={styles.badgeText}>{slide.badge}</span>
                </div>
              )}

              <h1 className={styles.mainTitle}>{slide.title}</h1>
              {slide.subtitle && <p className={styles.subtitle}>{slide.subtitle}</p>}

              {/* Botões de Ação do Slide via Camada UI (Button) */}
              {Array.isArray(slide.buttons) && slide.buttons.length > 0 ? (
                <div className={styles.actions}>
                  {slide.buttons.map((btn, bIdx) => (
                    <Button
                      key={btn.id || bIdx}
                      variant={btn.variant === 'secondary' ? 'secondary' : 'primary'}
                      size="md"
                      to={btn.link || '/catalogo'}
                    >
                      {btn.text || 'VER MAIS'}
                    </Button>
                  ))}
                </div>
              ) : slide.cta || slide.link ? (
                <div className={styles.actions}>
                  <Button variant="primary" size="md" to={slide.link || '/catalogo'}>
                    {slide.cta || 'VER LANÇAMENTOS'}
                  </Button>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Botões de Navegação Lateral */}
      {slides.length > 1 && (
        <>
          <button
            className={`${styles.navArrow} ${styles.navArrowPrev}`}
            onClick={prevSlide}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            aria-label="Slide anterior"
          >
            <ChevronLeft size={22} />
          </button>

          <button
            className={`${styles.navArrow} ${styles.navArrowNext}`}
            onClick={nextSlide}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            aria-label="Próximo slide"
          >
            <ChevronRight size={22} />
          </button>

          {/* Indicadores do Carrossel com Timer em Linha Minimalista */}
          <div className={styles.dotsContainer}>
            <div className={styles.slideCounter}>
              <span>0{currentSlide + 1}</span>
              <span className={styles.slideCounterTotal}> / 0{slides.length}</span>
            </div>

            <div className={styles.dotsTrack}>
              {slides.map((_, index) => {
                const isActive = index === currentSlide;
                return (
                  <button
                    key={index}
                    className={`${styles.dot} ${isActive ? styles.activeDot : ''}`}
                    onClick={() => goToSlide(index)}
                    aria-label={`Ir para slide ${index + 1}`}
                  >
                    {isActive && (
                      <motion.span
                        key={`progress-${currentSlide}-${timerKey}`}
                        className={styles.dotProgressBar}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: isHovered ? 0 : 1 }}
                        transition={{
                          duration: AUTOPLAY_DELAY / 1000,
                          ease: 'linear'
                        }}
                        style={{ originX: 0 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* FAIXA MARQUEE STREETWEAR CONTÍNUA */}
      <div className={styles.marqueeStrip} aria-hidden="true">
        <div className={styles.marqueeTrack}>
          <span>
            THR33 // PRODUÇÃO SOB DEMANDA // CURITIBA // OVERSIZED & BOXY // A RUA COMO NOSSO
            THR33 // TIRAGENS LIMITADAS //{' '}
          </span>
          <span>
            THR33 // PRODUÇÃO SOB DEMANDA // CURITIBA // OVERSIZED & BOXY // A RUA COMO NOSSO
            THR33 // TIRAGENS LIMITADAS //{' '}
          </span>
        </div>
      </div>
    </section>
  );
}

export default Hero;
