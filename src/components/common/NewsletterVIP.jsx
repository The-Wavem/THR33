import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fadeInUp, buttonTactile } from '../../utils/motionVariants';
import { useAuth } from '../../context/AuthContext';
import { currentDropConfig } from '../../data/dropConfig';
import { dropSubscriberService } from '../../services/dropSubscriberService';
import { newsletterService } from '../../services/newsletterService';
import styles from './NewsletterVIP.module.css';

export function NewsletterVIP() {
  const { currentUser } = useAuth() || {};
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const isAlreadySubscribed = Boolean(
    currentUser?.newsletterSubscribed || 
    (currentUser?.emailPreferences?.newsletter && !currentUser?.emailPreferences?.unsubscribedAll)
  );

  useEffect(() => {
    if (currentUser?.email && !email) {
      setEmail(currentUser.email);
    }
  }, [currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || submitting) return;

    if (!newsletterService.isValidEmail(cleanEmail)) {
      setFeedbackMsg('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    setSubmitting(true);
    setFeedbackMsg('');
    try {
      // 1. Sincroniza preferência central do ecossistema de newsletter
      await newsletterService.subscribeFromFooter(cleanEmail, currentUser);

      // 2. Registra na esteira da Lista VIP de Drops e dispara e-mail de boas-vindas
      await dropSubscriberService.subscribeToDropWaitlist({
        email: cleanEmail,
        name: currentUser?.displayName || currentUser?.name || '',
        dropId: currentDropConfig?.id || 'drop-thr33',
        dropName: currentDropConfig?.title || 'PRÓXIMO DROP THR33',
        source: 'home_newsletter'
      });

      setSubmitted(true);
      setFeedbackMsg('INSCRIÇÃO CONFIRMADA // VIP — Acesso prioritário garantido. Enviamos sua credencial para o e-mail.');
      setTimeout(() => {
        setSubmitted(false);
        if (!currentUser?.email) setEmail('');
      }, 6000);
    } catch (err) {
      setFeedbackMsg(err.message || 'Não foi possível concluir a inscrição. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.section 
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25 }}
      variants={fadeInUp}
      className={styles.newsletterSection}
    >
      <div className={styles.newsletterContainer}>
        <div className={styles.textBlock}>
          <span className={styles.vipBadge}>
            {isAlreadySubscribed
              ? 'VOCÊ JÁ ESTÁ NA LISTA VIP // ATIVO'
              : 'PRÉ-REGISTRO OFICIAL // EARLY ACCESS'}
          </span>
          <h3 className={styles.title}>LISTA VIP DE DROPS</h3>
          <p className={styles.subtitle}>
            Receba o link antecipado e senha de acesso antes das peças esgotarem no público geral.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.formBlock}>
          <div className={styles.inputWrapper}>
            <input 
              type="email" 
              placeholder="Digite seu melhor e-mail para a Lista VIP" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={styles.emailInput}
            />
            <motion.button 
              variants={buttonTactile}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
              type="submit" 
              disabled={submitting}
              className={styles.btnSubmit}
            >
              {submitting
                ? 'CADASTRANDO...'
                : submitted
                ? 'INSCRIÇÃO CONFIRMADA // VIP ✓'
                : isAlreadySubscribed
                ? 'ATUALIZAR PREFERÊNCIA'
                : 'ENTRAR NA LISTA'}
            </motion.button>
          </div>
          {feedbackMsg && (
            <span className={submitted ? styles.feedbackSuccess : styles.feedbackError}>
              {feedbackMsg}
            </span>
          )}
        </form>
      </div>
    </motion.section>
  );
}

export default NewsletterVIP;
