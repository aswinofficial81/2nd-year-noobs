import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  BookOpen,
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface SearchContextItem {
  title: string;
  artifactId: string;
  chunkId?: string;
  pageNumber?: number;
  content: string;
  type: 'vector' | 'topic';
  score: number;
}

interface SearchResult {
  query: string;
  answer: string;
  model?: string;
  gemini_configured?: boolean;
  context_used: SearchContextItem[];
  topics_matched: string[];
  latency_ms: number;
}

const SAMPLE_QUERIES = [
  'How does the CRDT session synchronize operations between peers?',
  'How are CRDT checkpoints represented in the Git history?',
  'What happens when two peers make concurrent edits?',
  'How does 3-way merge calculate the Nearest Common Ancestor (NCA)?',
];

export const RagSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);

  const handleSearch = async (queryText: string) => {
    if (!queryText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText.trim() }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '950px', margin: '0 auto' }}>
      {/* Search Header Banner */}
      <div className="glass-card">
        <div className="glass-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--indigo)' }}>
              <Search style={{ width: '20px', height: '20px' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Cross-Corpus Semantic RAG & AI Synthesis
                <span className="badge badge-emerald">Dual-Tier Retrieval</span>
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Query the entire collaborative codebase, research papers, and conversation transcripts using vector embeddings and LLM synthesis
              </p>
            </div>
          </div>
        </div>

        {/* Query Input */}
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ width: '18px', height: '18px', position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--indigo)' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything about the architecture, CRDT proofs, Git DAG checkpoints, or research artifacts..."
              className="input-control"
              style={{ padding: '0.85rem 7.5rem 0.85rem 2.75rem', fontSize: '0.9rem', borderRadius: 'var(--radius-lg)' }}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="btn btn-primary btn-sm"
              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', padding: '0.5rem 0.95rem' }}
            >
              <Sparkles style={{ width: '13px', height: '13px' }} />
              <span>{loading ? 'Synthesizing...' : 'Search & Ask'}</span>
            </button>
          </div>

          {/* Suggested Queries */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}>
            <span style={{ color: 'var(--text-dim)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <Zap style={{ width: '12px', height: '12px', color: 'var(--amber)' }} />
              Try asking:
            </span>
            {SAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setQuery(q);
                  handleSearch(q);
                }}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.2rem 0.55rem', fontSize: '0.7rem' }}
              >
                {q}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Answer Result */}
      {result && (
        <div className="glass-card" style={{ borderColor: 'var(--cyan)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles style={{ width: '18px', height: '18px', color: 'var(--cyan)' }} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Synthesized Research Answer</h3>
              {result.gemini_configured ? (
                <span className="badge badge-emerald" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CheckCircle2 style={{ width: '12px', height: '12px' }} />
                  {result.model || 'Gemini Pro'}
                </span>
              ) : (
                <span className="badge badge-amber" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <AlertCircle style={{ width: '12px', height: '12px' }} />
                  Grounded Local Retrieval
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span className="badge badge-cyan mono">
                <Clock style={{ width: '10px', height: '10px' }} />
                {result.latency_ms} ms
              </span>
              <span className="badge badge-emerald">
                {result.context_used.length} Citations Used
              </span>
            </div>
          </div>

          {/* Answer Box */}
          <div style={{ background: 'var(--bg-space)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', marginBottom: '1.25rem' }}>
            {result.answer}
          </div>

          {/* Citations Grid */}
          <div>
            <h4 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <BookOpen style={{ width: '14px', height: '14px', color: 'var(--indigo)' }} />
              Retrieved Context & Citations ({result.context_used.length})
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '0.75rem' }}>
              {result.context_used.map((ctx, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-surface)',
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge badge-indigo" style={{ fontSize: '0.65rem' }}>
                      {ctx.type === 'vector' ? 'Tier 1: Vector Sim' : 'Tier 2: Topic Match'}
                    </span>
                    <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--emerald-light)', fontWeight: 700 }}>
                      Score: {ctx.score}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <h5 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{ctx.title}</h5>
                    {ctx.pageNumber && (
                      <span className="badge badge-amber mono" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                        Page {ctx.pageNumber}
                      </span>
                    )}
                    {ctx.chunkId && (
                      <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                        #{ctx.chunkId.split('_').pop()}
                      </span>
                    )}
                  </div>

                  <p className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4, maxHeight: '80px', overflowY: 'auto' }}>
                    {ctx.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
