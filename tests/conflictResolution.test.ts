import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  resolveOperationConflict,
  sortOperationsDeterministically,
  CRDTSession,
  type CRDTOperation,
} from '../src/index.js';

describe('Phase 12: Deterministic Conflict Resolution', () => {
  describe('1. Causal Conflict Resolution', () => {
    it('should select the causally newer operation (after)', () => {
      const opOld: CRDTOperation = {
        id: 'op-1',
        peerId: 'alice',
        clock: 1,
        timestamp: 1000,
        type: 'update',
        path: 'title',
        payload: 'Draft Title',
        vectorClock: { alice: 1 },
      };

      const opNew: CRDTOperation = {
        id: 'op-2',
        peerId: 'alice',
        clock: 2,
        timestamp: 2000,
        type: 'update',
        path: 'title',
        payload: 'Final Title',
        vectorClock: { alice: 2 },
      };

      assert.strictEqual(resolveOperationConflict(opOld, opNew), opNew);
      assert.strictEqual(resolveOperationConflict(opNew, opOld), opNew);
    });
  });

  describe('2. Concurrent Conflict Resolution', () => {
    it('should use deterministic ID tie-breaking when operations are concurrent', () => {
      // Alice and Bob concurrently updated 'title'
      const opAlice: CRDTOperation = {
        id: 'alice-update-1',
        peerId: 'alice',
        clock: 1,
        timestamp: 1000,
        type: 'update',
        path: 'title',
        payload: 'Alice Version',
        vectorClock: { alice: 1, bob: 0 },
      };

      const opBob: CRDTOperation = {
        id: 'bob-update-1',
        peerId: 'bob',
        clock: 1,
        timestamp: 1000,
        type: 'update',
        path: 'title',
        payload: 'Bob Version',
        vectorClock: { alice: 0, bob: 1 },
      };

      // 'bob-update-1' > 'alice-update-1' lexicographically
      const expectedWinner = 'bob-update-1'.localeCompare('alice-update-1') > 0 ? opBob : opAlice;

      assert.strictEqual(resolveOperationConflict(opAlice, opBob), expectedWinner);
      assert.strictEqual(resolveOperationConflict(opBob, opAlice), expectedWinner);
    });

    it('should resolve tie by peerId when IDs are identical', () => {
      const op1: CRDTOperation = {
        id: 'same-id',
        peerId: 'alice',
        clock: 1,
        timestamp: 1000,
        type: 'update',
        path: 'title',
        payload: 'A',
        vectorClock: { alice: 1, bob: 0 },
      };

      const op2: CRDTOperation = {
        id: 'same-id',
        peerId: 'bob',
        clock: 1,
        timestamp: 1000,
        type: 'update',
        path: 'title',
        payload: 'B',
        vectorClock: { alice: 0, bob: 1 },
      };

      // 'bob' > 'alice'
      assert.strictEqual(resolveOperationConflict(op1, op2), op2);
      assert.strictEqual(resolveOperationConflict(op2, op1), op2);
    });
  });

  describe('3. Deterministic Batch Sorting', () => {
    it('should sort mixed operations into identical deterministic order regardless of input permutation', () => {
      const baseOp: CRDTOperation = {
        id: 'op-0',
        peerId: 'alice',
        clock: 1,
        timestamp: 1000,
        type: 'update',
        path: 'title',
        payload: 'Base',
        vectorClock: { alice: 1, bob: 0 },
      };

      const opAlice: CRDTOperation = {
        id: 'op-alice-1',
        peerId: 'alice',
        clock: 2,
        timestamp: 2000,
        type: 'update',
        path: 'title',
        payload: 'Alice Branch',
        vectorClock: { alice: 2, bob: 0 },
      };

      const opBob: CRDTOperation = {
        id: 'op-bob-1',
        peerId: 'bob',
        clock: 1,
        timestamp: 2000,
        type: 'update',
        path: 'title',
        payload: 'Bob Branch',
        vectorClock: { alice: 1, bob: 1 },
      };

      const permutation1 = [opAlice, opBob, baseOp];
      const permutation2 = [baseOp, opAlice, opBob];
      const permutation3 = [opBob, baseOp, opAlice];

      const sorted1 = sortOperationsDeterministically(permutation1);
      const sorted2 = sortOperationsDeterministically(permutation2);
      const sorted3 = sortOperationsDeterministically(permutation3);

      assert.deepStrictEqual(sorted1.map(o => o.id), sorted2.map(o => o.id));
      assert.deepStrictEqual(sorted1.map(o => o.id), sorted3.map(o => o.id));

      // baseOp must be first because it causally preceded both
      assert.strictEqual(sorted1[0].id, 'op-0');
    });
  });

  describe('4. Convergence Under Reverse Arrival', () => {
    it('should reach identical final state when replicas process operations in deterministic order', () => {
      const sessionAlice = new CRDTSession({ peerId: 'alice', branchName: 'main' });
      const sessionBob = new CRDTSession({ peerId: 'bob', branchName: 'main' });

      // Alice creates opA, Bob creates opB concurrently
      const opA = sessionAlice.createOperation('update', 'Alice Wins Or Loses', 'title');
      const opB = sessionBob.createOperation('update', 'Bob Wins Or Loses', 'title');

      // Sort operations deterministically
      const operationsForAlice = sortOperationsDeterministically([opB]);
      const operationsForBob = sortOperationsDeterministically([opA]);

      // Apply on Alice
      sessionAlice.applyOperation(opA); // Local
      for (const op of operationsForAlice) {
        // Winning operation determines state
        const winner = resolveOperationConflict(sessionAlice.getPendingOperations()[0] ?? opA, op);
        sessionAlice.setState('title', winner.payload);
      }

      // Apply on Bob
      sessionBob.applyOperation(opB); // Local
      for (const op of operationsForBob) {
        const winner = resolveOperationConflict(op, sessionBob.getPendingOperations()[0] ?? opB);
        sessionBob.setState('title', winner.payload);
      }

      // Both replicas must converge to the exact same title
      assert.strictEqual(sessionAlice.getState('title'), sessionBob.getState('title'));
    });
  });
});
