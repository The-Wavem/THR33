import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

const INITIAL_CATALOG_SEED = [
  {
    id: "camiseta-monochrome-boxy",
    slug: "camiseta-monochrome-boxy",
    name: "Camiseta THR33 Monochrome Boxy",
    type: "vestuario",
    category: "camisa",
    fit: "boxy",
    drop: "leak-two",
    price: 189.90,
    originalPrice: 219.90,
    discount: 14,
    customBadge: "LANÇAMENTO",
    isRelease: true,
    isFeatured: true,
    image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=800&auto=format&fit=crop"
    ],
    description: "Modelagem Boxy com gola canelada de 3cm e algodão 260 GSM de alta densidade.",
    stock: { PP: 5, P: 10, M: 15, G: 12, GG: 4 },
    totalStock: 46,
    daysWithoutSale: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "camiseta-for-the-few",
    slug: "camiseta-for-the-few",
    name: "Camiseta For The Few Heavy",
    type: "vestuario",
    category: "camisa",
    fit: "oversized",
    drop: "leak-two",
    price: 199.90,
    originalPrice: 199.90,
    discount: 0,
    customBadge: "EXCLUSIVO",
    isRelease: true,
    isFeatured: true,
    image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=800&auto=format&fit=crop"
    ],
    description: "Estética oversized urbana, caimento solto e estampa minimalista em silk relevo.",
    stock: { PP: 4, P: 8, M: 12, G: 10, GG: 3 },
    totalStock: 37,
    daysWithoutSale: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "jaqueta-street-atelie",
    slug: "jaqueta-street-atelie",
    name: "Jaqueta Street Ateliê CWB",
    type: "vestuario",
    category: "jaqueta",
    fit: "normal",
    drop: "drop-01",
    price: 389.90,
    originalPrice: 429.90,
    discount: 9,
    customBadge: "DROP ANTERIOR",
    isRelease: false,
    isFeatured: false,
    image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=800&auto=format&fit=crop"
    ],
    description: "Jaqueta corta-vento estruturada com forro térmico para o clima curitibano.",
    stock: { PP: 2, P: 4, M: 6, G: 5, GG: 2 },
    totalStock: 19,
    daysWithoutSale: 48,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "vale-presente-thr33",
    slug: "vale-presente-thr33",
    name: "Vale-Presente Digital THR33",
    type: "brinde",
    category: "brinde",
    fit: "único",
    drop: "leak-two",
    price: 250.00,
    originalPrice: 250.00,
    discount: 0,
    customBadge: "GIFT CARD",
    isRelease: false,
    isFeatured: true,
    image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=800&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=800&auto=format&fit=crop"
    ],
    description: "Cartão virtual resgatável em qualquer peça do catálogo online da THR33.",
    stock: { PP: 0, P: 0, M: 99, G: 0, GG: 0 },
    totalStock: 99,
    daysWithoutSale: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const seedService = {
  /**
   * Povoa a coleção de produtos se ela estiver completamente vazia no Firestore
   */
  async seedCatalogIfEmpty() {
    try {
      const snap = await getDocs(collection(db, 'products'));
      if (snap.empty) {
        for (const item of INITIAL_CATALOG_SEED) {
          await setDoc(doc(db, 'products', item.id), item);
        }
        return { seeded: true, count: INITIAL_CATALOG_SEED.length };
      }
      return { seeded: false, count: snap.size };
    } catch (err) {
      console.error("Erro no seed:", err);
      return { seeded: false, error: err.message };
    }
  }
};

export default seedService;
