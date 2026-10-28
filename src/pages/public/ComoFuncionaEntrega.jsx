import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck,
  PackageCheck,
  ShieldCheck,
  Lock,
  ArrowRight,
  MessageSquare
} from 'lucide-react';
import { analyticsService } from '../../services/analyticsService';
import { SEO } from '../../components/common/SEO';
import styles from './ComoFuncionaEntrega.module.css';

export function ComoFuncionaEntrega() {
  useEffect(() => {
    analyticsService.trackPageView('como_funciona_entrega');
  }, []);

  return (
    <main className={styles.container}>
      <SEO
        title="Como Funciona a Entrega & Produção Sob Demanda | THR33 Streetwear"
        description="Entenda como funciona a produção sob demanda, prazos de confecção, código de rastreio e garantia de entrega da THR33 Streetwear em parceria com Savvy Print."
        url="/como-funciona-a-entrega"
      />
      <header className={styles.header}>
        <span className={styles.tag}>LOGÍSTICA, PRODUÇÃO EM LOTES & GARANTIA TOTAL</span>
        <h1 className={styles.title}>COMO FUNCIONA A PRODUÇÃO E ENTREGA</h1>
        <p className={styles.lead}>
          A THR33 opera com lotes periódicos sob demanda em parceria com a <strong>Savvy Print</strong> para garantir que cada peça saia recém-estampada, com malha 100% algodão intacta e zero desperdício têxtil — sempre com <strong>100% de responsabilidade e garantia da THR33</strong> até chegar na sua porta.
        </p>
      </header>

      {/* 4 ETAPAS DO CICLO REAL THR33 */}
      <section className={styles.stepsSection}>
        <div className={styles.stepCard}>
          <div className={styles.stepHeader}>
            <span className={styles.stepNumber}>01</span>
            <Lock className={styles.stepIcon} size={20} />
          </div>
          <h3>CONFIRMAÇÃO SEGURA (PAGBANK)</h3>
          <p>
            Seu pagamento é processado e aprovado via PIX, Cartão de Crédito ou Débito diretamente pelo ambiente criptografado do PagBank, sem que a THR33 armazene dados sensíveis do seu cartão.
          </p>
        </div>

        <div className={styles.stepCard}>
          <div className={styles.stepHeader}>
            <span className={styles.stepNumber}>02</span>
            <PackageCheck className={styles.stepIcon} size={20} />
          </div>
          <h3>PRODUÇÃO & CURADORIA DO LOTE (SAVVY PRINT)</h3>
          <p>
            Seu pedido entra no ciclo semanal de produção da nossa parceira oficial homologada (<strong>Savvy Print</strong>), garantindo estampa nova de alta definição, malha impecável e revisão individual de qualidade.
          </p>
        </div>

        <div className={styles.stepCard}>
          <div className={styles.stepHeader}>
            <span className={styles.stepNumber}>03</span>
            <Truck className={styles.stepIcon} size={20} />
          </div>
          <h3>DESPACHO & CÓDIGO DE RASTREIO</h3>
          <p>
            Assim que finalizado no lote, o pacote é postado diretamente para o seu endereço via Correios ou transportadora, e o código de rastreio fica disponível em <strong>"Meus Pedidos"</strong> e no seu e-mail/WhatsApp.
          </p>
        </div>

        <div className={styles.stepCard}>
          <div className={styles.stepHeader}>
            <span className={styles.stepNumber}>04</span>
            <ShieldCheck className={styles.stepIcon} size={20} />
          </div>
          <h3>ENTREGA GARANTIDA THR33</h3>
          <p>
            Acompanhamos o pacote até a sua porta. Se houver qualquer imprevisto ou extravio nos Correios, a THR33 assume 100% e você escolhe entre receber uma nova peça sem custo ou o reembolso integral.
          </p>
        </div>
      </section>

      {/* GARANTIA CONTRA EXTRAVIO E RESPONSABILIDADE SOLIDÁRIA */}
      <section className={styles.noticeSection}>
        <div className={styles.noticeBox}>
          <ShieldCheck className={styles.noticeIcon} size={26} />
          <div className={styles.noticeContent}>
            <h4>COMPRA 100% PROTEGIDA PELA THR33 DO INÍCIO AO FIM</h4>
            <p>
              Operamos exclusivamente online e todo o envio é realizado via Correios e transportadoras homologadas. Caso ocorra atraso atípico, avaria ou extravio postal, você nunca fica no prejuízo: basta acionar nosso atendimento humano no WhatsApp (<strong>+55 41 8841-0374</strong>), Direct (<strong>@madebythr33</strong>) ou na página de <Link to="/suporte" className={styles.inlineLink}>Suporte</Link> que resolvemos tudo diretamente para você.
            </p>
            <div className={styles.noticeLinksRow}>
              <Link to="/politicas#frete" className={styles.policyLink}>
                <span>Ler Política Completa de Frete e Extravio</span>
                <ArrowRight size={13} />
              </Link>
              <Link to="/politicas#trocas" className={styles.policyLink}>
                <span>Ver Regras de Trocas e Devoluções (7 e 30 dias)</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FOOTER */}
      <section className={styles.ctaSection}>
        <h2>PRONTO PARA GARANTIR SUA PEÇA?</h2>
        <p>Explore as modelagens Oversized e Boxy disponíveis no catálogo atual.</p>
        <div className={styles.ctaBtnsRow}>
          <Link className={styles.ctaBtn} to="/catalogo">
            VER CATÁLOGO COMPLETO
          </Link>
          <a
            href="https://wa.me/554188410374"
            target="_blank"
            rel="noreferrer"
            className={styles.ctaSecondaryBtn}
          >
            <MessageSquare size={14} />
            <span>DÚVIDAS NO WHATSAPP</span>
          </a>
        </div>
      </section>
    </main>
  );
}

export default ComoFuncionaEntrega;
