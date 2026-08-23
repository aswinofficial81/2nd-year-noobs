/**
 * Core types and interfaces for Git + CRDT architecture
 */
export type ObjectType = 'blob' | 'tree' | 'commit';
export interface GitObject {
    readonly id: string;
    readonly type: ObjectType;
    serialize(): string;
}
export type FileMode = '100644' | '100755' | '040000' | '120000';
export interface TreeEntry {
    readonly name: string;
    readonly mode: FileMode;
    readonly type: 'blob' | 'tree';
    readonly id: string;
}
export interface AuthorSignature {
    name: string;
    email: string;
    timestamp: number;
    timezoneOffset?: number;
}
export interface HeadReference {
    type: 'branch' | 'detached';
    target: string;
}
export type CRDTOperationType = 'insert' | 'delete' | 'update' | 'custom';
export interface CRDTOperation<T = unknown> {
    id: string;
    peerId: string;
    clock: number;
    timestamp: number;
    type: CRDTOperationType;
    path?: string;
    payload: T;
    vectorClock?: Record<string, number>;
}
export interface PeerInfo {
    peerId: string;
    name?: string;
    lastActive: number;
    metadata?: Record<string, unknown>;
}
export type VectorClock = Map<string, number>;
export type VectorClockLike = VectorClock | Record<string, number>;
export type CausalOrder = 'equal' | 'before' | 'after' | 'concurrent';
export interface BranchMergeResult {
    type: 'fast-forward' | 'already-up-to-date' | 'merged';
    commit?: GitObject;
    mergeBaseId?: string;
    mergedState?: Record<string, unknown>;
}
