import React from 'react';
import { Link } from 'react-router-dom';
import { Camera } from 'lucide-react';
import ImageWithSkeleton from '../../components/ui/ImageWithSkeleton';
import styles from './BentoGrid.module.css';

export function BentoGrid({ gridItems = [], sectionTag, sectionTitle, isLoading = false }) {
  const cleanSectionTag = String(sectionTag || '').trim();
  const cleanSectionTitle = String(sectionTitle || '').trim();

  if (isLoading) {
    return (
      <section className={styles.section} aria-busy="true" aria-label="Carregando destaques">
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

  const items = Array.isArray(gridItems)
    ? gridItems.filter((c) => c && c.active !== false && Boolean(c.imageUrl || c.image))
    : [];

  if (!items || items.length === 0) return null;

  return (
    <section className={styles.section}>
      {(cleanSectionTag || cleanSectionTitle) && (
        <div className={styles.header}>
          {cleanSectionTag && <span className={styles.tag}>{cleanSectionTag}</span>}
          {cleanSectionTitle && <h2 className={styles.title}>{cleanSectionTitle}</h2>}
        </div>
      )}

      <div className={styles.grid}>
        {items.map((item, index) => {
          const imgSrc = item.imageUrl || item.image;
          const isLarge = item.size === 'large';
          const cleanItemTitle = String(item.title || '').trim();
          const cleanBtnText = String(item.buttonText || '').trim();
          const hasCardOverlayContent = Boolean(cleanItemTitle || cleanBtnText);

          return (
            <div
              key={item.id || index}
              className={`${styles.card} ${isLarge ? styles.cardLarge : ''}`}
            >
              <ImageWithSkeleton
                src={imgSrc}
                alt={cleanItemTitle || 'Destaque THR33'}
                aspectRatio={isLarge ? '16/10' : '4/5'}
                className={styles.cardImage}
                style={{ width: '100%', height: '100%' }}
              />
              {hasCardOverlayContent && (
                <div className={styles.cardOverlay}>
                  <div>
                    {cleanItemTitle && <span className={styles.cardCaption}>{cleanItemTitle}</span>}
                    {isLarge && cleanItemTitle && (
                      <span className={styles.photoCreditInline}>
                        <Camera size={11} />
                        <span>FOTOS: @eduian.foto</span>
                      </span>
                    )}
                  </div>
                  {cleanBtnText && (
                    <Link className={styles.lowOpacityBtn} to={item.link || '/catalogo'}>
                      {cleanBtnText}
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default BentoGrid;
