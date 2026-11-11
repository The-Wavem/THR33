import React, { Suspense } from 'react';
import { useHomeData } from '../../hooks/useHomeData';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
import Hero from '../../sections/home/Hero';
import BentoGrid from '../../sections/home/BentoGrid';
import BestSellers from '../../sections/home/BestSellers';
import { SEO } from '../../components/common/SEO';
import { buildFaqSchema } from '../../utils/seoSchemas';
import { OFFICIAL_FAQ_ITEMS } from '../../components/common/DropFaq';
import styles from './Home.module.css';

// Schema JSON-LD estático pré-calculado no escopo do módulo para custo ZERO de re-render
const HOME_FAQ_SCHEMA = buildFaqSchema(OFFICIAL_FAQ_ITEMS);

// Lazy loading assíncrono das seções abaixo da dobra com retry automático
const SocialCommunityGrid = lazyWithRetry(() => import('../../components/common/SocialCommunityGrid'));
const DropFaq = lazyWithRetry(() => import('../../components/common/DropFaq'));
const NewsletterVIP = lazyWithRetry(() => import('../../components/common/NewsletterVIP'));

export function Home() {
  const { vitrine, featuredProducts, communityPosts, loading } = useHomeData(0);

  return (
    <main className={styles.homeContainer}>
      <SEO
        title="THR33 // FOR THE FEW — Streetwear Autoral & Drops Exclusivos"
        description="THR33 Streetwear — Moda urbana autoral em Curitiba com modelagens Boxy e Oversized exclusivas, malha heavyweight, estampa DTG e produção sob demanda para todo o Brasil. For the few."
        url="/"
        jsonLd={HOME_FAQ_SCHEMA}
      />
      <Hero bannerData={vitrine?.hero} isLoading={loading} />

      <BentoGrid
        gridItems={vitrine?.bentoGrid || []}
        sectionTag={vitrine?.sectionTag}
        sectionTitle={vitrine?.sectionTitle}
        isLoading={loading}
      />

      <BestSellers products={featuredProducts} isLoading={loading} />

      <Suspense fallback={null}>
        {communityPosts && communityPosts.length > 0 && (
          <SocialCommunityGrid posts={communityPosts} products={featuredProducts} />
        )}

        {vitrine?.showFaq && (
          <DropFaq />
        )}

        {vitrine?.showNewsletter && (
          <NewsletterVIP />
        )}
      </Suspense>
    </main>
  );
}

export default Home;
