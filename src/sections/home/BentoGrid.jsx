import React from 'react';
import { Link } from 'react-router-dom';
import { Camera } from 'lucide-react';
import styles from './BentoGrid.module.css';

const DEFAULT_BENTO_CARDS = [
  {
    id: "bento_1",
    title: "OVERSIZED HEAVY",
    buttonText: "VER DETALHES",
    link: "/catalogo?modelagem=oversized",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop",
    size: "large",
    active: true
  },
  {
    id: "bento_2",
    title: "BOXY TEES",
    buttonText: "VER DETALHES",
    link: "/catalogo?modelagem=boxy",
    image: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?q=80&w=600&auto=format&fit=crop",
    size: "normal",
    active: true
  },
  {
    id: "bento_3",
    title: "EDITION 2026",
    buttonText: "VER CATÁLOGO",
    link: "/catalogo",
    image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=600&auto=format&fit=crop",
    size: "normal",
    active: true
  }
];

export function BentoGrid({ gridItems = [], sectionTag, sectionTitle }) {
  const items = Array.isArray(gridItems) && gridItems.length > 0
    ? gridItems.filter(c => c.active !== false)
    : DEFAULT_BENTO_CARDS;

  if (!items || items.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <span className={styles.tag}>{sectionTag || 'COLEÇÃO OFICIAL // ATELIÊ CWB'}</span>
        <h2 className={styles.title}>{sectionTitle || 'A RUA COMO NOSSO ATELIÊ'}</h2>
      </div>

      <div className={styles.grid}>
        {items.map((item, index) => {
          const imgSrc = item.imageUrl || item.image || '';
          const isLarge = item.size === 'large';

          return (
            <div 
              key={item.id || index} 
              className={`${styles.card} ${isLarge ? styles.cardLarge : ''}`}
            >
              <img 
                src={imgSrc} 
                alt={item.title || 'Destaque THR33'} 
                className={styles.cardImage}
              />
              <div className={styles.cardOverlay}>
                <div>
                  <span className={styles.cardCaption}>{item.title}</span>
                  {isLarge && (
                    <span className={styles.photoCreditInline}>
                      <Camera size={11} />
                      <span>FOTOS: @EDULIVE</span>
                    </span>
                  )}
                </div>
                <Link className={styles.lowOpacityBtn} to={item.link || '/catalogo'}>
                  {item.buttonText || 'VER MAIS'}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default BentoGrid;
