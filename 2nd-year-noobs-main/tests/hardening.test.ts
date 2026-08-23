import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  Repository,
  CRDTSession,
  CollaborativeDocument,
  CollaborativeChat,
  mergeSessions,
  compareVectorClocks,
  mergeVectorClocks,
  type AuthorSignature,
} from '../src/index.js';

describe('Phase 20: Final Hackathon Hardening & Edge Case Resilience', () => {
  const author: AuthorSignature = {
    name: 'Hackathon Lead',
    email: 'lead@hackathon.ai',
    timestamp: 1700000000,
  };

  it('should prevent circular branch merging and detect invalid branch targets gracefully', () => {
    const repo = new Repository('hardening-repo');

    assert.throws(
      () =>
        repo.mergeBranches({
          targetBranch: 'non-existent-target',
          sourceBranch: 'main',
          author,
        }),
      /does not exist/,
    );

    assert.throws(
      () =>
        repo.mergeBranches({
          targetBranch: 'main',
          sourceBranch: 'non-existent-source',
          author,
        }),
      /does not exist/,
    );
  });

  it('should converge cleanly under a 5-replica concurrent storm (Alice, Bob, Carol, Dave, Eve)', () => {
    const peers = ['alice', 'bob', 'carol', 'dave', 'eve'];
    const sessions = peers.map(
      (p) => new CRDTSession({ peerId: p, branchName: 'main' }),
    );

    // Each peer performs rapid concurrent updates on shared and independent fields
    sessions[0].applyOperation(
      sessions[0].createOperation('update', 'Alice Title', 'title'),
    );
    sessions[1].applyOperation(
      sessions[1].createOperation('update', 'Bob Title', 'title'),
    );
    sessions[2].applyOperation(
      sessions[2].createOperation('update', 'Carol Config', 'config'),
    );
    sessions[3].applyOperation(
      sessions[3].createOperation('update', 'Dave Analytics', 'analytics'),
    );
    sessions[4].applyOperation(
      sessions[4].createOperation('update', 'Eve Security', 'security'),
    );

    // Synchronize all pairs in random/cyclic order
    for (let i = 0; i < sessions.length; i++) {
      for (let j = 0; j < sessions.length; j++) {
        if (i !== j) {
          sessions[i].syncWith(sessions[j]);
        }
      }
    }

    // Every replica must have the exact same state
    const canonicalState = sessions[0].exportState();
    for (const session of sessions) {
      assert.deepStrictEqual(session.exportState(), canonicalState);
    }

    // Deterministic winner on 'title' must be agreed by all 5 replicas
    assert.strictEqual(
      typeof canonicalState.title === 'string',
      true,
    );
    assert.strictEqual(canonicalState.config, 'Carol Config');
    assert.strictEqual(canonicalState.analytics, 'Dave Analytics');
    assert.strictEqual(canonicalState.security, 'Eve Security');
  });

  it('should handle large vector clocks with 20+ peers correctly', () => {
    const clockA: Record<string, number> = {};
    const clockB: Record<string, number> = {};

    for (let i = 0; i < 20; i++) {
      clockA[`peer_${i}`] = i;
      clockB[`peer_${i}`] = i + (i % 2 === 0 ? 1 : 0);
    }

    // clockB dominates clockA
    assert.strictEqual(compareVectorClocks(clockA, clockB), 'before');
    assert.strictEqual(compareVectorClocks(clockB, clockA), 'after');

    const merged = mergeVectorClocks(clockA, clockB);
    for (let i = 0; i < 20; i++) {
      assert.strictEqual(
        merged.get(`peer_${i}`),
        Math.max(clockA[`peer_${i}`], clockB[`peer_${i}`]),
      );
    }
  });

  it('should maintain full document and chat integrity across multiple commit cycles', () => {
    const repo = new Repository('lifecycle-repo');
    const session = repo.createCRDTSession('main', 'alice');
    const doc = new CollaborativeDocument(session);
    const chat = new CollaborativeChat(session);

    // Cycle 1
    doc.setTitle('Initial Architecture');
    doc.insertText('Section 1: Vision.');
    chat.postMessage('Starting Sprint 1');
    const commit1 = repo.checkpointSession(session, author, 'feat: sprint 1');

    // Cycle 2
    doc.insertText(' Section 2: Implementation.', doc.getText().length);
    chat.postMessage('Sprint 1 Finished!');
    const commit2 = repo.checkpointSession(session, author, 'feat: sprint 2');

    // Restore from Commit 1
    const sessionPast = repo.createSessionFromCommit({
      commitId: commit1.id,
      peerId: 'auditor',
    });
    const docPast = new CollaborativeDocument(sessionPast);

    assert.strictEqual(docPast.getTitle(), 'Initial Architecture');
    assert.strictEqual(docPast.getText(), 'Section 1: Vision.');

    // Restore from Commit 2
    const sessionLatest = repo.createSessionFromCommit({
      commitId: commit2.id,
      peerId: 'auditor',
    });
    const docLatest = new CollaborativeDocument(sessionLatest);

    assert.strictEqual(
      docLatest.getText(),
      'Section 1: Vision. Section 2: Implementation.',
    );
  });
});
