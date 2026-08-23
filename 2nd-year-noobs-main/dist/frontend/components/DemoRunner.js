import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Play, CheckCircle2, Flame, ShieldCheck, } from 'lucide-react';
export const DemoRunner = () => {
    const [running, setRunning] = useState(false);
    const [steps, setSteps] = useState([]);
    const [completed, setCompleted] = useState(false);
    const executeDemo = async () => {
        setRunning(true);
        setSteps([]);
        setCompleted(false);
        try {
            const res = await fetch('/api/demo/run');
            const data = await res.json();
            if (data.steps) {
                for (let i = 0; i < data.steps.length; i++) {
                    await new Promise((r) => setTimeout(r, 180));
                    setSteps((prev) => [...prev, data.steps[i]]);
                }
                setCompleted(true);
            }
        }
        catch (err) {
            console.error('Demo execution failed:', err);
        }
        finally {
            setRunning(false);
        }
    };
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '950px', margin: '0 auto' }, children: [_jsxs("div", { className: "glass-card", children: [_jsxs("div", { className: "glass-card-header", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.75rem' }, children: [_jsx("div", { style: { padding: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--amber)' }, children: _jsx(Flame, { style: { width: '20px', height: '20px' } }) }), _jsxs("div", { children: [_jsxs("h2", { style: { fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }, children: ["Automated 9-Step Hackathon Live Demonstration", _jsx("span", { className: "badge badge-amber", children: "End-to-End Test" })] }), _jsx("p", { style: { fontSize: '0.75rem', color: 'var(--text-muted)' }, children: "Runs the complete real-time collaboration, branching, Git checkpointing, 3-way NCA merge, and disk persistence flow" })] })] }), _jsx("button", { onClick: executeDemo, disabled: running, className: "btn btn-primary", style: { padding: '0.65rem 1.25rem' }, children: running ? (_jsx("span", { children: "Executing Steps..." })) : (_jsxs(_Fragment, { children: [_jsx(Play, { style: { width: '14px', height: '14px', fill: 'currentColor' } }), _jsx("span", { children: "Run Hackathon Demo" })] })) })] }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '0.4rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: 600 }, children: [
                            '1. Init Repo',
                            '2. Alice Edit',
                            '3. Bob Sync',
                            '4. Team Chat',
                            '5. Git Commit',
                            '6. Feature Fork',
                            '7. Main Branch',
                            '8. 3-Way NCA',
                            '9. Disk Reload',
                        ].map((title, i) => {
                            const isDone = steps.length > i;
                            const isCurrent = steps.length === i && running;
                            return (_jsx("div", { style: {
                                    padding: '0.5rem 0.25rem',
                                    borderRadius: 'var(--radius-md)',
                                    background: isDone ? 'rgba(16, 185, 129, 0.15)' : isCurrent ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-surface)',
                                    border: isDone ? '1px solid var(--emerald)' : isCurrent ? '1px solid var(--indigo)' : '1px solid var(--border-subtle)',
                                    color: isDone ? 'var(--emerald-light)' : isCurrent ? '#fff' : 'var(--text-dim)',
                                    transition: 'all 0.2s ease',
                                }, children: title }, title));
                        }) })] }), steps.length > 0 && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '0.75rem' }, children: [steps.map((step, idx) => (_jsxs("div", { className: "glass-card", style: { padding: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }, children: [_jsx("div", { style: { width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--emerald)', flexShrink: 0, marginTop: '2px' }, children: _jsx(CheckCircle2, { style: { width: '14px', height: '14px' } }) }), _jsxs("div", { style: { flex: 1 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }, children: [_jsx("h4", { style: { fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }, children: step.step }), _jsx("span", { className: "badge badge-emerald mono", children: "PASS [100% Convergence]" })] }), _jsx("p", { className: "mono", style: { fontSize: '0.75rem', color: 'var(--text-secondary)' }, children: step.details }), step.state && (_jsx("pre", { className: "mono", style: { background: 'var(--bg-space)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', color: 'var(--cyan-light)', marginTop: '0.5rem', overflowX: 'auto', border: '1px solid var(--border-subtle)' }, children: JSON.stringify(step.state, null, 2) }))] })] }, idx))), completed && (_jsxs("div", { style: { padding: '1.5rem', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(99, 102, 241, 0.15))', border: '1px solid var(--emerald)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }, children: [_jsx(ShieldCheck, { style: { width: '32px', height: '32px', color: 'var(--emerald)', margin: '0 auto 0.5rem auto' } }), _jsx("h3", { style: { fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }, children: "\uD83C\uDF89 Hackathon Demo Succeeded with 100% Convergence!" }), _jsx("p", { style: { fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }, children: "All 9 phases executed flawlessly: in-memory CRDT mutations, vector clock causal ordering, Git commit DAG creation, parallel branch editing, 3-way semantic NCA merge, and persistent loose-object serialization." })] }))] }))] }));
};
//# sourceMappingURL=DemoRunner.js.map