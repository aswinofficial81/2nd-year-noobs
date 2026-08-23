import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { UploadCloud, Layers, Tag, Sparkles, Search, } from 'lucide-react';
export const ResearchIngest = () => {
    const [artifacts, setArtifacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState('upload');
    const [pasteType, setPasteType] = useState('markdown');
    const [pasteTitle, setPasteTitle] = useState('');
    const [pasteContent, setPasteContent] = useState('');
    const [selectedArtifact, setSelectedArtifact] = useState(null);
    const [filterQuery, setFilterQuery] = useState('');
    const [selectedTopic, setSelectedTopic] = useState(null);
    const fileInputRef = useRef(null);
    const fetchArtifacts = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/artifacts');
            const data = await res.json();
            setArtifacts(data);
            if (data.length > 0 && !selectedArtifact) {
                setSelectedArtifact(data[0]);
            }
        }
        catch (err) {
            console.error('Failed to fetch artifacts:', err);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchArtifacts();
    }, []);
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', file.name.replace(/\.[^/.]+$/, ''));
        let endpoint = '/api/ingest/markdown';
        if (file.name.endsWith('.pdf')) {
            endpoint = '/api/ingest/pdf';
        }
        else if (file.name.endsWith('.json')) {
            endpoint = '/api/ingest/chat/chatgpt';
        }
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            setSelectedArtifact(data);
            fetchArtifacts();
        }
        catch (err) {
            console.error('Upload failed:', err);
        }
        finally {
            setUploading(false);
            if (fileInputRef.current)
                fileInputRef.current.value = '';
        }
    };
    const handlePasteSubmit = async (e) => {
        e.preventDefault();
        if (!pasteContent.trim())
            return;
        setUploading(true);
        let endpoint = `/api/ingest/${pasteType === 'markdown' ? 'markdown' : `chat/${pasteType}`}`;
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: pasteTitle || `Pasted ${pasteType.toUpperCase()} Artifact`,
                    content: pasteContent,
                }),
            });
            const data = await res.json();
            setSelectedArtifact(data);
            setPasteTitle('');
            setPasteContent('');
            fetchArtifacts();
        }
        catch (err) {
            console.error('Ingest failed:', err);
        }
        finally {
            setUploading(false);
        }
    };
    const allTopics = Array.from(new Set(artifacts.flatMap((a) => a.topics || [])));
    const filteredArtifacts = artifacts.filter((a) => {
        const matchesSearch = a.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
            a.summary_line?.toLowerCase().includes(filterQuery.toLowerCase());
        const matchesTopic = selectedTopic ? a.topics?.includes(selectedTopic) : true;
        return matchesSearch && matchesTopic;
    });
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '1.5rem' }, children: [_jsxs("div", { className: "glass-card", children: [_jsxs("div", { className: "glass-card-header", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.75rem' }, children: [_jsx("div", { style: { padding: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--indigo)' }, children: _jsx(UploadCloud, { style: { width: '20px', height: '20px' } }) }), _jsxs("div", { children: [_jsxs("h2", { style: { fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }, children: ["AI Research & Artifact Ingestion Hub", _jsx("span", { className: "badge badge-cyan", children: "Multi-Format Ingestion" })] }), _jsx("p", { style: { fontSize: '0.75rem', color: 'var(--text-muted)' }, children: "Ingest Markdown docs, PDFs, ChatGPT conversations, and Claude logs with automatic chunking & topic extraction" })] })] }), _jsxs("div", { style: { display: 'flex', gap: '0.3rem', background: 'var(--bg-surface)', padding: '0.2rem', borderRadius: 'var(--radius-md)' }, children: [_jsx("button", { onClick: () => setActiveTab('upload'), className: "btn btn-sm", style: {
                                            background: activeTab === 'upload' ? 'var(--indigo)' : 'transparent',
                                            color: activeTab === 'upload' ? '#fff' : 'var(--text-muted)',
                                        }, children: "Upload File" }), _jsx("button", { onClick: () => setActiveTab('paste'), className: "btn btn-sm", style: {
                                            background: activeTab === 'paste' ? 'var(--indigo)' : 'transparent',
                                            color: activeTab === 'paste' ? '#fff' : 'var(--text-muted)',
                                        }, children: "Paste Text / JSON" })] })] }), activeTab === 'upload' ? (_jsxs("div", { onClick: () => fileInputRef.current?.click(), style: {
                            border: '2px dashed rgba(99, 102, 241, 0.35)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '2.5rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            background: 'var(--bg-surface-elevated)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.75rem',
                        }, children: [_jsx("input", { type: "file", ref: fileInputRef, onChange: handleFileUpload, accept: ".md,.pdf,.json,.txt", style: { display: 'none' } }), _jsx("div", { style: { width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--indigo)' }, children: _jsx(UploadCloud, { style: { width: '24px', height: '24px' } }) }), _jsxs("div", { children: [_jsx("p", { style: { fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }, children: uploading ? 'Processing & Chunking Artifact...' : 'Click or Drag Files Here to Ingest' }), _jsxs("p", { style: { fontSize: '0.75rem', color: 'var(--text-muted)' }, children: ["Supports Markdown (", _jsx("span", { className: "mono", style: { color: 'var(--cyan)' }, children: ".md" }), "), Research Papers (", _jsx("span", { className: "mono", style: { color: 'var(--cyan)' }, children: ".pdf" }), "), ChatGPT & Claude (", _jsx("span", { className: "mono", style: { color: 'var(--cyan)' }, children: ".json" }), ")"] })] })] })) : (_jsxs("form", { onSubmit: handlePasteSubmit, style: { display: 'flex', flexDirection: 'column', gap: '0.75rem' }, children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }, children: [_jsx("input", { type: "text", placeholder: "Artifact Title (optional)", value: pasteTitle, onChange: (e) => setPasteTitle(e.target.value), className: "input-control" }), _jsxs("select", { value: pasteType, onChange: (e) => setPasteType(e.target.value), className: "input-control", children: [_jsx("option", { value: "markdown", children: "Markdown Document (.md)" }), _jsx("option", { value: "chatgpt", children: "ChatGPT Export JSON" }), _jsx("option", { value: "claude", children: "Claude Export JSON" })] })] }), _jsx("textarea", { rows: 5, placeholder: "Paste Markdown text, PDF extracted text, or chat transcript JSON...", value: pasteContent, onChange: (e) => setPasteContent(e.target.value), className: "textarea-control", style: { minHeight: '120px' } }), _jsx("div", { style: { display: 'flex', justifyContent: 'flex-end' }, children: _jsx("button", { type: "submit", disabled: uploading, className: "btn btn-primary btn-sm", children: uploading ? 'Processing...' : 'Ingest & Index Artifact' }) })] }))] }), _jsxs("div", { className: "grid-12", children: [_jsx("div", { className: "col-5", children: _jsxs("div", { className: "glass-card", style: { height: '100%' }, children: [_jsxs("h3", { style: { fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }, children: [_jsx(Layers, { style: { width: '15px', height: '15px', color: 'var(--cyan)' } }), "Indexed Artifacts (", artifacts.length, ")"] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }, children: [_jsxs("div", { style: { position: 'relative' }, children: [_jsx(Search, { style: { width: '13px', height: '13px', position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' } }), _jsx("input", { type: "text", placeholder: "Search artifacts...", value: filterQuery, onChange: (e) => setFilterQuery(e.target.value), className: "input-control", style: { padding: '0.35rem 0.65rem 0.35rem 1.85rem', fontSize: '0.75rem' } })] }), _jsxs("div", { style: { display: 'flex', flexWrap: 'wrap', gap: '0.3rem', maxHeight: '60px', overflowY: 'auto' }, children: [_jsx("button", { onClick: () => setSelectedTopic(null), style: {
                                                        background: selectedTopic === null ? 'var(--indigo)' : 'var(--bg-surface)',
                                                        color: selectedTopic === null ? '#ffffff' : 'var(--text-secondary)',
                                                        border: '1px solid var(--border-subtle)',
                                                        borderRadius: '9999px',
                                                        padding: '0.1rem 0.45rem',
                                                        fontSize: '0.65rem',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                    }, children: "All" }), allTopics.map((topic) => (_jsxs("button", { onClick: () => setSelectedTopic(topic === selectedTopic ? null : topic), style: {
                                                        background: selectedTopic === topic ? 'var(--cyan)' : 'var(--bg-surface)',
                                                        color: selectedTopic === topic ? '#ffffff' : 'var(--text-secondary)',
                                                        border: '1px solid var(--border-subtle)',
                                                        borderRadius: '9999px',
                                                        padding: '0.1rem 0.45rem',
                                                        fontSize: '0.65rem',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                    }, children: ["#", topic] }, topic)))] })] }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '380px', overflowY: 'auto' }, children: filteredArtifacts.map((art) => (_jsxs("div", { onClick: () => setSelectedArtifact(art), style: {
                                            padding: '0.75rem',
                                            background: selectedArtifact?.id === art.id ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-surface)',
                                            border: selectedArtifact?.id === art.id ? '1px solid var(--indigo)' : '1px solid var(--border-subtle)',
                                            borderRadius: 'var(--radius-md)',
                                            cursor: 'pointer',
                                        }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }, children: [_jsx("span", { className: "badge badge-indigo", style: { fontSize: '0.65rem', textTransform: 'uppercase' }, children: art.type }), _jsxs("span", { className: "mono", style: { fontSize: '0.65rem', color: 'var(--text-dim)' }, children: [art.chunks?.length || 0, " chunks"] })] }), _jsx("h4", { style: { fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, children: art.title }), _jsx("p", { style: { fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }, children: art.summary_line })] }, art.id))) })] }) }), _jsx("div", { className: "col-7", children: _jsx("div", { className: "glass-card", style: { height: '100%' }, children: selectedArtifact ? (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '1rem' }, children: [_jsxs("div", { style: { paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }, children: [_jsx("span", { className: "badge badge-emerald uppercase mono", children: selectedArtifact.type }), _jsxs("span", { className: "mono", style: { fontSize: '0.7rem', color: 'var(--text-dim)' }, children: ["ID: ", selectedArtifact.id] })] }), _jsx("h3", { style: { fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }, children: selectedArtifact.title }), _jsxs("div", { style: { background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-secondary)' }, children: [_jsxs("div", { style: { fontWeight: 700, color: 'var(--indigo-light)', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }, children: [_jsx(Sparkles, { style: { width: '13px', height: '13px' } }), "AI Auto-Summary:"] }), selectedArtifact.summary_line] })] }), _jsxs("div", { children: [_jsx("span", { style: { fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }, children: "Extracted Topics" }), _jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }, children: selectedArtifact.topics?.map((topic) => (_jsxs("span", { className: "badge badge-amber", children: [_jsx(Tag, { style: { width: '10px', height: '10px' } }), topic] }, topic))) })] }), _jsxs("div", { children: [_jsxs("span", { style: { fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }, children: ["Indexed Chunks (", selectedArtifact.chunks?.length || 0, ")"] }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto' }, children: selectedArtifact.chunks?.map((chunk, idx) => (_jsxs("div", { className: "mono", style: { padding: '0.65rem', background: 'var(--bg-space)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-dim)', marginBottom: '0.25rem', paddingBottom: '0.25rem', borderBottom: '1px solid var(--border-subtle)' }, children: [_jsxs("span", { children: ["Chunk #", idx + 1] }), _jsx("span", { style: { color: 'var(--emerald-light)', fontWeight: 600 }, children: "768-dim Vector Embedded" })] }), _jsx("p", { style: { whiteSpace: 'pre-wrap' }, children: chunk })] }, idx))) })] })] })) : (_jsx("div", { style: { textAlign: 'center', padding: '5rem 0', color: 'var(--text-dim)', fontSize: '0.85rem' }, children: "Select an artifact on the left to inspect chunks and topics." })) }) })] })] }));
};
//# sourceMappingURL=ResearchIngest.js.map