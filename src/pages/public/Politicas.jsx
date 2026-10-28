import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  Truck,
  RefreshCw,
  Lock,
  FileText,
  Cookie,
  MessageSquare,
  Mail,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  PackageCheck,
  ArrowRight,
  HelpCircle,
  Scale
} from 'lucide-react';
import { analyticsService } from '../../services/analyticsService';
import styles from './Politicas.module.css';

const SECTIONS = [
  {
    id: 'producao',
    num: '01',
    shortTitle: 'Produção & Savvy Print',
    title: 'MODELO DE PRODUÇÃO EM LOTES & PARCERIA SAVVY PRINT',
    badge: 'Operação Transparente THR33',
    icon: PackageCheck
  },
  {
    id: 'frete',
    num: '02',
    shortTitle: 'Frete, Rastreio & Extravio',
    title: 'POLÍTICA DE FRETE, PRAZOS, RASTREIO & GARANTIA CONTRA EXTRAVIO',
    badge: 'Garantia de Entrega 100%',
    icon: Truck
  },
  {
    id: 'trocas',
    num: '03',
    shortTitle: 'Trocas, Devoluções & Reembolso',
    title: 'COMPRA, CANCELAMENTO, TROCAS, DEVOLUÇÕES & REEMBOLSO (CDC)',
    badge: 'Conformidade Art. 49 CDC',
    icon: RefreshCw
  },
  {
    id: 'pagamento',
    num: '04',
    shortTitle: 'Segurança de Pagamento (PagBank)',
    title: 'SEGURANÇA DE PAGAMENTO (PAGBANK) & PROTEÇÃO FINANCEIRA',
    badge: 'PagBank Oficial • PCI-DSS',
    icon: Lock
  },
  {
    id: 'privacidade',
    num: '05',
    shortTitle: 'Privacidade & Dados (LGPD)',
    title: 'POLÍTICA DE PRIVACIDADE E PROTEÇÃO DE DADOS (LEI Nº 13.709/2018)',
    badge: 'LGPD Protegido',
    icon: ShieldCheck
  },
  {
    id: 'cookies',
    num: '06',
    shortTitle: 'Cookies, Titular & Menores',
    title: 'POLÍTICA DE COOKIES, DIREITOS DO TITULAR & MENORES DE IDADE',
    badge: 'Transparência Digital',
    icon: Cookie
  }
];

const HASH_ALIASES = {
  envio: 'frete',
  entrega: 'frete',
  reembolso: 'trocas',
  devolucao: 'trocas',
  lgpd: 'privacidade',
  pagbank: 'pagamento'
};

export function Politicas() {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('producao');

  useEffect(() => {
    analyticsService.trackPageView('politicas');
  }, []);

  // Suporte a navegação direta via hash ou query (?secao=frete ou #privacidade)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const querySec = searchParams.get('secao') || searchParams.get('tab');
    const rawHash = (location.hash || '').replace('#', '').toLowerCase().trim();
    const targetRaw = rawHash || (querySec ? querySec.toLowerCase().trim() : '');

    if (targetRaw) {
      const resolvedId = HASH_ALIASES[targetRaw] || targetRaw;
      const exists = SECTIONS.some((s) => s.id === resolvedId);
      if (exists) {
        setActiveSection(resolvedId);
        setTimeout(() => {
          const el = document.getElementById(`secao-${resolvedId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    }
  }, [location.hash, location.search]);

  // Atualiza o item ativo no índice lateral conforme a rolagem da página com throttle em RAF
  useEffect(() => {
    let rafId = null;
    const handleScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        const scrollPosition = window.scrollY + 220;
        for (let i = SECTIONS.length - 1; i >= 0; i--) {
          const sec = SECTIONS[i];
          const el = document.getElementById(`secao-${sec.id}`);
          if (el && el.offsetTop <= scrollPosition) {
            setActiveSection(prev => (prev !== sec.id ? sec.id : prev));
            break;
          }
        }
        rafId = null;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const scrollToSection = (id) => {
    setActiveSection(id);
    const el = document.getElementById(`secao-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <main className={styles.container}>
      {/* HEADER EDITORIAL BRUTALISTA */}
      <header className={styles.header}>
        <div className={styles.headerTopMeta}>
          <span className={styles.tag}>CONFORMIDADE JURÍDICA • CDC & LGPD</span>
          <span className={styles.updatedBadge}>ATUALIZADO EM 2026 • OPERAÇÃO OFICIAL THR33</span>
        </div>

        <h1 className={styles.title}>POLÍTICAS, PRIVACIDADE, FRETE & GARANTIAS</h1>

        <p className={styles.lead}>
          Na THR33 Streetwear, acreditamos que transparência não precisa de letras miúdas. Abaixo explicamos de forma direta e juridicamente segura como nossas peças são produzidas, como protegemos seus dados e por que você nunca fica no prejuízo comprando com a gente.
        </p>

        <div className={styles.trustBadgesBar}>
          <div className={styles.trustPill}>
            <ShieldCheck size={14} />
            <span>Garantia Total Contra Extravio</span>
          </div>
          <div className={styles.trustPill}>
            <Lock size={14} />
            <span>PagBank Oficial • Zero Dados de Cartão Salvos</span>
          </div>
          <div className={styles.trustPill}>
            <Scale size={14} />
            <span>Código de Defesa do Consumidor & LGPD</span>
          </div>
          <div className={styles.trustPill}>
            <PackageCheck size={14} />
            <span>Produção Homologada Savvy Print</span>
          </div>
        </div>
      </header>

      <div className={styles.layout}>
        {/* COLUNA ESQUERDA: ÍNDICE FIXO (STICKY) + AJUDA RÁPIDA */}
        <aside className={styles.sidebar}>
          <div className={styles.stickyWrapper}>
            <div className={styles.indexBox}>
              <span className={styles.indexHeaderLabel}>ÍNDICE DE POLÍTICAS</span>
              <nav className={styles.navTabs} aria-label="Índice de Políticas">
                {SECTIONS.map((sec) => {
                  const IconComp = sec.icon;
                  const isActive = activeSection === sec.id;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      className={`${styles.tabBtn} ${isActive ? styles.activeTab : ''}`}
                      onClick={() => scrollToSection(sec.id)}
                    >
                      <span className={styles.tabNum}>{sec.num}</span>
                      <IconComp size={14} className={styles.tabIcon} />
                      <span className={styles.tabText}>{sec.shortTitle}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* CARD RÁPIDO: PRECISA DE AJUDA AGORA? */}
            <div className={styles.quickHelpCard}>
              <div className={styles.quickHelpHeader}>
                <HelpCircle size={15} />
                <strong>PRECISA DE AJUDA AGORA?</strong>
              </div>
              <p>
                Somos uma marca próxima da comunidade e resolvemos qualquer dúvida ou imprevisto pessoalmente, sem robôs burocráticos.
              </p>

              <div className={styles.quickHelpActions}>
                <a
                  href="https://wa.me/554188410374?text=Ol%C3%A1%20equipe%20THR33!%20Preciso%20de%20ajuda%20com%20um%20pedido."
                  target="_blank"
                  rel="noreferrer"
                  className={styles.quickHelpBtnPrimary}
                >
                  <MessageSquare size={13} />
                  <span>WhatsApp Oficial (+55 41 8841-0374)</span>
                  <ExternalLink size={11} />
                </a>

                <a
                  href="https://www.instagram.com/madebythr33"
                  target="_blank"
                  rel="noreferrer"
                  className={styles.quickHelpBtn}
                >
                  <span>Instagram Direct (@madebythr33)</span>
                  <ExternalLink size={11} />
                </a>

                <a
                  href="mailto:contato.thr33@gmail.com"
                  className={styles.quickHelpBtn}
                >
                  <Mail size={13} />
                  <span>contato.thr33@gmail.com</span>
                </a>

                <Link to="/suporte" className={styles.quickHelpLinkInternal}>
                  <span>Abrir Chamado na Central de Suporte</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </aside>

        {/* COLUNA DIREITA: CONTEÚDO EDITORIAL DAS 6 SEÇÕES */}
        <div className={styles.contentArea}>
          {/* ========================================================
              SEÇÃO 01: MODELO DE PRODUÇÃO EM LOTES & SAVVY PRINT
              ======================================================== */}
          <section id="secao-producao" className={styles.policySection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionMetaRow}>
                <span className={styles.sectionNumber}>SEÇÃO 01</span>
                <span className={styles.sectionBadge}>Operação Transparente THR33</span>
              </div>
              <h2 className={styles.sectionTitle}>
                MODELO DE PRODUÇÃO EM LOTES & ENVIO VIA PARCEIRO HOMOLOGADO (SAVVY PRINT)
              </h2>
            </div>

            <div className={styles.summaryBox}>
              <div className={styles.summaryTitleRow}>
                <CheckCircle2 size={16} />
                <strong>RESUMO TRANSPARENTE THR33</strong>
              </div>
              <p>
                Sua peça não fica meses pegando poeira em prateleira. Trabalhamos com lotes periódicos sob demanda confeccionados pela nossa parceira oficial de produção e logística (<strong>Savvy Print</strong>). Você compra na THR33 e <strong>nós assumimos 100% da responsabilidade pelo seu pedido</strong> até ele chegar perfeito nas suas mãos.
              </p>
            </div>

            <div className={styles.clausesList}>
              <div className={styles.clauseBlock}>
                <h3>1.1 Operação Exclusivamente Online e Produção em Lotes</h3>
                <p>
                  A <strong>THR33 Streetwear</strong> opera exclusivamente em ambiente digital, trabalhando com lotes periódicos de produção sob demanda. Esse modelo garante que cada camiseta (seja na modelagem Boxy ou Oversized Heavy) seja confeccionada especificamente para o seu pedido, assegurando estampa recém-curada, malha 100% algodão intacta e zero desperdício têxtil.
                </p>
              </div>

              <div className={styles.clauseBlock}>
                <h3>1.2 Parceria Oficial de Confecção e Logística (Savvy Print)</h3>
                <p>
                  Assim que a sua compra é concluída e o pagamento é confirmado em nosso sistema, o seu pedido é registrado e encaminhado nos ciclos semanais de produção para a nossa parceira oficial homologada de estamparia, confecção e logística, a <strong>Savvy Print</strong>. A parceira realiza a produção da peça seguindo o rigoroso controle de qualidade da THR33 e efetua a postagem direta para o endereço que você cadastrou no checkout, via Correios ou transportadoras homologadas.
                </p>
              </div>

              <div className={styles.clauseBlock}>
                <h3>1.3 Responsabilidade Solidária e Integral da THR33 (100%)</h3>
                <p>
                  A sua relação de consumo é firmada diretamente com a <strong>THR33 Streetwear</strong>. Nos termos do Código de Defesa do Consumidor (Lei nº 8.078/1990), <strong>a THR33 assume 100% da responsabilidade pela qualidade, integridade e entrega do seu pedido até que ele chegue em suas mãos</strong>. Caso ocorra qualquer imprevisto na etapa produtiva ou durante o transporte, você não precisa lidar com terceiros: a equipe da THR33 resolve tudo diretamente para você.
                </p>
              </div>
            </div>
          </section>

          {/* ========================================================
              SEÇÃO 02: POLÍTICA DE FRETE, RASTREIO E EXTRAVIO
              ======================================================== */}
          <section id="secao-frete" className={styles.policySection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionMetaRow}>
                <span className={styles.sectionNumber}>SEÇÃO 02</span>
                <span className={styles.sectionBadge}>Garantia de Entrega 100%</span>
              </div>
              <h2 className={styles.sectionTitle}>
                POLÍTICA DE FRETE, PRAZOS, RASTREIO, INSUCESSO & EXTRAVIO NOS CORREIOS
              </h2>
            </div>

            <div className={styles.summaryBox}>
              <div className={styles.summaryTitleRow}>
                <Truck size={16} />
                <strong>RESUMO TRANSPARENTE THR33</strong>
              </div>
              <p>
                Seu pacote atrasou além do normal ou foi extraviado pelos Correios? <strong>Fique tranquilo: na THR33 você nunca fica no prejuízo.</strong> Nós assumimos toda a tratativa com a transportadora e você escolhe imediatamente entre receber uma <strong>nova peça idêntica sem custo algum</strong> ou o <strong>reembolso de 100% do valor pago</strong>.
              </p>
            </div>

            <div className={styles.clausesList}>
              <div className={styles.clauseBlock}>
                <h3>2.1 Início da Contagem do Prazo de Entrega</h3>
                <p>
                  O prazo total exibido no carrinho e no checkout passa a contar a partir da <strong>confirmação do pagamento pelo gateway financeiro (PagBank)</strong>. Esse prazo já contempla o ciclo operacional de produção e preparação do lote junto à Savvy Print somado ao prazo de trânsito dos Correios ou transportadora de acordo com o CEP de destino.
                </p>
              </div>

              <div className={styles.clauseBlock}>
                <h3>2.2 Código de Rastreamento e Acompanhamento</h3>
                <p>
                  Assim que o pacote é despachado, o código de rastreio oficial é enviado para o seu e-mail/WhatsApp cadastrado e fica disponível permanentemente na aba <strong>"Meus Pedidos"</strong> dentro do seu <Link to="/perfil" className={styles.inlineLink}>Perfil na THR33</Link>, acompanhado da linha do tempo atualizada do pedido.
                </p>
              </div>

              <div className={styles.clauseBlock}>
                <h3>2.3 Tentativas de Entrega, Ausência e Endereço Incorreto</h3>
                <p>
                  Os Correios e transportadoras realizam até <strong>3 (três) tentativas de entrega</strong> no local informado. Caso não haja ninguém para receber o pacote ou o endereço tenha sido preenchido de forma incompleta/incorreta pelo cliente no momento do checkout, a encomenda retorna ao centro logístico de origem. Assim que notificados, nossa equipe entra em contato diretamente com você pelo WhatsApp ou e-mail para alinhar o reenvio ou o cancelamento do pedido.
                </p>
              </div>

              <div className={styles.clauseBlock}>
                <h3>2.4 Garantia Integral Contra Extravio, Perda ou Roubo nos Correios</h3>
                <p>
                  Caso o seu pacote sofra extravio, perda ou roubo confirmado no fluxo postal dos Correios ou da transportadora, <strong>o cliente jamais arcará com qualquer prejuízo</strong>. A THR33 assume integralmente a reclamação administrativa junto ao transportador e garante a você a escolha imediata entre duas opções:
                </p>
                <ul>
                  <li>
                    <strong>(a) Reenvio Imediato sem Custo:</strong> Produção e envio prioritário de uma nova peça idêntica para o seu endereço, com frete 100% custeado pela THR33; ou
                  </li>
                  <li>
                    <strong>(b) Reembolso Integral (100%):</strong> Devolução imediata de 100% do valor pago pelo pedido (incluindo o valor do frete).
                  </li>
                </ul>
              </div>

              <div className={styles.clauseBlock}>
                <h3>2.5 Embalagem Violada ou Avaria no Transporte</h3>
                <p>
                  Orientamos que verifique as condições da embalagem no ato do recebimento. Se notar que o pacote está violado, rasgado ou com sinais de avaria, recuse o recebimento ou registre foto imediatamente e acione nosso suporte pelo WhatsApp (<strong>+55 41 8841-0374</strong>), Direct do Instagram (<strong>@madebythr33</strong>) ou página de <Link to="/suporte" className={styles.inlineLink}>Suporte</Link>.
                </p>
              </div>
            </div>
          </section>

          {/* ========================================================
              SEÇÃO 03: CANCELAMENTO, TROCAS, DEVOLUÇÕES & REEMBOLSO
              ======================================================== */}
          <section id="secao-trocas" className={styles.policySection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionMetaRow}>
                <span className={styles.sectionNumber}>SEÇÃO 03</span>
                <span className={styles.sectionBadge}>Conformidade Art. 49 CDC</span>
              </div>
              <h2 className={styles.sectionTitle}>
                POLÍTICA DE COMPRA, CANCELAMENTO, TROCAS, DEVOLUÇÕES & REEMBOLSO
              </h2>
            </div>

            <div className={styles.summaryBox}>
              <div className={styles.summaryTitleRow}>
                <RefreshCw size={16} />
                <strong>RESUMO TRANSPARENTE THR33</strong>
              </div>
              <p>
                Não serviu ou mudou de ideia? Você tem <strong>7 dias corridos</strong> após receber a peça para devolver ou trocar sem burocracia (Art. 49 do CDC). Se houver qualquer defeito de fábrica ou estampa, o prazo é de <strong>30 dias corridos</strong> com frete reverso 100% pago por nós.
              </p>
            </div>

            <div className={styles.clausesList}>
              <div className={styles.clauseBlock}>
                <h3>3.1 Direito de Arrependimento ou Desistência (Art. 49 do CDC)</h3>
                <p>
                  Em estrito cumprimento ao Artigo 49 do Código de Defesa do Consumidor, você possui o prazo de até <strong>7 (sete) dias corridos</strong>, contados a partir da data de recebimento físico do produto, para solicitar a devolução por arrependimento ou a troca de tamanho/modelo.
                </p>
                <p>
                  Para que a devolução ou troca seja aprovada, a peça deve estar em perfeito estado de conservação: <strong>sem sinais de uso, sem ter sido lavada, sem odores, com a etiqueta/tag original fixada</strong> e acompanhada de eventuais brindes ou adesivos enviados junto ao pedido.
                </p>
              </div>

              <div className={styles.clauseBlock}>
                <h3>3.2 Garantia Contra Defeito de Fabricação ou Estampa</h3>
                <p>
                  Todas as peças da THR33 passam por revisão de qualidade antes do envio. Ainda assim, caso você identifique qualquer defeito técnico na malha, na costura ou na estampa, você conta com o prazo de até <strong>30 (trinta) dias corridos</strong> após o recebimento para acionar a troca em garantia (sem prejuízo da garantia legal prevista no CDC). Constatado o defeito, <strong>todos os custos de frete reverso e de envio da nova peça são 100% pagos pela THR33</strong>.
                </p>
              </div>

              <div className={styles.clauseBlock}>
                <h3>3.3 Como Solicitar (Atendimento Humano e Sem Burocracia)</h3>
                <p>
                  Somos uma marca independente e próxima da nossa comunidade — fazemos questão de atender cada cliente pessoalmente. Para solicitar cancelamento, troca ou devolução, basta entrar em contato informando o <strong>número do seu pedido</strong> por qualquer um dos nossos canais oficiais:
                </p>
                <ul>
                  <li>
                    <strong>Pelo Site:</strong> Na página de <Link to="/suporte" className={styles.inlineLink}>Suporte (/suporte)</Link> ou diretamente no botão "Reportar Problema" dentro de <strong>Meus Pedidos</strong> no seu <Link to="/perfil" className={styles.inlineLink}>Perfil</Link>;
                  </li>
                  <li>
                    <strong>WhatsApp Oficial:</strong> <a href="https://wa.me/554188410374" target="_blank" rel="noreferrer" className={styles.inlineLink}>+55 41 8841-0374</a>;
                  </li>
                  <li>
                    <strong>Instagram Direct:</strong> <a href="https://www.instagram.com/madebythr33" target="_blank" rel="noreferrer" className={styles.inlineLink}>@madebythr33</a>;
                  </li>
                  <li>
                    <strong>E-mail Oficial:</strong> <a href="mailto:contato.thr33@gmail.com" className={styles.inlineLink}>contato.thr33@gmail.com</a>.
                  </li>
                </ul>
              </div>

              <div className={styles.clauseBlock}>
                <h3>3.4 Prazos e Formas de Reembolso</h3>
                <p>
                  Assim que o cancelamento ou a conferência da devolução é confirmada pela nossa equipe, o reembolso é processado conforme o método de pagamento utilizado na compra:
                </p>
                <ul>
                  <li>
                    <strong>Compras via PIX:</strong> Reembolso integral efetuado diretamente para a conta bancária de origem em até <strong>24h a 48h úteis</strong> após a confirmação.
                  </li>
                  <li>
                    <strong>Compras via Cartão de Crédito:</strong> O estorno é solicitado imediatamente via <strong>PagBank</strong> junto à administradora do seu cartão. O crédito poderá aparecer na fatura atual ou em até <strong>1 a 2 faturas subsequentes</strong>, dependendo exclusivamente da data de fechamento e das regras da operadora do seu cartão.
                  </li>
                  <li>
                    <strong>Compras via Cartão de Débito:</strong> Reembolso realizado via transferência bancária ou PIX diretamente para a conta de titularidade do comprador em até <strong>3 (três) dias úteis</strong>.
                  </li>
                  <li>
                    <strong>Opção de Crédito na Carteira Digital THR33:</strong> Se preferir trocar rapidamente por outro modelo do catálogo, você também pode optar pela liberação imediata do valor como saldo na sua Carteira Digital da conta.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* ========================================================
              SEÇÃO 04: SEGURANÇA DE PAGAMENTO (PAGBANK)
              ======================================================== */}
          <section id="secao-pagamento" className={styles.policySection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionMetaRow}>
                <span className={styles.sectionNumber}>SEÇÃO 04</span>
                <span className={styles.sectionBadge}>PagBank Oficial • PCI-DSS</span>
              </div>
              <h2 className={styles.sectionTitle}>
                SEGURANÇA DE PAGAMENTO (PAGBANK) & PROTEÇÃO DE DADOS SENSÍVEIS
              </h2>
            </div>

            <div className={styles.summaryBox}>
              <div className={styles.summaryTitleRow}>
                <Lock size={16} />
                <strong>RESUMO TRANSPARENTE THR33</strong>
              </div>
              <p>
                <strong>A THR33 NÃO tem acesso direto e JAMAIS armazena números completos de cartão de crédito, senhas ou código de segurança (CVV).</strong> Todo o pagamento é criptografado e processado diretamente pelo <strong>PagBank (PagSeguro)</strong>.
              </p>
            </div>

            <div className={styles.clausesList}>
              <div className={styles.clauseBlock}>
                <h3>4.1 Processamento Criptografado via PagBank (PagSeguro)</h3>
                <p>
                  Todas as transações financeiras realizadas no checkout da THR33 (PIX com QR Code dinâmico, Cartão de Crédito ou Cartão de Débito) são processadas por meio da infraestrutura homologada do <strong>PagBank (PagSeguro Internet S.A.)</strong>, que opera sob certificação internacional de segurança <strong>PCI-DSS</strong> (Payment Card Industry Data Security Standard).
                </p>
              </div>

              <div className={styles.clauseBlock}>
                <h3>4.2 Garantia de Sigilo Financeiro e Tokenização</h3>
                <p>
                  Ao digitar os dados do seu cartão no checkout transparente, as informações são criptografadas em tempo real pelo SDK oficial do PagBank antes mesmo de saírem do seu navegador. <strong>A THR33 não visualiza, não manipula e jamais grava o número completo do seu cartão, data de validade ou código CVV em seus servidores ou banco de dados.</strong>
                </p>
                <p>
                  Nosso sistema recebe do PagBank exclusivamente o identificador técnico da transação (<code>Payment ID / Order ID</code>), os 4 últimos dígitos para simples conferência no seu recibo e o status de aprovação financeira para liberar o envio do pedido.
                </p>
              </div>
            </div>
          </section>

          {/* ========================================================
              SEÇÃO 05: POLÍTICA DE PRIVACIDADE COMPLETA (LGPD)
              ======================================================== */}
          <section id="secao-privacidade" className={styles.policySection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionMetaRow}>
                <span className={styles.sectionNumber}>SEÇÃO 05</span>
                <span className={styles.sectionBadge}>LGPD • Lei nº 13.709/2018</span>
              </div>
              <h2 className={styles.sectionTitle}>
                POLÍTICA DE PRIVACIDADE E PROTEÇÃO DE DADOS PESSOAIS (LGPD)
              </h2>
            </div>

            <div className={styles.summaryBox}>
              <div className={styles.summaryTitleRow}>
                <ShieldCheck size={16} />
                <strong>RESUMO TRANSPARENTE THR33</strong>
              </div>
              <p>
                Coletamos apenas os dados essenciais para emitir sua Nota Fiscal, produzir sua peça e entregar no seu endereço. <strong>Nós nunca vendemos nem comercializamos seus dados.</strong> O compartilhamento ocorre estritamente com PagBank (pagamento), Savvy Print (produção/envio) e Correios/Transportadoras (entrega).
              </p>
            </div>

            <div className={styles.clausesList}>
              <div className={styles.clauseBlock}>
                <h3>5.1 Glossário e Definições Acessíveis (LGPD)</h3>
                <p>
                  Para que você compreenda exatamente como tratamos suas informações nos termos da Lei Geral de Proteção de Dados (Lei Federal nº 13.709/2018), adotamos as seguintes definições:
                </p>
                <ul>
                  <li>
                    <strong>Dados Pessoais:</strong> Qualquer informação relacionada a você que permita identificá-lo (como Nome, CPF, E-mail, Telefone e Endereço).
                  </li>
                  <li>
                    <strong>Titular:</strong> Você, cliente ou visitante da plataforma THR33, a quem se referem os dados pessoais.
                  </li>
                  <li>
                    <strong>Tratamento de Dados:</strong> Toda operação realizada com dados pessoais, como coleta, armazenamento seguro, consulta para envio de pedidos e exclusão.
                  </li>
                  <li>
                    <strong>Anonimização:</strong> Processo técnico pelo qual um dado perde a possibilidade de associação direta ou indireta a um indivíduo, utilizado em nossas métricas estatísticas de visitas.
                  </li>
                  <li>
                    <strong>Computação em Nuvem (Firebase / Google Cloud):</strong> Infraestrutura de servidores de alta segurança certificada pela Google onde o banco de dados criptografado da THR33 está hospedado.
                  </li>
                  <li>
                    <strong>Conta de Acesso:</strong> Credencial individual do cliente protegida por autenticação criptografada que dá acesso ao histórico de pedidos, endereços e cupons exclusivos.
                  </li>
                </ul>
              </div>

              <div className={styles.clauseBlock}>
                <h3>5.2 Quais Dados Coletamos e Como São Utilizados</h3>
                <ul>
                  <li>
                    <strong>Dados Cadastrais e de Checkout:</strong> Nome completo, E-mail, CPF/CNPJ (obrigatório por lei para emissão de Nota Fiscal Eletrônica e despacho postal), Telefone/WhatsApp (para envio de rastreio e avisos de entrega) e Endereço físico completo.
                  </li>
                  <li>
                    <strong>Interações na Plataforma:</strong> Peças salvas na lista de desejos (Favoritos), avaliações de produtos publicadas por você e histórico de chamados abertos na Central de Suporte.
                  </li>
                  <li>
                    <strong>Dados Técnicos e Analíticos Anônimos:</strong> Endereço IP, tipo de dispositivo/navegador e páginas visitadas dentro da loja, utilizados exclusivamente para prevenção a fraudes e melhoria de desempenho da vitrine.
                  </li>
                </ul>
              </div>

              <div className={styles.clauseBlock}>
                <h3>5.3 Imutabilidade do E-mail na Conta de Acesso</h3>
                <p>
                  Por razões de segurança anti-fraude e integridade cadastral, o <strong>endereço de e-mail informado na criação da conta atua como chave única e imutável de identificação do cliente</strong>. Essa blindagem protege o vínculo do seu histórico de compras, saldo em carteira digital e cupons VIP exclusivos associados à sua conta.
                </p>
              </div>

              <div className={styles.clauseBlock}>
                <h3>5.4 Compartilhamento Estrito de Dados com Operadores Essenciais</h3>
                <p>
                  A THR33 <strong>jamais vende, aluga ou comercializa dados pessoais de seus clientes</strong>. O compartilhamento de informações estritamente necessárias ocorre única e exclusivamente com os parceiros operacionais indispensáveis para a execução do seu pedido:
                </p>
                <ul>
                  <li>
                    <strong>PagBank (PagSeguro):</strong> Para processamento financeiro, prevenção a fraudes e liquidação do pagamento;
                  </li>
                  <li>
                    <strong>Savvy Print:</strong> Nossa parceira oficial de produção e logística, que recebe os itens do pedido e os dados de destinatário para confeccionar e expedir a encomenda;
                  </li>
                  <li>
                    <strong>Correios e Transportadoras Homologadas:</strong> Para realização do transporte físico e entrega no endereço indicado.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* ========================================================
              SEÇÃO 06: COOKIES, DIREITOS DO TITULAR E MENORES
              ======================================================== */}
          <section id="secao-cookies" className={styles.policySection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionMetaRow}>
                <span className={styles.sectionNumber}>SEÇÃO 06</span>
                <span className={styles.sectionBadge}>Transparência Digital</span>
              </div>
              <h2 className={styles.sectionTitle}>
                POLÍTICA DE COOKIES, DIREITOS DO TITULAR (LGPD) & MENORES DE IDADE
              </h2>
            </div>

            <div className={styles.summaryBox}>
              <div className={styles.summaryTitleRow}>
                <Cookie size={16} />
                <strong>RESUMO TRANSPARENTE THR33</strong>
              </div>
              <p>
                Usamos cookies apenas para manter você logado, guardar sua sacola de compras e entender quais peças fazem mais sucesso. Você tem controle total sobre seus dados diretamente no seu <strong>Perfil</strong>.
              </p>
            </div>

            <div className={styles.clausesList}>
              <div className={styles.clauseBlock}>
                <h3>6.1 Política de Cookies e Armazenamento Local</h3>
                <p>
                  Utilizamos cookies de sessão (que expiram ao fechar o navegador) e cookies/armazenamento persistente divididos em três categorias transparentes:
                </p>
                <ul>
                  <li>
                    <strong>Estritamente Necessários:</strong> Essenciais para manter sua sessão autenticada com segurança no Firebase Auth, preservar os itens adicionados na sua sacola de compras e processar o checkout.
                  </li>
                  <li>
                    <strong>Funcionais:</strong> Memorizam suas preferências de navegação, cupons VIP reservados e peças salvas na sua lista de Favoritos.
                  </li>
                  <li>
                    <strong>Analíticos e de Desempenho:</strong> Coletam métricas agregadas sobre visitas, cliques em produtos e funil de conversão para identificarmos eventuais falhas técnicas e aprimorarmos os próximos drops.
                  </li>
                </ul>
                <p>
                  Você pode gerir ou desativar os cookies a qualquer momento nas configurações do seu navegador, ciente de que o bloqueio de cookies estritamente necessários poderá impedir a manutenção do login ou do carrinho de compras.
                </p>
              </div>

              <div className={styles.clauseBlock}>
                <h3>6.2 Direitos do Titular dos Dados (Art. 18 da LGPD)</h3>
                <p>
                  Você pode exercer seus direitos previstos na LGPD a qualquer momento e sem custos:
                </p>
                <ul>
                  <li>
                    <strong>Consulta e Retificação:</strong> Você pode visualizar e atualizar seu nome, telefone, CPF e endereços diretamente na página <Link to="/perfil" className={styles.inlineLink}>Meu Perfil (/perfil)</Link>.
                  </li>
                  <li>
                    <strong>Exclusão de Conta ("Danger Zone"):</strong> Você pode solicitar a exclusão da sua conta diretamente na aba de segurança do seu Perfil ou entrando em contato pelo e-mail <a href="mailto:contato.thr33@gmail.com" className={styles.inlineLink}>contato.thr33@gmail.com</a>, ressalvada a guarda obrigatória de registros fiscais e de pedidos concluídos pelo prazo legal (Art. 16, I da LGPD).
                  </li>
                </ul>
              </div>

              <div className={styles.clauseBlock}>
                <h3>6.3 Diretriz Sobre Compras por Menores de Idade</h3>
                <p>
                  Os produtos da THR33 são voltados ao público jovem e adulto. Caso o cliente seja menor de <strong>18 (dezoito) anos</strong>, o cadastro na plataforma, o fornecimento de dados pessoais e a realização de compras com pagamento via PIX, cartão de crédito ou cartão de débito devem ocorrer <strong>exclusivamente com a ciência, autorização e supervisão direta dos pais ou responsáveis legais</strong>.
                </p>
              </div>
            </div>
          </section>

          {/* RODAPÉ DE CONTATO DIRETO DA PÁGINA DE POLÍTICAS */}
          <footer className={styles.bottomContactBanner}>
            <div className={styles.bottomContactLeft}>
              <span className={styles.bottomContactTag}>CANAL ABERTO COM A COMUNIDADE</span>
              <h3>AINDA FICOU COM ALGUMA DÚVIDA SOBRE NOSSAS POLÍTICAS?</h3>
              <p>
                Fale diretamente com a equipe da THR33. Estamos disponíveis no WhatsApp, no Direct do Instagram e por e-mail para te ajudar pessoalmente.
              </p>
            </div>
            <div className={styles.bottomContactBtns}>
              <a
                href="https://wa.me/554188410374"
                target="_blank"
                rel="noreferrer"
                className={styles.primaryContactBtn}
              >
                <MessageSquare size={15} />
                <span>CHAMAR NO WHATSAPP</span>
              </a>
              <Link to="/suporte" className={styles.secondaryContactBtn}>
                <span>IR PARA CENTRAL DE SUPORTE</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}

export default Politicas;
