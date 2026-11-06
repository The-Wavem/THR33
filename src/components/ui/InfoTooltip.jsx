import React, { useState } from 'react';
import styles from './InfoTooltip.module.css';

export function InfoTooltip({ title, text, children, position = 'top', align = 'auto', width }) {
  const [isVisible, setIsVisible] = useState(false);

  // Determina classes de posição e alinhamento
  let posClass = styles.top;
  let alignClass = styles.alignCenter;

  if (position.includes('bottom')) {
    posClass = styles.bottom;
    alignClass = styles.alignLeft;
  } else if (position.includes('left')) {
    posClass = styles.left;
  } else if (position.includes('right')) {
    posClass = styles.right;
  }

  // Alinhamento explícito sobrescreve
  if (align === 'right' || position === 'bottom-right' || position === 'top-right') {
    alignClass = styles.alignRight;
  } else if (align === 'left' || position === 'bottom-left' || position === 'top-left') {
    alignClass = styles.alignLeft;
  } else if (align === 'center' || position === 'bottom-center' || position === 'top-center') {
    alignClass = styles.alignCenter;
  }

  return (
    <span 
      className={styles.tooltipWrapper}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      tabIndex={0}
      role="tooltip"
      aria-label={title ? `${title}: ${text || ''}` : text}
    >
      <span className={styles.iconBadge}>?</span>

      {isVisible && (
        <div 
          className={`${styles.tooltipBox} ${posClass} ${alignClass}`}
          style={width ? { width, maxWidth: 'calc(100vw - 32px)' } : {}}
        >
          {title && <strong className={styles.tooltipTitle}>{title}</strong>}
          {text && <p className={styles.tooltipText}>{text}</p>}
          {children}
        </div>
      )}
    </span>
  );
}

export default InfoTooltip;
