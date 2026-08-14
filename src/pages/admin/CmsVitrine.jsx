import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { 
  Plus, 
  Save, 
  Trash2, 
  Image as ImageIcon, 
  Eye, 
  EyeOff, 
  Monitor, 
  Check, 
  RotateCw, 
  Sparkles,
  MousePointerClick,
  SlidersHorizontal,
  Link as LinkIcon
} from 'lucide-react';
import { db } from '../../services/firebaseConfig';
import styles from './CmsVitrine.module.css';

// Sugestões de placeholders com alta resolução para testes rápidos
const PLACEHOLDER_IMAGES = [
  { label: "Ensaio Urbano PB", url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1600&auto=format&fit=crop" },
  { label: "Look Streetwear", url: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=1600&auto=format&fit=crop" },
  { label: "Ateliê & Frio", url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1600&auto=format&fit=crop" },
  { label: "Modelo Heavy Boxy", url: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?q=80&w=1600&auto=format&fit=crop" }
];

export function CmsVitrine() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 1. Carrega os banners salvos no Firestore
  useEffect(() => {
    async function fetchBanners() {
      try {
        const docRef = doc(db, 'storefront', 'home_banners');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().slides?.length > 0) {
          const rawSlides = docSnap.data().slides;
          const normalized = rawSlides.map(s => ({
            ...s,
            buttons: Array.isArray(s.buttons) 
              ? s.buttons 
              : s.cta 
                ? [
                    { id: "btn_1", text: s.cta, link: s.link || "/catalogo", variant: "primary" },
                    { id: "btn_2", text: "CONHEÇA A MARCA", link: "/sobre", variant: "secondary" }
                  ]
                : [
                    { id: "btn_1", text: "VER LANÇAMENTOS", link: "/catalogo", variant: "primary" },
                    { id: "btn_2", text: "CONHEÇA A MARCA", link: "/sobre", variant: "secondary" }
                  ]
          }));
          setSlides(normalized);
        } else {
          // Banners iniciais padrão
          setSlides([
            {
              id: "slide_1",
              title: "A RUA COMO NOSSO ATELIÊ",
              subtitle: "LEAK TWO — DROP EXCLUSIVO",
              badge: "NOVO DROP",
              bgImage: PLACEHOLDER_IMAGES[0].url,
              active: true,
              buttons: [
                { id: "btn_1", text: "VER LANÇAMENTOS", link: "/catalogo", variant: "primary" },
                { id: "btn_2", text: "CONHEÇA A MARCA", link: "/sobre", variant: "secondary" }
              ]
            },
            {
              id: "slide_2",
              title: "FOR THE FEW.",
              subtitle: "STREETWEAR URBANO & CURITIBANO",
              badge: "COLEÇÃO 2026",
              bgImage: PLACEHOLDER_IMAGES[1].url,
              active: true,
              buttons: [
                { id: "btn_1", text: "EXPLORAR CATÁLOGO", link: "/catalogo", variant: "primary" },
                { id: "btn_2", text: "CONHEÇA A MARCA", link: "/sobre", variant: "secondary" }
              ]
            }
          ]);
        }
      } catch (err) {
        console.warn("Aviso ao buscar vitrine no Firestore:", err.message);
        setSlides([
          {
            id: "slide_1",
            title: "A RUA COMO NOSSO ATELIÊ",
            subtitle: "LEAK TWO — DROP EXCLUSIVO",
            badge: "NOVO DROP",
            bgImage: PLACEHOLDER_IMAGES[0].url,
            active: true,
            buttons: [
              { id: "btn_1", text: "VER LANÇAMENTOS", link: "/catalogo", variant: "primary" }
            ]
          }
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchBanners();
  }, []);

  const currentSlide = slides[selectedSlideIndex] || slides[0] || {};
  const currentButtons = Array.isArray(currentSlide.buttons) ? currentSlide.buttons : [];

  // Atualiza campo do slide selecionado
  const handleUpdateCurrentSlide = (field, value) => {
    setSlides(prev => {
      const updated = [...prev];
      updated[selectedSlideIndex] = {
        ...updated[selectedSlideIndex],
        [field]: value
      };
      return updated;
    });
    setSaveSuccess(false);
  };

  // Predefinição rápida de botões (0 botões, 1 botão ou 2 botões)
  const handleSetButtonsPreset = (count) => {
    let newButtons = [];
    if (count === 1) {
      newButtons = [
        { id: `btn_${Date.now()}`, text: "VER LANÇAMENTOS", link: "/catalogo", variant: "primary" }
      ];
    } else if (count === 2) {
      newButtons = [
        { id: `btn_1_${Date.now()}`, text: "VER LANÇAMENTOS", link: "/catalogo", variant: "primary" },
        { id: `btn_2_${Date.now()}`, text: "CONHEÇA A MARCA", link: "/sobre", variant: "secondary" }
      ];
    }
    handleUpdateCurrentSlide('buttons', newButtons);
  };

  // Atualizar campo de um botão específico
  const handleUpdateButton = (btnIndex, field, value) => {
    const updatedButtons = currentButtons.map((btn, idx) => {
      if (idx === btnIndex) {
        return { ...btn, [field]: value };
      }
      return btn;
    });
    handleUpdateCurrentSlide('buttons', updatedButtons);
  };

  // Remover um botão específico
  const handleRemoveButton = (btnIndex) => {
    const updatedButtons = currentButtons.filter((_, idx) => idx !== btnIndex);
    handleUpdateCurrentSlide('buttons', updatedButtons);
  };

  // Adicionar novo banner
  const handleAddNewSlide = () => {
    const newSlide = {
      id: `slide_${Date.now()}`,
      title: "NOVO DROP THR33",
      subtitle: "EDITION FOR THE FEW",
      badge: "EXCLUSIVO",
      bgImage: PLACEHOLDER_IMAGES[2].url,
      active: true,
      buttons: [
        { id: `btn_1_${Date.now()}`, text: "VER PEÇAS", link: "/catalogo", variant: "primary" }
      ]
    };
    const updated = [...slides, newSlide];
    setSlides(updated);
    setSelectedSlideIndex(updated.length - 1);
    setSaveSuccess(false);
  };

  // Excluir banner
  const handleDeleteSlide = (index) => {
    if (slides.length <= 1) {
      alert("A vitrine deve conter ao menos 1 banner.");
      return;
    }
    if (!window.confirm("Deseja realmente excluir este banner da vitrine?")) return;
    const updated = slides.filter((_, idx) => idx !== index);
    setSlides(updated);
    setSelectedSlideIndex(0);
    setSaveSuccess(false);
  };

  // Salvar no Firestore
  const handleSaveStorefront = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await setDoc(doc(db, 'storefront', 'home_banners'), {
        slides,
        updatedAt: new Date().toISOString()
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error("Erro ao salvar vitrine:", err);
      alert("Erro ao gravar banners no Firestore.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <RotateCw size={24} className={styles.spinningIcon} />
        <span>Carregando configuração de vitrine...</span>
      </div>
    );
  }

  return (
    <div className={styles.vitrineContainer}>
      <header className={styles.header}>
        <div>
          <span className={styles.breadcrumb}>CMS / VITRINE & BANNER HERO</span>
          <h1 className={styles.title}>GERENCIADOR DE BANNERS DA HOME</h1>
        </div>
        <div className={styles.headerActions}>
          <button onClick={handleAddNewSlide} className={styles.secondaryBtn}>
            <Plus size={15} />
            <span>NOVO SLIDE</span>
          </button>
          <button onClick={handleSaveStorefront} disabled={saving} className={styles.primaryBtn}>
            {saving ? (
              <>
                <RotateCw size={15} className={styles.spinningIcon} />
                <span>SALVANDO NA NUVEM...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check size={15} />
                <span>VITRINE SALVA!</span>
              </>
            ) : (
              <>
                <Save size={15} />
                <span>SALVAR VITRINE</span>
              </>
            )}
          </button>
        </div>
      </header>

      <div className={styles.layoutGrid}>
        {/* LADO ESQUERDO: LISTA DE SLIDES & FORMULÁRIO DE EDIÇÃO */}
        <div className={styles.editorCol}>
          {/* SELETOR DE SLIDES (TABS) */}
          <div className={styles.slidesTabs}>
            {slides.map((s, idx) => (
              <button
                key={s.id || idx}
                className={`${styles.tabBtn} ${idx === selectedSlideIndex ? styles.activeTab : ''}`}
                onClick={() => setSelectedSlideIndex(idx)}
              >
                <div className={styles.tabTop}>
                  <ImageIcon size={13} className={styles.tabIcon} />
                  <span>SLIDE {idx + 1}</span>
                </div>
                <small className={s.active ? styles.onlineTag : styles.offlineTag}>
                  {s.active ? (
                    <span className={styles.tagFlex}><Eye size={10} /> Ativo</span>
                  ) : (
                    <span className={styles.tagFlex}><EyeOff size={10} /> Oculto</span>
                  )}
                </small>
              </button>
            ))}
          </div>

          {/* FORMULÁRIO DO SLIDE SELECIONADO */}
          <div className={styles.formCard}>
            <div className={styles.cardTop}>
              <h3>CONFIGURAÇÕES DO SLIDE {selectedSlideIndex + 1}</h3>
              <div className={styles.cardTopActions}>
                <label className={styles.switchLabel}>
                  <input 
                    type="checkbox" 
                    checked={currentSlide.active ?? true}
                    onChange={(e) => handleUpdateCurrentSlide('active', e.target.checked)}
                  />
                  <span>Banner Visível no Site</span>
                </label>
                <button onClick={() => handleDeleteSlide(selectedSlideIndex)} className={styles.deleteSlideBtn}>
                  <Trash2 size={13} />
                  <span>Excluir</span>
                </button>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.inputField}>
                <label>TAG / BADGE SUPERIOR</label>
                <input 
                  type="text" 
                  value={currentSlide.badge || ''} 
                  placeholder="Ex: NOVO DROP, LANÇAMENTO, ATELIÊ"
                  onChange={(e) => handleUpdateCurrentSlide('badge', e.target.value)}
                />
              </div>

              <div className={styles.inputField}>
                <label>TÍTULO PRINCIPAL (MANCHETE) *</label>
                <input 
                  type="text" 
                  value={currentSlide.title || ''} 
                  placeholder="Ex: A RUA COMO NOSSO ATELIÊ"
                  onChange={(e) => handleUpdateCurrentSlide('title', e.target.value)}
                  required
                />
              </div>

              <div className={styles.inputField}>
                <label>SUBTÍTULO / SLOGAN</label>
                <input 
                  type="text" 
                  value={currentSlide.subtitle || ''} 
                  placeholder="Ex: LEAK TWO — DROP EXCLUSIVO"
                  onChange={(e) => handleUpdateCurrentSlide('subtitle', e.target.value)}
                />
              </div>

              {/* CONTROLE DINÂMICO DE BOTÕES (CTAs) */}
              <div className={styles.buttonsControlSection}>
                <div className={styles.buttonsControlHeader}>
                  <div className={styles.buttonsHeaderTitle}>
                    <MousePointerClick size={15} className={styles.sectionIcon} />
                    <label>BOTÕES DE AÇÃO (CTAs DO BANNER)</label>
                  </div>
                  <div className={styles.presetButtonsGroup}>
                    <button 
                      type="button"
                      className={`${styles.presetBtn} ${currentButtons.length === 0 ? styles.activePreset : ''}`}
                      onClick={() => handleSetButtonsPreset(0)}
                    >
                      Sem Botões
                    </button>
                    <button 
                      type="button"
                      className={`${styles.presetBtn} ${currentButtons.length === 1 ? styles.activePreset : ''}`}
                      onClick={() => handleSetButtonsPreset(1)}
                    >
                      1 Botão
                    </button>
                    <button 
                      type="button"
                      className={`${styles.presetBtn} ${currentButtons.length === 2 ? styles.activePreset : ''}`}
                      onClick={() => handleSetButtonsPreset(2)}
                    >
                      2 Botões
                    </button>
                  </div>
                </div>

                {/* LISTA DINÂMICA DE BOTÕES */}
                {currentButtons.length === 0 ? (
                  <div className={styles.emptyButtonsNotice}>
                    <SlidersHorizontal size={14} />
                    <span>Este slide está configurado sem botões (foco total na imagem e tipografia).</span>
                  </div>
                ) : (
                  <div className={styles.buttonsList}>
                    {currentButtons.map((btn, btnIdx) => (
                      <div key={btn.id || btnIdx} className={styles.buttonItemCard}>
                        <div className={styles.buttonCardHeader}>
                          <span className={styles.buttonIndexBadge}>BOTÃO {btnIdx + 1}</span>
                          
                          <div className={styles.variantSwitcher}>
                            <button
                              type="button"
                              className={`${styles.variantOption} ${btn.variant === 'primary' || !btn.variant ? styles.activeVariant : ''}`}
                              onClick={() => handleUpdateButton(btnIdx, 'variant', 'primary')}
                            >
                              Principal (Sólido)
                            </button>
                            <button
                              type="button"
                              className={`${styles.variantOption} ${btn.variant === 'secondary' ? styles.activeVariant : ''}`}
                              onClick={() => handleUpdateButton(btnIdx, 'variant', 'secondary')}
                            >
                              Secundário (Contorno)
                            </button>
                          </div>

                          <button 
                            type="button"
                            onClick={() => handleRemoveButton(btnIdx)}
                            className={styles.removeBtn}
                            title="Remover este botão"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <div className={styles.buttonInputsRow}>
                          <div className={styles.buttonInputField}>
                            <label>TEXTO DO BOTÃO</label>
                            <input 
                              type="text"
                              value={btn.text || ''}
                              placeholder="Ex: VER LANÇAMENTOS"
                              onChange={(e) => handleUpdateButton(btnIdx, 'text', e.target.value)}
                            />
                          </div>

                          <div className={styles.buttonInputField}>
                            <label>LINK DE DESTINO</label>
                            <div className={styles.linkInputWrapper}>
                              <LinkIcon size={12} className={styles.linkInputIcon} />
                              <input 
                                type="text"
                                value={btn.link || ''}
                                placeholder="Ex: /catalogo ou /sobre"
                                onChange={(e) => handleUpdateButton(btnIdx, 'link', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* URL DA IMAGEM E PLACEHOLDERS */}
              <div className={styles.inputField}>
                <label>URL DA IMAGEM DE FUNDO *</label>
                <input 
                  type="url" 
                  value={currentSlide.bgImage || ''} 
                  placeholder="https://..."
                  onChange={(e) => handleUpdateCurrentSlide('bgImage', e.target.value)}
                  required
                />
              </div>

              {/* SELETOR DE IMAGENS PLACEHOLDER PARA FACILITAR */}
              <div className={styles.placeholderRow}>
                <div className={styles.placeholderHeader}>
                  <Sparkles size={12} className={styles.sparkleIcon} />
                  <small>Usar imagem conceitual rápida:</small>
                </div>
                <div className={styles.presetChips}>
                  {PLACEHOLDER_IMAGES.map((p, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      className={styles.chipBtn}
                      onClick={() => handleUpdateCurrentSlide('bgImage', p.url)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LADO DIREITO: PRÉ-VISUALIZAÇÃO EM TEMPO REAL */}
        <aside className={styles.previewCol}>
          <div className={styles.previewHeader}>
            <Monitor size={14} className={styles.previewIcon} />
            <span className={styles.previewTag}>PRÉ-VISUALIZAÇÃO AO VIVO (HERO BANNER)</span>
          </div>

          <div className={styles.previewHeroWrapper}>
            <div 
              className={styles.previewBg} 
              style={{ backgroundImage: `url(${currentSlide.bgImage || PLACEHOLDER_IMAGES[0].url})` }}
            >
              <div className={styles.previewOverlay}></div>
            </div>

            <div className={styles.previewContent}>
              {currentSlide.badge && (
                <span className={styles.previewBadge}>
                  <span className={styles.previewBadgeDot}></span>
                  <span>{currentSlide.badge}</span>
                </span>
              )}
              <h2 className={styles.previewTitle}>{currentSlide.title || "TÍTULO DO BANNER"}</h2>
              <p className={styles.previewSubtitle}>{currentSlide.subtitle || "Subtítulo de apoio"}</p>
              
              {currentButtons.length > 0 && (
                <div className={styles.previewButtons}>
                  {currentButtons.map((btn, idx) => (
                    <span 
                      key={btn.id || idx}
                      className={btn.variant === 'secondary' ? styles.previewSecondaryCta : styles.previewPrimaryCta}
                    >
                      {btn.text || `BOTÃO ${idx + 1}`}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <small className={styles.previewHint}>
            {currentButtons.length === 0 
              ? "Modo Minimalista: Banner renderizado sem botões na tela principal."
              : `Exibindo ${currentButtons.length} ${currentButtons.length === 1 ? 'botão interativo' : 'botões interativos'} no slide.`}
          </small>
        </aside>
      </div>
    </div>
  );
}

export default CmsVitrine;
