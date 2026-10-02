import React from 'react';
import { useHomeData } from '../../hooks/useHomeData';
import Hero from '../../sections/home/Hero';
import BentoGrid from '../../sections/home/BentoGrid';
import BestSellers from '../../sections/home/BestSellers';
import Container from '../../components/layout/Container';
import ProductCardSkeleton from '../../components/catalog/ProductCardSkeleton';
import styles from './Home.module.css';

export function Home() {
  const { vitrine, featuredProducts, loading } = useHomeData(8);

  if (loading) {
    return (
      <main className={styles.homeContainer}>
        <Container size="default" style={{ padding: '4rem 0' }}>
          <ProductCardSkeleton count={4} />
        </Container>
      </main>
    );
  }

  return (
    <main className={styles.homeContainer}>
      <Hero bannerData={vitrine?.hero} />
      <BentoGrid 
        gridItems={vitrine?.bentoGrid || []} 
        sectionTag={vitrine?.sectionTag}
        sectionTitle={vitrine?.sectionTitle}
      />
      <BestSellers products={featuredProducts} />
    </main>
  );
}

export default Home;
