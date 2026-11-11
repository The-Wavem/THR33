import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Mail, 
  RefreshCw, 
  ChevronDown, 
  Send, 
  CheckCircle2,
  HelpCircle,
  AtSign,
  ShieldCheck,
  FileText,
  ArrowUpRight
} from 'lucide-react';
import { SEO } from '../../components/common/SEO';
import { buildFaqSchema } from '../../utils/seoSchemas';
import { OFFICIAL_FAQ_ITEMS } from '../../components/common/DropFaq';
import styles from './Suporte.module.css';

const FAQ_DATA = [
  ...OFFICIAL_FAQ_ITEMS,
  {
    category: "Envio & Prazos",
    question: "Como funciona a produção sob demanda em parceria com a Savvy Print?",
    answer: "Operamos 100% online com lotes periódicos para garantir padrão máximo de malha e estamparia DTG sem desperdício. Assim que o pagamento é confirmado via PagBank, seu pedido entra no lote da nossa parceira oficial homologada (Savvy Print), que confecciona e despacha sua peça diretamente para o seu endereço com código de rastreio. A THR33 assume 100% da responsabilidade do pedido até a entrega em suas mãos."
  },
  {
    category: "Envio & Prazos",
    question: "O que acontece se meu pacote atrasar ou for extraviado pelos Correios?",
    answer: "Você nunca sai no prejuízo comprando na THR33. Caso os Correios ou a transportadora confirmem extravio, perda ou roubo de carga na rota, você escolhe imediatamente entre o envio de uma nova peça idêntica sem nenhum custo adicional ou o reembolso integral (100%) do valor pago."
  },
  {
    category: "Pagamentos & Segurança",
    question: "Quais são os prazos de reembolso para PIX, Cartão de Crédito e Cartão de Débito?",
    answer: "Após o recebimento e conferência da peça devolvida (em até 3 dias úteis): pagamentos via PIX são estornados em 24h a 48h úteis na mesma conta; pagamentos via Cartão de Crédito têm o estorno solicitado imediatamente ao PagBank (constando em 1 a 2 faturas seguintes conforme o banco emissor); e pagamentos via Cartão de Débito são reembolsados via transferência/PIX em até 3 dias úteis."
  },
  {
    category: "Produtos & Qualidade",
    question: "Qual a diferença entre Boxy Fit, Oversized Heavy e Oversized Clássica?",
    answer: "A modelagem Boxy Fit (220g/m²) possui corte contemporâneo mais curto no comprimento com ombros caídos e largura equilibrada. A Oversized Heavy (260g/m²) possui malha pesada 100% algodão com caimento reto e estruturado que não marca o corpo. Já a Oversized Clássica (190g/m²) usa algodão penteado fio 30.1 encorpado de toque macio para uso diário. Todas contam com estampa DTG de alta definição com toque zero."
  }
];

function renderFaqAnswerText(text) {
  if (!text || !text.includes('•')) {
    return <p>{text}</p>;
  }
  const parts = text.split('•').map((s) => s.trim()).filter(Boolean);
  const intro = parts[0];
  const bullets = parts.slice(1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
      {intro && <p style={{ margin: 0 }}>{intro}</p>}
      {bullets.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {bullets.map((bullet, idx) => (
            <li key={idx}>{bullet}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Suporte() {
  const [openFaq, setOpenFaq] = useState(0);

  // Form de Sugestão/Report
  const [feedback, setFeedback] = useState({
    name: '',
    email: '',
    type: 'sugestao-camisa',
    message: ''
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSubmitFeedback = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <main className={styles.container}>
      <SEO
        title="Central de Atendimento, SAC & Suporte Oficial | THR33 Streetwear"
        description="Tire dúvidas sobre pedidos, prazos de entrega, trocas e devoluções. Atendimento direto com a equipe THR33 Streetwear via WhatsApp e e-mail."
        url="/suporte"
        jsonLd={buildFaqSchema(FAQ_DATA)}
      />
      <header className={styles.header}>
        <span className={styles.tag}>CENTRAL DE ATENDIMENTO & SAC</span>
        <h1 className={styles.title}>COMO PODEMOS TE AJUDAR?</h1>
        <p className={styles.subtitle}>
          Atendimento humano, direto e sem robôs. Nossa equipe acompanha seu pedido da produção até a entrega.
        </p>
      </header>

      {/* BARRA DE DESTAQUE: CANAIS DE COMUNICAÇÃO DIRETA (ATENDIMENTO HUMANO) */}
      <section className={styles.directBanner}>
        <div className={styles.directBannerHeader}>
          <div className={styles.directBannerTitleGroup}>
            <ShieldCheck size={20} className={styles.directBannerIcon} />
            <div>
              <span className={styles.directBannerEyebrow}>ATENDIMENTO HUMANO OFICIAL THR33</span>
              <h2 className={styles.directBannerTitle}>CANAIS DE COMUNICAÇÃO DIRETA</h2>
            </div>
          </div>
          <Link to="/politicas" className={styles.policiesQuickBtn}>
            <FileText size={15} />
            <span>CONSULTAR POLÍTICAS DE TROCA, FRETE E REEMBOLSO</span>
            <ArrowUpRight size={15} />
          </Link>
        </div>

        <p className={styles.directBannerDesc}>
          Teve qualquer dúvida sobre tamanho, rastreio, produção do lote, troca ou reembolso? Fale diretamente com a nossa equipe pelos canais oficiais abaixo:
        </p>

        <div className={styles.directQuickLinks}>
          <a
            href="https://wa.me/554188410374"
            target="_blank"
            rel="noreferrer"
            className={styles.directQuickCard}
          >
            <div className={styles.directQuickIcon}>
              <MessageSquare size={18} />
            </div>
            <div className={styles.directQuickInfo}>
              <span className={styles.directQuickLabel}>WHATSAPP OFICIAL</span>
              <strong className={styles.directQuickValue}>+55 41 8841-0374</strong>
            </div>
            <ArrowUpRight size={16} className={styles.directQuickArrow} />
          </a>

          <a
            href="https://www.instagram.com/madebythr33"
            target="_blank"
            rel="noreferrer"
            className={styles.directQuickCard}
          >
            <div className={styles.directQuickIcon}>
              <AtSign size={18} />
            </div>
            <div className={styles.directQuickInfo}>
              <span className={styles.directQuickLabel}>DIRECT DO INSTAGRAM</span>
              <strong className={styles.directQuickValue}>@madebythr33</strong>
            </div>
            <ArrowUpRight size={16} className={styles.directQuickArrow} />
          </a>

          <a
            href="mailto:contato.thr33@gmail.com"
            className={styles.directQuickCard}
          >
            <div className={styles.directQuickIcon}>
              <Mail size={18} />
            </div>
            <div className={styles.directQuickInfo}>
              <span className={styles.directQuickLabel}>E-MAIL DE SUPORTE</span>
              <strong className={styles.directQuickValue}>contato.thr33@gmail.com</strong>
            </div>
            <ArrowUpRight size={16} className={styles.directQuickArrow} />
          </a>
        </div>
      </section>

      {/* CARDS DE ATENDIMENTO E AUTOATENDIMENTO */}
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
          <p>Atendimento rápido e humano com nossa equipe em Curitiba (+55 41 8841-0374).</p>
          <span className={styles.hours}>Seg a Sex: 09h às 18h</span>
          <a href="https://wa.me/554188410374" target="_blank" rel="noreferrer" className={styles.channelBtn}>
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
          <h3>E-MAIL & INSTAGRAM</h3>
          <p>Suporte oficial via contato.thr33@gmail.com ou Direct em @madebythr33.</p>
          <span className={styles.hours}>Resposta em até 24h úteis</span>
          <a href="mailto:contato.thr33@gmail.com.br" className={styles.channelBtn}>
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
          <h3>TROCAS, FRETE & LGPD</h3>
          <p>Consulte prazos de 7 e 30 dias, frete reverso gratuito e garantia contra extravio.</p>
          <span className={styles.hours}>100% em conformidade com o CDC</span>
          <Link to="/politicas#trocas" className={styles.channelBtn}>
            VER REGULAMENTO
          </Link>
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', textAlign: 'left' }}>
                    {item.category && (
                      <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', letterSpacing: '1.2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.52)' }}>
                        {item.category}
                      </span>
                    )}
                    <span className={isOpen ? styles.activeQuestionText : ''}>{item.question || item.q}</span>
                  </div>
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
                        {renderFaqAnswerText(item.answer || item.a)}
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
          <p>Sugira ideias de estampas, reporte melhorias do site ou envie seu feedback direto para os criadores.</p>

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
