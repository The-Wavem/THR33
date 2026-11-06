import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Save, 
  Trash2, 
  Image as ImageIcon, 
  Eye, 
  EyeOff, 
  Monitor, 
  Smartphone,
  Check, 
  RotateCw, 
  MousePointerClick, 
  SlidersHorizontal, 
  Link as LinkIcon, 
  Layers, 
  ArrowRight,
  Upload,
  X,
  ExternalLink,
  ShoppingBag,
  Star,
  Info,
  LayoutGrid
} from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../services/firebaseConfig';
import { getVitrineSettings, saveVitrineSettings, getFeaturedProducts } from '../../services/catalogService';
import styles from './CmsVitrine.module.css';

// Configuração padrão limpa para inicialização da Grade Bento (sem textos fantasmas)
const DEFAULT_BENTO_CONFIG = {
  sectionTag: "",
  sectionTitle: "",
  cards: [
    {
      id: "bento_1",
      title: "",
      buttonText: "",
      link: "/catalogo",
      image: "",
      size: "large",
      active: true
    }
  ]
};

// Atalhos rápidos sugeridos para botões de CTA e cards
const QUICK_LINKS = [
  { label: "Catálogo", url: "/catalogo" },
  { label: "Destaques", url: "/catalogo" },
  { label: "Oversized", url: "/catalogo?modelagem=oversized" },
  { label: "Boxy", url: "/catalogo?modelagem=boxy" },
  { label: "Sobre", url: "/sobre" }
];

export function CmsVitrine() {
  // Seção ativa: 'hero' | 'bento' | 'featured'
  const [activeSection, setActiveSection] = useState('hero');

  // Dispositivo de pré-visualização: 'desktop' | 'mobile'
  const [previewDevice, setPreviewDevice] = useState('desktop');

  // Estados dos Banners Hero
  const [slides, setSlides] = useState([]);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [showHeroUrlInput, setShowHeroUrlInput] = useState(false);
  const [isUploadingHero, setIsUploadingHero] = useState(false);
  const [heroUploadProgress, setHeroUploadProgress] = useState(0);

  // Estados da Imagem Mobile do Banner Hero
  const [showHeroMobileUrlInput, setShowHeroMobileUrlInput] = useState(false);
  const [isUploadingHeroMobile, setIsUploadingHeroMobile] = useState(false);
  const [heroMobileUploadProgress, setHeroMobileUploadProgress] = useState(0);

  // Estados da Grade Bento
  const [bentoConfig, setBentoConfig] = useState(DEFAULT_BENTO_CONFIG);
  const [selectedBentoIndex, setSelectedBentoIndex] = useState(0);
  const [showBentoUrlInput, setShowBentoUrlInput] = useState(false);
  const [isUploadingBento, setIsUploadingBento] = useState(false);
  const [bentoUploadProgress, setBentoUploadProgress] = useState(0);

  // Produtos em destaque (Seção 3 da Home)
  const [featuredProductsList, setFeaturedProductsList] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(false);

  // Estados de persistência
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const heroFileInputRef = useRef(null);
  const heroMobileFileInputRef = useRef(null);
  const bentoFileInputRef = useRef(null);

  // 1. Carrega dados do Firestore (sem injetar textos mockados quando campos estão vazios)
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const settings = await getVitrineSettings();
        if (settings) {
          if (settings.hero?.slides?.length > 0) {
            const rawSlides = settings.hero.slides;
            const normalized = rawSlides.map((s) => ({
              ...s,
              title: s.title ?? "",
              subtitle: s.subtitle ?? "",
              badge: s.badge ?? "",
              bgImage: s.bgImage || s.mediaUrl || "",
              mobileBgImage: s.mobileBgImage || "",
              buttons: Array.isArray(s.buttons) ? s.buttons : []
            }));
            setSlides(normalized);
          } else {
            setSlides([
              {
                id: "slide_1",
                title: "",
                subtitle: "",
                badge: "",
                bgImage: "",
                mobileBgImage: "",
                active: true,
                buttons: []
              }
            ]);
          }

          if (settings.bentoGrid?.length > 0) {
            setBentoConfig({
              sectionTag: settings.sectionTag ?? "",
              sectionTitle: settings.sectionTitle ?? "",
              cards: settings.bentoGrid
            });
          } else {
            setBentoConfig({
              sectionTag: settings.sectionTag ?? "",
              sectionTitle: settings.sectionTitle ?? "",
              cards: DEFAULT_BENTO_CONFIG.cards
            });
          }
        } else {
          setSlides([
            {
              id: "slide_1",
              title: "",
              subtitle: "",
              badge: "",
              bgImage: "",
              mobileBgImage: "",
              active: true,
              buttons: []
            }
          ]);
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

  // 2. Carrega produtos em destaque para a aba informativa
  useEffect(() => {
    async function loadFeatured() {
      setLoadingFeatured(true);
      try {
        const list = await getFeaturedProducts(12);
        setFeaturedProductsList(list || []);
      } catch (err) {
        console.warn("Aviso ao buscar destaques:", err);
      } finally {
        setLoadingFeatured(false);
      }
    }
    if (activeSection === 'featured') {
      loadFeatured();
    }
  }, [activeSection]);

  // Utilitário de compressão em Canvas (Fallback Resiliente)
  const compressImageFile = (file, maxWidth = 1920, maxHeight = 1920, quality = 0.85) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/webp', quality) || canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  // ----------------------------------------------------
  // MANIPULADORES DE BANNERS HERO
  // ----------------------------------------------------
  const currentSlide = slides[selectedSlideIndex] || slides[0] || {
    id: "slide_1",
    title: "",
    subtitle: "",
    badge: "",
    bgImage: "",
    mobileBgImage: "",
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
      title: "",
      subtitle: "",
      badge: "",
      bgImage: "",
      mobileBgImage: "",
      active: true,
      buttons: []
    };
    setSlides(prev => [...prev, newSlide]);
    setSelectedSlideIndex(slides.length);
  };

  const handleDeleteSlide = (indexToDelete) => {
    if (slides.length <= 1) {
      alert("A vitrine precisa ter pelo menos 1 slide cadastrado. Caso queira ocultá-lo na loja, desmarque 'Banner Visível na Loja'.");
      return;
    }
    if (!window.confirm("Deseja realmente remover este slide?")) return;

    setSlides(prev => prev.filter((_, idx) => idx !== indexToDelete));
    setSelectedSlideIndex(0);
  };

  // Upload direto do Banner Hero DESKTOP para o Firebase Storage
  const handleUploadHeroImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingHero(true);
    setHeroUploadProgress(10);

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileRef = ref(storage, `vitrine/hero/${Date.now()}_${safeName}`);

    try {
      const uploadTask = uploadBytesResumable(fileRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setHeroUploadProgress(Math.max(10, progress));
        },
        async (error) => {
          console.warn("Upload Storage oscilou, acionando fallback local otimizado:", error);
          const fallbackUrl = await compressImageFile(file);
          if (fallbackUrl) {
            handleUpdateSlide('bgImage', fallbackUrl);
          }
          setIsUploadingHero(false);
          setHeroUploadProgress(0);
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          handleUpdateSlide('bgImage', downloadUrl);
          setIsUploadingHero(false);
          setHeroUploadProgress(0);
        }
      );
    } catch (err) {
      console.warn("Erro no disparo do upload:", err);
      const fallbackUrl = await compressImageFile(file);
      if (fallbackUrl) {
        handleUpdateSlide('bgImage', fallbackUrl);
      }
      setIsUploadingHero(false);
      setHeroUploadProgress(0);
    }

    e.target.value = '';
  };

  // Upload direto do Banner Hero MOBILE para o Firebase Storage
  const handleUploadHeroMobileImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingHeroMobile(true);
    setHeroMobileUploadProgress(10);

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileRef = ref(storage, `vitrine/hero_mobile/${Date.now()}_${safeName}`);

    try {
      const uploadTask = uploadBytesResumable(fileRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setHeroMobileUploadProgress(Math.max(10, progress));
        },
        async (error) => {
          console.warn("Upload Storage Mobile oscilou, acionando fallback local otimizado:", error);
          const fallbackUrl = await compressImageFile(file, 1080, 1920);
          if (fallbackUrl) {
            handleUpdateSlide('mobileBgImage', fallbackUrl);
          }
          setIsUploadingHeroMobile(false);
          setHeroMobileUploadProgress(0);
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          handleUpdateSlide('mobileBgImage', downloadUrl);
          setIsUploadingHeroMobile(false);
          setHeroMobileUploadProgress(0);
        }
      );
    } catch (err) {
      console.warn("Erro no disparo do upload mobile:", err);
      const fallbackUrl = await compressImageFile(file, 1080, 1920);
      if (fallbackUrl) {
        handleUpdateSlide('mobileBgImage', fallbackUrl);
      }
      setIsUploadingHeroMobile(false);
      setHeroMobileUploadProgress(0);
    }

    e.target.value = '';
  };

  // Botões de Ação Hero (CTAs)
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
      title: "",
      buttonText: "",
      link: "/catalogo",
      image: "",
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

  // Upload direto da Imagem do Card Bento para o Firebase Storage
  const handleUploadBentoImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBento(true);
    setBentoUploadProgress(10);

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileRef = ref(storage, `vitrine/bento/${Date.now()}_${safeName}`);

    try {
      const uploadTask = uploadBytesResumable(fileRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setBentoUploadProgress(Math.max(10, progress));
        },
        async (error) => {
          console.warn("Upload Storage oscilou, acionando fallback local otimizado:", error);
          const fallbackUrl = await compressImageFile(file, 1200, 1200);
          if (fallbackUrl) {
            handleUpdateBentoCard('image', fallbackUrl);
          }
          setIsUploadingBento(false);
          setBentoUploadProgress(0);
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          handleUpdateBentoCard('image', downloadUrl);
          setIsUploadingBento(false);
          setBentoUploadProgress(0);
        }
      );
    } catch (err) {
      console.warn("Erro no upload do card bento:", err);
      const fallbackUrl = await compressImageFile(file, 1200, 1200);
      if (fallbackUrl) {
        handleUpdateBentoCard('image', fallbackUrl);
      }
      setIsUploadingBento(false);
      setBentoUploadProgress(0);
    }

    e.target.value = '';
  };

  // ----------------------------------------------------
  // SALVAR NO FIRESTORE
  // ----------------------------------------------------
  const handleSaveAll = async () => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      await saveVitrineSettings({
        hero: {
          slides
        },
        bentoGrid: bentoConfig.cards || [],
        sectionTag: bentoConfig.sectionTag ?? "",
        sectionTitle: bentoConfig.sectionTitle ?? ""
      });

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
          <a 
            href="/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className={styles.secondaryBtn}
            title="Abrir a Home da loja em nova aba"
          >
            <ExternalLink size={14} />
            <span>VER LOJA AO VIVO</span>
          </a>

          {activeSection === 'hero' && (
            <button onClick={handleAddSlide} className={styles.secondaryBtn}>
              <Plus size={14} />
              <span>NOVO SLIDE</span>
            </button>
          )}

          {activeSection === 'bento' && (
            <button onClick={handleAddBentoCard} className={styles.secondaryBtn}>
              <Plus size={14} />
              <span>NOVO CARD BENTO</span>
            </button>
          )}

          {activeSection !== 'featured' && (
            <button onClick={handleSaveAll} disabled={saving} className={styles.primaryBtn}>
              {saving ? (
                <RotateCw size={14} className={styles.spinning} />
              ) : saveSuccess ? (
                <Check size={14} />
              ) : (
                <Save size={14} />
              )}
              <span>
                {saving ? 'SALVANDO...' : saveSuccess ? 'SALVO NA NUVEM!' : activeSection === 'hero' ? 'SALVAR BANNERS' : 'SALVAR GRADE BENTO'}
              </span>
            </button>
          )}
        </div>
      </header>

      {/* SELETOR DE SUB-ABAS */}
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

        <button
          type="button"
          className={`${styles.navTabBtn} ${activeSection === 'featured' ? styles.activeNavTab : ''}`}
          onClick={() => setActiveSection('featured')}
        >
          <Star size={14} />
          <span>PRODUTOS EM DESTAQUE (MAIS VENDIDOS)</span>
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
                    <span>Banner Visível na Loja</span>
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

              <div className={styles.formBody}>
                {/* BLOCO 1A: FOTO DE FUNDO DESKTOP (WIDESCREEN) */}
                <div className={styles.sectionBlock}>
                  <div className={styles.blockTitleRow}>
                    <div className={styles.blockTitle}>
                      <Monitor size={14} />
                      <span>1. IMAGEM DO BANNER — DESKTOP (COMPUTADOR / TELAS LARGAS)</span>
                    </div>
                    <span className={styles.specBadge}>
                      IDEAL: 1440 × 730 px (Proporção ~2:1 Horizontal)
                    </span>
                  </div>

                  <div className={styles.uploadZone}>
                    {currentSlide.bgImage ? (
                      <div className={styles.currentImageCard}>
                        <img 
                          src={currentSlide.bgImage} 
                          alt="Banner Desktop atual" 
                          className={styles.currentImageThumb} 
                        />
                        <div className={styles.currentImageDetails}>
                          <div className={styles.currentImageInfo}>
                            <span className={styles.imageStatusBadge}>
                              <Check size={11} /> ARTE DESKTOP CARREGADA (1440×730)
                            </span>
                            <span className={styles.imageUrlTruncated}>
                              {currentSlide.bgImage}
                            </span>
                          </div>

                          <div className={styles.imageActionsRow}>
                            <button
                              type="button"
                              className={styles.actionSmallBtn}
                              onClick={() => heroFileInputRef.current?.click()}
                              disabled={isUploadingHero}
                            >
                              <Upload size={12} />
                              <span>Trocar Imagem Desktop</span>
                            </button>

                            <button
                              type="button"
                              className={styles.actionSmallBtn}
                              onClick={() => setShowHeroUrlInput(!showHeroUrlInput)}
                            >
                              <LinkIcon size={12} />
                              <span>{showHeroUrlInput ? 'Ocultar Link' : 'Editar URL Externa'}</span>
                            </button>

                            <button
                              type="button"
                              className={styles.removeSmallBtn}
                              onClick={() => handleUpdateSlide('bgImage', '')}
                            >
                              <Trash2 size={12} />
                              <span>Remover</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className={styles.dropzone}
                        onClick={() => heroFileInputRef.current?.click()}
                      >
                        <div className={styles.dropzoneIconWrapper}>
                          <Monitor size={20} />
                        </div>
                        <div className={styles.dropzoneMainText}>
                          {isUploadingHero ? 'Enviando arte Desktop ao Firebase Storage...' : 'Clique para selecionar a arte DESKTOP (Horizontal)'}
                        </div>
                        <div className={styles.dropzoneSubText}>
                          Tamanho recomendado: <strong>1440 × 730 px</strong> ou <strong>1920 × 970 px</strong> (Proporção ~2:1 Widescreen) // JPG, PNG ou WebP
                        </div>
                      </div>
                    )}

                    {/* Input de arquivo invisível Desktop */}
                    <input 
                      ref={heroFileInputRef}
                      type="file" 
                      accept="image/*" 
                      className={styles.hiddenFileInput}
                      style={{ display: 'none' }}
                      onChange={handleUploadHeroImage}
                    />

                    {/* Barra de progresso de upload Desktop */}
                    {isUploadingHero && (
                      <div className={styles.progressBarContainer}>
                        <div className={styles.progressBarTrack}>
                          <div 
                            className={styles.progressBarFill} 
                            style={{ width: `${heroUploadProgress}%` }}
                          />
                        </div>
                        <div className={styles.progressLabel}>
                          <span>Enviando arte Desktop...</span>
                          <span>{heroUploadProgress}%</span>
                        </div>
                      </div>
                    )}

                    {/* Modo alternativo de URL externa Desktop */}
                    {showHeroUrlInput && (
                      <div className={styles.urlToggleBox}>
                        <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                          URL DIRETA DA IMAGEM DESKTOP
                        </label>
                        <input 
                          type="url" 
                          placeholder="https://..." 
                          value={currentSlide.bgImage || ''} 
                          onChange={(e) => handleUpdateSlide('bgImage', e.target.value)} 
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* BLOCO 1B: FOTO DE FUNDO MOBILE (VERTICAL / SMARTPHONES) */}
                <div className={styles.sectionBlock}>
                  <div className={styles.blockTitleRow}>
                    <div className={styles.blockTitle}>
                      <Smartphone size={14} />
                      <span>2. IMAGEM DO BANNER — MOBILE (CELULARES / VERTICAL)</span>
                    </div>
                    <span className={styles.specBadge}>
                      IDEAL: 1080 × 1350 px (Proporção 4:5 Vertical)
                    </span>
                  </div>

                  <p className={styles.helperNote}>
                    Envie uma versão vertical pensada para a tela do celular. Assim a arte nunca será cortada nas laterais e manterá 100% das informações legíveis no mobile.
                  </p>

                  <div className={styles.uploadZone}>
                    {currentSlide.mobileBgImage ? (
                      <div className={styles.currentImageCard}>
                        <img 
                          src={currentSlide.mobileBgImage} 
                          alt="Banner Mobile atual" 
                          className={styles.currentImageThumbMobile} 
                        />
                        <div className={styles.currentImageDetails}>
                          <div className={styles.currentImageInfo}>
                            <span className={styles.imageStatusBadge}>
                              <Check size={11} /> ARTE MOBILE CARREGADA (1080×1350)
                            </span>
                            <span className={styles.imageUrlTruncated}>
                              {currentSlide.mobileBgImage}
                            </span>
                          </div>

                          <div className={styles.imageActionsRow}>
                            <button
                              type="button"
                              className={styles.actionSmallBtn}
                              onClick={() => heroMobileFileInputRef.current?.click()}
                              disabled={isUploadingHeroMobile}
                            >
                              <Upload size={12} />
                              <span>Trocar Imagem Mobile</span>
                            </button>

                            <button
                              type="button"
                              className={styles.actionSmallBtn}
                              onClick={() => setShowHeroMobileUrlInput(!showHeroMobileUrlInput)}
                            >
                              <LinkIcon size={12} />
                              <span>{showHeroMobileUrlInput ? 'Ocultar Link' : 'Editar URL Externa'}</span>
                            </button>

                            <button
                              type="button"
                              className={styles.removeSmallBtn}
                              onClick={() => handleUpdateSlide('mobileBgImage', '')}
                            >
                              <Trash2 size={12} />
                              <span>Remover</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className={styles.dropzone}
                        onClick={() => heroMobileFileInputRef.current?.click()}
                      >
                        <div className={styles.dropzoneIconWrapper}>
                          <Smartphone size={20} />
                        </div>
                        <div className={styles.dropzoneMainText}>
                          {isUploadingHeroMobile ? 'Enviando arte Mobile ao Firebase Storage...' : 'Clique para selecionar a arte MOBILE (Vertical)'}
                        </div>
                        <div className={styles.dropzoneSubText}>
                          Tamanho recomendado: <strong>1080 × 1350 px (Proporção 4:5 Retrato)</strong> // Evita cortes em telas de celular
                        </div>
                      </div>
                    )}

                    {/* Input de arquivo invisível Mobile */}
                    <input 
                      ref={heroMobileFileInputRef}
                      type="file" 
                      accept="image/*" 
                      className={styles.hiddenFileInput}
                      style={{ display: 'none' }}
                      onChange={handleUploadHeroMobileImage}
                    />

                    {/* Barra de progresso de upload Mobile */}
                    {isUploadingHeroMobile && (
                      <div className={styles.progressBarContainer}>
                        <div className={styles.progressBarTrack}>
                          <div 
                            className={styles.progressBarFill} 
                            style={{ width: `${heroMobileUploadProgress}%` }}
                          />
                        </div>
                        <div className={styles.progressLabel}>
                          <span>Enviando arte Mobile...</span>
                          <span>{heroMobileUploadProgress}%</span>
                        </div>
                      </div>
                    )}

                    {/* Modo alternativo de URL externa Mobile */}
                    {showHeroMobileUrlInput && (
                      <div className={styles.urlToggleBox}>
                        <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                          URL DIRETA DA IMAGEM MOBILE
                        </label>
                        <input 
                          type="url" 
                          placeholder="https://..." 
                          value={currentSlide.mobileBgImage || ''} 
                          onChange={(e) => handleUpdateSlide('mobileBgImage', e.target.value)} 
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* BLOCO 2: MENSAGENS E TEXTOS (100% OPCIONAIS) */}
                <div className={styles.sectionBlock}>
                  <div className={styles.blockTitleRow}>
                    <div className={styles.blockTitle}>
                      <SlidersHorizontal size={14} />
                      <span>TEXTOS SOBREPOSTOS NO BANNER</span>
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <div className={styles.inputLabelRow}>
                      <label>TAG / BADGE SUPERIOR (OPCIONAL)</label>
                    </div>
                    <input 
                      type="text" 
                      placeholder="Deixe em branco para ocultar (Ex: NOVO DROP)" 
                      value={currentSlide.badge || ''} 
                      onChange={(e) => handleUpdateSlide('badge', e.target.value)} 
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <div className={styles.inputLabelRow}>
                      <label>TÍTULO PRINCIPAL / MANCHETE (OPCIONAL)</label>
                    </div>
                    <input 
                      type="text" 
                      placeholder="Deixe em branco se a arte já possuir título próprio" 
                      value={currentSlide.title || ''} 
                      onChange={(e) => handleUpdateSlide('title', e.target.value)} 
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <div className={styles.inputLabelRow}>
                      <label>SUBTÍTULO / SLOGAN (OPCIONAL)</label>
                    </div>
                    <input 
                      type="text" 
                      placeholder="Deixe em branco para ocultar" 
                      value={currentSlide.subtitle || ''} 
                      onChange={(e) => handleUpdateSlide('subtitle', e.target.value)} 
                    />
                  </div>
                </div>

                {/* BLOCO 3: BOTÕES DE AÇÃO (CTAS) */}
                <div className={styles.sectionBlock}>
                  <div className={styles.ctasHeader}>
                    <div className={styles.ctasTitleGroup}>
                      <MousePointerClick size={14} />
                      <label>BOTÕES DE AÇÃO (CTAS)</label>
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
                            Principal (Branco)
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
                              placeholder="/catalogo ou /sobre" 
                              value={btn.link || ''} 
                              onChange={(e) => handleUpdateButton(bIdx, 'link', e.target.value)} 
                            />
                          </div>

                          {/* Chips de atalhos rápidos */}
                          <div className={styles.quickChips}>
                            {QUICK_LINKS.map((ql, qIdx) => (
                              <button
                                key={qIdx}
                                type="button"
                                className={styles.quickChip}
                                onClick={() => handleUpdateButton(bIdx, 'link', ql.url)}
                              >
                                {ql.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: PRÉ-VISUALIZAÇÃO AO VIVO HERO */}
          <div className={styles.previewCol}>
            <div className={styles.previewSticky}>
              <div className={styles.previewHeader}>
                <div className={styles.previewHeaderTitle}>
                  <Monitor size={14} />
                  <span>PRÉ-VISUALIZAÇÃO AO VIVO</span>
                </div>

                <div className={styles.deviceSelector}>
                  <button
                    type="button"
                    className={`${styles.deviceBtn} ${previewDevice === 'desktop' ? styles.activeDevice : ''}`}
                    onClick={() => setPreviewDevice('desktop')}
                    title="Visão Desktop"
                  >
                    <Monitor size={12} />
                    <span>Desktop</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.deviceBtn} ${previewDevice === 'mobile' ? styles.activeDevice : ''}`}
                    onClick={() => setPreviewDevice('mobile')}
                    title="Visão Mobile"
                  >
                    <Smartphone size={12} />
                    <span>Mobile</span>
                  </button>
                </div>
              </div>

              {(() => {
                const activePreviewImage =
                  previewDevice === 'mobile'
                    ? currentSlide.mobileBgImage || currentSlide.bgImage
                    : currentSlide.bgImage || currentSlide.mobileBgImage;
                const cleanBadge = String(currentSlide.badge || '').trim();
                const cleanTitle = String(currentSlide.title || '').trim();
                const cleanSubtitle = String(currentSlide.subtitle || '').trim();
                const validButtons = (currentSlide.buttons || []).filter((btn) =>
                  Boolean(btn && String(btn.text || '').trim())
                );
                const hasOverlayElements = Boolean(
                  cleanBadge || cleanTitle || cleanSubtitle || validButtons.length > 0
                );

                return (
                  <>
                    <div
                      className={`${styles.previewContainer} ${
                        previewDevice === 'mobile'
                          ? currentSlide.mobileBgImage
                            ? styles.previewMobileWrapper
                            : styles.previewMobileFallbackHorizontal
                          : ''
                      }`}
                    >
                      {activePreviewImage ? (
                        <div
                          className={styles.previewSlide}
                          style={{ backgroundImage: `url(${activePreviewImage})` }}
                        >
                          {hasOverlayElements && <div className={styles.previewOverlay} />}

                          {hasOverlayElements && (
                            <div className={styles.previewContent}>
                              {cleanBadge && (
                                <span className={styles.previewBadge}>
                                  <span className={styles.badgeDot} />
                                  <span>{cleanBadge}</span>
                                </span>
                              )}

                              {cleanTitle && (
                                <h2 className={styles.previewTitle}>{cleanTitle}</h2>
                              )}

                              {cleanSubtitle && (
                                <p className={styles.previewSubtitle}>{cleanSubtitle}</p>
                              )}

                              {validButtons.length > 0 && (
                                <div className={styles.previewBtnsRow}>
                                  {validButtons.map((btn, bIdx) => (
                                    <span
                                      key={btn.id || bIdx}
                                      className={`${styles.previewCtaBtn} ${
                                        btn.variant === 'secondary'
                                          ? styles.previewCtaSecondary
                                          : styles.previewCtaPrimary
                                      }`}
                                    >
                                      {btn.text}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className={styles.emptyPreviewBox}>
                          <ImageIcon size={32} />
                          <span>Nenhuma imagem selecionada</span>
                          <small>
                            Faça upload da foto Desktop (1440×730) e Mobile (1080×1350) no formulário ao lado.
                          </small>
                        </div>
                      )}
                    </div>

                    <small className={styles.previewNotice}>
                      {previewDevice === 'mobile'
                        ? currentSlide.mobileBgImage
                          ? 'Exibindo Arte Mobile dedicada (Proporção 4:5 — 1080×1350px).'
                          : 'Nenhuma Arte Mobile enviada ainda — exibindo Arte Desktop redimensionada.'
                        : 'Exibindo Arte Desktop (Proporção ~2:1 — 1440×730px).'}
                    </small>
                  </>
                );
              })()}
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
            {/* CABEÇALHO DA SEÇÃO BENTO */}
            <div className={styles.formCard} style={{ marginBottom: '1.5rem' }}>
              <div className={styles.formHeader}>
                <h3>CABEÇALHO DA SEÇÃO BENTO</h3>
              </div>
              <div className={styles.formBody}>
                <div className={styles.gridTwo}>
                  <div className={styles.inputGroup}>
                    <label>TAG SUPERIOR</label>
                    <input 
                      type="text" 
                      placeholder="Ex: ENSAIO DE CAMPANHA" 
                      value={bentoConfig.sectionTag || ''} 
                      onChange={(e) => handleUpdateBentoSection('sectionTag', e.target.value)} 
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>TÍTULO PRINCIPAL</label>
                    <input 
                      type="text" 
                      placeholder="Ex: A RUA É NOSSA ESSÊNCIA" 
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
                    <span>Card Visível na Grade</span>
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
                {/* UPLOAD DA IMAGEM DO CARD BENTO */}
                <div className={styles.sectionBlock}>
                  <div className={styles.blockTitle}>
                    <ImageIcon size={14} />
                    <span>FOTO DO CARD BENTO</span>
                  </div>

                  <div className={styles.uploadZone}>
                    {currentBentoCard.image ? (
                      <div className={styles.currentImageCard}>
                        <img 
                          src={currentBentoCard.image} 
                          alt="Card atual" 
                          className={styles.currentImageThumbSquare} 
                        />
                        <div className={styles.currentImageDetails}>
                          <div className={styles.currentImageInfo}>
                            <span className={styles.imageStatusBadge}>
                              <Check size={11} /> IMAGEM CARREGADA
                            </span>
                            <span className={styles.imageUrlTruncated}>
                              {currentBentoCard.image}
                            </span>
                          </div>

                          <div className={styles.imageActionsRow}>
                            <button
                              type="button"
                              className={styles.actionSmallBtn}
                              onClick={() => bentoFileInputRef.current?.click()}
                              disabled={isUploadingBento}
                            >
                              <Upload size={12} />
                              <span>Trocar Foto</span>
                            </button>

                            <button
                              type="button"
                              className={styles.actionSmallBtn}
                              onClick={() => setShowBentoUrlInput(!showBentoUrlInput)}
                            >
                              <LinkIcon size={12} />
                              <span>{showBentoUrlInput ? 'Ocultar Link' : 'Editar URL Externa'}</span>
                            </button>

                            <button
                              type="button"
                              className={styles.removeSmallBtn}
                              onClick={() => handleUpdateBentoCard('image', '')}
                            >
                              <Trash2 size={12} />
                              <span>Remover</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className={styles.dropzone}
                        onClick={() => bentoFileInputRef.current?.click()}
                      >
                        <div className={styles.dropzoneIconWrapper}>
                          <Upload size={20} />
                        </div>
                        <div className={styles.dropzoneMainText}>
                          {isUploadingBento ? 'Enviando imagem ao Firebase Storage...' : 'Clique para selecionar foto do computador'}
                        </div>
                        <div className={styles.dropzoneSubText}>
                          Proporção recomendada: 600x800 (Vertical) ou 800x800 (Quadrado)
                        </div>
                      </div>
                    )}

                    <input 
                      ref={bentoFileInputRef}
                      type="file" 
                      accept="image/*" 
                      className={styles.hiddenFileInput}
                      style={{ display: 'none' }}
                      onChange={handleUploadBentoImage}
                    />

                    {isUploadingBento && (
                      <div className={styles.progressBarContainer}>
                        <div className={styles.progressBarTrack}>
                          <div 
                            className={styles.progressBarFill} 
                            style={{ width: `${bentoUploadProgress}%` }}
                          />
                        </div>
                        <div className={styles.progressLabel}>
                          <span>Enviando...</span>
                          <span>{bentoUploadProgress}%</span>
                        </div>
                      </div>
                    )}

                    {showBentoUrlInput && (
                      <div className={styles.urlToggleBox}>
                        <label style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                          URL DIRETA DA IMAGEM
                        </label>
                        <input 
                          type="url" 
                          placeholder="https://..." 
                          value={currentBentoCard.image || ''} 
                          onChange={(e) => handleUpdateBentoCard('image', e.target.value)} 
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* TEXTOS E CONFIGURAÇÃO DO CARD */}
                <div className={styles.sectionBlock}>
                  <div className={styles.gridTwo}>
                    <div className={styles.inputGroup}>
                      <label>LEGENDA / TÍTULO DO CARD (OPCIONAL)</label>
                      <input 
                        type="text" 
                        placeholder="Deixe vazio para ocultar (Ex: OVERSIZED FIT)" 
                        value={currentBentoCard.title || ''} 
                        onChange={(e) => handleUpdateBentoCard('title', e.target.value)} 
                      />
                    </div>

                    <div className={styles.inputGroup}>
                      <label>TEXTO DO BOTÃO (OPCIONAL)</label>
                      <input 
                        type="text" 
                        placeholder="Deixe vazio para ocultar (Ex: VER MAIS)" 
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
                      <div className={styles.quickChips}>
                        {QUICK_LINKS.map((ql, qIdx) => (
                          <button
                            key={qIdx}
                            type="button"
                            className={styles.quickChip}
                            onClick={() => handleUpdateBentoCard('link', ql.url)}
                          >
                            {ql.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={styles.inputGroup}>
                      <label>LARGURA DO BLOCO NO GRID</label>
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
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: PRÉ-VISUALIZAÇÃO AO VIVO BENTO */}
          <div className={styles.previewCol}>
            <div className={styles.previewSticky}>
              <div className={styles.previewHeader}>
                <div className={styles.previewHeaderTitle}>
                  <Layers size={14} />
                  <span>PRÉ-VISUALIZAÇÃO (GRADE BENTO)</span>
                </div>
              </div>

              <div className={styles.bentoPreviewSection}>
                {(String(bentoConfig.sectionTag || '').trim() || String(bentoConfig.sectionTitle || '').trim()) && (
                  <div className={styles.bentoPreviewHead}>
                    {String(bentoConfig.sectionTag || '').trim() && (
                      <span className={styles.bentoPreviewTag}>{bentoConfig.sectionTag}</span>
                    )}
                    {String(bentoConfig.sectionTitle || '').trim() && (
                      <h3 className={styles.bentoPreviewTitle}>{bentoConfig.sectionTitle}</h3>
                    )}
                  </div>
                )}

                <div className={styles.bentoPreviewGrid}>
                  {bentoConfig.cards.filter(c => c.active).map((c, idx) => {
                    const cleanCardTitle = String(c.title || '').trim();
                    const cleanCardBtn = String(c.buttonText || '').trim();
                    return (
                      <div 
                        key={c.id || idx} 
                        className={`${styles.bentoPreviewCard} ${c.size === 'large' ? styles.bentoCardLarge : ''}`}
                      >
                        {c.image ? (
                          <img src={c.image} alt={cleanCardTitle || 'Card Bento'} className={styles.bentoPreviewImg} />
                        ) : (
                          <div className={styles.emptyPreviewBox} style={{ height: '100%' }}>
                            <ImageIcon size={20} />
                            <span style={{ fontSize: '0.65rem' }}>Sem foto</span>
                          </div>
                        )}
                        {(cleanCardTitle || cleanCardBtn) && (
                          <div className={styles.bentoPreviewOverlay}>
                            {cleanCardTitle ? <span className={styles.bentoPreviewCaption}>{cleanCardTitle}</span> : <span />}
                            {cleanCardBtn && <span className={styles.bentoPreviewBtn}>{cleanCardBtn}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <small className={styles.previewNotice}>
                {bentoConfig.cards.filter(c => c.active).length} card(s) ativo(s) na grade.
              </small>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          SUB-ABA 3: PRODUTOS EM DESTAQUE (MAIS VENDIDOS)
          ------------------------------------------------------------- */}
      {activeSection === 'featured' && (
        <div className={styles.featuredManagerCard}>
          <div className={styles.featuredInfoBanner}>
            <Star size={24} className={styles.featuredInfoIcon} />
            <div className={styles.featuredInfoContent}>
              <h4>COMO FUNCIONA A SEÇÃO "MAIS VENDIDOS" NA HOME</h4>
              <p>
                A terceira seção da Home exibe os produtos do catálogo que estão marcados como <strong>Destaque</strong>. 
                Para incluir ou remover produtos desta vitrine, basta acessar a página do Catálogo de Produtos e marcar a estrela de Destaque no card ou edição do item.
              </p>
              <div style={{ marginTop: '0.5rem' }}>
                <Link to="/cms/produtos" className={styles.secondaryBtn}>
                  <ShoppingBag size={14} />
                  <span>GERENCIAR NO CATÁLOGO DE PRODUTOS</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', fontWeight: 800, marginBottom: '1rem' }}>
              PRODUTOS ATUALMENTE EM DESTAQUE NA VITRINE ({featuredProductsList.length})
            </h3>

            {loadingFeatured ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <RotateCw size={20} className={styles.spinning} style={{ margin: '0 auto 0.5rem' }} />
                <span>Carregando destaques do catálogo...</span>
              </div>
            ) : featuredProductsList.length === 0 ? (
              <div className={styles.featuredEmptyState}>
                <ShoppingBag size={32} />
                <span>Nenhum produto marcado como destaque no momento.</span>
                <small>Acesse o catálogo e marque os produtos principais com a estrela para preencher a seção da Home.</small>
              </div>
            ) : (
              <div className={styles.featuredProductsGrid}>
                {featuredProductsList.map((p) => {
                  const cover = p.images?.find(i => i.isCover)?.url || p.images?.[0]?.url || p.imageUrl || '';
                  return (
                    <div key={p.id} className={styles.featuredProductMiniCard}>
                      <img 
                        src={cover} 
                        alt={p.name} 
                        className={styles.featuredProductMiniImg} 
                      />
                      <div className={styles.featuredProductMiniInfo}>
                        <span className={styles.featuredProductMiniTitle}>{p.name}</span>
                        <span className={styles.featuredProductMiniPrice}>
                          {p.price ? `R$ ${Number(p.price).toFixed(2)}` : 'Preço não definido'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CmsVitrine;
