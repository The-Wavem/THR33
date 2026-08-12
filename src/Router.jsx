import React, { lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { PublicLayout } from './layouts/PublicLayout';
import { PrivateLayout } from './layouts/PrivateLayout';
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

const Perfil = lazy(() => import('./pages/private/Perfil').then(m => ({ default: m.Perfil || m.default })));

export function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const { totalItemsCount, setIsCartOpen, addToCart } = useCart();
  const { user, logout } = useAuth();

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

            {/* ROTA DE CHECKOUT */}
            <Route path="/checkout" element={<Checkout user={user} onOpenAuthModal={handleOpenAuth} />} />

            {/* ROTA DE AUTENTICAÇÃO TÁTICA (LOGIN & CADASTRO) */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/login" element={<Auth />} />

            {/* ROTAS INSTITUCIONAIS: SOBRE, SUPORTE, POLÍTICAS & GUIA DE TAMANHOS */}
            <Route path="/sobre" element={<Sobre />} />
            <Route path="/suporte" element={<Suporte />} />
            <Route path="/politicas" element={<Politicas />} />
            <Route path="/guia-de-tamanhos" element={<GuiaTamanhos />} />
          </Route>

          <Route 
            element={
              <PrivateLayout 
                user={user}
                onLogout={logout}
                cartCount={totalItemsCount}
                onOpenCart={() => setIsCartOpen(true)}
              />
            }
          >
            {/* PAINEL TÁTICO PASSAPORTE ATELIÊ */}
            <Route path="/perfil" element={<Perfil defaultTab="dados" />} />
            <Route path="/minha-conta" element={<Perfil defaultTab="pedidos" />} />
            <Route path="/meus-pedidos" element={<Perfil defaultTab="pedidos" />} />
            <Route path="/configuracoes" element={<Perfil defaultTab="dados" />} />
            <Route path="/enderecos" element={<Perfil defaultTab="enderecos" />} />
            <Route path="/seguranca" element={<Perfil defaultTab="seguranca" />} />
          </Route>
        </Routes>
      </Suspense>

      {/* GAVETA DO CARRINHO GLOBAL */}
      <CartDrawer />
    </>
  );
}

export default AppRoutes;
