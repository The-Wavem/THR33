import React from 'react';
import { motion } from 'framer-motion';
import { Camera, ArrowUpRight } from 'lucide-react';
import { fadeInUp, staggerContainer } from '../../utils/motionVariants';
import styles from './SocialCommunityGrid.module.css';

const socialPosts = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=800',
    tag: '@THR33.ATELIER',
    location: 'SÃO PAULO // VIELA 01'
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800',
    tag: '#FORTHEFEW',
    location: 'STUDIO SESSION 35MM'
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=800',
    tag: 'COMUNIDADE R.U.A',
    location: 'BECO DO GRIT'
  },
  {
    id: 4,
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800',
    tag: 'DETAILS 280GSM',
    location: 'TESTE DE PIGMENTO'
  }
];

export function SocialCommunityGrid() {
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
        {socialPosts.map((post, idx) => (
          <motion.div 
            key={post.id} 
            variants={fadeInUp}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
            className={`${styles.bentoCell} ${idx === 0 ? styles.bentoCellLarge : ''}`}
          >
            <img src={post.image} alt={post.tag} className={styles.cellImg} />
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
