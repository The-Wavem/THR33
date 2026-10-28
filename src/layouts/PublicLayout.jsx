import React, { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { analyticsService } from '../services/analyticsService';
import styles from './PublicLayout.module.css';

export function PublicLayout({ 
  user, 
  onLogout, 
  cartCount, 
  onOpenCart, 
  onOpenAuthModal 
}) {
  const location = useLocation();
  const lenisRef = useRef(null);

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

    lenisRef.current = lenis;
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
      lenisRef.current = null;
      if (window.__lenis === lenis) {
        window.__lenis = null;
      }
    };
  }, []);

  // 3. RESET IMEDIATO DE INÉRCIA DO LENIS E TELEMETRIA DE SESSÃO/PAGEVIEW (LGPD-COMPLIANT & ZERO LAG)
  useEffect(() => {
    if (!location.hash && lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    }
    analyticsService.trackSessionVisit(location.pathname);
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
        <div key={location.pathname} className={styles.pageMotionWrapper}>
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default PublicLayout;
