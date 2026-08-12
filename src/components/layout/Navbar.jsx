import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import styles from './Navbar.module.css';

export function Navbar({ onOpenCart }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { openCart, totalItemsCount } = useCart();

  const handleCartClick = onOpenCart || openCart;

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Mobile Toggle */}
        <button 
          className={styles.mobileMenuBtn}
          onClick={toggleMobileMenu}
          aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={isMobileMenuOpen}
        >
          <span className={styles.hamburger}></span>
        </button>

        {/* Logo */}
        <Link to="/" className={styles.logo} aria-label="THR33 Home">
          <span className={styles.logoText}>THR33</span>
          <span className={styles.logoSub}>FOR THE FEW</span>
        </Link>

        {/* Links de Navegação */}
        <nav className={`${styles.nav} ${isMobileMenuOpen ? styles.navOpen : ''}`}>
          <NavLink 
            to="/" 
            className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Início
          </NavLink>
          <NavLink 
            to="/catalogo" 
            className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Catálogo
          </NavLink>
          <NavLink 
            to="/drops-passados" 
            className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Drops Passados
          </NavLink>
          <NavLink 
            to="/sobre" 
            className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Sobre
          </NavLink>
        </nav>

        {/* Ações / Ícones do Usuário */}
        <div className={styles.actions}>
          <Link to="/favoritos" className={styles.actionBtn} aria-label="Ver Favoritos / Wishlist">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.72-8.72 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </Link>

          <Link to="/minha-conta" className={styles.actionBtn} aria-label="Minha Conta">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </Link>

          <button onClick={handleCartClick} className={styles.actionBtn} aria-label={`Abrir Carrinho (${totalItemsCount} itens)`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            {totalItemsCount > 0 && (
              <span className={styles.cartBadge}>{totalItemsCount}</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
