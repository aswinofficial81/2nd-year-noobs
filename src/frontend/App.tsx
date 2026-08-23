import React, { useState, useEffect, useRef } from 'react';
import {
  FileEdit,
  MessageSquare,
  GitGraph,
  GitMerge,
  UploadCloud,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { Navbar } from './components/Navbar.js';
import { CollabEditor, type PeerInfo } from './components/CollabEditor.js';
import { CollabChat } from './components/CollabChat.js';
import { GitGraphVisualizer } from './components/GitGraphVisualizer.js';
import { MergeStudio } from './components/MergeStudio.js';
import { ResearchIngest } from './components/ResearchIngest.js';
import { RagSearch } from './components/RagSearch.js';

const PEER_COLORS = [
  '#6366f1',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#3b82f6',
];

function getOrCreateLocalPeer(): PeerInfo {
  let id = '';
  if (typeof window !== 'undefined') {
    id = localStorage.getItem('git_crdt_peer_id') || '';
  }
  if (!id) {
    id = `peer_${Math.random().toString(36).substring(2, 7)}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem('git_crdt_peer_id', id);
    }
  }

  let name = '';
  if (typeof window !== 'undefined') {
    name = localStorage.getItem('git_crdt_peer_name') || '';
  }
  if (!name) {
    name = `Researcher (${id.slice(-4)})`;
    if (typeof window !== 'undefined') {
      localStorage.setItem('git_crdt_peer_name', name);
    }
  }

  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash << 5) - hash + id.charCodeAt(i);
  const color = PEER_COLORS[Math.abs(hash) % PEER_COLORS.length];

  return { id, name, color, isOnline: true };
}

export function App() {
  const [activeTab, setActiveTab] = useState<
    'ingest' | 'editor' | 'chat' | 'dag' | 'merge' | 'rag'
  >('ingest');

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('git_crdt_theme');
      if (stored === 'light' || stored === 'dark') return stored;
      if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('git_crdt_theme', theme);
    } catch (e) {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const [localPeer, setLocalPeer] = useState<PeerInfo>(getOrCreateLocalPeer);
  const [connectedPeers, setConnectedPeers] = useState<PeerInfo[]>([getOrCreateLocalPeer()]);
  const [activeBranch, setActiveBranch] = useState('main');
  const [wsConnected, setWsConnected] = useState(false);

  const [repoState, setRepoState] = useState<{
    name: string;
    branches: Array<{ name: string; commitId: string | null }>;
    currentCommitId: string | null;
    stats: {
      commits: number;
      trees: number;
      blobs: number;
      totalObjects: number;
    };
  }>({
    name: 'git-crdt-collab-repo',
    branches: [{ name: 'main', commitId: null }],
    currentCommitId: null,
    stats: { commits: 1, trees: 1, blobs: 2, totalObjects: 4 },
  });

  const [docState, setDocState] = useState<{
    title: string;
    text: string;
    metadata: Record<string, unknown>;
  }>({
    title: 'Untitled Document',
    text: 'Start collaborating on research notes, code, or ideas here...',
    metadata: {},
  });

  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [vectorClock, setVectorClock] = useState<Record<string, number>>({});
  const [opLog, setOpLog] = useState<any[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleUpdatePeerName = (newName: string) => {
    if (!newName.trim()) return;
    const updated = { ...localPeer, name: newName.trim() };
    setLocalPeer(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('git_crdt_peer_name', updated.name);
    }
    setConnectedPeers((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'join',
          room: activeBranch,
          peerId: updated.id,
          peerName: updated.name,
          color: updated.color,
        })
      );
    }
    showToast(`Display name updated to '${updated.name}'`);
  };

  const fetchRepoState = async () => {
    try {
      const res = await fetch('/api/repo/state');
      const data = await res.json();
      setRepoState({
        name: data.name,
        branches: data.branches || [],
        currentCommitId: data.currentCommitId,
        stats: data.stats,
      });
      if (data.currentBranch && data.currentBranch !== activeBranch) {
        setActiveBranch(data.currentBranch);
      }
    } catch (err) {
      console.error('Failed to fetch repo state:', err);
    }
  };

  const fetchSessionState = async () => {
    try {
      const res = await fetch(`/api/session/state?branch=${activeBranch}&peerId=${localPeer.id}`);
      const data = await res.json();
      if (data.doc) setDocState(data.doc);
      if (data.chat) setChatMessages(data.chat.messages || []);
      if (data.vectorClock) setVectorClock(data.vectorClock);
      if (data.operationsLog) setOpLog(data.operationsLog);
      if (data.activePeers && Array.isArray(data.activePeers)) {
        const list: PeerInfo[] = data.activePeers.map((p: any) =>
          typeof p === 'string' ? { id: p, name: p, color: '#6366f1' } : p
        );
        if (!list.some((p) => p.id === localPeer.id)) {
          list.unshift(localPeer);
        }
        setConnectedPeers(list);
      }
    } catch (err) {
      console.error('Failed to fetch session state:', err);
    }
  };

  useEffect(() => {
    fetchRepoState();
    fetchSessionState();
  }, [activeBranch, localPeer.id]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      ws.send(
        JSON.stringify({
          type: 'join',
          room: activeBranch,
          peerId: localPeer.id,
          peerName: localPeer.name,
          color: localPeer.color,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'sync-state') {
          if (msg.doc) setDocState(msg.doc);
          if (msg.chat) setChatMessages(msg.chat.messages || []);
          if (msg.vectorClock) setVectorClock(msg.vectorClock);
          if (msg.activePeers && Array.isArray(msg.activePeers)) {
            const list: PeerInfo[] = msg.activePeers.map((p: any) =>
              typeof p === 'string' ? { id: p, name: p, color: '#6366f1' } : p
            );
            if (!list.some((p) => p.id === localPeer.id)) {
              list.unshift(localPeer);
            }
            setConnectedPeers(list);
          }
        } else if (msg.type === 'crdt-op-applied') {
          if (msg.doc) setDocState(msg.doc);
          if (msg.vectorClock) setVectorClock(msg.vectorClock);
          setOpLog((prev) => [
            ...prev,
            {
              id: `op-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              peerId: msg.peerId,
              type: msg.opType,
              clock: msg.vectorClock?.[msg.peerId] || 0,
              timestamp: msg.timestamp || Date.now(),
            },
          ]);
        } else if (msg.type === 'chat-msg-received') {
          setChatMessages((prev) => [...prev, msg.message]);
          if (msg.vectorClock) setVectorClock(msg.vectorClock);
        } else if (msg.type === 'chat-reaction-updated') {
          setChatMessages((prev) =>
            prev.map((m) =>
              m.id === msg.messageId ? { ...m, reactions: msg.reactions } : m
            )
          );
        } else if (msg.type === 'peer-joined') {
          if (msg.activePeers && Array.isArray(msg.activePeers)) {
            const list: PeerInfo[] = msg.activePeers.map((p: any) =>
              typeof p === 'string' ? { id: p, name: p, color: '#6366f1' } : p
            );
            if (!list.some((p) => p.id === localPeer.id)) {
              list.unshift(localPeer);
            }
            setConnectedPeers(list);
          }
          if (msg.peerId !== localPeer.id) {
            showToast(`Peer '${msg.peerName || msg.peerId}' connected`);
          }
        } else if (msg.type === 'peer-left') {
          if (msg.activePeers && Array.isArray(msg.activePeers)) {
            const list: PeerInfo[] = msg.activePeers.map((p: any) =>
              typeof p === 'string' ? { id: p, name: p, color: '#6366f1' } : p
            );
            if (!list.some((p) => p.id === localPeer.id)) {
              list.unshift(localPeer);
            }
            setConnectedPeers(list);
          } else {
            setConnectedPeers((prev) =>
              prev.filter((p) => p.id !== msg.peerId || p.id === localPeer.id)
            );
          }
          if (msg.peerId !== localPeer.id) {
            showToast(`Peer '${msg.peerName || msg.peerId}' disconnected`);
          }
        }
      } catch (err) {
        console.error('WS message error:', err);
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [activeBranch, localPeer.id]);

  const handleEditDoc = async (type: 'insert' | 'delete' | 'setTitle' | 'setMetadata', payload: any) => {
    const editPeerId = payload.peerId || localPeer.id;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'crdt-op',
          room: activeBranch,
          peerId: editPeerId,
          payload: {
            opType: type,
            ...payload,
          },
        })
      );
    }

    try {
      const res = await fetch('/api/session/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch: activeBranch,
          peerId: editPeerId,
          type,
          ...payload,
        }),
      });
      const data = await res.json();
      if (data.doc) setDocState(data.doc);
      if (data.vectorClock) setVectorClock(data.vectorClock);
    } catch (err) {
      console.error('Doc edit error:', err);
    }
  };

  const handleSendMessage = async (text: string, author: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'chat-msg',
          room: activeBranch,
          peerId: localPeer.id,
          payload: { text, authorName: author || localPeer.name },
        })
      );
    }
  };

  const handleReactMessage = async (messageId: string, emoji: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'chat-reaction',
          room: activeBranch,
          peerId: localPeer.id,
          payload: { messageId, emoji },
        })
      );
    }
  };

  const handleCommitCheckpoint = async (message: string) => {
    try {
      const res = await fetch('/api/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch: activeBranch,
          peerId: localPeer.id,
          message,
          authorName: localPeer.name || localPeer.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Checkpoint created: ${data.commit.id.slice(0, 7)}`);
        fetchRepoState();
      }
    } catch (err) {
      console.error('Commit failed:', err);
    }
  };

  const handleCreateBranch = async (branchName: string) => {
    try {
      const res = await fetch('/api/branch/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: branchName }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Branch '${branchName}' created successfully!`);
        fetchRepoState();
        setActiveBranch(branchName);
      }
    } catch (err) {
      console.error('Branch creation failed:', err);
    }
  };

  const handleBranchChange = async (branch: string) => {
    try {
      await fetch('/api/branch/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: branch }),
      });
      setActiveBranch(branch);
      fetchRepoState();
      showToast(`Switched to branch '${branch}'`);
    } catch (err) {
      console.error('Checkout failed:', err);
    }
  };

  const handleExecuteMerge = async (target: string, source: string) => {
    const res = await fetch('/api/branch/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetBranch: target, sourceBranch: source }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Merge execution failed');
    fetchRepoState();
    showToast(`Merged '${source}' into '${target}'!`);
    return data;
  };

  return (
    <div className="app-layout">
      {/* Top Header */}
      <Navbar
        repoName={repoState.name}
        activeBranch={activeBranch}
        branches={repoState.branches}
        currentCommitId={repoState.currentCommitId}
        stats={repoState.stats}
        wsConnected={wsConnected}
        theme={theme}
        onToggleTheme={toggleTheme}
        onBranchChange={handleBranchChange}
        onCreateBranch={handleCreateBranch}
        onRefresh={() => {
          fetchRepoState();
          fetchSessionState();
          showToast('Refreshed repository state');
        }}
        onQuickCheckpoint={() =>
          handleCommitCheckpoint(`feat: checkpoint on branch ${activeBranch}`)
        }
      />

      {/* Main App Body */}
      <main className="main-content">
        {/* Navigation Tabs Bar */}
        <div className="tab-nav-container">
          <button
            onClick={() => setActiveTab('ingest')}
            className={`tab-btn ${activeTab === 'ingest' ? 'active' : ''}`}
          >
            <UploadCloud style={{ width: '15px', height: '15px' }} />
            <span>AI Research Ingestion</span>
          </button>

          <button
            onClick={() => setActiveTab('editor')}
            className={`tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
          >
            <FileEdit style={{ width: '15px', height: '15px' }} />
            <span>Collaborative Workspace</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          >
            <MessageSquare style={{ width: '15px', height: '15px' }} />
            <span>Team Chat ({chatMessages.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('dag')}
            className={`tab-btn ${activeTab === 'dag' ? 'active' : ''}`}
          >
            <GitGraph style={{ width: '15px', height: '15px' }} />
            <span>Git DAG & Commit Graph</span>
          </button>

          <button
            onClick={() => setActiveTab('merge')}
            className={`tab-btn ${activeTab === 'merge' ? 'active' : ''}`}
          >
            <GitMerge style={{ width: '15px', height: '15px' }} />
            <span>3-Way Merge Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('rag')}
            className={`tab-btn ${activeTab === 'rag' ? 'active' : ''}`}
          >
            <Search style={{ width: '15px', height: '15px' }} />
            <span>Semantic RAG Search</span>
          </button>
        </div>

        {/* Tab View Contents */}
        {activeTab === 'ingest' && <ResearchIngest />}

        {activeTab === 'editor' && (
          <CollabEditor
            activeBranch={activeBranch}
            currentPeer={localPeer.id}
            localPeerName={localPeer.name}
            peersList={connectedPeers}
            docState={docState}
            vectorClock={vectorClock}
            opLog={opLog}
            onEditDoc={handleEditDoc}
            onCommitCheckpoint={handleCommitCheckpoint}
            onUpdatePeerName={handleUpdatePeerName}
          />
        )}

        {activeTab === 'chat' && (
          <CollabChat
            activeBranch={activeBranch}
            currentPeer={localPeer.id}
            localPeerName={localPeer.name}
            peersList={connectedPeers}
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            onReactMessage={handleReactMessage}
            onCommitCheckpoint={handleCommitCheckpoint}
          />
        )}

        {activeTab === 'dag' && (
          <GitGraphVisualizer
            onRestoreSession={async (commitId) => {
              showToast(`Session restored from commit: ${commitId.slice(0, 7)}`);
              fetchSessionState();
              setActiveTab('editor');
            }}
          />
        )}

        {activeTab === 'merge' && (
          <MergeStudio
            branches={repoState.branches}
            activeBranch={activeBranch}
            onExecuteMerge={handleExecuteMerge}
            onRefreshDag={fetchRepoState}
          />
        )}

        {activeTab === 'rag' && <RagSearch />}
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-box">
          <CheckCircle2 style={{ width: '16px', height: '16px', color: 'var(--emerald)' }} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default App;
