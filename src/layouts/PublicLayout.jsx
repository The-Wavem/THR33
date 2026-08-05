import React from 'react';
import { Outlet } from 'react-router-dom';
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
  return (
    <div className={styles.publicContainer}>
      {/* 1. NAVBAR FIXA PAI */}
      <Navbar 
        user={user}
        onLogout={onLogout}
        cartCount={cartCount}
        onOpenCart={onOpenCart}
        onOpenAuthModal={onOpenAuthModal}
      />

      {/* 2. ÁREA DE CONTEÚDO DINÂMICO (HOME, CATÁLOGO, DETALHES, ETC) */}
      <main className={styles.contentArea}>
        <Outlet />
      </main>

      {/* 3. FOOTER FIXO PAI */}
      <Footer />
    </div>
  );
}

export default PublicLayout;
