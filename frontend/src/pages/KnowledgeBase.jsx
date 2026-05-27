import React, { useEffect, useState } from 'react';
import { useTickets } from '../hooks/useTickets';
import { BookOpen, Plus, Search, Tag, FileText, ChevronRight, Loader, Award } from 'lucide-react';

export default function KnowledgeBase() {
  const { knowledgeBase, loading, error, fetchKnowledgeBase, createKnowledgeEntry } = useTickets();
  
  // Search and group filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchKnowledgeBase();
  }, [fetchKnowledgeBase]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSubmitting(true);
    setSuccessMsg('');
    try {
      await createKnowledgeEntry({ title, content, category });
      setSuccessMsg('Article successfully vectorized and saved!');
      setTitle('');
      setContent('');
      setCategory('General');
      fetchKnowledgeBase();
      
      // Auto close form drawer after 2s
      setTimeout(() => {
        setShowAddForm(false);
        setSuccessMsg('');
      }, 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Group names lists
  const categories = ['All', 'Bug', 'Billing', 'Feature Request', 'General'];

  // Filtered knowledge articles
  const filteredArticles = knowledgeBase.filter(article => {
    const matchesSearch = 
      article.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      article.content?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = 
      selectedCategory === 'All' || 
      article.category?.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="kb-container">
      <style dangerouslySetInnerHTML={{__html: `
        .kb-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }
        .kb-controls {
          display: grid;
          grid-template-columns: 1fr 200px;
          gap: 16px;
          margin-bottom: 24px;
        }
        @media (max-width: 768px) {
          .kb-controls {
            grid-template-columns: 1fr;
          }
        }
        .search-wrapper {
          position: relative;
        }
        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }
        .search-input {
          padding-left: 42px;
        }
        .kb-category-filter {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .articles-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .article-card {
          border-left: 2px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .article-card:hover {
          border-left-color: var(--primary);
        }
        .article-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }
        .category-tag {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          background: rgba(31, 41, 55, 0.6);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          padding: 2px 8px;
          border-radius: 4px;
        }
        .kb-layout {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 32px;
          align-items: start;
        }
        @media (max-width: 1024px) {
          .kb-layout {
            grid-template-columns: 1fr;
          }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />

      {/* Header Banner */}
      <div className="kb-header">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'white' }}>Knowledge Base</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Store FAQ materials to help the AI agent construct correct responses.
          </p>
        </div>
        {!showAddForm && (
          <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
            <Plus size={16} />
            <span>Add Article</span>
          </button>
        )}
      </div>

      {/* Layout Split: Search List & Add Form */}
      <div className="kb-layout">
        
        {/* Left Side: Search, Filter & List */}
        <div>
          {/* Controls */}
          <div className="kb-controls">
            <div className="search-wrapper">
              <Search className="search-icon" size={18} />
              <input 
                type="text" 
                className="form-input search-input" 
                placeholder="Search FAQ titles and contents..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <select 
              className="form-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map((cat, index) => (
                <option key={index} value={cat}>{cat} (Category)</option>
              ))}
            </select>
          </div>

          {/* List display */}
          {loading && knowledgeBase.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <Loader className="spin" size={24} style={{ color: 'var(--primary)' }} />
            </div>
          ) : filteredArticles.length > 0 ? (
            <div className="articles-list">
              {filteredArticles.map(article => (
                <div key={article.id} className="card article-card">
                  <div className="article-card-header">
                    <h3 style={{ fontSize: '1.05rem', color: 'white' }}>{article.title}</h3>
                    <span className="category-tag">{article.category || 'General'}</span>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                    {article.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '60px 40px', borderStyle: 'dashed' }}>
              <BookOpen size={40} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
              <h3>No Articles Found</h3>
              <p style={{ marginTop: '8px', fontSize: '0.9rem' }}>Try modifying your category filters or search queries.</p>
            </div>
          )}
        </div>

        {/* Right Side: Vector Ingestion Form Drawer */}
        {showAddForm && (
          <div className="card" style={{ position: 'sticky', top: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.25rem', color: 'white' }}>Ingest FAQ Document</h2>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowAddForm(false)} 
                style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}
              >
                Hide Form
              </button>
            </div>

            {successMsg && (
              <div className="card" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'var(--color-sent)', marginBottom: '20px', padding: '12px' }}>
                <p style={{ color: '#34d399', fontSize: '0.85rem', fontWeight: 500 }}>{successMsg}</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Article Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Refund policy for annual licenses" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Classification Category</label>
                <select 
                  className="form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="Bug">Bug</option>
                  <option value="Billing">Billing</option>
                  <option value="Feature Request">Feature Request</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Factual Content (Answer Body)</label>
                <textarea 
                  className="form-textarea" 
                  placeholder="Provide precise factual content that the AI agent can use to draft responses..." 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  style={{ minHeight: '160px' }}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={submitting}
                style={{ width: '100%', padding: '12px', marginTop: '12px' }}
              >
                {submitting ? (
                  <>
                    <Loader className="spin" size={14} />
                    <span>Creating Embeddings...</span>
                  </>
                ) : (
                  <>
                    <Award size={16} />
                    <span>Vectorize FAQ Article</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
