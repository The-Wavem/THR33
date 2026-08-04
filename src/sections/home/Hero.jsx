import React, { useState, useRef, useEffect } from 'react';
import { heroSlidesData, heroManifestoText } from '../../data/homeData';
import styles from './Hero.module.css';

export default function Hero() {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isShutterActive, setIsShutterActive] = useState(false);
  const [isFlashActive, setIsFlashActive] = useState(false);

  // Cursor state
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [isCursorInside, setIsCursorInside] = useState(false);
  const [cursorSide, setCursorSide] = useState('right'); // 'left' | 'right'

  const heroRef = useRef(null);

  const currentSlide = heroSlidesData[currentSlideIndex] || heroSlidesData[0];

  // Handle mouse movement for custom cursor badge
  const handleMouseMove = (e) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    setCursorPos({ x, y });

    // Determine left vs right side of hero viewport
    const heroRelativeX = x - rect.left;
    if (heroRelativeX < rect.width / 2) {
      setCursorSide('left');
    } else {
      setCursorSide('right');
    }
  };

  const handleMouseEnter = () => {
    setIsCursorInside(true);
  };

  const handleMouseLeave = () => {
    setIsCursorInside(false);
  };

  // Change slide with camera shutter snap animation
  const goToSlide = (newIndex) => {
    if (newIndex === currentSlideIndex || isShutterActive) return;

    // Trigger obturador shutter snap & flash effect
    setIsShutterActive(true);
    setIsFlashActive(true);

    setTimeout(() => {
      setIsFlashActive(false);
    }, 120);

    setTimeout(() => {
      setCurrentSlideIndex(newIndex);
    }, 180);

    setTimeout(() => {
      setIsShutterActive(false);
    }, 380);
  };

  const nextSlide = () => {
    const nextIndex = (currentSlideIndex + 1) % heroSlidesData.length;
    goToSlide(nextIndex);
  };

  const prevSlide = () => {
    const prevIndex =
      (currentSlideIndex - 1 + heroSlidesData.length) % heroSlidesData.length;
    goToSlide(prevIndex);
  };

  // Click handler for Hero area
  const handleHeroClick = (e) => {
    // If click originated from interactive elements (buttons, links), do not trigger slide nav
    if (e.target.closest(`.${styles.interactive}`)) {
      return;
    }

    if (cursorSide === 'left') {
      prevSlide();
    } else {
      nextSlide();
    }
  };

  return (
    <section
      ref={heroRef}
      className={`${styles.heroContainer} ${
        isShutterActive ? styles.shutterActive : ''
      }`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleHeroClick}
    >
      {/* Custom Floating Cursor Badge */}
      <div
        className={`${styles.cursorBadge} ${
          isCursorInside ? styles.active : ''
        }`}
        style={{
          left: `${cursorPos.x}px`,
          top: `${cursorPos.y}px`,
        }}
      >
        <span className={styles.badgeDot}>●</span>
        <span>
          {cursorSide === 'left' ? '[<-] VOLTAR' : 'AVANÇAR [->]'}
        </span>
      </div>

      {/* Camera Shutter Snap Elements */}
      <div className={styles.shutterTop} />
      <div className={styles.shutterBottom} />
      <div
        className={`${styles.flashOverlay} ${
          isFlashActive ? styles.flashActive : ''
        }`}
      />

      {/* Slide Image Background */}
      <div className={styles.slideImageWrapper}>
        <img
          src={currentSlide.image}
          alt={currentSlide.subtitle}
          className={`${styles.slideImage} ${
            isShutterActive ? styles.snapping : ''
          }`}
        />
        {/* Film Grain SVG Noise Filter */}
        <svg className={styles.filmGrain} width="100%" height="100%">
          <filter id="heroNoise">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves="3"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#heroNoise)" />
        </svg>

        <div className={styles.vignetteOverlay} />
      </div>

      {/* Tactical Corner Ticks */}
      <div className={styles.cornerTickTL}>+</div>
      <div className={styles.cornerTickTR}>+</div>
      <div className={styles.cornerTickBL}>+</div>
      <div className={styles.cornerTickBR}>+</div>

      {/* Hero Content Overlay */}
      <div className={styles.heroContent}>
        {/* Top Row: Logo Square Box & Location Metadata */}
        <div className={styles.topRow}>
          {/* Caixa da Logo no Topo */}
          <div className={styles.logoBox}>
            <div className={styles.logoIconSquare} />
            <span>[ ❖ THR33 LOGO SYSTEM ]</span>
          </div>

          <div className={styles.locationBadge}>
            <span>{currentSlide.location}</span>
          </div>
        </div>

        {/* Center Row: Impact Typography "THR33" & Subtitle */}
        <div className={styles.centerTitleSection}>
          <h1 className={styles.giantTitle}>{currentSlide.title}</h1>
          <div className={styles.subtitleBadge}>
            {currentSlide.subtitle}
          </div>
        </div>

        {/* Bottom Row: Model Info, CTAs and Slide Counters */}
        <div className={styles.bottomRow}>
          {/* Details Block */}
          <div className={styles.detailsBlock}>
            <div className={styles.modelText}>
              ● {currentSlide.model}
            </div>
            <div className={styles.descriptionText}>
              {currentSlide.description}
            </div>
          </div>

          {/* Action Buttons (CTAs) */}
          <div className={styles.ctaGroup}>
            <button
              className={`${styles.primaryCtaBtn} ${styles.interactive}`}
              onClick={(e) => {
                e.stopPropagation();
                alert(`Navegando para: ${currentSlide.primaryCta}`);
              }}
            >
              {currentSlide.primaryCta}
            </button>

            <button
              className={`${styles.secondaryCtaBtn} ${styles.interactive}`}
              onClick={(e) => {
                e.stopPropagation();
                alert(`Navegando para: ${currentSlide.secondaryCta}`);
              }}
            >
              {currentSlide.secondaryCta}
            </button>
          </div>

          {/* Slide Indicator Controls */}
          <div className={`${styles.controlsBlock} ${styles.interactive}`}>
            {heroSlidesData.map((slide, index) => (
              <button
                key={slide.id}
                className={`${styles.slideIndicator} ${
                  index === currentSlideIndex ? styles.active : ''
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  goToSlide(index);
                }}
                title={`Ver Slide ${slide.id}`}
              >
                {slide.id}
              </button>
            ))}
            <span className={styles.slideCounter}>
              0{currentSlideIndex + 1} / 0{heroSlidesData.length}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
