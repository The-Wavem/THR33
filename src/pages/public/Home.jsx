import React, { Suspense } from 'react';
import { useHomeData } from '../../hooks/useHomeData';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
import Hero from '../../sections/home/Hero';
import BentoGrid from '../../sections/home/BentoGrid';
import BestSellers from '../../sections/home/BestSellers';
import Container from '../../components/layout/Container';
import ProductCardSkeleton from '../../components/catalog/ProductCardSkeleton';
import { SEO } from '../../components/common/SEO';
import { buildFaqSchema } from '../../utils/seoSchemas';
import styles from './Home.module.css';

// FAQ Estruturado da Home para Rich Snippets
const HOME_FAQ_LIST = [
  {
    question: 'Como funcionam os drops e lotes limitados?',
    answer: 'Cada drop é produzido em tiragem única numerada. Uma vez esgotado o lote, a peça entra para o arquivo histórico e não retorna em reposições normais.'
  },
  {
    question: 'Qual a gramatura e qualidade do tecido?',
    answer: 'Utilizamos malhas pesadas de algodão selecionado que variam entre 280GSM e 380GSM (Heavyweight), com toque macio e acabamento reforçado com costura dupla.'
  },
  {
    question: 'Qual o prazo de envio tático?',
    answer: 'Pedidos do drop prioritário são despachados em embalagem selada em até 48 horas úteis com rastreamento expresso direto para todo o Brasil.'
  },
  {
    question: 'Posso realizar a troca caso o tamanho não sirva?',
    answer: 'Sim, você possui 30 dias após o recebimento para solicitar a troca por outro tamanho disponível ou crédito na loja, desde que a peça mantenha os lacres e etiquetas originais.'
  }
];

// Schema JSON-LD estático pré-calculado no escopo do módulo para custo ZERO de re-render
const HOME_FAQ_SCHEMA = buildFaqSchema(HOME_FAQ_LIST);

// Lazy loading assíncrono das seções abaixo da dobra com retry automático
const SocialCommunityGrid = lazyWithRetry(() => import('../../components/common/SocialCommunityGrid'));
const DropFaq = lazyWithRetry(() => import('../../components/common/DropFaq'));
const NewsletterVIP = lazyWithRetry(() => import('../../components/common/NewsletterVIP'));

export function Home() {
  const { vitrine, featuredProducts, communityPosts, loading } = useHomeData(8);

  return (
    <main className={styles.homeContainer}>
      <SEO
        title="THR33 // FOR THE FEW — Streetwear Autoral & Drops Exclusivos"
        description="THR33 Streetwear — Moda urbana autoral em Curitiba com modelagens Boxy e Oversized exclusivas, malha heavyweight e produção sob demanda para todo o Brasil. For the few."
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
