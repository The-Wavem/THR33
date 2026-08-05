/**
 * Variantes reutilizáveis do Framer Motion para o ecossistema THR33.
 * Foco: Resposta tátil imediata, zero poluição visual.
 */

// 1. ANIMAÇÃO TÁTIL PARA BOTÕES (Efeito mecânico de prensa)
export const buttonTactile = {
  rest: { 
    x: 0, 
    y: 0,
    boxShadow: '4px 4px 0px #000000'
  },
  hover: { 
    x: -2, 
    y: -2,
    boxShadow: '6px 6px 0px #000000',
    transition: { duration: 0.15, ease: 'easeOut' }
  },
  tap: { 
    x: 2, 
    y: 2,
    boxShadow: '2px 2px 0px #000000',
    scale: 0.98,
    transition: { duration: 0.05 }
  }
};

// 2. DESLOCAMENTO SUTIL DO ÍCONE DE SETA DENTRO DE BOTÕES
export const arrowSlide = {
  rest: { x: 0 },
  hover: { x: 5, transition: { duration: 0.2, ease: 'easeOut' } }
};

// 3. ENTRADA ELEGANTE DE TEXTO (FADE-UP SEM DISTRAÇÕES)
export const fadeInUp = {
  hidden: { 
    opacity: 0, 
    y: 14 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 1, 0.5, 1] }
  }
};

// 4. CONTAINER COM STAGGER PARA FRASES CONSECUTIVAS
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

// 5. MOLDURA DE FOTO DA ROUPA (ZOOM INTERNO SUTIL)
export const imageInnerZoom = {
  rest: { scale: 1 },
  hover: { 
    scale: 1.04, 
    transition: { duration: 0.5, ease: [0.25, 1, 0.5, 1] } 
  }
};
