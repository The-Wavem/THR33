import React, { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Percent,
  Image, 
  Package, 
  BarChart3, 
  Target,
  Ticket,
  Headphones,
  Star,
  ArrowLeft, 
  ShieldCheck, 
  LogOut,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import styles from './AdminLayout.module.css';

export function AdminLayout() {
  const { currentUser, logout } = useAuth();
  const adminName = currentUser?.name || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Administrador';

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('thr33_cms_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('thr33_cms_sidebar_collapsed', String(next));
      } catch (err) {
        console.error('Erro ao persistir estado da sidebar:', err);
      }
      return next;
    });
  };

  return (
    <div className={styles.adminContainer}>
      {/* SIDEBAR DO CMS */}
      <aside className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ''}`}>
        <div className={styles.brandHeader}>
          <div className={styles.brandHeaderContent}>
            {!isCollapsed && (
              <Link className={styles.logo} to="/cms" title="THR33 CMS Engine">
                <span className={styles.logoMain}>THR33</span>
                <span className={styles.logoBadge}>WEM</span>
              </Link>
            )}
            <button 
              type="button"
              className={styles.collapseToggleBtn}
              onClick={toggleSidebar}
              title={isCollapsed ? "Expandir menu lateral" : "Minimizar menu lateral (apenas ícones)"}
              aria-label={isCollapsed ? "Expandir menu lateral" : "Minimizar menu lateral"}
            >
              {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>
        </div>

        <nav className={styles.navMenu}>
          {/* SEÇÃO 1: DADOS & PERFORMANCE */}
          <div className={styles.navSection}>
            <span className={styles.sectionTitle}>DADOS & PERFORMANCE</span>
            <NavLink 
              to="/cms" 
              end 
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.activeItem : ''}`}
              title="Visão Geral & CRM"
            >
              <LayoutDashboard size={18} className={styles.navIcon} />
              <span>Visão Geral & CRM</span>
            </NavLink>
            <NavLink 
              to="/cms/analytics" 
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.activeItem : ''}`}
              title="Métricas & Atividades"
            >
              <BarChart3 size={18} className={styles.navIcon} />
              <span>Métricas & Atividades</span>
            </NavLink>
          </div>

          {/* SEÇÃO 2: MARKETING & RASTREIOS EXTERNOS */}
          <div className={styles.navSection}>
            <span className={styles.sectionTitle}>MARKETING & RASTREIOS</span>
            <NavLink 
              to="/cms/campanhas" 
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.activeItem : ''}`}
              title="Campanhas & UTMs"
            >
              <Target size={18} className={styles.navIcon} />
              <span>Campanhas & UTMs</span>
            </NavLink>
            <NavLink 
              to="/cms/cupons" 
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.activeItem : ''}`}
              title="Cupons & Parceiros"
            >
              <Ticket size={18} className={styles.navIcon} />
              <span>Cupons & Parceiros</span>
            </NavLink>
          </div>

          {/* SEÇÃO 3: OPERAÇÃO & PEDIDOS */}
          <div className={styles.navSection}>
            <span className={styles.sectionTitle}>OPERAÇÃO & PEDIDOS</span>
            <NavLink 
              to="/cms/pedidos" 
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.activeItem : ''}`}
              title="Gestão de Pedidos"
            >
              <Package size={18} className={styles.navIcon} />
              <span>Gestão de Pedidos</span>
            </NavLink>
            <NavLink 
              to="/cms/produtos" 
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.activeItem : ''}`}
              title="Catálogo & SKUs"
            >
              <ShoppingBag size={18} className={styles.navIcon} />
              <span>Catálogo & SKUs</span>
            </NavLink>
            <NavLink 
              to="/cms/descontos" 
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.activeItem : ''}`}
              title="Descontos & Promoções"
            >
              <Percent size={18} className={styles.navIcon} />
              <span>Descontos & Promoções</span>
            </NavLink>
            <NavLink 
              to="/cms/vitrine" 
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.activeItem : ''}`}
              title="Vitrine & Banners"
            >
              <Image size={18} className={styles.navIcon} />
              <span>Vitrine & Banners</span>
            </NavLink>
          </div>

          {/* SEÇÃO 4: ATENDIMENTO & COMUNIDADE */}
          <div className={styles.navSection}>
            <span className={styles.sectionTitle}>ATENDIMENTO & COMUNIDADE</span>
            <NavLink 
              to="/cms/suporte" 
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.activeItem : ''}`}
              title="SAC & Chamados"
            >
              <Headphones size={18} className={styles.navIcon} />
              <span>SAC & Chamados</span>
            </NavLink>
            <NavLink 
              to="/cms/avaliacoes" 
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.activeItem : ''}`}
              title="Moderação de Avaliações"
            >
              <Star size={18} className={styles.navIcon} />
              <span>Moderação de Avaliações</span>
            </NavLink>
          </div>
        </nav>

        <div className={styles.sidebarFooter}>
          <Link 
            className={styles.backToStoreBtn} 
            to="/"
            title="Ver Loja Ao Vivo"
          >
            <ArrowLeft size={16} />
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
