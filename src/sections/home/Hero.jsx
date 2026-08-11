import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './Hero.module.css';

// Banners simulados para os drops / campanhas
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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const slide = HERO_SLIDES[currentSlide];

  return (
    <section className={styles.heroSection} aria-label="Destaques THR33">
      <div 
        className={styles.slideBackground} 
        style={{ backgroundImage: `url(${slide.bgImage})` }}
      >
        <div className={styles.overlay}></div>
      </div>

      <div className={styles.contentContainer}>
        <span className={styles.badge}>{slide.badge}</span>
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

      {/* Indicadores do Carrossel */}
      <div className={styles.dotsContainer}>
        {HERO_SLIDES.map((_, index) => (
          <button
            key={index}
            className={`${styles.dot} ${index === currentSlide ? styles.activeDot : ''}`}
            onClick={() => setCurrentSlide(index)}
            aria-label={`Ir para slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

export default Hero;
