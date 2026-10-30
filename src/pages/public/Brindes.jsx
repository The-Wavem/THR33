import { GIFTS_DATA } from '../../data/giftsData';
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Gift, Clock } from 'lucide-react';
import { catalogService } from '../../services/catalogService';
import { preloadRoute } from '../../utils/preloader';
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
      // Remove completamente mocks e itens marcados para lancamento futuro
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
        description="Compre o Vale-Presente Digital oficial da THR33 Streetwear. Credito instantaneo na carteira digital ou codigo exclusivo para presentear amigos no WhatsApp."
        url="/brindes"
      />
      <header className={styles.header}>
        <div>
          <span className={styles.breadcrumb}>COLECIONAVEIS & BENEFICIOS</span>
          <h1 className={styles.title}>
            {hasPhysicalGifts ? 'VALE-PRESENTE & ACESSORIOS' : 'VALE-PRESENTE DIGITAL'}
          </h1>
        </div>

        {/* FILTROS POR TIPO (Visiveis apenas quando houver acessorios fisicos cadastrados) */}
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
              BRINDES & ACESSORIOS
            </button>
          </div>
        )}
      </header>

      {/* BANNER EDITORIAL INTEGRADO DE VALE-PRESENTE DIGITAL (SEM BOX GENERICO) */}
      <section className={styles.giftBanner}>
        <div className={styles.bannerText}>
          <h2 className={styles.bannerHeading}>PRESENTEIE COM A THR33</h2>
          <p className={styles.bannerDescription}>
            Escolha valores de R$ 50 a R$ 2.000 com ativacao imediata na conta ou codigo exclusivo para presentear amigos. Valido para qualquer peca ou drop oficial do catalogo.
          </p>
        </div>
        <Link 
          className={styles.bannerCta} 
          to="/brindes/vale-presente-thr33"
          onMouseEnter={() => preloadRoute('/brindes/vale-presente-thr33')}
        >
          <span>CONFIGURAR VALE-PRESENTE</span>
          <ArrowRight size={15} className={styles.bannerCtaIcon} />
        </Link>
      </section>

      {/* AVISO PARA BRINDES FISICOS SE O USUARIO FILTRAR POR ELES */}
      {filterType === 'brinde' && !hasPhysicalGifts && (
        <div className={styles.emptyAcessorios}>
          <Clock size={28} style={{ color: '#00ff88', margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontFamily: 'var(--font-heading)', color: '#fff', fontSize: '1.1rem', marginBottom: '0.4rem', letterSpacing: '0.5px' }}>
            DROP DE ACESSORIOS & COLECIONAVEIS - EM BREVE
          </h3>
          <p style={{ fontSize: '0.82rem', maxWidth: '520px', margin: '0 auto', color: 'var(--text-muted)' }}>
            Nossos bones, meias, ecobags e stickers exclusivos estao sendo finalizados para os proximos drops oficiais da THR33. Fique atento aos comunicados no perfil e nos lancamentos.
          </p>
        </div>
      )}

      {/* GRID DE CARDS */}
      <div className={styles.grid}>
        {loading ? (
          Array.from({ length: 1 }).map((_, idx) => <ProductCardSkeleton key={idx} />)
        ) : filteredGifts.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Nenhum item encontrado no momento.</p>
          </div>
        ) : (
          filteredGifts.map((item) => {
            const itemTargetUrl = `/brindes/${item.slug || item.id}`;

            return (
              <article 
                key={item.id} 
                className={styles.card}
                onMouseEnter={() => preloadRoute(itemTargetUrl)}
                onTouchStart={() => preloadRoute(itemTargetUrl)}
              >
                {/* LINK DIRETO NA IMAGEM COM TRANSICAO DE HOVER */}
                <Link
                  to={itemTargetUrl}
                  className={styles.imageLink}
                  aria-label={`Ver e configurar ${item.name}`}
                >
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
                    <div className={styles.imageHoverOverlay}>
                      <span className={styles.overlayText}>
                        CONFIGURAR VALE
                      </span>
                    </div>
                  </div>
                </Link>

                <div className={styles.details}>
                  <Link to={itemTargetUrl} className={styles.itemNameLink}>
                    <h3 className={styles.itemName}>{item.name}</h3>
                  </Link>

                  <p className={styles.itemDesc}>{item.description}</p>

                  <div className={styles.priceContainer}>
                    <span className={styles.priceLabel}>VALORES DISPONIVEIS</span>
                    <span className={styles.priceRange}>De R$ 50 ate R$ 2.000</span>
                  </div>

                  <Link
                    to={itemTargetUrl}
                    className={styles.cardCtaBtn}
                    aria-label={`Configurar ${item.name}`}
                  >
                    <span>CONFIGURAR VALE</span>
                    <ArrowRight size={14} className={styles.btnIcon} />
                  </Link>
                </div>
              </article>
            );
          })
        )}
      </div>
    </main>
  );
}

export default Brindes;
