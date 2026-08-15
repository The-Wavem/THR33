import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Check, ShoppingBag, Gift, ShieldCheck, Mail, ArrowLeft, Package } from 'lucide-react';
import { catalogService } from '../../services/catalogService';
import { seedService } from '../../services/seedService';
import { useCart } from '../../context/CartContext';
import styles from './BrindeDetalhe.module.css';

const DEFAULT_GIFT_VALUES = [150, 300, 500, 1000, 2500, 5000];

export function BrindeDetalhe() {
  const { id } = useParams();
  const { addToCart, setIsCartOpen, openCart } = useCart();

  const [giftItem, setGiftItem] = useState(null);
  const [loading, setLoading] = useState(true);

  // Estados específicos para Vale-Presente
  const [selectedValue, setSelectedValue] = useState(250);
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [added, setAdded] = useState(false);

  useEffect(() => {
    async function loadGift() {
      setLoading(true);
      try {
        await seedService.seedCatalogIfEmpty();
        let item = await catalogService.getProductById(id);
        if (!item) {
          const all = await catalogService.getAllProducts();
          item = all.find(p => p.id === id || p.slug === id || p.type === 'brinde') || null;
        }
        if (item) {
          setGiftItem(item);
          setSelectedValue(item.price ? Number(item.price) : 250);
        }
      } catch (err) {
        console.error("Erro ao carregar brinde:", err);
      } finally {
        setLoading(false);
      }
    }
    loadGift();
  }, [id]);

  if (loading) {
    return (
      <main className={styles.container}>
        <div style={{ textAlign: 'center', padding: '6rem 1rem', color: 'var(--text-secondary)' }}>
          <Package size={32} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 1rem' }} />
          <p>Carregando item no Firestore...</p>
        </div>
      </main>
    );
  }

  if (!giftItem) {
    return (
      <main className={styles.container}>
        <div style={{ textAlign: 'center', padding: '6rem 1rem' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', marginBottom: '1rem' }}>ITEM NÃO ENCONTRADO</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>O vale ou brinde que você procura não está mais disponível.</p>
          <Link to="/brindes" style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)', padding: '0.8rem 1.5rem', fontWeight: 800, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={16} />
            <span>VOLTAR A BRINDES & VALES</span>
          </Link>
        </div>
      </main>
    );
  }

  const isGiftCard = giftItem.category === 'gift-card' || giftItem.id.includes('vale');
  const values = giftItem.values || DEFAULT_GIFT_VALUES;

  const handleAddToCart = () => {
    const customProduct = {
      id: isGiftCard ? `${giftItem.id}-${selectedValue}` : giftItem.id,
      name: isGiftCard ? `${giftItem.name} (R$ ${selectedValue})` : giftItem.name,
      price: isGiftCard ? selectedValue : Number(giftItem.price || 0),
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
          {isGiftCard && (
            <div className={styles.sectionGroup}>
              <span className={styles.groupLabel}>ESCOLHA O VALOR DO VALE:</span>
              <div className={styles.valuesGrid}>
                {values.map((val) => (
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
              <span className={styles.groupLabel}>DADOS DO DESTINATÁRIO:</span>
              <div className={styles.formFields}>
                <div className={styles.fieldGroup}>
                  <label htmlFor="recipientName">Nome de quem vai receber:</label>
                  <input
                    id="recipientName"
                    type="text"
                    placeholder="Ex: Matheus Ramos"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label htmlFor="recipientEmail">E-mail do presenteado:</label>
                  <input
                    id="recipientEmail"
                    type="email"
                    placeholder="amigo@email.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label htmlFor="giftMessage">Mensagem personalizada:</label>
                  <textarea
                    id="giftMessage"
                    rows="3"
                    placeholder="Escreva uma mensagem especial..."
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* PREÇO E BOTÃO COMPRAR */}
          <div className={styles.purchaseBox}>
            <div className={styles.totalPrice}>
              <span>VALOR FINAL:</span>
              <strong>
                R$ {(isGiftCard ? selectedValue : Number(giftItem.price || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </strong>
            </div>

            <button
              type="button"
              className={`${styles.buyBtn} ${added ? styles.buyBtnSuccess : ''}`}
              onClick={handleAddToCart}
            >
              {added ? (
                <>
                  <Check size={18} />
                  <span>ADICIONADO À SACOLA!</span>
                </>
              ) : (
                <>
                  <ShoppingBag size={18} />
                  <span>{isGiftCard ? 'GERAR E ADICIONAR VALE' : 'ADICIONAR À SACOLA'}</span>
                </>
              )}
            </button>
          </div>

          <div className={styles.guaranteeNotice}>
            <ShieldCheck size={16} />
            <span>Vales são entregues instantaneamente via e-mail e não possuem prazo de expiração.</span>
          </div>
        </section>
      </div>
    </main>
  );
}

export default BrindeDetalhe;
