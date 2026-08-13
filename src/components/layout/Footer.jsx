import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Check } from 'lucide-react';
import { preloadRoute } from '../../utils/preloader';
import styles from './Footer.module.css';

export function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

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
              <span className={styles.logoSub}>FOR THE FEW</span>
            </Link>
            <p className={styles.brandDesc}>
              Streetwear autoral e independente nascido no frio de Curitiba. A rua como nosso ateliê e a música como inspiração.
            </p>
            <span className={styles.locationBadge}>
              <MapPin size={12} />
              <span>CURITIBA - PR</span>
            </span>
          </div>

          {/* COLUNA 2: NAVEGAÇÃO */}
          <div className={styles.linksCol}>
            <h4 className={styles.colTitle}>EXPLORAR</h4>
            <ul className={styles.linksList}>
              <li>
                <Link to="/" onMouseEnter={() => preloadRoute('/')}>
                  Início
                </Link>
              </li>
              <li>
                <Link to="/catalogo" onMouseEnter={() => preloadRoute('/catalogo')}>
                  Catálogo Completo
                </Link>
              </li>
              <li>
                <Link to="/catalogo?drop=leak-two" onMouseEnter={() => preloadRoute('/catalogo')}>
                  Novo Drop (Leak Two)
                </Link>
              </li>
              <li>
                <Link to="/drops-passados" onMouseEnter={() => preloadRoute('/drops-passados')}>
                  Drops Passados
                </Link>
              </li>
              <li>
                <Link to="/sobre" onMouseEnter={() => preloadRoute('/sobre')}>
                  Sobre a THR33
                </Link>
              </li>
            </ul>
          </div>

          {/* COLUNA 3: ATENDIMENTO & AJUDA */}
          <div className={styles.linksCol}>
            <h4 className={styles.colTitle}>SUPORTE</h4>
            <ul className={styles.linksList}>
              <li>
                <Link to="/suporte" onMouseEnter={() => preloadRoute('/suporte')}>
                  Central de Atendimento
                </Link>
              </li>
              <li>
                <Link to="/suporte" onMouseEnter={() => preloadRoute('/suporte')}>
                  Perguntas Frequentes (FAQ)
                </Link>
              </li>
              <li>
                <Link to="/politicas" onMouseEnter={() => preloadRoute('/politicas')}>
                  Trocas e Devoluções
                </Link>
              </li>
              <li>
                <Link to="/politicas" onMouseEnter={() => preloadRoute('/politicas')}>
                  Prazos e Entregas
                </Link>
              </li>
              <li>
                <Link to="/perfil" onMouseEnter={() => preloadRoute('/perfil')}>
                  Minha Conta
                </Link>
              </li>
            </ul>
          </div>

          {/* COLUNA 4: NEWSLETTER PRÉ-DROPS 24H */}
          <div className={styles.newsletterCol}>
            <h4 className={styles.colTitle}>PRE-DROP ACCESS</h4>
            <p className={styles.newsletterText}>
              Receba o link de compra 24h antes de cada drop ser liberado no site oficial.
            </p>

            {subscribed ? (
              <div className={styles.successMsg}>
                <Check size={14} />
                <span>E-mail cadastrado. Fique atento à sua caixa de entrada!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className={styles.newsletterForm}>
                <input 
                  type="email" 
                  placeholder="seu.email@exemplo.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  aria-label="Informe seu e-mail para receber avisos de pré-drops"
                />
                <button type="submit" aria-label="Cadastrar e-mail">
                  <ArrowRight size={16} />
                </button>
              </form>
            )}

            {/* SOCIAIS */}
            <div className={styles.socialRow}>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram da THR33">
                INSTAGRAM
              </a>
              <span>/</span>
              <a href="https://wa.me/5541999999999" target="_blank" rel="noreferrer" aria-label="WhatsApp da THR33">
                WHATSAPP
              </a>
            </div>
          </div>
        </div>

        {/* LINHA INFERIOR (COPYRIGHT E PAGAMENTOS) */}
        <div className={styles.bottomBar}>
          <div className={styles.copyright}>
            © {new Date().getFullYear()} THR33 STREETWEAR. TODOS OS DIREITOS RESERVADOS.
          </div>

          <div className={styles.paymentMethods}>
            <span className={styles.paymentBadge}>PIX</span>
            <span className={styles.paymentBadge}>CARTÃO</span>
            <span className={styles.paymentBadge}>BOLETO</span>
            <span className={styles.paymentBadge}>PAGBANK</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
