import { useState, useEffect, useCallback } from 'react';
import { getVitrineSettings, getFeaturedProducts } from '../services/catalogService';
import { seedService } from '../services/seedService';

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
      // 1. Inicializa catalogo inicial se Firestore estiver vazio
      try {
        await seedService.seedCatalogIfEmpty();
      } catch (seedErr) {
        console.warn('Aviso no seed automatico da vitrine:', seedErr.message);
      }

      // 2. Busca simultanea das configuracoes da vitrine e produtos em destaque
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

      setVitrine(vitrineData || null);
      setFeaturedProducts(Array.isArray(productsData) ? productsData : []);
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
