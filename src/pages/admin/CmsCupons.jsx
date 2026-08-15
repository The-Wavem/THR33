import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { 
  RefreshCw, 
  Plus, 
  Check, 
  X, 
  Edit, 
  Trash2, 
  ShieldCheck, 
  Search, 
  Copy, 
  FileText, 
  DollarSign, 
  Download, 
  Upload, 
  ExternalLink, 
  Paperclip, 
  CheckCircle2, 
  Loader2, 
  ShoppingBag,
  Image as ImageIcon,
  Link as LinkIcon
} from 'lucide-react';
import { db } from '../../services/firebaseConfig';
import styles from './CmsCupons.module.css';

export function CmsCupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modais de Criação e Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Drawer de Extrato & Repasse
  const [statementCoupon, setStatementCoupon] = useState(null);
  const [statementOrders, setStatementOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNote, setPayoutNote] = useState('');
  const [processingPayout, setProcessingPayout] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  // Comprovante: Seleção de Formato (PDF | Imagem | Link Web)
  const [proofType, setProofType] = useState('pdf'); // 'pdf' | 'image' | 'link'
  const [proofFileData, setProofFileData] = useState({ name: '', dataUrl: '', sizeKb: 0 });
  const [proofLinkUrl, setProofLinkUrl] = useState('');

  // Modal para pré-visualização de imagem
  const [previewImage, setPreviewImage] = useState(null);

  // Form State Criação / Edição
  const [formData, setFormData] = useState({
    code: '',
    type: 'affiliate',
    discountPercent: 10,
    partnerName: '',
    partnerPix: '',
    validUntil: '',
    minOrderValue: '',
    active: true
  });

  // 1. Busca cupons exclusivamente do Firestore
  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'coupons'));
      if (!snap.empty) {
        const list = [];
        snap.forEach(d => {
          const data = d.data() || {};
          list.push({ 
            id: d.id, 
            code: data.code || d.id.replace(/^coupon_/, '').toUpperCase(),
            type: data.type || 'affiliate',
            partnerName: data.partnerName || (data.type === 'brand' ? 'THR33 Marca Oficial' : 'Parceiro'),
            discountPercent: data.discountPercent || 10,
            payoutHistory: Array.isArray(data.payoutHistory) ? data.payoutHistory : [],
            ...data 
          });
        });
        setCoupons(list);
      } else {
        setCoupons([]);
      }
    } catch (err) {
      console.warn("Aviso ao carregar cupons do Firestore:", err.message);
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  // 2. Busca pedidos vinculados ao cupom diretamente do Firestore
  const handleOpenStatement = async (coupon) => {
    setStatementCoupon(coupon);
    setPayoutAmount((Number(coupon.commissionPending) || 0).toFixed(2));
    setPayoutNote('');
    setProofType('pdf');
    setProofFileData({ name: '', dataUrl: '', sizeKb: 0 });
    setProofLinkUrl('');
    setCopiedPix(false);
    setLoadingOrders(true);

    try {
      const ordersSnap = await getDocs(collection(db, 'orders'));
      if (!ordersSnap.empty) {
        const matchingOrders = [];
        const couponCodeUpper = String(coupon.code || '').toUpperCase();

        ordersSnap.forEach(docSnap => {
          const order = docSnap.data() || {};
          const orderCouponCode = String(order.couponCode || '').toUpperCase();
          const orderCouponId = order.couponId;

          if (orderCouponCode === couponCodeUpper || orderCouponId === coupon.id) {
            const items = Array.isArray(order.items) ? order.items : [];
            const itemsCount = items.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);
            const total = Number(order.total || order.subtotal || 0);
            const rate = Number(coupon.commissionRate || 8);
            const calculatedCommission = coupon.type === 'affiliate' ? (total * rate) / 100 : 0;

            matchingOrders.push({
              id: docSnap.id,
              date: order.createdAt ? new Date(order.createdAt).toLocaleDateString('pt-BR') : 'Recente',
              client: order.clientName || 'Cliente',
              itemsCount,
              total,
              commission: calculatedCommission
            });
          }
        });
        setStatementOrders(matchingOrders);
      } else {
        setStatementOrders([]);
      }
    } catch (err) {
      console.warn("Aviso ao carregar pedidos do cupom:", err.message);
      setStatementOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  // HANDLER DE ARQUIVO (PDF ou Imagem)
  const handleProofFileUpload = (e, expectedType) => {
    const file = e.target.files[0];
    if (!file) return;

    if (expectedType === 'pdf' && file.type !== 'application/pdf') {
      alert("Por favor, anexe um arquivo no formato PDF.");
      return;
    }

    if (expectedType === 'image' && !file.type.startsWith('image/')) {
      alert("Por favor, anexe uma imagem válida (PNG, JPG, JPEG ou WEBP).");
      return;
    }

    const sizeKb = Math.round(file.size / 1024);
    const reader = new FileReader();
    reader.onload = () => {
      setProofFileData({
        name: file.name,
        dataUrl: reader.result,
        sizeKb
      });
    };
    reader.readAsDataURL(file);
  };

  // REGISTRA O REPASSE PIX NO FIRESTORE COM O COMPROVANTE (PDF, IMAGEM OU LINK)
  const handleConfirmPayout = async (e) => {
    e.preventDefault();
    if (!statementCoupon) return;

    // Normaliza input (suporta ponto ou vírgula)
    const cleanAmountStr = String(payoutAmount).replace(/\s+/g, '').replace(',', '.');
    const amountNum = parseFloat(cleanAmountStr);
    const pendingNum = Number(statementCoupon.commissionPending || 0);

    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Informe um valor válido para o repasse.");
      return;
    }

    // Comparação precisa em centavos para evitar discrepâncias de ponto flutuante do JavaScript
    const amountCents = Math.round(amountNum * 100);
    const pendingCents = Math.round(pendingNum * 100);

    if (amountCents > pendingCents) {
      alert(`O valor informado (R$ ${amountNum.toFixed(2)}) é maior que o saldo pendente (R$ ${(pendingCents / 100).toFixed(2)}).`);
      return;
    }

    setProcessingPayout(true);

    // Constrói o comprovante conforme o formato selecionado
    let savedProofType = 'none';
    let savedProofName = '';
    let savedProofUrl = '';

    if (proofType === 'pdf' && proofFileData.dataUrl) {
      savedProofType = 'pdf';
      savedProofName = proofFileData.name || 'comprovante.pdf';
      savedProofUrl = proofFileData.dataUrl;
    } else if (proofType === 'image' && proofFileData.dataUrl) {
      savedProofType = 'image';
      savedProofName = proofFileData.name || 'comprovante.png';
      savedProofUrl = proofFileData.dataUrl;
    } else if (proofType === 'link' && proofLinkUrl.trim()) {
      savedProofType = 'link';
      savedProofName = 'Link Externo / Nuvem';
      savedProofUrl = proofLinkUrl.trim();
    }

    const newPayoutRecord = {
      id: `pay_${Date.now()}`,
      date: new Date().toISOString(),
      amount: amountNum,
      note: payoutNote.trim() || 'Repasse Pix de Comissões',
      admin: 'Administrador THR33',
      proofType: savedProofType,
      proofName: savedProofName,
      proofUrl: savedProofUrl,
      // Retrocompatibilidade
      pdfName: savedProofType === 'pdf' ? savedProofName : '',
      pdfUrl: savedProofType === 'pdf' ? savedProofUrl : ''
    };

    const newPending = Math.max(0, (pendingCents - amountCents) / 100);
    const paidCents = Math.round((Number(statementCoupon.commissionPaid || 0)) * 100);
    const newPaid = (paidCents + amountCents) / 100;
    const updatedHistory = [newPayoutRecord, ...(statementCoupon.payoutHistory || [])];

    try {
      await setDoc(doc(db, 'coupons', statementCoupon.id), {
        commissionPending: newPending,
        commissionPaid: newPaid,
        payoutHistory: updatedHistory,
        lastPayoutDate: new Date().toISOString()
      }, { merge: true });

      const updatedCoupon = {
        ...statementCoupon,
        commissionPending: newPending,
        commissionPaid: newPaid,
        payoutHistory: updatedHistory
      };

      setCoupons(prev => prev.map(c => c.id === statementCoupon.id ? updatedCoupon : c));
      setStatementCoupon(updatedCoupon);
      setPayoutAmount(newPending.toFixed(2));
      setPayoutNote('');
      setProofFileData({ name: '', dataUrl: '', sizeKb: 0 });
      setProofLinkUrl('');

      alert(`Repasse de R$ ${amountNum.toFixed(2)} registrado com sucesso no Firestore!`);
    } catch (err) {
      alert("Erro ao registrar repasse no Firestore.");
    } finally {
      setProcessingPayout(false);
    }
  };

  // VISUALIZAR COMPROVANTE (PDF, IMAGEM OU LINK EXTERNO)
  const handleViewProof = (p) => {
    const url = p.proofUrl || p.pdfUrl;
    const type = p.proofType || (p.pdfUrl ? 'pdf' : (url?.startsWith('http') ? 'link' : (url?.startsWith('data:image') ? 'image' : 'pdf')));

    if (!url) {
      alert(`Comprovante registrado no fechamento.\n\nData: ${new Date(p.date).toLocaleDateString('pt-BR')}\nValor: R$ ${Number(p.amount).toFixed(2)}`);
      return;
    }

    if (type === 'link' || url.startsWith('http')) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (type === 'image' || url.startsWith('data:image')) {
      setPreviewImage({
        url,
        name: p.proofName || 'Comprovante Pix',
        date: new Date(p.date).toLocaleDateString('pt-BR'),
        amount: Number(p.amount).toFixed(2)
      });
      return;
    }

    // Formato PDF
    const pdfWindow = window.open("");
    if (pdfWindow) {
      pdfWindow.document.write(
        `<title>${p.proofName || p.pdfName || 'Comprovante Pix'}</title><iframe width='100%' height='100%' style='border:none; position:fixed; top:0; left:0; right:0; bottom:0;' src='${url}'></iframe>`
      );
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = p.proofName || p.pdfName || 'comprovante_pix.pdf';
      link.click();
    }
  };

  // EXPORTAR RELATÓRIO DO CUPOM (PRESTAÇÃO DE CONTAS)
  const handleExportStatement = () => {
    if (!statementCoupon) return;
    const orders = statementOrders || [];
    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório do Cupom ${statementCoupon.code} - THR33</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #0a0a0a; color: #f5f5f5; padding: 40px; }
          h1 { margin: 0; font-size: 24px; letter-spacing: 2px; }
          .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
          .meta { font-size: 14px; color: #888; margin-top: 5px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 35px; }
          .summary-card { background: #141414; border: 1px solid #262626; padding: 15px; border-radius: 4px; }
          .summary-card span { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; display: block; }
          .summary-card strong { font-size: 20px; margin-top: 5px; display: block; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
          th, td { padding: 12px 10px; border-bottom: 1px solid #222; text-align: left; }
          th { color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
          .highlight { color: #4ade80; font-weight: bold; }
          .footer { margin-top: 50px; border-top: 1px solid #333; padding-top: 20px; font-size: 12px; color: #666; text-align: center; }
          @media print { body { background: #fff; color: #000; } .summary-card { border-color: #ddd; background: #f9f9f9; } th, td { border-color: #eee; } th { color: #555; } .meta, .summary-card span { color: #666; } .highlight { color: #000; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>THR33 // EXTRATO DE COMISSÕES</h1>
            <div class="meta">Parceiro: <strong>${statementCoupon.partnerName}</strong> | Chave Pix: ${statementCoupon.partnerPix || 'N/A'}</div>
          </div>
          <div class="meta" style="text-align: right;">
            Cupom: <strong>${statementCoupon.code}</strong><br/>
            Data: ${new Date().toLocaleDateString('pt-BR')}
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <span>Faturamento Bruto</span>
            <strong>R$ ${(Number(statementCoupon.grossRevenue) || 0).toFixed(2)}</strong>
          </div>
          <div class="summary-card">
            <span>Descontos Clientes</span>
            <strong>R$ ${(Number(statementCoupon.discountGiven) || 0).toFixed(2)}</strong>
          </div>
          <div class="summary-card">
            <span>Comissões Pagas</span>
            <strong>R$ ${(Number(statementCoupon.commissionPaid) || 0).toFixed(2)}</strong>
          </div>
          <div class="summary-card">
            <span>Saldo a Repassar</span>
            <strong style="color: #facc15;">R$ ${(Number(statementCoupon.commissionPending) || 0).toFixed(2)}</strong>
          </div>
        </div>

        <h3>Pedidos Atribuídos (${orders.length})</h3>
        ${orders.length === 0 ? '<p style="color: #888;">Nenhum pedido atribuído a este cupom no momento.</p>' : `
          <table>
            <thead>
              <tr>
                <th>ID Pedido</th>
                <th>Data</th>
                <th>Cliente</th>
                <th>Peças</th>
                <th>Valor Total</th>
                <th>Comissão</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map(o => `
                <tr>
                  <td>${o.id}</td>
                  <td>${o.date}</td>
                  <td>${o.client}</td>
                  <td>${o.itemsCount} un.</td>
                  <td>R$ ${o.total.toFixed(2)}</td>
                  <td class="highlight">R$ ${o.commission.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}

        ${statementCoupon.payoutHistory && statementCoupon.payoutHistory.length > 0 ? `
          <h3 style="margin-top: 35px;">Histórico de Repasses Pix Realizados</h3>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Valor Pago</th>
                <th>Anotação / Comprovante</th>
                <th>Responsável</th>
              </tr>
            </thead>
            <tbody>
              ${statementCoupon.payoutHistory.map(p => `
                <tr>
                  <td>${new Date(p.date).toLocaleDateString('pt-BR')}</td>
                  <td class="highlight">R$ ${Number(p.amount).toFixed(2)}</td>
                  <td>${p.note || 'Repasse Pix'} ${p.proofName || p.pdfName ? `(${p.proofName || p.pdfName})` : ''}</td>
                  <td>${p.admin || 'Admin'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <div class="footer">
          THR33 Streetwear Engine &copy; ${new Date().getFullYear()} — Documento gerado automaticamente para prestação de contas.
        </div>
      </body>
      </html>
    `;
    const reportWindow = window.open('', '_blank');
    if (reportWindow) {
      reportWindow.document.write(reportHtml);
      reportWindow.document.close();
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      code: '',
      type: 'affiliate',
      discountPercent: 10,
      partnerName: '',
      partnerPix: '',
      validUntil: '',
      minOrderValue: '',
      active: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (coupon) => {
    if (!coupon) return;
    setEditingId(coupon.id);
    setFormData({
      code: coupon.code || '',
      type: coupon.type || 'affiliate',
      discountPercent: coupon.discountPercent || 10,
      partnerName: coupon.partnerName || '',
      partnerPix: coupon.partnerPix || '',
      validUntil: coupon.validUntil || '',
      minOrderValue: coupon.minOrderValue || '',
      active: coupon.active ?? true
    });
    setIsModalOpen(true);
  };

  const handleSaveCoupon = async (e) => {
    e.preventDefault();
    if (!formData.code.trim()) return;

    setSaving(true);
    const couponId = editingId || `coupon_${formData.code.trim().toLowerCase()}`;
    const isBrand = formData.type === 'brand';

    const payload = {
      code: formData.code.trim().toUpperCase(),
      type: formData.type,
      discountPercent: Number(formData.discountPercent) || 10,
      partnerName: isBrand ? 'THR33 Marca Oficial' : (formData.partnerName.trim() || 'Parceiro'),
      partnerPix: isBrand ? '' : (formData.partnerPix.trim() || ''),
      validUntil: formData.validUntil || '',
      minOrderValue: Number(formData.minOrderValue) || 0,
      commissionRate: isBrand ? 0 : (editingId ? (coupons.find(c => c.id === editingId)?.commissionRate || 8) : 8),
      active: formData.active,
      updatedAt: new Date().toISOString()
    };

    if (!editingId) {
      payload.usageCount = 0;
      payload.itemsSold = 0;
      payload.grossRevenue = 0;
      payload.discountGiven = 0;
      payload.commissionPending = 0;
      payload.commissionPaid = 0;
      payload.payoutHistory = [];
      payload.createdAt = new Date().toISOString();
    }

    try {
      await setDoc(doc(db, 'coupons', couponId), payload, { merge: true });
      await fetchCoupons();
      setIsModalOpen(false);
      alert(editingId ? "Cupom atualizado com sucesso no Firestore!" : "Novo cupom gravado com sucesso no Firestore!");
    } catch (err) {
      alert("Erro ao gravar cupom no Firestore.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (coupon) => {
    const updatedStatus = !coupon.active;
    try {
      await setDoc(doc(db, 'coupons', coupon.id), { active: updatedStatus }, { merge: true });
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, active: updatedStatus } : c));
    } catch (err) {
      alert("Erro ao alterar status.");
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!window.confirm("Deseja realmente remover este cupom do Firestore?")) return;
    try {
      await deleteDoc(doc(db, 'coupons', couponId));
      setCoupons(prev => prev.filter(c => c.id !== couponId));
    } catch (err) {
      alert("Erro ao excluir do Firestore.");
    }
  };

  const metrics = useMemo(() => {
    let gross = 0;
    let discounts = 0;
    let pending = 0;
    let paid = 0;
    let totalUses = 0;

    (coupons || []).forEach(c => {
      if (!c) return;
      gross += (Number(c.grossRevenue) || 0);
      discounts += (Number(c.discountGiven) || 0);
      pending += (Number(c.commissionPending) || 0);
      paid += (Number(c.commissionPaid) || 0);
      totalUses += (Number(c.usageCount) || 0);
    });

    const netProfit = gross - discounts - pending - paid;
    return { gross, discounts, pending, paid, totalUses, netProfit };
  }, [coupons]);

  const filteredCoupons = (coupons || []).filter(c => {
    if (!c) return false;
    const search = (searchTerm || '').trim().toLowerCase();
    const code = String(c.code || c.id || '').toLowerCase();
    const partner = String(c.partnerName || '').toLowerCase();
    const matchesSearch = !search || code.includes(search) || partner.includes(search);
    const matchesType = typeFilter === 'all' || (c.type || 'affiliate') === typeFilter;
    
    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = !!c.active;
    if (statusFilter === 'paused') matchesStatus = !c.active;
    if (statusFilter === 'pending_payout') matchesStatus = (Number(c.commissionPending) || 0) > 0;

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleCopyPix = (pixText) => {
    if (!pixText) return;
    navigator.clipboard.writeText(pixText);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <span className={styles.breadcrumb}>CMS / PARCERIAS & COMISSIONAMENTO</span>
          <h1 className={styles.title}>CUPONS, MARCA & REPASSES PIX</h1>
        </div>
        <div className={styles.headerActions}>
          <button onClick={fetchCoupons} className={styles.refreshBtn} title="Sincronizar cupons do Firestore">
            <RefreshCw size={13} className={loading ? styles.spinning : ''} />
            <span>Sincronizar</span>
          </button>
          <button onClick={handleOpenCreate} className={styles.createBtn}>
            <Plus size={14} />
            <span>NOVO CUPOM</span>
          </button>
        </div>
      </header>

      {/* KPIS */}
      <section className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>FATURAMENTO VIA CUPONS</span>
          <strong className={styles.kpiValue}>R$ {metrics.gross.toFixed(2)}</strong>
          <small className={styles.kpiSub}>{metrics.totalUses} pedidos realizados</small>
        </div>

        <div className={`${styles.profitCard} ${styles.kpiCard}`}>
          <span className={styles.kpiLabel}>LUCRO LÍQUIDO THR33</span>
          <strong className={styles.kpiValue}>R$ {metrics.netProfit.toFixed(2)}</strong>
          <small className={styles.kpiSub}>Caixa real da marca</small>
        </div>

        <div className={`${styles.kpiCard} ${metrics.pending > 0 ? styles.pendingCard : ''}`}>
          <span className={styles.kpiLabel}>REPASSES PENDENTES (A PAGAR)</span>
          <strong className={styles.kpiValue}>R$ {metrics.pending.toFixed(2)}</strong>
          <small className={styles.kpiSub}>Comissões aguardando Pix</small>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>REPASSES JÁ LIQUIDADOS</span>
          <strong className={styles.kpiValue}>R$ {metrics.paid.toFixed(2)}</strong>
          <small className={styles.kpiSub}>Total transferido a parceiros</small>
        </div>
      </section>

      {/* CONTROLES */}
      <div className={styles.controlBar}>
        <div className={styles.searchBox}>
          <Search size={14} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Buscar por código ou nome do parceiro..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={styles.filtersGroup}>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={styles.filterSelect}>
            <option value="all">TODOS OS TIPOS</option>
            <option value="affiliate">AFILIADOS / PARCEIROS</option>
            <option value="brand">CUPOM PRÓPRIO DA MARCA</option>
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={styles.filterSelect}>
            <option value="all">TODOS OS STATUS</option>
            <option value="pending_payout">COM REPASSE PENDENTE</option>
            <option value="active">APENAS ATIVOS</option>
            <option value="paused">APENAS PAUSADOS</option>
          </select>
        </div>
      </div>

      {/* TABELA */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>CÓDIGO</th>
              <th>BENEFICIÁRIO & PIX</th>
              <th>DESCONTO</th>
              <th>VENDAS (QTD/R$)</th>
              <th>COMISSÃO PENDENTE</th>
              <th>TOTAL JÁ PAGO</th>
              <th>LUCRO MARCA</th>
              <th>STATUS</th>
              <th>EXTRATO & AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" className={styles.centerText}>Carregando dados do Firestore...</td></tr>
            ) : filteredCoupons.length === 0 ? (
              <tr>
                <td colSpan="9" className={styles.centerText}>
                  Nenhum cupom cadastrado no Firestore. Clique em "+ NOVO CUPOM" para criar o primeiro.
                </td>
              </tr>
            ) : (
              filteredCoupons.map(c => {
                const isBrand = c.type === 'brand';
                const pending = Number(c.commissionPending || 0);
                const brandProfit = (Number(c.grossRevenue || 0)) - (Number(c.discountGiven || 0)) - pending - (Number(c.commissionPaid || 0));

                return (
                  <tr key={c.id}>
                    <td>
                      <span className={styles.couponCode}>{c.code}</span>
                    </td>
                    <td>
                      <strong className={styles.partnerName}>{c.partnerName}</strong>
                      <span className={isBrand ? styles.brandBadge : styles.affiliateBadge}>
                        {isBrand ? (
                          <>
                            <ShieldCheck size={11} />
                            <span>MARCA OFICIAL</span>
                          </>
                        ) : (
                          'PARCEIRO'
                        )}
                      </span>
                      {!isBrand && c.partnerPix && (
                        <small className={styles.pixKey}>Pix: {c.partnerPix}</small>
                      )}
                    </td>
                    <td>
                      <span className={styles.discountBadge}>-{c.discountPercent}% OFF</span>
                    </td>
                    <td>
                      <strong>R$ {Number(c.grossRevenue || 0).toFixed(2)}</strong>
                      <small className={styles.subText}>{c.usageCount || 0} pedidos ({c.itemsSold || 0} peças)</small>
                    </td>
                    <td>
                      {isBrand ? (
                        <span className={styles.naText}>—</span>
                      ) : (
                        <div className={styles.pendingCol}>
                          <strong className={pending > 0 ? styles.pendingHighlight : ''}>
                            R$ {pending.toFixed(2)}
                          </strong>
                          {pending > 0 && (
                            <span className={styles.pendingAlertTag}>Aguardando Pix</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      {isBrand ? (
                        <span className={styles.naText}>—</span>
                      ) : (
                        <span className={styles.paidText}>R$ {Number(c.commissionPaid || 0).toFixed(2)}</span>
                      )}
                    </td>
                    <td>
                      <strong className={styles.profitHighlight}>R$ {brandProfit.toFixed(2)}</strong>
                    </td>
                    <td>
                      <button 
                        onClick={() => handleToggleStatus(c)}
                        className={`${styles.statusToggle} ${c.active ? styles.activeStatus : styles.pausedStatus}`}
                      >
                        <span className={c.active ? styles.statusDotActive : styles.statusDotPaused} />
                        <span>{c.active ? 'Ativo' : 'Pausado'}</span>
                      </button>
                    </td>
                    <td>
                      <div className={styles.actionsRow}>
                        {!isBrand && (
                          <button onClick={() => handleOpenStatement(c)} className={styles.statementBtn}>
                            <FileText size={12} />
                            <span>Extrato & Pix</span>
                          </button>
                        )}
                        <button onClick={() => handleOpenEdit(c)} className={styles.editBtn}>
                          <Edit size={11} />
                          <span>Editar</span>
                        </button>
                        <button onClick={() => handleDeleteCoupon(c.id)} className={styles.deleteBtn} title="Remover cupom">
                          <Trash2 size={11} />
                          <span>Excluir</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* DRAWER DE EXTRATO & REPASSE COM MULTIFORMATO DE COMPROVANTE (PDF, IMAGEM, LINK) */}
      {statementCoupon && (
        <div className={styles.modalBackdrop} onClick={() => setStatementCoupon(null)}>
          <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <span className={styles.drawerTag}>FECHAMENTO DE COMISSÕES & AUDITORIA</span>
                <h2>EXTRATO DO CUPOM: {statementCoupon.code}</h2>
              </div>
              <div className={styles.drawerHeaderActions}>
                <button 
                  type="button" 
                  onClick={handleExportStatement} 
                  className={styles.exportReportBtn}
                  title="Exportar relatório para prestação de contas"
                >
                  <Download size={13} />
                  <span>Exportar Relatório</span>
                </button>
                <button onClick={() => setStatementCoupon(null)} className={styles.closeBtn} aria-label="Fechar extrato">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className={styles.drawerContent}>
              {/* CARD DO PARCEIRO PIX */}
              <div className={styles.partnerPixCard}>
                <div>
                  <small>PARCEIRO / COLABORADOR</small>
                  <h3>{statementCoupon.partnerName}</h3>
                  <div className={styles.pixRow}>
                    <span>Chave Pix: <strong>{statementCoupon.partnerPix || 'Não cadastrada'}</strong></span>
                    {statementCoupon.partnerPix && (
                      <button 
                        type="button" 
                        onClick={() => handleCopyPix(statementCoupon.partnerPix)}
                        className={styles.copyPixBtn}
                      >
                        {copiedPix ? (
                          <>
                            <Check size={11} />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={11} />
                            <span>Copiar Pix</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <div className={styles.balanceBox}>
                  <small>SALDO PENDENTE ATUAL</small>
                  <strong>R$ {(Number(statementCoupon.commissionPending) || 0).toFixed(2)}</strong>
                </div>
              </div>

              {/* FORMULÁRIO COM SELEÇÃO DO TIPO DE COMPROVANTE (PDF, IMAGEM, LINK) */}
              <form onSubmit={handleConfirmPayout} className={styles.payoutForm}>
                <div className={styles.payoutFormHeader}>
                  <DollarSign size={15} />
                  <h4>REGISTRAR TRANSFERÊNCIA PIX</h4>
                </div>
                
                <div className={styles.payoutFormGrid}>
                  <div className={styles.inputGroup}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <label style={{ margin: 0 }}>VALOR REPASSADO (R$) *</label>
                      <button 
                        type="button" 
                        onClick={() => setPayoutAmount((Math.round(Number(statementCoupon.commissionPending || 0) * 100) / 100).toFixed(2))}
                        style={{ background: 'transparent', border: 'none', color: '#60a5fa', fontSize: '0.68rem', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                      >
                        Quitar Saldo Total
                      </button>
                    </div>
                    <input 
                      type="text" 
                      placeholder="0.00"
                      value={payoutAmount} 
                      onChange={(e) => setPayoutAmount(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>ANOTAÇÃO / OBSERVAÇÃO</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Fechamento Agosto / Nubank" 
                      value={payoutNote} 
                      onChange={(e) => setPayoutNote(e.target.value)} 
                    />
                  </div>
                </div>

                {/* SELETOR DE FORMATO DO COMPROVANTE */}
                <div className={styles.fileUploadGroup}>
                  <label>FORMATO DO COMPROVANTE / EXTRATO</label>
                  <div className={styles.proofTypeSelector}>
                    <button
                      type="button"
                      className={`${styles.proofTypeBtn} ${proofType === 'pdf' ? styles.activeProofType : ''}`}
                      onClick={() => { setProofType('pdf'); setProofFileData({ name: '', dataUrl: '', sizeKb: 0 }); }}
                    >
                      <FileText size={13} />
                      <span>Arquivo PDF</span>
                    </button>

                    <button
                      type="button"
                      className={`${styles.proofTypeBtn} ${proofType === 'image' ? styles.activeProofType : ''}`}
                      onClick={() => { setProofType('image'); setProofFileData({ name: '', dataUrl: '', sizeKb: 0 }); }}
                    >
                      <ImageIcon size={13} />
                      <span>Imagem (JPG/PNG)</span>
                    </button>

                    <button
                      type="button"
                      className={`${styles.proofTypeBtn} ${proofType === 'link' ? styles.activeProofType : ''}`}
                      onClick={() => { setProofType('link'); setProofFileData({ name: '', dataUrl: '', sizeKb: 0 }); }}
                    >
                      <LinkIcon size={13} />
                      <span>Link Web / Nuvem</span>
                    </button>
                  </div>

                  {/* 1. INPUT PDF */}
                  {proofType === 'pdf' && (
                    <div className={styles.uploadBox}>
                      <input 
                        type="file" 
                        id="proofPdfUpload"
                        accept="application/pdf"
                        onChange={(e) => handleProofFileUpload(e, 'pdf')}
                        className={styles.fileInputHidden}
                      />
                      <label htmlFor="proofPdfUpload" className={styles.uploadTriggerLabel}>
                        <div className={styles.uploadTriggerText}>
                          <Paperclip size={13} className={styles.paperclipIcon} />
                          <span className={styles.pdfFilenameText}>
                            {proofFileData.name ? `${proofFileData.name} (${proofFileData.sizeKb} KB)` : 'Selecionar Documento PDF...'}
                          </span>
                        </div>
                        <span className={styles.browseBtn}>
                          <Upload size={11} />
                          <span>Procurar PDF</span>
                        </span>
                      </label>
                      {proofFileData.name && (
                        <button 
                          type="button" 
                          onClick={() => setProofFileData({ name: '', dataUrl: '', sizeKb: 0 })} 
                          className={styles.removePdfBtn}
                          title="Remover arquivo"
                        >
                          <X size={12} />
                          <span>Remover</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* 2. INPUT IMAGEM (JPG / PNG / WEBP) */}
                  {proofType === 'image' && (
                    <div className={styles.imageUploadArea}>
                      <div className={styles.uploadBox}>
                        <input 
                          type="file" 
                          id="proofImgUpload"
                          accept="image/*"
                          onChange={(e) => handleProofFileUpload(e, 'image')}
                          className={styles.fileInputHidden}
                        />
                        <label htmlFor="proofImgUpload" className={styles.uploadTriggerLabel}>
                          <div className={styles.uploadTriggerText}>
                            <ImageIcon size={13} className={styles.paperclipIcon} />
                            <span className={styles.pdfFilenameText}>
                              {proofFileData.name ? `${proofFileData.name} (${proofFileData.sizeKb} KB)` : 'Selecionar Foto ou Print do Comprovante...'}
                            </span>
                          </div>
                          <span className={styles.browseBtn}>
                            <Upload size={11} />
                            <span>Procurar Imagem</span>
                          </span>
                        </label>
                        {proofFileData.name && (
                          <button 
                            type="button" 
                            onClick={() => setProofFileData({ name: '', dataUrl: '', sizeKb: 0 })} 
                            className={styles.removePdfBtn}
                            title="Remover imagem"
                          >
                            <X size={12} />
                            <span>Remover</span>
                          </button>
                        )}
                      </div>

                      {/* Pré-visualização da Imagem */}
                      {proofFileData.dataUrl && (
                        <div className={styles.imgThumbnailWrapper}>
                          <img src={proofFileData.dataUrl} alt="Pré-visualização do comprovante" className={styles.imgThumbnail} />
                          <span className={styles.imgThumbnailLabel}>Pré-visualização pronta para gravação</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. INPUT LINK WEB / DRIVE */}
                  {proofType === 'link' && (
                    <div className={styles.linkInputWrapper}>
                      <div className={styles.linkField}>
                        <LinkIcon size={14} className={styles.linkIconInside} />
                        <input 
                          type="url" 
                          placeholder="https://drive.google.com/... ou link bancário direto"
                          value={proofLinkUrl}
                          onChange={(e) => setProofLinkUrl(e.target.value)}
                          className={styles.linkInput}
                        />
                      </div>
                      <small className={styles.linkHelper}>
                        Cole o link do comprovante no Google Drive, OneDrive, Dropbox ou gateway bancário.
                      </small>
                    </div>
                  )}
                </div>

                <button 
                  type="submit" 
                  disabled={processingPayout || Number(statementCoupon.commissionPending || 0) <= 0} 
                  className={styles.confirmPayoutBtn}
                >
                  {processingPayout ? (
                    'PROCESSANDO...'
                  ) : (
                    <>
                      <Check size={14} />
                      <span>CONFIRMAR REPASSE COM COMPROVANTE</span>
                    </>
                  )}
                </button>
              </form>

              {/* HISTÓRICO DE REPASSES COM BOTÕES POLIMÓRFICOS */}
              <div className={styles.historySection}>
                <h4>HISTÓRICO DE REPASSES PAGOS</h4>
                {!statementCoupon.payoutHistory || statementCoupon.payoutHistory.length === 0 ? (
                  <p className={styles.emptyHistoryText}>Nenhum repasse registrado ainda para este parceiro.</p>
                ) : (
                  <div className={styles.historyList}>
                    {statementCoupon.payoutHistory.map(p => {
                      const hasProof = !!(p.proofUrl || p.pdfUrl);
                      const type = p.proofType || (p.pdfUrl ? 'pdf' : (p.proofUrl?.startsWith('http') ? 'link' : (p.proofUrl?.startsWith('data:image') ? 'image' : 'pdf')));
                      const label = p.proofName || p.pdfName || (type === 'link' ? 'Abrir Link Externo' : (type === 'image' ? 'Ver Imagem' : 'Ver PDF'));

                      return (
                        <div key={p.id} className={styles.historyItem}>
                          <div>
                            <strong>R$ {Number(p.amount).toFixed(2)}</strong>
                            <span>{p.note}</span>
                            {hasProof && (
                              <button 
                                type="button" 
                                onClick={() => handleViewProof(p)} 
                                className={styles.viewPdfBadge}
                                title="Abrir ou baixar comprovante"
                              >
                                {type === 'image' ? (
                                  <ImageIcon size={12} />
                                ) : type === 'link' ? (
                                  <LinkIcon size={12} />
                                ) : (
                                  <FileText size={12} />
                                )}
                                <span>{label}</span>
                                <ExternalLink size={10} />
                              </button>
                            )}
                          </div>
                          <div className={styles.historyMeta}>
                            <small>{new Date(p.date).toLocaleDateString('pt-BR')}</small>
                            <small>Pago por: {p.admin}</small>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* PEDIDOS ATRIBUÍDOS AO CUPOM */}
              <div className={styles.historySection}>
                <h4>PEDIDOS ATRIBUÍDOS AO CUPOM</h4>
                {loadingOrders ? (
                  <p className={styles.emptyHistoryText}>Carregando pedidos do Firestore...</p>
                ) : statementOrders.length === 0 ? (
                  <p className={styles.emptyHistoryText}>Nenhum pedido atribuído a este cupom no Firestore.</p>
                ) : (
                  <div className={styles.ordersList}>
                    {statementOrders.map(ord => (
                      <div key={ord.id} className={styles.orderItemRow}>
                        <div>
                          <strong>{ord.id} — {ord.client}</strong>
                          <small>{ord.date} • {ord.itemsCount} peças</small>
                        </div>
                        <div className={styles.orderVal}>
                          <span>Total: R$ {ord.total.toFixed(2)}</span>
                          <strong>Comissão: +R$ {ord.commission.toFixed(2)}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PRÉ-VISUALIZAÇÃO DE IMAGEM */}
      {previewImage && (
        <div className={styles.imageModalBackdrop} onClick={() => setPreviewImage(null)}>
          <div className={styles.imageModalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.imageModalHeader}>
              <div>
                <h3>{previewImage.name}</h3>
                <small>{previewImage.date} • R$ {previewImage.amount}</small>
              </div>
              <button onClick={() => setPreviewImage(null)} className={styles.closeBtn}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.imageModalBody}>
              <img src={previewImage.url} alt={previewImage.name} className={styles.imageModalFull} />
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRIAÇÃO / EDIÇÃO */}
      {isModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTop}>
              <h2>{editingId ? 'EDITAR CUPOM' : 'CRIAR NOVO CUPOM'}</h2>
              <button onClick={() => setIsModalOpen(false)} className={styles.closeBtn} aria-label="Fechar modal">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className={styles.form}>
              <div className={styles.inputGroup}>
                <label>TIPO DE CUPOM</label>
                <div className={styles.typeSelector}>
                  <button
                    type="button"
                    className={`${styles.typeBtn} ${formData.type === 'affiliate' ? styles.activeTypeBtn : ''}`}
                    onClick={() => setFormData({ ...formData, type: 'affiliate' })}
                  >
                    PARCEIRO / AFILIADO (COM COMISSÃO)
                  </button>
                  <button
                    type="button"
                    className={`${styles.typeBtn} ${formData.type === 'brand' ? styles.activeTypeBtn : ''}`}
                    onClick={() => setFormData({ ...formData, type: 'brand', partnerName: 'THR33 Marca Oficial', partnerPix: '' })}
                  >
                    CUPOM DA MARCA (0% COMISSÃO)
                  </button>
                </div>
              </div>

              <div className={styles.gridTwo}>
                <div className={styles.inputGroup}>
                  <label>CÓDIGO DO CUPOM *</label>
                  <input 
                    type="text" 
                    placeholder="Ex: EDU10" 
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
                    value={formData.discountPercent} 
                    onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })} 
                    required 
                  />
                </div>
              </div>

              {formData.type === 'affiliate' && (
                <div className={styles.gridTwo}>
                  <div className={styles.inputGroup}>
                    <label>NOME DO PARCEIRO *</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Eduardo" 
                      value={formData.partnerName} 
                      onChange={(e) => setFormData({ ...formData, partnerName: e.target.value })} 
                      required={formData.type === 'affiliate'} 
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>CHAVE PIX</label>
                    <input 
                      type="text" 
                      placeholder="Chave Pix para repasse" 
                      value={formData.partnerPix} 
                      onChange={(e) => setFormData({ ...formData, partnerPix: e.target.value })} 
                    />
                  </div>
                </div>
              )}

              <div className={styles.gridTwo}>
                <div className={styles.inputGroup}>
                  <label>VALIDADE (OPCIONAL)</label>
                  <input 
                    type="date" 
                    value={formData.validUntil} 
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })} 
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>PEDIDO MÍNIMO (R$)</label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    value={formData.minOrderValue} 
                    onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })} 
                  />
                </div>
              </div>

              <button type="submit" disabled={saving} className={styles.submitBtn}>
                {saving ? 'GRAVANDO NO FIRESTORE...' : (editingId ? 'SALVAR ALTERAÇÕES' : 'CRIAR CUPOM NO FIRESTORE')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CmsCupons;
