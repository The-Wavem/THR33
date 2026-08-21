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

  const priceNum = Number(product.price || 0);
  const discountPriceNum = Number(product.discountPrice || 0);
  const hasDiscount = Boolean(discountPriceNum > 0 && discountPriceNum < priceNum && product.discountActive !== false);

  const handleTrackClick = () => {
    analyticsService.trackProductView(product.id || productId, product.name, product.category, product.fit, product.slug);
  };

  const handleFavoriteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(product);
  };

  return (
    <div className={styles.card} onClick={handleTrackClick}>
      <div className={styles.imageWrapper}>
        {hasDiscount ? (
          <span className={styles.promoBadge}>PROMOÇÃO</span>
        ) : (product.customBadge && product.customBadge.trim()) ? (
          <span className={styles.badge}>{product.customBadge.trim()}</span>
        ) : null}
        
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
          <span className={styles.fitTag}>{(product.fit || 'boxy').toUpperCase()} FIT</span>
          <span className={styles.dropTag}>{product.drop === 'leak-two' ? 'LEAK TWO' : 'DROP ANTERIOR'}</span>
        </div>
        
        <h3 className={styles.productName}>{product.name}</h3>

        <div className={styles.priceRow}>
          {hasDiscount ? (
            <>
              <span className={styles.oldPrice}>
                R$ {priceNum.toFixed(2).replace('.', ',')}
              </span>
              <span className={styles.promoPrice}>
                R$ {discountPriceNum.toFixed(2).replace('.', ',')}
              </span>
            </>
          ) : (
            <span className={styles.regularPrice}>
              R$ {priceNum.toFixed(2).replace('.', ',')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
