import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, ShoppingBag, ArrowRight } from 'lucide-react';
import styles from './ProductCard.module.css';

export function ProductCard({ product, onAddToCart, onToggleWishlist, isWishlisted }) {
  const [isHovered, setIsHovered] = useState(false);
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] || 'M');
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/produto/${product.slug}`);
  };

  const handleQuickBuy = (e) => {
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart({ ...product, selectedSize });
    }
  };

  return (
    <div 
      className={`${styles.card} ${isHovered ? styles.cardHovered : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* HEADER TAG & WISHLIST */}
      <div className={styles.cardHeader}>
        <span className={product.isArchived ? styles.tagArchived : styles.tagStandard}>
          {product.tag}
        </span>
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleWishlist(product.id); }}
          className={styles.wishlistBtn}
          title="Guardar na Lista"
        >
          <Star size={16} className={isWishlisted ? styles.starActive : styles.starInactive} />
        </button>
      </div>

      {/* NATURAL COLOR IMAGE FRAME */}
      <div className={styles.imageContainer}>
        <img 
          src={isHovered && product.hoverImage ? product.hoverImage : product.image} 
          alt={product.title} 
          className={styles.productImage} 
        />
        <div className={styles.fitBadge}>{product.fit} FIT</div>
        
        {/* SIZE SELECTOR ON HOVER */}
        {isHovered && (
          <div className={styles.sizeOverlay} onClick={(e) => e.stopPropagation()}>
            <span className={styles.sizeTitle}>TAMANHO:</span>
            <div className={styles.sizeList}>
              {product.sizes.map((sz) => (
                <button
                  key={sz}
                  onClick={() => setSelectedSize(sz)}
                  className={selectedSize === sz ? styles.sizeActive : styles.sizeBtn}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CARD INFO & DETAILS */}
      <div className={styles.cardContent}>
        <span className={styles.fabricText}>{product.fabric}</span>
        <h3 className={styles.productTitle}>{product.title}</h3>
        <div className={styles.priceRow}>
          <strong className={styles.price}>{product.price}</strong>
          <span className={styles.installments}>6x de R$ {(product.priceNum / 6).toFixed(2)}</span>
        </div>

        <div className={styles.actionButtons}>
          <button onClick={handleQuickBuy} className={styles.btnQuickAdd}>
            <ShoppingBag size={14} />
            <span>[ COMPRAR ]</span>
          </button>
          <button className={styles.btnDetails}>
            <span>VER PEÇA</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
