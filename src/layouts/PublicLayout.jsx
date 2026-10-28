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
    
    if (false) {
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

    window.__lenis = lenis;

    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }

    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      if (window.__lenis === lenis) {
        window.__lenis = null;
      }
    };
  }, []);

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
        <div key={location.pathname} className={styles.pageMotionWrapper}>
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default PublicLayout;
