import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Compass, ShoppingBag, HelpCircle } from 'lucide-react';
import styles from './NotFound.module.css';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <main className={styles.container}>
      <motion.div 
        className={styles.card}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* BADGE TÁTICO */}
        <div className={styles.badgeRow}>
          <span className={styles.errorBadge}>
            <Compass size={13} />
            <span>COORDENADA NÃO ENCONTRADA // 404</span>
          </span>
        </div>

        {/* GLITCH / CÓDIGO DO ERRO */}
        <h1 className={styles.errorCode}>404</h1>

        <h2 className={styles.title}>ROTA OU PEÇA INEXISTENTE</h2>
        
        <p className={styles.description}>
          A página que você está tentando acessar foi movida, expirou ou pertence a um arquivo restrito do Ateliê THR33.
        </p>

        {/* BOTÕES DE NAVEGAÇÃO E RECUPERAÇÃO */}
        <div className={styles.actionsGrid}>
          <button 
            type="button" 
            onClick={() => navigate(-1)} 
            className={styles.backBtn}
          >
            <ArrowLeft size={16} />
            <span>VOLTAR</span>
          </button>

          <Link to="/" className={styles.primaryBtn}>
            <span>INÍCIO</span>
          </Link>

          <Link to="/catalogo" className={styles.secondaryBtn}>
            <ShoppingBag size={16} />
            <span>CATÁLOGO</span>
          </Link>
        </div>

        {/* ATALHO PARA SUPORTE */}
        <div className={styles.supportFooter}>
          <span>Precisa de assistência?</span>
          <Link to="/suporte" className={styles.supportLink}>
            <HelpCircle size={14} />
            <span>Central de Atendimento</span>
          </Link>
        </div>
      </motion.div>
    </main>
  );
}

export default NotFound;
