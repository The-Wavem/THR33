import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { motion, useScroll, useTransform } from 'framer-motion';
import { analyticsService } from '../../services/analyticsService';
import styles from './Sobre.module.css';

import largoDaOrdemBg from '@assets/images/largo-da-ordem-bg.jpeg';
import largoDaOrdemBg2 from '@assets/images/largo-da-ordem-bg2.jpeg';

const STREET_REEL_FRAMES = [
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=1000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop'
];

const FITS = [
  {
    id: 'heavy',
    name: 'Oversized Heavy',
    desc: 'Malha 100% algodão de gramatura pesada (260g/m²). Proporciona caimento reto e estruturado que não marca o corpo, ideal para o clima frio e chuvoso de Curitiba.',
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
  const heroSectionRef = useRef(null);
  const atelierSectionRef = useRef(null);
  const threeContainerRef = useRef(null);

  const [frameIndex, setFrameIndex] = useState(0);
  const [activeFitId, setActiveFitId] = useState('heavy');
  const [is3DLoaded, setIs3DLoaded] = useState(false);
  const [hasInteracted3D, setHasInteracted3D] = useState(false);

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

  // -------------------------------------------------------------------------
  // PARALLAX ENGINE (SCROLL-LINKED CONFORME GUIA MOTION.DEV)
  // -------------------------------------------------------------------------
  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroSectionRef,
    offset: ['start start', 'end start']
  });
  const heroBgParallaxY = useTransform(heroScrollProgress, [0, 1], ['0%', '24%']);

  const { scrollYProgress: atelierScrollProgress } = useScroll({
    target: atelierSectionRef,
    offset: ['start end', 'end start']
  });
  const atelierBgParallaxY = useTransform(atelierScrollProgress, [0, 1], ['-16%', '16%']);
  const atelierReelParallaxY = useTransform(atelierScrollProgress, [0, 1], ['-8%', '8%']);

  // -------------------------------------------------------------------------
  // THREE.JS RENDERER: EMBLEMA 3D OFICIAL (CENTRALIZADO & 100% RESPONSIVO)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const container = threeContainerRef.current;
    if (!container) return;

    const initialW = container.clientWidth || 360;
    const initialH = container.clientHeight || 340;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, initialW / initialH, 0.1, 100);
    camera.position.set(0, 0, 5.2);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      return;
    }

    renderer.setSize(initialW, initialH, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Sistema de Iluminação de Estúdio Noturno
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
    scene.add(ambientLight);

    // Luz frontal-topo (luz de poste de rua destacando o relevo THR33)
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.6);
    keyLight.position.set(3, 4.5, 4);
    scene.add(keyLight);

    // Rim light azulado gelado (frio curitibano refletido nas quinas do metal)
    const rimLight = new THREE.DirectionalLight(0x8cb4e2, 2.8);
    rimLight.position.set(-4, 1.5, -3);
    scene.add(rimLight);

    // Luz de preenchimento inferior (reflexo suave do asfalto molhado)
    const floorLight = new THREE.DirectionalLight(0xffffff, 1.2);
    floorLight.position.set(0, -3.5, 2.5);
    scene.add(floorLight);

    const group = new THREE.Group();
    scene.add(group);

    // Carregamento do modelo oficial da logo THR33 (.glb)
    const loader = new GLTFLoader();

    loader.load(
      '/models/thr33-badge.glb',
      (gltf) => {
        const model = gltf.scene;

        // 1. Orientação em pé de frente para a câmera (+90° no eixo X)
        model.rotation.x = Math.PI / 2;
        model.updateMatrixWorld(true);

        // 2. Material nobre: titânio / prata escovada de alto brilho especular
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.material = new THREE.MeshStandardMaterial({
              color: 0xe5e5e5,
              metalness: 0.90,
              roughness: 0.20,
              envMapIntensity: 1.6
            });
          }
        });

        // 3. ESCALA PRIMEIRO (Garante proporção segura sem quebrar o centro)
        const boxInitial = new THREE.Box3().setFromObject(model);
        const sizeInitial = boxInitial.getSize(new THREE.Vector3());
        const maxDim = Math.max(sizeInitial.x, sizeInitial.y, sizeInitial.z);
        // Escala 2.3 garante margem confortável de 15% nos cantos em qualquer resolução
        const targetScale = 3.35 / (maxDim || 1);
        model.scale.setScalar(targetScale);
        model.updateMatrixWorld(true);

        // 4. AGORA CENTRALIZA NO ESPAÇO ESCALADO EXATO
        const boxScaled = new THREE.Box3().setFromObject(model);
        const centerScaled = boxScaled.getCenter(new THREE.Vector3());
        model.position.x -= centerScaled.x;
        model.position.y -= centerScaled.y;
        model.position.z -= centerScaled.z;
        model.updateMatrixWorld(true);

        group.add(model);
        setIs3DLoaded(true);
      },
      undefined,
      (err) => {
        console.warn('Fallback 3D ativado:', err);
        const fallbackGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.18, 48);
        const fallbackMat = new THREE.MeshStandardMaterial({
          color: 0xcccccc,
          metalness: 0.85,
          roughness: 0.25
        });
        const fallbackMesh = new THREE.Mesh(fallbackGeo, fallbackMat);
        group.add(fallbackMesh);
        setIs3DLoaded(true);
      }
    );

    // Controle interativo unificado para Mouse & Touch Mobile
    let isPointerDown = false;
    let startX = 0;
    let startY = 0;
    let dragRotY = 0;
    let dragRotX = 0.08; // Inclinação sutil de 5° para realce de profundidade
    let autoRotY = 0;

    const onPointerDown = (e) => {
      isPointerDown = true;
      startX = e.clientX;
      startY = e.clientY;
      setHasInteracted3D(true);
    };

    const onPointerMove = (e) => {
      if (!isPointerDown) return;
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      startX = e.clientX;
      startY = e.clientY;

      dragRotY += deltaX * 0.007;
      dragRotX = Math.max(-0.4, Math.min(0.4, dragRotX + deltaY * 0.005));
    };

    const onPointerUp = () => {
      isPointerDown = false;
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // ResizeObserver dinâmico: adapta instantaneamente para celular, tablet e desktop
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 340;
      const h = container.clientHeight || 300;
      if (w <= 0 || h <= 0) return;

      const aspect = w / h;
      camera.aspect = aspect;

      // Em telas estreitas (celular retrato), afasta a câmera sutilmente para nunca cortar as pontas
      if (aspect < 1.1) {
        camera.position.z = 5.2 + (1.1 - aspect) * 1.8;
      } else {
        camera.position.z = 5.2;
      }

      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };

    const ro = new ResizeObserver(handleResize);
    ro.observe(container);
    handleResize();

    let frameId;
    const startTime = performance.now();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const elapsedTime = (performance.now() - startTime) * 0.001;

      // Giro contínuo suave de 360° enquanto não há arraste do usuário
      if (!isPointerDown) {
        autoRotY += 0.0065;
      }

      const targetY = autoRotY + dragRotY;
      const targetX = dragRotX;

      // Inércia amortecida fluida
      group.rotation.y += (targetY - group.rotation.y) * 0.08;
      group.rotation.x += (targetX - group.rotation.x) * 0.08;

      // Leve levitação orgânica no ar
      group.position.y = Math.sin(elapsedTime * 1.6) * 0.05;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      ro.disconnect();
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.dispose();
    };
  }, []);

  const currentFit = FITS.find((f) => f.id === activeFitId) || FITS[0];

  return (
    <div className={styles.pageWrapper}>
      {/* =========================================================================
          1. HERO COM PARALLAX REAL: VIELAS DE PARALELEPÍPEDOS DE CURITIBA (LARGO DA ORDEM)
          ========================================================================= */}
      <section ref={heroSectionRef} className={styles.heroParallaxSection}>
        {/* IMAGEM DE FUNDO COM SCROLL PARALLAX VISÍVEL */}
        <div className={styles.parallaxBgLayer}>
          <motion.img
            src={largoDaOrdemBg}
            alt="Vielas e paralelepípedos de Curitiba à noite"
            className={styles.parallaxBgImage}
            style={{ y: heroBgParallaxY }}
          />
        </div>

        {/* DEGRADÊ ESCURO VIGNETTE PARA MANTER O TEXTO E A LOGO 3D EM TOTAL DESTAQUE */}
        <div className={styles.parallaxOverlayMask} />

        {/* CONTEÚDO EM PRIMEIRO PLANO */}
        <div className={styles.heroContent}>
          <div className={styles.splitSection}>
            <div className={styles.textColumn}>
              <h1 className={styles.title}>THR33 STREETWEAR</h1>
              <p className={styles.bodyText}>
                Nascida no concreto e nas vielas de Curitiba, a THR33 une a música independente, a estética urbana e a modelagem autoral. Desenvolvida para quem valoriza caimento pesado e exclusividade sob o clima e a cultura da rua.
              </p>
            </div>

            <div className={styles.threeWrapper}>
              <div
                ref={threeContainerRef}
                className={styles.threeBox}
                aria-label="Emblema 3D interativo THR33"
              />
              {/* LUZ DE REFLEXO DO CHÃO MOLHADO */}
              <div className={styles.puddleReflection} aria-hidden="true" />

              {!hasInteracted3D && is3DLoaded && (
                <span className={styles.touchHint}>[ ARRASTE PARA GIRAR ]</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. RESTANTE DO CONTEÚDO DA PÁGINA (HISTÓRIA, MODELAGENS, MEDIDAS)
          ========================================================================= */}
      <div className={styles.mainContentContainer}>
        {/* HISTÓRIA: A RUA COMO NOSSO ATELIÊ COM PARALLAX NO REEL */}
        <section ref={atelierSectionRef} className={styles.atelierParallaxSection}>
          <div className={styles.parallaxBgLayer}>
            <motion.img
              src={largoDaOrdemBg2}
              alt="Concreto e arquitetura urbana de Curitiba"
              className={styles.parallaxBgImage}
              style={{ y: atelierBgParallaxY }}
            />
          </div>
          <div className={styles.parallaxOverlayMask} />

          <div className={styles.sectionInnerContent}>
            <div className={styles.splitSection}>
              <div className={styles.motionBox}>
                <motion.img
                  src={STREET_REEL_FRAMES[frameIndex]}
                  alt="Ateliê THR33 Curitiba"
                  className={styles.motionImage}
                  style={{ y: atelierReelParallaxY }}
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
            </div>
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
                    fill="rgba(255, 255, 255, 0.03)"
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
          <div className={styles.measuresHeader}>
            <h2 className={styles.sectionTitle}>TABELA DE MEDIDAS (CM)</h2>
            <span className={styles.tableScrollHint}>[ ← Deslize para ver medidas → ]</span>
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
      </div>
    </div>
  );
}

export default Sobre;
