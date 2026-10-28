import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Lock,
  MailCheck,
  ShieldAlert,
  MessageCircle,
  RefreshCw,
  CheckCircle2,
  Mail,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { validateEmail, validatePassword, validateMaxLength } from '../../utils/validators';
import styles from './Auth.module.css';

// Número oficial do WhatsApp de suporte da THR33 (mesmo utilizado em Suporte.jsx)
const THR33_WHATSAPP_NUMBER = '554188410374';
const FIREBASE_SENDER_EMAIL = 'noreply@thr33-streetwear.firebaseapp.com';

/**
 * Traduz códigos de erro do Firebase Auth para mensagens claras e humanas em português
 */
function getHumanizedAuthError(err, context = 'general') {
  const code = err?.code || '';

  switch (code) {
    case 'auth/user-not-found':
      if (context === 'login') {
        return 'E-mail ou senha incorretos.';
      }
      return 'Não encontramos nenhuma conta cadastrada com este e-mail. Verifique se digitou corretamente ou crie uma nova conta.';
    case 'auth/invalid-email':
      return 'Digite um endereço de e-mail válido.';
    case 'auth/too-many-requests':
      return 'Muitas solicitações seguidas. Aguarde alguns minutos, verifique sua pasta de Spam ou chame nosso suporte no WhatsApp.';
    case 'auth/expired-action-code':
    case 'auth/invalid-action-code':
      return 'Este link de recuperação expirou ou já foi utilizado. Solicite um novo link abaixo.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'E-mail ou senha incorretos.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está cadastrado em nossa plataforma.';
    case 'auth/weak-password':
      return 'A senha fornecida é muito fraca. Escolha uma senha com pelo menos 6 caracteres.';
    case 'auth/network-request-failed':
      return 'Falha de conexão com a rede. Verifique sua internet e tente novamente.';
    default:
      if (context === 'forgot') {
        return 'Não foi possível enviar o link de recuperação no momento. Verifique o e-mail informado ou chame nosso suporte no WhatsApp.';
      }
      if (context === 'reset_confirm') {
        return 'Este link de recuperação expirou ou já foi utilizado. Solicite um novo link abaixo.';
      }
      return 'Ocorreu um erro ao processar sua solicitação. Tente novamente.';
  }
}

export function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    login,
    register,
    loginWithGoogle,
    resetPassword,
    verifyResetCode,
    confirmNewPassword,
    isAuthenticated
  } = useAuth();

  // Parâmetros de URL para detectar link de redefinição (?mode=resetPassword&oobCode=... ou ?oobCode=...)
  const oobCodeParam = searchParams.get('oobCode');
  const urlModeParam = searchParams.get('mode');

  const getInitialViewMode = () => {
    if (oobCodeParam && (!urlModeParam || urlModeParam === 'resetPassword' || urlModeParam === 'reset_confirm')) {
      return 'reset_confirm';
    }
    if (urlModeParam === 'register' || location.state?.tab === 'register') {
      return 'register';
    }
    if (urlModeParam === 'forgot') {
      return 'forgot';
    }
    return 'login';
  };

  const [viewMode, setViewMode] = useState(getInitialViewMode);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form States: Login & Cadastro
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Form States: Esqueci Minha Senha ('forgot')
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailTouched, setResetEmailTouched] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendFeedback, setResendFeedback] = useState('');

  // Form States: Redefinição Nativa ('reset_confirm')
  const [activeOobCode, setActiveOobCode] = useState(oobCodeParam || '');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(Boolean(oobCodeParam));
  const [codeExpired, setCodeExpired] = useState(false);
  const [newPasswordData, setNewPasswordData] = useState({
    password: '',
    confirmPassword: ''
  });

  // Redireciona se já estiver autenticado (exceto se estiver redefinindo senha via oobCode)
  useEffect(() => {
    if (isAuthenticated && !oobCodeParam && viewMode !== 'reset_confirm') {
      const from = location.state?.from || '/perfil';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state, oobCodeParam, viewMode]);

  // Sincroniza mudanças na query string da URL
  useEffect(() => {
    const code = searchParams.get('oobCode');
    const modeParam = searchParams.get('mode');

    if (code && (!modeParam || modeParam === 'resetPassword' || modeParam === 'reset_confirm')) {
      setActiveOobCode(code);
      setViewMode('reset_confirm');
      setError('');
      return;
    }

    if (modeParam === 'register' || modeParam === 'login' || modeParam === 'forgot') {
      setViewMode(modeParam);
      setError('');
    }
  }, [searchParams]);

  // Verifica o oobCode no Firebase assim que entra no modo 'reset_confirm'
  useEffect(() => {
    let isMounted = true;
    if (viewMode === 'reset_confirm' && activeOobCode) {
      setVerifyingCode(true);
      setCodeExpired(false);
      setError('');

      verifyResetCode(activeOobCode)
        .then((email) => {
          if (!isMounted) return;
          setVerifiedEmail(email || '');
          setVerifyingCode(false);
        })
        .catch((err) => {
          if (!isMounted) return;
          console.error('Erro ao validar código de recuperação:', err);
          setCodeExpired(true);
          setVerifyingCode(false);
          setError(getHumanizedAuthError(err, 'reset_confirm'));
        });
    } else if (viewMode === 'reset_confirm' && !activeOobCode) {
      setCodeExpired(true);
      setVerifyingCode(false);
      setError('Este link de recuperação expirou ou já foi utilizado. Solicite um novo link abaixo.');
    }

    return () => {
      isMounted = false;
    };
  }, [viewMode, activeOobCode, verifyResetCode]);

  // Timer regressivo de 60 segundos para reenvio do e-mail de recuperação
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Abre a tela "Esqueci minha senha" aproveitando o e-mail já digitado no login
  const handleOpenForgotMode = (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMessage('');
    setResendFeedback('');
    setResetSent(false);
    if (loginData.email.trim()) {
      setResetEmail(loginData.email.trim());
    }
    setViewMode('forgot');
  };

  // Volta para o Login limpando estados temporários
  const handleBackToLogin = () => {
    setError('');
    setResendFeedback('');
    setResetSent(false);
    if (resetEmail.trim() && validateEmail(resetEmail)) {
      setLoginData((prev) => ({ ...prev, email: resetEmail.trim() }));
    }
    if (oobCodeParam) {
      navigate('/login', { replace: true });
    }
    setViewMode('login');
  };

  // Monta URL do WhatsApp com mensagem pré-pronta contendo o e-mail do cliente
  const getWhatsAppRecoveryUrl = () => {
    const targetEmail = resetEmail.trim() || verifiedEmail || loginData.email.trim() || 'não informado';
    const text = `Olá equipe THR33! Preciso de ajuda para recuperar o acesso da minha conta vinculada ao e-mail: ${targetEmail}`;
    return `https://wa.me/${THR33_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  };

  // HANDLER LOGIN / CADASTRO COM GOOGLE
  const handleGoogleAuth = async () => {
    try {
      setError('');
      setSuccessMessage('');
      setSubmitting(true);
      await loginWithGoogle();
      const from = location.state?.from || '/perfil';
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Erro Google Auth:', err);
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

  // SUBMIT LOGIN TRADICIONAL
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!validateEmail(loginData.email)) {
      setError('Digite um endereço de e-mail válido.');
      return;
    }

    try {
      setSubmitting(true);
      await login(loginData.email, loginData.password);
      const from = location.state?.from || '/perfil';
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Erro no login:', err);
      setError(getHumanizedAuthError(err, 'login'));
    } finally {
      setSubmitting(false);
    }
  };

  // SUBMIT CADASTRO TRADICIONAL
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!registerData.name.trim() || !validateMaxLength(registerData.name, 100)) {
      setError('O nome completo deve ter no máximo 100 caracteres.');
      return;
    }

    if (!validateEmail(registerData.email)) {
      setError('Digite um endereço de e-mail válido.');
      return;
    }

    const passValidation = validatePassword(registerData.password);
    if (!passValidation.isValid) {
      setError(passValidation.message);
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    try {
      setSubmitting(true);
      await register({
        name: registerData.name,
        email: registerData.email,
        password: registerData.password
      });
      const from = location.state?.from || '/perfil';
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Erro no cadastro:', err);
      setError(getHumanizedAuthError(err, 'register'));
    } finally {
      setSubmitting(false);
    }
  };

  // SUBMIT SOLICITAR RECUPERAÇÃO DE SENHA ('forgot')
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResendFeedback('');
    setResetEmailTouched(true);

    const cleanEmail = resetEmail.trim().toLowerCase();
    if (!validateEmail(cleanEmail)) {
      setError('Digite um endereço de e-mail válido.');
      return;
    }

    try {
      setSubmitting(true);
      await resetPassword(cleanEmail);
      setResetEmail(cleanEmail);
      setResetSent(true);
      setResendCooldown(60);
    } catch (err) {
      console.error('Erro ao solicitar recuperação de senha:', err);
      setError(getHumanizedAuthError(err, 'forgot'));
    } finally {
      setSubmitting(false);
    }
  };

  // REENVIAR LINK DE RECUPERAÇÃO COM COOLDOWN DE 60S
  const handleResendResetEmail = async () => {
    if (resendCooldown > 0 || submitting) return;
    setError('');
    setResendFeedback('');

    try {
      setSubmitting(true);
      await resetPassword(resetEmail);
      setResendCooldown(60);
      setResendFeedback('Um novo link de recuperação foi enviado para o seu e-mail.');
    } catch (err) {
      console.error('Erro ao reenviar link de recuperação:', err);
      setError(getHumanizedAuthError(err, 'forgot'));
    } finally {
      setSubmitting(false);
    }
  };

  // SUBMIT REDEFINIÇÃO NATIVA DE SENHA ('reset_confirm')
  const handleResetConfirmSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPasswordData.password || newPasswordData.password.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPasswordData.password !== newPasswordData.confirmPassword) {
      setError('A confirmação de senha não coincide com a nova senha.');
      return;
    }

    try {
      setSubmitting(true);
      await confirmNewPassword(activeOobCode, newPasswordData.password);

      // Preenche o e-mail recuperado no login e exibe confirmação
      if (verifiedEmail) {
        setLoginData({ email: verifiedEmail, password: '' });
      }
      setNewPasswordData({ password: '', confirmPassword: '' });
      setSuccessMessage('Senha atualizada com sucesso! Acesse sua conta abaixo com a nova senha.');
      navigate('/login', { replace: true });
      setViewMode('login');
    } catch (err) {
      console.error('Erro ao salvar nova senha:', err);
      const humanized = getHumanizedAuthError(err, 'reset_confirm');
      setError(humanized);
      if (err?.code === 'auth/expired-action-code' || err?.code === 'auth/invalid-action-code') {
        setCodeExpired(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isResetEmailValid = validateEmail(resetEmail);
  const showTabsAndSocial = viewMode === 'login' || viewMode === 'register';

  return (
    <main className={styles.container}>
      <div className={styles.authCard}>
        {/* ABAS SUPERIORES: VISÍVEIS APENAS EM LOGIN E CADASTRO */}
        {showTabsAndSocial && (
          <div className={styles.tabHeaders}>
            <button
              type="button"
              className={`${styles.tabBtn} ${viewMode === 'login' ? styles.activeTab : ''}`}
              onClick={() => {
                setViewMode('login');
                setError('');
              }}
            >
              ENTRAR
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${viewMode === 'register' ? styles.activeTab : ''}`}
              onClick={() => {
                setViewMode('register');
                setError('');
                setSuccessMessage('');
              }}
            >
              CRIAR CONTA
            </button>
          </div>
        )}

        {/* AVISO DE ACESSO RESTRITO / REDIRECIONAMENTO */}
        {location.state?.message && !error && !successMessage && showTabsAndSocial && (
          <div className={styles.infoNotice}>
            <Lock size={14} />
            <span>{location.state.message}</span>
          </div>
        )}

        {/* MENSAGEM DE SUCESSO GLOBAL (EX: APÓS REDEFINIR SENHA) */}
        {successMessage && (
          <div className={styles.successMessage}>
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* MENSAGEM DE ERRO */}
        {error && (
          <div className={styles.errorMessage}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* LOGIN SOCIAL GOOGLE: APENAS EM LOGIN E CADASTRO */}
        {showTabsAndSocial && (
          <>
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={submitting}
              className={styles.googleBtn}
              aria-label={viewMode === 'login' ? 'Entrar com o Google' : 'Criar conta com o Google'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{viewMode === 'login' ? 'CONTINUAR COM O GOOGLE' : 'CRIAR CONTA COM GOOGLE'}</span>
            </button>

            <div className={styles.divider}>
              <span>OU VIA E-MAIL</span>
            </div>
          </>
        )}

        <AnimatePresence mode="wait">
          {/* =========================================================
              MODO 1: LOGIN ('login')
             ========================================================= */}
          {viewMode === 'login' && (
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
                  <button
                    type="button"
                    onClick={handleOpenForgotMode}
                    className={styles.forgotLink}
                  >
                    Esqueceu sua senha?
                  </button>
                </div>
                <div className={styles.passwordInputWrapper}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={styles.togglePasswordBtn}
                    aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
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
          )}

          {/* =========================================================
              MODO 2: CADASTRO ('register')
             ========================================================= */}
          {viewMode === 'register' && (
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
                  <label>SENHA *</label>
                  <div className={styles.passwordInputWrapper}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mín. 8 chars, 1 A-Z, 1 num"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={styles.togglePasswordBtn}
                      aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className={styles.inputGroup}>
                  <label>CONFIRMAR SENHA *</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
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

          {/* =========================================================
              MODO 3: SOLICITAR RECUPERAÇÃO DE SENHA ('forgot')
             ========================================================= */}
          {viewMode === 'forgot' && (
            <motion.div
              key="forgot"
              className={styles.recoveryWrapper}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              {/* HEADER EDITORIAL */}
              <button
                type="button"
                onClick={handleBackToLogin}
                className={styles.backToLoginBtn}
              >
                <ArrowLeft size={14} />
                <span>VOLTAR PARA O LOGIN</span>
              </button>

              {!resetSent ? (
                <>
                  <header className={styles.recoveryHeader}>
                    <h1 className={styles.recoveryTitle}>RECUPERAR ACESSO</h1>
                    <p className={styles.recoverySubtitle}>
                      Informe o e-mail vinculado à sua conta THR33. Enviaremos um link seguro de redefinição para você criar uma nova senha.
                    </p>
                  </header>

                  <form onSubmit={handleForgotSubmit} className={styles.form} noValidate>
                    <div className={styles.inputGroup}>
                      <div className={styles.labelRow}>
                        <label htmlFor="reset-email-input">E-MAIL DA CONTA *</label>
                        {resetEmail.trim().length > 0 && (
                          <span
                            className={
                              isResetEmailValid
                                ? styles.validationStatusValid
                                : styles.validationStatusInvalid
                            }
                          >
                            {isResetEmailValid ? 'Formato válido' : 'Formato de e-mail incompleto'}
                          </span>
                        )}
                      </div>
                      <input
                        id="reset-email-input"
                        type="email"
                        placeholder="seu.email@exemplo.com"
                        value={resetEmail}
                        maxLength={120}
                        onBlur={() => setResetEmailTouched(true)}
                        onChange={(e) => {
                          setResetEmail(e.target.value);
                          if (error) setError('');
                        }}
                        className={
                          resetEmailTouched && resetEmail.trim() && !isResetEmailValid
                            ? styles.inputInvalid
                            : isResetEmailValid
                            ? styles.inputValid
                            : ''
                        }
                        required
                      />
                    </div>

                    {/* CARD PREVENTIVO DE AVISO (ANTES DE ENVIAR) */}
                    <div className={styles.preventiveNoticeCard}>
                      <Mail size={16} className={styles.preventiveIcon} />
                      <p>
                        O link de redefinição é disparado imediatamente pelo nosso servidor seguro (
                        <strong>{FIREBASE_SENDER_EMAIL}</strong>). Verifique também sua pasta de{' '}
                        <strong>Spam</strong> ou <strong>Lixo Eletrônico</strong>.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className={styles.submitBtn}
                    >
                      <span>
                        {submitting ? 'ENVIANDO LINK...' : 'ENVIAR LINK DE RECUPERAÇÃO'}
                      </span>
                      <ArrowRight size={15} />
                    </button>
                  </form>

                  {/* SUPORTE DIRETO VIA WHATSAPP (TAMBÉM DISPONÍVEL CASO TENHA DÚVIDA) */}
                  <div className={styles.whatsappSupportCard}>
                    <span className={styles.supportCardEyebrow}>PRECISA DE AJUDA COM SUA CONTA?</span>
                    <p className={styles.supportCardText}>
                      Não lembra qual e-mail cadastrou ou teve qualquer dificuldade para acessar? Fale diretamente com a nossa equipe:
                    </p>
                    <a
                      href={getWhatsAppRecoveryUrl()}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.whatsappSupportBtn}
                    >
                      <MessageCircle size={16} />
                      <span>PEDIR AJUDA NO WHATSAPP</span>
                    </a>
                    <Link to="/suporte" className={styles.supportSecondaryLink}>
                      Ou acesse nossa Central de Atendimento (/suporte)
                    </Link>
                  </div>
                </>
              ) : (
                /* ESTADO C: E-MAIL ENVIADO COM SUCESSO! */
                <div className={styles.sentSuccessContainer}>
                  {/* 1. CONFIRMAÇÃO VISUAL */}
                  <div className={styles.sentConfirmHeader}>
                    <div className={styles.sentIconCircle}>
                      <MailCheck size={26} />
                    </div>
                    <h2 className={styles.sentTitle}>LINK DE RECUPERAÇÃO ENVIADO</h2>
                    <p className={styles.sentDescription}>
                      Disparamos as instruções de redefinição de senha para:
                    </p>
                    <div className={styles.sentEmailPill}>{resetEmail}</div>
                    <button
                      type="button"
                      onClick={() => {
                        setResetSent(false);
                        setError('');
                        setResendFeedback('');
                      }}
                      className={styles.changeEmailBtn}
                    >
                      Digitou errado? Alterar endereço de e-mail
                    </button>
                  </div>

                  {/* 2. BOX DE ALERTA IMPORTANTE SOBRE SPAM / LIXO ELETRÔNICO */}
                  <div className={styles.spamAlertBox} role="alert">
                    <div className={styles.spamAlertHeader}>
                      <ShieldAlert size={18} className={styles.spamAlertIcon} />
                      <strong>ATENÇÃO: VERIFIQUE O SPAM E LIXO ELETRÔNICO</strong>
                    </div>
                    <p className={styles.spamAlertText}>
                      O e-mail é enviado por <strong>{FIREBASE_SENDER_EMAIL}</strong>. Caso não apareça na sua caixa de entrada em até 2 minutos, verifique as pastas{' '}
                      <strong>Spam</strong>, <strong>Lixo Eletrônico</strong> ou{' '}
                      <strong>Promoções</strong> e marque como &apos;Não é spam&apos;.
                    </p>
                  </div>

                  {/* FEEDBACK DE REENVIO */}
                  {resendFeedback && (
                    <div className={styles.successMessage}>
                      <CheckCircle2 size={15} />
                      <span>{resendFeedback}</span>
                    </div>
                  )}

                  {/* 3. BOTÃO DE REENVIAR COM COOLDOWN DE 60 SEGUNDOS */}
                  <button
                    type="button"
                    onClick={handleResendResetEmail}
                    disabled={resendCooldown > 0 || submitting}
                    className={styles.resendBtn}
                  >
                    <RefreshCw size={15} className={submitting ? styles.spinIcon : ''} />
                    <span>
                      {submitting
                        ? 'Reenviando link...'
                        : resendCooldown > 0
                        ? `Reenviar link em ${resendCooldown}s...`
                        : 'Reenviar link de recuperação'}
                    </span>
                  </button>

                  {/* 4. CARD DE SUPORTE DIRETO VIA WHATSAPP ("AINDA NÃO CONSEGUIU?") */}
                  <div className={styles.whatsappSupportCard}>
                    <span className={styles.supportCardEyebrow}>AINDA NÃO CONSEGUIU?</span>
                    <p className={styles.supportCardText}>
                      Continua sem receber o e-mail ou teve qualquer dificuldade para recuperar sua conta? Fale diretamente com a nossa equipe:
                    </p>
                    <a
                      href={getWhatsAppRecoveryUrl()}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.whatsappSupportBtn}
                    >
                      <MessageCircle size={16} />
                      <span>PEDIR AJUDA NO WHATSAPP</span>
                    </a>
                    <Link to="/suporte" className={styles.supportSecondaryLink}>
                      Ir para a página de Suporte Oficial (/suporte)
                    </Link>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* =========================================================
              MODO 4: REDEFINIÇÃO NATIVA DE SENHA ('reset_confirm')
             ========================================================= */}
          {viewMode === 'reset_confirm' && (
            <motion.div
              key="reset_confirm"
              className={styles.recoveryWrapper}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <button
                type="button"
                onClick={handleBackToLogin}
                className={styles.backToLoginBtn}
              >
                <ArrowLeft size={14} />
                <span>VOLTAR PARA O LOGIN</span>
              </button>

              <header className={styles.recoveryHeader}>
                <h1 className={styles.recoveryTitle}>DEFINIR NOVA SENHA</h1>
                {verifiedEmail ? (
                  <p className={styles.recoverySubtitle}>
                    Criando uma nova senha de acesso para a conta{' '}
                    <strong className={styles.highlightEmail}>{verifiedEmail}</strong>.
                  </p>
                ) : (
                  <p className={styles.recoverySubtitle}>
                    Defina abaixo sua nova credencial de segurança para acessar a THR33.
                  </p>
                )}
              </header>

              {verifyingCode ? (
                <div className={styles.verifyingBox}>
                  <RefreshCw size={20} className={styles.spinIcon} />
                  <span>VALIDANDO LINK DE SEGURANÇA...</span>
                </div>
              ) : codeExpired ? (
                <div className={styles.expiredCodeContainer}>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setResetSent(false);
                      navigate('/login', { replace: true });
                      setViewMode('forgot');
                    }}
                    className={styles.submitBtn}
                  >
                    <span>SOLICITAR NOVO LINK DE RECUPERAÇÃO</span>
                    <ArrowRight size={15} />
                  </button>

                  <div className={styles.whatsappSupportCard}>
                    <span className={styles.supportCardEyebrow}>AINDA NÃO CONSEGUIU?</span>
                    <p className={styles.supportCardText}>
                      Continua sem receber o e-mail ou teve qualquer dificuldade para recuperar sua conta? Fale diretamente com a nossa equipe:
                    </p>
                    <a
                      href={getWhatsAppRecoveryUrl()}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.whatsappSupportBtn}
                    >
                      <MessageCircle size={16} />
                      <span>PEDIR AJUDA NO WHATSAPP</span>
                    </a>
                    <Link to="/suporte" className={styles.supportSecondaryLink}>
                      Ir para a página de Suporte Oficial (/suporte)
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleResetConfirmSubmit} className={styles.form}>
                  <div className={styles.inputGroup}>
                    <label htmlFor="new-password-input">NOVA SENHA *</label>
                    <div className={styles.passwordInputWrapper}>
                      <input
                        id="new-password-input"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo de 6 caracteres"
                        value={newPasswordData.password}
                        onChange={(e) =>
                          setNewPasswordData({ ...newPasswordData, password: e.target.value })
                        }
                        minLength={6}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={styles.togglePasswordBtn}
                        aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label htmlFor="confirm-new-password-input">CONFIRMAR NOVA SENHA *</label>
                    <div className={styles.passwordInputWrapper}>
                      <input
                        id="confirm-new-password-input"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Repita a nova senha"
                        value={newPasswordData.confirmPassword}
                        onChange={(e) =>
                          setNewPasswordData({
                            ...newPasswordData,
                            confirmPassword: e.target.value
                          })
                        }
                        minLength={6}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className={styles.togglePasswordBtn}
                        aria-label={showConfirmPassword ? 'Ocultar senha' : 'Ver senha'}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className={styles.passwordRulesList}>
                    <span
                      className={`${styles.ruleBadge} ${
                        newPasswordData.password.length >= 6 ? styles.ruleMet : ''
                      }`}
                    >
                      {newPasswordData.password.length >= 6 ? '✓' : '○'} Mínimo 6 caracteres
                    </span>
                    <span
                      className={`${styles.ruleBadge} ${
                        newPasswordData.password.length >= 6 &&
                        newPasswordData.password === newPasswordData.confirmPassword
                          ? styles.ruleMet
                          : ''
                      }`}
                    >
                      {newPasswordData.password.length >= 6 &&
                      newPasswordData.password === newPasswordData.confirmPassword
                        ? '✓'
                        : '○'}{' '}
                      Senhas coincidem
                    </span>
                  </div>

                  <button type="submit" disabled={submitting} className={styles.submitBtn}>
                    <KeyRound size={15} />
                    <span>
                      {submitting ? 'SALVANDO NOVA SENHA...' : 'SALVAR NOVA SENHA E ENTRAR'}
                    </span>
                  </button>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

export default Auth;
