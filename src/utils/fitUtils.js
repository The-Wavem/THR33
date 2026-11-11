/**
 * fitUtils.js - Utilitários para Normalização e Exibição Dinâmica de Modelagens (Fits)
 * 
 * Permite que o catálogo filtre de forma 100% dinâmica e independente
 * qualquer modelagem existente ou recém-cadastrada no CMS (ex: Boxy, Oversized,
 * Slim, Cargo, Wide Leg, ou novas modelagens criadas pelo lojista).
 */

/**
 * FONTE ÚNICA DA VERDADE - Modelagens, Grades e Tabelas de Medidas Oficiais THR33
 */
export const OFFICIAL_THR33_FITS = ['Oversized Heavy', 'Oversized Clássica', 'Boxy'];

export const GLOBAL_CATALOG_SIZES = ['P', 'M', 'G', 'GG', 'EXG'];

export const OVERSIZED_SIZES = ['P', 'M', 'G', 'GG', 'EXG'];
export const BOXY_SIZES = ['P', 'M', 'G', 'GG'];

/**
 * Especificações Técnicas Oficiais das Modelagens THR33 (Página Sobre & PDP)
 */
export const OFFICIAL_FIT_SPECS = [
  {
    id: 'heavy',
    slug: 'oversized_heavy',
    name: 'Oversized Heavy',
    gsmBadge: '260g/m² HEAVY WEIGHT',
    desc: 'Malha 100% algodão de gramatura pesada (260g/m²). Proporciona caimento reto e estruturado que não marca o corpo, ideal para o clima frio e chuvoso de Curitiba.',
    specs: [
      ['Gramatura', '260g/m² Heavy Weight'],
      ['Gola', 'Canelada 2x1 de 3cm reforçada'],
      ['Estampa', 'DTG (Direct to Garment / Impressão Digital) de alta definição com toque zero'],
      ['Acabamento', 'Pesponto duplo ombro a ombro']
    ],
    shape: { shoulder: 108, body: 80, length: 185, sleeve: 56 }
  },
  {
    id: 'classic',
    slug: 'oversized_classica',
    name: 'Oversized Clássica',
    gsmBadge: '190g/m² ALGODÃO PENTEADO',
    desc: 'Algodão penteado fio 30.1 encorpado (190g/m²). Toque macio com caimento amplo tradicional para uso diário.',
    specs: [
      ['Gramatura', '190g/m² Algodão Penteado'],
      ['Gola', 'Ribana reforçada de 2.5cm'],
      ['Estampa', 'DTG (Direct to Garment / Impressão Digital) de alta definição com toque zero'],
      ['Acabamento', 'Costura reforçada com fita interna']
    ],
    shape: { shoulder: 104, body: 76, length: 182, sleeve: 52 }
  },
  {
    id: 'boxy',
    slug: 'boxy',
    name: 'Boxy Fit',
    gsmBadge: '220g/m² ALGODÃO ESTRUTURADO',
    desc: 'Modelagem contemporânea mais curta no comprimento com ombros caídos e largura equilibrada.',
    specs: [
      ['Gramatura', '220g/m² Algodão Estruturado'],
      ['Gola', 'Gola canelada de 3cm'],
      ['Estampa', 'DTG (Direct to Garment / Impressão Digital) de alta definição com toque zero'],
      ['Acabamento', 'Barra larga e caimento solto']
    ],
    shape: { shoulder: 112, body: 84, length: 155, sleeve: 60 }
  }
];

export const getFitTechnicalSpecs = (fit) => {
  if (!fit) return OFFICIAL_FIT_SPECS[0];
  const s = String(fit)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (s.includes('boxy')) {
    return OFFICIAL_FIT_SPECS[2];
  }
  if (s.includes('classica') || s.includes('classic') || s.includes('190')) {
    return OFFICIAL_FIT_SPECS[1];
  }
  return OFFICIAL_FIT_SPECS[0];
};

export const OFFICIAL_MEASURES_TABLE = {
  oversized: [
    { size: 'P', largura: '54 cm', comprimento: '71 cm', manga: '24 cm', ombro: '19 cm' },
    { size: 'M', largura: '58 cm', comprimento: '73 cm', manga: '25 cm', ombro: '20 cm' },
    { size: 'G', largura: '60 cm', comprimento: '75 cm', manga: '26 cm', ombro: '21 cm' },
    { size: 'GG', largura: '62 cm', comprimento: '78 cm', manga: '27 cm', ombro: '22 cm' },
    { size: 'EXG', largura: '64 cm', comprimento: '80 cm', manga: '28 cm', ombro: '23 cm' }
  ],
  boxy: [
    { size: 'P', largura: '57 cm', comprimento: '64 cm', manga: '23 cm', ombro: '21 cm' },
    { size: 'M', largura: '59 cm', comprimento: '66 cm', manga: '24 cm', ombro: '22 cm' },
    { size: 'G', largura: '61 cm', comprimento: '68 cm', manga: '25 cm', ombro: '23 cm' },
    { size: 'GG', largura: '63 cm', comprimento: '70 cm', manga: '26 cm', ombro: '24 cm' }
  ]
};

export const getSizesForFit = (fit) => {
  if (!fit) return OVERSIZED_SIZES;
  const s = String(fit).toLowerCase();
  if (s.includes('boxy')) return BOXY_SIZES;
  return OVERSIZED_SIZES;
};

export const getMeasuresForFit = (fit) => {
  if (!fit) return OFFICIAL_MEASURES_TABLE.oversized;
  const s = String(fit).toLowerCase();
  if (s.includes('boxy')) return OFFICIAL_MEASURES_TABLE.boxy;
  return OFFICIAL_MEASURES_TABLE.oversized;
};

/**
 * Normaliza uma chave/slug de modelagem para comparação consistente.
 * Trata acentuações, espaços, hífens e variações de escrita.
 */
export const normalizeFitSlug = (raw) => {
  if (!raw) return '';
  const s = String(raw)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_ ]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (s === 'unico' || s === 'modelo_unico' || s === 'tamanho_unico' || s === 'padrao') return 'modelo_unico';
  if (s === 'boxy' || s === 'boxy_fit') return 'boxy';
  if (s === 'oversized_heavy' || s === 'oversized_heavy_fit') return 'oversized_heavy';
  if (s === 'oversized_classica' || s === 'oversized_classica_fit') return 'oversized_classica';
  if (s === 'oversized' || s === 'oversized_fit') return 'oversized';
  if (s === 'normal' || s === 'regular' || s === 'regular_fit' || s === 'normal_fit') return 'normal';
  if (s === 'slim' || s === 'slim_fit') return 'slim';
  if (s === 'wide_leg' || s === 'wide_leg_fit') return 'wide_leg';
  if (s === 'cargo' || s === 'cargo_fit') return 'cargo';
  if (s === 'cropped' || s === 'cropped_fit') return 'cropped';
  if (s === 'drop_shoulder' || s === 'drop_shoulder_fit') return 'drop_shoulder';
  if (s === 'regata' || s === 'regata_fit' || s === 'regata_athletic') return 'regata';

  return s;
};

/**
 * Verifica se uma modelagem refere-se à opção neutra/única
 */
export const isUnicoFit = (raw) => {
  if (!raw) return false;
  const s = normalizeFitSlug(raw);
  return s === 'modelo_unico' || s === 'unico' || s === 'tamanho_unico' || s === 'padrao';
};

/**
 * Converte qualquer variação de modelagem (casing, legacy, slug) para o nome canônico oficial.
 * Ex: 'oversized_heavy' -> 'Oversized Heavy'
 *     'boxy' -> 'Boxy'
 *     'oversized_classica' -> 'Oversized Clássica'
 *     'oversized' (legado genérico) -> null (obsoleto, substituído por Heavy e Clássica)
 */
export const getCanonicalFitName = (rawFit) => {
  if (!rawFit) return '';
  const slug = normalizeFitSlug(rawFit);
  if (slug === 'oversized_heavy') return 'Oversized Heavy';
  if (slug === 'oversized_classica') return 'Oversized Clássica';
  if (slug === 'boxy') return 'Boxy';
  if (isUnicoFit(rawFit)) return 'Modelo Único';
  if (slug === 'oversized') return null; // Legado descartado
  return String(rawFit).trim();
};

/**
 * Higieniza um array de modelagens (fits), eliminando:
 * 1. Modelagens legadas obsoletas (como 'oversized' genérico)
 * 2. Inconsistências de maiúsculas/minúsculas (ex: 'boxy' vira 'Boxy')
 * 3. 'Modelo Único' se houver qualquer modelagem real selecionada
 * 4. Duplicatas
 */
export const sanitizeFitsList = (rawFitsList) => {
  if (!Array.isArray(rawFitsList) || rawFitsList.length === 0) {
    return ['Oversized Heavy', 'Oversized Clássica', 'Boxy'];
  }

  const seenSlugs = new Set();
  const canonicalList = [];

  rawFitsList.forEach(item => {
    const canonical = getCanonicalFitName(item);
    if (!canonical) return; // descarta nulos (como 'oversized' legado)
    if (isUnicoFit(canonical)) return; // Modelo Único é tratado após checar se há cortes reais
    const slug = normalizeFitSlug(canonical);
    if (!seenSlugs.has(slug)) {
      seenSlugs.add(slug);
      canonicalList.push(canonical);
    }
  });

  if (canonicalList.length > 0) {
    return canonicalList;
  }

  // Se o usuário explicitamente marcou apenas Modelo Único
  const hasUnico = rawFitsList.some(f => isUnicoFit(f));
  if (hasUnico) {
    return ['Modelo Único'];
  }

  // Fallback padrão oficial
  return ['Oversized Heavy', 'Oversized Clássica', 'Boxy'];
};

/**
 * Formata o rótulo visual da modelagem para exibição no catálogo (filtros, chips e breadcrumbs).
 */
export const formatFitLabel = (fitKey) => {
  if (!fitKey) return '';
  const key = normalizeFitSlug(fitKey);

  const officialLabels = {
    'modelo_unico': 'MODELO ÚNICO',
    'unico': 'MODELO ÚNICO',
    'tamanho_unico': 'MODELO ÚNICO',
    'padrao': 'MODELO ÚNICO',
    'boxy': 'BOXY FIT',
    'oversized_heavy': 'OVERSIZED HEAVY',
    'oversized_classica': 'OVERSIZED CLÁSSICA',
    'oversized': 'OVERSIZED FIT',
    'normal': 'NORMAL / REGULAR FIT',
    'regular': 'NORMAL / REGULAR FIT',
    'regata': 'REGATA ATHLETIC',
    'slim': 'SLIM FIT',
    'wide_leg': 'WIDE LEG',
    'cargo': 'CARGO FIT',
    'cropped': 'CROPPED FIT',
    'drop_shoulder': 'DROP SHOULDER FIT',
    'street': 'STREET FIT'
  };

  if (officialLabels[key]) {
    return officialLabels[key];
  }

  // Formata modelagens novas/customizadas
  const clean = String(fitKey).replace(/[-_]/g, ' ').trim();
  if (clean.toLowerCase().includes('fit')) {
    return clean.toUpperCase();
  }
  return `${clean.toUpperCase()} FIT`;
};

/**
 * Formata o rotulo compacto do card de produto (tag visual concisa sem textos longos).
 */
export const formatFitBadgeLabel = (fitKey) => {
  if (!fitKey) return '';
  const key = normalizeFitSlug(fitKey);
  if (key === 'unico' || key === 'padrao' || key === 'modelo_unico' || key === 'tamanho_unico') return '';
  if (key === 'oversized_heavy') return 'OVERSIZED HEAVY';
  if (key === 'oversized_classica') return 'OVERSIZED CLÁSSICA';
  if (key === 'oversized') return 'OVERSIZED FIT';
  if (key === 'boxy') return 'BOXY FIT';
  if (key === 'normal' || key === 'regular') return 'REGULAR FIT';
  if (key === 'regata') return 'REGATA ATHLETIC';
  if (key === 'slim') return 'SLIM FIT';
  if (key === 'wide_leg') return 'WIDE LEG';
  if (key === 'cargo') return 'CARGO FIT';
  if (key === 'cropped') return 'CROPPED';
  if (key === 'drop_shoulder') return 'DROP SHOULDER';

  const clean = String(fitKey).replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean.toLowerCase().endsWith('fit')) {
    return clean.toUpperCase();
  }
  return `${clean.toUpperCase()} FIT`;
};

/**
 * Formata o rótulo compacto da categoria para exibição em badges e tags.
 */
export const formatCategoryBadgeLabel = (category) => {
  if (!category) return 'VESTUÁRIO';
  const clean = String(category).trim().toLowerCase();
  
  const map = {
    'camisa': 'CAMISETA',
    'camiseta': 'CAMISETA',
    'camisas': 'CAMISETAS',
    't-shirt': 'CAMISETA',
    'tshirt': 'CAMISETA',
    'jaqueta': 'JAQUETA',
    'jaquetas': 'JAQUETAS',
    'moletom': 'MOLETOM',
    'moletons': 'MOLETONS',
    'hoodie': 'HOODIE',
    'hoodies': 'HOODIES',
    'calca': 'CALÇA',
    'calças': 'CALÇAS',
    'calcas': 'CALÇAS',
    'short': 'BERMUDA',
    'shorts': 'BERMUDAS',
    'bermuda': 'BERMUDA',
    'bermudas': 'BERMUDAS',
    'bone': 'BONÉ',
    'bones': 'BONÉS',
    'acessorios': 'ACESSÓRIOS',
    'acessorio': 'ACESSÓRIOS',
    'brinde': 'BRINDE',
    'brindes': 'BRINDES',
    'gift-card': 'VALE-PRESENTE',
    'vestuario': 'VESTUÁRIO'
  };

  if (map[clean]) return map[clean];

  return String(category)
    .replace(/[-_]/g, ' ')
    .trim()
    .toUpperCase();
};

/**
 * Extrai a lista de modelagens ativas a partir dos produtos cadastrados no catálogo/CMS.
 * 
 * @param {Array} products Lista de produtos vindos do Firestore
 * @returns {Array<{ id: string, label: string, count: number }>}
 */
export const extractAvailableFits = (products = []) => {
  const fitMap = new Map();

  // 1. Extrai modelagens de cada produto cadastrado (suporta p.fits array e p.fit singular)
  if (Array.isArray(products)) {
    products.forEach(p => {
      // Ignora brindes da lista de modelagens
      if (p.type === 'brinde' || p.category === 'brinde') return;
      
      let productFits = [];
      if (Array.isArray(p.fits) && p.fits.length > 0) {
        productFits = p.fits;
      } else if (Array.isArray(p.availableFits) && p.availableFits.length > 0) {
        productFits = p.availableFits;
      } else if (p.fit) {
        const norm = normalizeFitSlug(p.fit);
        if (norm === 'oversized') {
          productFits = ['Oversized Heavy', 'Oversized Clássica'];
        } else {
          productFits = [p.fit];
        }
      } else {
        productFits = OFFICIAL_THR33_FITS;
      }

      productFits.forEach(rawFit => {
        if (!rawFit) return;
        const normSlug = normalizeFitSlug(rawFit);
        if (!normSlug || normSlug === 'unico' || normSlug === 'padrao') return;

        // Se for o slug genérico 'oversized', mapeia para as 2 vertentes oficiais da marca
        if (normSlug === 'oversized') {
          ['Oversized Heavy', 'Oversized Clássica'].forEach(subFit => {
            const subSlug = normalizeFitSlug(subFit);
            if (!fitMap.has(subSlug)) {
              fitMap.set(subSlug, {
                id: subSlug,
                label: formatFitLabel(subFit),
                count: 1
              });
            } else {
              fitMap.get(subSlug).count += 1;
            }
          });
          return;
        }

        if (!fitMap.has(normSlug)) {
          fitMap.set(normSlug, {
            id: normSlug,
            label: formatFitLabel(rawFit),
            count: 1
          });
        } else {
          fitMap.get(normSlug).count += 1;
        }
      });
    });
  }

  // 2. Filtra apenas modelagens que possuem produtos reais no catálogo (count > 0)
  const availableItems = Array.from(fitMap.values()).filter(item => item.count > 0);

  // 3. Fallback: se nenhum produto possuir modelagem cadastrada, exibe as 3 bases oficiais
  if (availableItems.length === 0) {
    return OFFICIAL_THR33_FITS.map(f => ({
      id: normalizeFitSlug(f),
      label: formatFitLabel(f),
      count: 0
    }));
  }

  // 4. Ordenação prioritária das modelagens
  const priorityOrder = [
    'oversized_heavy',
    'oversized_classica',
    'boxy',
    'oversized',
    'normal',
    'regular',
    'slim',
    'wide_leg',
    'cargo',
    'cropped',
    'drop_shoulder',
    'regata'
  ];

  return availableItems.sort((a, b) => {
    const idxA = priorityOrder.indexOf(a.id);
    const idxB = priorityOrder.indexOf(b.id);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.label.localeCompare(b.label);
  });
};
