import React, { useState } from 'react';
import styles from './Politicas.module.css';

export function Politicas() {
  const [activeTab, setActiveTab] = useState('trocas'); // 'trocas', 'envio', 'reembolso', 'privacidade'

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <span className={styles.tag}>TRANSPARÊNCIA E TERMOS</span>
        <h1 className={styles.title}>POLÍTICAS DA THR33</h1>
      </header>

      <div className={styles.layout}>
        {/* NAVEGAÇÃO LATERAL */}
        <nav className={styles.navTabs}>
          <button 
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'trocas' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('trocas')}
          >
            Trocas & Devoluções
          </button>
          <button 
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'envio' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('envio')}
          >
            Prazos & Envio
          </button>
          <button 
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'reembolso' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('reembolso')}
          >
            Reembolso & Estorno
          </button>
          <button 
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'privacidade' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('privacidade')}
          >
            Privacidade & Dados
          </button>
        </nav>

        {/* CONTEÚDO EXPLICATIVO */}
        <section className={styles.contentArea}>
          {activeTab === 'trocas' && (
            <article className={styles.article}>
              <h2>POLÍTICA DE TROCAS E DEVOLUÇÕES</h2>
              <p>Conforme o Código de Defesa do Consumidor, o cliente tem até <strong>7 (sete) dias corridos</strong> após o recebimento do produto para solicitar o cancelamento da compra por arrependimento.</p>
              <h3>Condições para Troca:</h3>
              <ul>
                <li>A peça deve estar sem marcas de uso, lavagem ou odores.</li>
                <li>A etiqueta original da THR33 deve estar afixada à peça.</li>
                <li>A solicitação deve ser feita pela Central de Suporte informando CPF e número do pedido.</li>
              </ul>
              <p>Para trocas por tamanho ou modelo, o prazo estende-se para até <strong>30 dias corridos</strong>.</p>
            </article>
          )}

          {activeTab === 'envio' && (
            <article className={styles.article}>
              <h2>POLÍTICA DE ENVIO E FRETE</h2>
              <p>Todos os pedidos são processados e despachados em até 24 horas úteis após a confirmação do pagamento.</p>
              <h3>Prazos de Entrega:</h3>
              <ul>
                <li><strong>Curitiba e Região (Araucária, S.J. dos Pinhais):</strong> 1 a 2 dias úteis via frete expresso.</li>
                <li><strong>Demais Estados (Sedex):</strong> 2 a 5 dias úteis.</li>
                <li><strong>Demais Estados (PAC):</strong> 5 a 12 dias úteis.</li>
              </ul>
              <p>O código de rastreamento é enviado automaticamente para o e-mail cadastrado assim que o lote é despachado.</p>
            </article>
          )}

          {activeTab === 'reembolso' && (
            <article className={styles.article}>
              <h2>REEMBOLSO E FORMAS DE ESTORNO</h2>
              <p>O estorno será efetuado após a devolução da peça ao nosso centro de distribuição em Curitiba e inspeção de qualidade.</p>
              <ul>
                <li><strong>Pix:</strong> Reembolso enviado para a mesma chave em até 24h úteis.</li>
                <li><strong>Cartão de Crédito:</strong> O estorno é solicitado à operadora do cartão (PagBank) e constará em até 2 faturas subsequentes.</li>
                <li><strong>Boleto Bancário:</strong> Transferência bancária para conta de mesma titularidade em até 3 dias úteis.</li>
              </ul>
            </article>
          )}

          {activeTab === 'privacidade' && (
            <article className={styles.article}>
              <h2>POLÍTICA DE PRIVACIDADE (LGPD)</h2>
              <p>Na THR33, garantimos total sigilo e proteção aos seus dados pessoais nos termos da Lei Geral de Proteção de Dados (LGPD).</p>
              <p>Coletamos apenas as informações estritamente necessárias para o processamento de compras, emissão de nota fiscal e comunicação de drops exclusivos.</p>
              <p>Você pode solicitar a alteração ou exclusão permanente dos seus dados a qualquer momento pela aba "Danger Zone" no seu perfil.</p>
            </article>
          )}
        </section>
      </div>
    </main>
  );
}

export default Politicas;
