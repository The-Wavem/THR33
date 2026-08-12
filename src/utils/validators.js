// UTILITÁRIOS DE VALIDAÇÃO E MÁSCARAS DE DADOS (BRASIL / E-COMMERCE)

/**
 * Validação algorítmica de CPF oficial (Cálculo dos dígitos verificadores)
 */
export function validateCPF(cpf) {
  if (!cpf) return false;
  const clean = cpf.replace(/\D/g, '');

  if (clean.length !== 11) return false;
  if (/^(\d)\1+$/.test(clean)) return false; // Rejeita 111.111.111-11, 222...

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
 * Validação de E-mail padrão RFC
 */
export function validateEmail(email) {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
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

/**
 * Validação de Número de Cartão de Crédito (Luhn Algorithm)
 */
export function validateCardNumber(number) {
  if (!number) return false;
  const clean = number.replace(/\D/g, '');
  if (clean.length < 13 || clean.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;
  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

// -------------------------------------------------------------
// MÁSCARAS DE FORMATAÇÃO EM TEMPO REAL
// -------------------------------------------------------------

export function maskCPF(value) {
  const clean = value.replace(/\D/g, '').slice(0, 11);
  return clean
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

export function maskPhone(value) {
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
  const clean = value.replace(/\D/g, '').slice(0, 8);
  return clean.replace(/^(\d{5})(\d)/, '$1-$2');
}

export function maskCardNumber(value) {
  const clean = value.replace(/\D/g, '').slice(0, 16);
  return clean.replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function maskExpiry(value) {
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
