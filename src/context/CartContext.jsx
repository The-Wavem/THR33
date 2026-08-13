import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';

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

const DEFAULT_INITIAL_ITEM = {
  id: "thr33-boxy-black",
  name: "Camiseta THR33 Boxy Logo",
  size: "M",
  color: { id: "preto", name: "Preto Piano" },
  fit: "Boxy Fit",
  price: 189.90,
  quantity: 1,
  image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop"
};

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
      return [DEFAULT_INITIAL_ITEM];
    } catch {
      return [DEFAULT_INITIAL_ITEM];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingDetails, setShippingDetails] = useState(null);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState(null);

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

  // Adicionar item ao carrinho
  const addToCart = (product, size = 'M', quantity = 1, color = null) => {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const colorObj = color || (product.colors && product.colors[0]) || { id: 'preto', name: 'Preto' };
    const sizeStr = size || (product.sizes && product.sizes[0]) || 'M';
    const cleanPrice = parsePriceNumber(product.price || product.priceNum);

    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (item) => item.id === product.id && item.size === sizeStr && item.color?.id === colorObj?.id
      );

      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex].quantity += qty;
        return updated;
      }

      return [
        ...prevItems,
        {
          id: product.id,
          name: product.name || product.title,
          size: sizeStr,
          color: colorObj,
          fit: product.fit || "Standard Fit",
          price: cleanPrice,
          quantity: qty,
          image: product.image || (product.images && product.images[0])
        }
      ];
    });
    openCart();
  };

  // Remover item
  const removeFromCart = (id, size, colorId = null) => {
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
  };

  // Aplicar cupom
  const applyCoupon = (code) => {
    if (!code) return false;
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode === 'FORTHEFEW' || cleanCode === 'FORTHEFEW10') {
      setAppliedCoupon({ code: cleanCode, discountPercentage: 0.10, label: '10% OFF' });
      setCouponError(null);
      return true;
    } else if (cleanCode === 'DROPVIP' || cleanCode === 'ATELIE20') {
      setAppliedCoupon({ code: cleanCode, discountPercentage: 0.20, label: '20% OFF VIP' });
      setCouponError(null);
      return true;
    } else {
      setCouponError('Cupom inválido ou expirado.');
      return false;
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
  };

  // Cálculos financeiros seguros
  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => {
      const p = parsePriceNumber(item.price);
      const q = Number(item.quantity) || 1;
      return acc + (p * q);
    }, 0);
  }, [cartItems]);

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    return subtotal * (appliedCoupon.discountPercentage || 0);
  }, [subtotal, appliedCoupon]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - discountAmount + (Number(shippingCost) || 0));
  }, [subtotal, discountAmount, shippingCost]);

  const totalItemsCount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);
  }, [cartItems]);

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
        couponError,
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
