import React, { useState, useEffect } from 'react';
import { analyticsService } from '../../services/analyticsService';
import styles from './Politicas.module.css';

export function Politicas() {
  const [activeTab, setActiveTab] = useState('trocas'); // 'trocas', 'envio', 'reembolso', 'privacidade'

  useEffect(() => {
    analyticsService.trackPageView('politicas');
  }, []);

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <span className={styles.tag}>CONFORMIDADE & TRANSPARÊNCIA</span>
        <h1 className={styles.title}>TERMOS LEGAIS & POLÍTICAS</h1>
      </header>

      <div className={styles.layout}>
        <nav className={styles.navTabs}>
          <button 
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'trocas' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('trocas')}
          >
            Trocas, Devoluções & CDC
          </button>
          <button 
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'envio' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('envio')}
          >
            Produção Sob Demanda & Prazos
          </button>
          <button 
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'reembolso' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('reembolso')}
          >
            Reembolso & Estorno Fiscal
          </button>
          <button 
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'privacidade' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('privacidade')}
          >
            Privacidade & LGPD
          </button>
        </nav>

        <section className={styles.contentArea}>
          {/* ABA 1: TROCAS, DEVOLUÇÕES & CDC */}
          {activeTab === 'trocas' && (
            <article className={styles.article}>
              <h2>POLÍTICA DE TROCAS, DEVOLUÇÕES E GARANTIA</h2>
              
              <h3>1. Direito de Arrependimento (Artigo 49 do CDC)</h3>
              <p>
                Em cumprimento ao Artigo 49 do Código de Defesa do Consumidor, o cliente possui até <strong>7 (sete) dias corridos</strong> após a entrega física do pedido para desistir da compra realizada pela internet, independentemente do motivo.
              </p>
              <p>
                Nesse caso, a restituição de valores é <strong>integral</strong>, contemplando o valor do produto e o custo do frete pago no pedido original. O código de postagem reversa dos Correios é fornecido pela THR33 sem qualquer custo adicional ao cliente.
              </p>

              <h3>2. Troca por Tamanho ou Modelagem</h3>
              <p>
                Para substituição de tamanho (Boxy ou Oversized), a solicitação pode ser aberta diretamente no painel do cliente em até <strong>30 dias corridos</strong> após o recebimento.
              </p>

              <h3>3. Garantia Legal Contra Vícios de Fabricação (Artigo 26 do CDC)</h3>
              <p>
                Todas as camisetas possuem garantia legal de <strong>90 (noventa) dias</strong> contra defeitos de costura, deformação de gola ou falhas de estamparia. Constatado o vício, a peça será substituída por uma nova ou reembolsada integralmente.
              </p>
            </article>
          )}

          {/* ABA 2: PRODUÇÃO SOB DEMANDA & PRAZOS */}
          {activeTab === 'envio' && (
            <article className={styles.article}>
              <h2>PRODUÇÃO SOB DEMANDA & LOGÍSTICA DIRETA</h2>
              <p>
                A THR33 adota um modelo de produção sob demanda para garantir sustentabilidade têxtil e exclusividade de tiragem.
              </p>
              <h3>Cronograma Operacional:</h3>
              <ul>
                <li><strong>Fechamento Semanal:</strong> Os pedidos aprovados são consolidados semanalmente e enviados para a linha de corte e estamparia do fornecedor parceiro.</li>
                <li><strong>Prazo de Confecção:</strong> O processo de corte, costura e estamparia dura de <strong>5 a 8 dias úteis</strong>.</li>
                <li><strong>Despacho e Rastreamento:</strong> O pacote é expedido diretamente da fábrica via transportadora/Correios. O código de rastreio e a chave da Nota Fiscal Eletrônica (NF-e) são disponibilizados na conta do cliente assim que despachados.</li>
              </ul>
              <p>
                Não operamos com ponto de retirada física em ateliê. Toda a entrega é realizada exclusivamente no endereço cadastrado no momento do checkout.
              </p>
            </article>
          )}

          {/* ABA 3: REEMBOLSO & ESTORNO FISCAL */}
          {activeTab === 'reembolso' && (
            <article className={styles.article}>
              <h2>ESTORNOS, REEMBOLSOS E NOTAS FISCAIS</h2>
              <p>
                O cancelamento e estorno da transação financeira é processado após a confirmação da solicitação pelo SAC:
              </p>
              <ul>
                <li><strong>Pagamento via PIX:</strong> O reembolso é efetuado diretamente na conta bancária de origem em até 24 horas úteis após a aprovação da devolução.</li>
                <li><strong>Cartão de Crédito (PagBank):</strong> A solicitação de estorno é transmitida à operadora PagBank e constará como crédito na fatura atual ou subsequente, conforme os prazos do banco emissor.</li>
                <li><strong>Carteira Digital da Loja:</strong> Para trocas ágeis, o cliente pode optar por receber o valor como crédito instantâneo em sua Carteira Digital da conta, podendo utilizá-lo imediatamente em um novo pedido sem novas cobranças.</li>
              </ul>
            </article>
          )}

          {/* ABA 4: PRIVACIDADE & LGPD */}
          {activeTab === 'privacidade' && (
            <article className={styles.article}>
              <h2>POLÍTICA DE PRIVACIDADE E PROTEÇÃO DE DADOS (LGPD)</h2>
              <p>
                A THR33 trata os dados pessoais dos seus clientes em estrita conformidade com a Lei Federal nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais).
              </p>
              <h3>1. Finalidade do Tratamento de Dados:</h3>
              <p>
                Nome completo, CPF, telefone e endereço são coletados unicamente para a emissão obrigatória de Nota Fiscal Eletrônica (NF-e) junto à SEFAZ e para a execução do transporte da mercadoria.
              </p>
              <h3>2. Segurança Financeira e PCI-DSS:</h3>
              <p>
                A THR33 <strong>não armazena números de cartão de crédito, datas de validade ou códigos CVV</strong> em seus servidores ou banco de dados Firestore. Todas as transações são transmitidas de forma criptografada diretamente para a instituição de pagamento PagBank, em ambiente homologado com certificação PCI-DSS.
              </p>
              <h3>3. Direitos do Titular:</h3>
              <p>
                O cliente pode requerer a atualização, retificação ou exclusão definitiva de seus dados de cadastro a qualquer momento pela aba de configurações do seu Perfil ou enviando mensagem para sac@thr33.com.
              </p>
            </article>
          )}
        </section>
      </div>
    </main>
  );
}

export default Politicas;
