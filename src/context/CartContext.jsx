import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { couponService } from '../services/couponService';
import { analyticsService } from '../services/analyticsService';

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
    const pct = Number(appliedCoupon.discountPercent || (appliedCoupon.discountPercentage ? appliedCoupon.discountPercentage * 100 : 0)) || 0;
    return (subtotal * pct) / 100;
  }, [subtotal, appliedCoupon]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - discountAmount + (cartItems.length > 0 ? Number(shippingCost || 0) : 0));
  }, [subtotal, discountAmount, cartItems.length, shippingCost]);

  const totalItemsCount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);
  }, [cartItems]);

  // Ações de Cupom com validação no Firestore
  const applyCoupon = async (code) => {
    if (!code || !code.trim()) {
      setCouponFeedback({ message: 'Digite um código de cupom.', isError: true });
      return false;
    }

    setValidatingCoupon(true);
    setCouponFeedback({ message: '', isError: false });

    try {
      const result = await couponService.validateCoupon(code, subtotal);

      if (result.isValid) {
        setAppliedCoupon({
          id: result.coupon.id,
          code: result.coupon.code,
          type: result.coupon.type || 'affiliate',
          discountPercent: result.discountPercent,
          label: `${result.discountPercent}% OFF`,
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
    setAppliedCoupon(null);
    setCouponFeedback({ message: 'Cupom removido com sucesso.', isError: false });
  };

  // Adicionar item ao carrinho
  const addToCart = (product, size = 'M', quantity = 1, color = null) => {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const colorObj = color || (product.colors && product.colors[0]) || { id: 'preto', name: 'Preto' };
    const sizeStr = size || (product.sizes && product.sizes[0]) || 'M';
    const cleanPrice = parsePriceNumber(product.price || product.priceNum);

    const itemToAdd = {
      id: product.id,
      name: product.name || product.title,
      size: sizeStr,
      color: colorObj,
      category: product.category || 'camisa',
      fit: product.fit || "Boxy Fit",
      price: cleanPrice,
      quantity: qty,
      image: product.image || (product.images && product.images[0])
    };

    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (item) => item.id === product.id && item.size === sizeStr && item.color?.id === colorObj?.id
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
