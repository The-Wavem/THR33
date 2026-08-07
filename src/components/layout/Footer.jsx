import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowUpRight } from 'lucide-react';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footerContainer}>
      <div className={styles.mainGrid}>
        
        {/* COLUNA 01: BRANDING & ATENDIMENTO */}
        <div className={styles.brandCol}>
          <Link to="/" className={styles.logoTitle}>
            THR33
          </Link>
          <span className={styles.brandTagline}>FOR THE FEW // ATELIÊ R.U.A</span>
          
          <div className={styles.hoursBox}>
            <span className={styles.hoursLabel}>ATENDIMENTO AO CLIENTE:</span>
            <p className={styles.hoursDetail}>
              De segunda à sexta-feira<br />
              09h às 18h — exceto feriados
            </p>
          </div>

          <div className={styles.socialsRow}>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
              INSTAGRAM <ArrowUpRight size={12} />
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
              TIKTOK <ArrowUpRight size={12} />
            </a>
          </div>
        </div>

        {/* COLUNA 02: INSTITUCIONAL */}
        <div className={styles.linksCol}>
          <h4 className={styles.colTitle}>INSTITUCIONAL</h4>
          <ul className={styles.linksList}>
            <li><Link to="/lancamentos">O Ateliê R.U.A</Link></li>
            <li><Link to="/lancamentos#manifesto">Manifesto Drop 01</Link></li>
            <li><Link to="/drops-passados">Drops Passados</Link></li>
            <li><Link to="/catalogo">Mostruário Geral</Link></li>
          </ul>
        </div>

        {/* COLUNA 03: SUPORTE */}
        <div className={styles.linksCol}>
          <h4 className={styles.colTitle}>SUPORTE</h4>
          <ul className={styles.linksList}>
            <li><Link to="/suporte">Central de Ajuda</Link></li>
            <li><Link to="/minha-conta?tab=pedidos">Meus Pedidos & Rastreio</Link></li>
            <li><Link to="/politicas?aba=reembolso">Solicitar Troca ou Devolução</Link></li>
            <li><Link to="/guia-de-tamanhos">Guia de Tamanhos & Fits</Link></li>
          </ul>
        </div>

        {/* COLUNA 04: POLÍTICAS */}
        <div className={styles.linksCol}>
          <h4 className={styles.colTitle}>POLÍTICAS</h4>
          <ul className={styles.linksList}>
            <li><Link to="/politicas?aba=privacidade">Política de Privacidade</Link></li>
            <li><Link to="/politicas?aba=envio">Política de Envio & Frete</Link></li>
            <li><Link to="/politicas?aba=termos">Termos do Drop Limitado</Link></li>
            <li><Link to="/politicas?aba=reembolso">Política de Reembolso</Link></li>
          </ul>
        </div>

      </div>

      {/* BARRA INFERIOR DE COPYRIGHT E SEGURANÇA */}
      <div className={styles.bottomBar}>
        <div className={styles.bottomBarContainer}>
          <span className={styles.copyrightText}>
            © 2026 THR33 ★ ALL RIGHTS RESERVED // FOR THE FEW
          </span>

          <div className={styles.securityBadge}>
            <ShieldCheck size={14} className={styles.shieldIcon} />
            <span>PROTECTED BY THR33 ANTI-BOT SYSTEM</span>
            <span className={styles.statusDot} />
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
