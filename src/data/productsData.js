// src/data/productsData.js

export const productsData = [
  {
    id: 'prod-01',
    slug: 'camisa-boxy-process-v1',
    title: 'CAMISA BOXY PROCESS V.1',
    category: 't-shirts',
    fit: 'BOXY',
    price: 'R$ 189,00',
    priceNum: 189,
    fabric: '100% ALGODÃO HEAVYWEIGHT 260GSM',
    tag: 'LANÇAMENTO // 260GSM',
    sizes: ['P', 'M', 'G', 'GG'],
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800',
    hoverImage: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=80&w=800',
    gallery: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=1200'
    ],
    description: 'Modelagem Boxy exclusiva com ombros caídos e gola canelada de 3cm. Tecido pesado 260GSM em algodão cru penteado com tingimento reverso e toque aveludado.',
    measurements: {
      diagramImage: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=600',
      chart: [
        { size: 'P', length: '72 cm', width: '56 cm', sleeve: '22 cm' },
        { size: 'M', length: '74 cm', width: '59 cm', sleeve: '23 cm' },
        { size: 'G', length: '76 cm', width: '62 cm', sleeve: '24 cm' },
        { size: 'GG', length: '78 cm', width: '65 cm', sleeve: '25 cm' },
      ]
    },
    care: [
      'Lavar à mão ou máquina em ciclo delicado (água fria).',
      'Não utilizar alvejante ou branqueadores ópticos.',
      'Secar à sombra em varal na horizontal (não usar secadora).',
      'Passar do avesso em temperatura média (máx 150°C).'
    ],
    isArchived: false,
    color: 'OFF-WHITE / PRETO'
  },
  {
    id: 'prod-02',
    slug: 'camisa-oversized-street',
    title: 'CAMISA OVERSIZED STREET',
    category: 't-shirts',
    fit: 'OVERSIZED',
    price: 'R$ 210,00',
    priceNum: 210,
    fabric: '100% ALGODÃO PIMA 280GSM',
    tag: 'FOR THE FEW',
    sizes: ['P', 'M', 'G', 'GG'],
    image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=800',
    hoverImage: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800',
    gallery: [
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=80&w=1200'
    ],
    description: 'Corte Oversized tático com caimento fluido e estruturado. Algodão Pima 280GSM de fibra longa com acabamento em serigrafia industrial de alta precisão.',
    measurements: {
      diagramImage: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=600',
      chart: [
        { size: 'P', length: '74 cm', width: '58 cm', sleeve: '24 cm' },
        { size: 'M', length: '76 cm', width: '61 cm', sleeve: '25 cm' },
        { size: 'G', length: '78 cm', width: '64 cm', sleeve: '26 cm' },
        { size: 'GG', length: '80 cm', width: '67 cm', sleeve: '27 cm' },
      ]
    },
    care: [
      'Lavar à mão ou máquina em ciclo delicado (água fria).',
      'Não utilizar alvejante ou secadora.',
      'Secar à sombra na horizontal.',
      'Passar do avesso (evitar estampa).'
    ],
    isArchived: false,
    color: 'PRETO PIANO'
  },
  {
    id: 'prod-03',
    slug: 'moletom-heavy-off-archive',
    title: 'MOLETOM HEAVY OFF // ARCHIVE',
    category: 'moletons',
    fit: 'HEAVYWEIGHT',
    price: 'R$ 380,00',
    priceNum: 380,
    fabric: 'ALGODÃO TÉCNICO 380GSM',
    tag: 'ARCHIVED // DROPS PASSADOS',
    sizes: ['P', 'M', 'G'],
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=800',
    hoverImage: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=800',
    gallery: [
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=1200'
    ],
    description: 'Moletom Ultra Heavyweight 380GSM com forro aveludado, capuz duplo estruturado sem cordões e bolso canguru embutido. Edição privada numerada de arquivo.',
    measurements: {
      diagramImage: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=600',
      chart: [
        { size: 'P', length: '70 cm', width: '60 cm', sleeve: '62 cm' },
        { size: 'M', length: '72 cm', width: '63 cm', sleeve: '64 cm' },
        { size: 'G', length: '75 cm', width: '66 cm', sleeve: '66 cm' },
      ]
    },
    care: [
      'Lavar do avesso com sabão neutro.',
      'Não secar em tambor giratório.',
      'Secar à sombra em varal plano.'
    ],
    isArchived: true,
    color: 'CINZA MESCLA / CHARCOAL'
  },
  {
    id: 'prod-04',
    slug: 'calca-baggy-viela-ripstop',
    title: 'CALÇA BAGGY VIELA RIPSTOP',
    category: 'calcas',
    fit: 'BAGGY',
    price: 'R$ 319,00',
    priceNum: 319,
    fabric: 'RIPSTOP TÁTICO 320GSM',
    tag: 'TAILORED STREET',
    sizes: ['38', '40', '42', '44'],
    image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&q=80&w=800',
    hoverImage: 'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&q=80&w=800',
    gallery: [
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&q=80&w=1200'
    ],
    description: 'Calça Baggy Utilitária em Ripstop militar 320GSM com tratamento hidro-repelente, 6 bolsos táticos sanfonados e reguladores de barra em cordão elástico.',
    measurements: {
      diagramImage: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=600',
      chart: [
        { size: '38', length: '104 cm', width: '40 cm', sleeve: '32 cm' },
        { size: '40', length: '106 cm', width: '42 cm', sleeve: '33 cm' },
        { size: '42', length: '108 cm', width: '44 cm', sleeve: '34 cm' },
        { size: '44', length: '110 cm', width: '46 cm', sleeve: '35 cm' },
      ]
    },
    care: [
      'Lavar do avesso em ciclo brando.',
      'Não passar ferro sobre as tiras táticas.',
      'Secar à sombra.'
    ],
    isArchived: false,
    color: 'VERDE MILITAR / PRETO'
  },
  {
    id: 'prod-05',
    slug: 'jaqueta-viela-raw-edition',
    title: 'JAQUETA VIELA RAW EDITION',
    category: 'jaquetas',
    fit: 'HEAVYWEIGHT',
    price: 'R$ 450,00',
    priceNum: 450,
    fabric: 'SARJA RESINADA 400GSM',
    tag: 'EDITION 01 // LIMITADO',
    sizes: ['M', 'G', 'GG'],
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=800',
    hoverImage: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=800',
    gallery: [
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=1200'
    ],
    description: 'Jaqueta Workwear em Sarja Resinada 400GSM de densidade industrial com zíper duplo YKK em metal fosco, colarinho estruturado e forro acetinado.',
    measurements: {
      diagramImage: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=600',
      chart: [
        { size: 'M', length: '68 cm', width: '58 cm', sleeve: '65 cm' },
        { size: 'G', length: '71 cm', width: '61 cm', sleeve: '67 cm' },
        { size: 'GG', length: '74 cm', width: '64 cm', sleeve: '69 cm' },
      ]
    },
    care: [
      'Limpeza a seco especializada ou pano úmido.',
      'Não lavar em máquina.',
      'Armazenar em cabide largo.'
    ],
    isArchived: false,
    color: 'PRETO BRUTO'
  }
];
