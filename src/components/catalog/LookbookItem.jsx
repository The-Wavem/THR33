import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import { logProductCardClick } from '../../services/analyticsService';
import { calculateBestDiscount } from '../../services/campaignService';
import { formatFitBadgeLabel, formatCategoryBadgeLabel } from '../../utils/fitUtils';
import styles from './LookbookItem.module.css';

export function LookbookItem({
  product,
  activeDiscounts = [],
  side = 'left',
  itemNumber = '01',
  isHovered = false,
  isSiblingHovered = false,
  onHoverStart,
  onHoverEnd
}) {
  const [bgLoaded, setBgLoaded] = useState(false);
  const navigate = useNavigate();
  const { toggleWishlist, isInWishlist } = useWishlist();

  if (!product) return null;

  const targetId = product.id || product.slug;
  const slugOrId = product.slug || product.id;
  const isFav = isInWishlist(slugOrId) || isInWishlist(targetId);

  // Verificação de Estoque (suporta número direto ou mapa de estoque por tamanho no Firestore)
  const isOutOfStock =
    (product.stock !== undefined && typeof product.stock !== 'object' && Number(product.stock) <= 0) ||
    (product.stock &&
      typeof product.stock === 'object' &&
      Object.values(product.stock).reduce((sum, qty) => sum + (Number(qty) || 0), 0) <= 0) ||
    (product.totalStock !== undefined && Number(product.totalStock) <= 0) ||
    product.inStock === false;

  // Cálculo de Desconto e Campanhas
  const discountInfo = calculateBestDiscount(product, activeDiscounts);
  const hasFreeShipping = Boolean(product.freeShipping || product.hasFreeShipping);
  const customBadgeText = product.customBadge && product.customBadge.trim() ? product.customBadge.trim() : null;

  // Camada 1 (Base - Foto Lifestyle / Modelo)
  const lifestyleImage =
    product.lifestyleImage ||
    product.secondaryImage ||
    product.hoverImage ||
    product.imageHover ||
    (Array.isArray(product.images) && product.images[1]) ||
    (Array.isArray(product.imagesGallery) &&
      product.imagesGallery.length > 1 &&
      (product.imagesGallery.find((img) => !img.isCover)?.url || product.imagesGallery[1]?.url)) ||
    product.image ||
    (Array.isArray(product.images) && product.images[0]) ||
    '';

  // Camada 2 (Frente - Cutout / Camisa Isolada que salta no Hover)
  const cutoutImage =
    product.cutoutImage ||
    (Array.isArray(product.images) && product.images[0]) ||
    (Array.isArray(product.imagesGallery) &&
      product.imagesGallery.length > 0 &&
      (product.imagesGallery.find((img) => img.isCover)?.url || product.imagesGallery[0]?.url)) ||
    product.image ||
    lifestyleImage;

  // Tamanhos disponíveis
  const sizesList =
    Array.isArray(product.sizes) && product.sizes.length > 0
      ? product.sizes
      : product.stock && typeof product.stock === 'object' && Object.keys(product.stock).length > 0
        ? Object.keys(product.stock)
        : ['P', 'M', 'G', 'GG'];

  const handleProductClick = (e) => {
    e.preventDefault();
    logProductCardClick(product.id || slugOrId, product.name, 'Catalog', product.category, product.fit, product.slug);
    navigate(`/produto/${slugOrId}`);
  };

  const handleFavoriteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  const formatCurrency = (val) => {
    return `R$ ${Number(val || 0).toFixed(2).replace('.', ',')}`;
  };

  const categoryLabel = formatCategoryBadgeLabel(product.category);
  const fitLabel = formatFitBadgeLabel(product.fit);

  return (
    <article
      className={`${styles.lookbookItem} ${side === 'right' ? styles.sideRight : styles.sideLeft} ${
        isHovered ? styles.itemHovered : ''
      } ${isSiblingHovered ? styles.itemDimmed : ''} ${isOutOfStock ? styles.itemOutOfStock : ''}`}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
    >
      {!bgLoaded && <div className={styles.shimmerBackdrop} aria-hidden="true" />}

      {/* FAIXA TRANSVERSAL DIAGONAL NO CANTO SUPERIOR ESQUERDO (FRETE GRÁTIS) */}
      {hasFreeShipping && (
        <div className={styles.cornerRibbonWrapper} title="Peça com Frete Grátis">
          <div className={styles.cornerRibbon}>
            FRETE GRÁTIS
          </div>
        </div>
      )}

      {/* PILHA DE BADGES (SINGULAR OU MÚTUA COM A FAIXA DE FRETE GRÁTIS, SEM SOBREPOSIÇÃO) */}
      {(isOutOfStock || discountInfo.hasDiscount || customBadgeText) && (
        <div className={`${styles.badgesStack} ${hasFreeShipping ? styles.badgesStackWithRibbon : ''}`}>
          {isOutOfStock && (
            <span className={styles.soldOutBadge}>ESGOTADO</span>
          )}
          {!isOutOfStock && discountInfo.hasDiscount && (
            <span className={styles.promoBadge}>-{discountInfo.discountPercentage}% OFF</span>
          )}
          {customBadgeText && (
            <span className={styles.customBadge}>{customBadgeText}</span>
          )}
        </div>
      )}

      {/* LINK EDITORIAL DE COBERTURA TOTAL */}
      <Link
        to={`/produto/${slugOrId}`}
        onClick={handleProductClick}
        className={styles.editorialLink}
        aria-label={`Ver peça ${product.name}`}
      >
        {/* CAMADA 1: FOTO BASE LIFESTYLE / MODELO */}
        <div className={styles.lifestyleLayer}>
          {lifestyleImage && (
            <img
              src={lifestyleImage}
              alt={product.name}
              loading="lazy"
              decoding="async"
              onLoad={() => setBgLoaded(true)}
              className={`${styles.lifestyleImg} ${bgLoaded ? styles.imgLoaded : ''}`}
            />
          )}
        </div>

        {/* CAMADA 2: DESTAQUE CUTOUT (POP-OUT NO HOVER) */}
        {cutoutImage && (
          <div className={styles.cutoutLayer} aria-hidden="true">
            <img
              src={cutoutImage}
              alt=""
              loading="lazy"
              decoding="async"
              className={styles.cutoutImg}
            />
          </div>
        )}

        {/* GRADIENTE SUTIL DE LEITURA APENAS NA BASE */}
        <div className={styles.bottomVignette} aria-hidden="true" />

        {/* CANTO INFERIOR: INFORMAÇÕES DA PEÇA */}
        <div className={styles.bottomEditorialInfo}>
          <div className={styles.tagsRow}>
            <span className={styles.categoryTag}>{categoryLabel}</span>
            {fitLabel && <span className={styles.fitTag}>{fitLabel}</span>}
          </div>

          <h2 className={styles.pieceTitle}>{product.name}</h2>

          <div className={styles.priceAndStatusRow}>
            {discountInfo.hasDiscount ? (
              <>
                <span className={styles.originalPrice}>
                  {formatCurrency(discountInfo.originalPrice)}
                </span>
                <span className={styles.currentPrice}>
                  {formatCurrency(discountInfo.finalPrice)}
                </span>
                {!isOutOfStock && (
                  <span className={styles.inlineEditorialTag}>
                    // -{discountInfo.discountPercentage}% OFF
                  </span>
                )}
              </>
            ) : (
              <span className={styles.currentPrice}>
                {formatCurrency(discountInfo.finalPrice)}
              </span>
            )}

            {isOutOfStock && (
              <span className={styles.inlineSoldOutTag}>// ESGOTADO</span>
            )}
          </div>

          {/* TAMANHOS DISPONÍVEIS: APENAS LETRAS ESPAÇADAS REVELADAS NO HOVER */}
          <div className={styles.sizesRevealRow} aria-label="Tamanhos disponíveis">
            {sizesList.map((sz) => {
              const sizeKey = String(sz).toUpperCase();
              const sizeHasStock =
                !product.stock ||
                typeof product.stock !== 'object' ||
                product.stock[sizeKey] === undefined ||
                Number(product.stock[sizeKey]) > 0;

              return (
                <span
                  key={sizeKey}
                  className={`${styles.sizeLetter} ${!sizeHasStock || isOutOfStock ? styles.sizeUnavailable : ''}`}
                >
                  {sizeKey}
                </span>
              );
            })}
          </div>
        </div>
      </Link>

      {/* CANTO SUPERIOR DIREITO: CORAÇÃO (WISHLIST) */}
      <button
        type="button"
        onClick={handleFavoriteClick}
        className={`${styles.wishlistTrigger} ${isFav ? styles.wishlistActive : ''}`}
        aria-label={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      >
        <Heart
          size={18}
          strokeWidth={1.85}
          fill={isFav ? '#ef4444' : 'none'}
          stroke={isFav ? '#ef4444' : '#ffffff'}
        />
      </button>
    </article>
  );
}

export default LookbookItem;
