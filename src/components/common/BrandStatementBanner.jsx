import React from 'react';
import { motion } from 'framer-motion';
import { fadeInUp } from '../../utils/motionVariants';
import styles from './BrandStatementBanner.module.css';

export function BrandStatementBanner() {
  return (
    <motion.section 
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={fadeInUp}
      className={styles.fullBleedSection}
    >
      <div className={styles.gridPatternBg} />
      <div className={styles.contentBox}>
        <motion.span 
          initial={{ opacity: 0, letterSpacing: '0.1em' }}
          whileInView={{ opacity: 1, letterSpacing: '0.3em' }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={styles.subStatement}
        >
          FOR THE FEW
        </motion.span>
        
        <h1 className={styles.mainStatement}>THR33</h1>
        <span className={styles.footerTag}>EDIÇÕES LIMITADAS</span>
      </div>
    </motion.section>
  );
}

export default BrandStatementBanner;
