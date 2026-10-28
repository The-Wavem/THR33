import { db } from './firebaseConfig';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, increment } from 'firebase/firestore';

const INVALID_ORDER_STATUSES = [
  'cancelled',
  'canceled',
  'cancelado',
  'declined',
  'recusado',
  'pagamento_recusado',
  'falhou',
  'failed',
  'expired',
  'expirado'
];

function isOrderValidForHistory(order) {
  if (!order) return false;
  const rawStatus = String(order.status || order.statusCode || '')
    .trim()
    .toLowerCase();
  if (!rawStatus) return true;
  return !INVALID_ORDER_STATUSES.some((inv) => rawStatus === inv || rawStatus.includes(inv));
}

async function fetchUserValidOrders(userUid, userEmail) {
  const ordersMap = new Map();

  if (userUid && userUid !== 'guest') {
    try {
      const qUid = query(collection(db, 'orders'), where('userId', '==', userUid));
      const snapUid = await getDocs(qUid);
      snapUid.forEach((d) => {
        const data = d.data();
        if (isOrderValidForHistory(data)) {
          ordersMap.set(d.id, { id: d.id, ...data });
        }
      });
    } catch {
      // Ignora silenciosamente se restrito
    }
  }

  if (userEmail) {
    try {
      const qEmail = query(collection(db, 'orders'), where('clientEmail', '==', userEmail));
      const snapEmail = await getDocs(qEmail);
      snapEmail.forEach((d) => {
        const data = d.data();
        if (isOrderValidForHistory(data)) {
          ordersMap.set(d.id, { id: d.id, ...data });
        }
      });
    } catch {
      // Ignora silenciosamente se restrito
    }
  }

  return Array.from(ordersMap.values());
}

function buildCouponLabel(discountMode, discountPercent, fixedDiscountValue, freeShipping) {
  if (discountMode === 'free_shipping_only') {
    return 'FRETE GRÁTIS';
  }
  if (discountMode === 'fixed') {
    const valStr = `R$ ${Number(fixedDiscountValue || 0).toFixed(2).replace('.', ',')} OFF`;
    return freeShipping ? `${valStr} + FRETE GRÁTIS` : valStr;
  }
  const pct = Number(discountPercent || 0);
  if (pct <= 0 && freeShipping) {
    return 'FRETE GRÁTIS';
  }
  return freeShipping ? `${pct}% OFF + FRETE GRÁTIS` : `${pct}% OFF`;
}

function sanitizeCouponPayload(data = {}, isCreate = false) {
  const cleanCode = String(data.code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');

  const isBrand = data.type === 'brand';
  const discountMode = ['percentage', 'fixed', 'free_shipping_only'].includes(data.discountMode)
    ? data.discountMode
    : 'percentage';

  const discountPercent =
    discountMode === 'percentage'
      ? Math.min(99, Math.max(0, Number(data.discountPercent ?? 10)))
      : 0;

  const fixedDiscountValue =
    discountMode === 'fixed'
      ? Math.max(0, Number(data.fixedDiscountValue || 0))
      : 0;

  const freeShipping =
    discountMode === 'free_shipping_only'
      ? true
      : Boolean(data.freeShipping);

  const allowedEmails = Array.isArray(data.allowedEmails)
    ? Array.from(
        new Set(
          data.allowedEmails
            .map((e) => String(e || '').trim().toLowerCase())
            .filter((e) => e.includes('@'))
        )
      )
    : [];

  const maxUsesPerUser =
    data.maxUsesPerUser !== null &&
    data.maxUsesPerUser !== undefined &&
    data.maxUsesPerUser !== '' &&
    Number(data.maxUsesPerUser) > 0
      ? Number(data.maxUsesPerUser)
      : null;

  const maxTotalUses =
    data.maxTotalUses !== null &&
    data.maxTotalUses !== undefined &&
    data.maxTotalUses !== '' &&
    Number(data.maxTotalUses) > 0
      ? Number(data.maxTotalUses)
      : null;

  const minItemsCount = Math.max(0, Number(data.minItemsCount || 0));
  const minOrderValue = Math.max(0, Number(data.minOrderValue || 0));
  const validUntil = data.validUntil || data.expirationDate || null;
  const startDate = data.startDate || null;

  const payload = {
    code: cleanCode,
    type: isBrand ? 'brand' : 'affiliate',
    partnerName: isBrand
      ? data.partnerName?.trim() || 'THR33 Marca Oficial'
      : (data.partnerName || '').trim(),
    partnerPix: isBrand ? '' : (data.partnerPix || data.pixKey || '').trim(),
    discountMode,
    discountPercent,
    fixedDiscountValue,
    freeShipping,
    allowedEmails,
    onlyFirstPurchase: Boolean(data.onlyFirstPurchase),
    maxUsesPerUser,
    maxTotalUses,
    minOrderValue,
    minItemsCount,
    startDate,
    validUntil,
    expirationDate: validUntil,
    commissionRate: isBrand ? 0 : Number(data.commissionRate || 8),
    active: data.active !== undefined ? Boolean(data.active) : true,
    updatedAt: new Date().toISOString()
  };

  if (isCreate) {
    payload.usageCount = Number(data.usageCount || 0);
    payload.itemsSold = Number(data.itemsSold || 0);
    payload.grossRevenue = Number(data.grossRevenue || 0);
    payload.discountGiven = Number(data.discountGiven || 0);
    payload.commissionPending = Number(data.commissionPending || 0);
    payload.commissionPaid = Number(data.commissionPaid || 0);
    payload.payoutHistory = Array.isArray(data.payoutHistory) ? data.payoutHistory : [];
    payload.createdAt = data.createdAt || new Date().toISOString();
  }

  return payload;
}

export const couponService = {
  /**
   * Cria um novo cupom no Firestore mantendo todos os campos financeiros e de regras.
   */
  async createCoupon(couponData) {
    const payload = sanitizeCouponPayload(couponData, true);
    if (!payload.code) {
      throw new Error('Código do cupom é obrigatório.');
    }
    const docId = couponData.id || `coupon_${payload.code.toLowerCase()}`;
    await setDoc(doc(db, 'coupons', docId), payload, { merge: true });
    return { id: docId, ...payload };
  },

  /**
   * Atualiza um cupom existente no Firestore preservando métricas acumuladas e histórico Pix.
   */
  async updateCoupon(couponId, couponData) {
    if (!couponId) {
      throw new Error('ID do cupom é obrigatório para atualização.');
    }
    const payload = sanitizeCouponPayload(couponData, false);
    await setDoc(doc(db, 'coupons', couponId), payload, { merge: true });
    return { id: couponId, ...payload };
  },

  /**
   * Valida um cupom diretamente na coleção `coupons` do Firestore.
   * Suporta desconto percentual, valor fixo (R$), apenas frete grátis,
   * vínculo exclusivo de e-mail, regra de 1ª compra, limite por cliente e limite global.
   */
  async validateCoupon(code, cartSubtotal = 0, userContext = null, cartItemsCount = 1) {
    if (!code || !code.trim()) {
      return { valid: false, message: 'Digite um código de cupom.' };
    }

    const cleanCode = code.trim().toUpperCase();

    try {
      let couponData = null;

      // 1. Tenta localizar pelo ID padronizado `coupon_${code}` ou ID direto
      const directIdRef = doc(db, 'coupons', `coupon_${cleanCode.toLowerCase()}`);
      const directSnap = await getDoc(directIdRef);

      if (directSnap.exists()) {
        couponData = { id: directSnap.id, ...directSnap.data() };
      } else {
        const rawIdRef = doc(db, 'coupons', cleanCode);
        const rawSnap = await getDoc(rawIdRef);

        if (rawSnap.exists()) {
          couponData = { id: rawSnap.id, ...rawSnap.data() };
        } else {
          // 2. Busca por query no campo `code`
          const q = query(collection(db, 'coupons'), where('code', '==', cleanCode));
          const querySnap = await getDocs(q);
          if (!querySnap.empty) {
            const firstDoc = querySnap.docs[0];
            couponData = { id: firstDoc.id, ...firstDoc.data() };
          }
        }
      }

      if (!couponData) {
        return { valid: false, message: 'Cupom inválido ou não encontrado.' };
      }

      if (couponData.active === false) {
        return { valid: false, message: 'Este cupom está pausado ou inativo no momento.' };
      }

      // 2. Janela de Tempo (startDate e validUntil / expirationDate)
      const now = new Date();

      if (couponData.startDate) {
        const start = new Date(couponData.startDate);
        if (!isNaN(start.getTime()) && start > now) {
          return { valid: false, message: 'Este cupom ainda não está ativo para uso.' };
        }
      }

      const rawExp = couponData.expirationDate || couponData.validUntil;
      if (rawExp) {
        const expString = String(rawExp).trim();
        const expDate = expString.length === 10
          ? new Date(`${expString}T23:59:59`)
          : new Date(expString);
        if (!isNaN(expDate.getTime()) && expDate < now) {
          return { valid: false, message: 'Este cupom já expirou.' };
        }
      }

      // 3. Valor Mínimo do Pedido e Quantidade Mínima de Peças
      const minVal = Number(couponData.minOrderValue || 0);
      if (minVal > 0 && cartSubtotal < minVal) {
        return {
          valid: false,
          message: `Pedido mínimo de R$ ${minVal.toFixed(2)} para usar o cupom ${cleanCode}.`
        };
      }

      const minItems = Number(couponData.minItemsCount || 0);
      if (minItems > 0 && Number(cartItemsCount || 0) < minItems) {
        return {
          valid: false,
          message: `Adicione pelo menos ${minItems} ${minItems === 1 ? 'peça' : 'peças'} na sacola para usar o cupom ${cleanCode}.`
        };
      }

      // 4. Vínculo de Conta (allowedEmails)
      const allowedEmails = Array.isArray(couponData.allowedEmails)
        ? couponData.allowedEmails.map((e) => String(e || '').trim().toLowerCase()).filter(Boolean)
        : [];

      const userEmail = String(userContext?.email || '').trim().toLowerCase();
      const userUid = String(userContext?.uid || '').trim();

      if (allowedEmails.length > 0) {
        if (!userEmail) {
          return {
            valid: false,
            message: 'Este cupom é exclusivo. Faça login na sua conta para utilizá-lo.'
          };
        }
        if (!allowedEmails.includes(userEmail)) {
          return {
            valid: false,
            message: 'Este cupom é exclusivo e não está vinculado à sua conta.'
          };
        }
      }

      // 5. Histórico de Pedidos no Firestore (onlyFirstPurchase, maxUsesPerUser, maxTotalUses)
      const onlyFirstPurchase = Boolean(couponData.onlyFirstPurchase);
      const maxUsesPerUser = Number(couponData.maxUsesPerUser || 0);
      const maxTotalUses = Number(couponData.maxTotalUses || 0);

      if (onlyFirstPurchase || maxUsesPerUser > 0) {
        if (!userUid && !userEmail) {
          return {
            valid: false,
            message: 'Este cupom possui regras por conta. Faça login para utilizá-lo.'
          };
        }
      }

      if (onlyFirstPurchase || maxUsesPerUser > 0 || maxTotalUses > 0) {
        // 5a. Limite Global do Cupom (maxTotalUses)
        if (maxTotalUses > 0) {
          let globalOrdersCount = 0;
          try {
            const allOrdersSnap = await getDocs(collection(db, 'orders'));
            allOrdersSnap.forEach((docSnap) => {
              const ord = docSnap.data();
              if (isOrderValidForHistory(ord)) {
                const ordCoupon = String(ord.couponCode || ord.coupon || '').trim().toUpperCase();
                if (ordCoupon === cleanCode) globalOrdersCount += 1;
              }
            });
          } catch {
            // Caso o cliente não seja admin para ler todos os pedidos globais, usa usageCount do documento do cupom
          }

          const effectiveTotalUses = Math.max(globalOrdersCount, Number(couponData.usageCount || 0));
          if (effectiveTotalUses >= maxTotalUses) {
            return {
              valid: false,
              message: 'Este cupom atingiu o limite máximo de resgates do drop.'
            };
          }
        }

        // 5b. Filtra pedidos válidos pertencentes ao usuário atual (por uid ou email)
        if (onlyFirstPurchase || maxUsesPerUser > 0) {
          const userValidOrders = await fetchUserValidOrders(userUid, userEmail);

          if (onlyFirstPurchase && userValidOrders.length >= 1) {
            return {
              valid: false,
              message: 'Cupom válido apenas na sua primeira compra na THR33.'
            };
          }

          if (maxUsesPerUser > 0) {
            const userCouponUses = userValidOrders.filter((ord) => {
              const ordCoupon = String(ord.couponCode || ord.coupon || '').trim().toUpperCase();
              return ordCoupon === cleanCode;
            }).length;

            if (userCouponUses >= maxUsesPerUser) {
              return {
                valid: false,
                message: `Você já atingiu o limite de ${maxUsesPerUser} uso(s) deste cupom na sua conta.`
              };
            }
          }
        }
      }

      const discountMode = ['percentage', 'fixed', 'free_shipping_only'].includes(couponData.discountMode)
        ? couponData.discountMode
        : couponData.type === 'free_shipping'
        ? 'free_shipping_only'
        : 'percentage';

      const discountPercent =
        discountMode === 'percentage'
          ? Number(couponData.discountPercent || 0)
          : 0;

      const fixedDiscountValue =
        discountMode === 'fixed'
          ? Number(couponData.fixedDiscountValue || 0)
          : 0;

      const isFreeShipping = Boolean(
        couponData.freeShipping === true ||
          couponData.type === 'free_shipping' ||
          discountMode === 'free_shipping_only'
      );

      const label = buildCouponLabel(
        discountMode,
        discountPercent,
        fixedDiscountValue,
        isFreeShipping
      );

      return {
        valid: true,
        isValid: true,
        discountMode,
        discountPercent,
        fixedDiscountValue,
        freeShipping: isFreeShipping,
        coupon: {
          id: couponData.id,
          code: couponData.code || cleanCode,
          discountMode,
          discountPercent,
          fixedDiscountValue,
          freeShipping: isFreeShipping,
          type: couponData.type || 'affiliate',
          partnerName: couponData.partnerName || 'Parceiro THR33',
          commissionRate: Number(couponData.commissionRate || 8),
          allowedEmails,
          onlyFirstPurchase,
          maxUsesPerUser: maxUsesPerUser > 0 ? maxUsesPerUser : null,
          maxTotalUses: maxTotalUses > 0 ? maxTotalUses : null,
          minOrderValue: minVal,
          minItemsCount: minItems,
          label
        },
        message: `Cupom ${cleanCode} (${label}) aplicado com sucesso!`
      };
    } catch (error) {
      console.error('Erro ao validar cupom no Firestore:', error);
      return { valid: false, message: 'Não foi possível validar o cupom no momento.' };
    }
  },

  /**
   * Busca todos os cupons VIP exclusivos vinculados ao e-mail do cliente logado,
   * retornando também o status de disponibilidade e usos restantes daquela conta.
   */
  async getUserExclusiveCoupons(userEmail, userUid = null) {
    const cleanEmail = String(userEmail || '').trim().toLowerCase();
    if (!cleanEmail) return [];

    try {
      const [couponsSnap, userValidOrders] = await Promise.all([
        getDocs(collection(db, 'coupons')),
        fetchUserValidOrders(userUid, cleanEmail)
      ]);

      const now = new Date();
      const hasPriorPurchase = userValidOrders.length >= 1;
      const matched = [];

      couponsSnap.forEach((docSnap) => {
        const data = docSnap.data() || {};
        if (data.active === false) return;

        const allowed = Array.isArray(data.allowedEmails)
          ? data.allowedEmails.map((e) => String(e || '').trim().toLowerCase()).filter(Boolean)
          : [];

        if (!allowed.includes(cleanEmail)) return;

        const code = String(data.code || docSnap.id.replace(/^coupon_/, '')).trim().toUpperCase();
        const discountMode = ['percentage', 'fixed', 'free_shipping_only'].includes(data.discountMode)
          ? data.discountMode
          : data.type === 'free_shipping'
          ? 'free_shipping_only'
          : 'percentage';

        const discountPercent =
          discountMode === 'percentage' ? Number(data.discountPercent || 0) : 0;
        const fixedDiscountValue =
          discountMode === 'fixed' ? Number(data.fixedDiscountValue || 0) : 0;
        const freeShipping = Boolean(
          data.freeShipping === true ||
            data.type === 'free_shipping' ||
            discountMode === 'free_shipping_only'
        );

        const label = buildCouponLabel(discountMode, discountPercent, fixedDiscountValue, freeShipping);

        // Checa validade temporal
        let isExpired = false;
        const rawExp = data.expirationDate || data.validUntil;
        if (rawExp) {
          const expStr = String(rawExp).trim();
          const expDate = expStr.length === 10 ? new Date(`${expStr}T23:59:59`) : new Date(expStr);
          if (!isNaN(expDate.getTime()) && expDate < now) {
            isExpired = true;
          }
        }

        let isNotStartedYet = false;
        if (data.startDate) {
          const start = new Date(data.startDate);
          if (!isNaN(start.getTime()) && start > now) {
            isNotStartedYet = true;
          }
        }

        const userUsesCount = userValidOrders.filter((ord) => {
          const ordCoupon = String(ord.couponCode || ord.coupon || '').trim().toUpperCase();
          return ordCoupon === code;
        }).length;

        const maxUsesPerUser = Number(data.maxUsesPerUser || 0);
        const maxTotalUses = Number(data.maxTotalUses || 0);
        const onlyFirstPurchase = Boolean(data.onlyFirstPurchase);

        const exhaustedByUserLimit = maxUsesPerUser > 0 && userUsesCount >= maxUsesPerUser;
        const exhaustedByGlobalLimit =
          maxTotalUses > 0 && Number(data.usageCount || 0) >= maxTotalUses;
        const blockedByFirstPurchase = onlyFirstPurchase && hasPriorPurchase;

        const canBeUsed =
          !isExpired &&
          !isNotStartedYet &&
          !exhaustedByUserLimit &&
          !exhaustedByGlobalLimit &&
          !blockedByFirstPurchase;

        let statusReason = 'DISPONÍVEL PARA USO';
        if (isExpired) statusReason = 'EXPIRADO';
        else if (isNotStartedYet) statusReason = 'EM BREVE';
        else if (exhaustedByUserLimit) statusReason = 'JÁ UTILIZADO NA CONTA';
        else if (exhaustedByGlobalLimit) statusReason = 'LIMITE GLOBAL ESGOTADO';
        else if (blockedByFirstPurchase) statusReason = 'EXCLUSIVO 1ª COMPRA';

        matched.push({
          id: docSnap.id,
          code,
          discountMode,
          discountPercent,
          fixedDiscountValue,
          freeShipping,
          label,
          partnerName: data.partnerName || 'THR33 VIP Exclusivo',
          onlyFirstPurchase,
          maxUsesPerUser: maxUsesPerUser > 0 ? maxUsesPerUser : null,
          maxTotalUses: maxTotalUses > 0 ? maxTotalUses : null,
          minOrderValue: Number(data.minOrderValue || 0),
          minItemsCount: Number(data.minItemsCount || 0),
          validUntil: rawExp || null,
          userUsesCount,
          remainingUses: maxUsesPerUser > 0 ? Math.max(0, maxUsesPerUser - userUsesCount) : null,
          canBeUsed,
          statusReason
        });
      });

      // Ordena: disponíveis primeiro
      return matched.sort((a, b) => Number(b.canBeUsed) - Number(a.canBeUsed));
    } catch (err) {
      console.warn('Aviso ao buscar cupons exclusivos do cliente:', err.message);
      return [];
    }
  },

  /**
   * Registra o uso do cupom em uma compra finalizada, atualizando métricas e comissão pendente.
   */
  async recordCouponUsage(couponId, orderSubtotal, discountAmount, itemsCount = 1) {
    if (!couponId) return;
    try {
      const couponRef = doc(db, 'coupons', couponId);
      const snap = await getDoc(couponRef);
      if (!snap.exists()) return;

      const data = snap.data();
      const isBrand = data.type === 'brand';
      const newItemsSold = (Number(data.itemsSold) || 0) + Number(itemsCount || 1);

      // Meritocracia automática de comissão: 1-9 peças (8%), 10-19 (10%), 20+ (15%)
      let rate = Number(data.commissionRate || 8);
      if (!isBrand) {
        if (newItemsSold >= 20) rate = 15;
        else if (newItemsSold >= 10) rate = 10;
        else rate = 8;
      }

      const netOrderSale = Math.max(0, Number(orderSubtotal) - Number(discountAmount));
      const commissionEarned = isBrand ? 0 : (netOrderSale * rate) / 100;

      await updateDoc(couponRef, {
        usageCount: increment(1),
        itemsSold: increment(Number(itemsCount || 1)),
        grossRevenue: increment(Number(orderSubtotal) || 0),
        discountGiven: increment(Number(discountAmount) || 0),
        commissionRate: isBrand ? 0 : rate,
        commissionPending: isBrand ? 0 : increment(Number(commissionEarned.toFixed(2)))
      });
    } catch (err) {
      console.warn('Aviso ao atualizar métricas do cupom:', err.message);
    }
  }
};
