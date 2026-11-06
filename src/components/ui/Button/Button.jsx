import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Button.module.css';

/**
 * Componente Button Base da Camada UI
 * 
 * @param {string} variant - 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {boolean} fullWidth - Se o botao ocupa 100% da largura
 * @param {boolean} loading - Se o botao exibe estado de carregamento com spinner
 * @param {boolean} disabled - Estado desabilitado
 * @param {string} type - 'button' | 'submit' | 'reset'
 * @param {string} to - Rota do React Router para renderizar como Link
 * @param {string} href - URL externa para renderizar como tag <a>
 * @param {ReactNode} icon - Icone opcional
 * @param {string} iconPosition - 'left' | 'right'
 * @param {string} className - Classes adicionais
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  type = 'button',
  to,
  href,
  icon,
  iconPosition = 'left',
  className = '',
  onClick,
  ...rest
}) {
  const isDisabled = disabled || loading;

  const buttonClasses = [
    styles.button,
    styles[variant] || styles.primary,
    styles[size] || styles.md,
    fullWidth ? styles.fullWidth : '',
    loading ? styles.loading : '',
    isDisabled ? styles.disabled : '',
    className
  ].filter(Boolean).join(' ');

  const content = (
    <>
      {loading && (
        <span className={styles.spinner} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
          </svg>
        </span>
      )}
      {!loading && icon && iconPosition === 'left' && (
        <span className={styles.iconLeft}>{icon}</span>
      )}
      <span className={styles.content}>{children}</span>
      {!loading && icon && iconPosition === 'right' && (
        <span className={styles.iconRight}>{icon}</span>
      )}
    </>
  );

  if (to && !isDisabled) {
    return (
      <Link to={to} className={buttonClasses} onClick={onClick} {...rest}>
        {content}
      </Link>
    );
  }

  if (href && !isDisabled) {
    return (
      <a href={href} className={buttonClasses} onClick={onClick} {...rest}>
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={buttonClasses}
      disabled={isDisabled}
      onClick={onClick}
      aria-busy={loading}
      {...rest}
    >
      {content}
    </button>
  );
}

export default Button;
