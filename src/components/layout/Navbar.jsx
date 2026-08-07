import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { 
  Search, 
  User, 
  ShoppingBag, 
  X, 
  LogOut, 
  Package, 
  Settings, 
  ChevronDown, 
  ArrowRight,
  Layers
} from 'lucide-react';
import { catalogService } from '../../services/catalogService';
import { currentDropConfig } from '../../data/dropConfig';
import styles from './Navbar.module.css';

export function Navbar({ cartCount = 2, onOpenCart, user, onLogout, onOpenAuthModal }) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCatalogMenuOpen, setIsCatalogMenuOpen] = useState(false);
  const [isLancamentosMenuOpen, setIsLancamentosMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // ESTADO PARA CONTROLAR A VISIBILIDADE DA NAVBAR NO SCROLL
  const [isHidden, setIsHidden] = useState(false);
  const { scrollY } = useScroll();

  const navigate = useNavigate();
  const metadata = catalogService.getDynamicMetadata();
  const activeCategories = metadata.categories || [];

  // MONITORAR A DIREÇÃO DO SCROLL
  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    const isOverlayOpen = isUserMenuOpen || isCatalogMenuOpen || isLancamentosMenuOpen || isSearchOpen;

    // Se houver algum menu/overlay aberto, mantém a Navbar visível
    if (isOverlayOpen) {
      setIsHidden(false);
      return;
    }

    // Oculta ao rolar para baixo após passar de 100px do topo; exibe ao rolar para cima
    if (latest > previous && latest > 100) {
      setIsHidden(true);
    } else if (latest < previous) {
      setIsHidden(false);
    }
  });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalogo?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <motion.header 
      className={styles.headerContainer}
      variants={{
        visible: { y: '0%' },
        hidden: { y: '-100%' }
      }}
      animate={isHidden ? 'hidden' : 'visible'}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
    >
      
      {/* 1. TOP MARQUEE TICKER */}
      <div className={styles.topMarquee}>
        <div className={styles.marqueeTrack}>
          <span>THR33: THE STREETS ARE OURS ★ FOR THE FEW ★ LEAK TWO ★ [BOT VERIFICATION: PASS] ★ ATELIÊ R.U.A ★ </span>
          <span>THR33: THE STREETS ARE OURS ★ FOR THE FEW ★ LEAK TWO ★ [BOT VERIFICATION: PASS] ★ ATELIÊ R.U.A ★ </span>
        </div>
      </div>

      {/* 2. MAIN NAVBAR */}
      <div className={styles.mainNav}>
        
        {/* LEFT: FIXED NAVIGATION LINKS */}
        <nav className={styles.leftNav}>
          
          {/* LINK: LANÇAMENTOS COM FLYOUT DE GIF PURO */}
          <div 
            className={styles.navHoverWrapper}
            onMouseEnter={() => setIsLancamentosMenuOpen(true)}
            onMouseLeave={() => setIsLancamentosMenuOpen(false)}
          >
            <NavLink 
              to="/lancamentos" 
              className={({ isActive }) => 
                isActive 
                  ? `${styles.navItem} ${styles.activeNavItem}` 
                  : isLancamentosMenuOpen 
                    ? `${styles.navItem} ${styles.openMenuNavItem}` 
                    : styles.navItem
              }
            >
              <span>LANÇAMENTOS</span>
              <span className={styles.dropLivePulse} />
            </NavLink>

            {/* FLYOUT COMPACTO DE GIF */}
            <AnimatePresence>
              {isLancamentosMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className={styles.pureGifFlyout}
                >
                  <Link 
                    to="/lancamentos" 
                    onClick={() => setIsLancamentosMenuOpen(false)} 
                    className={styles.gifLinkFrame}
                    title="Acessar Lançamentos"
                  >
                    <img 
                      src={currentDropConfig.teaserGifUrl || currentDropConfig.manifestoImage || currentDropConfig.heroImage} 
                      alt="Preview do Drop" 
                      className={styles.gifMediaElement}
                    />
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* LINK: CATÁLOGO COM DROPDOWN */}
          <div 
            className={styles.navHoverWrapper}
            onMouseEnter={() => setIsCatalogMenuOpen(true)}
            onMouseLeave={() => setIsCatalogMenuOpen(false)}
          >
            <NavLink 
              to="/catalogo" 
              className={({ isActive }) => 
                isActive 
                  ? `${styles.navItem} ${styles.activeNavItem}` 
                  : isCatalogMenuOpen 
                    ? `${styles.navItem} ${styles.openMenuNavItem}` 
                    : styles.navItem
              }
              end
            >
              <span>CATÁLOGO</span>
              <ChevronDown 
                size={12} 
                className={`${styles.chevronIcon} ${isCatalogMenuOpen ? styles.chevronRotated : ''}`} 
              />
            </NavLink>

            <AnimatePresence>
              {isCatalogMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className={styles.catalogDropdown}
                >
                

                  <Link 
                    to="/catalogo" 
                    onClick={() => setIsCatalogMenuOpen(false)} 
                    className={styles.btnAllCatalog}
                  >
                    <span>[ EXPLORAR TODO O CATÁLOGO ]</span>
                    <ArrowRight size={14} />
                  </Link>

                  {activeCategories.length > 0 && (
                    <div className={styles.categoryGrid}>
                      <span className={styles.categorySectionLabel}>CATEGORIAS EM ESTOQUE:</span>
                      {activeCategories.map((cat) => (
                        <Link 
                          key={cat.slug} 
                          to={`/categoria/${cat.slug}`}
                          onClick={() => setIsCatalogMenuOpen(false)}
                          className={styles.categoryItemLink}
                        >
                          <span className={styles.catLabel}>{cat.label}</span>
                          <span className={styles.catCountBadge}>[{cat.count}]</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <NavLink 
            to="/drops-passados" 
            className={({ isActive }) => isActive ? `${styles.navItem} ${styles.activeNavItem}` : styles.navItem}
          >
            DROPS PASSADOS
          </NavLink>
        </nav>

        {/* CENTER: THR33 CAPSULE LOGO */}
        <div className={styles.centerLogo}>
          <Link to="/" className={styles.logoPill}>
            <span>THR33</span>
          </Link>
        </div>

        {/* RIGHT: ACTION ICONS & CART */}
        <div className={styles.rightActions}>
          <button 
            onClick={() => setIsSearchOpen(!isSearchOpen)} 
            className={styles.iconBox}
            title="Buscar Peça"
          >
            <Search size={16} />
          </button>

          <div className={styles.userWrapper}>
            <button 
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} 
              className={styles.iconBox}
              title="Perfil de Usuário"
            >
              <User size={16} />
              {user && <span className={styles.activeUserDot} />}
            </button>

            {isUserMenuOpen && (
              <div className={styles.userDropdown}>
                {user ? (
                  <>
                    <div className={styles.dropdownHeader} onClick={() => { setIsUserMenuOpen(false); navigate('/minha-conta'); }} style={{ cursor: 'pointer' }}>
                      <span className={styles.passId}>PASSAPORTE {user.passId || '#0482'}</span>
                      <strong className={styles.userName}>{user.name || 'WESLLEY K.'}</strong>
                    </div>
                    <div className={styles.dropdownDivider} />
                    <button onClick={() => { setIsUserMenuOpen(false); navigate('/minha-conta?tab=pedidos'); }} className={styles.dropdownLink}>
                      <Package size={14} /> <span>MEUS PEDIDOS & DROPS</span>
                    </button>
                    <button onClick={() => { setIsUserMenuOpen(false); navigate('/minha-conta?tab=dados'); }} className={styles.dropdownLink}>
                      <Settings size={14} /> <span>CONFIGURAÇÕES & DADOS</span>
                    </button>
                    <div className={styles.dropdownDivider} />
                    <button onClick={() => { setIsUserMenuOpen(false); if(onLogout) onLogout(); }} className={styles.dropdownLogout}>
                      <LogOut size={14} /> <span>SAIR DA CONTA</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className={styles.dropdownHeader}>
                      <span className={styles.passId}>TERMINAL DE ACESSO</span>
                      <strong>VISITANTE // FOR THE FEW</strong>
                    </div>
                    <div className={styles.dropdownDivider} />
                    <button onClick={() => { setIsUserMenuOpen(false); if(onOpenAuthModal) onOpenAuthModal(null, 'login'); }} className={styles.btnAuthPrimary}>
                      [ 01. ENTRAR ]
                    </button>
                    <button onClick={() => { setIsUserMenuOpen(false); if(onOpenAuthModal) onOpenAuthModal(null, 'register'); }} className={styles.btnAuthSecondary}>
                      [ 02. CRIAR CONTA ]
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <button onClick={onOpenCart} className={styles.cartBox}>
            <ShoppingBag size={14} />
            <span>CARRINHO ({String(cartCount).padStart(2, '0')})</span>
          </button>
        </div>

      </div>

      {/* SEARCH BAR OVERLAY */}
      {isSearchOpen && (
        <div className={styles.searchOverlay}>
          <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
            <Search size={18} className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="DIGITE O NOME DA PEÇA (EX: BOXY V.1, MOLETOM...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <button type="button" onClick={() => setIsSearchOpen(false)} className={styles.closeSearchBtn}>
              <X size={18} />
            </button>
          </form>
        </div>
      )}

    </motion.header>
  );
}

export default Navbar;
