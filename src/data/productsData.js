export const PRODUCTS_DATA = [
  {
    id: "thr33-monochrome-boxy",
    slug: "thr33-monochrome-boxy",
    name: "Camiseta THR33 Monochrome Boxy",
    category: "camisa",
    fit: "boxy",
    price: 189.90,
    sizes: ["PP", "P", "M", "G", "GG"],
    color: "preto",
    isRelease: true,
    customBadge: "LANÇAMENTO",
    image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop",
    description: "Modelagem Boxy em malha estruturada de 220g/m². Corte quadrado com ombros caídos e caimento pesado contemporâneo.",
    stock: { PP: 5, P: 10, M: 15, G: 12, GG: 6 }
  },
  {
    id: "for-the-few-heavy",
    slug: "for-the-few-heavy",
    name: "Camiseta For The Few Heavy",
    category: "camisa",
    fit: "oversized",
    modelVariant: "heavy",
    price: 199.90,
    sizes: ["PP", "P", "M", "G", "GG"],
    color: "off-white",
    isRelease: true,
    customBadge: "PREMIUM HEAVY",
    image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=600&auto=format&fit=crop",
    description: "Malha 100% algodão de 260g/m² (Heavy Weight). Gola canelada de 3cm com pesponto duplo ombro a ombro e estampa em alta escala.",
    stock: { PP: 8, P: 15, M: 20, G: 15, GG: 8 }
  },
  {
    id: "atelie-cwb-classica",
    slug: "atelie-cwb-classica",
    name: "Camiseta Street Ateliê Clássica",
    category: "camisa",
    fit: "oversized",
    modelVariant: "classica",
    price: 169.90,
    sizes: ["PP", "P", "M", "G", "GG"],
    color: "grafite",
    isRelease: false,
    customBadge: "EDITION 2026",
    image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=600&auto=format&fit=crop",
    description: "Algodão penteado 190g/m² fio 30.1 encorpado. Caimento amplo e fluido com gola ribana de 2,5cm.",
    stock: { PP: 10, P: 15, M: 18, G: 10, GG: 5 }
  },
  {
    id: "vale-presente-digital-thr33",
    slug: "vale-presente-digital-thr33",
    name: "Vale-Presente Digital THR33",
    category: "gift-card",
    type: "brinde",
    fit: "único",
    price: 150.00,
    sizes: ["ÚNICO"],
    isRelease: false,
    customBadge: "GIFT PASS",
    image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=600&auto=format&fit=crop",
    description: "Vale digital com saldo adaptável para resgate direto na carteira do usuário.",
    stock: { ÚNICO: 999 }
  }
];

export const productsData = PRODUCTS_DATA;
export default PRODUCTS_DATA;
