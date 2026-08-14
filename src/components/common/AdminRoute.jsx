import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  // 1. Enquanto o Firebase SDK valida a sessão / dados do usuário
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-heading)',
        letterSpacing: '2px',
        fontSize: '0.85rem',
        textTransform: 'uppercase',
        gap: '1rem'
      }}>
        <ShieldCheck size={28} style={{ color: '#4ade80' }} />
        <span>VERIFICANDO PERMISSÕES DE ADMINISTRADOR // THR33 CMS...</span>
      </div>
    );
  }

  // 2. Se não estiver autenticado, redireciona para login
  if (!isAuthenticated) {
    return (
      <Navigate 
        to="/auth" 
        state={{ 
          from: location.pathname,
          tab: 'login',
          message: 'Acesso restrito: faça login com uma conta de Administrador.' 
        }} 
        replace 
      />
    );
  }

  // 3. Se estiver logado mas NÃO for administrador, redireciona para a home ou perfil com aviso
  if (!isAdmin) {
    return (
      <Navigate 
        to="/perfil" 
        state={{ 
          message: 'Acesso não autorizado: sua conta não possui privilégios de Administrador.' 
        }} 
        replace 
      />
    );
  }

  return children;
}

export default AdminRoute;
