import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Gift, Sparkles, ArrowRight } from 'lucide-react';
import { GIFTS_DATA } from '../../data/giftsData';
import styles from './Brindes.module.css';

export function Brindes() {
  const [filterType, setFilterType] = useState('all'); // 'all', 'gift-card', 'brinde'

  const filteredGifts = useMemo(() => {
    return GIFTS_DATA.filter((item) => {
      if (filterType !== 'all' && item.type !== filterType) return false;
      return true;
    });
  }, [filterType]);

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div>
          <span className={styles.breadcrumb}>HOME / BRINDES & VALES</span>
          <h1 className={styles.title}>VALE-PRESENTE & ACESSÓRIOS</h1>
        </div>

        {/* FILTROS POR TIPO */}
        <div className={styles.filterBar}>
          <button 
            type="button"
            className={`${styles.filterBtn} ${filterType === 'all' ? styles.activeFilter : ''}`}
            onClick={() => setFilterType('all')}
          >
            TODOS OS ITENS
          </button>
          <button 
            type="button"
            className={`${styles.filterBtn} ${filterType === 'gift-card' ? styles.activeFilter : ''}`}
            onClick={() => setFilterType('gift-card')}
          >
            VALE-PRESENTE
          </button>
          <button 
            type="button"
            className={`${styles.filterBtn} ${filterType === 'brinde' ? styles.activeFilter : ''}`}
            onClick={() => setFilterType('brinde')}
          >
            BRINDES & ACESSÓRIOS
          </button>
        </div>
      </header>

      {/* BANNER INFORMATIVO DE VALE PRESENTE */}
      <section className={styles.giftBanner}>
        <div className={styles.bannerText}>
          <h2>PRESENTEIE COM A THR33</h2>
          <p>Escolha vales de R$ 150 até R$ 5.000 com envio digital imediato para o e-mail do seu amigo.</p>
        </div>
        <Link className={styles.bannerCta} to="/brindes/vale-presente-thr33">
          <span>COMPRAR VALE-PRESENTE</span>
          <ArrowRight size={15} />
        </Link>
      </section>

      {/* GRID DE CARDS */}
      <div className={styles.grid}>
        {filteredGifts.map((item) => (
          <div key={item.id} className={styles.card}>
            <div className={styles.imageWrapper}>
              <span className={styles.typeBadge}>
                {item.type === 'gift-card' ? 'VALE DIGITAL' : 'BRINDE FÍSICO'}
              </span>
              <img src={item.image} alt={item.name} className={styles.image} />
            </div>

            <div className={styles.details}>
              <h3 className={styles.itemName}>{item.name}</h3>
              <p className={styles.itemDesc}>{item.description}</p>

              <div className={styles.priceContainer}>
                {item.type === 'gift-card' ? (
                  <span className={styles.priceRange}>De R$ 150 até R$ 5.000</span>
                ) : (
                  <span className={styles.price}>R$ {item.price?.toFixed(2)}</span>
                )}
              </div>

              <Link className={styles.actionBtn} to={`/brindes/${item.id}`}>
                {item.type === 'gift-card' ? 'PERSONALIZAR VALE' : 'VER DETALHES'}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export default Brindes;
