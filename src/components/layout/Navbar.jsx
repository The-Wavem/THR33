import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { User, ShoppingBag, Heart, LogOut, Package, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import styles from './Navbar.module.css';

export function Navbar({ onOpenCart }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownTimerRef = useRef(null);
  const profileWrapperRef = useRef(null);

  const { openCart, totalItemsCount } = useCart();
  const { currentUser, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleCartClick = onOpenCart || openCart;

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  // Gerenciamento suave de hover com tempo de tolerância (Grace Period)
  const handleProfileMouseEnter = () => {
    if (dropdownTimerRef.current) {
      clearTimeout(dropdownTimerRef.current);
    }
    setIsProfileDropdownOpen(true);
  };

  const handleProfileMouseLeave = () => {
    if (dropdownTimerRef.current) {
      clearTimeout(dropdownTimerRef.current);
    }
    // Tolerância de 350ms para que o cliente não perca o menu ao mover o mouse
    dropdownTimerRef.current = setTimeout(() => {
      setIsProfileDropdownOpen(false);
    }, 350);
  };

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (profileWrapperRef.current && !profileWrapperRef.current.contains(e.target)) {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setIsProfileDropdownOpen(false);
    navigate('/');
  };

  const handleProfileClick = () => {
    if (isAuthenticated) {
      navigate('/perfil');
    } else {
      setIsProfileDropdownOpen(prev => !prev);
    }
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
            <Heart size={20} />
          </Link>

          {/* ÍCONE DE PERFIL COM HOVER BRIDGE & TOLERÂNCIA SUAVE */}
          <div 
            ref={profileWrapperRef}
            className={styles.profileWrapper}
            onMouseEnter={handleProfileMouseEnter}
            onMouseLeave={handleProfileMouseLeave}
          >
            <button 
              className={`${styles.actionBtn} ${isAuthenticated ? styles.userLoggedBtn : ''}`}
              aria-label="Perfil do usuário"
              onClick={handleProfileClick}
            >
              <User size={20} />
            </button>

            {/* POPDOWN / HAMBÚRGUER DO PERFIL */}
            {isProfileDropdownOpen && (
              <div 
                className={styles.profileDropdown}
                onMouseEnter={handleProfileMouseEnter}
                onMouseLeave={handleProfileMouseLeave}
              >
                {isAuthenticated ? (
                  <div className={styles.dropdownContent}>
                    <p className={styles.greeting}>
                      Olá, <strong>{currentUser?.name?.split(' ')[0] || 'Usuário'}</strong>
                    </p>
                    <span className={styles.userEmail}>{currentUser?.email}</span>
                    <hr className={styles.divider} />
                    
                    <Link 
                      to="/perfil" 
                      className={styles.dropdownLink}
                      onClick={() => setIsProfileDropdownOpen(false)}
                    >
                      <User size={14} />
                      <span>Minha Conta / Perfil</span>
                    </Link>

                    <Link 
                      to="/meus-pedidos" 
                      className={styles.dropdownLink}
                      onClick={() => setIsProfileDropdownOpen(false)}
                    >
                      <Package size={14} />
                      <span>Meus Pedidos</span>
                    </Link>

                    <hr className={styles.divider} />

                    <button type="button" onClick={handleLogout} className={styles.logoutBtn}>
                      <LogOut size={13} />
                      <span>Sair</span>
                    </button>
                  </div>
                ) : (
                  <div className={styles.dropdownContent}>
                    <p className={styles.dropdownTitle}>ACESSAR PLATAFORMA</p>
                    <p className={styles.dropdownSub}>Inicie sessão para acompanhar seus pedidos e acessar drops exclusivos</p>
                    
                    <Link 
                      to="/auth?mode=login" 
                      className={styles.primaryAuthBtn}
                      onClick={() => setIsProfileDropdownOpen(false)}
                    >
                      ENTRAR
                    </Link>
                    
                    <Link 
                      to="/auth?mode=register" 
                      className={styles.secondaryAuthBtn}
                      onClick={() => setIsProfileDropdownOpen(false)}
                    >
                      CRIAR CONTA
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Botão de Abrir Carrinho */}
          <button onClick={handleCartClick} className={styles.actionBtn} aria-label={`Abrir Carrinho (${totalItemsCount} itens)`}>
            <ShoppingBag size={20} />
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
