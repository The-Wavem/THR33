import React from 'react';
import { Link } from 'react-router-dom';
import styles from './BentoGrid.module.css';

export function BentoGrid() {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <span className={styles.tag}>ENSAIO DE CAMPANHA</span>
        <h2 className={styles.title}>A RUA COMO NOSSO ATELIÊ</h2>
      </div>

      <div className={styles.grid}>
        {/* Card Principal 1 */}
        <div className={`${styles.card} ${styles.cardLarge}`}>
          <img 
            src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop" 
            alt="Look Streetwear THR33" 
            className={styles.cardImage}
          />
          <div className={styles.cardOverlay}>
            <span className={styles.cardCaption}>OVERSIZED FIT</span>
            <Link className={styles.lowOpacityBtn} to="/catalogo?modelagem=oversized">
              VER MAIS
            </Link>
          </div>
        </div>

        {/* Card Médio 2 */}
        <div className={styles.card}>
          <img 
            src="https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?q=80&w=600&auto=format&fit=crop" 
            alt="Detalhe de Camiseta THR33" 
            className={styles.cardImage}
          />
          <div className={styles.cardOverlay}>
            <span className={styles.cardCaption}>BOXY TEES</span>
            <Link className={styles.lowOpacityBtn} to="/catalogo?modelagem=boxy">
              VER MAIS
            </Link>
          </div>
        </div>

        {/* Card Médio 3 */}
        <div className={styles.card}>
          <img 
            src="https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=600&auto=format&fit=crop" 
            alt="Conceito Black Piano" 
            className={styles.cardImage}
          />
          <div className={styles.cardOverlay}>
            <span className={styles.cardCaption}>EDITION FOR THE FEW</span>
            <Link className={styles.lowOpacityBtn} to="/catalogo?drop=leak-two">
              VER MAIS
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default BentoGrid;
