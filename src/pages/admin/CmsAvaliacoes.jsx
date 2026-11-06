import React, { useState, useEffect, useMemo } from 'react';
import { 
  Star, 
  Check, 
  X, 
  Trash2, 
  Search, 
  RefreshCw, 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  MessageSquare,
  Package,
  RotateCcw
} from 'lucide-react';
import { reviewService } from '../../services/reviewService';
import styles from './CmsAvaliacoes.module.css';

export function CmsAvaliacoes() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('pendente'); // Foco inicial nas pendentes
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Escuta avaliações do Firestore em tempo real
  useEffect(() => {
    setLoading(true);
    const unsubscribe = reviewService.subscribeAllReviews((list) => {
      setReviews(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Métricas / KPIs
  const stats = useMemo(() => {
    const total = reviews.length;
    const pending = reviews.filter(r => r.status === 'pendente').length;
    const approved = reviews.filter(r => r.status === 'aprovada').length;
    const rejected = reviews.filter(r => r.status === 'rejeitada').length;

    const approvedList = reviews.filter(r => r.status === 'aprovada');
    const avgScore = approvedList.length > 0
      ? (approvedList.reduce((acc, curr) => acc + (curr.rating || 5), 0) / approvedList.length).toFixed(1)
      : '5.0';

    return { total, pending, approved, rejected, avgScore };
  }, [reviews]);

  // Filtragem de dados
  const filteredReviews = useMemo(() => {
    return reviews.filter(review => {
      // Filtro de status
      if (activeFilter !== 'todas' && review.status !== activeFilter) {
        return false;
      }

      // Busca por texto
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const prodName = (review.productName || '').toLowerCase();
        const author = (review.author || '').toLowerCase();
        const comment = (review.comment || '').toLowerCase();
        const orderNum = (review.orderNumber || review.orderId || '').toLowerCase();
        return prodName.includes(query) || author.includes(query) || comment.includes(query) || orderNum.includes(query);
      }

      return true;
    });
  }, [reviews, activeFilter, searchTerm]);

  // Ações de moderação
  const handleApprove = async (reviewId) => {
    setProcessingId(reviewId);
    try {
      await reviewService.updateReviewStatus(reviewId, 'aprovada');
      showFeedback('Avaliação aprovada e publicada com sucesso na vitrine.');
    } catch (err) {
      console.error("Erro ao aprovar avaliação:", err);
      showFeedback('Erro ao aprovar avaliação. Tente novamente.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (reviewId) => {
    setProcessingId(reviewId);
    try {
      await reviewService.updateReviewStatus(reviewId, 'rejeitada');
      showFeedback('Avaliação marcada como rejeitada.');
    } catch (err) {
      console.error("Erro ao rejeitar avaliação:", err);
      showFeedback('Erro ao rejeitar avaliação.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRevertToPending = async (reviewId) => {
    setProcessingId(reviewId);
    try {
      await reviewService.updateReviewStatus(reviewId, 'pendente');
      showFeedback('Avaliação retornada para fila de pendentes.');
    } catch (err) {
      console.error("Erro ao reverter avaliação:", err);
      showFeedback('Erro ao reverter avaliação.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (reviewId) => {
    const ok = window.confirm("Excluir permanentemente esta avaliação do banco de dados? Esta ação não pode ser desfeita.");
    if (!ok) return;

    setProcessingId(reviewId);
    try {
      await reviewService.deleteReview(reviewId);
      showFeedback('Avaliação excluída permanentemente.');
    } catch (err) {
      console.error("Erro ao excluir avaliação:", err);
      showFeedback('Erro ao excluir avaliação.');
    } finally {
      setProcessingId(null);
    }
  };

  const showFeedback = (msg) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  return (
    <div className={styles.container}>
      {/* CABEÇALHO */}
      <header className={styles.header}>
        <div>
          <span className={styles.breadcrumb}>MODERAÇÃO // COMUNIDADE</span>
          <h1 className={styles.title}>GESTÃO DE AVALIAÇÕES</h1>
          <p className={styles.subtitle}>
            Pré-aprove ou rejeite os feedbacks reais submetidos pelos compradores da THR33 antes de publicá-los no catálogo oficial. Conformidade com as normas da LGPD.
          </p>
        </div>

        <div className={styles.headerNav}>
          <button 
            type="button" 
            onClick={() => window.location.reload()} 
            className={styles.refreshBtn}
            title="Recarregar dados"
          >
            <RefreshCw size={14} className={loading ? styles.spinning : ''} />
            <span>SINCRONIZAR</span>
          </button>
        </div>
      </header>

      {/* FEEDBACK TEMPORÁRIO */}
      {actionFeedback && (
        <div style={{
          backgroundColor: 'rgba(74, 222, 128, 0.1)',
          border: '1px solid rgba(74, 222, 128, 0.3)',
          color: '#4ade80',
          padding: '0.75rem 1.25rem',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: 700
        }}>
          <CheckCircle2 size={16} />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* CARDS DE MÉTRICAS (KPIS) */}
      <section className={styles.kpisGrid} aria-label="Métricas de Avaliações">
        <div className={`${styles.kpiCard} ${stats.pending > 0 ? styles.kpiPendingCard : ''}`}>
          <span className={styles.kpiLabel}>Aguardando Moderação</span>
          <span className={styles.kpiValue}>{stats.pending}</span>
          <span className={styles.kpiSub}>Requerem ação do administrador</span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Aprovadas (Na Loja)</span>
          <span className={styles.kpiValue}>{stats.approved}</span>
          <span className={styles.kpiSub}>Visíveis no catálogo público</span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Média de Satisfação</span>
          <span className={styles.kpiValue}>{stats.avgScore} / 5</span>
          <span className={styles.kpiSub}>Com base nas peças aprovadas</span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Total de Registros</span>
          <span className={styles.kpiValue}>{stats.total}</span>
          <span className={styles.kpiSub}>{stats.rejected} rejeitadas</span>
        </div>
      </section>

      {/* BARRA DE FERRAMENTAS E FILTROS */}
      <section className={styles.toolbar}>
        <div className={styles.filterTabs}>
          <button 
            type="button" 
            onClick={() => setActiveFilter('pendente')}
            className={`${styles.tabBtn} ${activeFilter === 'pendente' ? styles.activeTab : ''}`}
          >
            <span>Pendentes</span>
            <span className={`${styles.tabBadge} ${stats.pending > 0 ? styles.tabBadgePending : ''}`}>
              {stats.pending}
            </span>
          </button>

          <button 
            type="button" 
            onClick={() => setActiveFilter('aprovada')}
            className={`${styles.tabBtn} ${activeFilter === 'aprovada' ? styles.activeTab : ''}`}
          >
            <span>Aprovadas</span>
            <span className={styles.tabBadge}>{stats.approved}</span>
          </button>

          <button 
            type="button" 
            onClick={() => setActiveFilter('rejeitada')}
            className={`${styles.tabBtn} ${activeFilter === 'rejeitada' ? styles.activeTab : ''}`}
          >
            <span>Rejeitadas</span>
            <span className={styles.tabBadge}>{stats.rejected}</span>
          </button>

          <button 
            type="button" 
            onClick={() => setActiveFilter('todas')}
            className={`${styles.tabBtn} ${activeFilter === 'todas' ? styles.activeTab : ''}`}
          >
            <span>Todas</span>
            <span className={styles.tabBadge}>{stats.total}</span>
          </button>
        </div>

        <div className={styles.searchBox}>
          <Search size={14} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Buscar por peça, cliente, pedido ou comentário..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </section>

      {/* LISTA DE AVALIAÇÕES */}
      <section className={styles.reviewsList}>
        {loading ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>Carregando avaliações do Firestore...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className={styles.emptyState}>
            <MessageSquare size={32} color="var(--text-muted)" />
            <h2 className={styles.emptyTitle}>Nenhuma Avaliação Encontrada</h2>
            <p className={styles.emptyText}>
              {searchTerm 
                ? `Nenhum registro corresponde aos termos "${searchTerm}".`
                : activeFilter === 'pendente'
                  ? 'Todas as avaliações já foram moderadas. Nenhuma pendência no momento.'
                  : `Nenhuma avaliação com status "${activeFilter}".`}
            </p>
          </div>
        ) : (
          filteredReviews.map((rev) => {
            const isProcessing = processingId === rev.id;

            return (
              <article key={rev.id} className={styles.reviewCard}>
                {/* TOPO DO CARD */}
                <header className={styles.reviewCardHeader}>
                  <div className={styles.productPreview}>
                    {rev.productImage && (
                      <img 
                        src={rev.productImage} 
                        alt={rev.productName} 
                        className={styles.productThumb} 
                      />
                    )}
                    <div className={styles.productMeta}>
                      <strong className={styles.productTitle}>{rev.productName}</strong>
                      <span className={styles.productVariant}>
                        {rev.variant || `Tamanho: ${rev.size || 'M'}`}
                      </span>
                    </div>
                  </div>

                  <div className={styles.authorMeta}>
                    <div className={styles.authorNameRow}>
                      <span className={styles.authorName}>{rev.author}</span>
                      {rev.verifiedPurchase && (
                        <span className={styles.verifiedBadge}>
                          <ShieldCheck size={11} />
                          Comprador Verificado
                        </span>
                      )}
                    </div>
                    {rev.authorMaskedEmail && (
                      <span className={styles.authorMasked}>E-mail: {rev.authorMaskedEmail}</span>
                    )}
                    <span className={styles.orderRefBadge}>Pedido: #{rev.orderNumber || rev.orderId}</span>
                    <span className={styles.dateText}>
                      Enviado em {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Data recente'}
                    </span>
                  </div>
                </header>

                {/* CORPO DA AVALIAÇÃO */}
                <div className={styles.reviewBody}>
                  <div className={styles.ratingRow}>
                    <div className={styles.starsContainer}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          size={15} 
                          fill={star <= (rev.rating || 5) ? "#ffffff" : "none"} 
                          color={star <= (rev.rating || 5) ? "#ffffff" : "#525252"} 
                        />
                      ))}
                    </div>
                    <span className={styles.ratingValue}>{rev.rating || 5} de 5 estrelas</span>
                  </div>

                  <blockquote className={styles.reviewQuote}>
                    "{rev.comment}"
                  </blockquote>
                </div>

                {/* RODAPÉ DO CARD COM AÇÕES DE MODERAÇÃO */}
                <footer className={styles.reviewFooter}>
                  <div>
                    {rev.status === 'pendente' && (
                      <span className={`${styles.statusPill} ${styles.statusPending}`}>
                        <Clock size={12} />
                        Pendente de Moderação
                      </span>
                    )}
                    {rev.status === 'aprovada' && (
                      <span className={`${styles.statusPill} ${styles.statusApproved}`}>
                        <CheckCircle2 size={12} />
                        Aprovada (Visível na Loja)
                      </span>
                    )}
                    {rev.status === 'rejeitada' && (
                      <span className={`${styles.statusPill} ${styles.statusRejected}`}>
                        <XCircle size={12} />
                        Rejeitada (Oculta)
                      </span>
                    )}
                  </div>

                  <div className={styles.actionButtons}>
                    {rev.status !== 'aprovada' && (
                      <button 
                        type="button" 
                        onClick={() => handleApprove(rev.id)} 
                        disabled={isProcessing}
                        className={styles.approveBtn}
                        title="Aprovar e publicar esta avaliação na loja"
                      >
                        <Check size={14} />
                        <span>APROVAR</span>
                      </button>
                    )}

                    {rev.status !== 'rejeitada' && (
                      <button 
                        type="button" 
                        onClick={() => handleReject(rev.id)} 
                        disabled={isProcessing}
                        className={styles.rejectBtn}
                        title="Rejeitar esta avaliação"
                      >
                        <X size={14} />
                        <span>REJEITAR</span>
                      </button>
                    )}

                    {rev.status !== 'pendente' && (
                      <button 
                        type="button" 
                        onClick={() => handleRevertToPending(rev.id)} 
                        disabled={isProcessing}
                        className={styles.revertBtn}
                        title="Retornar para análise pendente"
                      >
                        <RotateCcw size={12} />
                        <span>PENDENTE</span>
                      </button>
                    )}

                    <button 
                      type="button" 
                      onClick={() => handleDelete(rev.id)} 
                      disabled={isProcessing}
                      className={styles.deleteBtn}
                      title="Excluir permanentemente"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </footer>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}

export default CmsAvaliacoes;
