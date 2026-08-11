import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

const STORAGE_KEY = 'thr33_cart_items';
const FREE_SHIPPING_THRESHOLD = 400; // R$ 400,00 para Frete Grátis

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code: 'FORTHEFEW10', discountPercent: 10 }
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponError, setCouponError] = useState('');
  
  // OPÇÃO DE FRETE SELECIONADA
  const [selectedShippingOption, setSelectedShippingOption] = useState(null);

  // PERSISTÊNCIA NO LOCALSTORAGE
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
    } catch (e) {
      console.error('Erro ao salvar carrinho no localStorage:', e);
    }
  }, [cartItems]);

  // ADICIONAR ITEM
  const addToCart = (product, selectedSize = 'M', quantityToAdd = 1) => {
    const qty = typeof quantityToAdd === 'number' && quantityToAdd > 0 
      ? quantityToAdd 
      : (product.quantity || 1);

    setCartItems(prev => {
      const existingIndex = prev.findIndex(
        item => item.id === product.id && item.selectedSize === selectedSize
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += qty;
        return updated;
      }

      return [
        ...prev,
        {
          id: product.id,
          slug: product.slug,
          title: product.title,
          price: product.price,
          priceNum: product.priceNum || parseFloat(product.price.replace('R$', '').replace(',', '.').trim()),
          image: product.image,
          fabric: product.fabric || 'ALGODÃO HEAVYWEIGHT',
          selectedSize,
          quantity: qty
        }
      ];
    });

    setIsCartOpen(true);
  };

  // REMOVER ITEM
  const removeFromCart = (id, selectedSize) => {
    setCartItems(prev => prev.filter(item => !(item.id === id && item.selectedSize === selectedSize)));
  };

  // ALTERAR QUANTIDADE
  const updateQuantity = (id, selectedSize, delta) => {
    setCartItems(prev => {
      return prev.map(item => {
        if (item.id === id && item.selectedSize === selectedSize) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      });
    });
  };

  // LIMPAR CARRINHO
  const clearCart = () => {
    setCartItems([]);
    setAppliedCoupon(null);
    setSelectedShippingOption(null);
  };

  // APLICAR CUPOM
  const applyCoupon = (code) => {
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode === 'FORTHEFEW10' || cleanCode === 'THR33VIP') {
      setAppliedCoupon({ code: cleanCode, discountPercent: 10 });
      setCouponError('');
      return true;
    } else {
      setCouponError('CUPOM INVÁLIDO OU EXPIRADO');
      return false;
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
    setCouponError('');
  };

  // CÁLCULOS TÁTICOS
  const totalItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.priceNum * item.quantity, 0);
  const discountAmount = appliedCoupon ? (subtotal * appliedCoupon.discountPercent) / 100 : 0;
  
  const shippingPrice = selectedShippingOption ? selectedShippingOption.price : 0;
  const total = Math.max(0, subtotal - discountAmount + shippingPrice);
  
  const amountToFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const freeShippingProgress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <CartContext.Provider value={{
      cartItems,
      isCartOpen,
      setIsCartOpen,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalItemsCount,
      subtotal,
      discountAmount,
      shippingPrice,
      total,
      appliedCoupon,
      applyCoupon,
      removeCoupon,
      couponCodeInput,
      setCouponCodeInput,
      couponError,
      amountToFreeShipping,
      freeShippingProgress,
      FREE_SHIPPING_THRESHOLD,
      selectedShippingOption,
      setSelectedShippingOption
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
