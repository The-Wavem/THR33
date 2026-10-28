/**
 * Utilitários geradores de Rich Snippets e Schemas JSON-LD (Schema.org)
 * Otimizados para as diretrizes oficiais do Google Merchant & Search Console
 */

const BASE_URL = 'https://thr33-streetwear.web.app';

/**
 * Constrói o Schema de Produto (Google Merchant / Search)
 * @param {Object} product - Dados do produto
 * @param {Array} reviews - Avaliações do produto (opcional)
 */
export function buildProductSchema(product, reviews = []) {
  if (!product) return null;

  const images = [];
  if (product.image) images.push(product.image);
  if (Array.isArray(product.images)) {
    product.images.forEach((img) => {
      if (img && !images.includes(img)) images.push(img);
    });
  }
  if (product.hoverImage && !images.includes(product.hoverImage)) {
    images.push(product.hoverImage);
  }

  // Preço formatado com 2 casas decimais
  const rawPrice = Number(product.priceNum ?? product.price ?? 0);
  const formattedPrice = rawPrice.toFixed(2);

  // Validação de estoque
  const isOutOfStock =
    product.inStock === false ||
    product.active === false ||
    (product.totalStock !== undefined && Number(product.totalStock) === 0);

  const productUrl = `${BASE_URL}/produto/${product.slug || product.id}`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name || product.title || 'Camiseta Streetwear THR33',
    description:
      product.description ||
      'Camiseta streetwear com modelagem exclusiva THR33, alta gramatura e caimento premium.',
    image: images.length > 0 ? images : [`${BASE_URL}/favicon/apple-touch-icon.png`],
    sku: String(product.id || product.slug || 'THR33-ITEM'),
    brand: {
      '@type': 'Brand',
      name: 'THR33 Streetwear'
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BRL',
      price: formattedPrice,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability: isOutOfStock
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      url: productUrl,
      seller: {
        '@type': 'Organization',
        name: 'THR33 Streetwear'
      }
    }
  };

  // Avaliações agregadas (se houver reviews aprovadas)
  if (Array.isArray(reviews) && reviews.length > 0) {
    const totalRating = reviews.reduce((acc, r) => acc + Number(r.rating || 5), 0);
    const avgRating = (totalRating / reviews.length).toFixed(1);

    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: avgRating,
      reviewCount: reviews.length,
      bestRating: '5',
      worstRating: '1'
    };

    schema.review = reviews.slice(0, 5).map((r) => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: r.userName || r.name || 'Cliente Verificado'
      },
      datePublished: r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : '2026-01-01',
      reviewBody: r.comment || r.review || 'Excelente caimento e qualidade de malha.',
      reviewRating: {
        '@type': 'Rating',
        ratingValue: Number(r.rating || 5),
        bestRating: '5',
        worstRating: '1'
      }
    }));
  }

  return schema;
}

/**
 * Constrói o Schema de Breadcrumb (Caminho Estruturado nos resultados do Google)
 * @param {Array<{ name: string, url: string }>} items - Itens da trilha de navegação
 */
export function buildBreadcrumbSchema(items = []) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url.startsWith('/') ? '' : '/'}${item.url}`
    }))
  };
}

/**
 * Constrói o Schema de FAQPage (Perguntas Frequentes)
 * @param {Array<{ question: string, answer: string }>} faqList - Lista de perguntas e respostas
 */
export function buildFaqSchema(faqList = []) {
  if (!Array.isArray(faqList) || faqList.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqList.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
    }))
  };
}
