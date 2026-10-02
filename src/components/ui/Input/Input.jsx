import React, { forwardRef } from 'react';
import styles from './Input.module.css';

/**
 * Componente Input Base da Camada UI
 * 
 * @param {string} label - Rotulo do campo
 * @param {string} error - Mensagem de erro para validacao
 * @param {string} helperText - Texto de apoio informativo
 * @param {ReactNode} leftIcon - Icone exibido à esquerda
 * @param {ReactNode} rightIcon - Icone ou acao interativa à direita
 * @param {boolean} fullWidth - Se ocupa 100% da largura do container
 * @param {string} size - 'sm' | 'md' | 'lg'
 */
export const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    fullWidth = true,
    size = 'md',
    disabled = false,
    required = false,
    id,
    name,
    type = 'text',
    className = '',
    containerClassName = '',
    ...rest
  },
  ref
) {
  const inputId = id || name || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  const hasError = Boolean(error);

  const containerClasses = [
    styles.container,
    fullWidth ? styles.fullWidth : '',
    disabled ? styles.disabled : '',
    hasError ? styles.hasError : '',
    containerClassName
  ].filter(Boolean).join(' ');

  const inputWrapperClasses = [
    styles.inputWrapper,
    styles[size] || styles.md,
    leftIcon ? styles.hasLeftIcon : '',
    rightIcon ? styles.hasRightIcon : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
          {required && <span className={styles.requiredMark}>*</span>}
        </label>
      )}

      <div className={inputWrapperClasses}>
        {leftIcon && <span className={styles.leftIconSlot}>{leftIcon}</span>}
        
        <input
          ref={ref}
          id={inputId}
          name={name}
          type={type}
          disabled={disabled}
          required={required}
          className={`${styles.input} ${className}`}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          {...rest}
        />

        {rightIcon && <span className={styles.rightIconSlot}>{rightIcon}</span>}
      </div>

      {hasError && (
        <p id={`${inputId}-error`} className={styles.errorText} role="alert">
          {error}
        </p>
      )}

      {!hasError && helperText && (
        <p id={`${inputId}-helper`} className={styles.helperText}>
          {helperText}
        </p>
      )}
    </div>
  );
});

export default Input;
