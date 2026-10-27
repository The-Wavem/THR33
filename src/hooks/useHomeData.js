import { useState, useEffect, useCallback } from 'react';
import { getVitrineSettings, getFeaturedProducts } from '../services/catalogService';
import { PRODUCTS_DATA } from '../data/productsData';
import { heroSlidesData, carouselSlides } from '../data/homeData';

/**
 * Hook customizado para gerenciar a camada de dados da Home (Fase 2)
 * Isola chamadas de servico, tratamento de erros e estados de carregamento.
 * 
 * @param {number} limitProducts - Quantidade de produtos em destaque (padrao 8)
 * @returns {object} { vitrine, featuredProducts, loading, error, reload }
 */
export function useHomeData(limitProducts = 8) {
  const [vitrine, setVitrine] = useState(null);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Busca simultanea das configuracoes da vitrine e produtos em destaque reais
      const [vitrineData, productsData] = await Promise.all([
        getVitrineSettings().catch(err => {
          console.warn('Aviso ao carregar configuracoes da vitrine:', err.message);
          return null;
        }),
        getFeaturedProducts(limitProducts).catch(err => {
          console.warn('Aviso ao carregar produtos em destaque:', err.message);
          return [];
        })
      ]);

      // Monta dados consolidados da vitrine com fallback seguro para homeData.js
      const consolidatedVitrine = vitrineData || {
        hero: { slides: heroSlidesData },
        bentoGrid: [],
        sectionTag: "COLEÇÃO OFICIAL // ATELIÊ CWB",
        sectionTitle: "A RUA COMO NOSSO ATELIÊ"
      };

      setVitrine(consolidatedVitrine);
      setFeaturedProducts(Array.isArray(productsData) && productsData.length > 0 ? productsData : PRODUCTS_DATA);
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
    loading,
    error,
    reload: fetchData
  };
}

export default useHomeData;
