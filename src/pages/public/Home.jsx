import React, { Suspense } from 'react';
import { useHomeData } from '../../hooks/useHomeData';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
import Hero from '../../sections/home/Hero';
import Container from '../../components/layout/Container';
import ProductCardSkeleton from '../../components/catalog/ProductCardSkeleton';
import styles from './Home.module.css';

// Lazy loading assíncrono das seções abaixo da dobra com retry automático
const BentoGrid = lazyWithRetry(() => import('../../sections/home/BentoGrid'));
const BestSellers = lazyWithRetry(() => import('../../sections/home/BestSellers'));
const SocialCommunityGrid = lazyWithRetry(() => import('../../components/common/SocialCommunityGrid'));
const DropFaq = lazyWithRetry(() => import('../../components/common/DropFaq'));
const NewsletterVIP = lazyWithRetry(() => import('../../components/common/NewsletterVIP'));

export function Home() {
  const { vitrine, featuredProducts, communityPosts, loading } = useHomeData(8);

  return (
    <main className={styles.homeContainer}>
      <Hero bannerData={vitrine?.hero} isLoading={loading} />

      <Suspense
        fallback={
          <Container size="default" style={{ padding: '4rem 1.5rem' }}>
            <ProductCardSkeleton count={3} />
          </Container>
        }
      >
        <BentoGrid
          gridItems={vitrine?.bentoGrid || []}
          sectionTag={vitrine?.sectionTag}
          sectionTitle={vitrine?.sectionTitle}
          isLoading={loading}
        />
      </Suspense>

      <Suspense
        fallback={
          <Container size="default" style={{ padding: '4rem 1.5rem' }}>
            <ProductCardSkeleton count={4} />
          </Container>
        }
      >
        <BestSellers products={featuredProducts} isLoading={loading} />
      </Suspense>

      {communityPosts && communityPosts.length > 0 && (
        <Suspense fallback={null}>
          <SocialCommunityGrid posts={communityPosts} products={featuredProducts} />
        </Suspense>
      )}

      {vitrine?.showFaq && (
        <Suspense fallback={null}>
          <DropFaq />
        </Suspense>
      )}

      {vitrine?.showNewsletter && (
        <Suspense fallback={null}>
          <NewsletterVIP />
        </Suspense>
      )}
    </main>
  );
}

export default Home;
