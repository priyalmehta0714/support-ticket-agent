import React, { useState } from 'react';
import { Brain, ShieldAlert, Award, ExternalLink, HelpCircle, FileText, ChevronDown, ChevronUp } from 'lucide-react';

export default function AgentDecision({ decision }) {
  const [showDocs, setShowDocs] = useState(false);
  
  if (decision?.status === 'failed') {
    return (
      <div className="card empty-decision" style={{ textAlign: 'center', padding: '32px', borderColor: 'var(--color-rejected)' }}>
        <ShieldAlert size={36} style={{ color: 'var(--color-rejected)', marginBottom: '12px' }} />
        <h3>AI Processing Failed</h3>
        <p style={{ fontSize: '0.9rem', marginTop: '8px', color: 'var(--text-secondary)' }}>
          The Python agent could not process this ticket. Check that <code>OPENAI_API_KEY</code> in{' '}
          <code>python-agent/.env</code> is valid, then restart Docker and submit a new ticket.
        </p>
      </div>
    );
  }

  if (!decision || (!decision.classification && !decision.urgency)) {
    const isProcessing = decision?.status === 'processing' || decision?.status === 'pending';

    return (
      <div className="card empty-decision" style={{ textAlign: 'center', padding: '32px' }}>
        <Brain size={36} className="pulse-icon" style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
        <h3>{isProcessing ? 'Waiting for AI Analysis' : 'No AI Analysis Yet'}</h3>
        <p style={{ fontSize: '0.9rem', marginTop: '8px' }}>
          {isProcessing
            ? 'This ticket is queued or being processed by the Python AI agent.'
            : 'OpenAI analysis has not run for this ticket yet.'}
        </p>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes pulse-scale {
            0%, 100% { transform: scale(1); opacity: 0.6; }
            50% { transform: scale(1.1); opacity: 1; }
          }
          .pulse-icon {
            animation: pulse-scale 2s infinite ease-in-out;
          }
        `}} />
      </div>
    );
  }

  const confidencePct = (decision.confidence * 100).toFixed(0);
  const isHighConfidence = decision.confidence >= 0.85;

  // Retrieved docs are typically stored as JSON array in retrieved_docs
  let docs = [];
  if (decision.retrieved_docs) {
    try {
      docs = typeof decision.retrieved_docs === 'string'
        ? JSON.parse(decision.retrieved_docs)
        : decision.retrieved_docs;
    } catch (e) {
      console.error('Error parsing retrieved docs:', e);
    }
  }

  return (
    <div className="card decision-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <style dangerouslySetInnerHTML={{__html: `
        .decision-card {
          border-left: 4px solid var(--primary);
        }
        .decision-header {
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 16px;
        }
        .decision-metric-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .metric-box {
          background: rgba(31, 41, 55, 0.4);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-sm);
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .metric-title {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.05em;
        }
        .metric-val {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .confidence-meter {
          margin-top: 16px;
        }
        .meter-bar-bg {
          height: 6px;
          background: rgba(31, 41, 55, 0.8);
          border-radius: 9999px;
          overflow: hidden;
          margin-top: 8px;
        }
        .meter-bar-fill {
          height: 100%;
          border-radius: 9999px;
          transition: width 0.5s ease-out;
        }
        .reasoning-text {
          font-size: 0.9rem;
          color: var(--text-secondary);
          background: rgba(31, 41, 55, 0.2);
          border-radius: var(--border-radius-sm);
          padding: 14px;
          border: 1px solid rgba(55, 65, 81, 0.2);
          line-height: 1.6;
          white-space: pre-wrap;
        }
        .langfuse-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 8px;
          cursor: pointer;
          transition: color 0.2s ease;
        }
        .langfuse-link:hover {
          color: var(--primary);
        }
        .retrieved-docs-section {
          border-top: 1px solid var(--border-color);
          padding-top: 16px;
        }
        .docs-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          user-select: none;
        }
        .docs-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 12px;
        }
        .doc-item {
          background: rgba(31, 41, 55, 0.3);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-sm);
          padding: 10px 14px;
        }
        .doc-title {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .doc-content {
          font-size: 0.8rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }
      `}} />

      <div className="decision-header">
        <Brain size={20} style={{ color: 'var(--primary)' }} />
        <h2 style={{ fontSize: '1.15rem' }}>AI Agent Classification</h2>
      </div>

      <div className="decision-metric-row">
        <div className="metric-box">
          <span className="metric-title">Category</span>
          <span className="metric-val">{decision.classification || 'Unclassified'}</span>
        </div>
        <div className="metric-box">
          <span className="metric-title">Urgency</span>
          <span className={`badge urgency-${decision.urgency}`} style={{ alignSelf: 'flex-start', marginTop: '4px' }}>
            {decision.urgency || 'Unknown'}
          </span>
        </div>
      </div>

      <div className="confidence-meter">
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Confidence Score</span>
          <span style={{ fontWeight: 600, color: isHighConfidence ? 'var(--color-sent)' : 'var(--color-awaiting)' }}>
            {confidencePct}% {isHighConfidence ? '(Auto-send Capable)' : '(Needs Review)'}
          </span>
        </div>
        <div className="meter-bar-bg">
          <div 
            className="meter-bar-fill" 
            style={{ 
              width: `${confidencePct}%`,
              background: isHighConfidence ? 'var(--color-sent)' : 'var(--color-awaiting)'
            }} 
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Agent Reasoning:</h4>
        <div className="reasoning-text">
          {decision.reasoning || 'No explanation available.'}
        </div>
      </div>

      {decision.langfuse_trace_id && (
        <a 
          href={`https://cloud.langfuse.com/project/your-project/traces/${decision.langfuse_trace_id}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="langfuse-link"
        >
          <ExternalLink size={12} />
          <span>Audit in Langfuse Trace: {decision.langfuse_trace_id.substring(0, 8)}...</span>
        </a>
      )}

      {docs.length > 0 && (
        <div className="retrieved-docs-section">
          <div className="docs-header" onClick={() => setShowDocs(!showDocs)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600 }}>
              <FileText size={16} style={{ color: 'var(--text-secondary)' }} />
              <span>Reference Documents ({docs.length})</span>
            </div>
            {showDocs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>

          {showDocs && (
            <div className="docs-list">
              {docs.map((doc, idx) => (
                <div key={idx} className="doc-item">
                  <div className="doc-title">
                    <HelpCircle size={12} style={{ color: 'var(--primary)' }} />
                    <span>{doc.title || `Vector Source #${idx + 1}`}</span>
                  </div>
                  <div className="doc-content">
                    {doc.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
