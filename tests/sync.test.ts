import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CRDTSession } from '../src/index.js';

describe('Phase 13: Replica Synchronization', () => {
  it('should synchronize operations from Alice to Bob unidirectionally', () => {
    const sessionAlice = new CRDTSession({ peerId: 'alice', branchName: 'main' });
    const sessionBob = new CRDTSession({ peerId: 'bob', branchName: 'main' });

    // Alice creates and applies an operation
    const op = sessionAlice.createOperation('update', 'Collaborative Doc', 'title');
    sessionAlice.applyOperation(op);

    // Bob starts with no state
    assert.strictEqual(sessionBob.getState('title'), undefined);

    // Bob syncs from Alice
    const appliedCount = sessionBob.syncFrom(sessionAlice);
    assert.strictEqual(appliedCount, 1);

    // Bob now has the same state and knows about Alice's clock
    assert.strictEqual(sessionBob.getState('title'), 'Collaborative Doc');
    assert.strictEqual(sessionBob.getClock('alice'), 1);
  });

  it('should synchronize operations bidirectionally between Alice and Bob', () => {
    const sessionAlice = new CRDTSession({ peerId: 'alice', branchName: 'main' });
    const sessionBob = new CRDTSession({ peerId: 'bob', branchName: 'main' });

    // Alice sets title, Bob sets description
    const opA = sessionAlice.createOperation('update', 'Project Alpha', 'title');
    sessionAlice.applyOperation(opA);

    const opB = sessionBob.createOperation('update', 'Hackathon Project', 'description');
    sessionBob.applyOperation(opB);

    // Two-way sync
    const syncResult = sessionAlice.syncWith(sessionBob);
    assert.strictEqual(syncResult.appliedLocal, 1); // Alice receives description
    assert.strictEqual(syncResult.appliedRemote, 1); // Bob receives title

    // Both replicas now have identical state
    assert.deepStrictEqual(sessionAlice.exportState(), {
      title: 'Project Alpha',
      description: 'Hackathon Project',
    });

    assert.deepStrictEqual(sessionBob.exportState(), sessionAlice.exportState());
  });

  it('should handle duplicate operation delivery idempotently without changing state', () => {
    const sessionAlice = new CRDTSession({ peerId: 'alice', branchName: 'main' });
    const sessionBob = new CRDTSession({ peerId: 'bob', branchName: 'main' });

    const op = sessionAlice.createOperation('update', 'Idempotent Title', 'title');
    sessionAlice.applyOperation(op);

    // First sync
    const firstSync = sessionBob.syncFrom(sessionAlice);
    assert.strictEqual(firstSync, 1);

    // Repeated sync with duplicate operations
    const secondSync = sessionBob.syncFrom(sessionAlice);
    assert.strictEqual(secondSync, 0); // 0 new operations applied

    assert.strictEqual(sessionBob.getState('title'), 'Idempotent Title');
  });

  it('should sort and correctly apply out-of-order received operations', () => {
    const sessionAlice = new CRDTSession({ peerId: 'alice', branchName: 'main' });
    const sessionBob = new CRDTSession({ peerId: 'bob', branchName: 'main' });

    // Alice creates two sequential operations
    const op1 = sessionAlice.createOperation('insert', { char: 'H', position: 0 }, 'text');
    sessionAlice.applyOperation(op1);

    const op2 = sessionAlice.createOperation('insert', { char: 'i', position: 1 }, 'text');
    sessionAlice.applyOperation(op2);

    // Deliver to Bob in reversed / scrambled network order [op2, op1]
    const applied = sessionBob.receiveOperations([op2, op1]);
    assert.strictEqual(applied, 2);

    // Verify Bob's text sequence is ['H', 'i'] in correct causal order
    const items = sessionBob.getState<Array<{ char: string }>>('text');
    assert.deepStrictEqual(
      items?.map((item) => item.char),
      ['H', 'i'],
    );
  });

  it('should achieve convergence across 3 replicas (Alice, Bob, Carol)', () => {
    const sessionAlice = new CRDTSession({ peerId: 'alice', branchName: 'main' });
    const sessionBob = new CRDTSession({ peerId: 'bob', branchName: 'main' });
    const sessionCarol = new CRDTSession({ peerId: 'carol', branchName: 'main' });

    // Each replica creates an independent edit
    const opA = sessionAlice.createOperation('update', '3-Way Collaborative Title', 'title');
    sessionAlice.applyOperation(opA);

    const opB = sessionBob.createOperation('update', 'Author: Bob', 'author');
    sessionBob.applyOperation(opB);

    const opC = sessionCarol.createOperation('update', 'Version 1.0', 'version');
    sessionCarol.applyOperation(opC);

    // Sync in a ring: Alice -> Bob -> Carol -> Alice
    sessionBob.syncFrom(sessionAlice);
    sessionCarol.syncFrom(sessionBob);
    sessionAlice.syncFrom(sessionCarol);
    sessionBob.syncFrom(sessionCarol);

    // All 3 replicas must have identical state
    const stateAlice = sessionAlice.exportState();
    const stateBob = sessionBob.exportState();
    const stateCarol = sessionCarol.exportState();

    assert.deepStrictEqual(stateAlice, {
      title: '3-Way Collaborative Title',
      author: 'Author: Bob',
      version: 'Version 1.0',
    });

    assert.deepStrictEqual(stateBob, stateAlice);
    assert.deepStrictEqual(stateCarol, stateAlice);
  });
});
