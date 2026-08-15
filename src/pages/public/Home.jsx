import React, { useEffect, useState } from 'react';
import Hero from '../../sections/home/Hero';
import BentoGrid from '../../sections/home/BentoGrid';
import BestSellers from '../../sections/home/BestSellers';
import ProductCardSkeleton from '../../components/catalog/ProductCardSkeleton';
import { getVitrineSettings, getFeaturedProducts } from '../../services/catalogService';
import { seedService } from '../../services/seedService';
import styles from './Home.module.css';

export function Home() {
  const [vitrine, setVitrine] = useState(null);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHomeData() {
      try {
        await seedService.seedCatalogIfEmpty();
        const [vitrineData, productsData] = await Promise.all([
          getVitrineSettings(),
          getFeaturedProducts(8)
        ]);

        setVitrine(vitrineData);
        setFeaturedProducts(productsData);
      } catch (err) {
        console.error('Falha ao carregar dados da Home:', err);
      } finally {
        setLoading(false);
      }
    }

    loadHomeData();
  }, []);

  if (loading) {
    return (
      <main className={styles.homeContainer}>
        <div style={{ padding: '4rem 1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
          <ProductCardSkeleton count={4} />
        </div>
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
