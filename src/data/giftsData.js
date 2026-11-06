export const GIFT_CARD_COVER = '/assets/vale-presente.jpg';

export const GIFTS_DATA = [
  {
    id: 'vale-presente-thr33',
    slug: 'vale-presente-thr33',
    name: 'Vale-Presente Digital THR33',
    type: 'gift-card',
    category: 'gift-card',
    format: 'digital',
    description:
      'O presente definitivo para quem vive o streetwear. Valido para qualquer peca do site, incluindo novos drops e colecoes exclusivas. Liberacao digital instantanea na area Meus Pedidos.',
    values: [50, 100, 200],
    defaultPrice: 100,
    minValue: 30,
    maxValue: 2000,
    image: GIFT_CARD_COVER,
    isDigital: true,
    isGiftCard: true,
    active: true
  }
];

export default GIFTS_DATA;
