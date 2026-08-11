import React from 'react';
import styles from './ProductCardSkeleton.module.css';

export function ProductCardSkeleton() {
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
