import { productsData } from '../data/productsData';

/**
 * Camada de abstração de catálogo.
 * Prepara o sistema para futura conexão com Firestore / API REST sem alterar a UI.
 */
export const catalogService = {
  // Retorna todos os produtos
  getAllProducts: () => {
    return productsData;
  },

  // Retorna produto por slug
  getProductBySlug: (slug) => {
    return productsData.find((p) => p.slug === slug) || null;
  },

  // Retorna produtos por categoria
  getProductsByCategory: (categorySlug) => {
    if (!categorySlug || categorySlug === 'todos') return productsData;
    return productsData.filter((p) => p.category.toLowerCase() === categorySlug.toLowerCase());
  },

  // EXTRAÇÃO DINÂMICA DE META-DADOS DO BANCO/ARRAY
  getDynamicMetadata: () => {
    const activeProducts = productsData;

    // 1. Categorias únicas com contagem de itens
    const categoriesMap = new Map();
    activeProducts.forEach((p) => {
      const cat = p.category ? p.category.toLowerCase() : 'outros';
      const count = categoriesMap.get(cat) || 0;
      categoriesMap.set(cat, count + 1);
    });

    const categories = Array.from(categoriesMap.entries()).map(([slug, count]) => ({
      slug,
      label: slug.toUpperCase().replace('-', ' '),
      count
    }));

    // 2. Fits/Cortes únicos que realmente existem nas peças
    const fits = Array.from(
      new Set(activeProducts.map((p) => p.fit).filter(Boolean))
    );

    // 3. Tamanhos únicos
    const sizes = Array.from(
      new Set(activeProducts.flatMap((p) => p.sizes || []))
    );

    // 4. Faixa de preço min/max real
    const prices = activeProducts.map((p) => p.priceNum || 0);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 500;

    return {
      categories,
      fits,
      sizes,
      minPrice,
      maxPrice
    };
  }
};

export default catalogService;
