import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import styles from './PrivateLayout.module.css';

export function PrivateLayout({ user, onLogout, cartCount, onOpenCart }) {
  // Proteção de Rota: Se não houver usuário logado, redireciona
  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className={styles.privateContainer}>
      <Navbar 
        user={user}
        onLogout={onLogout}
        cartCount={cartCount}
        onOpenCart={onOpenCart}
      />

      <div className={styles.privateBanner}>
        <span>ÁREA RESTRITA // PASSAPORTE AUTENTICADO: {user.passId || '#0482'}</span>
      </div>

      <main className={styles.contentArea}>
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}

export default PrivateLayout;
