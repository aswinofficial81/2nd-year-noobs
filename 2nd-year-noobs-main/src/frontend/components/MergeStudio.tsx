import React, { useState, useEffect } from 'react';
import {
  GitMerge,
  GitBranch,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Scale,
  ShieldCheck,
  Sparkles,
  GitCommit,
  Layers,
  AlertTriangle,
} from 'lucide-react';

interface MergeStudioProps {
  branches: Array<{ name: string; commitId: string | null }>;
  activeBranch: string;
  onExecuteMerge: (targetBranch: string, sourceBranch: string) => Promise<any>;
  onRefreshDag: () => void;
}

export const MergeStudio: React.FC<MergeStudioProps> = ({
  branches,
  activeBranch,
  onExecuteMerge,
  onRefreshDag,
}) => {
  const [targetBranch, setTargetBranch] = useState(activeBranch || 'main');
  const [sourceBranch, setSourceBranch] = useState(
    branches.find((b) => b.name !== activeBranch)?.name || 'main'
  );
  const [preview, setPreview] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [resolutionStrategy, setResolutionStrategy] = useState<'crdt' | 'ours' | 'theirs'>('crdt');
  const [merging, setMerging] = useState(false);
  const [mergeResult, setMergeResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch merge preview whenever branches change
  useEffect(() => {
    async function fetchPreview() {
      if (targetBranch === sourceBranch) {
        setPreview(null);
        return;
      }
      try {
        setLoadingPreview(true);
        setError(null);
        const res = await fetch(
          `/api/branch/merge/preview?targetBranch=${encodeURIComponent(targetBranch)}&sourceBranch=${encodeURIComponent(sourceBranch)}`
        );
        const data = await res.json();
        if (res.ok) {
          setPreview(data);
        } else {
          setPreview(null);
        }
      } catch (err) {
        console.error('Preview error:', err);
      } finally {
        setLoadingPreview(false);
      }
    }
    fetchPreview();
  }, [targetBranch, sourceBranch]);

  const handleMerge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetBranch === sourceBranch) {
      setError('Target and Source branches must be distinct.');
      return;
    }
    setError(null);
    setMerging(true);
    try {
      const result = await onExecuteMerge(targetBranch, sourceBranch);
      setMergeResult(result);
      onRefreshDag();
    } catch (err: any) {
      setError(err.message || 'Merge failed');
    } finally {
      setMerging(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Overview Banner */}
      <div className="glass-card">
        <div className="glass-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', background: 'rgba(6, 182, 212, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--cyan)' }}>
              <GitMerge style={{ width: '20px', height: '20px' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                3-Way Semantic CRDT Merge & Conflict Studio
                <span className="badge badge-cyan">NCA Ancestry Analysis</span>
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Deterministic 3-way reconciliation utilizing Nearest Common Ancestor (NCA) graph discovery and commutative CRDT resolution
              </p>
            </div>
          </div>

          <div className="badge badge-indigo mono">
            <ShieldCheck style={{ width: '13px', height: '13px' }} />
            <span>Mathematical Convergence</span>
          </div>
        </div>

        {/* Branch Formulation */}
        <form onSubmit={handleMerge} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center' }}>
            {/* Target Branch Card */}
            <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                Target Branch (Base / Destination)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <GitBranch style={{ width: '16px', height: '16px', color: 'var(--emerald)' }} />
                <select
                  value={targetBranch}
                  onChange={(e) => setTargetBranch(e.target.value)}
                  className="input-control"
                  style={{ fontWeight: 600, color: 'var(--emerald)' }}
                >
                  {branches.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name} ({b.commitId ? b.commitId.slice(0, 7) : 'initial'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Merge Arrow Center */}
            <div style={{ color: 'var(--cyan)' }}>
              <ArrowRight style={{ width: '22px', height: '22px' }} />
            </div>

            {/* Source Branch Card */}
            <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                Source Branch (Incoming Feature)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <GitBranch style={{ width: '16px', height: '16px', color: 'var(--cyan)' }} />
                <select
                  value={sourceBranch}
                  onChange={(e) => setSourceBranch(e.target.value)}
                  className="input-control"
                  style={{ fontWeight: 600, color: 'var(--cyan)' }}
                >
                  {branches.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name} ({b.commitId ? b.commitId.slice(0, 7) : 'initial'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div style={{ padding: '0.75rem', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid var(--rose)', borderRadius: 'var(--radius-md)', color: 'var(--rose)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <AlertCircle style={{ width: '15px', height: '15px' }} />
              <span>{error}</span>
            </div>
          )}

          {/* Merge Strategy / Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <Cpu style={{ width: '14px', height: '14px', color: 'var(--indigo)' }} />
              <span>
                {preview?.mergeBaseId
                  ? `NCA Common Ancestor: ${preview.mergeBaseId.slice(0, 7)}`
                  : 'Analyzes commit DAG ancestry and calculates common base'}
              </span>
            </div>

            <button
              type="submit"
              disabled={merging || targetBranch === sourceBranch}
              className="btn btn-primary"
              style={{ padding: '0.65rem 1.5rem' }}
            >
              <GitMerge style={{ width: '16px', height: '16px' }} />
              <span>{merging ? 'Executing Merge...' : 'Execute 3-Way CRDT Merge'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Live Conflict Detection Panel */}
      {preview && (
        <div className="glass-card">
          <div className="glass-card-header" style={{ paddingBottom: '0.65rem', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {preview.hasConflicts ? (
                <AlertTriangle style={{ width: '18px', height: '18px', color: 'var(--amber)' }} />
              ) : (
                <CheckCircle2 style={{ width: '18px', height: '18px', color: 'var(--emerald)' }} />
              )}
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                {preview.hasConflicts
                  ? `Concurrent Divergence & Conflict Detected (${preview.conflicts.length} Overlap)`
                  : 'Zero Overlapping Conflicts Detected'}
              </h3>
            </div>

            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <span className="badge badge-indigo mono uppercase">{preview.mergeType}</span>
              {preview.mergeBaseId && (
                <span className="badge badge-emerald mono">NCA: {preview.mergeBaseId.slice(0, 7)}</span>
              )}
            </div>
          </div>

          {/* Conflict Details */}
          {preview.hasConflicts ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid var(--amber)', padding: '0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                <p style={{ fontWeight: 600, marginBottom: '0.2rem' }}>
                  ⚠️ Overlapping branch modifications identified on common base.
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Both branches modified identical document properties since the Nearest Common Ancestor. CRDT deterministic tie-breaking ensures 100% convergence across all replicas.
                </p>
              </div>

              {preview.conflicts.map((c: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                    <span className="mono" style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--cyan)' }}>
                      Field: {c.fieldLabel} ({c.key})
                    </span>
                    <span className="badge badge-amber">Concurrent Modification</span>
                  </div>

                  {/* 3-Way Side-by-Side Comparison */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.65rem', fontSize: '0.75rem' }}>
                    {/* NCA Base */}
                    <div style={{ background: 'var(--bg-space)', padding: '0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>
                        1. Common Ancestor (Base)
                      </span>
                      <p className="mono" style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(c.baseValue) || 'none'}
                      </p>
                    </div>

                    {/* Target (Ours) */}
                    <div style={{ background: 'rgba(16, 185, 129, 0.06)', padding: '0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--emerald)' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--emerald)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem', fontWeight: 700 }}>
                        2. Target ({targetBranch})
                      </span>
                      <p className="mono" style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(c.oursValue) || 'none'}
                      </p>
                    </div>

                    {/* Source (Theirs) */}
                    <div style={{ background: 'rgba(6, 182, 212, 0.06)', padding: '0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--cyan)' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--cyan)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem', fontWeight: 700 }}>
                        3. Source ({sourceBranch})
                      </span>
                      <p className="mono" style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(c.theirsValue) || 'none'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Branches can be merged cleanly into a unified DAG node without manual conflict resolution.
            </div>
          )}

          {/* Semantic Diff Preview */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--emerald)' }}>
                <Sparkles style={{ width: '13px', height: '13px' }} />
                <span>Changes on Target ({targetBranch}):</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {preview.diffOurs?.summary || 'No changes from base.'}
              </p>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--cyan)' }}>
                <Sparkles style={{ width: '13px', height: '13px' }} />
                <span>Changes on Source ({sourceBranch}):</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {preview.diffTheirs?.summary || 'No changes from base.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Merge Execution Result */}
      {mergeResult && (
        <div className="glass-card" style={{ borderColor: 'var(--emerald)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 style={{ width: '18px', height: '18px', color: 'var(--emerald)' }} />
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700 }}>3-Way CRDT Merge Executed Successfully!</h3>
            </div>
            <span className="badge badge-emerald mono uppercase">{mergeResult.mergeType}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
            {mergeResult.commit && (
              <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.2rem' }}>Created Merge Commit</span>
                <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--cyan)', fontWeight: 700, display: 'block' }}>
                  {mergeResult.commit.id}
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>New DAG node created with dual parent linkage.</p>
              </div>
            )}

            {mergeResult.mergeBaseId && (
              <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.2rem' }}>Nearest Common Ancestor (NCA)</span>
                <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--emerald)', fontWeight: 700, display: 'block' }}>
                  {mergeResult.mergeBaseId}
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Graph distance algorithm identified optimal common ancestor.</p>
              </div>
            )}
          </div>

          {mergeResult.mergedState && (
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                Merged State Snapshot:
              </span>
              <pre className="mono" style={{ background: 'var(--bg-space)', padding: '0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: 'var(--text-secondary)', overflowX: 'auto', border: '1px solid var(--border-subtle)' }}>
                {JSON.stringify(mergeResult.mergedState, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Formal Invariants */}
      <div className="glass-card">
        <h4 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Scale style={{ width: '14px', height: '14px', color: 'var(--amber)' }} />
          Mathematical Invariants of Distributed CRDT Merging
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', fontSize: '0.75rem' }}>
          <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontWeight: 700, color: 'var(--indigo-light)', display: 'block', marginBottom: '0.2rem' }}>1. Commutativity</span>
            <p style={{ color: 'var(--text-muted)' }}>Applying operation A then B yields the exact same state as applying B then A.</p>
          </div>
          <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontWeight: 700, color: 'var(--cyan)', display: 'block', marginBottom: '0.2rem' }}>2. Associativity</span>
            <p style={{ color: 'var(--text-muted)' }}>Order of grouping operations during multi-branch merges does not alter convergence.</p>
          </div>
          <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontWeight: 700, color: 'var(--emerald)', display: 'block', marginBottom: '0.2rem' }}>3. Idempotence</span>
            <p style={{ color: 'var(--text-muted)' }}>Duplicate delivery or re-applying already merged operations is a deterministic no-op.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
