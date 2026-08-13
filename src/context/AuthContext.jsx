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

  // Listener em tempo real do estado de autenticação do Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Busca os dados complementares gravados no Firestore (CPF, telefone, endereços)
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            setCurrentUser({
              uid: firebaseUser.uid,
              id: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName || data.name || 'Cliente THR33',
              displayName: firebaseUser.displayName || data.name,
              photoURL: firebaseUser.photoURL || data.photoURL || '',
              phone: data.phone || '',
              cpf: data.cpf || '',
              ...data
            });
          } else {
            setCurrentUser({
              uid: firebaseUser.uid,
              id: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName || 'Cliente THR33',
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL || ''
            });
          }
        } catch (error) {
          console.error("Erro ao carregar dados do usuário no Firestore:", error);
          setCurrentUser({
            uid: firebaseUser.uid,
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || 'Cliente THR33',
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL || ''
          });
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Função de Login Tradicional com E-mail e Senha
  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    setIsAuthModalOpen(false);
    return userCredential.user;
  };

  // Função de Cadastro Tradicional no Firebase Auth + Firestore
  const register = async ({ email, password, name, cpf, phone }) => {
    // 1. Cria a conta no Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const user = userCredential.user;

    // 2. Atualiza o perfil básico com o nome do cliente
    if (name) {
      await updateProfile(user, { displayName: name.trim() });
    }

    // 3. Salva o perfil completo na coleção de usuários do Firestore
    try {
      await setDoc(doc(db, 'users', user.uid), {
        name: name ? name.trim() : '',
        email: email.trim(),
        cpf: cpf ? cpf.trim() : '',
        phone: phone ? phone.trim() : '',
        createdAt: new Date().toISOString(),
        provider: 'password'
      });
    } catch (firestoreError) {
      console.warn("Aviso ao gravar documento inicial no Firestore:", firestoreError);
    }

    setIsAuthModalOpen(false);
    return user;
  };

  // LOGIN / CADASTRO COM O GOOGLE
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    // Força a seleção de conta para evitar logins automáticos indesejados
    provider.setCustomParameters({ prompt: 'select_account' });

    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Sincroniza dados com o Firestore (Cria se não existir, atualiza sem apagar outros campos)
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        name: user.displayName || 'Cliente THR33',
        email: user.email || '',
        photoURL: user.photoURL || '',
        cpf: '',
        phone: user.phoneNumber || '',
        createdAt: new Date().toISOString(),
        provider: 'google'
      });
    } else {
      // Atualiza a foto de perfil/nome caso tenha mudado na conta Google mantendo outros dados
      await setDoc(userDocRef, {
        name: user.displayName || 'Cliente THR33',
        photoURL: user.photoURL || ''
      }, { merge: true });
    }

    setIsAuthModalOpen(false);
    return user;
  };

  // Atualização de Perfil no Firestore e no Estado Local
  const updateUser = async (updatedFields) => {
    if (!currentUser) return;
    try {
      if (auth.currentUser && updatedFields.name) {
        await updateProfile(auth.currentUser, { displayName: updatedFields.name.trim() });
      }
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, updatedFields);
      setCurrentUser(prev => ({ ...prev, ...updatedFields }));
    } catch (err) {
      console.error("Erro ao atualizar perfil no Firestore:", err);
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
