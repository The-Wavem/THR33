import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import { analyticsService } from '../../services/analyticsService';
import styles from './ProductCard.module.css';

export function ProductCard({ product }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const { isFavorite, toggleFavorite } = useWishlist();
  
  const productId = product.slug || product.id;
  const isFav = isFavorite(productId);

  const handleTrackClick = () => {
    analyticsService.trackProductView(productId, product.name);
  };

  const handleFavoriteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(product);
  };

  return (
    <div className={styles.card} onClick={handleTrackClick}>
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

        {/* BOTÕES DE AÇÃO: VER DETALHES + FAVORITAR */}
        <div className={styles.overlayActions}>
          <Link 
            className={styles.overlayBtn} 
            to={`/produto/${productId}`}
            onClick={(e) => {
              e.stopPropagation();
              handleTrackClick();
            }}
          >
            VER DETALHES
          </Link>

          <button 
            type="button"
            onClick={handleFavoriteClick}
            className={`${styles.favoriteBtn} ${isFav ? styles.favoriteActive : ''}`}
            aria-label={isFav ? "Remover dos favoritos" : "Salvar nos favoritos"}
            title={isFav ? "Remover dos favoritos" : "Salvar nos favoritos"}
          >
            <Heart 
              size={16} 
              fill={isFav ? "#ef4444" : "none"} 
              stroke={isFav ? "#ef4444" : "currentColor"} 
            />
          </button>
        </div>
      </div>

      <div className={styles.details}>
        <div className={styles.tagsRow}>
          <span className={styles.fitTag}>{product.fit?.toUpperCase()} FIT</span>
          <span className={styles.dropTag}>{product.drop === 'leak-two' ? 'LEAK TWO' : 'DROP ANTERIOR'}</span>
        </div>
        <h3 className={styles.productName}>{product.name}</h3>
        <p className={styles.price}>R$ {product.price?.toFixed(2)}</p>
      </div>
    </div>
  );
}

export default ProductCard;
