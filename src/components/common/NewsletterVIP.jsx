import React, { useState } from 'react';
import { Sparkles, ArrowRight, Check } from 'lucide-react';
import styles from './NewsletterVIP.module.css';

export function NewsletterVIP() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setEmail('');
      }, 4000);
    }
  };

  return (
    <section className={styles.sectionContainer}>
      <div className={styles.cardBox}>
        <div className={styles.textContent}>
          <div className={styles.badgeRow}>
            <Sparkles size={14} className={styles.acidIcon} />
            <span>DROP PROTOCOL // PRE-RELEASE ACCESS</span>
          </div>

          <h3>RECEBA A SENHA DE ACESSO DO PRÓXIMO DROP</h3>
          <p>
            Cadastre seu e-mail para receber o link direto da sala VIP 15 minutos antes da abertura oficial do estoque.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.formRow}>
          <input 
            type="email" 
            placeholder="DIGITE SEU E-MAIL AQUI..." 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.emailInput}
          />
          <button type="submit" className={styles.btnSubmit}>
            <span>ENTRAR NA LISTA VIP</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {submitted && (
          <div className={styles.successToast}>
            <Check size={16} />
            <span>✓ PROTOCOLO REGISTRADO COM SUCESSO! VOCÊ RECEBERÁ O ACESSO NO PRÓXIMO LOTE.</span>
          </div>
        )}
      </div>
    </section>
  );
}

export default NewsletterVIP;
