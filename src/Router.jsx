import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { PublicLayout } from './layouts/PublicLayout';
import { PrivateLayout } from './layouts/PrivateLayout';

import { Home } from './pages/public/Home';
import { Catalogo } from './pages/public/Catalogo';
import { ProdutoDetalhe } from './pages/public/ProdutoDetalhe';

export function AppRoutes({ 
  user, 
  onLogout, 
  cartCount, 
  onOpenCart, 
  onOpenAuthModal, 
  onAddToCart 
}) {
  return (
    <Routes>
      <Route 
        element={
          <PublicLayout 
            user={user}
            onLogout={onLogout}
            cartCount={cartCount}
            onOpenCart={onOpenCart}
            onOpenAuthModal={onOpenAuthModal}
          />
        }
      >
        <Route path="/" element={<Home onAddToCart={onAddToCart} />} />
        
        {/* ROTA PRINCIPAL E ROTA DINÂMICA DE CATEGORIA */}
        <Route path="/catalogo" element={<Catalogo onAddToCart={onAddToCart} />} />
        <Route path="/categoria/:categorySlug" element={<Catalogo onAddToCart={onAddToCart} />} />
        
        {/* ROTA DINÂMICA DE PRODUTO */}
        <Route path="/produto/:slug" element={<ProdutoDetalhe onAddToCart={onAddToCart} />} />
      </Route>

      <Route 
        element={
          <PrivateLayout 
            user={user}
            onLogout={onLogout}
            cartCount={cartCount}
            onOpenCart={onOpenCart}
          />
        }
      >
        <Route path="/meus-pedidos" element={<div style={{ padding: '2rem' }}><h1>MEUS PEDIDOS</h1></div>} />
        <Route path="/configuracoes" element={<div style={{ padding: '2rem' }}><h1>CONFIGURAÇÕES DA CONTA</h1></div>} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
