import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { analyticsService } from '../../services/analyticsService';
import styles from './Sobre.module.css';

export function Sobre() {
  useEffect(() => {
    analyticsService.trackPageView('sobre');
  }, []);

  return (
    <main className={styles.container}>
      {/* HERO INSTITUCIONAL */}
      <section className={styles.heroSection}>
        <span className={styles.tag}>MANIFESTO & ATELIÊ</span>
        <h1 className={styles.title}>THR33 STREETWEAR</h1>
        <p className={styles.lead}>
          Nascida no concreto de Curitiba, a THR33 une a música independente, a estética urbana e a modelagem autoral. Desenvolvida para quem valoriza caimento pesado e exclusividade.
        </p>
      </section>

      {/* BLOCO DE HISTÓRIA */}
      <section className={styles.gridSection}>
        <div className={styles.imageBox}>
          <img 
            src="https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800&auto=format&fit=crop" 
            alt="Ateliê THR33 Curitiba" 
          />
        </div>
        <div className={styles.textBox}>
          <span className={styles.subTag}>PRODUÇÃO AUTORAL</span>
          <h2>A RUA COMO NOSSO ATELIÊ</h2>
          <p>
            Criada por jovens curitibanos, a THR33 foca na confecção de camisetas estruturadas em malha pesada. Cada estampa é desenvolvida em edições limitadas sem repetição de tiragem.
          </p>
          <p>
            Trabalhamos sob demanda semanal: as peças são produzidas e estampadas conforme os pedidos chegam, garantindo controle de qualidade unitário em cada costura.
          </p>
        </div>
      </section>

      {/* ESPECIFICAÇÕES DE TECIDOS E MODELAGENS */}
      <section className={styles.specsSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.subTag}>MATERIAIS & CORTE</span>
          <h2>MODELAGENS & ESPECIFICAÇÕES DE TECIDO</h2>
          <p>Conheça os três cortes oficiais presentes na grade da THR33.</p>
        </div>

        <div className={styles.specsGrid}>
          {/* OVERSIZED HEAVY */}
          <div className={styles.specCard}>
            <div className={styles.specHeader}>
              <span className={styles.specBadge}>PREMIUM HEAVY</span>
              <h3>OVERSIZED HEAVY</h3>
            </div>
            <p className={styles.specDesc}>
              Malha 100% algodão de gramatura pesada (260g/m²). Proporciona caimento reto e estruturado que não marca o corpo.
            </p>
            <ul className={styles.specDetails}>
              <li><strong>Gramatura:</strong> 260g/m² Heavy Weight</li>
              <li><strong>Gola:</strong> Canelada 2x1 de 3cm reforçada</li>
              <li><strong>Estampa:</strong> Silk/DTF em escala máxima até 40x50 cm</li>
              <li><strong>Acabamento:</strong> Pesponto duplo ombro a ombro</li>
            </ul>
          </div>

          {/* OVERSIZED CLÁSSICA */}
          <div className={styles.specCard}>
            <div className={styles.specHeader}>
              <span className={styles.specBadge}>STREETWEAR</span>
              <h3>OVERSIZED CLÁSSICA</h3>
            </div>
            <p className={styles.specDesc}>
              Algodão penteado fio 30.1 encorpado (190g/m²). Toque macio com caimento amplo tradicional para uso diário.
            </p>
            <ul className={styles.specDetails}>
              <li><strong>Gramatura:</strong> 190g/m² Algodão Penteado</li>
              <li><strong>Gola:</strong> Ribana reforçada de 2.5cm</li>
              <li><strong>Estampa:</strong> Impressão ampla 40x50 cm ou peito 15x20 cm</li>
              <li><strong>Acabamento:</strong> Costura reforçada com fita interna</li>
            </ul>
          </div>

          {/* BOXY FIT */}
          <div className={styles.specCard}>
            <div className={styles.specHeader}>
              <span className={styles.specBadge}>CORTE QUADRADO</span>
              <h3>BOXY FIT</h3>
            </div>
            <p className={styles.specDesc}>
              Modelagem contemporânea mais curta no comprimento com ombros caídos e largura equilibrada.
            </p>
            <ul className={styles.specDetails}>
              <li><strong>Gramatura:</strong> 220g/m² Algodão Estruturado</li>
              <li><strong>Gola:</strong> Gola canelada de 3cm</li>
              <li><strong>Estampa:</strong> Proporção frontal 35x40 cm ou detalhe 15x20 cm</li>
              <li><strong>Acabamento:</strong> Barra larga e caimento solto</li>
            </ul>
          </div>
        </div>
      </section>

      {/* TABELA DE MEDIDAS OFICIAL */}
      <section className={styles.measuresSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.subTag}>GUIA EXATO</span>
          <h2>TABELA DE MEDIDAS (CENTÍMETROS)</h2>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>MODELAGEM</th>
                <th>TAMANHO</th>
                <th>TÓRAX (LARGURA)</th>
                <th>COMPRIMENTO</th>
                <th>MANGA</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td rowSpan={5}><strong>Oversized Heavy & Clássica</strong></td>
                <td>PP</td>
                <td>54 cm</td>
                <td>72 cm</td>
                <td>23 cm</td>
              </tr>
              <tr>
                <td>P</td>
                <td>57 cm</td>
                <td>74 cm</td>
                <td>24 cm</td>
              </tr>
              <tr>
                <td>M</td>
                <td>60 cm</td>
                <td>76 cm</td>
                <td>25 cm</td>
              </tr>
              <tr>
                <td>G</td>
                <td>63 cm</td>
                <td>78 cm</td>
                <td>26 cm</td>
              </tr>
              <tr>
                <td>GG</td>
                <td>66 cm</td>
                <td>80 cm</td>
                <td>27 cm</td>
              </tr>
              <tr className={styles.dividerRow}><td colSpan={5}></td></tr>
              <tr>
                <td rowSpan={5}><strong>Boxy Fit</strong></td>
                <td>PP</td>
                <td>56 cm</td>
                <td>66 cm</td>
                <td>22 cm</td>
              </tr>
              <tr>
                <td>P</td>
                <td>58 cm</td>
                <td>68 cm</td>
                <td>23 cm</td>
              </tr>
              <tr>
                <td>M</td>
                <td>61 cm</td>
                <td>70 cm</td>
                <td>24 cm</td>
              </tr>
              <tr>
                <td>G</td>
                <td>64 cm</td>
                <td>72 cm</td>
                <td>25 cm</td>
              </tr>
              <tr>
                <td>GG</td>
                <td>67 cm</td>
                <td>74 cm</td>
                <td>26 cm</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* BANNER FINAL */}
      <section className={styles.statementBanner}>
        <h2>COMPROMISSO COM A QUALIDADE</h2>
        <p>Saiba todos os detalhes sobre prazos de confecção e logística sob demanda.</p>
        <div className={styles.bannerActions}>
          <Link className={styles.ctaBtn} to="/como-funciona-a-entrega">
            COMO FUNCIONA A ENTREGA
          </Link>
          <Link className={styles.secondaryBtn} to="/catalogo">
            EXPLORAR PEÇAS
          </Link>
        </div>
      </section>
    </main>
  );
}

export default Sobre;
