import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Sobre.module.css';

export function Sobre() {
  return (
    <main className={styles.container}>
      {/* HERO INSTITUCIONAL */}
      <section className={styles.heroSection}>
        <span className={styles.tag}>NOSSA HISTÓRIA</span>
        <h1 className={styles.title}>FOR THE FEW.</h1>
        <p className={styles.lead}>
          Nascida no frio e no concreto de Curitiba, a THR33 é a fusão entre a estética streetwear underground, a cena musical independente e o design autoral.
        </p>
      </section>

      {/* MANIFESTO / CONCEITO */}
      <section className={styles.gridSection}>
        <div className={styles.imageBox}>
          <img 
            src="https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800&auto=format&fit=crop" 
            alt="Ensaio THR33 nas ruas de Curitiba" 
          />
        </div>
        <div className={styles.textBox}>
          <span className={styles.subTag}>O ORIGIN</span>
          <h2>COMO SURGIU O NOME?</h2>
          <p>
            Criada por um coletivo de jovens adultos curitibanos envolvidos com música, tecnologia e artes visuais, a THR33 representa o número de pilares que sustentam cada peça que produzimos: <strong>Autenticidade</strong>, <strong>Modelagem Exclusiva</strong> e <strong>Espírito Urbano</strong>.
          </p>
          <p>
            Não produzimos para a massa. Nossas camisetas possuem corte <i>Boxy</i> e <i>Oversized</i> de alta gramatura, pensadas para quem vive o estúdio, o palco e as ruas.
          </p>
        </div>
      </section>

      {/* BANNER A RUA COMO NOSSO ATELIÊ */}
      <section className={styles.statementBanner}>
        <h2>"A RUA COMO NOSSO ATELIÊ"</h2>
        <p>Cada drop é limitado. Quando acaba, entra para a história em nossos Drops Passados.</p>
        <Link className={styles.ctaBtn} to="/catalogo">
          EXPLORAR DROP ATUAL
        </Link>
      </section>
    </main>
  );
}

export default Sobre;
