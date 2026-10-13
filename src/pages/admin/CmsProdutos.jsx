import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
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
  ChevronLeft,
  ChevronRight,
  Link as LinkIcon
} from 'lucide-react';
import { db, storage } from '../../services/firebaseConfig';
import { catalogService } from '../../services/catalogService';
import { InfoTooltip } from '../../components/ui/InfoTooltip';
import styles from './CmsProdutos.module.css';

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
    fit: 'boxy',
    drop: 'leak-two',
    price: '',
    originalPrice: '',
    discount: '',
    customBadge: '',
    isRelease: true,
    isFeatured: true,
    image: '',
    description: '',
    stock: {
      PP: 5,
      P: 15,
      M: 20,
      G: 15,
      GG: 5
    },
    colors: [
      { id: 'preto', name: 'Preto', hex: '#000000' }
    ],
    hasColorStock: false,
    colorStock: {
      preto: { PP: 5, P: 15, M: 20, G: 15, GG: 5 }
    }
  });

  // Gestão de Múltiplas Imagens & Firebase Storage
  const [imagesList, setImagesList] = useState([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [draggedImageIndex, setDraggedImageIndex] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Gestão de Cores Inline
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#000000');
  const [activeColorStockTab, setActiveColorStockTab] = useState('preto');

  // 1. Carrega produtos 100% do Firestore via catalogService
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const list = await catalogService.getAllProducts();
      setProducts(list);
    } catch (err) {
      console.error("Erro ao carregar catálogo do Firestore:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

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

    const formattedLabel = raw.toLowerCase().includes('fit') 
      ? raw.charAt(0).toUpperCase() + raw.slice(1) 
      : `${raw.charAt(0).toUpperCase() + raw.slice(1)} Fit`;

    setCustomFits(prev => {
      if (prev.some(f => f.key === slug)) return prev;
      return [...prev, { key: slug, label: formattedLabel }];
    });
    setFormData(prev => ({ ...prev, fit: slug }));
    setIsAddingFit(false);
    setNewFitName('');
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
      fit: 'boxy',
      drop: 'leak-two',
      price: '',
      customBadge: '',
      isRelease: true,
      isFeatured: false,
      image: '',
      description: '',
      stock: { PP: 10, P: 15, M: 20, G: 15, GG: 5 },
      colors: [
        { id: 'preto', name: 'Preto', hex: '#000000' }
      ],
      hasColorStock: false,
      colorStock: {
        preto: { PP: 10, P: 15, M: 20, G: 15, GG: 5 }
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
        initialColorStock[c.id] = product.stock || { PP: 5, P: 10, M: 15, G: 10, GG: 5 };
      }
    });

    setFormData({
      name: product.name || product.title || '',
      type: product.type || (product.category === 'brinde' ? 'brinde' : 'vestuario'),
      category: product.category || 'camisa',
      fit: product.fit || 'boxy',
      drop: product.drop || 'leak-two',
      price: product.price || product.priceNum || product.originalPrice || '',
      customBadge: product.customBadge || '',
      isRelease: product.isRelease ?? false,
      isFeatured: product.isFeatured ?? false,
      image: product.image || initialImages[0]?.url || '',
      description: product.description || '',
      stock: product.stock || { PP: 0, P: 0, M: 0, G: 0, GG: 0 },
      colors: initialColors,
      hasColorStock: product.hasColorStock ?? false,
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

  // Upload de Imagens no Firebase Storage
  const handleUploadFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploadingImages(true);
    setUploadStatusText(`Enviando ${files.length} imagem(ns) ao Firebase Storage...`);

    const uploaded = [];
    const prodRefId = editingId || generateSlug(formData.name) || `temp_${Date.now()}`;

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
        console.error(`Erro ao subir imagem ${file.name}:`, err);
      }
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
    e.target.value = '';
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
      updatedColorStock[slug] = { PP: 5, P: 15, M: 20, G: 15, GG: 5 };
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
      updatedColorStock[slug] = { PP: 5, P: 15, M: 20, G: 15, GG: 5 };
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

    const priceNum = parseFloat(formData.price) || 0;
    const existingProd = editingId ? products.find(p => p.id === editingId) : null;
    
    // Se o produto já possuir desconto configurado na aba de Descontos, mantém a integridade
    const origPriceNum = existingProd?.originalPrice && existingProd.originalPrice > priceNum
      ? existingProd.originalPrice
      : priceNum;
    const discountPercent = existingProd?.discount || 0;

    // Define imagem de capa e array consolidado
    const coverItem = imagesList.find(img => img.isCover) || imagesList[0];
    const finalCoverUrl = coverItem?.url || formData.image || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop";
    const finalImagesUrls = imagesList.length > 0
      ? imagesList.map(img => img.url)
      : (formData.image ? [formData.image] : [finalCoverUrl]);

    // Calcula estoque agregado e variantes com SKU
    let aggregatedStock = { PP: 0, P: 0, M: 0, G: 0, GG: 0 };
    if (formData.hasColorStock && formData.colors.length > 0) {
      ['PP', 'P', 'M', 'G', 'GG'].forEach(size => {
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
        ['PP', 'P', 'M', 'G', 'GG'].forEach(size => {
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
      name: formData.name.trim(),
      title: formData.name.trim(),
      type: formData.type,
      category: formData.category,
      fit: formData.type === 'vestuario' ? formData.fit : 'único',
      drop: formData.drop,
      price: priceNum,
      priceNum: priceNum,
      originalPrice: origPriceNum,
      discount: discountPercent,
      ...(existingProd?.discountPrice !== undefined ? { discountPrice: existingProd.discountPrice } : {}),
      ...(existingProd?.discountActive !== undefined ? { discountActive: existingProd.discountActive } : {}),
      customBadge: formData.customBadge.trim(),
      isRelease: formData.isRelease,
      isFeatured: formData.isFeatured,
      image: finalCoverUrl,
      images: finalImagesUrls,
      imagesGallery: imagesList,
      colors: formData.colors,
      hasColorStock: formData.hasColorStock,
      colorStock: formData.colorStock,
      description: formData.description.trim(),
      stock: aggregatedStock,
      sizes: Object.keys(aggregatedStock).filter(size => (aggregatedStock[size] || 0) > 0),
      variants,
      createdAt: existingProd?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'products', productId), productPayload, { merge: true });
      await fetchProducts();
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

    // 1. Categoria (Tab Chips)
    if (selectedFilter !== 'all') {
      list = list.filter(p => (p.category === selectedFilter || p.type === selectedFilter));
    }

    // 2. Modelagem (Fit)
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
        const origPrice = parseFloat(p.originalPrice || 0);
        const hasDiscount = origPrice > priceValue;

        if (statusFilter === 'in_stock') return totalStock > 5;
        if (statusFilter === 'low_stock') return totalStock > 0 && totalStock <= 5;
        if (statusFilter === 'out_of_stock') return totalStock === 0;
        if (statusFilter === 'on_sale') return hasDiscount;
        if (statusFilter === 'release') return p.isRelease === true;
        if (statusFilter === 'featured') return p.isFeatured === true;
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
  }, [products, selectedFilter, fitFilter, statusFilter, searchTerm, sortConfig]);

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

          <div className={styles.filtersRow}>
            {categoryTabs.map(f => (
              <button
                key={f.id}
                className={`${styles.filterChip} ${selectedFilter === f.id ? styles.activeChip : ''}`}
                onClick={() => setSelectedFilter(f.id)}
              >
                <span>{f.label}</span>
                <small className={styles.chipCount}>({f.count})</small>
              </button>
            ))}
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
                <option value="in_stock">Estoque Saudável (&gt; 5 un.)</option>
                <option value="low_stock">Estoque Baixo (≤ 5 un.)</option>
                <option value="out_of_stock">Esgotados (0 un.)</option>
                <option value="on_sale">Em Promoção / Desconto</option>
                <option value="release">Lançamentos</option>
                <option value="featured">Destaques da Vitrine</option>
              </select>
            </div>
          </div>

          <div className={styles.tableMetaInfo}>
            <span className={styles.tableMetaCount}>
              {filteredAndSortedProducts.length} {filteredAndSortedProducts.length === 1 ? 'produto listado' : 'produtos listados'}
              {(searchTerm || selectedFilter !== 'all' || fitFilter !== 'all' || statusFilter !== 'all') && ` (de ${products.length})`}
            </span>
            {(searchTerm || selectedFilter !== 'all' || fitFilter !== 'all' || statusFilter !== 'all' || (sortConfig.key && sortConfig.direction !== 'none')) && (
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
                <td colSpan="7" className={styles.centerText}>
                  <div className={styles.loadingWrapper}>
                    <Package size={20} className={styles.spinningIcon} />
                    <span>Carregando catálogo do Firestore...</span>
                  </div>
                </td>
              </tr>
            ) : filteredAndSortedProducts.length === 0 ? (
              <tr>
                <td colSpan="7" className={styles.centerText}>
                  <div className={styles.emptyWrapper}>
                    <AlertCircle size={20} />
                    <span>
                      {searchTerm || selectedFilter !== 'all' || fitFilter !== 'all' || statusFilter !== 'all'
                        ? 'Nenhum produto encontrado com os filtros selecionados.'
                        : 'Nenhum produto cadastrado no catálogo.'}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredAndSortedProducts.map((prod) => {
                const totalUnits = prod.stock 
                  ? Object.values(prod.stock).reduce((a, b) => a + (Number(b) || 0), 0)
                  : 50;

                const priceValue = parseFloat(prod.price || prod.priceNum || 0);
                const originalPriceValue = parseFloat(prod.originalPrice || 0);
                const hasDiscount = originalPriceValue > priceValue;

                return (
                  <tr key={prod.id} className={styles.tableRow}>
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
                      <span className={styles.categoryBadge}>{(prod.category || 'GERAL').toUpperCase()}</span>
                      <small className={styles.fitText}>{(prod.fit || 'PADRÃO').toUpperCase()} FIT</small>
                    </td>
                    <td>
                      <div className={styles.priceColumn}>
                        <strong>R$ {priceValue.toFixed(2)}</strong>
                        {hasDiscount && (
                          <span className={styles.discountTag}>
                            -{prod.discount || Math.round(((originalPriceValue - priceValue) / originalPriceValue) * 100)}% OFF
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {prod.customBadge && prod.customBadge.trim() ? (
                        <span className={styles.customBadge}>{prod.customBadge.trim()}</span>
                      ) : (
                        <span className={styles.noBadge}>Sem Badge</span>
                      )}
                    </td>
                    <td>
                      <span className={`${styles.stockBadge} ${totalUnits === 0 ? styles.outOfStock : ''}`}>
                        {totalUnits > 0 ? `${totalUnits} un.` : 'ESGOTADO'}
                      </span>
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
              {/* TIPO DE ITEM */}
              <div className={styles.formGroup}>
                <label>TIPO DE PRODUTO</label>
                <div className={styles.typeSwitcher}>
                  <button
                    type="button"
                    className={`${styles.switchBtn} ${formData.type === 'vestuario' ? styles.activeSwitch : ''}`}
                    onClick={() => setFormData({ ...formData, type: 'vestuario', category: 'camisa' })}
                  >
                    VESTUÁRIO (ROUPAS)
                  </button>
                  <button
                    type="button"
                    className={`${styles.switchBtn} ${formData.type === 'brinde' ? styles.activeSwitch : ''}`}
                    onClick={() => setFormData({ ...formData, type: 'brinde', category: 'brinde', fit: 'único' })}
                  >
                    BRINDES & VALES
                  </button>
                </div>
              </div>

              {/* NOME & IMAGEM */}
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

              {/* SEÇÃO 1: GALERIA DE FOTOS (FIREBASE STORAGE) */}
              <div className={styles.galleryFormSection}>
                <div className={styles.gallerySectionHeader}>
                  <div className={styles.galleryHeaderTitle}>
                    <ImageIcon size={16} />
                    <label>FOTOS DO PRODUTO & CAPA (FIREBASE STORAGE)</label>
                  </div>
                  <InfoTooltip 
                    text="Envie quantas imagens quiser direto para o Firebase Storage. Defina a foto de capa e vincule cores a fotos específicas para o carrossel do cliente." 
                    title="Galeria e Capa" 
                  />
                </div>

                {/* DROPZONE DE UPLOAD */}
                <div className={styles.uploadDropzone}>
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
                    <Upload size={22} className={styles.uploadIcon} />
                    <strong>CLIQUE OU ARRASTE FOTOS AQUI</strong>
                    <span>Envie quantas imagens quiser (.jpg, .png, .webp). Upload direto no Storage.</span>
                  </label>
                </div>

                {isUploadingImages && (
                  <div className={styles.uploadProgressBar}>
                    <RotateCw size={14} className={styles.spinningIcon} />
                    <span>{uploadStatusText || 'Enviando imagens para o Firebase Storage...'}</span>
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

              {/* CATEGORIA, FIT E DROP */}
              <div className={styles.gridTwo}>
                <div className={styles.formGroup}>
                  <div className={styles.labelWithAction}>
                    <label>CATEGORIA *</label>
                    {!isAddingCategory && (
                      <button
                        type="button"
                        onClick={() => { setIsAddingCategory(true); setNewCategoryName(''); }}
                        className={styles.addInlineBtn}
                        title="Criar nova categoria customizada"
                      >
                        <Plus size={11} />
                        <span>Nova</span>
                      </button>
                    )}
                  </div>

                  {isAddingCategory ? (
                    <div className={styles.inlineAddBox}>
                      <input
                        type="text"
                        placeholder="Nome da categoria (ex: Bonés, Shorts...)"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        autoFocus
                        className={styles.inlineInput}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleConfirmAddCategory();
                          }
                        }}
                      />
                      <div className={styles.inlineActions}>
                        <button
                          type="button"
                          onClick={handleConfirmAddCategory}
                          className={styles.inlineConfirmBtn}
                          title="Confirmar categoria"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setIsAddingCategory(false); setNewCategoryName(''); }}
                          className={styles.inlineCancelBtn}
                          title="Cancelar"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <select
                      name="category"
                      value={formData.category}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setIsAddingCategory(true);
                          setNewCategoryName('');
                        } else {
                          handleInputChange(e);
                        }
                      }}
                    >
                      {formCategoryOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                      <option value="__NEW__">+ Criar Nova Categoria...</option>
                    </select>
                  )}
                </div>

                {formData.type === 'vestuario' && (
                  <div className={styles.formGroup}>
                    <div className={styles.labelWithAction}>
                      <label>MODELAGEM (FIT)</label>
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

                    {isAddingFit ? (
                      <div className={styles.inlineAddBox}>
                        <input
                          type="text"
                          placeholder="Nome da modelagem (ex: Drop Shoulder, Cargo...)"
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
                    ) : (
                      <select
                        name="fit"
                        value={formData.fit}
                        onChange={(e) => {
                          if (e.target.value === '__NEW__') {
                            setIsAddingFit(true);
                            setNewFitName('');
                          } else {
                            handleInputChange(e);
                          }
                        }}
                      >
                        {formFitOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                        <option value="__NEW__">+ Criar Nova Modelagem...</option>
                      </select>
                    )}
                  </div>
                )}
              </div>

              {/* PREÇO DA PEÇA */}
              <div className={styles.formGroup}>
                <label>
                  PREÇO DA PEÇA (R$) *
                  <InfoTooltip text="Preço real de venda da peça. Descontos e liquidações são gerenciados na aba Descontos & Liquidações." title="Valor do Produto" />
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  name="price"
                  placeholder="189.90"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* BADGE CUSTOMIZADO */}
              <div className={styles.formGroup}>
                <label>
                  BADGE PERSONALIZADO (TAG NA VITRINE)
                  <InfoTooltip text="Destaque visual sobre a imagem do card na vitrine e catálogo." title="Tag Promocional" />
                </label>
                <input 
                  type="text" 
                  name="customBadge"
                  placeholder="Opcional (ex: LANÇAMENTO, -20% OFF, FOR THE FEW...)"
                  value={formData.customBadge}
                  onChange={handleInputChange}
                />
              </div>

              {/* SEÇÃO 2: GESTÃO DE CORES */}
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

              {/* GRADE DE ESTOQUE POR TAMANHO (SKUS) */}
              <div className={styles.stockSection}>
                <div className={styles.stockHeader}>
                  <Package size={14} className={styles.stockIcon} />
                  <label>
                    {formData.hasColorStock 
                      ? 'GRADE DE ESTOQUE POR COR & TAMANHO (SKUs)' 
                      : 'ESTOQUE POR TAMANHO (GRADE COMPARTILHADA)'}
                    <InfoTooltip text="Define a quantidade disponível de cada tamanho. Se zerar, o botão de compra fica bloqueado." title="Inventário por SKU" />
                  </label>
                </div>

                {formData.hasColorStock ? (
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
                          {['PP', 'P', 'M', 'G', 'GG'].map(size => (
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
                    {['PP', 'P', 'M', 'G', 'GG'].map(size => (
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

              {/* FLAGS DE DESTAQUE */}
              <div className={styles.checkboxGroup}>
                <label className={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    name="isRelease" 
                    checked={formData.isRelease}
                    onChange={handleInputChange}
                  />
                  <span>Destacar como Lançamento</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    name="isFeatured" 
                    checked={formData.isFeatured}
                    onChange={handleInputChange}
                  />
                  <span>Priorizar no Topo do Catálogo</span>
                </label>
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
