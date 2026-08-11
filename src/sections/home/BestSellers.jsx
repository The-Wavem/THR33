import React from 'react';
import { Link } from 'react-router-dom';
import styles from './BestSellers.module.css';

const MOCK_BEST_SELLERS = [
  {
    id: "1",
    name: "Camiseta THR33 Boxy Black",
    fit: "Boxy Fit",
    price: 189.90,
    image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: "2",
    name: "Camiseta For The Few Oversized",
    fit: "Oversized Fit",
    price: 199.90,
    image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: "3",
    name: "Jaqueta Street Ateliê",
    fit: "Jaqueta Heavy",
    price: 459.90,
    image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=600&auto=format&fit=crop"
  }
];

export function BestSellers() {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div>
          <span className={styles.tag}>Destaques do Mês</span>
          <h2 className={styles.title}>MAIS VENDIDOS</h2>
        </div>
        <Link className={styles.seeMoreLink} to="/catalogo">
          VER CATÁLOGO COMPLETO &rarr;
        </Link>
      </div>

      <div className={styles.productsGrid}>
        {MOCK_BEST_SELLERS.map((product) => (
          <div key={product.id} className={styles.productCard}>
            <div className={styles.imageWrapper}>
              <img src={product.image} alt={product.name} />
              <Link className={styles.quickViewBtn} to={`/produto/${product.id}`}>
                VER DETALHES
              </Link>
            </div>
            <div className={styles.productInfo}>
              <span className={styles.fitTag}>{product.fit}</span>
              <h3 className={styles.productName}>{product.name}</h3>
              <p className={styles.productPrice}>R$ {product.price.toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default BestSellers;
