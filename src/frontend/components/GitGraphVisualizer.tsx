import React, { useState, useEffect } from 'react';
import {
  GitGraph,
  GitCommit,
  GitBranch,
  Search,
  Layers,
  ArrowRight,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { CommitInspectorModal } from './CommitInspectorModal.js';

interface CommitNode {
  id: string;
  shortId: string;
  message: string;
  author: {
    name: string;
    email: string;
    timestamp: number;
  };
  timestamp: number;
  treeId: string;
  shortTreeId: string;
  parentIds: string[];
  branches: string[];
  isHead: boolean;
}

interface GitGraphVisualizerProps {
  onSelectCommit?: (commitId: string) => void;
  onRestoreSession: (commitId: string) => void;
}

export const GitGraphVisualizer: React.FC<GitGraphVisualizerProps> = ({
  onRestoreSession,
}) => {
  const [dagData, setDagData] = useState<{
    nodes: CommitNode[];
    edges: Array<{ from: string; to: string }>;
    head: any;
    activeCommit: string | null;
  }>({ nodes: [], edges: [], head: null, activeCommit: null });
  const [loading, setLoading] = useState(true);
  const [inspectedCommitId, setInspectedCommitId] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');

  const fetchDag = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/repo/dag');
      const data = await res.json();
      setDagData(data);
    } catch (err) {
      console.error('Failed to fetch DAG:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDag();
  }, []);

  const filteredNodes = dagData.nodes.filter(
    (n) =>
      n.message.toLowerCase().includes(filterQuery.toLowerCase()) ||
      n.id.toLowerCase().includes(filterQuery.toLowerCase()) ||
      n.author.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      n.branches.some((b) => b.toLowerCase().includes(filterQuery.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* DAG Visualizer Card */}
      <div className="glass-card">
        <div className="glass-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--indigo)' }}>
              <GitGraph style={{ width: '20px', height: '20px' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Git Directed Acyclic Graph (DAG) Visualizer
                <span className="badge badge-indigo">Immutable History</span>
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Cryptographically verifiable commit graph with parent ancestry and branch pointers
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ width: '13px', height: '13px', position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Filter commits..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="input-control"
                style={{ padding: '0.35rem 0.65rem 0.35rem 1.85rem', fontSize: '0.75rem', width: '200px' }}
              />
            </div>
            <button onClick={fetchDag} className="btn btn-secondary btn-sm">
              Refresh Graph
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Constructing Git Commit Graph & Ancestor DAG...
          </div>
        ) : dagData.nodes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            No commits found in the repository. Create a checkpoint from the editor to start the DAG!
          </div>
        ) : (
          <div className="dag-scroll-canvas">
            {dagData.nodes.map((node, index) => {
              const isMergeCommit = node.parentIds.length > 1;

              return (
                <React.Fragment key={node.id}>
                  {/* Node Card */}
                  <div
                    onClick={() => setInspectedCommitId(node.id)}
                    className={`commit-dag-card ${node.isHead ? 'head' : ''}`}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.5rem' }}>
                      {node.isHead && <span className="badge badge-rose">HEAD</span>}
                      {isMergeCommit && <span className="badge badge-cyan">3-Way Merge (NCA)</span>}
                      {node.branches.map((b) => (
                        <span key={b} className="badge badge-emerald" style={{ gap: '0.2rem' }}>
                          <GitBranch style={{ width: '10px', height: '10px' }} />
                          {b}
                        </span>
                      ))}
                    </div>

                    <div style={{ marginBottom: '0.65rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                        <span className="mono" style={{ fontWeight: 700, color: 'var(--cyan)' }}>
                          <GitCommit style={{ width: '12px', height: '12px', display: 'inline', marginRight: '3px' }} />
                          {node.shortId}
                        </span>
                        <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>tree: {node.shortTreeId}</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                        {node.message}
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', paddingTop: '0.4rem', borderTop: '1px solid var(--border-subtle)' }}>
                      <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.author.name}</span>
                      <span className="mono" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Clock style={{ width: '10px', height: '10px' }} />
                        {new Date(node.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Directional Connector Arrow */}
                  {index < dagData.nodes.length - 1 && (
                    <div style={{ color: 'var(--indigo-light)', opacity: 0.7 }}>
                      <ArrowRight style={{ width: '18px', height: '18px' }} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Chronological Commit List */}
      <div className="glass-card">
        <h3 style={{ fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers style={{ width: '15px', height: '15px', color: 'var(--indigo)' }} />
          Chronological Commit Log ({filteredNodes.length} Commits)
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filteredNodes.map((c) => (
            <div
              key={c.id}
              onClick={() => setInspectedCommitId(c.id)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.4rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: 'var(--radius-sm)', color: 'var(--indigo)' }}>
                  <GitCommit style={{ width: '15px', height: '15px' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{c.message}</span>
                    {c.branches.map((b) => (
                      <span key={b} className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>{b}</span>
                    ))}
                    {c.isHead && <span className="badge badge-rose" style={{ fontSize: '0.65rem' }}>HEAD</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.4rem', marginTop: '0.15rem' }}>
                    <span>{c.author.name}</span>
                    <span>•</span>
                    <span className="mono" style={{ color: 'var(--cyan)' }}>{c.shortId}</span>
                    <span>•</span>
                    <span>{new Date(c.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <button className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                <ExternalLink style={{ width: '12px', height: '12px' }} />
                <span>Inspect</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {inspectedCommitId && (
        <CommitInspectorModal
          commitId={inspectedCommitId}
          onClose={() => setInspectedCommitId(null)}
          onRestoreSession={onRestoreSession}
        />
      )}
    </div>
  );
};
