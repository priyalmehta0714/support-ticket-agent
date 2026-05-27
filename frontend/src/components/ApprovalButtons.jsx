import React, { useState } from 'react';
import { Check, X, ShieldAlert, Loader } from 'lucide-react';

export default function ApprovalButtons({ status, onApprove, onReject, loading }) {
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  if (status === 'sent') {
    return (
      <div className="card approval-success" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'var(--color-sent)' }}>
        <Check size={20} style={{ color: 'var(--color-sent)' }} />
        <div>
          <h4 style={{ color: 'var(--color-sent)' }}>Approved &amp; Response Sent</h4>
          <p style={{ fontSize: '0.85rem', marginTop: '2px' }}>This ticket has been completed and the reply was successfully transmitted.</p>
        </div>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="card approval-rejected" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--color-rejected)' }}>
        <X size={20} style={{ color: 'var(--color-rejected)' }} />
        <div>
          <h4 style={{ color: 'var(--color-rejected)' }}>Draft Rejected &amp; Escalated</h4>
          <p style={{ fontSize: '0.85rem', marginTop: '2px' }}>The AI draft was rejected. A Slack alert has been dispatched for manual intervention.</p>
        </div>
      </div>
    );
  }

  if (status === 'processing') {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Loader className="spin" size={20} style={{ color: 'var(--color-processing)' }} />
        <div>
          <h4>AI Agent is Processing</h4>
          <p style={{ fontSize: '0.85rem' }}>Analyzing details, retrieving references, and drafting response...</p>
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin-loader {
            to { transform: rotate(360deg); }
          }
          .spin {
            animation: spin-loader 1s linear infinite;
          }
        `}} />
      </div>
    );
  }

  if (status !== 'awaiting_approval') {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <style dangerouslySetInnerHTML={{__html: `
        .action-bar {
          display: flex;
          gap: 12px;
        }
        .reject-reason-box {
          background: rgba(31, 41, 55, 0.3);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-sm);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
      `}} />

      {!rejecting ? (
        <div className="action-bar">
          <button 
            className="btn btn-success" 
            onClick={onApprove} 
            disabled={loading}
            style={{ flex: 1, padding: '14px' }}
          >
            {loading ? <Loader className="spin" size={16} /> : <Check size={18} />}
            <span>Approve &amp; Send Response</span>
          </button>
          
          <button 
            className="btn btn-secondary" 
            onClick={() => setRejecting(true)} 
            disabled={loading}
            style={{ border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171' }}
          >
            <X size={18} />
            <span>Reject Draft</span>
          </button>
        </div>
      ) : (
        <div className="reject-reason-box">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <ShieldAlert size={16} style={{ color: '#f87171' }} />
            <h4 style={{ fontSize: '0.9rem', color: '#f87171' }}>Rejection Reason</h4>
          </div>
          
          <textarea 
            className="form-textarea"
            placeholder="Explain why you are rejecting this draft. This will be posted to the Slack engineering alert..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            style={{ minHeight: '80px', fontSize: '0.85rem' }}
          />

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                setRejecting(false);
                setRejectReason('');
              }}
              disabled={loading}
              style={{ padding: '8px 16px', fontSize: '0.8rem' }}
            >
              Cancel
            </button>
            <button 
              className="btn btn-danger" 
              onClick={() => onReject(rejectReason)}
              disabled={loading || !rejectReason.trim()}
              style={{ padding: '8px 16px', fontSize: '0.8rem' }}
            >
              {loading ? <Loader className="spin" size={12} /> : null}
              Confirm Rejection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
