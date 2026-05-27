import React from 'react';
import { MessageSquare, Phone, Calendar, Trash2 } from 'lucide-react';

export default function TicketCard({ ticket, onClick, onDelete }) {
  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'processing': return 'AI Processing';
      case 'awaiting_approval': return 'Needs Review';
      case 'sent': return 'Replied / Sent';
      case 'rejected': return 'Rejected';
      case 'failed': return 'Failed';
      default: return status;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isWhatsApp = ticket.source === 'whatsapp';
  
  return (
    <div className="card ticket-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }} onClick={onClick}>
      <style dangerouslySetInnerHTML={{__html: `
        .ticket-card {
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        .ticket-card::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          width: 4px;
          background: var(--primary);
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .ticket-card:hover::before {
          opacity: 1;
        }
        .ticket-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
          gap: 12px;
        }
        .ticket-title {
          font-size: 1.05rem;
          color: var(--text-primary);
          font-weight: 600;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.4;
        }
        .ticket-body-preview {
          font-size: 0.875rem;
          color: var(--text-secondary);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin-bottom: 16px;
          flex-grow: 1;
        }
        .ticket-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 0.8rem;
          color: var(--text-muted);
          border-top: 1px solid var(--border-color);
          padding-top: 12px;
          align-items: center;
        }
        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .ticket-tags {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .confidence-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .confidence-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .ticket-delete-btn {
          position: absolute;
          right: 14px;
          bottom: 14px;
          width: 32px;
          height: 32px;
          border-radius: 9999px;
          border: 1px solid rgba(239, 68, 68, 0.25);
          background: rgba(127, 29, 29, 0.2);
          color: #fca5a5;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: all 0.2s ease;
        }
        .ticket-card:hover .ticket-delete-btn {
          opacity: 1;
        }
        .ticket-delete-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.45);
          color: #fecaca;
        }
      `}} />
      
      <div className="ticket-header">
        <span className={`badge badge-${ticket.status}`}>
          {getStatusLabel(ticket.status)}
        </span>
        
        {ticket.customer_tier && (
          <span className={`badge tier-${ticket.customer_tier}`}>
            {ticket.customer_tier}
          </span>
        )}
      </div>

      <h3 className="ticket-title">{ticket.subject}</h3>
      <p className="ticket-body-preview">{ticket.body}</p>

      {/* AI Decision Tags if classified */}
      {(ticket.classification || ticket.urgency) && (
        <div className="ticket-tags">
          {ticket.classification && (
            <span className="badge" style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#a5b4fc', border: '1px solid rgba(79, 70, 229, 0.2)' }}>
              {ticket.classification}
            </span>
          )}
          {ticket.urgency && (
            <span className={`badge urgency-${ticket.urgency}`}>
              {ticket.urgency}
            </span>
          )}
        </div>
      )}

      <div className="ticket-meta">
        <div className="meta-item">
          {isWhatsApp ? <Phone size={13} /> : <MessageSquare size={13} />}
          <span>{isWhatsApp ? 'WhatsApp' : 'Web'}</span>
        </div>
        
        <div className="meta-item">
          <Calendar size={13} />
          <span>{formatDate(ticket.created_at)}</span>
        </div>

        {ticket.confidence !== null && ticket.confidence !== undefined && (
          <div className="confidence-indicator" style={{ marginLeft: 'auto' }}>
            <div 
              className="confidence-dot" 
              style={{ 
                background: ticket.confidence >= 0.85 ? 'var(--color-sent)' : 'var(--color-awaiting)' 
              }} 
            />
            <span>{(ticket.confidence * 100).toFixed(0)}% Match</span>
          </div>
        )}
      </div>

      {onDelete && (
        <button
          type="button"
          className="ticket-delete-btn"
          title="Delete ticket"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(ticket);
          }}
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}
