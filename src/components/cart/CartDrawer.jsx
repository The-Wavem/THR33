import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ArrowRight, 
  Tag, 
  CheckCircle2, 
  AlertCircle,
  Loader2 
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import styles from './CartDrawer.module.css';

export function CartDrawer() {
  const {
    cartItems,
    isCartOpen,
    closeCart,
    removeFromCart,
    updateQuantity,
    subtotal,
    discountAmount,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    couponFeedback,
    validatingCoupon,
    total,
    totalItemsCount
  } = useCart();

  const [couponInput, setCouponInput] = useState('');
  const itemsListRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // BLOQUEIO TOTAL E INFALÍVEL DO EIXO Y (RODAGEM DO MOUSE / TOUCH / TECLADO)
  useEffect(() => {
    if (isCartOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalTouchAction = document.body.style.touchAction;

      // Trava os containers raiz
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

      // Intercepta e bloqueia a rolagem da bolinha do mouse na página de fundo
      const preventBackgroundScroll = (e) => {
        if (!itemsListRef.current) {
          e.preventDefault();
          return;
        }

        const isInsideList = itemsListRef.current.contains(e.target);
        if (!isInsideList) {
          e.preventDefault();
        }
      };

      window.addEventListener('wheel', preventBackgroundScroll, { passive: false });
      window.addEventListener('touchmove', preventBackgroundScroll, { passive: false });

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.touchAction = originalTouchAction;
        window.removeEventListener('wheel', preventBackgroundScroll);
        window.removeEventListener('touchmove', preventBackgroundScroll);
      };
    }
  }, [isCartOpen]);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (couponInput.trim()) {
      const success = await applyCoupon(couponInput.trim());
      if (success) {
        setCouponInput('');
      }
    }
  };

  const handleGoToCheckout = () => {
    closeCart();
    if (!user) {
      navigate('/auth', { 
        state: { 
          from: '/checkout', 
          tab: 'login',
          message: 'Faça login ou crie sua conta para finalizar o pedido com segurança.' 
        } 
      });
    } else {
      navigate('/checkout');
    }
  };

  const getItemPrice = (item) => {
    const p = typeof item.price === 'number' && !isNaN(item.price) 
      ? item.price 
      : parseFloat(String(item.price || 0).replace(/[^\d.,]/g, '').replace(',', '.')) || 189.90;
    const q = Number(item.quantity) || 1;
    return (p * q).toFixed(2);
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <div 
          className={styles.backdrop} 
          onClick={closeCart}
          onWheel={(e) => e.stopPropagation()}
        >
          <motion.aside
            className={styles.drawer}
            onClick={(e) => e.stopPropagation()}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            aria-label="Carrinho de Compras"
          >
            {/* Header do Drawer */}
            <header className={styles.header} onWheel={(e) => e.preventDefault()}>
              <div className={styles.headerTitleGroup}>
                <ShoppingBag size={18} />
                <h2 className={styles.title}>SEU CARRINHO [{String(totalItemsCount).padStart(2, '0')}]</h2>
              </div>
              <button 
                onClick={closeCart} 
                className={styles.closeBtn} 
                aria-label="Fechar Carrinho"
              >
                <X size={20} />
              </button>
            </header>

            {/* Lista de Itens com Scroll Isolado */}
            <div className={styles.itemsList} ref={itemsListRef}>
              {cartItems.length === 0 ? (
                <div className={styles.emptyCart}>
                  <div className={styles.emptyIconCircle}>
                    <ShoppingBag size={32} />
                  </div>
                  <h3 className={styles.emptyTitle}>SUA SACOLA ESTÁ VAZIA</h3>
                  <p className={styles.emptyText}>Você ainda não adicionou nenhuma peça do ateliê à sua sacola.</p>
                  <Link to="/catalogo" onClick={closeCart} className={styles.shopBtn}>
                    <span>EXPLORAR CATÁLOGO</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              ) : (
                cartItems.map((item) => (
                  <article key={`${item.id}-${item.size}-${item.color?.id || 'default'}`} className={styles.itemCard}>
                    <img src={item.image} alt={item.name} className={styles.itemImage} />
                    <div className={styles.itemDetails}>
                      <div className={styles.itemMeta}>
                        <strong className={styles.itemName}>{item.name}</strong>
                        <span className={styles.itemFit}>
                          Tam: <strong>{item.size}</strong> {item.color?.name && `• Cor: ${item.color.name}`}
                        </span>
                      </div>
                      
                      <div className={styles.itemPriceRow}>
                        <span className={styles.itemPrice}>R$ {getItemPrice(item)}</span>
                      </div>
                      
                      <div className={styles.controlsRow}>
                        <div className={styles.qtyPicker}>
                          <button 
                            type="button"
                            onClick={() => updateQuantity(item.id, item.size, -1, item.color?.id)}
                            aria-label="Diminuir quantidade"
                          >
                            <Minus size={12} />
                          </button>
                          <span>{item.quantity}</span>
                          <button 
                            type="button"
                            onClick={() => updateQuantity(item.id, item.size, 1, item.color?.id)}
                            aria-label="Aumentar quantidade"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        <button 
                          type="button"
                          onClick={() => removeFromCart(item.id, item.size, item.color?.id)} 
                          className={styles.removeBtn}
                          aria-label="Remover item"
                        >
                          <Trash2 size={14} />
                          <span>Remover</span>
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>

            {/* Rodapé e Sumário de Valores Limpo e Focado */}
            {cartItems.length > 0 && (
              <footer className={styles.footer} onWheel={(e) => e.preventDefault()}>
                {/* Cupom de Desconto */}
                <div className={styles.toolRow}>
                  {!appliedCoupon ? (
                    <form onSubmit={handleApplyCoupon} className={styles.inlineForm}>
                      <div className={styles.inputWrapper}>
                        <Tag size={14} className={styles.inputIcon} />
                        <input 
                          type="text" 
                          placeholder="Cupom (ex: EDU10)" 
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                          className={styles.toolInput}
                        />
                      </div>
                      <button 
                        type="submit" 
                        disabled={validatingCoupon || !couponInput.trim()} 
                        className={styles.toolBtn}
                      >
                        {validatingCoupon ? <Loader2 size={13} className={styles.spinning} /> : 'APLICAR'}
                      </button>
                    </form>
                  ) : (
                    <div className={styles.appliedCouponBadge}>
                      <div className={styles.couponTagInfo}>
                        <Tag size={13} />
                        <span>CUPOM <strong>{appliedCoupon.code}</strong> (-{appliedCoupon.discountPercent}%)</span>
                      </div>
                      <button type="button" onClick={removeCoupon} className={styles.removeCouponBtn} aria-label="Remover cupom">
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {couponFeedback.message && (
                    <span className={couponFeedback.isError ? styles.errorText : styles.successText}>
                      {couponFeedback.isError ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                      <span>{couponFeedback.message}</span>
                    </span>
                  )}
                </div>

                {/* Linhas de Valores */}
                <div className={styles.summaryList}>
                  <div className={styles.summaryRow}>
                    <span>Subtotal</span>
                    <span>R$ {Number(subtotal || 0).toFixed(2)}</span>
                  </div>

                  {appliedCoupon && discountAmount > 0 && (
                    <div className={`${styles.summaryRow} ${styles.discountRow}`}>
                      <span>Desconto ({appliedCoupon.code})</span>
                      <span>- R$ {Number(discountAmount || 0).toFixed(2)}</span>
                    </div>
                  )}

                  <div className={`${styles.summaryRow} ${styles.totalRow}`}>
                    <span>TOTAL ESTIMADO</span>
                    <span>R$ {Number(total || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Ações */}
                <button onClick={handleGoToCheckout} className={styles.checkoutBtn}>
                  <span>FINALIZAR COMPRA</span>
                  <ArrowRight size={15} />
                </button>
                <button onClick={closeCart} className={styles.continueBtn}>
                  CONTINUAR COMPRANDO
                </button>
              </footer>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

export default CartDrawer;
