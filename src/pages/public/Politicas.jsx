import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Shield, Truck, RefreshCcw } from 'lucide-react';
import { fadeInUp } from '../../utils/motionVariants';
import styles from './Politicas.module.css';

const policyContent = {
  privacidade: {
    icon: Shield,
    title: 'POLÍTICA DE PRIVACIDADE',
    content: `A sua privacidade é uma prioridade para o Ateliê THR33. Protegemos seus dados pessoais de ponta a ponta. \n\n1. COLETA DE DADOS: Coletamos apenas as informações necessárias para processamento de pagamentos, emissão de nota fiscal e envio tático (SEDEX/PAC). \n\n2. SEGURANÇA: Utilizamos criptografia SSL. Nenhum dado de cartão de crédito é armazenado em nossos servidores; todo o processamento é feito via gateways certificados. \n\n3. COMPARTILHAMENTO: Não vendemos nem compartilhamos seus dados com terceiros, exceto operadoras logísticas responsáveis pela entrega.`
  },
  envio: {
    icon: Truck,
    title: 'POLÍTICA DE ENVIO & FRETE',
    content: `Nossa logística é tratada com a mesma precisão do corte das nossas peças. \n\n1. PRAZO DE POSTAGEM: Todo pedido confirmado é preparado no Ateliê e despachado nos Correios/Transportadora em até 48 horas úteis. \n\n2. MODALIDADES: Oferecemos SEDEX Expresso (prioritário) e PAC. O prazo varia conforme o seu CEP e é informado na etapa de Checkout. \n\n3. RASTREIO: O código de rastreamento é disponibilizado na aba "Meus Pedidos" e enviado por e-mail assim que a etiqueta é gerada.`
  },
  termos: {
    icon: FileText,
    title: 'TERMOS DO DROP LIMITADO',
    content: `O Ateliê THR33 opera sob o modelo de Drops Numéricos e Lotes Limitados. \n\n1. EXCLUSIVIDADE: As peças não sofrem reposição de estoque ("restock"). Uma vez que o limite numérico (ex: 33 unidades) é atingido, o item vai para o Arquivo. \n\n2. RESERVAS: Colocar um item no carrinho NÃO garante a reserva da peça. A reserva só é efetivada após a conclusão do pagamento no Checkout. \n\n3. COMPORTAMENTO ANTI-BOT: Reservamo-nos o direito de cancelar ordens identificadas como atividade robótica ou compras massivas visando revenda (scalping).`
  },
  reembolso: {
    icon: RefreshCcw,
    title: 'POLÍTICA DE REEMBOLSO E TROCA',
    content: `Garantimos a qualidade Heavyweight de cada item produzido. \n\n1. PRAZO DE TROCA: Você tem até 30 dias corridos após o recebimento para solicitar troca por defeito ou divergência de tamanho. \n\n2. CONDIÇÕES DA PEÇA: A peça deve retornar intacta, sem sinais de uso ou lavagem, com as etiquetas e lacres originais anexados. \n\n3. REEMBOLSO ARREPENDIMENTO: De acordo com o CDC, você possui 7 dias corridos após o recebimento para solicitar o cancelamento e reembolso integral da compra.`
  }
};

export function Politicas() {
  const location = useLocation();
  const [activePolicy, setActivePolicy] = useState('privacidade');

  // Lê o parâmetro da URL se existir (ex: /politicas?aba=reembolso)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const aba = params.get('aba');
    if (aba && policyContent[aba]) {
      setActivePolicy(aba);
    }
  }, [location]);

  const CurrentIcon = policyContent[activePolicy].icon;

  return (
    <div className={styles.pageContainer}>
      <motion.div initial="hidden" animate="visible" variants={fadeInUp} className={styles.layoutGrid}>
        
        {/* MENU LATERAL */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <FileText size={16} />
            <span>DOCUMENTAÇÃO R.U.A</span>
          </div>
          <nav className={styles.policyNav}>
            {Object.keys(policyContent).map((key) => (
              <button 
                key={key}
                onClick={() => setActivePolicy(key)}
                className={activePolicy === key ? styles.navBtnActive : styles.navBtn}
              >
                {policyContent[key].title}
              </button>
            ))}
          </nav>
        </aside>

        {/* ÁREA DE CONTEÚDO LEGAL (ESTILO PAPEL IMPRESSO) */}
        <main className={styles.contentArea}>
          <div className={styles.documentFrame}>
            <div className={styles.docHeader}>
              <CurrentIcon size={28} className={styles.docIcon} />
              <h2>{policyContent[activePolicy].title}</h2>
            </div>
            
            <div className={styles.docBody}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePolicy}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  {policyContent[activePolicy].content.split('\n\n').map((paragraph, idx) => (
                    <p key={idx} className={styles.docParagraph}>{paragraph}</p>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
            
            <div className={styles.docFooter}>
              <span>ÚLTIMA ATUALIZAÇÃO: 04 AGO 2026 // REVISÃO V.2</span>
              <strong>THR33 LEGAL DEPT.</strong>
            </div>
          </div>
        </main>

      </motion.div>
    </div>
  );
}

export default Politicas;
