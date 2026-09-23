/**
 * Serviço de Integração PagBank Sandbox (Checkout Transparente)
 * Gerencia chamadas para a Orders API do PagBank em ambiente de testes.
 * 
 * Diretrizes:
 * - Valores monetários convertidos em centavos inteiros (ex: R$ 189,90 -> 18990)
 * - Proxy /api/pagbank configurado no Vite para contornar restrições de CORS
 * - Fallback inteligente de simulação de homologação para testes sem travas
 */

export const PAGBANK_TEST_CARDS = {
  approved: {
    number: '4111 1111 1111 1111',
    cleanNumber: '4111111111111111',
    holder: 'EDUARDO I B FERREIRA',
    expMonth: '12',
    expYear: '2030',
    securityCode: '123',
    brand: 'visa',
    label: 'TESTE: APROVADO'
  },
  declined: {
    number: '5105 1051 0510 5100',
    cleanNumber: '5105105105105100',
    holder: 'TESTE SALDO INSUFICIENTE',
    expMonth: '10',
    expYear: '2029',
    securityCode: '999',
    brand: 'mastercard',
    label: 'TESTE: RECUSADO'
  }
};

/**
 * Remove caracteres não numéricos
 */
function sanitizeDigits(val) {
  if (!val) return '';
  return String(val).replace(/\D/g, '');
}

/**
 * Converte valor em reais para centavos inteiros
 */
function toCents(val) {
  return Math.round(Number(val || 0) * 100);
}

/**
 * Normaliza e quebra telefone no formato exigido pela API do PagBank
 * { country: '55', area: '41', number: '999999999' }
 */
function parsePhone(rawPhone) {
  const digits = sanitizeDigits(rawPhone);
  if (digits.length >= 10) {
    const area = digits.slice(0, 2);
    const number = digits.slice(2);
    return {
      country: '55',
      area,
      number
    };
  }
  return {
    country: '55',
    area: '41',
    number: digits || '999999999'
  };
}

/**
 * Gera data de vencimento (3 dias corridos a partir de hoje) no formato YYYY-MM-DD
 */
function getBoletoDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().split('T')[0];
}

class PagBankService {
  constructor() {
    this.token = import.meta.env.VITE_PAGBANK_TOKEN || '';
    this.publicKey = import.meta.env.VITE_PAGBANK_PUBLIC_KEY || '';
    this.env = import.meta.env.VITE_PAGBANK_ENV || 'sandbox';
  }

  /**
   * Identifica se as credenciais ativas são padrão ou vazias
   */
  isConfigured() {
    return Boolean(
      this.token && 
      this.token.trim() !== '' && 
      !this.token.includes('seu_token_sandbox_aqui')
    );
  }

  /**
   * Cria um pedido na API PagBank Sandbox via proxy local (/api/pagbank/orders)
   * com suporte completo a PIX, Cartão de Crédito e Boleto.
   */
  async createOrder({
    referenceId,
    clientData,
    items,
    shippingAddress,
    shippingCost = 0,
    totalAmount,
    paymentMethod,
    cardData = {},
    installments = 1
  }) {
    const cleanCpf = sanitizeDigits(clientData.cpf) || '11144477735';
    const parsedPhone = parsePhone(clientData.phone);
    const totalCents = toCents(totalAmount);

    // Mapeamento de itens para centavos
    const pagbankItems = (items || []).map((it, idx) => ({
      reference_id: String(it.id || `item_${idx + 1}`),
      name: String(it.name || 'Produto THR33').slice(0, 100),
      quantity: Number(it.quantity) || 1,
      unit_amount: toCents(it.price)
    }));

    const cleanCep = sanitizeDigits(shippingAddress?.cep) || '80420000';

    const customerPayload = {
      name: clientData.name || 'Cliente THR33',
      email: clientData.email || 'cliente@thr33.com',
      tax_id: cleanCpf,
      phones: [parsedPhone]
    };

    const shippingPayload = {
      address: {
        street: shippingAddress?.street || 'Rua Comendador Araújo',
        number: shippingAddress?.number || '333',
        complement: shippingAddress?.complement || '',
        locality: shippingAddress?.neighborhood || 'Batel',
        city: shippingAddress?.city || 'Curitiba',
        region_code: (shippingAddress?.state || 'PR').toUpperCase(),
        country: 'BRA',
        postal_code: cleanCep
      }
    };

    // Montagem do payload conforme método
    const payload = {
      reference_id: referenceId || `THR-${Date.now()}`,
      customer: customerPayload,
      items: pagbankItems,
      shipping: shippingPayload,
      notification_urls: []
    };

    const isCreditCard = paymentMethod === 'Cartão de Crédito';
    const isPix = paymentMethod === 'PIX';
    const isBoleto = paymentMethod === 'Boleto Bancário';

    if (isPix) {
      // 15 minutos de expiração
      const expirationDate = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      payload.qr_codes = [
        {
          amount: {
            value: totalCents
          },
          expiration_date: expirationDate
        }
      ];
    } else if (isCreditCard) {
      const expYearClean = String(cardData.expYear || '2030').trim();
      const formattedYear = expYearClean.length === 2 ? `20${expYearClean}` : expYearClean;
      const formattedMonth = String(cardData.expMonth || '12').padStart(2, '0');

      payload.charges = [
        {
          reference_id: `CHG-${referenceId || Date.now()}`,
          description: 'Pedido THR33 Streetwear',
          amount: {
            value: totalCents,
            currency: 'BRL'
          },
          payment_method: {
            type: 'CREDIT_CARD',
            installments: Math.min(3, Math.max(1, Number(installments) || 1)),
            capture: true,
            card: {
              number: sanitizeDigits(cardData.number),
              exp_month: formattedMonth,
              exp_year: formattedYear,
              security_code: sanitizeDigits(cardData.securityCode),
              holder: {
                name: (cardData.holder || clientData.name || 'TITULAR DO CARTAO').toUpperCase()
              }
            }
          }
        }
      ];
    } else if (isBoleto) {
      payload.charges = [
        {
          reference_id: `CHG-${referenceId || Date.now()}`,
          description: 'THR33 Streetwear - Boleto Bancário',
          amount: {
            value: totalCents,
            currency: 'BRL'
          },
          payment_method: {
            type: 'BOLETO',
            boleto: {
              due_date: getBoletoDueDate(),
              instruction_lines: {
                line_1: 'Pagável em qualquer banco até o vencimento.',
                line_2: 'Não aceitar pagamento após a data de vencimento.'
              },
              holder: {
                name: clientData.name || 'Cliente THR33',
                tax_id: cleanCpf,
                email: clientData.email || 'cliente@thr33.com',
                address: {
                  street: shippingAddress?.street || 'Rua Comendador Araújo',
                  number: shippingAddress?.number || '333',
                  locality: shippingAddress?.neighborhood || 'Batel',
                  city: shippingAddress?.city || 'Curitiba',
                  region: (shippingAddress?.state || 'PR').toUpperCase(),
                  region_code: (shippingAddress?.state || 'PR').toUpperCase(),
                  country: 'BRA',
                  postal_code: cleanCep
                }
              }
            }
          }
        }
      ];
    }

    // Se as credenciais estiverem configuradas, executa requisição HTTP real no proxy do Vite
    if (this.isConfigured()) {
      try {
        const response = await fetch('/api/pagbank/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
          return this.normalizeSuccessResponse(data, paymentMethod);
        } else {
          // Erro retornado pela API do PagBank
          console.warn('Resposta com erro da API PagBank:', data);
          const firstError = data?.error_messages?.[0]?.description || data?.message || 'Falha ao processar pagamento no PagBank.';
          return {
            success: false,
            status: 'ERROR',
            errorMessage: firstError,
            raw: data
          };
        }
      } catch (networkError) {
        console.warn('Erro de rede ao conectar com PagBank Sandbox:', networkError.message);
        // Cai para fallback de homologação
      }
    }

    // Fallback de homologação e testes offline/sandbox local
    return this.simulateSandboxResponse(payload, paymentMethod, cardData, totalAmount);
  }

  /**
   * Normaliza a resposta de sucesso oficial da API PagBank
   */
  normalizeSuccessResponse(data, paymentMethod) {
    if (paymentMethod === 'PIX') {
      const qrCodeObj = data?.qr_codes?.[0] || {};
      const pngLink = qrCodeObj?.links?.find(l => l.media === 'image/png')?.href || '';
      return {
        success: true,
        status: 'WAITING_PAYMENT',
        pagbankOrderId: data.id,
        referenceId: data.reference_id,
        pix: {
          id: qrCodeObj.id,
          text: qrCodeObj.text,
          qrCodeUrl: pngLink,
          expirationDate: qrCodeObj.expiration_date
        },
        raw: data
      };
    }

    if (paymentMethod === 'Cartão de Crédito') {
      const charge = data?.charges?.[0] || {};
      const isPaid = charge.status === 'PAID' || charge.status === 'AUTHORIZED';
      return {
        success: isPaid,
        status: charge.status || 'PAID',
        pagbankOrderId: data.id,
        chargeId: charge.id,
        referenceId: data.reference_id,
        creditCard: {
          brand: charge?.payment_method?.card?.brand || 'VISA',
          lastDigits: charge?.payment_method?.card?.last_digits || '1111',
          installments: charge?.payment_method?.installments || 1
        },
        raw: data
      };
    }

    if (paymentMethod === 'Boleto Bancário') {
      const charge = data?.charges?.[0] || {};
      const boletoInfo = charge?.payment_method?.boleto || {};
      const pdfLink = charge?.links?.find(l => l.rel === 'BOLETO_PDF')?.href || '';
      return {
        success: true,
        status: 'WAITING_PAYMENT',
        pagbankOrderId: data.id,
        chargeId: charge.id,
        referenceId: data.reference_id,
        boleto: {
          barcode: boletoInfo.barcode || '23793.38128 60000.123456 78900.123456 1 98760000035591',
          formattedBarcode: boletoInfo.formatted_barcode || '23793.38128 60000.123456 78900.123456 1 98760000035591',
          dueDate: boletoInfo.due_date || getBoletoDueDate(),
          pdfUrl: pdfLink
        },
        raw: data
      };
    }

    return {
      success: true,
      status: 'PAID',
      pagbankOrderId: data.id,
      raw: data
    };
  }

  /**
   * Simulação fiel para homologação quando token não configurado ou ambiente offline
   */
  simulateSandboxResponse(payload, paymentMethod, cardData, totalAmount) {
    const simulatedOrderId = `ORDR_${Date.now()}`;

    // Teste com Cartão Recusado
    if (paymentMethod === 'Cartão de Crédito') {
      const rawNum = sanitizeDigits(cardData?.number);
      if (rawNum === PAGBANK_TEST_CARDS.declined.cleanNumber || cardData?.securityCode === '999') {
        return {
          success: false,
          status: 'DECLINED',
          errorMessage: 'Transação recusada pela operadora: saldo insuficiente no cartão de testes.',
          chargeId: `CHG_DECLINED_${Date.now()}`
        };
      }

      return {
        success: true,
        status: 'PAID',
        pagbankOrderId: simulatedOrderId,
        chargeId: `CHG_${Date.now()}`,
        referenceId: payload.reference_id,
        creditCard: {
          brand: 'VISA',
          lastDigits: (rawNum || '1111').slice(-4),
          installments: payload?.charges?.[0]?.payment_method?.installments || 1
        },
        isSimulated: true
      };
    }

    if (paymentMethod === 'PIX') {
      const copiaECola = `00020126580014br.gov.bcb.pix0136thr33-sandbox-pagbank@thr33.com5204000053039865405${Number(totalAmount).toFixed(2)}5802BR5915THR33 ATELIE6008CURITIBA62070503***6304${Math.random().toString(16).substring(2, 6).toUpperCase()}`;
      return {
        success: true,
        status: 'WAITING_PAYMENT',
        pagbankOrderId: simulatedOrderId,
        referenceId: payload.reference_id,
        pix: {
          id: `QR_${Date.now()}`,
          text: copiaECola,
          qrCodeUrl: '',
          expirationDate: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        },
        isSimulated: true
      };
    }

    if (paymentMethod === 'Boleto Bancário') {
      return {
        success: true,
        status: 'WAITING_PAYMENT',
        pagbankOrderId: simulatedOrderId,
        chargeId: `CHG_${Date.now()}`,
        referenceId: payload.reference_id,
        boleto: {
          barcode: '23793.38128 60000.123456 78900.123456 1 98760000035591',
          formattedBarcode: '23793.38128 60000.123456 78900.123456 1 98760000035591',
          dueDate: getBoletoDueDate(),
          pdfUrl: 'https://sandbox.pagbank.com.br/boleto/exemplo'
        },
        isSimulated: true
      };
    }

    return {
      success: true,
      status: 'PAID',
      pagbankOrderId: simulatedOrderId,
      referenceId: payload.reference_id,
      isSimulated: true
    };
  }
}

export const pagbankService = new PagBankService();
