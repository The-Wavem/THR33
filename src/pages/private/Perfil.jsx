import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Package, 
  MapPin, 
  Shield, 
  Copy, 
  Check, 
  Plus, 
  Trash2, 
  Edit3, 
  LogOut, 
  QrCode, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Sparkles, 
  X,
  AlertTriangle,
  Lock,
  Save,
  ShieldCheck,
  AtSign,
  Mail,
  Phone,
  CreditCard,
  Eye,
  MessageSquare,
  HelpCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import styles from './Perfil.module.css';

// EXEMPLOS DETALHADOS DE PEDIDOS E PEÇAS GARANTIDAS NOS DROPS
const INITIAL_ORDERS = [
  {
    id: 'ORD-9021',
    date: '04 AGO 2026',
    status: 'EM TRÂNSITO',
    statusType: 'shipping',
    trackingCode: 'BR948201948BR',
    subtotal: 'R$ 399,00',
    discount: 'R$ 0,00',
    shippingMethod: 'SEDEX EXPRESSO (1 a 2 dias úteis)',
    shippingCost: 'R$ 24,90',
    total: 'R$ 423,90',
    paymentMethod: 'PIX INSTANTÂNEO',
    paymentDetails: 'Desconto de 5% Aplicado • Chave Pix E-mail',
    address: {
      nome: 'WESLLEY K.',
      rua: 'Alameda Santos',
      numero: '1470',
      complemento: 'Apt 82',
      bairro: 'Cerqueira César',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01418-100'
    },
    timeline: [
      { step: 1, label: '1. PEDIDO CONFIRMADO', date: '04 AGO — 14:20', done: true },
      { step: 2, label: '2. SEPARAÇÃO NO ATELIÊ', date: '04 AGO — 16:45', done: true },
      { step: 3, label: '3. DESPACHADO VIA SEDEX', date: '05 AGO — 09:10', done: true },
      { step: 4, label: '4. ENTREGUE AO DESTINATÁRIO', date: 'EM TRÂNSITO', done: false }
    ],
    items: [
      {
        id: 'item-1',
        title: 'CAMISA UTOPIA OVERSIZED',
        size: 'G',
        dropLot: '#04/33',
        price: 'R$ 210,00',
        image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=400'
      },
      {
        id: 'item-2',
        title: 'BONÉ ATELIÊ TÁTICO V.1',
        size: 'ÚNICO',
        dropLot: '#12/33',
        price: 'R$ 189,00',
        image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=400'
      }
    ]
  },
  {
    id: 'ORD-8810',
    date: '18 JUL 2026',
    status: 'ENTREGUE',
    statusType: 'delivered',
    trackingCode: 'BR781290412BR',
    subtotal: 'R$ 420,00',
    discount: 'R$ -21,00 (CUPOM VIP)',
    shippingMethod: 'FRETE GRÁTIS EXPRESSO (SEDEX)',
    shippingCost: 'R$ 0,00 (GRÁTIS)',
    total: 'R$ 399,00',
    paymentMethod: 'CARTÃO DE CRÉDITO',
    paymentDetails: 'PARCELADO EM 3X DE R$ 133,00 (MASTERCARD **** 4892)',
    address: {
      nome: 'WESLLEY K.',
      rua: 'Alameda Santos',
      numero: '1470',
      complemento: 'Apt 82',
      bairro: 'Cerqueira César',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01418-100'
    },
    timeline: [
      { step: 1, label: '1. PEDIDO CONFIRMADO', date: '18 JUL — 10:15', done: true },
      { step: 2, label: '2. SEPARAÇÃO NO ATELIÊ', date: '18 JUL — 11:30', done: true },
      { step: 3, label: '3. DESPACHADO VIA SEDEX', date: '19 JUL — 08:00', done: true },
      { step: 4, label: '4. ENTREGUE AO DESTINATÁRIO', date: '21 JUL — 14:40', done: true }
    ],
    items: [
      {
        id: 'item-3',
        title: 'MOLETOM ACID TACTICAL 400GSM',
        size: 'GG',
        dropLot: '#02/25',
        price: 'R$ 420,00',
        image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=80&w=400'
      }
    ]
  },
  {
    id: 'ORD-7402',
    date: '02 MAI 2026',
    status: 'DESPACHADO',
    statusType: 'dispatched',
    trackingCode: 'BR330198421BR',
    subtotal: 'R$ 189,00',
    discount: 'R$ 0,00',
    shippingMethod: 'SEDEX PADRÃO',
    shippingCost: 'R$ 18,00',
    total: 'R$ 207,00',
    paymentMethod: 'PIX INSTANTÂNEO',
    paymentDetails: 'Chave Pix E-mail • Autenticado',
    address: {
      nome: 'WESLLEY K. (ATELIÊ)',
      rua: 'Rua Fradique Coutinho',
      numero: '350',
      complemento: 'Conj 12',
      bairro: 'Pinheiros',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '05409-000'
    },
    timeline: [
      { step: 1, label: '1. PEDIDO CONFIRMADO', date: '02 MAI — 11:00', done: true },
      { step: 2, label: '2. SEPARAÇÃO NO ATELIÊ', date: '02 MAI — 15:00', done: true },
      { step: 3, label: '3. DESPACHADO VIA SEDEX', date: '03 MAI — 09:30', done: true },
      { step: 4, label: '4. ENTREGUE AO DESTINATÁRIO', date: 'AGUARDANDO', done: false }
    ],
    items: [
      {
        id: 'item-4',
        title: 'CAMISA BOXY PROCESS V.1',
        size: 'M',
        dropLot: '#09/33',
        price: 'R$ 189,00',
        image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=400'
      }
    ]
  }
];

// ENDEREÇOS INICIAIS DE EXEMPLO
const INITIAL_ADDRESSES = [
  {
    id: 'addr-1',
    isDefault: true,
    label: 'CASA / ESTÚDIO',
    nome: 'WESLLEY K.',
    cep: '01418-100',
    rua: 'Alameda Santos',
    numero: '1470',
    complemento: 'Apt 82',
    bairro: 'Cerqueira César',
    cidade: 'São Paulo',
    estado: 'SP'
  },
  {
    id: 'addr-2',
    isDefault: false,
    label: 'ESCRITÓRIO CENTRAL',
    nome: 'WESLLEY K. (ATELIÊ)',
    cep: '05409-000',
    rua: 'Rua Fradique Coutinho',
    numero: '350',
    complemento: 'Conj 12',
    bairro: 'Pinheiros',
    cidade: 'São Paulo',
    estado: 'SP'
  }
];

export function Perfil({ defaultTab = 'pedidos' }) {
  const { user, updateUser, logout, deleteAccount } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // ABA ATIVA (pedidos | dados | enderecos | seguranca)
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [supportOrder, setSupportOrder] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);

  // TRAVAR SCROLL DO BODY E LENIS QUANDO QUALQUER MODAL ESTIVER ABERTO
  const isAnyModalOpen = Boolean(selectedOrder || supportOrder || showAddressModal || showLogoutModal || showDeleteModal);

  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isAnyModalOpen]);

  // EFETUAR SINCRONISMO COM ROTA OU QUERY PARAMS (?tab=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');

    if (tabParam && ['pedidos', 'dados', 'enderecos', 'seguranca'].includes(tabParam)) {
      setActiveTab(tabParam);
    } else if (location.pathname === '/meus-pedidos') {
      setActiveTab('pedidos');
    } else if (location.pathname === '/configuracoes') {
      setActiveTab('dados');
    } else if (location.pathname === '/enderecos') {
      setActiveTab('enderecos');
    } else if (location.pathname === '/seguranca') {
      setActiveTab('seguranca');
    }
  }, [location]);

  // ESTADO DE CÓDIGOS DE RASTREIO COPIADOS
  const [copiedTracking, setCopiedTracking] = useState(null);

  // ESTADO DO FORMULÁRIO DE DADOS PESSOAIS
  const [profileForm, setProfileForm] = useState({
    name: user?.name || 'WESLLEY K.',
    email: user?.email || 'weslley@atelier-thr33.com',
    cpf: user?.cpf || '382.901.482-00',
    phone: user?.phone || '(11) 98765-4321'
  });

  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || 'WESLLEY K.',
        email: user.email || 'weslley@atelier-thr33.com',
        cpf: user.cpf || '382.901.482-00',
        phone: user.phone || '(11) 98765-4321'
      });
    }
  }, [user]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    updateUser(profileForm);
    showToast('✓ DADOS DO PASSAPORTE ATUALIZADOS COM SUCESSO!');
  };

  // ESTADO DOS ENDEREÇOS
  const [addresses, setAddresses] = useState(() => {
    try {
      const saved = localStorage.getItem('thr33_saved_addresses');
      return saved ? JSON.parse(saved) : INITIAL_ADDRESSES;
    } catch {
      return INITIAL_ADDRESSES;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('thr33_saved_addresses', JSON.stringify(addresses));
    } catch (e) {
      console.error(e);
    }
  }, [addresses]);

  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    label: '',
    nome: '',
    cep: '',
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: 'SP',
    isDefault: false
  });

  const handleOpenNewAddress = () => {
    setEditingAddress(null);
    setAddressForm({
      label: 'CASA / ENTREGA',
      nome: profileForm.name || 'WESLLEY K.',
      cep: '',
      rua: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: 'São Paulo',
      estado: 'SP',
      isDefault: addresses.length === 0
    });
    setShowAddressModal(true);
  };

  const handleOpenEditAddress = (addr) => {
    setEditingAddress(addr);
    setAddressForm({ ...addr });
    setShowAddressModal(true);
  };

  const handleDeleteAddress = (id) => {
    const updated = addresses.filter(a => a.id !== id);
    if (updated.length > 0 && !updated.some(a => a.isDefault)) {
      updated[0].isDefault = true;
    }
    setAddresses(updated);
    showToast('Endereço removido.');
  };

  const handleSetDefaultAddress = (id) => {
    const updated = addresses.map(a => ({
      ...a,
      isDefault: a.id === id
    }));
    setAddresses(updated);
    showToast('✓ Endereço marcado como principal.');
  };

  const handleSaveAddress = (e) => {
    e.preventDefault();
    if (editingAddress) {
      const updated = addresses.map(a => {
        if (a.id === editingAddress.id) {
          return { ...addressForm, id: editingAddress.id };
        }
        return addressForm.isDefault ? { ...a, isDefault: false } : a;
      });
      setAddresses(updated);
      showToast('✓ Endereço atualizado com sucesso.');
    } else {
      const newId = `addr-${Date.now()}`;
      let updated = addresses;
      if (addressForm.isDefault) {
        updated = updated.map(a => ({ ...a, isDefault: false }));
      }
      updated = [...updated, { ...addressForm, id: newId }];
      setAddresses(updated);
      showToast('✓ Novo endereço cadastrado!');
    }
    setShowAddressModal(false);
  };

  // ESTADO DE ALTERAÇÃO DE SENHA
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleSecuritySubmit = (e) => {
    e.preventDefault();
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      alert('As novas senhas não coincidem!');
      return;
    }
    if (securityForm.newPassword.length < 6) {
      alert('A nova senha deve possuir pelo menos 6 caracteres.');
      return;
    }
    showToast('✓ SENHA ATUALIZADA COM SUCESSO! SEU PASSAPORTE ESTÁ PROTEGIDO.');
    setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleCopyTracking = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedTracking(code);
    setTimeout(() => {
      setCopiedTracking(null);
    }, 2500);
  };

  const handleOpenWhatsappSupport = (orderId) => {
    const text = encodeURIComponent(`Olá equipe Ateliê THR33! Preciso de atendimento/suporte referente ao pedido #${orderId}.`);
    window.open(`https://wa.me/5511999999999?text=${text}`, '_blank');
  };

  const tabsConfig = [
    { id: 'pedidos', label: '01. MEUS PEDIDOS & DROPS', icon: Package },
    { id: 'dados', label: '02. DADOS PESSOAIS', icon: User },
    { id: 'enderecos', label: '03. ENDEREÇOS TÁTICOS', icon: MapPin },
    { id: 'seguranca', label: '04. SEGURANÇA & ACESSO', icon: Shield }
  ];

  return (
    <div className={styles.perfilContainer}>
      
      {/* TOAST FLUTUANTE DE NOTIFICAÇÃO TÁTICA */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={styles.tacticalToast}
          >
            <Sparkles size={16} className={styles.toastIcon} />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. HEADER HERO: PASSAPORTE DIGITAL DO MEMBRO */}
      <div className={styles.passportCard}>
        <div className={styles.cardBodyGrid}>
          {/* LADO ESQUERDO: INFORMAÇÕES DO USUÁRIO */}
          <div className={styles.userInfoCol}>
            <div className={styles.passNumberBadge}>
              <span>MEMBER REGISTRY</span>
              <strong className={styles.passNumber}>{user?.passId || '#0482'}</strong>
            </div>

            <h1 className={styles.userNameHeader}>{user?.name || 'WESLLEY K.'}</h1>

            <div className={styles.statusTierBox}>
              <span className={styles.tierLabel}>NÍVEL DE ACESSO:</span>
              <span className={styles.tierValue}>{user?.tier || 'STATUS: MEMBRO VIP // ATELIÊ R.U.A'}</span>
            </div>

            <div className={styles.userMetaFlex}>
              <div className={styles.metaItem}>
                <span className={styles.metaKey}>CADASTRO:</span>
                <span className={styles.metaVal}>{user?.createdAt || '14/03/2024'}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaKey}>E-MAIL:</span>
                <span className={styles.metaVal}>{user?.email || 'weslley@atelier-thr33.com'}</span>
              </div>
            </div>
          </div>

          {/* LADO DIREITO: QR CODE TÁTICO DE AUTENTICAÇÃO */}
          <div className={styles.qrCodeCol}>
            <div className={styles.qrFrame}>
              <div className={styles.qrCornerTL} />
              <div className={styles.qrCornerTR} />
              <div className={styles.qrCornerBL} />
              <div className={styles.qrCornerBR} />

              <svg className={styles.qrSvg} viewBox="0 0 100 100" fill="currentColor">
                <rect x="5" y="5" width="25" height="25" fill="#F2E3B3" />
                <rect x="9" y="9" width="17" height="17" fill="#000000" />
                <rect x="13" y="13" width="9" height="9" fill="#F2E3B3" />

                <rect x="70" y="5" width="25" height="25" fill="#F2E3B3" />
                <rect x="74" y="9" width="17" height="17" fill="#000000" />
                <rect x="78" y="13" width="9" height="9" fill="#F2E3B3" />

                <rect x="5" y="70" width="25" height="25" fill="#F2E3B3" />
                <rect x="9" y="74" width="17" height="17" fill="#000000" />
                <rect x="13" y="78" width="9" height="9" fill="#F2E3B3" />

                {/* MATRIX PATTERN */}
                <rect x="36" y="8" width="8" height="8" fill="#FFF" />
                <rect x="48" y="14" width="14" height="6" fill="#FFF" />
                <rect x="36" y="24" width="6" height="12" fill="#FFF" />
                <rect x="46" y="24" width="16" height="6" fill="#F2E3B3" />
                
                <rect x="8" y="36" width="10" height="10" fill="#FFF" />
                <rect x="22" y="38" width="16" height="6" fill="#FFF" />
                <rect x="42" y="36" width="12" height="12" fill="#FFF" />
                <rect x="58" y="38" width="14" height="6" fill="#FFF" />
                <rect x="76" y="36" width="18" height="8" fill="#F2E3B3" />

                <rect x="8" y="52" width="18" height="8" fill="#FFF" />
                <rect x="30" y="52" width="12" height="12" fill="#F2E3B3" />
                <rect x="48" y="54" width="16" height="6" fill="#FFF" />
                <rect x="68" y="52" width="12" height="12" fill="#FFF" />

                <rect x="36" y="70" width="12" height="12" fill="#FFF" />
                <rect x="52" y="72" width="18" height="6" fill="#F2E3B3" />
                <rect x="74" y="70" width="20" height="20" fill="#FFF" />
                <rect x="78" y="74" width="12" height="12" fill="#000000" />

                <rect x="36" y="86" width="18" height="8" fill="#FFF" />
                <rect x="58" y="84" width="10" height="10" fill="#FFF" />
              </svg>
              <div className={styles.qrScanline} />
            </div>

            <div className={styles.qrCaption}>
              <QrCode size={12} />
              <span>QR DE AUTENTICAÇÃO VIP</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. NAVEGADOR DE ABAS TÁTICO */}
      <div className={styles.tabsNavContainer}>
        <div className={styles.tabsGrid}>
          {tabsConfig.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  navigate(`?tab=${tab.id}`, { replace: true });
                }}
                className={`${styles.tabBtn} ${isActive ? styles.tabBtnActive : ''}`}
              >
                <Icon size={16} className={styles.tabIcon} />
                <span>{tab.label}</span>
                {isActive && (
                  <motion.div 
                    layoutId="activeTabGlow"
                    className={styles.activeTabGlow} 
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. CONTEÚDO DAS ABAS */}
      <div className={styles.tabContentBox}>
        <AnimatePresence mode="wait">
          
          {/* ABA 01: MEUS PEDIDOS & DROPS */}
          {activeTab === 'pedidos' && (
            <motion.div 
              key="tab-pedidos"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className={styles.tabSection}
            >
              <div className={styles.sectionHeaderFlex}>
                <div>
                  <h2 className={styles.sectionTitle}>HISTÓRICO DE PEDIDOS & DROPS GARANTIDOS</h2>
                  <p className={styles.sectionSub}>Acompanhe o status do envio, rastreio SEDEX e os lotes numerados das suas peças.</p>
                </div>
                <div className={styles.counterBadge}>
                  TOTAL: <strong>{INITIAL_ORDERS.length} PEDIDOS</strong>
                </div>
              </div>

              <div className={styles.ordersList}>
                {INITIAL_ORDERS.map((order) => (
                  <div key={order.id} className={styles.orderCard}>
                    
                    {/* TOP DE PEDIDO */}
                    <div className={styles.orderTopBar}>
                      <div className={styles.orderIdent}>
                        <span className={styles.orderTag}>PEDIDO:</span>
                        <strong className={styles.orderNum}>#{order.id}</strong>
                        <span className={styles.orderDate}>• {order.date}</span>
                      </div>

                      <div className={styles.orderStatusBadge} data-status={order.statusType}>
                        {order.statusType === 'shipping' && <Truck size={14} />}
                        {order.statusType === 'delivered' && <CheckCircle2 size={14} />}
                        {order.statusType === 'dispatched' && <Clock size={14} />}
                        <span>{order.status}</span>
                      </div>
                    </div>

                    {/* LISTA DE ITENS DO PEDIDO COM LOTE NUMERADO */}
                    <div className={styles.orderItemsGrid}>
                      {order.items.map((item) => (
                        <div key={item.id} className={styles.orderItemRow}>
                          <img src={item.image} alt={item.title} className={styles.itemThumb} />
                          
                          <div className={styles.itemDetails}>
                            <h4 className={styles.itemTitle}>{item.title}</h4>
                            <div className={styles.itemMetaLine}>
                              <span className={styles.sizeBadge}>TAMANHO: {item.size}</span>
                              <span className={styles.lotBadge}>
                                LOTE NUMERADO: <strong>{item.dropLot}</strong>
                              </span>
                            </div>
                          </div>

                          <div className={styles.itemPriceCol}>
                            <span>{item.price}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* RASTREIO E TOTAL */}
                    <div className={styles.orderMiddleBar}>
                      <div className={styles.trackingBox}>
                        <span className={styles.trackLabel}>CÓDIGO DE RASTREIO SEDEX:</span>
                        <code className={styles.trackCode}>{order.trackingCode}</code>
                        
                        <button 
                          onClick={() => handleCopyTracking(order.trackingCode)}
                          className={styles.btnCopyTrack}
                        >
                          {copiedTracking === order.trackingCode ? (
                            <>
                              <Check size={14} color="#000000" />
                              <span>COPIADO!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={14} />
                              <span>COPIAR RASTREIO</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className={styles.orderTotalBox}>
                        <span className={styles.totalLabel}>TOTAL DO PEDIDO:</span>
                        <strong className={styles.totalValue}>{order.total}</strong>
                      </div>
                    </div>

                    {/* RODAPÉ DO CARD: AÇÕES RÁPIDAS (DETALHES DA COMPRA & SUPORTE) */}
                    <div className={styles.orderCardFooterActions}>
                      <button 
                        onClick={() => setSelectedOrder(order)} 
                        className={styles.btnViewDetails}
                      >
                        <Eye size={15} />
                        <span>[ 👁 VER DETALHES DA COMPRA ]</span>
                      </button>

                      <button 
                        onClick={() => setSupportOrder(order)} 
                        className={styles.btnOrderSupport}
                      >
                        <MessageSquare size={15} />
                        <span>[ 💬 SUPORTE // AJUDA ]</span>
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ABA 02: DADOS PESSOAIS */}
          {activeTab === 'dados' && (
            <motion.div 
              key="tab-dados"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className={styles.tabSection}
            >
              <div className={styles.sectionHeaderFlex}>
                <div>
                  <h2 className={styles.sectionTitle}>DADOS PESSOAIS & CADASTRO DO PASSAPORTE</h2>
                  <p className={styles.sectionSub}>Mantenha seus dados atualizados para confirmações de compras e envios dos drops.</p>
                </div>
              </div>

              <form onSubmit={handleProfileSubmit} className={styles.formBrutal}>
                <div className={styles.formGrid2}>
                  
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>NOME COMPLETO *</label>
                    <div className={styles.inputWithIcon}>
                      <User size={16} className={styles.fieldIcon} />
                      <input 
                        type="text"
                        required
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        placeholder="EX: WESLLEY K."
                      />
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>E-MAIL DE NOTIFICAÇÃO *</label>
                    <div className={styles.inputWithIcon}>
                      <Mail size={16} className={styles.fieldIcon} />
                      <input 
                        type="email"
                        required
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        placeholder="seuemail@exemplo.com"
                      />
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>CPF (REGISTRO FISCAL) *</label>
                    <div className={styles.inputWithIcon}>
                      <CreditCard size={16} className={styles.fieldIcon} />
                      <input 
                        type="text"
                        required
                        value={profileForm.cpf}
                        onChange={(e) => setProfileForm({ ...profileForm, cpf: e.target.value })}
                        placeholder="000.000.000-00"
                      />
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>TELEFONE / WHATSAPP *</label>
                    <div className={styles.inputWithIcon}>
                      <Phone size={16} className={styles.fieldIcon} />
                      <input 
                        type="text"
                        required
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                  </div>

                </div>

                <div className={styles.formActionsBar}>
                  <button type="submit" className={styles.btnSavePrimary}>
                    <Save size={16} />
                    <span>[ SALVAR ALTERAÇÕES DADOS ]</span>
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ABA 03: ENDEREÇOS TÁTICOS */}
          {activeTab === 'enderecos' && (
            <motion.div 
              key="tab-enderecos"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className={styles.tabSection}
            >
              <div className={styles.sectionHeaderFlex}>
                <div>
                  <h2 className={styles.sectionTitle}>ENDEREÇOS SALVOS PARA ENTREGA</h2>
                  <p className={styles.sectionSub}>Os endereços cadastrados aqui se refletem automaticamente na etapa 02 do Checkout.</p>
                </div>

                <button onClick={handleOpenNewAddress} className={styles.btnAddAddress}>
                  <Plus size={16} />
                  <span>[ + CADASTRAR NOVO ENDEREÇO ]</span>
                </button>
              </div>

              <div className={styles.addressesGrid}>
                {addresses.map((addr) => (
                  <div key={addr.id} className={`${styles.addressCard} ${addr.isDefault ? styles.addressCardDefault : ''}`}>
                    
                    <div className={styles.addrHeaderBar}>
                      <div className={styles.addrLabelBox}>
                        <MapPin size={14} />
                        <strong>{addr.label || 'ENDEREÇO'}</strong>
                      </div>

                      {addr.isDefault ? (
                        <span className={styles.badgeDefault}>[ ENDEREÇO PRINCIPAL // PADRÃO ]</span>
                      ) : (
                        <button 
                          onClick={() => handleSetDefaultAddress(addr.id)} 
                          className={styles.btnSetDefault}
                        >
                          DEFINIR COMO PADRÃO
                        </button>
                      )}
                    </div>

                    <div className={styles.addrBody}>
                      <p className={styles.addrRecipient}><strong>{addr.nome}</strong></p>
                      <p className={styles.addrLine}>{addr.rua}, {addr.numero} {addr.complemento ? `— ${addr.complemento}` : ''}</p>
                      <p className={styles.addrLine}>{addr.bairro} — {addr.cidade}/{addr.estado}</p>
                      <p className={styles.addrCep}>CEP: <strong>{addr.cep}</strong></p>
                    </div>

                    <div className={styles.addrFooterActions}>
                      <button onClick={() => handleOpenEditAddress(addr)} className={styles.btnAddrAction}>
                        <Edit3 size={14} />
                        <span>EDITAR</span>
                      </button>

                      {addresses.length > 1 && (
                        <button onClick={() => handleDeleteAddress(addr.id)} className={`${styles.btnAddrAction} ${styles.btnAddrDelete}`}>
                          <Trash2 size={14} />
                          <span>EXCLUIR</span>
                        </button>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ABA 04: SEGURANÇA & ACESSO */}
          {activeTab === 'seguranca' && (
            <motion.div 
              key="tab-seguranca"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className={styles.tabSection}
            >
              <div className={styles.sectionHeaderFlex}>
                <div>
                  <h2 className={styles.sectionTitle}>SEGURANÇA DA CONTA & SENHA DE ACESSO</h2>
                  <p className={styles.sectionSub}>Altere suas credenciais de segurança e gerencie a sessão do seu Passaporte Ateliê.</p>
                </div>
              </div>

              <div className={styles.securityGrid}>
                {/* BLOCO DE TROCA DE SENHA */}
                <form onSubmit={handleSecuritySubmit} className={styles.formBrutal}>
                  <h3 className={styles.subSectionHeading}>
                    <Lock size={16} />
                    <span>ALTERAÇÃO DE SENHA</span>
                  </h3>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>SENHA ATUAL *</label>
                    <input 
                      type="password"
                      required
                      value={securityForm.currentPassword}
                      onChange={(e) => setSecurityForm({ ...securityForm, currentPassword: e.target.value })}
                      placeholder="••••••••••••"
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>NOVA SENHA *</label>
                    <input 
                      type="password"
                      required
                      value={securityForm.newPassword}
                      onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>CONFIRMAR NOVA SENHA *</label>
                    <input 
                      type="password"
                      required
                      value={securityForm.confirmPassword}
                      onChange={(e) => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })}
                      placeholder="Repita a nova senha"
                    />
                  </div>

                  <button type="submit" className={styles.btnSavePrimary}>
                    <ShieldCheck size={16} />
                    <span>[ ATUALIZAR SENHA DE ACESSO ]</span>
                  </button>
                </form>

                {/* BLOCO DE AÇÕES CRÍTICAS (LOGOUT & EXCLUSÃO) */}
                <div className={styles.logoutDangerCard}>
                  <div className={styles.dangerHeader}>
                    <AlertTriangle size={20} className={styles.dangerIcon} />
                    <div>
                      <h3 className={styles.dangerTitle}>GERENCIAMENTO DA SESSÃO E DA CONTA</h3>
                      <p className={styles.dangerText}>
                        Escolha uma das ações críticas abaixo para desconectar sua sessão atual ou encerrar definitivamente sua conta.
                      </p>
                    </div>
                  </div>

                  <div className={styles.criticalButtonsGroup}>
                    {/* OPÇÃO 01: LOGOUT */}
                    <button onClick={() => setShowLogoutModal(true)} className={styles.btnLogoutDanger}>
                      <LogOut size={16} />
                      <span>[ SAIR DA CONTA // DESCONECTAR SESSÃO ]</span>
                    </button>

                    {/* OPÇÃO 02: EXCLUIR CONTA */}
                    <button onClick={() => setShowDeleteModal(true)} className={styles.btnDeleteAccountDanger}>
                      <Trash2 size={16} />
                      <span>[ EXCLUIR CONTA DEFINITIVAMENTE ]</span>
                    </button>
                  </div>
                </div>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* MODAL 01: DETALHAMENTO COMPLETO DO PEDIDO (ORDER DETAILS MODAL) */}
      <AnimatePresence>
        {selectedOrder && (
          <div className={styles.modalOverlay} data-lenis-prevent>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={styles.orderDetailsModalCard}
            >
              {/* TOP HEADER */}
              <div className={styles.orderDetailsHeader}>
                <div className={styles.orderDetailsTitleGroup}>
                  <Package size={20} className={styles.headerIcon} />
                  <div>
                    <h3>DETALHAMENTO DA COMPRA #{selectedOrder.id}</h3>
                    <span className={styles.orderDateSub}>REALIZADO EM: {selectedOrder.date}</span>
                  </div>
                </div>

                <div className={styles.headerRightFlex}>
                  <div className={styles.orderStatusBadge} data-status={selectedOrder.statusType}>
                    {selectedOrder.statusType === 'shipping' && <Truck size={14} />}
                    {selectedOrder.statusType === 'delivered' && <CheckCircle2 size={14} />}
                    {selectedOrder.statusType === 'dispatched' && <Clock size={14} />}
                    <span>{selectedOrder.status}</span>
                  </div>

                  <button onClick={() => setSelectedOrder(null)} className={styles.btnCloseModal}>
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* CONTEÚDO DO MODAL DE DETALHES */}
              <div className={styles.orderDetailsBody}>
                
                {/* 1. SEÇÃO DE ITENS ADQUIRIDOS */}
                <div className={styles.detailSectionBox}>
                  <h4 className={styles.detailSectionHeading}>
                    <span>1. PEÇAS ADQUIRIDAS E LOTES NUMERADOS</span>
                  </h4>
                  <div className={styles.modalItemsList}>
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className={styles.modalItemRow}>
                        <img src={item.image} alt={item.title} className={styles.modalItemThumb} />
                        <div className={styles.modalItemInfo}>
                          <strong className={styles.modalItemTitle}>{item.title}</strong>
                          <div className={styles.modalItemMeta}>
                            <span>TAMANHO: {item.size}</span>
                            <span className={styles.modalLotTag}>LOTE EXCLUSIVO: {item.dropLot}</span>
                          </div>
                        </div>
                        <div className={styles.modalItemPrice}>{item.price}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. LINHA DO TEMPO DO RASTREIO (TIMELINE) */}
                <div className={styles.detailSectionBox}>
                  <h4 className={styles.detailSectionHeading}>
                    <span>2. STATUS E HISTÓRICO DE ENTREGA</span>
                  </h4>

                  <div className={styles.timelineContainer}>
                    {selectedOrder.timeline.map((stepItem, idx) => (
                      <div 
                        key={idx} 
                        className={`${styles.timelineStep} ${stepItem.done ? styles.stepDone : styles.stepPending}`}
                      >
                        <div className={styles.stepDotContainer}>
                          <div className={styles.stepDot}>
                            {stepItem.done ? <Check size={12} /> : <span>{stepItem.step}</span>}
                          </div>
                          {idx < selectedOrder.timeline.length - 1 && (
                            <div className={`${styles.stepLine} ${selectedOrder.timeline[idx + 1].done ? styles.lineDone : ''}`} />
                          )}
                        </div>

                        <div className={styles.stepContent}>
                          <span className={styles.stepTitle}>{stepItem.label}</span>
                          <span className={styles.stepDate}>{stepItem.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className={styles.trackingInfoBar}>
                    <span className={styles.trackLabel}>CÓDIGO DE RASTREIO SEDEX:</span>
                    <code className={styles.trackCode}>{selectedOrder.trackingCode}</code>
                    <button 
                      onClick={() => handleCopyTracking(selectedOrder.trackingCode)}
                      className={styles.btnCopyTrack}
                    >
                      {copiedTracking === selectedOrder.trackingCode ? (
                        <>
                          <Check size={14} color="#000000" />
                          <span>COPIADO!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>COPIAR</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 3. RESUMO FINANCEIRO E PAGAMENTO & ENDEREÇO (2 COLUNAS) */}
                <div className={styles.detailsGrid2}>
                  
                  {/* FINANCEIRO E PAGAMENTO */}
                  <div className={styles.detailSectionBox}>
                    <h4 className={styles.detailSectionHeading}>
                      <span>3. RESUMO FINANCEIRO & PAGAMENTO</span>
                    </h4>

                    <div className={styles.financialRows}>
                      <div className={styles.finRow}>
                        <span>SUBTOTAL DAS PEÇAS:</span>
                        <strong>{selectedOrder.subtotal}</strong>
                      </div>
                      <div className={styles.finRow}>
                        <span>DESCONTO APLICADO:</span>
                        <strong className={styles.discountVal}>{selectedOrder.discount}</strong>
                      </div>
                      <div className={styles.finRow}>
                        <span>FRETE ({selectedOrder.shippingMethod}):</span>
                        <strong>{selectedOrder.shippingCost}</strong>
                      </div>
                      <div className={`${styles.finRow} ${styles.finTotalRow}`}>
                        <span>VALOR TOTAL PAGO:</span>
                        <strong className={styles.finTotalVal}>{selectedOrder.total}</strong>
                      </div>
                    </div>

                    <div className={styles.paymentMethodBlock}>
                      <span className={styles.paymentMetaLabel}>FORMA DE PAGAMENTO UTILIZADA:</span>
                      <strong className={styles.paymentMethodTitle}>
                        <CreditCard size={14} />
                        <span>{selectedOrder.paymentMethod}</span>
                      </strong>
                      <p className={styles.paymentDetailsText}>{selectedOrder.paymentDetails}</p>
                    </div>
                  </div>

                  {/* ENDEREÇO DE DESPACHO */}
                  <div className={styles.detailSectionBox}>
                    <h4 className={styles.detailSectionHeading}>
                      <span>4. ENDEREÇO DE DESPACHO DA ENCOMENDA</span>
                    </h4>

                    <div className={styles.addressDetailBox}>
                      <div className={styles.addressHeaderLabel}>
                        <MapPin size={14} />
                        <strong>DESTINATÁRIO: {selectedOrder.address.nome}</strong>
                      </div>
                      <p>{selectedOrder.address.rua}, {selectedOrder.address.numero} {selectedOrder.address.complemento ? `— ${selectedOrder.address.complemento}` : ''}</p>
                      <p>{selectedOrder.address.bairro} — {selectedOrder.address.cidade}/{selectedOrder.address.estado}</p>
                      <p>CEP: <strong>{selectedOrder.address.cep}</strong></p>
                    </div>

                    <div className={styles.supportHelpBoxModal}>
                      <HelpCircle size={16} />
                      <div>
                        <strong>DÚVIDAS OU ALTERAÇÕES DE DESTINO?</strong>
                        <p>Entre em contato com nossa equipe tática para suporte de frete.</p>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              {/* FOOTER DO MODAL DE DETALHES */}
              <div className={styles.orderDetailsFooter}>
                <button 
                  onClick={() => {
                    const current = selectedOrder;
                    setSelectedOrder(null);
                    setSupportOrder(current);
                  }}
                  className={styles.btnModalOrderSupport}
                >
                  <MessageSquare size={16} />
                  <span>[ 💬 SOLICITAR TROCA OU AJUDA COM ESTE PEDIDO ]</span>
                </button>

                <button 
                  onClick={() => setSelectedOrder(null)} 
                  className={styles.btnCancelModal}
                >
                  FECHAR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 02: SUPORTE DIRETO & ATENDIMENTO DO PEDIDO */}
      <AnimatePresence>
        {supportOrder && (
          <div className={styles.modalOverlay} data-lenis-prevent>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={styles.modalSupportCard}
            >
              <div className={styles.modalHeader}>
                <div className={styles.supportTitleBox}>
                  <MessageSquare size={20} color="#000000" />
                  <h3>SUPORTE & ATENDIMENTO TÁTICO ATELIÊ</h3>
                </div>
                <button onClick={() => setSupportOrder(null)} className={styles.btnCloseModal}>
                  <X size={20} />
                </button>
              </div>

              <div className={styles.supportBodyContent}>
                <div className={styles.supportOrderBadgeBar}>
                  <span>ATENDIMENTO PARA O PEDIDO:</span>
                  <strong>#{supportOrder.id}</strong>
                  <span className={styles.orderDateSub}>({supportOrder.date})</span>
                </div>

                <p className={styles.supportIntroText}>
                  Escolha um dos canais rápidos abaixo para tirar dúvidas, solicitar troca de tamanho ou falar diretamente com a equipe do Ateliê:
                </p>

                <div className={styles.supportOptionsGrid}>
                  
                  {/* OPÇÃO 01: WHATSAPP */}
                  <button 
                    onClick={() => handleOpenWhatsappSupport(supportOrder.id)}
                    className={styles.btnSupportOptionPrimary}
                  >
                    <MessageSquare size={18} />
                    <div className={styles.btnOptionText}>
                      <strong>FAÇO UM ATENDIMENTO DIRETO NO WHATSAPP</strong>
                      <span>Abertura imediata com o número #{supportOrder.id} pré-preenchido</span>
                    </div>
                    <ChevronRight size={18} />
                  </button>

                  {/* OPÇÃO 02: SOLICITAR TROCA */}
                  <button 
                    onClick={() => {
                      showToast(`✓ Solicitação de troca registrada para o Pedido #${supportOrder.id}. Nossa equipe entrará em contato via E-mail.`);
                      setSupportOrder(null);
                    }}
                    className={styles.btnSupportOptionSecondary}
                  >
                    <HelpCircle size={18} />
                    <div className={styles.btnOptionText}>
                      <strong>SOLICITAR TROCA DE TAMANHO OU DEVOLUÇÃO</strong>
                      <span>Registrar protocolo de troca para as peças deste pedido</span>
                    </div>
                    <ChevronRight size={18} />
                  </button>

                </div>
              </div>

              <div className={styles.modalActions}>
                <button onClick={() => setSupportOrder(null)} className={styles.btnCancelModal}>
                  FECHAR SUPORTE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL PARA CADASTRAR/EDITAR ENDEREÇO */}
      <AnimatePresence>
        {showAddressModal && (
          <div className={styles.modalOverlay} data-lenis-prevent>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={styles.modalCard}
            >
              <div className={styles.modalHeader}>
                <h3>{editingAddress ? 'EDITAR ENDEREÇO TÁTICO' : 'CADASTRAR NOVO ENDEREÇO'}</h3>
                <button onClick={() => setShowAddressModal(false)} className={styles.btnCloseModal}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveAddress} className={styles.modalForm}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>NOME DO ENDEREÇO (EX: CASA, TRABALHO)</label>
                  <input 
                    type="text" 
                    required 
                    value={addressForm.label} 
                    onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                    placeholder="EX: CASA / ESTÚDIO"
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>NOME DO DESTINATÁRIO *</label>
                  <input 
                    type="text" 
                    required 
                    value={addressForm.nome} 
                    onChange={(e) => setAddressForm({ ...addressForm, nome: e.target.value })}
                    placeholder="Nome completo do recebedor"
                  />
                </div>

                <div className={styles.inputGrid2}>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>CEP *</label>
                    <input 
                      type="text" 
                      required 
                      value={addressForm.cep} 
                      onChange={(e) => setAddressForm({ ...addressForm, cep: e.target.value })}
                      placeholder="00000-000"
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>BAIRRO *</label>
                    <input 
                      type="text" 
                      required 
                      value={addressForm.bairro} 
                      onChange={(e) => setAddressForm({ ...addressForm, bairro: e.target.value })}
                      placeholder="Bairro"
                    />
                  </div>
                </div>

                <div className={styles.inputGrid3}>
                  <div className={styles.inputGroupCol2}>
                    <label className={styles.inputLabel}>LOGRADOURO / RUA *</label>
                    <input 
                      type="text" 
                      required 
                      value={addressForm.rua} 
                      onChange={(e) => setAddressForm({ ...addressForm, rua: e.target.value })}
                      placeholder="Rua, Alameda, Av..."
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>NÚMERO *</label>
                    <input 
                      type="text" 
                      required 
                      value={addressForm.numero} 
                      onChange={(e) => setAddressForm({ ...addressForm, numero: e.target.value })}
                      placeholder="123"
                    />
                  </div>
                </div>

                <div className={styles.inputGrid2}>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>COMPLEMENTO</label>
                    <input 
                      type="text" 
                      value={addressForm.complemento} 
                      onChange={(e) => setAddressForm({ ...addressForm, complemento: e.target.value })}
                      placeholder="Apt 82, Bloco B..."
                    />
                  </div>

                  <div className={styles.inputGrid2Inner}>
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>CIDADE *</label>
                      <input 
                        type="text" 
                        required 
                        value={addressForm.cidade} 
                        onChange={(e) => setAddressForm({ ...addressForm, cidade: e.target.value })}
                        placeholder="São Paulo"
                      />
                    </div>

                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>UF *</label>
                      <input 
                        type="text" 
                        required 
                        value={addressForm.estado} 
                        onChange={(e) => setAddressForm({ ...addressForm, estado: e.target.value.toUpperCase() })}
                        maxLength={2}
                        placeholder="SP"
                      />
                    </div>
                  </div>
                </div>

                <label className={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    checked={addressForm.isDefault} 
                    onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                  />
                  <span>DEFINIR COMO ENDEREÇO PRINCIPAL PARA ENTREGAS</span>
                </label>

                <div className={styles.modalActions}>
                  <button type="button" onClick={() => setShowAddressModal(false)} className={styles.btnCancelModal}>
                    CANCELAR
                  </button>
                  <button type="submit" className={styles.btnSubmitModal}>
                    [ SALVAR ENDEREÇO ]
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE CONFIRMAÇÃO DE LOGOUT */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className={styles.modalOverlay} data-lenis-prevent>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={styles.modalConfirmCard}
            >
              <div className={styles.confirmIconBox}>
                <AlertTriangle size={32} color="#000000" />
              </div>
              <h3>DESCONECTAR SESSÃO?</h3>
              <p>Você precisará autenticar seu Passaporte novamente para acessar compras e rastreios VIP.</p>
              
              <div className={styles.confirmActions}>
                <button onClick={() => setShowLogoutModal(false)} className={styles.btnCancelModal}>
                  CONTINUAR CONECTADO
                </button>
                <button 
                  onClick={() => {
                    setShowLogoutModal(false);
                    logout();
                    navigate('/');
                  }} 
                  className={styles.btnConfirmLogout}
                >
                  [ SIM, SAIR DA CONTA ]
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE CONTA */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className={styles.modalOverlay} data-lenis-prevent>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={styles.modalDeleteCard}
            >
              <div className={styles.deleteIconBox}>
                <Trash2 size={32} color="#FFFFFF" />
              </div>
              <h3>EXCLUIR CONTA DEFINITIVAMENTE?</h3>
              <p>
                <strong>ATENÇÃO: ESTA AÇÃO É IRREVERSÍVEL.</strong><br />
                O seu Passaporte Ateliê, histórico de pedidos e endereços cadastrados serão excluídos permanentemente do sistema.
              </p>
              
              <div className={styles.confirmActions}>
                <button onClick={() => setShowDeleteModal(false)} className={styles.btnCancelModal}>
                  CANCELAR // MANTER CONTA
                </button>
                <button 
                  onClick={() => {
                    setShowDeleteModal(false);
                    deleteAccount();
                    navigate('/');
                  }} 
                  className={styles.btnConfirmDeleteFinal}
                >
                  [ SIM, EXCLUIR CONTA DEFINITIVAMENTE ]
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default Perfil;
