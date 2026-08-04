import React, { useState } from 'react';
import Preloader from '../../components/layout/Preloader';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import styles from './Home.module.css';

export default function Home() {
  const [loading, setLoading] = useState(true);

  return (
    <>
      {loading && <Preloader onComplete={() => setLoading(false)} />}

      <div className={styles.pageContainer}>
        <Navbar cartCount={2} initialLoggedIn={true} userName="WESLLEY K." />

        <main className={styles.mainContent}>
          <section className={styles.heroBanner}>
            <div className={styles.heroBadge}>
              <span>● LEAK TWO // DROP IMMINENT</span>
            </div>
            <h1 className={styles.heroTitle}>FOR THE FEW.</h1>
            <p className={styles.heroDescription}>
              Peças pesadas em algodão 400GSM com corte oversize tático, estampas
              em relevo e serigrafia industrial. Acesso restrito via verificação de
              bot.
            </p>
            <button className={styles.actionBtn}>
              [ EXPLORAR COLEÇÃO LEAK 02 ]
            </button>
          </section>

          <section className={styles.gridSection}>
            <div className={styles.card}>
              <div>
                <div className={styles.cardHeader}>
                  <span>ITEM #001</span>
                  <span className={styles.cardTag}>LIMITED (50 UNITS)</span>
                </div>
                <h3 className={styles.cardTitle}>HOODIE OVERSIZED TACTICAL</h3>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#555' }}>
                  Algodão 400GSM // Costura Dupla // Tag em Borracha
                </p>
              </div>
              <div className={styles.cardPrice}>R$ 489,00</div>
            </div>

            <div className={styles.card}>
              <div>
                <div className={styles.cardHeader}>
                  <span>ITEM #002</span>
                  <span className={styles.cardTag}>DROP EXCLUSIVE</span>
                </div>
                <h3 className={styles.cardTitle}>T-SHIRT BOXER HEAVYWEIGHT</h3>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#555' }}>
                  Algodão 260GSM // Gola 3cm // Silk Screen Relevo
                </p>
              </div>
              <div className={styles.cardPrice}>R$ 239,00</div>
            </div>

            <div className={styles.card}>
              <div>
                <div className={styles.cardHeader}>
                  <span>ITEM #003</span>
                  <span className={styles.cardTag}>SOLD OUT</span>
                </div>
                <h3 className={styles.cardTitle}>CARGO PANTS UTILITY THR33</h3>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#555' }}>
                  Ripstop Impermeável // 6 Bolsos Táticos // Fivelas
                </p>
              </div>
              <div className={styles.cardPrice}>R$ 399,00</div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
