import React from 'react';
import styles from './LookbookSplitSkeleton.module.css';

export function LookbookSplitSkeleton({ rows = 2, startIndex = 0 }) {
  return (
    <div className={styles.skeletonSection} aria-busy="true" aria-label="Carregando Lookbook">
      {Array.from({ length: rows }).map((_, rowIdx) => {
        const leftNum = String(startIndex + rowIdx * 2 + 1).padStart(2, '0');
        const rightNum = String(startIndex + rowIdx * 2 + 2).padStart(2, '0');
        const seriesNum = String(rowIdx + 1).padStart(2, '0');

        return (
          <div key={rowIdx} className={styles.rowBlock}>
            {/* CABEÇALHO EDITORIAL SUTIL DA DUPLA */}
            <div className={styles.rowEditorialHeader} aria-hidden="true">
              <span className={styles.seriesLabel}>LINHA {seriesNum}</span>
              <span className={styles.seriesLine} />
              <span className={styles.seriesRange}>
                PEÇAS {leftNum} — {rightNum}
              </span>
            </div>

            {/* ESTRUTURA SPLIT 50/50 COM LINHA DIVISÓRIA CENTRAL */}
            <div className={styles.splitRow}>
              {/* METADE ESQUERDA */}
              <div className={styles.halfPane}>
                <div className={styles.shimmerBackdrop} />

                {/* TOPO ESQUERDO (META) + TOPO DIREITO (CÍRCULO DO FAVORITO) */}
                <div className={styles.topRow}>
                  <div className={styles.topMetaPlaceholder}>
                    <div className={`${styles.pulseBar} ${styles.metaIndexBar}`} />
                    <div className={`${styles.pulseBar} ${styles.metaStatusBar}`} />
                  </div>
                  <div className={`${styles.pulseBar} ${styles.favCircle}`} />
                </div>

                {/* BASE ESQUERDA: CATEGORIA, TÍTULO GRANDE, PREÇO E TAMANHOS */}
                <div className={styles.bottomOverlay}>
                  <div className={`${styles.pulseBar} ${styles.categoryBar}`} />
                  <div className={`${styles.pulseBar} ${styles.titleBarLarge}`} />
                  <div className={`${styles.pulseBar} ${styles.titleBarSub}`} />
                  <div className={styles.priceAndSizesRow}>
                    <div className={`${styles.pulseBar} ${styles.priceBar}`} />
                    <div className={styles.sizesGroup}>
                      <span className={`${styles.pulseBar} ${styles.sizePill}`} />
                      <span className={`${styles.pulseBar} ${styles.sizePill}`} />
                      <span className={`${styles.pulseBar} ${styles.sizePill}`} />
                      <span className={`${styles.pulseBar} ${styles.sizePill}`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* LINHA DIVISÓRIA CENTRAL + BADGE ◄ 01 | 02 ► */}
              <div className={styles.centerCorridor} aria-hidden="true">
                <div className={styles.dividerTrack} />
                <div className={styles.centerAxisIndicator}>
                  <span className={styles.arrowGlyph}>◄</span>
                  <span className={styles.pairCounter}>{leftNum}</span>
                  <span className={styles.counterPipe}>|</span>
                  <span className={styles.pairCounter}>{rightNum}</span>
                  <span className={styles.arrowGlyph}>►</span>
                </div>
              </div>

              {/* METADE DIREITA */}
              <div className={`${styles.halfPane} ${styles.rightPaneOffset}`}>
                <div className={styles.shimmerBackdrop} />

                {/* TOPO ESQUERDO (META) + TOPO DIREITO (CÍRCULO DO FAVORITO) */}
                <div className={styles.topRow}>
                  <div className={styles.topMetaPlaceholder}>
                    <div className={`${styles.pulseBar} ${styles.metaIndexBar}`} />
                    <div className={`${styles.pulseBar} ${styles.metaStatusBar}`} />
                  </div>
                  <div className={`${styles.pulseBar} ${styles.favCircle}`} />
                </div>

                {/* BASE ESQUERDA: CATEGORIA, TÍTULO GRANDE, PREÇO E TAMANHOS */}
                <div className={styles.bottomOverlay}>
                  <div className={`${styles.pulseBar} ${styles.categoryBar}`} />
                  <div className={`${styles.pulseBar} ${styles.titleBarLarge}`} />
                  <div className={`${styles.pulseBar} ${styles.titleBarSub}`} />
                  <div className={styles.priceAndSizesRow}>
                    <div className={`${styles.pulseBar} ${styles.priceBar}`} />
                    <div className={styles.sizesGroup}>
                      <span className={`${styles.pulseBar} ${styles.sizePill}`} />
                      <span className={`${styles.pulseBar} ${styles.sizePill}`} />
                      <span className={`${styles.pulseBar} ${styles.sizePill}`} />
                      <span className={`${styles.pulseBar} ${styles.sizePill}`} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default LookbookSplitSkeleton;
