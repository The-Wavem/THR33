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

  const login = (userData) => {
    const formattedUser = {
      id: userData.id || `usr-${Date.now()}`,
      name: userData.name || userData.nome || 'Usuário Ateliê',
      email: userData.email,
      cpf: userData.cpf || '000.000.000-00',
      createdAt: new Date().toISOString()
    };
    setUser(formattedUser);
    setIsAuthModalOpen(false);
    return formattedUser;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
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
      logout,
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
