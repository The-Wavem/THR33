import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { analyticsService } from '../../services/analyticsService';
import styles from './Sobre.module.css';

const STREET_REEL_FRAMES = [
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=1000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop'
];

const FITS = [
  {
    id: 'heavy',
    name: 'Oversized Heavy',
    desc: 'Malha 100% algodão de gramatura pesada (260g/m²). Proporciona caimento reto e estruturado que não marca o corpo.',
    specs: [
      ['Gramatura', '260g/m² Heavy Weight'],
      ['Gola', 'Canelada 2x1 de 3cm reforçada'],
      ['Estampa', 'Silk/DTF em escala máxima até 40x50 cm'],
      ['Acabamento', 'Pesponto duplo ombro a ombro']
    ],
    shape: { shoulder: 108, body: 80, length: 185, sleeve: 56 }
  },
  {
    id: 'classic',
    name: 'Oversized Clássica',
    desc: 'Algodão penteado fio 30.1 encorpado (190g/m²). Toque macio com caimento amplo tradicional para uso diário.',
    specs: [
      ['Gramatura', '190g/m² Algodão Penteado'],
      ['Gola', 'Ribana reforçada de 2.5cm'],
      ['Estampa', 'Impressão ampla 40x50 cm ou peito 15x20 cm'],
      ['Acabamento', 'Costura reforçada com fita interna']
    ],
    shape: { shoulder: 104, body: 76, length: 182, sleeve: 52 }
  },
  {
    id: 'boxy',
    name: 'Boxy Fit',
    desc: 'Modelagem contemporânea mais curta no comprimento com ombros caídos e largura equilibrada.',
    specs: [
      ['Gramatura', '220g/m² Algodão Estruturado'],
      ['Gola', 'Gola canelada de 3cm'],
      ['Estampa', 'Proporção frontal 35x40 cm ou detalhe 15x20 cm'],
      ['Acabamento', 'Barra larga e caimento solto']
    ],
    shape: { shoulder: 112, body: 84, length: 155, sleeve: 60 }
  }
];

export function Sobre() {
  const threeContainerRef = useRef(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [activeFitId, setActiveFitId] = useState('heavy');

  useEffect(() => {
    analyticsService.trackPageView('sobre');
  }, []);

  // Loop visual discreto (estilo GIF P&B urbano)
  useEffect(() => {
    const timer = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % STREET_REEL_FRAMES.length);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  // Elemento 3D Minimalista Monocromático (Black Piano + Wireframe Branco)
  useEffect(() => {
    const container = threeContainerRef.current;
    if (!container) return;

    const width = container.clientWidth || 540;
    const height = container.clientHeight || 440;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.5);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(4, 5, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x888888, 1.2);
    rimLight.position.set(-4, -3, -2);
    scene.add(rimLight);

    const group = new THREE.Group();
    scene.add(group);

    // Sólido Central Preto Fosco Facetado
    const coreGeo = new THREE.IcosahedronGeometry(1.45, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x141414,
      roughness: 0.35,
      metalness: 0.8,
      flatShading: true
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreMesh);

    // Malha Externa Branca Minimalista
    const wireGeo = new THREE.IcosahedronGeometry(1.72, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.22
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    group.add(wireMesh);

    let targetX = 0;
    let targetY = 0;

    const onPointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      targetY = nx * 0.75;
      targetX = ny * 0.5;
    };

    container.addEventListener('pointermove', onPointerMove);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 540;
      const h = container.clientHeight || 440;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      coreMesh.rotation.y += 0.004;
      coreMesh.rotation.x += 0.002;
      wireMesh.rotation.y -= 0.003;

      group.rotation.y += (targetY - group.rotation.y) * 0.06;
      group.rotation.x += (targetX - group.rotation.x) * 0.06;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('pointermove', onPointerMove);
      coreGeo.dispose();
      coreMat.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      renderer.dispose();
    };
  }, []);

  const currentFit = FITS.find((f) => f.id === activeFitId) || FITS[0];

  return (
    <main className={styles.container}>
      {/* 1. HERO: 1 TEXTO + 1 ELEMENTO 3D */}
      <section className={styles.splitSection}>
        <div className={styles.textColumn}>
          <h1 className={styles.title}>THR33 STREETWEAR</h1>
          <p className={styles.bodyText}>
            Nascida no concreto de Curitiba, a THR33 une a música independente, a estética urbana e a modelagem autoral. Desenvolvida para quem valoriza caimento pesado e exclusividade.
          </p>
        </div>

        <div
          ref={threeContainerRef}
          className={styles.threeBox}
          aria-label="Elemento 3D interativo THR33"
        />
      </section>

      {/* 2. HISTÓRIA: 1 VISUAL EM MOVIMENTO + 1 TEXTO */}
      <section className={styles.splitSection}>
        <div className={styles.motionBox}>
          <img
            src={STREET_REEL_FRAMES[frameIndex]}
            alt="Ateliê THR33 Curitiba"
            className={styles.motionImage}
          />
        </div>

        <div className={styles.textColumn}>
          <h2 className={styles.sectionTitle}>A RUA COMO NOSSO ATELIÊ</h2>
          <p className={styles.bodyText}>
            Criada por jovens curitibanos, a THR33 foca na confecção de camisetas estruturadas em malha pesada. Cada estampa é desenvolvida em edições limitadas sem repetição de tiragem.
          </p>
          <p className={styles.bodyText}>
            Trabalhamos sob demanda semanal: as peças são produzidas e estampadas conforme os pedidos chegam, garantindo controle de qualidade unitário em cada costura.
          </p>
        </div>
      </section>

      {/* 3. MODELAGENS: 1 TEXTO SELECIONÁVEL + 1 SILHUETA DO CORTE */}
      <section className={styles.splitSection}>
        <div className={styles.textColumn}>
          <h2 className={styles.sectionTitle}>MODELAGENS &amp; TECIDOS</h2>

          <div className={styles.fitSelectorBar}>
            {FITS.map((fit) => (
              <button
                key={fit.id}
                type="button"
                onClick={() => setActiveFitId(fit.id)}
                className={`${styles.fitTab} ${
                  activeFitId === fit.id ? styles.fitTabActive : ''
                }`}
              >
                {fit.name}
              </button>
            ))}
          </div>

          <p className={styles.bodyText}>{currentFit.desc}</p>

          <ul className={styles.specList}>
            {currentFit.specs.map(([label, val]) => (
              <li key={label}>
                <strong>{label}:</strong> {val}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.silhouetteBox}>
          <svg
            viewBox="0 0 280 240"
            className={styles.silhouetteSvg}
            aria-label={`Molde ${currentFit.name}`}
          >
            {(() => {
              const cx = 140;
              const { shoulder, body, length, sleeve } = currentFit.shape;
              const bottomY = 30 + length;
              const sleeveY = 36 + sleeve;

              const d = `
                M ${cx - 28} 30
                Q ${cx} 42 ${cx + 28} 30
                L ${cx + shoulder} 48
                L ${cx + shoulder - 14} ${sleeveY}
                L ${cx + body} ${sleeveY - 10}
                L ${cx + body} ${bottomY}
                L ${cx - body} ${bottomY}
                L ${cx - body} ${sleeveY - 10}
                L ${cx - shoulder + 14} ${sleeveY}
                L ${cx - shoulder} 48
                Z
              `;

              return (
                <path
                  d={d}
                  fill="rgba(255, 255, 255, 0.04)"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              );
            })()}
          </svg>
        </div>
      </section>

      {/* 4. TABELA DE MEDIDAS LIMPA */}
      <section className={styles.measuresBlock}>
        <h2 className={styles.sectionTitle}>TABELA DE MEDIDAS (CM)</h2>

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
                <td rowSpan={5}><strong>Oversized Heavy &amp; Clássica</strong></td>
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

      {/* 5. RODAPÉ DE AÇÃO DIRETO */}
      <section className={styles.footerBanner}>
        <div className={styles.textColumn}>
          <h2 className={styles.sectionTitle}>COMPROMISSO COM A QUALIDADE</h2>
          <p className={styles.bodyText}>
            Prazos de confecção sob demanda e peças disponíveis no catálogo.
          </p>
        </div>

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
