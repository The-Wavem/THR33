import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import styles from './Hero.module.css';

const HERO_SLIDES = [
  {
    id: "slide_1",
    title: "A RUA COMO NOSSO ATELIÊ",
    subtitle: "LEAK TWO — DROP EXCLUSIVO",
    badge: "NOVO DROP",
    cta: "VER LANÇAMENTOS",
    link: "/catalogo",
    bgImage: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1600&auto=format&fit=crop",
    active: true
  },
  {
    id: "slide_2",
    title: "FOR THE FEW.",
    subtitle: "STREETWEAR URBANO & CURITIBANO",
    badge: "COLEÇÃO 2026",
    cta: "EXPLORAR COPOS & VESTUÁRIO",
    link: "/catalogo",
    bgImage: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=1600&auto=format&fit=crop",
    active: true
  }
];

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

export function Hero() {
  const [slides, setSlides] = useState(HERO_SLIDES);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isHovered, setIsHovered] = useState(false);

  // Busca banners dinâmicos do Firestore
  useEffect(() => {
    async function loadDynamicBanners() {
      try {
        const docRef = doc(db, 'storefront', 'home_banners');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const allSlides = docSnap.data().slides || [];
          const activeSlides = allSlides.filter(s => s.active !== false);
          if (activeSlides.length > 0) {
            setSlides(activeSlides);
          }
        }
      } catch (err) {
        console.warn("Aviso: Carregando banners padrão da Home.", err.message);
      }
    }
    loadDynamicBanners();
  }, []);

  // Pré-carrega imagens para transição instantânea
  useEffect(() => {
    slides.forEach(s => {
      if (s.bgImage) {
        const img = new Image();
        img.src = s.bgImage;
      }
    });
  }, [slides]);

  const nextSlide = useCallback(() => {
    setDirection(1);
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setDirection(-1);
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const goToSlide = (index) => {
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  };

  // Transição automática a cada 7.5 segundos (pausa no hover)
  useEffect(() => {
    if (isHovered || slides.length <= 1) return;

    const timer = setInterval(() => {
      nextSlide();
    }, 7500);

    return () => clearInterval(timer);
  }, [nextSlide, isHovered, slides.length]);

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

  return (
    <section 
      className={styles.heroSection} 
      aria-label="Destaques THR33"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Área Arrastável com AnimatePresence */}
      <motion.div 
        className={styles.dragWrapper}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
      >
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={`hero-slide-${slide.id || currentSlide}`}
            className={styles.slideMotionContainer}
          >
            {/* Background do Slide com Zoom Suave */}
            <motion.div
              variants={bgVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className={styles.slideBackground}
              style={{ backgroundImage: `url(${slide.bgImage})` }}
            >
              <div className={styles.overlay} />
            </motion.div>

            {/* Conteúdo Textual do Slide */}
            <motion.div 
              variants={textVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className={styles.contentContainer}
            >
              {slide.badge && (
                <div className={styles.badge}>
                  <span className={styles.badgeDot} />
                  <span className={styles.badgeText}>{slide.badge}</span>
                </div>
              )}

              <h1 className={styles.mainTitle}>{slide.title}</h1>
              <p className={styles.subtitle}>{slide.subtitle}</p>

              {/* Botões de Ação do Slide (Dinâmico: 0, 1, 2 ou N botões) */}
              {Array.isArray(slide.buttons) ? (
                slide.buttons.length > 0 && (
                  <div className={styles.actions}>
                    {slide.buttons.map((btn, bIdx) => (
                      <Link 
                        key={btn.id || bIdx}
                        className={btn.variant === 'secondary' ? styles.secondaryCta : styles.primaryCta}
                        to={btn.link || "/catalogo"}
                      >
                        {btn.text || "VER MAIS"}
                      </Link>
                    ))}
                  </div>
                )
              ) : (
                <div className={styles.actions}>
                  <Link className={styles.primaryCta} to={slide.link || "/catalogo"}>
                    {slide.cta || "VER LANÇAMENTOS"}
                  </Link>
                  <Link className={styles.secondaryCta} to="/sobre">
                    CONHEÇA A MARCA
                  </Link>
                </div>
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Botões de Navegação Lateral (Prev / Next) */}
      {slides.length > 1 && (
        <>
          <button 
            className={`${styles.navArrow} ${styles.navArrowPrev}`}
            onClick={prevSlide}
            aria-label="Slide anterior"
          >
            <ChevronLeft size={22} />
          </button>

          <button 
            className={`${styles.navArrow} ${styles.navArrowNext}`}
            onClick={nextSlide}
            aria-label="Próximo slide"
          >
            <ChevronRight size={22} />
          </button>

          {/* Indicadores / Linhas de Progresso do Carrossel */}
          <div className={styles.dotsContainer}>
            {slides.map((_, index) => (
              <button
                key={index}
                className={`${styles.dot} ${index === currentSlide ? styles.activeDot : ''}`}
                onClick={() => goToSlide(index)}
                aria-label={`Ir para slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default Hero;
