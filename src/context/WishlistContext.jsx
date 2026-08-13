import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

const WishlistContext = createContext();

export function WishlistProvider({ children }) {
  const { currentUser } = useAuth();
  const [wishlistItems, setWishlistItems] = useState([]);

  // Busca inicial da Wishlist no Firestore quando o usuário loga
  useEffect(() => {
    async function syncWishlistFromFirestore() {
      if (currentUser?.uid) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setWishlistItems(userSnap.data().wishlist || []);
          } else {
            setWishlistItems([]);
          }
        } catch (error) {
          console.warn("Erro ao buscar wishlist no Firestore:", error.message);
          setWishlistItems([]);
        }
      } else {
        setWishlistItems([]);
      }
    }
    syncWishlistFromFirestore();
  }, [currentUser]);

  // Função central de gravação remota exclusiva no Cloud Firestore
  const updateFirestoreWishlist = async (updatedList) => {
    setWishlistItems(updatedList);
    if (currentUser?.uid) {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, { wishlist: updatedList }, { merge: true });
      } catch (error) {
        console.error("Erro ao gravar wishlist no Firestore:", error.message);
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
    updateFirestoreWishlist(updated);
  };

  const removeFromWishlist = (id) => {
    if (!id) return;
    const updated = wishlistItems.filter((item) => item.id !== id && item.slug !== id);
    updateFirestoreWishlist(updated);
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
    updateFirestoreWishlist([]);
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
