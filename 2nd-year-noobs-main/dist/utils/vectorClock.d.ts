import type { VectorClock, VectorClockLike, CausalOrder, CRDTOperation } from '../types/index.js';
/**
 * Normalizes a VectorClockLike into a standard Map<string, number>.
 */
export declare function toVectorClockMap(clock: VectorClockLike): Map<string, number>;
/**
 * Compares two vector clocks to determine their causal relationship:
 * - 'equal': Both clocks have identical logical counters for all peers.
 * - 'before': Clock A strictly happened before Clock B (A <= B and A != B).
 * - 'after': Clock A strictly happened after Clock B (A >= B and A != B).
 * - 'concurrent': Neither clock dominates the other (concurrent independent updates).
 */
export declare function compareVectorClocks(clockA: VectorClockLike, clockB: VectorClockLike): CausalOrder;
/**
 * Merges two vector clocks by taking the maximum clock counter for every peer.
 */
export declare function mergeVectorClocks(clockA: VectorClockLike, clockB: VectorClockLike): VectorClock;
/**
 * Checks whether two vector clocks are causally concurrent.
 */
export declare function areVectorClocksConcurrent(clockA: VectorClockLike, clockB: VectorClockLike): boolean;
/**
 * Extracts a vector clock representation from a CRDTOperation.
 * Uses op.vectorClock if available, otherwise falls back to single-peer clock.
 */
export declare function getOperationVectorClock(op: CRDTOperation): VectorClockLike;
/**
 * Compares two CRDT operations causally based on their embedded vector clocks.
 * - 'equal': Same logical clock timestamp context.
 * - 'before': opA happened causally before opB.
 * - 'after': opA happened causally after opB.
 * - 'concurrent': opA and opB were created independently without causal dependency.
 */
export declare function compareOperations(opA: CRDTOperation, opB: CRDTOperation): CausalOrder;
/**
 * Checks whether two CRDT operations occurred concurrently.
 */
export declare function areOperationsConcurrent(opA: CRDTOperation, opB: CRDTOperation): boolean;
