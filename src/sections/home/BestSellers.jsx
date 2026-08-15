import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Package } from 'lucide-react';
import { catalogService } from '../../services/catalogService';
import { seedService } from '../../services/seedService';
import styles from './BestSellers.module.css';

export function BestSellers({ products: initialProducts }) {
  const [products, setProducts] = useState(initialProducts || []);
  const [loading, setLoading] = useState(!initialProducts || initialProducts.length === 0);

  useEffect(() => {
    if (Array.isArray(initialProducts) && initialProducts.length > 0) {
      setProducts(initialProducts);
      setLoading(false);
      return;
    }

    async function loadBestSellers() {
      setLoading(true);
      try {
        await seedService.seedCatalogIfEmpty();
        const all = await catalogService.getFeaturedProducts(4);
        const vestuario = all.filter(p => p.type !== 'brinde' && p.category !== 'gift-card');
        setProducts(vestuario.slice(0, 4));
      } catch (err) {
        console.error("Erro ao carregar mais vendidos:", err);
      } finally {
        setLoading(false);
      }
    }
    loadBestSellers();
  }, [initialProducts]);

  if (loading && (!products || products.length === 0)) {
    return (
      <section className={styles.section}>
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
          <Package size={24} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 0.5rem' }} />
          <p>Carregando destaques do catálogo...</p>
        </div>
      </section>
    );
  }

  if (!products || products.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div>
          <span className={styles.tag}>Destaques do Mês</span>
          <h2 className={styles.title}>MAIS VENDIDOS</h2>
        </div>
        <Link className={styles.seeMoreLink} to="/catalogo">
          <span>VER CATÁLOGO COMPLETO</span>
          <ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '4px' }} />
        </Link>
      </div>

      <div className={styles.productsGrid}>
        {products.map((product) => {
          const priceNum = Number(product.price || 0);
          const imgSrc = product.image || (product.images && product.images[0]) || '';

          return (
            <div key={product.id} className={styles.productCard}>
              <div className={styles.imageWrapper}>
                <img src={imgSrc} alt={product.name} />
                <Link className={styles.quickViewBtn} to={`/produto/${product.slug || product.id}`}>
                  VER DETALHES
                </Link>
              </div>
              <div className={styles.productInfo}>
                <span className={styles.fitTag}>{(product.fit || 'boxy').toUpperCase()} FIT</span>
                <h3 className={styles.productName}>{product.name}</h3>
                <p className={styles.productPrice}>R$ {priceNum.toFixed(2)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default BestSellers;
