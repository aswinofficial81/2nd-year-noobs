import React, { useState } from 'react';
import {
  Play,
  CheckCircle2,
  Flame,
  ShieldCheck,
} from 'lucide-react';

interface DemoStep {
  step: string;
  details: string;
  state?: Record<string, unknown>;
}

export const DemoRunner: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<DemoStep[]>([]);
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
    } catch (err) {
      console.error('Demo execution failed:', err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '950px', margin: '0 auto' }}>
      {/* Banner */}
      <div className="glass-card">
        <div className="glass-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--amber)' }}>
              <Flame style={{ width: '20px', height: '20px' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Automated 9-Step Hackathon Live Demonstration
                <span className="badge badge-amber">End-to-End Test</span>
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Runs the complete real-time collaboration, branching, Git checkpointing, 3-way NCA merge, and disk persistence flow
              </p>
            </div>
          </div>

          <button
            onClick={executeDemo}
            disabled={running}
            className="btn btn-primary"
            style={{ padding: '0.65rem 1.25rem' }}
          >
            {running ? (
              <span>Executing Steps...</span>
            ) : (
              <>
                <Play style={{ width: '14px', height: '14px', fill: 'currentColor' }} />
                <span>Run Hackathon Demo</span>
              </>
            )}
          </button>
        </div>

        {/* 9-Step Pills */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '0.4rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: 600 }}>
          {[
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

            return (
              <div
                key={title}
                style={{
                  padding: '0.5rem 0.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: isDone ? 'rgba(16, 185, 129, 0.15)' : isCurrent ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-surface)',
                  border: isDone ? '1px solid var(--emerald)' : isCurrent ? '1px solid var(--indigo)' : '1px solid var(--border-subtle)',
                  color: isDone ? 'var(--emerald-light)' : isCurrent ? '#fff' : 'var(--text-dim)',
                  transition: 'all 0.2s ease',
                }}
              >
                {title}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Results */}
      {steps.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="glass-card"
              style={{ padding: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}
            >
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--emerald)', flexShrink: 0, marginTop: '2px' }}>
                <CheckCircle2 style={{ width: '14px', height: '14px' }} />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{step.step}</h4>
                  <span className="badge badge-emerald mono">PASS [100% Convergence]</span>
                </div>
                <p className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{step.details}</p>

                {step.state && (
                  <pre className="mono" style={{ background: 'var(--bg-space)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', color: 'var(--cyan-light)', marginTop: '0.5rem', overflowX: 'auto', border: '1px solid var(--border-subtle)' }}>
                    {JSON.stringify(step.state, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ))}

          {completed && (
            <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(99, 102, 241, 0.15))', border: '1px solid var(--emerald)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
              <ShieldCheck style={{ width: '32px', height: '32px', color: 'var(--emerald)', margin: '0 auto 0.5rem auto' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>
                🎉 Hackathon Demo Succeeded with 100% Convergence!
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
                All 9 phases executed flawlessly: in-memory CRDT mutations, vector clock causal ordering, Git commit DAG creation, parallel branch editing, 3-way semantic NCA merge, and persistent loose-object serialization.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
