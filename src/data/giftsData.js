import largoDaOrdemBg from '@assets/images/largo-da-ordem-bg.jpeg';
import largoDaOrdemBg2 from '@assets/images/largo-da-ordem-bg2.jpeg';

export const GIFTS_DATA = [
  {
    id: 'vale-presente-thr33',
    name: 'Vale-Presente Digital THR33',
    type: 'gift-card',
    format: 'digital',
    description:
      'O presente perfeito para quem vive o streetwear. Válido para qualquer produto do site, incluindo novos drops e coleções exclusivas. Entrega digital imediata via e-mail.',
    values: [150, 300, 500, 1000, 5000],
    defaultPrice: 150,
    image: largoDaOrdemBg
  },
  {
    id: 'kit-adesivos-leak-two',
    name: 'Kit de Adesivos Streetwear Leak Two',
    type: 'brinde',
    format: 'fisico',
    description:
      'Kit contendo 5 adesivos vinílicos impermeáveis com estampas exclusivas da coleção Leak Two e o slogan FOR THE FEW.',
    price: 39.9,
    image: largoDaOrdemBg2
  },
  {
    id: 'chaveiro-metal-thr33',
    name: 'Chaveiro Metálico THR33 Logo',
    type: 'brinde',
    format: 'fisico',
    description:
      'Chaveiro pesado em liga de zinco com acabamento fosco e gravação em alto-relevo do logotipo da THR33.',
    price: 59.9,
    image: largoDaOrdemBg
  },
  {
    id: 'ecobag-canvas-atelie',
    name: "Ecobag Heavy Canvas 'A Rua Como Nosso Ateliê'",
    type: 'brinde',
    format: 'fisico',
    description:
      'Ecobag produzida em lona de algodão pesado de 380g, ideal para o dia a dia urbano ou para carregar equipamentos de estúdio.',
    price: 89.9,
    image: largoDaOrdemBg2
  }
];

export default GIFTS_DATA;
