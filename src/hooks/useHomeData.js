import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { getVitrineSettings, fetchProducts, getFeaturedProducts } from '../services/catalogService';
import largoDaOrdemBg from '@assets/images/largo-da-ordem-bg.jpeg';
import largoDaOrdemBg2 from '@assets/images/largo-da-ordem-bg2.jpeg';

const REAL_FALLBACK_HERO_SLIDES = [
  {
    id: 'slide_1',
    title: 'A RUA COMO NOSSO ATELIÊ',
    subtitle: 'LEAK TWO — DROP EXCLUSIVO',
    badge: 'NOVO DROP',
    bgImage: largoDaOrdemBg,
    active: true,
    buttons: [
      { id: 'btn_1', text: 'VER LANÇAMENTOS', link: '/catalogo', variant: 'primary' },
      { id: 'btn_2', text: 'CONHEÇA A MARCA', link: '/sobre', variant: 'secondary' }
    ]
  },
  {
    id: 'slide_2',
    title: 'FOR THE FEW.',
    subtitle: 'STREETWEAR URBANO & CURITIBANO',
    badge: 'COLEÇÃO 2026',
    bgImage: largoDaOrdemBg2,
    active: true,
    buttons: [
      { id: 'btn_1', text: 'EXPLORAR CATÁLOGO', link: '/catalogo', variant: 'primary' },
      { id: 'btn_2', text: 'CONHEÇA O ATELIÊ', link: '/sobre', variant: 'secondary' }
    ]
  }
];

const isProductInStock = (product) => {
  if (!product) return false;
  if (product.inStock === false) return false;
  if (product.totalStock !== undefined && Number(product.totalStock) <= 0) return false;
  if (product.stock !== undefined && typeof product.stock !== 'object' && Number(product.stock) <= 0) {
    return false;
  }
  if (product.stock && typeof product.stock === 'object') {
    const sum = Object.values(product.stock).reduce((acc, q) => acc + (Number(q) || 0), 0);
    if (sum <= 0) return false;
  }
  return true;
};

/**
 * Hook customizado para gerenciar a camada de dados reais da Home (Sem Mocks da Unsplash)
 */
export function useHomeData(limitProducts = 8) {
  const [vitrine, setVitrine] = useState(null);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [vitrineData, homeDocSnap, allProducts] = await Promise.all([
        getVitrineSettings().catch((err) => {
          console.warn('Aviso ao carregar settings/vitrine:', err.message);
          return null;
        }),
        getDoc(doc(db, 'settings', 'home')).catch(() => null),
        fetchProducts().catch((err) => {
          console.warn('Aviso ao carregar produtos reais do catálogo:', err.message);
          return [];
        })
      ]);

      const homeSettings = homeDocSnap && homeDocSnap.exists() ? homeDocSnap.data() : null;
      const mergedSettings = {
        ...(homeSettings || {}),
        ...(vitrineData || {})
      };

      // Filtra apenas produtos reais de vestuário (sem brindes/vales)
      const validProducts = (Array.isArray(allProducts) ? allProducts : []).filter(
        (p) => p && p.type !== 'brinde' && p.category !== 'gift-card'
      );
      const inStockProducts = validProducts.filter(isProductInStock);
      const basePool = inStockProducts.length > 0 ? inStockProducts : validProducts;

      // Resolve bestSellers / featuredProducts a partir de settings/home ou dos produtos reais em estoque
      let resolvedBestSellers = [];
      const configuredBestSellers = mergedSettings?.bestSellers;

      if (Array.isArray(configuredBestSellers) && configuredBestSellers.length > 0) {
        if (typeof configuredBestSellers[0] === 'string') {
          resolvedBestSellers = configuredBestSellers
            .map((idOrSlug) =>
              validProducts.find((p) => p.id === idOrSlug || p.slug === idOrSlug)
            )
            .filter(Boolean);
        } else if (typeof configuredBestSellers[0] === 'object') {
          resolvedBestSellers = configuredBestSellers
            .map((item) => {
              const match = validProducts.find(
                (p) => p.id === item.id || p.slug === item.slug || p.name === item.name
              );
              return match || (item.image && !String(item.image).includes('unsplash.com') ? item : null);
            })
            .filter(Boolean);
        }
      }

      if (resolvedBestSellers.length === 0) {
        const featuredFlagged = basePool.filter((p) => p.isFeatured);
        resolvedBestSellers =
          featuredFlagged.length > 0
            ? featuredFlagged.slice(0, limitProducts)
            : basePool.slice(0, limitProducts);
      }

      // Remove qualquer slide ou bento card que contenha URL mockada da Unsplash/Picsum
      const isCleanUrl = (url) =>
        Boolean(url) &&
        !String(url).includes('images.unsplash.com') &&
        !String(url).includes('picsum.photos');

      const rawSlides = mergedSettings?.hero?.slides || mergedSettings?.slides || [];
      const cleanSlides = Array.isArray(rawSlides)
        ? rawSlides.filter((s) => isCleanUrl(s.bgImage || s.mediaUrl || s.image))
        : [];

      const rawBento = mergedSettings?.bentoGrid || [];
      const cleanBento = Array.isArray(rawBento)
        ? rawBento.filter((b) => isCleanUrl(b.imageUrl || b.image))
        : [];

      // Se o BentoGrid no Firestore estiver vazio, constrói cards reais a partir das fotos reais dos produtos / assets locais
      const fallbackRealBento = [
        {
          id: 'bento_real_1',
          title: basePool[0]?.name || 'OVERSIZED HEAVY',
          buttonText: 'VER DETALHES',
          link: basePool[0] ? `/produto/${basePool[0].slug || basePool[0].id}` : '/catalogo?modelagem=oversized',
          image:
            basePool[0]?.lifestyleImage ||
            basePool[0]?.secondaryImage ||
            basePool[0]?.image ||
            largoDaOrdemBg,
          size: 'large',
          active: true
        },
        {
          id: 'bento_real_2',
          title: basePool[1]?.name || 'BOXY TEES',
          buttonText: 'VER DETALHES',
          link: basePool[1] ? `/produto/${basePool[1].slug || basePool[1].id}` : '/catalogo?modelagem=boxy',
          image:
            basePool[1]?.lifestyleImage ||
            basePool[1]?.secondaryImage ||
            basePool[1]?.image ||
            largoDaOrdemBg2,
          size: 'normal',
          active: true
        },
        {
          id: 'bento_real_3',
          title: basePool[2]?.name || 'ACERVO OFICIAL',
          buttonText: 'VER CATÁLOGO',
          link: basePool[2] ? `/produto/${basePool[2].slug || basePool[2].id}` : '/catalogo',
          image:
            basePool[2]?.lifestyleImage ||
            basePool[2]?.secondaryImage ||
            basePool[2]?.image ||
            largoDaOrdemBg,
          size: 'normal',
          active: true
        }
      ];

      // Community posts reais (sem Unsplash)
      const rawPosts = mergedSettings?.communityPosts || [];
      const cleanCommunityPosts = Array.isArray(rawPosts)
        ? rawPosts.filter((post) => isCleanUrl(post.image || post.imageUrl))
        : [];

      const consolidatedVitrine = {
        ...mergedSettings,
        hero: {
          slides: cleanSlides.length > 0 ? cleanSlides : REAL_FALLBACK_HERO_SLIDES
        },
        bentoGrid: cleanBento.length > 0 ? cleanBento : fallbackRealBento,
        sectionTag: mergedSettings?.sectionTag || 'COLEÇÃO OFICIAL // ATELIÊ CWB',
        sectionTitle: mergedSettings?.sectionTitle || 'A RUA COMO NOSSO ATELIÊ',
        communityPosts: cleanCommunityPosts
      };

      setVitrine(consolidatedVitrine);
      setFeaturedProducts(resolvedBestSellers);
      setCommunityPosts(cleanCommunityPosts);
    } catch (err) {
      console.error('Erro ao carregar dados da Home:', err);
      setError('Não foi possível carregar os destaques da vitrine no momento.');
    } finally {
      setLoading(false);
    }
  }, [limitProducts]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    vitrine,
    featuredProducts,
    bestSellers: featuredProducts,
    communityPosts,
    data: {
      ...(vitrine || {}),
      bestSellers: featuredProducts,
      communityPosts
    },
    loading,
    error,
    reload: fetchData
  };
}

export default useHomeData;
