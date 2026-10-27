import { GIFTS_DATA } from '../data/giftsData';
import { currentDropConfig } from '../data/dropConfig';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from './firebaseConfig';

// ============================================================
// 1. CONFIGURAÇÕES DA VITRINE E DA HOME (FIRESTORE)
// ============================================================

/**
 * Busca configurações da vitrine (Bento Grid, Carrossel/Hero, etc.)
 */
export const getVitrineSettings = async () => {
  try {
    const docRef = doc(db, 'settings', 'vitrine');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }

    // Fallback retrocompatível: verifica se existe em 'storefront'
    const [bannerSnap, bentoSnap] = await Promise.all([
      getDoc(doc(db, 'storefront', 'home_banners')),
      getDoc(doc(db, 'storefront', 'home_bento'))
    ]);

    if (bannerSnap.exists() || bentoSnap.exists()) {
      const bannerData = bannerSnap.exists() ? bannerSnap.data() : null;
      const bentoData = bentoSnap.exists() ? bentoSnap.data() : null;
      return {
        hero: bannerData ? { slides: bannerData.slides || [] } : null,
        bentoGrid: bentoData ? bentoData.cards || [] : [],
        sectionTag: bentoData?.sectionTag || 'ENSAIO DE CAMPANHA',
        sectionTitle: bentoData?.sectionTitle || 'A RUA COMO NOSSO ATELIÊ'
      };
    }

    return null;
  } catch (error) {
    console.error('Erro ao buscar configurações da vitrine:', error);
    return null;
  }
};

/**
 * Salva configurações da vitrine no Firestore (usado no painel CMS)
 */
export const saveVitrineSettings = async (settingsData) => {
  try {
    const docRef = doc(db, 'settings', 'vitrine');
    await setDoc(
      docRef,
      {
        ...settingsData,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );

    // Sincroniza também storefront para compatibilidade
    if (settingsData.hero?.slides) {
      await setDoc(
        doc(db, 'storefront', 'home_banners'),
        {
          slides: settingsData.hero.slides,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    }

    if (settingsData.bentoGrid) {
      await setDoc(
        doc(db, 'storefront', 'home_bento'),
        {
          cards: settingsData.bentoGrid,
          sectionTag: settingsData.sectionTag || 'ENSAIO DE CAMPANHA',
          sectionTitle: settingsData.sectionTitle || 'A RUA COMO NOSSO ATELIÊ',
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    }

    return true;
  } catch (error) {
    console.error('Erro ao salvar vitrine:', error);
    throw error;
  }
};

/**
 * Busca produtos marcados para destaque/carrossel ou mais vendidos
 */
export const getFeaturedProducts = async (maxItems = 8) => {
  try {
    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('isFeatured', '==', true), limit(maxItems));
    const snapshot = await getDocs(q);

    // Se não houver produtos com tag 'isFeatured', faz fallback buscando os primeiros ativos reais do Firestore
    if (snapshot.empty) {
      const fallbackQuery = query(productsRef, limit(maxItems));
      const fallbackSnap = await getDocs(fallbackQuery);
      return fallbackSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((d) => (d.name || d.title) && d.price !== undefined);
    }

    return snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((d) => (d.name || d.title) && d.price !== undefined);
  } catch (error) {
    console.error('Erro ao buscar produtos em destaque:', error);
    return [];
  }
};

// ============================================================
// 2. CONSULTAS DO CATÁLOGO DE PRODUTOS (100% FIRESTORE REAL)
// ============================================================

/**
 * Busca todos os produtos ativos do catálogo ordenados por atualização (sem fallback para mocks estáticos)
 */
export const getAllProducts = async () => {
  try {
    const q = query(collection(db, 'products'), orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    const list = [];
    snap.forEach((d) => {
      const data = d.data();
      if (data && (data.name || data.title) && data.price !== undefined) {
        list.push({ id: d.id, ...data });
      }
    });
    return list;
  } catch (err) {
    // Fallback sem orderBy caso índice composto não exista imediatamente
    try {
      const snap = await getDocs(collection(db, 'products'));
      const list = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data && (data.name || data.title) && data.price !== undefined) {
          list.push({ id: d.id, ...data });
        }
      });
      return list;
    } catch (e) {
      console.warn('Aviso: Falha ao conectar ao Firestore ao listar produtos:', e.message);
      return [];
    }
  }
};

export const fetchProducts = getAllProducts;

/**
 * Busca produto individual por ID ou Slug no Firestore (retorna null quando não existe, sem cair em productsData.js)
 */
export const getProductById = async (idOrSlug) => {
  if (!idOrSlug) return null;
  const cleanSearch = String(idOrSlug).toLowerCase().trim();

  try {
    // 1. Tenta buscar diretamente pelo ID do documento
    const docRef = doc(db, 'products', idOrSlug);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && (data.name || data.title) && data.price !== undefined) {
        return { id: snap.id, ...data };
      }
    }

    // 2. Tenta buscar por campo slug exato
    const q = query(collection(db, 'products'), where('slug', '==', idOrSlug));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      for (const d of querySnap.docs) {
        const data = d.data();
        if (data && (data.name || data.title) && data.price !== undefined) {
          return { id: d.id, ...data };
        }
      }
    }

    // 3. Busca nos documentos reais do Firestore por slug normalizado ou histórico de slugs
    const all = await getAllProducts();
    const normalize = (str) =>
      String(str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    const found = all.find((p) => {
      if (!p || (!p.name && !p.title)) return false;
      const pSlug = String(p.slug || '').toLowerCase().trim();
      const pId = String(p.id || '').toLowerCase().trim();
      const pNameNorm = normalize(p.name || p.title);
      const prevSlugs = Array.isArray(p.previousSlugs)
        ? p.previousSlugs.map((s) => String(s).toLowerCase().trim())
        : [];

      return (
        pSlug === cleanSearch ||
        pId === cleanSearch ||
        pNameNorm === normalize(cleanSearch) ||
        prevSlugs.includes(cleanSearch)
      );
    });

    return found || null;
  } catch (err) {
    console.error(`Erro ao buscar produto ${idOrSlug}:`, err);
    return null;
  }
};

export const fetchProductById = getProductById;

/**
 * Busca apenas lançamentos / releases
 */
export const getReleases = async () => {
  try {
    const q = query(collection(db, 'products'), where('isRelease', '==', true));
    const snap = await getDocs(q);
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    return list;
  } catch (err) {
    console.error('Erro ao buscar lançamentos:', err);
    return [];
  }
};

/**
 * Busca produtos do tipo brinde / vale-presente
 */
export const getGifts = async () => {
  try {
    // 1. Tenta buscar da coleção dedicada 'gifts'
    try {
      const giftsSnap = await getDocs(collection(db, 'gifts'));
      if (!giftsSnap.empty) {
        const list = [];
        giftsSnap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        if (list.length > 0) return list;
      }
    } catch (_) {}

    // 2. Tenta buscar produtos com type 'brinde' ou category 'brinde'/'gift-card'
    const q = query(collection(db, 'products'), where('type', '==', 'brinde'));
    const snap = await getDocs(q);
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));

    if (list.length > 0) return list;

    return GIFTS_DATA;
  } catch (err) {
    console.warn('Aviso ao buscar brindes no Firestore:', err.message);
    return GIFTS_DATA;
  }
};

/**
 * Consulta a configuração atual do Drop ativo no Firestore
 */
export const getDropConfig = async () => {
  try {
    const [dropSnap, settingsSnap] = await Promise.all([
      getDoc(doc(db, 'settings', 'drop')).catch(() => null),
      getDoc(doc(db, 'drop_settings', 'current')).catch(() => null)
    ]);

    const activeSnap =
      dropSnap && dropSnap.exists()
        ? dropSnap
        : settingsSnap && settingsSnap.exists()
          ? settingsSnap
          : null;
    if (activeSnap) {
      return {
        ...currentDropConfig,
        ...activeSnap.data()
      };
    }
    return currentDropConfig;
  } catch (err) {
    console.warn('Aviso ao buscar configuração do drop no Firestore:', err.message);
    return currentDropConfig;
  }
};

/**
 * Busca brinde individual por ID
 */
export const getGiftById = async (id) => {
  return getProductById(id);
};

/**
 * Busca produtos filtrados por categoria
 */
export const getProductsByCategory = async (category) => {
  try {
    const q = query(collection(db, 'products'), where('category', '==', category));
    const snap = await getDocs(q);
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    return list;
  } catch (err) {
    console.error(`Erro ao buscar produtos da categoria ${category}:`, err);
    return [];
  }
};

/**
 * Retorna metadados de modelagens, drops e categorias
 */
export const getDynamicMetadata = () => {
  return {
    categories: ['camisa', 'camiseta', 'moletom', 'jaqueta', 'calca', 'short', 'acessorio', 'brinde'],
    fits: ['boxy', 'oversized', 'regular', 'slim'],
    drops: ['leak-two', 'drop-01', 'core-basics']
  };
};

/**
 * Decrementa o estoque físico por tamanho no Firestore após compra concluída
 */
export const decrementProductStock = async (items = []) => {
  if (!items || items.length === 0) return;

  for (const item of items) {
    const productId = item.id || item.slug;
    const size = String(item.size || 'M').toUpperCase();
    const qtyToDeduct = Number(item.quantity || 1);

    if (!productId) continue;

    try {
      const prodRef = doc(db, 'products', productId);
      const prodSnap = await getDoc(prodRef);

      if (prodSnap.exists()) {
        const prodData = prodSnap.data() || {};
        const currentStock = prodData.stock
          ? { ...prodData.stock }
          : { PP: 5, P: 10, M: 15, G: 10, GG: 5 };

        const currentSizeQty = Number(currentStock[size] ?? 0);
        const newSizeQty = Math.max(0, currentSizeQty - qtyToDeduct);
        currentStock[size] = newSizeQty;

        const totalStock = Object.values(currentStock).reduce((a, b) => Number(a) + Number(b), 0);

        await setDoc(
          prodRef,
          {
            stock: currentStock,
            totalStock,
            lastSoldAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );
      }
    } catch (err) {
      console.warn(`Erro ao decrementar estoque de ${productId}:`, err.message);
    }
  }
};

export const catalogService = {
  getVitrineSettings,
  saveVitrineSettings,
  getFeaturedProducts,
  getAllProducts,
  fetchProducts: getAllProducts,
  getProductById,
  fetchProductById: getProductById,
  getReleases,
  getGifts,
  getGiftById,
  getProductsByCategory,
  getDynamicMetadata,
  decrementProductStock
};

export default catalogService;
