import React, { useState } from 'react';
import { Ruler } from 'lucide-react';
import { SEO } from '../../components/common/SEO';
import styles from './GuiaTamanhos.module.css';

const FITS_SPECS = {
  boxy: {
    id: 'boxy',
    name: 'BOXY FIT',
    gsm: '220 GSM ALGODÃO ESTRUTURADO',
    description: 'Corte contemporâneo quadrado com ombros caídos e comprimento levemente mais curto na cintura. Proporciona volume e presença sem sobras de tecido na barra.',
    measures: [
      { size: 'P', largura: '57 cm', comprimento: '64 cm', manga: '23 cm', ombro: '21 cm' },
      { size: 'M', largura: '59 cm', comprimento: '66 cm', manga: '24 cm', ombro: '22 cm' },
      { size: 'G', largura: '61 cm', comprimento: '68 cm', manga: '25 cm', ombro: '23 cm' },
      { size: 'GG', largura: '63 cm', comprimento: '70 cm', manga: '26 cm', ombro: '24 cm' }
    ]
  },
  heavy: {
    id: 'heavy',
    name: 'OVERSIZED HEAVY',
    gsm: '260 GSM HEAVYWEIGHT',
    description: 'Malha pesada 100% algodão de caimento reto e rígido. Gola canelada 2x1 de 3cm pespontada para máxima durabilidade.',
    measures: [
      { size: 'P', largura: '54 cm', comprimento: '71 cm', manga: '24 cm', ombro: '19 cm' },
      { size: 'M', largura: '58 cm', comprimento: '73 cm', manga: '25 cm', ombro: '20 cm' },
      { size: 'G', largura: '60 cm', comprimento: '75 cm', manga: '26 cm', ombro: '21 cm' },
      { size: 'GG', largura: '62 cm', comprimento: '78 cm', manga: '27 cm', ombro: '22 cm' },
      { size: 'EXG', largura: '64 cm', comprimento: '80 cm', manga: '28 cm', ombro: '23 cm' }
    ]
  },
  classica: {
    id: 'classica',
    name: 'OVERSIZED CLÁSSICA',
    gsm: '190 GSM ALGODÃO PENTEADO',
    description: 'Caimento streetwear clássico e fluido em fio 30.1 encorpado. Toque suave ideal para o uso diário.',
    measures: [
      { size: 'P', largura: '54 cm', comprimento: '71 cm', manga: '24 cm', ombro: '19 cm' },
      { size: 'M', largura: '58 cm', comprimento: '73 cm', manga: '25 cm', ombro: '20 cm' },
      { size: 'G', largura: '60 cm', comprimento: '75 cm', manga: '26 cm', ombro: '21 cm' },
      { size: 'GG', largura: '62 cm', comprimento: '78 cm', manga: '27 cm', ombro: '22 cm' },
      { size: 'EXG', largura: '64 cm', comprimento: '80 cm', manga: '28 cm', ombro: '23 cm' }
    ]
  }
};

export function GuiaTamanhos() {
  const [activeTab, setActiveTab] = useState('boxy');
  const activeFit = FITS_SPECS[activeTab];

  return (
    <main className={styles.container}>
      <SEO
        title="Guia de Medidas & Modelagens | THR33 Streetwear"
        description="Consulte a tabela de medidas oficial das modelagens Boxy Fit, Oversized Heavyweight e Oversized Clássica da THR33 Streetwear."
        url="/guia-de-tamanhos"
      />
      <header className={styles.header}>
        <span className={styles.tag}>ESPECIFICAÇÕES DE CORTE</span>
        <h1 className={styles.title}>GUIA DE MEDIDAS OFICIAL</h1>
        <p className={styles.lead}>
          Medidas exatas das três modelagens de camisetas confeccionadas pela THR33.
        </p>
      </header>

      <div className={styles.tabNav}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'boxy' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('boxy')}
        >
          BOXY FIT (220 GSM)
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'heavy' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('heavy')}
        >
          OVERSIZED HEAVY (260 GSM)
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'classica' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('classica')}
        >
          OVERSIZED CLÁSSICA (190 GSM)
        </button>
      </div>

      <section className={styles.specBox}>
        <div className={styles.specHeader}>
          <h2>{activeFit.name}</h2>
          <span className={styles.gsmBadge}>{activeFit.gsm}</span>
        </div>
        <p className={styles.desc}>{activeFit.description}</p>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>TAMANHO</th>
                <th>LARGURA</th>
                <th>COMPRIMENTO</th>
                <th>MANGA</th>
                <th>OMBRO</th>
              </tr>
            </thead>
            <tbody>
              {activeFit.measures.map((m) => (
                <tr key={m.size}>
                  <td><strong>{m.size}</strong></td>
                  <td>{m.largura}</td>
                  <td>{m.comprimento}</td>
                  <td>{m.manga}</td>
                  <td>{m.ombro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default GuiaTamanhos;
