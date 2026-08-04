import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import styles from './Navbar.module.css';

export default function Navbar({
  cartCount = 2,
  initialLoggedIn = true,
  userName = 'WESLLEY K.',
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(initialLoggedIn);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const marqueeText =
    'THR33: THE STREETS ARE OURS ★ FOR THE FEW ★ LEAK TWO ★ [BOT VERIFICATION: PASS] ★ ';

  return (
    <header className={styles.navbarContainer}>
      {/* Top Marquee Ticker (Linha 1) */}
      <div className={styles.topTicker}>
        <div className={styles.tickerTrack}>
          <span className={styles.tickerItem}>{marqueeText}</span>
          <span className={styles.tickerItem}>{marqueeText}</span>
          <span className={styles.tickerItem}>{marqueeText}</span>
          <span className={styles.tickerItem}>{marqueeText}</span>
        </div>
      </div>

      {/* Main Navigation Bar (Linha 2) */}
      <nav className={styles.mainBar}>
        {/* Mobile menu toggle */}
        <button
          className={styles.mobileMenuBtn}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          ☰
        </button>

        {/* Esquerda: Links de texto direto */}
        <div
          className={`${styles.leftSection} ${
            mobileMenuOpen ? styles.mobileOpen : ''
          }`}
        >
          <NavLink
            to="/lancamentos"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.activeLink : ''}`
            }
          >
            LANÇAMENTOS
          </NavLink>

          <NavLink
            to="/catalogo"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.activeLink : ''}`
            }
          >
            CATÁLOGO
          </NavLink>

          <NavLink
            to="/drops-passados"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.activeLink : ''}`
            }
          >
            DROPS PASSADOS
          </NavLink>
        </div>

        {/* Centro: Emblem / Logo Oval THR33 em Preto Piano */}
        <div className={styles.centerSection}>
          <Link to="/" className={styles.brandEmblem} title="THR33 Home">
            <span className={styles.emblemText}>THR33</span>
          </Link>
        </div>

        {/* Direita: Busca, Perfil com Dropdown e Carrinho */}
        <div className={styles.rightSection}>
          {/* Tag de usuário logado (exibida ao lado do ícone quando logado) */}
          {isLoggedIn && (
            <div className={styles.userBadge}>
              <span className={styles.userDot}>●</span>
              <span>{userName}</span>
            </div>
          )}

          {/* Busca */}
          <button
            className={styles.iconBtn}
            title="Buscar no site"
            aria-label="Buscar"
          >
            🔍
          </button>

          {/* Perfil & Dropdown Terminal de Acesso */}
          <div className={styles.userMenuWrapper} ref={dropdownRef}>
            <button
              className={styles.iconBtn}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              title="Terminal de Acesso"
              aria-label="Perfil do Usuário"
            >
              👤
            </button>

            {isDropdownOpen && (
              <div className={styles.dropdownMenu}>
                <div className={styles.dropdownHeader}>
                  <span>TERMINAL DE ACESSO</span>
                  <button
                    className={styles.demoToggle}
                    onClick={() => setIsLoggedIn(!isLoggedIn)}
                    title="Alternar estado de login (Demo)"
                  >
                    {isLoggedIn ? 'LOGOUT DEMO' : 'LOGIN DEMO'}
                  </button>
                </div>

                {!isLoggedIn ? (
                  /* Estado Deslogado */
                  <>
                    <button
                      className={styles.dropdownBtn}
                      onClick={() => setIsLoggedIn(true)}
                    >
                      [ 01. ENTRAR ]
                    </button>
                    <button
                      className={styles.dropdownBtn}
                      onClick={() => alert('Abrir modal de cadastro')}
                    >
                      [ 02. CRIAR CONTA ]
                    </button>
                  </>
                ) : (
                  /* Estado Logado */
                  <>
                    <button
                      className={styles.dropdownBtn}
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      [ 📦 MEUS PEDIDOS ]
                    </button>
                    <button
                      className={styles.dropdownBtn}
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      [ ⚙ CONFIGURAÇÕES ]
                    </button>
                    <button
                      className={styles.dropdownBtn}
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      [ 💳 ENDEREÇOS ]
                    </button>
                    <button
                      className={`${styles.dropdownBtn} ${styles.logoutBtn}`}
                      onClick={() => {
                        setIsLoggedIn(false);
                        setIsDropdownOpen(false);
                      }}
                    >
                      [ → SAIR DA CONTA ]
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Carrinho em Badge Preta */}
          <button className={styles.cartBtn}>
            CARRINHO ({String(cartCount).padStart(2, '0')})
          </button>
        </div>
      </nav>
    </header>
  );
}
