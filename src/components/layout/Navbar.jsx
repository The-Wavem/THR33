import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  ShoppingBag, 
  Heart, 
  LogOut, 
  Package, 
  ArrowRight, 
  Gift, 
  ShieldCheck,
  X,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';
import { preloadRoute } from '../../utils/preloader';
import styles from './Navbar.module.css';

// Variantes suaves de animação para os dropdowns (rápido, fluído e elegante)
const dropdownMotionVariants = {
  hidden: {
    opacity: 0,
    y: 7,
    scale: 0.98,
    transition: {
      duration: 0.14,
      ease: [0.16, 1, 0.3, 1]
    }
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1]
    }
  },
  exit: {
    opacity: 0,
    y: 5,
    scale: 0.98,
    transition: {
      duration: 0.14,
      ease: [0.16, 1, 0.3, 1]
    }
  }
};

export function Navbar({ onOpenCart }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileCategoriesOpen, setIsMobileCategoriesOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isCatalogDropdownOpen, setIsCatalogDropdownOpen] = useState(false);

  // Trava scroll do body quando menu mobile estiver aberto
  useEffect(() => {
    if (isMobileMenuOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isMobileMenuOpen]);

  const dropdownTimerRef = useRef(null);
  const profileWrapperRef = useRef(null);

  const catalogTimerRef = useRef(null);
  const catalogWrapperRef = useRef(null);

  const { openCart, totalItemsCount } = useCart();
  const { currentUser, isAuthenticated, isAdmin, logout } = useAuth();
  const { favoritesCount } = useWishlist();
  const navigate = useNavigate();

  const handleCartClick = onOpenCart || openCart;

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  // Gerenciamento de hover com tolerância para o perfil
  const handleProfileMouseEnter = () => {
    if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
    setIsProfileDropdownOpen(true);
    preloadRoute('/perfil');
    preloadRoute('/auth');
  };

  const handleProfileMouseLeave = () => {
    if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
    dropdownTimerRef.current = setTimeout(() => {
      setIsProfileDropdownOpen(false);
    }, 320);
  };

  // Gerenciamento de hover com tolerância para o catálogo
  const handleCatalogMouseEnter = () => {
    if (catalogTimerRef.current) clearTimeout(catalogTimerRef.current);
    setIsCatalogDropdownOpen(true);
    preloadRoute('/catalogo');
    preloadRoute('/brindes');
  };

  const handleCatalogMouseLeave = () => {
    if (catalogTimerRef.current) clearTimeout(catalogTimerRef.current);
    catalogTimerRef.current = setTimeout(() => {
      setIsCatalogDropdownOpen(false);
    }, 320);
  };

  // Fecha os dropdowns ao clicar fora
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (profileWrapperRef.current && !profileWrapperRef.current.contains(e.target)) {
        setIsProfileDropdownOpen(false);
      }
      if (catalogWrapperRef.current && !catalogWrapperRef.current.contains(e.target)) {
        setIsCatalogDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
      if (catalogTimerRef.current) clearTimeout(catalogTimerRef.current);
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
    <>
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
        <Link 
          to="/" 
          className={styles.logo} 
          aria-label="THR33 Home"
          onMouseEnter={() => preloadRoute('/')}
        >
          <span className={styles.logoText}>THR33</span>
          <span className={styles.logoSub}>FOR THE FEW</span>
        </Link>

        {/* Links de Navegação com Preloading no Hover */}
        <nav className={styles.nav}>
          <NavLink 
            to="/" 
            className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}
            onClick={() => setIsMobileMenuOpen(false)}
            onMouseEnter={() => preloadRoute('/')}
            onTouchStart={() => preloadRoute('/')}
          >
            Início
          </NavLink>

          {/* ITEM CATÁLOGO COM DROPDOWN FLUIDO */}
          <div 
            ref={catalogWrapperRef}
            className={styles.navItemWrapper}
            onMouseEnter={handleCatalogMouseEnter}
            onMouseLeave={handleCatalogMouseLeave}
          >
            <NavLink 
              to="/catalogo" 
              className={({ isActive }) => 
                `${styles.link} ${isActive ? styles.active : ''} ${isCatalogDropdownOpen ? styles.linkDropdownActive : ''}`
              }
              onClick={() => {
                setIsCatalogDropdownOpen(false);
                setIsMobileMenuOpen(false);
              }}
              onMouseEnter={handleCatalogMouseEnter}
              onPointerEnter={handleCatalogMouseEnter}
              onTouchStart={() => preloadRoute('/catalogo')}
            >
              Catálogo
            </NavLink>

            {/* POPOVER DO CATÁLOGO COM ANIMAÇÃO MOTION */}
            <AnimatePresence>
              {isCatalogDropdownOpen && (
                <motion.div 
                  key="catalogDropdown"
                  variants={dropdownMotionVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className={styles.catalogDropdown}
                  onMouseEnter={handleCatalogMouseEnter}
                  onMouseLeave={handleCatalogMouseLeave}
                >
                  <div className={styles.dropdownContent}>
                    <Link 
                      to="/catalogo" 
                      className={styles.dropdownMainHeader}
                      onClick={() => setIsCatalogDropdownOpen(false)}
                    >
                      <span>VER TODAS AS PEÇAS</span>
                      <ArrowRight size={13} />
                    </Link>

                    <hr className={styles.divider} />

                    <span className={styles.categoryHeading}>CATEGORIAS</span>

                    <Link 
                      to="/catalogo?categoria=camisa" 
                      className={styles.dropdownLink}
                      onClick={() => setIsCatalogDropdownOpen(false)}
                    >
                      Camisetas & Boxy
                    </Link>

                    <Link 
                      to="/catalogo?categoria=calca" 
                      className={styles.dropdownLink}
                      onClick={() => setIsCatalogDropdownOpen(false)}
                    >
                      Calças Streetwear
                    </Link>

                    <Link 
                      to="/catalogo?categoria=bermuda" 
                      className={styles.dropdownLink}
                      onClick={() => setIsCatalogDropdownOpen(false)}
                    >
                      Bermudas & Shorts
                    </Link>

                    <Link 
                      to="/catalogo?categoria=moletom" 
                      className={styles.dropdownLink}
                      onClick={() => setIsCatalogDropdownOpen(false)}
                    >
                      Moletons & Hoodies
                    </Link>

                    <Link 
                      to="/catalogo?categoria=acessorio" 
                      className={styles.dropdownLink}
                      onClick={() => setIsCatalogDropdownOpen(false)}
                    >
                      Acessórios
                    </Link>

                    <hr className={styles.divider} />

                    {/* BRINDES & VALE PRESENTE */}
                    <Link 
                      to="/brindes" 
                      className={styles.highlightDropdownLink}
                      onClick={() => setIsCatalogDropdownOpen(false)}
                      onMouseEnter={() => preloadRoute('/brindes')}
                    >
                      <div className={styles.highlightLeft}>
                        <Gift size={14} />
                        <span>Vales & Brindes</span>
                      </div>
                      <span className={styles.miniBadge}>GIFT</span>
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <NavLink 
            to="/drops-passados" 
            className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}
            onClick={() => setIsMobileMenuOpen(false)}
            onMouseEnter={() => preloadRoute('/drops-passados')}
            onTouchStart={() => preloadRoute('/drops-passados')}
          >
            Drops Passados
          </NavLink>
          
          <NavLink 
            to="/sobre" 
            className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}
            onClick={() => setIsMobileMenuOpen(false)}
            onMouseEnter={() => preloadRoute('/sobre')}
            onTouchStart={() => preloadRoute('/sobre')}
          >
            Sobre
          </NavLink>

          {/* SESSÃO EXCLUSIVA DO ADMINISTRADOR (LIBERADA DINAMICAMENTE NO NAVBAR) */}
          {isAdmin && (
            <NavLink 
              to="/cms" 
              className={({ isActive }) => 
                `${styles.link} ${styles.adminNavLink} ${isActive ? styles.adminLinkActive : ''}`
              }
              onClick={() => setIsMobileMenuOpen(false)}
              onMouseEnter={() => preloadRoute('/cms')}
              onTouchStart={() => preloadRoute('/cms')}
            >
              <ShieldCheck size={13} className={styles.adminNavIcon} />
              <span>Painel CMS</span>
              <span className={styles.adminNavBadge}>ADM</span>
            </NavLink>
          )}
        </nav>

        {/* Ações / Ícones do Usuário */}
        <div className={styles.actions}>
          <Link 
            to="/favoritos" 
            className={styles.actionBtn} 
            aria-label={`Ver Favoritos / Wishlist (${favoritesCount} itens)`}
            onMouseEnter={() => preloadRoute('/catalogo')}
          >
            <Heart size={20} />
            {favoritesCount > 0 && (
              <span className={styles.cartBadge}>{favoritesCount}</span>
            )}
          </Link>

          {/* ÍCONE DE PERFIL COM HOVER BRIDGE & TOLERÂNCIA SUAVE */}
          <div 
            ref={profileWrapperRef}
            className={styles.profileWrapper}
            onMouseEnter={handleProfileMouseEnter}
            onMouseLeave={handleProfileMouseLeave}
          >
            <button 
              className={`${styles.actionBtn} ${isAuthenticated ? styles.userLoggedBtn : ''} ${isProfileDropdownOpen ? styles.profileBtnActive : ''}`}
              aria-label="Perfil do usuário"
              onClick={handleProfileClick}
            >
              <User size={20} />
            </button>

            {/* POPDOWN / HAMBÚRGUER DO PERFIL COM ANIMAÇÃO MOTION */}
            <AnimatePresence>
              {isProfileDropdownOpen && (
                <motion.div 
                  key="profileDropdown"
                  variants={dropdownMotionVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className={styles.profileDropdown}
                  onMouseEnter={handleProfileMouseEnter}
                  onMouseLeave={handleProfileMouseLeave}
                >
                  {isAuthenticated ? (
                    <div className={styles.dropdownContent}>
                      <div className={styles.greetingHeader}>
                        <p className={styles.greeting}>
                          Olá, <strong>{currentUser?.name?.split(' ')[0] || 'Usuário'}</strong>
                        </p>
                        {isAdmin && (
                          <span className={styles.adminUserPill}>ADMIN</span>
                        )}
                      </div>
                      <span className={styles.userEmail}>{currentUser?.email}</span>
                      <hr className={styles.divider} />
                      
                      {/* ATALHO DIRETO AO PAINEL CMS SE FOR ADM */}
                      {isAdmin && (
                        <>
                          <Link 
                            to="/cms" 
                            className={styles.adminHighlightLink}
                            onClick={() => setIsProfileDropdownOpen(false)}
                            onMouseEnter={() => preloadRoute('/cms')}
                          >
                            <div className={styles.adminHighlightLeft}>
                              <ShieldCheck size={14} className={styles.adminIconGlow} />
                              <span>PAINEL CMS ENGINE</span>
                            </div>
                            <span className={styles.adminBadgePill}>ADM</span>
                          </Link>
                          <hr className={styles.divider} />
                        </>
                      )}

                      <Link 
                        to="/perfil" 
                        className={styles.dropdownLink}
                        onClick={() => setIsProfileDropdownOpen(false)}
                        onMouseEnter={() => preloadRoute('/perfil')}
                      >
                        <User size={14} />
                        <span>Minha Conta / Perfil</span>
                      </Link>

                      <Link 
                        to="/meus-pedidos" 
                        className={styles.dropdownLink}
                        onClick={() => setIsProfileDropdownOpen(false)}
                        onMouseEnter={() => preloadRoute('/meus-pedidos')}
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
                        onMouseEnter={() => preloadRoute('/auth')}
                      >
                        ENTRAR
                      </Link>
                      
                      <Link 
                        to="/auth?mode=register" 
                        className={styles.secondaryAuthBtn}
                        onClick={() => setIsProfileDropdownOpen(false)}
                        onMouseEnter={() => preloadRoute('/auth')}
                      >
                        CRIAR CONTA
                      </Link>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Botão de Abrir Carrinho */}
          <button 
            onClick={handleCartClick} 
            className={styles.actionBtn} 
            aria-label={`Abrir Carrinho (${totalItemsCount} itens)`}
            onMouseEnter={() => preloadRoute('/checkout')}
          >
            <ShoppingBag size={20} />
            {totalItemsCount > 0 && (
              <span className={styles.cartBadge}>{totalItemsCount}</span>
            )}
          </button>
        </div>
      </div>
    </header>

    {/* DRAWER DESLIZANTE MOBILE COM BACKDROP (PORTAL DIRETAMENTE NO BODY) */}
    {typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className={styles.mobileDrawerWrapper}>
            <motion.div 
              className={styles.mobileBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            />

            <motion.aside 
              className={styles.mobileDrawer}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              aria-label="Menu de Navegação Mobile"
            >
              {/* TOPO DO DRAWER */}
              <div className={styles.drawerHeader}>
                <Link 
                  to="/" 
                  className={styles.drawerLogo}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className={styles.logoText}>THR33</span>
                  <span className={styles.logoSub}>FOR THE FEW</span>
                </Link>

                <button 
                  type="button" 
                  className={styles.drawerCloseBtn}
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="Fechar menu"
                >
                  <X size={22} />
                </button>
              </div>

              {/* CONTEÚDO ROLÁVEL */}
              <div className={styles.drawerBody}>
                {/* BLOCO DE USUÁRIO / AUTENTICAÇÃO */}
                <div className={styles.drawerUserSection}>
                  {isAuthenticated ? (
                    <div className={styles.drawerUserCard}>
                      <div className={styles.drawerUserInfo}>
                        <p className={styles.drawerUserName}>
                          Olá, <strong>{currentUser?.name?.split(' ')[0] || 'Usuário'}</strong>
                        </p>
                        <span className={styles.drawerUserEmail}>{currentUser?.email}</span>
                      </div>
                      <div className={styles.drawerUserActions}>
                        <Link 
                          to="/perfil" 
                          className={styles.drawerUserBtn}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <User size={15} />
                          <span>Meu Perfil</span>
                        </Link>
                        {isAdmin && (
                          <Link 
                            to="/cms" 
                            className={styles.drawerAdminBtn}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <ShieldCheck size={15} />
                            <span>CMS</span>
                          </Link>
                        )}
                        <button 
                          type="button" 
                          onClick={() => {
                            handleLogout();
                            setIsMobileMenuOpen(false);
                          }} 
                          className={styles.drawerLogoutBtn}
                        >
                          <LogOut size={15} />
                          <span>Sair</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.drawerAuthCard}>
                      <p className={styles.drawerAuthTitle}>ACESSAR CONTA</p>
                      <div className={styles.drawerAuthRow}>
                        <Link 
                          to="/auth?mode=login" 
                          className={styles.drawerPrimaryAuth}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Entrar
                        </Link>
                        <Link 
                          to="/auth?mode=register" 
                          className={styles.drawerSecondaryAuth}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Criar Conta
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* LINKS DE NAVEGAÇÃO */}
                <nav className={styles.drawerNav}>
                  <NavLink 
                    to="/" 
                    className={({ isActive }) => `${styles.drawerLink} ${isActive ? styles.drawerLinkActive : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>Início</span>
                    <ChevronRight size={16} className={styles.drawerChevron} />
                  </NavLink>

                  {/* ITEM CATÁLOGO COM ACORDEÃO */}
                  <div className={styles.drawerCatalogGroup}>
                    <div className={styles.drawerCatalogHeaderRow}>
                      <NavLink 
                        to="/catalogo" 
                        className={({ isActive }) => `${styles.drawerLink} ${isActive ? styles.drawerLinkActive : ''}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <span>Catálogo Completo</span>
                      </NavLink>
                      <button 
                        type="button" 
                        className={styles.drawerExpandBtn}
                        onClick={() => setIsMobileCategoriesOpen(prev => !prev)}
                        aria-label="Expandir categorias do catálogo"
                        aria-expanded={isMobileCategoriesOpen}
                      >
                        <ChevronDown 
                          size={18} 
                          className={`${styles.drawerExpandIcon} ${isMobileCategoriesOpen ? styles.drawerExpandIconOpen : ''}`} 
                        />
                      </button>
                    </div>

                    {isMobileCategoriesOpen && (
                      <div className={styles.drawerSubLinks}>
                        <Link 
                          to="/catalogo?categoria=camisa" 
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={styles.drawerSubLink}
                        >
                          Camisetas & Boxy
                        </Link>
                        <Link 
                          to="/catalogo?categoria=calca" 
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={styles.drawerSubLink}
                        >
                          Calças Streetwear
                        </Link>
                        <Link 
                          to="/catalogo?categoria=bermuda" 
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={styles.drawerSubLink}
                        >
                          Bermudas & Shorts
                        </Link>
                        <Link 
                          to="/catalogo?categoria=moletom" 
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={styles.drawerSubLink}
                        >
                          Moletons & Hoodies
                        </Link>
                        <Link 
                          to="/catalogo?categoria=acessorio" 
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={styles.drawerSubLink}
                        >
                          Acessórios
                        </Link>
                        <Link 
                          to="/brindes" 
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`${styles.drawerSubLink} ${styles.drawerSubHighlight}`}
                        >
                          <Gift size={14} />
                          <span>Vales & Brindes</span>
                        </Link>
                      </div>
                    )}
                  </div>

                  <NavLink 
                    to="/drops-passados" 
                    className={({ isActive }) => `${styles.drawerLink} ${isActive ? styles.drawerLinkActive : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>Drops Passados</span>
                    <ChevronRight size={16} className={styles.drawerChevron} />
                  </NavLink>

                  <NavLink 
                    to="/sobre" 
                    className={({ isActive }) => `${styles.drawerLink} ${isActive ? styles.drawerLinkActive : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>Sobre a THR33</span>
                    <ChevronRight size={16} className={styles.drawerChevron} />
                  </NavLink>

                  <NavLink 
                    to="/favoritos" 
                    className={({ isActive }) => `${styles.drawerLink} ${isActive ? styles.drawerLinkActive : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className={styles.drawerIconLabel}>
                      <Heart size={16} />
                      <span>Favoritos</span>
                    </div>
                    {favoritesCount > 0 && (
                      <span className={styles.drawerCountBadge}>{favoritesCount}</span>
                    )}
                  </NavLink>

                  <NavLink 
                    to="/suporte" 
                    className={({ isActive }) => `${styles.drawerLink} ${isActive ? styles.drawerLinkActive : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>Suporte & Trocas</span>
                    <ChevronRight size={16} className={styles.drawerChevron} />
                  </NavLink>
                </nav>
              </div>

              {/* FOOTER FIXO DO DRAWER */}
              <div className={styles.drawerFooter}>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleCartClick();
                  }}
                  className={styles.drawerCartAction}
                >
                  <div className={styles.drawerCartLeft}>
                    <ShoppingBag size={18} />
                    <span>VER CARRINHO</span>
                  </div>
                  <span className={styles.drawerCartBadge}>
                    {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'}
                  </span>
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}
  </>
);
}

export default Navbar;
