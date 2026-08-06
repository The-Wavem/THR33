import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { PublicLayout } from './layouts/PublicLayout';
import { PrivateLayout } from './layouts/PrivateLayout';

import { Home } from './pages/public/Home';
import { Catalogo } from './pages/public/Catalogo';
import { ProdutoDetalhe } from './pages/public/ProdutoDetalhe';
import { Lancamentos } from './pages/public/Lancamentos';
import { Checkout } from './pages/public/Checkout';
import { CartDrawer } from './components/cart/CartDrawer';
import { useCart } from './context/CartContext';

export function AppRoutes({ 
  user, 
  onLogout, 
  onOpenAuthModal 
}) {
  const { totalItemsCount, setIsCartOpen, addToCart } = useCart();

  return (
    <>
      <Routes>
        <Route 
          element={
            <PublicLayout 
              user={user}
              onLogout={onLogout}
              cartCount={totalItemsCount}
              onOpenCart={() => setIsCartOpen(true)}
              onOpenAuthModal={onOpenAuthModal}
            />
          }
        >
          <Route path="/" element={<Home onAddToCart={addToCart} onOpenCart={() => setIsCartOpen(true)} />} />
          
          {/* ROTA LANÇAMENTOS VIP */}
          <Route path="/lancamentos" element={<Lancamentos onAddToCart={addToCart} onOpenAuthModal={onOpenAuthModal} user={user} />} />
          
          {/* ROTA PRINCIPAL E ROTA DINÂMICA DE CATEGORIA */}
          <Route path="/catalogo" element={<Catalogo onAddToCart={addToCart} />} />
          <Route path="/categoria/:categorySlug" element={<Catalogo onAddToCart={addToCart} />} />
          
          {/* ROTA DINÂMICA DE PRODUTO */}
          <Route path="/produto/:slug" element={<ProdutoDetalhe onAddToCart={addToCart} />} />

          {/* ROTA DE CHECKOUT */}
          <Route path="/checkout" element={<Checkout user={user} onOpenAuthModal={onOpenAuthModal} />} />
        </Route>

        <Route 
          element={
            <PrivateLayout 
              user={user}
              onLogout={onLogout}
              cartCount={totalItemsCount}
              onOpenCart={() => setIsCartOpen(true)}
            />
          }
        >
          <Route path="/meus-pedidos" element={<div style={{ padding: '2rem' }}><h1>MEUS PEDIDOS</h1></div>} />
          <Route path="/configuracoes" element={<div style={{ padding: '2rem' }}><h1>CONFIGURAÇÕES DA CONTA</h1></div>} />
        </Route>
      </Routes>

      {/* GAVETA DO CARRINHO GLOBAL */}
      <CartDrawer />
    </>
  );
}

export default AppRoutes;
