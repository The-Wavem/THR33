import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, User, Mail, ShieldCheck, ArrowRight, Check, AlertTriangle, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import styles from './Auth.module.css';

export function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, user } = useAuth();

  // Rota de origem (location.state?.from ou '/')
  const fromPath = location.state?.from || '/';
  const initialTab = location.state?.tab || 'login';

  const [activeTab, setActiveTab] = useState(initialTab); // 'login' | 'register'
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Formulário de Login
  const [loginData, setLoginData] = useState({
    email: '',
    senha: ''
  });

  // Formulário de Cadastro
  const [registerData, setRegisterData] = useState({
    nome: '',
    email: '',
    cpf: '',
    senha: ''
  });

  // Se já estiver logado, redireciona para a origem
  useEffect(() => {
    if (user) {
      navigate(fromPath, { replace: true });
    }
  }, [user, fromPath, navigate]);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    setTimeout(() => {
      if (loginData.email.trim() && loginData.senha.trim()) {
        login({
          name: 'Usuário Ateliê',
          email: loginData.email,
          cpf: '123.456.789-00'
        });
        setSuccessMessage('✓ AUTENTICAÇÃO REALIZADA COM SUCESSO! REDIRECIONANDO...');
        setTimeout(() => {
          navigate(fromPath, { replace: true });
        }, 1000);
      } else {
        setErrorMessage('CREDENCIAS INVÁLIDAS // PREENCHA TODOS OS CAMPOS');
        setIsLoading(false);
      }
    }, 1200);
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    setTimeout(() => {
      if (registerData.nome.trim() && registerData.email.trim() && registerData.senha.trim()) {
        login({
          name: registerData.nome,
          email: registerData.email,
          cpf: registerData.cpf || '000.000.000-00'
        });
        setSuccessMessage('✓ CONTA CADASTRADA COM SUCESSO! BEM-VINDO AO ATELIÊ.');
        setTimeout(() => {
          navigate(fromPath, { replace: true });
        }, 1000);
      } else {
        setErrorMessage('ERRO NO CADASTRO // VERIFIQUE OS DADOS INFORMADOS');
        setIsLoading(false);
      }
    }, 1200);
  };

  return (
    <div className={styles.authPageContainer}>
      <div className={styles.wrapper}>
        
        {/* HEADER DE NAVEGAÇÃO & BREADCRUMB */}
        <div className={styles.authHeaderBar}>
          <Link to="/" className={styles.breadLink}>HOME</Link>
          <span className={styles.breadSep}>/</span>
          <strong className={styles.breadActive}>AUTENTICAÇÃO TÁTICA</strong>
        </div>

        {/* CONTAINER DO CARD BRUTALISTA DE AUTH */}
        <div className={styles.authCard}>
          
          <div className={styles.cardTopHeader}>
            <div className={styles.tagBadge}>
              <Lock size={14} />
              <span>THR33 SECURE AUTH PROTOCOL</span>
            </div>
            {fromPath === '/checkout' && (
              <span className={styles.originAlert}>
                [ ORIGEM: CHECKOUT // RETORNO AUTOMÁTICO APÓS AUTH ]
              </span>
            )}
          </div>

          {/* TAB SWITCHER */}
          <div className={styles.tabsHeader}>
            <button
              onClick={() => { setActiveTab('login'); setErrorMessage(''); }}
              className={activeTab === 'login' ? styles.tabActive : styles.tabBtn}
            >
              <span>01. ENTRAR NA CONTA</span>
            </button>
            <button
              onClick={() => { setActiveTab('register'); setErrorMessage(''); }}
              className={activeTab === 'register' ? styles.tabActive : styles.tabBtn}
            >
              <span>02. CRIAR CONTA ATELIÊ</span>
            </button>
          </div>

          {/* MENAGENS DE FEEDBACK */}
          <AnimatePresence mode="wait">
            {errorMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0 }}
                className={styles.errorBox}
              >
                <AlertTriangle size={16} />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            {successMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0 }}
                className={styles.successBox}
              >
                <Check size={16} />
                <span>{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* TAB 01: LOGIN */}
          {activeTab === 'login' && (
            <motion.form 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              onSubmit={handleLoginSubmit} 
              className={styles.formContent}
            >
              <div className={styles.fieldGroup}>
                <label className={styles.label}>E-MAIL REGISTRADO</label>
                <div className={styles.inputWrapper}>
                  <Mail size={16} className={styles.inputIcon} />
                  <input 
                    type="email" 
                    placeholder="SEU.EMAIL@DOMINIO.COM" 
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    className={styles.inputField}
                    required
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>SENHA DE ACESSO</label>
                <div className={styles.inputWrapper}>
                  <KeyRound size={16} className={styles.inputIcon} />
                  <input 
                    type="password" 
                    placeholder="••••••••••••" 
                    value={loginData.senha}
                    onChange={(e) => setLoginData({ ...loginData, senha: e.target.value })}
                    className={styles.inputField}
                    required
                  />
                </div>
              </div>

              <button type="submit" disabled={isLoading} className={styles.btnSubmit}>
                {isLoading ? (
                  <span>AUTENTICANDO CREDENCIAIS...</span>
                ) : (
                  <>
                    <span>ENTRAR NO ATELIÊ</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </motion.form>
          )}

          {/* TAB 02: CRIAR CONTA ATELIÊ */}
          {activeTab === 'register' && (
            <motion.form 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              onSubmit={handleRegisterSubmit} 
              className={styles.formContent}
            >
              <div className={styles.fieldGroup}>
                <label className={styles.label}>NOME COMPLETO</label>
                <div className={styles.inputWrapper}>
                  <User size={16} className={styles.inputIcon} />
                  <input 
                    type="text" 
                    placeholder="SEU NOME COMPLETO" 
                    value={registerData.nome}
                    onChange={(e) => setRegisterData({ ...registerData, nome: e.target.value })}
                    className={styles.inputField}
                    required
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>E-MAIL PARA NOTIFICAÇÕES</label>
                <div className={styles.inputWrapper}>
                  <Mail size={16} className={styles.inputIcon} />
                  <input 
                    type="email" 
                    placeholder="SEU.EMAIL@DOMINIO.COM" 
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    className={styles.inputField}
                    required
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>CPF (PARA EMISSÃO DE NOTA FISCAL)</label>
                <div className={styles.inputWrapper}>
                  <ShieldCheck size={16} className={styles.inputIcon} />
                  <input 
                    type="text" 
                    placeholder="000.000.000-00" 
                    value={registerData.cpf}
                    onChange={(e) => setRegisterData({ ...registerData, cpf: e.target.value })}
                    className={styles.inputField}
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>DEFINIR SENHA DE ACESSO</label>
                <div className={styles.inputWrapper}>
                  <KeyRound size={16} className={styles.inputIcon} />
                  <input 
                    type="password" 
                    placeholder="••••••••••••" 
                    value={registerData.senha}
                    onChange={(e) => setRegisterData({ ...registerData, senha: e.target.value })}
                    className={styles.inputField}
                    required
                  />
                </div>
              </div>

              <button type="submit" disabled={isLoading} className={styles.btnSubmit}>
                {isLoading ? (
                  <span>CADASTRANDO PERFIL...</span>
                ) : (
                  <>
                    <span>CRIAR CONTA & CONTINUAR</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </motion.form>
          )}

        </div>

      </div>
    </div>
  );
}

export default Auth;
