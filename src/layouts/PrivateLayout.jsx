import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import styles from './PrivateLayout.module.css';

export function PrivateLayout({ user, onLogout, cartCount, onOpenCart }) {
  const location = useLocation();

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

      <main className={styles.contentArea}>
        <div key={location.pathname} className={styles.pageMotionWrapper}>
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default PrivateLayout;
