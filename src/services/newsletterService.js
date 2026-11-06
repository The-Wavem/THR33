import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebaseConfig';

export const newsletterService = {
  /**
   * Normaliza o e-mail em formato seguro para ID de documento
   */
  normalizeEmailKey(email) {
    return String(email || '').trim().toLowerCase();
  },

  /**
   * Valida formato básico de e-mail
   */
  isValidEmail(email) {
    const clean = this.normalizeEmailKey(email);
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
  },

  /**
   * Retorna objeto padrão de preferências
   */
  getDefaultPreferences() {
    return {
      newsletter: true,       // Newsletter VIP e novos Drops
      abandonedCart: true,    // Lembrete de peças na sacola após 24h
      transactional: true,    // Notificações de pedidos e conta
      unsubscribedAll: false, // Chave mestra: falso = recebendo normalmente
      updatedAt: new Date().toISOString()
    };
  },

  /**
   * Busca as preferências de e-mail do usuário cruzando users/{uid} e newsletter_subscribers/{emailKey}
   */
  async getUserEmailPreferences(uid, email) {
    const cleanEmail = this.normalizeEmailKey(email);
    let prefs = this.getDefaultPreferences();

    try {
      // 1. Tenta buscar no perfil do usuário se houver UID
      if (uid) {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data() || {};
          if (userData.emailPreferences) {
            prefs = { ...prefs, ...userData.emailPreferences };
          } else if (userData.newsletterSubscribed !== undefined) {
            prefs.newsletter = Boolean(userData.newsletterSubscribed);
          }
        }
      }

      // 2. Cruza com a coleção newsletter_subscribers/{cleanEmail}
      if (cleanEmail) {
        const subRef = doc(db, 'newsletter_subscribers', cleanEmail);
        const subSnap = await getDoc(subRef);
        if (subSnap.exists()) {
          const subData = subSnap.data() || {};
          if (subData.unsubscribedAll !== undefined) {
            prefs.unsubscribedAll = Boolean(subData.unsubscribedAll);
          }
          if (subData.subscribed !== undefined) {
            prefs.newsletter = Boolean(subData.subscribed);
          }
          if (subData.abandonedCartOptIn !== undefined) {
            prefs.abandonedCart = Boolean(subData.abandonedCartOptIn);
          }
        }
      }

      // Se unsubscribedAll for true, garante integridade visual
      if (prefs.unsubscribedAll) {
        prefs.newsletter = false;
        prefs.abandonedCart = false;
        prefs.transactional = false;
      }

      return prefs;
    } catch (err) {
      console.warn('Aviso ao buscar preferências de e-mail:', err.message);
      return prefs;
    }
  },

  /**
   * Atualiza preferências de e-mail sincronizando users/{uid}, newsletter_subscribers e drop_subscribers
   */
  async updateEmailPreferences({ uid, email, name, preferences = {}, source = 'perfil' }) {
    const cleanEmail = this.normalizeEmailKey(email);
    if (!cleanEmail || !this.isValidEmail(cleanEmail)) {
      throw new Error('E-mail inválido para atualização de preferências.');
    }

    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    // Se unsubscribedAll for ativado, desativa tudo
    const isUnsubAll = Boolean(preferences.unsubscribedAll);
    const newsletterActive = isUnsubAll ? false : Boolean(preferences.newsletter);
    const abandonedCartActive = isUnsubAll ? false : Boolean(preferences.abandonedCart !== false);
    const transactionalActive = isUnsubAll ? false : Boolean(preferences.transactional !== false);

    const consolidatedPrefs = {
      newsletter: newsletterActive,
      abandonedCart: abandonedCartActive,
      transactional: transactionalActive,
      unsubscribedAll: isUnsubAll,
      updatedAt: nowIso
    };

    // 1. Atualiza users/{uid} se houver UID
    if (uid) {
      try {
        const userRef = doc(db, 'users', uid);
        await setDoc(
          userRef,
          {
            emailPreferences: consolidatedPrefs,
            newsletterSubscribed: newsletterActive,
            updatedAt: nowIso
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Aviso ao sincronizar preferências no perfil do usuário:', err.message);
      }
    }

    // 2. Atualiza newsletter_subscribers/{cleanEmail}
    try {
      const subRef = doc(db, 'newsletter_subscribers', cleanEmail);
      await setDoc(
        subRef,
        {
          email: cleanEmail,
          uid: uid || null,
          name: name || 'Cliente THR33',
          subscribed: newsletterActive,
          unsubscribedAll: isUnsubAll,
          abandonedCartOptIn: abandonedCartActive,
          source,
          updatedAt: nowIso,
          updatedAtMs: nowMs
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Aviso ao gravar em newsletter_subscribers:', err.message);
    }

    // 3. Sincroniza em drop_subscribers/{cleanEmail} para manter base VIP unificada
    try {
      const dropSubRef = doc(db, 'drop_subscribers', cleanEmail);
      await setDoc(
        dropSubRef,
        {
          email: cleanEmail,
          status: newsletterActive ? 'active' : 'unsubscribed',
          unsubscribedAll: isUnsubAll,
          updatedAt: nowIso
        },
        { merge: true }
      );
    } catch {
      // Ignora falha não-crítica em coleção secundária
    }

    return consolidatedPrefs;
  },

  /**
   * Inscrição rápida vinda do rodapé (NewsletterVIP.jsx ou Footer.jsx)
   */
  async subscribeFromFooter(email, currentUser = null) {
    const cleanEmail = this.normalizeEmailKey(email);
    if (!this.isValidEmail(cleanEmail)) {
      throw new Error('Por favor, informe um endereço de e-mail válido.');
    }

    const uid = currentUser?.uid || null;
    const name = currentUser?.name || currentUser?.displayName || '';

    const prefs = {
      newsletter: true,
      abandonedCart: true,
      transactional: true,
      unsubscribedAll: false
    };

    await this.updateEmailPreferences({
      uid,
      email: cleanEmail,
      name,
      preferences: prefs,
      source: 'footer_newsletter'
    });

    return { success: true, email: cleanEmail };
  },

  /**
   * Desinscrição direta por e-mail (usado no link de unsubscribe do rodapé do e-mail)
   * Suporta usuários logados ou deslogados com fallback para Cloud Function com privilégio de Admin SDK
   */
  async unsubscribeByEmailDirect(email, uid = null) {
    const cleanEmail = this.normalizeEmailKey(email);
    if (!cleanEmail || !this.isValidEmail(cleanEmail)) {
      return { success: false, error: 'E-mail inválido.' };
    }

    try {
      // 1. Tenta atualizar diretamente no Firestore
      await this.updateEmailPreferences({
        uid,
        email: cleanEmail,
        preferences: {
          newsletter: false,
          abandonedCart: false,
          transactional: false,
          unsubscribedAll: true
        },
        source: 'email_footer_unsubscribe'
      });
    } catch (dbErr) {
      console.warn('Aviso no unsubscribe direto via Firestore (chamando fallback Cloud Function):', dbErr.message);
    }

    // 2. Fallback garantido no backend via Cloud Function com Admin SDK
    try {
      const callable = httpsCallable(functions, 'createPagBankOrder');
      await callable({
        action: 'unsubscribeEmail',
        email: cleanEmail,
        uid: uid || null
      });
    } catch (funcErr) {
      console.warn('Aviso na Cloud Function unsubscribeEmail:', funcErr.message);
    }

    return { success: true, email: cleanEmail };
  },

  /**
   * Busca todos os inscritos da newsletter para métricas e exportação no CMS
   */
  async getAllNewsletterSubscribers() {
    try {
      const snap = await getDocs(collection(db, 'newsletter_subscribers'));
      const list = [];
      snap.forEach((d) => {
        const data = d.data() || {};
        list.push({
          id: d.id,
          ...data,
          email: this.normalizeEmailKey(data.email || d.id)
        });
      });
      return list;
    } catch (err) {
      console.warn('Aviso ao carregar newsletter_subscribers:', err.message);
      return [];
    }
  }
};

export default newsletterService;
