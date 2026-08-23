import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { FileEdit, MessageSquare, GitGraph, GitMerge, UploadCloud, Search, CheckCircle2, } from 'lucide-react';
import { Navbar } from './components/Navbar.js';
import { CollabEditor } from './components/CollabEditor.js';
import { CollabChat } from './components/CollabChat.js';
import { GitGraphVisualizer } from './components/GitGraphVisualizer.js';
import { MergeStudio } from './components/MergeStudio.js';
import { ResearchIngest } from './components/ResearchIngest.js';
import { RagSearch } from './components/RagSearch.js';
const PEERS_LIST = [
    { id: 'alice', name: 'Alice (Lead)', color: '#6366f1' },
    { id: 'bob', name: 'Bob (Researcher)', color: '#06b6d4' },
    { id: 'carol', name: 'Carol (Architect)', color: '#10b981' },
    { id: 'dave', name: 'Dave (Reviewer)', color: '#f59e0b' },
];
export function App() {
    const [activeTab, setActiveTab] = useState('ingest');
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('git_crdt_theme');
            if (stored === 'light' || stored === 'dark')
                return stored;
            if (window.matchMedia('(prefers-color-scheme: light)').matches)
                return 'light';
        }
        return 'dark';
    });
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        try {
            localStorage.setItem('git_crdt_theme', theme);
        }
        catch (e) { }
    }, [theme]);
    const toggleTheme = () => {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    };
    const [activeBranch, setActiveBranch] = useState('main');
    const [currentPeer, setCurrentPeer] = useState('alice');
    const [wsConnected, setWsConnected] = useState(false);
    const [repoState, setRepoState] = useState({
        name: 'git-crdt-collab-repo',
        branches: [{ name: 'main', commitId: null }],
        currentCommitId: null,
        stats: { commits: 1, trees: 1, blobs: 2, totalObjects: 4 },
    });
    const [docState, setDocState] = useState({
        title: 'Git + CRDT Whitepaper',
        text: 'Decentralized Version Control & Real-time Collaboration Engine.',
        metadata: { version: '1.0.0-rc' },
    });
    const [chatMessages, setChatMessages] = useState([]);
    const [vectorClock, setVectorClock] = useState({ alice: 1 });
    const [opLog, setOpLog] = useState([]);
    const [toastMessage, setToastMessage] = useState(null);
    const wsRef = useRef(null);
    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
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
        }
        catch (err) {
            console.error('Failed to fetch repo state:', err);
        }
    };
    const fetchSessionState = async () => {
        try {
            const res = await fetch(`/api/session/state?branch=${activeBranch}&peerId=${currentPeer}`);
            const data = await res.json();
            if (data.doc)
                setDocState(data.doc);
            if (data.chat)
                setChatMessages(data.chat.messages || []);
            if (data.vectorClock)
                setVectorClock(data.vectorClock);
            if (data.operationsLog)
                setOpLog(data.operationsLog);
        }
        catch (err) {
            console.error('Failed to fetch session state:', err);
        }
    };
    useEffect(() => {
        fetchRepoState();
        fetchSessionState();
    }, [activeBranch, currentPeer]);
    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/ws`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onopen = () => {
            setWsConnected(true);
            ws.send(JSON.stringify({
                type: 'join',
                room: activeBranch,
                peerId: currentPeer,
            }));
        };
        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === 'sync-state') {
                    if (msg.doc)
                        setDocState(msg.doc);
                    if (msg.chat)
                        setChatMessages(msg.chat.messages || []);
                    if (msg.vectorClock)
                        setVectorClock(msg.vectorClock);
                }
                else if (msg.type === 'crdt-op-applied') {
                    if (msg.doc)
                        setDocState(msg.doc);
                    if (msg.vectorClock)
                        setVectorClock(msg.vectorClock);
                    setOpLog((prev) => [
                        ...prev,
                        {
                            id: `op-${Date.now()}`,
                            peerId: msg.peerId,
                            type: msg.opType,
                            clock: (msg.vectorClock?.[msg.peerId] || 0),
                            timestamp: msg.timestamp || Date.now(),
                        },
                    ]);
                }
                else if (msg.type === 'chat-msg-received') {
                    setChatMessages((prev) => [...prev, msg.message]);
                    if (msg.vectorClock)
                        setVectorClock(msg.vectorClock);
                }
                else if (msg.type === 'chat-reaction-updated') {
                    setChatMessages((prev) => prev.map((m) => m.id === msg.messageId ? { ...m, reactions: msg.reactions } : m));
                }
                else if (msg.type === 'peer-joined') {
                    showToast(`Peer '${msg.peerId}' connected to ${activeBranch}`);
                }
            }
            catch (err) {
                console.error('WS message error:', err);
            }
        };
        ws.onclose = () => {
            setWsConnected(false);
        };
        return () => {
            ws.close();
        };
    }, [activeBranch, currentPeer]);
    const handleEditDoc = async (type, payload) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'crdt-op',
                room: activeBranch,
                peerId: currentPeer,
                payload: {
                    opType: type,
                    ...payload,
                },
            }));
        }
        try {
            const res = await fetch('/api/session/edit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    branch: activeBranch,
                    peerId: currentPeer,
                    type,
                    ...payload,
                }),
            });
            const data = await res.json();
            if (data.doc)
                setDocState(data.doc);
            if (data.vectorClock)
                setVectorClock(data.vectorClock);
        }
        catch (err) {
            console.error('Doc edit error:', err);
        }
    };
    const handleSendMessage = async (text, author) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'chat-msg',
                room: activeBranch,
                peerId: author || currentPeer,
                payload: { text, authorName: author },
            }));
        }
    };
    const handleReactMessage = async (messageId, emoji) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'chat-reaction',
                room: activeBranch,
                peerId: currentPeer,
                payload: { messageId, emoji },
            }));
        }
    };
    const handleCommitCheckpoint = async (message) => {
        try {
            const res = await fetch('/api/commit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    branch: activeBranch,
                    peerId: currentPeer,
                    message,
                    authorName: PEERS_LIST.find((p) => p.id === currentPeer)?.name || currentPeer,
                }),
            });
            const data = await res.json();
            if (data.success) {
                showToast(`Checkpoint created: ${data.commit.id.slice(0, 7)}`);
                fetchRepoState();
            }
        }
        catch (err) {
            console.error('Commit failed:', err);
        }
    };
    const handleSyncPeers = async (peerA, peerB) => {
        try {
            const res = await fetch('/api/session/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ branch: activeBranch, peerA, peerB }),
            });
            const data = await res.json();
            if (data.success) {
                showToast(data.message);
                fetchSessionState();
            }
        }
        catch (err) {
            console.error('Sync failed:', err);
        }
    };
    const handleCreateBranch = async (branchName) => {
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
        }
        catch (err) {
            console.error('Branch creation failed:', err);
        }
    };
    const handleBranchChange = async (branch) => {
        try {
            await fetch('/api/branch/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target: branch }),
            });
            setActiveBranch(branch);
            fetchRepoState();
            showToast(`Switched to branch '${branch}'`);
        }
        catch (err) {
            console.error('Checkout failed:', err);
        }
    };
    const handleExecuteMerge = async (target, source) => {
        const res = await fetch('/api/branch/merge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetBranch: target, sourceBranch: source }),
        });
        const data = await res.json();
        if (!res.ok)
            throw new Error(data.error || 'Merge execution failed');
        fetchRepoState();
        showToast(`Merged '${source}' into '${target}'!`);
        return data;
    };
    return (_jsxs("div", { className: "app-layout", children: [_jsx(Navbar, { repoName: repoState.name, activeBranch: activeBranch, branches: repoState.branches, currentCommitId: repoState.currentCommitId, stats: repoState.stats, wsConnected: wsConnected, theme: theme, onToggleTheme: toggleTheme, onBranchChange: handleBranchChange, onCreateBranch: handleCreateBranch, onRefresh: () => {
                    fetchRepoState();
                    fetchSessionState();
                    showToast('Refreshed repository state');
                }, onQuickCheckpoint: () => handleCommitCheckpoint(`feat: checkpoint on branch ${activeBranch}`) }), _jsxs("main", { className: "main-content", children: [_jsxs("div", { className: "tab-nav-container", children: [_jsxs("button", { onClick: () => setActiveTab('ingest'), className: `tab-btn ${activeTab === 'ingest' ? 'active' : ''}`, children: [_jsx(UploadCloud, { style: { width: '15px', height: '15px' } }), _jsx("span", { children: "AI Research Ingestion" })] }), _jsxs("button", { onClick: () => setActiveTab('editor'), className: `tab-btn ${activeTab === 'editor' ? 'active' : ''}`, children: [_jsx(FileEdit, { style: { width: '15px', height: '15px' } }), _jsx("span", { children: "Collaborative Workspace" })] }), _jsxs("button", { onClick: () => setActiveTab('chat'), className: `tab-btn ${activeTab === 'chat' ? 'active' : ''}`, children: [_jsx(MessageSquare, { style: { width: '15px', height: '15px' } }), _jsxs("span", { children: ["Team Chat (", chatMessages.length, ")"] })] }), _jsxs("button", { onClick: () => setActiveTab('dag'), className: `tab-btn ${activeTab === 'dag' ? 'active' : ''}`, children: [_jsx(GitGraph, { style: { width: '15px', height: '15px' } }), _jsx("span", { children: "Git DAG & Commit Graph" })] }), _jsxs("button", { onClick: () => setActiveTab('merge'), className: `tab-btn ${activeTab === 'merge' ? 'active' : ''}`, children: [_jsx(GitMerge, { style: { width: '15px', height: '15px' } }), _jsx("span", { children: "3-Way Merge Studio" })] }), _jsxs("button", { onClick: () => setActiveTab('rag'), className: `tab-btn ${activeTab === 'rag' ? 'active' : ''}`, children: [_jsx(Search, { style: { width: '15px', height: '15px' } }), _jsx("span", { children: "Semantic RAG Search" })] })] }), activeTab === 'ingest' && _jsx(ResearchIngest, {}), activeTab === 'editor' && (_jsx(CollabEditor, { activeBranch: activeBranch, currentPeer: currentPeer, peersList: PEERS_LIST, docState: docState, vectorClock: vectorClock, opLog: opLog, onEditDoc: handleEditDoc, onCommitCheckpoint: handleCommitCheckpoint, onSyncPeers: handleSyncPeers, onSelectPeer: setCurrentPeer })), activeTab === 'chat' && (_jsx(CollabChat, { activeBranch: activeBranch, currentPeer: currentPeer, peersList: PEERS_LIST, messages: chatMessages, onSendMessage: handleSendMessage, onReactMessage: handleReactMessage, onCommitCheckpoint: handleCommitCheckpoint })), activeTab === 'dag' && (_jsx(GitGraphVisualizer, { onRestoreSession: async (commitId) => {
                            showToast(`Session restored from commit: ${commitId.slice(0, 7)}`);
                            fetchSessionState();
                            setActiveTab('editor');
                        } })), activeTab === 'merge' && (_jsx(MergeStudio, { branches: repoState.branches, activeBranch: activeBranch, onExecuteMerge: handleExecuteMerge, onRefreshDag: fetchRepoState })), activeTab === 'rag' && _jsx(RagSearch, {})] }), toastMessage && (_jsxs("div", { className: "toast-box", children: [_jsx(CheckCircle2, { style: { width: '16px', height: '16px', color: 'var(--emerald)' } }), _jsx("span", { children: toastMessage })] }))] }));
}
export default App;
//# sourceMappingURL=App.js.map