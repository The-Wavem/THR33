import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  MapPin, 
  Package, 
  AlertTriangle, 
  HelpCircle, 
  Plus, 
  Trash2, 
  Check, 
  Star, 
  X, 
  Loader2, 
  LogOut,
  Edit3,
  ShieldAlert,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  KeyRound,
  Truck,
  CreditCard,
  Tag,
  Copy,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle as QuestionIcon,
  MessageSquareWarning,
  Send,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  maskCPF, 
  maskPhone, 
  maskCEP, 
  validateCPF, 
  validateEmail, 
  validatePhone,
  validatePasswordStrength 
} from '../../utils/validators';
import { fetchAddressByCep } from '../../services/viaCepService';
import styles from './Perfil.module.css';

// ETAPAS DO PEDIDO
const ORDER_STEPS = [
  { key: 'waiting_payment', label: 'Aguardando Pagamento' },
  { key: 'payment_approved', label: 'Pagamento Aprovado' },
  { key: 'preparing', label: 'Preparando Envio (Ateliê)' },
  { key: 'in_transit', label: 'Despachado / Em Trânsito' },
  { key: 'delivered', label: 'Entregue' }
];

export function Perfil({ defaultTab = 'pedidos' }) {
  const { user, logout, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState(defaultTab); // 'dados', 'enderecos', 'pedidos', 'seguranca'
  
  // DADOS DO USUÁRIO
  const [userData, setUserData] = useState({
    name: user?.name || user?.displayName || '',
    email: user?.email || '',
    cpf: user?.cpf || '',
    phone: user?.phone || ''
  });

  const [editFormData, setEditFormData] = useState({ ...userData });
  const [isEditingData, setIsEditingData] = useState(false);
  const [userErrors, setUserErrors] = useState({});
  const [saveSuccessFeedback, setSaveSuccessFeedback] = useState(false);

  // Sincroniza dinamicamente com o perfil carregado do Firebase Auth / Firestore
  useEffect(() => {
    if (user) {
      const updated = {
        name: user.name || user.displayName || '',
        email: user.email || '',
        cpf: user.cpf || '',
        phone: user.phone || ''
      };
      setUserData(updated);
      setEditFormData(updated);
    }
  }, [user]);

  // DADOS DE ACESSO (SENHA)
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSuccessFeedback, setPasswordSuccessFeedback] = useState(false);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // ENDEREÇOS DO USUÁRIO
  const [addresses, setAddresses] = useState([
    {
      id: 1,
      title: 'Casa',
      street: 'Rua Comendador Araújo',
      number: '333',
      complement: 'Apt 12',
      neighborhood: 'Batel',
      city: 'Curitiba',
      state: 'PR',
      cep: '80420-000',
      isDefault: true
    }
  ]);

  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [cepError, setCepError] = useState(null);

  const [newAddress, setNewAddress] = useState({
    title: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: 'Curitiba',
    state: 'PR',
    cep: ''
  });

  // HISTÓRICO DE PEDIDOS & AVALIAÇÕES
  const [orders, setOrders] = useState([
    {
      id: "THR33-9104",
      date: "12/08/2026",
      status: "Preparando Envio",
      statusCode: "preparing",
      trackingCode: "Aguardando postagem no Ateliê",
      paymentMethod: "Cartão de Crédito PagBank (em 2x de R$ 117,40)",
      coupon: { code: "FORTHEFEW", discount: 20.00 },
      subtotal: 239.90,
      shippingMethod: "SEDEX Expresso (1 a 2 dias úteis)",
      shippingCost: 14.90,
      total: 234.80,
      address: {
        name: "Usuário Ateliê",
        street: "Rua Comendador Araújo",
        number: "333",
        complement: "Apt 12",
        neighborhood: "Batel",
        city: "Curitiba",
        state: "PR",
        cep: "80420-000"
      },
      items: [
        { 
          id: "item-101",
          name: "Camiseta THR33 Boxy Logo", 
          size: "M", 
          price: 189.90, 
          image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop", 
          evaluated: false 
        }
      ]
    },
    {
      id: "THR33-8921",
      date: "10/08/2026",
      status: "Em trânsito",
      statusCode: "in_transit",
      trackingCode: "BR987654321PR",
      paymentMethod: "PIX Instantâneo PagBank (À Vista)",
      coupon: null,
      subtotal: 389.80,
      shippingMethod: "SEDEX Expresso",
      shippingCost: 14.90,
      total: 404.70,
      address: {
        name: "Usuário Ateliê",
        street: "Rua Comendador Araújo",
        number: "333",
        complement: "Apt 12",
        neighborhood: "Batel",
        city: "Curitiba",
        state: "PR",
        cep: "80420-000"
      },
      items: [
        { 
          id: "item-1",
          name: "Camiseta THR33 Boxy Logo", 
          size: "M", 
          price: 189.90, 
          image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop", 
          evaluated: true 
        },
        { 
          id: "item-2",
          name: "Camiseta For The Few Heavy", 
          size: "M", 
          price: 199.90, 
          image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=600&auto=format&fit=crop", 
          evaluated: false 
        }
      ]
    },
    {
      id: "THR33-8410",
      date: "25/07/2026",
      status: "Entregue",
      statusCode: "delivered",
      trackingCode: "BR123456789PR",
      paymentMethod: "Cartão de Crédito PagBank (em 3x de R$ 199,93)",
      coupon: { code: "ATELIE20", discount: 40.00 },
      subtotal: 599.80,
      shippingMethod: "PAC Standard (3 a 5 dias)",
      shippingCost: 0.00,
      total: 559.80,
      address: {
        name: "Usuário Ateliê",
        street: "Rua Comendador Araújo",
        number: "333",
        complement: "Apt 12",
        neighborhood: "Batel",
        city: "Curitiba",
        state: "PR",
        cep: "80420-000"
      },
      items: [
        { 
          id: "item-3",
          name: "Calça Cargo Streetwear", 
          size: "38", 
          price: 599.80, 
          image: "https://images.unsplash.com/photo-1517445312882-bc9910d016b7?q=80&w=600&auto=format&fit=crop", 
          evaluated: true 
        }
      ]
    }
  ]);

  // MODAIS
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [cancelingOrder, setCancelingOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('tamanho');
  const [cancelOtherText, setCancelOtherText] = useState('');
  
  const [reportingIssueOrder, setReportingIssueOrder] = useState(null);
  const [issueType, setIssueType] = useState('danificado');
  const [issueDescription, setIssueDescription] = useState('');
  const [copiedTracking, setCopiedTracking] = useState(false);

  // MODAL DE AVALIAÇÃO DE PRODUTO
  const [evaluatingItem, setEvaluatingItem] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // BLOQUEIO DO SCROLL DA PÁGINA (EIXO Y E RODA DO MOUSE) QUANDO QUALQUER MODAL ESTIVER ABERTO
  const isAnyModalOpen = Boolean(selectedOrderDetails || cancelingOrder || reportingIssueOrder || evaluatingItem);

  useEffect(() => {
    if (isAnyModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const preventBackgroundScroll = (e) => {
        const modalContainer = e.target.closest(`.${styles.orderDetailsModal}, .${styles.modalCard}`);
        if (modalContainer) {
          return;
        }
        e.preventDefault();
      };

      window.addEventListener('wheel', preventBackgroundScroll, { passive: false });
      window.addEventListener('touchmove', preventBackgroundScroll, { passive: false });

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('wheel', preventBackgroundScroll);
        window.removeEventListener('touchmove', preventBackgroundScroll);
      };
    }
  }, [isAnyModalOpen]);

  // -------------------------------------------------------------
  // HANDLERS: DADOS DO USUÁRIO & VALIDAÇÃO
  // -------------------------------------------------------------
  const handleStartEdit = () => {
    setEditFormData({ ...userData });
    setUserErrors({});
    setIsEditingData(true);
  };

  const handleCancelEdit = () => {
    setEditFormData({ ...userData });
    setUserErrors({});
    setIsEditingData(false);
  };

  const handleUserChange = (e) => {
    const { name, value } = e.target;
    let formatted = value;

    if (name === 'cpf') formatted = maskCPF(value);
    if (name === 'phone') formatted = maskPhone(value);

    setEditFormData(prev => ({ ...prev, [name]: formatted }));
    if (userErrors[name]) {
      setUserErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleUserSubmit = (e) => {
    e.preventDefault();
    const errors = {};

    if (!editFormData.name.trim() || editFormData.name.trim().length < 3) {
      errors.name = 'Nome deve ter no mínimo 3 caracteres.';
    }
    if (!validateEmail(editFormData.email)) {
      errors.email = 'Informe um e-mail válido no formato usuario@dominio.com.';
    }
    if (!validateCPF(editFormData.cpf)) {
      errors.cpf = 'CPF inválido. Verifique os números digitados.';
    }
    if (!validatePhone(editFormData.phone)) {
      errors.phone = 'Telefone inválido com DDD (10 ou 11 dígitos).';
    }

    if (Object.keys(errors).length > 0) {
      setUserErrors(errors);
      return;
    }

    setUserData({ ...editFormData });
    setUserErrors({});
    setIsEditingData(false);
    setSaveSuccessFeedback(true);
    setTimeout(() => setSaveSuccessFeedback(false), 3000);
  };

  // -------------------------------------------------------------
  // HANDLERS: DADOS DE ACESSO & ALTERAÇÃO DE SENHA
  // -------------------------------------------------------------
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    const errors = {};

    if (!passwordData.currentPassword.trim()) {
      errors.currentPassword = 'Por favor, informe sua senha atual para confirmar.';
    }

    const strength = validatePasswordStrength(passwordData.newPassword);
    if (!strength.isValid) {
      errors.newPassword = strength.message;
    } else if (passwordData.newPassword === passwordData.currentPassword) {
      errors.newPassword = 'A nova senha deve ser diferente da senha atual.';
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'A confirmação de senha não confere com a nova senha.';
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    // Validação com o AuthContext
    if (changePassword) {
      const res = changePassword(passwordData.currentPassword, passwordData.newPassword);
      if (!res.success) {
        setPasswordErrors({ currentPassword: res.error });
        return;
      }
    }

    setPasswordErrors({});
    setIsEditingPassword(false);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordSuccessFeedback(true);
    setTimeout(() => setPasswordSuccessFeedback(false), 3000);
  };

  // -------------------------------------------------------------
  // HANDLERS: ENDEREÇOS COM VIACEP
  // -------------------------------------------------------------
  const handleAddressInputChange = async (e) => {
    const { name, value } = e.target;
    let formatted = value;

    if (name === 'cep') {
      formatted = maskCEP(value);
      const clean = formatted.replace(/\D/g, '');
      if (clean.length === 8) {
        setIsSearchingCep(true);
        setCepError(null);
        const res = await fetchAddressByCep(clean);
        setIsSearchingCep(false);
        if (res.success) {
          setNewAddress(prev => ({
            ...prev,
            street: res.data.street || prev.street,
            neighborhood: res.data.neighborhood || prev.neighborhood,
            city: res.data.city || prev.city,
            state: res.data.state || prev.state,
            complement: res.data.complement || prev.complement
          }));
        } else {
          setCepError(res.error);
        }
      }
    }

    setNewAddress(prev => ({ ...prev, [name]: formatted }));
  };

  const handleAddAddress = (e) => {
    e.preventDefault();
    if (!newAddress.title || !newAddress.cep || !newAddress.street || !newAddress.number) {
      alert('Por favor, preencha os campos obrigatórios do endereço.');
      return;
    }

    setAddresses([
      ...addresses, 
      { 
        ...newAddress, 
        id: Date.now(), 
        isDefault: addresses.length === 0 
      }
    ]);
    setIsAddingAddress(false);
    setNewAddress({ title: '', street: '', number: '', complement: '', neighborhood: '', city: 'Curitiba', state: 'PR', cep: '' });
  };

  const handleDeleteAddress = (id) => {
    if (window.confirm('Deseja realmente excluir este endereço?')) {
      setAddresses(addresses.filter(a => a.id !== id));
    }
  };

  const handleSetDefaultAddress = (id) => {
    setAddresses(addresses.map(a => ({
      ...a,
      isDefault: a.id === id
    })));
  };

  // -------------------------------------------------------------
  // HANDLERS: AVALIAÇÃO DE PRODUTO
  // -------------------------------------------------------------
  const handleOpenReviewModal = (item, orderId) => {
    setEvaluatingItem({ ...item, orderId });
    setReviewRating(5);
    setReviewComment('');
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!evaluatingItem) return;

    setOrders(prevOrders => prevOrders.map(ord => {
      if (ord.id === evaluatingItem.orderId) {
        return {
          ...ord,
          items: ord.items.map(it => it.id === evaluatingItem.id ? { ...it, evaluated: true } : it)
        };
      }
      return ord;
    }));

    // Se estiver no modal de detalhes, atualiza também
    if (selectedOrderDetails && selectedOrderDetails.id === evaluatingItem.orderId) {
      setSelectedOrderDetails(prev => ({
        ...prev,
        items: prev.items.map(it => it.id === evaluatingItem.id ? { ...it, evaluated: true } : it)
      }));
    }

    setEvaluatingItem(null);
    alert('Obrigado pela sua avaliação! Seu feedback apoia o desenvolvimento da THR33.');
  };

  // -------------------------------------------------------------
  // HANDLERS: CANCELAMENTO DE PEDIDO (EM PREPARAÇÃO)
  // -------------------------------------------------------------
  const handleConfirmCancelOrder = (e) => {
    e.preventDefault();
    if (!cancelingOrder) return;

    setOrders(prev => prev.map(ord => {
      if (ord.id === cancelingOrder.id) {
        return {
          ...ord,
          status: 'Cancelado',
          statusCode: 'canceled'
        };
      }
      return ord;
    }));

    if (selectedOrderDetails && selectedOrderDetails.id === cancelingOrder.id) {
      setSelectedOrderDetails(prev => ({
        ...prev,
        status: 'Cancelado',
        statusCode: 'canceled'
      }));
    }

    const orderId = cancelingOrder.id;
    setCancelingOrder(null);
    alert(`Pedido #${orderId} cancelado com sucesso. O estorno de valores foi solicitado automaticamente junto ao PagBank.`);
  };

  // -------------------------------------------------------------
  // HANDLERS: PROBLEMAS COM O PEDIDO (SUPORTE)
  // -------------------------------------------------------------
  const handleSubmitIssue = (e) => {
    e.preventDefault();
    if (!reportingIssueOrder) return;

    const protocol = `SUP-${Math.floor(100000 + Math.random() * 900000)}`;
    const orderId = reportingIssueOrder.id;
    setReportingIssueOrder(null);
    setIssueDescription('');

    alert(`Solicitação registrada com sucesso!\n\nProtocolo: #${protocol}\nPedido: #${orderId}\n\nNossa equipe de pós-venda do Ateliê entrará em contato pelo seu e-mail (${userData.email}) em até 24 horas úteis.`);
  };

  const handleCopyTrackingCode = (code) => {
    if (!code || code.includes('Aguardando')) return;
    navigator.clipboard.writeText(code);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  // -------------------------------------------------------------
  // HANDLERS: DANGER ZONE
  // -------------------------------------------------------------
  const handleDeleteAccount = () => {
    const confirmation = window.prompt("TEM CERTEZA? Esta ação é permanente e irreversível.\n\nDigite 'EXCLUIR' para confirmar a exclusão da sua conta:");
    if (confirmation === 'EXCLUIR') {
      alert("Sua conta foi excluída com sucesso de nossos servidores.");
      if (logout) logout();
      window.location.href = '/';
    }
  };

  const firstName = userData.name.split(' ')[0] || 'Usuário';

  // HELPER PARA CALCULAR O ÍNDICE DA ETAPA ATUAL NA TIMELINE
  const getStepIndex = (code) => {
    switch (code) {
      case 'waiting_payment': return 0;
      case 'payment_approved': return 1;
      case 'preparing': return 2;
      case 'in_transit': return 3;
      case 'delivered': return 4;
      default: return -1;
    }
  };

  return (
    <main className={styles.container}>
      {/* HEADER LIMPO DE BOAS-VINDAS */}
      <header className={styles.welcomeHeader}>
        <h1 className={styles.title}>Bem vindo de volta, {firstName}</h1>
        
        <div className={styles.headerActions}>
          <Link to="/suporte" className={styles.helpBtn}>
            <HelpCircle size={16} />
            <span>CENTRAL DE AJUDA</span>
          </Link>
          <button type="button" onClick={logout} className={styles.logoutBtn} title="Sair da Conta">
            <LogOut size={15} />
            <span>SAIR</span>
          </button>
        </div>
      </header>

      <div className={styles.profileGrid}>
        {/* SIDEBAR DE NAVEGAÇÃO DAS ABAS */}
        <aside className={styles.tabsNav} aria-label="Navegação do Perfil">
          <button 
            type="button"
            className={`${styles.tabLink} ${activeTab === 'dados' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('dados')}
          >
            <User size={16} />
            <span>Meus Dados</span>
          </button>
          
          <button 
            type="button"
            className={`${styles.tabLink} ${activeTab === 'enderecos' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('enderecos')}
          >
            <MapPin size={16} />
            <span>Endereços</span>
          </button>
          
          <button 
            type="button"
            className={`${styles.tabLink} ${activeTab === 'pedidos' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('pedidos')}
          >
            <Package size={16} />
            <span>Meus Pedidos & Avaliações</span>
          </button>
          
          <button 
            type="button"
            className={`${styles.tabLink} ${styles.dangerTab} ${activeTab === 'seguranca' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('seguranca')}
          >
            <AlertTriangle size={16} />
            <span>Danger Zone</span>
          </button>
        </aside>

        {/* ÁREA DE CONTEÚDO DINÂMICO */}
        <section className={styles.tabContent}>
          {/* TAB 1: DADOS PESSOAIS */}
          {activeTab === 'dados' && (
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>DADOS PESSOAIS</h2>
                
                {saveSuccessFeedback && (
                  <span className={styles.successBadge}>
                    <Check size={14} /> Dados atualizados com sucesso!
                  </span>
                )}

                {!isEditingData && (
                  <button 
                    type="button" 
                    onClick={handleStartEdit} 
                    className={styles.editBtn}
                  >
                    <Edit3 size={14} />
                    <span>EDITAR DADOS</span>
                  </button>
                )}
              </div>

              <form onSubmit={handleUserSubmit} className={styles.formGrid}>
                <div className={styles.inputField}>
                  <label>Nome Completo *</label>
                  <input 
                    type="text" 
                    name="name"
                    value={isEditingData ? editFormData.name : userData.name} 
                    onChange={handleUserChange} 
                    disabled={!isEditingData}
                    className={`${!isEditingData ? styles.inputLocked : ''} ${userErrors.name ? styles.inputError : ''}`}
                    required 
                  />
                  {userErrors.name && (
                    <span className={styles.errorText}>
                      <AlertCircle size={12} /> {userErrors.name}
                    </span>
                  )}
                </div>

                <div className={styles.inputField}>
                  <label>E-mail *</label>
                  <input 
                    type="email" 
                    name="email"
                    value={isEditingData ? editFormData.email : userData.email} 
                    onChange={handleUserChange} 
                    disabled={!isEditingData}
                    className={`${!isEditingData ? styles.inputLocked : ''} ${userErrors.email ? styles.inputError : ''}`}
                    required 
                  />
                  {userErrors.email && (
                    <span className={styles.errorText}>
                      <AlertCircle size={12} /> {userErrors.email}
                    </span>
                  )}
                </div>

                <div className={styles.inputField}>
                  <label>CPF *</label>
                  <input 
                    type="text" 
                    name="cpf"
                    maxLength={14}
                    value={isEditingData ? editFormData.cpf : userData.cpf} 
                    onChange={handleUserChange} 
                    disabled={!isEditingData}
                    className={`${!isEditingData ? styles.inputLocked : ''} ${userErrors.cpf ? styles.inputError : ''}`}
                    required
                  />
                  {userErrors.cpf && (
                    <span className={styles.errorText}>
                      <AlertCircle size={12} /> {userErrors.cpf}
                    </span>
                  )}
                </div>

                <div className={styles.inputField}>
                  <label>Telefone / WhatsApp *</label>
                  <input 
                    type="text" 
                    name="phone"
                    maxLength={15}
                    value={isEditingData ? editFormData.phone : userData.phone} 
                    onChange={handleUserChange} 
                    disabled={!isEditingData}
                    className={`${!isEditingData ? styles.inputLocked : ''} ${userErrors.phone ? styles.inputError : ''}`}
                    required 
                  />
                  {userErrors.phone && (
                    <span className={styles.errorText}>
                      <AlertCircle size={12} /> {userErrors.phone}
                    </span>
                  )}
                </div>

                {isEditingData && (
                  <div className={styles.formActions}>
                    <button type="button" onClick={handleCancelEdit} className={styles.cancelBtn}>
                      CANCELAR
                    </button>
                    <button type="submit" className={styles.saveBtn}>
                      SALVAR ALTERAÇÕES
                    </button>
                  </div>
                )}
              </form>

              {/* CARD DE DADOS DE ACESSO (SENHA) */}
              <div className={styles.subPanel}>
                <div className={styles.panelHeader}>
                  <div className={styles.panelTitleGroup}>
                    <Lock size={16} />
                    <h3 className={styles.subPanelTitle}>DADOS DE ACESSO & SEGURANÇA</h3>
                  </div>

                  {passwordSuccessFeedback && (
                    <span className={styles.successBadge}>
                      <Check size={14} /> Senha alterada com sucesso!
                    </span>
                  )}

                  {!isEditingPassword && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsEditingPassword(true);
                        setPasswordErrors({});
                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      }} 
                      className={styles.editBtn}
                    >
                      <KeyRound size={14} />
                      <span>ALTERAR SENHA</span>
                    </button>
                  )}
                </div>

                {!isEditingPassword ? (
                  /* VISUAL BLOQUEADO DA SENHA */
                  <div className={styles.formGrid}>
                    <div className={styles.inputField}>
                      <label>Senha de Acesso</label>
                      <input 
                        type="text" 
                        value="••••••••••••" 
                        disabled 
                        className={styles.inputLocked} 
                      />
                    </div>
                    <div className={styles.inputField}>
                      <label>Proteção de Acesso</label>
                      <div className={styles.securityStatusBox}>
                        <ShieldCheck size={15} color="#4ade80" />
                        <span>Autenticação Criptografada Ativa</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* FORMULÁRIO DE ALTERAÇÃO DE SENHA */
                  <form onSubmit={handlePasswordSubmit} className={styles.passwordForm}>
                    <div className={styles.inputField}>
                      <label>Senha Atual *</label>
                      <div className={styles.passwordInputWrapper}>
                        <input 
                          type={showCurrentPass ? "text" : "password"} 
                          name="currentPassword"
                          placeholder="Digite sua senha atual para confirmar"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          className={passwordErrors.currentPassword ? styles.inputError : ''}
                          required 
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowCurrentPass(!showCurrentPass)}
                          className={styles.togglePasswordBtn}
                          aria-label={showCurrentPass ? "Ocultar senha" : "Ver senha"}
                        >
                          {showCurrentPass ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {passwordErrors.currentPassword && (
                        <span className={styles.errorText}>
                          <AlertCircle size={12} /> {passwordErrors.currentPassword}
                        </span>
                      )}
                    </div>

                    <div className={styles.formGrid}>
                      <div className={styles.inputField}>
                        <label>Nova Senha *</label>
                        <div className={styles.passwordInputWrapper}>
                          <input 
                            type={showNewPass ? "text" : "password"} 
                            name="newPassword"
                            placeholder="Mínimo 8 caracteres, maiúscula e número"
                            value={passwordData.newPassword}
                            onChange={handlePasswordChange}
                            className={passwordErrors.newPassword ? styles.inputError : ''}
                            required 
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowNewPass(!showNewPass)}
                            className={styles.togglePasswordBtn}
                            aria-label={showNewPass ? "Ocultar senha" : "Ver senha"}
                          >
                            {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                        {passwordErrors.newPassword && (
                          <span className={styles.errorText}>
                            <AlertCircle size={12} /> {passwordErrors.newPassword}
                          </span>
                        )}

                        {/* REQUISITOS VISUAIS DE SENHA */}
                        <div className={styles.passwordRulesList}>
                          <span className={`${styles.ruleBadge} ${passwordData.newPassword.length >= 8 ? styles.ruleMet : ''}`}>
                            {passwordData.newPassword.length >= 8 ? '✓' : '○'} 8+ caracteres
                          </span>
                          <span className={`${styles.ruleBadge} ${/[A-Z]/.test(passwordData.newPassword) ? styles.ruleMet : ''}`}>
                            {/[A-Z]/.test(passwordData.newPassword) ? '✓' : '○'} 1 Letra maiúscula (A-Z)
                          </span>
                          <span className={`${styles.ruleBadge} ${/[0-9]/.test(passwordData.newPassword) ? styles.ruleMet : ''}`}>
                            {/[0-9]/.test(passwordData.newPassword) ? '✓' : '○'} 1 Número (0-9)
                          </span>
                        </div>
                      </div>

                      <div className={styles.inputField}>
                        <label>Confirmar Nova Senha *</label>
                        <div className={styles.passwordInputWrapper}>
                          <input 
                            type={showConfirmPass ? "text" : "password"} 
                            name="confirmPassword"
                            placeholder="Repita a nova senha"
                            value={passwordData.confirmPassword}
                            onChange={handlePasswordChange}
                            className={passwordErrors.confirmPassword ? styles.inputError : ''}
                            required 
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowConfirmPass(!showConfirmPass)}
                            className={styles.togglePasswordBtn}
                            aria-label={showConfirmPass ? "Ocultar senha" : "Ver senha"}
                          >
                            {showConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                        {passwordErrors.confirmPassword && (
                          <span className={styles.errorText}>
                            <AlertCircle size={12} /> {passwordErrors.confirmPassword}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={styles.formActionsBetween}>
                      <button 
                        type="button" 
                        onClick={() => {
                          alert(`Enviamos as instruções de redefinição de senha para o e-mail: ${userData.email}`);
                        }}
                        className={styles.forgotPasswordLink}
                      >
                        Esqueceu sua senha atual? Redefinir por e-mail
                      </button>

                      <div className={styles.btnGroup}>
                        <button 
                          type="button" 
                          onClick={() => {
                            setIsEditingPassword(false);
                            setPasswordErrors({});
                          }} 
                          className={styles.cancelBtn}
                        >
                          CANCELAR
                        </button>
                        <button type="submit" className={styles.saveBtn}>
                          SALVAR NOVA SENHA
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ENDEREÇOS */}
          {activeTab === 'enderecos' && (
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>MEUS ENDEREÇOS DE ENTREGA</h2>
                <button 
                  type="button"
                  onClick={() => setIsAddingAddress(!isAddingAddress)} 
                  className={styles.addBtn}
                >
                  <Plus size={14} />
                  <span>{isAddingAddress ? 'CANCELAR' : 'NOVO ENDEREÇO'}</span>
                </button>
              </div>

              {isAddingAddress && (
                <form onSubmit={handleAddAddress} className={styles.addressForm}>
                  <h3 className={styles.formSectionTitle}>CADASTRAR NOVO ENDEREÇO</h3>
                  
                  <div className={styles.inputField}>
                    <label>Identificação do Endereço (Ex: Casa, Trabalho, Estúdio) *</label>
                    <input 
                      type="text" 
                      name="title"
                      placeholder="Ex: Casa"
                      value={newAddress.title} 
                      onChange={handleAddressInputChange} 
                      required 
                    />
                  </div>

                  <div className={styles.inputRow}>
                    <div className={styles.inputField}>
                      <label>CEP *</label>
                      <div className={styles.cepSearchWrapper}>
                        <input 
                          type="text" 
                          name="cep"
                          placeholder="00000-000"
                          maxLength={9}
                          value={newAddress.cep} 
                          onChange={handleAddressInputChange} 
                          required 
                        />
                        {isSearchingCep && <Loader2 size={16} className={styles.spinner} />}
                      </div>
                      {cepError && <span className={styles.errorText}>{cepError}</span>}
                    </div>

                    <div className={styles.inputField}>
                      <label>Rua / Logradouro *</label>
                      <input 
                        type="text" 
                        name="street"
                        placeholder="Rua / Avenida" 
                        value={newAddress.street} 
                        onChange={handleAddressInputChange} 
                        required 
                      />
                    </div>
                  </div>

                  <div className={styles.inputRowTriple}>
                    <div className={styles.inputField}>
                      <label>Número *</label>
                      <input 
                        type="text" 
                        name="number"
                        placeholder="123" 
                        value={newAddress.number} 
                        onChange={handleAddressInputChange} 
                        required 
                      />
                    </div>

                    <div className={styles.inputField}>
                      <label>Complemento</label>
                      <input 
                        type="text" 
                        name="complement"
                        placeholder="Apt, Bloco" 
                        value={newAddress.complement} 
                        onChange={handleAddressInputChange} 
                      />
                    </div>

                    <div className={styles.inputField}>
                      <label>Bairro *</label>
                      <input 
                        type="text" 
                        name="neighborhood"
                        placeholder="Bairro" 
                        value={newAddress.neighborhood} 
                        onChange={handleAddressInputChange} 
                        required 
                      />
                    </div>
                  </div>

                  <div className={styles.inputRow}>
                    <div className={styles.inputField}>
                      <label>Cidade *</label>
                      <input 
                        type="text" 
                        name="city"
                        value={newAddress.city} 
                        onChange={handleAddressInputChange} 
                        required 
                      />
                    </div>

                    <div className={styles.inputField}>
                      <label>UF *</label>
                      <input 
                        type="text" 
                        name="state"
                        maxLength={2}
                        value={newAddress.state} 
                        onChange={handleAddressInputChange} 
                        required 
                      />
                    </div>
                  </div>

                  <button type="submit" className={styles.saveBtn}>CADASTRAR ENDEREÇO</button>
                </form>
              )}

              <div className={styles.addressList}>
                {addresses.map((addr) => (
                  <div key={addr.id} className={`${styles.addressCard} ${addr.isDefault ? styles.defaultCard : ''}`}>
                    <div className={styles.addrHeader}>
                      <strong>{addr.title.toUpperCase()}</strong>
                      {addr.isDefault ? (
                        <span className={styles.defaultBadge}>PADRÃO</span>
                      ) : (
                        <button 
                          type="button" 
                          onClick={() => handleSetDefaultAddress(addr.id)} 
                          className={styles.setDefaultLink}
                        >
                          Definir como padrão
                        </button>
                      )}
                    </div>
                    <p className={styles.addrText}>{addr.street}, {addr.number} {addr.complement && `• ${addr.complement}`}</p>
                    <p className={styles.addrText}>{addr.neighborhood} — {addr.city}/{addr.state} | CEP: {addr.cep}</p>
                    
                    <div className={styles.cardActions}>
                      <button 
                        type="button"
                        onClick={() => handleDeleteAddress(addr.id)} 
                        className={styles.deleteLink}
                      >
                        <Trash2 size={13} />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PEDIDOS & AVALIAÇÕES */}
          {activeTab === 'pedidos' && (
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>HISTÓRICO DE PEDIDOS ({orders.length})</h2>
              </div>
              
              <div className={styles.ordersList}>
                {orders.map((order) => {
                  const isDelivered = order.statusCode === 'delivered';
                  const isPreparing = order.statusCode === 'preparing' || order.statusCode === 'waiting_payment';
                  const isCanceled = order.statusCode === 'canceled';

                  return (
                    <article key={order.id} className={styles.orderCard}>
                      <header className={styles.orderMeta}>
                        <div>
                          <span className={styles.orderId}>PEDIDO #{order.id}</span>
                          <span className={styles.orderDate}>Realizado em {order.date}</span>
                        </div>
                        
                        <div className={styles.statusBox}>
                          <span className={`
                            ${styles.statusTag} 
                            ${isDelivered ? styles.statusDelivered : ''}
                            ${isCanceled ? styles.statusCanceled : ''}
                          `}>
                            {order.status.toUpperCase()}
                          </span>
                          <span className={styles.tracking}>
                            Rastreio: <strong>{order.trackingCode}</strong>
                          </span>
                        </div>
                      </header>

                      {/* ITENS DO PEDIDO */}
                      <div className={styles.orderItems}>
                        {order.items.map((item) => (
                          <div key={item.id} className={styles.orderItemRow}>
                            <img src={item.image} alt={item.name} className={styles.itemThumb} />
                            <div className={styles.itemInfo}>
                              <strong className={styles.itemTitle}>{item.name}</strong>
                              <span className={styles.itemMetaText}>Tamanho: {item.size} | R$ {item.price.toFixed(2)}</span>
                            </div>
                            
                            <button 
                              type="button"
                              className={`${styles.reviewBtn} ${item.evaluated ? styles.evaluatedBtn : ''}`}
                              onClick={() => !item.evaluated && handleOpenReviewModal(item, order.id)}
                              disabled={item.evaluated || isCanceled}
                            >
                              {item.evaluated ? (
                                <>
                                  <Check size={12} />
                                  <span>AVALIADO</span>
                                </>
                              ) : (
                                <>
                                  <Star size={12} />
                                  <span>AVALIAR PRODUTO</span>
                                </>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* FOOTER DO CARD COM BOTÃO DE VER DETALHES */}
                      <footer className={styles.orderFooter}>
                        <div className={styles.orderFooterLeft}>
                          <span>Total do Pedido:</span>
                          <strong className={styles.orderTotalValue}>R$ {order.total.toFixed(2)}</strong>
                        </div>

                        <div className={styles.orderFooterActions}>
                          <button 
                            type="button" 
                            onClick={() => setSelectedOrderDetails(order)} 
                            className={styles.viewDetailsBtn}
                          >
                            <Eye size={14} />
                            <span>VER DETALHES DO PEDIDO</span>
                          </button>
                        </div>
                      </footer>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: DANGER ZONE */}
          {activeTab === 'seguranca' && (
            <div className={styles.panel}>
              <h2 className={`${styles.panelTitle} ${styles.dangerText}`}>DANGER ZONE</h2>
              <p className={styles.dangerDesc}>
                A exclusão da conta removerá permanentemente seu passaporte de acesso, histórico de compras, endereços e preferências da plataforma THR33.
              </p>
              
              <div className={styles.dangerBox}>
                <div className={styles.dangerBoxInfo}>
                  <div className={styles.dangerBoxTitle}>
                    <ShieldAlert size={18} color="#ef4444" />
                    <strong>Excluir Minha Conta Permanente</strong>
                  </div>
                  <p>Todos os seus dados serão apagados imediatamente de nossos servidores com total conformidade à LGPD.</p>
                </div>
                <button type="button" onClick={handleDeleteAccount} className={styles.deleteAccountBtn}>
                  EXCLUIR CONTA
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ============================================================
          MODAL 1: DETALHES COMPLETOS DO PEDIDO (COM TIMELINE & AÇÕES)
          ============================================================ */}
      <AnimatePresence>
        {selectedOrderDetails && (
          <div className={styles.modalBackdrop} onClick={() => setSelectedOrderDetails(null)}>
            <motion.div 
              className={styles.orderDetailsModal}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25 }}
            >
              <header className={styles.modalHeader}>
                <div className={styles.modalTitleGroup}>
                  <span className={styles.modalSubTag}>DETALHES DO PEDIDO</span>
                  <h3 className={styles.modalOrderTitle}>PEDIDO #{selectedOrderDetails.id}</h3>
                  <span className={styles.modalDate}>Realizado em {selectedOrderDetails.date}</span>
                </div>

                <button 
                  type="button" 
                  onClick={() => setSelectedOrderDetails(null)} 
                  className={styles.closeModalBtn}
                >
                  <X size={20} />
                </button>
              </header>

              {/* TIMELINE VISUAL DE PROGRESSO DO ENVIO */}
              {selectedOrderDetails.statusCode !== 'canceled' ? (
                <div className={styles.timelineSection}>
                  <span className={styles.sectionLabel}>STATUS & RASTREAMENTO DO ENVIO:</span>
                  
                  <div className={styles.timelineStepper}>
                    {ORDER_STEPS.map((step, idx) => {
                      const currentIdx = getStepIndex(selectedOrderDetails.statusCode);
                      const isCompleted = idx < currentIdx;
                      const isCurrent = idx === currentIdx;

                      return (
                        <div key={step.key} className={styles.timelineStepItem}>
                          <div className={`
                            ${styles.timelineDot} 
                            ${isCompleted ? styles.dotCompleted : ''} 
                            ${isCurrent ? styles.dotCurrent : ''}
                          `}>
                            {isCompleted ? <Check size={12} /> : idx + 1}
                          </div>
                          <span className={`${styles.timelineStepLabel} ${isCurrent ? styles.activeTimelineLabel : ''}`}>
                            {step.label}
                          </span>
                          {idx < ORDER_STEPS.length - 1 && (
                            <div className={`${styles.timelineConnector} ${idx < currentIdx ? styles.connectorActive : ''}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* CÓDIGO DE RASTREIO */}
                  <div className={styles.trackingInfoCard}>
                    <Truck size={16} />
                    <div className={styles.trackingDetails}>
                      <span>Código de Rastreamento (Correios):</span>
                      <strong>{selectedOrderDetails.trackingCode}</strong>
                    </div>
                    {selectedOrderDetails.trackingCode && !selectedOrderDetails.trackingCode.includes('Aguardando') && (
                      <button 
                        type="button" 
                        onClick={() => handleCopyTrackingCode(selectedOrderDetails.trackingCode)}
                        className={styles.copyTrackingBtn}
                      >
                        {copiedTracking ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedTracking ? 'COPIADO!' : 'COPIAR'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className={styles.canceledNoticeBox}>
                  <XCircle size={20} color="#ef4444" />
                  <div>
                    <strong>PEDIDO CANCELADO</strong>
                    <p>Este pedido foi cancelado e o reembolso solicitado junto ao PagBank.</p>
                  </div>
                </div>
              )}

              {/* LISTAGEM DOS ITENS */}
              <div className={styles.modalItemsSection}>
                <span className={styles.sectionLabel}>ITENS INCLUSOS ({selectedOrderDetails.items.length}):</span>
                <div className={styles.modalItemsList}>
                  {selectedOrderDetails.items.map((item) => (
                    <div key={item.id} className={styles.modalItemRow}>
                      <img src={item.image} alt={item.name} />
                      <div className={styles.modalItemInfo}>
                        <strong>{item.name}</strong>
                        <span>Tamanho: <strong>{item.size}</strong> • R$ {item.price.toFixed(2)}</span>
                      </div>
                      
                      <button 
                        type="button"
                        className={`${styles.reviewBtn} ${item.evaluated ? styles.evaluatedBtn : ''}`}
                        onClick={() => !item.evaluated && handleOpenReviewModal(item, selectedOrderDetails.id)}
                        disabled={item.evaluated || selectedOrderDetails.statusCode === 'canceled'}
                      >
                        {item.evaluated ? (
                          <>
                            <Check size={12} />
                            <span>AVALIADO</span>
                          </>
                        ) : (
                          <>
                            <Star size={12} />
                            <span>AVALIAR</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* GRADE COM ENDEREÇO DE ENTREGA + RESUMO FINANCEIRO */}
              <div className={styles.detailsTwoCols}>
                {/* ENDEREÇO DE ENVIO */}
                <div className={styles.detailsBlock}>
                  <div className={styles.blockTitleRow}>
                    <MapPin size={15} />
                    <strong>ENDEREÇO DE ENTREGA</strong>
                  </div>
                  <p className={styles.blockText}>
                    <strong>{selectedOrderDetails.address.name}</strong><br />
                    {selectedOrderDetails.address.street}, {selectedOrderDetails.address.number} {selectedOrderDetails.address.complement && `• ${selectedOrderDetails.address.complement}`}<br />
                    {selectedOrderDetails.address.neighborhood} — {selectedOrderDetails.address.city}/{selectedOrderDetails.address.state}<br />
                    CEP: {selectedOrderDetails.address.cep}
                  </p>
                  <span className={styles.shippingMethodBadge}>
                    <Truck size={13} /> {selectedOrderDetails.shippingMethod}
                  </span>
                </div>

                {/* PAGAMENTO E VALORES */}
                <div className={styles.detailsBlock}>
                  <div className={styles.blockTitleRow}>
                    <CreditCard size={15} />
                    <strong>PAGAMENTO & VALORES</strong>
                  </div>
                  
                  <div className={styles.financialRows}>
                    <div className={styles.finRow}>
                      <span>Forma:</span>
                      <strong>{selectedOrderDetails.paymentMethod}</strong>
                    </div>

                    <div className={styles.finRow}>
                      <span>Subtotal:</span>
                      <span>R$ {selectedOrderDetails.subtotal.toFixed(2)}</span>
                    </div>

                    {selectedOrderDetails.coupon && (
                      <div className={`${styles.finRow} ${styles.finDiscount}`}>
                        <span>Cupom ({selectedOrderDetails.coupon.code}):</span>
                        <span>- R$ {selectedOrderDetails.coupon.discount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className={styles.finRow}>
                      <span>Frete:</span>
                      <span>{selectedOrderDetails.shippingCost === 0 ? 'GRÁTIS' : `R$ ${selectedOrderDetails.shippingCost.toFixed(2)}`}</span>
                    </div>

                    <div className={`${styles.finRow} ${styles.finTotal}`}>
                      <span>TOTAL PAGO:</span>
                      <strong>R$ {selectedOrderDetails.total.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* SEÇÃO DE CUIDADOS & SUPORTE DO CLIENTE */}
              <footer className={styles.modalFooterActions}>
                {/* BOTÃO CANCELAR: DISPONÍVEL SE ESTIVER EM PREPARAÇÃO */}
                {(selectedOrderDetails.statusCode === 'preparing' || selectedOrderDetails.statusCode === 'waiting_payment') && (
                  <div className={styles.careActionBox}>
                    <div className={styles.careActionText}>
                      <Clock size={15} color="#fbbf24" />
                      <span>Pedido em separação. Você pode solicitar o cancelamento antes do despacho.</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setCancelingOrder(selectedOrderDetails)} 
                      className={styles.cancelOrderBtn}
                    >
                      <XCircle size={14} />
                      <span>CANCELAR PEDIDO</span>
                    </button>
                  </div>
                )}

                {/* BOTÃO PROBLEMAS COM O PEDIDO: DISPONÍVEL SE EM TRÂNSITO OU ENTREGUE */}
                {(selectedOrderDetails.statusCode === 'in_transit' || selectedOrderDetails.statusCode === 'delivered') && (
                  <div className={styles.careActionBox}>
                    <div className={styles.careActionText}>
                      <MessageSquareWarning size={15} color="#4ade80" />
                      <span>Precisa de ajuda, troca, devolução ou relatar algum imprevisto com a entrega?</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setReportingIssueOrder(selectedOrderDetails)} 
                      className={styles.reportIssueBtn}
                    >
                      <QuestionIcon size={14} />
                      <span>PROBLEMAS COM O PEDIDO</span>
                    </button>
                  </div>
                )}
              </footer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================
          MODAL 2: CANCELAMENTO DO PEDIDO
          ============================================================ */}
      <AnimatePresence>
        {cancelingOrder && (
          <div className={styles.modalBackdrop} onClick={() => setCancelingOrder(null)}>
            <motion.div 
              className={styles.modalCard}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>CANCELAR PEDIDO #{cancelingOrder.id}</h3>
                <button type="button" onClick={() => setCancelingOrder(null)} className={styles.closeModalBtn}>
                  <X size={18} />
                </button>
              </div>

              <p className={styles.modalDesc}>
                Tem certeza que deseja cancelar este pedido? Se aprovado, o estorno do valor de <strong>R$ {cancelingOrder.total.toFixed(2)}</strong> será processado automaticamente pelo PagBank.
              </p>

              <form onSubmit={handleConfirmCancelOrder} className={styles.reviewForm}>
                <div className={styles.inputField}>
                  <label>Qual o motivo do cancelamento?</label>
                  <select 
                    value={cancelReason} 
                    onChange={(e) => setCancelReason(e.target.value)}
                    className={styles.selectInput}
                  >
                    <option value="tamanho">Comprei o tamanho/cor errado</option>
                    <option value="arrependimento">Mudei de ideia</option>
                    <option value="endereco">Endereço de entrega incorreto</option>
                    <option value="frete">Prazo de frete não atende</option>
                    <option value="outro">Outro motivo</option>
                  </select>
                </div>

                {cancelReason === 'outro' && (
                  <div className={styles.inputField}>
                    <label>Especifique o motivo:</label>
                    <input 
                      type="text" 
                      placeholder="Descreva brevemente..." 
                      value={cancelOtherText}
                      onChange={(e) => setCancelOtherText(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className={styles.modalActions}>
                  <button type="button" onClick={() => setCancelingOrder(null)} className={styles.cancelBtn}>
                    Manter Pedido
                  </button>
                  <button type="submit" className={styles.confirmCancelBtn}>
                    CONFIRMAR CANCELAMENTO
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================
          MODAL 3: PROBLEMAS COM O PEDIDO (SUPORTE / TROCAS)
          ============================================================ */}
      <AnimatePresence>
        {reportingIssueOrder && (
          <div className={styles.modalBackdrop} onClick={() => setReportingIssueOrder(null)}>
            <motion.div 
              className={styles.modalCard}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>AJUDA COM O PEDIDO #{reportingIssueOrder.id}</h3>
                <button type="button" onClick={() => setReportingIssueOrder(null)} className={styles.closeModalBtn}>
                  <X size={18} />
                </button>
              </div>

              <p className={styles.modalDesc}>
                Conte-nos o que aconteceu. Nossa equipe de controle de qualidade e suporte do Ateliê atenderá sua solicitação prioritariamente.
              </p>

              <form onSubmit={handleSubmitIssue} className={styles.reviewForm}>
                <div className={styles.inputField}>
                  <label>Qual situação ocorreu com o pedido?</label>
                  <select 
                    value={issueType} 
                    onChange={(e) => setIssueType(e.target.value)}
                    className={styles.selectInput}
                  >
                    <option value="danificado">📦 Produto danificado ou com defeito de confecção</option>
                    <option value="nao_chegou">❌ Pedido não chegou / Extravio no transporte</option>
                    <option value="errado">🔄 Tamanho ou item entregue incorreto</option>
                    <option value="indevida">⚠️ Cobrança indevida ou problema no pagamento</option>
                    <option value="outro">💬 Outro tipo de solicitação</option>
                  </select>
                </div>

                <div className={styles.inputField}>
                  <label>Descreva detalhes da sua solicitação *</label>
                  <textarea 
                    rows={4}
                    placeholder="Explique o que aconteceu para que possamos agilizar sua troca, reenvio ou suporte..."
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.modalActions}>
                  <button type="button" onClick={() => setReportingIssueOrder(null)} className={styles.cancelBtn}>
                    Voltar
                  </button>
                  <button type="submit" className={styles.saveBtn}>
                    <Send size={13} />
                    <span>ENVIAR AO SUPORTE</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================
          MODAL 4: AVALIAÇÃO DE PRODUTO
          ============================================================ */}
      <AnimatePresence>
        {evaluatingItem && (
          <div className={styles.modalBackdrop} onClick={() => setEvaluatingItem(null)}>
            <motion.div 
              className={styles.modalCard}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>AVALIAR PRODUTO</h3>
                <button type="button" onClick={() => setEvaluatingItem(null)} className={styles.closeModalBtn}>
                  <X size={18} />
                </button>
              </div>

              <div className={styles.modalItemPreview}>
                <img src={evaluatingItem.image} alt={evaluatingItem.name} />
                <div>
                  <strong>{evaluatingItem.name}</strong>
                  <span>Tamanho: {evaluatingItem.size}</span>
                </div>
              </div>

              <form onSubmit={handleSubmitReview} className={styles.reviewForm}>
                <div className={styles.ratingPicker}>
                  <label>Sua Nota (1 a 5 estrelas):</label>
                  <div className={styles.starsSelectRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className={styles.starBtn}
                      >
                        <Star 
                          size={24} 
                          fill={star <= reviewRating ? "#ffffff" : "none"} 
                          color={star <= reviewRating ? "#ffffff" : "#525252"} 
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.inputField}>
                  <label>Seu Comentário sobre o caimento, tecido e acabamento:</label>
                  <textarea 
                    rows={4}
                    placeholder="Ex: O tecido heavyweight é impressionante e a modelagem Boxy veste perfeitamente..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.modalActions}>
                  <button type="button" onClick={() => setEvaluatingItem(null)} className={styles.cancelBtn}>
                    Cancelar
                  </button>
                  <button type="submit" className={styles.saveBtn}>
                    PUBLICAR AVALIAÇÃO
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default Perfil;
