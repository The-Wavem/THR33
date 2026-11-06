import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  X, 
  Package, 
  ShoppingBag, 
  Tag, 
  Check, 
  ExternalLink,
  Layers,
  AlertCircle,
  Filter,
  RotateCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Upload,
  Image as ImageIcon,
  Star,
  Palette,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Link as LinkIcon,
  Infinity as InfinityIcon,
  Gift
} from 'lucide-react';
import { db, storage } from '../../services/firebaseConfig';
import { catalogService, invalidateCatalogCache } from '../../services/catalogService';
import { InfoTooltip } from '../../components/ui/InfoTooltip';
import { normalizeFitSlug, formatFitLabel, isUnicoFit, sanitizeFitsList, getCanonicalFitName } from '../../utils/fitUtils';
import styles from './CmsProdutos.module.css';

// Constantes e utilitários de Modelagens e Máscaras de Moeda
const OFFICIAL_THR33_FITS = ['Oversized Heavy', 'Oversized Clássica', 'Boxy'];

const formatCurrencyInput = (val) => {
  if (val === null || val === undefined || val === '') return '';
  let digits = '';
  if (typeof val === 'number') {
    digits = Math.round(val * 100).toString();
  } else {
    digits = String(val).replace(/\D/g, '');
  }
  if (!digits) return '';
  const num = parseInt(digits, 10);
  if (isNaN(num)) return '';
  const reais = (num / 100).toFixed(2);
  const [inteiro, centavos] = reais.split('.');
  const inteiroFormatado = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${inteiroFormatado},${centavos}`;
};

const parseCurrencyToFloat = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const digits = String(val).replace(/\D/g, '');
  if (!digits) return 0;
  return parseFloat((parseInt(digits, 10) / 100).toFixed(2));
};

export function CmsProdutos() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all', 'camisa', 'jaqueta', 'calca', 'brinde'
  const [fitFilter, setFitFilter] = useState('all'); // 'all', 'boxy', 'oversized', 'normal', 'regata'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'in_stock', 'low_stock', 'out_of_stock', 'on_sale', 'release', 'featured'
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'none' });

  // Categorias e Modelagens Customizadas (Persistidas no LocalStorage)
  const [customCategories, setCustomCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('thr33_custom_categories');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customFits, setCustomFits] = useState(() => {
    try {
      const saved = localStorage.getItem('thr33_custom_fits');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Estados de criação inline no formulário
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingFit, setIsAddingFit] = useState(false);
  const [newFitName, setNewFitName] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem('thr33_custom_categories', JSON.stringify(customCategories));
    } catch (e) {}
  }, [customCategories]);

  useEffect(() => {
    try {
      localStorage.setItem('thr33_custom_fits', JSON.stringify(customFits));
    } catch (e) {}
  }, [customFits]);
  
  // Controle do Formulário / Drawer de Criação
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Estado do Formulário
  const [formData, setFormData] = useState({
    name: '',
    type: 'vestuario', // 'vestuario' ou 'brinde'
    category: 'camisa',
    fits: ['Oversized Heavy', 'Oversized Clássica', 'Boxy'],
    fit: 'Oversized Heavy',
    drop: 'leak-two',
    price: '',
    priceFormatted: '',
    originalPrice: '',
    originalPriceFormatted: '',
    discount: '',
    customBadge: '',
    isRelease: true,
    isFeatured: true,
    freeShipping: false,
    image: '',
    description: '',
    stock: {
      P: 15,
      M: 20,
      G: 15,
      GG: 10,
      EXG: 5
    },
    colors: [
      { id: 'preto', name: 'Preto', hex: '#000000' }
    ],
    unlimitedStock: false,
    hasColorStock: false,
    minValue: 30,
    maxValue: 2000,
    values: [50, 100, 200],
    colorStock: {
      preto: { P: 15, M: 20, G: 15, GG: 10, EXG: 5 }
    }
  });

  // Gestão de Múltiplas Imagens & Firebase Storage
  const [imagesList, setImagesList] = useState([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [draggedImageIndex, setDraggedImageIndex] = useState(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [storageWarning, setStorageWarning] = useState('');

  // Gestão de Cores Inline

  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#000000');
  const [activeColorStockTab, setActiveColorStockTab] = useState('preto');

  // 1. Carrega produtos 100% do Firestore via catalogService
  const fetchProducts = async (force = false) => {
    setLoading(true);
    try {
      if (force) {
        invalidateCatalogCache('products');
      }
      const list = await catalogService.getAllProducts(force);
      setProducts(list);
    } catch (err) {
      console.error("Erro ao carregar catálogo do Firestore:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(true);
  }, []);

  const [savingFreeShippingId, setSavingFreeShippingId] = useState(null);

  // Alternância Rápida de Frete Grátis com 1 Clique na Tabela do Catálogo
  const handleToggleFreeShipping = async (prod) => {
    const nextStatus = !Boolean(prod.freeShipping || prod.hasFreeShipping);
    setSavingFreeShippingId(prod.id);

    try {
      const docRef = doc(db, 'products', prod.id);
      await setDoc(docRef, {
        freeShipping: nextStatus,
        hasFreeShipping: nextStatus,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      invalidateCatalogCache('products');

      setProducts(prev => prev.map(p => p.id === prod.id ? {
        ...p,
        freeShipping: nextStatus,
        hasFreeShipping: nextStatus
      } : p));
    } catch (err) {
      console.error("Erro ao alterar frete grátis:", err);
      alert("Erro ao salvar frete grátis no Firestore: " + (err.message || err));
    } finally {
      setSavingFreeShippingId(null);
    }
  };

  // Gestão de Reordenação Manual do Catálogo (Drag and Drop + Setas)
  const [hasPendingOrderChanges, setHasPendingOrderChanges] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [draggedRowIndex, setDraggedRowIndex] = useState(null);
  const [dragOverRowIndex, setDragOverRowIndex] = useState(null);

  const canReorder = useMemo(() => {
    return (
      !searchTerm &&
      fitFilter === 'all' &&
      statusFilter === 'all' &&
      sortConfig.direction === 'none'
    );
  }, [searchTerm, fitFilter, statusFilter, sortConfig]);

  const handleMoveRow = (fromIndex, toIndex) => {
    if (!canReorder) return;
    if (toIndex < 0 || toIndex >= products.length) return;

    setProducts(prev => {
      const list = [...prev];
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      return list;
    });
    setHasPendingOrderChanges(true);
  };

  const handleRowDragStart = (e, index) => {
    if (!canReorder) return;
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedRowIndex(index);
  };

  const handleRowDragOver = (e, index) => {
    if (!canReorder) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverRowIndex !== index) {
      setDragOverRowIndex(index);
    }
  };

  const handleRowDragLeave = () => {
    setDragOverRowIndex(null);
  };

  const handleRowDrop = (e, targetIndex) => {
    if (!canReorder) return;
    e.preventDefault();
    const sourceIndex = draggedRowIndex !== null ? draggedRowIndex : Number(e.dataTransfer.getData('text/plain'));

    if (sourceIndex !== null && sourceIndex !== targetIndex && !isNaN(sourceIndex)) {
      handleMoveRow(sourceIndex, targetIndex);
    }
    setDraggedRowIndex(null);
    setDragOverRowIndex(null);
  };

  const handleRowDragEnd = () => {
    setDraggedRowIndex(null);
    setDragOverRowIndex(null);
  };

  const handleCancelReorder = () => {
    fetchProducts(true);
    setHasPendingOrderChanges(false);
  };

  const handleSaveReorderedList = async () => {
    setIsSavingOrder(true);
    try {
      const batch = writeBatch(db);
      products.forEach((prod, idx) => {
        const docRef = doc(db, 'products', prod.id);
        batch.update(docRef, {
          catalogOrder: idx + 1,
          updatedAt: new Date().toISOString()
        });
      });

      await batch.commit();
      invalidateCatalogCache('products');
      setHasPendingOrderChanges(false);
      await fetchProducts(true);
    } catch (err) {
      console.error('Erro ao salvar nova ordem dos produtos:', err);
      alert('Erro ao salvar ordem no Firestore: ' + (err.message || err));
    } finally {
      setIsSavingOrder(false);
    }
  };

  // Trava a rolagem do fundo (eixo Y) quando o drawer de produto estiver aberto
  useEffect(() => {
    if (isFormOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isFormOpen]);

  // Handlers do Formulário
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleConfirmAddCategory = () => {
    const raw = newCategoryName.trim();
    if (!raw) {
      setIsAddingCategory(false);
      return;
    }
    const slug = raw.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    const formattedLabel = raw.charAt(0).toUpperCase() + raw.slice(1);
    setCustomCategories(prev => {
      if (prev.some(c => c.key === slug)) return prev;
      return [...prev, { key: slug, label: formattedLabel }];
    });
    setFormData(prev => ({ ...prev, category: slug }));
    setIsAddingCategory(false);
    setNewCategoryName('');
  };

  // Lista completa de opções de modelagem disponíveis
  const allAvailableFitOptions = useMemo(() => {
    const list = [...OFFICIAL_THR33_FITS];
    (customFits || []).forEach(cf => {
      const label = cf.label || cf.name;
      if (label && !list.some(item => normalizeFitSlug(item) === normalizeFitSlug(label))) {
        list.push(label);
      }
    });

    // Se o produto atual possui alguma modelagem personalizada já cadastrada
    if (Array.isArray(formData.fits)) {
      formData.fits.forEach(f => {
        const canonical = getCanonicalFitName(f);
        if (canonical && !isUnicoFit(canonical) && !list.some(item => normalizeFitSlug(item) === normalizeFitSlug(canonical))) {
          list.push(canonical);
        }
      });
    }

    return list;
  }, [customFits, formData.fits]);

  // Alterna a seleção de uma modelagem (mantém no mínimo 1 ativa)
  const toggleFitSelection = (fitOption) => {
    setFormData(prev => {
      const current = sanitizeFitsList(prev.fits);
      const targetSlug = normalizeFitSlug(fitOption);
      
      let updated;
      if (current.some(f => normalizeFitSlug(f) === targetSlug)) {
        updated = current.filter(f => normalizeFitSlug(f) !== targetSlug);
      } else {
        // Ao selecionar uma modelagem específica, remove automaticamente qualquer opção neutra ("Modelo Único")
        const filteredCurrent = current.filter(f => !isUnicoFit(f));
        const canonical = getCanonicalFitName(fitOption) || fitOption;
        updated = [...filteredCurrent, canonical];
      }

      // Se todas as modelagens forem desmarcadas, assume "Modelo Único"
      if (updated.length === 0) {
        updated = ['Modelo Único'];
      }

      // Garante que o fit adicionado possua um preço padrão inicial
      const slug = normalizeFitSlug(fitOption);
      const existingPrices = prev.fitPrices || {};
      const fallbackPrice = existingPrices[slug] ?? existingPrices[fitOption] ?? prev.price ?? 150;
      const updatedPrices = {
        ...existingPrices,
        [slug]: existingPrices[slug] ?? fallbackPrice,
        [fitOption]: existingPrices[fitOption] ?? fallbackPrice
      };

      return {
        ...prev,
        fits: updated,
        fit: updated[0] || 'Oversized Heavy',
        fitPrices: updatedPrices
      };
    });
  };

  const handleConfirmAddFit = () => {
    const raw = newFitName.trim();
    if (!raw) {
      setIsAddingFit(false);
      return;
    }
    const slug = raw.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    const formattedLabel = raw.charAt(0).toUpperCase() + raw.slice(1);

    setCustomFits(prev => {
      if (prev.some(f => f.key === slug)) return prev;
      return [...prev, { key: slug, label: formattedLabel }];
    });

    setFormData(prev => {
      const current = Array.isArray(prev.fits) ? [...prev.fits] : [];
      if (!current.includes(formattedLabel)) {
        const updated = [...current, formattedLabel];
        const fitSlug = normalizeFitSlug(formattedLabel);
        return {
          ...prev,
          fits: updated,
          fit: updated[0] || formattedLabel,
          fitPrices: {
            ...(prev.fitPrices || {}),
            [fitSlug]: prev.price || 150,
            [formattedLabel]: prev.price || 150
          }
        };
      }
      return prev;
    });

    setIsAddingFit(false);
    setNewFitName('');
  };

  // Exclui permanentemente uma modelagem customizada
  const handleDeleteCustomFit = (e, fitLabel) => {
    e.stopPropagation();
    if (!window.confirm(`Deseja remover permanentemente a modelagem "${fitLabel}" da lista?`)) return;

    setCustomFits(prev => prev.filter(cf => (cf.label || cf.name) !== fitLabel && cf.key !== fitLabel));
    setFormData(prev => {
      const currentFits = Array.isArray(prev.fits) ? prev.fits : [];
      const updated = currentFits.filter(f => f !== fitLabel);
      return {
        ...prev,
        fits: updated.length > 0 ? updated : ['Oversized Heavy', 'Oversized Clássica', 'Boxy'],
        fit: updated[0] || 'Oversized Heavy'
      };
    });
  };

  // Restaura lista padrão para os 3 fits oficiais
  const handleResetCustomFits = (e) => {
    e.stopPropagation();
    if (!window.confirm("Deseja remover todas as modelagens extras e manter apenas as 3 oficiais (Oversized Heavy, Oversized Clássica e Boxy)?")) return;
    setCustomFits([]);
    try {
      localStorage.removeItem('thr33_custom_fits');
    } catch (err) {}
    setFormData(prev => ({
      ...prev,
      fits: ['Oversized Heavy', 'Oversized Clássica', 'Boxy'],
      fit: 'Oversized Heavy'
    }));
  };

  // Handlers com máscara monetária
  const handlePriceChange = (e) => {
    const formatted = formatCurrencyInput(e.target.value);
    const num = parseCurrencyToFloat(formatted);
    setFormData(prev => ({
      ...prev,
      price: num,
      priceFormatted: formatted
    }));
  };

  const handleFitPriceChange = (fitOption, rawValue) => {
    const formatted = formatCurrencyInput(rawValue);
    const num = parseCurrencyToFloat(formatted);
    const slug = normalizeFitSlug(fitOption);
    setFormData(prev => ({
      ...prev,
      fitPrices: {
        ...(prev.fitPrices || {}),
        [slug]: num,
        [fitOption]: num
      }
    }));
  };

  const handleCopyPriceToAllFits = () => {
    const activeFits = Array.isArray(formData.fits) ? formData.fits : [];
    if (activeFits.length === 0) return;
    const firstFit = activeFits[0];
    const firstSlug = normalizeFitSlug(firstFit);
    const baseVal = (formData.fitPrices && (formData.fitPrices[firstSlug] ?? formData.fitPrices[firstFit])) ?? formData.price ?? 150;
    const num = typeof baseVal === 'number' && !isNaN(baseVal) ? baseVal : parseCurrencyToFloat(baseVal);

    const updated = { ...(formData.fitPrices || {}) };
    activeFits.forEach(fit => {
      const slug = normalizeFitSlug(fit);
      updated[slug] = num;
      updated[fit] = num;
    });

    setFormData(prev => ({
      ...prev,
      fitPrices: updated
    }));
  };

  const handleOriginalPriceChange = (e) => {
    const formatted = formatCurrencyInput(e.target.value);
    const num = parseCurrencyToFloat(formatted);
    setFormData(prev => ({
      ...prev,
      originalPrice: num,
      originalPriceFormatted: formatted
    }));
  };

  const handleStockChange = (size, qty) => {
    setFormData(prev => ({
      ...prev,
      stock: {
        ...prev.stock,
        [size]: Math.max(0, parseInt(qty, 10) || 0)
      }
    }));
  };

  const COLOR_PRESETS = [
    { name: 'Preto', hex: '#0a0a0a' },
    { name: 'Branco', hex: '#ffffff' },
    { name: 'Off-White', hex: '#f2f0eb' },
    { name: 'Grafite', hex: '#262626' },
    { name: 'Cinza Mescla', hex: '#8a8d8f' },
    { name: 'Marrom Terra', hex: '#4a2e18' },
    { name: 'Bege Areia', hex: '#d2b48c' },
    { name: 'Azul Noite', hex: '#1e3a8a' },
    { name: 'Verde Militar', hex: '#3f4e3a' }
  ];

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      name: '',
      type: 'vestuario',
      category: 'camisa',
      fits: ['Oversized Heavy', 'Oversized Clássica', 'Boxy'],
      fit: 'Oversized Heavy',
      fitPrices: {
        'oversized_heavy': 150,
        'oversized_classica': 150,
        'boxy': 150,
        'Oversized Heavy': 150,
        'Oversized Clássica': 150,
        'Boxy': 150
      },
      drop: 'leak-two',
      price: 150,
      priceFormatted: 'R$ 150,00',
      originalPrice: '',
      originalPriceFormatted: '',
      customBadge: '',
      isRelease: true,
      isFeatured: false,
      freeShipping: false,
      image: '',
      description: '',
      stock: { P: 15, M: 20, G: 15, GG: 10, EXG: 5 },
      colors: [
        { id: 'preto', name: 'Preto', hex: '#000000' }
      ],
      unlimitedStock: false,
      hasColorStock: false,
      colorStock: {
        preto: { P: 15, M: 20, G: 15, GG: 10, EXG: 5 }
      }
    });
    setImagesList([]);
    setNewColorName('');
    setNewColorHex('#000000');
    setActiveColorStockTab('preto');
    setUrlInput('');
    setShowUrlInput(false);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (product) => {
    setEditingId(product.id);

    // Converte e normaliza lista de imagens existentes
    let initialImages = [];
    if (Array.isArray(product.imagesGallery) && product.imagesGallery.length > 0) {
      initialImages = product.imagesGallery.map((img, idx) => ({
        id: img.id || `img_${idx}`,
        url: img.url,
        name: img.name || `Foto ${idx + 1}`,
        isCover: img.isCover ?? (idx === 0 || img.url === product.image),
        colorId: img.colorId || ''
      }));
    } else if (Array.isArray(product.images) && product.images.length > 0) {
      initialImages = product.images.map((url, idx) => ({
        id: `img_${idx}`,
        url,
        name: `Foto ${idx + 1}`,
        isCover: idx === 0 || url === product.image,
        colorId: ''
      }));
    } else if (product.image) {
      initialImages = [{
        id: 'img_0',
        url: product.image,
        name: 'Foto Principal',
        isCover: true,
        colorId: ''
      }];
    }

    if (initialImages.length > 0 && !initialImages.some(img => img.isCover)) {
      initialImages[0].isCover = true;
    }

    const initialColors = Array.isArray(product.colors) && product.colors.length > 0
      ? product.colors
      : [{ id: 'preto', name: 'Preto', hex: '#000000' }];

    const initialColorStock = product.colorStock || {};
    initialColors.forEach(c => {
      if (!initialColorStock[c.id]) {
        initialColorStock[c.id] = product.stock || { P: 10, M: 15, G: 15, GG: 10, EXG: 5 };
      }
    });

    const rawInitialFits = Array.isArray(product.fits) && product.fits.length > 0
      ? product.fits
      : (Array.isArray(product.availableFits) && product.availableFits.length > 0)
        ? product.availableFits
        : (product.fit ? [product.fit] : ['Oversized Heavy', 'Oversized Clássica', 'Boxy']);

    // Higieniza modelagens eliminando legados obsoletos ('oversized' genérico) e garantindo canonical names
    const initialFits = sanitizeFitsList(rawInitialFits);

    const prodPrice = product.price ?? product.priceNum ?? 150;
    const prodOrigPrice = product.originalPrice ?? '';

    // Inicializa preços por modelagem a partir do produto ou herda preço base
    const initialFitPrices = {};
    if (product.fitPrices && typeof product.fitPrices === 'object') {
      Object.keys(product.fitPrices).forEach(k => {
        initialFitPrices[k] = Number(product.fitPrices[k]);
      });
    }
    const fallbackPriceNum = typeof prodPrice === 'number' && !isNaN(prodPrice) && prodPrice > 0 ? prodPrice : 150;
    initialFits.forEach(f => {
      const slug = normalizeFitSlug(f);
      if (initialFitPrices[slug] === undefined && initialFitPrices[f] === undefined) {
        initialFitPrices[slug] = fallbackPriceNum;
        initialFitPrices[f] = fallbackPriceNum;
      }
    });

    setFormData({
      name: product.name || product.title || '',
      type: product.type || (product.category === 'brinde' ? 'brinde' : 'vestuario'),
      category: 'camisa',
      fits: initialFits,
      fit: initialFits[0] || product.fit || 'Boxy',
      fitPrices: initialFitPrices,
      drop: product.drop || 'leak-two',
      price: prodPrice,
      priceFormatted: formatCurrencyInput(prodPrice),
      originalPrice: prodOrigPrice,
      originalPriceFormatted: formatCurrencyInput(prodOrigPrice),
      customBadge: product.customBadge || '',
      isRelease: product.isRelease ?? false,
      isFeatured: product.isFeatured ?? false,
      freeShipping: Boolean(product.freeShipping || product.hasFreeShipping),
      image: product.image || initialImages[0]?.url || '',
      description: product.description || '',
      stock: product.stock || { P: 0, M: 0, G: 0, GG: 0, EXG: 0 },
      colors: initialColors,
      unlimitedStock: Boolean(product.unlimitedStock || product.isUnlimitedStock),
      hasColorStock: product.hasColorStock ?? false,
      minValue: Number(product.minValue || 30),
      maxValue: Number(product.maxValue || 2000),
      values: Array.isArray(product.values) ? product.values : [50, 100, 200],
      colorStock: initialColorStock
    });

    setImagesList(initialImages);
    setNewColorName('');
    setNewColorHex('#000000');
    setActiveColorStockTab(initialColors[0]?.id || 'preto');
    setUrlInput('');
    setShowUrlInput(false);
    setIsFormOpen(true);
  };

  // Utilitário de fallback para compactação e conversão em DataURL local caso o Firebase Storage esteja indisponível/sem CORS
  const compressImageFile = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.85) => {
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

  // Upload de Imagens no Firebase Storage com Suporte Completo a Drag & Drop
  const processFilesUpload = async (files) => {
    if (!files || files.length === 0) return;

    setIsUploadingImages(true);
    setUploadStatusText(`Processando ${files.length} imagem(ns)...`);
    setStorageWarning('');

    const uploaded = [];
    const prodRefId = editingId || generateSlug(formData.name) || `temp_${Date.now()}`;
    let hasFallback = false;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        setUploadStatusText(`Enviando ${i + 1}/${files.length}: ${file.name}`);
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileRef = ref(storage, `products/${prodRefId}/${Date.now()}_${safeName}`);
        await uploadBytesResumable(fileRef, file);
        const downloadUrl = await getDownloadURL(fileRef);

        uploaded.push({
          id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          url: downloadUrl,
          name: file.name,
          isCover: false,
          colorId: ''
        });
      } catch (err) {
        console.warn(`Aviso no upload ao Firebase Storage (${file.name}):`, err);
        hasFallback = true;
        // Fallback imediato: comprime e insere como DataURL local otimizado para não travar o fluxo
        const fallbackUrl = await compressImageFile(file);
        if (fallbackUrl) {
          uploaded.push({
            id: `img_local_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            url: fallbackUrl,
            name: `${file.name} (Modo Local Otimizado)`,
            isCover: false,
            colorId: ''
          });
        }
      }
    }

    if (hasFallback) {
      setStorageWarning("O Firebase Storage precisa ser ativado no Firebase Console para receber os uploads na nuvem (ou o CORS bloqueou o acesso no localhost). As imagens foram importadas e otimizadas em modo local para você continuar o cadastro sem travar.");
    }

    setImagesList(prev => {
      const combined = [...prev, ...uploaded];
      if (!combined.some(img => img.isCover) && combined.length > 0) {
        combined[0].isCover = true;
      }
      return combined;
    });

    setIsUploadingImages(false);
    setUploadStatusText('');
  };

  const handleUploadFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    await processFilesUpload(files);
    e.target.value = '';
  };

  const handleDropFiles = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(false);
    const files = Array.from(e.dataTransfer.files || []);
    await processFilesUpload(files);
  };


  const handleAddUrlImage = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setImagesList(prev => {
      const isFirst = prev.length === 0;
      return [
        ...prev,
        {
          id: `img_url_${Date.now()}`,
          url: trimmed,
          name: `Imagem Externa ${prev.length + 1}`,
          isCover: isFirst,
          colorId: ''
        }
      ];
    });
    setUrlInput('');
    setShowUrlInput(false);
  };

  const handleSetCoverImage = (index) => {
    setImagesList(prev => {
      const target = { ...prev[index], isCover: true };
      const others = prev.filter((_, i) => i !== index).map(img => ({ ...img, isCover: false }));
      return [target, ...others];
    });
  };

  const handleMoveImage = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= imagesList.length) return;
    setImagesList(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  };

  const handleImageColorChange = (index, colorId) => {
    setImagesList(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], colorId };
      return updated;
    });
  };

  const handleRemoveImage = (index) => {
    setImagesList(prev => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length > 0 && !updated.some(img => img.isCover)) {
        updated[0].isCover = true;
      }
      return updated;
    });
  };

  // Drag and Drop
  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('text/plain', String(index));
    setDraggedImageIndex(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    const sourceIndex = draggedImageIndex !== null ? draggedImageIndex : Number(e.dataTransfer.getData('text/plain'));
    if (sourceIndex !== null && sourceIndex !== targetIndex && !isNaN(sourceIndex)) {
      handleMoveImage(sourceIndex, targetIndex);
    }
    setDraggedImageIndex(null);
  };

  // Gestão de Cores
  const handleAddColor = () => {
    const raw = newColorName.trim();
    if (!raw) return;
    const slug = raw.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    if (formData.colors.some(c => c.id === slug)) return;

    const newColor = { id: slug, name: raw, hex: newColorHex };
    const updatedColors = [...formData.colors, newColor];

    const updatedColorStock = { ...formData.colorStock };
    if (!updatedColorStock[slug]) {
      updatedColorStock[slug] = { P: 15, M: 20, G: 15, GG: 10, EXG: 5 };
    }

    setFormData(prev => ({
      ...prev,
      colors: updatedColors,
      colorStock: updatedColorStock
    }));

    setActiveColorStockTab(slug);
    setNewColorName('');
  };

  const handleApplyColorPreset = (preset) => {
    const slug = preset.name.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    if (formData.colors.some(c => c.id === slug)) return;

    const newColor = { id: slug, name: preset.name, hex: preset.hex };
    const updatedColors = [...formData.colors, newColor];

    const updatedColorStock = { ...formData.colorStock };
    if (!updatedColorStock[slug]) {
      updatedColorStock[slug] = { P: 15, M: 20, G: 15, GG: 10, EXG: 5 };
    }

    setFormData(prev => ({
      ...prev,
      colors: updatedColors,
      colorStock: updatedColorStock
    }));

    setActiveColorStockTab(slug);
  };

  const handleRemoveColor = (colorId) => {
    setFormData(prev => {
      const updatedColors = prev.colors.filter(c => c.id !== colorId);
      const updatedColorStock = { ...prev.colorStock };
      delete updatedColorStock[colorId];
      return {
        ...prev,
        colors: updatedColors,
        colorStock: updatedColorStock
      };
    });

    if (activeColorStockTab === colorId) {
      const remaining = formData.colors.filter(c => c.id !== colorId);
      setActiveColorStockTab(remaining[0]?.id || '');
    }

    setImagesList(prev => prev.map(img => img.colorId === colorId ? { ...img, colorId: '' } : img));
  };

  const handleColorStockChange = (colorId, size, value) => {
    setFormData(prev => ({
      ...prev,
      colorStock: {
        ...prev.colorStock,
        [colorId]: {
          ...(prev.colorStock[colorId] || {}),
          [size]: Math.max(0, parseInt(value, 10) || 0)
        }
      }
    }));
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setSubmitting(true);

    const cleanSlug = generateSlug(formData.name);
    
    // Se for um novo produto, cria ID único e amigável baseado na slug do nome
    let productId = editingId;
    let productSlug = cleanSlug;

    if (!editingId) {
      let uniqueSlug = cleanSlug;
      let counter = 2;
      while (products.some(p => p.id === uniqueSlug || p.slug === uniqueSlug)) {
        uniqueSlug = `${cleanSlug}-${counter}`;
        counter++;
      }
      productId = uniqueSlug;
      productSlug = uniqueSlug;
    } else {
      productSlug = cleanSlug;
    }

    const rawFits = Array.isArray(formData.fits) && formData.fits.length > 0
      ? formData.fits
      : ['Oversized Heavy', 'Oversized Clássica', 'Boxy'];

    const chosenFits = sanitizeFitsList(rawFits);

    // Consolidação rigorosa dos preços por modelagem
    const consolidatedFitPrices = {};
    const activePricesList = [];

    chosenFits.forEach(f => {
      const slug = normalizeFitSlug(f);
      const raw = formData.fitPrices?.[slug] ?? formData.fitPrices?.[f] ?? formData.price ?? 150;
      const num = typeof raw === 'number' && !isNaN(raw) && raw > 0
        ? raw
        : (parseCurrencyToFloat(raw) || 150);
      consolidatedFitPrices[slug] = num;
      consolidatedFitPrices[f] = num;
      activePricesList.push(num);
    });

    const effectiveBasePrice = activePricesList.length > 0
      ? Math.min(...activePricesList)
      : (typeof formData.price === 'number' && formData.price > 0 ? formData.price : 150);

    const priceNum = effectiveBasePrice;
    const existingProd = editingId ? products.find(p => p.id === editingId) : null;
    
    // Preserva histórico de slugs anteriores para redirecionamentos amigáveis
    const previousSlugs = Array.isArray(existingProd?.previousSlugs) ? [...existingProd.previousSlugs] : [];
    if (existingProd?.slug && existingProd.slug !== productSlug && !previousSlugs.includes(existingProd.slug)) {
      previousSlugs.push(existingProd.slug);
    }
    
    // Preço original igual ao preço base (sem desconto fictício; descontos são geridos em CmsDescontos)
    const finalOrigPrice = effectiveBasePrice;
    const discountPercent = existingProd?.discount || 0;

    // Define imagem de capa e array consolidado
    const coverItem = imagesList.find(img => img.isCover) || imagesList[0];
    const finalCoverUrl = coverItem?.url || formData.image || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop";
    const finalImagesUrls = imagesList.length > 0
      ? imagesList.map(img => img.url)
      : (formData.image ? [formData.image] : [finalCoverUrl]);

    // Calcula estoque agregado e variantes com SKU
    let aggregatedStock = { P: 0, M: 0, G: 0, GG: 0, EXG: 0 };
    if (formData.hasColorStock && formData.colors.length > 0) {
      ['P', 'M', 'G', 'GG', 'EXG'].forEach(size => {
        aggregatedStock[size] = formData.colors.reduce((total, col) => {
          return total + (Number(formData.colorStock[col.id]?.[size]) || 0);
        }, 0);
      });
    } else {
      aggregatedStock = formData.stock;
    }

    const catCode = (formData.category || 'XX').slice(0, 2).toUpperCase();
    const idSuffix = String(productId).slice(-4).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
    
    let variants = [];
    if (formData.hasColorStock && formData.colors.length > 0) {
      formData.colors.forEach(col => {
        ['P', 'M', 'G', 'GG', 'EXG'].forEach(size => {
          const qty = Number(formData.colorStock[col.id]?.[size]) || 0;
          variants.push({
            sku: `THR33-${catCode}-${col.id.slice(0, 3).toUpperCase()}-${size}-${idSuffix}`,
            size,
            color: col.name,
            colorId: col.id,
            stock_quantity: qty
          });
        });
      });
    } else {
      variants = Object.entries(aggregatedStock).map(([size, quantity]) => ({
        sku: `THR33-${catCode}-${size}-${idSuffix}`,
        size,
        stock_quantity: Number(quantity)
      }));
    }

    const productPayload = {
      id: productId,
      slug: productSlug,
      previousSlugs,
      name: formData.name.trim(),
      title: formData.name.trim(),
      type: formData.type,
      category: 'camisa',
      fits: chosenFits,
      fit: chosenFits[0] || formData.fit || 'Boxy',
      fitPrices: consolidatedFitPrices,
      drop: formData.drop,
      price: effectiveBasePrice,
      priceNum: effectiveBasePrice,
      basePrice: effectiveBasePrice,
      originalPrice: finalOrigPrice,
      discount: discountPercent,
      ...(existingProd?.discountPrice !== undefined ? { discountPrice: existingProd.discountPrice } : {}),
      ...(existingProd?.discountActive !== undefined ? { discountActive: existingProd.discountActive } : {}),
      catalogOrder: existingProd?.catalogOrder !== undefined ? Number(existingProd.catalogOrder) : (products.length + 1),
      customBadge: formData.customBadge.trim(),
      isRelease: formData.isRelease,
      isFeatured: formData.isFeatured,
      freeShipping: Boolean(formData.freeShipping),
      hasFreeShipping: Boolean(formData.freeShipping),
      image: finalCoverUrl,
      images: finalImagesUrls,
      imagesGallery: imagesList,
      colors: formData.colors,
      hasColorStock: formData.hasColorStock,
      colorStock: formData.colorStock,
      description: formData.description.trim(),
      unlimitedStock: Boolean(formData.unlimitedStock),
      isUnlimitedStock: Boolean(formData.unlimitedStock || formData.category === 'gift-card'),
      isGiftCard: formData.category === 'gift-card',
      ...(formData.category === 'gift-card' ? {
        minValue: Number(formData.minValue || 30),
        maxValue: Number(formData.maxValue || 2000),
        values: Array.isArray(formData.values) && formData.values.length > 0 ? formData.values : [50, 100, 200],
        freeShipping: true,
        hasFreeShipping: true,
        unlimitedStock: true
      } : {}),
      stock: aggregatedStock,
      sizes: formData.unlimitedStock
        ? ['P', 'M', 'G', 'GG', 'EXG']
        : Object.keys(aggregatedStock).filter(size => size !== 'PP' && (aggregatedStock[size] || 0) > 0),
      variants,
      createdAt: existingProd?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'products', productId), productPayload, { merge: true });
      invalidateCatalogCache('products');
      await fetchProducts(true);
      setIsFormOpen(false);
    } catch (err) {
      console.error("Erro ao salvar produto:", err);
      setProducts(prev => {
        const exists = prev.some(p => p.id === productId);
        if (exists) {
          return prev.map(p => p.id === productId ? { ...p, ...productPayload } : p);
        }
        return [productPayload, ...prev];
      });
      setIsFormOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Deseja realmente remover este produto do catálogo?")) return;
    try {
      await deleteDoc(doc(db, 'products', productId));
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (err) {
      console.warn("Erro ao excluir do Firestore, atualizando localmente:", err.message);
      setProducts(prev => prev.filter(p => p.id !== productId));
    }
  };

  // Manipulador de ordenação com 3 estados (Maior/A-Z -> Menor/Z-A -> Padrão)
  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key !== key || prev.direction === 'none') {
        const initialDir = (key === 'name' || key === 'category' || key === 'badge') ? 'asc' : 'desc';
        return { key, direction: initialDir };
      }
      const isText = key === 'name' || key === 'category' || key === 'badge';
      if (isText) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key: null, direction: 'none' };
      } else {
        if (prev.direction === 'desc') return { key, direction: 'asc' };
        if (prev.direction === 'asc') return { key: null, direction: 'none' };
      }
      return { key: null, direction: 'none' };
    });
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key || sortConfig.direction === 'none') {
      return <ArrowUpDown size={12} className={styles.sortIconInactive} />;
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp size={12} className={styles.sortIconActive} />;
    }
    return <ArrowDown size={12} className={styles.sortIconActive} />;
  };

  const getSortLabel = (key) => {
    switch (key) {
      case 'name': return 'Nome';
      case 'category': return 'Categoria/Fit';
      case 'price': return 'Preço';
      case 'badge': return 'Badge';
      case 'stock': return 'Estoque Total';
      default: return '';
    }
  };

  // Funções Utilitárias para Formatação de Slugs, Categorias e Modelagens
  const generateSlug = (name) => {
    if (!name) return `produto-${Date.now()}`;
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || `produto-${Date.now()}`;
  };

  const formatCategoryLabel = (catKey) => {
    if (!catKey) return '';
    const map = {
      'camisa': 'Camiseta / Camisa',
      'jaqueta': 'Jaqueta / Moletom',
      'calca': 'Calça / Bermuda',
      'brinde': 'Brinde / Acessório',
      'gift-card': 'Vale-Presente',
      'short': 'Short / Bermuda',
      'shorts': 'Shorts / Bermudas',
      'bone': 'Boné / Acessórios',
      'bones': 'Bonés / Acessórios',
      'acessorios': 'Acessórios',
      'acessorio': 'Acessórios',
      'moletons': 'Moletons / Hoodies',
      'moletom': 'Moletom / Hoodie'
    };
    const key = String(catKey).toLowerCase().trim();
    if (map[key]) return map[key];
    return catKey.charAt(0).toUpperCase() + catKey.slice(1).replace(/[-_]/g, ' ');
  };

  const formatFitLabel = (fitKey) => {
    if (!fitKey) return '';
    const map = {
      'boxy': 'Boxy Fit',
      'oversized': 'Oversized Fit',
      'normal': 'Normal / Regular Fit',
      'regular': 'Normal / Regular Fit',
      'regata': 'Regata Athletic',
      'slim': 'Slim Fit',
      'wide_leg': 'Wide Leg',
      'wide-leg': 'Wide Leg',
      'cargo': 'Cargo Fit',
      'cropped': 'Cropped Fit',
      'drop_shoulder': 'Drop Shoulder Fit',
      'drop-shoulder': 'Drop Shoulder Fit',
      'street': 'Street Fit',
      'unico': 'Tamanho Único',
      'único': 'Tamanho Único'
    };
    const key = String(fitKey).toLowerCase().trim();
    if (map[key]) return map[key];
    return fitKey.charAt(0).toUpperCase() + fitKey.slice(1).replace(/[-_]/g, ' ') + (key.toLowerCase().includes('fit') ? '' : ' Fit');
  };

  // Contagem dinâmica de produtos por categoria
  const categoryCounts = useMemo(() => {
    const counts = { all: products.length };
    products.forEach(p => {
      const cat = (p.category || p.type || 'camisa').toLowerCase();
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Tabs dinâmicos de categoria para o topo da tabela
  const categoryTabs = useMemo(() => {
    const counts = {};
    products.forEach(p => {
      const cat = (p.category || p.type || 'camisa').toLowerCase();
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const CATEGORY_NAMES = {
      'camisa': 'CAMISETAS',
      'jaqueta': 'JAQUETAS',
      'calca': 'CALÇAS',
      'brinde': 'BRINDES',
      'gift-card': 'VALE-PRESENTE'
    };

    // Garante que as categorias base ou qualquer nova categoria com produtos apareça
    const allKeys = Array.from(new Set([
      'camisa', 'jaqueta', 'calca', 'brinde',
      ...Object.keys(counts)
    ]));

    const list = [{ id: 'all', label: 'TODOS', count: products.length }];

    allKeys.forEach(key => {
      const count = counts[key] || 0;
      // Exibe categorias padrão ou categorias que possuam ao menos 1 item
      if (count > 0 || ['camisa', 'jaqueta', 'calca', 'brinde'].includes(key)) {
        const label = CATEGORY_NAMES[key] || key.toUpperCase().replace(/[-_]/g, ' ');
        list.push({ id: key, label, count });
      }
    });

    return list;
  }, [products]);

  // Modelagens (Fits) dinâmicas mapeadas exclusivamente dos produtos cadastrados no sistema
  const fitOptions = useMemo(() => {
    const counts = {};
    products.forEach(p => {
      if (p.type === 'brinde' || p.category === 'brinde') return;
      const fit = String(p.fit || '').trim().toLowerCase();
      if (!fit || fit === 'único' || fit === 'unico' || fit === 'padrão' || fit === 'padrao') return;
      counts[fit] = (counts[fit] || 0) + 1;
    });

    const FIT_LABELS = {
      'boxy': 'Boxy Fit',
      'oversized': 'Oversized Fit',
      'normal': 'Normal / Regular Fit',
      'regular': 'Normal / Regular Fit',
      'regata': 'Regata',
      'slim': 'Slim Fit',
      'wide_leg': 'Wide Leg',
      'wide-leg': 'Wide Leg',
      'cargo': 'Cargo Fit',
      'cropped': 'Cropped Fit',
      'drop_shoulder': 'Drop Shoulder Fit',
      'drop-shoulder': 'Drop Shoulder Fit',
      'street': 'Street Fit'
    };

    return Object.keys(counts).sort().map(fitKey => {
      const formattedLabel = FIT_LABELS[fitKey] || (
        fitKey.charAt(0).toUpperCase() + fitKey.slice(1).replace(/[-_]/g, ' ') + (fitKey.toLowerCase().includes('fit') ? '' : ' Fit')
      );
      return {
        key: fitKey,
        label: formattedLabel,
        count: counts[fitKey]
      };
    });
  }, [products]);

  // Opções para o select de categoria no formulário de cadastro/edição
  const formCategoryOptions = useMemo(() => {
    const baseOptions = [
      { value: 'camisa', label: 'Camiseta / Camisa' },
      { value: 'jaqueta', label: 'Jaqueta / Moletom' },
      { value: 'calca', label: 'Calça / Bermuda' },
      { value: 'brinde', label: 'Brinde / Acessório' },
      { value: 'gift-card', label: 'Vale-Presente' }
    ];

    const existingKeys = new Set(baseOptions.map(o => o.value));
    const merged = [...baseOptions];

    // Inclui categorias encontradas em produtos existentes
    products.forEach(p => {
      const cat = (p.category || '').trim().toLowerCase();
      if (cat && !existingKeys.has(cat)) {
        existingKeys.add(cat);
        merged.push({
          value: cat,
          label: formatCategoryLabel(cat)
        });
      }
    });

    // Inclui categorias customizadas criadas nesta sessão
    customCategories.forEach(custom => {
      if (!existingKeys.has(custom.key)) {
        existingKeys.add(custom.key);
        merged.push({
          value: custom.key,
          label: custom.label
        });
      }
    });

    return merged;
  }, [products, customCategories]);

  // Opções para o select de modelagem no formulário de cadastro/edição
  const formFitOptions = useMemo(() => {
    const baseFits = [
      { value: 'boxy', label: 'Boxy Fit' },
      { value: 'oversized', label: 'Oversized Fit' },
      { value: 'normal', label: 'Normal / Regular Fit' },
      { value: 'regata', label: 'Regata Athletic' },
      { value: 'slim', label: 'Slim Fit' },
      { value: 'wide_leg', label: 'Wide Leg' },
      { value: 'cargo', label: 'Cargo Fit' },
      { value: 'cropped', label: 'Cropped Fit' },
      { value: 'drop_shoulder', label: 'Drop Shoulder Fit' }
    ];

    const existingKeys = new Set(baseFits.map(f => f.value));
    const merged = [...baseFits];

    // Inclui fits encontrados em produtos existentes
    products.forEach(p => {
      const fit = (p.fit || '').trim().toLowerCase();
      if (fit && fit !== 'único' && fit !== 'unico' && !existingKeys.has(fit)) {
        existingKeys.add(fit);
        merged.push({
          value: fit,
          label: formatFitLabel(fit)
        });
      }
    });

    // Inclui fits customizados criados nesta sessão
    customFits.forEach(custom => {
      if (!existingKeys.has(custom.key)) {
        existingKeys.add(custom.key);
        merged.push({
          value: custom.key,
          label: custom.label
        });
      }
    });

    return merged;
  }, [products, customFits]);

  // Limpa todos os filtros e ordenações da tabela
  const handleClearAllFilters = () => {
    setSearchTerm('');
    setSelectedFilter('all');
    setFitFilter('all');
    setStatusFilter('all');
    setSortConfig({ key: null, direction: 'none' });
  };

  // Filtragem e Ordenação Completa na Tabela
  const filteredAndSortedProducts = useMemo(() => {
    let list = [...products];

    // 1. Modelagem (Fit)
    if (fitFilter !== 'all') {
      list = list.filter(p => (p.fit || '').toLowerCase() === fitFilter.toLowerCase());
    }

    // 3. Status / Estoque / Promoção
    if (statusFilter !== 'all') {
      list = list.filter(p => {
        const totalStock = p.stock 
          ? Object.values(p.stock).reduce((a, b) => a + (Number(b) || 0), 0)
          : (p.totalStock ?? 50);

        const priceValue = parseFloat(p.price || p.priceNum || 0);
        const discountPriceValue = parseFloat(p.discountPrice || 0);
        const hasDiscount = Boolean(discountPriceValue > 0 && discountPriceValue < priceValue && p.discountActive !== false);

        if (statusFilter === 'unlimited') return Boolean(p.unlimitedStock || p.isUnlimitedStock);
        if (statusFilter === 'in_stock') return (p.unlimitedStock || p.isUnlimitedStock) ? true : totalStock > 5;
        if (statusFilter === 'low_stock') return (p.unlimitedStock || p.isUnlimitedStock) ? false : (totalStock > 0 && totalStock <= 5);
        if (statusFilter === 'out_of_stock') return (p.unlimitedStock || p.isUnlimitedStock) ? false : totalStock === 0;
        if (statusFilter === 'on_sale') return hasDiscount;
        if (statusFilter === 'release') return p.isRelease === true;
        if (statusFilter === 'featured') return p.isFeatured === true;
        if (statusFilter === 'free_shipping') return Boolean(p.freeShipping || p.hasFreeShipping);
        return true;
      });
    }

    // 4. Busca Textual
    if (searchTerm && searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(p => {
        const name = (p.name || p.title || '').toLowerCase();
        const drop = (p.drop || '').toLowerCase();
        const category = (p.category || '').toLowerCase();
        const fit = (p.fit || '').toLowerCase();
        const badge = (p.customBadge || '').toLowerCase();
        const id = String(p.id || '').toLowerCase();
        return name.includes(q) || drop.includes(q) || category.includes(q) || fit.includes(q) || badge.includes(q) || id.includes(q);
      });
    }

    // 5. Ordenação Interativa
    if (sortConfig.key && sortConfig.direction !== 'none') {
      const { key, direction } = sortConfig;
      list.sort((a, b) => {
        if (key === 'name') {
          const nameA = a.name || a.title || '';
          const nameB = b.name || b.title || '';
          const comp = nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
          return direction === 'asc' ? comp : -comp;
        }
        if (key === 'category') {
          const catA = `${a.category || ''} ${a.fit || ''}`;
          const catB = `${b.category || ''} ${b.fit || ''}`;
          const comp = catA.localeCompare(catB, 'pt-BR', { sensitivity: 'base' });
          return direction === 'asc' ? comp : -comp;
        }
        if (key === 'price') {
          const prA = parseFloat(a.price || a.priceNum || 0);
          const prB = parseFloat(b.price || b.priceNum || 0);
          return direction === 'asc' ? prA - prB : prB - prA;
        }
        if (key === 'badge') {
          const bA = a.customBadge || (a.isRelease ? 'LANÇAMENTO' : '');
          const bB = b.customBadge || (b.isRelease ? 'LANÇAMENTO' : '');
          const comp = bA.localeCompare(bB, 'pt-BR', { sensitivity: 'base' });
          return direction === 'asc' ? comp : -comp;
        }
        if (key === 'stock') {
          const stA = a.stock ? Object.values(a.stock).reduce((s, v) => s + (Number(v) || 0), 0) : 50;
          const stB = b.stock ? Object.values(b.stock).reduce((s, v) => s + (Number(v) || 0), 0) : 50;
          return direction === 'asc' ? stA - stB : stB - stA;
        }
        return 0;
      });
    }

    return list;
  }, [products, fitFilter, statusFilter, searchTerm, sortConfig]);

  return (
    <div className={styles.catalogAdmin}>
      {/* HEADER DA PÁGINA */}
      <header className={styles.header}>
        <div>
          <span className={styles.breadcrumb}>CMS / CATÁLOGO & ESTOQUE</span>
          <h1 className={styles.title}>GESTÃO DE PRODUTOS & SKUS</h1>
        </div>
        <button onClick={handleOpenCreate} className={styles.createBtn}>
          <Plus size={16} />
          <span>ADICIONAR NOVO ITEM</span>
        </button>
      </header>

      {/* BARRA DE CONTROLE & BUSCA */}
      <div className={styles.controlBar}>
        <div className={styles.controlBarTop}>
          <div className={styles.searchBox}>
            <Search size={15} className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Buscar por nome da peça, estampa, SKU ou badge..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className={styles.clearSearchBtn} aria-label="Limpar busca">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* SUB-BARRA COM SELETORES DE FIT, STATUS & CONTADOR */}
        <div className={styles.controlBarBottom}>
          <div className={styles.filterSelectorsGroup}>
            {/* SELETOR DE MODELAGEM / FIT DINÂMICO */}
            <div className={styles.filterSelectWrapper}>
              <Layers size={13} className={styles.filterSelectIcon} />
              <select 
                value={fitFilter}
                onChange={(e) => setFitFilter(e.target.value)}
                className={styles.filterSelect}
                title="Filtrar por Modelagem Disponível"
              >
                <option value="all">Todas as Modelagens ({fitOptions.reduce((acc, f) => acc + f.count, 0)})</option>
                {fitOptions.map(f => (
                  <option key={f.key} value={f.key}>
                    {f.label} ({f.count})
                  </option>
                ))}
              </select>
            </div>

            {/* SELETOR DE STATUS / ESTOQUE */}
            <div className={styles.filterSelectWrapper}>
              <Filter size={13} className={styles.filterSelectIcon} />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={styles.filterSelect}
                title="Filtrar por Status de Estoque e Destaque"
              >
                <option value="all">Todos os Status</option>
                <option value="unlimited">Estoque Ilimitado (Sob Demanda)</option>
                <option value="in_stock">Estoque Saudável (&gt; 5 un.)</option>
                <option value="low_stock">Estoque Baixo (≤ 5 un.)</option>
                <option value="out_of_stock">Esgotados (0 un.)</option>
                <option value="on_sale">Em Promoção / Desconto</option>
                <option value="release">Lançamentos</option>
                <option value="featured">Destaques da Vitrine</option>
                <option value="free_shipping">Com Frete Grátis</option>
              </select>
            </div>
          </div>

          <div className={styles.tableMetaInfo}>
            <span className={styles.tableMetaCount}>
              {filteredAndSortedProducts.length} {filteredAndSortedProducts.length === 1 ? 'produto listado' : 'produtos listados'}
              {(searchTerm || fitFilter !== 'all' || statusFilter !== 'all') && ` (de ${products.length})`}
            </span>
            {(searchTerm || fitFilter !== 'all' || statusFilter !== 'all' || (sortConfig.key && sortConfig.direction !== 'none')) && (
              <button 
                type="button" 
                onClick={handleClearAllFilters}
                className={styles.resetSortBtn}
                title="Limpar todos os filtros e ordenações"
              >
                <RotateCw size={11} />
                <span>Limpar Filtros</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TABELA DE PRODUTOS */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '90px', textAlign: 'center' }}>POSIÇÃO</th>
              <th>IMAGEM</th>
              <th 
                onClick={() => handleSort('name')} 
                className={styles.sortableTh}
                title="Clique para ordenar por Nome"
              >
                <div className={styles.thSortContent}>
                  <span>NOME DO PRODUTO</span>
                  {renderSortIcon('name')}
                </div>
              </th>
              <th 
                onClick={() => handleSort('category')} 
                className={styles.sortableTh}
                title="Clique para ordenar por Categoria / Modelagem"
              >
                <div className={styles.thSortContent}>
                  <span>CATEGORIA / FIT</span>
                  {renderSortIcon('category')}
                </div>
              </th>
              <th 
                onClick={() => handleSort('price')} 
                className={styles.sortableTh}
                title="Clique para ordenar por Preço"
              >
                <div className={styles.thSortContent}>
                  <span>PREÇO & DESCONTO</span>
                  {renderSortIcon('price')}
                </div>
              </th>
              <th 
                onClick={() => handleSort('badge')} 
                className={styles.sortableTh}
                title="Clique para ordenar por Badge"
              >
                <div className={styles.thSortContent}>
                  <span>BADGE</span>
                  {renderSortIcon('badge')}
                </div>
              </th>
              <th 
                onClick={() => handleSort('stock')} 
                className={styles.sortableTh}
                title="Clique para ordenar por Estoque Total"
              >
                <div className={styles.thSortContent}>
                  <span>ESTOQUE TOTAL</span>
                  {renderSortIcon('stock')}
                </div>
              </th>
              <th>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className={styles.centerText}>
                  <div className={styles.loadingWrapper}>
                    <Package size={20} className={styles.spinningIcon} />
                    <span>Carregando catálogo do Firestore...</span>
                  </div>
                </td>
              </tr>
            ) : filteredAndSortedProducts.length === 0 ? (
              <tr>
                <td colSpan="8" className={styles.centerText}>
                  <div className={styles.emptyWrapper}>
                    <AlertCircle size={20} />
                    <span>
                      {searchTerm || fitFilter !== 'all' || statusFilter !== 'all'
                        ? 'Nenhum produto encontrado com os filtros selecionados.'
                        : 'Nenhum produto cadastrado no catálogo.'}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredAndSortedProducts.map((prod, index) => {
                const totalUnits = prod.stock 
                  ? Object.values(prod.stock).reduce((a, b) => a + (Number(b) || 0), 0)
                  : 50;

                const priceValue = parseFloat(prod.price || prod.priceNum || 0);
                const discountPriceValue = parseFloat(prod.discountPrice || 0);
                const hasDiscount = Boolean(discountPriceValue > 0 && discountPriceValue < priceValue && prod.discountActive !== false);
                const naturalIndex = products.findIndex(p => p.id === prod.id);
                const posNumber = naturalIndex >= 0 ? naturalIndex + 1 : index + 1;

                return (
                  <tr 
                    key={prod.id} 
                    className={`${styles.tableRow} ${draggedRowIndex === index ? styles.rowDragging : ''} ${dragOverRowIndex === index ? styles.rowDragOver : ''}`}
                    draggable={canReorder}
                    onDragStart={(e) => handleRowDragStart(e, index)}
                    onDragOver={(e) => handleRowDragOver(e, index)}
                    onDragLeave={handleRowDragLeave}
                    onDrop={(e) => handleRowDrop(e, index)}
                    onDragEnd={handleRowDragEnd}
                  >
                    <td>
                      <div className={styles.positionCell}>
                        <div 
                          className={styles.dragHandle} 
                          title={canReorder ? "Clique e arraste para mudar a posição no catálogo" : "Limpe filtros e ordenação para reordenar"}
                          style={{ cursor: canReorder ? 'grab' : 'default', opacity: canReorder ? 1 : 0.3 }}
                        >
                          <GripVertical size={14} />
                        </div>
                        <span className={styles.positionNumber}>#{posNumber}</span>
                        {canReorder && (
                          <div className={styles.arrowOrderGroup}>
                            <button
                              type="button"
                              onClick={() => handleMoveRow(index, index - 1)}
                              disabled={index === 0}
                              className={styles.arrowOrderBtn}
                              title="Mover para cima"
                            >
                              <ChevronUp size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveRow(index, index + 1)}
                              disabled={index === products.length - 1}
                              className={styles.arrowOrderBtn}
                              title="Mover para baixo"
                            >
                              <ChevronDown size={11} />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className={styles.thumbWrapper}>
                        <img src={prod.image} alt={prod.name || prod.title} className={styles.thumbImage} />
                      </div>
                    </td>
                    <td>
                      <strong className={styles.productName}>{prod.name || prod.title}</strong>
                      <span className={styles.productDrop}>
                        {prod.drop === 'leak-two' ? 'LEAK TWO' : (prod.drop?.toUpperCase() || 'DROP REGULAR')}
                      </span>
                    </td>
                    <td>
                      <span className={styles.categoryBadge}>{(prod.category || 'CAMISA').toUpperCase()}</span>
                      <small className={styles.fitText}>
                        {Array.isArray(prod.fits) && prod.fits.length > 0 
                          ? prod.fits.join(' • ')
                          : `${(prod.fit || 'BOXY').toUpperCase()}`}
                      </small>
                    </td>
                    <td>
                      <div className={styles.priceColumn}>
                        <strong>R$ {priceValue.toFixed(2)}</strong>
                        {hasDiscount && (
                          <span className={styles.discountTag}>
                            -{Math.round(((priceValue - discountPriceValue) / priceValue) * 100)}% OFF
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                        {prod.customBadge && prod.customBadge.trim() ? (
                          <span className={styles.customBadge}>{prod.customBadge.trim()}</span>
                        ) : (
                          <span className={styles.noBadge}>Sem Badge</span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleToggleFreeShipping(prod)}
                          disabled={savingFreeShippingId === prod.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.22rem 0.5rem',
                            borderRadius: '3px',
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            letterSpacing: '0.5px',
                            background: (prod.freeShipping || prod.hasFreeShipping) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                            border: (prod.freeShipping || prod.hasFreeShipping) ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                            color: (prod.freeShipping || prod.hasFreeShipping) ? '#10b981' : 'var(--text-muted)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          title={(prod.freeShipping || prod.hasFreeShipping) ? 'Clique para desativar frete grátis nesta peça' : 'Clique para ativar frete grátis nesta peça com 1 clique'}
                        >
                          <Check size={10} style={{ opacity: (prod.freeShipping || prod.hasFreeShipping) ? 1 : 0.3 }} />
                          <span>{(prod.freeShipping || prod.hasFreeShipping) ? 'FRETE GRÁTIS' : 'FRETE PADRÃO'}</span>
                        </button>
                      </div>
                    </td>
                    <td>
                      {prod.unlimitedStock || prod.isUnlimitedStock ? (
                        <span className={styles.unlimitedStockTag}>
                          <InfinityIcon size={12} />
                          <span>ILIMITADO</span>
                        </span>
                      ) : (
                        <span className={`${styles.stockBadge} ${totalUnits === 0 ? styles.outOfStock : ''}`}>
                          {totalUnits > 0 ? `${totalUnits} un.` : 'ESGOTADO'}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className={styles.actionsGroup}>
                        <button 
                          onClick={() => handleOpenEdit(prod)} 
                          className={styles.editBtn}
                          title="Editar Produto"
                        >
                          <Pencil size={13} />
                          <span>Editar</span>
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(prod.id)} 
                          className={styles.deleteBtn}
                          title="Excluir Produto"
                        >
                          <Trash2 size={13} />
                          <span>Excluir</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* BARRA FLUTUANTE DE SALVAR REORDENAÇÃO */}
      {hasPendingOrderChanges && (
        <div className={styles.floatingSaveOrderBar}>
          <div className={styles.floatingBarInfo}>
            <div className={styles.floatingStatusDot} />
            <div>
              <strong className={styles.floatingBarTitle}>ORDEM DO CATÁLOGO ALTERADA</strong>
              <p className={styles.floatingBarText}>
                As posições das peças foram reorganizadas. Deseja aplicar essa sequência na vitrine pública?
              </p>
            </div>
          </div>
          <div className={styles.floatingBarActions}>
            <button
              type="button"
              onClick={handleCancelReorder}
              disabled={isSavingOrder}
              className={styles.floatingCancelBtn}
            >
              DESCARTAR
            </button>
            <button
              type="button"
              onClick={handleSaveReorderedList}
              disabled={isSavingOrder}
              className={styles.floatingSaveBtn}
            >
              {isSavingOrder ? (
                <>
                  <RotateCw size={13} className={styles.spinning} />
                  <span>SALVANDO...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>SALVAR ORDEM NO CATÁLOGO</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* DRAWER / MODAL LATERAL DE CRIAÇÃO & EDIÇÃO */}
      {isFormOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsFormOpen(false)}>
          <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div className={styles.drawerTitleBox}>
                <ShoppingBag size={18} className={styles.drawerIcon} />
                <h2>{editingId ? 'EDITAR PRODUTO' : 'CRIAR NOVO PRODUTO'}</h2>
              </div>
              <button onClick={() => setIsFormOpen(false)} className={styles.closeDrawerBtn} aria-label="Fechar formulário">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitProduct} className={styles.drawerForm}>
              {/* BLOCO 1: IDENTIFICAÇÃO & PREÇO */}
              <div className={styles.formSectionBlock}>
                <div className={styles.sectionBlockHeader}>
                  <div className={styles.sectionBlockTitle}>
                    <span className={styles.sectionBlockNumber}>1</span>
                    <span>IDENTIFICAÇÃO & PREÇOS</span>
                  </div>
                  <div className={styles.typeSwitcher}>
                    <button
                      type="button"
                      className={`${styles.switchBtn} ${formData.type === 'vestuario' ? styles.activeSwitch : ''}`}
                      onClick={() => setFormData({ ...formData, type: 'vestuario', category: 'camisa' })}
                    >
                      VESTUÁRIO
                    </button>
                    <button
                      type="button"
                      className={`${styles.switchBtn} ${formData.type === 'brinde' ? styles.activeSwitch : ''}`}
                      onClick={() => setFormData({ ...formData, type: 'brinde', category: 'brinde', fit: 'único' })}
                    >
                      BRINDE / VALE
                    </button>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>NOME DA PEÇA *</label>
                  <input 
                    type="text" 
                    name="name"
                    placeholder="Ex: Camiseta THR33 Boxy Heavy Black"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                  {formData.name.trim() && (
                    <span className={styles.slugPreview}>
                      URL amigável: <code>/produto/{generateSlug(formData.name)}</code>
                    </span>
                  )}
                </div>

                <div className={styles.priceGridRow}>
                  {formData.type === 'brinde' && (
                    <div className={styles.formGroup}>
                      <label>
                        VALOR DO BRINDE (R$)
                        <InfoTooltip text="Valor de referência do brinde." title="Valor" />
                      </label>
                      <input 
                        type="text" 
                        name="priceFormatted"
                        placeholder="R$ 0,00"
                        value={formData.priceFormatted || (formData.price ? formatCurrencyInput(formData.price) : '')}
                        onChange={handlePriceChange}
                      />
                    </div>
                  )}

                  <div className={styles.formGroup} style={{ flex: 1 }}>
                    <label>
                      BADGE PERSONALIZADO (OPCIONAL)
                      <InfoTooltip text="Destaque visual sobre a imagem do card na vitrine e catálogo (ex: NOVO DROP, EXCLUSIVO)." title="Tag Promocional" />
                    </label>
                    <input 
                      type="text" 
                      name="customBadge"
                      placeholder="Ex: NOVO DROP, EDIÇÃO LIMITADA..."
                      value={formData.customBadge}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              {/* BLOCO 2: FOTOS DO PRODUTO (FIREBASE STORAGE) */}
              <div className={styles.formSectionBlock}>
                <div className={styles.sectionBlockHeader}>
                  <div className={styles.sectionBlockTitle}>
                    <span className={styles.sectionBlockNumber}>2</span>
                    <span>FOTOS DA PEÇA & CAPA (FIREBASE STORAGE)</span>
                  </div>
                  <InfoTooltip 
                    text="Arraste quantas fotos quiser para o upload direto no Storage. Defina a foto de capa e vincule cores a fotos para o carrossel do cliente." 
                    title="Galeria e Capa" 
                  />
                </div>

                {/* DROPZONE DE UPLOAD COM DRAG & DROP 100% FUNCIONAL */}
                <div 
                  className={`${styles.uploadDropzone} ${isDraggingFiles ? styles.uploadDropzoneActive : ''}`}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingFiles(true); }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingFiles(true); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingFiles(false); }}
                  onDrop={handleDropFiles}
                >
                  <input 
                    type="file" 
                    id="productImagesUpload"
                    multiple 
                    accept="image/*" 
                    onChange={handleUploadFiles} 
                    className={styles.uploadInputHidden}
                    disabled={isUploadingImages}
                  />
                  <label htmlFor="productImagesUpload" className={styles.uploadDropzoneLabel}>
                    <Upload size={24} className={styles.uploadIcon} />
                    <strong>ARRASTE FOTOS AQUI OU CLIQUE PARA SELECIONAR</strong>
                    <span>Envie múltiplas imagens (.jpg, .png, .webp). Upload automático para o Storage.</span>
                  </label>
                </div>

                {isUploadingImages && (
                  <div className={styles.uploadProgressBar}>
                    <RotateCw size={14} className={styles.spinningIcon} />
                    <span>{uploadStatusText || 'Enviando imagens para o Firebase Storage...'}</span>
                  </div>
                )}

                {storageWarning && (
                  <div style={{
                    backgroundColor: 'rgba(234, 179, 8, 0.12)',
                    border: '1px solid rgba(234, 179, 8, 0.4)',
                    color: '#facc15',
                    padding: '0.85rem 1rem',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.6rem',
                    lineHeight: 1.5
                  }}>
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#facc15' }} />
                    <div style={{ flex: 1 }}>
                      <strong style={{ color: '#ffffff', display: 'block', marginBottom: '0.2rem' }}>Aviso sobre o Firebase Storage:</strong>
                      <span>{storageWarning}</span>
                    </div>
                  </div>
                )}

                {/* BOTÃO PARA INSERIR URL EXTERNA (OPCIONAL) */}
                <div className={styles.externalUrlRow}>
                  {!showUrlInput ? (
                    <button 
                      type="button" 
                      onClick={() => setShowUrlInput(true)} 
                      className={styles.addUrlToggleBtn}
                    >
                      <LinkIcon size={12} />
                      <span>Inserir imagem por link externo (opcional)</span>
                    </button>
                  ) : (
                    <div className={styles.urlInputBox}>
                      <input 
                        type="url" 
                        placeholder="Cole a URL da imagem (https://...)" 
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        className={styles.urlInputField}
                      />
                      <button type="button" onClick={handleAddUrlImage} className={styles.confirmUrlBtn}>
                        <Check size={13} />
                        <span>Adicionar</span>
                      </button>
                      <button type="button" onClick={() => setShowUrlInput(false)} className={styles.cancelUrlBtn}>
                        <X size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* LISTAGEM E ORDENAÇÃO DE IMAGENS */}
                {imagesList.length > 0 ? (
                  <div className={styles.imagesGrid}>
                    {imagesList.map((img, index) => {
                      const linkedColor = formData.colors.find(c => c.id === img.colorId);

                      return (
                        <div 
                          key={img.id || index}
                          className={`${styles.imageCard} ${img.isCover ? styles.coverCard : ''} ${draggedImageIndex === index ? styles.imageCardDragging : ''}`}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, index)}
                        >
                          <div className={styles.imageCardThumbWrap}>
                            <img src={img.url} alt={img.name || `Foto ${index + 1}`} className={styles.imageCardThumb} />
                            
                            {img.isCover ? (
                              <span className={styles.coverBadge}>
                                <Star size={10} />
                                <span>FOTO DE CAPA</span>
                              </span>
                            ) : (
                              <button 
                                type="button" 
                                onClick={() => handleSetCoverImage(index)}
                                className={styles.setCoverBtn}
                                title="Definir esta foto como capa principal"
                              >
                                <Star size={11} />
                                <span>Definir Capa</span>
                              </button>
                            )}

                            <span className={styles.dragHandle} title="Arraste para reposicionar">
                              <GripVertical size={14} />
                            </span>
                          </div>

                          <div className={styles.imageCardDetails}>
                            {/* VÍNCULO COM COR */}
                            <div className={styles.imageColorPickerRow}>
                              <Palette size={12} className={styles.paletteIcon} />
                              <select 
                                value={img.colorId || ''} 
                                onChange={(e) => handleImageColorChange(index, e.target.value)}
                                className={styles.imageColorSelect}
                                title="Vincular esta foto a uma cor específica para o carrossel do cliente"
                              >
                                <option value="">Todas as Cores (Neutra)</option>
                                {formData.colors.map(col => (
                                  <option key={col.id} value={col.id}>
                                    Cor: {col.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {linkedColor && (
                              <div className={styles.linkedColorPill}>
                                <span className={styles.colorPillDot} style={{ backgroundColor: linkedColor.hex }} />
                                <span>{linkedColor.name}</span>
                              </div>
                            )}

                            {/* CONTROLES DE POSIÇÃO E EXCLUSÃO */}
                            <div className={styles.imageCardControls}>
                              <div className={styles.reorderBtnsGroup}>
                                <button 
                                  type="button" 
                                  onClick={() => handleMoveImage(index, index - 1)}
                                  disabled={index === 0}
                                  className={styles.moveBtn}
                                  title="Mover para a esquerda"
                                >
                                  <ChevronLeft size={13} />
                                </button>
                                <span className={styles.imageIndexBadge}>{index + 1}</span>
                                <button 
                                  type="button" 
                                  onClick={() => handleMoveImage(index, index + 1)}
                                  disabled={index === imagesList.length - 1}
                                  className={styles.moveBtn}
                                  title="Mover para a direita"
                                >
                                  <ChevronRight size={13} />
                                </button>
                              </div>

                              <button 
                                type="button" 
                                onClick={() => handleRemoveImage(index)}
                                className={styles.removeImageBtn}
                                title="Remover imagem"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.noImagesNotice}>
                    <span>Nenhuma foto adicionada ainda. Envie pelo menos 1 imagem para a capa.</span>
                  </div>
                )}
              </div>

              {/* BLOCO 3: MODELAGENS & ESTOQUE */}
              <div className={styles.formSectionBlock}>
                <div className={styles.sectionBlockHeader}>
                  <div className={styles.sectionBlockTitle}>
                    <span className={styles.sectionBlockNumber}>3</span>
                    <span>MODELAGENS & ESTOQUE</span>
                  </div>
                </div>

                {/* SELEÇÃO MÚLTIPLA DE MODELAGENS (FITS) */}
                <div className={styles.formGroup}>
                  <div className={styles.labelWithAction}>
                    <label>MODELAGENS DISPONÍVEIS NESTA PEÇA (FITS) *</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      {customFits.length > 0 && (
                        <button
                          type="button"
                          onClick={handleResetCustomFits}
                          className={styles.resetCustomFitsBtn}
                          title="Restaurar lista para os 3 fits oficiais da marca"
                        >
                          <RotateCw size={11} />
                          <span>Limpar extras</span>
                        </button>
                      )}
                      {!isAddingFit && (
                        <button
                          type="button"
                          onClick={() => { setIsAddingFit(true); setNewFitName(''); }}
                          className={styles.addInlineBtn}
                          title="Criar nova modelagem customizada"
                        >
                          <Plus size={11} />
                          <span>Novo Fit</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {isAddingFit && (
                    <div className={styles.inlineAddBox} style={{ marginBottom: '0.65rem' }}>
                      <input
                        type="text"
                        placeholder="Nome do fit (ex: Cropped, Street...)"
                        value={newFitName}
                        onChange={(e) => setNewFitName(e.target.value)}
                        autoFocus
                        className={styles.inlineInput}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleConfirmAddFit();
                          }
                        }}
                      />
                      <div className={styles.inlineActions}>
                        <button
                          type="button"
                          onClick={handleConfirmAddFit}
                          className={styles.inlineConfirmBtn}
                          title="Confirmar modelagem"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setIsAddingFit(false); setNewFitName(''); }}
                          className={styles.inlineCancelBtn}
                          title="Cancelar"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className={styles.fitChipsGrid}>
                    {allAvailableFitOptions.map((fitOption) => {
                      const isSelected = (formData.fits || []).some(f => normalizeFitSlug(f) === normalizeFitSlug(fitOption));
                      const isOfficial = OFFICIAL_THR33_FITS.some(f => normalizeFitSlug(f) === normalizeFitSlug(fitOption));

                      return (
                        <button
                          key={fitOption}
                          type="button"
                          onClick={() => toggleFitSelection(fitOption)}
                          className={`${styles.fitChipBtn} ${isSelected ? styles.fitChipBtnSelected : ''}`}
                        >
                          <span className={styles.fitChipCheck}>
                            {isSelected ? '✓' : '+'}
                          </span>
                          <span className={styles.fitChipText}>{fitOption}</span>

                          {!isOfficial && (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => handleDeleteCustomFit(e, fitOption)}
                              className={styles.fitChipRemoveBtn}
                              title={`Excluir permanentemente "${fitOption}" da lista`}
                              aria-label={`Excluir ${fitOption}`}
                            >
                              <X size={12} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
                    O cliente poderá alternar livremente entre essas modelagens direto na página do produto antes de adicionar à sacola.
                  </small>

                  {/* VALOR DE VENDA POR MODELAGEM (R$) */}
                  {Array.isArray(formData.fits) && formData.fits.length > 0 && (
                    <div className={styles.fitPricesContainer}>
                      <div className={styles.subSectionHeader}>
                        <div>
                          <label className={styles.subSectionLabel}>
                            VALOR DE VENDA POR MODELAGEM (R$) *
                          </label>
                          <p className={styles.fieldHint}>
                            Defina o preço específico cobrado do cliente para cada corte selecionado acima:
                          </p>
                        </div>
                        {formData.fits.length > 1 && (
                          <button
                            type="button"
                            onClick={handleCopyPriceToAllFits}
                            className={styles.copyBasePriceBtn}
                            title="Aplica o preço da 1ª modelagem para todas as outras"
                          >
                            Copiar 1º Preço para Todas
                          </button>
                        )}
                      </div>

                      <div className={styles.fitPricesGrid}>
                        {formData.fits.map((fitOption) => {
                          const slug = normalizeFitSlug(fitOption);
                          const rawVal = formData.fitPrices?.[slug] ?? formData.fitPrices?.[fitOption] ?? formData.price ?? 150;
                          return (
                            <div key={fitOption} className={styles.fitPriceCard}>
                              <span className={styles.fitPriceName}>{formatFitLabel(fitOption)}</span>
                              <div className={styles.priceInputWrapper}>
                                <span className={styles.currencyPrefix}>R$</span>
                                <input
                                  type="text"
                                  value={formatCurrencyInput(rawVal).replace(/^R\$\s*/, '')}
                                  onChange={(e) => handleFitPriceChange(fitOption, e.target.value)}
                                  className={styles.fitPriceInput}
                                  placeholder="150,00"
                                  required
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* GESTÃO DE CORES */}
                <div className={styles.colorsManagerSection}>
                  <div className={styles.gallerySectionHeader}>
                    <div className={styles.galleryHeaderTitle}>
                      <Palette size={16} />
                      <label>CORES DO PRODUTO (GERENCIAMENTO & VÍNCULO)</label>
                    </div>
                    <InfoTooltip 
                      text="Cadastre as variações de cor da peça. O cliente poderá selecionar a cor e o carrossel exibirá automaticamente a foto correspondente." 
                      title="Cores da Peça" 
                    />
                  </div>

                  {/* PRESETS RÁPIDOS */}
                  <div className={styles.colorPresetsRow}>
                    <span className={styles.presetsLabel}>Sugestões Streetwear:</span>
                    <div className={styles.presetChipsList}>
                      {COLOR_PRESETS.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => handleApplyColorPreset(p)}
                          className={styles.presetChip}
                          title={`Adicionar cor ${p.name}`}
                        >
                          <span className={styles.colorPillDot} style={{ backgroundColor: p.hex }} />
                          <span>{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ADICIONAR NOVA COR CUSTOMIZADA */}
                  <div className={styles.addColorInlineRow}>
                    <input 
                      type="color" 
                      value={newColorHex}
                      onChange={(e) => setNewColorHex(e.target.value)}
                      className={styles.colorPickerInput}
                      title="Escolha a tonalidade da cor"
                    />
                    <input 
                      type="text" 
                      placeholder="Nome da cor (ex: Preto Piano, Off-White Heavy...)" 
                      value={newColorName}
                      onChange={(e) => setNewColorName(e.target.value)}
                      className={styles.colorNameInput}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddColor();
                        }
                      }}
                    />
                    <button 
                      type="button" 
                      onClick={handleAddColor} 
                      className={styles.addColorBtn}
                    >
                      <Plus size={13} />
                      <span>Adicionar Cor</span>
                    </button>
                  </div>

                  {/* LISTA DE CORES ATIVAS */}
                  <div className={styles.activeColorsTagsList}>
                    {formData.colors.map((c) => (
                      <div key={c.id} className={styles.activeColorTag}>
                        <span className={styles.colorTagDot} style={{ backgroundColor: c.hex }} />
                        <strong className={styles.colorTagName}>{c.name}</strong>
                        {formData.colors.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveColor(c.id)}
                            className={styles.removeColorBtn}
                            title={`Remover cor ${c.name}`}
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* CHECKBOX DE ESTOQUE POR COR */}
                  <div className={styles.colorStockCheckboxWrapper}>
                    <label className={styles.checkboxLabel}>
                      <input 
                        type="checkbox" 
                        name="hasColorStock" 
                        checked={formData.hasColorStock}
                        onChange={handleInputChange}
                      />
                      <strong>Controlar estoque individualmente por cor (cada cor com sua própria grade de tamanhos)</strong>
                    </label>
                  </div>
                </div>

                {/* CONFIGURAÇÃO ESPECÍFICA PARA VALE-PRESENTE DIGITAL OU ESTOQUE FÍSICO */}
                {formData.category === 'gift-card' ? (
                  <div className={styles.giftCardConfigBox}>
                    <div className={styles.giftCardConfigHeader}>
                      <Gift size={16} color="#00ff88" />
                      <strong>CONFIGURAÇÕES DO VALE-PRESENTE DIGITAL</strong>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.2rem 0 0.85rem' }}>
                      Vales-Presente possuem geração digital instantânea por demanda e não utilizam controle físico por grade P/M/G/GG.
                    </p>

                    <div className={styles.gridTwo}>
                      <div className={styles.formGroup}>
                        <label>VALOR MÍNIMO PERMITIDO (R$)</label>
                        <input 
                          type="number" 
                          min="1" 
                          value={formData.minValue ?? 30} 
                          onChange={(e) => setFormData(prev => ({ ...prev, minValue: Number(e.target.value) || 30 }))}
                          placeholder="Ex: 30"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>VALOR MÁXIMO PERMITIDO (R$)</label>
                        <input 
                          type="number" 
                          min="1" 
                          value={formData.maxValue ?? 2000} 
                          onChange={(e) => setFormData(prev => ({ ...prev, maxValue: Number(e.target.value) || 2000 }))}
                          placeholder="Ex: 2000"
                        />
                      </div>
                    </div>

                    <div className={styles.formGroup} style={{ marginTop: '0.75rem' }}>
                      <label>VALORES PRÉ-SETADOS DE BOTÃO (SEPARADOS POR VÍRGULA)</label>
                      <input 
                        type="text" 
                        value={Array.isArray(formData.values) ? formData.values.join(', ') : (formData.values || '50, 100, 200')} 
                        onChange={(e) => setFormData(prev => ({ ...prev, values: e.target.value.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0) }))}
                        placeholder="Ex: 50, 100, 200"
                      />
                      <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Estes valores aparecem como botões rápidos de 1-clique no detalhe do vale.</small>
                    </div>
                  </div>
                ) : (
                  /* GRADE DE ESTOQUE POR TAMANHO */
                  <div className={styles.stockSection}>
                    <div className={styles.stockHeader}>
                      <Package size={14} className={styles.stockIcon} />
                      <label>
                        {formData.unlimitedStock
                          ? 'ESTOQUE DO PRODUTO (MODO SOB DEMANDA)'
                          : formData.hasColorStock 
                            ? 'GRADE DE ESTOQUE POR COR & TAMANHO (SKUs)' 
                            : 'ESTOQUE POR TAMANHO (GRADE COMPARTILHADA)'}
                        <InfoTooltip text="No modo ilimitado, a peça fica sempre disponível para venda sem travas de inventário. Desmarque para controlar quantidades por tamanho." title="Controle de Estoque" />
                      </label>
                    </div>

                    {/* OPÇÃO DE ESTOQUE ILIMITADO / SOB DEMANDA */}
                    <div className={styles.unlimitedStockToggleBox}>
                      <label className={styles.checkboxLabel}>
                        <input 
                          type="checkbox" 
                          name="unlimitedStock" 
                          checked={formData.unlimitedStock}
                          onChange={(e) => setFormData(prev => ({ ...prev, unlimitedStock: e.target.checked }))}
                        />
                        <div className={styles.unlimitedStockLabelCol}>
                          <strong>Estoque Ilimitado / Sob Demanda (Venda Contínua)</strong>
                          <small>Permite vender sem limite de peças, não exibe contadores de estoque no PDP e mantém a peça ativa até você decidir pausar.</small>
                        </div>
                      </label>
                    </div>

                    {formData.unlimitedStock ? (
                      <div className={styles.unlimitedActiveBanner}>
                        <InfinityIcon size={20} />
                        <div>
                          <strong>Modo Ilimitado Ativo</strong>
                          <p>Todos os tamanhos (P, M, G, GG, EXG) ficarão liberados para compra no site sem restrições ou contadores regressivos.</p>
                        </div>
                      </div>
                    ) : formData.hasColorStock ? (
                      <div className={styles.colorStockTabsContainer}>
                        {/* ABAS POR COR */}
                        <div className={styles.colorStockTabsList}>
                          {formData.colors.map(col => {
                            const colStock = formData.colorStock[col.id] || {};
                            const colTotal = Object.values(colStock).reduce((a, b) => a + (Number(b) || 0), 0);
                            const isTabActive = activeColorStockTab === col.id;

                            return (
                              <button
                                key={col.id}
                                type="button"
                                onClick={() => setActiveColorStockTab(col.id)}
                                className={`${styles.colorStockTabBtn} ${isTabActive ? styles.activeStockTab : ''}`}
                              >
                                <span className={styles.colorPillDot} style={{ backgroundColor: col.hex }} />
                                <span>{col.name}</span>
                                <small>({colTotal} un.)</small>
                              </button>
                            );
                          })}
                        </div>

                        {/* GRADE DE TAMANHOS PARA A COR SELECIONADA */}
                        {activeColorStockTab && (
                          <div className={styles.activeColorStockBox}>
                            <div className={styles.stockGrid}>
                              {['P', 'M', 'G', 'GG', 'EXG'].map(size => (
                                <div key={size} className={styles.stockBox}>
                                  <span>{size}</span>
                                  <input 
                                    type="number"
                                    min="0"
                                    value={formData.colorStock[activeColorStockTab]?.[size] ?? 0}
                                    onChange={(e) => handleColorStockChange(activeColorStockTab, size, e.target.value)}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={styles.stockGrid}>
                        {['P', 'M', 'G', 'GG', 'EXG'].map(size => (
                          <div key={size} className={styles.stockBox}>
                            <span>{size}</span>
                            <input 
                              type="number"
                              min="0"
                              value={formData.stock[size] ?? 0}
                              onChange={(e) => handleStockChange(size, e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* BLOCO 4: DETALHES & PUBLICAÇÃO */}
              <div className={styles.formSectionBlock}>
                <div className={styles.sectionBlockHeader}>
                  <div className={styles.sectionBlockTitle}>
                    <span className={styles.sectionBlockNumber}>4</span>
                    <span>DETALHES & PUBLICAÇÃO</span>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>DESCRIÇÃO / MANIFESTO DA PEÇA</label>
                  <textarea 
                    name="description"
                    rows="4"
                    placeholder="Conte sobre o caimento, corte, gramatura têxtil e inspiração artística da peça..."
                    value={formData.description}
                    onChange={handleInputChange}
                  />
                </div>

                {/* FLAGS DE DESTAQUE & FRETE */}
                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input 
                      type="checkbox" 
                      name="isRelease" 
                      checked={formData.isRelease}
                      onChange={handleInputChange}
                    />
                    <span>Destacar como Lançamento Oficial</span>
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input 
                      type="checkbox" 
                      name="isFeatured" 
                      checked={formData.isFeatured}
                      onChange={handleInputChange}
                    />
                    <span>Priorizar no Topo do Catálogo e Vitrine</span>
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input 
                      type="checkbox" 
                      name="freeShipping" 
                      checked={Boolean(formData.freeShipping)} 
                      onChange={handleInputChange}
                      style={{ accentColor: '#10b981' }}
                    />
                    <span style={{ color: formData.freeShipping ? '#10b981' : 'inherit', fontWeight: formData.freeShipping ? 600 : 400 }}>
                      Frete Grátis nesta Peça (Faixa Especial no Catálogo e PDP)
                    </span>
                  </label>
                </div>
              </div>

              <button type="submit" disabled={submitting} className={styles.submitProductBtn}>
                <Check size={16} />
                <span>{submitting ? 'GRAVANDO NO FIRESTORE...' : (editingId ? 'SALVAR ALTERAÇÕES' : 'CRIAR PRODUTO')}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CmsProdutos;
