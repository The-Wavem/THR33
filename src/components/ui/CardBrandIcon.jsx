import React from 'react';
import { CreditCard } from 'lucide-react';
import styles from './CardBrandIcon.module.css';

import visaLogo from '../../assets/cards/visa.svg';
import mastercardLogo from '../../assets/cards/mastercard.svg';
import eloLogo from '../../assets/cards/elo.svg';
import hipercardLogo from '../../assets/cards/hipercard.svg';
import amexLogo from '../../assets/cards/amex.svg';

export function CardBrandIcon({ brand = 'generic' }) {
  const normalized = (brand || 'generic').toLowerCase();

  // Mapeamento de caminhos em src/assets/cards/
  const brandLogos = {
    visa: visaLogo || '/src/assets/cards/visa.svg',
    mastercard: mastercardLogo || '/src/assets/cards/mastercard.svg',
    elo: eloLogo || '/src/assets/cards/elo.svg',
    hipercard: hipercardLogo || '/src/assets/cards/hipercard.svg',
    amex: amexLogo || '/src/assets/cards/amex.svg'
  };

  const imageSrc = brandLogos[normalized];

  if (imageSrc) {
    return (
      <div className={styles.brandContainer}>
        <img 
          src={imageSrc} 
          alt={normalized.toUpperCase()} 
          className={styles.brandImage}
          onError={(e) => {
            // Fallback se a imagem fisica ainda nao tiver sido colada na pasta
            e.currentTarget.style.display = 'none';
            if (e.currentTarget.nextElementSibling) {
              e.currentTarget.nextElementSibling.style.display = 'inline-flex';
            }
          }}
        />
        <span className={styles.fallbackBadge} style={{ display: 'none' }}>
          {normalized.toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div className={styles.genericContainer}>
      <CreditCard className={styles.genericIcon} size={18} />
    </div>
  );
}

export default CardBrandIcon;
