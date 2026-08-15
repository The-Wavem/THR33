import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import styles from './BentoGrid.module.css';

const DEFAULT_BENTO_DATA = {
  sectionTag: "ENSAIO DE CAMPANHA",
  sectionTitle: "A RUA COMO NOSSO ATELIÊ",
  cards: [
    {
      id: "bento_1",
      title: "OVERSIZED FIT",
      buttonText: "VER MAIS",
      link: "/catalogo?modelagem=oversized",
      image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop",
      size: "large",
      active: true
    },
    {
      id: "bento_2",
      title: "BOXY TEES",
      buttonText: "VER MAIS",
      link: "/catalogo?modelagem=boxy",
      image: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?q=80&w=600&auto=format&fit=crop",
      size: "normal",
      active: true
    },
    {
      id: "bento_3",
      title: "EDITION FOR THE FEW",
      buttonText: "VER MAIS",
      link: "/catalogo?drop=leak-two",
      image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=600&auto=format&fit=crop",
      size: "normal",
      active: true
    }
  ]
};

export function BentoGrid() {
  const [bentoData, setBentoData] = useState(DEFAULT_BENTO_DATA);

  useEffect(() => {
    async function loadBento() {
      try {
        const snap = await getDoc(doc(db, 'storefront', 'home_bento'));
        if (snap.exists() && snap.data().cards?.length > 0) {
          setBentoData(snap.data());
        }
      } catch (err) {
        console.warn("Aviso ao carregar grade bento do Firestore:", err.message);
      }
    }
    loadBento();
  }, []);

  const activeCards = (bentoData.cards || []).filter(c => c.active);

  if (activeCards.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <span className={styles.tag}>{bentoData.sectionTag || 'ENSAIO DE CAMPANHA'}</span>
        <h2 className={styles.title}>{bentoData.sectionTitle || 'A RUA COMO NOSSO ATELIÊ'}</h2>
      </div>

      <div className={styles.grid}>
        {activeCards.map((item) => (
          <div 
            key={item.id} 
            className={`${styles.card} ${item.size === 'large' ? styles.cardLarge : ''}`}
          >
            <img 
              src={item.image} 
              alt={item.title} 
              className={styles.cardImage}
            />
            <div className={styles.cardOverlay}>
              <span className={styles.cardCaption}>{item.title}</span>
              <Link className={styles.lowOpacityBtn} to={item.link || '/catalogo'}>
                {item.buttonText || 'VER MAIS'}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default BentoGrid;
