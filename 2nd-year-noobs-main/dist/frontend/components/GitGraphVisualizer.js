import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { GitGraph, GitCommit, GitBranch, Search, Layers, ArrowRight, ExternalLink, Clock, } from 'lucide-react';
import { CommitInspectorModal } from './CommitInspectorModal.js';
export const GitGraphVisualizer = ({ onRestoreSession, }) => {
    const [dagData, setDagData] = useState({ nodes: [], edges: [], head: null, activeCommit: null });
    const [loading, setLoading] = useState(true);
    const [inspectedCommitId, setInspectedCommitId] = useState(null);
    const [filterQuery, setFilterQuery] = useState('');
    const fetchDag = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/repo/dag');
            const data = await res.json();
            setDagData(data);
        }
        catch (err) {
            console.error('Failed to fetch DAG:', err);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchDag();
    }, []);
    const filteredNodes = dagData.nodes.filter((n) => n.message.toLowerCase().includes(filterQuery.toLowerCase()) ||
        n.id.toLowerCase().includes(filterQuery.toLowerCase()) ||
        n.author.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
        n.branches.some((b) => b.toLowerCase().includes(filterQuery.toLowerCase())));
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '1.5rem' }, children: [_jsxs("div", { className: "glass-card", children: [_jsxs("div", { className: "glass-card-header", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.75rem' }, children: [_jsx("div", { style: { padding: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--indigo)' }, children: _jsx(GitGraph, { style: { width: '20px', height: '20px' } }) }), _jsxs("div", { children: [_jsxs("h2", { style: { fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }, children: ["Git Directed Acyclic Graph (DAG) Visualizer", _jsx("span", { className: "badge badge-indigo", children: "Immutable History" })] }), _jsx("p", { style: { fontSize: '0.75rem', color: 'var(--text-muted)' }, children: "Cryptographically verifiable commit graph with parent ancestry and branch pointers" })] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.75rem' }, children: [_jsxs("div", { style: { position: 'relative' }, children: [_jsx(Search, { style: { width: '13px', height: '13px', position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' } }), _jsx("input", { type: "text", placeholder: "Filter commits...", value: filterQuery, onChange: (e) => setFilterQuery(e.target.value), className: "input-control", style: { padding: '0.35rem 0.65rem 0.35rem 1.85rem', fontSize: '0.75rem', width: '200px' } })] }), _jsx("button", { onClick: fetchDag, className: "btn btn-secondary btn-sm", children: "Refresh Graph" })] })] }), loading ? (_jsx("div", { style: { textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)', fontSize: '0.875rem' }, children: "Constructing Git Commit Graph & Ancestor DAG..." })) : dagData.nodes.length === 0 ? (_jsx("div", { style: { textAlign: 'center', padding: '3rem 0', color: 'var(--text-dim)', fontSize: '0.85rem' }, children: "No commits found in the repository. Create a checkpoint from the editor to start the DAG!" })) : (_jsx("div", { className: "dag-scroll-canvas", children: dagData.nodes.map((node, index) => {
                            const isMergeCommit = node.parentIds.length > 1;
                            return (_jsxs(React.Fragment, { children: [_jsxs("div", { onClick: () => setInspectedCommitId(node.id), className: `commit-dag-card ${node.isHead ? 'head' : ''}`, children: [_jsxs("div", { style: { display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.5rem' }, children: [node.isHead && _jsx("span", { className: "badge badge-rose", children: "HEAD" }), isMergeCommit && _jsx("span", { className: "badge badge-cyan", children: "3-Way Merge (NCA)" }), node.branches.map((b) => (_jsxs("span", { className: "badge badge-emerald", style: { gap: '0.2rem' }, children: [_jsx(GitBranch, { style: { width: '10px', height: '10px' } }), b] }, b)))] }), _jsxs("div", { style: { marginBottom: '0.65rem' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }, children: [_jsxs("span", { className: "mono", style: { fontWeight: 700, color: 'var(--cyan)' }, children: [_jsx(GitCommit, { style: { width: '12px', height: '12px', display: 'inline', marginRight: '3px' } }), node.shortId] }), _jsxs("span", { className: "mono", style: { fontSize: '0.7rem', color: 'var(--text-dim)' }, children: ["tree: ", node.shortTreeId] })] }), _jsx("p", { style: { fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }, children: node.message })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', paddingTop: '0.4rem', borderTop: '1px solid var(--border-subtle)' }, children: [_jsx("span", { style: { maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: node.author.name }), _jsxs("span", { className: "mono", style: { display: 'flex', alignItems: 'center', gap: '0.2rem' }, children: [_jsx(Clock, { style: { width: '10px', height: '10px' } }), new Date(node.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })] })] })] }), index < dagData.nodes.length - 1 && (_jsx("div", { style: { color: 'var(--indigo-light)', opacity: 0.7 }, children: _jsx(ArrowRight, { style: { width: '18px', height: '18px' } }) }))] }, node.id));
                        }) }))] }), _jsxs("div", { className: "glass-card", children: [_jsxs("h3", { style: { fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }, children: [_jsx(Layers, { style: { width: '15px', height: '15px', color: 'var(--indigo)' } }), "Chronological Commit Log (", filteredNodes.length, " Commits)"] }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '0.5rem' }, children: filteredNodes.map((c) => (_jsxs("div", { onClick: () => setInspectedCommitId(c.id), style: {
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.75rem',
                                background: 'var(--bg-surface)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-subtle)',
                                cursor: 'pointer',
                            }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.75rem' }, children: [_jsx("div", { style: { padding: '0.4rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: 'var(--radius-sm)', color: 'var(--indigo)' }, children: _jsx(GitCommit, { style: { width: '15px', height: '15px' } }) }), _jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.4rem' }, children: [_jsx("span", { style: { fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }, children: c.message }), c.branches.map((b) => (_jsx("span", { className: "badge badge-emerald", style: { fontSize: '0.65rem' }, children: b }, b))), c.isHead && _jsx("span", { className: "badge badge-rose", style: { fontSize: '0.65rem' }, children: "HEAD" })] }), _jsxs("div", { style: { fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.4rem', marginTop: '0.15rem' }, children: [_jsx("span", { children: c.author.name }), _jsx("span", { children: "\u2022" }), _jsx("span", { className: "mono", style: { color: 'var(--cyan)' }, children: c.shortId }), _jsx("span", { children: "\u2022" }), _jsx("span", { children: new Date(c.timestamp).toLocaleString() })] })] })] }), _jsxs("button", { className: "btn btn-secondary btn-sm", style: { padding: '0.3rem 0.6rem', fontSize: '0.75rem' }, children: [_jsx(ExternalLink, { style: { width: '12px', height: '12px' } }), _jsx("span", { children: "Inspect" })] })] }, c.id))) })] }), inspectedCommitId && (_jsx(CommitInspectorModal, { commitId: inspectedCommitId, onClose: () => setInspectedCommitId(null), onRestoreSession: onRestoreSession }))] }));
};
//# sourceMappingURL=GitGraphVisualizer.js.map