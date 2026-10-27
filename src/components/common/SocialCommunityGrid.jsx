import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Camera, ArrowUpRight } from 'lucide-react';
import ImageWithSkeleton from '../ui/ImageWithSkeleton';
import { fadeInUp, staggerContainer } from '../../utils/motionVariants';
import styles from './SocialCommunityGrid.module.css';

export function SocialCommunityGrid({ posts = [], products = [] }) {
  // Consome posts reais vindos do useHomeData (settings/home) ou fotos reais de produtos cadastrados no catálogo
  const resolvedPosts = useMemo(() => {
    const isRealImage = (url) =>
      Boolean(url) &&
      !String(url).includes('images.unsplash.com') &&
      !String(url).includes('picsum.photos');

    if (Array.isArray(posts) && posts.length > 0) {
      const validPosts = posts.filter((p) => isRealImage(p?.image || p?.imageUrl));
      if (validPosts.length > 0) {
        return validPosts.slice(0, 4).map((p, idx) => ({
          id: p.id || `cms-post-${idx}`,
          image: p.image || p.imageUrl,
          tag: p.tag || p.handle || '@THR33.ATELIER',
          location: p.location || p.caption || 'CURITIBA // ATELIÊ'
        }));
      }
    }

    if (Array.isArray(products) && products.length > 0) {
      const productFrames = [];
      for (const prod of products) {
        const img =
          prod?.lifestyleImage ||
          prod?.secondaryImage ||
          (Array.isArray(prod?.images) && prod.images[1]) ||
          prod?.image;
        if (isRealImage(img)) {
          productFrames.push({
            id: prod.id || prod.slug || `prod-frame-${productFrames.length}`,
            image: img,
            tag: prod.name ? prod.name.toUpperCase() : '@THR33.ATELIER',
            location: prod.fit ? `MODELAGEM ${String(prod.fit).toUpperCase()}` : 'CURITIBA // CWB'
          });
        }
        if (productFrames.length >= 4) break;
      }
      return productFrames;
    }

    return [];
  }, [posts, products]);

  // Se ainda não houver posts reais cadastrados no CMS nem fotos reais no catálogo, retorna null
  if (!resolvedPosts || resolvedPosts.length === 0) {
    return null;
  }

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={fadeInUp}
      className={styles.sectionContainer}
    >
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <Camera size={16} className={styles.acidIcon} />
          <h2>CULTURA & COMUNIDADE // @THR33.ATELIER</h2>
        </div>
        <motion.a
          whileHover={{ x: 2, y: -2 }}
          transition={{ duration: 0.15 }}
          href="https://instagram.com"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.btnInstagram}
        >
          <span>SIGA NO INSTAGRAM</span>
          <ArrowUpRight size={14} />
        </motion.a>
      </div>

      <motion.div variants={staggerContainer} className={styles.bentoGrid}>
        {resolvedPosts.map((post, idx) => (
          <motion.div
            key={post.id}
            variants={fadeInUp}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
            className={`${styles.bentoCell} ${idx === 0 ? styles.bentoCellLarge : ''}`}
          >
            <ImageWithSkeleton
              src={post.image}
              alt={post.tag}
              aspectRatio="1/1"
              className={styles.cellImg}
              style={{ width: '100%', height: '100%' }}
            />
            <div className={styles.cellOverlay} />
            <div className={styles.cellFooter}>
              <span className={styles.cellTag}>{post.tag}</span>
              <span className={styles.cellLoc}>{post.location}</span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}

export default SocialCommunityGrid;
