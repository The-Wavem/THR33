import React from 'react';
import styles from './ProductCardSkeleton.module.css';

export function ProductCardSkeleton({ count = 1 }) {
  if (count > 1) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem', width: '100%' }}>
        {Array.from({ length: count }).map((_, idx) => (
          <div key={idx} className={styles.skeletonCard} aria-hidden="true">
            <div className={styles.imagePlaceholder}>
              <div className={styles.shimmer} />
            </div>

            <div className={styles.details}>
              <div className={styles.tagsRow}>
                <div className={`${styles.skeletonBar} ${styles.tagBar}`} />
                <div className={`${styles.skeletonBar} ${styles.tagBarSmall}`} />
              </div>

              <div className={`${styles.skeletonBar} ${styles.titleBar}`} />
              <div className={`${styles.skeletonBar} ${styles.priceBar}`} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.skeletonCard} aria-hidden="true">
      <div className={styles.imagePlaceholder}>
        <div className={styles.shimmer} />
      </div>

      <div className={styles.details}>
        <div className={styles.tagsRow}>
          <div className={`${styles.skeletonBar} ${styles.tagBar}`} />
          <div className={`${styles.skeletonBar} ${styles.tagBarSmall}`} />
        </div>

        <div className={`${styles.skeletonBar} ${styles.titleBar}`} />
        <div className={`${styles.skeletonBar} ${styles.priceBar}`} />
      </div>
    </div>
  );
}

export default ProductCardSkeleton;
