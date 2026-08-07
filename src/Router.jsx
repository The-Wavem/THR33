import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { PublicLayout } from './layouts/PublicLayout';
import { PrivateLayout } from './layouts/PrivateLayout';

import { Home } from './pages/public/Home';
import { Catalogo } from './pages/public/Catalogo';
import { ProdutoDetalhe } from './pages/public/ProdutoDetalhe';
import { Lancamentos } from './pages/public/Lancamentos';
import { Checkout } from './pages/public/Checkout';
import { Auth } from './pages/public/Auth';
import { CartDrawer } from './components/cart/CartDrawer';
import { useCart } from './context/CartContext';
import { useAuth } from './context/AuthContext';

import { Perfil } from './pages/private/Perfil';

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
          <Route path="/minha-conta" element={<Perfil defaultTab="pedidos" />} />
          <Route path="/meus-pedidos" element={<Perfil defaultTab="pedidos" />} />
          <Route path="/configuracoes" element={<Perfil defaultTab="dados" />} />
          <Route path="/enderecos" element={<Perfil defaultTab="enderecos" />} />
          <Route path="/seguranca" element={<Perfil defaultTab="seguranca" />} />
        </Route>
      </Routes>

      {/* GAVETA DO CARRINHO GLOBAL */}
      <CartDrawer />
    </>
  );
}

export default AppRoutes;
