import React from 'react';
import styles from './Container.module.css';

/**
 * Componente Container da Camada Estrutural (Layout)
 * Padroniza larguras maximas, alinhamento central e paddings responsivos.
 * 
 * @param {ReactNode} children - Conteudo do container
 * @param {string} size - 'sm' (768px) | 'default' (1280px) | 'lg' (1440px) | 'full' (100%)
 * @param {string} as - Tag HTML a ser renderizada ('div', 'section', 'main', etc)
 * @param {boolean} noPadding - Se remove o espacamento lateral padrao
 * @param {string} className - Classes customizadas adicionais
 */
export function Container({
  children,
  size = 'default',
  as: Component = 'div',
  noPadding = false,
  className = '',
  ...rest
}) {
  const containerClasses = [
    styles.container,
    styles[size] || styles.default,
    noPadding ? styles.noPadding : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <Component className={containerClasses} {...rest}>
      {children}
    </Component>
  );
}

export default Container;
