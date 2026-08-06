import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  MapPin, 
  CreditCard, 
  QrCode, 
  CheckCircle2, 
  ArrowRight, 
  Truck,
  Plus,
  Lock,
  User,
  Check,
  X
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import styles from './Checkout.module.css';

// ENDEREÇOS DE EXEMPLO SALVOS NO PERFIL DO USUÁRIO
const MOCK_SAVED_ADDRESSES = [
  {
    id: 'addr-1',
    isDefault: true,
    nome: 'Usuário Ateliê',
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
    nome: 'Usuário Ateliê (Estúdio)',
    cep: '05409-000',
    rua: 'Rua Fradique Coutinho',
    numero: '350',
    complemento: 'Conj 12',
    bairro: 'Pinheiros',
    cidade: 'São Paulo',
    estado: 'SP'
  }
];

export function Checkout({ user, onOpenAuthModal }) {
  const navigate = useNavigate();
  const { 
    cartItems, 
    subtotal, 
    discountAmount, 
    shippingPrice, 
    total, 
    clearCart,
    selectedShippingOption,
    setSelectedShippingOption,
    FREE_SHIPPING_THRESHOLD
  } = useCart();

  const [step, setStep] = useState(1); // 1: Resumo, 2: Endereço, 3: Pagamento, 4: Sucesso
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [showAuthGateModal, setShowAuthGateModal] = useState(false);

  // SIMULAÇÃO DE FRETE (ETAPA 1)
  const [cepInput, setCepInput] = useState('01418-100');
  const [calculatedShipping, setCalculatedShipping] = useState(true);

  // ENDEREÇOS SALVOS & SELEÇÃO (ETAPA 2)
  const [selectedAddressId, setSelectedAddressId] = useState('addr-1');
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);

  const [formData, setFormData] = useState({
    nome: user?.name || '',
    email: user?.email || '',
    cpf: '',
    cep: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: 'São Paulo',
    estado: 'SP'
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // CÁLCULO TÁTICO DE FRETE
  const handleCalculateCep = (e) => {
    e.preventDefault();
    if (cepInput.trim().length >= 8) {
      setCalculatedShipping(true);
      // Auto-seleciona SEDEX ou Frete Grátis se elegível
      if (subtotal >= FREE_SHIPPING_THRESHOLD) {
        setSelectedShippingOption({
          id: 'free',
          title: 'FRETE GRÁTIS EXPRESSO',
          price: 0,
          days: '1 a 2 dias úteis'
        });
      } else {
        setSelectedShippingOption({
          id: 'sedex',
          title: 'SEDEX EXPRESSO',
          price: 24.90,
          days: '1 a 2 dias úteis'
        });
      }
    }
  };

  // NAVEGAÇÃO INTERCEPTADA (AUTH GATEKEEPER)
  const handleAdvanceToAddress = () => {
    if (!user) {
      setShowAuthGateModal(true);
      return;
    }
    // Se o usuário não calculou o frete ainda, seleciona PAC por padrão
    if (!selectedShippingOption) {
      if (subtotal >= FREE_SHIPPING_THRESHOLD) {
        setSelectedShippingOption({
          id: 'free',
          title: 'FRETE GRÁTIS EXPRESSO',
          price: 0,
          days: '1 a 2 dias úteis'
        });
      } else {
        setSelectedShippingOption({
          id: 'pac',
          title: 'PAC PADRÃO',
          price: 14.90,
          days: '4 a 6 dias úteis'
        });
      }
    }
    setStep(2);
  };

  const handleFinishOrder = () => {
    setStep(4);
    clearCart();
  };

  if (cartItems.length === 0 && step !== 4) {
    return (
      <div className={styles.emptyCheckoutContainer}>
        <h2>SEU CARRINHO ESTÁ VAZIO</h2>
        <p>Adicione peças ao carrinho antes de prosseguir para o checkout.</p>
        <button onClick={() => navigate('/catalogo')} className={styles.btnBackCatalog}>
          VOLTAR AO CATÁLOGO
        </button>
      </div>
    );
  }

  const shippingOptionsList = [
    ...(subtotal >= FREE_SHIPPING_THRESHOLD ? [{
      id: 'free',
      title: 'FRETE GRÁTIS EXPRESSO',
      price: 0,
      days: '1 a 2 dias úteis'
    }] : []),
    {
      id: 'sedex',
      title: 'SEDEX EXPRESSO',
      price: 24.90,
      days: '1 a 2 dias úteis'
    },
    {
      id: 'pac',
      title: 'PAC PADRÃO',
      price: 14.90,
      days: '4 a 6 dias úteis'
    }
  ];

  return (
    <div className={styles.checkoutPage}>
      <div className={styles.container}>
        
        {/* STEPPER BAR HEADER */}
        <div className={styles.stepperHeader}>
          {[
            { num: 1, label: '01. RESUMO DA ORDEM' },
            { num: 2, label: '02. ENDEREÇO TÁTICO' },
            { num: 3, label: '03. PAGAMENTO SECURE' }
          ].map((s) => (
            <div 
              key={s.num} 
              className={`${styles.stepPill} ${step === s.num ? styles.stepActive : ''} ${step > s.num ? styles.stepCompleted : ''}`}
            >
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        <div className={styles.mainGrid}>
          
          {/* PAINEL DA ESQUERDA: FORMULÁRIOS DAS ETAPAS */}
          <div className={styles.formCol}>
            
            {/* ETAPA 1: RESUMO DOS ITENS + SIMULADOR DE CEP */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.stepCard}>
                <h3>CONFERÊNCIA DOS ITENS DO PEDIDO</h3>
                
                <div className={styles.itemsReviewList}>
                  {cartItems.map((item) => (
                    <div key={`${item.id}-${item.selectedSize}`} className={styles.itemReviewRow}>
                      <img src={item.image} alt={item.title} className={styles.reviewThumb} />
                      <div className={styles.reviewInfo}>
                        <strong>{item.title}</strong>
                        <span>TAMANHO: {item.selectedSize} // QTY: {item.quantity}</span>
                      </div>
                      <strong>R$ {(item.priceNum * item.quantity).toFixed(2)}</strong>
                    </div>
                  ))}
                </div>

                {/* CALCULADORA TÁTICA DE FRETE */}
                <div className={styles.shippingCalculatorBox}>
                  <div className={styles.shippingHeader}>
                    <Truck size={18} />
                    <h4>CÁLCULO PRELIMINAR DE FRETE & DESPACHO</h4>
                  </div>

                  <form onSubmit={handleCalculateCep} className={styles.cepFormRow}>
                    <input 
                      type="text" 
                      placeholder="DIGITE SEU CEP (EX: 01418-100)"
                      value={cepInput}
                      onChange={(e) => setCepInput(e.target.value)}
                      className={styles.inputCep}
                    />
                    <button type="submit" className={styles.btnCalcCep}>
                      CALCULAR
                    </button>
                  </form>

                  {calculatedShipping && (
                    <div className={styles.shippingOptionsList}>
                      <span className={styles.shippingListTitle}>OPÇÕES DE ENTREGA DISPONÍVEIS PARA [{cepInput}]:</span>
                      
                      {shippingOptionsList.map((opt) => {
                        const isSelected = selectedShippingOption?.id === opt.id;
                        return (
                          <div 
                            key={opt.id}
                            onClick={() => setSelectedShippingOption(opt)}
                            className={`${styles.shippingOptionCard} ${isSelected ? styles.shippingOptionSelected : ''}`}
                          >
                            <div className={styles.shippingRadio}>
                              <div className={isSelected ? styles.radioDotActive : styles.radioDot} />
                            </div>
                            <div className={styles.shippingInfoGroup}>
                              <strong>{opt.title}</strong>
                              <span>PRAZO: {opt.days}</span>
                            </div>
                            <strong className={styles.shippingPriceText}>
                              {opt.price === 0 ? 'GRÁTIS' : `R$ ${opt.price.toFixed(2)}`}
                            </strong>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button onClick={handleAdvanceToAddress} className={styles.btnNextStep}>
                  <span>PROSSEGUIR PARA O ENDEREÇO</span>
                  <ArrowRight size={16} />
                </button>
              </motion.div>
            )}

            {/* ETAPA 2: GESTÃO TÁTICA DE ENDEREÇOS (CARDS OU FORMULÁRIO MANAL) */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.stepCard}>
                <div className={styles.stepCardHeader}>
                  <MapPin size={18} />
                  <h3>ENDEREÇO DE DESPACHO TÁTICO</h3>
                </div>

                {/* ENDEREÇOS SALVOS DO USUÁRIO LOGADO */}
                {user && !showNewAddressForm ? (
                  <div className={styles.savedAddressesContainer}>
                    <p className={styles.savedAddressesHint}>SELEÇÃO DE ENDEREÇO DE ENTREGA:</p>
                    
                    <div className={styles.addressesGrid}>
                      {MOCK_SAVED_ADDRESSES.map((addr) => {
                        const isSelected = selectedAddressId === addr.id;
                        return (
                          <div 
                            key={addr.id}
                            onClick={() => setSelectedAddressId(addr.id)}
                            className={`${styles.addressCardTile} ${isSelected ? styles.addressTileSelected : ''}`}
                          >
                            <div className={styles.addressTileHeader}>
                              <strong>{addr.nome}</strong>
                              {addr.isDefault && <span className={styles.defaultBadge}>[ ENDEREÇO PADRÃO ]</span>}
                            </div>
                            <p className={styles.addressText}>
                              {addr.rua}, {addr.numero} {addr.complemento && `- ${addr.complemento}`}
                              <br />
                              {addr.bairro} • {addr.cidade} - {addr.estado}
                              <br />
                              <strong>CEP: {addr.cep}</strong>
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <button 
                      onClick={() => setShowNewAddressForm(true)}
                      className={styles.btnAddNewAddress}
                    >
                      <Plus size={16} />
                      <span>CADASTRAR NOVO ENDEREÇO</span>
                    </button>
                  </div>
                ) : (
                  /* FORMULÁRIO MANUL / NOVO ENDEREÇO */
                  <div className={styles.manualAddressFormArea}>
                    {user && (
                      <button 
                        onClick={() => setShowNewAddressForm(false)} 
                        className={styles.btnBackSavedAddresses}
                      >
                        ← USAR ENDEREÇO SALVO DO PERFIL
                      </button>
                    )}

                    <div className={styles.formGrid}>
                      <input 
                        type="text" 
                        name="nome" 
                        placeholder="NOME COMPLETO" 
                        value={formData.nome} 
                        onChange={handleInputChange} 
                        className={styles.inputFull} 
                      />
                      <input 
                        type="email" 
                        name="email" 
                        placeholder="E-MAIL DE NOTIFICAÇÃO" 
                        value={formData.email} 
                        onChange={handleInputChange} 
                        className={styles.inputHalf} 
                      />
                      <input 
                        type="text" 
                        name="cpf" 
                        placeholder="CPF DO TITULAR" 
                        value={formData.cpf} 
                        onChange={handleInputChange} 
                        className={styles.inputHalf} 
                      />
                      
                      <input 
                        type="text" 
                        name="cep" 
                        placeholder="CEP (EX: 01310-100)" 
                        value={formData.cep} 
                        onChange={handleInputChange} 
                        className={styles.inputThird} 
                      />
                      <input 
                        type="text" 
                        name="rua" 
                        placeholder="ENDEREÇO / LOGRADOURO" 
                        value={formData.rua} 
                        onChange={handleInputChange} 
                        className={styles.inputTwoThirds} 
                      />
                      
                      <input 
                        type="text" 
                        name="numero" 
                        placeholder="Nº" 
                        value={formData.numero} 
                        onChange={handleInputChange} 
                        className={styles.inputThird} 
                      />
                      <input 
                        type="text" 
                        name="bairro" 
                        placeholder="BAIRRO" 
                        value={formData.bairro} 
                        onChange={handleInputChange} 
                        className={styles.inputThird} 
                      />
                      <input 
                        type="text" 
                        name="cidade" 
                        placeholder="CIDADE" 
                        value={formData.cidade} 
                        onChange={handleInputChange} 
                        className={styles.inputThird} 
                      />
                    </div>
                  </div>
                )}

                <div className={styles.stepBtnRow}>
                  <button onClick={() => setStep(1)} className={styles.btnBackStep}>VOLTAR</button>
                  <button onClick={() => setStep(3)} className={styles.btnNextStep}>IR PARA PAGAMENTO</button>
                </div>
              </motion.div>
            )}

            {/* ETAPA 3: PAGAMENTO SECURE */}
            {step === 3 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.stepCard}>
                <div className={styles.stepCardHeader}>
                  <CreditCard size={18} />
                  <h3>MÉTODO DE PAGAMENTO</h3>
                </div>

                <div className={styles.paymentMethodsGrid}>
                  <button 
                    onClick={() => setPaymentMethod('pix')}
                    className={paymentMethod === 'pix' ? styles.methodActive : styles.methodBtn}
                  >
                    <QrCode size={20} />
                    <span>PIX INSTANTÂNEO (-5% OFF)</span>
                  </button>

                  <button 
                    onClick={() => setPaymentMethod('card')}
                    className={paymentMethod === 'card' ? styles.methodActive : styles.methodBtn}
                  >
                    <CreditCard size={20} />
                    <span>CARTÃO DE CRÉDITO (ATÉ 6X)</span>
                  </button>
                </div>

                {paymentMethod === 'pix' ? (
                  <div className={styles.pixBox}>
                    <p>O QR Code PIX será gerado imediatamente após a confirmação com 5% de desconto exclusivo.</p>
                  </div>
                ) : (
                  <div className={styles.cardForm}>
                    <input type="text" placeholder="NÚMERO DO CARTÃO" className={styles.inputFull} />
                    <input type="text" placeholder="NOME IMPRESSO NO CARTÃO" className={styles.inputFull} />
                    <input type="text" placeholder="MM/AA" className={styles.inputHalf} />
                    <input type="text" placeholder="CVV" className={styles.inputHalf} />
                  </div>
                )}

                <div className={styles.stepBtnRow}>
                  <button onClick={() => setStep(2)} className={styles.btnBackStep}>VOLTAR</button>
                  <button onClick={handleFinishOrder} className={styles.btnFinishOrder}>
                    <ShieldCheck size={18} />
                    <span>FINALIZAR E PAGAR R$ {total.toFixed(2)}</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* ETAPA 4: CONFIRMAÇÃO DE SUCESSO */}
            {step === 4 && (
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={styles.successCard}>
                <CheckCircle2 size={48} className={styles.successIcon} />
                <h2>PEDIDO #0482 CONFIRMADO COM SUCESSO</h2>
                <p>O comprovante e o código de rastreio serão enviados para o seu e-mail.</p>
                <button onClick={() => navigate('/catalogo')} className={styles.btnBackCatalog}>
                  VOLTAR AO CATÁLOGO GERAL
                </button>
              </motion.div>
            )}

          </div>

          {/* PAINEL DA DIREITA: RESUMO DE VALORES FIXO */}
          {step !== 4 && (
            <div className={styles.summaryCol}>
              <div className={styles.summaryCard}>
                <h3>RESUMO DA COMPRA</h3>
                <div className={styles.summaryDivider} />

                <div className={styles.summaryRow}>
                  <span>SUBTOTAL:</span>
                  <strong>R$ {subtotal.toFixed(2)}</strong>
                </div>

                {discountAmount > 0 && (
                  <div className={styles.summaryRowDiscount}>
                    <span>DESCONTO APLICADO:</span>
                    <strong>- R$ {discountAmount.toFixed(2)}</strong>
                  </div>
                )}

                <div className={styles.summaryRow}>
                  <span>FRETE DESPACHO:</span>
                  <strong>
                    {selectedShippingOption 
                      ? (selectedShippingOption.price === 0 ? 'GRÁTIS' : `R$ ${selectedShippingOption.price.toFixed(2)}`)
                      : 'A CALCULAR'}
                  </strong>
                </div>

                <div className={styles.summaryDivider} />

                <div className={styles.totalRow}>
                  <span>VALOR TOTAL:</span>
                  <strong className={styles.totalVal}>R$ {total.toFixed(2)}</strong>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* GATEKEEPER / AUTH INTERCEPTOR MODAL BRUTALISTA */}
      <AnimatePresence>
        {showAuthGateModal && (
          <div className={styles.modalOverlay} onClick={() => setShowAuthGateModal(false)}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={styles.authModalBox}
            >
              <button 
                onClick={() => setShowAuthGateModal(false)} 
                className={styles.btnCloseModal}
              >
                <X size={18} />
              </button>

              <div className={styles.authModalHeader}>
                <Lock size={20} />
                <span>IDENTIFICAÇÃO NECESSÁRIA // CONTA ATELIÊ REQUERIDA</span>
              </div>

              <h3>ACESSO RESTRITO // CHECKOUT PRIVADO</h3>
              <p className={styles.authModalDesc}>
                Para associar seu pedido, calcular os pontos do clube de vantagens e acompanhar a entrega em tempo real, acesse sua conta do Ateliê THR33 ou crie um novo cadastro.
              </p>

              <div className={styles.authModalActions}>
                <button 
                  onClick={() => {
                    setShowAuthGateModal(false);
                    if (onOpenAuthModal) onOpenAuthModal('/checkout', 'login');
                  }} 
                  className={styles.btnAuthPrimary}
                >
                  <User size={16} />
                  <span>01. ENTRAR NA CONTA</span>
                </button>

                <button 
                  onClick={() => {
                    setShowAuthGateModal(false);
                    if (onOpenAuthModal) onOpenAuthModal('/checkout', 'register');
                  }} 
                  className={styles.btnAuthSecondary}
                >
                  <span>02. CRIAR CONTA ATELIÊ</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default Checkout;
