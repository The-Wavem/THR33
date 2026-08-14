import React from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Image, 
  Package, 
  ArrowLeft, 
  ShieldCheck, 
  LogOut 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import styles from './AdminLayout.module.css';

export function AdminLayout() {
  const { currentUser, logout } = useAuth();
  const adminName = currentUser?.name || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Administrador';

  return (
    <div className={styles.adminContainer}>
      {/* SIDEBAR DO CMS */}
      <aside className={styles.sidebar}>
        <div className={styles.brandHeader}>
          <Link className={styles.logo} to="/cms">
            <span className={styles.logoMain}>THR33</span>
            <span className={styles.logoBadge}>CMS ENGINE</span>
          </Link>
        </div>

        <nav className={styles.navMenu}>
          <NavLink 
            to="/cms" 
            end 
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.activeItem : ''}`}
          >
            <LayoutDashboard size={16} className={styles.navIcon} />
            <span>Visão Geral & CRM</span>
          </NavLink>
          <NavLink 
            to="/cms/produtos" 
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.activeItem : ''}`}
          >
            <ShoppingBag size={16} className={styles.navIcon} />
            <span>Catálogo & SKUs</span>
          </NavLink>
          <NavLink 
            to="/cms/vitrine" 
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.activeItem : ''}`}
          >
            <Image size={16} className={styles.navIcon} />
            <span>Vitrine & Banners</span>
          </NavLink>
          <NavLink 
            to="/cms/pedidos" 
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.activeItem : ''}`}
          >
            <Package size={16} className={styles.navIcon} />
            <span>Pedidos & Trocas</span>
          </NavLink>
        </nav>

        <div className={styles.sidebarFooter}>
          <Link className={styles.backToStoreBtn} to="/">
            <ArrowLeft size={14} />
            <span>Ver Loja Ao Vivo</span>
          </Link>
        </div>
      </aside>

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <div className={styles.mainContent}>
        <header className={styles.topBar}>
          <div className={styles.systemStatus}>
            <span className={styles.statusDot}></span>
            <span className={styles.statusText}>SISTEMA ONLINE & SINCRONIZADO</span>
          </div>

          <div className={styles.topBarRight}>
            <div className={styles.adminUserBadge}>
              <ShieldCheck size={14} className={styles.adminBadgeIcon} />
              <span>ADM: {adminName}</span>
              {currentUser?.email && (
                <small className={styles.adminEmailBadge}>({currentUser.email})</small>
              )}
            </div>
            <button 
              onClick={logout} 
              className={styles.logoutBtn}
              title="Encerrar Sessão"
            >
              <LogOut size={13} />
              <span>Sair</span>
            </button>
          </div>
        </header>

        <div className={styles.contentBody}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
