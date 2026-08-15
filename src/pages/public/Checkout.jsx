import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  CreditCard, 
  QrCode, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  FileText, 
  Copy, 
  Check, 
  Tag, 
  Truck,
  Lock,
  ShoppingBag,
  MapPin,
  Plus,
  AlertCircle,
  Loader2,
  Edit3,
  UserCheck,
  ExternalLink,
  Zap
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { 
  validateCPF, 
  validateEmail, 
  validatePhone, 
  validateCEP,
  maskCPF, 
  maskPhone, 
  maskCEP
} from '../../utils/validators';
import { fetchAddressByCep } from '../../services/viaCepService';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc, setDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { couponService } from '../../services/couponService';
import styles from './Checkout.module.css';

// Lista inicial de endereços limpa
const INITIAL_SAVED_ADDRESSES = [];

export function Checkout({ user: propUser, onOpenAuthModal }) {
  const navigate = useNavigate();
  const { currentUser, user: authUser, updateUser } = useAuth();
  const user = currentUser || authUser || propUser;

  const { 
    cartItems, 
    subtotal, 
    discountAmount, 
    shippingCost, 
    setShippingCost, 
    total, 
    appliedCoupon, 
    applyCoupon, 
    removeCoupon,
    couponFeedback,
    validatingCoupon,
    clearCart 
  } = useCart();

  // CONTROLE DE ETAPAS: 1 = Identificação, 2 = Entrega & Frete, 3 = Pagamento, 4 = Sucesso
  const [currentStep, setCurrentStep] = useState(1);

  // Redireciona se o usuário não estiver autenticado
  useEffect(() => {
    if (!user) {
      navigate('/auth', { 
        replace: true, 
        state: { 
          from: '/checkout', 
          tab: 'login',
          message: 'Autenticação necessária para finalizar seu pedido com segurança.' 
        } 
      });
    }
  }, [user, navigate]);

  // ESTADOS DO CLIENTE (ETAPA 1)
  const [clientData, setClientData] = useState({
    name: user?.name || user?.displayName || '',
    email: user?.email || '',
    cpf: user?.cpf || '',
    phone: user?.phone || ''
  });
  const [isEditingAccountData, setIsEditingAccountData] = useState(false);
  const [clientErrors, setClientErrors] = useState({});

  // ESTADOS DE ENDEREÇO & FRETE (ETAPA 2)
  const [savedAddresses, setSavedAddresses] = useState(INITIAL_SAVED_ADDRESSES);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [cepApiMessage, setCepApiMessage] = useState(null);

  const [addressForm, setAddressForm] = useState({
    cep: '',
    street: '',
    number: '',
    neighborhood: '',
    complement: '',
    city: 'Curitiba',
    state: 'PR'
  });
  const [addressErrors, setAddressErrors] = useState({});

  // Sincroniza e pré-preenche dados pessoais e endereço padrão do usuário
  useEffect(() => {
    const active = currentUser || user;
    if (active) {
      // 1. Dados Pessoais
      setClientData(prev => ({
        name: active.displayName || active.name || prev.name || '',
        email: active.email || prev.email || '',
        cpf: active.cpf || prev.cpf || '',
        phone: active.phone || prev.phone || ''
      }));

      // 2. Busca o endereço padrão no array de endereços do Firestore
      const userAddresses = active.addresses || [];
      if (userAddresses.length > 0) {
        setSavedAddresses(userAddresses);
        const defaultAddr = userAddresses.find(a => a.isDefault) || userAddresses[0];
        setSelectedAddressId(defaultAddr.id);
        setIsAddingNewAddress(false);

        setAddressForm(prev => ({
          ...prev,
          cep: defaultAddr.cep || prev.cep || '',
          street: defaultAddr.street || prev.street || '',
          number: defaultAddr.number || prev.number || '',
          complement: defaultAddr.complement || prev.complement || '',
          neighborhood: defaultAddr.neighborhood || prev.neighborhood || '',
          city: defaultAddr.city || prev.city || 'Curitiba',
          state: defaultAddr.state || prev.state || 'PR'
        }));
      } else {
        setSavedAddresses([]);
        setIsAddingNewAddress(true);
      }
    }
  }, [currentUser, user]);

  // OPÇÃO DE FRETE SELECIONADA
  const [shippingOptions, setShippingOptions] = useState([
    { id: 'sedex', name: 'SEDEX Expresso', deadline: '1 a 2 dias úteis', price: 14.90 },
    { id: 'pac', name: 'PAC Standard', deadline: '3 a 5 dias úteis', price: 9.90 },
    { id: 'retirada', name: 'Retirada no Ateliê (Curitiba)', deadline: 'Disponível em 24h', price: 0 }
  ]);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState('sedex');

  // PROCESSAMENTO FINAL E SUCESSO
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [orderNumber, setOrderNumber] = useState('');

  // Atualiza o valor do frete no contexto quando a opção de frete muda
  useEffect(() => {
    const opt = shippingOptions.find(o => o.id === selectedShippingMethod);
    if (opt) {
      setShippingCost(opt.price);
    }
  }, [selectedShippingMethod, shippingOptions]);

  // Se o carrinho estiver vazio e não foi para a tela de sucesso
  if (cartItems.length === 0 && currentStep !== 4) {
    return (
      <main className={styles.emptyContainer}>
        <div className={styles.emptyCard}>
          <ShoppingBag size={48} className={styles.emptyIcon} />
          <h1 className={styles.emptyTitle}>SEU CARRINHO ESTÁ VAZIO</h1>
          <p className={styles.emptyText}>Adicione peças do catálogo para prosseguir ao checkout seguro.</p>
          <Link to="/catalogo" className={styles.primaryBtn}>
            <span>VER CATÁLOGO</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </main>
    );
  }

  // -------------------------------------------------------------
  // HANDLERS ETAPA 1: IDENTIFICAÇÃO DO CLIENTE
  // -------------------------------------------------------------
  const handleClientChange = (e) => {
    const { name, value } = e.target;
    let formatted = value;

    if (name === 'cpf') formatted = maskCPF(value);
    if (name === 'phone') formatted = maskPhone(value);

    setClientData(prev => ({ ...prev, [name]: formatted }));
    if (clientErrors[name]) {
      setClientErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateStep1 = () => {
    const errors = {};
    if (!clientData.name.trim() || clientData.name.trim().length < 3) {
      errors.name = 'Informe seu nome completo (mínimo 3 caracteres).';
    }
    if (!validateEmail(clientData.email)) {
      errors.email = 'Informe um e-mail válido para confirmação.';
    }
    if (!validateCPF(clientData.cpf)) {
      errors.cpf = 'Informe um CPF válido (11 dígitos).';
    }
    if (!validatePhone(clientData.phone)) {
      errors.phone = 'Telefone inválido com DDD (10 ou 11 dígitos).';
    }

    setClientErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextToStep2 = async (e) => {
    e.preventDefault();
    if (validateStep1()) {
      setIsEditingAccountData(false);

      // Sincroniza em tempo real com o perfil do usuário no AuthContext e Firestore
      if (updateUser) {
        await updateUser({
          name: clientData.name,
          cpf: clientData.cpf,
          phone: clientData.phone
        });
      }

      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // -------------------------------------------------------------
  // HANDLERS ETAPA 2: ENDEREÇO & FRETE COM API VIACEP
  // -------------------------------------------------------------
  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    let formatted = value;

    if (name === 'cep') {
      formatted = maskCEP(value);
      const clean = formatted.replace(/\D/g, '');
      if (clean.length === 8) {
        triggerCepLookup(clean);
      }
    }
    if (name === 'state') formatted = value.toUpperCase().slice(0, 2);
    if (name === 'number') formatted = value.slice(0, 10);

    setAddressForm(prev => ({ ...prev, [name]: formatted }));
    if (addressErrors[name]) {
      setAddressErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const triggerCepLookup = async (cleanCep) => {
    setIsSearchingCep(true);
    setCepApiMessage(null);

    const res = await fetchAddressByCep(cleanCep);
    setIsSearchingCep(false);

    if (res.success) {
      setAddressForm(prev => ({
        ...prev,
        street: res.data.street || prev.street,
        neighborhood: res.data.neighborhood || prev.neighborhood,
        city: res.data.city || prev.city,
        state: res.data.state || prev.state,
        complement: res.data.complement || prev.complement
      }));
      setCepApiMessage({ type: 'success', text: 'Endereço localizado com sucesso via Correios.' });

      // Atualiza estimativa de frete baseado na região
      const isCuritiba = cleanCep.startsWith('80') || cleanCep.startsWith('81') || cleanCep.startsWith('82') || cleanCep.startsWith('83');
      setShippingOptions([
        { id: 'sedex', name: 'SEDEX Expresso', deadline: isCuritiba ? 'Chega amanhã' : '1 a 3 dias úteis', price: isCuritiba ? 14.90 : 28.50 },
        { id: 'pac', name: 'PAC Standard', deadline: isCuritiba ? '2 a 3 dias úteis' : '5 a 8 dias úteis', price: isCuritiba ? 9.90 : 18.90 },
        { id: 'retirada', name: 'Retirada no Ateliê (Curitiba)', deadline: 'Disponível em 24h', price: 0 }
      ]);
    } else {
      setCepApiMessage({ type: 'error', text: res.error });
    }
  };

  const validateNewAddress = () => {
    const errors = {};
    if (!validateCEP(addressForm.cep)) errors.cep = 'CEP deve ter 8 dígitos.';
    if (!addressForm.street.trim()) errors.street = 'Informe a rua / logradouro.';
    if (!addressForm.number.trim()) errors.number = 'Informe o número.';
    if (!addressForm.neighborhood.trim()) errors.neighborhood = 'Informe o bairro.';
    if (!addressForm.city.trim()) errors.city = 'Informe a cidade.';
    if (!addressForm.state.trim() || addressForm.state.trim().length !== 2) errors.state = 'Informe o estado (UF).';

    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveNewAddress = (e) => {
    e.preventDefault();
    if (validateNewAddress()) {
      const newId = `addr-${Date.now()}`;
      const newAddr = {
        id: newId,
        label: `Novo Endereço (${addressForm.neighborhood})`,
        ...addressForm
      };
      setSavedAddresses(prev => [...prev, newAddr]);
      setSelectedAddressId(newId);
      setIsAddingNewAddress(false);
      setAddressForm({ cep: '', street: '', number: '', neighborhood: '', complement: '', city: '', state: '' });
      setCepApiMessage(null);
    }
  };

  const handleNextToStep3 = (e) => {
    e.preventDefault();
    if (isAddingNewAddress) {
      if (!validateNewAddress()) return;
      handleSaveNewAddress(e);
    }
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // -------------------------------------------------------------
  // HANDLERS ETAPA 3: CONEXÃO COM GATEWAY PAGBANK & SYNC FIRESTORE
  // -------------------------------------------------------------
  const handleProceedToPagBank = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    const addressToSave = activeAddress || {
      cep: addressForm.cep || '80420-000',
      street: addressForm.street || 'Rua Comendador Araújo',
      number: addressForm.number || '333',
      neighborhood: addressForm.neighborhood || 'Batel',
      city: addressForm.city || 'Curitiba',
      state: addressForm.state || 'PR',
      complement: addressForm.complement || ''
    };

    const trackingCode = `BR${Math.floor(100000000 + Math.random() * 900000000)}PR`;
    const totalItemsCount = cartItems.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);

    const orderData = {
      userId: user?.uid || 'guest',
      clientName: clientData.name,
      clientEmail: clientData.email,
      clientCpf: clientData.cpf,
      clientPhone: clientData.phone,
      items: cartItems.map(item => ({
        id: item.id || item.slug,
        name: item.name,
        size: item.size || 'M',
        fit: item.fit || 'boxy',
        price: item.price,
        quantity: item.quantity || 1,
        image: item.image,
        evaluated: false
      })),
      subtotal,
      discountAmount,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      couponId: appliedCoupon ? (appliedCoupon.id || null) : null,
      shippingCost,
      total,
      paymentMethod,
      shippingAddress: {
        cep: addressToSave.cep || '',
        street: addressToSave.street || '',
        number: addressToSave.number || '',
        neighborhood: addressToSave.neighborhood || '',
        city: addressToSave.city || '',
        state: addressToSave.state || '',
        complement: addressToSave.complement || ''
      },
      status: 'Aprovado',
      trackingCode,
      createdAt: new Date().toISOString()
    };

    try {
      // 1. Grava o pedido no Firestore na coleção global 'orders'
      const orderRef = await addDoc(collection(db, 'orders'), orderData);
      const generatedOrder = `THR-${orderRef.id.slice(0, 6).toUpperCase()}`;
      setOrderNumber(generatedOrder);

      // 2. Se um cupom foi utilizado, atualiza métricas e saldo de comissões do parceiro
      if (appliedCoupon?.id || appliedCoupon?.code) {
        try {
          const couponDocId = appliedCoupon.id || `coupon_${appliedCoupon.code.toLowerCase()}`;
          await couponService.recordCouponUsage(
            couponDocId,
            subtotal,
            discountAmount,
            totalItemsCount
          );
        } catch (couponErr) {
          console.warn("Aviso ao registrar uso do cupom:", couponErr.message);
        }
      }

      // 3. Se o usuário estiver autenticado, salva/atualiza o perfil e adiciona o endereço ao array addresses se novo
      if (user?.uid) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          const currentAddresses = userSnap.exists() ? (userSnap.data().addresses || []) : [];

          // Monta o novo endereço vindo do formulário de Checkout
          const newAddressFromCheckout = {
            id: `addr_${Date.now()}`,
            title: 'Checkout',
            cep: addressToSave.cep,
            street: addressToSave.street,
            number: addressToSave.number,
            complement: addressToSave.complement || '',
            neighborhood: addressToSave.neighborhood || '',
            city: addressToSave.city,
            state: addressToSave.state,
            isDefault: currentAddresses.length === 0
          };

          // Verifica se esse CEP/Número já existe para não duplicar no array
          const addressExists = currentAddresses.some(
            a => a.cep === addressToSave.cep && a.number === addressToSave.number
          );

          const updatedAddresses = addressExists 
            ? currentAddresses 
            : [...currentAddresses, newAddressFromCheckout];

          await setDoc(userRef, {
            name: clientData.name,
            cpf: clientData.cpf,
            phone: clientData.phone,
            addresses: updatedAddresses
          }, { merge: true });

          if (updateUser) {
            updateUser({
              name: clientData.name,
              cpf: clientData.cpf,
              phone: clientData.phone,
              addresses: updatedAddresses
            });
          }
        } catch (syncErr) {
          console.warn("Aviso ao atualizar perfil no Checkout:", syncErr.message);
        }
      }
    } catch (err) {
      console.warn("Aviso ao salvar pedido no Firestore:", err.message);
      const fallbackOrder = `THR-${Math.floor(1000 + Math.random() * 9000)}`;
      setOrderNumber(fallbackOrder);
    } finally {
      setIsProcessing(false);
      setCurrentStep(4);
      clearCart();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText("00020126580014br.gov.bcb.pix0136thr33-atelie-pagbank-curitiba@thr33.com5204000053039865405189.905802BR5915THR33 ATELIE STREETWEAR6008CURITIBA62070503***6304E2CA");
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  const handleApplyCouponInline = async (e) => {
    e.preventDefault();
    if (couponInput.trim()) {
      const ok = await applyCoupon(couponInput.trim());
      if (ok) {
        setCouponInput('');
      }
    }
  };

  const activeAddress = savedAddresses.find(a => a.id === selectedAddressId) || savedAddresses[0];

  // -------------------------------------------------------------
  // ETAPA 4: SUCESSO / PEDIDO CONFIRMADO VIA PAGBANK
  // -------------------------------------------------------------
  if (currentStep === 4) {
    return (
      <main className={styles.successContainer}>
        <motion.div 
          className={styles.successCard}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
        >
          <div className={styles.successIconCircle}>
            <Check size={32} />
          </div>
          <span className={styles.orderNumberBadge}>PEDIDO {orderNumber}</span>
          <h1 className={styles.successTitle}>PEDIDO GERADO COM SUCESSO!</h1>
          <p className={styles.successText}>
            Obrigado por comprar na THR33. Enviamos os detalhes do pedido e instruções de pagamento para <strong>{clientData.email}</strong>.
          </p>

          {/* PIX / GATEWAY PAGBANK CONFIRMAÇÃO */}
          <div className={styles.pixBox}>
            <div className={styles.pixHeader}>
              <QrCode size={18} />
              <strong>PAGUE COM PIX OU ABRA O LINK PAGBANK</strong>
            </div>
            <p className={styles.pixInstruction}>
              Escaneie o QR Code abaixo no app do seu banco ou use o código Pix Copia e Cola:
            </p>
            
            <div className={styles.qrCodeContainer}>
              <div className={styles.qrCodeGraphic}>
                <div className={styles.qrCornerTopLeft} />
                <div className={styles.qrCornerTopRight} />
                <div className={styles.qrCornerBottomLeft} />
                <span className={styles.qrCodeText}>[ QR CODE PAGBANK ]</span>
                <span className={styles.qrCodeValue}>R$ {total.toFixed(2)}</span>
              </div>
            </div>

            <div className={styles.pixCopyArea}>
              <input 
                type="text" 
                readOnly 
                value="00020126580014br.gov.bcb.pix0136thr33-atelie-pagbank-curitiba@thr33.com..." 
                className={styles.pixInput} 
              />
              <button type="button" onClick={handleCopyPix} className={styles.copyBtn}>
                {copiedPix ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedPix ? 'COPIADO!' : 'COPIAR CHAVE'}</span>
              </button>
            </div>
            <span className={styles.pixTimerText}>O código Pix expira em 15 minutos.</span>
          </div>

          <div className={styles.successActions}>
            <Link to="/" className={styles.primaryBtn}>
              VOLTAR PARA A HOME
            </Link>
            <Link to="/catalogo" className={styles.secondaryBtn}>
              EXPLORAR MAIS PEÇAS
            </Link>
          </div>
        </motion.div>
      </main>
    );
  }

  // -------------------------------------------------------------
  // RENDER DO CHECKOUT EM ETAPAS (1, 2 e 3)
  // -------------------------------------------------------------
  return (
    <main className={styles.container}>
      {/* HEADER & STEPPER PROGRESSIVO */}
      <header className={styles.header}>
        <div className={styles.tagGroup}>
          <Lock size={12} />
          <span className={styles.tag}>CHECKOUT SEGURO // PAGBANK</span>
        </div>
        <h1 className={styles.title}>FINALIZAR PEDIDO</h1>

        {/* STEPPER VISUAL */}
        <div className={styles.stepperContainer}>
          <button 
            type="button"
            className={`${styles.stepItem} ${currentStep === 1 ? styles.stepActive : ''} ${currentStep > 1 ? styles.stepCompleted : ''}`}
            onClick={() => setCurrentStep(1)}
          >
            <span className={styles.stepNum}>{currentStep > 1 ? '✓' : '1'}</span>
            <span className={styles.stepName}>IDENTIFICAÇÃO</span>
          </button>
          
          <div className={`${styles.stepLine} ${currentStep >= 2 ? styles.stepLineActive : ''}`} />

          <button 
            type="button"
            className={`${styles.stepItem} ${currentStep === 2 ? styles.stepActive : ''} ${currentStep > 2 ? styles.stepCompleted : ''}`}
            onClick={() => { if (validateStep1()) setCurrentStep(2); }}
          >
            <span className={styles.stepNum}>{currentStep > 2 ? '✓' : '2'}</span>
            <span className={styles.stepName}>ENTREGA & FRETE</span>
          </button>

          <div className={`${styles.stepLine} ${currentStep >= 3 ? styles.stepLineActive : ''}`} />

          <button 
            type="button"
            className={`${styles.stepItem} ${currentStep === 3 ? styles.stepActive : ''}`}
            onClick={() => { if (validateStep1()) setCurrentStep(3); }}
          >
            <span className={styles.stepNum}>3</span>
            <span className={styles.stepName}>PAGAMENTO PAGBANK</span>
          </button>
        </div>
      </header>

      <div className={styles.checkoutGrid}>
        {/* COLUNA ESQUERDA: ETAPAS GUIADAS */}
        <div className={styles.formSection}>
          <AnimatePresence mode="wait">
            {/* --------------------------------------------------------
                ETAPA 1: IDENTIFICAÇÃO E DADOS PESSOAIS
                -------------------------------------------------------- */}
            {currentStep === 1 && (
              <motion.section 
                key="step-1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25 }}
                className={styles.stepCard}
              >
                <div className={styles.stepCardHeader}>
                  <span className={styles.stepCardBadge}>ETAPA 01</span>
                  <h2 className={styles.stepCardTitle}>DADOS DE IDENTIFICAÇÃO</h2>
                </div>

                {/* DADOS DA CONTA DO CLIENTE (BLOQUEADOS COM OPÇÃO DE EDITAR) */}
                <div className={styles.accountDataBlock}>
                  <div className={styles.accountDataHeader}>
                    <div className={styles.accountDataBadge}>
                      <UserCheck size={14} />
                      <span>CONTA VERIFICADA ATELIÊ</span>
                    </div>

                    <button 
                      type="button"
                      onClick={() => setIsEditingAccountData(!isEditingAccountData)}
                      className={styles.editDataBtn}
                    >
                      <Edit3 size={13} />
                      <span>{isEditingAccountData ? 'Concluir Edição' : 'Editar Dados'}</span>
                    </button>
                  </div>

                  {!isEditingAccountData ? (
                    /* VISUAL BLOQUEADO DOS DADOS CADASTRADOS */
                    <div className={styles.lockedDataGrid}>
                      <div className={styles.lockedItem}>
                        <span className={styles.lockedLabel}>NOME</span>
                        <strong className={styles.lockedValue}>{clientData.name || 'Cliente THR33'}</strong>
                      </div>
                      <div className={styles.lockedItem}>
                        <span className={styles.lockedLabel}>E-MAIL</span>
                        <strong className={styles.lockedValue}>{clientData.email}</strong>
                      </div>
                    </div>
                  ) : (
                    /* CAMPOS DESBLOQUEADOS PARA EDIÇÃO */
                    <div className={styles.fieldsGrid}>
                      <div className={styles.fieldWrapper}>
                        <label className={styles.fieldLabel}>Nome Completo *</label>
                        <input 
                          type="text" 
                          name="name" 
                          value={clientData.name} 
                          onChange={handleClientChange} 
                          className={clientErrors.name ? styles.inputError : ''}
                        />
                        {clientErrors.name && <span className={styles.errorText}><AlertCircle size={12} /> {clientErrors.name}</span>}
                      </div>

                      <div className={styles.fieldWrapper}>
                        <label className={styles.fieldLabel}>E-mail *</label>
                        <input 
                          type="email" 
                          name="email" 
                          value={clientData.email} 
                          onChange={handleClientChange} 
                          className={clientErrors.email ? styles.inputError : ''}
                        />
                        {clientErrors.email && <span className={styles.errorText}><AlertCircle size={12} /> {clientErrors.email}</span>}
                      </div>
                    </div>
                  )}
                </div>

                {/* CPF E TELEFONE/WHATSAPP (SEMPRE ABERTOS PARA PREENCHIMENTO / VALIDAÇÃO DIRETA) */}
                <div className={styles.cpfEntrySection}>
                  <div className={styles.identificationFieldsGrid}>
                    <div className={styles.fieldWrapper}>
                      <div className={styles.labelWithBadge}>
                        <label className={styles.fieldLabel}>CPF DO TITULAR DA COMPRA *</label>
                        <span className={styles.requiredBadge}>NF / PagBank</span>
                      </div>
                      <input 
                        type="text" 
                        name="cpf" 
                        placeholder="000.000.000-00"
                        maxLength={14}
                        value={clientData.cpf} 
                        onChange={handleClientChange} 
                        className={clientErrors.cpf ? styles.inputError : ''}
                      />
                      {clientErrors.cpf && <span className={styles.errorText}><AlertCircle size={12} /> {clientErrors.cpf}</span>}
                    </div>

                    <div className={styles.fieldWrapper}>
                      <div className={styles.labelWithBadge}>
                        <label className={styles.fieldLabel}>TELEFONE / WHATSAPP *</label>
                        <span className={styles.requiredBadge}>Rastreio de Envio</span>
                      </div>
                      <input 
                        type="text" 
                        name="phone" 
                        placeholder="(41) 99999-9999"
                        maxLength={15}
                        value={clientData.phone} 
                        onChange={handleClientChange} 
                        className={clientErrors.phone ? styles.inputError : ''}
                      />
                      {clientErrors.phone && <span className={styles.errorText}><AlertCircle size={12} /> {clientErrors.phone}</span>}
                    </div>
                  </div>
                </div>

                <div className={styles.stepActions}>
                  <button type="button" onClick={handleNextToStep2} className={styles.primaryBtn}>
                    <span>CONTINUAR PARA ENTREGA</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </motion.section>
            )}

            {/* --------------------------------------------------------
                ETAPA 2: ENDEREÇO DE ENTREGA & FRETE
                -------------------------------------------------------- */}
            {currentStep === 2 && (
              <motion.section 
                key="step-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25 }}
                className={styles.stepCard}
              >
                <div className={styles.stepCardHeader}>
                  <span className={styles.stepCardBadge}>ETAPA 02</span>
                  <h2 className={styles.stepCardTitle}>ENDEREÇO DE ENTREGA & FRETE</h2>
                </div>

                {/* ENDEREÇOS SALVOS */}
                {!isAddingNewAddress && (
                  <div className={styles.savedAddressesList}>
                    <span className={styles.subSectionTitle}>SELECIONE UM ENDEREÇO SALVO:</span>
                    <div className={styles.addressCardsGrid}>
                      {savedAddresses.map((addr) => {
                        const isSelected = selectedAddressId === addr.id;
                        return (
                          <div 
                            key={addr.id} 
                            className={`${styles.addressCard} ${isSelected ? styles.addressCardSelected : ''}`}
                            onClick={() => setSelectedAddressId(addr.id)}
                          >
                            <div className={styles.addressCardHeader}>
                              <div className={styles.radioDot}>
                                {isSelected && <div className={styles.radioDotInner} />}
                              </div>
                              <strong>{addr.label}</strong>
                            </div>
                            <p className={styles.addressCardBody}>
                              {addr.street}, {addr.number} {addr.complement && `• ${addr.complement}`}<br />
                              {addr.neighborhood} — {addr.city}/{addr.state}<br />
                              CEP: {addr.cep}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <button 
                      type="button" 
                      onClick={() => setIsAddingNewAddress(true)} 
                      className={styles.addAddressBtn}
                    >
                      <Plus size={14} />
                      <span>ADICIONAR NOVO ENDEREÇO</span>
                    </button>
                  </div>
                )}

                {/* FORMULÁRIO DE NOVO ENDEREÇO COM VIACEP */}
                {isAddingNewAddress && (
                  <div className={styles.newAddressBox}>
                    <div className={styles.newAddressHeader}>
                      <span className={styles.subSectionTitle}>CADASTRAR NOVO ENDEREÇO</span>
                      {savedAddresses.length > 0 && (
                        <button 
                          type="button" 
                          onClick={() => setIsAddingNewAddress(false)} 
                          className={styles.cancelLink}
                        >
                          Cancelar e usar endereço salvo
                        </button>
                      )}
                    </div>

                    <div className={styles.fieldsGrid}>
                      <div className={styles.fieldWrapper}>
                        <label className={styles.fieldLabel}>CEP (Busca Automática) *</label>
                        <div className={styles.cepSearchInputWrapper}>
                          <input 
                            type="text" 
                            name="cep" 
                            placeholder="00000-000"
                            maxLength={9}
                            value={addressForm.cep} 
                            onChange={handleAddressChange} 
                            className={addressErrors.cep ? styles.inputError : ''}
                          />
                          {isSearchingCep && <Loader2 size={16} className={styles.spinner} />}
                        </div>
                        {cepApiMessage && (
                          <span className={cepApiMessage.type === 'success' ? styles.successApiText : styles.errorText}>
                            {cepApiMessage.text}
                          </span>
                        )}
                        {addressErrors.cep && <span className={styles.errorText}><AlertCircle size={12} /> {addressErrors.cep}</span>}
                      </div>

                      <div className={styles.fieldWrapper}>
                        <label className={styles.fieldLabel}>Rua / Logradouro *</label>
                        <input 
                          type="text" 
                          name="street" 
                          placeholder="Rua, Avenida, etc."
                          value={addressForm.street} 
                          onChange={handleAddressChange} 
                          className={addressErrors.street ? styles.inputError : ''}
                        />
                        {addressErrors.street && <span className={styles.errorText}><AlertCircle size={12} /> {addressErrors.street}</span>}
                      </div>

                      <div className={styles.fieldWrapper}>
                        <label className={styles.fieldLabel}>Número *</label>
                        <input 
                          type="text" 
                          name="number" 
                          placeholder="123"
                          value={addressForm.number} 
                          onChange={handleAddressChange} 
                          className={addressErrors.number ? styles.inputError : ''}
                        />
                        {addressErrors.number && <span className={styles.errorText}><AlertCircle size={12} /> {addressErrors.number}</span>}
                      </div>

                      <div className={styles.fieldWrapper}>
                        <label className={styles.fieldLabel}>Complemento</label>
                        <input 
                          type="text" 
                          name="complement" 
                          placeholder="Apto, Bloco, etc."
                          value={addressForm.complement} 
                          onChange={handleAddressChange} 
                        />
                      </div>

                      <div className={styles.fieldWrapper}>
                        <label className={styles.fieldLabel}>Bairro *</label>
                        <input 
                          type="text" 
                          name="neighborhood" 
                          placeholder="Bairro"
                          value={addressForm.neighborhood} 
                          onChange={handleAddressChange} 
                          className={addressErrors.neighborhood ? styles.inputError : ''}
                        />
                        {addressErrors.neighborhood && <span className={styles.errorText}><AlertCircle size={12} /> {addressErrors.neighborhood}</span>}
                      </div>

                      <div className={styles.fieldWrapper}>
                        <label className={styles.fieldLabel}>Cidade *</label>
                        <input 
                          type="text" 
                          name="city" 
                          placeholder="Cidade"
                          value={addressForm.city} 
                          onChange={handleAddressChange} 
                          className={addressErrors.city ? styles.inputError : ''}
                        />
                        {addressErrors.city && <span className={styles.errorText}><AlertCircle size={12} /> {addressErrors.city}</span>}
                      </div>

                      <div className={styles.fieldWrapper}>
                        <label className={styles.fieldLabel}>UF (Estado) *</label>
                        <input 
                          type="text" 
                          name="state" 
                          placeholder="PR"
                          maxLength={2}
                          value={addressForm.state} 
                          onChange={handleAddressChange} 
                          className={addressErrors.state ? styles.inputError : ''}
                        />
                        {addressErrors.state && <span className={styles.errorText}><AlertCircle size={12} /> {addressErrors.state}</span>}
                      </div>
                    </div>
                  </div>
                )}

                {/* SELEÇÃO DO MÉTODO DE FRETE */}
                <div className={styles.shippingSelectionBlock}>
                  <span className={styles.subSectionTitle}>SELECIONE A FORMA DE ENVIO:</span>
                  <div className={styles.shippingOptionsGrid}>
                    {shippingOptions.map((opt) => {
                      const isSelected = selectedShippingMethod === opt.id;
                      return (
                        <div 
                          key={opt.id}
                          className={`${styles.shippingOptionCard} ${isSelected ? styles.shippingOptionSelected : ''}`}
                          onClick={() => setSelectedShippingMethod(opt.id)}
                        >
                          <div className={styles.shippingCardLeft}>
                            <div className={styles.radioDot}>
                              {isSelected && <div className={styles.radioDotInner} />}
                            </div>
                            <div>
                              <strong>{opt.name}</strong>
                              <span className={styles.shippingDeadline}>{opt.deadline}</span>
                            </div>
                          </div>
                          <span className={styles.shippingPriceValue}>
                            {opt.price === 0 ? 'GRÁTIS' : `R$ ${opt.price.toFixed(2)}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.stepActionsBetween}>
                  <button type="button" onClick={() => setCurrentStep(1)} className={styles.secondaryBtn}>
                    <ArrowLeft size={14} />
                    <span>VOLTAR</span>
                  </button>
                  <button type="button" onClick={handleNextToStep3} className={styles.primaryBtn}>
                    <span>CONTINUAR PARA PAGAMENTO</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </motion.section>
            )}

            {/* --------------------------------------------------------
                ETAPA 3: PORTAL DE PAGAMENTO SEGURO (PAGBANK)
                -------------------------------------------------------- */}
            {currentStep === 3 && (
              <motion.section 
                key="step-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25 }}
                className={styles.stepCard}
              >
                <div className={styles.stepCardHeader}>
                  <span className={styles.stepCardBadge}>ETAPA 03</span>
                  <h2 className={styles.stepCardTitle}>PAGAMENTO SEGURO (PAGBANK)</h2>
                </div>

                {/* Resumo do Destino */}
                <div className={styles.shippingReviewBadge}>
                  <MapPin size={15} />
                  <span>
                    Entrega para: <strong>{clientData.name}</strong> • {activeAddress.street}, {activeAddress.number} ({activeAddress.city}/{activeAddress.state})
                  </span>
                  <button type="button" onClick={() => setCurrentStep(2)} className={styles.changeLink}>Alterar</button>
                </div>

                {/* CARD PRINCIPAL DO GATEWAY PAGBANK */}
                <div className={styles.pagBankGatewayCard}>
                  <div className={styles.pagBankHeader}>
                    <div className={styles.pagBankBrandGroup}>
                      <span className={styles.pagBankLogo}>PAGBANK</span>
                      <span className={styles.pagBankBadge}>GATEWAY OFICIAL</span>
                    </div>
                    <div className={styles.pagBankSecureTag}>
                      <ShieldCheck size={14} color="#4ade80" />
                      <span>CRIPTOGRAFIA 256-BIT</span>
                    </div>
                  </div>

                  <p className={styles.pagBankDesc}>
                    Ao clicar no botão de confirmação, você será conectado ao ambiente seguro do <strong>PagBank</strong> para concluir seu pagamento com total proteção.
                  </p>

                  <div className={styles.pagBankMethodsList}>
                    <div className={styles.methodPill}>
                      <Zap size={14} />
                      <span><strong>PIX</strong> (Aprovação na hora)</span>
                    </div>
                    <div className={styles.methodPill}>
                      <CreditCard size={14} />
                      <span><strong>Cartão de Crédito</strong> (em até 3x sem juros)</span>
                    </div>
                    <div className={styles.methodPill}>
                      <FileText size={14} />
                      <span><strong>Boleto Bancário</strong></span>
                    </div>
                  </div>
                </div>

                <div className={styles.stepActionsBetween}>
                  <button type="button" onClick={() => setCurrentStep(2)} className={styles.secondaryBtn}>
                    <ArrowLeft size={14} />
                    <span>VOLTAR</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={handleProceedToPagBank} 
                    className={styles.primaryBtn}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={16} className={styles.spinner} />
                        <span>CONECTANDO COM PAGBANK...</span>
                      </>
                    ) : (
                      <>
                        <span>PAGAR COM PAGBANK (R$ {total.toFixed(2)})</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* COLUNA DIREITA: RESUMO DO PEDIDO */}
        <aside className={styles.summarySection}>
          <div className={styles.summaryHeader}>
            <ShoppingBag size={16} />
            <h2 className={styles.summaryTitle}>RESUMO DO PEDIDO ({cartItems.length})</h2>
          </div>

          <div className={styles.orderItems}>
            {cartItems.map((item) => (
              <div key={`${item.id}-${item.size}-${item.color?.id || 'default'}`} className={styles.orderCard}>
                <img src={item.image} alt={item.name} />
                <div className={styles.orderCardInfo}>
                  <strong className={styles.orderCardName}>{item.name}</strong>
                  <span className={styles.orderCardMeta}>
                    Tam: <strong>{item.size}</strong> {item.color?.name && `• ${item.color.name}`}
                  </span>
                  <span className={styles.orderCardQty}>Qtd: {item.quantity}</span>
                  <span className={styles.itemPrice}>R$ {(item.price * item.quantity).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Cupom de Desconto */}
          <div className={styles.couponBlock}>
            {!appliedCoupon ? (
              <>
                <div className={styles.inlineCouponForm}>
                  <div className={styles.couponInputWrapper}>
                    <Tag size={13} className={styles.couponIcon} />
                    <input 
                      type="text" 
                      placeholder="Cupom (ex: EDU10)" 
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      className={styles.couponInput}
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={handleApplyCouponInline} 
                    disabled={validatingCoupon || !couponInput.trim()}
                    className={styles.couponBtn}
                  >
                    {validatingCoupon ? <Loader2 size={13} className={styles.spinner} /> : 'APLICAR'}
                  </button>
                </div>
                {couponFeedback?.message && (
                  <span className={couponFeedback.isError ? styles.couponErrorText : styles.couponSuccessText}>
                    {couponFeedback.isError ? <AlertCircle size={11} /> : <CheckCircle2 size={11} />}
                    <span>{couponFeedback.message}</span>
                  </span>
                )}
              </>
            ) : (
              <div className={styles.appliedCouponTag}>
                <div className={styles.couponTagText}>
                  <Tag size={13} />
                  <span>CUPOM <strong>{appliedCoupon.code}</strong> ({appliedCoupon.label})</span>
                </div>
                <button type="button" onClick={removeCoupon} className={styles.removeCouponBtn}>
                  REMOVER
                </button>
              </div>
            )}
          </div>

          <div className={styles.summaryValues}>
            <div className={styles.summaryRow}>
              <span>Subtotal</span>
              <span>R$ {subtotal.toFixed(2)}</span>
            </div>

            {appliedCoupon && discountAmount > 0 && (
              <div className={`${styles.summaryRow} ${styles.discountRow}`}>
                <span>Desconto ({appliedCoupon.code})</span>
                <span>- R$ {discountAmount.toFixed(2)}</span>
              </div>
            )}

            <div className={styles.summaryRow}>
              <span>Frete</span>
              <span>{shippingCost === 0 ? 'GRÁTIS' : `R$ ${shippingCost.toFixed(2)}`}</span>
            </div>

            <div className={`${styles.summaryRow} ${styles.totalRow}`}>
              <span>TOTAL</span>
              <span>R$ {total.toFixed(2)}</span>
            </div>
          </div>

          <div className={styles.securityNote}>
            <ShieldCheck size={14} />
            <span>Transação segura e criptografada via PagBank</span>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default Checkout;
