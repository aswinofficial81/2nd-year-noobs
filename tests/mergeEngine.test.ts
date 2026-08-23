import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  mergeSessions,
  mergeOperationStreams,
  CRDTSession,
} from '../src/index.js';

describe('Phase 14: CRDT Merge Engine', () => {
  it('should satisfy commutativity: merge(A, B) == merge(B, A)', () => {
    // Setup A and B
    const sessionA1 = new CRDTSession({ peerId: 'alice', branchName: 'main' });
    const sessionB1 = new CRDTSession({ peerId: 'bob', branchName: 'main' });

    sessionA1.applyOperation(sessionA1.createOperation('update', 'Alice Data', 'title'));
    sessionB1.applyOperation(sessionB1.createOperation('update', 'Bob Data', 'title'));

    // Clone identical initial state for reverse merge
    const sessionA2 = new CRDTSession({ peerId: 'alice', branchName: 'main' });
    const sessionB2 = new CRDTSession({ peerId: 'bob', branchName: 'main' });

    for (const op of sessionA1.getAllOperations()) {
      sessionA2.queueOperation(op);
      sessionA2.applyOperation(op);
    }
    for (const op of sessionB1.getAllOperations()) {
      sessionB2.queueOperation(op);
      sessionB2.applyOperation(op);
    }

    // Merge A into B vs B into A
    const result1 = mergeSessions(sessionA1, sessionB1);
    const result2 = mergeSessions(sessionB2, sessionA2);

    assert.deepStrictEqual(result1.mergedState, result2.mergedState);
    assert.ok(result1.isConverged);
    assert.ok(result2.isConverged);
  });

  it('should satisfy idempotence: merge(A, A) produces identical state', () => {
    const sessionA = new CRDTSession({ peerId: 'alice', branchName: 'main' });
    sessionA.applyOperation(sessionA.createOperation('update', 'Static Value', 'key'));

    const beforeState = sessionA.exportState();
    const result = mergeSessions(sessionA, sessionA);

    assert.deepStrictEqual(result.mergedState, beforeState);
  });

  it('should satisfy associativity: merge(merge(A, B), C) == merge(A, merge(B, C))', () => {
    // Pipeline 1: (A merge B) merge C
    const a1 = new CRDTSession({ peerId: 'alice', branchName: 'main' });
    const b1 = new CRDTSession({ peerId: 'bob', branchName: 'main' });
    const c1 = new CRDTSession({ peerId: 'carol', branchName: 'main' });

    a1.applyOperation(a1.createOperation('update', 'A', 'propA'));
    b1.applyOperation(b1.createOperation('update', 'B', 'propB'));
    c1.applyOperation(c1.createOperation('update', 'C', 'propC'));

    mergeSessions(a1, b1);
    const resultLeft = mergeSessions(a1, c1);

    // Pipeline 2: A merge (B merge C)
    const a2 = new CRDTSession({ peerId: 'alice', branchName: 'main' });
    const b2 = new CRDTSession({ peerId: 'bob', branchName: 'main' });
    const c2 = new CRDTSession({ peerId: 'carol', branchName: 'main' });

    for (const op of a1.getAllOperations()) { a2.queueOperation(op); a2.applyOperation(op); }
    for (const op of b1.getAllOperations()) { b2.queueOperation(op); b2.applyOperation(op); }
    for (const op of c1.getAllOperations()) { c2.queueOperation(op); c2.applyOperation(op); }

    mergeSessions(b2, c2);
    const resultRight = mergeSessions(a2, b2);

    assert.deepStrictEqual(resultLeft.mergedState, resultRight.mergedState);
  });

  it('should merge, deduplicate, and order operation streams', () => {
    const op1 = {
      id: 'op-1',
      peerId: 'alice',
      clock: 1,
      timestamp: 1000,
      type: 'update' as const,
      path: 'text',
      payload: '1',
      vectorClock: { alice: 1 },
    };

    const op2 = {
      id: 'op-2',
      peerId: 'alice',
      clock: 2,
      timestamp: 2000,
      type: 'update' as const,
      path: 'text',
      payload: '2',
      vectorClock: { alice: 2 },
    };

    const streamA = [op1, op2];
    const streamB = [op2, op1]; // Duplicate & reverse

    const mergedStream = mergeOperationStreams(streamA, streamB);

    assert.strictEqual(mergedStream.length, 2);
    assert.strictEqual(mergedStream[0].id, 'op-1');
    assert.strictEqual(mergedStream[1].id, 'op-2');
  });

  it('should converge 3 concurrent replicas with mixed operations to the exact same state', () => {
    const alice = new CRDTSession({ peerId: 'alice', branchName: 'main' });
    const bob = new CRDTSession({ peerId: 'bob', branchName: 'main' });
    const carol = new CRDTSession({ peerId: 'carol', branchName: 'main' });

    // Alice inserts chars
    alice.applyOperation(alice.createOperation('insert', { char: 'A', position: 0 }, 'doc'));

    // Bob updates metadata
    bob.applyOperation(bob.createOperation('update', 'Collaborative Note', 'title'));

    // Carol updates status
    carol.applyOperation(carol.createOperation('update', 'published', 'status'));

    // Full 3-way merge
    mergeSessions(alice, bob);
    mergeSessions(bob, carol);
    mergeSessions(alice, carol);

    const stateAlice = alice.exportState();
    const stateBob = bob.exportState();
    const stateCarol = carol.exportState();

    assert.deepStrictEqual(stateAlice, stateBob);
    assert.deepStrictEqual(stateBob, stateCarol);

    assert.strictEqual(stateAlice.title, 'Collaborative Note');
    assert.strictEqual(stateAlice.status, 'published');
  });
});
