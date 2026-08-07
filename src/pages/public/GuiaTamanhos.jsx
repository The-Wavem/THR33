import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ruler, CheckCircle2, User, Info, ArrowRight } from 'lucide-react';
import { fadeInUp } from '../../utils/motionVariants';
import styles from './GuiaTamanhos.module.css';

const fitsData = {
  boxy: {
    id: 'boxy',
    name: 'BOXY OVERSIZED',
    gsm: '280GSM HEAVYWEIGHT',
    description: 'Modelagem autoral retangular com ombros caídos, gola canelada de 3cm e comprimento ajustado na cintura. Projetada para quem busca volume sem sobra de tecido na barra.',
    modelRef: 'Modelo: 1,80m // 75kg — Veste tamanho G para efeito Boxy ideal.',
    measures: [
      { size: 'P', largura: '56 cm', comprimento: '70 cm', manga: '22 cm', ombro: '54 cm' },
      { size: 'M', largura: '58 cm', comprimento: '72 cm', manga: '23 cm', ombro: '56 cm' },
      { size: 'G', largura: '60 cm', comprimento: '74 cm', manga: '24 cm', ombro: '58 cm' },
      { size: 'GG', largura: '62 cm', comprimento: '76 cm', manga: '25 cm', ombro: '60 cm' }
    ]
  },
  heavyweight: {
    id: 'heavyweight',
    name: 'HEAVYWEIGHT STREET',
    gsm: '280GSM ALGODÃO PIMA',
    description: 'Corte tradicional de rua com mangas alongadas, silhueta reta e tecido encorpado que não marca o corpo. Ideal para composição de camadas (layering).',
    modelRef: 'Modelo: 1,85m // 82kg — Veste tamanho GG para caimento oversized solto.',
    measures: [
      { size: 'P', largura: '54 cm', comprimento: '73 cm', manga: '23 cm', ombro: '52 cm' },
      { size: 'M', largura: '56 cm', comprimento: '75 cm', manga: '24 cm', ombro: '54 cm' },
      { size: 'G', largura: '58 cm', comprimento: '77 cm', manga: '25 cm', ombro: '56 cm' },
      { size: 'GG', largura: '60 cm', comprimento: '79 cm', manga: '26 cm', ombro: '58 cm' }
    ]
  },
  hoodie: {
    id: 'hoodie',
    name: 'HOODIE BOXY SP',
    gsm: '380GSM PESADO',
    description: 'Moletom de altíssima densidade com capuz duplo encorpado sem cordões soltos. Punhos e barra em ribana canelada de alta compressão para manter a forma.',
    modelRef: 'Modelo: 1,78m // 72kg — Veste tamanho M para caimento estruturado.',
    measures: [
      { size: 'P', largura: '58 cm', comprimento: '68 cm', manga: '62 cm', ombro: '56 cm' },
      { size: 'M', largura: '60 cm', comprimento: '70 cm', manga: '63 cm', ombro: '58 cm' },
      { size: 'G', largura: '62 cm', comprimento: '72 cm', manga: '64 cm', ombro: '60 cm' },
      { size: 'GG', largura: '64 cm', comprimento: '74 cm', manga: '65 cm', ombro: '62 cm' }
    ]
  }
};

export function GuiaTamanhos() {
  const [selectedFit, setSelectedFit] = useState('boxy');

  const currentFit = fitsData[selectedFit];

  return (
    <div className={styles.pageContainer}>
      <motion.div initial="hidden" animate="visible" variants={fadeInUp} className={styles.contentWrapper}>
        
        {/* HEADER DA PÁGINA */}
        <div className={styles.header}>
          <span className={styles.tagBadge}>[ BLUEPRINT DE MODELAGENS ]</span>
          <h1>GUIA DE TAMANHOS & FITS</h1>
          <p>
            Cada peça do Ateliê THR33 possui uma estrutura própria desenvolvida com tecidos pesados. 
            Selecione a modelagem abaixo para conferir as especificações de corte e tabela de centímetros.
          </p>
        </div>

        {/* SELETOR DE MODELAGENS (TABS) */}
        <div className={styles.fitTabsGrid}>
          {Object.values(fitsData).map((fit) => (
            <button
              key={fit.id}
              onClick={() => setSelectedFit(fit.id)}
              className={selectedFit === fit.id ? styles.tabActive : styles.tabBtn}
            >
              <strong>{fit.name}</strong>
              <span>{fit.gsm}</span>
            </button>
          ))}
        </div>

        {/* PAINEL DE DETALHES DA MODELAGEM */}
        <div className={styles.blueprintPanel}>
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedFit}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className={styles.panelGrid}
            >
              {/* LADO ESQUERDO: ESQUEMA TÁTICO DE MEDIÇÃO */}
              <div className={styles.diagramCol}>
                <div className={styles.diagramBox}>
                  <div className={styles.blueprintOverlay}>
                    <span className={styles.bpTag}>THR33 // PATTERN #{selectedFit.toUpperCase()}</span>
                  </div>
                  
                  {/* ESQUEMA VISUAL DE CAMISETA */}
                  <div className={styles.visualTshirtSchematic}>
                    <div className={styles.lineLargura}><span>[A] LARGURA</span></div>
                    <div className={styles.lineComprimento}><span>[B] COMPRIMENTO</span></div>
                    <div className={styles.lineManga}><span>[C] MANGA</span></div>
                  </div>
                </div>

                <div className={styles.modelRefCard}>
                  <User size={18} className={styles.iconAcid} />
                  <span>{currentFit.modelRef}</span>
                </div>
              </div>

              {/* LADO DIREITO: TABELA E CONCEITO */}
              <div className={styles.tableCol}>
                <div className={styles.fitConceptBox}>
                  <h3>{currentFit.name}</h3>
                  <p>{currentFit.description}</p>
                </div>

                <div className={styles.tableWrapper}>
                  <table className={styles.measuresTable}>
                    <thead>
                      <tr>
                        <th>TAMANHO</th>
                        <th>[A] LARGURA</th>
                        <th>[B] COMPRIMENTO</th>
                        <th>[C] MANGA</th>
                        <th>[D] OMBRO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentFit.measures.map((row) => (
                        <tr key={row.size}>
                          <td className={styles.sizeCell}>{row.size}</td>
                          <td>{row.largura}</td>
                          <td>{row.comprimento}</td>
                          <td>{row.manga}</td>
                          <td>{row.ombro}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* INSTRUÇÕES: COMO MEDIR SUA PEÇA EM CASA */}
        <div className={styles.howToSection}>
          <h2>COMO MEDIR UMA PEÇA QUE VOCÊ JÁ TEM EM CASA</h2>
          
          <div className={styles.stepsGrid}>
            <div className={styles.stepCard}>
              <span className={styles.stepNum}>01</span>
              <h4>ESCOLHA SUA PEÇA FAVORITA</h4>
              <p>Pegue uma camiseta ou moletom no seu guarda-roupa que tenha o caimento exatamente como você gosta.</p>
            </div>

            <div className={styles.stepCard}>
              <span className={styles.stepNum}>02</span>
              <h4>ESTIQUE EM UMA SUPERFÍCIE PLANA</h4>
              <p>Coloque a peça sobre uma mesa plana e alise o tecido para remover dobras, sem esticar a malha.</p>
            </div>

            <div className={styles.stepCard}>
              <span className={styles.stepNum}>03</span>
              <h4>MEÇA COM UMA FITA OU RÉGUA</h4>
              <p>Meça a largura de uma axila à outra e o comprimento do ombro até a barra. Compare com nossa tabela acima.</p>
            </div>
          </div>
        </div>

      </motion.div>
    </div>
  );
}

export default GuiaTamanhos;
