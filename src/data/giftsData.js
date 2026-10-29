import largoDaOrdemBg from '@assets/images/largo-da-ordem-bg.jpeg';

export const GIFTS_DATA = [
  {
    id: 'vale-presente-thr33',
    slug: 'vale-presente-thr33',
    name: 'Vale-Presente Digital THR33',
    type: 'gift-card',
    category: 'gift-card',
    format: 'digital',
    description:
      'O presente definitivo para quem vive o streetwear. Válido para qualquer peça do site, incluindo novos drops e coleções exclusivas. Liberação digital instantânea na área Meus Pedidos.',
    values: [50, 100, 200],
    defaultPrice: 100,
    minValue: 30,
    maxValue: 2000,
    image: largoDaOrdemBg,
    isDigital: true,
    isGiftCard: true,
    active: true
  }
];

export default GIFTS_DATA;
