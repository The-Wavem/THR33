import React from 'react';
import { motion } from 'framer-motion';
import styles from './LoadingScreen.module.css';

export function LoadingScreen({ message = 'CARREGANDO EXPERIÊNCIA' }) {
  return (
    <div className={styles.loadingContainer} role="status" aria-live="polite">
      <div className={styles.loadingContent}>
        {/* LOGO PULSANTE */}
        <motion.div 
          className={styles.logoBox}
          initial={{ opacity: 0.6, scale: 0.98 }}
          animate={{ 
            opacity: [0.6, 1, 0.6],
            scale: [0.98, 1.02, 0.98]
          }}
          transition={{
            repeat: Infinity,
            duration: 1.6,
            ease: "easeInOut"
          }}
        >
          <span className={styles.logoText}>THR33</span>
          <span className={styles.logoSub}>FOR THE FEW</span>
        </motion.div>

        {/* BARRA DE PROGRESSO SLICK */}
        <div className={styles.progressBarWrapper}>
          <motion.div 
            className={styles.progressBar}
            initial={{ width: "0%", left: "0%" }}
            animate={{ 
              width: ["0%", "70%", "100%"],
              left: ["0%", "15%", "100%"]
            }}
            transition={{
              repeat: Infinity,
              duration: 1.2,
              ease: "easeInOut"
            }}
          />
        </div>

        {/* MENSAGEM / STATUS TÁTICO */}
        <div className={styles.statusBox}>
          <span className={styles.statusDot} />
          <span className={styles.statusText}>{message}</span>
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;
