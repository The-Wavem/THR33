import React from 'react';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footerContainer}>
      <div className={styles.copyrightText}>
        THR33 © ALL RIGHTS RESERVED // FOR THE FEW
      </div>

      <div className={styles.antiBotBadge}>
        <span className={styles.shieldDot} />
        <span>PROTECTED BY THR33 ANTI-BOT SYSTEM</span>
      </div>
    </footer>
  );
}
