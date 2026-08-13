import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function ProtectedRoute({ children }) {
  const { currentUser, isAuthenticated, loading } = useAuth();
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

  // Se não estiver autenticado, redireciona para a tela de login
  if (!isAuthenticated) {
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

  // Se estiver autenticado mas faltar CPF ou Telefone (ex: login inicial com Google), direciona internamente para completar cadastro
  if (currentUser && (!currentUser.cpf || !currentUser.phone)) {
    return (
      <Navigate 
        to="/auth" 
        state={{ 
          from: location.pathname,
          requireComplete: true,
          message: 'Confirme seu CPF e WhatsApp para validar seu cadastro e prosseguir.' 
        }} 
        replace 
      />
    );
  }

  return children;
}

export default ProtectedRoute;
