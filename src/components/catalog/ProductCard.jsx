import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './ProductCard.module.css';

export function ProductCard({ product }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const productId = product.slug || product.id;

  return (
    <div className={styles.card}>
      <div className={styles.imageWrapper}>
        {product.isRelease && <span className={styles.badge}>LANÇAMENTO</span>}
        
        {/* Placeholder com Shimmer enquanto a imagem carrega */}
        {!imageLoaded && <div className={styles.imagePlaceholderShimmer} />}

        <img 
          src={product.image} 
          alt={product.name} 
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          className={`${styles.image} ${imageLoaded ? styles.imageVisible : styles.imageHidden}`} 
        />

        <Link className={styles.overlayBtn} to={`/produto/${productId}`}>
          VER DETALHES
        </Link>
      </div>

      <div className={styles.details}>
        <div className={styles.tagsRow}>
          <span className={styles.fitTag}>{product.fit.toUpperCase()} FIT</span>
          <span className={styles.dropTag}>{product.drop === 'leak-two' ? 'LEAK TWO' : 'DROP ANTERIOR'}</span>
        </div>
        <h3 className={styles.productName}>{product.name}</h3>
        <p className={styles.price}>R$ {product.price.toFixed(2)}</p>
      </div>
    </div>
  );
}

export default ProductCard;
