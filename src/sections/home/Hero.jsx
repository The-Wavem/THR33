import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../../components/ui/Button';
import styles from './Hero.module.css';

const AUTOPLAY_DELAY = 5000; // 5 segundos por slide

const extractActiveSlides = (bannerData) => {
  if (!bannerData) return [];

  const rawList = Array.isArray(bannerData.slides)
    ? bannerData.slides
    : Array.isArray(bannerData)
      ? bannerData
      : [];

  if (rawList.length > 0) {
    return rawList.filter(
      (s) =>
        s &&
        s.active !== false &&
        Boolean(s.bgImage || s.mobileBgImage || s.mediaUrl || s.image)
    );
  }

  if (bannerData.mediaUrl || bannerData.bgImage || bannerData.mobileBgImage) {
    return [
      {
        id: bannerData.id || 'hero_banner_1',
        title: bannerData.title ?? '',
        subtitle: bannerData.subtitle ?? '',
        badge: bannerData.badge ?? '',
        bgImage: bannerData.bgImage || bannerData.mediaUrl || '',
        mobileBgImage: bannerData.mobileBgImage || '',
        type: bannerData.type || 'image',
        mediaUrl: bannerData.mediaUrl || '',
        active: true,
        buttons: Array.isArray(bannerData.buttons) ? bannerData.buttons : []
      }
    ];
  }

  return [];
};

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
  const [slides, setSlides] = useState(() => extractActiveSlides(bannerData));
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isHovered, setIsHovered] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [loadedSlides, setLoadedSlides] = useState({});

  const markSlideLoaded = useCallback((key) => {
    if (!key) return;
    setLoadedSlides((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  }, []);

  // Sincroniza dados da prop bannerData recebida do Firestore (sem injetar slides falsos/mockados)
  useEffect(() => {
    const activeSlides = extractActiveSlides(bannerData);
    setSlides(activeSlides);
    setCurrentSlide((prev) => (activeSlides.length > 0 && prev >= activeSlides.length ? 0 : prev));
  }, [bannerData]);

  const nextSlide = useCallback(() => {
    if (slides.length <= 1) return;
    setDirection(1);
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setTimerKey((k) => k + 1);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    if (slides.length <= 1) return;
    setDirection(-1);
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setTimerKey((k) => k + 1);
  }, [slides.length]);

  const goToSlide = (index) => {
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
    setTimerKey((k) => k + 1);
  };

  // Pré-carregamento imediato de todas as imagens (Desktop e Mobile) do carrossel
  useEffect(() => {
    if (!Array.isArray(slides) || slides.length === 0) return;

    const isMobileViewport =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

    slides.forEach((s, idx) => {
      const slideKey = s.id || `slide_${idx}`;
      const desktopUrl = s.bgImage || s.mediaUrl || s.image || '';
      const mobileUrl = s.mobileBgImage || '';
      const primaryUrl = isMobileViewport ? mobileUrl || desktopUrl : desktopUrl || mobileUrl;

      if (primaryUrl && typeof primaryUrl === 'string' && !primaryUrl.match(/\.(mp4|webm|ogg)$/i)) {
        const img = new Image();
        img.onload = () => markSlideLoaded(slideKey);
        img.onerror = () => markSlideLoaded(slideKey);
        img.src = primaryUrl;
        if (img.complete) {
          markSlideLoaded(slideKey);
        }
        if (img.decode) {
          img.decode().then(() => markSlideLoaded(slideKey)).catch(() => {});
        }
      } else if (primaryUrl) {
        markSlideLoaded(slideKey);
      }

      // Pré-carrega também a variante secundária em background
      [desktopUrl, mobileUrl].forEach((url) => {
        if (url && typeof url === 'string' && !url.match(/\.(mp4|webm|ogg)$/i)) {
          if (typeof document !== 'undefined') {
            try {
              const selector = `link[rel="preload"][href="${CSS.escape(url)}"]`;
              if (!document.querySelector(selector)) {
                const link = document.createElement('link');
                link.rel = 'preload';
                link.as = 'image';
                link.href = url;
                if (idx === 0) link.fetchPriority = 'high';
                document.head.appendChild(link);
              }
            } catch {
              // Ignora seletor inválido
            }
          }
        }
      });
    });
  }, [slides, markSlideLoaded]);

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
    if (slides.length <= 1) return;
    const swipeConfidenceThreshold = 10000;
    const swipePower = Math.abs(offset.x) * velocity.x;

    if (offset.x < -50 || swipePower < -swipeConfidenceThreshold) {
      nextSlide();
    } else if (offset.x > 50 || swipePower > swipeConfidenceThreshold) {
      prevSlide();
    }
  };

  // Enquanto carrega os dados iniciais do Firestore, exibe exclusivamente o Skeleton Loading
  if (isLoading) {
    return (
      <section className={styles.heroSection} aria-busy="true" aria-label="Carregando banner principal">
        <div className={styles.heroSkeletonLayer}>
          <div className={styles.heroSkeletonShimmer} />
        </div>
      </section>
    );
  }

  // Se não houver nenhum slide ativo configurado no banco, não renderiza nada
  if (!slides || slides.length === 0) {
    return null;
  }

  const slide = slides[currentSlide] || slides[0];
  const currentSlideKey = slide.id || `slide_${currentSlide}`;
  const isCurrentImageLoaded = Boolean(loadedSlides[currentSlideKey]);
  const hasDedicatedMobileImage = Boolean(slide.mobileBgImage && String(slide.mobileBgImage).trim());

  const cleanBadge = String(slide.badge || '').trim();
  const cleanTitle = String(slide.title || '').trim();
  const cleanSubtitle = String(slide.subtitle || '').trim();
  const validButtons = Array.isArray(slide.buttons)
    ? slide.buttons.filter((btn) => Boolean(btn && String(btn.text || '').trim()))
    : [];

  const hasTextOrButtons = Boolean(
    cleanBadge || cleanTitle || cleanSubtitle || validButtons.length > 0
  );

  return (
    <div className={styles.heroWrapper}>
      <section
        className={`${styles.heroSection} ${
          hasDedicatedMobileImage ? styles.heroHasMobileArt : styles.heroDesktopOnlyArt
        }`}
        aria-label="Destaques THR33"
      >
        {/* Skeleton Shimmer visível enquanto a imagem real selecionada no CMS está carregando */}
        {!isCurrentImageLoaded && (
          <div className={styles.heroSkeletonLayer} aria-hidden="true">
            <div className={styles.heroSkeletonShimmer} />
          </div>
        )}

        {/* Camada Persistente de Backgrounds Pré-carregados (Crossfade Suave Sem Recarregar) */}
        <div className={styles.backgroundLayer} aria-hidden="true">
          {slides.map((s, idx) => {
            const isCurrent = idx === currentSlide;
            const slideKey = s.id || `slide_${idx}`;
            const isVid =
              s.type === 'video' || (s.mediaUrl && s.mediaUrl.match(/\.(mp4|webm|ogg)$/i));
            const desktopSrc = s.bgImage || s.mediaUrl || s.image || '';
            const mobileSrc = s.mobileBgImage || '';
            const fallbackSrc = desktopSrc || mobileSrc;
            if (!fallbackSrc && !isVid) return null;

            return (
              <motion.div
                key={`hero-bg-${slideKey}`}
                className={styles.slideBackground}
                initial={false}
                animate={{
                  opacity: isCurrent && loadedSlides[slideKey] ? 1 : 0,
                  scale: isCurrent ? 1 : 1.03
                }}
                transition={{
                  opacity: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
                  scale: { duration: 6, ease: 'easeOut' }
                }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: isCurrent ? 1 : 0,
                  pointerEvents: 'none'
                }}
              >
                {!isVid && fallbackSrc && (
                  <picture className={styles.heroPicture}>
                    {mobileSrc && <source media="(max-width: 768px)" srcSet={mobileSrc} />}
                    {desktopSrc && <source media="(min-width: 769px)" srcSet={desktopSrc} />}
                    <img
                      src={fallbackSrc}
                      alt={s.title || 'Banner THR33'}
                      loading="eager"
                      decoding="async"
                      fetchPriority={idx === 0 ? 'high' : 'auto'}
                      className={styles.heroPreloadedImage}
                      onLoad={() => markSlideLoaded(slideKey)}
                      onError={() => markSlideLoaded(slideKey)}
                    />
                  </picture>
                )}
                {isVid && (
                  <video
                    src={fallbackSrc}
                    autoPlay
                    loop
                    muted
                    playsInline
                    onLoadedData={() => markSlideLoaded(slideKey)}
                    className={styles.heroPreloadedImage}
                  />
                )}
              </motion.div>
            );
          })}
          {/* Só aplica a máscara escura se houver textos ou botões ativos no slide */}
          {hasTextOrButtons && <div className={styles.overlay} />}
        </div>

        {/* Área Arrastável com AnimatePresence para os Textos (apenas se houver conteúdo ou 3D) */}
        {(hasTextOrButtons || children || slides.length > 1) && (
          <motion.div
            className={styles.dragWrapper}
            drag={slides.length > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
          >
            <div className={styles.slideMotionContainer}>
              {children && (
                <div className={styles.modelWrapper}>
                  <Suspense fallback={<HeroBadgeFallback />}>{children}</Suspense>
                </div>
              )}

              {hasTextOrButtons && (
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
                    {cleanBadge && (
                      <div className={styles.badge}>
                        <span className={styles.badgeDot} />
                        <span className={styles.badgeText}>{cleanBadge}</span>
                      </div>
                    )}

                    {cleanTitle && <h1 className={styles.mainTitle}>{cleanTitle}</h1>}
                    {cleanSubtitle && <p className={styles.subtitle}>{cleanSubtitle}</p>}

                    {validButtons.length > 0 && (
                      <div className={styles.actions}>
                        {validButtons.map((btn, bIdx) => (
                          <Button
                            key={btn.id || bIdx}
                            variant={btn.variant === 'secondary' ? 'secondary' : 'primary'}
                            size="md"
                            to={btn.link || '/catalogo'}
                          >
                            {btn.text}
                          </Button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}

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
      </section>

      {/* FAIXA MARQUEE STREETWEAR CONTÍNUA — POSICIONADA FORA DO BANNER (LOGO ABAIXO) */}
      <div className={styles.marqueeStrip} aria-hidden="true">
        <div className={styles.marqueeTrack}>
          <span>
            THR33 // PRODUÇÃO SOB DEMANDA // CURITIBA // OVERSIZED & BOXY // A RUA COMO NOSSA ESSÊNCIA //{' '}
            TIRAGENS LIMITADAS //{' '}
          </span>
          <span>
            THR33 // PRODUÇÃO SOB DEMANDA // CURITIBA // OVERSIZED & BOXY // A RUA COMO NOSSO ESSÊNCIA //{' '}
            TIRAGENS LIMITADAS //{' '}
          </span>
        </div>
      </div>
    </div>
  );
}

export default Hero;
