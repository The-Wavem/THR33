import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, ArrowRight, Lock, ShieldCheck, UserCheck, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  validateEmail, 
  validatePassword, 
  validateMaxLength,
  validateCPF,
  validatePhone,
  maskCPF,
  maskPhone
} from '../../utils/validators';
import styles from './Auth.module.css';

export function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    currentUser, 
    login, 
    register, 
    loginWithGoogle, 
    completeProfile, 
    logout, 
    isAuthenticated,
    loading
  } = useAuth();

  const queryParams = new URLSearchParams(location.search);
  const rawQueryMode = queryParams.get('mode');
  // Modos públicos permitidos via URL: apenas 'login' ou 'register'
  const initialMode = rawQueryMode === 'register' ? 'register' : 'login';

  const [mode, setMode] = useState(initialMode);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form de Completar Cadastro (Google Auth)
  const [completeData, setCompleteData] = useState({
    name: '',
    cpf: '',
    phone: ''
  });

  // PROTEÇÃO ESTRITA DE ESTADO:
  // A tela de 'complete-profile' NUNCA pode ser acessada por anônimos ou via URL
  useEffect(() => {
    if (loading) return;

    if (isAuthenticated && currentUser) {
      if (currentUser.cpf && currentUser.phone) {
        // Usuário 100% completo -> Redireciona para o destino
        const from = location.state?.from || '/perfil';
        navigate(from, { replace: true });
      } else {
        // Usuário autenticado pelo Google com pendência de CPF/Telefone
        setMode('complete-profile');
        setCompleteData({
          name: currentUser.displayName || currentUser.name || '',
          cpf: currentUser.cpf || '',
          phone: currentUser.phone || ''
        });
      }
    } else {
      // Se NÃO houver usuário logado no Firebase, bloqueia 'complete-profile' e volta para 'login'
      if (mode === 'complete-profile' || rawQueryMode === 'complete-profile') {
        setMode('login');
        if (rawQueryMode === 'complete-profile') {
          navigate('/auth', { replace: true });
        }
      }
    }
  }, [isAuthenticated, currentUser, loading, navigate, location.state, rawQueryMode, mode]);

  useEffect(() => {
    if (rawQueryMode === 'register') {
      setMode('register');
      setError('');
    } else if (rawQueryMode === 'login') {
      setMode('login');
      setError('');
    }
  }, [rawQueryMode]);

  // Form States
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    cpf: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  // HANDLER LOGIN / CADASTRO COM GOOGLE
  const handleGoogleAuth = async () => {
    try {
      setError('');
      setSubmitting(true);
      const { user, isProfileComplete } = await loginWithGoogle();
      
      if (!isProfileComplete) {
        setMode('complete-profile');
        setCompleteData({
          name: user.displayName || '',
          cpf: '',
          phone: ''
        });
      } else {
        const from = location.state?.from || '/perfil';
        navigate(from);
      }
    } catch (err) {
      console.error("Erro Google Auth:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('O pop-up do Google foi fechado antes de concluir a autenticação.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('O navegador bloqueou a janela pop-up do Google. Permita pop-ups para continuar.');
      } else {
        setError('Erro ao autenticar com a Conta Google. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // SUBMIT COMPLETAR CADASTRO (GOOGLE)
  const handleCompleteProfileSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!currentUser) {
      setError('Sessão expirada. Faça login novamente.');
      setMode('login');
      return;
    }

    if (!validateCPF(completeData.cpf)) {
      setError('CPF inválido. Por favor, verifique os 11 dígitos.');
      return;
    }

    if (!validatePhone(completeData.phone)) {
      setError('Telefone / WhatsApp inválido com DDD (10 ou 11 dígitos).');
      return;
    }

    try {
      setSubmitting(true);
      await completeProfile({
        cpf: completeData.cpf,
        phone: completeData.phone,
        name: completeData.name || currentUser.displayName
      });
      const from = location.state?.from || '/perfil';
      navigate(from);
    } catch (err) {
      console.error("Erro ao completar perfil:", err);
      setError('Erro ao salvar dados complementares. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // CANCELAR COMPLETAR CADASTRO
  const handleCancelComplete = async () => {
    await logout();
    setMode('login');
    setError('');
  };

  // SUBMIT LOGIN TRADICIONAL
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(loginData.email)) {
      setError('Por favor, informe um e-mail válido.');
      return;
    }

    try {
      setSubmitting(true);
      await login(loginData.email, loginData.password);
      const from = location.state?.from || '/perfil';
      navigate(from);
    } catch (err) {
      console.error("Erro no login:", err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Muitas tentativas malsucedidas. Tente novamente mais tarde.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Formato de e-mail inválido.');
      } else {
        setError('Erro ao realizar login. Verifique seus dados e tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // SUBMIT CADASTRO TRADICIONAL
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validação de Nome
    if (!registerData.name.trim() || !validateMaxLength(registerData.name, 100)) {
      setError('O nome completo deve ter no máximo 100 caracteres.');
      return;
    }

    // Validação de E-mail
    if (!validateEmail(registerData.email)) {
      setError('Por favor, informe um formato de e-mail válido.');
      return;
    }

    // Validação estrita de CPF
    if (!validateCPF(registerData.cpf)) {
      setError('CPF inválido. Por favor, verifique os dígitos digitados.');
      return;
    }

    // Validação de Telefone
    if (!validatePhone(registerData.phone)) {
      setError('Telefone / WhatsApp inválido com DDD.');
      return;
    }

    // Validação estrita de Senha (8+ chars, 1 Maiúscula, 1 Número)
    const passValidation = validatePassword(registerData.password);
    if (!passValidation.isValid) {
      setError(passValidation.message);
      return;
    }

    // Confirmação de Senha
    if (registerData.password !== registerData.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    try {
      setSubmitting(true);
      await register(registerData);
      const from = location.state?.from || '/perfil';
      navigate(from);
    } catch (err) {
      console.error("Erro no cadastro:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está cadastrado em nossa plataforma.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha fornecida é considerada fraca pelo servidor.');
      } else if (err.code === 'auth/invalid-email') {
        setError('E-mail inválido.');
      } else {
        setError('Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isCompleteMode = mode === 'complete-profile' && Boolean(currentUser);

  return (
    <main className={styles.container}>
      <div className={styles.authCard}>
        {/* CABEÇALHO / ABAS */}
        {isCompleteMode ? (
          <div className={styles.completeHeader}>
            <div className={styles.completeBadge}>
              <ShieldCheck size={14} />
              <span>PASSO FINAL // ATELIÊ THR33</span>
            </div>
            <h1 className={styles.completeTitle}>COMPLETAR SEU CADASTRO</h1>
            <p className={styles.completeSub}>
              Para emissão de nota fiscal e rastreio de entregas dos seus pedidos, confirme seu CPF e WhatsApp.
            </p>

            {/* PREVIEW DO USUÁRIO DO GOOGLE */}
            <div className={styles.googleUserBox}>
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} alt={currentUser.displayName || 'Google User'} className={styles.googleAvatar} />
              ) : (
                <div className={styles.googleAvatarFallback}>
                  {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className={styles.googleUserInfo}>
                <strong className={styles.googleUserName}>{currentUser.displayName || currentUser.name || 'Cliente Google'}</strong>
                <span className={styles.googleUserEmail}>{currentUser.email}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.tabHeaders}>
            <button 
              type="button"
              className={`${styles.tabBtn} ${mode === 'login' ? styles.activeTab : ''}`}
              onClick={() => { setMode('login'); setError(''); }}
            >
              ENTRAR
            </button>
            <button 
              type="button"
              className={`${styles.tabBtn} ${mode === 'register' ? styles.activeTab : ''}`}
              onClick={() => { setMode('register'); setError(''); }}
            >
              CRIAR CONTA
            </button>
          </div>
        )}

        {/* AVISO DE ACESSO RESTRITO / REDIRECIONAMENTO */}
        {location.state?.message && !error && !isCompleteMode && (
          <div className={styles.infoNotice}>
            <Lock size={14} />
            <span>{location.state.message}</span>
          </div>
        )}

        {error && (
          <div className={styles.errorMessage}>
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* BOTÃO LOGIN SOCIAL COM O GOOGLE (APENAS NAS ABAS LOGIN E REGISTER) */}
        {!isCompleteMode && (
          <>
            <button 
              type="button" 
              onClick={handleGoogleAuth} 
              disabled={submitting}
              className={styles.googleBtn}
              aria-label={mode === 'login' ? 'Entrar com o Google' : 'Criar conta com o Google'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>{mode === 'login' ? 'CONTINUAR COM O GOOGLE' : 'CRIAR CONTA COM GOOGLE'}</span>
            </button>

            <div className={styles.divider}>
              <span>OU VIA E-MAIL</span>
            </div>
          </>
        )}

        <AnimatePresence mode="wait">
          {/* TELA DE COMPLETAR CADASTRO (SOMENTE COM USUÁRIO ATIVO DO GOOGLE) */}
          {isCompleteMode ? (
            <motion.form
              key="complete-profile"
              onSubmit={handleCompleteProfileSubmit}
              className={styles.form}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className={styles.inputGroup}>
                <label>CPF * (OBRIGATÓRIO PARA ENVIO)</label>
                <input 
                  type="text" 
                  placeholder="000.000.000-00"
                  value={completeData.cpf}
                  maxLength={14}
                  onChange={(e) => setCompleteData({ ...completeData, cpf: maskCPF(e.target.value) })}
                  required
                  autoFocus
                />
              </div>

              <div className={styles.inputGroup}>
                <label>TELEFONE / WHATSAPP * (RASTREIO DE PEDIDOS)</label>
                <input 
                  type="text" 
                  placeholder="(41) 99999-9999"
                  value={completeData.phone}
                  maxLength={15}
                  onChange={(e) => setCompleteData({ ...completeData, phone: maskPhone(e.target.value) })}
                  required 
                />
              </div>

              <button type="submit" disabled={submitting} className={styles.submitBtn}>
                <UserCheck size={16} />
                <span>{submitting ? 'SALVANDO DADOS...' : 'CONCLUIR CADASTRO & ENTRAR'}</span>
              </button>

              <button 
                type="button" 
                onClick={handleCancelComplete} 
                className={styles.cancelCompleteBtn}
              >
                <LogOut size={13} />
                <span>Trocar de Conta / Cancelar</span>
              </button>
            </motion.form>
          ) : mode === 'login' ? (
            /* FORMULÁRIO DE LOGIN */
            <motion.form 
              key="login"
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
                  maxLength={120}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  required 
                />
              </div>

              <div className={styles.inputGroup}>
                <div className={styles.labelRow}>
                  <label>SENHA *</label>
                  <a 
                    href="#recuperar" 
                    onClick={(e) => {
                      e.preventDefault();
                      alert('Instruções de recuperação foram enviadas ao seu e-mail cadastrado.');
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

              <button type="submit" disabled={submitting} className={styles.submitBtn}>
                <span>{submitting ? 'AUTENTICANDO...' : 'ACESSAR MINHA CONTA'}</span>
                <ArrowRight size={15} />
              </button>
            </motion.form>
          ) : (
            /* FORMULÁRIO DE CADASTRO TRADICIONAL */
            <motion.form 
              key="register"
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
                  maxLength={100}
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
                  maxLength={120}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  required 
                />
              </div>

              <div className={styles.rowTwo}>
                <div className={styles.inputGroup}>
                  <label>CPF *</label>
                  <input 
                    type="text" 
                    placeholder="000.000.000-00"
                    value={registerData.cpf}
                    maxLength={14}
                    onChange={(e) => setRegisterData({ ...registerData, cpf: maskCPF(e.target.value) })}
                    required
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>TELEFONE *</label>
                  <input 
                    type="text" 
                    placeholder="(41) 99999-9999"
                    value={registerData.phone}
                    maxLength={15}
                    onChange={(e) => setRegisterData({ ...registerData, phone: maskPhone(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className={styles.rowTwo}>
                <div className={styles.inputGroup}>
                  <label>SENHA *</label>
                  <div className={styles.passwordInputWrapper}>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Mín. 8 chars, 1 A-Z, 1 num"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
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
                <div className={styles.inputGroup}>
                  <label>CONFIRMAR SENHA *</label>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••"
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                    required 
                  />
                </div>
              </div>

              {/* REQUISITOS VISUAIS DE SENHA */}
              <div className={styles.passwordRulesList}>
                <span className={`${styles.ruleBadge} ${registerData.password.length >= 8 ? styles.ruleMet : ''}`}>
                  {registerData.password.length >= 8 ? '✓' : '○'} 8+ caracteres
                </span>
                <span className={`${styles.ruleBadge} ${/[A-Z]/.test(registerData.password) ? styles.ruleMet : ''}`}>
                  {/[A-Z]/.test(registerData.password) ? '✓' : '○'} 1 Letra maiúscula (A-Z)
                </span>
                <span className={`${styles.ruleBadge} ${/[0-9]/.test(registerData.password) ? styles.ruleMet : ''}`}>
                  {/[0-9]/.test(registerData.password) ? '✓' : '○'} 1 Número (0-9)
                </span>
              </div>

              <button type="submit" disabled={submitting} className={styles.submitBtn}>
                <span>{submitting ? 'CRIANDO CONTA...' : 'CONCLUIR CADASTRO'}</span>
                <ArrowRight size={15} />
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

export default Auth;
