import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  updatePassword as fbUpdatePassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';

const AuthContext = createContext();

// Obtém a lista de e-mails de administradores definidos de forma segura no .env
export const getAdminEmailsFromEnv = () => {
  const envEmails = import.meta.env.VITE_ADMIN_EMAILS || '';
  return envEmails
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
};

export function AuthProvider({ children }) {
  const checkIsAdmin = (email, dataRole, dataIsAdmin) => {
    // 1. Prioridade máxima: Definição gravada no banco de dados Firestore
    if (dataRole === 'admin' || dataIsAdmin === true) return true;
    
    // 2. Verificação via variáveis de ambiente seguras (.env)
    const adminEmails = getAdminEmailsFromEnv();
    if (email && adminEmails.length > 0 && adminEmails.includes(email.trim().toLowerCase())) {
      return true;
    }
    return false;
  };

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const mockRaw = localStorage.getItem('thr33_mock_auth');
        if (mockRaw) {
          const mockUser = JSON.parse(mockRaw);
          if (mockUser?.uid) {
            const isAdminUser = checkIsAdmin(mockUser.email, mockUser.role, mockUser.isAdmin);
            return {
              ...mockUser,
              isAdmin: isAdminUser || mockUser.role === 'admin' || mockUser.isAdmin === true
            };
          }
        }
      }
    } catch (e) {}
    return null;
  });

  const [loading, setLoading] = useState(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('thr33_mock_auth')) {
        return false;
      }
    } catch (e) {}
    return true;
  });

  // Modal and Navigation State (Compatibilidade com Checkout e Navbar)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authOriginPath, setAuthOriginPath] = useState(null);
  const [initialAuthTab, setInitialAuthTab] = useState('login');

  useEffect(() => {
    // 0. Suporte à injeção de sessão mock para testes automatizados E2E (Playwright)
    try {
      const mockRaw = typeof window !== 'undefined' ? localStorage.getItem('thr33_mock_auth') : null;
      if (mockRaw) {
        const mockUser = JSON.parse(mockRaw);
        if (mockUser?.uid) {
          const isAdminUser = checkIsAdmin(mockUser.email, mockUser.role, mockUser.isAdmin);
          setCurrentUser({
            ...mockUser,
            isAdmin: isAdminUser || mockUser.role === 'admin' || mockUser.isAdmin === true
          });
          setLoading(false);
        }
      }
    } catch (e) {}

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const isAdminUser = checkIsAdmin(user.email);

        // 1. Define imediatamente o usuário autenticado com dados do Auth (RÁPIDO / SEM ESPERAR FIRESTORE)
        const baseUserData = {
          uid: user.uid,
          id: user.uid,
          email: user.email,
          name: user.displayName || 'Cliente THR33',
          displayName: user.displayName || 'Cliente THR33',
          photoURL: user.photoURL || '',
          cpf: '',
          phone: '',
          role: isAdminUser ? 'admin' : 'customer',
          isAdmin: isAdminUser
        };
        setCurrentUser(baseUserData);
        setLoading(false);

        // 2. Busca dados estendidos do Firestore em segundo plano (SEM BLOQUEAR)
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            const isAdminFinal = checkIsAdmin(user.email, data.role, data.isAdmin);

            // Sincroniza role de admin no Firestore se for email master e ainda não constar
            if (isAdminFinal && data.role !== 'admin') {
              setDoc(userDocRef, { role: 'admin', isAdmin: true }, { merge: true }).catch(() => {});
            }

            setCurrentUser((prev) => ({
              ...prev,
              ...data,
              name: user.displayName || data.name || 'Cliente THR33',
              displayName: user.displayName || data.name,
              photoURL: user.photoURL || data.photoURL || '',
              phone: data.phone || '',
              cpf: data.cpf || '',
              role: isAdminFinal ? 'admin' : (data.role || 'customer'),
              isAdmin: isAdminFinal
            }));
          } else {
            // Cria documento inicial no Firestore se não existir
            const isAdminFinal = checkIsAdmin(user.email);
            await setDoc(userDocRef, {
              name: user.displayName || 'Cliente THR33',
              email: user.email || '',
              photoURL: user.photoURL || '',
              cpf: '',
              phone: '',
              role: isAdminFinal ? 'admin' : 'customer',
              isAdmin: isAdminFinal,
              addresses: [],
              wishlist: [],
              createdAt: new Date().toISOString(),
              provider: user.providerData?.[0]?.providerId || 'firebase'
            }, { merge: true });
          }
        } catch (error) {
          console.warn("Aviso: Firestore indisponível no momento. Mantendo perfil básico.", error.message);
        }
      } else {
        try {
          const mockRaw = typeof window !== 'undefined' ? localStorage.getItem('thr33_mock_auth') : null;
          if (mockRaw) {
            const mockUser = JSON.parse(mockRaw);
            if (mockUser?.uid) {
              const isAdminUser = checkIsAdmin(mockUser.email, mockUser.role, mockUser.isAdmin);
              setCurrentUser({
                ...mockUser,
                isAdmin: isAdminUser || mockUser.role === 'admin' || mockUser.isAdmin === true
              });
              setLoading(false);
              return;
            }
          }
        } catch (e) {}
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Login tradicional E-mail/Senha
  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    setIsAuthModalOpen(false);
    return userCredential.user;
  };

  // Cadastro tradicional E-mail/Senha
  const register = async ({ email, password, name, cpf, phone }) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const user = userCredential.user;

    if (name) {
      await updateProfile(user, { displayName: name.trim() });
    }

    const isAdminUser = checkIsAdmin(email);

    // Salva perfil no Firestore sem travar o fluxo
    try {
      await setDoc(doc(db, 'users', user.uid), {
        name: name ? name.trim() : '',
        email: email.trim(),
        cpf: cpf ? cpf.trim() : '',
        phone: phone ? phone.trim() : '',
        role: isAdminUser ? 'admin' : 'customer',
        isAdmin: isAdminUser,
        addresses: [], // Começa zerado
        wishlist: [],  // Começa zerado
        createdAt: new Date().toISOString(),
        provider: 'password'
      });
    } catch (err) {
      console.warn("Não foi possível gravar perfil estendido no Firestore:", err.message);
    }

    setIsAuthModalOpen(false);
    return user;
  };

  // Login com Google
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const isAdminUser = checkIsAdmin(user.email);

    // Tenta gravar/sincronizar no Firestore sem bloquear o redirecionamento do usuário
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          name: user.displayName || 'Cliente THR33',
          email: user.email || '',
          photoURL: user.photoURL || '',
          cpf: '',
          phone: user.phoneNumber || '',
          role: isAdminUser ? 'admin' : 'customer',
          isAdmin: isAdminUser,
          addresses: [], // Começa zerado
          wishlist: [],  // Começa zerado
          createdAt: new Date().toISOString(),
          provider: 'google'
        });
      } else {
        const docData = userDoc.data();
        const isAdminFinal = checkIsAdmin(user.email, docData.role, docData.isAdmin);
        await setDoc(userDocRef, {
          name: user.displayName || docData.name || 'Cliente THR33',
          photoURL: user.photoURL || docData.photoURL || '',
          role: isAdminFinal ? 'admin' : (docData.role || 'customer'),
          isAdmin: isAdminFinal
        }, { merge: true });
      }
    } catch (err) {
      console.warn("Aviso: Falha ao sincronizar Firestore com login Google.", err.message);
    }

    setIsAuthModalOpen(false);
    return {
      user
    };
  };

  // COMPLETAR PERFIL (CPF E WHATSAPP)
  const completeProfile = async ({ cpf, phone, name }) => {
    if (!auth.currentUser) throw new Error("Usuário não autenticado.");
    const uid = auth.currentUser.uid;
    const userDocRef = doc(db, 'users', uid);

    const updatedData = {
      cpf: cpf.trim(),
      phone: phone.trim()
    };
    if (name) {
      updatedData.name = name.trim();
      try {
        await updateProfile(auth.currentUser, { displayName: name.trim() });
      } catch (err) {
        console.warn("Erro ao atualizar displayName:", err);
      }
    }

    try {
      await setDoc(userDocRef, updatedData, { merge: true });
    } catch (err) {
      console.warn("Aviso ao salvar completeProfile no Firestore:", err.message);
    }

    setCurrentUser(prev => ({
      ...prev,
      ...updatedData
    }));

    return true;
  };

  // Atualização de Perfil no Firestore e no Estado Local
  const updateUser = async (updatedFields) => {
    if (!currentUser) return;
    try {
      if (auth.currentUser && updatedFields.name) {
        try {
          await updateProfile(auth.currentUser, { displayName: updatedFields.name.trim() });
        } catch (nameErr) {
          console.warn("Aviso ao atualizar displayName:", nameErr.message);
        }
      }
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, updatedFields, { merge: true });
      setCurrentUser(prev => ({ ...prev, ...updatedFields }));
    } catch (err) {
      console.warn("Aviso ao atualizar perfil no Firestore:", err.message);
      setCurrentUser(prev => ({ ...prev, ...updatedFields }));
    }
  };

  // Alteração de Senha Segura
  const changePassword = async (currentPassword, newPassword) => {
    if (!auth.currentUser) return { success: false, error: 'Usuário não autenticado.' };
    try {
      await fbUpdatePassword(auth.currentUser, newPassword);
      return { success: true };
    } catch (err) {
      console.error("Erro ao alterar senha no Firebase:", err);
      if (err.code === 'auth/requires-recent-login') {
        return { success: false, error: 'Por segurança, faça login novamente antes de alterar sua senha.' };
      }
      return { success: false, error: err.message || 'Erro ao alterar senha.' };
    }
  };

  // Função de Logout Real
  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
  };

  // Exclusão de Conta
  const deleteAccount = async () => {
    if (auth.currentUser) {
      try {
        await auth.currentUser.delete();
      } catch (err) {
        console.error("Erro ao excluir conta:", err);
      }
    }
    await logout();
  };

  const openAuthModal = (originPath = null, tab = 'login') => {
    setAuthOriginPath(originPath);
    setInitialAuthTab(tab);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const isUserAdmin = Boolean(
    currentUser?.isAdmin || 
    currentUser?.role === 'admin' || 
    (currentUser?.email && getAdminEmailsFromEnv().includes(currentUser.email.trim().toLowerCase()))
  );

  const value = {
    currentUser,
    user: currentUser,
    isAuthenticated: !!currentUser,
    isAdmin: isUserAdmin,
    role: isUserAdmin ? 'admin' : (currentUser?.role || 'customer'),
    login,
    register,
    loginWithGoogle,
    completeProfile,
    updateUser,
    changePassword,
    logout,
    deleteAccount,
    loading,
    isAuthModalOpen,
    openAuthModal,
    closeAuthModal,
    authOriginPath,
    setAuthOriginPath,
    initialAuthTab,
    setInitialAuthTab
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
