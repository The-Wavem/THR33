import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { catalogService } from '../../services/catalogService';
import ProductCard from '../../components/catalog/ProductCard';
import ProductCardSkeleton from '../../components/catalog/ProductCardSkeleton';
import styles from './BestSellers.module.css';

export function BestSellers({ products: initialProducts, isLoading = false }) {
  const [products, setProducts] = useState(initialProducts || []);
  const [loading, setLoading] = useState(
    isLoading || (!initialProducts || initialProducts.length === 0)
  );

  useEffect(() => {
    if (isLoading) {
      setLoading(true);
      return;
    }

    if (Array.isArray(initialProducts) && initialProducts.length > 0) {
      setProducts(
        initialProducts.filter((p) => p && p.type !== 'brinde' && p.category !== 'gift-card')
      );
      setLoading(false);
      return;
    }

    async function loadBestSellers() {
      setLoading(true);
      try {
        const all = await catalogService.getAllProducts();
        const vestuario = (Array.isArray(all) ? all : [])
          .filter((p) => p && p.type !== 'brinde' && p.category !== 'gift-card')
          .sort((a, b) => {
            const salesA = Number(a.purchases ?? a.salesCount ?? a.sales ?? 0);
            const salesB = Number(b.purchases ?? b.salesCount ?? b.sales ?? 0);
            if (salesB !== salesA) return salesB - salesA;
            const featA = a.isFeatured ? 1 : 0;
            const featB = b.isFeatured ? 1 : 0;
            if (featB !== featA) return featB - featA;
            return Number(b.views ?? 0) - Number(a.views ?? 0);
          });
        setProducts(vestuario);
      } catch (err) {
        console.error('Erro ao carregar mais vendidos:', err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }
    loadBestSellers();
  }, [initialProducts, isLoading]);

  if (loading || isLoading) {
    return (
      <section className={styles.section} aria-busy="true" aria-label="Carregando mais vendidos">
        <div className={styles.header}>
          <div>
            <span className={styles.tag}>Destaques do Mês</span>
            <h2 className={styles.title}>MAIS VENDIDOS</h2>
          </div>
          <Link className={styles.seeMoreLink} to="/catalogo">
            <span>VER CATÁLOGO COMPLETO</span>
            <ArrowRight
              size={14}
              style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '4px' }}
            />
          </Link>
        </div>

        <div className={styles.productsGrid}>
          {Array.from({ length: 4 }).map((_, idx) => (
            <ProductCardSkeleton key={idx} />
          ))}
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
          <ArrowRight
            size={14}
            style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '4px' }}
          />
        </Link>
      </div>

      <div className={styles.productsGrid}>
        {products.map((product) => (
          <ProductCard key={product.id || product.slug} product={product} />
        ))}
      </div>

      {/* Botão de destaque para ver todas as camisas no catálogo */}
      <div className={styles.ctaContainer}>
        <Link to="/catalogo" className={styles.viewAllButton}>
          <span>VER TODAS AS CAMISAS</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}

export default BestSellers;
