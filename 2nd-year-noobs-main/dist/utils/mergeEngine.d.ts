import type { CRDTOperation, VectorClock } from '../types/index.js';
import { CRDTSession } from '../models/CRDTSession.js';
export interface MergeResult {
    mergedState: Record<string, unknown>;
    mergedVectorClock: VectorClock;
    operationsCount: number;
    isConverged: boolean;
}
export interface MergeConflict {
    key: string;
    fieldLabel: string;
    baseValue: unknown;
    oursValue: unknown;
    theirsValue: unknown;
    description: string;
    autoResolvedValue: unknown;
}
export interface DetailedThreeWayMergeResult {
    mergedState: Record<string, unknown>;
    conflicts: MergeConflict[];
    hasConflicts: boolean;
}
/**
 * Merges two streams of CRDT operations into a single deduplicated,
 * deterministically ordered stream.
 */
export declare function mergeOperationStreams(streamA: readonly CRDTOperation[], streamB: readonly CRDTOperation[]): CRDTOperation[];
/**
 * Merges two CRDTSession instances completely, synchronizing both
 * to a shared converged state and merged vector clock.
 */
export declare function mergeSessions(sessionA: CRDTSession, sessionB: CRDTSession): MergeResult;
/**
 * Detects overlapping merge conflicts between Base, Ours, and Theirs states.
 */
export declare function detectStateConflicts(baseState: Record<string, unknown>, oursState: Record<string, unknown>, theirsState: Record<string, unknown>): MergeConflict[];
/**
 * Detailed 3-Way State Merge returning both merged result and detected conflicts.
 */
export declare function detailedThreeWayStateMerge(baseState: Record<string, unknown>, oursState: Record<string, unknown>, theirsState: Record<string, unknown>, resolutionPreference?: 'crdt' | 'ours' | 'theirs'): DetailedThreeWayMergeResult;
/**
 * Performs a 3-way semantic merge between a common base state,
 * our branch state, and their branch state.
 */
export declare function threeWayStateMerge(baseState: Record<string, unknown>, oursState: Record<string, unknown>, theirsState: Record<string, unknown>): Record<string, unknown>;
