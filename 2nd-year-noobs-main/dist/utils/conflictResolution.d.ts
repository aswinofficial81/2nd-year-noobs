import type { CRDTOperation } from '../types/index.js';
/**
 * Resolves a conflict between two operations targeting the same path.
 *
 * Rules:
 * 1. If one operation causally succeeded the other ('after'), the newer operation wins.
 * 2. If one operation causally preceded the other ('before'), the newer operation wins.
 * 3. If operations are concurrent ('concurrent') or equal:
 *    - Higher lexicographical `id` wins.
 *    - If `id` is identical, higher lexicographical `peerId` wins.
 *
 * @returns The winning CRDTOperation.
 */
export declare function resolveOperationConflict<T = unknown>(opA: CRDTOperation<T>, opB: CRDTOperation<T>): CRDTOperation<T>;
/**
 * Deterministically sorts a collection of operations using causal dependency
 * and deterministic tie-breaking for concurrent operations.
 *
 * Comparator rules:
 * - If opA happened before opB -> returns -1 (opA precedes opB)
 * - If opA happened after opB -> returns 1 (opB precedes opA)
 * - If opA and opB are concurrent -> sorts by lexicographical op.id / op.peerId
 */
export declare function sortOperationsDeterministically(operations: CRDTOperation[]): CRDTOperation[];
