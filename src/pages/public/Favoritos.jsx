import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import ProductCard from '../../components/catalog/ProductCard';
import styles from './Favoritos.module.css';

export function Favoritos() {
  const { wishlistItems } = useWishlist();
  const [sortOrder, setSortOrder] = useState('discount'); // 'discount', 'price-low', 'price-high', 'best-sellers', 'releases', 'rating'

  // Ordenação dos itens favoritados
  const sortedItems = useMemo(() => {
    return [...wishlistItems].sort((a, b) => {
      if (sortOrder === 'discount') return (b.discount || 0) - (a.discount || 0);
      if (sortOrder === 'price-low') return a.price - b.price;
      if (sortOrder === 'price-high') return b.price - a.price;
      if (sortOrder === 'best-sellers') return (b.salesCount || 0) - (a.salesCount || 0);
      if (sortOrder === 'rating') return (b.rating || 0) - (a.rating || 0);
      return (b.isRelease ? 1 : 0) - (a.isRelease ? 1 : 0); // releases
    });
  }, [wishlistItems, sortOrder]);

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div>
          <span className={styles.breadcrumb}>HOME / WISHLIST</span>
          <h1 className={styles.title}>MEUS FAVORITOS ({wishlistItems.length})</h1>
        </div>

        {/* ORDENAÇÃO CONFORME ESPECIFICAÇÃO TÉCNICA */}
        {wishlistItems.length > 0 && (
          <div className={styles.sortWrapper}>
            <label htmlFor="sortWishlist" className={styles.sortLabel}>ORDENAR POR:</label>
            <select
              id="sortWishlist"
              className={styles.sortSelect}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="discount">MAIOR DESCONTO</option>
              <option value="price-low">MENOR PREÇO</option>
              <option value="price-high">MAIOR PREÇO</option>
              <option value="best-sellers">MAIS VENDIDOS</option>
              <option value="releases">LANÇAMENTOS</option>
              <option value="rating">MELHOR AVALIADOS</option>
            </select>
          </div>
        )}
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      {sortedItems.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Heart size={48} strokeWidth={1.2} />
          </div>
          <h2>SUA WISHLIST ESTÁ VAZIA</h2>
          <p>Você ainda não salvou nenhuma peça como favorita. Explore nosso catálogo streetwear e monte seu visual.</p>
          <Link className={styles.exploreBtn} to="/catalogo">
            VER CATÁLOGO COMPLETO
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {sortedItems.map((product) => (
            <ProductCard key={product.id || product.slug} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}

export default Favoritos;
