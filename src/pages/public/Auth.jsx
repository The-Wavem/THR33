import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, 
  User, 
  Mail, 
  ShieldCheck, 
  ArrowRight, 
  Check, 
  AlertCircle, 
  Phone, 
  FileText,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { validateEmail, validateCPF, validatePhone, maskCPF, maskPhone } from '../../utils/validators';
import styles from './Auth.module.css';

export function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, register, isAuthenticated } = useAuth();

  // Define se o modo inicial é 'login' ou 'register' com base no parâmetro da URL (?mode=register) ou state
  const queryParams = new URLSearchParams(location.search);
  const queryMode = queryParams.get('mode');
  const stateMode = location.state?.tab;
  const initialMode = queryMode === 'register' || stateMode === 'register' ? 'register' : 'login';

  const [mode, setMode] = useState(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const currentMode = queryParams.get('mode');
    if (currentMode === 'register' || currentMode === 'login') {
      setMode(currentMode);
      setError('');
    }
  }, [location.search]);

  // Se já estiver autenticado, redireciona para a conta
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/perfil', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Form de Login
  const [loginData, setLoginData] = useState({ email: '', password: '' });

  // Form de Cadastro
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    cpf: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(loginData.email)) {
      setError('Informe um e-mail válido.');
      return;
    }
    if (!loginData.password) {
      setError('Informe sua senha.');
      return;
    }

    login(loginData.email, loginData.password);
    setSuccessMessage('Login efetuado com sucesso! Redirecionando...');
    setTimeout(() => {
      navigate('/perfil');
    }, 600);
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!registerData.name.trim() || registerData.name.trim().length < 3) {
      setError('Informe seu nome completo (mínimo 3 caracteres).');
      return;
    }
    if (!validateEmail(registerData.email)) {
      setError('Informe um e-mail válido.');
      return;
    }
    if (registerData.cpf && !validateCPF(registerData.cpf)) {
      setError('CPF inválido. Verifique os números digitados.');
      return;
    }
    if (registerData.phone && !validatePhone(registerData.phone)) {
      setError('Telefone inválido com DDD.');
      return;
    }
    if (registerData.password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (registerData.password !== registerData.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    register(registerData);
    setSuccessMessage('Cadastro realizado com sucesso! Redirecionando...');
    setTimeout(() => {
      navigate('/perfil');
    }, 600);
  };

  return (
    <main className={styles.container}>
      <motion.div 
        className={styles.authCard}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* ALTERNÂNCIA DE ABAS */}
        <div className={styles.tabHeaders}>
          <button 
            type="button"
            className={`${styles.tabBtn} ${mode === 'login' ? styles.activeTab : ''}`}
            onClick={() => { setMode('login'); setError(''); setSuccessMessage(''); }}
          >
            ENTRAR
          </button>
          <button 
            type="button"
            className={`${styles.tabBtn} ${mode === 'register' ? styles.activeTab : ''}`}
            onClick={() => { setMode('register'); setError(''); setSuccessMessage(''); }}
          >
            CRIAR CONTA
          </button>
        </div>

        {error && (
          <div className={styles.errorMessage}>
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className={styles.successMessage}>
            <Check size={14} />
            <span>{successMessage}</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* FORMULÁRIO DE LOGIN */}
          {mode === 'login' ? (
            <motion.form 
              key="login-form"
              onSubmit={handleLoginSubmit} 
              className={styles.form}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div className={styles.inputGroup}>
                <label>E-MAIL *</label>
                <input 
                  type="email" 
                  placeholder="seu.email@exemplo.com"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  required 
                />
              </div>

              <div className={styles.inputGroup}>
                <div className={styles.labelRow}>
                  <label>SENHA *</label>
                  <a 
                    href="#esqueceu" 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      alert('Enviamos um link seguro de recuperação para seu e-mail.'); 
                    }} 
                    className={styles.forgotLink}
                  >
                    Esqueceu a senha?
                  </a>
                </div>
                <div className={styles.passwordInputWrapper}>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className={styles.togglePasswordBtn}
                    aria-label={showPassword ? "Ocultar senha" : "Ver senha"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" className={styles.submitBtn}>
                <span>ACESSAR MINHA CONTA</span>
                <ArrowRight size={15} />
              </button>
            </motion.form>
          ) : (
            /* FORMULÁRIO DE CADASTRO */
            <motion.form 
              key="register-form"
              onSubmit={handleRegisterSubmit} 
              className={styles.form}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div className={styles.inputGroup}>
                <label>NOME COMPLETO *</label>
                <input 
                  type="text" 
                  placeholder="Seu nome completo"
                  value={registerData.name}
                  onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                  required 
                />
              </div>

              <div className={styles.inputGroup}>
                <label>E-MAIL *</label>
                <input 
                  type="email" 
                  placeholder="seu.email@exemplo.com"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  required 
                />
              </div>

              <div className={styles.rowTwo}>
                <div className={styles.inputGroup}>
                  <label>CPF</label>
                  <input 
                    type="text" 
                    placeholder="000.000.000-00"
                    maxLength={14}
                    value={registerData.cpf}
                    onChange={(e) => setRegisterData({ ...registerData, cpf: maskCPF(e.target.value) })}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>TELEFONE</label>
                  <input 
                    type="text" 
                    placeholder="(41) 99999-9999"
                    maxLength={15}
                    value={registerData.phone}
                    onChange={(e) => setRegisterData({ ...registerData, phone: maskPhone(e.target.value) })}
                  />
                </div>
              </div>

              <div className={styles.rowTwo}>
                <div className={styles.inputGroup}>
                  <label>SENHA *</label>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Mínimo 6 caracteres"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    required 
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>CONFIRMAR SENHA *</label>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Repita sua senha"
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                    required 
                  />
                </div>
              </div>

              <button type="submit" className={styles.submitBtn}>
                <span>CONCLUIR CADASTRO</span>
                <ArrowRight size={15} />
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}

export default Auth;
