import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Search, Sparkles, BookOpen, Clock, Zap, } from 'lucide-react';
const SAMPLE_QUERIES = [
    'How does the 3-way CRDT merge engine guarantee zero conflicts?',
    'What role do Vector Clocks play in causal concurrency ordering?',
    'How are CRDT sessions checkpointed into Git Tree and Commit objects?',
    'What deterministic tie-breakers are used for simultaneous edits?',
];
export const RagSearch = () => {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const handleSearch = async (queryText) => {
        if (!queryText.trim())
            return;
        setLoading(true);
        try {
            const res = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: queryText }),
            });
            const data = await res.json();
            setResult(data);
        }
        catch (err) {
            console.error('Search failed:', err);
        }
        finally {
            setLoading(false);
        }
    };
    const onSubmit = (e) => {
        e.preventDefault();
        handleSearch(query);
    };
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '950px', margin: '0 auto' }, children: [_jsxs("div", { className: "glass-card", children: [_jsx("div", { className: "glass-card-header", children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.75rem' }, children: [_jsx("div", { style: { padding: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--indigo)' }, children: _jsx(Search, { style: { width: '20px', height: '20px' } }) }), _jsxs("div", { children: [_jsxs("h2", { style: { fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }, children: ["Cross-Corpus Semantic RAG & AI Synthesis", _jsx("span", { className: "badge badge-emerald", children: "Dual-Tier Retrieval" })] }), _jsx("p", { style: { fontSize: '0.75rem', color: 'var(--text-muted)' }, children: "Query the entire collaborative codebase, research papers, and conversation transcripts using vector embeddings and LLM synthesis" })] })] }) }), _jsxs("form", { onSubmit: onSubmit, style: { display: 'flex', flexDirection: 'column', gap: '0.75rem' }, children: [_jsxs("div", { style: { position: 'relative' }, children: [_jsx(Search, { style: { width: '18px', height: '18px', position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--indigo)' } }), _jsx("input", { type: "text", value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Ask anything about the architecture, CRDT proofs, Git DAG checkpoints, or research artifacts...", className: "input-control", style: { padding: '0.85rem 7.5rem 0.85rem 2.75rem', fontSize: '0.9rem', borderRadius: 'var(--radius-lg)' } }), _jsxs("button", { type: "submit", disabled: loading || !query.trim(), className: "btn btn-primary btn-sm", style: { position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', padding: '0.5rem 0.95rem' }, children: [_jsx(Sparkles, { style: { width: '13px', height: '13px' } }), _jsx("span", { children: loading ? 'Synthesizing...' : 'Search & Ask' })] })] }), _jsxs("div", { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }, children: [_jsxs("span", { style: { color: 'var(--text-dim)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }, children: [_jsx(Zap, { style: { width: '12px', height: '12px', color: 'var(--amber)' } }), "Try asking:"] }), SAMPLE_QUERIES.map((q) => (_jsx("button", { type: "button", onClick: () => {
                                            setQuery(q);
                                            handleSearch(q);
                                        }, className: "btn btn-secondary btn-sm", style: { padding: '0.2rem 0.55rem', fontSize: '0.7rem' }, children: q }, q)))] })] })] }), result && (_jsxs("div", { className: "glass-card", style: { borderColor: 'var(--cyan)' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.5rem' }, children: [_jsx(Sparkles, { style: { width: '18px', height: '18px', color: 'var(--cyan)' } }), _jsx("h3", { style: { fontSize: '0.95rem', fontWeight: 700 }, children: "Synthesized Research Answer" })] }), _jsxs("div", { style: { display: 'flex', gap: '0.5rem' }, children: [_jsxs("span", { className: "badge badge-cyan mono", children: [_jsx(Clock, { style: { width: '10px', height: '10px' } }), result.latency_ms, " ms"] }), _jsxs("span", { className: "badge badge-emerald", children: [result.context_used.length, " Citations Used"] })] })] }), _jsx("div", { style: { background: 'var(--bg-space)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', marginBottom: '1.25rem' }, children: result.answer }), _jsxs("div", { children: [_jsxs("h4", { style: { fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }, children: [_jsx(BookOpen, { style: { width: '14px', height: '14px', color: 'var(--indigo)' } }), "Retrieved Context & Citations (", result.context_used.length, ")"] }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }, children: result.context_used.map((ctx, idx) => (_jsxs("div", { style: {
                                        background: 'var(--bg-surface)',
                                        padding: '0.85rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-subtle)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.35rem',
                                    }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("span", { className: "badge badge-indigo", style: { fontSize: '0.65rem' }, children: ctx.type === 'vector' ? 'Tier 1: Vector Sim' : 'Tier 2: Topic Match' }), _jsxs("span", { className: "mono", style: { fontSize: '0.7rem', color: 'var(--emerald-light)', fontWeight: 700 }, children: ["Score: ", ctx.score] })] }), _jsx("h5", { style: { fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }, children: ctx.title }), _jsx("p", { className: "mono", style: { fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4, maxHeight: '80px', overflowY: 'auto' }, children: ctx.content })] }, idx))) })] })] }))] }));
};
//# sourceMappingURL=RagSearch.js.map