import React, { useEffect, useState } from 'react';
import { useTickets } from '../hooks/useTickets';
import AgentDecision from '../components/AgentDecision';
import ApprovalButtons from '../components/ApprovalButtons';
import { ChevronLeft, Mail, Phone, Calendar, User, ShieldAlert, Edit2 } from 'lucide-react';

export default function TicketDetail({ ticketId, onBack }) {
  const { currentTicket, loading, error, fetchTicketById, approveTicket, rejectTicket } = useTickets();
  const [draftReply, setDraftReply] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!ticketId) return;

    let cancelled = false;
    let pollTimer;

    const load = async () => {
      const ticket = await fetchTicketById(ticketId);
      if (cancelled || !ticket) return;

      setDraftReply(ticket.draft_reply || '');

      if (ticket.status === 'processing' || ticket.status === 'pending') {
        pollTimer = setTimeout(load, 3000);
      }
    };

    load();

    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
    };
  }, [ticketId, fetchTicketById]);

  const handleApprove = async () => {
    setActionLoading(true);
    setSuccessMsg('');
    try {
      await approveTicket(currentTicket.id, draftReply);
      setSuccessMsg('Response approved and transmitted successfully!');
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (reason) => {
    setActionLoading(true);
    setSuccessMsg('');
    try {
      await rejectTicket(currentTicket.id, reason);
      setSuccessMsg('Draft rejected. Ticket escalated to support team!');
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && !currentTicket) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="loader" />
        <style dangerouslySetInnerHTML={{__html: `
          .loader {
            border: 4px solid var(--border-color);
            border-top: 4px solid var(--primary);
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}} />
      </div>
    );
  }

  if (error && !currentTicket) {
    return (
      <div style={{ padding: '20px' }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: '20px' }}>
          <ChevronLeft size={16} /> Back to Dashboard
        </button>
        <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--color-rejected)' }}>
          <h3>Error Loading Ticket</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!currentTicket) return null;

  const isEditable = currentTicket.status === 'awaiting_approval';
  const showMetaRow = currentTicket.customer_name || currentTicket.customer_phone || currentTicket.created_at;

  return (
    <div className="detail-page">
      <style dangerouslySetInnerHTML={{__html: `
        .detail-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
        }
        .detail-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 32px;
          align-items: start;
        }
        @media (max-width: 1024px) {
          .detail-grid {
            grid-template-columns: 1fr;
          }
        }
        .ticket-info-panel {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .meta-list {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          padding: 16px;
          background: rgba(31, 41, 55, 0.3);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-sm);
        }
        .meta-list-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        .ticket-description {
          padding: 24px;
          background: rgba(17, 24, 39, 0.3);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-md);
          min-height: 200px;
        }
        .description-body {
          color: var(--text-primary);
          font-size: 1rem;
          line-height: 1.6;
          white-space: pre-wrap;
          margin-top: 16px;
        }
        .response-editor-card {
          border-top: 4px solid var(--color-awaiting);
        }
        .response-editor-card.sent {
          border-top-color: var(--color-sent);
        }
        .response-editor-card.rejected {
          border-top-color: var(--color-rejected);
        }
      `}} />

      {/* Back Link Header */}
      <div className="detail-header">
        <button className="btn btn-secondary" onClick={onBack} style={{ padding: '8px 12px' }}>
          <ChevronLeft size={16} />
          <span>Back</span>
        </button>
        <span className="badge badge-pending">Ticket Detail</span>
      </div>

      {successMsg && (
        <div className="card" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'var(--color-sent)', marginBottom: '24px' }}>
          <p style={{ color: '#34d399', fontWeight: 500 }}>{successMsg}</p>
        </div>
      )}

      {/* Main Grid View */}
      <div className="detail-grid">
        
        {/* Left Side: Ticket Metadata & Description */}
        <div className="ticket-info-panel">
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <h1 style={{ fontSize: '1.6rem', color: 'white', fontWeight: 700 }}>
                {currentTicket.subject}
              </h1>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className={`badge badge-${currentTicket.status}`}>
                  {currentTicket.status}
                </span>
                {currentTicket.customer_tier && (
                  <span className={`badge tier-${currentTicket.customer_tier}`}>
                    {currentTicket.customer_tier}
                  </span>
                )}
              </div>
            </div>

            {showMetaRow && (
              <div className="meta-list">
                {currentTicket.customer_name && (
                  <div className="meta-list-item">
                    <User size={15} style={{ color: 'var(--primary)' }} />
                    <span>{currentTicket.customer_name}</span>
                  </div>
                )}
                {currentTicket.customer_phone && (
                  <div className="meta-list-item">
                    {currentTicket.source === 'whatsapp' ? (
                      <Phone size={15} style={{ color: '#10b981' }} />
                    ) : (
                      <Mail size={15} style={{ color: 'var(--primary)' }} />
                    )}
                    <span>{currentTicket.customer_phone}</span>
                  </div>
                )}
                <div className="meta-list-item">
                  <Calendar size={15} />
                  <span>{formatDate(currentTicket.created_at)}</span>
                </div>
              </div>
            )}

            <div className="ticket-description">
              <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ticket Description</h3>
              <p className="description-body">{currentTicket.body}</p>
            </div>
          </div>

          {/* Action Response Draft Box */}
          <div className={`card response-editor-card ${currentTicket.status}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Edit2 size={18} style={{ color: 'var(--color-awaiting)' }} />
              <h3 style={{ fontSize: '1.1rem' }}>
                {isEditable ? 'Compose Response' : currentTicket.status === 'sent' ? 'Sent Response' : 'Draft Response'}
              </h3>
            </div>

            <div className="form-group">
              {isEditable ? (
                <textarea
                  className="form-textarea"
                  value={draftReply}
                  onChange={(e) => setDraftReply(e.target.value)}
                  placeholder="Draft your support reply here..."
                  style={{ minHeight: '220px', lineHeight: '1.6' }}
                />
              ) : (
                <div 
                  className="reasoning-text" 
                  style={{ 
                    minHeight: '120px', 
                    background: 'rgba(31, 41, 55, 0.4)', 
                    borderColor: 'var(--border-color)',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {currentTicket.final_reply || currentTicket.draft_reply || 'No draft generated.'}
                </div>
              )}
            </div>

            <ApprovalButtons
              status={currentTicket.status}
              loading={actionLoading}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          </div>
        </div>

        {/* Right Side: AI Agent Classifier Details */}
        <div className="ticket-agent-panel">
          <AgentDecision decision={currentTicket} />
        </div>

      </div>
    </div>
  );
}
