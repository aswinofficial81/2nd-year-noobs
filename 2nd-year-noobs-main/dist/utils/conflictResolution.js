import { compareOperations } from './vectorClock.js';
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
export function resolveOperationConflict(opA, opB) {
    const causal = compareOperations(opA, opB);
    if (causal === 'after') {
        return opA;
    }
    if (causal === 'before') {
        return opB;
    }
    // Concurrent or equal: deterministic tie-breaker
    const idCompare = opA.id.localeCompare(opB.id);
    if (idCompare > 0) {
        return opA;
    }
    if (idCompare < 0) {
        return opB;
    }
    const peerCompare = opA.peerId.localeCompare(opB.peerId);
    return peerCompare >= 0 ? opA : opB;
}
/**
 * Deterministically sorts a collection of operations using causal dependency
 * and deterministic tie-breaking for concurrent operations.
 *
 * Comparator rules:
 * - If opA happened before opB -> returns -1 (opA precedes opB)
 * - If opA happened after opB -> returns 1 (opB precedes opA)
 * - If opA and opB are concurrent -> sorts by lexicographical op.id / op.peerId
 */
export function sortOperationsDeterministically(operations) {
    return [...operations].sort((a, b) => {
        const causal = compareOperations(a, b);
        if (causal === 'before')
            return -1;
        if (causal === 'after')
            return 1;
        // Concurrent: tie-break by ID
        const idDiff = a.id.localeCompare(b.id);
        if (idDiff !== 0)
            return idDiff;
        return a.peerId.localeCompare(b.peerId);
    });
}
//# sourceMappingURL=conflictResolution.js.map