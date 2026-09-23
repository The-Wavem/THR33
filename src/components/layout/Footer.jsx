import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Check, ChevronDown, Camera, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { preloadRoute } from '../../utils/preloader';
import styles from './Footer.module.css';

const MotionAnchor = motion.a;
const wavemText = 'DESENVOLVIDO POR WAVEM';
const wavemLetterVariants = {
  rest: { y: 0 },
  hover: (index) => ({
    y: [0, -3, 0],
    transition: {
      duration: 0.32,
      delay: index * 0.025,
      ease: 'easeOut'
    }
  })
};
const wavemArrowVariants = {
  rest: { x: 0, y: 0 },
  hover: { x: 2, y: -2, transition: { duration: 0.25, ease: 'easeOut' } }
};

export function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [openSections, setOpenSections] = useState({
    explorar: false,
    suporte: false
  });

  const toggleSection = (sec) => {
    setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        {/* GRID PRINCIPAL DO FOOTER */}
        <div className={styles.topGrid}>
          {/* COLUNA 1: MARCA & MANIFESTO */}
          <div className={styles.brandCol}>
            <Link 
              className={styles.logo} 
              to="/"
              onMouseEnter={() => preloadRoute('/')}
            >
              <span className={styles.logoText}>THR33</span>
            </Link>
            <p className={styles.brandDesc}>
              Streetwear autoral e independente nascido no concreto de Curitiba. Confecção sob demanda, modelagens pesadas e edições limitadas.
            </p>
            <span className={styles.locationBadge}>
              <MapPin size={12} />
              <span>CURITIBA - PR</span>
            </span>
          </div>

          {/* COLUNA 2: NAVEGAÇÃO / ACORDEÃO MOBILE */}
          <div className={styles.linksCol}>
            <button 
              type="button" 
              className={styles.accordionHeaderBtn}
              onClick={() => toggleSection('explorar')}
              aria-expanded={openSections.explorar}
            >
              <h4 className={styles.colTitle}>EXPLORAR</h4>
              <ChevronDown 
                size={16} 
                className={`${styles.accordionChevron} ${openSections.explorar ? styles.accordionChevronOpen : ''}`} 
              />
            </button>
            <ul className={`${styles.linksList} ${openSections.explorar ? styles.linksListExpanded : styles.linksListCollapsed}`}>
              <li>
                <Link to="/" onMouseEnter={() => preloadRoute('/')}>
                  Início
                </Link>
              </li>
              <li>
                <Link to="/catalogo" onMouseEnter={() => preloadRoute('/catalogo')}>
                  Catálogo de Camisetas
                </Link>
              </li>
              <li>
                <Link to="/como-funciona-a-entrega" onMouseEnter={() => preloadRoute('/como-funciona-a-entrega')}>
                  Como Funciona a Entrega
                </Link>
              </li>
              <li>
                <Link to="/brindes" onMouseEnter={() => preloadRoute('/brindes')}>
                  Vales & Brindes
                </Link>
              </li>
              <li>
                <Link to="/sobre" onMouseEnter={() => preloadRoute('/sobre')}>
                  Sobre a Marca
                </Link>
              </li>
            </ul>
          </div>

          {/* COLUNA 3: ATENDIMENTO & AJUDA / ACORDEÃO MOBILE */}
          <div className={styles.linksCol}>
            <button 
              type="button" 
              className={styles.accordionHeaderBtn}
              onClick={() => toggleSection('suporte')}
              aria-expanded={openSections.suporte}
            >
              <h4 className={styles.colTitle}>ATENDIMENTO</h4>
              <ChevronDown 
                size={16} 
                className={`${styles.accordionChevron} ${openSections.suporte ? styles.accordionChevronOpen : ''}`} 
              />
            </button>
            <ul className={`${styles.linksList} ${openSections.suporte ? styles.linksListExpanded : styles.linksListCollapsed}`}>
              <li>
                <Link to="/suporte" onMouseEnter={() => preloadRoute('/suporte')}>
                  Central de Suporte
                </Link>
              </li>
              <li>
                <Link to="/suporte" onMouseEnter={() => preloadRoute('/suporte')}>
                  Dúvidas Frequentes
                </Link>
              </li>
              <li>
                <Link to="/politicas" onMouseEnter={() => preloadRoute('/politicas')}>
                  Trocas e Garantia
                </Link>
              </li>
              <li>
                <Link to="/perfil" onMouseEnter={() => preloadRoute('/perfil')}>
                  Minha Conta & Carteira
                </Link>
              </li>
            </ul>
          </div>

          {/* COLUNA 4: NEWSLETTER & CRÉDITO DE FOTOGRAFIA */}
          <div className={styles.newsletterCol}>
            <h4 className={styles.colTitle}>AVISOS DE DROPS</h4>
            <p className={styles.newsletterText}>
              Receba links antecipados e informativos de fechamento de lote semanal.
            </p>

            {subscribed ? (
              <div className={styles.successMsg}>
                <Check size={14} />
                <span>E-mail cadastrado com sucesso!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className={styles.newsletterForm}>
                <input 
                  type="email" 
                  placeholder="seu.email@exemplo.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  aria-label="Informe seu e-mail"
                />
                <button type="submit" aria-label="Cadastrar e-mail">
                  <ArrowRight size={16} />
                </button>
              </form>
            )}

            {/* BOTÃO DE CRÉDITO DE FOTOGRAFIA EDU LIVE */}
            <div className={styles.photoCreditBox}>
              <a 
                href="https://instagram.com/eduian.foto" 
                target="_blank" 
                rel="noreferrer" 
                className={styles.photoCreditBtn}
                title="Conheça o trabalho de fotografia de Edu Live"
              >
                <Camera size={13} />
                <span>FOTOGRAFIA: @eduian.foto</span>
              </a>
            </div>
          </div>
        </div>

        <div className={styles.bottomBar}>
          <div className={styles.copyright}>
            <span>© {new Date().getFullYear()} THR33 STREETWEAR.</span>
            <MotionAnchor
              href="https://thewavem.web.app"
              target="_blank"
              rel="noreferrer"
              className={styles.wavemSignature}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover="hover"
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              aria-label="Acessar o site da Wavem"
            >
              <span aria-hidden="true">
                {Array.from(wavemText).map((character, index) => (
                  <motion.span
                    key={`${character}-${index}`}
                    className={character === ' ' ? styles.wavemSpace : styles.wavemLetter}
                    variants={wavemLetterVariants}
                    custom={index}
                  >
                    {character === ' ' ? null : character}
                  </motion.span>
                ))}
              </span>
              <motion.span variants={wavemArrowVariants} aria-hidden="true">
                <ArrowUpRight size={12} />
              </motion.span>
            </MotionAnchor>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
