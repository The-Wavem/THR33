import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Check, ShoppingBag, Gift, ShieldCheck, Mail } from 'lucide-react';
import { GIFTS_DATA } from '../../data/giftsData';
import { useCart } from '../../context/CartContext';
import styles from './BrindeDetalhe.module.css';

export function BrindeDetalhe() {
  const { id } = useParams();
  const { addToCart, setIsCartOpen, openCart } = useCart();

  // Encontra o item pelo ID ou seleciona o padrão
  const giftItem = GIFTS_DATA.find((g) => g.id === id) || GIFTS_DATA[0];

  const isGiftCard = giftItem.type === 'gift-card';

  // Estados específicos para Vale-Presente
  const [selectedValue, setSelectedValue] = useState(giftItem.values ? giftItem.values[0] : (giftItem.price || 150));
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [added, setAdded] = useState(false);

  const handleAddToCart = () => {
    const customProduct = {
      id: isGiftCard ? `${giftItem.id}-${selectedValue}` : giftItem.id,
      name: isGiftCard ? `${giftItem.name} (R$ ${selectedValue})` : giftItem.name,
      price: isGiftCard ? selectedValue : giftItem.price,
      image: giftItem.image,
      fit: isGiftCard ? `Vale Digital R$ ${selectedValue}` : "Acessório Oficial",
      recipientName: recipientName.trim() || undefined,
      recipientEmail: recipientEmail.trim() || undefined,
      giftMessage: giftMessage.trim() || undefined
    };

    addToCart(customProduct, isGiftCard ? `R$ ${selectedValue}` : 'ÚNICO', 1);

    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      if (setIsCartOpen) setIsCartOpen(true);
      else if (openCart) openCart();
    }, 600);
  };

  return (
    <main className={styles.container}>
      <nav className={styles.breadcrumb}>
        <Link to="/">HOME</Link> / <Link to="/brindes">BRINDES & VALES</Link> / <span>{giftItem.name.toUpperCase()}</span>
      </nav>

      <div className={styles.productGrid}>
        {/* IMAGEM DESTACADA DO VALE / BRINDE */}
        <section className={styles.imageSection}>
          <div className={styles.imageCard}>
            <span className={styles.badge}>{isGiftCard ? 'VALE DIGITAL' : 'BRINDE FÍSICO'}</span>
            <img src={giftItem.image} alt={giftItem.name} className={styles.mainImage} />
            
            {isGiftCard && (
              <div className={styles.cardOverlayPreview}>
                <span className={styles.previewLogo}>THR33</span>
                <span className={styles.previewSubtitle}>GIFT PASS</span>
                <span className={styles.previewValue}>R$ {selectedValue?.toLocaleString('pt-BR')}</span>
                {recipientName && (
                  <span className={styles.previewRecipient}>PARA: {recipientName.toUpperCase()}</span>
                )}
              </div>
            )}
          </div>
        </section>

        {/* FORMULÁRIO DE SELEÇÃO E COMPRA */}
        <section className={styles.infoSection}>
          <div className={styles.headerInfo}>
            <span className={styles.typeTag}>{isGiftCard ? 'DIGITAL GIFT CARD' : 'ACESSÓRIO DA MARCA'}</span>
            <h1 className={styles.title}>{giftItem.name}</h1>
            <p className={styles.description}>{giftItem.description}</p>
          </div>

          {/* SELETOR DE VALOR (CASO SEJA VALE-PRESENTE) */}
          {isGiftCard && giftItem.values && (
            <div className={styles.sectionGroup}>
              <span className={styles.groupLabel}>ESCOLHA O VALOR DO VALE:</span>
              <div className={styles.valuesGrid}>
                {giftItem.values.map((val) => (
                  <button
                    key={val}
                    type="button"
                    className={`${styles.valueChip} ${selectedValue === val ? styles.activeValue : ''}`}
                    onClick={() => setSelectedValue(val)}
                  >
                    R$ {val.toLocaleString('pt-BR')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* DADOS DO PRESENTEAR (SE FOR VALE PRESENTE) */}
          {isGiftCard && (
            <div className={styles.sectionGroup}>
              <span className={styles.groupLabel}>DADOS DO DESTINATÁRIO (OPCIONAL):</span>
              <div className={styles.giftForm}>
                <input 
                  type="text" 
                  placeholder="Nome de quem vai receber o presente" 
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className={styles.inputField}
                />
                <input 
                  type="email" 
                  placeholder="E-mail de quem vai receber" 
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className={styles.inputField}
                />
                <textarea 
                  rows="3" 
                  placeholder="Mensagem especial para o presenteado..." 
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value)}
                  className={styles.inputField}
                />
              </div>
            </div>
          )}

          {/* VALOR FINAL E AÇÃO DE COMPRA */}
          <div className={styles.actionSection}>
            <div className={styles.totalDisplay}>
              <span>VALOR FINAL:</span>
              <strong>R$ {selectedValue?.toFixed(2)}</strong>
            </div>

            <button 
              type="button" 
              onClick={handleAddToCart} 
              className={`${styles.addToCartBtn} ${added ? styles.addedSuccessBtn : ''}`}
            >
              {added ? (
                <>
                  <Check size={16} />
                  <span>ADICIONADO AO CARRINHO!</span>
                </>
              ) : (
                <>
                  <ShoppingBag size={16} />
                  <span>{isGiftCard ? 'ADICIONAR VALE AO CARRINHO' : 'ADICIONAR BRINDE AO CARRINHO'}</span>
                </>
              )}
            </button>
          </div>

          {/* REGRAS E TERMOS */}
          <div className={styles.termsBox}>
            <div className={styles.termsHeader}>
              <ShieldCheck size={15} />
              <h3>COMO FUNCIONA O USO DO VALE:</h3>
            </div>
            <ul>
              <li>Válido por 12 meses a partir da data de compra.</li>
              <li>Pode ser utilizado em qualquer produto, drop ou frete do site THR33.</li>
              <li>O código é enviado instantaneamente por e-mail após a aprovação do pagamento.</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}

export default BrindeDetalhe;
