/**
 * Mapeamento e resolução inteligente de nomes de transportadoras e modalidades de envio
 * Converte códigos técnicos (Frenet, Melhor Envio, contingência) em nomes claros e legíveis
 * para a expedição e conferência de pedidos.
 */

const FRENET_SERVICES = {
  // Correios SEDEX
  '03220': { carrier: 'Correios', service: 'SEDEX' },
  '03298': { carrier: 'Correios', service: 'SEDEX 12' },
  '03301': { carrier: 'Correios', service: 'SEDEX 10' },
  '03280': { carrier: 'Correios', service: 'SEDEX Hoje' },
  '04014': { carrier: 'Correios', service: 'SEDEX' },
  '04162': { carrier: 'Correios', service: 'SEDEX' },
  '40010': { carrier: 'Correios', service: 'SEDEX' },
  '40096': { carrier: 'Correios', service: 'SEDEX' },
  '40215': { carrier: 'Correios', service: 'SEDEX 10' },
  '40290': { carrier: 'Correios', service: 'SEDEX Hoje' },

  // Correios PAC
  '04510': { carrier: 'Correios', service: 'PAC' },
  '04669': { carrier: 'Correios', service: 'PAC' },
  '04367': { carrier: 'Correios', service: 'PAC' },
  '41106': { carrier: 'Correios', service: 'PAC' },
  '41068': { carrier: 'Correios', service: 'PAC' },

  // Mini Envios
  '04227': { carrier: 'Correios', service: 'Mini Envios' }
};

const MELHOR_ENVIO_SERVICES = {
  '1': { carrier: 'Correios', service: 'PAC' },
  '2': { carrier: 'Correios', service: 'SEDEX' },
  '3': { carrier: 'Jadlog', service: '.Package (Padrão)' },
  '4': { carrier: 'Jadlog', service: '.Com (Expresso)' },
  '17': { carrier: 'Correios', service: 'Mini Envios' },
  '27': { carrier: 'Loggi', service: 'Express' },
  '28': { carrier: 'J&T Express', service: 'Standard' },
  '29': { carrier: 'J&T Express', service: 'Express' }
};

const CONTINGENCY_SERVICES = {
  'loggi_local': { carrier: 'Loggi', service: 'Express' },
  'transportadora_sp': { carrier: 'Jadlog', service: 'Padrão' },
  'pac_sp': { carrier: 'Correios', service: 'PAC' },
  'sedex_sp': { carrier: 'Correios', service: 'SEDEX' },
  'jadlog_sulsud': { carrier: 'Jadlog', service: 'Padrão' },
  'pac_sulsud': { carrier: 'Correios', service: 'PAC' },
  'sedex_sulsud': { carrier: 'Correios', service: 'SEDEX' },
  'pac_cone': { carrier: 'Correios', service: 'PAC' },
  'transportadora_cone': { carrier: 'Jadlog', service: 'Padrão' },
  'pac_norte': { carrier: 'Correios', service: 'PAC' },
  'aereo_norte': { carrier: 'Jadlog', service: 'Expresso' }
};

/**
 * Resolve o nome oficial da transportadora e do serviço para qualquer pedido
 * 
 * @param {Object} order Objeto do pedido (ou objeto de frete)
 * @returns {{ carrierName: string, serviceName: string, fullName: string }}
 */
export function resolveCarrierAndService(order) {
  if (!order) {
    return {
      carrierName: 'Transportadora',
      serviceName: 'Envio Padrão',
      fullName: 'Transportadora (Envio Padrão)'
    };
  }

  const rawCarrier = String(order.carrier || order.shippingCarrier || '').trim();
  const rawMethod = String(order.shippingMethod || order.method || '').trim().toLowerCase();
  const rawService = String(order.serviceName || order.service || '').trim();

  let resolvedCarrier = rawCarrier;
  let resolvedService = rawService;

  // 1. Tenta resolver por código Frenet (ex: frenet_03220, 03220)
  if (rawMethod.startsWith('frenet_')) {
    const code = rawMethod.replace('frenet_', '').trim();
    if (FRENET_SERVICES[code]) {
      resolvedCarrier = FRENET_SERVICES[code].carrier;
      resolvedService = FRENET_SERVICES[code].service;
    }
  } else if (FRENET_SERVICES[rawMethod]) {
    resolvedCarrier = FRENET_SERVICES[rawMethod].carrier;
    resolvedService = FRENET_SERVICES[rawMethod].service;
  }

  // 2. Tenta resolver por código Melhor Envio (ex: me_1, me_3)
  if (!resolvedCarrier || resolvedCarrier.toLowerCase() === 'transportadora') {
    if (rawMethod.startsWith('me_')) {
      const code = rawMethod.replace('me_', '').trim();
      if (MELHOR_ENVIO_SERVICES[code]) {
        resolvedCarrier = MELHOR_ENVIO_SERVICES[code].carrier;
        resolvedService = MELHOR_ENVIO_SERVICES[code].service;
      }
    } else if (MELHOR_ENVIO_SERVICES[rawMethod]) {
      resolvedCarrier = MELHOR_ENVIO_SERVICES[rawMethod].carrier;
      resolvedService = MELHOR_ENVIO_SERVICES[rawMethod].service;
    }
  }

  // 3. Tenta resolver por IDs locais de contingência
  if (!resolvedCarrier || resolvedCarrier.toLowerCase() === 'transportadora') {
    if (CONTINGENCY_SERVICES[rawMethod]) {
      resolvedCarrier = CONTINGENCY_SERVICES[rawMethod].carrier;
      resolvedService = CONTINGENCY_SERVICES[rawMethod].service;
    }
  }

  // 4. Detecção por texto / substrings comuns caso carrier seja vazio ou 'Transportadora'
  if (!resolvedCarrier || resolvedCarrier.toLowerCase() === 'transportadora') {
    if (rawMethod.includes('jadlog') || rawService.toLowerCase().includes('jadlog')) {
      resolvedCarrier = 'Jadlog';
      if (!resolvedService || resolvedService === rawMethod) resolvedService = 'Padrão';
    } else if (rawMethod.includes('sedex') || rawService.toLowerCase().includes('sedex')) {
      resolvedCarrier = 'Correios';
      resolvedService = 'SEDEX';
    } else if (rawMethod.includes('pac') || rawService.toLowerCase().includes('pac')) {
      resolvedCarrier = 'Correios';
      resolvedService = 'PAC';
    } else if (rawMethod.includes('loggi') || rawService.toLowerCase().includes('loggi')) {
      resolvedCarrier = 'Loggi';
      if (!resolvedService || resolvedService === rawMethod) resolvedService = 'Express';
    } else if (rawMethod.includes('jet') || rawMethod.includes('j&t') || rawService.toLowerCase().includes('j&t')) {
      resolvedCarrier = 'J&T Express';
      if (!resolvedService || resolvedService === rawMethod) resolvedService = 'Standard';
    } else if (rawMethod.includes('correios') || rawService.toLowerCase().includes('correios')) {
      resolvedCarrier = 'Correios';
      if (!resolvedService || resolvedService === rawMethod) {
        resolvedService = rawMethod.includes('sedex') ? 'SEDEX' : 'PAC';
      }
    }
  }

  // 5. Normalização se o carrier já for conhecido mas o serviceName ainda estiver com o código cru
  if (resolvedCarrier && (!resolvedService || resolvedService.startsWith('frenet_') || resolvedService.startsWith('me_'))) {
    if (resolvedCarrier.toLowerCase().includes('correios')) {
      if (rawMethod.includes('03220') || rawMethod.includes('sedex') || rawMethod === 'me_2') {
        resolvedService = 'SEDEX';
      } else {
        resolvedService = 'PAC';
      }
    } else if (resolvedCarrier.toLowerCase().includes('jadlog')) {
      resolvedService = 'Padrão';
    } else if (resolvedCarrier.toLowerCase().includes('loggi')) {
      resolvedService = 'Express';
    } else if (resolvedCarrier.toLowerCase().includes('j&t') || resolvedCarrier.toLowerCase().includes('jet')) {
      resolvedService = 'Standard';
    }
  }

  // 6. Tratamento de valores padrão
  if (!resolvedCarrier) {
    resolvedCarrier = 'Transportadora';
  }
  if (!resolvedService || resolvedService.startsWith('frenet_') || resolvedService.startsWith('me_')) {
    if (rawMethod === 'expresso') resolvedService = 'Expresso';
    else if (rawMethod === 'padrao') resolvedService = 'Econômico / Padrão';
    else resolvedService = 'Envio Padrão';
  }

  const cleanCarrier = resolvedCarrier.trim();
  const cleanService = resolvedService.trim();

  let fullName = cleanCarrier;
  if (cleanService && cleanService.toLowerCase() !== cleanCarrier.toLowerCase() && !cleanService.startsWith('frenet_')) {
    fullName = `${cleanCarrier} (${cleanService})`;
  }

  return {
    carrierName: cleanCarrier,
    serviceName: cleanService,
    fullName
  };
}

export default resolveCarrierAndService;
