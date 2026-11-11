import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Flame } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import { analyticsService } from '../../services/analyticsService';
import { formatCategoryBadgeLabel } from '../../utils/fitUtils';
import ImageWithSkeleton from '../ui/ImageWithSkeleton';
import { preloadRoute } from '../../utils/preloader';
import styles from './ProductCard.module.css';

export function ProductCard({ product, rank = null }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const { isFavorite, toggleFavorite } = useWishlist();
  
  const productId = product.slug || product.id;
  const isFav = isFavorite(productId);

  const priceNum = Number(product.price || 0);
  const discountPriceNum = Number(product.discountPrice || 0);
  const hasDiscount = Boolean(discountPriceNum > 0 && discountPriceNum < priceNum && product.discountActive !== false);
  const hasFreeShipping = Boolean(product.freeShipping || product.hasFreeShipping);
  const isTop3 = typeof rank === 'number' && rank >= 1 && rank <= 3;

  // Faixa de preço considerando modelagens (fitPrices)
  const priceRange = useMemo(() => {
    if (product.fitPrices && typeof product.fitPrices === 'object') {
      const activePrices = Object.values(product.fitPrices)
        .map(Number)
        .filter(n => !isNaN(n) && n > 0);
      if (activePrices.length > 0) {
        const min = Math.min(...activePrices);
        const max = Math.max(...activePrices);
        return { min, max, hasRange: max > min };
      }
    }
    const singlePrice = Number(product.price || 0);
    return { min: singlePrice, max: singlePrice, hasRange: false };
  }, [product.fitPrices, product.price]);

  const handleTrackClick = () => {
    analyticsService.trackProductView(product.id || productId, product.name, product.category, product.fit, product.slug);
  };

  const handleFavoriteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(product);
  };

  // Imagem principal do produto
  const primaryImage = product.image || (Array.isArray(product.images) && product.images[0]) || '';

  // Imagem secundária (lado / costas / detalhe para transição minimalista ao passar o mouse)
  const secondaryImage = 
    product.secondaryImage || 
    product.hoverImage || 
    product.imageHover || 
    (Array.isArray(product.images) && product.images.length > 1 ? product.images[1] : null) ||
    (Array.isArray(product.imagesGallery) && product.imagesGallery.length > 1 
      ? (product.imagesGallery.find(img => !img.isCover)?.url || product.imagesGallery[1]?.url)
      : null);

  const hasSecondaryImage = Boolean(secondaryImage && secondaryImage !== primaryImage);

  return (
    <article 
      className={`${styles.card} ${isTop3 ? `${styles.topSellerCard} ${styles[`topSellerRank${rank}`]}` : ''}`}
      onMouseEnter={() => preloadRoute('/produto/' + productId)}
      onTouchStart={() => preloadRoute('/produto/' + productId)}
    >
      <div className={styles.imageWrapper}>
        {/* FAIXA TRANSVERSAL DIAGONAL NO CANTO SUPERIOR (FRETE GRÁTIS) */}
        {hasFreeShipping && (
          <div className={styles.cornerRibbonWrapper} title="Peça com Frete Grátis">
            <div className={styles.cornerRibbon}>
              FRETE GRÁTIS
            </div>
          </div>
        )}

        {/* SELO NO CANTO SUPERIOR ESQUERDO (PROMO / BADGE) */}
        <div className={`${styles.topLeftBadgesStack} ${hasFreeShipping ? styles.promoBadgeWithRibbon : ''}`}>
          {hasDiscount ? (
            <span className={styles.promoBadge}>PROMOÇÃO</span>
          ) : (product.customBadge && product.customBadge.trim()) ? (
            <span className={styles.badge}>{product.customBadge.trim()}</span>
          ) : null}
        </div>
        
        {/* Link direto da Imagem para a PDP com troca suave ao passar o mouse */}
        <Link 
          to={`/produto/${productId}`} 
          className={`${styles.imageLink} ${hasSecondaryImage ? styles.hasSecondary : ''}`}
          onClick={handleTrackClick}
          aria-label={`Ver detalhes de ${product.name}`}
        >
          <ImageWithSkeleton 
            src={primaryImage} 
            alt={product.name} 
            aspectRatio="3/4"
            onLoad={() => setImageLoaded(true)}
            className={`${styles.image} ${styles.primaryImage} ${imageLoaded ? styles.imageVisible : styles.imageHidden}`} 
          />

          {hasSecondaryImage && (
            <img 
              src={secondaryImage} 
              alt={`${product.name} - Imagem alternativa`} 
              loading="lazy"
              decoding="async"
              className={`${styles.image} ${styles.secondaryImage}`} 
            />
          )}
        </Link>

        {/* BOTÃO DE FAVORITO EM POSIÇÃO ABSOLUTA NO CANTO SUPERIOR DIREITO (TOUCH >= 44PX) */}
        <button 
          type="button"
          onClick={handleFavoriteClick}
          className={`${styles.favoriteBtn} ${isFav ? styles.favoriteActive : ''}`}
          aria-label={isFav ? "Remover dos favoritos" : "Salvar nos favoritos"}
          title={isFav ? "Remover dos favoritos" : "Salvar nos favoritos"}
        >
          <Heart 
            size={18} 
            fill={isFav ? "#ef4444" : "none"} 
            stroke={isFav ? "#ef4444" : "currentColor"} 
          />
        </button>

        {/* OVERLAY ACTIONS APENAS DESKTOP */}
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
        </div>
      </div>

      {/* DETALHES COM LINK DIRETO PARA A PDP */}
      <Link 
        to={`/produto/${productId}`} 
        className={styles.detailsLink}
        onClick={handleTrackClick}
        aria-label={`Ver detalhes de ${product.name}`}
      >
        <div className={styles.details}>
          <div className={styles.tagsRow}>
            <span className={styles.categoryTag}>{formatCategoryBadgeLabel(product.category)}</span>
            {isTop3 && (
              <span className={styles.topSellerMetaTag}>
                <Flame size={11} />
                <span>TOP {rank}</span>
              </span>
            )}
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
            ) : priceRange.hasRange ? (
              <div className={styles.priceRangeGroup}>
                <span className={styles.regularPrice}>
                  R$ {priceRange.min.toFixed(2).replace('.', ',')}
                </span>
                <span className={styles.maxPriceNotice}>
                  — R$ {priceRange.max.toFixed(2).replace('.', ',')}
                </span>
              </div>
            ) : (
              <span className={styles.regularPrice}>
                R$ {priceNum.toFixed(2).replace('.', ',')}
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}

export default ProductCard;
