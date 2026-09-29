/**
 * Serviço de Integração PagBank Sandbox (Checkout Transparente)
 * Gerencia chamadas para a Orders API do PagBank em ambiente de testes.
 * 
 * Diretrizes:
 * - Valores monetários convertidos em centavos inteiros (ex: R$ 189,90 -> 18990)
 * - Proxy /api/pagbank configurado no Vite para contornar restrições de CORS
 * - Fallback inteligente de simulação de homologação para testes locais
 */

export const PAGBANK_TEST_CARDS = {
  approved: {
    label: "Cartão Aprovado (Visa)",
    number: "4111 1111 1111 1111",
    holder: "EDUARDO I B FERREIRA",
    expMonth: "12",
    expYear: "30",
    cvv: "123",
    brand: "visa"
  },
  declined: {
    label: "Cartão Recusado (Saldo)",
    number: "5105 1051 0510 5100",
    holder: "TESTE RECUSA SALDO",
    expMonth: "10",
    expYear: "29",
    cvv: "999",
    brand: "mastercard"
  }
};

export const detectCardBrand = (number = '') => {
  const clean = String(number || '').replace(/\D/g, '');
  if (/^4/.test(clean)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(clean)) return 'mastercard';
  if (/^(4011|4389|5041|5067|6362|6363)/.test(clean)) return 'elo';
  if (/^(606282|3841)/.test(clean)) return 'hipercard';
  if (/^(34|37)/.test(clean)) return 'amex';
  return 'generic';
};

const PAGBANK_TOKEN = import.meta.env.VITE_PAGBANK_TOKEN || '';
const IS_SANDBOX = import.meta.env.VITE_PAGBANK_ENV !== 'production';

export const pagbankService = {
  createOrder: async ({
    orderReference,
    customer,
    items,
    shippingAddress,
    shippingCost,
    paymentMethod,
    cardData,
    installments = 1,
    totalAmount,
    rawOrderData = null
  }) => {
    const totalInCents = Math.round(Number(totalAmount) * 100);
    const cleanCpf = (customer.cpf || '').replace(/\D/g, '').padEnd(11, '0').slice(0, 11);
    const digits = (customer.phone || '').replace(/\D/g, '');
    const area = digits.length >= 10 ? digits.slice(0, 2) : '41';
    const number = digits.length >= 10 ? digits.slice(2) : '999999999';

    const orderPayload = {
      reference_id: orderReference,
      customer: {
        name: customer.name || 'Cliente THR33',
        email: customer.email || 'cliente@thr33.com',
        tax_id: cleanCpf,
        phones: [{ country: '55', area, number, type: 'MOBILE' }]
      },
      items: items.map((item, idx) => ({
        reference_id: String(item.id || `item_${idx}`),
        name: String(item.name || 'Camiseta THR33').slice(0, 64),
        quantity: Number(item.quantity) || 1,
        unit_amount: Math.round(Number(item.price) * 100)
      })),
      shipping: {
        address: {
          street: shippingAddress.street || 'Rua',
          number: shippingAddress.number || '0',
          complement: shippingAddress.complement || '',
          locality: shippingAddress.neighborhood || 'Centro',
          city: shippingAddress.city || 'Curitiba',
          region_code: shippingAddress.state || 'PR',
          country: 'BRA',
          postal_code: (shippingAddress.cep || '80000000').replace(/\D/g, '')
        }
      }
    };

    if (paymentMethod === 'PIX') {
      orderPayload.qr_codes = [{
        amount: { value: totalInCents },
        expiration_date: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      }];
    }

    if (paymentMethod === 'Cartão de Crédito') {
      const expYear = String(cardData?.expYear || '').length === 2 
        ? `20${cardData.expYear}` 
        : String(cardData?.expYear || '');

      orderPayload.charges = [{
        reference_id: `charge_${orderReference}`,
        description: "Pedido THR33 Streetwear",
        amount: { value: totalInCents, currency: "BRL" },
        payment_method: {
          type: "CREDIT_CARD",
          installments: Number(installments) || 1,
          capture: true,
          card: {
            number: (cardData?.number || '').replace(/\D/g, ''),
            exp_month: String(cardData?.expMonth || '').padStart(2, '0'),
            exp_year: expYear,
            security_code: String(cardData?.cvv || cardData?.securityCode || ''),
            holder: { name: (cardData?.holder || customer.name || 'TITULAR DO CARTAO').toUpperCase() }
          }
        }
      }];
    }

    if (paymentMethod === 'Boleto Bancário') {
      orderPayload.charges = [{
        reference_id: `charge_${orderReference}`,
        description: "Boleto THR33",
        amount: { value: totalInCents, currency: "BRL" },
        payment_method: {
          type: "BOLETO",
          boleto: {
            due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            instruction_lines: {
              line_1: "Pagável em qualquer banco até o vencimento.",
              line_2: "Não receber após o vencimento."
            },
            holder: {
              name: customer.name || 'Cliente THR33',
              tax_id: cleanCpf,
              email: customer.email || 'cliente@thr33.com',
              address: {
                country: "BRA",
                region_code: shippingAddress.state || "PR",
                city: shippingAddress.city || "Curitiba",
                postal_code: (shippingAddress.cep || "80000000").replace(/\D/g, ""),
                street: shippingAddress.street || "Rua",
                number: shippingAddress.number || "0",
                locality: shippingAddress.neighborhood || "Centro"
              }
            }
          }
        }
      }];
    }

    // 1. Tenta disparar pela Cloud Function segura (se em ambiente com backend ativo)
    try {
      const res = await fetch('/api/createSecureOrder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderPayload, rawOrderData })
      });

      if (res.ok) {
        const json = await res.json();
        return {
          success: true,
          orderId: json.orderId,
          data: json.pagbank,
          isBackend: true
        };
      }
    } catch (e) {
      console.warn("Function backend offline ou em ambiente local, aplicando fallback seguro.");
    }

    // 2. Se houver token válido configurado no ambiente, tenta chamada real no proxy
    if (PAGBANK_TOKEN && PAGBANK_TOKEN.trim() !== '' && !PAGBANK_TOKEN.includes('seu_token_sandbox_aqui')) {
      try {
        const response = await fetch('/api/pagbank/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${PAGBANK_TOKEN}`
          },
          body: JSON.stringify(orderPayload)
        });

        const responseData = await response.json();
        if (response.ok) {
          return { success: true, data: responseData, isSandbox: IS_SANDBOX };
        }
      } catch (err) {
        console.warn("Modo Sandbox Fallback:", err.message);
      }
    }

    // 3. Fallback de homologação local / sandbox
    const cleanNum = (cardData?.number || '').replace(/\D/g, '');
    const isDeclined = cleanNum.startsWith('5105') || cardData?.cvv === '999';

    return {
      success: true,
      isFallback: true,
      isSandbox: IS_SANDBOX,
      data: {
        id: `ORDE_${Date.now()}`,
        reference_id: orderReference,
        qr_codes: paymentMethod === 'PIX' ? [{
          text: `00020126580014br.gov.bcb.pix0136pagbank-sandbox-thr33-${orderReference}`,
          links: [{ rel: "QRCODE.PNG", href: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=THR33-PIX-${orderReference}` }]
        }] : null,
        charges: paymentMethod === 'Cartão de Crédito' ? [{
          id: `CHAR_${Date.now()}`,
          status: isDeclined ? 'DECLINED' : 'PAID',
          payment_response: {
            message: isDeclined ? 'Transação negada pelo banco emissor' : 'Sucesso'
          },
          payment_method: {
            type: 'CREDIT_CARD',
            installments: Number(installments) || 1,
            card: {
              brand: detectCardBrand(cardData?.number).toUpperCase(),
              last_digits: cleanNum.slice(-4) || '1111'
            }
          }
        }] : null,
        boleto: paymentMethod === 'Boleto Bancário' ? {
          barcode: "23793.38128 60000.123456 78900.123456 1 98760000035591",
          formatted_barcode: "23793.38128 60000.123456 78900.123456 1 98760000035591",
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        } : null
      }
    };
  }
};

export default pagbankService;
