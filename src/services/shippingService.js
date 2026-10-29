import { fetchAddressByCep } from './viaCepService';

/**
 * shippingService.js - Serviço de Cotação de Frete em Tempo Real da THR33
 * 
 * Parâmetros Oficiais de Origem:
 * - CEP de Origem: 08577-010 (Itaquaquecetuba - SP)
 * - Expedição: Estr. de Santa Isabel, 1011, Sobre Loja - Vila Monte Belo, Itaquaquecetuba - SP
 * 
 * Dimensões Padrão (Unitário / 1 Camiseta):
 * - Peso: 300g (0.30 kg)
 * - Altura: 3 cm
 * - Largura: 24 cm
 * - Comprimento: 34 cm
 * 
 * Regra de Empilhamento Multipeças:
 * - Peso = 0.30 kg * quantidade
 * - Altura = Math.min(100, Math.max(3, 3 * quantidade))
 * - Largura e Comprimento mantidos em 24 cm e 34 cm (envelope têxtil de alta densidade)
 */

export const SHIPPING_ORIGIN = {
  cep: '08577010',
  formattedCep: '08577-010',
  address: 'Estr. de Santa Isabel, 1011, Sobre Loja - Vila Monte Belo, Itaquaquecetuba - SP',
  city: 'Itaquaquecetuba',
  state: 'SP'
};

/**
 * Matriz de Contingência Local (Fallback de Alta Precisão)
 * Aplicada automaticamente caso o servidor esteja offline ou em testes locais sem emulador.
 */
function getClientFallbackShipping(cleanCep, totalQty) {
  const prefix2 = parseInt(cleanCep.substring(0, 2), 10);
  const prefix5 = parseInt(cleanCep.substring(0, 5), 10);
  if (isNaN(prefix2) || prefix5 < 1000 || /^(\d)\1{7}$/.test(cleanCep)) {
    return [];
  }
  const additionalQty = Math.max(0, totalQty - 1);
  const quotes = [];

  // Faixa 1: Grande SP e Capital (01 a 09)
  if (prefix2 >= 1 && prefix2 <= 9) {
    quotes.push(
      {
        id: 'loggi_local',
        name: 'Loggi Express',
        carrier: 'Loggi',
        serviceName: 'Express',
        deadline: '2 a 3 dias úteis',
        deliveryDays: 3,
        price: Number((9.90 + additionalQty * 1.80).toFixed(2)),
        source: 'contingencia'
      },
      {
        id: 'sedex_local',
        name: 'SEDEX (Correios)',
        carrier: 'Correios',
        serviceName: 'SEDEX',
        deadline: '1 a 2 dias úteis',
        deliveryDays: 2,
        price: Number((14.90 + additionalQty * 2.50).toFixed(2)),
        source: 'contingencia'
      }
    );
  }
  // Faixa 2: Interior e Litoral de SP (11 a 19)
  else if (prefix2 >= 11 && prefix2 <= 19) {
    quotes.push(
      {
        id: 'pac_sp_interior',
        name: 'PAC (Correios)',
        carrier: 'Correios',
        serviceName: 'PAC',
        deadline: '3 a 5 dias úteis',
        deliveryDays: 5,
        price: Number((16.90 + additionalQty * 2.00).toFixed(2)),
        source: 'contingencia'
      },
      {
        id: 'sedex_sp_interior',
        name: 'SEDEX (Correios)',
        carrier: 'Correios',
        serviceName: 'SEDEX',
        deadline: '1 a 3 dias úteis',
        deliveryDays: 3,
        price: Number((22.50 + additionalQty * 3.00).toFixed(2)),
        source: 'contingencia'
      }
    );
  }
  // Faixa 3: Sul e Sudeste (RJ 20-28, ES 29, MG 30-39, PR 80-87, SC 88-89, RS 90-99)
  else if ((prefix2 >= 20 && prefix2 <= 39) || (prefix2 >= 80 && prefix2 <= 99)) {
    quotes.push(
      {
        id: 'pac_sulsud',
        name: 'PAC (Correios)',
        carrier: 'Correios',
        serviceName: 'PAC',
        deadline: '4 a 6 dias úteis',
        deliveryDays: 6,
        price: Number((22.90 + additionalQty * 2.50).toFixed(2)),
        source: 'contingencia'
      },
      {
        id: 'jadlog_sulsud',
        name: 'Jadlog',
        carrier: 'Jadlog',
        serviceName: 'Padrão',
        deadline: '3 a 5 dias úteis',
        deliveryDays: 5,
        price: Number((27.90 + additionalQty * 3.50).toFixed(2)),
        source: 'contingencia'
      }
    );
  }
  // Faixa 4: Centro-Oeste e Nordeste (40 a 65, 70 a 75, 77 a 79)
  else if ((prefix2 >= 40 && prefix2 <= 65) || (prefix2 >= 70 && prefix2 <= 75) || (prefix2 >= 77 && prefix2 <= 79)) {
    quotes.push(
      {
        id: 'pac_cone',
        name: 'PAC (Correios)',
        carrier: 'Correios',
        serviceName: 'PAC',
        deadline: '7 a 10 dias úteis',
        deliveryDays: 10,
        price: Number((29.90 + additionalQty * 3.50).toFixed(2)),
        source: 'contingencia'
      },
      {
        id: 'transportadora_cone',
        name: 'Jadlog',
        carrier: 'Jadlog',
        serviceName: 'Padrão',
        deadline: '5 a 8 dias úteis',
        deliveryDays: 8,
        price: Number((36.90 + additionalQty * 4.50).toFixed(2)),
        source: 'contingencia'
      }
    );
  }
  // Faixa 5: Norte (AM 69, RR 69, PA 66-68, AP 68, AC 69, RO 76)
  else if ((prefix2 >= 66 && prefix2 <= 69) || prefix2 === 76) {
    quotes.push(
      {
        id: 'pac_norte',
        name: 'PAC (Correios)',
        carrier: 'Correios',
        serviceName: 'PAC',
        deadline: '10 a 15 dias úteis',
        deliveryDays: 15,
        price: Number((39.50 + additionalQty * 4.50).toFixed(2)),
        source: 'contingencia'
      },
      {
        id: 'aereo_norte',
        name: 'Jadlog',
        carrier: 'Jadlog',
        serviceName: 'Padrão',
        deadline: '6 a 10 dias úteis',
        deliveryDays: 10,
        price: Number((49.90 + additionalQty * 6.00).toFixed(2)),
        source: 'contingencia'
      }
    );
  } else {
    // Fora de qualquer faixa válida de CEP brasileira
    return [];
  }

  quotes.sort((a, b) => a.price - b.price);
  return quotes;
}

export const shippingService = {
  /**
   * Calcula as opções de cotação de frete para o CEP informado.
   * Valida previamente a existência do CEP no ViaCEP e consulta a Cloud Function oficial.
   * 
   * @param {string} cep CEP de 8 dígitos numéricos
   * @param {Array} items Lista de itens do carrinho ou produto unitário
   * @param {number} subtotal Valor total em reais para fins de seguro de carga
   * @returns {Promise<{ success: boolean, options: Array, source: string, package: Object, destinationLocation?: string }>}
   */
  calculateShipping: async (cep, items = [], subtotal = 0) => {
    const cleanCep = String(cep || '').replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      throw new Error('Digite um CEP válido com 8 dígitos.');
    }

    if (/^(\d)\1{7}$/.test(cleanCep) || parseInt(cleanCep.substring(0, 5), 10) < 1000) {
      throw new Error('CEP inexistente ou inválido. Digite um CEP brasileiro válido.');
    }

    // 1. Verificação instantânea de existência do CEP na base oficial dos Correios (ViaCEP)
    let destinationLocation = null;
    let viaCepAddress = null;
    try {
      const addrRes = await fetchAddressByCep(cleanCep);
      if (addrRes && addrRes.success === false && addrRes.error?.includes('não encontrado')) {
        throw new Error('CEP não encontrado na base oficial dos Correios. Verifique o número digitado.');
      }
      if (addrRes?.success && addrRes?.data) {
        viaCepAddress = addrRes.data;
        destinationLocation = `${addrRes.data.city} - ${addrRes.data.state}`;
      }
    } catch (viaCepErr) {
      if (viaCepErr.message?.includes('não encontrado')) {
        throw viaCepErr;
      }
    }

    const totalQty = Array.isArray(items) && items.length > 0
      ? items.reduce((acc, i) => acc + (Math.max(1, Number(i.quantity) || 1)), 0)
      : 1;

    const DIRECT_FUNCTION_URL = 'https://southamerica-east1-thr33-streetwear.cloudfunctions.net/calculateShipping';
    const isLocalhost = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    const primaryUrl = isLocalhost ? DIRECT_FUNCTION_URL : '/api/calculateShipping';
    const secondaryUrl = isLocalhost ? '/api/calculateShipping' : DIRECT_FUNCTION_URL;

    const payload = JSON.stringify({
      cep: cleanCep,
      items: Array.isArray(items) ? items : [],
      subtotal: Number(subtotal) || 0
    });

    const reqHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    try {
      let response = await fetch(primaryUrl, {
        method: 'POST',
        headers: reqHeaders,
        body: payload
      });

      if (!response.ok && secondaryUrl && !isLocalhost) {
        try {
          response = await fetch(secondaryUrl, {
            method: 'POST',
            headers: reqHeaders,
            body: payload
          });
        } catch (_) {}
      }

      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.options) && data.options.length > 0) {
          return {
            ...data,
            destinationLocation: data.destinationLocation || destinationLocation,
            address: data.address || viaCepAddress
          };
        }
      } else {
        const errData = await response.json().catch(() => null);
        if (errData?.error && (errData.error.includes('inválido') || errData.error.includes('inexistente') || errData.error.includes('não encontrado'))) {
          throw new Error(errData.error);
        }
      }
    } catch (apiErr) {
      if (apiErr.message?.includes('não encontrado') || apiErr.message?.includes('inválido') || apiErr.message?.includes('inexistente')) {
        throw apiErr;
      }
      console.warn('Aviso: Falha na cotação remota, acionando matriz de contingência local:', apiErr.message);
    }

    // Se a API externa falhar ou não retornar opções, aciona a matriz de contingência
    const fallbackOptions = getClientFallbackShipping(cleanCep, totalQty);
    if (!fallbackOptions || fallbackOptions.length === 0) {
      throw new Error('Nenhuma opção de entrega encontrada para este CEP. Verifique se o CEP foi digitado corretamente.');
    }

    return {
      success: true,
      destinationCep: cleanCep,
      destinationLocation,
      originCep: SHIPPING_ORIGIN.cep,
      originAddress: SHIPPING_ORIGIN.address,
      package: {
        quantity: totalQty,
        weightKg: Math.max(0.3, Number((0.30 * totalQty).toFixed(2))),
        dimensions: {
          height: Math.min(100, Math.max(3, 3 * totalQty)),
          width: 24,
          length: 34
        },
        invoiceValue: Math.max(50 * totalQty, Number(((Number(subtotal) || 0) * 0.5).toFixed(2)))
      },
      source: 'fallback_matriz_sp',
      options: fallbackOptions
    };
  }
};

export default shippingService;
