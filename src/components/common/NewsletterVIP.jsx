import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { fadeInUp, buttonTactile } from '../../utils/motionVariants';
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
    <motion.section 
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25 }}
      variants={fadeInUp}
      className={styles.newsletterSection}
    >
      <div className={styles.newsletterContainer}>
        <div className={styles.textBlock}>
          <h3 className={styles.title}>FIQUE POR DENTRO</h3>
          <p className={styles.subtitle}>Se inscreva na newsletter da THR33.</p>
        </div>

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
            <motion.button 
              variants={buttonTactile}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
              type="submit" 
              className={styles.btnSubmit}
            >
              {submitted ? 'CADASTRADO' : 'CADASTRAR'}
            </motion.button>
          </div>
        </form>
      </div>
    </motion.section>
  );
}

export default NewsletterVIP;
