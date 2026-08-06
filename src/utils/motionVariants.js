// Central de Variantes do Framer Motion para o THR33

// Curva suave estilo Editorial / High-End
const smoothEase = [0.25, 0.1, 0.25, 1];

// 1. Aparição Suave Vertical (Fade In + Elevada Discreta de 18px)
export const fadeInUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.55, ease: smoothEase }
  }
};

// 2. Aparição com Escala Discreta (para Cards e Mídias)
export const fadeInScale = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.5, ease: smoothEase }
  }
};

// 3. Orquestrador de Filhos (Stagger Container)
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05
    }
  }
};

// 4. Efeito de Hover Tátil Discreto para Botões
export const buttonTactile = {
  rest: { scale: 1 },
  hover: { 
    scale: 1.015,
    transition: { duration: 0.2, ease: 'easeOut' }
  },
  tap: { 
    scale: 0.985,
    transition: { duration: 0.1, ease: 'easeIn' }
  }
};

// 5. Hover Sutil em Imagens/Cards (Efeito de Profundidade)
export const cardHoverDepth = {
  rest: { y: 0, boxShadow: '6px 6px 0px #000000' },
  hover: { 
    y: -3, 
    boxShadow: '8px 8px 0px #000000',
    transition: { duration: 0.2, ease: 'easeOut' }
  }
};

// 6. Deslocamento Sutil do Ícone de Seta
export const arrowSlide = {
  rest: { x: 0 },
  hover: { x: 5, transition: { duration: 0.2, ease: 'easeOut' } }
};

// 7. Moldura de Foto da Roupa (Zoom Interno Sutil)
export const imageInnerZoom = {
  rest: { scale: 1 },
  hover: { 
    scale: 1.04, 
    transition: { duration: 0.5, ease: smoothEase } 
  }
};
