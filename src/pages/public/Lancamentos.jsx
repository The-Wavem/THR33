import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Lock, 
  Flame, 
  ShieldCheck, 
  ArrowRight, 
  Volume2, 
  VolumeX, 
  Check, 
  MapPin,
  Disc,
  Zap,
  Tag
} from 'lucide-react';
import { currentDropConfig } from '../../data/dropConfig';
import { buttonTactile } from '../../utils/motionVariants';
import styles from './Lancamentos.module.css';

export function Lancamentos() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsLoading(false), 300);
          return 100;
        }
        return prev + 15;
      });
    }, 60);
    return () => clearInterval(interval);
  }, []);

  const { theme, title, subTitle, loaderLogoText, products, manifestoImage, manifestoHeading, manifestoText, coordinates } = currentDropConfig;

  if (isLoading) {
    return (
      <div className={styles.vipPreloader} style={{ backgroundColor: theme.bgPrimary }}>
        <div className={styles.loaderContent}>
          <div className={styles.loaderLogoBox} style={{ borderColor: theme.accentAcid }}>
            <span className={styles.loaderLogoText}>{loaderLogoText}</span>
          </div>
          <div className={styles.progressBarWrapper} style={{ borderColor: theme.accentAcid }}>
            <div className={styles.progressBarFill} style={{ width: `${loadProgress}%`, backgroundColor: theme.accentAcid }} />
          </div>
          <span className={styles.loaderStatus} style={{ color: theme.accentAcid }}>
            INICIALIZANDO DROP STREETWEAR [{loadProgress}%]
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dropWrapper} style={{ backgroundColor: theme.bgPrimary, color: theme.textMain }}>
      <div className={styles.grainTexture} />

      {/* 1. HERO BANNER FULL BLEED */}
      <section className={styles.heroFullBleed}>
        <div className={styles.heroBackground}>
          <img src={currentDropConfig.heroImage} alt={title} className={styles.heroImage} />
          <div className={styles.heroOverlayGradient} />
        </div>

        <div className={styles.heroTopBar}>
          <div className={styles.dropBadge} style={{ backgroundColor: theme.accentAcid, color: '#000' }}>
            <Flame size={14} />
            <span>DROP 01 // EXCLUSIVO STREETWEAR</span>
          </div>

          <button 
            onClick={() => setIsPlayingAudio(!isPlayingAudio)} 
            className={styles.audioToggleBtn}
            style={{ borderColor: theme.accentAcid, color: theme.accentAcid }}
          >
            {isPlayingAudio ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{isPlayingAudio ? 'BEAT: LIGADO' : 'SOUNDTRACK RAP DROP'}</span>
          </button>
        </div>

        <div className={styles.heroContent}>
          <span className={styles.subTitleTag} style={{ color: theme.accentAcid }}>{subTitle}</span>
          <h1 className={styles.heroHeading}>{title}</h1>
          <div className={styles.heroActions}>
            <a href="#showcase" className={styles.btnExplore} style={{ backgroundColor: theme.accentAcid, color: '#000' }}>
              <span>EXPLORAR O LOTE VIP</span>
              <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* 2. MANIFESTO BLENDED */}
      <section className={styles.blendedManifestoSection}>
        <div className={styles.blendedGrid}>
          <div className={styles.blendedImageWrapper}>
            <img src={manifestoImage} alt="Fotografia de Rua" className={styles.blendedImg} />
            <div className={styles.blendGradientMask} />
            <div className={styles.floatingTag} style={{ borderColor: theme.accentAcid, color: theme.accentAcid }}>
              <Zap size={12} />
              <span>35MM NIGHT FLASH // STREET PHOTO</span>
            </div>
          </div>

          <div className={styles.manifestoTextContent}>
            <div className={styles.locationHeader} style={{ color: theme.accentAcid }}>
              <MapPin size={16} />
              <span>{coordinates}</span>
            </div>
            <h2 className={styles.manifestoHeading}>{manifestoHeading}</h2>
            <p className={styles.manifestoParagraph}>{manifestoText}</p>
            <div className={styles.vinylBadge}>
              <Disc size={16} className={styles.spinningVinyl} style={{ color: theme.accentAcid }} />
              <span>GRAVAÇÃO ORIGINAL THR33 // TAPE 2026</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. NOVO SHOWCASE EDITORIAL 50/50 (INSPIRADO NO FIGMA) */}
      <section id="showcase" className={styles.editorialShowcaseSection}>
        <div className={styles.showcaseHeader}>
          <h2>ACERVO DO DROP // PEÇAS EXCLUSIVAS</h2>
          <span style={{ color: theme.accentAcid }}>[ EDIÇÃO ULTRA LIMITADA • LOTE NUMERADO ]</span>
        </div>

        <div className={styles.editorialList}>
          {products.map((item, index) => {
            const isEven = index % 2 === 1;

            return (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5 }}
                className={`${styles.editorialBlock} ${isEven ? styles.editorialReversed : ''}`}
                style={{ borderColor: theme.borderColor }}
              >
                {/* LADO A: TEXTO, CONCEITO E BOTÃO DETALHES */}
                <div className={styles.editorialTextCol}>
                  <div className={styles.itemMetaHeader}>
                    <span className={styles.serialBadge} style={{ backgroundColor: theme.accentAcid, color: '#000' }}>
                      {item.serialCount}
                    </span>
                    <span className={styles.priceTag}>{item.price}</span>
                  </div>

                  <div className={styles.itemTitleGroup}>
                    <h3 className={styles.itemTitle}>{item.title}</h3>
                    <h4 className={styles.itemSubtitle} style={{ color: theme.accentAcid }}>
                      {item.subtitle}
                    </h4>
                  </div>

                  <p className={styles.itemStoryParagraph}>
                    {item.conceptStory}
                  </p>

                  {item.specs && (
                    <div className={styles.itemSpecsBox}>
                      <div className={styles.specLine}>
                        <span>TECIDO:</span>
                        <strong>{item.specs.fabric}</strong>
                      </div>
                      <div className={styles.specLine}>
                        <span>CORTE:</span>
                        <strong>{item.specs.fit}</strong>
                      </div>
                      <div className={styles.specLine}>
                        <span>ESTAMPA:</span>
                        <strong>{item.specs.print}</strong>
                      </div>
                    </div>
                  )}

                  <motion.button 
                    variants={buttonTactile}
                    initial="rest"
                    whileHover="hover"
                    whileTap="tap"
                    onClick={() => navigate(`/produto/${item.slug}`)}
                    className={styles.btnViewDetails}
                    style={{ backgroundColor: theme.accentAcid, color: '#000' }}
                  >
                    <span>VER DETALHES DA PEÇA</span>
                    <ArrowRight size={16} />
                  </motion.button>
                </div>

                {/* DIVISOR VERTICAL TÁTICO */}
                <div className={styles.editorialDivider} />

                {/* LADO B: FOTOGRAFIA FULL-BLEED */}
                <div className={styles.editorialImageCol}>
                  <img src={item.image} alt={item.title} className={styles.editorialModelImg} />
                  <div className={styles.imageOverlayTag}>
                    <Tag size={12} />
                    <span>{item.tag || 'VIP ITEM'}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default Lancamentos;
