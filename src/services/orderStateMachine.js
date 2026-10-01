/**
 * Máquina de Estados Oficial dos Pedidos - THR33 Streetwear
 * Ciclo de Vida:
 * aguardando_pagamento -> pagamento_aprovado -> em_producao -> saiu_para_entrega -> entregue
 * (ou cancelado)
 */

export const ORDER_STATUSES = {
  AGUARDANDO_PAGAMENTO: 'aguardando_pagamento',
  PAGAMENTO_APROVADO: 'pagamento_aprovado',
  EM_PRODUCAO: 'em_producao',
  SAIU_PARA_ENTREGA: 'saiu_para_entrega',
  ENTREGUE: 'entregue',
  CANCELADO: 'cancelado'
};

export const ORDER_TIMELINE_STEPS = [
  { 
    key: ORDER_STATUSES.AGUARDANDO_PAGAMENTO, 
    label: 'Aguardando Pagamento',
    description: 'Aguardando confirmação da instituição financeira ou PIX.'
  },
  { 
    key: ORDER_STATUSES.PAGAMENTO_APROVADO, 
    label: 'Pagamento Aprovado',
    description: 'Pagamento confirmado! O pedido foi encaminhado para a equipe da THR33.'
  },
  { 
    key: ORDER_STATUSES.EM_PRODUCAO, 
    label: 'Em Produção',
    description: 'Sua peça está sendo produzida sob demanda com alto padrão têxtil.'
  },
  { 
    key: ORDER_STATUSES.SAIU_PARA_ENTREGA, 
    label: 'Saiu para Entrega',
    description: 'Pedido expedido e em trânsito com código de rastreamento oficial.'
  },
  { 
    key: ORDER_STATUSES.ENTREGUE, 
    label: 'Entregue',
    description: 'Pedido entregue com sucesso no endereço cadastrado.'
  }
];

/**
 * Normaliza qualquer variação de status (legados ou novos) para a chave canônica
 */
export function normalizeOrderStatus(status) {
  if (!status) return ORDER_STATUSES.AGUARDANDO_PAGAMENTO;
  const s = String(status).toLowerCase().trim();

  if (s.includes('aguardando') || s.includes('pendente') || s.includes('waiting')) {
    return ORDER_STATUSES.AGUARDANDO_PAGAMENTO;
  }
  if (s.includes('aprovado') || s.includes('pago') || s.includes('paid') || s.includes('authorized') || s.includes('confirmado')) {
    return ORDER_STATUSES.PAGAMENTO_APROVADO;
  }
  if (s.includes('produ') || s.includes('separ') || s.includes('confecc')) {
    return ORDER_STATUSES.EM_PRODUCAO;
  }
  if (s.includes('saiu') || s.includes('enviado') || s.includes('transito') || s.includes('transit') || s.includes('despachado')) {
    return ORDER_STATUSES.SAIU_PARA_ENTREGA;
  }
  if (s.includes('entregue') || s.includes('delivered') || s.includes('concluido')) {
    return ORDER_STATUSES.ENTREGUE;
  }
  if (s.includes('cancel') || s.includes('recusad') || s.includes('declined')) {
    return ORDER_STATUSES.CANCELADO;
  }

  return ORDER_STATUSES.AGUARDANDO_PAGAMENTO;
}

/**
 * Retorna metadados para exibição visual do status
 */
export function getOrderStatusMeta(rawStatus) {
  const normalized = normalizeOrderStatus(rawStatus);

  switch (normalized) {
    case ORDER_STATUSES.AGUARDANDO_PAGAMENTO:
      return {
        key: normalized,
        label: 'Aguardando Pagamento',
        color: '#facc15',
        bgColor: 'rgba(250, 204, 21, 0.12)',
        borderColor: 'rgba(250, 204, 21, 0.3)',
        stepIndex: 0,
        customerMessage: 'Aguardando confirmação do pagamento pelo banco emissor ou leitura do QR Code PIX.'
      };
    case ORDER_STATUSES.PAGAMENTO_APROVADO:
      return {
        key: normalized,
        label: 'Pagamento Aprovado',
        color: '#4ade80',
        bgColor: 'rgba(74, 222, 128, 0.12)',
        borderColor: 'rgba(74, 222, 128, 0.3)',
        stepIndex: 1,
        customerMessage: 'Pagamento confirmado! Seu pedido foi encaminhado para a equipe da THR33.'
      };
    case ORDER_STATUSES.EM_PRODUCAO:
      return {
        key: normalized,
        label: 'Em Produção',
        color: '#60a5fa',
        bgColor: 'rgba(96, 165, 250, 0.12)',
        borderColor: 'rgba(96, 165, 250, 0.3)',
        stepIndex: 2,
        customerMessage: 'Sua peça está sendo produzida sob demanda com alto padrão têxtil.'
      };
    case ORDER_STATUSES.SAIU_PARA_ENTREGA:
      return {
        key: normalized,
        label: 'Saiu para Entrega',
        color: '#c084fc',
        bgColor: 'rgba(192, 132, 252, 0.12)',
        borderColor: 'rgba(192, 132, 252, 0.3)',
        stepIndex: 3,
        customerMessage: 'Seu pacote está a caminho do endereço informado.'
      };
    case ORDER_STATUSES.ENTREGUE:
      return {
        key: normalized,
        label: 'Entregue',
        color: '#4ade80',
        bgColor: 'rgba(74, 222, 128, 0.12)',
        borderColor: 'rgba(74, 222, 128, 0.3)',
        stepIndex: 4,
        customerMessage: 'Pedido entregue com sucesso! Aproveite sua peça THR33.'
      };
    case ORDER_STATUSES.CANCELADO:
      return {
        key: normalized,
        label: 'Cancelado',
        color: '#f87171',
        bgColor: 'rgba(248, 113, 113, 0.12)',
        borderColor: 'rgba(248, 113, 113, 0.3)',
        stepIndex: -1,
        customerMessage: 'Este pedido foi cancelado e o estorno solicitado.'
      };
    default:
      return {
        key: normalized,
        label: 'Em Processamento',
        color: '#94a3b8',
        bgColor: 'rgba(148, 163, 184, 0.12)',
        borderColor: 'rgba(148, 163, 184, 0.3)',
        stepIndex: 0,
        customerMessage: 'Pedido registrado no sistema.'
      };
  }
}
