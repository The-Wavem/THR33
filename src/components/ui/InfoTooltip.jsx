import React, { useState } from 'react';
import styles from './InfoTooltip.module.css';

export function InfoTooltip({ title, text, children, position = 'top', width }) {
  const [isVisible, setIsVisible] = useState(false);

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
          className={`${styles.tooltipBox} ${styles[position]}`}
          style={width ? { width, maxWidth: '90vw' } : {}}
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
