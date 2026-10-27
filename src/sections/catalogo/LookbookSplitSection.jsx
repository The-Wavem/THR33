import React, { useState, useMemo } from 'react';
import LookbookItem from '../../components/catalog/LookbookItem';
import styles from './LookbookSplitSection.module.css';

function LookbookSplitRow({
  pair,
  rowIndex,
  startIndex = 0,
  activeDiscounts = [],
  onRowHoverChange
}) {
  const [hoveredSide, setHoveredSide] = useState(null); // 'left' | 'right' | null

  const [leftProduct, rightProduct] = pair;
  const leftNum = String(startIndex + rowIndex * 2 + 1).padStart(2, '0');
  const rightNum = String(startIndex + rowIndex * 2 + 2).padStart(2, '0');

  const handleHover = (side) => {
    setHoveredSide(side);
    if (onRowHoverChange) onRowHoverChange(side);
  };

  return (
    <div
      className={`${styles.splitRow} ${
        hoveredSide === 'left'
          ? styles.focusLeft
          : hoveredSide === 'right'
            ? styles.focusRight
            : ''
      }`}
    >
      {/* METADE ESQUERDA (50%) */}
      <div className={styles.halfPane}>
        {leftProduct && (
          <LookbookItem
            product={leftProduct}
            activeDiscounts={activeDiscounts}
            side="left"
            itemNumber={leftNum}
            isHovered={hoveredSide === 'left'}
            isSiblingHovered={hoveredSide === 'right'}
            onHoverStart={() => handleHover('left')}
            onHoverEnd={() => handleHover(null)}
          />
        )}
      </div>

      {/* LINHA DIVISÓRIA CENTRAL DINÂMICA COM INDICADOR NO EIXO Y */}
      <div
        className={`${styles.centerDivider} ${
          hoveredSide === 'left'
            ? styles.dividerActiveLeft
            : hoveredSide === 'right'
              ? styles.dividerActiveRight
              : ''
        }`}
        aria-hidden="true"
      >
        <div className={styles.dividerBeam} />

        <div className={styles.centerAxisIndicator}>
          <span
            className={`${styles.arrowGlyph} ${styles.arrowLeft} ${
              hoveredSide === 'left' ? styles.arrowActive : ''
            }`}
          >
            ◄
          </span>
          <span
            className={`${styles.pairCounter} ${
              hoveredSide === 'left' ? styles.counterActive : ''
            }`}
          >
            {leftNum}
          </span>
          <span className={styles.counterPipe}>|</span>
          <span
            className={`${styles.pairCounter} ${
              hoveredSide === 'right' ? styles.counterActive : ''
            }`}
          >
            {rightProduct ? rightNum : '--'}
          </span>
          <span
            className={`${styles.arrowGlyph} ${styles.arrowRight} ${
              hoveredSide === 'right' ? styles.arrowActive : ''
            }`}
          >
            ►
          </span>
        </div>
      </div>

      {/* METADE DIREITA (50%) */}
      <div className={styles.halfPane}>
        {rightProduct ? (
          <LookbookItem
            product={rightProduct}
            activeDiscounts={activeDiscounts}
            side="right"
            itemNumber={rightNum}
            isHovered={hoveredSide === 'right'}
            isSiblingHovered={hoveredSide === 'left'}
            onHoverStart={() => handleHover('right')}
            onHoverEnd={() => handleHover(null)}
          />
        ) : (
          <div className={styles.editorialFillerPane} aria-hidden="true">
            <span className={styles.fillerCode}>THR33 // EDITORIAL ARCHIVE</span>
            <p className={styles.fillerStatement}>A RUA COMO NOSSO ATELIÊ</p>
            <span className={styles.fillerSub}>FIM DA SÉRIE ATUAL</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function LookbookSplitSection({
  products = [],
  activeDiscounts = [],
  startIndex = 0
}) {
  const [hoveredSide, setHoveredSide] = useState(null); // 'left' | 'right' | null

  // Agrupa os produtos em pares (duplas: Esquerda / Direita)
  const productPairs = useMemo(() => {
    const pairs = [];
    if (!Array.isArray(products)) return pairs;
    for (let i = 0; i < products.length; i += 2) {
      pairs.push([products[i], products[i + 1] || null]);
    }
    return pairs;
  }, [products]);

  if (!productPairs.length) {
    return null;
  }

  return (
    <section
      className={styles.lookbookSection}
      data-hovered-side={hoveredSide || 'none'}
      aria-label="Lookbook Editorial de Peças"
    >
      {productPairs.map((pair, idx) => (
        <LookbookSplitRow
          key={`${pair[0]?.id || idx}-${pair[1]?.id || 'end'}`}
          pair={pair}
          rowIndex={idx}
          startIndex={startIndex}
          activeDiscounts={activeDiscounts}
          onRowHoverChange={setHoveredSide}
        />
      ))}
    </section>
  );
}

export default LookbookSplitSection;
