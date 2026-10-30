import valeImage from '@assets/images/vale-presente.jpg';

/**
 * IMAGEM DO VALE-PRESENTE DIGITAL THR33
 * 
 * Para substituir por uma nova foto:
 * 1. Opcao A (src/assets): Salve seu arquivo dentro de "src/assets/images/" (ex: vale-presente.jpg)
 *    e troque o import no topo deste arquivo:
 *    import giftCardImg from '@assets/images/vale-presente.jpg';
 * 
 * 2. Opcao B (pasta public): Salve seu arquivo em "public/assets/vale-presente.jpg"
 *    e aponte a variavel GIFT_CARD_COVER diretamente como string: '/assets/vale-presente.jpg'.
 */
export const GIFT_CARD_COVER = valeImage;

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
