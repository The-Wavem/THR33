import React from 'react';
import { Link } from 'react-router-dom';
import { Camera } from 'lucide-react';
import ImageWithSkeleton from '../../components/ui/ImageWithSkeleton';
import largoDaOrdemBg from '@assets/images/largo-da-ordem-bg.jpeg';
import largoDaOrdemBg2 from '@assets/images/largo-da-ordem-bg2.jpeg';
import styles from './BentoGrid.module.css';

const REAL_FALLBACK_BENTO_CARDS = [
  {
    id: 'bento_1',
    title: 'OVERSIZED HEAVY',
    buttonText: 'VER DETALHES',
    link: '/catalogo?modelagem=oversized',
    image: largoDaOrdemBg,
    size: 'large',
    active: true
  },
  {
    id: 'bento_2',
    title: 'BOXY TEES',
    buttonText: 'VER DETALHES',
    link: '/catalogo?modelagem=boxy',
    image: largoDaOrdemBg2,
    size: 'normal',
    active: true
  },
  {
    id: 'bento_3',
    title: 'EDITION 2026',
    buttonText: 'VER CATÁLOGO',
    link: '/catalogo',
    image: largoDaOrdemBg,
    size: 'normal',
    active: true
  }
];

export function BentoGrid({ gridItems = [], sectionTag, sectionTitle, isLoading = false }) {
  if (isLoading) {
    return (
      <section className={styles.section} aria-busy="true" aria-label="Carregando destaques">
        <div className={styles.header}>
          <span className={styles.tag}>{sectionTag || 'COLEÇÃO OFICIAL // ATELIÊ CWB'}</span>
          <h2 className={styles.title}>{sectionTitle || 'A RUA COMO NOSSO ATELIÊ'}</h2>
        </div>

        <div className={styles.grid}>
          <div className={`${styles.card} ${styles.cardLarge} ${styles.skeletonCard}`}>
            <div className={styles.shimmer} />
          </div>
          <div className={`${styles.card} ${styles.skeletonCard}`}>
            <div className={styles.shimmer} />
          </div>
          <div className={`${styles.card} ${styles.skeletonCard}`}>
            <div className={styles.shimmer} />
          </div>
        </div>
      </section>
    );
  }

  const items =
    Array.isArray(gridItems) && gridItems.length > 0
      ? gridItems.filter((c) => c.active !== false)
      : REAL_FALLBACK_BENTO_CARDS;

  if (!items || items.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <span className={styles.tag}>{sectionTag || 'COLEÇÃO OFICIAL // ATELIÊ CWB'}</span>
        <h2 className={styles.title}>{sectionTitle || 'A RUA COMO NOSSO ATELIÊ'}</h2>
      </div>

      <div className={styles.grid}>
        {items.map((item, index) => {
          const imgSrc = item.imageUrl || item.image || largoDaOrdemBg;
          const isLarge = item.size === 'large';

          return (
            <div
              key={item.id || index}
              className={`${styles.card} ${isLarge ? styles.cardLarge : ''}`}
            >
              <ImageWithSkeleton
                src={imgSrc}
                alt={item.title || 'Destaque THR33'}
                aspectRatio={isLarge ? '16/10' : '4/5'}
                className={styles.cardImage}
                style={{ width: '100%', height: '100%' }}
              />
              <div className={styles.cardOverlay}>
                <div>
                  <span className={styles.cardCaption}>{item.title}</span>
                  {isLarge && (
                    <span className={styles.photoCreditInline}>
                      <Camera size={11} />
                      <span>FOTOS: @eduian.foto</span>
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
