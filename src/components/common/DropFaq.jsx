import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, HelpCircle } from 'lucide-react';
import { fadeInUp } from '../../utils/motionVariants';
import styles from './DropFaq.module.css';

const faqItems = [
  {
    q: 'COMO FUNCIONAM OS DROPS E LOTES LIMITADOS?',
    a: 'Cada drop é produzido em tiragem única numerada (ex: 33 unidades). Uma vez esgotado o lote, a peça entra para o arquivo histórico e não retorna em reposições normais.'
  },
  {
    q: 'QUAL A GRAMATURA E QUALIDADE DO TECIDO?',
    a: 'Utilizamos malhas pesadas de algodão selecionado que variam entre 280GSM e 380GSM (Heavyweight), com toque macio e acabamento reforçado com costura dupla.'
  },
  {
    q: 'QUAL O PRAZO DE ENVIO TÁTICO?',
    a: 'Pedidos do drop prioritário são despachados em embalagem selada em até 48 horas úteis com rastreamento expresso direto para todo o Brasil.'
  },
  {
    q: 'POSSO REALIZAR A TROCA CASO O TAMANHO NÃO SIRVA?',
    a: 'Sim, você possui 30 dias após o recebimento para solicitar a troca por outro tamanho disponível ou crédito na loja, desde que a peça mantenha os lacres e etiquetas originais.'
  }
];

export function DropFaq() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <motion.section 
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={fadeInUp}
      className={styles.sectionContainer}
    >
      <div className={styles.headerTitle}>
        <HelpCircle size={16} className={styles.acidIcon} />
        <h2>DÚVIDAS FREQUENTES // PROTOCOLO DE COMPRA</h2>
      </div>

      <div className={styles.faqList}>
        {faqItems.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <motion.div 
              key={idx} 
              className={styles.faqCard}
              transition={{ duration: 0.2 }}
            >
              <button 
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className={styles.faqQuestionBtn}
              >
                <span>{item.q}</span>
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  {isOpen ? <Minus size={16} /> : <Plus size={16} />}
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                    className={styles.faqAnswerContent}
                  >
                    <p>{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}

export default DropFaq;
