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
        VERIFICANDO AUTENTICAÇÃO // ATELIÊ THR33...
      </div>
    );
  }

  // Se não estiver autenticado, redireciona para a tela de autenticação preservando a rota de origem
  if (!isAuthenticated) {
    return (
      <Navigate 
        to="/auth?mode=login" 
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
