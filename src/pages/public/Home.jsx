import React, { useState } from 'react';
import Preloader from '../../components/layout/Preloader';
import { HomeContent } from '../../sections/home/HomeContent';

export function Home({ onOpenCatalogo, onAddToCart, onOpenCart }) {
  const [loading, setLoading] = useState(true);

  return (
    <>
      {loading && <Preloader onComplete={() => setLoading(false)} />}

      <HomeContent 
        onOpenCatalogo={onOpenCatalogo}
        onAddToCart={onAddToCart}
        onOpenCart={onOpenCart}
      />
    </>
  );
}

export default Home;
