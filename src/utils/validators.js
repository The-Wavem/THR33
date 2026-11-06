// UTILITÁRIOS DE VALIDAÇÃO E MÁSCARAS DE DADOS (BRASIL / E-COMMERCE)

/**
 * Valida se o e-mail possui um formato válido e não excede o limite.
 */
export const validateEmail = (email) => {
  if (!email || email.length > 120) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Valida as regras de senha de alta segurança da THR33:
 * - Mínimo de 8 caracteres
 * - Pelo menos 1 letra maiúscula (A-Z)
 * - Pelo menos 1 número (0-9)
 */
export const validatePassword = (password) => {
  if (!password) return { isValid: false, message: 'Senha é obrigatória.' };
  if (password.length < 8) return { isValid: false, message: 'A senha deve ter no mínimo 8 caracteres.' };
  if (!/[A-Z]/.test(password)) return { isValid: false, message: 'A senha deve conter ao menos 1 letra maiúscula (A-Z).' };
  if (!/[0-9]/.test(password)) return { isValid: false, message: 'A senha deve conter ao menos 1 número (0-9).' };

  return { isValid: true, message: '' };
};

/**
 * Validação de requisitos e complexidade de Senha com métricas detalhadas:
 */
export function validatePasswordStrength(password) {
  if (!password) {
    return {
      isValid: false,
      hasMinLength: false,
      hasUppercase: false,
      hasNumber: false,
      message: 'A senha deve atender a todos os requisitos de segurança.'
    };
  }

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  const isValid = hasMinLength && hasUppercase && hasNumber;

  let message = '';
  if (!hasMinLength) message = 'A nova senha deve ter no mínimo 8 caracteres.';
  else if (!hasUppercase) message = 'A nova senha deve conter ao menos 1 letra maiúscula (A-Z).';
  else if (!hasNumber) message = 'A nova senha deve conter ao menos 1 número (0-9).';

  return {
    isValid,
    hasMinLength,
    hasUppercase,
    hasNumber,
    message
  };
}

/**
 * Valida o limite de caracteres genéricos para evitar estouro de buffers/payloads.
 */
export const validateMaxLength = (value, maxLength = 100) => {
  return typeof value === 'string' && value.trim().length <= maxLength;
};

/**
 * Validação algorítmica de CPF oficial (Cálculo dos dígitos verificadores)
 */
export function validateCPF(cpf) {
  if (!cpf) return false;
  const clean = cpf.replace(/\D/g, '');

  if (clean.length !== 11) return false;
  if (/^(\d)\1+$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10), 10)) return false;

  return true;
}

/**
 * Validação algorítmica de CNPJ oficial (Algoritmo Módulo 11)
 * Rejeita sequências repetidas e calcula os dois dígitos verificadores.
 */
export function validateCNPJ(cnpj) {
  if (!cnpj) return false;
  const clean = String(cnpj).replace(/\D/g, '');

  if (clean.length !== 14) return false;
  if (/^(\d)\1+$/.test(clean)) return false;

  // Primeiro dígito verificador
  let size = clean.length - 2;
  let numbers = clean.substring(0, size);
  let digits = clean.substring(size);
  let sum = 0;
  let pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0), 10)) return false;

  // Segundo dígito verificador
  size = size + 1;
  numbers = clean.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1), 10)) return false;

  return true;
}

/**
 * Validação polimórfica de CPF (11 dígitos) ou CNPJ (14 dígitos)
 */
export function validateCPForCNPJ(document) {
  if (!document) return false;
  const clean = String(document).replace(/\D/g, '');
  if (clean.length === 11) return validateCPF(clean);
  if (clean.length === 14) return validateCNPJ(clean);
  return false;
}

/**
 * Validação do Número do Endereço em conformidade com SEFAZ
 * A SEFAZ exige número predial válido ou a sigla 'S/N' para locais sem numeração.
 */
export function validateAddressNumber(number) {
  if (!number || typeof number !== 'string') return false;
  const trimmed = number.trim().toUpperCase();
  if (!trimmed) return false;
  if (/^(S\/N|SN|SEM N[UÚ]MERO)$/i.test(trimmed)) return true;
  return /^[0-9]+[a-zA-Z0-9\s\-\/\.]*$/.test(trimmed);
}

/**
 * Normaliza o número predial para os padrões fiscais da SEFAZ
 */
export function normalizeAddressNumber(number) {
  if (!number) return 'S/N';
  const trimmed = String(number).trim().toUpperCase();
  if (/^(S\/N|SN|SEM N[UÚ]MERO|0)$/i.test(trimmed)) {
    return 'S/N';
  }
  return trimmed;
}

/**
 * Validação de Inscrição Estadual (IE) ou isenção para PJ
 * Em caso de Pessoa Jurídica: se for isento, é aceito. Se for contribuinte, exige formato numérico.
 */
export function validateStateRegistration(ie, isIsento = false) {
  if (isIsento) return true;
  if (!ie) return false;
  const trimmed = String(ie).trim().toUpperCase();
  if (trimmed === 'ISENTO') return true;
  const clean = trimmed.replace(/\D/g, '');
  return clean.length >= 8 && clean.length <= 14;
}

/**
 * Validação de Telefone / Celular (10 ou 11 dígitos com DDD)
 */
export function validatePhone(phone) {
  if (!phone) return false;
  const clean = phone.replace(/\D/g, '');
  return clean.length === 10 || clean.length === 11;
}

/**
 * Validação de CEP (8 dígitos)
 */
export function validateCEP(cep) {
  if (!cep) return false;
  const clean = cep.replace(/\D/g, '');
  return clean.length === 8;
}

/**
 * Validação de Data de Validade do Cartão (MM/AA)
 */
export function validateExpiryDate(expiry) {
  if (!expiry) return false;
  const clean = expiry.replace(/\D/g, '');
  if (clean.length !== 4) return false;

  const month = parseInt(clean.substring(0, 2), 10);
  const year = parseInt(`20${clean.substring(2, 4)}`, 10);

  if (month < 1 || month > 12) return false;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  if (year > currentYear + 15) return false;

  return true;
}

/**
 * Validação de CVC do Cartão (3 ou 4 dígitos)
 */
export function validateCVC(cvc) {
  if (!cvc) return false;
  const clean = cvc.replace(/\D/g, '');
  return clean.length >= 3 && clean.length <= 4;
}


// -------------------------------------------------------------
// MÁSCARAS DE FORMATAÇÃO EM TEMPO REAL
// -------------------------------------------------------------

export function maskCPF(value) {
  if (!value) return '';
  const clean = value.replace(/\D/g, '').slice(0, 11);
  return clean
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

export function maskCNPJ(value) {
  if (!value) return '';
  const clean = value.replace(/\D/g, '').slice(0, 14);
  return clean
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function maskCPForCNPJ(value) {
  if (!value) return '';
  const clean = value.replace(/\D/g, '').slice(0, 14);
  if (clean.length <= 11) {
    return maskCPF(clean);
  }
  return maskCNPJ(clean);
}

export function maskPhone(value) {
  if (!value) return '';
  const clean = value.replace(/\D/g, '').slice(0, 11);
  if (clean.length <= 10) {
    return clean
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/^(\d{2})\s(\d{4})(\d)/, '($1) $2-$3');
  }
  return clean
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/^(\d{2})\s(\d{5})(\d)/, '($1) $2-$3');
}

export function maskCEP(value) {
  if (!value) return '';
  const clean = value.replace(/\D/g, '').slice(0, 8);
  return clean.replace(/^(\d{5})(\d)/, '$1-$2');
}

export function maskCardNumber(value) {
  if (!value) return '';
  const clean = value.replace(/\D/g, '').slice(0, 16);
  return clean.replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function maskExpiry(value) {
  if (!value) return '';
  const clean = value.replace(/\D/g, '').slice(0, 4);
  return clean.replace(/^(\d{2})(\d)/, '$1/$2');
}

/**
 * Detecta bandeira do cartão de crédito
 */
export function getCardBrand(number) {
  const clean = (number || '').replace(/\D/g, '');
  if (/^4/.test(clean)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(clean)) return 'Mastercard';
  if (/^(4011|4389|4514|4576|5041|5066|5090|6277|6362|6363|650|651|655)/.test(clean)) return 'Elo';
  if (/^3[47]/.test(clean)) return 'Amex';
  if (/^(6011|622|64[4-9]|65)/.test(clean)) return 'Discover';
  if (/^(30[0-5]|36|38)/.test(clean)) return 'Diners';
  return 'Cartão';
}

/**
 * Validação algorítmica de número de cartão de crédito via Algoritmo de Luhn (Mod 10)
 */
export function validateCardNumber(number) {
  if (!number) return false;
  const clean = String(number).replace(/\D/g, '');
  if (clean.length < 13 || clean.length > 19) return false;

  let sum = 0;
  let alternate = false;
  for (let i = clean.length - 1; i >= 0; i--) {
    let n = parseInt(clean.charAt(i), 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

/**
 * Valida validade do cartão (mês 01-12 e ano não expirado)
 */
export function validateCardExpiry(month, year) {
  const m = Number(month);
  const y = Number(year);
  if (!m || m < 1 || m > 12) return false;
  if (!y) return false;

  const now = new Date();
  const currentYear = Number(String(now.getFullYear()).slice(-2));
  const currentMonth = now.getMonth() + 1;

  if (y < currentYear) return false;
  if (y === currentYear && m < currentMonth) return false;
  if (y > currentYear + 20) return false;

  return true;
}

