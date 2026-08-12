import React, { createContext, useContext, useState, useEffect } from 'react';

const WishlistContext = createContext();
const WISHLIST_STORAGE_KEY = 'thr33_wishlist';

export function WishlistProvider({ children }) {
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(favorites));
    } catch (e) {
      console.error('Erro ao persistir favoritos:', e);
    }
  }, [favorites]);

  const isFavorite = (productId) => {
    if (!productId) return false;
    return favorites.some(item => (item.id === productId || item.slug === productId));
  };

  const toggleFavorite = (product) => {
    if (!product) return;
    const productId = product.slug || product.id;
    setFavorites(prev => {
      const exists = prev.some(item => (item.id === productId || item.slug === productId));
      if (exists) {
        return prev.filter(item => (item.id !== productId && item.slug !== productId));
      } else {
        return [...prev, product];
      }
    });
  };

  const removeFavorite = (productId) => {
    setFavorites(prev => prev.filter(item => (item.id !== productId && item.slug !== productId)));
  };

  const clearWishlist = () => {
    setFavorites([]);
  };

  return (
    <WishlistContext.Provider value={{
      favorites,
      favoritesCount: favorites.length,
      isFavorite,
      toggleFavorite,
      removeFavorite,
      clearWishlist
    }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);

export default WishlistContext;
