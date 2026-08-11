import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import styles from './PublicLayout.module.css';

export function PublicLayout({ 
  user, 
  onLogout, 
  cartCount, 
  onOpenCart, 
  onOpenAuthModal 
}) {
  const location = useLocation();

  // 1. GERENCIAMENTO DINÂMICO DO TEMA DA SCROLLBAR
  useEffect(() => {
    const rootHTML = document.documentElement;
    
    if (location.pathname === '/lancamentos') {
      rootHTML.setAttribute('data-theme', 'drop');
    } else {
      rootHTML.removeAttribute('data-theme');
    }
  }, [location.pathname]);

  // 2. INICIALIZAÇÃO E CONTROLE DO LENIS SCROLL
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 2.0,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
    lenis.scrollTo(0, { immediate: true });

    return () => {
      lenis.destroy();
    };
  }, [location.pathname]);

  return (
    <div className={styles.publicContainer}>
      <Navbar 
        user={user}
        onLogout={onLogout}
        cartCount={cartCount}
        onOpenCart={onOpenCart}
        onOpenAuthModal={onOpenAuthModal}
      />

      <main className={styles.contentArea}>
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}

export default PublicLayout;
