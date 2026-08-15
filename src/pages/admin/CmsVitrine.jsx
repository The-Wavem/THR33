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
  Link as LinkIcon,
  Layers,
  LayoutGrid,
  ArrowRight
} from 'lucide-react';
import { db } from '../../services/firebaseConfig';
import styles from './CmsVitrine.module.css';

// Sugestões de imagens em alta resolução para testes rápidos
const PLACEHOLDER_IMAGES = [
  { label: "Ensaio Urbano PB", url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1600&auto=format&fit=crop" },
  { label: "Look Streetwear", url: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=1600&auto=format&fit=crop" },
  { label: "Ateliê & Frio", url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1600&auto=format&fit=crop" },
  { label: "Modelo Heavy Boxy", url: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?q=80&w=1600&auto=format&fit=crop" },
  { label: "Skatista & Street", url: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=1600&auto=format&fit=crop" }
];

const DEFAULT_BENTO_CONFIG = {
  sectionTag: "ENSAIO DE CAMPANHA",
  sectionTitle: "A RUA COMO NOSSO ATELIÊ",
  cards: [
    {
      id: "bento_1",
      title: "OVERSIZED FIT",
      buttonText: "VER MAIS",
      link: "/catalogo?modelagem=oversized",
      image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop",
      size: "large", // 'large' | 'normal'
      active: true
    },
    {
      id: "bento_2",
      title: "BOXY TEES",
      buttonText: "VER MAIS",
      link: "/catalogo?modelagem=boxy",
      image: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?q=80&w=600&auto=format&fit=crop",
      size: "normal",
      active: true
    },
    {
      id: "bento_3",
      title: "EDITION FOR THE FEW",
      buttonText: "VER MAIS",
      link: "/catalogo?drop=leak-two",
      image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=600&auto=format&fit=crop",
      size: "normal",
      active: true
    }
  ]
};

export function CmsVitrine() {
  const [activeSection, setActiveSection] = useState('hero'); // 'hero' | 'bento'

  // Estados dos Banners Hero
  const [slides, setSlides] = useState([]);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);

  // Estados da Grade Bento
  const [bentoConfig, setBentoConfig] = useState(DEFAULT_BENTO_CONFIG);
  const [selectedBentoIndex, setSelectedBentoIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 1. Carrega os dados do Firestore
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Carrega Banners Hero
        const bannerSnap = await getDoc(doc(db, 'storefront', 'home_banners'));
        if (bannerSnap.exists() && bannerSnap.data().slides?.length > 0) {
          const rawSlides = bannerSnap.data().slides;
          const normalized = rawSlides.map(s => ({
            ...s,
            buttons: Array.isArray(s.buttons) 
              ? s.buttons 
              : [
                  { id: "btn_1", text: s.cta || "VER LANÇAMENTOS", link: s.link || "/catalogo", variant: "primary" }
                ]
          }));
          setSlides(normalized);
        } else {
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

        // Carrega Grade Bento
        const bentoSnap = await getDoc(doc(db, 'storefront', 'home_bento'));
        if (bentoSnap.exists() && bentoSnap.data().cards?.length > 0) {
          setBentoConfig(bentoSnap.data());
        } else {
          setBentoConfig(DEFAULT_BENTO_CONFIG);
        }
      } catch (err) {
        console.warn("Aviso ao buscar vitrine no Firestore:", err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // ----------------------------------------------------
  // MANIPULADORES DOS BANNERS HERO
  // ----------------------------------------------------
  const currentSlide = slides[selectedSlideIndex] || slides[0] || {
    id: "slide_1",
    title: "",
    subtitle: "",
    badge: "",
    bgImage: "",
    active: true,
    buttons: []
  };

  const handleUpdateSlide = (field, value) => {
    setSlides(prev => {
      const copy = [...prev];
      if (!copy[selectedSlideIndex]) return prev;
      copy[selectedSlideIndex] = {
        ...copy[selectedSlideIndex],
        [field]: value
      };
      return copy;
    });
  };

  const handleAddSlide = () => {
    const newSlide = {
      id: `slide_${Date.now()}`,
      title: "NOVO TÍTULO DE IMPACTO",
      subtitle: "SUBTÍTULO DO DROP OU PROMOÇÃO",
      badge: "DESTAQUE",
      bgImage: PLACEHOLDER_IMAGES[slides.length % PLACEHOLDER_IMAGES.length].url,
      active: true,
      buttons: [
        { id: `btn_1_${Date.now()}`, text: "VER COLEÇÃO", link: "/catalogo", variant: "primary" }
      ]
    };
    setSlides(prev => [...prev, newSlide]);
    setSelectedSlideIndex(slides.length);
  };

  const handleDeleteSlide = (indexToDelete) => {
    if (slides.length <= 1) {
      alert("A vitrine precisa ter pelo menos 1 slide ativo.");
      return;
    }
    if (!window.confirm("Deseja realmente remover este slide?")) return;

    setSlides(prev => prev.filter((_, idx) => idx !== indexToDelete));
    setSelectedSlideIndex(0);
  };

  // Botões do Banner Hero
  const handleSetButtonsCount = (count) => {
    const currentBtns = currentSlide.buttons || [];
    let updated = [];
    if (count === 0) {
      updated = [];
    } else if (count === 1) {
      updated = currentBtns.length >= 1 
        ? [currentBtns[0]] 
        : [{ id: `btn_1_${Date.now()}`, text: "VER LANÇAMENTOS", link: "/catalogo", variant: "primary" }];
    } else if (count === 2) {
      if (currentBtns.length === 0) {
        updated = [
          { id: `btn_1_${Date.now()}`, text: "VER LANÇAMENTOS", link: "/catalogo", variant: "primary" },
          { id: `btn_2_${Date.now()}`, text: "CONHEÇA A MARCA", link: "/sobre", variant: "secondary" }
        ];
      } else if (currentBtns.length === 1) {
        updated = [
          currentBtns[0],
          { id: `btn_2_${Date.now()}`, text: "CONHEÇA A MARCA", link: "/sobre", variant: "secondary" }
        ];
      } else {
        updated = currentBtns.slice(0, 2);
      }
    }
    handleUpdateSlide('buttons', updated);
  };

  const handleUpdateButton = (btnIndex, field, value) => {
    const currentBtns = [...(currentSlide.buttons || [])];
    if (!currentBtns[btnIndex]) return;
    currentBtns[btnIndex] = {
      ...currentBtns[btnIndex],
      [field]: value
    };
    handleUpdateSlide('buttons', currentBtns);
  };

  // ----------------------------------------------------
  // MANIPULADORES DA GRADE BENTO
  // ----------------------------------------------------
  const currentBentoCard = bentoConfig.cards?.[selectedBentoIndex] || bentoConfig.cards?.[0] || {
    id: "bento_1",
    title: "",
    buttonText: "VER MAIS",
    link: "/catalogo",
    image: "",
    size: "normal",
    active: true
  };

  const handleUpdateBentoSection = (field, value) => {
    setBentoConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUpdateBentoCard = (field, value) => {
    setBentoConfig(prev => {
      const cards = [...(prev.cards || [])];
      if (!cards[selectedBentoIndex]) return prev;
      cards[selectedBentoIndex] = {
        ...cards[selectedBentoIndex],
        [field]: value
      };
      return { ...prev, cards };
    });
  };

  const handleAddBentoCard = () => {
    const newCard = {
      id: `bento_${Date.now()}`,
      title: "NOVO DESTAQUE BENTO",
      buttonText: "VER MAIS",
      link: "/catalogo",
      image: PLACEHOLDER_IMAGES[bentoConfig.cards.length % PLACEHOLDER_IMAGES.length].url,
      size: "normal",
      active: true
    };
    setBentoConfig(prev => ({
      ...prev,
      cards: [...prev.cards, newCard]
    }));
    setSelectedBentoIndex(bentoConfig.cards.length);
  };

  const handleDeleteBentoCard = (indexToDelete) => {
    if (bentoConfig.cards.length <= 1) {
      alert("A grade Bento precisa ter pelo menos 1 card configurado.");
      return;
    }
    if (!window.confirm("Deseja realmente remover este card da grade Bento?")) return;

    setBentoConfig(prev => ({
      ...prev,
      cards: prev.cards.filter((_, idx) => idx !== indexToDelete)
    }));
    setSelectedBentoIndex(0);
  };

  // ----------------------------------------------------
  // SALVAR NO FIRESTORE
  // ----------------------------------------------------
  const handleSaveAll = async () => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      if (activeSection === 'hero') {
        const docRef = doc(db, 'storefront', 'home_banners');
        await setDoc(docRef, {
          slides,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } else {
        const docRef = doc(db, 'storefront', 'home_bento');
        await setDoc(docRef, {
          ...bentoConfig,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Erro ao salvar vitrine no Firestore:", err);
      alert("Erro ao salvar vitrine no Firestore.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.vitrineContainer}>
      {/* HEADER DA PÁGINA */}
      <header className={styles.header}>
        <div>
          <span className={styles.breadcrumb}>CMS // VITRINE & HOME BUILDER</span>
          <h1 className={styles.title}>GERENCIADOR VISUAL DA HOME</h1>
        </div>

        <div className={styles.headerActions}>
          {activeSection === 'hero' ? (
            <button onClick={handleAddSlide} className={styles.secondaryBtn}>
              <Plus size={14} />
              <span>NOVO SLIDE</span>
            </button>
          ) : (
            <button onClick={handleAddBentoCard} className={styles.secondaryBtn}>
              <Plus size={14} />
              <span>NOVO CARD BENTO</span>
            </button>
          )}

          <button onClick={handleSaveAll} disabled={saving} className={styles.primaryBtn}>
            {saving ? (
              <RotateCw size={14} className={styles.spinning} />
            ) : saveSuccess ? (
              <Check size={14} />
            ) : (
              <Save size={14} />
            )}
            <span>
              {saving ? 'GRAVANDO...' : saveSuccess ? 'SALVO NA NUVEM!' : activeSection === 'hero' ? 'SALVAR BANNERS' : 'SALVAR GRADE BENTO'}
            </span>
          </button>
        </div>
      </header>

      {/* SELETOR DE SUB-ABAS (HERO vs BENTO) */}
      <nav className={styles.sectionNav}>
        <button
          type="button"
          className={`${styles.navTabBtn} ${activeSection === 'hero' ? styles.activeNavTab : ''}`}
          onClick={() => setActiveSection('hero')}
        >
          <SlidersHorizontal size={14} />
          <span>BANNERS HERO (TOPO)</span>
        </button>

        <button
          type="button"
          className={`${styles.navTabBtn} ${activeSection === 'bento' ? styles.activeNavTab : ''}`}
          onClick={() => setActiveSection('bento')}
        >
          <Layers size={14} />
          <span>GRADE BENTO (DESTAQUES & CATEGORIAS)</span>
        </button>
      </nav>

      {/* -------------------------------------------------------------
          SUB-ABA 1: BANNERS HERO
          ------------------------------------------------------------- */}
      {activeSection === 'hero' && (
        <div className={styles.layoutGrid}>
          {/* COLUNA ESQUERDA: EDITOR DO SLIDE */}
          <div className={styles.editorCol}>
            {/* TABS DE SLIDES */}
            <div className={styles.slidesTabs}>
              {slides.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  className={`${styles.tabBtn} ${idx === selectedSlideIndex ? styles.activeTab : ''}`}
                  onClick={() => setSelectedSlideIndex(idx)}
                >
                  <div className={styles.tabContent}>
                    <span className={styles.tabName}>SLIDE {idx + 1}</span>
                    <span className={`${styles.tabStatus} ${s.active ? styles.tabActive : styles.tabInactive}`}>
                      {s.active ? '● Ativo' : '○ Oculto'}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* FORMULÁRIO DO SLIDE SELECIONADO */}
            <div className={styles.formCard}>
              <div className={styles.formHeader}>
                <h3>CONFIGURAÇÕES DO SLIDE {selectedSlideIndex + 1}</h3>
                <div className={styles.slideHeaderActions}>
                  <label className={styles.checkboxLabel}>
                    <input 
                      type="checkbox" 
                      checked={currentSlide.active} 
                      onChange={(e) => handleUpdateSlide('active', e.target.checked)} 
                    />
                    <span>Banner Visível no Site</span>
                  </label>
                  {slides.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => handleDeleteSlide(selectedSlideIndex)}
                      className={styles.deleteSlideBtn}
                      title="Excluir este slide"
                    >
                      <Trash2 size={13} />
                      <span>Excluir</span>
                    </button>
                  )}
                </div>
              </div>

              {/* CAMPOS DO SLIDE */}
              <div className={styles.formBody}>
                <div className={styles.inputGroup}>
                  <label>TAG / BADGE SUPERIOR</label>
                  <input 
                    type="text" 
                    placeholder="Ex: NOVO DROP, COLEÇÃO 2026, FOR THE FEW" 
                    value={currentSlide.badge || ''} 
                    onChange={(e) => handleUpdateSlide('badge', e.target.value)} 
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>TÍTULO PRINCIPAL (MANCHETE) *</label>
                  <input 
                    type="text" 
                    placeholder="Ex: A RUA COMO NOSSO ATELIÊ" 
                    value={currentSlide.title || ''} 
                    onChange={(e) => handleUpdateSlide('title', e.target.value)} 
                    required 
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>SUBTÍTULO / SLOGAN</label>
                  <input 
                    type="text" 
                    placeholder="Ex: LEAK TWO — DROP EXCLUSIVO" 
                    value={currentSlide.subtitle || ''} 
                    onChange={(e) => handleUpdateSlide('subtitle', e.target.value)} 
                  />
                </div>

                {/* BOTÕES DE AÇÃO (CTAS) */}
                <div className={styles.ctasSection}>
                  <div className={styles.ctasHeader}>
                    <div className={styles.ctasTitleGroup}>
                      <MousePointerClick size={14} />
                      <label>BOTÕES DE AÇÃO (CTAS DO BANNER)</label>
                    </div>
                    <div className={styles.ctaCountSelector}>
                      <button
                        type="button"
                        className={`${styles.ctaCountBtn} ${(currentSlide.buttons || []).length === 0 ? styles.activeCtaCount : ''}`}
                        onClick={() => handleSetButtonsCount(0)}
                      >
                        Sem Botões
                      </button>
                      <button
                        type="button"
                        className={`${styles.ctaCountBtn} ${(currentSlide.buttons || []).length === 1 ? styles.activeCtaCount : ''}`}
                        onClick={() => handleSetButtonsCount(1)}
                      >
                        1 Botão
                      </button>
                      <button
                        type="button"
                        className={`${styles.ctaCountBtn} ${(currentSlide.buttons || []).length === 2 ? styles.activeCtaCount : ''}`}
                        onClick={() => handleSetButtonsCount(2)}
                      >
                        2 Botões
                      </button>
                    </div>
                  </div>

                  {(currentSlide.buttons || []).map((btn, bIdx) => (
                    <div key={btn.id || bIdx} className={styles.ctaBox}>
                      <div className={styles.ctaBoxTop}>
                        <span className={styles.ctaBoxLabel}>BOTÃO {bIdx + 1}</span>
                        <div className={styles.variantSelector}>
                          <button
                            type="button"
                            className={`${styles.variantBtn} ${btn.variant === 'primary' ? styles.activeVariant : ''}`}
                            onClick={() => handleUpdateButton(bIdx, 'variant', 'primary')}
                          >
                            Principal (Sólido)
                          </button>
                          <button
                            type="button"
                            className={`${styles.variantBtn} ${btn.variant === 'secondary' ? styles.activeVariant : ''}`}
                            onClick={() => handleUpdateButton(bIdx, 'variant', 'secondary')}
                          >
                            Secundário (Contorno)
                          </button>
                        </div>
                      </div>

                      <div className={styles.gridTwo}>
                        <div className={styles.inputGroup}>
                          <label>TEXTO DO BOTÃO</label>
                          <input 
                            type="text" 
                            placeholder="Ex: VER LANÇAMENTOS" 
                            value={btn.text || ''} 
                            onChange={(e) => handleUpdateButton(bIdx, 'text', e.target.value)} 
                          />
                        </div>
                        <div className={styles.inputGroup}>
                          <label>LINK DE DESTINO</label>
                          <div className={styles.linkFieldWrapper}>
                            <LinkIcon size={12} className={styles.linkIconInside} />
                            <input 
                              type="text" 
                              placeholder="/catalogo, /lancamentos ou link externo" 
                              value={btn.link || ''} 
                              onChange={(e) => handleUpdateButton(bIdx, 'link', e.target.value)} 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* IMAGEM DE FUNDO */}
                <div className={styles.inputGroup}>
                  <label>URL DA IMAGEM DE FUNDO *</label>
                  <input 
                    type="url" 
                    placeholder="https://images.unsplash.com/photo-..." 
                    value={currentSlide.bgImage || ''} 
                    onChange={(e) => handleUpdateSlide('bgImage', e.target.value)} 
                    required 
                  />
                  <div className={styles.presetsBox}>
                    <span>SUGESTÕES EM ALTA RESOLUÇÃO:</span>
                    <div className={styles.presetsList}>
                      {PLACEHOLDER_IMAGES.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={styles.presetBtn}
                          onClick={() => handleUpdateSlide('bgImage', p.url)}
                        >
                          <ImageIcon size={11} />
                          <span>{p.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: PRÉ-VISUALIZAÇÃO AO VIVO HERO */}
          <div className={styles.previewCol}>
            <div className={styles.previewSticky}>
              <div className={styles.previewHeader}>
                <Monitor size={14} />
                <span>PRÉ-VISUALIZAÇÃO AO VIVO (HERO BANNER)</span>
              </div>

              <div className={styles.previewContainer}>
                <div 
                  className={styles.previewSlide} 
                  style={{ backgroundImage: `url(${currentSlide.bgImage})` }}
                >
                  <div className={styles.previewOverlay} />
                  
                  <div className={styles.previewContent}>
                    {currentSlide.badge && (
                      <span className={styles.previewBadge}>
                        <span className={styles.badgeDot} />
                        <span>{currentSlide.badge}</span>
                      </span>
                    )}

                    <h2 className={styles.previewTitle}>
                      {currentSlide.title || 'SEU TÍTULO AQUI'}
                    </h2>

                    {currentSlide.subtitle && (
                      <p className={styles.previewSubtitle}>{currentSlide.subtitle}</p>
                    )}

                    <div className={styles.previewBtnsRow}>
                      {(currentSlide.buttons || []).map((btn, bIdx) => (
                        <span 
                          key={btn.id || bIdx} 
                          className={`${styles.previewCtaBtn} ${btn.variant === 'secondary' ? styles.previewCtaSecondary : styles.previewCtaPrimary}`}
                        >
                          {btn.text || 'BOTÃO'}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <small className={styles.previewNotice}>
                {(currentSlide.buttons || []).length === 0 
                  ? 'Slide sem botões interativos.' 
                  : `Exibindo ${(currentSlide.buttons || []).length} botão(ões) no slide.`}
              </small>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          SUB-ABA 2: GRADE BENTO (DESTAQUES & CATEGORIAS)
          ------------------------------------------------------------- */}
      {activeSection === 'bento' && (
        <div className={styles.layoutGrid}>
          {/* COLUNA ESQUERDA: EDITOR BENTO */}
          <div className={styles.editorCol}>
            {/* CONFIGURAÇÃO GERAL DA SEÇÃO BENTO */}
            <div className={styles.formCard} style={{ marginBottom: '1.5rem' }}>
              <div className={styles.formHeader}>
                <h3>CABEÇALHO DA SEÇÃO BENTO</h3>
              </div>
              <div className={styles.formBody}>
                <div className={styles.gridTwo}>
                  <div className={styles.inputGroup}>
                    <label>TAG / IDENTIFICADOR SUPERIOR</label>
                    <input 
                      type="text" 
                      placeholder="Ex: ENSAIO DE CAMPANHA" 
                      value={bentoConfig.sectionTag || ''} 
                      onChange={(e) => handleUpdateBentoSection('sectionTag', e.target.value)} 
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>TÍTULO PRINCIPAL DA SEÇÃO</label>
                    <input 
                      type="text" 
                      placeholder="Ex: A RUA COMO NOSSO ATELIÊ" 
                      value={bentoConfig.sectionTitle || ''} 
                      onChange={(e) => handleUpdateBentoSection('sectionTitle', e.target.value)} 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* TABS DE CARDS BENTO */}
            <div className={styles.slidesTabs}>
              {(bentoConfig.cards || []).map((c, idx) => (
                <button
                  key={c.id}
                  type="button"
                  className={`${styles.tabBtn} ${idx === selectedBentoIndex ? styles.activeTab : ''}`}
                  onClick={() => setSelectedBentoIndex(idx)}
                >
                  <div className={styles.tabContent}>
                    <span className={styles.tabName}>CARD {idx + 1}</span>
                    <span className={`${styles.tabStatus} ${c.active ? styles.tabActive : styles.tabInactive}`}>
                      {c.active ? '● Ativo' : '○ Oculto'}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* FORMULÁRIO DO CARD BENTO SELECIONADO */}
            <div className={styles.formCard}>
              <div className={styles.formHeader}>
                <h3>CONFIGURAÇÃO DO CARD BENTO {selectedBentoIndex + 1}</h3>
                <div className={styles.slideHeaderActions}>
                  <label className={styles.checkboxLabel}>
                    <input 
                      type="checkbox" 
                      checked={currentBentoCard.active} 
                      onChange={(e) => handleUpdateBentoCard('active', e.target.checked)} 
                    />
                    <span>Card Visível</span>
                  </label>
                  {bentoConfig.cards.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => handleDeleteBentoCard(selectedBentoIndex)}
                      className={styles.deleteSlideBtn}
                      title="Excluir este card"
                    >
                      <Trash2 size={13} />
                      <span>Excluir</span>
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.formBody}>
                <div className={styles.gridTwo}>
                  <div className={styles.inputGroup}>
                    <label>TÍTULO / LEGENDA DO CARD *</label>
                    <input 
                      type="text" 
                      placeholder="Ex: OVERSIZED FIT, BOXY TEES" 
                      value={currentBentoCard.title || ''} 
                      onChange={(e) => handleUpdateBentoCard('title', e.target.value)} 
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label>TEXTO DO BOTÃO</label>
                    <input 
                      type="text" 
                      placeholder="Ex: VER MAIS, EXPLORAR" 
                      value={currentBentoCard.buttonText || ''} 
                      onChange={(e) => handleUpdateBentoCard('buttonText', e.target.value)} 
                    />
                  </div>
                </div>

                <div className={styles.gridTwo}>
                  <div className={styles.inputGroup}>
                    <label>LINK DE REDIRECIONAMENTO</label>
                    <div className={styles.linkFieldWrapper}>
                      <LinkIcon size={12} className={styles.linkIconInside} />
                      <input 
                        type="text" 
                        placeholder="/catalogo?modelagem=oversized" 
                        value={currentBentoCard.link || ''} 
                        onChange={(e) => handleUpdateBentoCard('link', e.target.value)} 
                      />
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label>FORMATO DO BLOCO (TAMANHO)</label>
                    <div className={styles.variantSelector} style={{ marginTop: '0.2rem' }}>
                      <button
                        type="button"
                        className={`${styles.variantBtn} ${currentBentoCard.size === 'large' ? styles.activeVariant : ''}`}
                        onClick={() => handleUpdateBentoCard('size', 'large')}
                      >
                        Destaque (2 Colunas)
                      </button>
                      <button
                        type="button"
                        className={`${styles.variantBtn} ${currentBentoCard.size === 'normal' ? styles.activeVariant : ''}`}
                        onClick={() => handleUpdateBentoCard('size', 'normal')}
                      >
                        Padrão (1 Coluna)
                      </button>
                    </div>
                  </div>
                </div>

                {/* IMAGEM DO CARD */}
                <div className={styles.inputGroup}>
                  <label>URL DA IMAGEM DO CARD *</label>
                  <input 
                    type="url" 
                    placeholder="https://images.unsplash.com/photo-..." 
                    value={currentBentoCard.image || ''} 
                    onChange={(e) => handleUpdateBentoCard('image', e.target.value)} 
                    required 
                  />
                  <div className={styles.presetsBox}>
                    <span>SUGESTÕES EM ALTA RESOLUÇÃO:</span>
                    <div className={styles.presetsList}>
                      {PLACEHOLDER_IMAGES.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={styles.presetBtn}
                          onClick={() => handleUpdateBentoCard('image', p.url)}
                        >
                          <ImageIcon size={11} />
                          <span>{p.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: PRÉ-VISUALIZAÇÃO AO VIVO BENTO */}
          <div className={styles.previewCol}>
            <div className={styles.previewSticky}>
              <div className={styles.previewHeader}>
                <Monitor size={14} />
                <span>PRÉ-VISUALIZAÇÃO AO VIVO (GRADE BENTO)</span>
              </div>

              <div className={styles.bentoPreviewSection}>
                <div className={styles.bentoPreviewHead}>
                  <span className={styles.bentoPreviewTag}>{bentoConfig.sectionTag || 'TAG'}</span>
                  <h3 className={styles.bentoPreviewTitle}>{bentoConfig.sectionTitle || 'TÍTULO'}</h3>
                </div>

                <div className={styles.bentoPreviewGrid}>
                  {bentoConfig.cards.filter(c => c.active).map((c, idx) => (
                    <div 
                      key={c.id || idx} 
                      className={`${styles.bentoPreviewCard} ${c.size === 'large' ? styles.bentoCardLarge : ''}`}
                    >
                      <img src={c.image} alt={c.title} className={styles.bentoPreviewImg} />
                      <div className={styles.bentoPreviewOverlay}>
                        <span className={styles.bentoPreviewCaption}>{c.title}</span>
                        <span className={styles.bentoPreviewBtn}>{c.buttonText || 'VER MAIS'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <small className={styles.previewNotice}>
                {bentoConfig.cards.filter(c => c.active).length} card(s) ativo(s) na grade.
              </small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CmsVitrine;
