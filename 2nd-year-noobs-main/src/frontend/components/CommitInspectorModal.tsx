import React, { useState, useEffect } from 'react';
import {
  GitCommit,
  FolderTree,
  FileCode,
  X,
  Copy,
  Check,
  RotateCcw,
  User,
  Sparkles,
  TrendingUp,
  FileText,
  Tag,
  ArrowRight,
} from 'lucide-react';

interface CommitInspectorModalProps {
  commitId: string;
  onClose: () => void;
  onRestoreSession: (commitId: string) => void;
}

export const CommitInspectorModal: React.FC<CommitInspectorModalProps> = ({
  commitId,
  onClose,
  onRestoreSession,
}) => {
  const [details, setDetails] = useState<any>(null);
  const [diffData, setDiffData] = useState<any>(null);
  const [activeView, setActiveView] = useState<'diff' | 'tree'>('diff');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [commitRes, diffRes] = await Promise.all([
          fetch(`/api/commit/${commitId}`),
          fetch(`/api/diff?to=${commitId}`),
        ]);

        const commitJson = await commitRes.json();
        const diffJson = await diffRes.json();

        setDetails(commitJson);
        setDiffData(diffJson);

        if (commitJson.tree?.entries?.length > 0) {
          setSelectedEntry(commitJson.tree.entries[0]);
        }
      } catch (err) {
        console.error('Failed to load commit data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [commitId]);

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog" style={{ maxWidth: '850px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--indigo)' }}>
              <GitCommit style={{ width: '20px', height: '20px' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                Commit Inspector & Semantic Diff
                <span className="badge badge-indigo">SHA-256 Verified</span>
              </h3>
              <p className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                <span>{commitId}</span>
                <button onClick={() => copyHash(commitId)} className="btn btn-icon" style={{ padding: '0.15rem' }}>
                  {copied ? <Check style={{ width: '12px', height: '12px', color: 'var(--emerald)' }} /> : <Copy style={{ width: '12px', height: '12px' }} />}
                </button>
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-icon">
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Loading commit DAG nodes, manifest trees, and semantic diff...
          </div>
        ) : details?.error ? (
          <div style={{ padding: '1rem', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid var(--rose)', borderRadius: 'var(--radius-md)', color: 'var(--rose-light)' }}>
            {details.error}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Metadata Summary Card */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Commit Message</span>
                <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{details.commit?.message}</p>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Author Signature</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <User style={{ width: '13px', height: '13px', color: 'var(--cyan)' }} />
                  <span>{details.commit?.author?.name} &lt;{details.commit?.author?.email}&gt;</span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Parent Commits</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {details.commit?.parentIds?.length > 0 ? (
                    details.commit.parentIds.map((pId: string) => (
                      <span key={pId} className="badge badge-indigo mono">
                        {pId.slice(0, 7)}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Root commit (initial)</span>
                  )}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Root Tree ID</span>
                <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--emerald-light)', background: 'var(--bg-space)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                  {details.commit?.treeId?.slice(0, 16)}...
                </span>
              </div>
            </div>

            {/* View Switcher Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
              <button
                onClick={() => setActiveView('diff')}
                className="btn btn-sm"
                style={{
                  background: activeView === 'diff' ? 'var(--indigo)' : 'var(--bg-surface)',
                  color: activeView === 'diff' ? '#ffffff' : 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <Sparkles style={{ width: '13px', height: '13px' }} />
                <span>Semantic Diff vs Parent</span>
              </button>
              <button
                onClick={() => setActiveView('tree')}
                className="btn btn-sm"
                style={{
                  background: activeView === 'tree' ? 'var(--indigo)' : 'var(--bg-surface)',
                  color: activeView === 'tree' ? '#ffffff' : 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <FolderTree style={{ width: '13px', height: '13px' }} />
                <span>Tree Manifest & Blobs</span>
              </button>
            </div>

            {/* VIEW 1: SEMANTIC DIFF */}
            {activeView === 'diff' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Summary Banner */}
                <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--indigo-light)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Sparkles style={{ width: '14px', height: '14px' }} />
                      Human-Readable Semantic Change Summary
                    </span>
                    <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.7rem' }}>
                      <span className="badge badge-emerald">+{diffData?.diff?.stats?.wordsAdded || 0} words</span>
                      <span className="badge badge-rose">-{diffData?.diff?.stats?.wordsRemoved || 0} words</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    {diffData?.diff?.summary || 'No changes detected against base.'}
                  </p>
                </div>

                {/* Metric Updates */}
                {diffData?.diff?.metricChanges?.length > 0 && (
                  <div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                      Extracted Metric & Performance Deltas
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {diffData.diff.metricChanges.map((m: any, idx: number) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            padding: '0.5rem 0.75rem',
                            background: 'rgba(6, 182, 212, 0.1)',
                            border: '1px solid var(--cyan)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.8rem',
                          }}
                        >
                          <TrendingUp style={{ width: '14px', height: '14px', color: 'var(--cyan)' }} />
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Granular Semantic Changes */}
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                    Granular Prose & Attribute Changes ({diffData?.diff?.changes?.length || 0})
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '200px', overflowY: 'auto' }}>
                    {diffData?.diff?.changes?.map((c: any, idx: number) => {
                      const badgeClass =
                        c.type === 'addition'
                          ? 'badge-emerald'
                          : c.type === 'deletion'
                          ? 'badge-rose'
                          : c.type === 'metric'
                          ? 'badge-cyan'
                          : 'badge-amber';

                      return (
                        <div
                          key={idx}
                          style={{
                            padding: '0.6rem 0.8rem',
                            background: 'var(--bg-space)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.75rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                            <span className={`badge ${badgeClass} uppercase`} style={{ fontSize: '0.6rem' }}>
                              {c.type}
                            </span>
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>[{c.category}]</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.summary}</span>
                          </div>
                          {c.oldText && c.newText && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.35rem', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
                              <div style={{ background: 'rgba(244, 63, 94, 0.08)', padding: '0.35rem', borderRadius: '4px', color: 'var(--rose-light)' }}>
                                - {c.oldText}
                              </div>
                              <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '0.35rem', borderRadius: '4px', color: 'var(--emerald-light)' }}>
                                + {c.newText}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {(!diffData?.diff?.changes || diffData.diff.changes.length === 0) && (
                      <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                        No changes detected (or this is the root initial commit).
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: TREE MANIFEST */}
            {activeView === 'tree' && (
              <div>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FolderTree style={{ width: '14px', height: '14px', color: 'var(--emerald)' }} />
                  Directory Tree Manifest Entries
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                  <div style={{ background: 'var(--bg-surface)', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', maxHeight: '180px', overflowY: 'auto' }}>
                    {details.tree?.entries?.map((entry: any) => (
                      <button
                        key={entry.name}
                        onClick={() => setSelectedEntry(entry)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '0.45rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontFamily: 'var(--font-mono)',
                          background: selectedEntry?.name === entry.name ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                          color: selectedEntry?.name === entry.name ? '#ffffff' : 'var(--text-secondary)',
                          border: selectedEntry?.name === entry.name ? '1px solid var(--indigo)' : 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          marginBottom: '0.25rem',
                        }}
                      >
                        <FileCode style={{ width: '13px', height: '13px', color: 'var(--cyan)' }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</span>
                      </button>
                    ))}
                  </div>

                  <div style={{ background: 'var(--bg-space)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', maxHeight: '180px', overflowY: 'auto' }}>
                    {selectedEntry ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.4rem', marginBottom: '0.4rem', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          <span className="mono">Blob: {selectedEntry.id?.slice(0, 10)}...</span>
                          <span className="badge badge-cyan">{selectedEntry.type}</span>
                        </div>
                        <pre className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                          {selectedEntry.contentPreview || 'Payload contents stored as immutable Blob.'}
                        </pre>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                        Select a tree entry to view blob payload.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
              <button onClick={() => onRestoreSession(commitId)} className="btn btn-emerald btn-sm">
                <RotateCcw style={{ width: '13px', height: '13px' }} />
                <span>Restore Session from Checkpoint</span>
              </button>

              <button onClick={onClose} className="btn btn-secondary btn-sm">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
