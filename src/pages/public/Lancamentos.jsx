import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, 
  Lock, 
  Flame, 
  ShieldCheck, 
  ArrowRight, 
  Volume2, 
  VolumeX, 
  Check, 
  MapPin,
  Disc,
  Zap
} from 'lucide-react';
import { currentDropConfig } from '../../data/dropConfig';
import styles from './Lancamentos.module.css';

export function Lancamentos({ onAddToCart, onOpenAuthModal, user }) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [ticketClaimed, setTicketClaimed] = useState(false);

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
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={styles.loaderContent}
        >
          <div className={styles.loaderLogoBox} style={{ borderColor: theme.accentAcid }}>
            <span className={styles.loaderLogoText}>{loaderLogoText}</span>
          </div>
          <div className={styles.progressBarWrapper} style={{ borderColor: theme.accentAcid }}>
            <div 
              className={styles.progressBarFill} 
              style={{ width: `${loadProgress}%`, backgroundColor: theme.accentAcid }} 
            />
          </div>
          <span className={styles.loaderStatus} style={{ color: theme.accentAcid }}>
            INICIALIZANDO DROP STREETWEAR // BASS & CONCRETE [{loadProgress}%]
          </span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={styles.dropWrapper} style={{ backgroundColor: theme.bgPrimary, color: theme.textMain }}>
      
      {/* BACKGROUND NOISE TEXTURE */}
      <div className={styles.grainTexture} />

      {/* 1. HERO FULL-BLEED EDGE-TO-EDGE */}
      <section className={styles.heroFullBleed}>
        <div className={styles.heroBackground}>
          <img src={currentDropConfig.heroImage} alt={title} className={styles.heroImage} />
          <div className={styles.heroOverlayGradient} />
        </div>

        {/* TOP BAR OVERLAY */}
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

        {/* HERO MAIN TEXT CONTENT */}
        <div className={styles.heroContent}>
          <motion.span 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.subTitleTag} 
            style={{ color: theme.accentAcid }}
          >
            {subTitle}
          </motion.span>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={styles.heroHeading}
          >
            {title}
          </motion.h1>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={styles.heroActions}
          >
            <a href="#manifesto" className={styles.btnExplore} style={{ backgroundColor: theme.accentAcid, color: '#000' }}>
              <span>VER CONCEITO DO DROP</span>
              <ArrowRight size={16} />
            </a>
          </motion.div>
        </div>
      </section>

      {/* 2. SESSÃO MANIFESTO: FOTOGRAFIA MESCLADA DIRETO NO FUNDO (SEM CARD/BORDA) */}
      <section id="manifesto" className={styles.blendedManifestoSection}>
        <div className={styles.blendedGrid}>
          
          {/* FOTO FUSED/MESCLADA NO FUNDO COM DISSOLUÇÃO DE BORDAS */}
          <div className={styles.blendedImageWrapper}>
            <img src={manifestoImage} alt="Fotografia de Rua" className={styles.blendedImg} />
            <div className={styles.blendGradientMask} />
            
            <div className={styles.floatingTag} style={{ borderColor: theme.accentAcid, color: theme.accentAcid }}>
              <Zap size={12} />
              <span>35MM NIGHT FLASH // STREET PHOTO</span>
            </div>
          </div>

          {/* TEXTO DO MANIFESTO IMPRESSO DIRETO NO CANVAS */}
          <div className={styles.manifestoTextContent}>
            <div className={styles.locationHeader} style={{ color: theme.accentAcid }}>
              <MapPin size={16} />
              <span>{coordinates}</span>
            </div>

            <h2 className={styles.manifestoHeading}>
              {manifestoHeading}
            </h2>

            <p className={styles.manifestoParagraph}>
              {manifestoText}
            </p>

            <div className={styles.rawSpecRow} style={{ borderColor: theme.borderColor }}>
              <div className={styles.specItem}>
                <span>GRAMATURA</span>
                <strong style={{ color: theme.accentAcid }}>280GSM HEAVY</strong>
              </div>
              <div className={styles.specItem}>
                <span>TINGIMENTO</span>
                <strong>MINERAL REVERSO</strong>
              </div>
              <div className={styles.specItem}>
                <span>ESTOQUE</span>
                <strong style={{ color: theme.accentAcid }}>33 UNIDADES</strong>
              </div>
            </div>

            <div className={styles.vinylBadge}>
              <Disc size={16} className={styles.spinningVinyl} style={{ color: theme.accentAcid }} />
              <span>GRAVAÇÃO ORIGINAL THR33 // TAPE 2026</span>
            </div>
          </div>

        </div>
      </section>

      {/* 3. VITRINE DE PRODUTOS DO DROP */}
      <section className={styles.productsSection}>
        <div className={styles.sectionHeader} style={{ borderColor: theme.borderColor }}>
          <h2>PEÇAS LIBERADAS DO DROP</h2>
          <span style={{ color: theme.accentAcid }}>[ EDIÇÃO ULTRA LIMITADA ]</span>
        </div>

        <div className={styles.productsGrid}>
          {products.map((item) => (
            <motion.div 
              key={item.id} 
              whileHover={{ y: -4 }}
              className={styles.productCard}
              style={{ backgroundColor: theme.bgCard, borderColor: theme.borderColor }}
            >
              <div className={styles.cardHeader}>
                <span className={styles.serialTag} style={{ backgroundColor: theme.accentAcid, color: '#000' }}>
                  {item.serialCount}
                </span>
                <span className={styles.cardTag}>{item.tag}</span>
              </div>

              <div className={styles.cardImageContainer}>
                <img src={item.image} alt={item.title} />
                <div className={styles.cardPriceBadge} style={{ backgroundColor: '#000', color: theme.accentAcid, borderColor: theme.accentAcid }}>
                  {item.price}
                </div>
              </div>

              <div className={styles.cardBody}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>

                <button 
                  onClick={() => onAddToCart && onAddToCart({ ...item, selectedSize: 'M' })}
                  className={styles.btnBuy}
                  style={{ backgroundColor: theme.accentAcid, color: '#000' }}
                >
                  <ShoppingBag size={16} />
                  <span>GARANTIR PEÇA DO DROP</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 4. PASSE VIP DIGITAL */}
      <section className={styles.ticketSection}>
        <div className={styles.ticketCard} style={{ borderColor: theme.accentAcid, backgroundColor: theme.bgCard }}>
          <div className={styles.ticketInfo}>
            <ShieldCheck size={32} style={{ color: theme.accentAcid }} />
            <div>
              <h3>PASSE DE MEMBRO // FOR THE FEW</h3>
              <p>Emita o seu comprovante digital para prioridade de envio neste lote.</p>
            </div>
          </div>

          <div>
            {!ticketClaimed ? (
              <button 
                onClick={() => {
                  if (!user) {
                    onOpenAuthModal && onOpenAuthModal();
                  } else {
                    setTicketClaimed(true);
                  }
                }}
                className={styles.btnClaim}
                style={{ backgroundColor: theme.accentAcid, color: '#000' }}
              >
                <Lock size={16} />
                <span>{user ? 'EMITIR TICKET DIGITAL' : 'FAZER LOGIN PARA EMITIR TICKET'}</span>
              </button>
            ) : (
              <div className={styles.claimedBadge} style={{ color: theme.accentAcid, borderColor: theme.accentAcid }}>
                <Check size={18} />
                <span>TICKET #0482 AUTENTICADO // BEM-VINDO</span>
              </div>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}

export default Lancamentos;
