import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Mail, 
  RefreshCw, 
  ChevronDown, 
  Send, 
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import styles from './Suporte.module.css';

const FAQ_DATA = [
  {
    question: "Como funciona a confecção e entrega sob demanda?",
    answer: "Trabalhamos com fechamento semanal de pedidos. As peças são cortadas, estampadas e costuradas por demanda e enviadas diretamente da fábrica parceira com código de rastreio."
  },
  {
    question: "Como solicitar suporte, troca ou cancelamento?",
    answer: "Você pode solicitar auxílio a qualquer momento acessando seu pedido no Perfil informando o ocorrido, ou diretamente pelo e-mail sac@thr33.com e WhatsApp."
  },
  {
    question: "Qual a diferença entre Boxy Fit e Oversized Heavy?",
    answer: "A modelagem Boxy possui corte quadrado mais curto no comprimento com ombros caídos. A Oversized Heavy possui malha pesada de 260g/m² com caimento amplo e estruturado."
  },
  {
    question: "Como resgatar um Vale-Presente?",
    answer: "Acesse a aba Carteira dentro da sua conta e insira o código digital de resgate. O saldo é creditado na hora e pode ser usado para abater valores no checkout."
  }
];

export function Suporte() {
  const [openFaq, setOpenFaq] = useState(null);

  // Form de Sugestão/Report
  const [feedback, setFeedback] = useState({
    name: '',
    email: '',
    type: 'sugestao-camisa', // 'sugestao-camisa', 'bug', 'experiencia'
    message: ''
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSubmitFeedback = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <span className={styles.tag}>CENTRAL DE ATENDIMENTO</span>
        <h1 className={styles.title}>COMO PODEMOS TE AJUDAR?</h1>
      </header>

      {/* CANAIS DIRETOS DE CONTATO */}
      <section className={styles.channelsGrid}>
        <motion.div 
          className={styles.channelCard}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <div className={styles.iconWrapper}>
            <MessageSquare size={24} strokeWidth={1.8} />
          </div>
          <h3>WHATSAPP SAC</h3>
          <p>Atendimento direto com nossa equipe curitibana.</p>
          <span className={styles.hours}>Seg a Sex: 09h às 18h</span>
          <a href="https://wa.me/5541999999999" target="_blank" rel="noreferrer" className={styles.channelBtn}>
            INICIAR CONVERSA
          </a>
        </motion.div>

        <motion.div 
          className={styles.channelCard}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <div className={styles.iconWrapper}>
            <Mail size={24} strokeWidth={1.8} />
          </div>
          <h3>E-MAIL SUPORTE</h3>
          <p>Envie dúvidas sobre pedidos, notas e trocas.</p>
          <span className={styles.hours}>Resposta em até 24h</span>
          <a href="mailto:sac@thr33.com" className={styles.channelBtn}>
            ENVIAR E-MAIL
          </a>
        </motion.div>

        <motion.div 
          className={styles.channelCard}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <div className={styles.iconWrapper}>
            <RefreshCw size={24} strokeWidth={1.8} />
          </div>
          <h3>TROCAS & DEVOLUÇÕES</h3>
          <p>Gere sua etiqueta de logística reversa sem custos.</p>
          <span className={styles.hours}>Até 30 dias após a compra</span>
          <a href="/politicas" className={styles.channelBtn}>
            VER REGULAMENTO
          </a>
        </motion.div>
      </section>

      {/* PERGUNTAS FREQUENTES (FAQ COM MOTION) */}
      <section className={styles.faqSection}>
        <div className={styles.faqHeader}>
          <HelpCircle size={18} />
          <h2 className={styles.sectionTitle}>PERGUNTAS FREQUENTES (FAQ)</h2>
        </div>
        <div className={styles.accordionList}>
          {FAQ_DATA.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className={styles.faqItem}>
                <button 
                  type="button"
                  className={styles.faqQuestion} 
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                >
                  <span className={isOpen ? styles.activeQuestionText : ''}>{item.question}</span>
                  <motion.span 
                    className={styles.chevron}
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                  >
                    <ChevronDown size={18} />
                  </motion.span>
                </button>
                
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div 
                      key="content"
                      className={styles.faqAnswerWrapper}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className={styles.faqAnswer}>
                        <p>{item.answer}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* FORMULÁRIO DE SUGESTÃO / FEEDBACK */}
      <section className={styles.feedbackSection}>
        <div className={styles.feedbackBox}>
          <div className={styles.feedbackTitleGroup}>
            <h2>AJUDE A THR33 A DEIXAR SUA EXPERIÊNCIA MELHOR</h2>
          </div>
          <p>Sugira ideias de estampas, report do site ou envie seu feedback direto para os criadores.</p>

          {submitted ? (
            <div className={styles.successMessage}>
              <CheckCircle2 size={18} />
              <span>Obrigado pelo feedback! Nossa equipe vai analisar sua mensagem.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmitFeedback} className={styles.feedbackForm}>
              <div className={styles.inputRow}>
                <input 
                  type="text" 
                  placeholder="Seu Nome" 
                  value={feedback.name} 
                  onChange={(e) => setFeedback({ ...feedback, name: e.target.value })} 
                  required 
                />
                <input 
                  type="email" 
                  placeholder="Seu E-mail" 
                  value={feedback.email} 
                  onChange={(e) => setFeedback({ ...feedback, email: e.target.value })} 
                  required 
                />
              </div>

              <select 
                value={feedback.type} 
                onChange={(e) => setFeedback({ ...feedback, type: e.target.value })}
                className={styles.selectInput}
              >
                <option value="sugestao-camisa">Ideia de Estampa / Camiseta</option>
                <option value="bug">Reportar um Bug no Site</option>
                <option value="experiencia">Sugestão de Melhoria</option>
              </select>

              <textarea 
                rows="4" 
                placeholder="Escreva sua mensagem aqui..." 
                value={feedback.message} 
                onChange={(e) => setFeedback({ ...feedback, message: e.target.value })} 
                required 
              />

              <button type="submit" className={styles.sendBtn}>
                <Send size={15} />
                <span>ENVIAR SUGESTÃO</span>
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

export default Suporte;
