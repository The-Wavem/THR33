import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import styles from './CmsCupons.module.css';

const DEFAULT_COUPONS = [
  {
    id: "coupon_edu10",
    code: "EDU10",
    discountPercent: 10,
    partnerName: "Eduardo (The Wavem)",
    partnerPix: "eduardo@thewavem.com",
    usageCount: 24,
    itemsSold: 32,
    grossRevenue: 6076.80,
    discountGiven: 607.68,
    commissionRate: 15, // Tier 3 (> 20 peças)
    commissionEarned: 820.36,
    active: true
  },
  {
    id: "coupon_skatecwb",
    code: "SKATECWB",
    discountPercent: 10,
    partnerName: "Skatistas Curitiba",
    partnerPix: "pix@skatecuritiba.com.br",
    usageCount: 12,
    itemsSold: 14,
    grossRevenue: 2658.60,
    discountGiven: 265.86,
    commissionRate: 10, // Tier 2 (10-19 peças)
    commissionEarned: 239.27,
    active: true
  },
  {
    id: "coupon_leakvip",
    code: "LEAKVIP",
    discountPercent: 15,
    partnerName: "Promocional Geral",
    partnerPix: "-",
    usageCount: 8,
    itemsSold: 8,
    grossRevenue: 1519.20,
    discountGiven: 227.88,
    commissionRate: 0,
    commissionEarned: 0,
    active: true
  }
];

export function CmsCupons() {
  const [coupons, setCoupons] = useState(DEFAULT_COUPONS);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    discountPercent: 10,
    partnerName: '',
    partnerPix: '',
    isAffiliate: true,
    active: true
  });

  // 1. Busca cupons do Firestore
  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'coupons'));
      if (!snap.empty) {
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        setCoupons(list);
      }
    } catch (err) {
      console.warn("Aviso ao carregar cupons do Firestore:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  // Criação de Cupom
  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!formData.code.trim()) return;

    setSaving(true);
    const couponId = `coupon_${formData.code.trim().toLowerCase()}`;

    const newCoupon = {
      code: formData.code.trim().toUpperCase(),
      discountPercent: Number(formData.discountPercent) || 10,
      partnerName: formData.partnerName.trim() || 'THR33 Oficial',
      partnerPix: formData.partnerPix.trim() || 'Não informado',
      usageCount: 0,
      itemsSold: 0,
      grossRevenue: 0,
      discountGiven: 0,
      commissionRate: formData.isAffiliate ? 8 : 0, // Inicia no Tier 1 (8%)
      commissionEarned: 0,
      active: formData.active,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'coupons', couponId), newCoupon, { merge: true });
      await fetchCoupons();
      setIsModalOpen(false);
      setFormData({ code: '', discountPercent: 10, partnerName: '', partnerPix: '', isAffiliate: true, active: true });
      alert(`Cupom ${newCoupon.code} ativado com sucesso!`);
    } catch (err) {
      alert("Erro ao gravar cupom no Firestore.");
    } finally {
      setSaving(false);
    }
  };

  // Alternar Status do Cupom (Ativo / Pausado)
  const handleToggleStatus = async (coupon) => {
    const updatedStatus = !coupon.active;
    try {
      await setDoc(doc(db, 'coupons', coupon.id), { active: updatedStatus }, { merge: true });
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, active: updatedStatus } : c));
    } catch (err) {
      alert("Erro ao atualizar status.");
    }
  };

  // Excluir Cupom
  const handleDeleteCoupon = async (couponId) => {
    if (!window.confirm("Deseja realmente excluir este cupom de desconto?")) return;
    try {
      await deleteDoc(doc(db, 'coupons', couponId));
      setCoupons(prev => prev.filter(c => c.id !== couponId));
    } catch (err) {
      alert("Erro ao excluir.");
    }
  };

  // Métricas Consolidadas de ROI
  const metrics = useMemo(() => {
    let gross = 0;
    let discounts = 0;
    let commissions = 0;
    let totalUses = 0;

    coupons.forEach(c => {
      gross += (Number(c.grossRevenue) || 0);
      discounts += (Number(c.discountGiven) || 0);
      commissions += (Number(c.commissionEarned) || 0);
      totalUses += (Number(c.usageCount) || 0);
    });

    const netProfit = gross - discounts - commissions;

    return { gross, discounts, commissions, totalUses, netProfit };
  }, [coupons]);

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <header className={styles.header}>
        <div>
          <span className={styles.breadcrumb}>CMS / PARCERIAS, INFLUÊNCIA & AFILIADOS</span>
          <h1 className={styles.title}>CUPONS & GESTÃO DE COMISSÕES</h1>
        </div>
        <button onClick={() => setIsModalOpen(true)} className={styles.createBtn}>
          + CRIAR NOVO CUPOM
        </button>
      </header>

      {/* 1. CARDS DE KPIS FINANCEIROS */}
      <section className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>FATURAMENTO VIA CUPONS</span>
          <strong className={styles.kpiValue}>R$ {metrics.gross.toFixed(2)}</strong>
          <small className={styles.kpiSub}>{metrics.totalUses} pedidos convertidos</small>
        </div>

        <div className={`${styles.kpiCard} ${styles.profitCard}`}>
          <span className={styles.kpiLabel}>LUCRO LÍQUIDO THR33</span>
          <strong className={styles.kpiValue}>R$ {metrics.netProfit.toFixed(2)}</strong>
          <small className={styles.kpiSub}>Livre de descontos e comissões</small>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>COMISSÕES ACUMULADAS</span>
          <strong className={styles.kpiValue}>R$ {metrics.commissions.toFixed(2)}</strong>
          <small className={styles.kpiSub}>A repassar para parceiros</small>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>DESCONTOS CONCEDIDOS</span>
          <strong className={styles.kpiValue}>R$ {metrics.discounts.toFixed(2)}</strong>
          <small className={styles.kpiSub}>Economia para os clientes</small>
        </div>
      </section>

      {/* 2. REGRAS DA ESCADA DE COMISSÃO */}
      <section className={styles.tierSection}>
        <div className={styles.tierHeader}>
          <h3>📈 TABELA DE COMISSÃO PROGRESSIVA (POR PEÇAS VENDIDAS)</h3>
          <p>Incentivo automático para o parceiro vender mais: quanto maior o volume de peças, maior a porcentagem recebida.</p>
        </div>
        <div className={styles.tierGrid}>
          <div className={styles.tierCard}>
            <span className={styles.tierBadge}>NÍVEL 1</span>
            <strong>1 a 9 peças</strong>
            <span className={styles.tierPercent}>8% de comissão</span>
          </div>
          <div className={styles.tierCard}>
            <span className={styles.tierBadge}>NÍVEL 2</span>
            <strong>10 a 19 peças</strong>
            <span className={styles.tierPercent}>10% de comissão</span>
          </div>
          <div className={`${styles.tierCard} ${styles.topTierCard}`}>
            <span className={styles.tierBadge}>NÍVEL 3 (TOP VIP)</span>
            <strong>20+ peças</strong>
            <span className={styles.tierPercent}>15% de comissão</span>
          </div>
        </div>
      </section>

      {/* 3. TABELA DE CUPONS */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <h2>CUPONS CADASTRADOS & DESEMPENHO</h2>
          <span>{coupons.length} cupons ativos</span>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>CÓDIGO</th>
              <th>PARCEIRO / COLABORADOR</th>
              <th>DESCONTO CLIENTE</th>
              <th>USOS & PEÇAS</th>
              <th>RECEITA GERADA</th>
              <th>COMISSÃO (% E R$)</th>
              <th>LUCRO MARCA</th>
              <th>STATUS</th>
              <th>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" className={styles.centerText}>Carregando cupons no Firestore...</td></tr>
            ) : coupons.length === 0 ? (
              <tr><td colSpan="9" className={styles.centerText}>Nenhum cupom cadastrado.</td></tr>
            ) : (
              coupons.map((c) => {
                const partnerNetCommission = Number(c.commissionEarned || 0);
                const brandProfit = (Number(c.grossRevenue || 0)) - (Number(c.discountGiven || 0)) - partnerNetCommission;

                return (
                  <tr key={c.id}>
                    <td>
                      <span className={styles.couponCode}>{c.code}</span>
                    </td>
                    <td>
                      <strong>{c.partnerName}</strong>
                      <small className={styles.pixText}>Pix: {c.partnerPix}</small>
                    </td>
                    <td>
                      <span className={styles.discountBadge}>-{c.discountPercent}% OFF</span>
                    </td>
                    <td>
                      <strong>{c.usageCount || 0} pedidos</strong>
                      <small className={styles.itemsSoldText}>{c.itemsSold || 0} peças vendidas</small>
                    </td>
                    <td>
                      <strong>R$ {Number(c.grossRevenue || 0).toFixed(2)}</strong>
                    </td>
                    <td>
                      <div className={styles.commissionCol}>
                        <span className={styles.commissionPercent}>{c.commissionRate || 0}%</span>
                        <strong>R$ {partnerNetCommission.toFixed(2)}</strong>
                      </div>
                    </td>
                    <td>
                      <strong className={styles.profitText}>R$ {brandProfit.toFixed(2)}</strong>
                    </td>
                    <td>
                      <button 
                        onClick={() => handleToggleStatus(c)} 
                        className={`${styles.statusToggleBtn} ${c.active ? styles.activeStatus : styles.inactiveStatus}`}
                      >
                        {c.active ? '● Ativo' : '○ Pausado'}
                      </button>
                    </td>
                    <td>
                      <button onClick={() => handleDeleteCoupon(c.id)} className={styles.deleteBtn}>
                        Excluir
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE CRIAÇÃO */}
      {isModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTop}>
              <h2>CRIAR CUPOM DE PARCEIRO / COLABORADOR</h2>
              <button onClick={() => setIsModalOpen(false)} className={styles.closeBtn}>&times;</button>
            </div>

            <form onSubmit={handleCreateCoupon} className={styles.form}>
              <div className={styles.inputGroup}>
                <label>CÓDIGO DO CUPOM (SEM ESPAÇOS) *</label>
                <input 
                  type="text" 
                  placeholder="Ex: EDU10, SKATE15, VIP33"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label>DESCONTO DO CLIENTE (% OFF) *</label>
                <input 
                  type="number" 
                  min="1" 
                  max="50"
                  placeholder="10"
                  value={formData.discountPercent}
                  onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label>NOME DO PARCEIRO / COLABORADOR *</label>
                <input 
                  type="text" 
                  placeholder="Ex: Eduardo, Lucas Skater, Ateliê CWB"
                  value={formData.partnerName}
                  onChange={(e) => setFormData({ ...formData, partnerName: e.target.value })}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label>CHAVE PIX PARA REPASSE DE COMISSÃO</label>
                <input 
                  type="text" 
                  placeholder="E-mail, CPF ou Chave Aleatória"
                  value={formData.partnerPix}
                  onChange={(e) => setFormData({ ...formData, partnerPix: e.target.value })}
                />
              </div>

              <label className={styles.checkboxLabel}>
                <input 
                  type="checkbox" 
                  checked={formData.isAffiliate}
                  onChange={(e) => setFormData({ ...formData, isAffiliate: e.target.checked })}
                />
                Ativar comissão progressiva em escada (8% a 15%)
              </label>

              <button type="submit" disabled={saving} className={styles.submitBtn}>
                {saving ? 'ATIVANDO CUPOM...' : 'CRIAR CUPOM NO FIRESTORE'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CmsCupons;
