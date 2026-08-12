import React, { createContext, useContext, useState, useEffect } from 'react';

const WishlistContext = createContext();
const WISHLIST_STORAGE_KEY = 'thr33_wishlist';

const INITIAL_MOCK_WISHLIST = [
  {
    id: "thr33-boxy-black",
    slug: "thr33-boxy-black",
    name: "Camiseta THR33 Boxy Logo",
    category: "camisa",
    fit: "boxy",
    drop: "leak-two",
    price: 189.90,
    originalPrice: 229.90,
    discount: 17,
    rating: 4.9,
    salesCount: 142,
    sizes: ["P", "M", "G", "GG"],
    isRelease: true,
    image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: "for-the-few-oversized",
    slug: "for-the-few-oversized",
    name: "Camiseta For The Few Heavy",
    category: "camisa",
    fit: "oversized",
    drop: "leak-two",
    price: 199.90,
    originalPrice: 199.90,
    discount: 0,
    rating: 5.0,
    salesCount: 98,
    sizes: ["PP", "P", "M", "G"],
    isRelease: true,
    image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=600&auto=format&fit=crop"
  }
];

export function WishlistProvider({ children }) {
  const [wishlistItems, setWishlistItems] = useState(() => {
    try {
      const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_MOCK_WISHLIST;
    } catch {
      return INITIAL_MOCK_WISHLIST;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistItems));
    } catch (e) {
      console.error('Erro ao persistir favoritos:', e);
    }
  }, [wishlistItems]);

  const isInWishlist = (id) => {
    if (!id) return false;
    return wishlistItems.some((item) => item.id === id || item.slug === id);
  };

  const addToWishlist = (product) => {
    if (!product) return;
    const productId = product.slug || product.id;
    setWishlistItems((prev) => {
      if (prev.some((item) => item.id === productId || item.slug === productId)) return prev;
      return [...prev, {
        ...product,
        id: product.id || productId,
        slug: product.slug || productId,
        sizes: product.sizes || ["P", "M", "G", "GG"],
        rating: product.rating || 5.0,
        originalPrice: product.originalPrice || product.price,
        discount: product.discount || 0
      }];
    });
  };

  const removeFromWishlist = (id) => {
    setWishlistItems((prev) => prev.filter((item) => item.id !== id && item.slug !== id));
  };

  const toggleWishlist = (product) => {
    if (!product) return;
    const productId = product.slug || product.id;
    if (isInWishlist(productId)) {
      removeFromWishlist(productId);
    } else {
      addToWishlist(product);
    }
  };

  const clearWishlist = () => {
    setWishlistItems([]);
  };

  return (
    <WishlistContext.Provider value={{
      wishlistItems,
      favorites: wishlistItems,
      favoritesCount: wishlistItems.length,
      addToWishlist,
      removeFromWishlist,
      removeFavorite: removeFromWishlist,
      toggleWishlist,
      toggleFavorite: toggleWishlist,
      isInWishlist,
      isFavorite: isInWishlist,
      clearWishlist
    }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);

export default WishlistContext;
