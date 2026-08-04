import React, { useState } from 'react';
import Preloader from '../../components/layout/Preloader';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import { HomeContent } from '../../sections/home/HomeContent';

export function Home({ onOpenCatalogo, onAddToCart }) {
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(2);

  const handleAddToCart = (item) => {
    setCartCount((prev) => prev + 1);
    if (onAddToCart) {
      onAddToCart(item);
    }
  };

  return (
    <>
      {loading && <Preloader onComplete={() => setLoading(false)} />}

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-concrete)' }}>
        <Navbar cartCount={cartCount} initialLoggedIn={true} userName="WESLLEY K." />

        <main style={{ flex: 1, width: '100%' }}>
          <HomeContent 
            onOpenCatalogo={onOpenCatalogo}
            onAddToCart={handleAddToCart}
          />
        </main>

        <Footer />
      </div>
    </>
  );
}

export default Home;
