import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, ArrowRight } from 'lucide-react';
import { buttonTactile, arrowSlide, imageInnerZoom } from '../../utils/motionVariants';
import styles from './ProductCard.module.css';

export function ProductCard({ product, onToggleWishlist, isWishlisted }) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const handleNavigatePDP = () => {
    navigate(`/produto/${product.slug || product.id}`);
  };

  return (
    <motion.div 
      className={styles.cardContainer}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial="rest"
      animate="rest"
      whileHover="hover"
      onClick={handleNavigatePDP}
    >
      {/* CARD TOP TAGS & WISHLIST */}
      <div className={styles.cardHeader}>
        <span className={styles.tagBadge}>{product.tag || 'FOR THE FEW'}</span>
        
        <motion.button 
          whileTap={{ scale: 0.85 }}
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleWishlist) onToggleWishlist(product.id);
          }}
          className={styles.wishlistBtn}
          title="Favoritar Peça"
        >
          <Star size={16} className={isWishlisted ? styles.starActive : ''} />
        </motion.button>
      </div>

      {/* FRAME DA FOTO COM ZOOM SUTIL NO CONTAINER */}
      <div className={styles.imageFrame}>
        <motion.img 
          variants={imageInnerZoom}
          src={isHovered && product.hoverImage ? product.hoverImage : product.image} 
          alt={product.title} 
          className={styles.prodImage}
        />
        
        <div className={styles.priceTag}>{product.priceFormatted || product.price}</div>
      </div>

      {/* DETALHES DA PEÇA & BOTÃO TÁTIL DE NAVEGAÇÃO */}
      <div className={styles.cardDetails}>
        <div>
          <h3 className={styles.productTitle}>{product.title}</h3>
          <p className={styles.fabricSub}>{product.fabric || product.categoryLabel || 'ALGODÃO 280GSM'}</p>
        </div>

        <motion.button 
          variants={buttonTactile}
          whileTap="tap"
          onClick={(e) => {
            e.stopPropagation();
            handleNavigatePDP();
          }}
          className={styles.btnDetails}
        >
          <span>[ VER DETALHES DA PEÇA ]</span>
          <motion.div variants={arrowSlide}>
            <ArrowRight size={14} />
          </motion.div>
        </motion.button>
      </div>
    </motion.div>
  );
}

export default ProductCard;
