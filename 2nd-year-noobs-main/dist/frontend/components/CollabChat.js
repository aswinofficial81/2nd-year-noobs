import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { MessageSquare, Send, GitCommit, Clock, Users, } from 'lucide-react';
const EMOJI_LIST = ['🚀', '🔥', '👍', '❤️', '💡', '🎉'];
export const CollabChat = ({ activeBranch, currentPeer, peersList, messages, onSendMessage, onReactMessage, onCommitCheckpoint, }) => {
    const [inputMsg, setInputMsg] = useState('');
    const [activeAuthor, setActiveAuthor] = useState(currentPeer);
    const handleSend = (e) => {
        e.preventDefault();
        if (!inputMsg.trim())
            return;
        onSendMessage(inputMsg.trim(), activeAuthor);
        setInputMsg('');
    };
    const getAuthorPeer = (authorId) => {
        return (peersList.find((p) => p.id === authorId || p.name === authorId) || {
            id: authorId,
            name: authorId,
            color: '#6366f1',
        });
    };
    return (_jsxs("div", { className: "glass-card", style: { maxWidth: '900px', margin: '0 auto' }, children: [_jsxs("div", { className: "glass-card-header", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.75rem' }, children: [_jsx("div", { style: { padding: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--indigo)' }, children: _jsx(MessageSquare, { style: { width: '18px', height: '18px' } }) }), _jsxs("div", { children: [_jsxs("h2", { style: { fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }, children: ["Collaborative Team Chat Channel", _jsx("span", { className: "badge badge-indigo", children: "Causal CRDT Stream" })] }), _jsxs("p", { style: { fontSize: '0.75rem', color: 'var(--text-muted)' }, children: ["Synchronized peer discussion on branch ", _jsx("b", { style: { color: 'var(--emerald-light)' }, children: activeBranch })] })] })] }), _jsxs("button", { onClick: () => onCommitCheckpoint(`chore: checkpoint chat transcript on ${activeBranch}`), className: "btn btn-secondary btn-sm", children: [_jsx(GitCommit, { style: { width: '13px', height: '13px', color: 'var(--cyan)' } }), _jsx("span", { children: "Checkpoint Chat Log" })] })] }), _jsxs("div", { className: "chat-window", children: [_jsx("div", { className: "chat-message-list", children: messages.length === 0 ? (_jsxs("div", { style: { textAlign: 'center', padding: '5rem 0', color: 'var(--text-dim)' }, children: [_jsx(MessageSquare, { style: { width: '32px', height: '32px', margin: '0 auto 0.5rem auto', opacity: 0.5 } }), _jsx("p", { style: { fontSize: '0.875rem' }, children: "No messages in this branch room yet." }), _jsx("p", { style: { fontSize: '0.75rem', color: 'var(--text-dim)' }, children: "Start collaborating by sending the first message below!" })] })) : (messages.map((msg) => {
                            const peer = getAuthorPeer(msg.author);
                            const isSelf = msg.author === currentPeer || msg.author === activeAuthor;
                            return (_jsxs("div", { className: `chat-msg-row ${isSelf ? 'self' : ''}`, children: [_jsx("div", { className: "chat-avatar", style: { backgroundColor: peer.color }, children: peer.name[0].toUpperCase() }), _jsxs("div", { className: `chat-bubble ${isSelf ? 'self' : ''}`, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.25rem', fontSize: '0.75rem' }, children: [_jsxs("span", { style: { fontWeight: 700, color: 'var(--text-primary)' }, children: [peer.name, " ", isSelf && _jsx("span", { style: { color: 'var(--indigo-light)', fontWeight: 400 }, children: "(You)" })] }), _jsxs("span", { className: "mono", style: { fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.2rem' }, children: [_jsx(Clock, { style: { width: '10px', height: '10px' } }), new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })] })] }), _jsx("p", { style: { fontSize: '0.85rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }, children: msg.text }), _jsxs("div", { className: "chat-reactions-row", children: [Object.entries(msg.reactions || {}).map(([emoji, reactors]) => (_jsxs("button", { onClick: () => onReactMessage(msg.id, emoji), className: "reaction-chip", style: reactors.includes(currentPeer) ? { background: 'var(--indigo-glow)', borderColor: 'var(--indigo)' } : {}, children: [_jsx("span", { children: emoji }), _jsx("span", { className: "mono", style: { fontWeight: 700 }, children: reactors.length })] }, emoji))), _jsx("div", { style: { display: 'flex', gap: '0.2rem', marginLeft: 'auto', opacity: 0.8 }, children: EMOJI_LIST.map((emoji) => (_jsx("button", { onClick: () => onReactMessage(msg.id, emoji), className: "btn btn-icon btn-sm", style: { padding: '0.1rem 0.25rem', fontSize: '0.75rem' }, title: `React with ${emoji}`, children: emoji }, emoji))) })] })] })] }, msg.id));
                        })) }), _jsxs("form", { onSubmit: handleSend, style: { marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }, children: [_jsx(Users, { style: { width: '13px', height: '13px', color: 'var(--indigo)' } }), _jsx("span", { children: "Send persona:" }), _jsx("div", { style: { display: 'flex', gap: '0.3rem' }, children: peersList.map((p) => (_jsx("button", { type: "button", onClick: () => setActiveAuthor(p.id), style: {
                                                background: activeAuthor === p.id ? 'var(--indigo)' : 'var(--bg-surface)',
                                                color: activeAuthor === p.id ? '#ffffff' : 'var(--text-secondary)',
                                                border: '1px solid var(--border-subtle)',
                                                borderRadius: 'var(--radius-sm)',
                                                padding: '0.15rem 0.45rem',
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                            }, children: p.name }, p.id))) })] }), _jsxs("div", { style: { display: 'flex', gap: '0.5rem' }, children: [_jsx("input", { type: "text", value: inputMsg, onChange: (e) => setInputMsg(e.target.value), placeholder: "Type a collaborative message or review note...", className: "input-control" }), _jsxs("button", { type: "submit", className: "btn btn-primary", style: { padding: '0.65rem 1.25rem' }, children: [_jsx(Send, { style: { width: '14px', height: '14px' } }), _jsx("span", { children: "Send" })] })] })] })] })] }));
};
//# sourceMappingURL=CollabChat.js.map