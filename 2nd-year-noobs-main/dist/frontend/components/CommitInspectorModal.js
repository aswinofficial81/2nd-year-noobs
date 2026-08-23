import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { GitCommit, FolderTree, FileCode, X, Copy, Check, RotateCcw, User, Sparkles, TrendingUp, } from 'lucide-react';
export const CommitInspectorModal = ({ commitId, onClose, onRestoreSession, }) => {
    const [details, setDetails] = useState(null);
    const [diffData, setDiffData] = useState(null);
    const [activeView, setActiveView] = useState('diff');
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);
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
            }
            catch (err) {
                console.error('Failed to load commit data:', err);
            }
            finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [commitId]);
    const copyHash = (hash) => {
        navigator.clipboard.writeText(hash);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (_jsx("div", { className: "modal-overlay", children: _jsxs("div", { className: "modal-dialog", style: { maxWidth: '850px' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.75rem' }, children: [_jsx("div", { style: { padding: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--indigo)' }, children: _jsx(GitCommit, { style: { width: '20px', height: '20px' } }) }), _jsxs("div", { children: [_jsxs("h3", { style: { fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }, children: ["Commit Inspector & Semantic Diff", _jsx("span", { className: "badge badge-indigo", children: "SHA-256 Verified" })] }), _jsxs("p", { className: "mono", style: { fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }, children: [_jsx("span", { children: commitId }), _jsx("button", { onClick: () => copyHash(commitId), className: "btn btn-icon", style: { padding: '0.15rem' }, children: copied ? _jsx(Check, { style: { width: '12px', height: '12px', color: 'var(--emerald)' } }) : _jsx(Copy, { style: { width: '12px', height: '12px' } }) })] })] })] }), _jsx("button", { onClick: onClose, className: "btn btn-icon", children: _jsx(X, { style: { width: '18px', height: '18px' } }) })] }), loading ? (_jsx("div", { style: { textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }, children: "Loading commit DAG nodes, manifest trees, and semantic diff..." })) : details?.error ? (_jsx("div", { style: { padding: '1rem', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid var(--rose)', borderRadius: 'var(--radius-md)', color: 'var(--rose-light)' }, children: details.error })) : (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '1.25rem' }, children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }, children: [_jsxs("div", { children: [_jsx("span", { style: { fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }, children: "Commit Message" }), _jsx("p", { style: { fontSize: '0.85rem', fontWeight: 600 }, children: details.commit?.message })] }), _jsxs("div", { children: [_jsx("span", { style: { fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }, children: "Author Signature" }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }, children: [_jsx(User, { style: { width: '13px', height: '13px', color: 'var(--cyan)' } }), _jsxs("span", { children: [details.commit?.author?.name, " <", details.commit?.author?.email, ">"] })] })] }), _jsxs("div", { children: [_jsx("span", { style: { fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }, children: "Parent Commits" }), _jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }, children: details.commit?.parentIds?.length > 0 ? (details.commit.parentIds.map((pId) => (_jsx("span", { className: "badge badge-indigo mono", children: pId.slice(0, 7) }, pId)))) : (_jsx("span", { style: { fontSize: '0.75rem', color: 'var(--text-dim)' }, children: "Root commit (initial)" })) })] }), _jsxs("div", { children: [_jsx("span", { style: { fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }, children: "Root Tree ID" }), _jsxs("span", { className: "mono", style: { fontSize: '0.75rem', color: 'var(--emerald-light)', background: 'var(--bg-space)', padding: '0.2rem 0.4rem', borderRadius: '4px' }, children: [details.commit?.treeId?.slice(0, 16), "..."] })] })] }), _jsxs("div", { style: { display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }, children: [_jsxs("button", { onClick: () => setActiveView('diff'), className: "btn btn-sm", style: {
                                        background: activeView === 'diff' ? 'var(--indigo)' : 'var(--bg-surface)',
                                        color: activeView === 'diff' ? '#ffffff' : 'var(--text-secondary)',
                                        border: '1px solid var(--border-subtle)',
                                    }, children: [_jsx(Sparkles, { style: { width: '13px', height: '13px' } }), _jsx("span", { children: "Semantic Diff vs Parent" })] }), _jsxs("button", { onClick: () => setActiveView('tree'), className: "btn btn-sm", style: {
                                        background: activeView === 'tree' ? 'var(--indigo)' : 'var(--bg-surface)',
                                        color: activeView === 'tree' ? '#ffffff' : 'var(--text-secondary)',
                                        border: '1px solid var(--border-subtle)',
                                    }, children: [_jsx(FolderTree, { style: { width: '13px', height: '13px' } }), _jsx("span", { children: "Tree Manifest & Blobs" })] })] }), activeView === 'diff' && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '1rem' }, children: [_jsxs("div", { style: { background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }, children: [_jsxs("span", { style: { fontSize: '0.75rem', fontWeight: 700, color: 'var(--indigo-light)', display: 'flex', alignItems: 'center', gap: '0.35rem' }, children: [_jsx(Sparkles, { style: { width: '14px', height: '14px' } }), "Human-Readable Semantic Change Summary"] }), _jsxs("div", { style: { display: 'flex', gap: '0.4rem', fontSize: '0.7rem' }, children: [_jsxs("span", { className: "badge badge-emerald", children: ["+", diffData?.diff?.stats?.wordsAdded || 0, " words"] }), _jsxs("span", { className: "badge badge-rose", children: ["-", diffData?.diff?.stats?.wordsRemoved || 0, " words"] })] })] }), _jsx("p", { style: { fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.4 }, children: diffData?.diff?.summary || 'No changes detected against base.' })] }), diffData?.diff?.metricChanges?.length > 0 && (_jsxs("div", { children: [_jsx("span", { style: { fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }, children: "Extracted Metric & Performance Deltas" }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '0.4rem' }, children: diffData.diff.metricChanges.map((m, idx) => (_jsxs("div", { style: {
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.6rem',
                                                    padding: '0.5rem 0.75rem',
                                                    background: 'rgba(6, 182, 212, 0.1)',
                                                    border: '1px solid var(--cyan)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: '0.8rem',
                                                }, children: [_jsx(TrendingUp, { style: { width: '14px', height: '14px', color: 'var(--cyan)' } }), _jsx("span", { style: { fontWeight: 600, color: 'var(--text-primary)' }, children: m.description })] }, idx))) })] })), _jsxs("div", { children: [_jsxs("span", { style: { fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }, children: ["Granular Prose & Attribute Changes (", diffData?.diff?.changes?.length || 0, ")"] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '200px', overflowY: 'auto' }, children: [diffData?.diff?.changes?.map((c, idx) => {
                                                    const badgeClass = c.type === 'addition'
                                                        ? 'badge-emerald'
                                                        : c.type === 'deletion'
                                                            ? 'badge-rose'
                                                            : c.type === 'metric'
                                                                ? 'badge-cyan'
                                                                : 'badge-amber';
                                                    return (_jsxs("div", { style: {
                                                            padding: '0.6rem 0.8rem',
                                                            background: 'var(--bg-space)',
                                                            border: '1px solid var(--border-subtle)',
                                                            borderRadius: 'var(--radius-sm)',
                                                            fontSize: '0.75rem',
                                                        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }, children: [_jsx("span", { className: `badge ${badgeClass} uppercase`, style: { fontSize: '0.6rem' }, children: c.type }), _jsxs("span", { style: { color: 'var(--text-dim)', fontSize: '0.7rem' }, children: ["[", c.category, "]"] }), _jsx("span", { style: { fontWeight: 600, color: 'var(--text-primary)' }, children: c.summary })] }), c.oldText && c.newText && (_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.35rem', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }, children: [_jsxs("div", { style: { background: 'rgba(244, 63, 94, 0.08)', padding: '0.35rem', borderRadius: '4px', color: 'var(--rose-light)' }, children: ["- ", c.oldText] }), _jsxs("div", { style: { background: 'rgba(16, 185, 129, 0.08)', padding: '0.35rem', borderRadius: '4px', color: 'var(--emerald-light)' }, children: ["+ ", c.newText] })] }))] }, idx));
                                                }), (!diffData?.diff?.changes || diffData.diff.changes.length === 0) && (_jsx("div", { style: { textAlign: 'center', padding: '1.5rem', color: 'var(--text-dim)', fontSize: '0.75rem' }, children: "No changes detected (or this is the root initial commit)." }))] })] })] })), activeView === 'tree' && (_jsxs("div", { children: [_jsxs("h4", { style: { fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }, children: [_jsx(FolderTree, { style: { width: '14px', height: '14px', color: 'var(--emerald)' } }), "Directory Tree Manifest Entries"] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }, children: [_jsx("div", { style: { background: 'var(--bg-surface)', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', maxHeight: '180px', overflowY: 'auto' }, children: details.tree?.entries?.map((entry) => (_jsxs("button", { onClick: () => setSelectedEntry(entry), style: {
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
                                                }, children: [_jsx(FileCode, { style: { width: '13px', height: '13px', color: 'var(--cyan)' } }), _jsx("span", { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: entry.name })] }, entry.name))) }), _jsx("div", { style: { background: 'var(--bg-space)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', maxHeight: '180px', overflowY: 'auto' }, children: selectedEntry ? (_jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', paddingBottom: '0.4rem', marginBottom: '0.4rem', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.7rem', color: 'var(--text-muted)' }, children: [_jsxs("span", { className: "mono", children: ["Blob: ", selectedEntry.id?.slice(0, 10), "..."] }), _jsx("span", { className: "badge badge-cyan", children: selectedEntry.type })] }), _jsx("pre", { className: "mono", style: { fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }, children: selectedEntry.contentPreview || 'Payload contents stored as immutable Blob.' })] })) : (_jsx("div", { style: { textAlign: 'center', padding: '2rem 0', color: 'var(--text-dim)', fontSize: '0.75rem' }, children: "Select a tree entry to view blob payload." })) })] })] })), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }, children: [_jsxs("button", { onClick: () => onRestoreSession(commitId), className: "btn btn-emerald btn-sm", children: [_jsx(RotateCcw, { style: { width: '13px', height: '13px' } }), _jsx("span", { children: "Restore Session from Checkpoint" })] }), _jsx("button", { onClick: onClose, className: "btn btn-secondary btn-sm", children: "Close" })] })] }))] }) }));
};
//# sourceMappingURL=CommitInspectorModal.js.map