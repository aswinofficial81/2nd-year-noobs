import { computeHash } from "../utils/hash.js";
import {
  sortOperationsDeterministically,
  resolveOperationConflict,
} from "../utils/conflictResolution.js";
import type {
  CRDTOperation,
  CRDTOperationType,
  PeerInfo,
} from "../types/index.js";

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
export class CRDTSession {
  public readonly sessionId: string;
  public readonly peerId: string;
  public readonly branchName: string;

  private _vectorClock: Map<string, number> = new Map();
  private _peers: Map<string, PeerInfo> = new Map();
  private _pendingOperations: CRDTOperation[] = [];
  private _appliedOperationIds: Set<string> = new Set();
  private _operationLog: Map<string, CRDTOperation> = new Map();
  private _fieldOperations: Map<string, CRDTOperation> = new Map();
  private _state: Map<string, unknown> = new Map();

  constructor(params: CRDTSessionParams) {
    this.peerId = params.peerId;
    this.branchName = params.branchName;
    this.sessionId =
      params.sessionId ??
      `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Initialize local peer
    this.addPeer({
      peerId: this.peerId,
      lastActive: Date.now(),
    });

    // Initialize vector clock
    if (params.vectorClock) {
      const entries =
        params.vectorClock instanceof Map
          ? Array.from(params.vectorClock.entries())
          : Object.entries(params.vectorClock);
      for (const [pId, clock] of entries) {
        this._vectorClock.set(pId, clock);
      }
    }
    if (!this._vectorClock.has(this.peerId)) {
      this._vectorClock.set(this.peerId, 0);
    }

    // Initialize peers
    if (params.peers) {
      for (const p of params.peers) {
        this.addPeer(p);
      }
    }

    // Initialize applied operations
    if (params.appliedOperationIds) {
      for (const id of params.appliedOperationIds) {
        this._appliedOperationIds.add(id);
      }
    }

    // Initialize pending operations
    if (params.pendingOperations) {
      this._pendingOperations = [...params.pendingOperations];
    }

    // Initialize arbitrary state
    if (params.state) {
      for (const [k, v] of Object.entries(params.state)) {
        this._state.set(k, v);
      }
    }
  }

  /**
   * Returns current logical clock for a peer (defaults to local peer).
   */
  public getClock(peerId: string = this.peerId): number {
    return this._vectorClock.get(peerId) ?? 0;
  }

  /**
   * Increments the local peer's vector clock and returns new value.
   */
  public tick(): number {
    const current = this.getClock(this.peerId);
    const updated = current + 1;
    this._vectorClock.set(this.peerId, updated);
    return updated;
  }

  /**
   * Merges or updates an external peer's clock.
   */
  public updatePeerClock(peerId: string, clock: number): void {
    const current = this._vectorClock.get(peerId) ?? 0;
    this._vectorClock.set(peerId, Math.max(current, clock));
  }

  /**
   * Returns copy of the vector clock.
   */
  public getVectorClock(): Map<string, number> {
    return new Map(this._vectorClock);
  }

  /**
   * Adds or updates a peer in the session.
   */
  public addPeer(peer: PeerInfo | string): this {
    if (typeof peer === "string") {
      this._peers.set(peer, {
        peerId: peer,
        lastActive: Date.now(),
      });
      if (!this._vectorClock.has(peer)) {
        this._vectorClock.set(peer, 0);
      }
    } else {
      this._peers.set(peer.peerId, {
        ...peer,
        lastActive: peer.lastActive ?? Date.now(),
      });
      if (!this._vectorClock.has(peer.peerId)) {
        this._vectorClock.set(peer.peerId, 0);
      }
    }
    return this;
  }

  /**
   * Removes a peer from the active session.
   */
  public removePeer(peerId: string): boolean {
    if (peerId === this.peerId) {
      throw new Error("Cannot remove local peer from CRDTSession");
    }
    return this._peers.delete(peerId);
  }

  /**
   * Lists all connected peers.
   */
  public listPeers(): PeerInfo[] {
    return Array.from(this._peers.values());
  }

  /**
   * Checks if an operation has already been applied.
   */
  public hasApplied(operationId: string): boolean {
    return this._appliedOperationIds.has(operationId);
  }

  /**
   * Creates and generates a deterministic CRDTOperation from this replica.
   */
  public createOperation<T = unknown>(
    type: CRDTOperationType,
    payload: T,
    path?: string,
  ): CRDTOperation<T> {
    const clock = this.tick();
    const timestamp = Date.now();
    const hashPayload = `${this.sessionId}:${this.peerId}:${clock}:${timestamp}:${type}:${path ?? ""}:${JSON.stringify(payload)}`;
    const id = computeHash(hashPayload).slice(0, 16);

    const vectorClockObj: Record<string, number> = {};
    for (const [p, c] of this._vectorClock.entries()) {
      vectorClockObj[p] = c;
    }

    const op: CRDTOperation<T> = {
      id,
      peerId: this.peerId,
      clock,
      timestamp,
      type,
      path,
      payload,
      vectorClock: vectorClockObj,
    };
    this._pendingOperations.push(op as CRDTOperation);
    this._operationLog.set(id, op as CRDTOperation);
    return op;
  }

  /**
   * Validates a CRDTOperation structure to ensure integrity.
   * Throws an Error if the operation is malformed.
   */
  public static validateOperation(op: CRDTOperation): void {
    if (!op || typeof op !== 'object') {
      throw new Error('Operation must be a valid non-null object');
    }

    if (!op.id || typeof op.id !== 'string' || op.id.trim() === '') {
      throw new Error('Operation requires a non-empty string ID');
    }

    if (!op.peerId || typeof op.peerId !== 'string' || op.peerId.trim() === '') {
      throw new Error(`Operation '${op.id}' requires a non-empty peer ID`);
    }

    if (typeof op.clock !== 'number' || !Number.isInteger(op.clock) || op.clock < 0) {
      throw new Error(`Operation '${op.id}' requires a non-negative integer clock`);
    }

    const validTypes: CRDTOperationType[] = ['insert', 'delete', 'update', 'custom'];
    if (!validTypes.includes(op.type)) {
      throw new Error(`Operation '${op.id}' has unsupported type '${op.type}'`);
    }

    if (op.type !== 'custom') {
      if (!op.path || typeof op.path !== 'string' || op.path.trim() === '') {
        throw new Error(`Operation '${op.id}' of type '${op.type}' requires a non-empty path`);
      }
    }

    if ((op.type === 'update' || op.type === 'insert') && op.payload === undefined) {
      throw new Error(`Operation '${op.id}' of type '${op.type}' requires a defined payload`);
    }
  }

  /**
   * Queues an incoming operation for later application.
   *
   * Returns false if the operation has already been applied
   * or is already waiting in the pending queue.
   */
  public queueOperation(op: CRDTOperation): boolean {
    CRDTSession.validateOperation(op);
    this._operationLog.set(op.id, op);

    // Already applied.
    if (this._appliedOperationIds.has(op.id)) {
      return false;
    }

    // Already waiting to be applied.
    if (this._pendingOperations.some((pending) => pending.id === op.id)) {
      return false;
    }

    this._pendingOperations.push(op);

    this.updatePeerClock(op.peerId, op.clock);

    return true;
  }

  /**
   * Applies an operation to the CRDT state.
   *
   * Returns true when the operation was applied.
   * Returns false when it was already applied.
   */
  public applyOperation(op: CRDTOperation): boolean {
    CRDTSession.validateOperation(op);
    this._operationLog.set(op.id, op);

    // Idempotency: never apply the same operation twice.
    if (this._appliedOperationIds.has(op.id)) {
      return false;
    }

  if (!op.path) {
    throw new Error(
      `Operation '${op.id}' requires a path`
    );
  }

  switch (op.type) {
    case 'update': {
      const prevOp = this._fieldOperations.get(op.path);
      if (!prevOp || resolveOperationConflict(prevOp, op) === op) {
        this._state.set(
          op.path,
          structuredClone(op.payload)
        );
        this._fieldOperations.set(op.path, op);
      }
      break;
    }

    case 'delete': {
      const prevOp = this._fieldOperations.get(op.path);
      if (!prevOp || resolveOperationConflict(prevOp, op) === op) {
        this._state.delete(op.path);
        this._fieldOperations.set(op.path, op);
      }
      break;
    }

    case 'insert': {
      const existing = this._state.get(op.path);

      const items = Array.isArray(existing)
        ? [...existing]
        : [];

      const payload = structuredClone(op.payload);

      let position = items.length;
      if (
        typeof payload === 'object' &&
        payload !== null &&
        'position' in payload &&
        typeof (payload as { position?: unknown }).position === 'number'
      ) {
        const rawPos = (payload as { position: number }).position;
        position = Math.max(0, Math.min(rawPos, items.length));
      }

      items.splice(position, 0, payload);

      this._state.set(op.path, items);
      break;
    }

    default:
      throw new Error(
        `Unsupported operation type: ${op.type}`
      );
  }

  // Mark as applied only after successful application.
  this._appliedOperationIds.add(op.id);

  // Remove from pending queue.
  this._pendingOperations =
    this._pendingOperations.filter(
      pending => pending.id !== op.id
    );

  // Update vector clock.
  this.updatePeerClock(
    op.peerId,
    op.clock
  );

  return true;
}

  /**
   * Returns all pending operations in queue.
   */
  public getPendingOperations(): readonly CRDTOperation[] {
    return [...this._pendingOperations];
  }

  /**
   * Clears pending operations (e.g., after committing or syncing with storage).
   */
  public clearPendingOperations(): CRDTOperation[] {
    const drained = this._pendingOperations;
    this._pendingOperations = [];
    return drained;
  }

  /**
   * Returns all operations known/recorded on this replica.
   */
  public getAllOperations(): readonly CRDTOperation[] {
    return Array.from(this._operationLog.values());
  }

  /**
   * Receives a batch of operations (e.g. from network or peer replica),
   * sorts them deterministically, and applies any unapplied operations.
   *
   * @returns Count of newly applied operations.
   */
  public receiveOperations(operations: CRDTOperation[]): number {
    const sorted = sortOperationsDeterministically(operations);
    let appliedCount = 0;

    for (const op of sorted) {
      if (this.hasApplied(op.id)) {
        continue;
      }
      this.queueOperation(op);
      const applied = this.applyOperation(op);
      if (applied) {
        appliedCount++;
      }
    }

    return appliedCount;
  }

  /**
   * Pulls and synchronizes all operations from a remote peer session.
   *
   * @returns Number of newly applied operations.
   */
  public syncFrom(peerSession: CRDTSession): number {
    this.addPeer(peerSession.peerId);
    peerSession.addPeer(this.peerId);

    const peerOps = peerSession.getAllOperations();
    return this.receiveOperations([...peerOps]);
  }

  /**
   * Performs a mutual bidirectional two-way synchronization between this session and a peer session.
   */
  public syncWith(peerSession: CRDTSession): { appliedLocal: number; appliedRemote: number } {
    const appliedLocal = this.syncFrom(peerSession);
    const appliedRemote = peerSession.syncFrom(this);

    return { appliedLocal, appliedRemote };
  }

  /**
   * Sets key-value state property.
   */
  public setState(key: string, value: unknown): this {
    this._state.set(key, value);
    return this;
  }

  /**
   * Gets key-value state property.
   */
  public getState<T = unknown>(key: string): T | undefined {
    return this._state.get(key) as T | undefined;
  }

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
  public exportState(): Record<string, unknown> {
    const exported: Record<string, unknown> = {};

    for (const [key, value] of this._state.entries()) {
      exported[key] = structuredClone(value);
    }

    return exported;
  }
  public serialize(): string {
    return JSON.stringify(this.toJSON());
  }

  /**
   * Converts the CRDTSession into a plain JSON object.
   */
  public toJSON(): CRDTSessionJSON {
    const vectorObj: Record<string, number> = {};
    for (const [k, v] of this._vectorClock.entries()) {
      vectorObj[k] = v;
    }

    const stateObj: Record<string, unknown> = {};
    for (const [k, v] of this._state.entries()) {
      stateObj[k] = v;
    }

    return {
      sessionId: this.sessionId,
      peerId: this.peerId,
      branchName: this.branchName,
      vectorClock: vectorObj,
      peers: this.listPeers(),
      pendingOperations: [...this._pendingOperations],
      appliedOperationIds: Array.from(this._appliedOperationIds),
      state: stateObj,
    };
  }

  /**
   * Deserializes a CRDTSession from a JSON string.
   */
  public static deserialize(serialized: string): CRDTSession {
    const data = JSON.parse(serialized) as CRDTSessionJSON;
    return CRDTSession.fromJSON(data);
  }

  /**
   * Creates a CRDTSession from a plain JSON object.
   */
  public static fromJSON(json: CRDTSessionJSON): CRDTSession {
    return new CRDTSession({
      sessionId: json.sessionId,
      peerId: json.peerId,
      branchName: json.branchName,
      vectorClock: json.vectorClock,
      peers: json.peers,
      pendingOperations: json.pendingOperations,
      appliedOperationIds: json.appliedOperationIds,
      state: json.state,
    });
  }
}
