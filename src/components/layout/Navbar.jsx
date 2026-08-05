import React, { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import {
  Search,
  User,
  ShoppingBag,
  X,
  LogOut,
  Package,
  Settings,
} from "lucide-react";
import styles from "./Navbar.module.css";

export function Navbar({
  cartCount = 2,
  onOpenCart,
  user,
  onLogout,
  onOpenAuthModal,
}) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalogo?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <header className={styles.headerContainer}>
      {/* 1. TOP MARQUEE TICKER */}
      <div className={styles.topMarquee}>
        <div className={styles.marqueeTrack}>
          <span>
            THR33: THE STREETS ARE OURS ★ FOR THE FEW ★ LEAK TWO ★ [BOT
            VERIFICATION: PASS] ★ ATELIÊ R.U.A ★{" "}
          </span>
          <span>
            THR33: THE STREETS ARE OURS ★ FOR THE FEW ★ LEAK TWO ★ [BOT
            VERIFICATION: PASS] ★ ATELIÊ R.U.A ★{" "}
          </span>
        </div>
      </div>

      {/* 2. MAIN NAVBAR BAR */}
      <div className={styles.mainNav}>
        {/* LEFT: NAVIGATION LINKS */}
        <nav className={styles.leftNav}>
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive
                ? `${styles.navItem} ${styles.activeNavItem}`
                : styles.navItem
            }
          >
            LANÇAMENTOS
          </NavLink>
          <NavLink
            to="/catalogo"
            className={({ isActive }) =>
              isActive
                ? `${styles.navItem} ${styles.activeNavItem}`
                : styles.navItem
            }
          >
            CATÁLOGO
          </NavLink>
          <NavLink
            to="/drops-passados"
            className={({ isActive }) =>
              isActive
                ? `${styles.navItem} ${styles.activeNavItem}`
                : styles.navItem
            }
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
          {/* SEARCH BUTTON */}
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={styles.iconBox}
            title="Buscar Peça"
          >
            <Search size={16} />
          </button>

          {/* USER PROFILE BUTTON */}
          <div className={styles.userWrapper}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className={styles.iconBox}
              title="Perfil de Usuário"
            >
              <User size={16} />
              {user && <span className={styles.activeUserDot} />}
            </button>

            {/* USER DROPDOWN MENU */}
            {isUserMenuOpen && (
              <div className={styles.userDropdown}>
                {user ? (
                  <>
                    <div className={styles.dropdownHeader}>
                      <span className={styles.passId}>
                        PASSAPORTE {user.passId || "#0482"}
                      </span>
                      <strong className={styles.userName}>
                        {user.name || "WESLLEY K."}
                      </strong>
                    </div>
                    <div className={styles.dropdownDivider} />
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        navigate("/pedidos");
                      }}
                      className={styles.dropdownLink}
                    >
                      <Package size={14} /> <span>MEUS PEDIDOS</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        navigate("/configuracoes");
                      }}
                      className={styles.dropdownLink}
                    >
                      <Settings size={14} /> <span>CONFIGURAÇÕES</span>
                    </button>
                    <div className={styles.dropdownDivider} />
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        if (onLogout) onLogout();
                      }}
                      className={styles.dropdownLogout}
                    >
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
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        if (onOpenAuthModal) onOpenAuthModal();
                      }}
                      className={styles.btnAuthPrimary}
                    >
                      [ 01. ENTRAR ]
                    </button>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        if (onOpenAuthModal) onOpenAuthModal();
                      }}
                      className={styles.btnAuthSecondary}
                    >
                      [ 02. CRIAR CONTA ]
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* CART BUTTON */}
          <button onClick={onOpenCart} className={styles.cartBox}>
            <ShoppingBag size={14} />
            <span>CARRINHO ({String(cartCount).padStart(2, "0")})</span>
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
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              className={styles.closeSearchBtn}
            >
              <X size={18} />
            </button>
          </form>
        </div>
      )}
    </header>
  );
}

export default Navbar;
