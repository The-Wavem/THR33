/**
 * Serviço de Integração com a API do ViaCEP
 * Documentação: https://viacep.com.br/
 */

export async function fetchAddressByCep(cep) {
  const cleanCep = (cep || '').replace(/\D/g, '');

  if (cleanCep.length !== 8) {
    return {
      success: false,
      error: 'CEP deve conter 8 dígitos numéricos.'
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Erro de rede ao consultar CEP: ${response.status}`);
    }

    const data = await response.json();

    if (data.erro) {
      return {
        success: false,
        error: 'CEP não encontrado na base dos Correios.'
      };
    }

    return {
      success: true,
      data: {
        cep: data.cep || cleanCep,
        street: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || '',
        complement: data.complemento || ''
      }
    };
  } catch (error) {
    console.warn('ViaCEP API offline ou timeout. Usando preenchimento manual:', error);
    return {
      success: false,
      error: 'Não foi possível buscar o endereço automaticamente. Preencha os campos abaixo.'
    };
  }
}
