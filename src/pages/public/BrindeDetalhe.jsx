import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Check, 
  ShoppingBag, 
  ShieldCheck, 
  ArrowLeft, 
  Package, 
  Gift, 
  Zap, 
  Sparkles, 
  AlertCircle 
} from 'lucide-react';
import { catalogService } from '../../services/catalogService';
import { GIFTS_DATA } from '../../data/giftsData';
import { useCart } from '../../context/CartContext';
import ImageWithSkeleton from '../../components/ui/ImageWithSkeleton';
import { SEO } from '../../components/common/SEO';
import { buildBreadcrumbSchema } from '../../utils/seoSchemas';
import styles from './BrindeDetalhe.module.css';

const DEFAULT_GIFT_VALUES = [50, 100, 200];
const MIN_GIFT_VALUE = 30;
const MAX_GIFT_VALUE = 2000;

export function BrindeDetalhe() {
  const { id } = useParams();
  const { addToCart, setIsCartOpen, openCart } = useCart();

  const [giftItem, setGiftItem] = useState(null);
  const [loading, setLoading] = useState(true);

  // Estados específicos para Vale-Presente
  const [selectedValue, setSelectedValue] = useState(100);
  const [customValueInput, setCustomValueInput] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState('code'); // 'code' (presentear) ou 'self' (ativar na conta)
  const [recipientName, setRecipientName] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [added, setAdded] = useState(false);
  const [valError, setValError] = useState('');

  const handlePresetSelect = (val) => {
    setSelectedValue(val);
    setIsCustomMode(false);
    setCustomValueInput('');
    setValError('');
  };

  const handleCustomValueChange = (e) => {
    const raw = e.target.value;
    setCustomValueInput(raw);
    setIsCustomMode(true);
    
    if (!raw) {
      setValError('Digite um valor para o vale.');
      return;
    }

    const num = Number(raw);
    if (isNaN(num)) {
      setValError('Digite um número válido.');
      return;
    }

    if (num < MIN_GIFT_VALUE) {
      setValError(`O valor mínimo para o vale-presente é R$ ${MIN_GIFT_VALUE},00.`);
      setSelectedValue(num);
      return;
    }

    if (num > MAX_GIFT_VALUE) {
      setValError(`O valor máximo permitido é R$ ${MAX_GIFT_VALUE.toLocaleString('pt-BR')},00.`);
      setSelectedValue(num);
      return;
    }

    setValError('');
    setSelectedValue(num);
  };

  useEffect(() => {
    async function loadGift() {
      setLoading(true);
      try {
        let item = await catalogService.getProductById(id);
        if (!item) {
          const gifts = await catalogService.getGifts();
          item = gifts.find((p) => p.id === id || p.slug === id) || null;
        }
        if (!item) {
          item = GIFTS_DATA.find((g) => g.id === id || g.slug === id) || null;
        }
        if (item) {
          setGiftItem(item);
          const initialVal = item.defaultPrice ? Number(item.defaultPrice) : (item.price ? Number(item.price) : 100);
          setSelectedValue(initialVal);
        }
      } catch (err) {
        console.error('Erro ao carregar brinde:', err);
      } finally {
        setLoading(false);
      }
    }
    loadGift();
  }, [id]);

  const giftJsonLd = useMemo(() => {
    if (!giftItem?.id) return null;
    return buildBreadcrumbSchema([
      { name: 'Início', url: '/' },
      { name: 'Brindes & Vales', url: '/brindes' },
      { name: giftItem.name || 'Brinde THR33', url: `/brindes/${giftItem.id}` }
    ]);
  }, [giftItem?.id, giftItem?.name]);

  if (loading) {
    return (
      <main className={styles.container}>
        <div style={{ textAlign: 'center', padding: '6rem 1rem', color: 'var(--text-secondary)' }}>
          <Package
            size={32}
            style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 1rem' }}
          />
          <p>Carregando item no catálogo...</p>
        </div>
      </main>
    );
  }

  if (!giftItem) {
    return (
      <main className={styles.container}>
        <div style={{ textAlign: 'center', padding: '6rem 1rem' }}>
          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.8rem',
              marginBottom: '1rem'
            }}
          >
            ITEM NÃO ENCONTRADO
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            O vale ou brinde que você procura não está mais disponível.
          </p>
          <Link
            to="/brindes"
            style={{
              background: 'var(--text-primary)',
              color: 'var(--bg-primary)',
              padding: '0.8rem 1.5rem',
              fontWeight: 800,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <ArrowLeft size={16} />
            <span>VOLTAR A BRINDES & VALES</span>
          </Link>
        </div>
      </main>
    );
  }

  const isGiftCard = giftItem.category === 'gift-card' || String(giftItem.id || '').includes('vale');
  const isCustomInvalid = isCustomMode && (Number(customValueInput) < MIN_GIFT_VALUE || Number(customValueInput) > MAX_GIFT_VALUE || isNaN(Number(customValueInput)));

  const handleAddToCart = () => {
    if (isGiftCard && isCustomInvalid) {
      return;
    }

    const effectivePrice = isGiftCard ? selectedValue : Number(giftItem.price || 0);

    const customProduct = {
      id: isGiftCard ? `${giftItem.id}-${selectedValue}-${deliveryMode}` : giftItem.id,
      name: isGiftCard ? `${giftItem.name} (R$ ${selectedValue})` : giftItem.name,
      price: effectivePrice,
      image: giftItem.image,
      category: isGiftCard ? 'gift-card' : (giftItem.category || 'brinde'),
      fit: isGiftCard 
        ? (deliveryMode === 'self' ? 'Crédito Minha Carteira' : 'Código Presente') 
        : 'Acessório Oficial',
      isGiftCard,
      giftDeliveryMode: isGiftCard ? deliveryMode : null,
      recipientName: isGiftCard && deliveryMode === 'code' ? (recipientName.trim() || undefined) : undefined,
      giftMessage: isGiftCard && deliveryMode === 'code' ? (giftMessage.trim() || undefined) : undefined,
      freeShipping: true,
      hasFreeShipping: true
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
      <SEO
        title={`${giftItem.name} | THR33 Streetwear`}
        description={giftItem.description || 'Vale-presente digital oficial THR33. Escolha o valor e use em qualquer drop do site.'}
        image={giftItem.image}
        url={`/brindes/${giftItem.id}`}
        jsonLd={giftJsonLd}
      />
      <nav className={styles.breadcrumb} aria-label="Navegação">
        <Link to="/">HOME</Link>
        <span>/</span>
        <Link to="/brindes">BRINDES & VALES</Link>
        <span>/</span>
        <span className={styles.breadcrumbCurrent}>{giftItem.name.toUpperCase()}</span>
      </nav>

      <div className={styles.productGrid}>
        {/* IMAGEM DESTACADA DO VALE / BRINDE */}
        <section className={styles.imageSection}>
          <div className={styles.imageCard}>
            <span className={styles.badge}>{isGiftCard ? 'VALE DIGITAL' : 'BRINDE OFICIAL'}</span>
            <ImageWithSkeleton
              src={giftItem.image}
              alt={giftItem.name}
              aspectRatio="4/5"
              priority={true}
              className={styles.mainImage}
              style={{ width: '100%', height: '100%' }}
            />

            {isGiftCard && (
              <div className={styles.cardOverlayPreview}>
                <div className={styles.previewHeader}>
                  <span className={styles.previewLogo}>THR33</span>
                  <span className={styles.previewSubtitle}>
                    {deliveryMode === 'self' ? 'CARTEIRA DIGITAL' : 'GIFT PASS'}
                  </span>
                </div>
                <div className={styles.previewValue}>
                  R$ {selectedValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className={styles.previewRecipient}>
                  {deliveryMode === 'self'
                    ? 'CRÉDITO NA SUA PRÓPRIA CONTA'
                    : recipientName
                      ? `PARA: ${recipientName.toUpperCase()}`
                      : 'CÓDIGO DIGITAL EXCLUSIVO'}
                </div>
                <div className={styles.previewFooterNote}>
                  DISPONÍVEL EM MEUS PEDIDOS APÓS O PAGAMENTO
                </div>
              </div>
            )}
          </div>
        </section>

        {/* FORMULÁRIO DE SELEÇÃO E COMPRA */}
        <section className={styles.infoSection}>
          <div className={styles.headerInfo}>
            <span className={styles.typeTag}>
              {isGiftCard ? 'DIGITAL GIFT CARD' : 'ACESSÓRIO OFICIAL'}
            </span>
            <h1 className={styles.title}>{giftItem.name}</h1>
            <p className={styles.description}>{giftItem.description}</p>
          </div>

          {/* SELETOR DE MODO DE DESTINO DO VALE */}
          {isGiftCard && (
            <div className={styles.sectionGroup}>
              <span className={styles.groupLabel}>ONDE VOCÊ QUER USAR O VALE-PRESENTE?</span>
              <div className={styles.modeSelectorGrid}>
                <button
                  type="button"
                  className={`${styles.modeCard} ${deliveryMode === 'code' ? styles.activeModeCard : ''}`}
                  onClick={() => setDeliveryMode('code')}
                >
                  <div className={styles.modeHeader}>
                    <Gift size={16} />
                    <span>GERAR CÓDIGO P/ PRESENTEAR</span>
                  </div>
                  <span className={styles.modeDesc}>
                    Gera um código exclusivo em <strong>Meus Pedidos</strong> para você copiar e mandar no WhatsApp da pessoa ativar.
                  </span>
                </button>

                <button
                  type="button"
                  className={`${styles.modeCard} ${deliveryMode === 'self' ? styles.activeModeCard : ''}`}
                  onClick={() => setDeliveryMode('self')}
                >
                  <div className={styles.modeHeader}>
                    <Zap size={16} />
                    <span>ATIVAR NA MINHA CONTA</span>
                  </div>
                  <span className={styles.modeDesc}>
                    O valor cai direto como <strong>saldo na sua carteira digital</strong> assim que o pagamento for aprovado.
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* SELETOR DE VALOR (CASO SEJA VALE-PRESENTE) */}
          {isGiftCard && (
            <div className={styles.sectionGroup}>
              <span className={styles.groupLabel}>ESCOLHA O VALOR DO VALE-PRESENTE:</span>
              <div className={styles.valuesGrid}>
                {DEFAULT_GIFT_VALUES.map((val) => (
                  <button
                    key={val}
                    type="button"
                    className={`${styles.valueChip} ${
                      !isCustomMode && selectedValue === val ? styles.activeValue : ''
                    }`}
                    onClick={() => handlePresetSelect(val)}
                  >
                    R$ {val.toLocaleString('pt-BR')}
                  </button>
                ))}
              </div>

              {/* CAMPO DE VALOR LIVRE / ADAPTÁVEL */}
              <div className={styles.customValueBlock}>
                <label htmlFor="customGiftVal">OU DIGITE OUTRO VALOR (R$ {MIN_GIFT_VALUE} A R$ {MAX_GIFT_VALUE.toLocaleString('pt-BR')}):</label>
                <div className={styles.customInputRow}>
                  <span className={styles.currencyPrefix}>R$</span>
                  <input
                    id="customGiftVal"
                    type="number"
                    min={MIN_GIFT_VALUE}
                    max={MAX_GIFT_VALUE}
                    placeholder="Ex: 150"
                    value={customValueInput}
                    onChange={handleCustomValueChange}
                    className={styles.customValInput}
                  />
                </div>
                {valError && (
                  <div className={styles.valueValidationAlert}>
                    <AlertCircle size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                    <span>{valError}</span>
                  </div>
                )}
                <small>
                  O saldo de R$ {selectedValue?.toFixed(2)} será creditado sem taxas ou descontos.
                </small>
              </div>
            </div>
          )}

          {/* DADOS DO PRESENTEAR (SE FOR VALE PRESENTE E MODO CÓDIGO) */}
          {isGiftCard && deliveryMode === 'code' && (
            <div className={styles.sectionGroup}>
              <span className={styles.groupLabel}>PERSONALIZAÇÃO DO CARTÃO DIGITAL:</span>
              <div className={styles.formFields}>
                <div className={styles.fieldGroup}>
                  <label htmlFor="recipientName">NOME DE QUEM VAI RECEBER (OPCIONAL):</label>
                  <input
                    id="recipientName"
                    type="text"
                    placeholder="Ex: Matheus Ramos"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label htmlFor="giftMessage">
                    MENSAGEM PERSONALIZADA (OPCIONAL):
                  </label>
                  <textarea
                    id="giftMessage"
                    rows="3"
                    placeholder="Ex: Parabéns meu mano! Escolhe a peça que quiser no drop novo..."
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
              <span>TOTAL A PAGAR:</span>
              <strong>
                R${' '}
                {(isGiftCard ? selectedValue : Number(giftItem.price || 0)).toLocaleString(
                  'pt-BR',
                  { minimumFractionDigits: 2 }
                )}
              </strong>
            </div>

            <button
              type="button"
              disabled={isGiftCard && isCustomInvalid}
              className={`${styles.buyBtn} ${added ? styles.buyBtnSuccess : ''}`}
              onClick={handleAddToCart}
              style={isGiftCard && isCustomInvalid ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              {added ? (
                <>
                  <Check size={18} />
                  <span>ADICIONADO À SACOLA!</span>
                </>
              ) : (
                <>
                  <ShoppingBag size={18} />
                  <span>{isGiftCard ? 'ADICIONAR VALE À SACOLA' : 'ADICIONAR À SACOLA'}</span>
                </>
              )}
            </button>
          </div>

          <div className={styles.guaranteeNotice}>
            <ShieldCheck size={16} />
            <span>
              Entrega digital imediata na área Meus Pedidos logo após a confirmação do pagamento. Sem prazo de validade.
            </span>
          </div>

          <div className={styles.termsList}>
            <div className={styles.termItem}>
              <span className={styles.termDot} />
              <span>Válido para qualquer produto do site (camisas, jaquetas e lançamentos).</span>
            </div>
            <div className={styles.termItem}>
              <span className={styles.termDot} />
              <span>Código exclusivo e resgate em 1 clique direto no perfil.</span>
            </div>
            <div className={styles.termItem}>
              <span className={styles.termDot} />
              <span>Saldo 100% cumulativo e sem custos adicionais de envio.</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default BrindeDetalhe;
