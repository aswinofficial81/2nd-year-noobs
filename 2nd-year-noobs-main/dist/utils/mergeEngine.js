import { sortOperationsDeterministically } from './conflictResolution.js';
import { mergeVectorClocks } from './vectorClock.js';
/**
 * Merges two streams of CRDT operations into a single deduplicated,
 * deterministically ordered stream.
 */
export function mergeOperationStreams(streamA, streamB) {
    const opMap = new Map();
    for (const op of streamA) {
        opMap.set(op.id, op);
    }
    for (const op of streamB) {
        opMap.set(op.id, op);
    }
    return sortOperationsDeterministically(Array.from(opMap.values()));
}
/**
 * Merges two CRDTSession instances completely, synchronizing both
 * to a shared converged state and merged vector clock.
 */
export function mergeSessions(sessionA, sessionB) {
    sessionA.syncWith(sessionB);
    const stateA = sessionA.exportState();
    const stateB = sessionB.exportState();
    const mergedClock = mergeVectorClocks(sessionA.getVectorClock(), sessionB.getVectorClock());
    const isConverged = JSON.stringify(stateA) === JSON.stringify(stateB);
    const allOps = mergeOperationStreams(sessionA.getAllOperations(), sessionB.getAllOperations());
    return {
        mergedState: stateA,
        mergedVectorClock: mergedClock,
        operationsCount: allOps.length,
        isConverged,
    };
}
/**
 * Formats a key name into a human-readable field label.
 */
function formatFieldLabel(key) {
    if (key === 'title')
        return 'Document Title';
    if (key === 'content')
        return 'Document Text Body';
    if (key.startsWith('meta_'))
        return `Metadata Tag [${key.replace(/^meta_/, '')}]`;
    return key;
}
/**
 * Detects overlapping merge conflicts between Base, Ours, and Theirs states.
 */
export function detectStateConflicts(baseState, oursState, theirsState) {
    const conflicts = [];
    const allKeys = new Set([
        ...Object.keys(baseState),
        ...Object.keys(oursState),
        ...Object.keys(theirsState),
    ]);
    for (const key of allKeys) {
        const baseVal = baseState[key];
        const oursVal = oursState[key];
        const theirsVal = theirsState[key];
        const baseStr = JSON.stringify(baseVal);
        const oursStr = JSON.stringify(oursVal);
        const theirsStr = JSON.stringify(theirsVal);
        if (oursStr !== baseStr && theirsStr !== baseStr && oursStr !== theirsStr) {
            const autoResolved = theirsStr > oursStr ? (theirsVal !== undefined ? structuredClone(theirsVal) : undefined) : (oursVal !== undefined ? structuredClone(oursVal) : undefined);
            conflicts.push({
                key,
                fieldLabel: formatFieldLabel(key),
                baseValue: baseVal,
                oursValue: oursVal,
                theirsValue: theirsVal,
                description: `Concurrent divergence detected on ${formatFieldLabel(key)}: Target modified base value, and Source also modified base value independently.`,
                autoResolvedValue: autoResolved,
            });
        }
    }
    return conflicts;
}
/**
 * Detailed 3-Way State Merge returning both merged result and detected conflicts.
 */
export function detailedThreeWayStateMerge(baseState, oursState, theirsState, resolutionPreference = 'crdt') {
    const merged = {};
    const conflicts = [];
    const allKeys = new Set([
        ...Object.keys(baseState),
        ...Object.keys(oursState),
        ...Object.keys(theirsState),
    ]);
    for (const key of allKeys) {
        const baseVal = baseState[key];
        const oursVal = oursState[key];
        const theirsVal = theirsState[key];
        const baseStr = JSON.stringify(baseVal);
        const oursStr = JSON.stringify(oursVal);
        const theirsStr = JSON.stringify(theirsVal);
        if (oursStr === baseStr && theirsStr !== baseStr) {
            if (theirsVal !== undefined)
                merged[key] = structuredClone(theirsVal);
        }
        else if (theirsStr === baseStr && oursStr !== baseStr) {
            if (oursVal !== undefined)
                merged[key] = structuredClone(oursVal);
        }
        else if (oursStr === theirsStr) {
            if (oursVal !== undefined)
                merged[key] = structuredClone(oursVal);
        }
        else {
            // Conflict
            const autoResolved = theirsStr > oursStr ? (theirsVal !== undefined ? structuredClone(theirsVal) : undefined) : (oursVal !== undefined ? structuredClone(oursVal) : undefined);
            conflicts.push({
                key,
                fieldLabel: formatFieldLabel(key),
                baseValue: baseVal,
                oursValue: oursVal,
                theirsValue: theirsVal,
                description: `Concurrent divergence on ${formatFieldLabel(key)}`,
                autoResolvedValue: autoResolved,
            });
            if (resolutionPreference === 'ours') {
                if (oursVal !== undefined)
                    merged[key] = structuredClone(oursVal);
            }
            else if (resolutionPreference === 'theirs') {
                if (theirsVal !== undefined)
                    merged[key] = structuredClone(theirsVal);
            }
            else {
                if (autoResolved !== undefined)
                    merged[key] = autoResolved;
            }
        }
    }
    return {
        mergedState: merged,
        conflicts,
        hasConflicts: conflicts.length > 0,
    };
}
/**
 * Performs a 3-way semantic merge between a common base state,
 * our branch state, and their branch state.
 */
export function threeWayStateMerge(baseState, oursState, theirsState) {
    return detailedThreeWayStateMerge(baseState, oursState, theirsState, 'crdt').mergedState;
}
//# sourceMappingURL=mergeEngine.js.map