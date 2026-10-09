/**
 * fitUtils.js - Utilitários para Normalização e Exibição Dinâmica de Modelagens (Fits)
 * 
 * Permite que o catálogo filtre de forma 100% dinâmica e independente
 * qualquer modelagem existente ou recém-cadastrada no CMS (ex: Boxy, Oversized,
 * Slim, Cargo, Wide Leg, ou novas modelagens criadas pelo lojista).
 */

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

  if (s === 'boxy' || s === 'boxy_fit') return 'boxy';
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
 * Formata o rótulo visual da modelagem para exibição no catálogo (filtros, chips e breadcrumbs).
 */
export const formatFitLabel = (fitKey) => {
  if (!fitKey) return '';
  const key = normalizeFitSlug(fitKey);

  const officialLabels = {
    'boxy': 'BOXY FIT',
    'oversized': 'OVERSIZED (HEAVY & CLÁSSICA)',
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
 * Extrai a lista de modelagens ativas a partir dos produtos cadastrados no catálogo/CMS.
 * 
 * @param {Array} products Lista de produtos vindos do Firestore
 * @returns {Array<{ id: string, label: string, count: number }>}
 */
export const extractAvailableFits = (products = []) => {
  const fitMap = new Map();

  // 1. Extrai modelagens de cada produto cadastrado
  if (Array.isArray(products)) {
    products.forEach(p => {
      // Ignora brindes da lista de modelagens
      if (p.type === 'brinde' || p.category === 'brinde') return;
      if (!p.fit) return;

      const normSlug = normalizeFitSlug(p.fit);
      if (!normSlug || normSlug === 'unico' || normSlug === 'padrao') return;

      if (!fitMap.has(normSlug)) {
        fitMap.set(normSlug, {
          id: normSlug,
          label: formatFitLabel(p.fit),
          count: 1
        });
      } else {
        fitMap.get(normSlug).count += 1;
      }
    });
  }

  // 2. Mescla com novas modelagens criadas pelo lojista no CMS (localStorage)
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('thr33_custom_fits');
      if (saved) {
        const customFits = JSON.parse(saved);
        if (Array.isArray(customFits)) {
          customFits.forEach(custom => {
            const rawKey = custom.key || custom.value || custom.label;
            const normSlug = normalizeFitSlug(rawKey);
            if (normSlug && !fitMap.has(normSlug)) {
              fitMap.set(normSlug, {
                id: normSlug,
                label: custom.label ? custom.label.toUpperCase() : formatFitLabel(rawKey),
                count: 0
              });
            }
          });
        }
      }
    }
  } catch (err) {
    // fallback seguro se localStorage não estiver disponível
  }

  // 3. Fallback: se nenhum produto possuir modelagem cadastrada, mantém as bases oficiais
  if (fitMap.size === 0) {
    return [
      { id: 'boxy', label: 'BOXY FIT', count: 0 },
      { id: 'oversized', label: 'OVERSIZED (HEAVY & CLÁSSICA)', count: 0 }
    ];
  }

  // 4. Ordenação prioritária das modelagens
  const priorityOrder = [
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

  return Array.from(fitMap.values()).sort((a, b) => {
    const idxA = priorityOrder.indexOf(a.id);
    const idxB = priorityOrder.indexOf(b.id);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.label.localeCompare(b.label);
  });
};
