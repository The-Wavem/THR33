import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Star, Check } from 'lucide-react';
import { buttonTactile, arrowSlide, imageInnerZoom } from '../../utils/motionVariants';
import styles from './ProductCard.module.css';

export function ProductCard({ product, onAddToCart, onToggleWishlist, isWishlisted }) {
  const [selectedSize, setSelectedSize] = useState('M');
  const [isHovered, setIsHovered] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const handleQuickAdd = (e) => {
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart({ ...product, selectedSize });
    }
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  return (
    <motion.div 
      className={styles.cardContainer}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial="rest"
      animate="rest"
      whileHover="hover"
    >
      {/* CARD TOP TAGS */}
      <div className={styles.cardHeader}>
        <span className={styles.tagBadge}>{product.tag || 'FOR THE FEW'}</span>
        
        <motion.button 
          whileTap={{ scale: 0.85 }}
          onClick={() => onToggleWishlist && onToggleWishlist(product.id)}
          className={styles.wishlistBtn}
        >
          <Star size={16} className={isWishlisted ? styles.starActive : ''} />
        </motion.button>
      </div>

      {/* FRAME DA FOTO COM ZOOM SUTIL NO CONTAINER */}
      <Link to={`/produto/${product.slug}`} className={styles.imageFrame}>
        <motion.img 
          variants={imageInnerZoom}
          src={isHovered && product.hoverImage ? product.hoverImage : product.image} 
          alt={product.title} 
          className={styles.prodImage}
        />
        
        <div className={styles.priceTag}>{product.price}</div>

        {/* SELETOR DE TAMANHO SLIDE UP SUAVE */}
        <AnimatePresence>
          {isHovered && product.sizes && (
            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={styles.sizeSelectorBar}
              onClick={(e) => e.preventDefault()}
            >
              <span className={styles.sizeLabel}>SELECIONAR TAMANHO:</span>
              <div className={styles.sizeGrid}>
                {product.sizes.map((sz) => (
                  <motion.button
                    key={sz}
                    whileTap={{ scale: 0.92 }}
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedSize(sz);
                    }}
                    className={selectedSize === sz ? styles.sizeActive : styles.sizeBtn}
                  >
                    {sz}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Link>

      {/* DETALHES DA PEÇA & BOTÃO TÁTIL */}
      <div className={styles.cardDetails}>
        <div>
          <h3 className={styles.productTitle}>{product.title}</h3>
          <p className={styles.fabricSub}>{product.fabric || 'ALGODÃO 280GSM'}</p>
        </div>

        <motion.button 
          variants={buttonTactile}
          whileTap="tap"
          onClick={handleQuickAdd}
          className={styles.btnBuy}
        >
          {justAdded ? <Check size={14} /> : <ShoppingBag size={14} />}
          <span>{justAdded ? 'ADICIONADO!' : `[ COMPRAR AGORA (${selectedSize}) ]`}</span>
        </motion.button>
      </div>
    </motion.div>
  );
}

export default ProductCard;
