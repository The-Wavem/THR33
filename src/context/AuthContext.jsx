import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const USER_STORAGE_KEY = 'thr33_user_profile';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authOriginPath, setAuthOriginPath] = useState(null);
  const [initialAuthTab, setInitialAuthTab] = useState('login'); // 'login' | 'register'

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Erro ao guardar sessão de usuário:', e);
    }
  }, [user]);

  const DEFAULT_USER_EXTRAS = {
    passId: '#0482',
    tier: 'STATUS: MEMBRO VIP // ATELIÊ R.U.A',
    createdAt: '14/03/2024',
    phone: '(11) 98765-4321',
    instagram: '@weslley.k',
    cpf: '382.901.482-00'
  };

  const login = (userData) => {
    const formattedUser = {
      ...DEFAULT_USER_EXTRAS,
      id: userData.id || `usr-${Date.now()}`,
      name: userData.name || userData.nome || 'WESLLEY K.',
      email: userData.email || 'weslley@atelier-thr33.com',
      ...userData
    };
    setUser(formattedUser);
    setIsAuthModalOpen(false);
    return formattedUser;
  };

  const updateUser = (updatedFields) => {
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        ...updatedFields
      };
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  const deleteAccount = () => {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem('thr33_saved_addresses');
  };

  const openAuthModal = (originPath = null, tab = 'login') => {
    setAuthOriginPath(originPath);
    setInitialAuthTab(tab);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      updateUser,
      logout,
      deleteAccount,
      isAuthModalOpen,
      openAuthModal,
      closeAuthModal,
      authOriginPath,
      setAuthOriginPath,
      initialAuthTab,
      setInitialAuthTab
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
