import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { couponService } from '../services/couponService';
import { analyticsService } from '../services/analyticsService';
import { useAuth } from './AuthContext';

const CartContext = createContext();

const STORAGE_KEY = 'thr33_cart_items';

const parsePriceNumber = (val) => {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (typeof val === 'string') {
    const clean = parseFloat(val.replace(/[^\d.,]/g, '').replace(',', '.'));
    return isNaN(clean) ? 189.90 : clean;
  }
  return 189.90;
};

const sanitizeItem = (item) => ({
  ...item,
  price: parsePriceNumber(item.price),
  quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1
});

export function CartProvider({ children }) {
  const { currentUser, user } = useAuth() || {};
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(sanitizeItem);
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingDetails, setShippingDetails] = useState(null);
  
  // Estados de Cupom
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponFeedback, setCouponFeedback] = useState({ message: '', isError: false });
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Persistência no LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
    } catch (e) {
      console.error('Erro ao persistir carrinho:', e);
    }
  }, [cartItems]);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  // Detecção de Frete Grátis (Acumulativo via Peça ou Cupom)
  // Observação crítica: Itens digitais / Vales-presentes NÃO concedem frete grátis aos itens físicos do carrinho.
  const physicalItems = useMemo(() => {
    return cartItems.filter(i => 
      !i.isGiftCard && 
      !i.isDigital && 
      i.category !== 'gift-card' && 
      !String(i.id || '').includes('vale-presente')
    );
  }, [cartItems]);

  const hasPhysicalItems = physicalItems.length > 0;
  const isOnlyDigitalCart = cartItems.length > 0 && !hasPhysicalItems;

  // Apenas peças físicas com a flag de frete grátis ativam frete grátis no pedido
  const hasFreeShippingItem = useMemo(() => {
    return physicalItems.some(i => i.freeShipping || i.hasFreeShipping);
  }, [physicalItems]);

  const hasFreeShippingCoupon = useMemo(() => {
    return Boolean(
      appliedCoupon &&
      (appliedCoupon.freeShipping === true ||
        appliedCoupon.type === 'free_shipping' ||
        appliedCoupon.discountMode === 'free_shipping_only')
    );
  }, [appliedCoupon]);

  const isFreeShippingActive = hasFreeShippingItem || hasFreeShippingCoupon;

  const effectiveShippingCost = useMemo(() => {
    if (cartItems.length === 0) return 0;
    if (isOnlyDigitalCart) return 0;
    if (isFreeShippingActive) return 0;
    return Number(shippingCost || 0);
  }, [cartItems.length, isOnlyDigitalCart, isFreeShippingActive, shippingCost]);

  // Cálculos financeiros
  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => {
      const p = parsePriceNumber(item.price);
      const q = Number(item.quantity) || 1;
      return acc + (p * q);
    }, 0);
  }, [cartItems]);

  const discountAmount = useMemo(() => {
    if (!appliedCoupon || subtotal <= 0) return 0;
    if (appliedCoupon.discountMode === 'free_shipping_only') return 0;
    if (appliedCoupon.discountMode === 'fixed') {
      return Math.min(subtotal, Math.max(0, Number(appliedCoupon.fixedDiscountValue || 0)));
    }
    const pct = Number(appliedCoupon.discountPercent || (appliedCoupon.discountPercentage ? appliedCoupon.discountPercentage * 100 : 0)) || 0;
    return (subtotal * pct) / 100;
  }, [subtotal, appliedCoupon]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - discountAmount + effectiveShippingCost);
  }, [subtotal, discountAmount, effectiveShippingCost]);

  const totalItemsCount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);
  }, [cartItems]);

  // Ações de Cupom com validação no Firestore
  const applyCoupon = async (code, userContextOverride = null) => {
    if (!code || !code.trim()) {
      setCouponFeedback({ message: 'Digite um código de cupom.', isError: true });
      return false;
    }

    setValidatingCoupon(true);
    setCouponFeedback({ message: '', isError: false });

    const activeUserContext = userContextOverride || {
      uid: currentUser?.uid || user?.uid || null,
      email: currentUser?.email || user?.email || null
    };

    try {
      const result = await couponService.validateCoupon(
        code,
        subtotal,
        activeUserContext,
        totalItemsCount
      );

      if (result.valid || result.isValid) {
        setAppliedCoupon({
          ...result.coupon,
          id: result.coupon.id,
          code: result.coupon.code,
          type: result.coupon.type || 'affiliate',
          discountMode: result.coupon.discountMode || 'percentage',
          discountPercent: Number(result.coupon.discountPercent || 0),
          fixedDiscountValue: Number(result.coupon.fixedDiscountValue || 0),
          freeShipping: Boolean(result.coupon.freeShipping),
          label: result.coupon.label,
          partnerName: result.coupon.partnerName
        });
        setCouponFeedback({ message: result.message, isError: false });
        setValidatingCoupon(false);
        return true;
      } else {
        setAppliedCoupon(null);
        setCouponFeedback({ message: result.message, isError: true });
        setValidatingCoupon(false);
        return false;
      }
    } catch (err) {
      setAppliedCoupon(null);
      setCouponFeedback({ message: 'Erro ao validar cupom. Tente novamente.', isError: true });
      setValidatingCoupon(false);
      return false;
    }
  };

  const removeCoupon = () => {
    try {
      sessionStorage.removeItem('thr33_pending_vip_coupon');
    } catch {
      // ignore
    }
    setAppliedCoupon(null);
    setCouponFeedback({ message: 'Cupom removido com sucesso.', isError: false });
  };

  // Aplica automaticamente o cupom VIP reservado pelo cliente no Perfil assim que adicionar peças à sacola
  useEffect(() => {
    if (cartItems.length > 0 && !appliedCoupon && !validatingCoupon) {
      try {
        const pendingVip = sessionStorage.getItem('thr33_pending_vip_coupon');
        if (pendingVip) {
          sessionStorage.removeItem('thr33_pending_vip_coupon');
          applyCoupon(pendingVip);
        }
      } catch {
        // ignore
      }
    }
  }, [cartItems.length, appliedCoupon, validatingCoupon]);

  // Adicionar item ao carrinho
  const addToCart = (product, size = 'M', quantity = 1, color = null) => {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    let colorObj = color || (product.colors && product.colors[0]) || product.color || { id: 'preto', name: 'Preto', hex: '#000000' };
    if (!colorObj || typeof colorObj !== 'object' || !colorObj.name || colorObj.name.toLowerCase() === 'padrão' || colorObj.name.toLowerCase() === 'padrao') {
      colorObj = { id: 'preto', name: 'Preto', hex: '#000000' };
    }
    const sizeStr = size || (product.sizes && product.sizes[0]) || 'M';
    const cleanPrice = parsePriceNumber(product.price || product.priceNum);


    const isGift = Boolean(
      product.isGiftCard || 
      product.category === 'gift-card' || 
      String(product.id || '').includes('vale-presente')
    );

    const itemToAdd = {
      id: product.id,
      name: product.name || product.title,
      size: sizeStr,
      color: colorObj,
      category: isGift ? 'gift-card' : (product.category || 'camisa'),
      fit: product.fit || (isGift ? "Vale-Presente Digital" : "Boxy Fit"),
      price: cleanPrice,
      quantity: qty,
      image: product.image || (product.images && product.images[0]),
      freeShipping: isGift ? false : Boolean(product.freeShipping || product.hasFreeShipping),
      isGiftCard: isGift,
      isDigital: isGift,
      giftDeliveryMode: product.giftDeliveryMode || (isGift ? 'code' : null),
      recipientName: product.recipientName || null,
      giftMessage: product.giftMessage || null
    };

    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (item) => item.id === product.id && 
                  item.size === sizeStr && 
                  item.color?.id === colorObj?.id &&
                  item.giftDeliveryMode === itemToAdd.giftDeliveryMode &&
                  item.recipientName === itemToAdd.recipientName
      );

      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex].quantity += qty;
        return updated;
      }

      return [...prevItems, itemToAdd];
    });

    // Telemetria de adição à sacola
    analyticsService.trackAddToCart(itemToAdd);
    openCart();
  };

  // Remover item
  const removeFromCart = (id, size, colorId = null) => {
    const itemToRemove = cartItems.find((item) => {
      if (colorId && item.color) {
        return item.id === id && item.size === size && item.color.id === colorId;
      }
      return item.id === id && item.size === size;
    });

    if (itemToRemove) {
      analyticsService.trackRemoveFromCart(itemToRemove, itemToRemove.quantity || 1);
    }

    setCartItems((prev) => 
      prev.filter((item) => {
        if (colorId && item.color) {
          return !(item.id === id && item.size === size && item.color.id === colorId);
        }
        return !(item.id === id && item.size === size);
      })
    );
  };

  // Alterar quantidade
  const updateQuantity = (id, size, delta, colorId = null) => {
    const currentItem = cartItems.find((item) => {
      const matchColor = colorId && item.color ? item.color.id === colorId : true;
      return item.id === id && item.size === size && matchColor;
    });

    if (!currentItem) return;

    if (delta > 0) {
      analyticsService.trackAddToCart({ ...currentItem, quantity: delta });
    } else if (delta < 0) {
      const removeQty = Math.min(currentItem.quantity, Math.abs(delta));
      analyticsService.trackRemoveFromCart(currentItem, removeQty);
    }

    setCartItems((prev) =>
      prev
        .map((item) => {
          const matchColor = colorId && item.color ? item.color.id === colorId : true;
          if (item.id === id && item.size === size && matchColor) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  // Limpar carrinho
  const clearCart = () => {
    setCartItems([]);
    setAppliedCoupon(null);
    setCouponFeedback({ message: '', isError: false });
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        isCartOpen,
        openCart,
        closeCart,
        setIsCartOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        subtotal,
        discountAmount,
        appliedCoupon,
        setAppliedCoupon,
        applyCoupon,
        removeCoupon,
        couponFeedback,
        couponError: couponFeedback.isError ? couponFeedback.message : null,
        validatingCoupon,
        shippingCost,
        setShippingCost,
        shippingDetails,
        setShippingDetails,
        hasFreeShippingItem,
        hasFreeShippingCoupon,
        isFreeShippingActive,
        effectiveShippingCost,
        physicalItems,
        hasPhysicalItems,
        isOnlyDigitalCart,
        total,
        totalItemsCount
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart deve ser usado dentro de um CartProvider');
  }
  return context;
};

export default CartContext;
