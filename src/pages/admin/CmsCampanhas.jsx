import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { 
  Plus, 
  RotateCw, 
  Copy, 
  Check, 
  Pencil, 
  Trash2, 
  X, 
  Link2, 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  MousePointer, 
  ExternalLink,
  Sparkles,
  Layers,
  AlertCircle,
  Calendar,
  Settings2,
  SlidersHorizontal,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Mail,
  Send,
  Download,
  Users,
  Tag,
  Eye,
  Image,
  UserPlus,
  Upload
} from 'lucide-react';
import { db, storage } from '../../services/firebaseConfig';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getAllProducts } from '../../services/catalogService';
import { campaignService } from '../../services/campaignService';
import { dropSubscriberService } from '../../services/dropSubscriberService';
import { emailService } from '../../services/emailService';
import { currentDropConfig } from '../../data/dropConfig';
import { useAuth } from '../../context/AuthContext';
import { InfoTooltip } from '../../components/ui/InfoTooltip';
import { 
  useCmsPeriodFilter, 
  parseOrderDate, 
  isDateInPeriod,
  getTodayStr, 
  formatShortDate 
} from '../../hooks/useCmsPeriodFilter';
import { isOrderPaid } from '../../services/orderStateMachine';
import styles from './CmsCampanhas.module.css';

const DEFAULT_SOURCES = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'facebook_ads', label: 'Facebook Ads' },
  { value: 'whatsapp', label: 'WhatsApp / Lista VIP' },
  { value: 'influencer', label: 'Parceria / Influenciador' },
  { value: 'email', label: 'E-mail Marketing' },
  { value: 'youtube', label: 'YouTube' }
];

const DEFAULT_MEDIUMS = [
  { value: 'stories', label: 'Stories' },
  { value: 'feed', label: 'Feed / Reels' },
  { value: 'bio', label: 'Link da Bio' },
  { value: 'cpc', label: 'CPC / Tráfego Pago' },
  { value: 'direct_message', label: 'DM / Mensagem Direta' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'parceria', label: 'Parceria / Publi' }
];

const CATALOG_CATEGORIES = [
  { id: 'camisa', label: 'CAMISA' },
  { id: 'calca', label: 'CALÇA' },
  { id: 'jaqueta', label: 'JAQUETA & HOODIE' }
];

const CATALOG_FITS = [
  { id: 'boxy', label: 'BOXY' },
  { id: 'oversized', label: 'OVERSIZED' },
  { id: 'normal', label: 'NORMAL' },
  { id: 'regata', label: 'REGATA' }
];

const CATALOG_DROPS = [
  { id: 'leak_two', label: 'LEAK TWO (NOVO)' },
  { id: 'drops_passados', label: 'DROPS PASSADOS' }
];

const CATALOG_SIZES = ['P', 'M', 'G', 'GG', 'EXG'];

export function CmsCampanhas() {
  const { currentUser } = useAuth() || {};
  const [campaigns, setCampaigns] = useState([]);
  const [orders, setOrders] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [couponsList, setCouponsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Aba Principal do Módulo (Zero Poluição Visual: 'utms' | 'vip')
  const [activeMainTab, setActiveMainTab] = useState('vip');

  // Estados da Seção B: LISTA VIP & DISPARO DE E-MAIL FLEXÍVEL
  const [activeEmailPreset, setActiveEmailPreset] = useState('drop_launch');
  const [dropEmailSubject, setDropEmailSubject] = useState('Novo Drop disponível — Acesso liberado');
  const [dropEmailLabel, setDropEmailLabel] = useState('LISTA VIP // EARLY ACCESS');
  const [dropManifesto, setDropManifesto] = useState(
    'O novo lote da THR33 acaba de ser liberado com prioridade para a Lista VIP.\nModelagens pesadas construídas no concreto de Curitiba com tiragem estritamente limitada.'
  );
  // Módulos opcionais expansíveis para não poluir a tela
  const [enableBannerModule, setEnableBannerModule] = useState(false);
  const [dropBannerUrl, setDropBannerUrl] = useState('');
  const [enableCouponModule, setEnableCouponModule] = useState(false);
  const [dropCouponTitle, setDropCouponTitle] = useState('CREDENCIAL // LISTA VIP');
  const [dropCouponCode, setDropCouponCode] = useState('');
  const [dropCouponDesc, setDropCouponDesc] = useState('Utilize este código no checkout antes que o lote esgote.');
  const [enableCtaModule, setEnableCtaModule] = useState(true);
  const [dropCtaLabel, setDropCtaLabel] = useState('ACESSAR O DROP AGORA');
  const [dropCtaUrl, setDropCtaUrl] = useState('https://lojathr33.com.br/catalogo?utm_source=email&utm_medium=newsletter&utm_campaign=drop_vip_launch');

  // Filtros e Seleção da Base de Inscritos VIP
  // Múltiplas Fontes de Imagem para o Banner
  const [bannerSourceMode, setBannerSourceMode] = useState('upload'); // 'upload' | 'catalog' | 'url'
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [uploadBannerStatus, setUploadBannerStatus] = useState('');
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [loadingCatalogProducts, setLoadingCatalogProducts] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const bannerFileInputRef = useRef(null);

  // Segmentação de Envio no CMS (Todos vs. Clientes VIP vs. Teste Rápido)
  const [dropAudienceSegment, setDropAudienceSegment] = useState('all'); // 'all' | 'vip_customers' | 'test_admin'
  const [dropTargetFilter, setDropTargetFilter] = useState('all'); // 'all' | 'selected' | 'home_newsletter' | 'footer_newsletter' | 'register_opt_in'
  const [subSearchQuery, setSubSearchQuery] = useState('');
  const [subStatusFilter, setSubStatusFilter] = useState('active'); // 'active' | 'unsubscribed' | 'all'
  const [selectedSubEmails, setSelectedSubEmails] = useState([]);
  const [showAddSubPanel, setShowAddSubPanel] = useState(false);
  const [newSubEmail, setNewSubEmail] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newSubSendWelcome, setNewSubSendWelcome] = useState(false);
  const [addingSubscriber, setAddingSubscriber] = useState(false);
  const [showEmailPreviewModal, setShowEmailPreviewModal] = useState(false);

  const [dropTestEmail, setDropTestEmail] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState({ type: '', message: '' });

  // Opções customizadas de Origem e Mídia (gravadas no Firestore)
  const [customSources, setCustomSources] = useState([]);
  const [customMediums, setCustomMediums] = useState([]);

  // Estados dos painéis inline para adicionar nova opção no seletor
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSourceLabel, setNewSourceLabel] = useState('');
  const [newSourceValue, setNewSourceValue] = useState('');

  const [showAddMedium, setShowAddMedium] = useState(false);
  const [newMediumLabel, setNewMediumLabel] = useState('');
  const [newMediumValue, setNewMediumValue] = useState('');

  // Assistente de Filtros do Catálogo
  const [showCatalogFilterHelper, setShowCatalogFilterHelper] = useState(true);

  // Filtro de Período Sincronizado Globalmente
  const {
    periodFilter,
    setPeriodFilter,
    customStartDate,
    customEndDate,
    showCustomPicker,
    setShowCustomPicker,
    dateValidationErr,
    handleStartDateChange,
    handleEndDateChange,
    handleApplyCustomDate,
    periodLabel
  } = useCmsPeriodFilter();

  // Filtros de busca, origem, status e ordenação da Tabela
  const [campaignSearchQuery, setCampaignSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'none' });

  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [saving, setSaving] = useState(false);

  // Campos do Formulário
  const [name, setName] = useState('');
  const [utmSource, setUtmSource] = useState('instagram');
  const [utmMedium, setUtmMedium] = useState('stories');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [targetPath, setTargetPath] = useState('/catalogo');

  // Trava scroll da página quando modal estiver aberto
  useEffect(() => {
    if (isModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isModalOpen]);

  const baseUrl = typeof window !== 'undefined' && !window.location.origin.includes('localhost') && !window.location.origin.includes('web.app') ? window.location.origin : 'https://lojathr33.com.br';

  // Lista consolidada de Origens (Padrão + Customizadas + Usadas em Campanhas)
  const allSources = useMemo(() => {
    const list = [...DEFAULT_SOURCES, ...customSources];
    campaigns.forEach(c => {
      if (c.utm_source && !list.some(s => s.value === c.utm_source)) {
        list.push({ value: c.utm_source, label: c.utm_source.toUpperCase() });
      }
    });
    return list;
  }, [customSources, campaigns]);

  // Lista consolidada de Mídias (Padrão + Customizadas + Usadas em Campanhas)
  const allMediums = useMemo(() => {
    const list = [...DEFAULT_MEDIUMS, ...customMediums];
    campaigns.forEach(c => {
      if (c.utm_medium && !list.some(m => m.value === c.utm_medium)) {
        list.push({ value: c.utm_medium, label: c.utm_medium });
      }
    });
    return list;
  }, [customMediums, campaigns]);

  // Parser dos filtros do catálogo ativos dentro de targetPath
  const parsedCatalogFilters = useMemo(() => {
    if (!targetPath.startsWith('/catalogo')) {
      return { categories: [], fits: [], drops: [], sizes: [], search: '', sort: '' };
    }
    const [, queryString] = targetPath.split('?');
    if (!queryString) {
      return { categories: [], fits: [], drops: [], sizes: [], search: '', sort: '' };
    }
    const params = new URLSearchParams(queryString);
    return {
      categories: params.get('categoria') ? params.get('categoria').split(',').filter(Boolean) : [],
      fits: params.get('fit') ? params.get('fit').split(',').filter(Boolean) : [],
      drops: params.get('drop') ? params.get('drop').split(',').filter(Boolean) : [],
      sizes: params.get('tamanho') ? params.get('tamanho').split(',').filter(Boolean) : [],
      search: params.get('search') || '',
      sort: params.get('ordenar') || ''
    };
  }, [targetPath]);

  // Contador de filtros aplicados
  const activeCatalogFiltersCount = useMemo(() => {
    const { categories, fits, drops, sizes, search, sort } = parsedCatalogFilters;
    let count = categories.length + fits.length + drops.length + sizes.length;
    if (search.trim()) count += 1;
    if (sort) count += 1;
    return count;
  }, [parsedCatalogFilters]);

  // Atualizador bidirecional de filtros do catálogo na URL
  const toggleCatalogFilter = (type, value, isArray = true) => {
    const [basePath] = targetPath.split('?');
    const current = { ...parsedCatalogFilters };

    if (isArray) {
      const arr = current[type] || [];
      current[type] = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
    } else {
      current[type] = value;
    }

    const params = new URLSearchParams();
    if (current.search && current.search.trim()) params.set('search', current.search.trim());
    if (current.categories && current.categories.length > 0) params.set('categoria', current.categories.join(','));
    if (current.fits && current.fits.length > 0) params.set('fit', current.fits.join(','));
    if (current.drops && current.drops.length > 0) params.set('drop', current.drops.join(','));
    if (current.sizes && current.sizes.length > 0) params.set('tamanho', current.sizes.join(','));
    if (current.sort && current.sort !== 'newest') params.set('ordenar', current.sort);

    const queryStr = params.toString();
    setTargetPath(queryStr ? `${basePath}?${queryStr}` : basePath);
  };

  const handleClearCatalogFilters = () => {
    const [basePath] = targetPath.split('?');
    setTargetPath(basePath || '/catalogo');
  };

  // Gerador de URL Completa Dinâmica combinando filtros do catálogo e parâmetros UTM
  const generatedUrl = useMemo(() => {
    const cleanPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
    const cleanCampaign = (utmCampaign || 'campanha').toLowerCase().trim().replace(/[\s_-]+/g, '_');
    
    const [pathOnly, existingQuery] = cleanPath.split('?');
    const params = new URLSearchParams(existingQuery || '');
    
    params.set('utm_source', utmSource || 'instagram');
    params.set('utm_medium', utmMedium || 'social');
    params.set('utm_campaign', cleanCampaign);

    return `${baseUrl}${pathOnly}?${params.toString()}`;
  }, [baseUrl, targetPath, utmSource, utmMedium, utmCampaign]);

  // Carrega campanhas, opções customizadas e pedidos para cruzamento temporal
  const loadCampaigns = async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      const [camps, ordersSnap, sessionsSnap, customOpts, subsList, couponsSnap] = await Promise.all([
        campaignService.getAllCampaigns(),
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'checkout_sessions')).catch(() => ({ forEach: () => {} })),
        campaignService.getCustomUtmOptions(),
        dropSubscriberService.getAllSubscribers(),
        getDocs(collection(db, 'coupons')).catch(() => ({ forEach: () => {} }))
      ]);

      const loadedCoupons = [];
      if (couponsSnap && couponsSnap.forEach) {
        couponsSnap.forEach(cDoc => {
          const cData = cDoc.data();
          if (cData.active !== false && cData.code) {
            loadedCoupons.push({ id: cDoc.id, ...cData });
          }
        });
      }
      setCouponsList(loadedCoupons);
      setSubscribers(subsList || []);

      const ords = [];
      const seenIds = new Set();

      ordersSnap.forEach(d => {
        if (!seenIds.has(d.id)) {
          seenIds.add(d.id);
          ords.push({ id: d.id, ...d.data() });
        }
      });

      if (sessionsSnap && sessionsSnap.forEach) {
        sessionsSnap.forEach(d => {
          const data = d.data();
          if (data.completed === true && !seenIds.has(d.id)) {
            seenIds.add(d.id);
            ords.push({ id: d.id, ...data });
          }
        });
      }

      setOrders(ords);
      setCampaigns(camps || []);
      setCustomSources(customOpts.sources || []);
      setCustomMediums(customOpts.mediums || []);
    } catch (err) {
      console.warn("Aviso ao carregar campanhas:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  useEffect(() => {
    if (currentUser?.email && !dropTestEmail) {
      setDropTestEmail(currentUser.email);
    }
  }, [currentUser]);

  // Presets Rápidos de E-mail para Flexibilidade Total do Admin
  const applyEmailPreset = (presetId) => {
    setActiveEmailPreset(presetId);
    setBroadcastFeedback({ type: '', message: '' });

    if (presetId === 'drop_launch') {
      setDropEmailSubject('Novo Drop disponível — Acesso liberado');
      setDropEmailLabel('LISTA VIP // EARLY ACCESS');
      setDropManifesto(
        'O novo lote da THR33 acaba de ser liberado com prioridade para a Lista VIP.\nModelagens pesadas construídas no concreto de Curitiba com tiragem estritamente limitada.'
      );
      setEnableCtaModule(true);
      setDropCtaLabel('ACESSAR O DROP AGORA');
      setDropCtaUrl(`${baseUrl}/catalogo?utm_source=email&utm_medium=newsletter&utm_campaign=drop_vip_launch`);
    } else if (presetId === 'early_access') {
      setDropEmailSubject('Acesso Antecipado Liberado — Lista VIP THR33');
      setDropEmailLabel('EARLY ACCESS // ABERTURA ANTECIPADA');
      setDropManifesto(
        'Você está recebendo o acesso prioritário antes da abertura oficial ao público geral.\nAs peças possuem tiragem limitada por tamanho.'
      );
      setEnableCouponModule(true);
      setDropCouponTitle('CREDENCIAL / CUPOM DE ACESSO VIP');
      setEnableCtaModule(true);
      setDropCtaLabel('ENTRAR NO ACESSO VIP');
      setDropCtaUrl(`${baseUrl}/catalogo?utm_source=email&utm_medium=newsletter&utm_campaign=early_access_vip`);
    } else if (presetId === 'vip_coupon') {
      setDropEmailSubject('Benefício exclusivo liberado para sua conta — THR33');
      setDropEmailLabel('BENEFÍCIO EXCLUSIVO // MEMBROS VIP');
      setDropManifesto(
        'Liberamos uma condição especial exclusiva para os membros cadastrados na Lista VIP da THR33.\nUtilize o código abaixo diretamente no checkout.'
      );
      setEnableCouponModule(true);
      setDropCouponTitle('SEU CUPOM EXCLUSIVO VIP');
      setEnableCtaModule(true);
      setDropCtaLabel('USAR MEU CUPOM NA LOJA');
      setDropCtaUrl(`${baseUrl}/catalogo?utm_source=email&utm_medium=newsletter&utm_campaign=cupom_vip`);
    } else if (presetId === 'custom_notice') {
      setDropEmailSubject('Comunicado Oficial — THR33 Streetwear');
      setDropEmailLabel('THR33 CURITIBA // COMUNICADO');
      setDropManifesto('Escreva aqui a sua mensagem personalizada para os membros da Lista VIP...');
      setEnableBannerModule(false);
      setEnableCouponModule(false);
      setEnableCtaModule(true);
      setDropCtaLabel('ACESSAR A LOJA');
      setDropCtaUrl(`${baseUrl}/catalogo`);
    }
  };

  // Formata a origem do inscrito de forma limpa
  const formatSubscriberSource = (src) => {
    const clean = String(src || '').toLowerCase();
    if (clean.includes('home')) return 'HOME';
    if (clean.includes('footer') || clean.includes('rodape')) return 'RODAPÉ';
    if (clean.includes('register') || clean.includes('auth') || clean.includes('cadastro')) return 'CADASTRO';
    if (clean.includes('checkout')) return 'CHECKOUT';
    if (clean.includes('manual') || clean.includes('admin')) return 'MANUAL';
    return 'SITE';
  };

  // Lista filtrada para exibição na coluna da direita (Gestão de Inscritos)
  const displayedSubscribers = useMemo(() => {
    return (subscribers || []).filter(sub => {
      const status = sub.status || 'active';
      if (subStatusFilter === 'active' && status === 'unsubscribed') return false;
      if (subStatusFilter === 'unsubscribed' && status !== 'unsubscribed') return false;

      if (subSearchQuery.trim()) {
        const q = subSearchQuery.toLowerCase().trim();
        const em = String(sub.email || '').toLowerCase();
        const nm = String(sub.name || '').toLowerCase();
        const sr = formatSubscriberSource(sub.source).toLowerCase();
        return em.includes(q) || nm.includes(q) || sr.includes(q);
      }
      return true;
    });
  }, [subscribers, subStatusFilter, subSearchQuery]);

  // Normalizador de rótulos de cupons (eliminando undefined%)
  const getCouponDisplayLabel = (c) => {
    const code = c.code || c.id || 'CUPOM';
    let valStr = '';
    if (c.discountPercent || c.discountPercentage) {
      const p = Number(c.discountPercent || c.discountPercentage);
      valStr = `${p > 1 ? p : Math.round(p * 100)}% OFF`;
    } else if (c.discountValue || c.fixedDiscountValue) {
      const v = Number(c.discountValue || c.fixedDiscountValue);
      valStr = `R$ ${v.toFixed(2).replace('.', ',')} OFF`;
    } else if (c.freeShipping || c.type === 'free_shipping') {
      valStr = 'FRETE GRÁTIS';
    } else {
      valStr = 'Especial';
    }
    return `${code.toUpperCase()} (${valStr})`;
  };

  // Preenchimento automático ao selecionar cupom no combobox
  const handleSelectCoupon = (couponCode) => {
    if (!couponCode) return;
    const c = couponsList.find(item => item.code === couponCode || item.id === couponCode);
    if (!c) return;

    const code = (c.code || c.id || '').toUpperCase();
    setDropCouponCode(code);
    setDropCouponTitle(`CREDENCIAL // ${code}`);
    
    let desc = 'Utilize este código no checkout antes que o lote esgote.';
    if (c.discountPercent || c.discountPercentage) {
      const p = Number(c.discountPercent || c.discountPercentage);
      desc = `Garanta ${p > 1 ? p : Math.round(p * 100)}% de desconto exclusivo em todo o catálogo neste drop.`;
    } else if (c.discountValue || c.fixedDiscountValue) {
      const v = Number(c.discountValue || c.fixedDiscountValue);
      desc = `Garanta R$ ${v.toFixed(2).replace('.', ',')} de desconto imediato em seu próximo pedido.`;
    } else if (c.freeShipping || c.type === 'free_shipping') {
      desc = `Aproveite frete grátis sem valor mínimo neste drop exclusivo.`;
    }
    setDropCouponDesc(desc);
  };

  // Upload direto para Firebase Storage do Banner do E-mail
  const handleBannerFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setBroadcastFeedback({ type: 'error', message: 'Selecione um arquivo de imagem válido (PNG, JPG, WEBP).' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setBroadcastFeedback({ type: 'error', message: 'A imagem deve ter no máximo 10MB.' });
      return;
    }

    setIsUploadingBanner(true);
    setUploadBannerStatus('Enviando imagem para o Storage...');
    try {
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `email_banners/banner_${Date.now()}_${cleanFileName}`;
      const fileRef = ref(storage, storagePath);
      const uploadTask = await uploadBytesResumable(fileRef, file);
      const downloadUrl = await getDownloadURL(uploadTask.ref);
      setDropBannerUrl(downloadUrl);
      setUploadBannerStatus('Imagem carregada com sucesso!');
      setTimeout(() => setUploadBannerStatus(''), 3000);
    } catch (err) {
      console.error('Erro ao fazer upload do banner:', err);
      setBroadcastFeedback({ type: 'error', message: `Erro no upload: ${err.message || 'Falha ao salvar no Storage'}` });
      setUploadBannerStatus('');
    } finally {
      setIsUploadingBanner(false);
      if (bannerFileInputRef.current) bannerFileInputRef.current.value = '';
    }
  };

  // Modal para escolher imagem direto do Catálogo de Produtos
  const handleOpenCatalogModal = async () => {
    setShowCatalogModal(true);
    if (catalogProducts.length === 0) {
      setLoadingCatalogProducts(true);
      try {
        const prods = await getAllProducts();
        setCatalogProducts(prods || []);
      } catch (err) {
        console.warn('Erro ao carregar catálogo para banner:', err);
      } finally {
        setLoadingCatalogProducts(false);
      }
    }
  };

  const handleSelectProductImage = (imgUrl) => {
    if (!imgUrl) return;
    setDropBannerUrl(imgUrl);
    setShowCatalogModal(false);
  };

  // Métricas e KPIs da Lista VIP de Drops e Segmentação de Público
  const vipKpis = useMemo(() => {
    const activeList = (subscribers || []).filter(s => s.status !== 'unsubscribed' && s.unsubscribedAll !== true);
    const unsubscribedCount = (subscribers || []).filter(s => s.status === 'unsubscribed' || s.unsubscribedAll === true).length;

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const last7DaysCount = activeList.filter(s => {
      const ts = s.createdAt?.seconds
        ? s.createdAt.seconds * 1000
        : new Date(s.subscribedAtISO || s.createdAt || 0).getTime();
      return ts >= sevenDaysAgo;
    }).length;

    // Segmento: Clientes VIP com pedidos aprovados/concluídos
    const paidOrders = (orders || []).filter(o => {
      const st = String(o.status || o.statusCode || '').toLowerCase();
      return st && st !== 'cancelado' && st !== 'aguardando_pagamento';
    });
    const paidClientEmails = new Set(
      paidOrders.map(o => String(o.customerEmail || o.email || o.clientEmail || '').trim().toLowerCase()).filter(Boolean)
    );

    // Lista de inscritos que também são clientes VIP com compras acumuladas
    const vipCustomersList = activeList.filter(s => {
      const em = String(s.email || '').trim().toLowerCase();
      return paidClientEmails.has(em) || String(s.source || '').toLowerCase().includes('order') || String(s.source || '').toLowerCase().includes('checkout');
    });

    const vipAudienceEmails = Array.from(new Set([
      ...vipCustomersList.map(s => String(s.email || '').trim().toLowerCase()),
      ...Array.from(paidClientEmails)
    ])).filter(Boolean);

    const allAudienceEmails = Array.from(new Set([
      ...activeList.map(s => String(s.email || '').trim().toLowerCase()),
      ...Array.from(paidClientEmails)
    ])).filter(Boolean);

    let targetEmails = [];
    if (dropAudienceSegment === 'test_admin') {
      targetEmails = [String(dropTestEmail || currentUser?.email || 'admin@lojathr33.com.br').trim().toLowerCase()];
    } else if (selectedSubEmails.length > 0) {
      targetEmails = selectedSubEmails;
    } else if (dropAudienceSegment === 'vip_customers') {
      targetEmails = vipAudienceEmails;
    } else {
      targetEmails = allAudienceEmails;
    }

    return {
      totalActive: activeList.length,
      unsubscribedCount,
      last7DaysCount,
      allAudienceCount: allAudienceEmails.length,
      vipCustomersCount: Math.max(vipAudienceEmails.length, vipCustomersList.length),
      filteredAudienceCount: targetEmails.length,
      targetRecipientsEmails: targetEmails,
      activeList
    };
  }, [subscribers, orders, dropTargetFilter, dropAudienceSegment, selectedSubEmails, dropTestEmail, currentUser?.email]);

  // Seleção individual ou em massa de inscritos
  const handleToggleSelectSubscriber = (email) => {
    const clean = String(email || '').trim().toLowerCase();
    if (!clean) return;
    setSelectedSubEmails(prev => {
      const next = prev.includes(clean) ? prev.filter(e => e !== clean) : [...prev, clean];
      if (next.length > 0 && dropTargetFilter !== 'selected') {
        setDropTargetFilter('selected');
      } else if (next.length === 0 && dropTargetFilter === 'selected') {
        setDropTargetFilter('all');
      }
      return next;
    });
  };

  const handleSelectAllDisplayedSubscribers = () => {
    const activeDisplayedEmails = displayedSubscribers
      .filter(s => s.status !== 'unsubscribed')
      .map(s => String(s.email || '').trim().toLowerCase())
      .filter(Boolean);

    if (selectedSubEmails.length === activeDisplayedEmails.length && activeDisplayedEmails.length > 0) {
      setSelectedSubEmails([]);
      if (dropTargetFilter === 'selected') setDropTargetFilter('all');
    } else {
      setSelectedSubEmails(activeDisplayedEmails);
      if (activeDisplayedEmails.length > 0) setDropTargetFilter('selected');
    }
  };

  // Adicionar inscrito manualmente pelo painel Admin
  const handleAddSubscriberManual = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = newSubEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setBroadcastFeedback({ type: 'error', message: 'Informe um e-mail válido para adicionar à Lista VIP.' });
      return;
    }

    setAddingSubscriber(true);
    try {
      await dropSubscriberService.subscribeToDropWaitlist({
        email: cleanEmail,
        name: newSubName.trim(),
        dropId: currentDropConfig?.id || 'drop-thr33',
        dropName: currentDropConfig?.title || 'PRÓXIMO DROP THR33',
        source: 'manual_admin',
        sendWelcome: newSubSendWelcome
      });
      const updatedSubs = await dropSubscriberService.getAllSubscribers();
      setSubscribers(updatedSubs || []);
      setNewSubEmail('');
      setNewSubName('');
      setShowAddSubPanel(false);
      setBroadcastFeedback({
        type: 'success',
        message: `Inscrito ${cleanEmail} adicionado à Lista VIP${newSubSendWelcome ? ' (e-mail de boas-vindas disparado)' : ''}.`
      });
    } catch (err) {
      setBroadcastFeedback({ type: 'error', message: err.message || 'Erro ao adicionar inscrito.' });
    } finally {
      setAddingSubscriber(false);
    }
  };

  // Alternar status ativo / inativo de um inscrito
  const handleToggleSubscriberStatus = async (sub) => {
    if (!sub?.id) return;
    const nextStatus = sub.status === 'unsubscribed' ? 'active' : 'unsubscribed';
    try {
      await dropSubscriberService.updateSubscriberStatus(sub.id, nextStatus);
      setSubscribers(prev => prev.map(item => item.id === sub.id ? { ...item, status: nextStatus } : item));
    } catch {
      setBroadcastFeedback({ type: 'error', message: 'Não foi possível atualizar o status do inscrito.' });
    }
  };

  // Excluir inscrito da Lista VIP
  const handleDeleteSubscriber = async (sub) => {
    if (!sub?.id) return;
    if (!window.confirm(`Remover ${sub.email} permanentemente da Lista VIP?`)) return;
    try {
      await dropSubscriberService.deleteSubscriber(sub.id);
      setSubscribers(prev => prev.filter(item => item.id !== sub.id));
      setSelectedSubEmails(prev => prev.filter(em => em !== String(sub.email || '').toLowerCase()));
    } catch {
      setBroadcastFeedback({ type: 'error', message: 'Não foi possível remover o inscrito.' });
    }
  };

  // Exportar CSV da Lista VIP (para Meta Ads Lookalike / Backup)
  const handleExportVipCsv = () => {
    if (!vipKpis.activeList.length) {
      alert('Ainda não há inscritos ativos na Lista VIP para exportar.');
      return;
    }

    const headers = ['email', 'name', 'source', 'status', 'subscribedAt'];
    const rows = vipKpis.activeList.map(sub => {
      const dateStr = sub.createdAt?.seconds
        ? new Date(sub.createdAt.seconds * 1000).toISOString()
        : (sub.subscribedAtISO || '');
      return [
        `"${String(sub.email || '').replace(/"/g, '""')}"`,
        `"${String(sub.name || '').replace(/"/g, '""')}"`,
        `"${String(sub.source || '').replace(/"/g, '""')}"`,
        `"${String(sub.status || 'active').replace(/"/g, '""')}"`,
        `"${dateStr}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `thr33_lista_vip_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Formata mensagens de retorno do Resend de forma clara para o Admin
  const formatResendErrorForAdmin = (rawErr) => {
    const str = String(rawErr || '');
    if (str.toLowerCase().includes('only send testing emails to your own email address') || str.includes('403')) {
      return 'Aviso Resend Sandbox: Enquanto o domínio lojathr33.com.br não estiver verificado no painel DNS do Resend, o remetente de testes permite envios apenas para o e-mail proprietário da conta Resend.';
    }
    return str || 'Verifique a configuração do Resend.';
  };

  // Disparo de Teste do E-mail de Drop
  const handleSendTestDropEmail = async () => {
    const targetEmail = (dropTestEmail || currentUser?.email || '').trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      setBroadcastFeedback({
        type: 'error',
        message: 'Informe um e-mail válido para receber a prévia de teste.'
      });
      return;
    }

    if (!dropEmailSubject.trim() || !dropManifesto.trim()) {
      setBroadcastFeedback({
        type: 'error',
        message: 'Preencha o Assunto e a Mensagem do e-mail antes de testar.'
      });
      return;
    }

    setSendingTestEmail(true);
    setBroadcastFeedback({ type: '', message: '' });
    try {
      const res = await emailService.sendDropBroadcastCampaign({
        mode: 'test',
        testEmail: targetEmail,
        subjectTitle: dropEmailSubject.trim(),
        dropName: dropEmailLabel.trim(),
        bannerUrl: enableBannerModule ? dropBannerUrl.trim() : '',
        manifestoText: dropManifesto.trim(),
        couponCode: enableCouponModule ? dropCouponCode.trim() : '',
        couponTitle: enableCouponModule ? dropCouponTitle.trim() : '',
        couponDescription: enableCouponModule ? dropCouponDesc.trim() : '',
        ctaUrl: enableCtaModule ? dropCtaUrl.trim() : '',
        ctaLabel: enableCtaModule ? (dropCtaLabel.trim() || 'ACESSAR O DROP AGORA') : '',
        showCta: enableCtaModule
      });

      if (res?.sent) {
        setBroadcastFeedback({
          type: 'success',
          message: `E-mail de teste enviado para ${targetEmail}. Verifique sua caixa de entrada (e aba Promoções/Spam).`
        });
      } else {
        setBroadcastFeedback({
          type: 'error',
          message: res?.reason === 'missing_api_key'
            ? 'Configure a variável RESEND_API_KEY em functions/.env para habilitar o envio real.'
            : `Não foi possível enviar para ${targetEmail}: ${formatResendErrorForAdmin(res?.error || res?.reason)}`
        });
      }
    } catch (err) {
      setBroadcastFeedback({
        type: 'error',
        message: err.message || 'Erro ao disparar e-mail de teste.'
      });
    } finally {
      setSendingTestEmail(false);
    }
  };

  // Disparo de Teste do E-mail de Recuperação de Carrinho Abandonado (24h)
  const handleTestAbandonedCart = async () => {
    const targetEmail = (dropTestEmail || currentUser?.email || '').trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      setBroadcastFeedback({
        type: 'error',
        message: 'Informe um e-mail válido para receber o teste de carrinho abandonado.'
      });
      return;
    }

    setSendingTestEmail(true);
    setBroadcastFeedback({ type: '', message: '' });
    try {
      const res = await emailService.triggerAbandonedCartEmail({
        email: targetEmail,
        uid: currentUser?.uid,
        forceTest: true,
        items: [
          {
            name: "Vale-Presente Digital THR33 (R$ 100)",
            price: 100,
            quantity: 1,
            size: "R$ 100",
            color: "Preto",
            isGiftCard: true,
            image: "https://thr33-streetwear.web.app/assets/vale-presente.jpg"
          }
        ],
        subtotal: 100,
        name: currentUser?.displayName || 'Wavem teste'
      });

      if (res?.sent) {
        setBroadcastFeedback({
          type: 'success',
          message: `E-mail de Carrinho Abandonado (24h) disparado para ${targetEmail}! Verifique sua caixa de entrada (e pasta de Spam).`
        });
      } else {
        setBroadcastFeedback({
          type: 'error',
          message: `Não foi possível enviar para ${targetEmail}: ${formatResendErrorForAdmin(res?.error || res?.reason)}`
        });
      }
    } catch (err) {
      setBroadcastFeedback({
        type: 'error',
        message: formatResendErrorForAdmin(err.message)
      });
    } finally {
      setSendingTestEmail(false);
    }
  };

  // Disparo Oficial para o Público-Alvo ou Selecionados
  const handleBroadcastDropEmail = async () => {
    if (dropAudienceSegment === 'test_admin') {
      return handleSendTestDropEmail();
    }

    if (vipKpis.filteredAudienceCount === 0) {
      setBroadcastFeedback({
        type: 'error',
        message: 'Nenhum destinatário ativo encontrado para o filtro selecionado.'
      });
      return;
    }

    if (!dropEmailSubject.trim() || !dropManifesto.trim()) {
      setBroadcastFeedback({
        type: 'error',
        message: 'Preencha o Assunto e a Mensagem antes de disparar.'
      });
      return;
    }

    const audienceLabel =
      dropAudienceSegment === 'vip_customers'
        ? 'Clientes VIP / Compras Acumuladas'
        : 'Todos os Inscritos e Clientes Ativos (Opt-in)';

    const confirmed = window.confirm(
      `Confirmar o disparo do e-mail "${dropEmailSubject}" para ${vipKpis.filteredAudienceCount} destinatário(s) no segmento [${audienceLabel}]?`
    );
    if (!confirmed) return;

    setSendingBroadcast(true);
    setBroadcastFeedback({ type: '', message: '' });
    try {
      const res = await emailService.sendDropBroadcastCampaign({
        mode: 'broadcast',
        customRecipients: vipKpis.targetRecipientsEmails,
        targetSource: dropAudienceSegment,
        subjectTitle: dropEmailSubject.trim(),
        dropName: dropEmailLabel.trim(),
        bannerUrl: enableBannerModule ? dropBannerUrl.trim() : '',
        manifestoText: dropManifesto.trim(),
        couponCode: enableCouponModule ? dropCouponCode.trim() : '',
        couponTitle: enableCouponModule ? dropCouponTitle.trim() : '',
        couponDescription: enableCouponModule ? dropCouponDesc.trim() : '',
        ctaUrl: enableCtaModule ? dropCtaUrl.trim() : '',
        ctaLabel: enableCtaModule ? (dropCtaLabel.trim() || 'ACESSAR O DROP AGORA') : '',
        showCta: enableCtaModule
      });

      if (res?.sent) {
        const partialNote =
          res.failedCount > 0
            ? ` (${res.failedCount} endereço(s) não entregue(s) por restrição de domínio/sandbox Resend).`
            : '.';
        setBroadcastFeedback({
          type: 'success',
          message: `Disparo concluído: ${res.count} de ${res.totalRecipients || vipKpis.filteredAudienceCount} e-mail(s) entregue(s) com sucesso${partialNote}`
        });
      } else {
        setBroadcastFeedback({
          type: 'error',
          message: res?.reason === 'missing_api_key'
            ? 'Configure a variável RESEND_API_KEY em functions/.env para disparar para a Lista VIP.'
            : res?.reason === 'all_subscribers_opted_out'
            ? 'Todos os destinatários deste filtro solicitaram cancelamento (opt-out) e foram protegidos pelo sistema anti-spam.'
            : `Não foi possível concluir o disparo: ${formatResendErrorForAdmin(res?.error || res?.reason)}`
        });
      }
    } catch (err) {
      setBroadcastFeedback({
        type: 'error',
        message: err.message || 'Falha ao disparar campanha.'
      });
    } finally {
      setSendingBroadcast(false);
    }
  };

  // Adicionar Nova Origem Customizada
  const handleAddNewSource = async (e) => {
    if (e) e.preventDefault();
    if (!newSourceLabel.trim()) return;
    const cleanVal = (newSourceValue || newSourceLabel).toLowerCase().trim().replace(/[\s_-]+/g, '_');
    
    try {
      const updated = await campaignService.addCustomUtmOption('source', {
        label: newSourceLabel.trim(),
        value: cleanVal
      });
      setCustomSources(updated);
      setUtmSource(cleanVal);
      setNewSourceLabel('');
      setNewSourceValue('');
      setShowAddSource(false);
    } catch (err) {
      alert("Erro ao adicionar nova origem.");
    }
  };

  // Adicionar Nova Mídia Customizada
  const handleAddNewMedium = async (e) => {
    if (e) e.preventDefault();
    if (!newMediumLabel.trim()) return;
    const cleanVal = (newMediumValue || newMediumLabel).toLowerCase().trim().replace(/[\s_-]+/g, '_');
    
    try {
      const updated = await campaignService.addCustomUtmOption('medium', {
        label: newMediumLabel.trim(),
        value: cleanVal
      });
      setCustomMediums(updated);
      setUtmMedium(cleanVal);
      setNewMediumLabel('');
      setNewMediumValue('');
      setShowAddMedium(false);
    } catch (err) {
      alert("Erro ao adicionar nova mídia.");
    }
  };

  // 1. FILTRAGEM TEMPORAL DE PEDIDOS PAGOS CONFORME PERÍODO SELECIONADO
  const paidOrders = useMemo(() => {
    return (orders || []).filter(o => isOrderPaid(o.status || o.statusCode));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (periodFilter === 'all') return paidOrders;
    return paidOrders.filter(order => isDateInPeriod(order, periodFilter, customStartDate, customEndDate));
  }, [paidOrders, periodFilter, customStartDate, customEndDate]);

  // 2. PROCESSAMENTO DINÂMICO DE MÉTRICAS POR CAMPANHA
  const processedCampaigns = useMemo(() => {
    return campaigns.map(camp => {
      const cleanCampaign = String(camp.utm_campaign || '').toLowerCase().trim();
      const cleanCampName = String(camp.name || '').toLowerCase().trim();
      const cleanSource = String(camp.utm_source || '').toLowerCase().trim();

      const matchingOrders = filteredOrders.filter(o => {
        const orderCamp = String(o.utm_campaign || '').toLowerCase().trim();
        const orderSrc = String(o.utm_source || '').toLowerCase().trim();

        if (orderCamp && orderCamp !== 'nenhuma' && orderCamp !== 'null' && orderCamp !== 'undefined') {
          if (cleanCampaign && (orderCamp === cleanCampaign || orderCamp.replace(/_/g, '') === cleanCampaign.replace(/_/g, ''))) return true;
          if (cleanCampName && (orderCamp === cleanCampName || cleanCampName.includes(orderCamp) || orderCamp.includes(cleanCampName))) return true;
        }

        if ((!orderCamp || orderCamp === 'nenhuma' || orderCamp === 'null') && cleanSource && orderSrc && orderSrc === cleanSource) {
          return true;
        }
        return false;
      });

      const ordersPurchases = matchingOrders.length;
      const ordersRevenue = matchingOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

      const firestorePurchases = Number(camp.purchases || 0);
      const firestoreRevenue = Number(camp.revenue || 0);

      const hasRecentPurchaseInPeriod = camp.lastPurchaseAt 
        ? isDateInPeriod(camp.lastPurchaseAt, periodFilter, customStartDate, customEndDate) 
        : false;

      let periodPurchases = 0;
      let periodRevenue = 0;

      if (periodFilter === 'all') {
        periodPurchases = Math.max(ordersPurchases, firestorePurchases);
        periodRevenue = ordersPurchases > 0 ? ordersRevenue : firestoreRevenue;
      } else {
        if (ordersPurchases > 0) {
          periodPurchases = ordersPurchases;
          periodRevenue = ordersRevenue;
        } else if (hasRecentPurchaseInPeriod && firestorePurchases > 0) {
          periodPurchases = firestorePurchases;
          periodRevenue = firestoreRevenue;
        } else {
          periodPurchases = 0;
          periodRevenue = 0;
        }
      }

      const clicks = Number(camp.clicks || 0);
      const cartAdds = Number(camp.cartAdds || 0);
      const conversion = clicks > 0 
        ? Math.min(100, (periodPurchases / clicks) * 100).toFixed(1) 
        : (periodPurchases > 0 ? '100.0' : '0.0');

      return {
        ...camp,
        clicks,
        cartAdds,
        purchases: periodPurchases,
        revenue: periodRevenue,
        conversion
      };
    }).sort((a, b) => (Number(b.revenue || 0) - Number(a.revenue || 0)) || (Number(b.clicks || 0) - Number(a.clicks || 0)));
  }, [campaigns, filteredOrders, periodFilter, customStartDate, customEndDate]);

  // KPIs Consolidados para o período selecionado
  const totalKpis = useMemo(() => {
    return processedCampaigns.reduce((acc, c) => ({
      clicks: acc.clicks + (Number(c.clicks) || 0),
      cartAdds: acc.cartAdds + (Number(c.cartAdds) || 0),
      purchases: acc.purchases + (Number(c.purchases) || 0),
      revenue: acc.revenue + (Number(c.revenue) || 0)
    }), { clicks: 0, cartAdds: 0, purchases: 0, revenue: 0 });
  }, [processedCampaigns]);

  // Opções de origens / canais com contagem de campanhas
  const sourceOptions = useMemo(() => {
    const counts = {};
    processedCampaigns.forEach(c => {
      const src = (c.utm_source || 'instagram').toLowerCase();
      counts[src] = (counts[src] || 0) + 1;
    });

    const knownSources = allSources.map(s => s.value);
    const allKeys = Array.from(new Set([...knownSources, ...Object.keys(counts)]));

    return allKeys
      .filter(k => (counts[k] || 0) > 0 || allSources.some(s => s.value === k))
      .map(k => {
        const found = allSources.find(s => s.value === k);
        return {
          key: k,
          label: found ? found.label : (k.charAt(0).toUpperCase() + k.slice(1)),
          count: counts[k] || 0
        };
      });
  }, [processedCampaigns, allSources]);

  // Manipulador de ordenação com 3 estados (Maior/A-Z -> Menor/Z-A -> Padrão)
  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key !== key || prev.direction === 'none') {
        const initialDir = (key === 'name' || key === 'target' || key === 'status') ? 'asc' : 'desc';
        return { key, direction: initialDir };
      }
      const isText = key === 'name' || key === 'target' || key === 'status';
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
      case 'name': return 'Campanha/Canal';
      case 'target': return 'Destino/UTM';
      case 'clicks': return 'Cliques';
      case 'cartAdds': return 'Sacola';
      case 'purchases': return 'Vendas';
      case 'revenue': return 'Receita';
      case 'conversion': return 'Conversão';
      case 'status': return 'Status';
      default: return '';
    }
  };

  // Limpa todos os filtros e ordenações da tabela
  const handleClearAllFilters = () => {
    setCampaignSearchQuery('');
    setSourceFilter('all');
    setStatusFilter('all');
    setSortConfig({ key: null, direction: 'none' });
  };

  // Campanhas filtradas por busca, origem, status e ordenadas
  const displayedCampaigns = useMemo(() => {
    let list = [...processedCampaigns];

    // 1. Filtro por Origem (Canal)
    if (sourceFilter !== 'all') {
      list = list.filter(c => (c.utm_source || '').toLowerCase() === sourceFilter.toLowerCase());
    }

    // 2. Filtro por Status
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') list = list.filter(c => c.active !== false);
      if (statusFilter === 'paused') list = list.filter(c => c.active === false);
      if (statusFilter === 'with_sales') list = list.filter(c => Number(c.purchases || 0) > 0);
    }

    // 3. Busca por texto
    if (campaignSearchQuery && campaignSearchQuery.trim()) {
      const q = campaignSearchQuery.toLowerCase().trim();
      list = list.filter(c => {
        const name = (c.name || '').toLowerCase();
        const src = (c.utm_source || '').toLowerCase();
        const med = (c.utm_medium || '').toLowerCase();
        const utm = (c.utm_campaign || '').toLowerCase();
        const target = (c.targetPath || '').toLowerCase();
        return name.includes(q) || src.includes(q) || med.includes(q) || utm.includes(q) || target.includes(q);
      });
    }

    // 4. Ordenação Interativa
    if (sortConfig.key && sortConfig.direction !== 'none') {
      const { key, direction } = sortConfig;
      list.sort((a, b) => {
        if (key === 'name') {
          const comp = String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base' });
          return direction === 'asc' ? comp : -comp;
        }
        if (key === 'target') {
          const comp = String(a.targetPath || '').localeCompare(String(b.targetPath || ''), 'pt-BR', { sensitivity: 'base' });
          return direction === 'asc' ? comp : -comp;
        }
        if (key === 'clicks') {
          const valA = Number(a.clicks || 0);
          const valB = Number(b.clicks || 0);
          return direction === 'asc' ? valA - valB : valB - valA;
        }
        if (key === 'cartAdds') {
          const valA = Number(a.cartAdds || 0);
          const valB = Number(b.cartAdds || 0);
          return direction === 'asc' ? valA - valB : valB - valA;
        }
        if (key === 'purchases') {
          const valA = Number(a.purchases || 0);
          const valB = Number(b.purchases || 0);
          return direction === 'asc' ? valA - valB : valB - valA;
        }
        if (key === 'revenue') {
          const valA = Number(a.revenue || 0);
          const valB = Number(b.revenue || 0);
          return direction === 'asc' ? valA - valB : valB - valA;
        }
        if (key === 'conversion') {
          const valA = parseFloat(a.conversion || 0);
          const valB = parseFloat(b.conversion || 0);
          return direction === 'asc' ? valA - valB : valB - valA;
        }
        if (key === 'status') {
          const valA = a.active !== false ? 1 : 0;
          const valB = b.active !== false ? 1 : 0;
          return direction === 'asc' ? valA - valB : valB - valA;
        }
        return 0;
      });
    }

    return list;
  }, [processedCampaigns, sourceFilter, statusFilter, campaignSearchQuery, sortConfig]);

  const handleOpenModal = (camp = null) => {
    setShowAddSource(false);
    setShowAddMedium(false);
    if (camp) {
      setEditingCampaign(camp);
      setName(camp.name || '');
      setUtmSource(camp.utm_source || 'instagram');
      setUtmMedium(camp.utm_medium || 'stories');
      setUtmCampaign(camp.utm_campaign || '');
      setTargetPath(camp.targetPath || '/catalogo');
    } else {
      setEditingCampaign(null);
      setName('');
      setUtmSource('instagram');
      setUtmMedium('stories');
      setUtmCampaign('');
      setTargetPath('/catalogo');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim() || !utmCampaign.trim()) {
      alert("Preencha o nome e o código UTM da campanha.");
      return;
    }

    setSaving(true);
    try {
      const cleanCampaign = utmCampaign.toLowerCase().trim().replace(/[\s_-]+/g, '_');
      await campaignService.saveCampaign({
        id: editingCampaign?.id,
        name: name.trim(),
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: cleanCampaign,
        targetPath: targetPath.trim() || '/catalogo',
        fullUrl: generatedUrl,
        active: editingCampaign ? editingCampaign.active : true,
        clicks: editingCampaign ? Number(editingCampaign.clicks || 0) : 0,
        cartAdds: editingCampaign ? Number(editingCampaign.cartAdds || 0) : 0,
        purchases: editingCampaign ? Number(editingCampaign.purchases || 0) : 0,
        revenue: editingCampaign ? Number(editingCampaign.revenue || 0) : 0
      });

      setIsModalOpen(false);
      await loadCampaigns();
    } catch (err) {
      alert("Erro ao salvar campanha no Firestore.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente excluir este link de campanha?")) return;
    try {
      await campaignService.deleteCampaign(id);
      setCampaigns(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert("Erro ao excluir campanha.");
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await campaignService.toggleCampaignStatus(id, currentStatus);
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, active: !currentStatus } : c));
    } catch (err) {
      alert("Erro ao alterar status da campanha.");
    }
  };

  const handleCopyLink = (url, id) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <header className={styles.header}>
        <div>
          <span className={styles.breadcrumb}>CMS // MARKETING, COMUNICAÇÃO & RASTREIOS</span>
          <h1 className={styles.title}>
            {activeMainTab === 'vip'
              ? 'EARLY ACCESS // LISTA VIP & E-MAIL'
              : 'CAMPANHAS, UTMS & LINKS RASTREÁVEIS'}
          </h1>
        </div>

        <div className={styles.headerActions}>
          {activeMainTab === 'utms' ? (
            <>
              {/* FILTRO DE PERÍODO COM SELETOR DE DATAS */}
              <div className={styles.periodControlWrapper}>
                <div className={styles.periodFilterGroup}>
                  <button 
                    className={`${styles.filterBtn} ${periodFilter === 'today' ? styles.activeFilter : ''}`}
                    onClick={() => { setPeriodFilter('today'); setShowCustomPicker(false); }}
                  >
                    Hoje
                  </button>
                  <button 
                    className={`${styles.filterBtn} ${periodFilter === '7days' ? styles.activeFilter : ''}`}
                    onClick={() => { setPeriodFilter('7days'); setShowCustomPicker(false); }}
                  >
                    7 Dias
                  </button>
                  <button 
                    className={`${styles.filterBtn} ${periodFilter === '30days' ? styles.activeFilter : ''}`}
                    onClick={() => { setPeriodFilter('30days'); setShowCustomPicker(false); }}
                  >
                    30 Dias
                  </button>
                  <button 
                    className={`${styles.filterBtn} ${periodFilter === 'all' ? styles.activeFilter : ''}`}
                    onClick={() => { setPeriodFilter('all'); setShowCustomPicker(false); }}
                  >
                    Todo o Período
                  </button>
                  <button 
                    className={`${styles.filterBtn} ${styles.customPeriodBtn} ${periodFilter === 'custom' ? styles.activeFilter : ''}`}
                    onClick={() => setShowCustomPicker(prev => !prev)}
                    title="Filtrar por intervalo de datas personalizado"
                  >
                    <Calendar size={13} />
                    <span>
                      {periodFilter === 'custom' && customStartDate && customEndDate
                        ? `${formatShortDate(customStartDate)} - ${formatShortDate(customEndDate)}`
                        : 'Datas'}
                    </span>
                  </button>
                  <button 
                    onClick={loadCampaigns} 
                    disabled={refreshing} 
                    className={styles.refreshBtn}
                    title="Atualizar Campanhas"
                    aria-label="Atualizar dados"
                  >
                    <RotateCw size={13} className={refreshing ? styles.spinning : ''} />
                  </button>
                </div>

                {/* PAINEL FLUTUANTE DE SELEÇÃO DE DATA */}
                {showCustomPicker && (
                  <div className={styles.customDateBar}>
                    <div className={styles.dateField}>
                      <label>DE</label>
                      <input 
                        type="date" 
                        value={customStartDate} 
                        max={customEndDate || getTodayStr()}
                        onChange={handleStartDateChange}
                        className={styles.dateInput}
                      />
                    </div>
                    <span className={styles.dateDivider}>—</span>
                    <div className={styles.dateField}>
                      <label>ATÉ</label>
                      <input 
                        type="date" 
                        value={customEndDate} 
                        min={customStartDate}
                        max={getTodayStr()}
                        onChange={handleEndDateChange}
                        className={styles.dateInput}
                      />
                    </div>
                    <button 
                      onClick={handleApplyCustomDate}
                      className={styles.applyDateBtn}
                      title="Aplicar intervalo"
                    >
                      <Check size={13} />
                      <span>APLICAR</span>
                    </button>
                    <button 
                      onClick={() => setShowCustomPicker(false)}
                      className={styles.closeDateBtn}
                      title="Fechar"
                    >
                      <X size={13} />
                    </button>
                    {dateValidationErr && (
                      <span className={styles.dateErrorText}>{dateValidationErr}</span>
                    )}
                  </div>
                )}
              </div>

              <button onClick={() => handleOpenModal()} className={styles.createBtn}>
                <Plus size={14} />
                <span>NOVA CAMPANHA / UTM</span>
              </button>
            </>
          ) : (
            <div className={styles.vipHeaderQuickBar}>
              <button
                type="button"
                onClick={loadCampaigns}
                disabled={refreshing}
                className={styles.refreshBtn}
                title="Recarregar inscritos"
              >
                <RotateCw size={13} className={refreshing ? styles.spinning : ''} />
              </button>
              <button
                type="button"
                onClick={() => setShowEmailPreviewModal(true)}
                className={styles.vipOutlineBtn}
              >
                <Eye size={13} />
                <span>VER PRÉVIA DO E-MAIL</span>
              </button>
              <button
                type="button"
                onClick={handleExportVipCsv}
                className={styles.vipOutlineBtn}
                title="Exportar inscritos ativos em CSV"
              >
                <Download size={13} />
                <span>EXPORTAR CSV ({vipKpis.totalActive})</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAddSubPanel(prev => !prev)}
                className={styles.createBtn}
              >
                <UserPlus size={14} />
                <span>ADICIONAR INSCRITO</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* NAVEGAÇÃO DE ABAS LIMPA (EVITA POLUIÇÃO VISUAL) */}
      <div className={styles.mainTabsRow}>
        <button
          type="button"
          onClick={() => setActiveMainTab('vip')}
          className={`${styles.mainTabBtn} ${activeMainTab === 'vip' ? styles.mainTabBtnActive : ''}`}
        >
          <Mail size={14} />
          <span>EARLY ACCESS // LISTA VIP & E-MAIL</span>
          <span className={styles.mainTabCounter}>{vipKpis.totalActive}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMainTab('utms')}
          className={`${styles.mainTabBtn} ${activeMainTab === 'utms' ? styles.mainTabBtnActive : ''}`}
        >
          <Link2 size={14} />
          <span>LINKS RASTREÁVEIS & UTMs</span>
          <span className={styles.mainTabCounter}>{processedCampaigns.length}</span>
        </button>
      </div>

      {activeMainTab === 'utms' && (
        <>
          {/* 4 CARDS DE KPIS */}
          <section className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiTop}>
                <span className={styles.kpiLabel}>CLIQUES TOTAIS (UTM)</span>
                <InfoTooltip 
                  text="Total de acessos únicos originados exclusivamente por links de campanha rastreados." 
                  title="Cliques em Links UTM"
                  position="bottom"
                  align="right"
                  width="260px"
                />
              </div>
              <strong className={styles.kpiValue}>{totalKpis.clicks}</strong>
              <small className={styles.kpiSub}>Acessos registrados via tráfego</small>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiTop}>
                <span className={styles.kpiLabel}>ADIÇÕES À SACOLA</span>
                <InfoTooltip 
                  text="Itens colocados na sacola por visitantes vindos diretamente de campanhas com UTM ativo." 
                  title="Adições via Campanha"
                  position="bottom"
                  align="right"
                  width="260px"
                />
              </div>
              <strong className={styles.blueValue}>+{totalKpis.cartAdds} un.</strong>
              <small className={styles.kpiSub}>Itens adicionados no carrinho</small>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiTop}>
                <span className={styles.kpiLabel}>PEDIDOS PAGOS ({periodLabel})</span>
                <InfoTooltip 
                  text="Compras concluídas no período selecionado atribuídas aos links de tráfego de origem." 
                  title="Conversão de Pedidos"
                  position="bottom"
                  align="right"
                  width="260px"
                />
              </div>
              <strong className={styles.greenValue}>{totalKpis.purchases} ped.</strong>
              <small className={styles.kpiSub}>
                Taxa média: {totalKpis.clicks > 0 ? ((totalKpis.purchases / totalKpis.clicks) * 100).toFixed(1) : '0.0'}% de conversão
              </small>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiTop}>
                <span className={styles.kpiLabel}>FATURAMENTO VIA UTMS ({periodLabel})</span>
                <InfoTooltip 
                  text="Receita líquida total gerada no período pelos canais de marketing e links parametrizados." 
                  title="Receita Atribuída"
                  position="bottom"
                  align="right"
                  width="260px"
                />
              </div>
              <strong className={styles.greenValue}>
                R$ {totalKpis.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
              <small className={styles.kpiSub}>Retorno sobre investimento</small>
            </div>
          </section>

          {/* BARRA DE CONTROLES E FILTROS */}
          <div className={styles.controlBar}>
            <div className={styles.controlBarTop}>
              <div className={styles.searchBox}>
                <Search size={14} className={styles.searchIcon} />
                <input 
                  type="text" 
                  placeholder="Buscar por campanha, origem, mídia, UTM ou destino..." 
                  value={campaignSearchQuery}
                  onChange={(e) => setCampaignSearchQuery(e.target.value)}
                />
                {campaignSearchQuery && (
                  <button 
                    onClick={() => setCampaignSearchQuery('')} 
                    className={styles.clearSearchBtn} 
                    title="Limpar busca"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className={styles.filtersGroup}>
                <div className={styles.filterSelectWrapper}>
                  <Layers size={13} className={styles.filterSelectIcon} />
                  <select 
                    value={sourceFilter} 
                    onChange={(e) => setSourceFilter(e.target.value)} 
                    className={styles.filterSelect}
                  >
                    <option value="all">TODAS AS ORIGENS ({processedCampaigns.length})</option>
                    {sourceOptions.map(opt => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label.toUpperCase()} ({opt.count})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.filterSelectWrapper}>
                  <Filter size={13} className={styles.filterSelectIcon} />
                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)} 
                    className={styles.filterSelect}
                  >
                    <option value="all">TODOS OS STATUS</option>
                    <option value="active">APENAS ATIVOS</option>
                    <option value="paused">APENAS PAUSADOS</option>
                    <option value="with_sales">COM VENDAS NO PERÍODO</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.controlBarBottom}>
              <div className={styles.tableMetaInfo}>
                <span className={styles.tableMetaCount}>
                  {displayedCampaigns.length} {displayedCampaigns.length === 1 ? 'campanha listada' : 'campanhas listadas'}
                  {(campaignSearchQuery || sourceFilter !== 'all' || statusFilter !== 'all') && ` (de ${processedCampaigns.length})`}
                </span>
                {(campaignSearchQuery || sourceFilter !== 'all' || statusFilter !== 'all' || (sortConfig.key && sortConfig.direction !== 'none')) && (
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

          {/* TABELA DE LINKS & PERFORMANCE */}
          <section className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <h3>LINKS ATIVOS & DESEMPENHO DE CANAIS ({displayedCampaigns.length}) — {periodLabel}</h3>
            </div>

            <div className={styles.tableResponsive}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th
                      onClick={() => handleSort('name')}
                      className={styles.sortableTh}
                      title="Clique para ordenar por Campanha & Canal"
                    >
                      <div className={styles.thSortContent}>
                        <span>CAMPANHA & CANAL</span>
                        {renderSortIcon('name')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('target')}
                      className={styles.sortableTh}
                      title="Clique para ordenar por Destino & Identificador"
                    >
                      <div className={styles.thSortContent}>
                        <span>DESTINO & IDENTIFICADOR</span>
                        {renderSortIcon('target')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('clicks')}
                      className={styles.sortableTh}
                      title="Clique para ordenar por Cliques"
                    >
                      <div className={styles.thSortContent}>
                        <span>CLIQUES</span>
                        {renderSortIcon('clicks')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('cartAdds')}
                      className={styles.sortableTh}
                      title="Clique para ordenar por Sacola"
                    >
                      <div className={styles.thSortContent}>
                        <span>SACOLA</span>
                        {renderSortIcon('cartAdds')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('purchases')}
                      className={styles.sortableTh}
                      title="Clique para ordenar por Vendas"
                    >
                      <div className={styles.thSortContent}>
                        <span>VENDAS</span>
                        {renderSortIcon('purchases')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('revenue')}
                      className={styles.sortableTh}
                      title="Clique para ordenar por Receita"
                    >
                      <div className={styles.thSortContent}>
                        <span>RECEITA</span>
                        {renderSortIcon('revenue')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('conversion')}
                      className={styles.sortableTh}
                      title="Clique para ordenar por Conversão"
                    >
                      <div className={styles.thSortContent}>
                        <span>CONVERSÃO</span>
                        {renderSortIcon('conversion')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('status')}
                      className={styles.sortableTh}
                      title="Clique para ordenar por Status"
                    >
                      <div className={styles.thSortContent}>
                        <span>STATUS</span>
                        {renderSortIcon('status')}
                      </div>
                    </th>
                    <th>AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="9" className={styles.centerText}>
                        <RotateCw size={18} className={styles.spinning} />
                        <span>Carregando campanhas do Firestore...</span>
                      </td>
                    </tr>
                  ) : displayedCampaigns.length === 0 ? (
                    <tr>
                      <td colSpan="9" className={styles.centerText}>
                        <span>
                          {campaignSearchQuery || sourceFilter !== 'all' || statusFilter !== 'all'
                            ? 'Nenhuma campanha encontrada com os filtros selecionados.'
                            : 'Nenhum link de campanha cadastrado. Clique no botão acima para criar o primeiro!'}
                        </span>
                      </td>
                    </tr>
                  ) : (
                    displayedCampaigns.map(camp => {
                      const clicks = Number(camp.clicks) || 0;
                      const purchases = Number(camp.purchases) || 0;
                      const revenue = Number(camp.revenue) || 0;
                      const conversion = camp.conversion || (clicks > 0 ? Math.min(100, (purchases / clicks) * 100).toFixed(1) : '0.0');

                      return (
                        <tr key={camp.id}>
                          <td>
                            <div className={styles.campInfo}>
                              <strong>{camp.name}</strong>
                              <div className={styles.tagsRow}>
                                <span className={styles.sourceTag}>{camp.utm_source?.toUpperCase()}</span>
                                <span className={styles.mediumTag}>{camp.utm_medium}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className={styles.urlCell}>
                              <code>{camp.targetPath || '/catalogo'}</code>
                              <small className={styles.utmTag}>utm_campaign={camp.utm_campaign}</small>
                            </div>
                          </td>
                          <td><strong>{clicks}</strong></td>
                          <td><span className={styles.blueText}>+{camp.cartAdds || 0}</span></td>
                          <td><strong className={styles.greenText}>{purchases} un.</strong></td>
                          <td>
                            <strong>R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                          </td>
                          <td>
                            <div className={styles.conversionBox}>
                              <strong>{conversion}%</strong>
                              <div className={styles.miniBar}>
                                <div style={{ width: `${Math.min(Number(conversion) * 3, 100)}%` }}></div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <button 
                              onClick={() => handleToggleStatus(camp.id, camp.active)}
                              className={`${styles.statusPill} ${camp.active ? styles.statusActive : styles.statusPaused}`}
                              title="Clique para alternar o status"
                            >
                              {camp.active ? 'ATIVO' : 'PAUSADO'}
                            </button>
                          </td>
                          <td>
                            <div className={styles.actionsRow}>
                              <button 
                                onClick={() => handleCopyLink(camp.fullUrl || generatedUrl, camp.id)}
                                className={`${styles.copyBtn} ${copiedId === camp.id ? styles.copiedBtnActive : ''}`}
                                title="Copiar Link Parametrizado"
                              >
                                {copiedId === camp.id ? (
                                  <>
                                    <Check size={12} />
                                    <span>COPIADO</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={12} />
                                    <span>COPIAR</span>
                                  </>
                                )}
                              </button>
                              <button 
                                onClick={() => handleOpenModal(camp)} 
                                className={styles.editBtn} 
                                title="Editar Campanha"
                                aria-label="Editar"
                              >
                                <Pencil size={13} />
                              </button>
                              <button 
                                onClick={() => handleDelete(camp.id)} 
                                className={styles.deleteBtn} 
                                title="Excluir Campanha"
                                aria-label="Excluir"
                              >
                                <Trash2 size={13} />
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
          </section>
        </>
      )}

      {/* ====================================================================
          ABA 2: EARLY ACCESS // LISTA VIP & DISPARO DE E-MAIL (100% P&B)
         ==================================================================== */}
      {activeMainTab === 'vip' && (
        <section className={styles.vipWorkspace}>
          {/* 3 KPIS MINIMALISTAS MONOCROMÁTICOS */}
          <div className={styles.vipKpiGrid}>
            <div className={styles.vipKpiBox}>
              <span className={styles.vipKpiLabel}>INSCRITOS ATIVOS</span>
              <strong className={styles.vipKpiValue}>{vipKpis.totalActive}</strong>
              <small className={styles.vipKpiSub}>Habilitados para receber disparos</small>
            </div>
            <div className={styles.vipKpiBox}>
              <span className={styles.vipKpiLabel}>DESTINATÁRIOS NO FILTRO ATUAL</span>
              <strong className={styles.vipKpiValue}>{vipKpis.filteredAudienceCount}</strong>
              <small className={styles.vipKpiSub}>
                {dropTargetFilter === 'selected'
                  ? `${selectedSubEmails.length} selecionado(s) manualmente`
                  : 'Público selecionado para o disparo'}
              </small>
            </div>
            <div className={styles.vipKpiBox}>
              <span className={styles.vipKpiLabel}>NOVOS NOS ÚLTIMOS 7 DIAS</span>
              <strong className={styles.vipKpiValue}>+{vipKpis.last7DaysCount}</strong>
              <small className={styles.vipKpiSub}>Cadastros recentes na Lista VIP</small>
            </div>
          </div>

          <div className={styles.vipComposerGrid}>
            {/* COLUNA ESQUERDA: COMPOSITOR MODULAR DE E-MAIL */}
            <div className={styles.vipComposerForm}>
              <div className={styles.vipComposerTopBar}>
                <div className={styles.vipComposerBlockTitle}>
                  <Mail size={14} />
                  <span>COMPOSITOR DE E-MAIL // LISTA VIP</span>
                </div>
                <span className={styles.vipPresetsHint}>MODELOS RÁPIDOS:</span>
              </div>

              {/* BARRA DE PRESETS RÁPIDOS (1 CLIQUE) */}
              <div className={styles.vipPresetsRow}>
                {[
                  { id: 'drop_launch', label: 'Lançamento de Drop' },
                  { id: 'early_access', label: 'Acesso Antecipado VIP' },
                  { id: 'vip_coupon', label: 'Cupom Exclusivo' },
                  { id: 'custom_notice', label: 'Comunicado Livre' }
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyEmailPreset(p.id)}
                    className={`${styles.vipPresetPill} ${activeEmailPreset === p.id ? styles.vipPresetPillActive : ''}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* CAMPOS ESSENCIAIS */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Assunto / Título Principal do E-mail *</label>
                  <input
                    type="text"
                    placeholder="Ex: Novo Drop disponível — Acesso liberado"
                    value={dropEmailSubject}
                    onChange={(e) => setDropEmailSubject(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Subtítulo / Tag Superior (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: LISTA VIP // EARLY ACCESS"
                    value={dropEmailLabel}
                    onChange={(e) => setDropEmailLabel(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Mensagem Principal do E-mail *</label>
                <textarea
                  rows={4}
                  placeholder="Escreva a mensagem que será enviada aos inscritos..."
                  value={dropManifesto}
                  onChange={(e) => setDropManifesto(e.target.value)}
                  className={styles.vipTextarea}
                />
              </div>

              {/* SELETOR DE MÓDULOS EXTRAS (SEM POLUIÇÃO VISUAL) */}
              <div className={styles.vipModulesBar}>
                <span className={styles.vipModulesLabel}>BLOCOS OPCIONAIS NO E-MAIL:</span>
                <div className={styles.vipModuleToggles}>
                  <button
                    type="button"
                    onClick={() => setEnableBannerModule(prev => !prev)}
                    className={`${styles.vipModuleBtn} ${enableBannerModule ? styles.vipModuleBtnActive : ''}`}
                  >
                    <Image size={12} />
                    <span>{enableBannerModule ? '✓ Imagem / Banner' : '+ Imagem / Banner'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnableCouponModule(prev => !prev)}
                    className={`${styles.vipModuleBtn} ${enableCouponModule ? styles.vipModuleBtnActive : ''}`}
                  >
                    <Tag size={12} />
                    <span>{enableCouponModule ? '✓ Cupom / Senha VIP' : '+ Cupom / Senha VIP'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnableCtaModule(prev => !prev)}
                    className={`${styles.vipModuleBtn} ${enableCtaModule ? styles.vipModuleBtnActive : ''}`}
                  >
                    <ExternalLink size={12} />
                    <span>{enableCtaModule ? '✓ Botão de Ação (CTA)' : '+ Botão de Ação (CTA)'}</span>
                  </button>
                </div>
              </div>

              {/* MÓDULO OPCIONAL 1: BANNER / IMAGEM (3 FONTES: UPLOAD / CATÁLOGO / URL) */}
              {enableBannerModule && (
                <div className={styles.vipOptionalPanel}>
                  <div className={styles.vipBannerHeader}>
                    <label>IMAGEM / BANNER DE DESTAQUE DO E-MAIL</label>
                    {dropBannerUrl && (
                      <button
                        type="button"
                        onClick={() => setDropBannerUrl('')}
                        className={styles.vipBannerRemoveBtn}
                        title="Remover banner do e-mail"
                      >
                        <Trash2 size={12} />
                        <span>Remover Imagem</span>
                      </button>
                    )}
                  </div>

                  {/* SELETOR DE MODO (3 ABAS) */}
                  <div className={styles.vipBannerTabs}>
                    <button
                      type="button"
                      onClick={() => setBannerSourceMode('upload')}
                      className={`${styles.vipBannerTab} ${bannerSourceMode === 'upload' ? styles.vipBannerTabActive : ''}`}
                    >
                      <Upload size={13} />
                      <span>Enviar Arquivo (Upload)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBannerSourceMode('catalog');
                        handleOpenCatalogModal();
                      }}
                      className={`${styles.vipBannerTab} ${bannerSourceMode === 'catalog' ? styles.vipBannerTabActive : ''}`}
                    >
                      <Image size={13} />
                      <span>Selecionar do Catálogo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBannerSourceMode('url')}
                      className={`${styles.vipBannerTab} ${bannerSourceMode === 'url' ? styles.vipBannerTabActive : ''}`}
                    >
                      <Link2 size={13} />
                      <span>Colar URL Direta</span>
                    </button>
                  </div>

                  {/* ABA 1: UPLOAD STORAGE */}
                  {bannerSourceMode === 'upload' && (
                    <div className={styles.vipBannerUploadBox}>
                      <input
                        type="file"
                        ref={bannerFileInputRef}
                        accept="image/*"
                        onChange={handleBannerFileUpload}
                        style={{ display: 'none' }}
                        id="email-banner-upload-input"
                      />
                      <label htmlFor="email-banner-upload-input" className={styles.vipUploadDropZone}>
                        <Upload size={22} />
                        <span>
                          {isUploadingBanner ? 'Enviando imagem para o Storage...' : 'Clique para escolher uma imagem (PNG, JPG, WEBP)'}
                        </span>
                        <small>Upload direto e seguro para o Firebase Storage da THR33</small>
                      </label>
                      {uploadBannerStatus && (
                        <span className={styles.vipUploadStatus}>{uploadBannerStatus}</span>
                      )}
                    </div>
                  )}

                  {/* ABA 2: SELECIONAR DO CATÁLOGO */}
                  {bannerSourceMode === 'catalog' && (
                    <div className={styles.vipBannerCatalogBox}>
                      <button
                        type="button"
                        onClick={handleOpenCatalogModal}
                        className={styles.vipCatalogOpenBtn}
                      >
                        <Image size={14} />
                        <span>{dropBannerUrl ? 'Trocar Imagem do Catálogo' : 'Abrir Galeria de Produtos do Catálogo'}</span>
                      </button>
                    </div>
                  )}

                  {/* ABA 3: COLAR URL DIRETA */}
                  {bannerSourceMode === 'url' && (
                    <div className={styles.formGroup} style={{ marginTop: '0.4rem' }}>
                      <input
                        type="url"
                        placeholder="https://... (link direto da foto ou banner)"
                        value={dropBannerUrl}
                        onChange={(e) => setDropBannerUrl(e.target.value)}
                      />
                    </div>
                  )}

                  {/* PRÉVIA DA IMAGEM CARREGADA */}
                  {dropBannerUrl && (
                    <div className={styles.vipBannerCurrentPreview}>
                      <img src={dropBannerUrl} alt="Banner selecionado" />
                      <div className={styles.vipBannerPreviewMeta}>
                        <span className={styles.vipBannerMetaUrl} title={dropBannerUrl}>{dropBannerUrl}</span>
                        <span className={styles.vipBannerTag}>PRONTO PARA O E-MAIL</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MÓDULO OPCIONAL 2: CUPOM OU SENHA VIP */}
              {enableCouponModule && (
                <div className={styles.vipOptionalPanel}>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Código do Cupom ou Senha VIP</label>
                      <div className={styles.vipCouponSelectRow}>
                        <input
                          type="text"
                          placeholder="Ex: VIP10"
                          value={dropCouponCode}
                          onChange={(e) => setDropCouponCode(e.target.value.toUpperCase())}
                        />
                        {couponsList.length > 0 && (
                          <select
                            value=""
                            onChange={(e) => handleSelectCoupon(e.target.value)}
                            className={styles.vipQuickSelect}
                          >
                            <option value="">Puxar cupom...</option>
                            {couponsList.map(c => (
                              <option key={c.id} value={c.code || c.id}>
                                {getCouponDisplayLabel(c)}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Título da Caixa do Código</label>
                      <input
                        type="text"
                        placeholder="Ex: CREDENCIAL // LISTA VIP"
                        value={dropCouponTitle}
                        onChange={(e) => setDropCouponTitle(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Instrução / Validade do Código</label>
                    <input
                      type="text"
                      placeholder="Ex: Utilize este código no checkout antes que o lote esgote."
                      value={dropCouponDesc}
                      onChange={(e) => setDropCouponDesc(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* MÓDULO OPCIONAL 3: BOTÃO DE AÇÃO (CTA) */}
              {enableCtaModule && (
                <div className={styles.vipOptionalPanel}>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Texto do Botão</label>
                      <input
                        type="text"
                        placeholder="Ex: ACESSAR O DROP AGORA"
                        value={dropCtaLabel}
                        onChange={(e) => setDropCtaLabel(e.target.value)}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <div className={styles.labelWithAction}>
                        <label>Link de Destino</label>
                        {campaigns.length > 0 && (
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) setDropCtaUrl(e.target.value);
                            }}
                            className={styles.vipQuickSelectSmall}
                          >
                            <option value="">Usar link UTM criado...</option>
                            {campaigns.map(c => (
                              <option
                                key={c.id}
                                value={c.fullUrl || `${baseUrl}${c.targetPath || '/catalogo'}?utm_source=${c.utm_source}&utm_medium=${c.utm_medium}&utm_campaign=${c.utm_campaign}`}
                              >
                                {c.name} ({c.utm_campaign})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <input
                        type="url"
                        placeholder="https://lojathr33.com.br/catalogo"
                        value={dropCtaUrl}
                        onChange={(e) => setDropCtaUrl(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SEGMENTAÇÃO DE PÚBLICO-ALVO (TODOS VS. VIP VS. TESTE RÁPIDO) */}
              <div className={styles.vipAudienceContainer}>
                <label className={styles.vipAudienceTitle}>SEGMENTAÇÃO DE PÚBLICO-ALVO</label>
                <div className={styles.vipAudienceOptionsGrid}>
                  {/* OPÇÃO 1: TODOS OS INSCRITOS E CLIENTES ATIVOS */}
                  <label
                    className={`${styles.vipAudienceCard} ${dropAudienceSegment === 'all' ? styles.vipAudienceCardActive : ''}`}
                    onClick={() => setDropAudienceSegment('all')}
                  >
                    <input
                      type="radio"
                      name="dropAudienceSegment"
                      value="all"
                      checked={dropAudienceSegment === 'all'}
                      onChange={() => setDropAudienceSegment('all')}
                    />
                    <div className={styles.vipAudienceCardContent}>
                      <strong>Enviar para TODOS os Inscritos e Clientes Ativos (Opt-in)</strong>
                      <span>Base completa de inscritos na Lista VIP e clientes com consentimento</span>
                    </div>
                    <span className={styles.vipAudienceBadge}>{vipKpis.allAudienceCount}</span>
                  </label>

                  {/* OPÇÃO 2: CLIENTES VIP / COMPRAS ACUMULADAS */}
                  <label
                    className={`${styles.vipAudienceCard} ${dropAudienceSegment === 'vip_customers' ? styles.vipAudienceCardActive : ''}`}
                    onClick={() => setDropAudienceSegment('vip_customers')}
                  >
                    <input
                      type="radio"
                      name="dropAudienceSegment"
                      value="vip_customers"
                      checked={dropAudienceSegment === 'vip_customers'}
                      onChange={() => setDropAudienceSegment('vip_customers')}
                    />
                    <div className={styles.vipAudienceCardContent}>
                      <strong>Enviar apenas para Clientes VIP / Compras Acumuladas</strong>
                      <span>Clientes com pedidos aprovados/entregues e histórico de compras acumuladas</span>
                    </div>
                    <span className={styles.vipAudienceBadge}>{vipKpis.vipCustomersCount}</span>
                  </label>

                  {/* OPÇÃO 3: TESTE RÁPIDO (E-MAIL DE ADM) */}
                  <label
                    className={`${styles.vipAudienceCard} ${dropAudienceSegment === 'test_admin' ? styles.vipAudienceCardActive : ''}`}
                    onClick={() => setDropAudienceSegment('test_admin')}
                  >
                    <input
                      type="radio"
                      name="dropAudienceSegment"
                      value="test_admin"
                      checked={dropAudienceSegment === 'test_admin'}
                      onChange={() => setDropAudienceSegment('test_admin')}
                    />
                    <div className={styles.vipAudienceCardContent}>
                      <strong>Teste Rápido (Enviar apenas para o meu e-mail de ADM)</strong>
                      <span>Dispara uma prévia fiel de validação antes de soltar o disparo oficial</span>
                    </div>
                    <span className={styles.vipAudienceBadge}>1</span>
                  </label>
                </div>

                {/* Se teste rápido de adm estiver selecionado */}
                {dropAudienceSegment === 'test_admin' && (
                  <div className={styles.vipTestAdminBox}>
                    <label>E-mail do Administrador para Teste:</label>
                    <div className={styles.vipTestInputRow}>
                      <input
                        type="email"
                        placeholder="admin@lojathr33.com.br"
                        value={dropTestEmail || currentUser?.email || ''}
                        onChange={(e) => setDropTestEmail(e.target.value)}
                        className={styles.vipTestInput}
                      />
                    </div>
                  </div>
                )}

                {/* Se houver inscritos selecionados na coluna ao lado */}
                {selectedSubEmails.length > 0 && dropAudienceSegment !== 'test_admin' && (
                  <div className={styles.vipSelectedNotice}>
                    <span>Você possui <strong>{selectedSubEmails.length}</strong> inscrito(s) selecionado(s) manualmente na coluna ao lado.</span>
                    <button
                      type="button"
                      onClick={() => setSelectedSubEmails([])}
                      className={styles.vipClearSelectedBtn}
                    >
                      Limpar seleção manual
                    </button>
                  </div>
                )}
              </div>

              {broadcastFeedback.message && (
                <div className={broadcastFeedback.type === 'success' ? styles.vipFeedbackSuccess : styles.vipFeedbackError}>
                  {broadcastFeedback.message}
                </div>
              )}

              {/* RODAPÉ DE ENVIO: BOTÕES DE TESTE E DISPARO OFICIAL */}
              <div className={styles.vipActionsFooter}>
                {dropAudienceSegment === 'test_admin' && (
                  <button
                    type="button"
                    onClick={handleTestAbandonedCart}
                    disabled={sendingBroadcast || sendingTestEmail}
                    className={styles.vipCartTestBtn}
                    title="Dispara imediatamente o e-mail de recuperação de carrinho abandonado com o layout oficial P&B"
                  >
                    <ShoppingBag size={13} />
                    <span>TESTAR CARRINHO ABANDONADO (24H)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleBroadcastDropEmail}
                  disabled={sendingBroadcast || sendingTestEmail || (dropAudienceSegment !== 'test_admin' && vipKpis.filteredAudienceCount === 0)}
                  className={styles.vipBroadcastBtn}
                >
                  <Send size={13} />
                  <span>
                    {sendingBroadcast || sendingTestEmail
                      ? (dropAudienceSegment === 'test_admin' ? 'ENVIANDO TESTE PARA O ADM...' : 'PROCESSANDO DISPARO...')
                      : dropAudienceSegment === 'test_admin'
                      ? 'DISPARAR PRÉVIA DE TESTE PARA O ADM'
                      : `DISPARAR E-MAIL PARA ${vipKpis.filteredAudienceCount} DESTINATÁRIO(S)`}
                  </span>
                </button>
              </div>
            </div>

            {/* COLUNA DIREITA: GESTÃO DE INSCRITOS DA LISTA VIP */}
            <div className={styles.vipSubscribersSide}>
              <div className={styles.vipSubscribersHeader}>
                <div className={styles.vipComposerBlockTitle} style={{ borderBottom: 'none', paddingBottom: 0 }}>
                  <Users size={14} />
                  <span>BASE DE INSCRITOS ({displayedSubscribers.length})</span>
                </div>
                {displayedSubscribers.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllDisplayedSubscribers}
                    className={styles.vipSelectAllBtn}
                  >
                    {selectedSubEmails.length > 0 && selectedSubEmails.length === displayedSubscribers.filter(s => s.status !== 'unsubscribed').length
                      ? 'Limpar seleção'
                      : 'Selecionar todos'}
                  </button>
                )}
              </div>

              {/* PAINEL INLINE: ADICIONAR INSCRITO MANUALMENTE */}
              {showAddSubPanel && (
                <form onSubmit={handleAddSubscriberManual} className={styles.vipAddSubBox}>
                  <div className={styles.vipAddSubHeader}>
                    <span>NOVO INSCRITO MANUAL</span>
                    <button type="button" onClick={() => setShowAddSubPanel(false)} className={styles.inlineCloseBtn}>
                      <X size={13} />
                    </button>
                  </div>
                  <input
                    type="email"
                    placeholder="E-mail do cliente *"
                    value={newSubEmail}
                    onChange={(e) => setNewSubEmail(e.target.value)}
                    required
                    className={styles.inlineInput}
                  />
                  <input
                    type="text"
                    placeholder="Nome (opcional)"
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    className={styles.inlineInput}
                  />
                  <label className={styles.vipCheckRow}>
                    <input
                      type="checkbox"
                      checked={newSubSendWelcome}
                      onChange={(e) => setNewSubSendWelcome(e.target.checked)}
                    />
                    <span>Disparar e-mail de boas-vindas da Lista VIP</span>
                  </label>
                  <button type="submit" disabled={addingSubscriber} className={styles.inlineSaveBtn}>
                    <Check size={12} />
                    <span>{addingSubscriber ? 'SALVANDO...' : 'SALVAR NA LISTA VIP'}</span>
                  </button>
                </form>
              )}

              {/* BUSCA E FILTRO DE STATUS DOS INSCRITOS */}
              <div className={styles.vipSubSearchRow}>
                <div className={styles.vipSubSearchInputWrap}>
                  <Search size={13} className={styles.helperSearchIcon} />
                  <input
                    type="text"
                    placeholder="Buscar e-mail ou nome..."
                    value={subSearchQuery}
                    onChange={(e) => setSubSearchQuery(e.target.value)}
                    className={styles.helperSearchInput}
                  />
                  {subSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setSubSearchQuery('')}
                      className={styles.helperClearSearch}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <select
                  value={subStatusFilter}
                  onChange={(e) => setSubStatusFilter(e.target.value)}
                  className={styles.vipSubStatusSelect}
                >
                  <option value="active">Ativos ({vipKpis.totalActive})</option>
                  <option value="unsubscribed">Inativos ({vipKpis.unsubscribedCount})</option>
                  <option value="all">Todos ({subscribers.length})</option>
                </select>
              </div>

              {displayedSubscribers.length === 0 ? (
                <div className={styles.vipEmptyBox}>
                  Nenhum inscrito encontrado para o filtro atual.
                </div>
              ) : (
                <div className={styles.vipSubscribersList}>
                  {displayedSubscribers.map(sub => {
                    const cleanEmail = String(sub.email || '').trim().toLowerCase();
                    const isChecked = selectedSubEmails.includes(cleanEmail);
                    const isUnsub = sub.status === 'unsubscribed';

                    return (
                      <div
                        key={sub.id}
                        className={`${styles.vipSubscriberItem} ${isChecked ? styles.vipSubscriberItemSelected : ''} ${isUnsub ? styles.vipSubscriberItemMuted : ''}`}
                      >
                        <label className={styles.vipSubCheckArea}>
                          <input
                            type="checkbox"
                            disabled={isUnsub}
                            checked={isChecked}
                            onChange={() => handleToggleSelectSubscriber(cleanEmail)}
                          />
                          <div className={styles.vipSubMain}>
                            <strong title={sub.email}>{sub.email}</strong>
                            <span className={styles.vipSubName}>
                              {sub.name ? `${sub.name} • ` : ''}
                              {formatSubscriberSource(sub.source)}
                            </span>
                          </div>
                        </label>

                        <div className={styles.vipSubMeta}>
                          {isUnsub && (
                            <span className={styles.vipUnsubBadge}>
                              DESCADASTRADO
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteSubscriber(sub)}
                            className={styles.vipSubDeleteBtn}
                            title="Remover inscrito da Lista VIP"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* MODAL DE SELEÇÃO DE IMAGENS DO CATÁLOGO DE PRODUTOS */}
      {showCatalogModal && (
        <div className={styles.catalogPickerBackdrop} onClick={() => setShowCatalogModal(false)}>
          <div className={styles.catalogPickerModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.catalogPickerHeader}>
              <div className={styles.catalogPickerTitle}>
                <Image size={16} />
                <span>SELECIONAR FOTO DO CATÁLOGO THR33</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCatalogModal(false)}
                className={styles.closeBtn}
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            <div className={styles.catalogPickerSearchBox}>
              <input
                type="text"
                placeholder="Buscar produto por nome..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
              />
            </div>

            <div className={styles.catalogPickerBody}>
              {loadingCatalogProducts ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#737373', fontSize: '0.8rem' }}>
                  Carregando fotos do catálogo...
                </div>
              ) : (
                <div className={styles.catalogPickerGrid}>
                  {catalogProducts
                    .filter(p => {
                      if (!catalogSearch.trim()) return true;
                      return String(p.name || '').toLowerCase().includes(catalogSearch.toLowerCase().trim());
                    })
                    .map(p => {
                      const img = p.image || p.mediaUrl || (Array.isArray(p.images) ? p.images[0] : null);
                      if (!img) return null;
                      return (
                        <div
                          key={p.id}
                          className={styles.catalogPickerItem}
                          onClick={() => handleSelectProductImage(img)}
                          title={`Selecionar foto de: ${p.name}`}
                        >
                          <img src={img} alt={p.name} className={styles.catalogPickerThumb} />
                          <div className={styles.catalogPickerInfo}>
                            <strong className={styles.catalogPickerName}>{p.name}</strong>
                            <span className={styles.catalogPickerPrice}>
                              {p.price ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price) : 'THR33'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PRÉVIA FIEL DO E-MAIL P&B */}
      {showEmailPreviewModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowEmailPreviewModal(false)}>
          <div className={styles.modal} style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <Eye size={16} />
                <h2>PRÉVIA DO E-MAIL // ESTÉTICA P&B THR33</h2>
              </div>
              <button onClick={() => setShowEmailPreviewModal(false)} className={styles.closeBtn}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.emailPreviewContainer}>
              <div className={styles.emailPreviewHeader}>
                <span className={styles.emailPreviewLogo}>THR33</span>
                <span className={styles.emailPreviewSubLogo}>STREETWEAR // CURITIBA / PR</span>
              </div>
              <div className={styles.emailPreviewBody}>
                <h3 className={styles.emailPreviewTitle}>{dropEmailSubject || 'Assunto do E-mail'}</h3>
                {dropEmailLabel && (
                  <p className={styles.emailPreviewSubtitle}>{dropEmailLabel.toUpperCase()}</p>
                )}

                {enableBannerModule && dropBannerUrl && (
                  <div className={styles.emailPreviewBanner}>
                    <img src={dropBannerUrl} alt="Banner" />
                  </div>
                )}

                <div className={styles.emailPreviewParagraphs}>
                  {(dropManifesto || '').split(/\n+/).filter(Boolean).map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))}
                </div>

                {enableCouponModule && dropCouponCode && (
                  <div className={styles.emailPreviewCoupon}>
                    <span className={styles.emailPreviewCouponEyebrow}>
                      {(dropCouponTitle || 'CREDENCIAL // LISTA VIP').toUpperCase()}
                    </span>
                    <strong className={styles.emailPreviewCouponCode}>{dropCouponCode.toUpperCase()}</strong>
                    <span className={styles.emailPreviewCouponDesc}>{dropCouponDesc}</span>
                  </div>
                )}

                {enableCtaModule && dropCtaUrl && (
                  <div className={styles.emailPreviewCtaRow}>
                    <span className={styles.emailPreviewCtaBtn}>
                      {(dropCtaLabel || 'ACESSAR O DROP AGORA').toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className={styles.emailPreviewFooter}>
                <strong>THR33 STREETWEAR — CURITIBA / PR</strong>
                <span>Confecção autoral sob demanda, modelagens pesadas e tiragens limitadas.</span>
                <span>WhatsApp: +55 41 8841-0374 • E-mail: contato.thr33@gmail.com</span>
                <span>Instagram: @madebythr33 • Central de Suporte</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.6rem', width: '100%' }}>
                  <span style={{ color: '#a3a3a3' }}>lojathr33.com.br</span>
                  <span style={{ color: '#737373', fontSize: '0.68rem', textDecoration: 'underline' }}>Cancelar recebimento de e-mails</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR / EDITAR CAMPANHA & GERADOR UTM */}
      {isModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <Link2 size={18} />
                <h2>{editingCampaign ? 'EDITAR CAMPANHA & UTM' : 'NOVO LINK PERSONALIZADO // UTM'}</h2>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className={styles.closeBtn}
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Nome Interno da Campanha *</label>
                <input 
                  type="text" 
                  placeholder="Ex: Dia dos Pais - Calças e Bermudas" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  required 
                />
              </div>

              <div className={styles.formRow}>
                {/* SELETOR DE ORIGEM COM SUPORTE A CUSTOM */}
                <div className={styles.formGroup}>
                  <div className={styles.labelWithAction}>
                    <label>Origem (utm_source) *</label>
                    <button 
                      type="button" 
                      onClick={() => { setShowAddSource(prev => !prev); setShowAddMedium(false); }}
                      className={styles.addOptionToggleBtn}
                      title="Adicionar nova origem personalizada"
                    >
                      <Plus size={11} />
                      <span>NOVA ORIGEM</span>
                    </button>
                  </div>

                  <select 
                    value={utmSource} 
                    onChange={(e) => {
                      if (e.target.value === '__add_new__') {
                        setShowAddSource(true);
                        setShowAddMedium(false);
                      } else {
                        setUtmSource(e.target.value);
                      }
                    }}
                  >
                    <optgroup label="Origens Disponíveis">
                      {allSources.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </optgroup>
                    <option value="__add_new__">+ Criar Nova Origem...</option>
                  </select>

                  {/* PAINEL INLINE: ADICIONAR NOVA ORIGEM */}
                  {showAddSource && (
                    <div className={styles.inlineAddBox}>
                      <div className={styles.inlineAddHeader}>
                        <span>CRIAR NOVA ORIGEM DE TRÁFEGO</span>
                        <button type="button" onClick={() => setShowAddSource(false)} className={styles.inlineCloseBtn}>
                          <X size={12} />
                        </button>
                      </div>
                      <div className={styles.inlineAddBody}>
                        <input 
                          type="text" 
                          placeholder="Nome (ex: Pinterest, Telegram, Kwai, Taboola)" 
                          value={newSourceLabel}
                          onChange={(e) => {
                            setNewSourceLabel(e.target.value);
                            setNewSourceValue(e.target.value.toLowerCase().replace(/[\s_-]+/g, '_'));
                          }}
                          className={styles.inlineInput}
                          autoFocus
                        />
                        <div className={styles.inlineActionRow}>
                          <input 
                            type="text" 
                            placeholder="Tag UTM (ex: pinterest_ads)" 
                            value={newSourceValue}
                            onChange={(e) => setNewSourceValue(e.target.value)}
                            className={styles.inlineInputSmall}
                          />
                          <button 
                            type="button" 
                            onClick={handleAddNewSource} 
                            disabled={!newSourceLabel.trim()}
                            className={styles.inlineSaveBtn}
                          >
                            <Check size={12} />
                            <span>SALVAR</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* SELETOR DE MÍDIA COM SUPORTE A CUSTOM */}
                <div className={styles.formGroup}>
                  <div className={styles.labelWithAction}>
                    <label>Mídia (utm_medium) *</label>
                    <button 
                      type="button" 
                      onClick={() => { setShowAddMedium(prev => !prev); setShowAddSource(false); }}
                      className={styles.addOptionToggleBtn}
                      title="Adicionar nova mídia personalizada"
                    >
                      <Plus size={11} />
                      <span>NOVA MÍDIA</span>
                    </button>
                  </div>

                  <select 
                    value={utmMedium} 
                    onChange={(e) => {
                      if (e.target.value === '__add_new__') {
                        setShowAddMedium(true);
                        setShowAddSource(false);
                      } else {
                        setUtmMedium(e.target.value);
                      }
                    }}
                  >
                    <optgroup label="Mídias Disponíveis">
                      {allMediums.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </optgroup>
                    <option value="__add_new__">+ Criar Nova Mídia...</option>
                  </select>

                  {/* PAINEL INLINE: ADICIONAR NOVA MÍDIA */}
                  {showAddMedium && (
                    <div className={styles.inlineAddBox}>
                      <div className={styles.inlineAddHeader}>
                        <span>CRIAR NOVA MÍDIA / FORMATO</span>
                        <button type="button" onClick={() => setShowAddMedium(false)} className={styles.inlineCloseBtn}>
                          <X size={12} />
                        </button>
                      </div>
                      <div className={styles.inlineAddBody}>
                        <input 
                          type="text" 
                          placeholder="Nome (ex: Banner Topo, SMS, QR Code, Podcast)" 
                          value={newMediumLabel}
                          onChange={(e) => {
                            setNewMediumLabel(e.target.value);
                            setNewMediumValue(e.target.value.toLowerCase().replace(/[\s_-]+/g, '_'));
                          }}
                          className={styles.inlineInput}
                          autoFocus
                        />
                        <div className={styles.inlineActionRow}>
                          <input 
                            type="text" 
                            placeholder="Tag UTM (ex: qr_code)" 
                            value={newMediumValue}
                            onChange={(e) => setNewMediumValue(e.target.value)}
                            className={styles.inlineInputSmall}
                          />
                          <button 
                            type="button" 
                            onClick={handleAddNewMedium} 
                            disabled={!newMediumLabel.trim()}
                            className={styles.inlineSaveBtn}
                          >
                            <Check size={12} />
                            <span>SALVAR</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Identificador da Campanha (utm_campaign) *</label>
                  <input 
                    type="text" 
                    placeholder="Ex: pais_calcas_2026" 
                    value={utmCampaign} 
                    onChange={(e) => setUtmCampaign(e.target.value)}
                    required 
                  />
                  <small>Sem espaços ou caracteres especiais.</small>
                </div>

                <div className={styles.formGroup}>
                  <div className={styles.labelWithAction}>
                    <label>Página de Destino (Rota da Loja) *</label>
                    {targetPath.startsWith('/catalogo') && (
                      <button 
                        type="button" 
                        onClick={() => setShowCatalogFilterHelper(prev => !prev)}
                        className={styles.catalogFilterToggleBtn}
                        title="Abrir configurador de filtros do catálogo"
                      >
                        <SlidersHorizontal size={11} />
                        <span>
                          {showCatalogFilterHelper ? 'OCULTAR FILTROS' : `FILTRAR CATÁLOGO (${activeCatalogFiltersCount})`}
                        </span>
                      </button>
                    )}
                  </div>

                  <input 
                    type="text" 
                    placeholder="Ex: /catalogo ou /produtos/sua-peca" 
                    value={targetPath} 
                    onChange={(e) => setTargetPath(e.target.value)}
                    required 
                  />
                  <small>Caminho relativo da página na loja.</small>
                </div>
              </div>

              {/* ASSISTENTE VISUAL DE FILTROS DO CATÁLOGO (QUANDO ROTA É /catalogo) */}
              {targetPath.startsWith('/catalogo') && showCatalogFilterHelper && (
                <div className={styles.catalogHelperBox}>
                  <div className={styles.catalogHelperHeader}>
                    <div className={styles.catalogHelperTitle}>
                      <SlidersHorizontal size={14} />
                      <span>FILTROS DO CATÁLOGO DE DESTINO</span>
                      {activeCatalogFiltersCount > 0 && (
                        <span className={styles.activeFilterCountBadge}>{activeCatalogFiltersCount} ativo(s)</span>
                      )}
                    </div>
                    {activeCatalogFiltersCount > 0 && (
                      <button 
                        type="button" 
                        onClick={handleClearCatalogFilters} 
                        className={styles.clearCatalogFilterBtn}
                        title="Limpar todos os filtros do catálogo"
                      >
                        <RotateCw size={11} />
                        <span>LIMPAR FILTROS</span>
                      </button>
                    )}
                  </div>

                  <div className={styles.catalogHelperGrid}>
                    {/* BUSCA POR PEÇA */}
                    <div className={styles.catalogHelperColFull}>
                      <span className={styles.helperGroupTitle}>BUSCAR PEÇA</span>
                      <div className={styles.helperSearchWrapper}>
                        <Search size={13} className={styles.helperSearchIcon} />
                        <input 
                          type="text" 
                          placeholder="Ex: Boxy, Hoodie, Calça..."
                          value={parsedCatalogFilters.search}
                          onChange={(e) => toggleCatalogFilter('search', e.target.value, false)}
                          className={styles.helperSearchInput}
                        />
                        {parsedCatalogFilters.search && (
                          <button 
                            type="button" 
                            onClick={() => toggleCatalogFilter('search', '', false)} 
                            className={styles.helperClearSearch}
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* CATEGORIAS */}
                    <div className={styles.catalogHelperCol}>
                      <span className={styles.helperGroupTitle}>CATEGORIAS</span>
                      <div className={styles.helperPillsList}>
                        {CATALOG_CATEGORIES.map(cat => {
                          const isSelected = parsedCatalogFilters.categories.includes(cat.id);
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => toggleCatalogFilter('categories', cat.id, true)}
                              className={`${styles.helperFilterPill} ${isSelected ? styles.helperPillActive : ''}`}
                            >
                              <span className={`${styles.helperCheckbox} ${isSelected ? styles.helperCheckboxActive : ''}`}>
                                {isSelected && <Check size={10} />}
                              </span>
                              <span>{cat.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* MODELAGEM */}
                    <div className={styles.catalogHelperCol}>
                      <span className={styles.helperGroupTitle}>MODELAGEM</span>
                      <div className={styles.helperPillsList}>
                        {CATALOG_FITS.map(fit => {
                          const isSelected = parsedCatalogFilters.fits.includes(fit.id);
                          return (
                            <button
                              key={fit.id}
                              type="button"
                              onClick={() => toggleCatalogFilter('fits', fit.id, true)}
                              className={`${styles.helperFilterPill} ${isSelected ? styles.helperPillActive : ''}`}
                            >
                              <span className={`${styles.helperCheckbox} ${isSelected ? styles.helperCheckboxActive : ''}`}>
                                {isSelected && <Check size={10} />}
                              </span>
                              <span>{fit.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* DROPS */}
                    <div className={styles.catalogHelperCol}>
                      <span className={styles.helperGroupTitle}>DROP</span>
                      <div className={styles.helperPillsList}>
                        {CATALOG_DROPS.map(drop => {
                          const isSelected = parsedCatalogFilters.drops.includes(drop.id);
                          return (
                            <button
                              key={drop.id}
                              type="button"
                              onClick={() => toggleCatalogFilter('drops', drop.id, true)}
                              className={`${styles.helperFilterPill} ${isSelected ? styles.helperPillActive : ''}`}
                            >
                              <span className={`${styles.helperCheckbox} ${isSelected ? styles.helperCheckboxActive : ''}`}>
                                {isSelected && <Check size={10} />}
                              </span>
                              <span>{drop.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* TAMANHOS */}
                    <div className={styles.catalogHelperCol}>
                      <span className={styles.helperGroupTitle}>TAMANHO (VESTUÁRIO)</span>
                      <div className={styles.helperSizesRow}>
                        {CATALOG_SIZES.map(sz => {
                          const isSelected = parsedCatalogFilters.sizes.includes(sz);
                          return (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => toggleCatalogFilter('sizes', sz, true)}
                              className={`${styles.helperSizeBtn} ${isSelected ? styles.helperSizeBtnActive : ''}`}
                            >
                              {sz}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PRÉVIA DO LINK GERADO */}
              <div className={styles.previewBox}>
                <div className={styles.previewTop}>
                  <span className={styles.previewLabel}>LINK COMPLETO GERADO:</span>
                  <button 
                    type="button" 
                    onClick={() => handleCopyLink(generatedUrl, 'modal_preview')}
                    className={styles.previewCopyBtn}
                    title="Copiar URL gerada"
                  >
                    {copiedId === 'modal_preview' ? (
                      <>
                        <Check size={11} />
                        <span>COPIADO</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span>COPIAR URL</span>
                      </>
                    )}
                  </button>
                </div>
                <code className={styles.previewUrl}>{generatedUrl}</code>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" onClick={() => setIsModalOpen(false)} className={styles.cancelBtn}>
                  CANCELAR
                </button>
                <button type="submit" disabled={saving} className={styles.saveBtn}>
                  {saving ? (
                    <>
                      <RotateCw size={13} className={styles.spinning} />
                      <span>SALVANDO NA NUVEM...</span>
                    </>
                  ) : editingCampaign ? (
                    <>
                      <Check size={13} />
                      <span>SALVAR ALTERAÇÕES</span>
                    </>
                  ) : (
                    <>
                      <Plus size={13} />
                      <span>CRIAR LINK DE CAMPANHA</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CmsCampanhas;
