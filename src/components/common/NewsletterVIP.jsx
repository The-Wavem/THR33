import React, { useState } from 'react';
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
      }, 3500);
    }
  };

  return (
    <section className={styles.newsletterSection}>
      <div className={styles.newsletterContainer}>
        {/* LADO ESQUERDO: TÍTULO E SUBTÍTULO DIRETO */}
        <div className={styles.textBlock}>
          <h3 className={styles.title}>FIQUE POR DENTRO</h3>
          <p className={styles.subtitle}>Se inscreva na newsletter da THR33.</p>
        </div>

        {/* LADO DIREITO: FORMULÁRIO HORIZONTAL ULTRA-CLEAN */}
        <form onSubmit={handleSubmit} className={styles.formBlock}>
          <div className={styles.inputWrapper}>
            <input 
              type="email" 
              placeholder="E-mail" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={styles.emailInput}
            />
            <button type="submit" className={styles.btnSubmit}>
              {submitted ? 'CADASTRADO' : 'CADASTRAR'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

export default NewsletterVIP;
