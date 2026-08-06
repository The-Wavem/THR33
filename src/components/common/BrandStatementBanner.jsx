import React from 'react';
import styles from './BrandStatementBanner.module.css';

export function BrandStatementBanner() {
  return (
    <section className={styles.fullBleedSection}>
      <div className={styles.gridPatternBg} />
      <div className={styles.contentBox}>
        <span className={styles.subStatement}>FOR THE FEW</span>
        <h1 className={styles.mainStatement}>THR33</h1>
        <span className={styles.footerTag}>EDIÇÕES LIMITADAS</span>
      </div>
    </section>
  );
}

export default BrandStatementBanner;
