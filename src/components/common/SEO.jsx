import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const BASE_URL = 'https://thr33-streetwear.web.app';
const DEFAULT_IMAGE = `${BASE_URL}/favicon/apple-touch-icon.png`;
const DEFAULT_DESCRIPTION =
  'THR33 Streetwear — Moda urbana autoral em Curitiba com modelagens Boxy e Oversized exclusivas, malha pesada heavyweight e produção sob demanda para todo o Brasil. For the few.';
const DEFAULT_KEYWORDS =
  'streetwear curitiba, camisetas streetwear, oversized, moda urbana brasil, thr33 streetwear, drops exclusivos, camisetas boxy, moda autoral';

/**
 * Utilitário interno para atualizar ou criar tags <meta> no document.head
 */
function setMetaTag(attributeName, attributeValue, content) {
  if (content === undefined || content === null) return;
  let element = document.head.querySelector(`meta[${attributeName}="${attributeValue}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

/**
 * Remove tag <meta> específica
 */
function removeMetaTag(attributeName, attributeValue) {
  const element = document.head.querySelector(`meta[${attributeName}="${attributeValue}"]`);
  if (element) {
    element.remove();
  }
}

/**
 * Utilitário para atualizar ou criar tag <link rel="canonical">
 */
function setCanonicalUrl(url) {
  let element = document.head.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.setAttribute('href', url);
}

/**
 * Componente Reutilizável de SEO Tático & Rich Snippets JSON-LD
 * 100% nativo em React 19 (sem dependências externas obsoletas)
 */
export function SEO({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  noindex = false,
  jsonLd = null,
  productMeta = null
}) {
  const location = useLocation();

  useEffect(() => {
    // 1. FORMATAÇÃO DO TÍTULO
    let finalTitle = 'THR33 // FOR THE FEW — Streetwear Autoral & Drops Exclusivos';
    if (title) {
      if (title.includes('THR33')) {
        finalTitle = title;
      } else {
        finalTitle = `${title} | THR33 Streetwear`;
      }
    }
    document.title = finalTitle;

    // 2. DESCRIÇÃO E PALAVRAS-CHAVE
    const rawDesc = description || DEFAULT_DESCRIPTION;
    const finalDescription = rawDesc.length > 165 ? `${rawDesc.slice(0, 162)}...` : rawDesc;
    setMetaTag('name', 'description', finalDescription);

    let finalKeywords = DEFAULT_KEYWORDS;
    if (Array.isArray(keywords)) {
      finalKeywords = keywords.join(', ');
    } else if (typeof keywords === 'string' && keywords.trim()) {
      finalKeywords = keywords;
    }
    setMetaTag('name', 'keywords', finalKeywords);

    // 3. DIRETIVAS DE INDEXAÇÃO (ROBOTS)
    if (noindex) {
      setMetaTag('name', 'robots', 'noindex, nofollow');
    } else {
      setMetaTag('name', 'robots', 'index, follow');
    }

    // 4. CANONICAL & URL
    let finalUrl = url;
    if (!finalUrl) {
      finalUrl = `${BASE_URL}${location.pathname === '/' ? '' : location.pathname}`;
    } else if (!finalUrl.startsWith('http')) {
      finalUrl = `${BASE_URL}${finalUrl.startsWith('/') ? '' : '/'}${finalUrl}`;
    }
    setCanonicalUrl(finalUrl);

    // 5. IMAGEM DE COMPARTILHAMENTO
    let finalImage = DEFAULT_IMAGE;
    if (image) {
      finalImage = image.startsWith('http') ? image : `${BASE_URL}${image.startsWith('/') ? '' : '/'}${image}`;
    }

    // 6. OPEN GRAPH (FACEBOOK / WHATSAPP / INSTAGRAM)
    setMetaTag('property', 'og:title', finalTitle);
    setMetaTag('property', 'og:description', finalDescription);
    setMetaTag('property', 'og:url', finalUrl);
    setMetaTag('property', 'og:image', finalImage);
    setMetaTag('property', 'og:type', type);
    setMetaTag('property', 'og:site_name', 'THR33 Streetwear');
    setMetaTag('property', 'og:locale', 'pt_BR');

    // 7. TWITTER CARDS
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', finalTitle);
    setMetaTag('name', 'twitter:description', finalDescription);
    setMetaTag('name', 'twitter:image', finalImage);
    setMetaTag('name', 'twitter:site', '@madebythr33');

    // 8. META TAGS ESPECÍFICAS DE PRODUTO
    if (type === 'product' && productMeta) {
      if (productMeta.price) {
        setMetaTag('property', 'product:price:amount', String(productMeta.price));
        setMetaTag('property', 'product:price:currency', productMeta.currency || 'BRL');
      }
      if (productMeta.availability) {
        setMetaTag('property', 'product:availability', productMeta.availability);
      }
    } else {
      removeMetaTag('property', 'product:price:amount');
      removeMetaTag('property', 'product:price:currency');
      removeMetaTag('property', 'product:availability');
    }

    // 9. INJEÇÃO DINÂMICA DE SCHEMA.ORG JSON-LD
    let scriptElement = document.getElementById('dynamic-json-ld');
    if (jsonLd) {
      if (!scriptElement) {
        scriptElement = document.createElement('script');
        scriptElement.id = 'dynamic-json-ld';
        scriptElement.type = 'application/ld+json';
        document.head.appendChild(scriptElement);
      }
      scriptElement.textContent = JSON.stringify(jsonLd);
    } else if (scriptElement) {
      scriptElement.remove();
    }

    // LIMPEZA AO DESMONTAR
    return () => {
      const activeScript = document.getElementById('dynamic-json-ld');
      if (activeScript) {
        activeScript.remove();
      }
    };
  }, [
    title,
    description,
    keywords,
    image,
    url,
    type,
    noindex,
    jsonLd,
    productMeta,
    location.pathname
  ]);

  return null;
}

export default SEO;
