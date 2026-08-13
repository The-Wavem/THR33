import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

const WishlistContext = createContext();
const WISHLIST_STORAGE_KEY = 'thr33_wishlist';

export function WishlistProvider({ children }) {
  const { currentUser } = useAuth();
  const [wishlistItems, setWishlistItems] = useState(() => {
    try {
      const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 1. Carrega a Wishlist do Firestore assim que o usuário autentica
  useEffect(() => {
    async function loadUserWishlist() {
      if (currentUser?.uid) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists() && Array.isArray(userSnap.data().wishlist)) {
            setWishlistItems(userSnap.data().wishlist);
            try {
              localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(userSnap.data().wishlist));
            } catch (e) {
              console.warn(e);
            }
          }
        } catch (error) {
          console.warn("Aviso ao carregar wishlist do Firestore:", error.message);
        }
      }
    }
    loadUserWishlist();
  }, [currentUser]);

  // 2. Função auxiliar para sincronizar no Estado, LocalStorage e Firestore
  const syncWishlist = async (newWishlist) => {
    setWishlistItems(newWishlist);
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(newWishlist));
    } catch (e) {
      console.warn("Erro ao salvar wishlist no localStorage:", e);
    }

    if (currentUser?.uid) {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, { wishlist: newWishlist }, { merge: true });
      } catch (error) {
        console.warn("Erro ao sincronizar wishlist no Firestore:", error.message);
      }
    }
  };

  const isInWishlist = (id) => {
    if (!id) return false;
    return wishlistItems.some((item) => item.id === id || item.slug === id);
  };

  const addToWishlist = (product) => {
    if (!product) return;
    const productId = product.slug || product.id;
    if (isInWishlist(productId)) return;

    const newItem = {
      ...product,
      id: product.id || productId,
      slug: product.slug || productId,
      sizes: product.sizes || ["P", "M", "G", "GG"],
      rating: product.rating || 5.0,
      originalPrice: product.originalPrice || product.price,
      discount: product.discount || 0
    };

    const updated = [...wishlistItems, newItem];
    syncWishlist(updated);
  };

  const removeFromWishlist = (id) => {
    if (!id) return;
    const updated = wishlistItems.filter((item) => item.id !== id && item.slug !== id);
    syncWishlist(updated);
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
    syncWishlist([]);
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
