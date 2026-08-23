import React, { useState } from 'react';
import { GitBranch, GitCommit, Database, Radio, Plus, RefreshCw, Layers, Sun, Moon } from 'lucide-react';

interface NavbarProps {
  repoName: string;
  activeBranch: string;
  branches: Array<{ name: string; commitId: string | null }>;
  currentCommitId: string | null;
  stats: {
    commits: number;
    trees: number;
    blobs: number;
    totalObjects: number;
  };
  wsConnected: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onBranchChange: (branch: string) => void;
  onCreateBranch: (branchName: string) => void;
  onRefresh: () => void;
  onQuickCheckpoint: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  repoName,
  activeBranch,
  branches,
  currentCommitId,
  stats,
  wsConnected,
  theme,
  onToggleTheme,
  onBranchChange,
  onCreateBranch,
  onRefresh,
  onQuickCheckpoint,
}) => {
  const [showNewBranchModal, setShowNewBranchModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    onCreateBranch(newBranchName.trim());
    setNewBranchName('');
    setShowNewBranchModal(false);
  };

  return (
    <header className="header-glass">
      <div className="header-inner">
        {/* Brand & Project Identity */}
        <div className="brand-box">
          <div className="brand-icon">⚡</div>
          <div className="brand-text">
            <h1>
              Git <span style={{ color: 'var(--indigo-light)', fontWeight: 400 }}>+</span> CRDT
              <span className="badge badge-cyan" style={{ fontSize: '0.65rem', marginLeft: '0.4rem' }}>
                Full-Stack v2.0
              </span>
            </h1>
            <p>Decentralized Hybrid VCS & AI Research Intelligence</p>
          </div>
        </div>

        {/* Center: Repository & Branch Indicator */}
        <div className="repo-badge-bar">
          <div className="repo-badge-item">
            <Database style={{ width: '14px', height: '14px', color: 'var(--indigo)' }} />
            <span style={{ color: 'var(--text-primary)' }}>{repoName}</span>
          </div>

          <span style={{ color: 'var(--text-dim)' }}>/</span>

          {/* Branch Selector */}
          <div className="repo-badge-item">
            <GitBranch style={{ width: '14px', height: '14px', color: 'var(--emerald)' }} />
            <select
              value={activeBranch}
              onChange={(e) => onBranchChange(e.target.value)}
              className="branch-select-input"
            >
              {branches.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowNewBranchModal(true)}
            title="Create new branch"
            className="btn btn-icon"
            style={{ padding: '0.2rem' }}
          >
            <Plus style={{ width: '14px', height: '14px' }} />
          </button>

          {currentCommitId && (
            <>
              <span style={{ color: 'var(--text-dim)' }}>/</span>
              <div className="repo-badge-item mono" style={{ fontSize: '0.75rem', color: 'var(--cyan)' }}>
                <GitCommit style={{ width: '13px', height: '13px' }} />
                <span>{currentCommitId.slice(0, 7)}</span>
              </div>
            </>
          )}
        </div>

        {/* Right Actions & Status */}
        <div className="header-right">
          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="theme-toggle-btn"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <>
                <Sun style={{ width: '15px', height: '15px', color: 'var(--amber-light)' }} />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon style={{ width: '15px', height: '15px', color: 'var(--indigo)' }} />
                <span>Dark</span>
              </>
            )}
          </button>

          {/* Real-time WS Status */}
          <div className={`badge ${wsConnected ? 'badge-emerald' : 'badge-amber'}`}>
            <Radio style={{ width: '12px', height: '12px' }} />
            <span>{wsConnected ? 'Live P2P Sync' : 'Connecting...'}</span>
          </div>

          {/* Quick Stats Pill */}
          <div
            className="badge badge-indigo"
            style={{ background: 'var(--bg-surface-elevated)', borderColor: 'var(--border-subtle)' }}
          >
            <Layers style={{ width: '12px', height: '12px', color: 'var(--indigo)' }} />
            <span>{stats.commits} Commits</span>
            <span style={{ color: 'var(--text-dim)' }}>•</span>
            <span>{stats.totalObjects} Objects</span>
          </div>

          {/* Refresh Button */}
          <button onClick={onRefresh} className="btn btn-secondary btn-sm" title="Refresh state">
            <RefreshCw style={{ width: '13px', height: '13px' }} />
          </button>

          {/* Checkpoint Button */}
          <button onClick={onQuickCheckpoint} className="btn btn-primary btn-sm">
            <GitCommit style={{ width: '14px', height: '14px' }} />
            <span>Checkpoint</span>
          </button>
        </div>
      </div>

      {/* New Branch Modal */}
      {showNewBranchModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '420px' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <GitBranch style={{ color: 'var(--emerald)' }} />
              Create New Branch
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.2rem' }}>
              Fork off current HEAD (
              <span className="mono" style={{ color: 'var(--cyan)' }}>
                {currentCommitId ? currentCommitId.slice(0, 7) : 'initial'}
              </span>
              ).
            </p>
            <form onSubmit={handleCreateBranch}>
              <input
                type="text"
                autoFocus
                placeholder="e.g. feature-model-eval, hotfix-crdt-sync"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                className="input-control"
                style={{ marginBottom: '1.25rem' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowNewBranchModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-emerald btn-sm">
                  Create Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
