import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  increment 
} from 'firebase/firestore';
import { db } from './firebaseConfig';

const CAMPAIGNS_COLLECTION = 'campaigns';

export const campaignService = {
  // Busca todas as campanhas
  async getAllCampaigns() {
    try {
      const snap = await getDocs(collection(db, CAMPAIGNS_COLLECTION));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error("Erro ao buscar campanhas:", err);
      return [];
    }
  },

  // Salva / Atualiza campanha
  async saveCampaign(campaignData) {
    try {
      const id = campaignData.id || `camp_${Date.now()}`;
      const docRef = doc(db, CAMPAIGNS_COLLECTION, id);
      
      const payload = {
        id,
        name: campaignData.name,
        utm_source: campaignData.utm_source || 'instagram',
        utm_medium: campaignData.utm_medium || 'stories',
        utm_campaign: campaignData.utm_campaign || 'promo',
        targetPath: campaignData.targetPath || '/catalogo',
        fullUrl: campaignData.fullUrl || '',
        active: campaignData.active !== false,
        clicks: Number(campaignData.clicks) || 0,
        cartAdds: Number(campaignData.cartAdds) || 0,
        purchases: Number(campaignData.purchases) || 0,
        revenue: Number(campaignData.revenue) || 0,
        updatedAt: new Date().toISOString()
      };

      if (!campaignData.id) {
        payload.createdAt = new Date().toISOString();
      }

      await setDoc(docRef, payload, { merge: true });
      return { success: true, id };
    } catch (err) {
      console.error("Erro ao salvar campanha:", err);
      throw err;
    }
  },

  // Exclui campanha
  async deleteCampaign(id) {
    try {
      await deleteDoc(doc(db, CAMPAIGNS_COLLECTION, id));
      return true;
    } catch (err) {
      console.error("Erro ao deletar campanha:", err);
      throw err;
    }
  },

  // Alterna status Ativo/Pausado
  async toggleCampaignStatus(id, currentStatus) {
    try {
      const docRef = doc(db, CAMPAIGNS_COLLECTION, id);
      await updateDoc(docRef, {
        active: !currentStatus,
        updatedAt: new Date().toISOString()
      });
      return !currentStatus;
    } catch (err) {
      console.error("Erro ao alternar status da campanha:", err);
      throw err;
    }
  },

  // Busca opções customizadas de UTM (origens e mídias cadastradas pelos administradores)
  async getCustomUtmOptions() {
    try {
      const configRef = doc(db, 'analytics', 'campaign_config');
      const snap = await getDoc(configRef);
      if (snap.exists()) {
        const data = snap.data();
        return {
          sources: data.sources || [],
          mediums: data.mediums || []
        };
      }
    } catch (err) {
      console.warn("Aviso ao buscar configurações de UTM:", err.message);
    }
    // Fallback do localStorage
    try {
      const savedSources = JSON.parse(localStorage.getItem('thr33_custom_utm_sources') || '[]');
      const savedMediums = JSON.parse(localStorage.getItem('thr33_custom_utm_mediums') || '[]');
      return { sources: savedSources, mediums: savedMediums };
    } catch (_) {}
    return { sources: [], mediums: [] };
  },

  // Adiciona nova opção customizada de UTM (origem ou mídia)
  async addCustomUtmOption(type, option) {
    if (!option?.value || !option?.label) return [];
    const listKey = type === 'source' ? 'sources' : 'mediums';
    const cleanVal = String(option.value).toLowerCase().trim().replace(/[\s_-]+/g, '_');

    try {
      const configRef = doc(db, 'analytics', 'campaign_config');
      const current = await this.getCustomUtmOptions();
      const existingList = current[listKey] || [];

      // Evita duplicatas
      const filtered = existingList.filter(item => item.value !== cleanVal);
      const updatedList = [...filtered, { label: option.label.trim(), value: cleanVal }];

      // Salva no Firestore
      await setDoc(configRef, {
        [listKey]: updatedList,
        lastUpdated: new Date().toISOString()
      }, { merge: true });

      // Salva no localStorage
      localStorage.setItem(`thr33_custom_utm_${listKey}`, JSON.stringify(updatedList));
      return updatedList;
    } catch (err) {
      console.error(`Erro ao adicionar ${type} customizado:`, err);
      const savedList = JSON.parse(localStorage.getItem(`thr33_custom_utm_${listKey}`) || '[]');
      const updatedList = [...savedList.filter(i => i.value !== cleanVal), { label: option.label.trim(), value: cleanVal }];
      localStorage.setItem(`thr33_custom_utm_${listKey}`, JSON.stringify(updatedList));
      return updatedList;
    }
  },

  // Remove opção customizada de UTM
  async deleteCustomUtmOption(type, value) {
    const listKey = type === 'source' ? 'sources' : 'mediums';
    try {
      const configRef = doc(db, 'analytics', 'campaign_config');
      const current = await this.getCustomUtmOptions();
      const updatedList = (current[listKey] || []).filter(item => item.value !== value);

      await setDoc(configRef, {
        [listKey]: updatedList,
        lastUpdated: new Date().toISOString()
      }, { merge: true });

      localStorage.setItem(`thr33_custom_utm_${listKey}`, JSON.stringify(updatedList));
      return updatedList;
    } catch (err) {
      console.error(`Erro ao deletar ${type} customizado:`, err);
      const savedList = JSON.parse(localStorage.getItem(`thr33_custom_utm_${listKey}`) || '[]');
      const updatedList = savedList.filter(i => i.value !== value);
      localStorage.setItem(`thr33_custom_utm_${listKey}`, JSON.stringify(updatedList));
      return updatedList;
    }
  }
};
