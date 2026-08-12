import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const USER_STORAGE_KEY = 'thr33_user_profile';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
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
      if (currentUser) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Erro ao guardar sessão de usuário:', e);
    }
  }, [currentUser]);

  const login = (emailOrData, password) => {
    let userMock;
    if (typeof emailOrData === 'object' && emailOrData !== null) {
      userMock = {
        id: emailOrData.id || `usr-${Date.now()}`,
        name: emailOrData.name || 'Weslley Kampa',
        email: emailOrData.email || 'weslley@thr33.com',
        phone: emailOrData.phone || '(41) 99999-8888',
        cpf: emailOrData.cpf || '123.456.789-00',
        ...emailOrData
      };
    } else {
      userMock = {
        id: 'usr_123',
        name: 'Weslley Kampa',
        email: emailOrData,
        phone: '(41) 99999-8888',
        cpf: '123.456.789-00'
      };
    }
    setCurrentUser(userMock);
    setIsAuthModalOpen(false);
    return userMock;
  };

  const register = (userData) => {
    const userMock = {
      id: `usr_${Date.now()}`,
      name: userData.name || 'Novo Cliente',
      email: userData.email,
      cpf: userData.cpf || '123.456.789-00',
      phone: userData.phone || '(41) 99999-8888'
    };
    setCurrentUser(userMock);
    setIsAuthModalOpen(false);
    return userMock;
  };

  const updateUser = (updatedFields) => {
    setCurrentUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        ...updatedFields
      };
    });
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  const deleteAccount = () => {
    setCurrentUser(null);
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
      currentUser,
      user: currentUser,
      isAuthenticated: Boolean(currentUser),
      login,
      register,
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

export default AuthContext;
