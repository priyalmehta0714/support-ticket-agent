import React, { useState } from 'react';
import { Ticket, BookOpen, BrainCircuit } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import TicketDetail from './pages/TicketDetail';
import KnowledgeBase from './pages/KnowledgeBase';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  const navigateTo = (page, ticketId = null) => {
    setCurrentPage(page);
    setSelectedTicketId(ticketId);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard 
            onSelectTicket={(id) => navigateTo('ticket-details', id)} 
          />
        );
      case 'ticket-details':
        return (
          <TicketDetail 
            ticketId={selectedTicketId} 
            onBack={() => navigateTo('dashboard')} 
          />
        );
      case 'knowledge-base':
        return <KnowledgeBase />;
      default:
        return <Dashboard onSelectTicket={(id) => navigateTo('ticket-details', id)} />;
    }
  };

  return (
    <div className="app-container">
      <style dangerouslySetInnerHTML={{__html: `
        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 40px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 20px;
        }
        .logo-icon {
          color: var(--primary);
        }
        .logo-text {
          font-size: 1.2rem;
          font-family: var(--font-heading);
          font-weight: 800;
          letter-spacing: -0.03em;
          background: linear-gradient(to right, #818cf8, #3b82f6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .sidebar-menu {
          display: flex;
          flex-direction: column;
          gap: 8px;
          list-style: none;
        }
        .menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: var(--border-radius-sm);
          color: var(--text-secondary);
          font-weight: 500;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .menu-item:hover {
          color: var(--text-primary);
          background: rgba(31, 41, 55, 0.4);
        }
        .menu-item.active {
          color: white;
          background: var(--primary);
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
        }
        .sidebar-footer {
          margin-top: auto;
          font-size: 0.75rem;
          color: var(--text-muted);
          border-top: 1px solid var(--border-color);
          padding-top: 16px;
          text-align: center;
        }
      `}} />

      <aside className="sidebar">
        <div className="sidebar-logo">
          <BrainCircuit className="logo-icon" size={26} />
          <span className="logo-text">Aegis AI</span>
        </div>

        <ul className="sidebar-menu">
          <li 
            className={`menu-item ${currentPage === 'dashboard' || currentPage === 'ticket-details' ? 'active' : ''}`}
            onClick={() => navigateTo('dashboard')}
          >
            <Ticket size={18} />
            <span>Tickets</span>
          </li>
          <li 
            className={`menu-item ${currentPage === 'knowledge-base' ? 'active' : ''}`}
            onClick={() => navigateTo('knowledge-base')}
          >
            <BookOpen size={18} />
            <span>Knowledge Base</span>
          </li>
        </ul>

        <div className="sidebar-footer">
          <span>Aegis Support v1.0.0</span>
        </div>
      </aside>

      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}
