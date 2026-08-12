import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Hero.module.css';

const HERO_SLIDES = [
  {
    id: 1,
    title: "A RUA COMO NOSSO ATELIÊ",
    subtitle: "LEAK TWO — DROP EXCLUSIVO",
    badge: "NOVO DROP",
    cta: "VER LANÇAMENTOS",
    link: "/catalogo",
    bgImage: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1600&auto=format&fit=crop"
  },
  {
    id: 2,
    title: "FOR THE FEW.",
    subtitle: "STREETWEAR URBANO & CURITIBANO",
    badge: "COLEÇÃO 2026",
    cta: "EXPLORAR COPOS & VESTUÁRIO",
    link: "/catalogo",
    bgImage: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=1600&auto=format&fit=crop"
  }
];

export function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  }, []);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  // Transição automática contínua de slides a cada 7 segundos
  useEffect(() => {
    if (isHovered) return;

    const timer = setInterval(() => {
      nextSlide();
    }, 7000);

    return () => clearInterval(timer);
  }, [nextSlide, isHovered]);

  return (
    <section 
      className={styles.heroSection} 
      aria-label="Destaques THR33"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={styles.slidesContainer}>
        {HERO_SLIDES.map((slide, index) => {
          const isActive = index === currentSlide;
          return (
            <div
              key={slide.id}
              className={`${styles.slideItem} ${isActive ? styles.slideActive : styles.slideInactive}`}
            >
              <div 
                className={styles.slideBackground}
                style={{ backgroundImage: `url(${slide.bgImage})` }}
              >
                <div className={styles.overlay} />
              </div>

              <div className={styles.contentContainer}>
                <div className={styles.badge}>
                  <span className={styles.badgeDot} />
                  <span className={styles.badgeText}>{slide.badge}</span>
                </div>

                <h1 className={styles.mainTitle}>{slide.title}</h1>
                <p className={styles.subtitle}>{slide.subtitle}</p>

                <div className={styles.actions}>
                  <Link className={styles.primaryCta} to={slide.link}>
                    {slide.cta}
                  </Link>
                  <Link className={styles.secondaryCta} to="/sobre">
                    CONHEÇA A MARCA
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Botões de Navegação Lateral (Prev / Next) */}
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
        {HERO_SLIDES.map((_, index) => (
          <button
            key={index}
            className={`${styles.dot} ${index === currentSlide ? styles.activeDot : ''}`}
            onClick={() => goToSlide(index)}
            aria-label={`Ir para slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

export default Hero;
