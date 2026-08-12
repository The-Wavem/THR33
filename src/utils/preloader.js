// UTILITÁRIO DE PRELOADING INTELIGENTE DE ROTAS (HOVER / TOUCH)

const routeLoaders = {
  '/': () => import('../pages/public/Home'),
  '/catalogo': () => import('../pages/public/Catalogo'),
  '/lancamentos': () => import('../pages/public/Lancamentos'),
  '/checkout': () => import('../pages/public/Checkout'),
  '/auth': () => import('../pages/public/Auth'),
  '/login': () => import('../pages/public/Auth'),
  '/sobre': () => import('../pages/public/Sobre'),
  '/suporte': () => import('../pages/public/Suporte'),
  '/politicas': () => import('../pages/public/Politicas'),
  '/guia-de-tamanhos': () => import('../pages/public/GuiaTamanhos'),
  '/perfil': () => import('../pages/private/Perfil'),
  '/minha-conta': () => import('../pages/private/Perfil'),
  '/meus-pedidos': () => import('../pages/private/Perfil'),
  '/configuracoes': () => import('../pages/private/Perfil'),
  '/enderecos': () => import('../pages/private/Perfil'),
  '/seguranca': () => import('../pages/private/Perfil')
};

const preloadedCache = new Set();

/**
 * Pré-carrega o chunk JavaScript da página ao passar o mouse ou tocar no link
 */
export function preloadRoute(path) {
  if (!path) return;
  const cleanPath = path.split('?')[0].split('#')[0];

  // Rota dinâmica de produto
  if (cleanPath.startsWith('/produto/')) {
    if (!preloadedCache.has('produto-detalhe')) {
      preloadedCache.add('produto-detalhe');
      import('../pages/public/ProdutoDetalhe');
    }
    return;
  }

  // Rota dinâmica de categoria
  if (cleanPath.startsWith('/categoria/')) {
    if (!preloadedCache.has('/catalogo')) {
      preloadedCache.add('/catalogo');
      import('../pages/public/Catalogo');
    }
    return;
  }

  const loader = routeLoaders[cleanPath];
  if (loader && !preloadedCache.has(cleanPath)) {
    preloadedCache.add(cleanPath);
    try {
      loader();
    } catch (e) {
      console.warn('Erro no preload da rota:', cleanPath, e);
    }
  }
}
