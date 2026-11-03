import { doc, setDoc, getDocs, collection, serverTimestamp } from 'firebase/firestore';
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
    dropId = currentDropConfig?.id || 'drop-cactus-01',
    dropName = currentDropConfig?.title || 'UTOPIA PROCESS // CACTUS STREETS',
    source = 'home_newsletter'
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
      dropId: String(dropId || 'drop-cactus-01').trim(),
      dropName: String(dropName || 'UTOPIA PROCESS // CACTUS STREETS').trim(),
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

    return {
      success: true,
      subscriberId,
      email: cleanEmail,
      dropId: payload.dropId
    };
  },

  /**
   * Lista todos os inscritos da coleção drop_subscribers para o painel Admin (CmsCampanhas)
   */
  async getAllSubscribers() {
    try {
      const snap = await getDocs(collection(db, 'drop_subscribers'));
      const list = [];
      snap.forEach((docSnap) => {
        list.push({
          id: docSnap.id,
          ...docSnap.data()
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
