import { GIFTS_DATA } from '../../data/giftsData';
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Gift, Clock } from 'lucide-react';
import { catalogService } from '../../services/catalogService';
import ImageWithSkeleton from '../../components/ui/ImageWithSkeleton';
import ProductCardSkeleton from '../../components/catalog/ProductCardSkeleton';
import { SEO } from '../../components/common/SEO';
import styles from './Brindes.module.css';

export function Brindes() {
  const [filterType, setFilterType] = useState('all'); // 'all', 'gift-card', 'brinde'
  const [giftsList, setGiftsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGifts() {
      setLoading(true);
      try {
        const gifts = await catalogService.getGifts();
        setGiftsList(Array.isArray(gifts) && gifts.length > 0 ? gifts : GIFTS_DATA);
      } catch (err) {
        console.error('Erro ao carregar brindes:', err);
        setGiftsList(GIFTS_DATA);
      } finally {
        setLoading(false);
      }
    }
    loadGifts();
  }, []);

  const hasPhysicalGifts = useMemo(() => {
    return giftsList.some(item => {
      const isGift = item.category === 'gift-card' || String(item.id || '').includes('vale');
      return !isGift && !item.comingSoon && item.active !== false;
    });
  }, [giftsList]);

  const filteredGifts = useMemo(() => {
    return giftsList.filter((item) => {
      // Remove completamente mocks e itens marcados para lançamento futuro
      if (item.comingSoon || item.active === false) return false;
      const isGift = item.category === 'gift-card' || String(item.id || '').includes('vale');
      if (filterType === 'gift-card' && !isGift) {
        return false;
      }
      if (filterType === 'brinde' && isGift) {
        return false;
      }
      return true;
    });
  }, [giftsList, filterType]);

  return (
    <main className={styles.container}>
      <SEO
        title="Vale-Presente Digital | THR33 Streetwear"
        description="Compre o Vale-Presente Digital oficial da THR33 Streetwear. Crédito instantâneo na carteira digital ou código exclusivo para presentear amigos no WhatsApp."
        url="/brindes"
      />
      <header className={styles.header}>
        <div>
          <span className={styles.breadcrumb}>COLECIONÁVEIS & BENEFÍCIOS</span>
          <h1 className={styles.title}>
            {hasPhysicalGifts ? 'VALE-PRESENTE & ACESSÓRIOS' : 'VALE-PRESENTE DIGITAL'}
          </h1>
        </div>

        {/* FILTROS POR TIPO (Visíveis apenas quando houver acessórios físicos cadastrados) */}
        {hasPhysicalGifts && (
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
              VALE-PRESENTE DIGITAL
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${filterType === 'brinde' ? styles.activeFilter : ''}`}
              onClick={() => setFilterType('brinde')}
            >
              BRINDES & ACESSÓRIOS
            </button>
          </div>
        )}
      </header>

      {/* BANNER PROTAGONISTA DE VALE-PRESENTE DIGITAL */}
      <section className={styles.giftBanner}>
        <div className={styles.bannerText}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <Sparkles size={16} color="#00ff88" />
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#00ff88', letterSpacing: '1px' }}>
              ENTREGA DIGITAL INSTANTÂNEA
            </span>
          </div>
          <h2>PRESENTEIE COM A THR33</h2>
          <p>
            Escolha valores de R$ 50 a R$ 2.000 com liberação direta na carteira ou código para enviar a amigos no WhatsApp. Válido para qualquer drop do site.
          </p>
        </div>
        <Link className={styles.bannerCta} to="/brindes/vale-presente-thr33">
          <span>CONFIGURAR VALE-PRESENTE</span>
          <ArrowRight size={15} />
        </Link>
      </section>

      {/* AVISO PARA BRINDES FÍSICOS SE O USUÁRIO FILTRAR POR ELES */}
      {filterType === 'brinde' && !hasPhysicalGifts && (
        <div style={{
          padding: '2.5rem 1.5rem',
          margin: '1.5rem 0 2.5rem',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px dashed rgba(255, 255, 255, 0.15)',
          borderRadius: '4px',
          textAlign: 'center',
          color: 'var(--text-secondary)'
        }}>
          <Clock size={28} style={{ color: '#00ff88', margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontFamily: 'var(--font-heading)', color: '#fff', fontSize: '1.1rem', marginBottom: '0.4rem', letterSpacing: '0.5px' }}>
            DROP DE ACESSÓRIOS & COLECIONÁVEIS — EM BREVE
          </h3>
          <p style={{ fontSize: '0.82rem', maxWidth: '520px', margin: '0 auto', color: 'var(--text-muted)' }}>
            Nossos bonés, meias, ecobags e stickers exclusivos estão sendo finalizados para os próximos drops oficiais da THR33. Fique atento aos comunicados no perfil e nos lançamentos.
          </p>
        </div>
      )}

      {/* GRID DE CARDS (APENAS VALE-PRESENTE EM DESTAQUE) */}
      <div className={styles.grid}>
        {loading ? (
          Array.from({ length: 1 }).map((_, idx) => <ProductCardSkeleton key={idx} />)
        ) : filteredGifts.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '4rem 1rem',
              color: 'var(--text-secondary)'
            }}
          >
            <p>Nenhum item encontrado no momento.</p>
          </div>
        ) : (
          filteredGifts.map((item) => {
            const isGiftCard = item.category === 'gift-card' || String(item.id || '').includes('vale');

            return (
              <div key={item.id} className={styles.card}>
                <div className={styles.imageWrapper}>
                  <span className={styles.typeBadge}>
                    VALE DIGITAL
                  </span>
                  <ImageWithSkeleton
                    src={item.image}
                    alt={item.name}
                    aspectRatio="4/5"
                    className={styles.image}
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>

                <div className={styles.details}>
                  <h3 className={styles.itemName}>{item.name}</h3>
                  <p className={styles.itemDesc}>{item.description}</p>

                  <div className={styles.priceContainer}>
                    <span className={styles.priceRange}>De R$ 50 até R$ 2.000</span>
                  </div>

                  <Link
                    to={`/brindes/${item.slug || item.id}`}
                    className={styles.detailsBtn}
                  >
                    <span>CONFIGURAR VALE</span>
                    <ArrowRight size={14} />
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
