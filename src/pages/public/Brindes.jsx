import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Gift, Sparkles, ArrowRight, Package } from 'lucide-react';
import { catalogService } from '../../services/catalogService';
import { seedService } from '../../services/seedService';
import styles from './Brindes.module.css';

export function Brindes() {
  const [filterType, setFilterType] = useState('all'); // 'all', 'gift-card', 'brinde'
  const [giftsList, setGiftsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGifts() {
      setLoading(true);
      try {
        await seedService.seedCatalogIfEmpty();
        const all = await catalogService.getAllProducts();
        const gifts = all.filter(p => p.type === 'brinde' || p.category === 'brinde' || p.category === 'gift-card');
        setGiftsList(gifts);
      } catch (err) {
        console.error("Erro ao carregar brindes:", err);
      } finally {
        setLoading(false);
      }
    }
    loadGifts();
  }, []);

  const filteredGifts = useMemo(() => {
    return giftsList.filter((item) => {
      if (filterType === 'gift-card' && item.category !== 'gift-card' && !item.id.includes('vale')) return false;
      if (filterType === 'brinde' && (item.category === 'gift-card' || item.id.includes('vale'))) return false;
      return true;
    });
  }, [giftsList, filterType]);

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div>
          <span className={styles.breadcrumb}>HOME // BRINDES & VALES</span>
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
        {loading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
            <Package size={28} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 0.75rem' }} />
            <p>Carregando vales e brindes do Firestore...</p>
          </div>
        ) : filteredGifts.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
            <p>Nenhum brinde ou vale-presente cadastrado no momento.</p>
          </div>
        ) : (
          filteredGifts.map((item) => {
            const isGiftCard = item.category === 'gift-card' || item.id.includes('vale');
            return (
              <div key={item.id} className={styles.card}>
                <div className={styles.imageWrapper}>
                  <span className={styles.typeBadge}>
                    {isGiftCard ? 'VALE DIGITAL' : 'BRINDE FÍSICO'}
                  </span>
                  <img src={item.image} alt={item.name} className={styles.image} />
                </div>

                <div className={styles.details}>
                  <h3 className={styles.itemName}>{item.name}</h3>
                  <p className={styles.itemDesc}>{item.description}</p>

                  <div className={styles.priceContainer}>
                    {isGiftCard ? (
                      <span className={styles.priceRange}>De R$ 150 até R$ 5.000</span>
                    ) : (
                      <span className={styles.price}>R$ {Number(item.price || 0).toFixed(2)}</span>
                    )}
                  </div>

                  <Link className={styles.actionBtn} to={`/brindes/${item.id}`}>
                    {isGiftCard ? 'PERSONALIZAR VALE' : 'VER DETALHES'}
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}

export default Brindes;
