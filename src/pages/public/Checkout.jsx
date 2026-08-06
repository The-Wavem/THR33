import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, MapPin, CreditCard, QrCode, CheckCircle2, ArrowRight, Truck } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import styles from './Checkout.module.css';

export function Checkout() {
  const navigate = useNavigate();
  const { cartItems, subtotal, discountAmount, total, clearCart } = useCart();

  const [step, setStep] = useState(1); // 1: Resumo, 2: Endereço, 3: Pagamento, 4: Sucesso
  const [paymentMethod, setPaymentMethod] = useState('pix');

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
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
            
            {/* ETAPA 1: RESUMO DOS ITENS */}
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

                <button onClick={() => setStep(2)} className={styles.btnNextStep}>
                  <span>PROSSEGUIR PARA O ENDEREÇO</span>
                  <ArrowRight size={16} />
                </button>
              </motion.div>
            )}

            {/* ETAPA 2: ENDEREÇO DE ENTREGA */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.stepCard}>
                <div className={styles.stepCardHeader}>
                  <MapPin size={18} />
                  <h3>ENDEREÇO DE DESPACHO</h3>
                </div>

                <div className={styles.formGrid}>
                  <input type="text" name="nome" placeholder="NOME COMPLETO" value={formData.nome} onChange={handleInputChange} className={styles.inputFull} />
                  <input type="email" name="email" placeholder="E-MAIL DE NOTIFICAÇÃO" value={formData.email} onChange={handleInputChange} className={styles.inputHalf} />
                  <input type="text" name="cpf" placeholder="CPF DO TITULAR" value={formData.cpf} onChange={handleInputChange} className={styles.inputHalf} />
                  
                  <input type="text" name="cep" placeholder="CEP (EX: 01310-100)" value={formData.cep} onChange={handleInputChange} className={styles.inputThird} />
                  <input type="text" name="rua" placeholder="ENDEREÇO / LOGRADOURO" value={formData.rua} onChange={handleInputChange} className={styles.inputTwoThirds} />
                  
                  <input type="text" name="numero" placeholder="Nº" value={formData.numero} onChange={handleInputChange} className={styles.inputThird} />
                  <input type="text" name="bairro" placeholder="BAIRRO" value={formData.bairro} onChange={handleInputChange} className={styles.inputThird} />
                  <input type="text" name="cidade" placeholder="CIDADE" value={formData.cidade} onChange={handleInputChange} className={styles.inputThird} />
                </div>

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
                    <p>O QR Code PIX será gerado imediatamente após a confirmação.</p>
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
                  <strong className={styles.freeTag}>GRÁTIS EXPRESSO</strong>
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
    </div>
  );
}

export default Checkout;
