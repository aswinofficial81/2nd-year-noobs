import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  compareVectorClocks,
  mergeVectorClocks,
  areVectorClocksConcurrent,
  toVectorClockMap,
  compareOperations,
  areOperationsConcurrent,
  CRDTSession,
} from '../src/index.js';

describe('Phase 10: Vector Clock Causal Ordering', () => {
  describe('1. Equal Clocks', () => {
    it('should identify identical vector clocks as equal', () => {
      const clockA = { Alice: 2, Bob: 1 };
      const clockB = { Alice: 2, Bob: 1 };

      assert.strictEqual(compareVectorClocks(clockA, clockB), 'equal');
      assert.strictEqual(areVectorClocksConcurrent(clockA, clockB), false);
    });

    it('should treat missing peers with counter 0 as equal', () => {
      const clockA = { Alice: 2 };
      const clockB = { Alice: 2, Bob: 0 };

      assert.strictEqual(compareVectorClocks(clockA, clockB), 'equal');
    });

    it('should compare Map instances as equal', () => {
      const clockA = new Map([['Alice', 3], ['Bob', 4]]);
      const clockB = new Map([['Alice', 3], ['Bob', 4]]);

      assert.strictEqual(compareVectorClocks(clockA, clockB), 'equal');
    });
  });

  describe('2. Before (Happened-Before)', () => {
    it('should identify clockA as before clockB when clockA <= clockB and clockA != clockB', () => {
      const clockA = { Alice: 1, Bob: 1 };
      const clockB = { Alice: 2, Bob: 1 };

      assert.strictEqual(compareVectorClocks(clockA, clockB), 'before');
    });

    it('should identify empty clock as before non-empty clock', () => {
      const clockA = {};
      const clockB = { Alice: 1 };

      assert.strictEqual(compareVectorClocks(clockA, clockB), 'before');
    });

    it('should identify strictly dominated multiple peer advancements', () => {
      const clockA = { Alice: 1, Bob: 2, Carol: 0 };
      const clockB = { Alice: 2, Bob: 3, Carol: 1 };

      assert.strictEqual(compareVectorClocks(clockA, clockB), 'before');
    });
  });

  describe('3. After (Happened-After)', () => {
    it('should identify clockA as after clockB when clockA >= clockB and clockA != clockB', () => {
      const clockA = { Alice: 2, Bob: 3 };
      const clockB = { Alice: 2, Bob: 1 };

      assert.strictEqual(compareVectorClocks(clockA, clockB), 'after');
    });

    it('should identify populated clock as after empty clock', () => {
      const clockA = { Alice: 1 };
      const clockB = {};

      assert.strictEqual(compareVectorClocks(clockA, clockB), 'after');
    });
  });

  describe('4. Concurrent (Independent Updates)', () => {
    it('should detect concurrent independent edits between two peers', () => {
      // Alice advanced without seeing Bob, Bob advanced without seeing Alice
      const clockAlice = { Alice: 1, Bob: 0 };
      const clockBob = { Alice: 0, Bob: 1 };

      assert.strictEqual(compareVectorClocks(clockAlice, clockBob), 'concurrent');
      assert.strictEqual(areVectorClocksConcurrent(clockAlice, clockBob), true);
    });

    it('should detect concurrency when each clock has higher counter on different peers', () => {
      const clockA = { Alice: 3, Bob: 1 };
      const clockB = { Alice: 2, Bob: 4 };

      assert.strictEqual(compareVectorClocks(clockA, clockB), 'concurrent');
      assert.strictEqual(areVectorClocksConcurrent(clockA, clockB), true);
    });

    it('should detect concurrency when peers are completely disjoint', () => {
      const clockA = { Alice: 2 };
      const clockB = { Bob: 2 };

      assert.strictEqual(compareVectorClocks(clockA, clockB), 'concurrent');
    });
  });

  describe('5. Merge Vector Clocks', () => {
    it('should merge vector clocks by taking maximum clock per peer', () => {
      const clockA = { Alice: 3, Bob: 1, Carol: 0 };
      const clockB = { Alice: 2, Bob: 5, Dave: 4 };

      const merged = mergeVectorClocks(clockA, clockB);

      assert.strictEqual(merged.get('Alice'), 3);
      assert.strictEqual(merged.get('Bob'), 5);
      assert.strictEqual(merged.get('Carol'), 0);
      assert.strictEqual(merged.get('Dave'), 4);
    });

    it('should produce a clock that dominates both inputs after merge', () => {
      const clockA = { Alice: 3, Bob: 1 };
      const clockB = { Alice: 1, Bob: 4 };

      const merged = mergeVectorClocks(clockA, clockB);

      // Merged clock should be after or equal to both
      assert.strictEqual(compareVectorClocks(clockA, merged), 'before');
      assert.strictEqual(compareVectorClocks(clockB, merged), 'before');
    });
  });

  describe('6. Normalization Helper', () => {
    it('should safely normalize plain objects and Maps', () => {
      const map = toVectorClockMap({ Alice: 10, Bob: 20 });
      assert.strictEqual(map.get('Alice'), 10);
      assert.strictEqual(map.get('Bob'), 20);

      const clone = toVectorClockMap(map);
      assert.strictEqual(clone.get('Alice'), 10);
    });
  });
});

describe('Phase 11: Concurrent Operations Detection', () => {
  it('should order same-peer sequential operations causally (before / after)', () => {
    const session = new CRDTSession({ peerId: 'alice', branchName: 'main' });

    const op1 = session.createOperation('insert', { char: 'A', position: 0 }, 'doc');
    const op2 = session.createOperation('insert', { char: 'B', position: 1 }, 'doc');

    assert.strictEqual(compareOperations(op1, op2), 'before');
    assert.strictEqual(compareOperations(op2, op1), 'after');
    assert.strictEqual(areOperationsConcurrent(op1, op2), false);
  });

  it('should detect causally dependent operations across different peers', () => {
    const sessionAlice = new CRDTSession({ peerId: 'alice', branchName: 'main' });
    const sessionBob = new CRDTSession({ peerId: 'bob', branchName: 'main' });

    // Alice creates op1
    const op1 = sessionAlice.createOperation('insert', { char: 'H', position: 0 }, 'text');

    // Bob receives and applies op1 (synchronizing with Alice)
    sessionBob.queueOperation(op1);
    sessionBob.applyOperation(op1);

    // Bob creates op2 after having applied op1
    const op2 = sessionBob.createOperation('insert', { char: 'i', position: 1 }, 'text');

    // op1 happened causally before op2
    assert.strictEqual(compareOperations(op1, op2), 'before');
    assert.strictEqual(compareOperations(op2, op1), 'after');
    assert.strictEqual(areOperationsConcurrent(op1, op2), false);
  });

  it('should detect concurrent independent operations from two peers', () => {
    const sessionAlice = new CRDTSession({ peerId: 'alice', branchName: 'main' });
    const sessionBob = new CRDTSession({ peerId: 'bob', branchName: 'main' });

    // Alice and Bob create operations independently without seeing each other's edits
    const opAlice = sessionAlice.createOperation('update', 'Alice Version', 'title');
    const opBob = sessionBob.createOperation('update', 'Bob Version', 'title');

    assert.strictEqual(compareOperations(opAlice, opBob), 'concurrent');
    assert.strictEqual(compareOperations(opBob, opAlice), 'concurrent');
    assert.strictEqual(areOperationsConcurrent(opAlice, opBob), true);
  });

  it('should detect concurrency when peers edit independently after a common base operation', () => {
    const sessionAlice = new CRDTSession({ peerId: 'alice', branchName: 'main' });
    const sessionBob = new CRDTSession({ peerId: 'bob', branchName: 'main' });

    // Common base operation from Alice
    const baseOp = sessionAlice.createOperation('update', 'Base Document', 'title');
    sessionBob.queueOperation(baseOp);
    sessionBob.applyOperation(baseOp);

    // Now both diverge concurrently from the base
    const opAliceBranch = sessionAlice.createOperation('update', 'Alice Branch', 'title');
    const opBobBranch = sessionBob.createOperation('update', 'Bob Branch', 'title');

    // Both depend on baseOp, but are mutually concurrent
    assert.strictEqual(compareOperations(baseOp, opAliceBranch), 'before');
    assert.strictEqual(compareOperations(baseOp, opBobBranch), 'before');
    assert.strictEqual(compareOperations(opAliceBranch, opBobBranch), 'concurrent');
    assert.strictEqual(areOperationsConcurrent(opAliceBranch, opBobBranch), true);
  });

  it('should identify operations with identical clocks as equal', () => {
    const opA = {
      id: 'op-1',
      peerId: 'alice',
      clock: 1,
      timestamp: 1000,
      type: 'update' as const,
      path: 'title',
      payload: 'X',
      vectorClock: { alice: 1, bob: 2 },
    };

    const opB = {
      id: 'op-2',
      peerId: 'bob',
      clock: 2,
      timestamp: 1000,
      type: 'update' as const,
      path: 'title',
      payload: 'Y',
      vectorClock: { alice: 1, bob: 2 },
    };

    assert.strictEqual(compareOperations(opA, opB), 'equal');
    assert.strictEqual(areOperationsConcurrent(opA, opB), false);
  });
});
