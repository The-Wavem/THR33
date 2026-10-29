import { catalogService } from '../services/catalogService';
// UTILITÁRIO DE PRELOADING INTELIGENTE E ESCALONADO DE ROTAS (IDLE CALLBACK)
// Evita travamentos na thread principal e picos de EvaluateScript / GPUTask

const routeLoaders = {
  '/': () => import('../pages/public/Home'),
  '/catalogo': () => import('../pages/public/Catalogo'),
  '/checkout': () => import('../pages/public/Checkout'),
  '/auth': () => import('../pages/public/Auth'),
  '/login': () => import('../pages/public/Auth'),
  '/sobre': () => import('../pages/public/Sobre'),
  '/suporte': () => import('../pages/public/Suporte'),
  '/politicas': () => import('../pages/public/Politicas'),
  '/guia-de-tamanhos': () => import('../pages/public/GuiaTamanhos'),
  '/favoritos': () => import('../pages/public/Favoritos'),
  '/brindes': () => import('../pages/public/Brindes'),
  '/perfil': () => import('../pages/private/Perfil'),
  '/minha-conta': () => import('../pages/private/Perfil'),
  '/meus-pedidos': () => import('../pages/private/Perfil'),
  '/configuracoes': () => import('../pages/private/Perfil'),
  '/enderecos': () => import('../pages/private/Perfil'),
  '/seguranca': () => import('../pages/private/Perfil')
};

const preloadedCache = new Set();
const preloadQueue = [];
let isProcessingQueue = false;

/**
 * Wrapper seguro para requestIdleCallback com fallback leve
 */
function runWhenIdle(callback) {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, { timeout: 2500 });
  }
  return setTimeout(callback, 200);
}

/**
 * Processa a fila de chunks de forma escalonada (um por período ocioso do navegador)
 */
function processNextInQueue() {
  if (preloadQueue.length === 0) {
    isProcessingQueue = false;
    return;
  }

  isProcessingQueue = true;
  runWhenIdle(() => {
    const nextLoader = preloadQueue.shift();
    if (nextLoader) {
      Promise.resolve()
        .then(() => nextLoader())
        .catch(() => {
          // Falha silenciosa em background preload
        })
        .finally(() => {
          processNextInQueue();
        });
    } else {
      processNextInQueue();
    }
  });
}

function enqueueLoader(key, loaderFn) {
  if (preloadedCache.has(key) || typeof loaderFn !== 'function') return;
  preloadedCache.add(key);
  preloadQueue.push(loaderFn);

  if (!isProcessingQueue) {
    processNextInQueue();
  }
}

/**
 * Pré-carrega o chunk JavaScript da página de maneira escalonada quando o navegador estiver ocioso
 */
export function preloadRoute(path) {
  if (!path) return;
  const cleanPath = path.split('?')[0].split('#')[0];

  // Rota dinâmica de produto
  if (cleanPath.startsWith('/produto/')) {
    enqueueLoader('produto-detalhe', () => import('../pages/public/ProdutoDetalhe'));
    return;
  }

  // Rota dinâmica de categoria
  if (cleanPath.startsWith('/categoria/')) {
    enqueueLoader('/catalogo', routeLoaders['/catalogo']);
    return;
  }

  const loader = routeLoaders[cleanPath];
  if (loader) {
    enqueueLoader(cleanPath, loader);
  }
}

/**
 * Aquece dados criticos do catalogo e pre-carrega rotas essenciais de forma escalonada
 */
export function warmUpCriticalData() {
  runWhenIdle(() => {
    // 1. Aquece cache em memoria (0ms para futuras navegacoes)
    try {
      catalogService.getAllProducts().catch(() => {});
    } catch (_) {}

    // 2. Pre-carrega chunks das principais rotas da loja
    preloadRoute('/catalogo');
    preloadRoute('/produto/prewarm');
  });
}
