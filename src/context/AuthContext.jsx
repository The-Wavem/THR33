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

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal and Navigation State (Compatibilidade com Checkout e Navbar)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authOriginPath, setAuthOriginPath] = useState(null);
  const [initialAuthTab, setInitialAuthTab] = useState('login');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
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
          profileComplete: false
        };
        setCurrentUser(baseUserData);
        setLoading(false);

        // 2. Busca dados estendidos do Firestore em segundo plano (SEM BLOQUEAR)
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            setCurrentUser((prev) => ({
              ...prev,
              ...data,
              name: user.displayName || data.name || 'Cliente THR33',
              displayName: user.displayName || data.name,
              photoURL: user.photoURL || data.photoURL || '',
              phone: data.phone || '',
              cpf: data.cpf || '',
              profileComplete: Boolean(data.cpf && data.phone)
            }));
          }
        } catch (error) {
          console.warn("Aviso: Firestore indisponível no momento. Mantendo perfil básico.", error.message);
        }
      } else {
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

    // Salva perfil no Firestore sem travar o fluxo
    try {
      await setDoc(doc(db, 'users', user.uid), {
        name: name ? name.trim() : '',
        email: email.trim(),
        cpf: cpf ? cpf.trim() : '',
        phone: phone ? phone.trim() : '',
        addresses: [], // Começa zerado
        wishlist: [],  // Começa zerado
        createdAt: new Date().toISOString(),
        provider: 'password',
        profileComplete: Boolean(cpf && phone)
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

    let isProfileComplete = false;

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
          addresses: [], // Começa zerado
          wishlist: [],  // Começa zerado
          createdAt: new Date().toISOString(),
          provider: 'google',
          profileComplete: false
        });
      } else {
        const docData = userDoc.data();
        isProfileComplete = Boolean(docData.cpf && docData.phone);
        await setDoc(userDocRef, {
          name: user.displayName || docData.name || 'Cliente THR33',
          photoURL: user.photoURL || docData.photoURL || ''
        }, { merge: true });
      }
    } catch (err) {
      console.warn("Aviso: Falha ao sincronizar Firestore com login Google.", err.message);
    }

    setIsAuthModalOpen(false);
    return {
      user,
      isProfileComplete
    };
  };

  // COMPLETAR PERFIL OBRIGATÓRIO (CPF E WHATSAPP)
  const completeProfile = async ({ cpf, phone, name }) => {
    if (!auth.currentUser) throw new Error("Usuário não autenticado.");
    const uid = auth.currentUser.uid;
    const userDocRef = doc(db, 'users', uid);

    const updatedData = {
      cpf: cpf.trim(),
      phone: phone.trim(),
      profileComplete: true
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

  const value = {
    currentUser,
    user: currentUser,
    isAuthenticated: !!currentUser,
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
