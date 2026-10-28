import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop Component
 * Garante que a janela role para o topo (x: 0, y: 0) a cada troca de rota,
 * prevenindo que novas páginas herdem o scroll da página anterior,
 * e suportando âncoras/hashes (#secao) de forma suave e resiliente.
 */
export function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  // Desativa a restauração automática nativa do navegador que pode causar saltos de scroll
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // useLayoutEffect executa antes do browser paint, garantindo reset imediato
  useLayoutEffect(() => {
    let timeoutId1;
    let timeoutId2;
    let rafId;

    const performReset = () => {
      // 1. Lenis Smooth Scroll (quando ativo no layout público)
      if (window.__lenis && typeof window.__lenis.scrollTo === 'function') {
        try {
          window.__lenis.scrollTo(0, { immediate: true });
        } catch {
          // Fallback silencioso
        }
      }

      // 2. Window nativo
      window.scrollTo(0, 0);

      // 3. Fallback direto nos elementos raiz do DOM
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
        document.documentElement.scrollLeft = 0;
      }
      if (document.body) {
        document.body.scrollTop = 0;
        document.body.scrollLeft = 0;
      }
    };

    if (!hash) {
      // Execução síncrona imediata
      performReset();

      // Execução no próximo frame para cobrir troca de rotas com Suspense / Lazy Loading
      rafId = requestAnimationFrame(() => {
        performReset();
      });

      // Checagens adicionais para páginas com carregamento assíncrono de dados ou imagens
      timeoutId1 = setTimeout(performReset, 50);
      timeoutId2 = setTimeout(performReset, 150);
    } else {
      // Caso haja âncora/hash (ex: /politicas#trocas)
      const tryScrollToHash = (retryCount = 0) => {
        try {
          const element = document.querySelector(hash);
          if (element) {
            if (window.__lenis && typeof window.__lenis.scrollTo === 'function') {
              window.__lenis.scrollTo(element, { offset: -80 });
            } else {
              element.scrollIntoView({ behavior: 'smooth' });
            }
          } else if (retryCount < 5) {
            // Tenta novamente após a renderização do componente lazy
            timeoutId1 = setTimeout(() => tryScrollToHash(retryCount + 1), 100);
          } else {
            performReset();
          }
        } catch {
          performReset();
        }
      };

      tryScrollToHash();
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (timeoutId1) clearTimeout(timeoutId1);
      if (timeoutId2) clearTimeout(timeoutId2);
    };
  }, [pathname, search, hash]);

  return null;
}

export default ScrollToTop;
