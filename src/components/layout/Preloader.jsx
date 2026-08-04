import React, { useState, useEffect } from 'react';
import styles from './Preloader.module.css';

export default function Preloader({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const duration = 2400; // total duration in ms
    const intervalTime = 30;
    const increment = 100 / (duration / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(timer);
          return 100;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      const fadeTimeout = setTimeout(() => {
        setIsFadingOut(true);
      }, 400);

      const completeTimeout = setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
      }, 1000);

      return () => {
        clearTimeout(fadeTimeout);
        clearTimeout(completeTimeout);
      };
    }
  }, [progress, onComplete]);

  return (
    <div
      className={`${styles.preloaderContainer} ${
        isFadingOut ? styles.fadeOut : ''
      }`}
    >
      <div className={styles.preloaderFrame} />

      <div className={styles.contentWrapper}>
        <svg
          className={styles.svgLogo}
          viewBox="0 0 320 140"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Animated stroke oval border */}
          <ellipse
            cx="160"
            cy="70"
            rx="148"
            ry="58"
            className={styles.ovalPath}
          />
          {/* Main THR33 logo text */}
          <text
            x="160"
            y="78"
            textAnchor="middle"
            dominantBaseline="middle"
            className={styles.logoText}
          >
            THR33
          </text>
          {/* Subtitle inside logo */}
          <text
            x="160"
            y="108"
            textAnchor="middle"
            className={styles.logoSubtitle}
          >
            STREETWEAR
          </text>
        </svg>

        <div className={styles.tickerBox}>
          <div className={styles.statusText}>
            <span className={styles.amberDot}>●</span>
            <span>AUTENTICANDO SISTEMA // FOR THE FEW</span>
          </div>
          <div className={styles.counter}>{Math.floor(progress)}%</div>
        </div>

        <div className={styles.progressBarContainer}>
          <div
            className={styles.progressBarFill}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
