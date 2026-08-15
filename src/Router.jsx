import React, { lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { PublicLayout } from './layouts/PublicLayout';
import { PrivateLayout } from './layouts/PrivateLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AdminRoute } from './components/common/AdminRoute';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { ScrollToTop } from './components/common/ScrollToTop';
import { CartDrawer } from './components/cart/CartDrawer';
import { useCart } from './context/CartContext';
import { useAuth } from './context/AuthContext';

// LAZY LOADING DAS PÁGINAS (CODE-SPLITTING EM CHUNKS SOB DEMANDA)
const Home = lazy(() => import('./pages/public/Home').then(m => ({ default: m.Home || m.default })));
const Catalogo = lazy(() => import('./pages/public/Catalogo').then(m => ({ default: m.Catalogo || m.default })));
const ProdutoDetalhe = lazy(() => import('./pages/public/ProdutoDetalhe').then(m => ({ default: m.ProdutoDetalhe || m.default })));
const Lancamentos = lazy(() => import('./pages/public/Lancamentos').then(m => ({ default: m.Lancamentos || m.default })));
const Checkout = lazy(() => import('./pages/public/Checkout').then(m => ({ default: m.Checkout || m.default })));
const Auth = lazy(() => import('./pages/public/Auth').then(m => ({ default: m.Auth || m.default })));
const Sobre = lazy(() => import('./pages/public/Sobre').then(m => ({ default: m.Sobre || m.default })));
const Suporte = lazy(() => import('./pages/public/Suporte').then(m => ({ default: m.Suporte || m.default })));
const Politicas = lazy(() => import('./pages/public/Politicas').then(m => ({ default: m.Politicas || m.default })));
const GuiaTamanhos = lazy(() => import('./pages/public/GuiaTamanhos').then(m => ({ default: m.GuiaTamanhos || m.default })));
const Favoritos = lazy(() => import('./pages/public/Favoritos').then(m => ({ default: m.Favoritos || m.default })));
const Brindes = lazy(() => import('./pages/public/Brindes').then(m => ({ default: m.Brindes || m.default })));
const BrindeDetalhe = lazy(() => import('./pages/public/BrindeDetalhe').then(m => ({ default: m.BrindeDetalhe || m.default })));
const NotFound = lazy(() => import('./pages/public/NotFound').then(m => ({ default: m.NotFound || m.default })));

const Perfil = lazy(() => import('./pages/private/Perfil').then(m => ({ default: m.Perfil || m.default })));
const AdminLayout = lazy(() => import('./layouts/AdminLayout').then(m => ({ default: m.AdminLayout || m.default })));
const CmsDashboard = lazy(() => import('./pages/admin/CmsDashboard').then(m => ({ default: m.CmsDashboard || m.default })));
const CmsAnalytics = lazy(() => import('./pages/admin/CmsAnalytics').then(m => ({ default: m.CmsAnalytics || m.default })));
const CmsCampanhas = lazy(() => import('./pages/admin/CmsCampanhas').then(m => ({ default: m.CmsCampanhas || m.default })));
const CmsCupons = lazy(() => import('./pages/admin/CmsCupons').then(m => ({ default: m.CmsCupons || m.default })));
const CmsProdutos = lazy(() => import('./pages/admin/CmsProdutos').then(m => ({ default: m.CmsProdutos || m.default })));
const CmsDescontos = lazy(() => import('./pages/admin/CmsDescontos').then(m => ({ default: m.CmsDescontos || m.default })));
const CmsVitrine = lazy(() => import('./pages/admin/CmsVitrine').then(m => ({ default: m.CmsVitrine || m.default })));
const CmsPedidos = lazy(() => import('./pages/admin/CmsPedidos').then(m => ({ default: m.CmsPedidos || m.default })));

export function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const { totalItemsCount, setIsCartOpen, addToCart } = useCart();
  const { user, logout, loading } = useAuth();

  const handleOpenAuth = (originPath = null, tab = 'login') => {
    const from = originPath || location.pathname;
    navigate('/auth', { state: { from, tab } });
  };

  return (
    <>
      {/* ROLAGEM AUTOMÁTICA PARA O TOPO EM MUDANÇAS DE ROTA */}
      <ScrollToTop />

      <Suspense fallback={<LoadingScreen message="CARREGANDO ATELIÊ // FOR THE FEW" />}>
        <Routes>
          {/* ROTAS PÚBLICAS GLOBAIS */}
          <Route 
            element={
              <PublicLayout 
                user={user}
                onLogout={logout}
                cartCount={totalItemsCount}
                onOpenCart={() => setIsCartOpen(true)}
                onOpenAuthModal={handleOpenAuth}
              />
            }
          >
            <Route path="/" element={<Home onAddToCart={addToCart} onOpenCart={() => setIsCartOpen(true)} />} />
            
            {/* ROTA LANÇAMENTOS VIP */}
            <Route path="/lancamentos" element={<Lancamentos onAddToCart={addToCart} onOpenAuthModal={handleOpenAuth} user={user} />} />
            
            {/* ROTA PRINCIPAL E ROTA DINÂMICA DE CATEGORIA */}
            <Route path="/catalogo" element={<Catalogo onAddToCart={addToCart} />} />
            <Route path="/categoria/:categorySlug" element={<Catalogo onAddToCart={addToCart} />} />
            
            {/* ROTA DINÂMICA DE PRODUTO */}
            <Route path="/produto/:slug" element={<ProdutoDetalhe onAddToCart={addToCart} />} />

            {/* ROTA DE AUTENTICAÇÃO TÁTICA (LOGIN & CADASTRO) */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/login" element={<Auth />} />

            {/* ROTAS INSTITUCIONAIS: SOBRE, SUPORTE, POLÍTICAS, GUIA DE TAMANHOS & FAVORITOS */}
            <Route path="/sobre" element={<Sobre />} />
            <Route path="/suporte" element={<Suporte />} />
            <Route path="/politicas" element={<Politicas />} />
            <Route path="/guia-de-tamanhos" element={<GuiaTamanhos />} />
            <Route path="/favoritos" element={<Favoritos />} />

            {/* ROTAS DE BRINDES & VALE-PRESENTE */}
            <Route path="/brindes" element={<Brindes />} />
            <Route path="/brindes/:id" element={<BrindeDetalhe />} />

            {/* ROTA 404 (NOT FOUND) */}
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* ROTAS PRIVADAS & PROTEGIDAS COM PROTECTEDROUTE GUARD */}
          <Route 
            element={
              <ProtectedRoute>
                <PrivateLayout 
                  user={user}
                  loading={loading}
                  onLogout={logout}
                  cartCount={totalItemsCount}
                  onOpenCart={() => setIsCartOpen(true)}
                />
              </ProtectedRoute>
            }
          >
            {/* ROTA DE CHECKOUT (SOMENTE CLIENTES AUTENTICADOS) */}
            <Route path="/checkout" element={<Checkout user={user} onOpenAuthModal={handleOpenAuth} />} />

            {/* PAINEL TÁTICO PASSAPORTE ATELIÊ */}
            <Route path="/perfil" element={<Perfil defaultTab="dados" />} />
            <Route path="/minha-conta" element={<Perfil defaultTab="pedidos" />} />
            <Route path="/meus-pedidos" element={<Perfil defaultTab="pedidos" />} />
            <Route path="/configuracoes" element={<Perfil defaultTab="dados" />} />
            <Route path="/enderecos" element={<Perfil defaultTab="enderecos" />} />
            <Route path="/seguranca" element={<Perfil defaultTab="seguranca" />} />
          </Route>

          {/* PAINEL ADMINISTRATIVO CMS ENGINE (TD-93) PROTEGIDO POR ROLE */}
          <Route 
            path="/cms" 
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<CmsDashboard />} />
            <Route path="analytics" element={<CmsAnalytics />} />
            <Route path="campanhas" element={<CmsCampanhas />} />
            <Route path="cupons" element={<CmsCupons />} />
            <Route path="produtos" element={<CmsProdutos />} />
            <Route path="descontos" element={<CmsDescontos />} />
            <Route path="vitrine" element={<CmsVitrine />} />
            <Route path="pedidos" element={<CmsPedidos />} />
          </Route>

          {/* ALIAS DE CONVENIÊNCIA PARA /admin */}
          <Route 
            path="/admin" 
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<CmsDashboard />} />
            <Route path="analytics" element={<CmsAnalytics />} />
            <Route path="campanhas" element={<CmsCampanhas />} />
            <Route path="cupons" element={<CmsCupons />} />
            <Route path="produtos" element={<CmsProdutos />} />
            <Route path="descontos" element={<CmsDescontos />} />
            <Route path="vitrine" element={<CmsVitrine />} />
            <Route path="pedidos" element={<CmsPedidos />} />
          </Route>
        </Routes>
      </Suspense>

      {/* GAVETA DO CARRINHO GLOBAL */}
      <CartDrawer />
    </>
  );
}

export default AppRoutes;
