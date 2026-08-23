import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  Layers,
  Tag,
  Sparkles,
  Search,
} from 'lucide-react';

interface IngestedArtifact {
  id: string;
  type: 'doc' | 'chat' | 'pdf';
  title: string;
  raw_content: string;
  summary_line: string;
  topics: string[];
  chunks: string[];
  created_at: number;
}

export const ResearchIngest: React.FC = () => {
  const [artifacts, setArtifacts] = useState<IngestedArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pasteType, setPasteType] = useState<'markdown' | 'chatgpt' | 'claude'>('markdown');
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [selectedArtifact, setSelectedArtifact] = useState<IngestedArtifact | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchArtifacts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/artifacts');
      const data = await res.json();
      setArtifacts(data);
      if (data.length > 0 && !selectedArtifact) {
        setSelectedArtifact(data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch artifacts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtifacts();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name.replace(/\.[^/.]+$/, ''));

    let endpoint = '/api/ingest/markdown';
    if (file.name.endsWith('.pdf')) {
      endpoint = '/api/ingest/pdf';
    } else if (file.name.endsWith('.json')) {
      endpoint = '/api/ingest/chat/chatgpt';
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setSelectedArtifact(data);
      fetchArtifacts();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteContent.trim()) return;

    setUploading(true);
    let endpoint = `/api/ingest/${pasteType === 'markdown' ? 'markdown' : `chat/${pasteType}`}`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pasteTitle || `Pasted ${pasteType.toUpperCase()} Artifact`,
          content: pasteContent,
        }),
      });
      const data = await res.json();
      setSelectedArtifact(data);
      setPasteTitle('');
      setPasteContent('');
      fetchArtifacts();
    } catch (err) {
      console.error('Ingest failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const allTopics = Array.from(
    new Set(artifacts.flatMap((a) => a.topics || []))
  );

  const filteredArtifacts = artifacts.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      a.summary_line?.toLowerCase().includes(filterQuery.toLowerCase());
    const matchesTopic = selectedTopic ? a.topics?.includes(selectedTopic) : true;
    return matchesSearch && matchesTopic;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Ingestion Console */}
      <div className="glass-card">
        <div className="glass-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--indigo)' }}>
              <UploadCloud style={{ width: '20px', height: '20px' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                AI Research & Artifact Ingestion Hub
                <span className="badge badge-cyan">Multi-Format Ingestion</span>
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Ingest Markdown docs, PDFs, ChatGPT conversations, and Claude logs with automatic chunking & topic extraction
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.3rem', background: 'var(--bg-surface)', padding: '0.2rem', borderRadius: 'var(--radius-md)' }}>
            <button
              onClick={() => setActiveTab('upload')}
              className="btn btn-sm"
              style={{
                background: activeTab === 'upload' ? 'var(--indigo)' : 'transparent',
                color: activeTab === 'upload' ? '#fff' : 'var(--text-muted)',
              }}
            >
              Upload File
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className="btn btn-sm"
              style={{
                background: activeTab === 'paste' ? 'var(--indigo)' : 'transparent',
                color: activeTab === 'paste' ? '#fff' : 'var(--text-muted)',
              }}
            >
              Paste Text / JSON
            </button>
          </div>
        </div>

        {activeTab === 'upload' ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed rgba(99, 102, 241, 0.35)',
              borderRadius: 'var(--radius-lg)',
              padding: '2.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: 'var(--bg-surface-elevated)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".md,.pdf,.json,.txt"
              style={{ display: 'none' }}
            />
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--indigo)' }}>
              <UploadCloud style={{ width: '24px', height: '24px' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                {uploading ? 'Processing & Chunking Artifact...' : 'Click or Drag Files Here to Ingest'}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Supports Markdown (<span className="mono" style={{ color: 'var(--cyan)' }}>.md</span>), Research Papers (<span className="mono" style={{ color: 'var(--cyan)' }}>.pdf</span>), ChatGPT & Claude (<span className="mono" style={{ color: 'var(--cyan)' }}>.json</span>)
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePasteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              <input
                type="text"
                placeholder="Artifact Title (optional)"
                value={pasteTitle}
                onChange={(e) => setPasteTitle(e.target.value)}
                className="input-control"
              />
              <select
                value={pasteType}
                onChange={(e) => setPasteType(e.target.value as any)}
                className="input-control"
              >
                <option value="markdown">Markdown Document (.md)</option>
                <option value="chatgpt">ChatGPT Export JSON</option>
                <option value="claude">Claude Export JSON</option>
              </select>
            </div>
            <textarea
              rows={5}
              placeholder="Paste Markdown text, PDF extracted text, or chat transcript JSON..."
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              className="textarea-control"
              style={{ minHeight: '120px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={uploading} className="btn btn-primary btn-sm">
                {uploading ? 'Processing...' : 'Ingest & Index Artifact'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Explorer Split */}
      <div className="grid-12">
        {/* Left: Artifacts List */}
        <div className="col-5">
          <div className="glass-card" style={{ height: '100%' }}>
            <h3 style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
              <Layers style={{ width: '15px', height: '15px', color: 'var(--cyan)' }} />
              Indexed Artifacts ({artifacts.length})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ position: 'relative' }}>
                <Search style={{ width: '13px', height: '13px', position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search artifacts..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="input-control"
                  style={{ padding: '0.35rem 0.65rem 0.35rem 1.85rem', fontSize: '0.75rem' }}
                />
              </div>

              {/* Topic Filters */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', maxHeight: '60px', overflowY: 'auto' }}>
                <button
                  onClick={() => setSelectedTopic(null)}
                  style={{
                    background: selectedTopic === null ? 'var(--indigo)' : 'var(--bg-surface)',
                    color: selectedTopic === null ? '#ffffff' : 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '9999px',
                    padding: '0.1rem 0.45rem',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  All
                </button>
                {allTopics.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => setSelectedTopic(topic === selectedTopic ? null : topic)}
                    style={{
                      background: selectedTopic === topic ? 'var(--cyan)' : 'var(--bg-surface)',
                      color: selectedTopic === topic ? '#ffffff' : 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '9999px',
                      padding: '0.1rem 0.45rem',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    #{topic}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '380px', overflowY: 'auto' }}>
              {filteredArtifacts.map((art) => (
                <div
                  key={art.id}
                  onClick={() => setSelectedArtifact(art)}
                  style={{
                    padding: '0.75rem',
                    background: selectedArtifact?.id === art.id ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-surface)',
                    border: selectedArtifact?.id === art.id ? '1px solid var(--indigo)' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span className="badge badge-indigo" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>{art.type}</span>
                    <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{art.chunks?.length || 0} chunks</span>
                  </div>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{art.title}</h4>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{art.summary_line}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Selected Artifact Details */}
        <div className="col-7">
          <div className="glass-card" style={{ height: '100%' }}>
            {selectedArtifact ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span className="badge badge-emerald uppercase mono">{selectedArtifact.type}</span>
                    <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>ID: {selectedArtifact.id}</span>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>{selectedArtifact.title}</h3>
                  <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--indigo-light)', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Sparkles style={{ width: '13px', height: '13px' }} />
                      AI Auto-Summary:
                    </div>
                    {selectedArtifact.summary_line}
                  </div>
                </div>

                {/* Topics */}
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                    Extracted Topics
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {selectedArtifact.topics?.map((topic) => (
                      <span key={topic} className="badge badge-amber">
                        <Tag style={{ width: '10px', height: '10px' }} />
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Chunks */}
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                    Indexed Chunks ({selectedArtifact.chunks?.length || 0})
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto' }}>
                    {selectedArtifact.chunks?.map((chunk, idx) => (
                      <div
                        key={idx}
                        className="mono"
                        style={{ padding: '0.65rem', background: 'var(--bg-space)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-dim)', marginBottom: '0.25rem', paddingBottom: '0.25rem', borderBottom: '1px solid var(--border-subtle)' }}>
                          <span>Chunk #{idx + 1}</span>
                          <span style={{ color: 'var(--emerald-light)', fontWeight: 600 }}>768-dim Vector Embedded</span>
                        </div>
                        <p style={{ whiteSpace: 'pre-wrap' }}>{chunk}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                Select an artifact on the left to inspect chunks and topics.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
