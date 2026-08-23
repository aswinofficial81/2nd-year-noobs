import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { FileText, Users, Clock, GitCommit, Sparkles, RefreshCw, Zap, Tag, CheckCircle2, Layers, } from 'lucide-react';
export const CollabEditor = ({ activeBranch, currentPeer, peersList, docState, vectorClock, opLog, onEditDoc, onCommitCheckpoint, onSyncPeers, onSelectPeer, }) => {
    const [localText, setLocalText] = useState(docState.text || '');
    const [localTitle, setLocalTitle] = useState(docState.title || '');
    const [commitMessage, setCommitMessage] = useState('');
    const [showCommitBox, setShowCommitBox] = useState(false);
    const [newMetaKey, setNewMetaKey] = useState('');
    const [newMetaVal, setNewMetaVal] = useState('');
    const [isSimulating, setIsSimulating] = useState(false);
    useEffect(() => {
        setLocalText(docState.text || '');
    }, [docState.text]);
    useEffect(() => {
        setLocalTitle(docState.title || '');
    }, [docState.title]);
    const handleTextChange = (e) => {
        const newText = e.target.value;
        setLocalText(newText);
        onEditDoc('insert', { text: newText, position: 0 });
    };
    const handleTitleChange = (e) => {
        const newTitle = e.target.value;
        setLocalTitle(newTitle);
        onEditDoc('setTitle', { title: newTitle });
    };
    const handleAddMetadata = (e) => {
        e.preventDefault();
        if (!newMetaKey.trim())
            return;
        onEditDoc('setMetadata', { key: newMetaKey.trim(), value: newMetaVal });
        setNewMetaKey('');
        setNewMetaVal('');
    };
    const handleCommitSubmit = (e) => {
        e.preventDefault();
        if (!commitMessage.trim())
            return;
        onCommitCheckpoint(commitMessage.trim());
        setCommitMessage('');
        setShowCommitBox(false);
    };
    const triggerConcurrentEditDemo = async () => {
        setIsSimulating(true);
        const phrasesAlice = [' [Alice: Real-Time CRDT Stream]', ' [Alice: Zero Conflict Verification]'];
        const phrasesBob = [' [Bob: Immutable Git DAG]', ' [Bob: Deterministic Vector Ordering]'];
        for (let i = 0; i < phrasesAlice.length; i++) {
            onEditDoc('insert', { text: localText + phrasesAlice[i], position: localText.length });
            await new Promise((r) => setTimeout(r, 250));
            onEditDoc('insert', { text: localText + phrasesAlice[i] + phrasesBob[i], position: localText.length });
            await new Promise((r) => setTimeout(r, 250));
        }
        setIsSimulating(false);
    };
    const currentPeerObj = peersList.find((p) => p.id === currentPeer) || peersList[0];
    return (_jsxs("div", { className: "grid-12", children: [_jsx("div", { className: "col-8", children: _jsxs("div", { className: "glass-card", style: { height: '100%' }, children: [_jsxs("div", { className: "glass-card-header", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.6rem' }, children: [_jsx(Users, { style: { width: '15px', height: '15px', color: 'var(--indigo)' } }), _jsx("span", { style: { fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }, children: "Active Peer Persona:" }), _jsx("div", { className: "persona-selector", children: peersList.map((peer) => (_jsxs("button", { onClick: () => onSelectPeer(peer.id), className: `persona-btn ${currentPeer === peer.id ? 'active' : ''}`, children: [_jsx("span", { style: {
                                                            width: '8px',
                                                            height: '8px',
                                                            borderRadius: '50%',
                                                            backgroundColor: peer.color,
                                                            display: 'inline-block',
                                                        } }), peer.name] }, peer.id))) })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.5rem' }, children: [_jsxs("button", { onClick: triggerConcurrentEditDemo, disabled: isSimulating, className: "btn btn-secondary btn-sm", style: { color: 'var(--cyan-light)', borderColor: 'rgba(6, 182, 212, 0.3)' }, children: [_jsx(Zap, { style: { width: '13px', height: '13px', color: 'var(--cyan)' } }), _jsx("span", { children: isSimulating ? 'Simulating...' : 'Concurrent Stream' })] }), _jsxs("button", { onClick: () => onSyncPeers('alice', 'bob'), className: "btn btn-secondary btn-sm", style: { color: 'var(--emerald-light)', borderColor: 'rgba(16, 185, 129, 0.3)' }, children: [_jsx(RefreshCw, { style: { width: '13px', height: '13px', color: 'var(--emerald)' } }), _jsx("span", { children: "Sync Replicas" })] })] })] }), _jsxs("div", { style: { marginBottom: '1rem' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }, children: [_jsx(FileText, { style: { width: '14px', height: '14px', color: 'var(--cyan)' } }), _jsx("label", { style: { fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }, children: "Document Title (CRDT String)" })] }), _jsx("input", { type: "text", value: localTitle, onChange: handleTitleChange, placeholder: "e.g. Distributed Consensus Whitepaper", className: "input-control", style: { fontSize: '1.1rem', fontWeight: 700 } })] }), _jsxs("div", { style: { marginBottom: '1rem' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }, children: [_jsxs("label", { style: { fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }, children: [_jsx("span", { children: "Collaborative Content Body" }), _jsx("span", { className: "badge badge-emerald", children: "Live CRDT Text" })] }), _jsxs("span", { className: "mono", style: { fontSize: '0.75rem', color: 'var(--text-muted)' }, children: [localText.length, " chars \u2022 ", localText.split(/\s+/).filter(Boolean).length, " words"] })] }), _jsx("textarea", { rows: 10, value: localText, onChange: handleTextChange, placeholder: "Start typing collaborative research notes, code, or ideas here...", className: "textarea-control" })] }), _jsxs("div", { style: { background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '1.25rem' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }, children: [_jsxs("span", { style: { fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }, children: [_jsx(Tag, { style: { width: '13px', height: '13px', color: 'var(--amber)' } }), "CRDT Metadata Key-Value Map"] }), _jsx("span", { className: "badge badge-amber", children: "CRDT State Map" })] }), _jsxs("div", { style: { display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.65rem' }, children: [Object.entries(docState.metadata || {}).map(([key, val]) => (_jsxs("div", { className: "mono", style: { fontSize: '0.75rem', background: 'var(--bg-space)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(245, 158, 11, 0.3)', color: 'var(--amber-light)' }, children: [_jsxs("span", { style: { color: 'var(--text-muted)' }, children: [key, ": "] }), _jsx("span", { style: { fontWeight: 600 }, children: String(val) })] }, key))), Object.keys(docState.metadata || {}).length === 0 && (_jsx("span", { style: { fontSize: '0.75rem', color: 'var(--text-dim)', fontStyle: 'italic' }, children: "No custom metadata tags added." }))] }), _jsxs("form", { onSubmit: handleAddMetadata, style: { display: 'flex', gap: '0.5rem' }, children: [_jsx("input", { type: "text", placeholder: "Key (e.g. status)", value: newMetaKey, onChange: (e) => setNewMetaKey(e.target.value), className: "input-control", style: { padding: '0.35rem 0.65rem', fontSize: '0.75rem', flex: '1' } }), _jsx("input", { type: "text", placeholder: "Value (e.g. reviewed)", value: newMetaVal, onChange: (e) => setNewMetaVal(e.target.value), className: "input-control", style: { padding: '0.35rem 0.65rem', fontSize: '0.75rem', flex: '2' } }), _jsx("button", { type: "submit", className: "btn btn-secondary btn-sm", children: "Add Tag" })] })] }), !showCommitBox ? (_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }, children: [_jsx(CheckCircle2, { style: { width: '15px', height: '15px', color: 'var(--emerald)' } }), _jsx("span", { children: "All edits buffered in CRDT replica. Ready to commit into Git DAG." })] }), _jsxs("button", { onClick: () => setShowCommitBox(true), className: "btn btn-primary btn-sm", children: [_jsx(GitCommit, { style: { width: '14px', height: '14px' } }), _jsx("span", { children: "Create Git Checkpoint" })] })] })) : (_jsxs("form", { onSubmit: handleCommitSubmit, style: {
                                background: 'rgba(99, 102, 241, 0.1)',
                                border: '1px solid var(--indigo)',
                                borderRadius: 'var(--radius-md)',
                                padding: '1rem',
                            }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }, children: [_jsxs("h4", { style: { fontSize: '0.8rem', fontWeight: 700, color: 'var(--indigo-light)', display: 'flex', alignItems: 'center', gap: '0.4rem' }, children: [_jsx(GitCommit, { style: { width: '14px', height: '14px' } }), "Checkpoint CRDT Session into Git DAG"] }), _jsx("button", { type: "button", onClick: () => setShowCommitBox(false), style: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer' }, children: "Cancel" })] }), _jsx("input", { type: "text", autoFocus: true, placeholder: "e.g. feat: finalize introduction and benchmark results", value: commitMessage, onChange: (e) => setCommitMessage(e.target.value), className: "input-control", style: { marginBottom: '0.75rem' } }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }, children: [_jsxs("span", { children: ["Author: ", _jsx("b", { style: { color: 'var(--text-primary)' }, children: currentPeerObj.name }), " on branch ", _jsx("b", { style: { color: 'var(--emerald-light)' }, children: activeBranch })] }), _jsx("button", { type: "submit", className: "btn btn-primary btn-sm", children: "Commit Checkpoint" })] })] }))] }) }), _jsxs("div", { className: "col-4", style: { display: 'flex', flexDirection: 'column', gap: '1.5rem' }, children: [_jsxs("div", { className: "glass-card", children: [_jsxs("div", { className: "glass-card-header", style: { paddingBottom: '0.65rem', marginBottom: '0.85rem' }, children: [_jsxs("h3", { style: { fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }, children: [_jsx(Clock, { style: { width: '15px', height: '15px', color: 'var(--cyan)' } }), "Vector Clock State"] }), _jsx("span", { className: "badge badge-cyan", children: "Causal Clocks" })] }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }, children: peersList.map((peer) => {
                                    const clockVal = vectorClock[peer.id] || 0;
                                    return (_jsxs("div", { className: "vector-hud-card", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.4rem' }, children: [_jsx("span", { style: {
                                                            width: '9px',
                                                            height: '9px',
                                                            borderRadius: '50%',
                                                            backgroundColor: peer.color,
                                                            display: 'inline-block',
                                                        } }), _jsx("span", { style: { fontSize: '0.8rem', fontWeight: 600 }, children: peer.name }), _jsxs("span", { className: "mono", style: { fontSize: '0.7rem', color: 'var(--text-muted)' }, children: ["(", peer.id, ")"] })] }), _jsxs("div", { className: "badge badge-indigo mono", children: ["Clock: ", clockVal] })] }, peer.id));
                                }) }), _jsxs("div", { style: { background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: 'var(--text-secondary)' }, children: [_jsxs("div", { style: { fontWeight: 700, color: 'var(--indigo-light)', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }, children: [_jsx(Sparkles, { style: { width: '13px', height: '13px' } }), "Causality Invariant:"] }), _jsx("p", { style: { fontSize: '0.7rem', lineHeight: 1.4, color: 'var(--text-muted)' }, children: "Every operation carries its causal vector clock snapshot. Concurrent operations are deterministically ordered using Lamport clocks and peer UUID tie-breakers." })] })] }), _jsxs("div", { className: "glass-card", style: { flex: 1 }, children: [_jsxs("div", { className: "glass-card-header", style: { paddingBottom: '0.65rem', marginBottom: '0.85rem' }, children: [_jsxs("h3", { style: { fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }, children: [_jsx(Layers, { style: { width: '15px', height: '15px', color: 'var(--emerald)' } }), "Operation Stream"] }), _jsxs("span", { className: "badge badge-emerald mono", children: [opLog.length, " Ops Logged"] })] }), _jsxs("div", { style: { maxHeight: '280px', overflowY: 'auto', paddingRight: '0.25rem' }, children: [opLog.slice(-15).reverse().map((op, idx) => (_jsxs("div", { className: "op-log-item", children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }, children: [_jsx("span", { className: "badge badge-indigo", style: { fontSize: '0.65rem', textTransform: 'uppercase' }, children: op.type }), _jsxs("span", { style: { color: 'var(--text-muted)', fontSize: '0.7rem' }, children: ["clock: ", op.clock] })] }), _jsxs("div", { style: { color: 'var(--text-secondary)', fontSize: '0.7rem' }, children: ["peer: ", _jsx("span", { style: { color: 'var(--cyan)' }, children: op.peerId }), " \u2022 id: ", op.id?.slice(0, 8)] })] }, op.id || idx))), opLog.length === 0 && (_jsx("div", { style: { textAlign: 'center', padding: '2rem 0', color: 'var(--text-dim)', fontSize: '0.75rem' }, children: "No operations recorded yet. Start editing to generate CRDT ops!" }))] })] })] })] }));
};
//# sourceMappingURL=CollabEditor.js.map