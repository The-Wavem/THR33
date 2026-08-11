import React from 'react';
import Hero from '../../sections/home/Hero';
import BentoGrid from '../../sections/home/BentoGrid';
import BestSellers from '../../sections/home/BestSellers';
import styles from './Home.module.css';

export function Home() {
  return (
    <main className={styles.homeContainer}>
      <Hero />
      <BentoGrid />
      <BestSellers />
    </main>
  );
}

export default Home;
