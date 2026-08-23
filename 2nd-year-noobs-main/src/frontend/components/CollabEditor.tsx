import React, { useState, useEffect } from 'react';
import {
  FileText,
  Users,
  Clock,
  Send,
  GitCommit,
  Sparkles,
  Zap,
  Tag,
  CheckCircle2,
  Layers,
  Edit2,
  Check,
} from 'lucide-react';

export interface PeerInfo {
  id: string;
  name: string;
  color: string;
  isOnline?: boolean;
}

interface CollabEditorProps {
  activeBranch: string;
  currentPeer: string;
  localPeerName: string;
  peersList: PeerInfo[];
  docState: {
    title: string;
    text: string;
    metadata: Record<string, unknown>;
  };
  vectorClock: Record<string, number>;
  opLog: Array<{
    id: string;
    peerId: string;
    clock: number;
    type: string;
    timestamp: number;
    payload?: any;
  }>;
  onEditDoc: (type: 'insert' | 'delete' | 'setTitle' | 'setMetadata', payload: any) => void;
  onCommitCheckpoint: (message: string) => void;
  onUpdatePeerName: (name: string) => void;
}

export const CollabEditor: React.FC<CollabEditorProps> = ({
  activeBranch,
  currentPeer,
  localPeerName,
  peersList,
  docState,
  vectorClock,
  opLog,
  onEditDoc,
  onCommitCheckpoint,
  onUpdatePeerName,
}) => {
  const [localText, setLocalText] = useState(docState.text || '');
  const [localTitle, setLocalTitle] = useState(docState.title || '');
  const [commitMessage, setCommitMessage] = useState('');
  const [showCommitBox, setShowCommitBox] = useState(false);
  const [newMetaKey, setNewMetaKey] = useState('');
  const [newMetaVal, setNewMetaVal] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(localPeerName);

  useEffect(() => {
    setLocalText(docState.text || '');
  }, [docState.text]);

  useEffect(() => {
    setLocalTitle(docState.title || '');
  }, [docState.title]);

  useEffect(() => {
    setNameInput(localPeerName);
  }, [localPeerName]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setLocalText(newText);
    onEditDoc('insert', { text: newText, position: 0 });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setLocalTitle(newTitle);
    onEditDoc('setTitle', { title: newTitle });
  };

  const handleAddMetadata = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMetaKey.trim()) return;
    onEditDoc('setMetadata', { key: newMetaKey.trim(), value: newMetaVal });
    setNewMetaKey('');
    setNewMetaVal('');
  };

  const handleCommitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim()) return;
    onCommitCheckpoint(commitMessage.trim());
    setCommitMessage('');
    setShowCommitBox(false);
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onUpdatePeerName(nameInput.trim());
    }
    setIsEditingName(false);
  };

  // Simulate real concurrent edit from a remote peer replica
  const triggerConcurrentEditDemo = async () => {
    setIsSimulating(true);
    const remotePeerId = `peer_sim_${Math.random().toString(36).substring(2, 6)}`;
    const phrase = ` [Concurrent update by ${remotePeerId}]`;
    const updated = localText + phrase;
    setLocalText(updated);
    onEditDoc('insert', { text: updated, position: localText.length, peerId: remotePeerId });
    await new Promise((r) => setTimeout(r, 300));
    setIsSimulating(false);
  };

  // Merge connected peers with any other known peers in the vector clock
  const allKnownPeerIds = Array.from(
    new Set([...peersList.map((p) => p.id), ...Object.keys(vectorClock), currentPeer])
  );

  const allPeers: PeerInfo[] = allKnownPeerIds.map((id) => {
    const existing = peersList.find((p) => p.id === id);
    if (existing) return existing;
    if (id === currentPeer) {
      return { id, name: localPeerName, color: '#6366f1', isOnline: true };
    }
    return { id, name: id, color: '#06b6d4', isOnline: false };
  });

  return (
    <div className="grid-12">
      {/* Main Document Editor (Col 8) */}
      <div className="col-8">
        <div className="glass-card" style={{ height: '100%' }}>
          {/* Active Peers Presence Header */}
          <div className="glass-card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <Users style={{ width: '15px', height: '15px', color: 'var(--indigo)' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Active Peers ({allPeers.length}):
              </span>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {allPeers.map((peer) => {
                  const isLocal = peer.id === currentPeer;
                  return (
                    <div
                      key={peer.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        background: isLocal ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-surface)',
                        border: isLocal ? '1px solid var(--indigo)' : '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.75rem',
                      }}
                    >
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          backgroundColor: peer.color || '#6366f1',
                          display: 'inline-block',
                        }}
                      />
                      <span style={{ fontWeight: isLocal ? 700 : 500, color: 'var(--text-primary)' }}>
                        {peer.name} {isLocal && <span style={{ color: 'var(--indigo-light)', fontWeight: 400 }}>(You)</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Local Peer Customization & Concurrency Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {isEditingName ? (
                <form onSubmit={handleSaveName} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="input-control"
                    style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', width: '110px' }}
                    autoFocus
                  />
                  <button type="submit" className="btn btn-emerald btn-sm" style={{ padding: '0.2rem 0.4rem' }}>
                    <Check style={{ width: '12px', height: '12px' }} />
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                  title="Edit your display name"
                >
                  <Edit2 style={{ width: '11px', height: '11px' }} />
                  <span>Set Name</span>
                </button>
              )}

              <button
                onClick={triggerConcurrentEditDemo}
                disabled={isSimulating}
                className="btn btn-secondary btn-sm"
                style={{ color: 'var(--cyan-light)', borderColor: 'rgba(6, 182, 212, 0.3)' }}
                title="Simulate an edit from a second concurrent peer"
              >
                <Zap style={{ width: '13px', height: '13px', color: 'var(--cyan)' }} />
                <span>{isSimulating ? 'Simulating...' : 'Simulate Peer Edit'}</span>
              </button>
            </div>
          </div>

          {/* Document Title Input */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
              <FileText style={{ width: '14px', height: '14px', color: 'var(--cyan)' }} />
              <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Document Title (CRDT String)
              </label>
            </div>
            <input
              type="text"
              value={localTitle}
              onChange={handleTitleChange}
              placeholder="e.g. Distributed Consensus Whitepaper"
              className="input-control"
              style={{ fontSize: '1.1rem', fontWeight: 700 }}
            />
          </div>

          {/* Document Content Body */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>Collaborative Content Body</span>
                <span className="badge badge-emerald">Live CRDT Text</span>
              </label>
              <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {localText.length} chars • {localText.split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
            <textarea
              rows={10}
              value={localText}
              onChange={handleTextChange}
              placeholder="Start typing collaborative research notes, code, or ideas here..."
              className="textarea-control"
            />
          </div>

          {/* Metadata Map */}
          <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Tag style={{ width: '13px', height: '13px', color: 'var(--amber)' }} />
                CRDT Metadata Key-Value Map
              </span>
              <span className="badge badge-amber">CRDT State Map</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.65rem' }}>
              {Object.entries(docState.metadata || {}).map(([key, val]) => (
                <div
                  key={key}
                  className="mono"
                  style={{ fontSize: '0.75rem', background: 'var(--bg-space)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(245, 158, 11, 0.3)', color: 'var(--amber-light)' }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>{key}: </span>
                  <span style={{ fontWeight: 600 }}>{String(val)}</span>
                </div>
              ))}
              {Object.keys(docState.metadata || {}).length === 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                  No custom metadata tags added yet.
                </span>
              )}
            </div>

            <form onSubmit={handleAddMetadata} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Key (e.g. status)"
                value={newMetaKey}
                onChange={(e) => setNewMetaKey(e.target.value)}
                className="input-control"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', flex: '1' }}
              />
              <input
                type="text"
                placeholder="Value (e.g. reviewed)"
                value={newMetaVal}
                onChange={(e) => setNewMetaVal(e.target.value)}
                className="input-control"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', flex: '2' }}
              />
              <button type="submit" className="btn btn-secondary btn-sm">
                Add Tag
              </button>
            </form>
          </div>

          {/* Checkpoint to Git Section */}
          {!showCommitBox ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <CheckCircle2 style={{ width: '15px', height: '15px', color: 'var(--emerald)' }} />
                <span>All edits buffered in CRDT replica. Ready to commit into Git DAG.</span>
              </div>
              <button onClick={() => setShowCommitBox(true)} className="btn btn-primary btn-sm">
                <GitCommit style={{ width: '14px', height: '14px' }} />
                <span>Create Git Checkpoint</span>
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleCommitSubmit}
              style={{
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid var(--indigo)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--indigo-light)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <GitCommit style={{ width: '14px', height: '14px' }} />
                  Checkpoint CRDT Session into Git DAG
                </h4>
                <button
                  type="button"
                  onClick={() => setShowCommitBox(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
              <input
                type="text"
                autoFocus
                placeholder="e.g. feat: finalize introduction and benchmark results"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="input-control"
                style={{ marginBottom: '0.75rem' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>
                  Author: <b style={{ color: 'var(--text-primary)' }}>{localPeerName}</b> on branch <b style={{ color: 'var(--emerald-light)' }}>{activeBranch}</b>
                </span>
                <button type="submit" className="btn btn-primary btn-sm">
                  Commit Checkpoint
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Real-Time CRDT Diagnostics & Vector Clocks (Col 4) */}
      <div className="col-4" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Vector Clock HUD */}
        <div className="glass-card">
          <div className="glass-card-header" style={{ paddingBottom: '0.65rem', marginBottom: '0.85rem' }}>
            <h3 style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock style={{ width: '15px', height: '15px', color: 'var(--cyan)' }} />
              Vector Clock State
            </h3>
            <span className="badge badge-cyan">Causal Clocks</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
            {allPeers.map((peer) => {
              const clockVal = vectorClock[peer.id] || 0;
              const isLocal = peer.id === currentPeer;
              return (
                <div key={peer.id} className="vector-hud-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span
                      style={{
                        width: '9px',
                        height: '9px',
                        borderRadius: '50%',
                        backgroundColor: peer.color || '#6366f1',
                        display: 'inline-block',
                      }}
                    />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                      {peer.name} {isLocal && <span style={{ color: 'var(--indigo-light)', fontWeight: 400 }}>(You)</span>}
                    </span>
                    <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({peer.id})</span>
                  </div>
                  <div className="badge badge-indigo mono">
                    Clock: {clockVal}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <div style={{ fontWeight: 700, color: 'var(--indigo-light)', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Sparkles style={{ width: '13px', height: '13px' }} />
              Causality Invariant:
            </div>
            <p style={{ fontSize: '0.7rem', lineHeight: 1.4, color: 'var(--text-muted)' }}>
              Every operation carries its causal vector clock snapshot. Concurrent operations are deterministically ordered using Lamport clocks and peer UUID tie-breakers.
            </p>
          </div>
        </div>

        {/* Live Operation Stream */}
        <div className="glass-card" style={{ flex: 1 }}>
          <div className="glass-card-header" style={{ paddingBottom: '0.65rem', marginBottom: '0.85rem' }}>
            <h3 style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Layers style={{ width: '15px', height: '15px', color: 'var(--emerald)' }} />
              Operation Stream
            </h3>
            <span className="badge badge-emerald mono">{opLog.length} Ops Logged</span>
          </div>

          <div style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '0.25rem' }}>
            {opLog.slice(-15).reverse().map((op, idx) => (
              <div key={op.id || idx} className="op-log-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <span className="badge badge-indigo" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>
                    {op.type}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>clock: {op.clock}</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                  peer: <span style={{ color: 'var(--cyan)' }}>{op.peerId}</span> • id: {op.id?.slice(0, 8)}
                </div>
              </div>
            ))}
            {opLog.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                No operations recorded yet. Start editing to generate CRDT ops!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
