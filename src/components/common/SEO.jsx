import React, { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

const BASE_URL = 'https://thr33-streetwear.web.app';
const DEFAULT_IMAGE = `${BASE_URL}/favicon/apple-touch-icon.png`;
const DEFAULT_DESCRIPTION =
  'THR33 Streetwear — Moda urbana autoral em Curitiba com modelagens Boxy e Oversized exclusivas, malha pesada heavyweight e produção sob demanda para todo o Brasil. For the few.';
const DEFAULT_KEYWORDS =
  'streetwear curitiba, camisetas streetwear, oversized, moda urbana brasil, thr33 streetwear, drops exclusivos, camisetas boxy, moda autoral';

/**
 * Utilitário com prevenção de DOM Thrashing:
 * Só altera o DOM se a tag não existir ou se o atributo 'content' for diferente.
 */
function setMetaTag(attributeName, attributeValue, content) {
  if (content === undefined || content === null) return;
  const targetContent = String(content);
  let element = document.head.querySelector(`meta[${attributeName}="${attributeValue}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attributeName, attributeValue);
    element.setAttribute('content', targetContent);
    document.head.appendChild(element);
    return;
  }
  if (element.getAttribute('content') !== targetContent) {
    element.setAttribute('content', targetContent);
  }
}

/**
 * Remove tag <meta> específica caso exista
 */
function removeMetaTag(attributeName, attributeValue) {
  const element = document.head.querySelector(`meta[${attributeName}="${attributeValue}"]`);
  if (element) {
    element.remove();
  }
}

/**
 * Utilitário com prevenção de DOM Thrashing para tag <link rel="canonical">
 */
function setCanonicalUrl(url) {
  let element = document.head.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    element.setAttribute('href', url);
    document.head.appendChild(element);
    return;
  }
  if (element.getAttribute('href') !== url) {
    element.setAttribute('href', url);
  }
}

/**
 * Componente Reutilizável de SEO Tático & Rich Snippets JSON-LD
 * 100% otimizado: Memoizado com React.memo, serialização de JSON-LD e deps estritamente primitivas
 */
function SEOComponent({
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

  // 1. Extração e serialização de primitivos para eliminar re-execuções desnecessárias
  const keywordsStr = useMemo(() => {
    if (Array.isArray(keywords)) return keywords.join(', ');
    if (typeof keywords === 'string' && keywords.trim()) return keywords.trim();
    return DEFAULT_KEYWORDS;
  }, [keywords]);

  const jsonLdStr = useMemo(() => {
    if (!jsonLd) return '';
    try {
      return JSON.stringify(jsonLd);
    } catch {
      return '';
    }
  }, [jsonLd]);

  const priceStr = productMeta?.price ? String(productMeta.price) : '';
  const currencyStr = productMeta?.currency || 'BRL';
  const availabilityStr = productMeta?.availability || '';

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
    if (document.title !== finalTitle) {
      document.title = finalTitle;
    }

    // 2. DESCRIÇÃO E PALAVRAS-CHAVE
    const rawDesc = description || DEFAULT_DESCRIPTION;
    const finalDescription = rawDesc.length > 165 ? `${rawDesc.slice(0, 162)}...` : rawDesc;
    setMetaTag('name', 'description', finalDescription);
    setMetaTag('name', 'keywords', keywordsStr);

    // 3. DIRETIVAS DE INDEXAÇÃO (ROBOTS)
    setMetaTag('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

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
    if (type === 'product' && priceStr) {
      setMetaTag('property', 'product:price:amount', priceStr);
      setMetaTag('property', 'product:price:currency', currencyStr);
      if (availabilityStr) {
        setMetaTag('property', 'product:availability', availabilityStr);
      }
    } else {
      removeMetaTag('property', 'product:price:amount');
      removeMetaTag('property', 'product:price:currency');
      removeMetaTag('property', 'product:availability');
    }

    // 9. INJEÇÃO DINÂMICA DE SCHEMA.ORG JSON-LD (Zero DOM thrashing)
    let scriptElement = document.getElementById('dynamic-json-ld');
    if (jsonLdStr) {
      if (!scriptElement) {
        scriptElement = document.createElement('script');
        scriptElement.id = 'dynamic-json-ld';
        scriptElement.type = 'application/ld+json';
        scriptElement.textContent = jsonLdStr;
        document.head.appendChild(scriptElement);
      } else if (scriptElement.textContent !== jsonLdStr) {
        scriptElement.textContent = jsonLdStr;
      }
    } else if (scriptElement) {
      scriptElement.remove();
    }
  }, [
    title,
    description,
    keywordsStr,
    image,
    url,
    type,
    noindex,
    jsonLdStr,
    priceStr,
    currencyStr,
    availabilityStr,
    location.pathname
  ]);

  return null;
}

export const SEO = React.memo(SEOComponent);
export default SEO;
