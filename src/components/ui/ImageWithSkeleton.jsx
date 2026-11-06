import React, { useState, useEffect, useRef } from 'react';
import styles from './ImageWithSkeleton.module.css';

/**
 * ImageWithSkeleton - Atomo de Imagem com Shimmer e Prevencao de CLS
 * 
 * Mantem a proporcao correta da imagem atraves de aspect-ratio,
 * exibe animacao suave de shimmer escuro enquanto o arquivo carrega,
 * e efetua fade-in suave quando a imagem estiver pronta.
 */
export function ImageWithSkeleton({
  src,
  alt = '',
  aspectRatio,
  priority = false,
  objectFit = 'cover',
  className = '',
  wrapperClassName = '',
  style = {},
  imgStyle = {},
  onLoad,
  onError,
  children,
  ...rest
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  // Se a imagem ja estiver em cache no navegador no momento do mount, ativa imediatamente
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    } else {
      setIsLoaded(false);
      setHasError(false);
    }
  }, [src]);

  const handleLoad = (e) => {
    setIsLoaded(true);
    if (onLoad) onLoad(e);
  };

  const handleError = (e) => {
    setHasError(true);
    setIsLoaded(true); // Oculta o shimmer em caso de erro
    if (onError) onError(e);
  };

  const containerStyle = {
    ...(aspectRatio ? { aspectRatio } : {}),
    ...style
  };

  const imageStyle = {
    objectFit,
    ...imgStyle
  };

  return (
    <div className={`${styles.skeletonWrapper} ${wrapperClassName}`} style={containerStyle}>
      {!isLoaded && !hasError && (
        <div className={styles.shimmer} aria-hidden="true" />
      )}

      {src && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={priority ? undefined : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          fetchPriority={priority ? 'high' : undefined}
          onLoad={handleLoad}
          onError={handleError}
          className={`${styles.image} ${isLoaded ? styles.imageLoaded : ''} ${className}`}
          style={imageStyle}
          {...rest}
        />
      )}

      {children}
    </div>
  );
}

export default ImageWithSkeleton;
