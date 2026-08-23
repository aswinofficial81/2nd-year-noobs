import { computeHash } from "../utils/hash.js";
import { sortOperationsDeterministically, resolveOperationConflict, } from "../utils/conflictResolution.js";
/**
 * CRDTSession manages collaborative editing sessions, replica peer states,
 * vector clocks, and conflict-free operation pipelines.
 */
export class CRDTSession {
    sessionId;
    peerId;
    branchName;
    _vectorClock = new Map();
    _peers = new Map();
    _pendingOperations = [];
    _appliedOperationIds = new Set();
    _operationLog = new Map();
    _fieldOperations = new Map();
    _state = new Map();
    constructor(params) {
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
            const entries = params.vectorClock instanceof Map
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
    getClock(peerId = this.peerId) {
        return this._vectorClock.get(peerId) ?? 0;
    }
    /**
     * Increments the local peer's vector clock and returns new value.
     */
    tick() {
        const current = this.getClock(this.peerId);
        const updated = current + 1;
        this._vectorClock.set(this.peerId, updated);
        return updated;
    }
    /**
     * Merges or updates an external peer's clock.
     */
    updatePeerClock(peerId, clock) {
        const current = this._vectorClock.get(peerId) ?? 0;
        this._vectorClock.set(peerId, Math.max(current, clock));
    }
    /**
     * Returns copy of the vector clock.
     */
    getVectorClock() {
        return new Map(this._vectorClock);
    }
    /**
     * Adds or updates a peer in the session.
     */
    addPeer(peer) {
        if (typeof peer === "string") {
            this._peers.set(peer, {
                peerId: peer,
                lastActive: Date.now(),
            });
            if (!this._vectorClock.has(peer)) {
                this._vectorClock.set(peer, 0);
            }
        }
        else {
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
    removePeer(peerId) {
        if (peerId === this.peerId) {
            throw new Error("Cannot remove local peer from CRDTSession");
        }
        return this._peers.delete(peerId);
    }
    /**
     * Lists all connected peers.
     */
    listPeers() {
        return Array.from(this._peers.values());
    }
    /**
     * Checks if an operation has already been applied.
     */
    hasApplied(operationId) {
        return this._appliedOperationIds.has(operationId);
    }
    /**
     * Creates and generates a deterministic CRDTOperation from this replica.
     */
    createOperation(type, payload, path) {
        const clock = this.tick();
        const timestamp = Date.now();
        const hashPayload = `${this.sessionId}:${this.peerId}:${clock}:${timestamp}:${type}:${path ?? ""}:${JSON.stringify(payload)}`;
        const id = computeHash(hashPayload).slice(0, 16);
        const vectorClockObj = {};
        for (const [p, c] of this._vectorClock.entries()) {
            vectorClockObj[p] = c;
        }
        const op = {
            id,
            peerId: this.peerId,
            clock,
            timestamp,
            type,
            path,
            payload,
            vectorClock: vectorClockObj,
        };
        this._pendingOperations.push(op);
        this._operationLog.set(id, op);
        return op;
    }
    /**
     * Validates a CRDTOperation structure to ensure integrity.
     * Throws an Error if the operation is malformed.
     */
    static validateOperation(op) {
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
        const validTypes = ['insert', 'delete', 'update', 'custom'];
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
    queueOperation(op) {
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
    applyOperation(op) {
        CRDTSession.validateOperation(op);
        this._operationLog.set(op.id, op);
        // Idempotency: never apply the same operation twice.
        if (this._appliedOperationIds.has(op.id)) {
            return false;
        }
        if (!op.path) {
            throw new Error(`Operation '${op.id}' requires a path`);
        }
        switch (op.type) {
            case 'update': {
                const prevOp = this._fieldOperations.get(op.path);
                if (!prevOp || resolveOperationConflict(prevOp, op) === op) {
                    this._state.set(op.path, structuredClone(op.payload));
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
                if (typeof payload === 'object' &&
                    payload !== null &&
                    'position' in payload &&
                    typeof payload.position === 'number') {
                    const rawPos = payload.position;
                    position = Math.max(0, Math.min(rawPos, items.length));
                }
                items.splice(position, 0, payload);
                this._state.set(op.path, items);
                break;
            }
            default:
                throw new Error(`Unsupported operation type: ${op.type}`);
        }
        // Mark as applied only after successful application.
        this._appliedOperationIds.add(op.id);
        // Remove from pending queue.
        this._pendingOperations =
            this._pendingOperations.filter(pending => pending.id !== op.id);
        // Update vector clock.
        this.updatePeerClock(op.peerId, op.clock);
        return true;
    }
    /**
     * Returns all pending operations in queue.
     */
    getPendingOperations() {
        return [...this._pendingOperations];
    }
    /**
     * Clears pending operations (e.g., after committing or syncing with storage).
     */
    clearPendingOperations() {
        const drained = this._pendingOperations;
        this._pendingOperations = [];
        return drained;
    }
    /**
     * Returns all operations known/recorded on this replica.
     */
    getAllOperations() {
        return Array.from(this._operationLog.values());
    }
    /**
     * Receives a batch of operations (e.g. from network or peer replica),
     * sorts them deterministically, and applies any unapplied operations.
     *
     * @returns Count of newly applied operations.
     */
    receiveOperations(operations) {
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
    syncFrom(peerSession) {
        this.addPeer(peerSession.peerId);
        peerSession.addPeer(this.peerId);
        const peerOps = peerSession.getAllOperations();
        return this.receiveOperations([...peerOps]);
    }
    /**
     * Performs a mutual bidirectional two-way synchronization between this session and a peer session.
     */
    syncWith(peerSession) {
        const appliedLocal = this.syncFrom(peerSession);
        const appliedRemote = peerSession.syncFrom(this);
        return { appliedLocal, appliedRemote };
    }
    /**
     * Sets key-value state property.
     */
    setState(key, value) {
        this._state.set(key, value);
        return this;
    }
    /**
     * Gets key-value state property.
     */
    getState(key) {
        return this._state.get(key);
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
    exportState() {
        const exported = {};
        for (const [key, value] of this._state.entries()) {
            exported[key] = structuredClone(value);
        }
        return exported;
    }
    serialize() {
        return JSON.stringify(this.toJSON());
    }
    /**
     * Converts the CRDTSession into a plain JSON object.
     */
    toJSON() {
        const vectorObj = {};
        for (const [k, v] of this._vectorClock.entries()) {
            vectorObj[k] = v;
        }
        const stateObj = {};
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
    static deserialize(serialized) {
        const data = JSON.parse(serialized);
        return CRDTSession.fromJSON(data);
    }
    /**
     * Creates a CRDTSession from a plain JSON object.
     */
    static fromJSON(json) {
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
//# sourceMappingURL=CRDTSession.js.map