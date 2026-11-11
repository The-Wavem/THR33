import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowUpRight } from 'lucide-react';
import { fadeInUp } from '../../utils/motionVariants';
import styles from './DropFaq.module.css';

export const OFFICIAL_FAQ_ITEMS = [
  {
    category: 'Produtos & Qualidade',
    q: 'Qual é o material e a qualidade das camisetas?',
    question: 'Qual é o material e a qualidade das camisetas?',
    a: 'Nossas camisetas são produzidas em 100% algodão de alta gramatura, garantindo durabilidade, estrutura e aquele caimento oversized/streetwear perfeito no corpo. As estampas são feitas via DTG (Direct to Garment / Impressão Digital), tecnologia de ponta que fixa a arte diretamente na fibra do tecido, resultando em cores vibrantes, toque zero e alta resistência às lavagens.',
    answer: 'Nossas camisetas são produzidas em 100% algodão de alta gramatura, garantindo durabilidade, estrutura e aquele caimento oversized/streetwear perfeito no corpo. As estampas são feitas via DTG (Direct to Garment / Impressão Digital), tecnologia de ponta que fixa a arte diretamente na fibra do tecido, resultando em cores vibrantes, toque zero e alta resistência às lavagens.'
  },
  {
    category: 'Produtos & Qualidade',
    q: 'Como escolher o tamanho ideal?',
    question: 'Como escolher o tamanho ideal?',
    a: 'Disponibilizamos uma Tabela de Medidas na página de cada produto. Recomendamos medir uma camiseta sua que vista bem e comparar com as nossas dimensões. Se você busca um caimento mais solto (estilo oversized), recomendamos pegar o seu tamanho habitual ou um número acima.',
    answer: 'Disponibilizamos uma Tabela de Medidas na página de cada produto. Recomendamos medir uma camiseta sua que vista bem e comparar com as nossas dimensões. Se você busca um caimento mais solto (estilo oversized), recomendamos pegar o seu tamanho habitual ou um número acima.'
  },
  {
    category: 'Produtos & Qualidade',
    q: 'Quais cuidados devo ter ao lavar minha peça?',
    question: 'Quais cuidados devo ter ao lavar minha peça?',
    a: 'Para manter sua peça nova por muito mais tempo: • Lave sempre do avesso e de preferência com água fria. • Não use alvejantes. • Evite secadora (o calor pode encolher o algodão). • Passe o ferro do avesso e nunca diretamente sobre a estampa.',
    answer: 'Para manter sua peça nova por muito mais tempo: • Lave sempre do avesso e de preferência com água fria. • Não use alvejantes. • Evite secadora (o calor pode encolher o algodão). • Passe o ferro do avesso e nunca diretamente sobre a estampa.'
  },
  {
    category: 'Envio & Prazos',
    q: 'Quanto tempo demora para entregar os produtos?',
    question: 'Quanto tempo demora para entregar os produtos?',
    a: 'O prazo total de entrega varia de 2 a 6 semanas, a depender da sua região. Como trabalhamos com produção sob demanda para garantir a máxima qualidade em cada peça, o processo é dividido em duas etapas: • Fabricação: 1 a 2 semanas (variando conforme a demanda). • Envio/Transporte: de 1 a 4 semanas para chegar até o seu endereço.',
    answer: 'O prazo total de entrega varia de 2 a 6 semanas, a depender da sua região. Como trabalhamos com produção sob demanda para garantir a máxima qualidade em cada peça, o processo é dividido em duas etapas: • Fabricação: 1 a 2 semanas (variando conforme a demanda). • Envio/Transporte: de 1 a 4 semanas para chegar até o seu endereço.'
  },
  {
    category: 'Envio & Prazos',
    q: 'Como acompanho o meu pedido?',
    question: 'Como acompanho o meu pedido?',
    a: 'Assim que o seu pedido for fabricado e despachado, você receberá o código de rastreamento no e-mail cadastrado na compra. Com ele, é possível acompanhar todo o trajeto da entrega em tempo real.',
    answer: 'Assim que o seu pedido for fabricado e despachado, você receberá o código de rastreamento no e-mail cadastrado na compra. Com ele, é possível acompanhar todo o trajeto da entrega em tempo real.'
  },
  {
    category: 'Trocas & Devoluções',
    q: 'Posso trocar ou devolver um produto?',
    question: 'Posso trocar ou devolver um produto?',
    a: 'Sim! Se por algum motivo você não ficar satisfeito com o produto ou precisar trocar o tamanho: • Arrependimento/Devolução: você tem até 7 dias corridos após o recebimento para solicitar o reembolso. • Troca por Tamanho ou Defeito: entre em contato com nosso suporte dentro de 30 dias após o recebimento. Obs: A peça deve estar sem sinais de uso, sem odores e com as etiquetas originais afixadas.',
    answer: 'Sim! Se por algum motivo você não ficar satisfeito com o produto ou precisar trocar o tamanho: • Arrependimento/Devolução: você tem até 7 dias corridos após o recebimento para solicitar o reembolso. • Troca por Tamanho ou Defeito: entre em contato com nosso suporte dentro de 30 dias após o recebimento. Obs: A peça deve estar sem sinais de uso, sem odores e com as etiquetas originais afixadas.'
  },
  {
    category: 'Pagamentos & Segurança',
    q: 'Quais são as formas de pagamento aceitas?',
    question: 'Quais são as formas de pagamento aceitas?',
    a: 'Aceitamos Pix (com aprovação imediata), Cartão de Débito e Cartões de Crédito (com parcelamento).',
    answer: 'Aceitamos Pix (com aprovação imediata), Cartão de Débito e Cartões de Crédito (com parcelamento).'
  },
  {
    category: 'Pagamentos & Segurança',
    q: 'É seguro comprar na THR33?',
    question: 'É seguro comprar na THR33?',
    a: 'Totalmente. Nosso site conta com certificado de segurança SSL e processa os pagamentos por meio de gateways criptografados e protegidos (PagBank). Seus dados pessoais e financeiros nunca ficam armazenados em nossos servidores.',
    answer: 'Totalmente. Nosso site conta com certificado de segurança SSL e processa os pagamentos por meio de gateways criptografados e protegidos (PagBank). Seus dados pessoais e financeiros nunca ficam armazenados em nossos servidores.'
  },
  {
    category: 'Suporte',
    q: 'Não encontrei a resposta para a minha dúvida. Como falo com vocês?',
    question: 'Não encontrei a resposta para a minha dúvida. Como falo com vocês?',
    a: 'Nossa equipe está pronta para te atender! Entre em contato conosco pelo e-mail contato@lojathr33.com.br ou envie uma mensagem direta no nosso Instagram. Respondemos em até 24 horas úteis.',
    answer: 'Nossa equipe está pronta para te atender! Entre em contato conosco pelo e-mail contato@lojathr33.com.br ou envie uma mensagem direta no nosso Instagram. Respondemos em até 24 horas úteis.'
  }
];

function renderFormattedAnswer(text) {
  if (!text || !text.includes('•')) {
    return <p className={styles.answerParagraph}>{text}</p>;
  }

  const parts = text.split('•').map((s) => s.trim()).filter(Boolean);
  const intro = parts[0];
  const bullets = parts.slice(1);

  return (
    <div className={styles.answerStructured}>
      {intro && <p className={styles.answerParagraph}>{intro}</p>}
      {bullets.length > 0 && (
        <ul className={styles.answerBulletList}>
          {bullets.map((bullet, idx) => {
            const obsSplit = bullet.split(/(Obs:.*)/i);
            return (
              <li key={idx}>
                {obsSplit[0].trim()}
                {obsSplit[1] && (
                  <span className={styles.answerObsNote}>{obsSplit[1].trim()}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function DropFaq({ embedded = false, showSupportCta = true }) {
  const [openIndex, setOpenIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('TODAS');
  const [isDraggingRow, setIsDraggingRow] = useState(false);

  const filterRowRef = useRef(null);
  const dragStateRef = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    moved: false
  });

  const categories = ['TODAS', ...Array.from(new Set(OFFICIAL_FAQ_ITEMS.map((item) => item.category)))];

  const filteredItems = selectedCategory === 'TODAS'
    ? OFFICIAL_FAQ_ITEMS
    : OFFICIAL_FAQ_ITEMS.filter((item) => item.category === selectedCategory);

  const handleRowMouseDown = (e) => {
    const row = filterRowRef.current;
    if (!row) return;
    dragStateRef.current.isDown = true;
    dragStateRef.current.moved = false;
    dragStateRef.current.startX = e.pageX - row.offsetLeft;
    dragStateRef.current.scrollLeft = row.scrollLeft;
  };

  const handleRowMouseMove = (e) => {
    const row = filterRowRef.current;
    if (!row || !dragStateRef.current.isDown) return;
    const x = e.pageX - row.offsetLeft;
    const walk = x - dragStateRef.current.startX;
    if (Math.abs(walk) > 5) {
      dragStateRef.current.moved = true;
      if (!isDraggingRow) setIsDraggingRow(true);
      row.scrollLeft = dragStateRef.current.scrollLeft - walk * 1.25;
    }
  };

  const handleRowMouseEnd = () => {
    dragStateRef.current.isDown = false;
    if (isDraggingRow) setIsDraggingRow(false);
  };

  const handleSelectCategory = (cat, e) => {
    if (dragStateRef.current.moved) {
      dragStateRef.current.moved = false;
      return;
    }
    setSelectedCategory(cat);
    setOpenIndex(0);

    if (e?.currentTarget && typeof e.currentTarget.scrollIntoView === 'function') {
      e.currentTarget.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }
  };

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={fadeInUp}
      className={`${styles.sectionContainer} ${embedded ? styles.embeddedContainer : ''}`}
    >
      <div className={styles.headerBlock}>
        <div className={styles.titleRow}>
          <h2 className={styles.sectionTitle}>PERGUNTAS FREQUENTES</h2>
          <span className={styles.mobileSwipeHint}>[ ← Arraste para ver opções → ]</span>
        </div>
        <p className={styles.headerSubtitle}>
          Tire suas dúvidas sobre qualidade DTG, tabela de medidas, prazos de confecção sob demanda, trocas e pagamentos.
        </p>

        {/* FILTROS POR CATEGORIA (ARRASTÁVEIS NO MOBILE & TOUCH/MOUSE) */}
        <div
          ref={filterRowRef}
          className={`${styles.categoryFilterRow} ${isDraggingRow ? styles.categoryFilterRowDragging : ''}`}
          role="tablist"
          aria-label="Filtrar dúvidas por categoria"
          data-lenis-prevent
          data-lenis-prevent-touch
          onMouseDown={handleRowMouseDown}
          onMouseMove={handleRowMouseMove}
          onMouseUp={handleRowMouseEnd}
          onMouseLeave={handleRowMouseEnd}
        >
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={(e) => handleSelectCategory(cat, e)}
                className={`${styles.categoryTab} ${isActive ? styles.categoryTabActive : ''}`}
              >
                <span>{cat}</span>
                {isActive && (
                  <motion.span
                    layoutId="faqCategoryUnderline"
                    className={styles.categoryTabIndicator}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <motion.div
        key={selectedCategory}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className={styles.faqList}
      >
        {filteredItems.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={`${item.category}-${item.q}`}
              className={`${styles.faqItem} ${isOpen ? styles.faqItemOpen : ''}`}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className={styles.faqQuestionBtn}
                aria-expanded={isOpen}
              >
                <div className={styles.questionTextGroup}>
                  <span className={styles.questionCategoryTag}>{item.category}</span>
                  <span className={styles.questionTitle}>{item.q}</span>
                </div>
                <motion.span
                  className={styles.iconMinimal}
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  aria-hidden="true"
                >
                  <Plus size={18} strokeWidth={1.5} />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                    className={styles.faqAnswerWrapper}
                  >
                    <div className={styles.faqAnswerContent}>
                      {renderFormattedAnswer(item.a)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </motion.div>

      {showSupportCta && (
        <div className={styles.supportRedirectBanner}>
          <div className={styles.supportRedirectInfo}>
            <span className={styles.supportRedirectEyebrow}>
              TRANSPARÊNCIA TOTAL • CDC &amp; ATENDIMENTO HUMANO
            </span>
            <p className={styles.supportRedirectDesc}>
              Ainda precisa de ajuda? Acesse nossa Central de Suporte ou consulte na íntegra os Termos, Trocas (7 e 30 dias) e Direitos do Consumidor.
            </p>
          </div>

          <div className={styles.supportRedirectActions}>
            <Link to="/suporte" className={styles.minimalSupportLink}>
              <span>CENTRAL DE SUPORTE</span>
              <ArrowUpRight size={14} />
            </Link>
            <Link to="/politicas" className={styles.minimalPoliciesLink}>
              <span>TERMOS &amp; POLÍTICAS</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </motion.section>
  );
}

export default DropFaq;
