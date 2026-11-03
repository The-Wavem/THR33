import { doc, setDoc, getDocs, deleteDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { currentDropConfig } from '../data/dropConfig';
import { emailService } from './emailService';

/**
 * Normaliza e gera o identificador determinístico (email_hash) do inscrito na Lista VIP
 */
export function buildSubscriberDocId(email) {
  return String(email || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]/g, '')
    .replace(/[.#$/[\]]/g, '_');
}

export const dropSubscriberService = {
  /**
   * Inscreve ou atualiza o cliente na Lista VIP de Drops (drop_subscribers/{email_hash})
   * e dispara o e-mail imediato de confirmação de pré-registro (drop_waitlist_welcome)
   */
  async subscribeToDropWaitlist({
    email,
    name = '',
    dropId = currentDropConfig?.id || 'drop-thr33',
    dropName = currentDropConfig?.title || 'PRÓXIMO DROP THR33',
    source = 'home_newsletter',
    sendWelcome = true
  }) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Informe um endereço de e-mail válido.');
    }

    const subscriberId = buildSubscriberDocId(cleanEmail);
    const subRef = doc(db, 'drop_subscribers', subscriberId);

    const payload = {
      email: cleanEmail,
      name: String(name || '').trim(),
      dropId: String(dropId || 'drop-thr33').trim(),
      dropName: String(dropName || 'PRÓXIMO DROP THR33').trim(),
      source: String(source || 'home_newsletter').trim(),
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      subscribedAtISO: new Date().toISOString()
    };

    try {
      await setDoc(subRef, payload, { merge: true });
    } catch (firestoreErr) {
      console.warn('Aviso ao gravar inscrito diretamente no Firestore (usando fallback Cloud Function):', firestoreErr.message);
    }

    if (sendWelcome) {
      // Dispara e-mail de confirmação imediato (e garante persistência via Admin SDK no backend)
      emailService
        .triggerDropWaitlistWelcome({
          email: cleanEmail,
          name: payload.name,
          dropId: payload.dropId,
          dropName: payload.dropName,
          source: payload.source,
          subscriberId
        })
        .catch(() => {});
    }

    return {
      success: true,
      subscriberId,
      email: cleanEmail,
      dropId: payload.dropId
    };
  },

  /**
   * Alterna o status de um inscrito entre 'active' e 'unsubscribed'
   */
  async updateSubscriberStatus(subscriberId, newStatus) {
    if (!subscriberId) return;
    const subRef = doc(db, 'drop_subscribers', subscriberId);
    await updateDoc(subRef, {
      status: newStatus === 'unsubscribed' ? 'unsubscribed' : 'active',
      updatedAt: serverTimestamp()
    });
  },

  /**
   * Remove um inscrito da Lista VIP (apenas Admin)
   */
  async deleteSubscriber(subscriberId) {
    if (!subscriberId) return;
    const subRef = doc(db, 'drop_subscribers', subscriberId);
    await deleteDoc(subRef);
  },

  /**
   * Lista todos os inscritos da coleção drop_subscribers para o painel Admin (CmsCampanhas)
   */
  async getAllSubscribers() {
    try {
      const snap = await getDocs(collection(db, 'drop_subscribers'));
      const list = [];
      snap.forEach((docSnap) => {
        const raw = docSnap.data() || {};
        const cleanDropId =
          raw.dropId && String(raw.dropId).toLowerCase().includes('cactus')
            ? 'drop-thr33'
            : (raw.dropId || 'drop-thr33');
        const cleanDropName =
          raw.dropName && String(raw.dropName).toLowerCase().includes('cactus')
            ? 'PRÓXIMO DROP THR33'
            : (raw.dropName || 'PRÓXIMO DROP THR33');
        list.push({
          id: docSnap.id,
          ...raw,
          dropId: cleanDropId,
          dropName: cleanDropName,
          status: raw.status || 'active'
        });
      });

      return list.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.subscribedAtISO || 0).getTime();
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.subscribedAtISO || 0).getTime();
        return timeB - timeA;
      });
    } catch (err) {
      console.warn('Aviso ao carregar inscritos da Lista VIP:', err.message);
      return [];
    }
  }
};

export default dropSubscriberService;
