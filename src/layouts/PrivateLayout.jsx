import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import styles from './PrivateLayout.module.css';

export function PrivateLayout({ user, loading, onLogout, cartCount, onOpenCart }) {
  const location = useLocation();

  // Se o Firebase ainda estiver autenticando ou carregando a sessão, aguarda
  if (loading) {
    return null;
  }

  // Proteção Estrita de Rota: Redireciona usuários não autenticados no Firebase para Login/Cadastro
  if (!user) {
    return (
      <Navigate 
        to="/auth" 
        state={{ 
          from: location.pathname, 
          tab: 'login',
          message: 'Acesso Restrito: Faça login ou crie sua conta para acessar esta área.' 
        }} 
        replace 
      />
    );
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
