import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Enquanto o Firebase SDK valida a sessão / token no navegador
  if (loading) {
    return (
      <div style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-heading)',
        letterSpacing: '2px',
        fontSize: '0.85rem',
        textTransform: 'uppercase'
      }}>
        VERIFICANDO AUTENTICAÇÃO // THR33...
      </div>
    );
  }

  // Se não estiver autenticado, preserva link direto de cancelamento de e-mails para processar em /auth
  if (!isAuthenticated) {
    const searchParams = new URLSearchParams(location.search);
    const isUnsub = searchParams.get('unsubscribe') === '1';
    const unsubEmail = searchParams.get('unsubscribeEmail');

    if (isUnsub && unsubEmail) {
      return (
        <Navigate 
          to={`/auth?unsubscribe=1&unsubscribeEmail=${encodeURIComponent(unsubEmail)}`} 
          replace 
        />
      );
    }

    return (
      <Navigate 
        to="/auth" 
        state={{ 
          from: location.pathname,
          tab: 'login',
          message: 'Autenticação necessária para acessar esta área restrita.' 
        }} 
        replace 
      />
    );
  }

  return children;
}

export default ProtectedRoute;
