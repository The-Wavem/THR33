import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag, Truck, ShieldCheck } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import styles from './CartDrawer.module.css';

export function CartDrawer() {
  const navigate = useNavigate();
  const {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
    totalItemsCount,
    subtotal,
    discountAmount,
    total,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    couponCodeInput,
    setCouponCodeInput,
    couponError,
    amountToFreeShipping,
    freeShippingProgress
  } = useCart();

  const handleCheckoutRedirect = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <div className={styles.overlay} onClick={() => setIsCartOpen(false)}>
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className={styles.drawerContainer}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. HEADER DO CARRINHO */}
            <div className={styles.header}>
              <div className={styles.headerTitleGroup}>
                <ShoppingBag size={18} />
                <h3>SEU CARRINHO [{String(totalItemsCount).padStart(2, '0')}]</h3>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)} 
                className={styles.btnClose}
                title="Fechar Carrinho"
              >
                <X size={18} />
              </button>
            </div>

            {/* BARRA DE PROGRESSO DO FRETE GRÁTIS */}
            <div className={styles.shippingBarBox}>
              <div className={styles.shippingTextRow}>
                <Truck size={14} className={styles.truckIcon} />
                <span>
                  {amountToFreeShipping > 0 
                    ? `FALTAM R$ ${amountToFreeShipping.toFixed(2)} PARA FRETE GRÁTIS` 
                    : '✓ VOCÊ GANHOU FRETE GRÁTIS EXPRESSO!'}
                </span>
              </div>
              <div className={styles.progressBarTrack}>
                <div 
                  className={styles.progressBarFill} 
                  style={{ width: `${freeShippingProgress}%` }} 
                />
              </div>
            </div>

            {/* 2. LISTA DE ITENS DO CARRINHO */}
            <div className={styles.itemsListArea}>
              {cartItems.length > 0 ? (
                cartItems.map((item) => (
                  <div key={`${item.id}-${item.selectedSize}`} className={styles.cartItemCard}>
                    <div className={styles.itemThumbBox}>
                      <img src={item.image} alt={item.title} className={styles.itemThumb} />
                    </div>

                    <div className={styles.itemDetails}>
                      <div className={styles.itemTopRow}>
                        <strong className={styles.itemTitle}>{item.title}</strong>
                        <button 
                          onClick={() => removeFromCart(item.id, item.selectedSize)}
                          className={styles.btnRemove}
                          title="Remover Item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <span className={styles.itemSpec}>
                        TAMANHO: <strong>{item.selectedSize}</strong> // {item.fabric}
                      </span>

                      <div className={styles.itemBottomRow}>
                        {/* CONTROLE DE QUANTIDADE [-] 01 [+] */}
                        <div className={styles.qtyControlBox}>
                          <button 
                            onClick={() => updateQuantity(item.id, item.selectedSize, -1)}
                            className={styles.btnQty}
                          >
                            <Minus size={12} />
                          </button>
                          <span className={styles.qtyNum}>{String(item.quantity).padStart(2, '0')}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.selectedSize, 1)}
                            className={styles.btnQty}
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        <strong className={styles.itemPrice}>
                          R$ {(item.priceNum * item.quantity).toFixed(2)}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyCartBox}>
                  <ShoppingBag size={40} className={styles.emptyIcon} />
                  <h4>SEU CARRINHO ESTÁ VAZIO</h4>
                  <p>Explore as peças do drop ativo ou nosso catálogo completo.</p>
                  <button 
                    onClick={() => { setIsCartOpen(false); navigate('/catalogo'); }} 
                    className={styles.btnExplore}
                  >
                    EXPLORAR MOSTRUÁRIO
                  </button>
                </div>
              )}
            </div>

            {/* 3. FOOTER DA GAVETA (CUPOM + RESUMO + CTA CHECKOUT) */}
            {cartItems.length > 0 && (
              <div className={styles.footerArea}>
                
                {/* CAMPO DE CUPOM TÁTICO */}
                <div className={styles.couponBox}>
                  {!appliedCoupon ? (
                    <div className={styles.couponInputGroup}>
                      <input 
                        type="text" 
                        placeholder="CUPOM (EX: FORTHEFEW10)"
                        value={couponCodeInput}
                        onChange={(e) => setCouponCodeInput(e.target.value)}
                        className={styles.couponInput}
                      />
                      <button 
                        onClick={() => applyCoupon(couponCodeInput)}
                        className={styles.btnApplyCoupon}
                      >
                        APLICAR
                      </button>
                    </div>
                  ) : (
                    <div className={styles.appliedCouponBadge}>
                      <div className={styles.couponLabel}>
                        <Tag size={12} />
                        <span>CUPOM {appliedCoupon.code} (-{appliedCoupon.discountPercent}%)</span>
                      </div>
                      <button onClick={removeCoupon} className={styles.btnRemoveCoupon}>
                        REMOVER
                      </button>
                    </div>
                  )}

                  {couponError && <span className={styles.couponErrorText}>{couponError}</span>}
                </div>

                {/* RESUMO DE VALORES */}
                <div className={styles.summaryLines}>
                  <div className={styles.summaryRow}>
                    <span>SUBTOTAL:</span>
                    <strong>R$ {subtotal.toFixed(2)}</strong>
                  </div>

                  {discountAmount > 0 && (
                    <div className={styles.summaryRowDiscount}>
                      <span>DESCONTO:</span>
                      <strong>- R$ {discountAmount.toFixed(2)}</strong>
                    </div>
                  )}

                  <div className={styles.summaryTotalRow}>
                    <span>TOTAL ESTIMADO:</span>
                    <strong className={styles.totalPrice}>R$ {total.toFixed(2)}</strong>
                  </div>
                </div>

                {/* BOTÃO CTA CHECKOUT */}
                <button onClick={handleCheckoutRedirect} className={styles.btnCheckout}>
                  <ShieldCheck size={16} />
                  <span>FINALIZAR COMPRA // CHECKOUT SECURE</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

export default CartDrawer;
