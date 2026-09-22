import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Truck, Clock, PackageCheck, ShieldAlert } from 'lucide-react';
import { analyticsService } from '../../services/analyticsService';
import styles from './ComoFuncionaEntrega.module.css';

export function ComoFuncionaEntrega() {
  useEffect(() => {
    analyticsService.trackPageView('como_funciona_entrega');
  }, []);

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <span className={styles.tag}>LOGÍSTICA & TRANSPARÊNCIA</span>
        <h1 className={styles.title}>COMO FUNCIONA A ENTREGA</h1>
        <p className={styles.lead}>
          Operamos em modelo sob demanda sustentável. Cada peça é confeccionada exclusivamente após a confirmação da sua compra, garantindo exclusividade e zero desperdício têxtil.
        </p>
      </header>

      {/* ETAPAS DO CICLO DE PRODUÇÃO */}
      <section className={styles.stepsSection}>
        <div className={styles.stepCard}>
          <div className={styles.stepHeader}>
            <span className={styles.stepNumber}>01</span>
            <Clock className={styles.stepIcon} size={20} />
          </div>
          <h3>FECHAMENTO SEMANAL</h3>
          <p>
            Os pedidos confirmados são consolidados semanalmente e enviados diretamente para a linha de corte e costura do nosso fornecedor têxtil parceiro.
          </p>
        </div>

        <div className={styles.stepCard}>
          <div className={styles.stepHeader}>
            <span className={styles.stepNumber}>02</span>
            <PackageCheck className={styles.stepIcon} size={20} />
          </div>
          <h3>CONFECÇÃO & ESTAMPARIA</h3>
          <p>
            As peças passam pelo processo de estamparia em alta resolução e aplicação de etiqueta interna. O tempo médio de produção é de 5 a 8 dias úteis.
          </p>
        </div>

        <div className={styles.stepCard}>
          <div className={styles.stepHeader}>
            <span className={styles.stepNumber}>03</span>
            <Truck className={styles.stepIcon} size={20} />
          </div>
          <h3>DESPACHO DIRETO</h3>
          <p>
            A expedição ocorre diretamente da fábrica para o seu endereço. O código de rastreamento é emitido e disponibilizado no seu painel de pedidos e via e-mail.
          </p>
        </div>
      </section>

      {/* AVISO DE TRANSPORTE */}
      <section className={styles.noticeSection}>
        <div className={styles.noticeBox}>
          <ShieldAlert className={styles.noticeIcon} size={24} />
          <div>
            <h4>ENVIO EXCLUSIVO VIA TRANSPORTADORA E CORREIOS</h4>
            <p>
              Não mantemos ponto de retirada física nem atendimento presencial para entrega. Todo o transporte é intermediado pelas transportadoras parceiras e pelos Correios, com seguro de carga e rastreamento de ponta a ponta.
            </p>
          </div>
        </div>
      </section>

      {/* CTA FOOTER */}
      <section className={styles.ctaSection}>
        <h2>PRONTO PARA GARANTIR SUA PEÇA?</h2>
        <p>Explore as modelagens Oversized e Boxy disponíveis no catálogo atual.</p>
        <Link className={styles.ctaBtn} to="/catalogo">
          VER CATÁLOGO COMPLETO
        </Link>
      </section>
    </main>
  );
}

export default ComoFuncionaEntrega;
