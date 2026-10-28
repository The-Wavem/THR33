import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
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
  Eye,
  Sparkles,
  Image as ImageIcon,
  Link as LinkIcon,
  Calendar,
  Layers,
  Filter,
  RotateCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Lock,
  Users,
  Truck,
  Tag,
  Percent,
  Shuffle,
  Clock,
  Award,
  Hash,
} from "lucide-react";
import { db } from "../../services/firebaseConfig";
import { InfoTooltip } from "../../components/ui/InfoTooltip";
import {
  useCmsPeriodFilter,
  parseOrderDate,
  isDateInPeriod,
  getTodayStr,
  formatShortDate,
} from "../../hooks/useCmsPeriodFilter";
import {
  ORDER_STATUSES,
  normalizeOrderStatus,
  getOrderStatusMeta,
  isOrderPaid,
} from "../../services/orderStateMachine";
import styles from "./CmsCupons.module.css";

export function CmsCupons() {
  const [coupons, setCoupons] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "none",
  });

  // Hook global sincronizado de filtro de datas
  const {
    periodFilter,
    setPeriodFilter,
    customStartDate,
    customEndDate,
    showCustomPicker,
    setShowCustomPicker,
    handleStartDateChange,
    handleEndDateChange,
    handleApplyCustomDate,
    periodLabel,
  } = useCmsPeriodFilter();

  // Modais de Criação e Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Drawer de Extrato & Repasse
  const [statementCoupon, setStatementCoupon] = useState(null);
  const [statementOrders, setStatementOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutNote, setPayoutNote] = useState("");
  const [processingPayout, setProcessingPayout] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  // Comprovante: Seleção de Formato (PDF | Imagem | Link Web)
  const [proofType, setProofType] = useState("pdf"); // 'pdf' | 'image' | 'link'
  const [proofFileData, setProofFileData] = useState({
    name: "",
    dataUrl: "",
    sizeKb: 0,
  });
  const [proofLinkUrl, setProofLinkUrl] = useState("");

  // Modal para pré-visualização de imagem
  const [previewImage, setPreviewImage] = useState(null);

  // Form State Criação / Edição (Coupon Studio)
  const [emailInput, setEmailInput] = useState("");
  const [formData, setFormData] = useState({
    code: "",
    type: "affiliate",
    discountMode: "percentage",
    discountPercent: 10,
    fixedDiscountValue: 50,
    freeShipping: false,
    partnerName: "",
    partnerPix: "",
    audienceMode: "public",
    allowedEmails: [],
    onlyFirstPurchase: false,
    maxUsesPerUser: "",
    maxTotalUses: "",
    minOrderValue: "",
    minItemsCount: "",
    startDate: "",
    validUntil: "",
    active: true,
  });

  // 1. Busca cupons e pedidos exclusivamente do Firestore
  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const [couponsSnap, ordersSnap] = await Promise.all([
        getDocs(collection(db, "coupons")),
        getDocs(collection(db, "orders")),
      ]);

      if (!couponsSnap.empty) {
        const list = [];
        couponsSnap.forEach((d) => {
          const data = d.data() || {};
          list.push({
            id: d.id,
            code: data.code || d.id.replace(/^coupon_/, "").toUpperCase(),
            type: data.type || "affiliate",
            partnerName:
              data.partnerName ||
              (data.type === "brand" ? "THR33 Marca Oficial" : "Parceiro"),
            discountPercent: data.discountPercent || 10,
            payoutHistory: Array.isArray(data.payoutHistory)
              ? data.payoutHistory
              : [],
            ...data,
          });
        });
        setCoupons(list);
      } else {
        setCoupons([]);
      }

      if (!ordersSnap.empty) {
        const oList = [];
        ordersSnap.forEach((d) => {
          oList.push({ id: d.id, ...d.data() });
        });
        setOrders(oList);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.warn(
        "Aviso ao carregar cupons e pedidos do Firestore:",
        err.message,
      );
      setCoupons([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  // Bloqueia a rolagem da página no eixo Y quando o drawer ou modal estiver aberto
  useEffect(() => {
    if (statementCoupon || isModalOpen || previewImage) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [statementCoupon, isModalOpen, previewImage]);

  // 2. Busca pedidos vinculados ao cupom diretamente do Firestore
  const handleOpenStatement = async (coupon) => {
    setStatementCoupon(coupon);
    setPayoutAmount((Number(coupon.commissionPending) || 0).toFixed(2));
    setPayoutNote("");
    setProofType("pdf");
    setProofFileData({ name: "", dataUrl: "", sizeKb: 0 });
    setProofLinkUrl("");
    setCopiedPix(false);
    setLoadingOrders(true);

    try {
      const ordersSnap = await getDocs(collection(db, "orders"));
      if (!ordersSnap.empty) {
        const matchingOrders = [];
        const couponCodeUpper = String(coupon.code || "")
          .toUpperCase()
          .trim();
        const couponIdLower = String(coupon.id || "")
          .toLowerCase()
          .trim();

        ordersSnap.forEach((docSnap) => {
          const order = docSnap.data() || {};
          const orderCouponCode = String(order.couponCode || order.coupon || "")
            .toUpperCase()
            .trim();
          const orderCouponId = String(order.couponId || "")
            .toLowerCase()
            .trim();

          const isMatch =
            (orderCouponCode && orderCouponCode === couponCodeUpper) ||
            (orderCouponId &&
              (orderCouponId === couponIdLower ||
                orderCouponId === coupon.id)) ||
            (orderCouponCode &&
              `coupon_${orderCouponCode.toLowerCase()}` === couponIdLower);

          if (isMatch) {
            const isPaid = isOrderPaid(order.status || order.statusCode);
            const statusMeta = getOrderStatusMeta(order.status || order.statusCode);
            const items = Array.isArray(order.items) ? order.items : [];
            const itemsCount =
              items.length > 0
                ? items.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0)
                : Number(order.itemsCount) || 1;

            const gross = Number(
              order.subtotal ||
                Number(order.total || 0) + Number(order.discountAmount || 0) ||
                order.total ||
                0,
            );
            const discountAmount = Number(
              order.discountAmount ||
                (gross * (Number(coupon.discountPercent) || 10)) / 100 ||
                0,
            );
            const total = Number(order.total || gross - discountAmount || 0);
            const rate = Number(coupon.commissionRate || 8);
            const calculatedCommission =
              coupon.type === "brand"
                ? 0
                : ((gross - discountAmount) * rate) / 100;
            const netProfit = Math.max(
              0,
              gross - discountAmount - calculatedCommission,
            );

            matchingOrders.push({
              id: docSnap.id,
              date: order.createdAt
                ? new Date(order.createdAt).toLocaleDateString("pt-BR")
                : "Recente",
              rawDate: order.createdAt,
              client: order.clientName || "Cliente",
              status: order.status || 'aguardando_pagamento',
              isPaid,
              statusMeta,
              itemsCount,
              gross,
              discountAmount,
              total,
              commission: calculatedCommission,
              netProfit,
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

  // Resumo financeiro consolidado do cupom ativo no extrato (apenas pedidos com pagamento efetuado)
  const statementSummary = useMemo(() => {
    if (!statementCoupon) return null;

    const payouts = Array.isArray(statementCoupon.payoutHistory)
      ? statementCoupon.payoutHistory
      : [];
    const totalPayoutsPaid =
      payouts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) ||
      Number(statementCoupon.commissionPaid || 0);

    const allOrdersList = statementOrders || [];
    const paidOrdersList = allOrdersList.filter(o => o.isPaid);
    const hasOrderHistory = allOrdersList.length > 0;

    const ordersCount = paidOrdersList.length;
    const ordersItemsCount = paidOrdersList.reduce(
      (sum, o) => sum + (Number(o.itemsCount) || 0),
      0,
    );

    const ordersGross = paidOrdersList.reduce(
      (sum, o) => sum + (Number(o.gross || o.total) || 0),
      0,
    );
    const ordersDiscount = paidOrdersList.reduce(
      (sum, o) => sum + (Number(o.discountAmount) || 0),
      0,
    );
    const ordersCommission = paidOrdersList.reduce(
      (sum, o) => sum + (Number(o.commission) || 0),
      0,
    );

    const isBrand = statementCoupon.type === "brand";

    // Se temos pedidos na base, os valores reais são dados pelos pedidos pagos
    const totalGross = hasOrderHistory ? ordersGross : Number(statementCoupon.grossRevenue || 0);
    const totalDiscount = hasOrderHistory ? ordersDiscount : Number(statementCoupon.discountGiven || 0);
    const totalItems = hasOrderHistory ? ordersItemsCount : Number(statementCoupon.itemsSold || 0);
    const totalUses = hasOrderHistory ? ordersCount : Number(statementCoupon.usageCount || 0);

    const effectiveCommission = isBrand
      ? 0
      : (hasOrderHistory ? ordersCommission : (totalPayoutsPaid + Number(statementCoupon.commissionPending || 0)));

    const pendingCommission = isBrand
      ? 0
      : (hasOrderHistory ? Math.max(0, effectiveCommission - totalPayoutsPaid) : Number(statementCoupon.commissionPending || 0));

    const totalCommission = isBrand
      ? 0
      : totalPayoutsPaid + pendingCommission;

    const netProfit = isBrand
      ? Math.max(0, totalGross - totalDiscount)
      : Math.max(0, totalGross - effectiveCommission);

    return {
      totalPayoutsPaid,
      payoutsCount: payouts.length,
      pendingCommission,
      totalCommission,
      totalGross,
      totalDiscount,
      totalItems,
      totalUses,
      allOrdersCount: allOrdersList.length,
      unpaidOrdersCount: allOrdersList.length - paidOrdersList.length,
      effectiveCommission,
      netProfit,
      isBrand,
    };
  }, [statementCoupon, statementOrders]);

  // HANDLER DE ARQUIVO (PDF ou Imagem)
  const handleProofFileUpload = (e, expectedType) => {
    const file = e.target.files[0];
    if (!file) return;

    if (expectedType === "pdf" && file.type !== "application/pdf") {
      alert("Por favor, anexe um arquivo no formato PDF.");
      return;
    }

    if (expectedType === "image" && !file.type.startsWith("image/")) {
      alert("Por favor, anexe uma imagem válida (PNG, JPG, JPEG ou WEBP).");
      return;
    }

    const sizeKb = Math.round(file.size / 1024);
    const reader = new FileReader();
    reader.onload = () => {
      setProofFileData({
        name: file.name,
        dataUrl: reader.result,
        sizeKb,
      });
    };
    reader.readAsDataURL(file);
  };

  // REGISTRA O REPASSE PIX NO FIRESTORE COM O COMPROVANTE (PDF, IMAGEM OU LINK)
  const handleConfirmPayout = async (e) => {
    e.preventDefault();
    if (!statementCoupon) return;

    // Normaliza input (suporta ponto ou vírgula)
    const cleanAmountStr = String(payoutAmount)
      .replace(/\s+/g, "")
      .replace(",", ".");
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
      alert(
        `O valor informado (R$ ${amountNum.toFixed(2)}) é maior que o saldo pendente (R$ ${(pendingCents / 100).toFixed(2)}).`,
      );
      return;
    }

    setProcessingPayout(true);

    // Constrói o comprovante conforme o formato selecionado
    let savedProofType = "none";
    let savedProofName = "";
    let savedProofUrl = "";

    if (proofType === "pdf" && proofFileData.dataUrl) {
      savedProofType = "pdf";
      savedProofName = proofFileData.name || "comprovante.pdf";
      savedProofUrl = proofFileData.dataUrl;
    } else if (proofType === "image" && proofFileData.dataUrl) {
      savedProofType = "image";
      savedProofName = proofFileData.name || "comprovante.png";
      savedProofUrl = proofFileData.dataUrl;
    } else if (proofType === "link" && proofLinkUrl.trim()) {
      savedProofType = "link";
      savedProofName = "Link Externo / Nuvem";
      savedProofUrl = proofLinkUrl.trim();
    }

    const newPayoutRecord = {
      id: `pay_${Date.now()}`,
      date: new Date().toISOString(),
      amount: amountNum,
      note: payoutNote.trim() || "Repasse Pix de Comissões",
      admin: "Administrador THR33",
      proofType: savedProofType,
      proofName: savedProofName,
      proofUrl: savedProofUrl,
      // Retrocompatibilidade
      pdfName: savedProofType === "pdf" ? savedProofName : "",
      pdfUrl: savedProofType === "pdf" ? savedProofUrl : "",
    };

    const newPending = Math.max(0, (pendingCents - amountCents) / 100);
    const paidCents = Math.round(
      Number(statementCoupon.commissionPaid || 0) * 100,
    );
    const newPaid = (paidCents + amountCents) / 100;
    const updatedHistory = [
      newPayoutRecord,
      ...(statementCoupon.payoutHistory || []),
    ];

    try {
      await setDoc(
        doc(db, "coupons", statementCoupon.id),
        {
          commissionPending: newPending,
          commissionPaid: newPaid,
          payoutHistory: updatedHistory,
          lastPayoutDate: new Date().toISOString(),
        },
        { merge: true },
      );

      const updatedCoupon = {
        ...statementCoupon,
        commissionPending: newPending,
        commissionPaid: newPaid,
        payoutHistory: updatedHistory,
      };

      setCoupons((prev) =>
        prev.map((c) => (c.id === statementCoupon.id ? updatedCoupon : c)),
      );
      setStatementCoupon(updatedCoupon);
      setPayoutAmount(newPending.toFixed(2));
      setPayoutNote("");
      setProofFileData({ name: "", dataUrl: "", sizeKb: 0 });
      setProofLinkUrl("");

      alert(
        `Repasse de R$ ${amountNum.toFixed(2)} registrado com sucesso no Firestore!`,
      );
    } catch (err) {
      alert("Erro ao registrar repasse no Firestore.");
    } finally {
      setProcessingPayout(false);
    }
  };

  // VISUALIZAR COMPROVANTE (PDF, IMAGEM OU LINK EXTERNO)
  const handleViewProof = (p) => {
    const url = p.proofUrl || p.pdfUrl;
    const type =
      p.proofType ||
      (p.pdfUrl
        ? "pdf"
        : url?.startsWith("http")
          ? "link"
          : url?.startsWith("data:image")
            ? "image"
            : "pdf");

    if (!url) {
      alert(
        `Comprovante registrado no fechamento.\n\nData: ${new Date(p.date).toLocaleDateString("pt-BR")}\nValor: R$ ${Number(p.amount).toFixed(2)}`,
      );
      return;
    }

    if (type === "link" || url.startsWith("http")) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    if (type === "image" || url.startsWith("data:image")) {
      setPreviewImage({
        url,
        name: p.proofName || "Comprovante Pix",
        date: new Date(p.date).toLocaleDateString("pt-BR"),
        amount: Number(p.amount).toFixed(2),
      });
      return;
    }

    // Formato PDF
    const pdfWindow = window.open("");
    if (pdfWindow) {
      pdfWindow.document.write(
        `<title>${p.proofName || p.pdfName || "Comprovante Pix"}</title><iframe width='100%' height='100%' style='border:none; position:fixed; top:0; left:0; right:0; bottom:0;' src='${url}'></iframe>`,
      );
    } else {
      const link = document.createElement("a");
      link.href = url;
      link.download = p.proofName || p.pdfName || "comprovante_pix.pdf";
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
            <div class="meta">Parceiro: <strong>${statementCoupon.partnerName}</strong> | Chave Pix: ${statementCoupon.partnerPix || "N/A"}</div>
          </div>
          <div class="meta" style="text-align: right;">
            Cupom: <strong>${statementCoupon.code}</strong><br/>
            Data: ${new Date().toLocaleDateString("pt-BR")}
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
        ${
          orders.length === 0
            ? '<p style="color: #888;">Nenhum pedido atribuído a este cupom no momento.</p>'
            : `
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
              ${orders
                .map(
                  (o) => `
                <tr>
                  <td>${o.id}</td>
                  <td>${o.date}</td>
                  <td>${o.client}</td>
                  <td>${o.itemsCount} un.</td>
                  <td>R$ ${o.total.toFixed(2)}</td>
                  <td class="highlight">R$ ${o.commission.toFixed(2)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        `
        }

        ${
          statementCoupon.payoutHistory &&
          statementCoupon.payoutHistory.length > 0
            ? `
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
              ${statementCoupon.payoutHistory
                .map(
                  (p) => `
                <tr>
                  <td>${new Date(p.date).toLocaleDateString("pt-BR")}</td>
                  <td class="highlight">R$ ${Number(p.amount).toFixed(2)}</td>
                  <td>${p.note || "Repasse Pix"} ${p.proofName || p.pdfName ? `(${p.proofName || p.pdfName})` : ""}</td>
                  <td>${p.admin || "Admin"}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        `
            : ""
        }

        <div class="footer">
          THR33 Streetwear Engine &copy; ${new Date().getFullYear()} — Documento gerado automaticamente para prestação de contas.
        </div>
      </body>
      </html>
    `;
    const reportWindow = window.open("", "_blank");
    if (reportWindow) {
      reportWindow.document.write(reportHtml);
      reportWindow.document.close();
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setEmailInput("");
    setFormData({
      code: "",
      type: "affiliate",
      discountMode: "percentage",
      discountPercent: 10,
      fixedDiscountValue: 50,
      freeShipping: false,
      partnerName: "",
      partnerPix: "",
      audienceMode: "public",
      allowedEmails: [],
      onlyFirstPurchase: false,
      maxUsesPerUser: "",
      maxTotalUses: "",
      minOrderValue: "",
      minItemsCount: "",
      startDate: "",
      validUntil: "",
      active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (coupon) => {
    if (!coupon) return;
    setEditingId(coupon.id);
    setEmailInput("");
    const existingEmails = Array.isArray(coupon.allowedEmails)
      ? coupon.allowedEmails.filter(Boolean)
      : [];
    const mode = ["percentage", "fixed", "free_shipping_only"].includes(
      coupon.discountMode,
    )
      ? coupon.discountMode
      : coupon.type === "free_shipping"
        ? "free_shipping_only"
        : "percentage";

    setFormData({
      code: coupon.code || "",
      type: coupon.type === "brand" ? "brand" : "affiliate",
      discountMode: mode,
      discountPercent: coupon.discountPercent ?? 10,
      fixedDiscountValue: coupon.fixedDiscountValue ?? 50,
      freeShipping: Boolean(
        coupon.freeShipping ||
          coupon.type === "free_shipping" ||
          mode === "free_shipping_only",
      ),
      partnerName: coupon.partnerName || "",
      partnerPix: coupon.partnerPix || "",
      audienceMode: existingEmails.length > 0 ? "exclusive" : "public",
      allowedEmails: existingEmails,
      onlyFirstPurchase: Boolean(coupon.onlyFirstPurchase),
      maxUsesPerUser:
        coupon.maxUsesPerUser && Number(coupon.maxUsesPerUser) > 0
          ? coupon.maxUsesPerUser
          : "",
      maxTotalUses:
        coupon.maxTotalUses && Number(coupon.maxTotalUses) > 0
          ? coupon.maxTotalUses
          : "",
      minOrderValue: coupon.minOrderValue || "",
      minItemsCount: coupon.minItemsCount || "",
      startDate: coupon.startDate || "",
      validUntil: coupon.validUntil || coupon.expirationDate || "",
      active: coupon.active ?? true,
    });
    setIsModalOpen(true);
  };

  const handleGenerateRandomCode = () => {
    const prefixes = ["THR33", "DROP", "VIP", "CLUB", "STREET"];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomSuffix = Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase();
    setFormData((prev) => ({
      ...prev,
      code: `${randomPrefix}${randomSuffix}`,
    }));
  };

  const handleApplyPreset = (presetKey) => {
    if (presetKey === "first_purchase") {
      setFormData((prev) => ({
        ...prev,
        type: "brand",
        partnerName: "THR33 Marca Oficial",
        partnerPix: "",
        code: prev.code || "BEMVINDO10",
        discountMode: "percentage",
        discountPercent: 10,
        freeShipping: false,
        audienceMode: "public",
        allowedEmails: [],
        onlyFirstPurchase: true,
        maxUsesPerUser: 1,
      }));
    } else if (presetKey === "vip_email") {
      setFormData((prev) => ({
        ...prev,
        type: "brand",
        partnerName: "THR33 VIP Exclusivo",
        partnerPix: "",
        code: prev.code || "VIP20",
        discountMode: "percentage",
        discountPercent: 20,
        audienceMode: "exclusive",
        maxUsesPerUser: 1,
      }));
    } else if (presetKey === "affiliate_pix") {
      setFormData((prev) => ({
        ...prev,
        type: "affiliate",
        partnerName:
          prev.partnerName === "THR33 Marca Oficial" ||
          prev.partnerName === "THR33 VIP Exclusivo"
            ? ""
            : prev.partnerName,
        discountMode: "percentage",
        discountPercent: 10,
        audienceMode: "public",
        allowedEmails: [],
        onlyFirstPurchase: false,
        maxUsesPerUser: "",
      }));
    } else if (presetKey === "free_shipping") {
      setFormData((prev) => ({
        ...prev,
        type: "brand",
        partnerName: "THR33 Marca Oficial",
        partnerPix: "",
        code: prev.code || "FRETE33",
        discountMode: "free_shipping_only",
        discountPercent: 0,
        freeShipping: true,
      }));
    }
  };

  const handleAddAllowedEmail = (e) => {
    if (e) e.preventDefault();
    const raw = String(emailInput || "").trim();
    if (!raw) return;

    const candidates = raw
      .split(/[\s,;]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.includes("@") && s.includes("."));

    if (candidates.length === 0) {
      alert("Informe um endereço de e-mail válido (ex: cliente@email.com).");
      return;
    }

    setFormData((prev) => {
      const merged = Array.from(
        new Set([...(prev.allowedEmails || []), ...candidates]),
      );
      return {
        ...prev,
        audienceMode: "exclusive",
        allowedEmails: merged,
      };
    });
    setEmailInput("");
  };

  const handleRemoveAllowedEmail = (targetEmail) => {
    setFormData((prev) => ({
      ...prev,
      allowedEmails: (prev.allowedEmails || []).filter(
        (em) => em !== targetEmail,
      ),
    }));
  };

  const handleExpirationShortcut = (days) => {
    if (days === null) {
      setFormData((prev) => ({ ...prev, validUntil: "" }));
      return;
    }
    const target = new Date();
    target.setDate(target.getDate() + days);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, "0");
    const dd = String(target.getDate()).padStart(2, "0");
    setFormData((prev) => ({ ...prev, validUntil: `${yyyy}-${mm}-${dd}` }));
  };

  const handleSaveCoupon = async (e) => {
    e.preventDefault();
    if (!formData.code.trim()) return;

    // Se o usuário digitou um e-mail no campo e não clicou em "+", adiciona automaticamente
    let finalAllowedEmails =
      formData.audienceMode === "exclusive"
        ? [...(formData.allowedEmails || [])]
        : [];
    if (formData.audienceMode === "exclusive" && emailInput.trim()) {
      const extra = emailInput
        .split(/[\s,;]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.includes("@") && s.includes("."));
      finalAllowedEmails = Array.from(
        new Set([...finalAllowedEmails, ...extra]),
      );
    }

    if (
      formData.audienceMode === "exclusive" &&
      finalAllowedEmails.length === 0
    ) {
      alert(
        "Para um cupom exclusivo vinculado a contas, adicione pelo menos 1 e-mail autorizado.",
      );
      return;
    }

    setSaving(true);
    const couponId =
      editingId || `coupon_${formData.code.trim().toLowerCase()}`;
    const isBrand = formData.type === "brand";
    const discountMode = formData.discountMode || "percentage";
    const isFreeShipping =
      discountMode === "free_shipping_only"
        ? true
        : Boolean(formData.freeShipping);

    const payload = {
      code: formData.code.trim().toUpperCase(),
      type: formData.type,
      discountMode,
      discountPercent:
        discountMode === "percentage"
          ? Math.min(99, Math.max(0, Number(formData.discountPercent) || 0))
          : 0,
      fixedDiscountValue:
        discountMode === "fixed"
          ? Math.max(0, Number(formData.fixedDiscountValue) || 0)
          : 0,
      freeShipping: isFreeShipping,
      partnerName: isBrand
        ? formData.partnerName.trim() || "THR33 Marca Oficial"
        : formData.partnerName.trim() || "Parceiro",
      partnerPix: isBrand ? "" : formData.partnerPix.trim() || "",
      allowedEmails: finalAllowedEmails,
      onlyFirstPurchase: Boolean(formData.onlyFirstPurchase),
      maxUsesPerUser:
        Number(formData.maxUsesPerUser) > 0
          ? Number(formData.maxUsesPerUser)
          : null,
      maxTotalUses:
        Number(formData.maxTotalUses) > 0
          ? Number(formData.maxTotalUses)
          : null,
      minOrderValue: Number(formData.minOrderValue) || 0,
      minItemsCount: Number(formData.minItemsCount) || 0,
      startDate: formData.startDate || "",
      validUntil: formData.validUntil || "",
      expirationDate: formData.validUntil || "",
      commissionRate: isBrand
        ? 0
        : editingId
          ? coupons.find((c) => c.id === editingId)?.commissionRate || 8
          : 8,
      active: formData.active,
      updatedAt: new Date().toISOString(),
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
      await setDoc(doc(db, "coupons", couponId), payload, { merge: true });
      await fetchCoupons();
      setIsModalOpen(false);
      alert(
        editingId
          ? "Cupom atualizado com sucesso no Firestore!"
          : "Novo cupom gravado com sucesso no Firestore!",
      );
    } catch (err) {
      alert("Erro ao gravar cupom no Firestore.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (coupon) => {
    const updatedStatus = !coupon.active;
    try {
      await setDoc(
        doc(db, "coupons", coupon.id),
        { active: updatedStatus },
        { merge: true },
      );
      setCoupons((prev) =>
        prev.map((c) =>
          c.id === coupon.id ? { ...c, active: updatedStatus } : c,
        ),
      );
    } catch (err) {
      alert("Erro ao alterar status.");
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!window.confirm("Deseja realmente remover este cupom do Firestore?"))
      return;
    try {
      await deleteDoc(doc(db, "coupons", couponId));
      setCoupons((prev) => prev.filter((c) => c.id !== couponId));
    } catch (err) {
      alert("Erro ao excluir do Firestore.");
    }
  };

  // Filtra apenas pedidos com pagamento efetuado/aprovado
  const paidOrders = useMemo(() => {
    return (orders || []).filter((o) => isOrderPaid(o.status || o.statusCode));
  }, [orders]);

  // Filtra pedidos pagos pelo período selecionado
  const filteredOrders = useMemo(() => {
    if (periodFilter === "all") return paidOrders;
    return paidOrders.filter((o) =>
      isDateInPeriod(o, periodFilter, customStartDate, customEndDate),
    );
  }, [paidOrders, periodFilter, customStartDate, customEndDate]);

  // Cupons processados com reconciliação de vendas no período (apenas pedidos com pagamento efetuado)
  const processedCoupons = useMemo(() => {
    return (coupons || []).map((coupon) => {
      const cleanCode = String(coupon.code || coupon.id || "")
        .toUpperCase()
        .trim();
      const couponIdLower = String(coupon.id || "")
        .toLowerCase()
        .trim();

      // Pedidos pagos filtrados no período
      const matchingOrders = filteredOrders.filter((o) => {
        const orderCouponCode = String(o.couponCode || o.coupon || "")
          .toUpperCase()
          .trim();
        const orderCouponId = String(o.couponId || "")
          .toLowerCase()
          .trim();
        return (
          (orderCouponCode && orderCouponCode === cleanCode) ||
          (orderCouponId &&
            (orderCouponId === couponIdLower || orderCouponId === coupon.id)) ||
          (orderCouponCode &&
            `coupon_${orderCouponCode.toLowerCase()}` === couponIdLower)
        );
      });

      // Todos os pedidos registrados para o cupom (para saber se o cupom possui histórico na coleção orders)
      const matchingAllOrders = (orders || []).filter((o) => {
        const orderCouponCode = String(o.couponCode || o.coupon || "")
          .toUpperCase()
          .trim();
        const orderCouponId = String(o.couponId || "")
          .toLowerCase()
          .trim();
        return (
          (orderCouponCode && orderCouponCode === cleanCode) ||
          (orderCouponId &&
            (orderCouponId === couponIdLower || orderCouponId === coupon.id)) ||
          (orderCouponCode &&
            `coupon_${orderCouponCode.toLowerCase()}` === couponIdLower)
        );
      });

      const periodUses = matchingOrders.length;
      const periodGross = matchingOrders.reduce((sum, o) => {
        const grossVal = Number(
          o.subtotal ||
            Number(o.total || 0) + Number(o.discountAmount || 0) ||
            o.total ||
            0,
        );
        return sum + grossVal;
      }, 0);
      const periodDiscount = matchingOrders.reduce((sum, o) => {
        const disc = Number(
          o.discountAmount ||
            (Number(o.subtotal || o.total || 0) *
              Number(coupon.discountPercent || 10)) /
              100 ||
            0,
        );
        return sum + disc;
      }, 0);
      const periodItems = matchingOrders.reduce((sum, o) => {
        const items = Array.isArray(o.items) ? o.items : [];
        const count =
          items.length > 0
            ? items.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0)
            : Number(o.itemsCount) || 1;
        return sum + count;
      }, 0);

      const firestoreUses = Number(coupon.usageCount || 0);
      const firestoreGross = Number(coupon.grossRevenue || 0);
      const firestoreItems = Number(coupon.itemsSold || 0);
      const firestoreDiscount = Number(coupon.discountGiven || 0);
      const firestorePending = Number(coupon.commissionPending || 0);
      const firestorePaid = Number(coupon.commissionPaid || 0);

      let usageCount = 0;
      let grossRevenue = 0;
      let itemsCount = 0;
      let discountGiven = 0;
      let commissionPending = firestorePending;
      let commissionPaid = firestorePaid;

      // Reconciliação: se existem pedidos registrados na base, o valor real é a soma dos pagos!
      if (matchingAllOrders.length > 0) {
        usageCount = periodUses;
        grossRevenue = periodGross;
        itemsCount = periodItems;
        discountGiven = periodDiscount;
      } else if (periodFilter === "all") {
        usageCount = firestoreUses;
        grossRevenue = firestoreGross;
        itemsCount = firestoreItems;
        discountGiven = firestoreDiscount;
      } else {
        usageCount = periodUses;
        grossRevenue = periodGross;
        itemsCount = periodItems;
        discountGiven =
          periodDiscount > 0
            ? periodDiscount
            : (grossRevenue * (Number(coupon.discountPercent) || 10)) / 100;
      }

      const isBrand = coupon.type === "brand";
      const rate = Number(coupon.commissionRate || 8);
      const calculatedCommission = isBrand
        ? 0
        : ((grossRevenue - discountGiven) * rate) / 100;

      if (matchingAllOrders.length > 0 && !isBrand) {
        commissionPending = Math.max(0, calculatedCommission - firestorePaid);
      }

      const periodCommission = isBrand
        ? 0
        : periodFilter === "all"
          ? (matchingAllOrders.length > 0 ? calculatedCommission : commissionPending + commissionPaid)
          : calculatedCommission;

      const netProfit = isBrand
        ? Math.max(0, grossRevenue - discountGiven)
        : Math.max(0, grossRevenue - periodCommission);

      return {
        ...coupon,
        usageCount,
        grossRevenue,
        itemsSold: itemsCount,
        discountGiven,
        commissionPending,
        commissionPaid,
        netProfit: Math.max(0, netProfit),
      };
    });
  }, [coupons, filteredOrders, orders, periodFilter]);

  const metrics = useMemo(() => {
    let gross = 0;
    let discounts = 0;
    let pending = 0;
    let paid = 0;
    let totalUses = 0;
    let netProfit = 0;

    processedCoupons.forEach((c) => {
      gross += Number(c.grossRevenue || 0);
      discounts += Number(c.discountGiven || 0);
      pending += Number(c.commissionPending || 0);
      paid += Number(c.commissionPaid || 0);
      totalUses += Number(c.usageCount || 0);
      netProfit += Number(c.netProfit || 0);
    });

    return { gross, discounts, pending, paid, totalUses, netProfit };
  }, [processedCoupons]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key !== key || prev.direction === "none") {
        const initialDir =
          key === "code" || key === "partner" || key === "status"
            ? "asc"
            : "desc";
        return { key, direction: initialDir };
      }
      const isText = key === "code" || key === "partner" || key === "status";
      if (isText) {
        if (prev.direction === "asc") return { key, direction: "desc" };
        if (prev.direction === "desc") return { key: null, direction: "none" };
      } else {
        if (prev.direction === "desc") return { key, direction: "asc" };
        if (prev.direction === "asc") return { key: null, direction: "none" };
      }
      return { key: null, direction: "none" };
    });
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key || sortConfig.direction === "none") {
      return <ArrowUpDown size={12} className={styles.sortIconInactive} />;
    }
    if (sortConfig.direction === "asc") {
      return <ArrowUp size={12} className={styles.sortIconActive} />;
    }
    return <ArrowDown size={12} className={styles.sortIconActive} />;
  };

  const handleClearAllFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setStatusFilter("all");
    setSortConfig({ key: null, direction: "none" });
  };

  const displayedCoupons = useMemo(() => {
    let list = [...processedCoupons];

    // 1. Tipo
    if (typeFilter !== "all") {
      list = list.filter((c) => (c.type || "affiliate") === typeFilter);
    }

    // 2. Status
    if (statusFilter !== "all") {
      if (statusFilter === "active") list = list.filter((c) => !!c.active);
      if (statusFilter === "paused") list = list.filter((c) => !c.active);
      if (statusFilter === "pending_payout")
        list = list.filter((c) => (Number(c.commissionPending) || 0) > 0);
    }

    // 3. Busca por texto
    if (searchTerm && searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter((c) => {
        const code = String(c.code || c.id || "").toLowerCase();
        const partner = String(c.partnerName || "").toLowerCase();
        const pix = String(c.partnerPix || "").toLowerCase();
        return code.includes(q) || partner.includes(q) || pix.includes(q);
      });
    }

    // 4. Ordenação Interativa
    if (sortConfig.key && sortConfig.direction !== "none") {
      const { key, direction } = sortConfig;
      list.sort((a, b) => {
        if (key === "code") {
          const comp = String(a.code || "").localeCompare(
            String(b.code || ""),
            "pt-BR",
            { sensitivity: "base" },
          );
          return direction === "asc" ? comp : -comp;
        }
        if (key === "partner") {
          const comp = String(a.partnerName || "").localeCompare(
            String(b.partnerName || ""),
            "pt-BR",
            { sensitivity: "base" },
          );
          return direction === "asc" ? comp : -comp;
        }
        if (key === "discount") {
          const valA = Number(a.discountPercent || 0);
          const valB = Number(b.discountPercent || 0);
          return direction === "asc" ? valA - valB : valB - valA;
        }
        if (key === "sales") {
          const valA = Number(a.grossRevenue || 0);
          const valB = Number(b.grossRevenue || 0);
          return direction === "asc" ? valA - valB : valB - valA;
        }
        if (key === "pending") {
          const valA = Number(a.commissionPending || 0);
          const valB = Number(b.commissionPending || 0);
          return direction === "asc" ? valA - valB : valB - valA;
        }
        if (key === "paid") {
          const valA = Number(a.commissionPaid || 0);
          const valB = Number(b.commissionPaid || 0);
          return direction === "asc" ? valA - valB : valB - valA;
        }
        if (key === "profit") {
          const valA = Number(a.netProfit || 0);
          const valB = Number(b.netProfit || 0);
          return direction === "asc" ? valA - valB : valB - valA;
        }
        if (key === "status") {
          const valA = a.active ? 1 : 0;
          const valB = b.active ? 1 : 0;
          return direction === "asc" ? valA - valB : valB - valA;
        }
        return 0;
      });
    }

    return list;
  }, [processedCoupons, typeFilter, statusFilter, searchTerm, sortConfig]);

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
          <span className={styles.breadcrumb}>
            CMS / PARCERIAS & COMISSIONAMENTO
          </span>
          <h1 className={styles.title}>CUPONS, MARCA & REPASSES PIX</h1>
        </div>
        <div className={styles.headerActions}>
          {/* FILTRO DE PERÍODO COM SELETOR DE DATAS */}
          <div className={styles.periodControlWrapper}>
            <div className={styles.periodFilterGroup}>
              <button
                className={`${styles.filterBtn} ${periodFilter === "today" ? styles.activeFilter : ""}`}
                onClick={() => {
                  setPeriodFilter("today");
                  setShowCustomPicker(false);
                }}
              >
                Hoje
              </button>
              <button
                className={`${styles.filterBtn} ${periodFilter === "7days" ? styles.activeFilter : ""}`}
                onClick={() => {
                  setPeriodFilter("7days");
                  setShowCustomPicker(false);
                }}
              >
                7 Dias
              </button>
              <button
                className={`${styles.filterBtn} ${periodFilter === "30days" ? styles.activeFilter : ""}`}
                onClick={() => {
                  setPeriodFilter("30days");
                  setShowCustomPicker(false);
                }}
              >
                30 Dias
              </button>
              <button
                className={`${styles.filterBtn} ${periodFilter === "all" ? styles.activeFilter : ""}`}
                onClick={() => {
                  setPeriodFilter("all");
                  setShowCustomPicker(false);
                }}
              >
                Todo o Período
              </button>
              <button
                className={`${styles.filterBtn} ${styles.customPeriodBtn} ${periodFilter === "custom" ? styles.activeFilter : ""}`}
                onClick={() => setShowCustomPicker((prev) => !prev)}
                title="Filtrar por intervalo de datas personalizado"
              >
                <Calendar size={13} />
                <span>
                  {periodFilter === "custom" && customStartDate && customEndDate
                    ? `${formatShortDate(customStartDate)} - ${formatShortDate(customEndDate)}`
                    : "Datas"}
                </span>
              </button>
              <button
                onClick={fetchCoupons}
                disabled={loading}
                className={styles.refreshBtn}
                title="Sincronizar cupons e pedidos"
                aria-label="Atualizar dados"
              >
                <RefreshCw
                  size={13}
                  className={loading ? styles.spinning : ""}
                />
              </button>
            </div>

            {/* PAINEL FLUTUANTE DE SELEÇÃO DE DATA */}
            {showCustomPicker && (
              <div className={styles.customDateBar}>
                <div className={styles.dateField}>
                  <label>DE</label>
                  <input
                    type="date"
                    value={customStartDate}
                    max={customEndDate || getTodayStr()}
                    onChange={handleStartDateChange}
                    className={styles.dateInput}
                  />
                </div>
                <span className={styles.dateDivider}>—</span>
                <div className={styles.dateField}>
                  <label>ATÉ</label>
                  <input
                    type="date"
                    value={customEndDate}
                    min={customStartDate}
                    max={getTodayStr()}
                    onChange={handleEndDateChange}
                    className={styles.dateInput}
                  />
                </div>
                <button
                  onClick={handleApplyCustomDate}
                  className={styles.applyDateBtn}
                  title="Aplicar intervalo"
                >
                  <Check size={13} />
                  <span>APLICAR</span>
                </button>
                <button
                  onClick={() => setShowCustomPicker(false)}
                  className={styles.cancelDateBtn}
                  title="Fechar"
                >
                  <X size={13} />
                </button>
              </div>
            )}
          </div>

          <button onClick={handleOpenCreate} className={styles.createBtn}>
            <Plus size={14} />
            <span>NOVO CUPOM</span>
          </button>
        </div>
      </header>

      {/* KPIS */}
      <section className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>
            FATURAMENTO VIA CUPONS
            <InfoTooltip
              text="Total de vendas brutas originadas e creditadas a cupons no período selecionado."
              title="Receita por Cupons"
            />
          </span>
          <strong className={styles.kpiValue}>
            R$ {metrics.gross.toFixed(2)}
          </strong>
          <small className={styles.kpiSub}>
            {metrics.totalUses} pedidos no período
          </small>
        </div>

        <div className={`${styles.profitCard} ${styles.kpiCard}`}>
          <span className={styles.kpiLabel}>
            LUCRO LÍQUIDO THR33
            <InfoTooltip
              text="Receita bruta total subtraída dos descontos concedidos e das comissões aos parceiros no período."
              title="Caixa Real da Marca"
            />
          </span>
          <strong className={styles.kpiValue}>
            R$ {metrics.netProfit.toFixed(2)}
          </strong>
          <small className={styles.kpiSub}>Caixa real da marca</small>
        </div>

        <div
          className={`${styles.kpiCard} ${metrics.pending > 0 ? styles.pendingCard : ""}`}
        >
          <span className={styles.kpiLabel}>
            REPASSES PENDENTES (A PAGAR)
            <InfoTooltip
              text="Comissão gerada em vendas recentes que ainda não foi transferida via Pix para o parceiro."
              title="Saldo a Pagar"
            />
          </span>
          <strong className={styles.kpiValue}>
            R$ {metrics.pending.toFixed(2)}
          </strong>
          <small className={styles.kpiSub}>Comissões aguardando Pix</small>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>
            REPASSES JÁ LIQUIDADOS
            <InfoTooltip
              text="Total acumulado de comissões que já foram transferidas e comprovadas via Pix aos parceiros."
              title="Total Pago"
            />
          </span>
          <strong className={styles.kpiValue}>
            R$ {metrics.paid.toFixed(2)}
          </strong>
          <small className={styles.kpiSub}>Total transferido a parceiros</small>
        </div>
      </section>

      {/* CONTROLES */}
      <div className={styles.controlBar}>
        <div className={styles.controlBarTop}>
          <div className={styles.searchBox}>
            <Search size={14} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar por código, nome do parceiro ou chave Pix..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className={styles.clearSearchBtn}
                title="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className={styles.filtersGroup}>
            <div className={styles.filterSelectWrapper}>
              <Layers size={13} className={styles.filterSelectIcon} />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">TODOS OS TIPOS ({coupons.length})</option>
                <option value="affiliate">
                  AFILIADOS / PARCEIROS (
                  {coupons.filter((c) => c.type !== "brand").length})
                </option>
                <option value="brand">
                  CUPOM DA MARCA (
                  {coupons.filter((c) => c.type === "brand").length})
                </option>
              </select>
            </div>

            <div className={styles.filterSelectWrapper}>
              <Filter size={13} className={styles.filterSelectIcon} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">TODOS OS STATUS</option>
                <option value="pending_payout">COM REPASSE PENDENTE</option>
                <option value="active">APENAS ATIVOS</option>
                <option value="paused">APENAS PAUSADOS</option>
              </select>
            </div>
          </div>
        </div>

        <div className={styles.controlBarBottom}>
          <div className={styles.tableMetaInfo}>
            <span className={styles.tableMetaCount}>
              {displayedCoupons.length}{" "}
              {displayedCoupons.length === 1
                ? "cupom listado"
                : "cupons listados"}
              {(searchTerm || typeFilter !== "all" || statusFilter !== "all") &&
                ` (de ${coupons.length})`}
            </span>
            {(searchTerm ||
              typeFilter !== "all" ||
              statusFilter !== "all" ||
              (sortConfig.key && sortConfig.direction !== "none")) && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className={styles.resetSortBtn}
                title="Limpar todos os filtros e ordenações"
              >
                <RotateCw size={11} />
                <span>Limpar Filtros</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TABELA */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th
                onClick={() => handleSort("code")}
                className={styles.sortableTh}
                title="Clique para ordenar por Código"
              >
                <div className={styles.thSortContent}>
                  <span>CÓDIGO</span>
                  {renderSortIcon("code")}
                </div>
              </th>
              <th
                onClick={() => handleSort("partner")}
                className={styles.sortableTh}
                title="Clique para ordenar por Beneficiário"
              >
                <div className={styles.thSortContent}>
                  <span>BENEFICIÁRIO & PIX</span>
                  {renderSortIcon("partner")}
                </div>
              </th>
              <th
                onClick={() => handleSort("discount")}
                className={styles.sortableTh}
                title="Clique para ordenar por Desconto"
              >
                <div className={styles.thSortContent}>
                  <span>DESCONTO</span>
                  {renderSortIcon("discount")}
                </div>
              </th>
              <th
                onClick={() => handleSort("sales")}
                className={styles.sortableTh}
                title="Clique para ordenar por Vendas (R$)"
              >
                <div className={styles.thSortContent}>
                  <span>VENDAS (QTD/R$)</span>
                  {renderSortIcon("sales")}
                </div>
              </th>
              <th
                onClick={() => handleSort("pending")}
                className={styles.sortableTh}
                title="Clique para ordenar por Comissão Pendente"
              >
                <div className={styles.thSortContent}>
                  <span>COMISSÃO PENDENTE</span>
                  {renderSortIcon("pending")}
                </div>
              </th>
              <th
                onClick={() => handleSort("paid")}
                className={styles.sortableTh}
                title="Clique para ordenar por Total Já Pago"
              >
                <div className={styles.thSortContent}>
                  <span>TOTAL JÁ PAGO</span>
                  {renderSortIcon("paid")}
                </div>
              </th>
              <th
                onClick={() => handleSort("profit")}
                className={styles.sortableTh}
                title="Clique para ordenar por Lucro da Marca"
              >
                <div className={styles.thSortContent}>
                  <span>LUCRO MARCA</span>
                  {renderSortIcon("profit")}
                </div>
              </th>
              <th
                onClick={() => handleSort("status")}
                className={styles.sortableTh}
                title="Clique para ordenar por Status"
              >
                <div className={styles.thSortContent}>
                  <span>STATUS</span>
                  {renderSortIcon("status")}
                </div>
              </th>
              <th>EXTRATO & AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className={styles.centerText}>
                  Carregando dados do Firestore...
                </td>
              </tr>
            ) : displayedCoupons.length === 0 ? (
              <tr>
                <td colSpan="9" className={styles.centerText}>
                  {searchTerm || typeFilter !== "all" || statusFilter !== "all"
                    ? "Nenhum cupom encontrado com os filtros selecionados."
                    : 'Nenhum cupom cadastrado no Firestore. Clique em "+ NOVO CUPOM" para criar o primeiro.'}
                </td>
              </tr>
            ) : (
              displayedCoupons.map((c) => {
                const isBrand = c.type === "brand";
                const pending = Number(c.commissionPending || 0);
                const brandProfit = Number(c.netProfit || 0);

                return (
                  <tr key={c.id}>
                    <td>
                      <div className={styles.codeCellGroup}>
                        <span className={styles.couponCode}>{c.code}</span>
                        <div className={styles.ruleTagsList}>
                          {Array.isArray(c.allowedEmails) && c.allowedEmails.length > 0 && (
                            <span
                              className={`${styles.ruleMiniTag} ${styles.ruleTagVip}`}
                              title={`Restrito a: ${c.allowedEmails.join(", ")}`}
                            >
                              <Lock size={9} />
                              <span>
                                VIP ({c.allowedEmails.length}{" "}
                                {c.allowedEmails.length === 1 ? "conta" : "contas"})
                              </span>
                            </span>
                          )}
                          {Boolean(c.onlyFirstPurchase) && (
                            <span className={`${styles.ruleMiniTag} ${styles.ruleTagFirst}`}>
                              <Sparkles size={9} />
                              <span>1ª COMPRA</span>
                            </span>
                          )}
                          {Number(c.maxUsesPerUser) > 0 && (
                            <span className={styles.ruleMiniTag}>
                              <Users size={9} />
                              <span>Máx: {c.maxUsesPerUser}/pessoa</span>
                            </span>
                          )}
                          {Number(c.maxTotalUses) > 0 && (
                            <span className={styles.ruleMiniTag}>
                              <Hash size={9} />
                              <span>
                                Usos: {c.usageCount || 0}/{c.maxTotalUses}
                              </span>
                            </span>
                          )}
                          {Number(c.minOrderValue) > 0 && (
                            <span className={styles.ruleMiniTag}>
                              <span>Mín R$ {Number(c.minOrderValue).toFixed(0)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong className={styles.partnerName}>
                        {c.partnerName}
                      </strong>
                      <span
                        className={
                          isBrand ? styles.brandBadge : styles.affiliateBadge
                        }
                      >
                        {isBrand ? (
                          <>
                            <ShieldCheck size={11} />
                            <span>MARCA OFICIAL</span>
                          </>
                        ) : (
                          "PARCEIRO"
                        )}
                      </span>
                      {!isBrand && c.partnerPix && (
                        <small className={styles.pixKey}>
                          Pix: {c.partnerPix}
                        </small>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-start' }}>
                        {c.discountMode === 'free_shipping_only' ? (
                          <span className={styles.freeShipOnlyBadge}>
                            <Truck size={11} />
                            <span>FRETE GRÁTIS PURO</span>
                          </span>
                        ) : c.discountMode === 'fixed' ? (
                          <span className={styles.discountBadge}>
                            -R$ {Number(c.fixedDiscountValue || 0).toFixed(2)} OFF
                          </span>
                        ) : (
                          <span className={styles.discountBadge}>
                            -{c.discountPercent}% OFF
                          </span>
                        )}
                        {c.discountMode !== 'free_shipping_only' &&
                          Boolean(c.freeShipping || c.type === 'free_shipping') && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            letterSpacing: '0.5px',
                            padding: '0.15rem 0.45rem',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            borderRadius: '3px',
                            border: '1px solid rgba(16, 185, 129, 0.35)'
                          }}>
                            <Truck size={10} />
                            <span>+ FRETE GRÁTIS</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <strong>
                        R$ {Number(c.grossRevenue || 0).toFixed(2)}
                      </strong>
                      <small className={styles.subText}>
                        {c.usageCount || 0} pedidos ({c.itemsSold || 0} peças)
                      </small>
                    </td>
                    <td>
                      {isBrand ? (
                        <span className={styles.naText}>—</span>
                      ) : (
                        <div className={styles.pendingCol}>
                          <strong
                            className={
                              pending > 0 ? styles.pendingHighlight : ""
                            }
                          >
                            R$ {pending.toFixed(2)}
                          </strong>
                          {pending > 0 && (
                            <span className={styles.pendingAlertTag}>
                              Aguardando Pix
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      {isBrand ? (
                        <span className={styles.naText}>—</span>
                      ) : (
                        <span className={styles.paidText}>
                          R$ {Number(c.commissionPaid || 0).toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td>
                      <strong className={styles.profitHighlight}>
                        R$ {brandProfit.toFixed(2)}
                      </strong>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleStatus(c)}
                        className={`${styles.statusToggle} ${c.active ? styles.activeStatus : styles.pausedStatus}`}
                      >
                        <span
                          className={
                            c.active
                              ? styles.statusDotActive
                              : styles.statusDotPaused
                          }
                        />
                        <span>{c.active ? "Ativo" : "Pausado"}</span>
                      </button>
                    </td>
                    <td>
                      <div className={styles.actionsRow}>
                        {isBrand ? (
                          <button
                            onClick={() => handleOpenStatement(c)}
                            className={`${styles.statementBtn} ${styles.brandStatementBtn}`}
                            title="Ver detalhes, pedidos e auditoria de descontos da marca"
                          >
                            <Eye size={12} />
                            <span>Detalhes</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenStatement(c)}
                            className={styles.statementBtn}
                            title="Ver extrato e registrar transferências Pix"
                          >
                            <FileText size={12} />
                            <span>Extrato & Pix</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className={styles.editBtn}
                        >
                          <Edit size={11} />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => handleDeleteCoupon(c.id)}
                          className={styles.deleteBtn}
                          title="Remover cupom"
                        >
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
        <div
          className={styles.modalBackdrop}
          onClick={() => setStatementCoupon(null)}
        >
          <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <span className={styles.drawerTag}>
                  {statementCoupon.type === "brand"
                    ? "AUDITORIA & PERFORMANCE DE DESCONTOS MARCA"
                    : "FECHAMENTO DE COMISSÕES & AUDITORIA"}
                </span>
                <h2>
                  {statementCoupon.type === "brand"
                    ? `DETALHES DO CUPOM OFICIAL: ${statementCoupon.code}`
                    : `EXTRATO DO CUPOM: ${statementCoupon.code}`}
                </h2>
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
                <button
                  onClick={() => setStatementCoupon(null)}
                  className={styles.closeBtn}
                  aria-label="Fechar extrato"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className={styles.drawerContent}>
              {/* CARD SUPERIOR: MARCA OFICIAL OU PARCEIRO PIX */}
              {statementCoupon.type === "brand" ? (
                <div
                  className={`${styles.partnerPixCard} ${styles.brandTopCard}`}
                >
                  <div>
                    <small>ORIGEM DO CUPOM / CAMPANHA OFICIAL</small>
                    <h3>
                      {statementCoupon.partnerName || "THR33 Marca Oficial"}
                    </h3>
                    <div className={styles.pixRow}>
                      <span className={styles.brandBadgeText}>
                        Cupom Promocional Oficial da THR33 •{" "}
                        <strong>
                          {statementCoupon.discountPercent || 10}% OFF
                        </strong>{" "}
                        direto no checkout
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.partnerPixCard}>
                  <div>
                    <small>PARCEIRO / COLABORADOR</small>
                    <h3>{statementCoupon.partnerName}</h3>
                    <div className={styles.pixRow}>
                      <span>
                        Chave Pix:{" "}
                        <strong>
                          {statementCoupon.partnerPix || "Não cadastrada"}
                        </strong>
                      </span>
                      {statementCoupon.partnerPix && (
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyPix(statementCoupon.partnerPix)
                          }
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
                    <strong>
                      R${" "}
                      {(Number(statementCoupon.commissionPending) || 0).toFixed(
                        2,
                      )}
                    </strong>
                  </div>
                </div>
              )}

              {/* CARDS DE RESUMO FINANCEIRO CONSOLIDADO DO CUPOM */}
              {statementSummary && (
                <div className={styles.drawerKpiGrid}>
                  <div className={styles.drawerKpiCard}>
                    <span className={styles.drawerKpiLabel}>
                      {statementCoupon.type === "brand"
                        ? "ENTRADA BRUTA TOTAL"
                        : "FATURAMENTO TOTAL DO CUPOM"}
                    </span>
                    <strong className={styles.drawerKpiValue}>
                      R$ {statementSummary.totalGross.toFixed(2)}
                    </strong>
                    <small className={styles.drawerKpiSub}>
                      {statementSummary.totalUses}{" "}
                      {statementSummary.totalUses === 1 ? "pedido" : "pedidos"}{" "}
                      ({statementSummary.totalItems}{" "}
                      {statementSummary.totalItems === 1 ? "peça" : "peças"})
                    </small>
                  </div>

                  {statementCoupon.type === "brand" ? (
                    <div className={styles.drawerKpiCard}>
                      <span className={styles.drawerKpiLabel}>
                        TOTAL CONCEDIDO EM DESCONTOS
                      </span>
                      <strong
                        className={`${styles.drawerKpiValue} ${styles.discountText}`}
                      >
                        -R$ {statementSummary.totalDiscount.toFixed(2)}
                      </strong>
                      <small className={styles.drawerKpiSub}>
                        Margem de {statementCoupon.discountPercent || 10}%
                        absorvida pela THR33
                      </small>
                    </div>
                  ) : (
                    <div className={styles.drawerKpiCard}>
                      <span className={styles.drawerKpiLabel}>
                        TOTAL EM COMISSÕES (PARCEIRO)
                      </span>
                      <strong
                        className={`${styles.drawerKpiValue} ${styles.blueKpiValue}`}
                      >
                        R$ {statementSummary.totalCommission.toFixed(2)}
                      </strong>
                      <small className={styles.drawerKpiSub}>
                        R$ {statementSummary.totalPayoutsPaid.toFixed(2)} pago •
                        R$ {statementSummary.pendingCommission.toFixed(2)}{" "}
                        pendente
                      </small>
                    </div>
                  )}

                  <div
                    className={`${styles.drawerKpiCard} ${styles.drawerProfitCard}`}
                  >
                    <span className={styles.drawerKpiLabel}>
                      {statementCoupon.type === "brand"
                        ? "ENTRADA REAL NO CAIXA"
                        : "LUCRO LÍQUIDO REAL THR33"}
                    </span>
                    <strong
                      className={`${styles.drawerKpiValue} ${styles.greenKpiValue}`}
                    >
                      R$ {statementSummary.netProfit.toFixed(2)}
                    </strong>
                    <small className={styles.drawerKpiSub}>
                      {statementCoupon.type === "brand"
                        ? "Receita líquida retida pela marca"
                        : "Caixa real retido pela marca"}
                    </small>
                  </div>
                </div>
              )}

              {/* SE AFILIADO: FORMULÁRIO PIX E HISTÓRICO DE REPASSES */}
              {statementCoupon.type !== "brand" ? (
                <>
                  {/* FORMULÁRIO COM SELEÇÃO DO TIPO DE COMPROVANTE (PDF, IMAGEM, LINK) */}
                  <form
                    onSubmit={handleConfirmPayout}
                    className={styles.payoutForm}
                  >
                    <div className={styles.payoutFormHeader}>
                      <DollarSign size={15} />
                      <h4>REGISTRAR TRANSFERÊNCIA PIX</h4>
                    </div>

                    <div className={styles.payoutFormGrid}>
                      <div className={styles.inputGroup}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "0.25rem",
                          }}
                        >
                          <label style={{ margin: 0 }}>
                            VALOR REPASSADO (R$) *
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setPayoutAmount(
                                (
                                  Math.round(
                                    Number(
                                      statementCoupon.commissionPending || 0,
                                    ) * 100,
                                  ) / 100
                                ).toFixed(2),
                              )
                            }
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#60a5fa",
                              fontSize: "0.68rem",
                              fontWeight: "700",
                              cursor: "pointer",
                              textDecoration: "underline",
                              padding: 0,
                            }}
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
                          className={`${styles.proofTypeBtn} ${proofType === "pdf" ? styles.activeProofType : ""}`}
                          onClick={() => {
                            setProofType("pdf");
                            setProofFileData({
                              name: "",
                              dataUrl: "",
                              sizeKb: 0,
                            });
                          }}
                        >
                          <FileText size={13} />
                          <span>Arquivo PDF</span>
                        </button>

                        <button
                          type="button"
                          className={`${styles.proofTypeBtn} ${proofType === "image" ? styles.activeProofType : ""}`}
                          onClick={() => {
                            setProofType("image");
                            setProofFileData({
                              name: "",
                              dataUrl: "",
                              sizeKb: 0,
                            });
                          }}
                        >
                          <ImageIcon size={13} />
                          <span>Imagem (JPG/PNG)</span>
                        </button>

                        <button
                          type="button"
                          className={`${styles.proofTypeBtn} ${proofType === "link" ? styles.activeProofType : ""}`}
                          onClick={() => {
                            setProofType("link");
                            setProofFileData({
                              name: "",
                              dataUrl: "",
                              sizeKb: 0,
                            });
                          }}
                        >
                          <LinkIcon size={13} />
                          <span>Link Web / Nuvem</span>
                        </button>
                      </div>

                      {/* 1. INPUT PDF */}
                      {proofType === "pdf" && (
                        <div className={styles.uploadBox}>
                          <input
                            type="file"
                            id="proofPdfUpload"
                            accept="application/pdf"
                            onChange={(e) => handleProofFileUpload(e, "pdf")}
                            className={styles.fileInputHidden}
                          />
                          <label
                            htmlFor="proofPdfUpload"
                            className={styles.uploadTriggerLabel}
                          >
                            <div className={styles.uploadTriggerText}>
                              <Paperclip
                                size={13}
                                className={styles.paperclipIcon}
                              />
                              <span className={styles.pdfFilenameText}>
                                {proofFileData.name
                                  ? `${proofFileData.name} (${proofFileData.sizeKb} KB)`
                                  : "Selecionar Documento PDF..."}
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
                              onClick={() =>
                                setProofFileData({
                                  name: "",
                                  dataUrl: "",
                                  sizeKb: 0,
                                })
                              }
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
                      {proofType === "image" && (
                        <div className={styles.imageUploadArea}>
                          <div className={styles.uploadBox}>
                            <input
                              type="file"
                              id="proofImgUpload"
                              accept="image/*"
                              onChange={(e) =>
                                handleProofFileUpload(e, "image")
                              }
                              className={styles.fileInputHidden}
                            />
                            <label
                              htmlFor="proofImgUpload"
                              className={styles.uploadTriggerLabel}
                            >
                              <div className={styles.uploadTriggerText}>
                                <ImageIcon
                                  size={13}
                                  className={styles.paperclipIcon}
                                />
                                <span className={styles.pdfFilenameText}>
                                  {proofFileData.name
                                    ? `${proofFileData.name} (${proofFileData.sizeKb} KB)`
                                    : "Selecionar Foto ou Print do Comprovante..."}
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
                                onClick={() =>
                                  setProofFileData({
                                    name: "",
                                    dataUrl: "",
                                    sizeKb: 0,
                                  })
                                }
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
                              <img
                                src={proofFileData.dataUrl}
                                alt="Pré-visualização do comprovante"
                                className={styles.imgThumbnail}
                              />
                              <span className={styles.imgThumbnailLabel}>
                                Pré-visualização pronta para gravação
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 3. INPUT LINK WEB / DRIVE */}
                      {proofType === "link" && (
                        <div className={styles.linkInputWrapper}>
                          <div className={styles.linkField}>
                            <LinkIcon
                              size={14}
                              className={styles.linkIconInside}
                            />
                            <input
                              type="url"
                              placeholder="https://drive.google.com/... ou link bancário direto"
                              value={proofLinkUrl}
                              onChange={(e) => setProofLinkUrl(e.target.value)}
                              className={styles.linkInput}
                            />
                          </div>
                          <small className={styles.linkHelper}>
                            Cole o link do comprovante no Google Drive,
                            OneDrive, Dropbox ou gateway bancário.
                          </small>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={
                        processingPayout ||
                        Number(statementCoupon.commissionPending || 0) <= 0
                      }
                      className={styles.confirmPayoutBtn}
                    >
                      {processingPayout ? (
                        "PROCESSANDO..."
                      ) : (
                        <>
                          <Check size={14} />
                          <span>CONFIRMAR REPASSE COM COMPROVANTE</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* HISTÓRICO DE REPASSES COM TOTAL */}
                  <div className={styles.historySection}>
                    <div className={styles.historySectionHeader}>
                      <h4>
                        HISTÓRICO DE REPASSES PAGOS (
                        {statementSummary?.payoutsCount || 0})
                      </h4>
                      {statementSummary && (
                        <span className={styles.sectionHeaderBadge}>
                          Total Pago:{" "}
                          <strong>
                            R$ {statementSummary.totalPayoutsPaid.toFixed(2)}
                          </strong>
                        </span>
                      )}
                    </div>
                    {!statementCoupon.payoutHistory ||
                    statementCoupon.payoutHistory.length === 0 ? (
                      <p className={styles.emptyHistoryText}>
                        Nenhum repasse registrado ainda para este parceiro.
                      </p>
                    ) : (
                      <div className={styles.historyList}>
                        {statementCoupon.payoutHistory.map((p) => {
                          const hasProof = !!(p.proofUrl || p.pdfUrl);
                          const type =
                            p.proofType ||
                            (p.pdfUrl
                              ? "pdf"
                              : p.proofUrl?.startsWith("http")
                                ? "link"
                                : p.proofUrl?.startsWith("data:image")
                                  ? "image"
                                  : "pdf");
                          const label =
                            p.proofName ||
                            p.pdfName ||
                            (type === "link"
                              ? "Abrir Link Externo"
                              : type === "image"
                                ? "Ver Imagem"
                                : "Ver PDF");

                          return (
                            <div key={p.id} className={styles.historyItem}>
                              <div>
                                <strong>
                                  R$ {Number(p.amount).toFixed(2)}
                                </strong>
                                <span>{p.note}</span>
                                {hasProof && (
                                  <button
                                    type="button"
                                    onClick={() => handleViewProof(p)}
                                    className={styles.viewPdfBadge}
                                    title="Abrir ou baixar comprovante"
                                  >
                                    {type === "image" ? (
                                      <ImageIcon size={12} />
                                    ) : type === "link" ? (
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
                                <small>
                                  {new Date(p.date).toLocaleDateString("pt-BR")}
                                </small>
                                <small>Pago por: {p.admin}</small>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* BANNER INFORMATIVO PARA CUPOM DA MARCA */
                <div className={styles.brandInfoBanner}>
                  <div>
                    <h4>CUPOM OFICIAL DIRETO DA MARCA THR33</h4>
                    <p>
                      Todas as vendas vinculadas a este cupom têm o desconto de{" "}
                      {statementCoupon.discountPercent || 10}% absorvido
                      diretamente pela marca.
                    </p>
                  </div>
                </div>
              )}

              {/* PEDIDOS ATRIBUÍDOS AO CUPOM COM TOTAL E CONSOLIDAÇÃO FINANCEIRA */}
              <div className={styles.historySection}>
                <div className={styles.historySectionHeader}>
                  <h4>
                    PEDIDOS ATRIBUÍDOS AO CUPOM (
                    {statementSummary?.totalUses || 0})
                  </h4>
                  {statementSummary && (
                    <span className={styles.sectionHeaderBadge}>
                      {statementCoupon.type === "brand"
                        ? "Entrada Bruta: "
                        : "Faturamento: "}
                      <strong>
                        R$ {statementSummary.totalGross.toFixed(2)}
                      </strong>
                    </span>
                  )}
                </div>

                {statementSummary && (
                  <div className={styles.ordersSummaryBar}>
                    <div className={styles.ordersSummaryItem}>
                      <span>
                        {statementCoupon.type === "brand"
                          ? "Entrada Bruta (Preço Cheio)"
                          : "Total de Vendas"}
                      </span>
                      <strong>
                        R$ {statementSummary.totalGross.toFixed(2)}
                      </strong>
                    </div>

                    {statementCoupon.type === "brand" ? (
                      <div className={styles.ordersSummaryItem}>
                        <span>
                          Descontos Concedidos (-
                          {statementCoupon.discountPercent || 10}%)
                        </span>
                        <strong className={styles.discountText}>
                          -R$ {statementSummary.totalDiscount.toFixed(2)}
                        </strong>
                      </div>
                    ) : (
                      <div className={styles.ordersSummaryItem}>
                        <span>
                          Comissão Repassada (
                          {statementCoupon.commissionRate || 8}%)
                        </span>
                        <strong className={styles.blueText}>
                          -R$ {statementSummary.effectiveCommission.toFixed(2)}
                        </strong>
                      </div>
                    )}

                    <div className={styles.ordersSummaryItem}>
                      <span>
                        {statementCoupon.type === "brand"
                          ? "Entrada Líquida no Caixa"
                          : "Lucro Líquido Marca"}
                      </span>
                      <strong className={styles.greenText}>
                        R$ {statementSummary.netProfit.toFixed(2)}
                      </strong>
                    </div>
                  </div>
                )}

                {loadingOrders ? (
                  <p className={styles.emptyHistoryText}>
                    Carregando pedidos do Firestore...
                  </p>
                ) : statementOrders.length === 0 ? (
                  <p className={styles.emptyHistoryText}>
                    Nenhum pedido atribuído a este cupom no Firestore.
                  </p>
                ) : (
                  <div className={styles.ordersList}>
                    {statementOrders.map((ord) => (
                      <div key={ord.id} className={styles.orderItemRow}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                            <strong>
                              {ord.id} — {ord.client}
                            </strong>
                            <span 
                              style={{ 
                                fontSize: '0.62rem', 
                                fontWeight: 700, 
                                padding: '0.12rem 0.45rem', 
                                borderRadius: '2px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                backgroundColor: ord.statusMeta?.bgColor || (ord.isPaid ? 'rgba(74, 222, 128, 0.1)' : 'rgba(250, 204, 21, 0.1)'),
                                color: ord.statusMeta?.color || (ord.isPaid ? '#4ade80' : '#facc15'),
                                border: `1px solid ${ord.statusMeta?.borderColor || 'rgba(255, 255, 255, 0.1)'}`
                              }}
                            >
                              {ord.statusMeta?.label || ord.status}
                            </span>
                          </div>
                          <small>
                            {ord.date} • {ord.itemsCount}{" "}
                            {ord.itemsCount === 1 ? "peça" : "peças"}
                            {!ord.isPaid && " • Não contabilizado"}
                          </small>
                        </div>
                        <div className={styles.orderVal}>
                          {statementCoupon.type === "brand" ? (
                            <>
                              <span>
                                Bruto: R$ {ord.gross.toFixed(2)} •{" "}
                                <span className={styles.discountText}>
                                  Desconto: -R${" "}
                                  {Number(ord.discountAmount || 0).toFixed(2)}
                                </span>
                              </span>
                              <strong className={ord.isPaid ? styles.greenText : undefined} style={!ord.isPaid ? { color: '#9ca3af' } : undefined}>
                                {ord.isPaid ? `Recebido: R$ ${ord.total.toFixed(2)}` : `Pendente: R$ ${ord.total.toFixed(2)}`}
                              </strong>
                            </>
                          ) : (
                            <>
                              <span>Total: R$ {ord.total.toFixed(2)}</span>
                              <strong className={ord.isPaid ? styles.blueText : undefined} style={!ord.isPaid ? { color: '#9ca3af' } : undefined}>
                                {ord.isPaid 
                                  ? `Comissão: +R$ ${Number(ord.commission || 0).toFixed(2)}` 
                                  : `Pendente: R$ ${Number(ord.commission || 0).toFixed(2)}`}
                              </strong>
                            </>
                          )}
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
        <div
          className={styles.imageModalBackdrop}
          onClick={() => setPreviewImage(null)}
        >
          <div
            className={styles.imageModalBox}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.imageModalHeader}>
              <div>
                <h3>{previewImage.name}</h3>
                <small>
                  {previewImage.date} • R$ {previewImage.amount}
                </small>
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                className={styles.closeBtn}
              >
                <X size={18} />
              </button>
            </div>
            <div className={styles.imageModalBody}>
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className={styles.imageModalFull}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRIAÇÃO / EDIÇÃO — COUPON STUDIO */}
      {isModalOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setIsModalOpen(false)}
        >
          <div className={styles.studioModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTop}>
              <div>
                <span className={styles.studioOverline}>
                  THR33 COUPON STUDIO
                </span>
                <h2>{editingId ? "EDITAR CUPOM & REGRAS" : "CRIAR NOVO CUPOM"}</h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className={styles.closeBtn}
                aria-label="Fechar modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.studioScrollBody}>
              {/* 1. TICKET LIVE PREVIEW */}
              <div
                className={`${styles.ticketPreview} ${
                  formData.type === "brand"
                    ? styles.ticketPreviewBrand
                    : styles.ticketPreviewAffiliate
                }`}
              >
                <div className={styles.ticketStubLeft}>
                  <span className={styles.ticketTypeBadge}>
                    {formData.type === "brand" ? (
                      <>
                        <ShieldCheck size={11} />
                        <span>CUPOM MARCA</span>
                      </>
                    ) : (
                      <>
                        <Award size={11} />
                        <span>PARCEIRO PIX</span>
                      </>
                    )}
                  </span>
                  <strong className={styles.ticketCodeDisplay}>
                    {formData.code.trim() || "SEUCODIGO"}
                  </strong>
                  <small className={styles.ticketOwnerDisplay}>
                    {formData.type === "brand"
                      ? formData.partnerName || "THR33 Marca Oficial"
                      : formData.partnerName || "Nome do Parceiro"}
                  </small>
                </div>

                <div className={styles.ticketDividerLine} />

                <div className={styles.ticketMainRight}>
                  <div className={styles.ticketBenefitHeadline}>
                    {formData.discountMode === "free_shipping_only" ? (
                      <span>FRETE GRÁTIS LIBERADO</span>
                    ) : formData.discountMode === "fixed" ? (
                      <span>
                        R$ {Number(formData.fixedDiscountValue || 0).toFixed(2)} OFF
                        {formData.freeShipping ? " + FRETE GRÁTIS" : ""}
                      </span>
                    ) : (
                      <span>
                        {Number(formData.discountPercent || 0)}% OFF
                        {formData.freeShipping ? " + FRETE GRÁTIS" : ""}
                      </span>
                    )}
                  </div>

                  <div className={styles.ticketActiveRules}>
                    {formData.audienceMode === "exclusive" ? (
                      <span className={`${styles.ticketRulePill} ${styles.ticketRuleVip}`}>
                        <Lock size={10} />
                        <span>
                          VIP: {formData.allowedEmails.length}{" "}
                          {formData.allowedEmails.length === 1 ? "conta" : "contas"}
                        </span>
                      </span>
                    ) : (
                      <span className={styles.ticketRulePill}>
                        <Users size={10} />
                        <span>Público Geral</span>
                      </span>
                    )}

                    {formData.onlyFirstPurchase && (
                      <span className={`${styles.ticketRulePill} ${styles.ticketRuleHighlight}`}>
                        <Sparkles size={10} />
                        <span>1ª Compra</span>
                      </span>
                    )}

                    {Number(formData.maxUsesPerUser) > 0 && (
                      <span className={styles.ticketRulePill}>
                        <Users size={10} />
                        <span>Limite: {formData.maxUsesPerUser}x por conta</span>
                      </span>
                    )}

                    {Number(formData.maxTotalUses) > 0 && (
                      <span className={styles.ticketRulePill}>
                        <Hash size={10} />
                        <span>Global: {formData.maxTotalUses} usos</span>
                      </span>
                    )}

                    {Number(formData.minOrderValue) > 0 && (
                      <span className={styles.ticketRulePill}>
                        <span>Mín R$ {Number(formData.minOrderValue).toFixed(0)}</span>
                      </span>
                    )}

                    {Number(formData.minItemsCount) > 0 && (
                      <span className={styles.ticketRulePill}>
                        <ShoppingBag size={10} />
                        <span>Mín {formData.minItemsCount} pç(s)</span>
                      </span>
                    )}

                    {formData.validUntil && (
                      <span className={styles.ticketRulePill}>
                        <Clock size={10} />
                        <span>Até {formatShortDate(formData.validUntil)}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. PRESETS RÁPIDOS DE 1 CLIQUE */}
              <div className={styles.presetsBar}>
                <span className={styles.presetsLabel}>PRESETS RÁPIDOS:</span>
                <div className={styles.presetsPills}>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset("first_purchase")}
                    className={styles.presetPillBtn}
                  >
                    <Sparkles size={12} />
                    <span>1ª Compra (1x por Conta)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset("vip_email")}
                    className={styles.presetPillBtn}
                  >
                    <Lock size={12} />
                    <span>VIP Vinculado a E-mail</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset("affiliate_pix")}
                    className={styles.presetPillBtn}
                  >
                    <DollarSign size={12} />
                    <span>Afiliado / Parceiro Pix</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset("free_shipping")}
                    className={styles.presetPillBtn}
                  >
                    <Truck size={12} />
                    <span>Frete Grátis Puro</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSaveCoupon} className={styles.form}>
                {/* ORIGEM / CATEGORIA DO CUPOM */}
                <div className={styles.studioSectionCard}>
                  <div className={styles.studioSectionHeader}>
                    <ShieldCheck size={14} />
                    <span>MODALIDADE & COMISSIONAMENTO</span>
                    <InfoTooltip
                      text="O comissionamento de parceiros sobe automaticamente conforme as metas de peças vendidas: 1-9 peças (8%), 10-19 peças (10%), 20+ peças (15%). Cupons da marca têm 0% de repasse."
                      title="Meritocracia e Regras"
                    />
                  </div>

                  <div className={styles.typeSelector}>
                    <button
                      type="button"
                      className={`${styles.typeBtn} ${formData.type === "affiliate" ? styles.activeTypeBtn : ""}`}
                      onClick={() =>
                        setFormData({ ...formData, type: "affiliate" })
                      }
                    >
                      PARCEIRO / AFILIADO (COM COMISSÃO)
                    </button>
                    <button
                      type="button"
                      className={`${styles.typeBtn} ${formData.type === "brand" ? styles.activeTypeBtn : ""}`}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          type: "brand",
                          partnerName:
                            formData.partnerName || "THR33 Marca Oficial",
                          partnerPix: "",
                        })
                      }
                    >
                      CUPOM DA MARCA (0% COMISSÃO)
                    </button>
                  </div>

                  {formData.type === "affiliate" ? (
                    <div className={styles.gridTwo}>
                      <div className={styles.inputGroup}>
                        <label>NOME DO PARCEIRO *</label>
                        <input
                          type="text"
                          placeholder="Ex: Eduardo"
                          value={formData.partnerName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              partnerName: e.target.value,
                            })
                          }
                          required={formData.type === "affiliate"}
                        />
                      </div>
                      <div className={styles.inputGroup}>
                        <label>CHAVE PIX PARA REPASSE</label>
                        <input
                          type="text"
                          placeholder="CPF, E-mail, Telefone ou Aleatória"
                          value={formData.partnerPix}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              partnerPix: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <div className={styles.inputGroup}>
                      <label>IDENTIFICAÇÃO INTERNA DA CAMPANHA (OPCIONAL)</label>
                      <input
                        type="text"
                        placeholder="Ex: THR33 Marca Oficial / Campanha VIP"
                        value={formData.partnerName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            partnerName: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}
                </div>

                {/* BLOCO 1 — CÓDIGO & BENEFÍCIO */}
                <div className={styles.studioSectionCard}>
                  <div className={styles.studioSectionHeader}>
                    <Tag size={14} />
                    <span>BLOCO 1 — CÓDIGO & FORMATO DE BENEFÍCIO</span>
                  </div>

                  <div className={styles.inputGroup}>
                    <div className={styles.labelRowWithAction}>
                      <label>CÓDIGO DO CUPOM *</label>
                      <button
                        type="button"
                        onClick={handleGenerateRandomCode}
                        className={styles.inlineActionBtn}
                      >
                        <Shuffle size={11} />
                        <span>Gerar Aleatório</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Ex: EDU10, BEMVINDO10, VIP50"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          code: e.target.value.toUpperCase().replace(/\s+/g, ""),
                        })
                      }
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label>MODO DE BENEFÍCIO</label>
                    <div className={styles.benefitModeGrid}>
                      <button
                        type="button"
                        className={`${styles.benefitModeBtn} ${
                          formData.discountMode === "percentage"
                            ? styles.activeBenefitMode
                            : ""
                        }`}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            discountMode: "percentage",
                          })
                        }
                      >
                        <Percent size={13} />
                        <span>% Porcentagem</span>
                      </button>

                      <button
                        type="button"
                        className={`${styles.benefitModeBtn} ${
                          formData.discountMode === "fixed"
                            ? styles.activeBenefitMode
                            : ""
                        }`}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            discountMode: "fixed",
                          })
                        }
                      >
                        <DollarSign size={13} />
                        <span>R$ Valor Fixo</span>
                      </button>

                      <button
                        type="button"
                        className={`${styles.benefitModeBtn} ${
                          formData.discountMode === "free_shipping_only"
                            ? styles.activeBenefitMode
                            : ""
                        }`}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            discountMode: "free_shipping_only",
                            freeShipping: true,
                          })
                        }
                      >
                        <Truck size={13} />
                        <span>Apenas Frete Grátis</span>
                      </button>
                    </div>
                  </div>

                  {formData.discountMode === "percentage" && (
                    <div className={styles.inputGroup}>
                      <label>DESCONTO DO CLIENTE (% OFF) *</label>
                      <div className={styles.inputWithQuickBtns}>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={formData.discountPercent}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              discountPercent: e.target.value,
                            })
                          }
                          required
                        />
                        <div className={styles.quickValueBtns}>
                          {[5, 10, 15, 20, 30, 50].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  discountPercent: pct,
                                })
                              }
                              className={`${styles.quickValBtn} ${
                                Number(formData.discountPercent) === pct
                                  ? styles.activeQuickValBtn
                                  : ""
                              }`}
                            >
                              {pct}%
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.discountMode === "fixed" && (
                    <div className={styles.inputGroup}>
                      <label>VALOR FIXO DE DESCONTO (R$) *</label>
                      <div className={styles.inputWithQuickBtns}>
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          placeholder="50.00"
                          value={formData.fixedDiscountValue}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              fixedDiscountValue: e.target.value,
                            })
                          }
                          required
                        />
                        <div className={styles.quickValueBtns}>
                          {[20, 30, 50, 80, 100].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  fixedDiscountValue: val,
                                })
                              }
                              className={`${styles.quickValBtn} ${
                                Number(formData.fixedDiscountValue) === val
                                  ? styles.activeQuickValBtn
                                  : ""
                              }`}
                            >
                              R$ {val}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.discountMode !== "free_shipping_only" && (
                    <div className={styles.toggleFeatureCard}>
                      <label className={styles.toggleFeatureLabel}>
                        <input
                          type="checkbox"
                          checked={Boolean(formData.freeShipping)}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              freeShipping: e.target.checked,
                            })
                          }
                        />
                        <div>
                          <span
                            className={
                              formData.freeShipping
                                ? styles.toggleTitleActive
                                : styles.toggleTitle
                            }
                          >
                            ACUMULAR FRETE GRÁTIS NESTE CUPOM
                          </span>
                          <small className={styles.toggleSub}>
                            Zera o valor do frete no carrinho e checkout sem cancelar o desconto configurado acima.
                          </small>
                        </div>
                      </label>
                    </div>
                  )}
                </div>

                {/* BLOCO 2 — PÚBLICO-ALVO & VÍNCULO DE CONTA */}
                <div className={styles.studioSectionCard}>
                  <div className={styles.studioSectionHeader}>
                    <Lock size={14} />
                    <span>BLOCO 2 — PÚBLICO-ALVO & VÍNCULO DE CONTA</span>
                  </div>

                  <div className={styles.typeSelector}>
                    <button
                      type="button"
                      className={`${styles.typeBtn} ${
                        formData.audienceMode === "public"
                          ? styles.activeTypeBtn
                          : ""
                      }`}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          audienceMode: "public",
                          allowedEmails: [],
                        })
                      }
                    >
                      <Users size={12} />
                      <span>PÚBLICO GERAL (QUALQUER CONTA)</span>
                    </button>

                    <button
                      type="button"
                      className={`${styles.typeBtn} ${
                        formData.audienceMode === "exclusive"
                          ? styles.activeTypeBtn
                          : ""
                      }`}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          audienceMode: "exclusive",
                        })
                      }
                    >
                      <Lock size={12} />
                      <span>EXCLUSIVO PARA CONTAS (E-MAILS)</span>
                    </button>
                  </div>

                  {formData.audienceMode === "exclusive" && (
                    <div className={styles.exclusiveEmailsBox}>
                      <label>
                        CONTAS AUTORIZADAS (DIGITE O E-MAIL E PRESSIONE ENTER OU +)
                      </label>
                      <div className={styles.emailAdderRow}>
                        <input
                          type="email"
                          placeholder="cliente@email.com (ou vários separados por vírgula)"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddAllowedEmail();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAddAllowedEmail}
                          className={styles.addEmailChipBtn}
                        >
                          <Plus size={13} />
                          <span>Adicionar</span>
                        </button>
                      </div>

                      {formData.allowedEmails.length > 0 ? (
                        <div className={styles.emailChipsContainer}>
                          {formData.allowedEmails.map((em) => (
                            <span key={em} className={styles.emailChip}>
                              <Lock size={10} />
                              <span>{em}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveAllowedEmail(em)}
                                className={styles.removeChipBtn}
                                title="Remover conta"
                              >
                                <X size={11} />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <small className={styles.emptyEmailsHint}>
                          Nenhum e-mail adicionado ainda. Apenas os clientes listados aqui poderão aplicar este cupom.
                        </small>
                      )}
                    </div>
                  )}

                  <div className={styles.toggleFeatureCard}>
                    <label className={styles.toggleFeatureLabel}>
                      <input
                        type="checkbox"
                        checked={Boolean(formData.onlyFirstPurchase)}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            onlyFirstPurchase: e.target.checked,
                          })
                        }
                      />
                      <div>
                        <span
                          className={
                            formData.onlyFirstPurchase
                              ? styles.toggleTitleActivePurple
                              : styles.toggleTitle
                          }
                        >
                          VÁLIDO APENAS NA 1ª COMPRA DO CLIENTE
                        </span>
                        <small className={styles.toggleSub}>
                          Bloqueia o uso se a conta (UID ou E-mail) já possuir qualquer pedido válido anterior na THR33.
                        </small>
                      </div>
                    </label>
                  </div>
                </div>

                {/* BLOCO 3 — LIMITES DE USO & REGRAS DE ESCASSEZ */}
                <div className={styles.studioSectionCard}>
                  <div className={styles.studioSectionHeader}>
                    <Clock size={14} />
                    <span>BLOCO 3 — LIMITES DE USO & REGRAS DE ESCASSEZ</span>
                  </div>

                  <div className={styles.gridTwo}>
                    <div className={styles.inputGroup}>
                      <label>LIMITE DE USOS POR CLIENTE (CONTA)</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Ilimitado"
                        value={formData.maxUsesPerUser}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            maxUsesPerUser: e.target.value,
                          })
                        }
                      />
                      <div className={styles.quickValueBtns}>
                        {[
                          { label: "1x", val: 1 },
                          { label: "2x", val: 2 },
                          { label: "3x", val: 3 },
                          { label: "Ilimitado", val: "" },
                        ].map((opt) => (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                maxUsesPerUser: opt.val,
                              })
                            }
                            className={`${styles.quickValBtn} ${
                              String(formData.maxUsesPerUser || "") ===
                              String(opt.val)
                                ? styles.activeQuickValBtn
                                : ""
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={styles.inputGroup}>
                      <label>LIMITE GLOBAL DO CUPOM (TOTAL NA LOJA)</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Ilimitado (ex: 50 para Drop)"
                        value={formData.maxTotalUses}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            maxTotalUses: e.target.value,
                          })
                        }
                      />
                      <div className={styles.quickValueBtns}>
                        {[
                          { label: "10", val: 10 },
                          { label: "50", val: 50 },
                          { label: "100", val: 100 },
                          { label: "Ilimitado", val: "" },
                        ].map((opt) => (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                maxTotalUses: opt.val,
                              })
                            }
                            className={`${styles.quickValBtn} ${
                              String(formData.maxTotalUses || "") ===
                              String(opt.val)
                                ? styles.activeQuickValBtn
                                : ""
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className={styles.gridTwo}>
                    <div className={styles.inputGroup}>
                      <label>PEDIDO MÍNIMO (R$)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00 (Sem mínimo)"
                        value={formData.minOrderValue}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            minOrderValue: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className={styles.inputGroup}>
                      <label>MÍNIMO DE PEÇAS NO CARRINHO</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0 (Sem mínimo)"
                        value={formData.minItemsCount}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            minItemsCount: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className={styles.gridTwo}>
                    <div className={styles.inputGroup}>
                      <label>DATA DE INÍCIO (OPCIONAL)</label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            startDate: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className={styles.inputGroup}>
                      <label>DATA DE EXPIRAÇÃO (OPCIONAL)</label>
                      <input
                        type="date"
                        value={formData.validUntil}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            validUntil: e.target.value,
                          })
                        }
                      />
                      <div className={styles.quickValueBtns}>
                        <button
                          type="button"
                          onClick={() => handleExpirationShortcut(1)}
                          className={styles.quickValBtn}
                        >
                          +24h
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExpirationShortcut(7)}
                          className={styles.quickValBtn}
                        >
                          +7 dias
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExpirationShortcut(30)}
                          className={styles.quickValBtn}
                        >
                          +30 dias
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExpirationShortcut(null)}
                          className={`${styles.quickValBtn} ${
                            !formData.validUntil ? styles.activeQuickValBtn : ""
                          }`}
                        >
                          Sem fim
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.studioFooterActions}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={styles.cancelStudioBtn}
                  >
                    CANCELAR
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className={styles.submitBtn}
                  >
                    {saving
                      ? "SALVANDO NO FIRESTORE..."
                      : editingId
                        ? "SALVAR ALTERAÇÕES DO CUPOM"
                        : "CRIAR E ATIVAR CUPOM"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CmsCupons;
