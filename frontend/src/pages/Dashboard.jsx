import React, { useEffect, useState } from 'react';
import { useTickets } from '../hooks/useTickets';
import TicketCard from '../components/TicketCard';
import { 
  Inbox, 
  Hourglass, 
  CheckCircle, 
  XOctagon, 
  RefreshCw, 
  Plus, 
  Send, 
  X, 
  FileText,
  AlertTriangle
} from 'lucide-react';

export default function Dashboard({ onSelectTicket }) {
  const { tickets, loading, error, fetchTickets, createTicket, deleteTicket } = useTickets();
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Create ticket form state
  const [formSubject, setFormSubject] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formTier, setFormTier] = useState('free');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(null);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleRefresh = () => {
    fetchTickets();
  };

  // Calculate statistics from all tickets
  const totalCount = tickets.length;
  const pendingCount = tickets.filter(t => t.status === 'pending' || t.status === 'processing').length;
  const awaitingCount = tickets.filter(t => t.status === 'awaiting_approval').length;
  const sentCount = tickets.filter(t => t.status === 'sent').length;
  const rejectedCount = tickets.filter(t => t.status === 'rejected' || t.status === 'failed').length;

  // Filter tickets for current display
  const filteredTickets = tickets.filter(ticket => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return ticket.status === 'pending' || ticket.status === 'processing';
    if (activeTab === 'awaiting') return ticket.status === 'awaiting_approval';
    if (activeTab === 'sent') return ticket.status === 'sent';
    if (activeTab === 'rejected') return ticket.status === 'rejected' || ticket.status === 'failed';
    return true;
  });

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    if (!formSubject.trim() || !formBody.trim()) return;

    setFormSubmitting(true);
    setFormSuccess(null);
    try {
      await createTicket({
        subject: formSubject,
        body: formBody,
        customer_email: formEmail || null,
        customer_tier: formTier
      });
      
      setFormSuccess('Ticket submitted and queued successfully!');
      setFormSubject('');
      setFormBody('');
      setFormEmail('');
      setFormTier('free');
      
      // Refresh tickets list
      fetchTickets();
      
      // Auto close modal after 1.5s
      setTimeout(() => {
        setShowCreateModal(false);
        setFormSuccess(null);
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteTicket = async (ticket) => {
    const confirmed = window.confirm(`Delete ticket "${ticket.subject}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteTicket(ticket.id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="dashboard-container">
      <style dangerouslySetInnerHTML={{__html: `
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }
        .header-title h1 {
          font-size: 2rem;
          font-weight: 800;
          color: white;
        }
        .header-title p {
          font-size: 0.95rem;
          color: var(--text-secondary);
          margin-top: 4px;
        }
        .header-actions {
          display: flex;
          gap: 12px;
        }
        .tabs-bar {
          display: flex;
          gap: 8px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 16px;
          margin-bottom: 24px;
        }
        .tab-pill {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 8px 16px;
          border-radius: 9999px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tab-pill:hover {
          color: var(--text-primary);
          background: rgba(31, 41, 55, 0.4);
        }
        .tab-pill.active {
          color: white;
          background: rgba(79, 70, 229, 0.15);
          border: 1px solid rgba(79, 70, 229, 0.3);
        }
        .tab-pill .tab-count {
          font-size: 0.75rem;
          background: rgba(31, 41, 55, 0.8);
          color: var(--text-secondary);
          padding: 2px 6px;
          border-radius: 9999px;
        }
        .tab-pill.active .tab-count {
          background: var(--primary);
          color: white;
        }
        .tickets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }
        .empty-state {
          text-align: center;
          padding: 80px 40px;
          background: var(--bg-card);
          border: 1px dashed var(--border-color);
          border-radius: var(--border-radius-lg);
          color: var(--text-secondary);
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }
        .modal-container {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-lg);
          width: 100%;
          max-width: 500px;
          padding: 32px;
          box-shadow: var(--shadow-lg);
          position: relative;
        }
        .modal-close {
          position: absolute;
          top: 24px;
          right: 24px;
          cursor: pointer;
          color: var(--text-muted);
          transition: color 0.2s ease;
        }
        .modal-close:hover {
          color: white;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />

      {/* Page Header */}
      <div className="page-header">
        <div className="header-title">
          <h1>Support Tickets</h1>
          <p>Supervise incoming issues and approve AI-generated draft responses.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleRefresh} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            <span>Mock Ticket</span>
          </button>
        </div>
      </div>

      {/* Stats Counter Row */}
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-icon" style={{ color: 'var(--text-primary)' }}>
            <Inbox size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Tickets</span>
            <span className="stat-value">{totalCount}</span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon" style={{ color: 'var(--color-processing)' }}>
            <Hourglass size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">In AI Queue</span>
            <span className="stat-value">{pendingCount}</span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon" style={{ color: 'var(--color-awaiting)' }}>
            <AlertTriangle size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Needs Review</span>
            <span className="stat-value">{awaitingCount}</span>
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-icon" style={{ color: 'var(--color-sent)' }}>
            <CheckCircle size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Replied / Sent</span>
            <span className="stat-value">{sentCount}</span>
          </div>
        </div>
      </div>

      {/* Filtering Tabs */}
      <div className="tabs-bar">
        <button 
          className={`tab-pill ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <span>All</span>
          <span className="tab-count">{totalCount}</span>
        </button>
        <button 
          className={`tab-pill ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          <span>AI Queue</span>
          <span className="tab-count">{pendingCount}</span>
        </button>
        <button 
          className={`tab-pill ${activeTab === 'awaiting' ? 'active' : ''}`}
          onClick={() => setActiveTab('awaiting')}
        >
          <span>Needs Review</span>
          <span className="tab-count">{awaitingCount}</span>
        </button>
        <button 
          className={`tab-pill ${activeTab === 'sent' ? 'active' : ''}`}
          onClick={() => setActiveTab('sent')}
        >
          <span>Replied</span>
          <span className="tab-count">{sentCount}</span>
        </button>
        <button 
          className={`tab-pill ${activeTab === 'rejected' ? 'active' : ''}`}
          onClick={() => setActiveTab('rejected')}
        >
          <span>Failed / Rej.</span>
          <span className="tab-count">{rejectedCount}</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--color-rejected)', marginBottom: '24px' }}>
          <p style={{ color: '#f87171' }}><strong>Error:</strong> {error}</p>
        </div>
      )}

      {/* Tickets Grid */}
      {filteredTickets.length > 0 ? (
        <div className="tickets-grid">
          {filteredTickets.map(ticket => (
            <TicketCard 
              key={ticket.id} 
              ticket={ticket} 
              onClick={() => onSelectTicket(ticket.id)}
              onDelete={handleDeleteTicket}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Inbox size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h2>No tickets found</h2>
          <p style={{ marginTop: '8px' }}>
            {activeTab === 'all' 
              ? 'No tickets exist in the system yet.' 
              : `There are no tickets matching the "${activeTab}" status.`}
          </p>
        </div>
      )}

      {/* Submit Mock Ticket Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <X className="modal-close" onClick={() => setShowCreateModal(false)} />
            <h2 style={{ marginBottom: '24px' }}>Create Test Ticket</h2>
            
            {formSuccess && (
              <div className="card" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'var(--color-sent)', marginBottom: '20px', padding: '12px' }}>
                <p style={{ color: '#34d399', fontSize: '0.9rem' }}>{formSuccess}</p>
              </div>
            )}

            <form onSubmit={handleSubmitTicket}>
              <div className="form-group">
                <label className="form-label">Subject</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Login page fails with status 500" 
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Message Details (Body)</label>
                <textarea 
                  className="form-textarea" 
                  placeholder="Describe the issue here..." 
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">Customer Email (Optional)</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="email@company.com" 
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Service Tier</label>
                  <select 
                    className="form-select"
                    value={formTier}
                    onChange={(e) => setFormTier(e.target.value)}
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowCreateModal(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={formSubmitting}
                  style={{ flex: 2 }}
                >
                  {formSubmitting ? 'Queueing...' : 'Submit to AI Queue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
