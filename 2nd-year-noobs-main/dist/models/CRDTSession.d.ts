import type { CRDTOperation, CRDTOperationType, PeerInfo } from "../types/index.js";
export interface CRDTSessionParams {
    sessionId?: string;
    peerId: string;
    branchName: string;
    vectorClock?: Record<string, number> | Map<string, number>;
    peers?: PeerInfo[];
    pendingOperations?: CRDTOperation[];
    appliedOperationIds?: string[];
    state?: Record<string, unknown>;
}
export interface CRDTSessionJSON {
    sessionId: string;
    peerId: string;
    branchName: string;
    vectorClock: Record<string, number>;
    peers: PeerInfo[];
    pendingOperations: CRDTOperation[];
    appliedOperationIds: string[];
    state: Record<string, unknown>;
}
/**
 * CRDTSession manages collaborative editing sessions, replica peer states,
 * vector clocks, and conflict-free operation pipelines.
 */
export declare class CRDTSession {
    readonly sessionId: string;
    readonly peerId: string;
    readonly branchName: string;
    private _vectorClock;
    private _peers;
    private _pendingOperations;
    private _appliedOperationIds;
    private _operationLog;
    private _fieldOperations;
    private _state;
    constructor(params: CRDTSessionParams);
    /**
     * Returns current logical clock for a peer (defaults to local peer).
     */
    getClock(peerId?: string): number;
    /**
     * Increments the local peer's vector clock and returns new value.
     */
    tick(): number;
    /**
     * Merges or updates an external peer's clock.
     */
    updatePeerClock(peerId: string, clock: number): void;
    /**
     * Returns copy of the vector clock.
     */
    getVectorClock(): Map<string, number>;
    /**
     * Adds or updates a peer in the session.
     */
    addPeer(peer: PeerInfo | string): this;
    /**
     * Removes a peer from the active session.
     */
    removePeer(peerId: string): boolean;
    /**
     * Lists all connected peers.
     */
    listPeers(): PeerInfo[];
    /**
     * Checks if an operation has already been applied.
     */
    hasApplied(operationId: string): boolean;
    /**
     * Creates and generates a deterministic CRDTOperation from this replica.
     */
    createOperation<T = unknown>(type: CRDTOperationType, payload: T, path?: string): CRDTOperation<T>;
    /**
     * Validates a CRDTOperation structure to ensure integrity.
     * Throws an Error if the operation is malformed.
     */
    static validateOperation(op: CRDTOperation): void;
    /**
     * Queues an incoming operation for later application.
     *
     * Returns false if the operation has already been applied
     * or is already waiting in the pending queue.
     */
    queueOperation(op: CRDTOperation): boolean;
    /**
     * Applies an operation to the CRDT state.
     *
     * Returns true when the operation was applied.
     * Returns false when it was already applied.
     */
    applyOperation(op: CRDTOperation): boolean;
    /**
     * Returns all pending operations in queue.
     */
    getPendingOperations(): readonly CRDTOperation[];
    /**
     * Clears pending operations (e.g., after committing or syncing with storage).
     */
    clearPendingOperations(): CRDTOperation[];
    /**
     * Returns all operations known/recorded on this replica.
     */
    getAllOperations(): readonly CRDTOperation[];
    /**
     * Receives a batch of operations (e.g. from network or peer replica),
     * sorts them deterministically, and applies any unapplied operations.
     *
     * @returns Count of newly applied operations.
     */
    receiveOperations(operations: CRDTOperation[]): number;
    /**
     * Pulls and synchronizes all operations from a remote peer session.
     *
     * @returns Number of newly applied operations.
     */
    syncFrom(peerSession: CRDTSession): number;
    /**
     * Performs a mutual bidirectional two-way synchronization between this session and a peer session.
     */
    syncWith(peerSession: CRDTSession): {
        appliedLocal: number;
        appliedRemote: number;
    };
    /**
     * Sets key-value state property.
     */
    setState(key: string, value: unknown): this;
    /**
     * Gets key-value state property.
     */
    getState<T = unknown>(key: string): T | undefined;
    /**
     * Serializes the CRDTSession into a JSON string.
     */
    /**
     * Exports the current collaborative document state
     * as an independent plain JavaScript object.
     *
     * This exports only the document/application state.
     * Runtime information such as peers, vector clocks,
     * and pending operations is intentionally excluded.
     */
    exportState(): Record<string, unknown>;
    serialize(): string;
    /**
     * Converts the CRDTSession into a plain JSON object.
     */
    toJSON(): CRDTSessionJSON;
    /**
     * Deserializes a CRDTSession from a JSON string.
     */
    static deserialize(serialized: string): CRDTSession;
    /**
     * Creates a CRDTSession from a plain JSON object.
     */
    static fromJSON(json: CRDTSessionJSON): CRDTSession;
}
