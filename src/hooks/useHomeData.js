import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { getVitrineSettings, fetchProducts } from '../services/catalogService';

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
export function useHomeData(limitProducts = 0) {
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

      // Filtra apenas produtos reais de vestuário/camisas (sem brindes/vales)
      const validProducts = (Array.isArray(allProducts) ? allProducts : []).filter(
        (p) =>
          p &&
          p.type !== 'brinde' &&
          p.category !== 'gift-card' &&
          !String(p.id || '').includes('vale')
      );
      const inStockProducts = validProducts.filter(isProductInStock);
      const basePool = inStockProducts.length > 0 ? inStockProducts : validProducts;

      // Ordena rigorosamente todas as camisas disponíveis por mais vendidas (purchases / salesCount)
      const sortedBySales = [...basePool].sort((a, b) => {
        const salesA = Number(a.purchases ?? a.salesCount ?? a.sales ?? 0);
        const salesB = Number(b.purchases ?? b.salesCount ?? b.sales ?? 0);
        if (salesB !== salesA) return salesB - salesA;

        // Desempate 1: Marcados como destaque
        const featA = a.isFeatured ? 1 : 0;
        const featB = b.isFeatured ? 1 : 0;
        if (featB !== featA) return featB - featA;

        // Desempate 2: Mais visualizados / acessados
        const viewsA = Number(a.views ?? 0);
        const viewsB = Number(b.views ?? 0);
        if (viewsB !== viewsA) return viewsB - viewsA;

        // Desempate 3: Mais recentes
        return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
      });

      // Todas as camisas cadastradas disponíveis na ordem das mais vendidas
      const resolvedBestSellers = limitProducts && limitProducts > 0
        ? sortedBySales.slice(0, limitProducts)
        : sortedBySales;

      // Remove qualquer slide ou bento card que contenha URL mockada da Unsplash/Picsum
      const isCleanUrl = (url) =>
        Boolean(url) &&
        !String(url).includes('images.unsplash.com') &&
        !String(url).includes('picsum.photos');

      const rawSlides = mergedSettings?.hero?.slides || mergedSettings?.slides || [];
      const cleanSlides = Array.isArray(rawSlides)
        ? rawSlides.filter(
            (s) =>
              s &&
              s.active !== false &&
              (isCleanUrl(s.bgImage) || isCleanUrl(s.mobileBgImage) || isCleanUrl(s.mediaUrl) || isCleanUrl(s.image))
          )
        : [];

      const rawBento = mergedSettings?.bentoGrid || [];
      const cleanBento = Array.isArray(rawBento)
        ? rawBento.filter((b) => b && b.active !== false && isCleanUrl(b.imageUrl || b.image))
        : [];

      // Community posts reais (sem Unsplash)
      const rawPosts = mergedSettings?.communityPosts || [];
      const cleanCommunityPosts = Array.isArray(rawPosts)
        ? rawPosts.filter((post) => isCleanUrl(post.image || post.imageUrl))
        : [];

      const consolidatedVitrine = {
        ...mergedSettings,
        hero: {
          slides: cleanSlides
        },
        bentoGrid: cleanBento,
        sectionTag: mergedSettings?.sectionTag ?? '',
        sectionTitle: mergedSettings?.sectionTitle ?? '',
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
