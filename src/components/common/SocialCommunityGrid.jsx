import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Camera } from 'lucide-react';
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
    <section className={styles.sectionContainer}>
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <Camera size={16} className={styles.acidIcon} />
          <h2>CULTURA & COMUNIDADE // @THR33.ATELIER</h2>
        </div>
        <a 
          href="https://instagram.com" 
          target="_blank" 
          rel="noopener noreferrer" 
          className={styles.btnInstagram}
        >
          <span>SIGA NO INSTAGRAM</span>
          <ArrowUpRight size={14} />
        </a>
      </div>

      <div className={styles.bentoGrid}>
        {socialPosts.map((post, idx) => (
          <motion.div 
            key={post.id} 
            whileHover={{ y: -4 }}
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
      </div>
    </section>
  );
}

export default SocialCommunityGrid;
