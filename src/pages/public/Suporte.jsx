import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Mail, Clock, Package, RefreshCcw, Ruler, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeInUp, buttonTactile } from '../../utils/motionVariants';
import styles from './Suporte.module.css';

export function Suporte() {
  return (
    <div className={styles.pageContainer}>
      <motion.div initial="hidden" animate="visible" variants={fadeInUp} className={styles.contentWrapper}>
        
        <div className={styles.header}>
          <span className={styles.tag}>[ SUPORTE TÁTICO ]</span>
          <h1>CENTRAL DE ATENDIMENTO</h1>
          <p>Como o Ateliê pode ajudar você hoje? Escolha um canal direto ou acesse nossos serviços rápidos.</p>
        </div>

        {/* CANAIS DE CONTATO DIRETOS */}
        <div className={styles.contactGrid}>
          <div className={styles.contactCard}>
            <div className={styles.cardHeader}>
              <MessageCircle size={24} className={styles.iconAcid} />
              <h3>WHATSAPP</h3>
            </div>
            <p>Atendimento rápido e direto com a equipe do Ateliê para dúvidas e suporte imediato.</p>
            <motion.a 
              variants={buttonTactile} initial="rest" whileHover="hover" whileTap="tap"
              href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer"
              className={styles.btnAction}
            >
              <span>INICIAR CONVERSA</span>
              <ArrowRight size={16} />
            </motion.a>
          </div>

          <div className={styles.contactCard}>
            <div className={styles.cardHeader}>
              <Mail size={24} className={styles.iconAcid} />
              <h3>E-MAIL (SAC)</h3>
            </div>
            <p>Para tratativas formais, devoluções, parcerias ou assuntos detalhados.</p>
            <motion.a 
              variants={buttonTactile} initial="rest" whileHover="hover" whileTap="tap"
              href="mailto:suporte@thr33.com.br"
              className={styles.btnAction}
            >
              <span>ENVIAR E-MAIL</span>
              <ArrowRight size={16} />
            </motion.a>
          </div>

          <div className={styles.hoursCard}>
            <Clock size={24} />
            <div className={styles.hoursText}>
              <strong>HORÁRIO DE OPERAÇÃO</strong>
              <span>Segunda à Sexta: 09h às 18h</span>
              <span>Sábados, Domingos e Feriados: Fechado</span>
            </div>
          </div>
        </div>

        {/* SERVIÇOS RÁPIDOS */}
        <div className={styles.quickServices}>
          <h2>SERVIÇOS RÁPIDOS</h2>
          <div className={styles.servicesGrid}>
            <Link to="/minha-conta?tab=pedidos" className={styles.serviceItem}>
              <Package size={20} />
              <strong>MEUS PEDIDOS & RASTREIO</strong>
              <span>Acompanhe o envio SEDEX e o status do lote.</span>
            </Link>

            <Link to="/politicas?aba=reembolso" className={styles.serviceItem}>
              <RefreshCcw size={20} />
              <strong>TROCAS E DEVOLUÇÕES</strong>
              <span>Saiba como iniciar o processo em até 30 dias.</span>
            </Link>

            <Link to="/catalogo" className={styles.serviceItem}>
              <Ruler size={20} />
              <strong>GUIA DE TAMANHOS (FIT)</strong>
              <span>Consulte a tabela de medidas Boxy e Oversized.</span>
            </Link>
          </div>
        </div>

      </motion.div>
    </div>
  );
}

export default Suporte;
