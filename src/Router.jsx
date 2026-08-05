import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { PublicLayout } from './layouts/PublicLayout';
import { PrivateLayout } from './layouts/PrivateLayout';

// Páginas
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
      {/* 1. ROTAS PÚBLICAS (HERDAM NAVBAR E FOOTER VIA PUBLICLAYOUT) */}
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
        <Route path="/catalogo" element={<Catalogo onAddToCart={onAddToCart} />} />
        <Route path="/lancamentos" element={<Catalogo defaultCategory="t-shirts" onAddToCart={onAddToCart} />} />
        <Route path="/t-shirts" element={<Catalogo defaultCategory="t-shirts" onAddToCart={onAddToCart} />} />
        <Route path="/calcas" element={<Catalogo defaultCategory="calcas" onAddToCart={onAddToCart} />} />
        <Route path="/drops-passados" element={<Catalogo defaultCategory="drops-passados" onAddToCart={onAddToCart} />} />
        <Route path="/produto/:slug" element={<ProdutoDetalhe onAddToCart={onAddToCart} />} />
      </Route>

      {/* 2. ROTAS PRIVADAS (HERDAM VALIDACAO E ESTRUTURA PRIVADA) */}
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
