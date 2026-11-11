/**
 * Servico de Integracao PagBank (Checkout Transparente)
 * Gerencia chamadas para a API PagBank e Cloud Functions do Firebase.
 * 
 * Diretrizes Oficiais PagBank:
 * - Criptografia client-side do cartao via PagSeguro Web SDK (encryptCardData)
 * - Zero trafego ou persistencia de numero de cartao ou CVV em texto plano (PCI-DSS)
 * - Conexao com Cloud Function callable createPagBankOrder (Secrets protegidos no backend)
 * - Fallbacks resilientes para desenvolvimento e testes locais
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from './firebaseConfig';

export const PAGBANK_TEST_CARDS = {
  approved: {
    label: "Cartao Aprovado (Visa)",
    number: "4111 1111 1111 1111",
    holder: "EDUARDO I B FERREIRA",
    expMonth: "12",
    expYear: "30",
    cvv: "123",
    brand: "visa"
  },
  declined: {
    label: "Cartao Recusado (Saldo)",
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

/**
 * Sanitiza o nome do comprador/titular para atender as regras estritas da API PagBank e do SDK 3DS:
 * - Proibido conter dígitos numéricos (ex: 'Thr33' é rejeitado pelo PagBank com erro 400)
 * - Exige pelo menos duas palavras (Nome e Sobrenome)
 * - Apenas letras e espaços
 */
export const sanitizePagBankName = (rawName, fallbackHolder = '') => {
  const clean = String(rawName || '')
    .replace(/[0-9]/g, '')
    .replace(/[^a-zA-Z\u00C0-\u00FF\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const parts = clean.split(' ').filter(p => p.length >= 2);
  if (parts.length >= 2) {
    return parts.slice(0, 4).join(' ').toUpperCase();
  }

  if (fallbackHolder) {
    const cleanFallback = String(fallbackHolder)
      .replace(/[0-9]/g, '')
      .replace(/[^a-zA-Z\u00C0-\u00FF\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const fallbackParts = cleanFallback.split(' ').filter(p => p.length >= 2);
    if (fallbackParts.length >= 2) {
      return fallbackParts.slice(0, 4).join(' ').toUpperCase();
    }
  }

  return 'CLIENTE OFICIAL';
};

const PAGBANK_TOKEN = import.meta.env.VITE_PAGBANK_TOKEN || '';

export const isSandboxMode = () => {
  if (import.meta.env.VITE_PAGBANK_SANDBOX === 'false' || import.meta.env.VITE_PAGBANK_ENV === 'production') {
    return false;
  }
  return true;
};

const IS_SANDBOX = isSandboxMode();

/**
 * PASSO 2: Helper de Criptografia Client-Side (PCI-Free)
 * Utiliza o SDK Oficial do PagBank carregado em index.html.
 */
export const encryptCardData = async ({
  number,
  holder,
  expMonth,
  expYear,
  securityCode
}) => {
  const cleanNumber = String(number || '').replace(/\D/g, '');
  const cleanExpMonth = String(expMonth || '').replace(/\D/g, '').padStart(2, '0');
  let cleanExpYear = String(expYear || '').replace(/\D/g, '');
  if (cleanExpYear.length === 2) {
    cleanExpYear = `20${cleanExpYear}`;
  }
  const cleanCvv = String(securityCode || '').replace(/\D/g, '');
  const cleanHolder = String(holder || '').trim();

  let publicKey = import.meta.env.VITE_PAGBANK_PUBLIC_KEY || '';

  // Se a chave publica nao estiver definida no .env ou for uma URL invalida, busca via Cloud Function
  if (!publicKey || publicKey.startsWith('http') || publicKey.includes('sua_chave') || publicKey.includes('mock') || publicKey.length < 50) {
    try {
      const pkRes = await fetch('/api/getPublicKey', { method: 'POST' });
      if (pkRes.ok) {
        const pkData = await pkRes.json();
        if (pkData?.publicKey && !pkData?.isMock) {
          publicKey = pkData.publicKey;
        }
      }
    } catch (pkErr) {
      // Silenciado para nao expor logs no console
    }
  }

  const pagSeguroSdk = typeof window !== 'undefined' ? (window.PagSeguro || window.Pagseguro) : null;

  // Verifica se o SDK do PagBank esta pronto e com chave publica real configurada
  if (
    pagSeguroSdk &&
    typeof pagSeguroSdk.encryptCard === 'function' &&
    publicKey &&
    !publicKey.startsWith('http') &&
    !publicKey.includes('sua_chave') &&
    !publicKey.includes('mock') &&
    publicKey.length >= 50
  ) {
    try {
      const result = pagSeguroSdk.encryptCard({
        publicKey,
        holder: cleanHolder,
        number: cleanNumber,
        expMonth: cleanExpMonth,
        expYear: cleanExpYear,
        securityCode: cleanCvv
      });

      if (result && !result.hasErrors && result.encryptedCard) {
        return {
          success: true,
          encryptedCard: result.encryptedCard,
          isMock: false
        };
      }

      if (result && result.hasErrors && Array.isArray(result.errors) && result.errors.length) {
        const errorMsg = result.errors.map(err => err.message || err.code).join('; ');
        throw new Error(`Dados do cartão inválidos para criptografia: ${errorMsg}`);
      }
    } catch (sdkError) {
      throw sdkError;
    }
  }

  // Em modo de producao, NUNCA permite mock de cartao nem prosseguir sem criptografia
  if (!isSandboxMode()) {
    throw new Error('Não foi possível inicializar a criptografia segura do PagBank. Verifique a conexão com a internet e tente novamente.');
  }

  // Fallback seguro APENAS de homologacao local (para testes offline sem chaves de producao)
  const mockToken = `MOCK_ENC_${cleanNumber.slice(-4) || '1111'}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  return {
    success: true,
    encryptedCard: mockToken,
    isMock: true
  };
};

export const pagbankService = {
  createOrder: async ({
    orderReference,
    customer,
    items,
    shippingAddress,
    shippingCost,
    isFreeShippingActive = false,
    hasFreeShippingItem = false,
    hasFreeShippingCoupon = false,
    paymentMethod,
    cardData,
    cardEncrypted,
    installments = 1,
    totalAmount,
    couponCode = null,
    discountAmount = 0,
    walletDeduction = 0,
    rawOrderData = null
  }) => {
    const isOnlyDigital = (items || []).length > 0 && (items || []).every(i => 
      i.isGiftCard || i.category === 'gift-card' || String(i.id || '').includes('vale-presente')
    );
    const isFree = Boolean(
      isOnlyDigital ||
      isFreeShippingActive ||
      rawOrderData?.freeShippingApplied ||
      hasFreeShippingItem ||
      hasFreeShippingCoupon ||
      (items || []).some(i => !i.isGiftCard && i.category !== 'gift-card' && (i.freeShipping || i.hasFreeShipping))
    );
    const effectiveShipping = isFree ? 0 : (Number(shippingCost) || 0);

    // 1. Prioridade Maxima: Tenta disparar pela Cloud Function v2 createPagBankOrder
    try {
      if (functions) {
        const createPagBankOrderFn = httpsCallable(functions, 'createPagBankOrder');

        let paymentMethodPayload = null;
        if (paymentMethod === 'PIX') {
          paymentMethodPayload = { type: 'PIX' };
        } else if (paymentMethod === 'Cartão de Crédito') {
          paymentMethodPayload = {
            type: 'CREDIT_CARD',
            installments: Number(installments) || 1,
            cardEncrypted: cardEncrypted || cardData?.encryptedCard || '',
            holderName: (cardData?.holder || customer?.name || 'CLIENTE THR33').toUpperCase()
          };
        } else if (paymentMethod === 'Cartão de Débito') {
          let resolvedAuthId = cardData?.authenticationId || null;
          const encCardStr = cardEncrypted || cardData?.encryptedCard || '';

          // Se nao for token mock de homologacao, tenta iniciar desafio 3DS 2.0 do PagBank obrigatoriamente
          if (!resolvedAuthId && encCardStr && !encCardStr.startsWith('MOCK_ENC_')) {
            try {
              const pagSeguroSdk = typeof window !== 'undefined' ? (window.PagSeguro || window.Pagseguro) : null;
              if (!pagSeguroSdk?.authenticate3DS) {
                throw new Error('BANK_3DS_ERROR: O módulo de autenticação 3DS do PagBank não pôde ser carregado no navegador. Verifique sua conexão ou utilize PIX / Cartão de Crédito.');
              }

              // 1. Pre-valida estoque no servidor e gera uma sessao 3DS limpa (cada sessao 3DS e de uso unico por desafio)
              const sessionRes = await createPagBankOrderFn({
                action: 'create3dsSession',
                items: (items || []).map((item, idx) => ({
                  id: String(item.id || item.slug || `item_${idx}`),
                  name: String(item.name || 'Camiseta THR33').slice(0, 64),
                  quantity: Number(item.quantity) || 1,
                  size: item.size || 'M'
                }))
              });

              if (!sessionRes?.data?.success || !sessionRes?.data?.session) {
                throw new Error('BANK_3DS_ERROR: Não foi possível inicializar a sessão de segurança 3DS junto ao PagBank. Tente novamente em instantes ou escolha PIX / Cartão de Crédito.');
              }

              const targetEnv = sessionRes.data.env || (IS_SANDBOX ? 'SANDBOX' : 'PROD');
              pagSeguroSdk.setUp({
                session: sessionRes.data.session,
                env: targetEnv
              });

              const cleanPhone = String(customer?.phone || '').replace(/\D/g, '');
              const area = (cleanPhone.length >= 10 ? cleanPhone.slice(0, 2) : '41').replace(/\D/g, '');
              let phoneNum = (cleanPhone.length >= 10 ? cleanPhone.slice(2) : '999999999').replace(/\D/g, '');
              if (phoneNum.length > 9) phoneNum = phoneNum.slice(-9);
              if (phoneNum.length < 8) phoneNum = '99999999';

              const cleanCep = String(shippingAddress?.cep || shippingAddress?.postalCode || '80420000')
                .replace(/\D/g, '')
                .padEnd(8, '0')
                .slice(0, 8);
              const cleanState = String(shippingAddress?.state || shippingAddress?.regionCode || 'PR')
                .trim()
                .toUpperCase()
                .replace(/[^A-Z]/g, '')
                .slice(0, 2) || 'PR';
              const cleanNumber = (shippingAddress?.number ? String(shippingAddress.number).trim() : '') || 'S/N';
              const cleanComplement = (shippingAddress?.complement ? String(shippingAddress.complement).trim().slice(0, 40) : '') || 'S/C';
              const cleanStreet = (shippingAddress?.street ? String(shippingAddress.street).trim().slice(0, 100) : '') || 'Rua Comendador Araujo';
              const cleanCity = (shippingAddress?.city ? String(shippingAddress.city).trim().slice(0, 50) : '') || 'Curitiba';
              const sanitizedCustomerName = sanitizePagBankName(customer?.name || cardData?.holder, cardData?.holder);
              const amountInCents = Math.max(100, Math.round(Number(totalAmount || 0) * 100));

              const auth3dsResult = await pagSeguroSdk.authenticate3DS({
                data: {
                  customer: {
                    name: sanitizedCustomerName,
                    email: (customer?.email || 'cliente@thr33.com').trim(),
                    phones: [{ country: '55', area, number: phoneNum, type: 'MOBILE' }]
                  },
                  paymentMethod: {
                    type: 'DEBIT_CARD',
                    installments: 1,
                    card: {
                      encrypted: encCardStr
                    }
                  },
                  amount: {
                    value: amountInCents,
                    currency: 'BRL'
                  },
                  billingAddress: {
                    street: cleanStreet,
                    number: cleanNumber,
                    complement: cleanComplement,
                    regionCode: cleanState,
                    country: 'BRA',
                    city: cleanCity,
                    postalCode: cleanCep
                  },
                  dataOnly: false
                }
              });

              if (auth3dsResult?.status === 'CHANGE_PAYMENT_METHOD') {
                throw new Error('BANK_3DS_REJECTED: O banco emissor não autorizou o débito online para este cartão (CHANGE_PAYMENT_METHOD) e solicitou o uso de outro método de pagamento (PIX ou Cartão de Crédito).');
              }

              if (auth3dsResult?.status === 'AUTH_NOT_SUPPORTED' && !auth3dsResult?.id) {
                throw new Error('BANK_3DS_NOT_SUPPORTED: O banco emissor informou que este cartão não está habilitado para compras online na função Débito. Libere compras online no débito (ou use o Cartão Virtual) no app do seu banco, ou utilize PIX / Cartão de Crédito.');
              }

              if (auth3dsResult?.status === 'REJECTED' || auth3dsResult?.status === 'FAILURE' || auth3dsResult?.status === 'CANCELLED') {
                throw new Error('BANK_3DS_REJECTED: O banco emissor não autorizou o débito online (autenticação 3DS recusada ou cancelada). Verifique o aplicativo do seu banco ou tente outro método de pagamento.');
              }

              const validStatuses = ['AUTH_FLOW_COMPLETED', 'AUTH_NOT_SUPPORTED', 'AUTHENTICATED'];
              if (!auth3dsResult || !auth3dsResult.id || (auth3dsResult.status && !validStatuses.includes(auth3dsResult.status))) {
                throw new Error('BANK_3DS_ERROR: O banco emissor não autorizou o débito online (token 3DS ausente ou status não autenticado). Verifique o app do seu banco ou utilize PIX / Cartão de Crédito.');
              }

              resolvedAuthId = auth3dsResult.id;
            } catch (auth3dsErr) {
              let err3dsMsg = '';
              const sdkErrorMessages = auth3dsErr?.errorMessages || auth3dsErr?.detail?.errorMessages || auth3dsErr?.data?.errorMessages;
              if (typeof auth3dsErr === 'string') {
                err3dsMsg = auth3dsErr;
              } else if (Array.isArray(sdkErrorMessages) && sdkErrorMessages.length > 0) {
                const details = sdkErrorMessages
                  .map(e => `${e.parameterName || 'campo'}: ${e.description || e.message || e.code}`)
                  .join(', ');
                err3dsMsg = `Dados inválidos para autenticação 3DS (${details}). Verifique seu endereço e telefone de cadastro.`;
              } else {
                err3dsMsg = String(auth3dsErr?.message || auth3dsErr?.details || '');
              }

              if (
                err3dsMsg.includes('Estoque insuficiente') ||
                err3dsMsg.includes('não foi encontrado no catálogo')
              ) {
                throw new Error(err3dsMsg);
              }
              if (
                err3dsMsg.includes('BANK_3DS_NOT_SUPPORTED:') ||
                err3dsMsg.includes('BANK_3DS_REJECTED:') ||
                err3dsMsg.includes('BANK_3DS_ERROR:')
              ) {
                throw new Error(err3dsMsg.replace(/^BANK_3DS_[A-Z_]+:\s*/, ''));
              }
              if (err3dsMsg.includes('Dados inválidos para autenticação 3DS')) {
                throw new Error(err3dsMsg);
              }

              // Interrompe imediatamente o fluxo no Débito sem chamar createPagBankOrder sem o token 3DS
              throw new Error(
                'Não foi possível concluir a autenticação 3DS do Cartão de Débito junto ao banco emissor. Verifique os dados do endereço/cartão e se o cartão está liberado para compras online no débito no app do seu banco, ou escolha PIX / Cartão de Crédito.'
              );
            }
          }

          if (!resolvedAuthId && !encCardStr.startsWith('MOCK_ENC_')) {
            throw new Error(
              'O banco emissor não autorizou o débito online (autenticação 3DS obrigatória não concluída). Tente novamente ou utilize PIX / Cartão de Crédito.'
            );
          }

          paymentMethodPayload = {
            type: 'DEBIT_CARD',
            cardEncrypted: encCardStr,
            holderName: sanitizePagBankName(cardData?.holder || customer?.name, cardData?.holder),
            authenticationId: resolvedAuthId
          };
        }

        if (paymentMethodPayload) {
          const baseCallablePayload = {
            items: (items || []).map((item, idx) => ({
              id: String(item.id || item.slug || `item_${idx}`),
              name: String(item.name || 'Camiseta THR33').slice(0, 64),
              price: Number(item.price) || 0,
              quantity: Number(item.quantity) || 1,
              size: item.size || 'M',
              freeShipping: Boolean(item.freeShipping || item.hasFreeShipping),
              isGiftCard: Boolean(item.isGiftCard || item.category === 'gift-card' || String(item.id || '').includes('vale')),
              category: item.category || (item.isGiftCard ? 'gift-card' : 'camisa'),
              giftDeliveryMode: item.giftDeliveryMode || null,
              recipientName: item.recipientName || null,
              giftMessage: item.giftMessage || null
            })),
            customer: {
              uid: customer.uid || customer.userId || null,
              name: customer.name || 'Cliente THR33',
              email: customer.email || 'cliente@thr33.com',
              taxId: (customer.cpf || customer.taxId || '').replace(/\D/g, ''),
              phone: (customer.phone || '').replace(/\D/g, ''),
              isPj: Boolean(customer.isPj),
              ie: customer.ie || null,
              isentoIE: Boolean(customer.isentoIE)
            },
            shipping: {
              cost: effectiveShipping,
              freeShipping: isFree,
              isFreeShippingActive: isFree,
              method: String(rawOrderData?.shippingMethod || 'padrao'),
              carrier: String(rawOrderData?.carrier || ''),
              serviceName: String(rawOrderData?.serviceName || ''),
              shippingDeadline: String(rawOrderData?.shippingDeadline || rawOrderData?.deadline || ''),
              address: {
                street: (shippingAddress?.street ? String(shippingAddress.street).trim() : '') || 'Rua',
                number: (shippingAddress?.number ? String(shippingAddress.number).trim() : '') || 'S/N',
                complement: (shippingAddress?.complement ? String(shippingAddress.complement).trim().slice(0, 40) : '') || 'S/C',
                neighborhood: (shippingAddress?.neighborhood || shippingAddress?.locality || 'Centro').trim(),
                city: (shippingAddress?.city ? String(shippingAddress.city).trim() : '') || 'Curitiba',
                state: (shippingAddress?.state ? String(shippingAddress.state).trim().toUpperCase() : '') || 'PR',
                cep: String(shippingAddress?.cep || '80000000').replace(/\D/g, ''),
                ibge: shippingAddress?.ibge || ''
              }
            },
            paymentMethod: paymentMethodPayload,
            couponCode: couponCode || null,
            discountAmount: Number(discountAmount || 0),
            walletDeduction: Number(walletDeduction || 0),
            totalAmount: Number(totalAmount !== undefined ? totalAmount : 0)
          };

          const res = await createPagBankOrderFn(baseCallablePayload);

          if (res?.data?.success) {
            const data = res.data;
            const qrCodeObj = data.qrCode || null;
            return {
              success: true,
              orderId: data.orderId,
              status: data.status,
              isBackend: true,
              pixExpiresAt: data.pixExpiresAt || (paymentMethod === 'PIX' ? new Date(Date.now() + 20 * 60 * 1000).toISOString() : null),
              data: {
                id: data.orderId,
                reference_id: data.orderId,
                pixExpiresAt: data.pixExpiresAt || (paymentMethod === 'PIX' ? new Date(Date.now() + 20 * 60 * 1000).toISOString() : null),
                qr_codes: qrCodeObj ? [qrCodeObj] : null,
                charges: [{
                  id: `CHAR_${data.orderId}`,
                  status: data.status,
                  qr_code: qrCodeObj ? { text: qrCodeObj.text, id: qrCodeObj.id } : null,
                  links: qrCodeObj?.links || [],
                  payment_response: {
                    message: data.status === 'DECLINED' ? 'Transação negada pelo banco emissor' : 'Sucesso'
                  }
                }]
              }
            };
          }
        }
      }
    } catch (callErr) {
      const errMsg = String(callErr.message || callErr.details || "");
      const cleanLastDigits = String(cardData?.lastDigits || cardData?.number || '').replace(/\D/g, '').slice(-4);
      const isTestCard = cleanLastDigits === '1111' || cleanLastDigits === '5100' || cleanLastDigits === '4444';

      if (errMsg.includes("buyer email must not be equals to merchant email")) {
        throw new Error("O e-mail do comprador não pode ser igual ao e-mail cadastrado na conta PagBank do lojista. Por favor, informe outro e-mail na Etapa 1.");
      }

      if (
        paymentMethod === 'Cartão de Débito' ||
        errMsg.includes("Estoque insuficiente") ||
        errMsg.includes("não encontrado no catálogo") ||
        errMsg.includes("não está habilitado para compras online") ||
        errMsg.includes("autenticação de segurança 3DS") ||
        errMsg.includes("autenticação 3DS") ||
        errMsg.includes("3DS")
      ) {
        const details = String(callErr.details || callErr.message || "");
        if (paymentMethod === 'Cartão de Débito' && (details.toLowerCase().includes("authentication_method") || details.toLowerCase().includes("threeds"))) {
          throw new Error("Não foi possível concluir a autenticação 3DS do Cartão de Débito junto ao banco emissor. Verifique no app do seu banco se o cartão está liberado para compras online no débito (ou use o Cartão Virtual), ou escolha PIX / Cartão de Crédito.");
        }
        throw new Error(errMsg || "Não foi possível concluir a autenticação 3DS do Cartão de Débito.");
      }

      if (!isSandboxMode() && !isTestCard) {
        const details = String(callErr.details || callErr.message || "");
        if (details.toLowerCase().includes("whitelist")) {
          throw new Error("Sua conta PagBank requer liberação de Whitelist em Produção para a API de Pedidos. Conclua a solicitação de homologação no portal PagBank Developers ou ative o Sandbox para testes.");
        }
        throw new Error(callErr.message || "Erro ao conectar ao gateway PagBank");
      }
    }

    // 2. Fallback HTTP direto (/api/createSecureOrder) se disponivel
    const totalInCents = Math.round(Number(totalAmount) * 100);
    const cleanCpf = (customer.cpf || '').replace(/\D/g, '').padEnd(11, '0').slice(0, 11);
    const digits = (customer.phone || '').replace(/\D/g, '');
    const area = digits.length >= 10 ? digits.slice(0, 2) : '41';
    const phoneNum = digits.length >= 10 ? digits.slice(2) : '999999999';

    const orderPayload = {
      reference_id: orderReference,
      customer: {
        name: customer.name || 'Cliente THR33',
        email: customer.email || 'cliente@thr33.com',
        tax_id: cleanCpf,
        phones: [{ country: '55', area, number: phoneNum, type: 'MOBILE' }]
      },
      items: items.map((item, idx) => ({
        reference_id: String(item.id || `item_${idx}`),
        name: String(item.name || 'Camiseta THR33').slice(0, 64),
        quantity: Number(item.quantity) || 1,
        unit_amount: Math.round(Number(item.price) * 100)
      }))
    };

    const isDigitalOnlyOrder = items && items.length > 0 && items.every(item => 
      Boolean(item.isGiftCard || item.category === 'gift-card' || String(item.id || '').includes('vale'))
    );

    if (!isDigitalOnlyOrder && shippingAddress) {
      orderPayload.shipping = {
        address: {
          street: (shippingAddress.street ? String(shippingAddress.street).trim() : '') || 'Rua',
          number: (shippingAddress.number ? String(shippingAddress.number).trim() : '') || 'S/N',
          complement: (shippingAddress.complement ? String(shippingAddress.complement).trim().slice(0, 40) : '') || 'S/C',
          locality: (shippingAddress.neighborhood ? String(shippingAddress.neighborhood).trim() : '') || 'Centro',
          city: (shippingAddress.city ? String(shippingAddress.city).trim() : '') || 'Curitiba',
          region_code: (shippingAddress.state || 'PR').trim().toUpperCase().slice(0, 2),
          country: 'BRA',
          postal_code: String(shippingAddress.cep || '80000000').replace(/\D/g, '').padEnd(8, '0').slice(0, 8)
        }
      };
    }

    if (paymentMethod === 'PIX') {
      // Estrutura oficial PagBank Orders v2: qr_codes na raiz do pedido (sem charges)
      orderPayload.qr_codes = [{
        amount: { value: totalInCents },
        expiration_date: new Date(Date.now() + 20 * 60 * 1000).toISOString()
      }];
    }

    if (paymentMethod === 'Cartão de Crédito' || paymentMethod === 'Cartão de Débito') {
      if (!cardEncrypted) {
        throw new Error('Os dados do cartão precisam ser criptografados no navegador antes do envio (PCI-Free).');
      }

      const isDebit = paymentMethod === 'Cartão de Débito';
      orderPayload.charges = [{
        reference_id: `charge_${orderReference}`,
        description: "Pedido THR33 Streetwear",
        amount: { value: totalInCents, currency: "BRL" },
        payment_method: isDebit ? {
          type: "DEBIT_CARD",
          card: {
            encrypted: cardEncrypted,
            holder: { name: (cardData?.holder || customer.name || 'TITULAR DO CARTAO').toUpperCase() }
          },
          ...(cardData?.authenticationId ? {
            authentication_method: {
              type: "THREEDS",
              id: cardData.authenticationId
            }
          } : {})
        } : {
          type: "CREDIT_CARD",
          installments: Number(installments) || 1,
          capture: true,
          card: {
            encrypted: cardEncrypted,
            holder: { name: (cardData?.holder || customer.name || 'TITULAR DO CARTAO').toUpperCase() }
          }
        }
      }];
    }

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
      // Ignora e segue para fallback
    }

    // 3. Fallback de chamada direta ao proxy Vite se token sandbox fornecido
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
        // Silenciado para nao expor logs no console
      }
    }

    // 4. Fallback de homologacao local / sandbox offline (apenas se IS_SANDBOX ativo ou cartoes de teste)
    const cleanNum = (cardData?.number || cardData?.lastDigits || '').replace(/\D/g, '');
    const isTestCardNum = cleanNum.endsWith('1111') || cleanNum.endsWith('5100') || cleanNum.endsWith('4444');
    if (!isSandboxMode() && !isTestCardNum) {
      throw new Error("Não foi possível autorizar a cobrança junto ao banco emissor ou gateway PagBank. Verifique os dados do cartão ou escolha outro método de pagamento.");
    }

    const isDeclined = cleanNum.startsWith('5105') || cardData?.cvv === '999';
    const mockPixText = `00020101021226850014br.gov.bcb.pix2563api-h.pagseguro.com/pix/v2/mock-${orderReference}5204899953039865802BR5921Pagseguro Internet SA6009SAO PAULO62070503***63045677`;
    const mockChargeId = `CHAR_${Date.now()}`;

    return {
      success: true,
      isFallback: true,
      isSandbox: IS_SANDBOX,
      pixExpiresAt: paymentMethod === 'PIX' ? new Date(Date.now() + 20 * 60 * 1000).toISOString() : null,
      data: {
        id: `ORDE_${Date.now()}`,
        reference_id: orderReference,
        pixExpiresAt: paymentMethod === 'PIX' ? new Date(Date.now() + 20 * 60 * 1000).toISOString() : null,
        charges: [{
          id: mockChargeId,
          reference_id: `CHAR_${orderReference}`,
          status: paymentMethod === 'PIX' ? 'WAITING' : (isDeclined ? 'DECLINED' : 'PAID'),
          payment_response: {
            message: isDeclined ? 'Transação negada pelo banco emissor' : 'Sucesso'
          },
          amount: { value: totalInCents, currency: "BRL" },
          links: [
            {
              rel: "QRCODE.PNG",
              href: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(mockPixText)}`,
              media: "image/png",
              type: "GET"
            }
          ],
          qr_code: paymentMethod === 'PIX' ? {
            id: `QRCO_${Date.now()}`,
            text: mockPixText
          } : undefined,
          payment_method: {
            type: paymentMethod === 'Cartão de Débito' ? 'DEBIT_CARD' : 'CREDIT_CARD',
            installments: paymentMethod === 'Cartão de Débito' ? 1 : (Number(installments) || 1),
            card: {
              brand: detectCardBrand(cardData?.number).toUpperCase(),
              last_digits: cleanNum.slice(-4) || '1111'
            }
          }
        }],
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
