import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, HelpCircle } from 'lucide-react';
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
    <section className={styles.sectionContainer}>
      <div className={styles.headerTitle}>
        <HelpCircle size={16} className={styles.acidIcon} />
        <h2>DÚVIDAS FREQUENTES // PROTOCOLO DE COMPRA</h2>
      </div>

      <div className={styles.faqList}>
        {faqItems.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div key={idx} className={styles.faqCard}>
              <button 
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className={styles.faqQuestionBtn}
              >
                <span>{item.q}</span>
                {isOpen ? <Minus size={16} /> : <Plus size={16} />}
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={styles.faqAnswerContent}
                  >
                    <p>{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default DropFaq;
