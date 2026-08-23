import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { runHackathonDemo, main } from '../src/index.js';

describe('Phase 19: Interactive CLI & Demo Integration', () => {
  let demoDir: string;

  before(async () => {
    demoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-crdt-cli-test-'));
  });

  after(async () => {
    try {
      await fs.rm(demoDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it('should execute the full automated hackathon demo simulation (9 steps)', async () => {
    const steps = await runHackathonDemo(demoDir);

    assert.strictEqual(steps.length, 9);
    assert.ok(steps[0].step.includes('Initialize Repository'));
    assert.ok(steps[1].step.includes('Alice Edits Document'));
    assert.ok(steps[2].step.includes('Bob Syncs'));
    assert.ok(steps[3].step.includes('Team Chat & Reactions'));
    assert.ok(steps[4].step.includes('Git Checkpoint Commit'));
    assert.ok(steps[5].step.includes('Feature Branch Checkpoint'));
    assert.ok(steps[6].step.includes('Main Branch Checkpoint'));
    assert.ok(steps[7].step.includes('3-Way CRDT Branch Merge'));
    assert.ok(steps[8].step.includes('Persistent Disk Storage'));

    // Check merged state
    assert.strictEqual(steps[7].state?.meta_status, 'Camera Ready');
    assert.strictEqual(steps[7].state?.meta_model_benchmark, 'MMLU: 92.4%');
  });

  it('should run main CLI command with demo argument', async () => {
    // Capture stdout
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(' '));

    try {
      await main(['demo']);
      assert.ok(logs.some((l) => l.includes('Hackathon Live Demo')));
      assert.ok(logs.some((l) => l.includes('Hackathon Demo Completed Successfully')));
    } finally {
      console.log = origLog;
    }
  });

  it('should handle help command gracefully', async () => {
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(' '));

    try {
      await main(['help']);
      assert.ok(logs.some((l) => l.includes('Git + CRDT Collaboration Engine CLI')));
    } finally {
      console.log = origLog;
    }
  });
});
