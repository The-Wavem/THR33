import React, { useState, useEffect, useMemo } from 'react';
import { 
  Headphones, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RotateCw, 
  ArrowRight, 
  Search, 
  X, 
  User, 
  Package, 
  Save, 
  FileText 
} from 'lucide-react';
import { supportService } from '../../services/supportService';
import InfoTooltip from '../../components/ui/InfoTooltip';
import styles from './CmsSuporte.module.css';

export function CmsSuporte() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [adminReply, setAdminReply] = useState('');
  const [newStatus, setNewStatus] = useState('EM_ANALISE');
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const loadTickets = async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      const data = await supportService.getAllTickets();
      setTickets(data);
    } catch (err) {
      console.error("Erro ao carregar chamados:", err);
      setTickets([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  // Trava a rolagem do fundo (eixo Y) quando o drawer de detalhes estiver aberto
  useEffect(() => {
    if (selectedTicket) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [selectedTicket]);

  const filteredTickets = useMemo(() => {
    let list = [...tickets];

    if (filterStatus !== 'ALL') {
      list = list.filter(t => t.status === filterStatus);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(t => {
        const id = (t.id || '').toLowerCase();
        const orderId = (t.orderId || '').toLowerCase();
        const name = (t.customerName || '').toLowerCase();
        const email = (t.customerEmail || '').toLowerCase();
        const reason = (t.reason || '').toLowerCase();
        const prod = (t.productName || '').toLowerCase();
        return id.includes(q) || orderId.includes(q) || name.includes(q) || email.includes(q) || reason.includes(q) || prod.includes(q);
      });
    }

    return list;
  }, [tickets, filterStatus, searchTerm]);

  const kpis = useMemo(() => {
    return {
      open: tickets.filter(t => t.status === 'ABERTO').length,
      inAnalysis: tickets.filter(t => t.status === 'EM_ANALISE').length,
      resolved: tickets.filter(t => t.status === 'RESOLVIDO').length,
      recused: tickets.filter(t => t.status === 'RECUSADO').length,
      total: tickets.length
    };
  }, [tickets]);

  const handleOpenDetail = (tkt) => {
    setSelectedTicket(tkt);
    setAdminReply(tkt.adminNotes || '');
    setNewStatus(tkt.status || 'EM_ANALISE');
  };

  const handleSaveResolution = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;

    setSaving(true);
    try {
      await supportService.updateTicketStatus(
        selectedTicket.id,
        selectedTicket.orderId,
        newStatus,
        adminReply
      );

      setSelectedTicket(null);
      await loadTickets();
    } catch (err) {
      alert("Erro ao salvar resolução do chamado.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <span className={styles.breadcrumb}>CMS // ATENDIMENTO & PÓS-VENDA</span>
          <h1 className={styles.title}>SAC, TROCAS & GESTÃO DE CHAMADOS</h1>
        </div>
        <div className={styles.headerNav}>
          <button 
            className={`${styles.filterBtn} ${filterStatus === 'ALL' ? styles.activeFilter : ''}`}
            onClick={() => setFilterStatus('ALL')}
          >
            <span>Todos</span>
            <small>({kpis.total})</small>
          </button>
          <button 
            className={`${styles.filterBtn} ${filterStatus === 'ABERTO' ? styles.activeFilter : ''}`}
            onClick={() => setFilterStatus('ABERTO')}
          >
            <AlertCircle size={13} color="#f87171" />
            <span>Abertos</span>
            <small>({kpis.open})</small>
          </button>
          <button 
            className={`${styles.filterBtn} ${filterStatus === 'EM_ANALISE' ? styles.activeFilter : ''}`}
            onClick={() => setFilterStatus('EM_ANALISE')}
          >
            <Clock size={13} color="#facc15" />
            <span>Em Análise</span>
            <small>({kpis.inAnalysis})</small>
          </button>
          <button 
            className={`${styles.filterBtn} ${filterStatus === 'RESOLVIDO' ? styles.activeFilter : ''}`}
            onClick={() => setFilterStatus('RESOLVIDO')}
          >
            <CheckCircle2 size={13} color="#4ade80" />
            <span>Resolvidos</span>
            <small>({kpis.resolved})</small>
          </button>
          <button 
            onClick={loadTickets} 
            disabled={refreshing} 
            className={styles.refreshBtn}
            title="Atualizar Chamados"
          >
            <RotateCw size={14} className={refreshing ? styles.spinning : ''} />
          </button>
        </div>
      </header>

      {/* KPIS CARDS */}
      <div className={styles.kpisGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>CHAMADOS PENDENTES</span>
            <AlertCircle size={15} color="#f87171" />
          </div>
          <strong className={styles.kpiValue} style={{ color: kpis.open > 0 ? '#f87171' : 'inherit' }}>
            {kpis.open}
          </strong>
          <small className={styles.kpiSub}>Aguardando primeira resposta</small>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>EM ANÁLISE / FORNECEDOR</span>
            <Clock size={15} color="#facc15" />
          </div>
          <strong className={styles.kpiValue} style={{ color: '#facc15' }}>
            {kpis.inAnalysis}
          </strong>
          <small className={styles.kpiSub}>Tratativa ou produção em andamento</small>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>RESOLVIDOS COM SUCESSO</span>
            <CheckCircle2 size={15} color="#4ade80" />
          </div>
          <strong className={styles.kpiValue} style={{ color: '#4ade80' }}>
            {kpis.resolved}
          </strong>
          <small className={styles.kpiSub}>Trocas, envios ou reembolsos efetuados</small>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>TOTAL HISTÓRICO SAC</span>
            <Headphones size={15} color="#60a5fa" />
          </div>
          <strong className={styles.kpiValue}>
            {kpis.total}
          </strong>
          <small className={styles.kpiSub}>Tickets registrados no Firestore</small>
        </div>
      </div>

      {/* TABELA DE CHAMADOS */}
      <section className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID CHAMADO</th>
              <th>CLIENTE & CONTATO</th>
              <th>PEDIDO & PEÇA</th>
              <th>MOTIVO DA SOLICITAÇÃO</th>
              <th>STATUS PEDIDO</th>
              <th>STATUS SAC</th>
              <th>DATA</th>
              <th>AÇÃO</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className={styles.centerText}>Buscando chamados do Firestore...</td></tr>
            ) : filteredTickets.length === 0 ? (
              <tr><td colSpan="8" className={styles.centerText}>Nenhum chamado de suporte encontrado nesta categoria.</td></tr>
            ) : (
              filteredTickets.map(tkt => (
                <tr key={tkt.id}>
                  <td>
                    <div className={styles.ticketIdCell}>
                      <strong className={styles.ticketIdText}>{tkt.id}</strong>
                    </div>
                  </td>
                  <td>
                    <strong>{tkt.customerName}</strong>
                    <small className={styles.subText}>{tkt.customerEmail}</small>
                    {tkt.customerPhone && <small className={styles.subText}>{tkt.customerPhone}</small>}
                  </td>
                  <td>
                    <strong>#{tkt.orderId?.slice(0, 8)?.toUpperCase()}</strong>
                    <small className={styles.subText}>{tkt.productName} {tkt.productSize ? `(${tkt.productSize})` : ''}</small>
                  </td>
                  <td>
                    <span className={styles.reasonTag}>{tkt.reason}</span>
                  </td>
                  <td>
                    <span className={styles.orderStatusTag}>
                      {tkt.orderStatusAtOpen || 'PAGAMENTO_APROVADO'}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.statusPill} ${styles[`status_${tkt.status}`]}`}>
                      {tkt.status === 'ABERTO' && <AlertCircle size={11} />}
                      {tkt.status === 'EM_ANALISE' && <Clock size={11} />}
                      {tkt.status === 'RESOLVIDO' && <CheckCircle2 size={11} />}
                      {tkt.status === 'RECUSADO' && <XCircle size={11} />}
                      <span>
                        {tkt.status === 'ABERTO' ? 'ABERTO' : (tkt.status === 'EM_ANALISE' ? 'EM ANÁLISE' : (tkt.status === 'RESOLVIDO' ? 'RESOLVIDO' : 'RECUSADO'))}
                      </span>
                    </span>
                  </td>
                  <td>
                    <small>{tkt.createdAt ? new Date(tkt.createdAt).toLocaleDateString('pt-BR') : 'Hoje'}</small>
                  </td>
                  <td>
                    <button onClick={() => handleOpenDetail(tkt)} className={styles.actionBtn}>
                      <span>Atender</span>
                      <ArrowRight size={12} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* DRAWER DE ATENDIMENTO E RESOLUÇÃO */}
      {selectedTicket && (
        <div className={styles.modalBackdrop} onClick={() => setSelectedTicket(null)}>
          <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerTop}>
              <div className={styles.drawerTopInfo}>
                <span className={styles.breadcrumb}>ATENDIMENTO TÁTICO SAC</span>
                <h2>CHAMADO {selectedTicket.id}</h2>
              </div>
              <button onClick={() => setSelectedTicket(null)} className={styles.closeBtn} aria-label="Fechar">
                <X size={18} />
              </button>
            </div>

            <div className={styles.drawerContent}>
              <div className={styles.ticketDetailsBox}>
                <div className={styles.infoRow}>
                  <span>Cliente:</span>
                  <strong>{selectedTicket.customerName} ({selectedTicket.customerEmail})</strong>
                </div>
                {selectedTicket.customerPhone && (
                  <div className={styles.infoRow}>
                    <span>Telefone / WhatsApp:</span>
                    <strong>{selectedTicket.customerPhone}</strong>
                  </div>
                )}
                <div className={styles.infoRow}>
                  <span>Pedido & Item:</span>
                  <strong>#{selectedTicket.orderId} • {selectedTicket.productName} ({selectedTicket.productSize})</strong>
                </div>
                <div className={styles.infoRow}>
                  <span>Motivo Registrado:</span>
                  <strong className={styles.reasonHighlight}>{selectedTicket.reason}</strong>
                </div>
                <div className={styles.infoRow}>
                  <span>Status do Pedido na Abertura:</span>
                  <strong>{selectedTicket.orderStatusAtOpen}</strong>
                </div>
                <div className={styles.messageBox}>
                  <span>Mensagem e Relato do Cliente:</span>
                  <p>"{selectedTicket.message}"</p>
                </div>
              </div>

              <form onSubmit={handleSaveResolution} className={styles.resolutionForm}>
                <div className={styles.formGroup}>
                  <label>Status do Atendimento *</label>
                  <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                    <option value="ABERTO">🚨 Aberto (Aguardando Resposta / Triagem)</option>
                    <option value="EM_ANALISE">⏳ Em Análise / Fornecedor Parceiro Acionado</option>
                    <option value="RESOLVIDO">✅ Resolvido (Troca / Reenvio / Estorno Efetuado)</option>
                    <option value="RECUSADO">❌ Recusado (Fora da Garantia / Não Aplicável)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Anotações Internas & Resolução *</label>
                  <textarea 
                    rows="5" 
                    placeholder="Instruções de postagem reversa, código de rastreamento da nova peça, estorno ou justificativa..."
                    value={adminReply}
                    onChange={(e) => setAdminReply(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" disabled={saving} className={styles.saveResolutionBtn}>
                  <Save size={15} />
                  <span>{saving ? 'GRAVANDO RESOLUÇÃO NO FIRESTORE...' : 'SALVAR RESOLUÇÃO DO SAC'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CmsSuporte;
