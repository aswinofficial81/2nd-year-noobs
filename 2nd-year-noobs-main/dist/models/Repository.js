import { Blob } from "./Blob.js";
import { Tree } from "./Tree.js";
import { Commit } from "./Commit.js";
import { Branch } from "./Branch.js";
import { CRDTSession } from "./CRDTSession.js";
import { threeWayStateMerge } from "../utils/mergeEngine.js";
/**
 * Repository is the central entity orchestrating object storage (Blobs, Trees, Commits),
 * reference tracking (Branches, HEAD), and collaborative CRDT sessions.
 */
export class Repository {
    name;
    config;
    _objects = new Map();
    _branches = new Map();
    _head;
    _sessions = new Map();
    constructor(name, config = {}) {
        this.name = name;
        const defaultBranch = config.defaultBranch ?? "main";
        this.config = {
            defaultBranch,
            ...config,
        };
        // Initialize default branch
        this._branches.set(defaultBranch, new Branch(defaultBranch, null));
        // Initialize HEAD pointing to default branch
        this._head = {
            type: "branch",
            target: defaultBranch,
        };
    }
    // --- Object Store Management ---
    /**
     * Stores a Git object (Blob, Tree, or Commit) in the repository.
     */
    storeObject(object) {
        this._objects.set(object.id, object);
        return object;
    }
    /**
     * Retrieves an object by its hash ID.
     */
    getObject(id) {
        return this._objects.get(id);
    }
    /**
     * Retrieves a Blob by ID.
     */
    getBlob(id) {
        const obj = this.getObject(id);
        return obj instanceof Blob ? obj : undefined;
    }
    /**
     * Retrieves a Tree by ID.
     */
    getTree(id) {
        const obj = this.getObject(id);
        return obj instanceof Tree ? obj : undefined;
    }
    /**
     * Retrieves a Commit by ID.
     */
    getCommit(id) {
        const obj = this.getObject(id);
        return obj instanceof Commit ? obj : undefined;
    }
    /**
     * Checks if an object exists in storage.
     */
    hasObject(id) {
        return this._objects.has(id);
    }
    /**
     * Returns total count of objects stored.
     */
    get objectCount() {
        return this._objects.size;
    }
    // --- Branch & Reference Management ---
    /**
     * Creates a new branch.
     */
    createBranch(name, startCommitId) {
        if (this._branches.has(name)) {
            throw new Error(`Branch '${name}' already exists`);
        }
        let headId = startCommitId ?? null;
        if (!headId && this.currentCommitId) {
            headId = this.currentCommitId;
        }
        const branch = new Branch(name, headId);
        this._branches.set(name, branch);
        return branch;
    }
    /**
     * Retrieves a branch by name.
     */
    getBranch(name) {
        return this._branches.get(name);
    }
    /**
     * Lists all branches.
     */
    listBranches() {
        return Array.from(this._branches.values());
    }
    /**
     * Deletes a branch.
     */
    deleteBranch(name) {
        if (this._head.type === "branch" && this._head.target === name) {
            throw new Error(`Cannot delete checked-out branch '${name}'`);
        }
        return this._branches.delete(name);
    }
    // --- HEAD & Navigation ---
    /**
     * Gets current HEAD reference.
     */
    get head() {
        return { ...this._head };
    }
    /**
     * Gets current Commit ID referenced by HEAD.
     */
    get currentCommitId() {
        if (this._head.type === "detached") {
            return this._head.target;
        }
        const branch = this.getBranch(this._head.target);
        return branch?.headCommitId ?? null;
    }
    /**
     * Gets current Commit object pointed to by HEAD.
     */
    get currentCommit() {
        const id = this.currentCommitId;
        return id ? this.getCommit(id) : undefined;
    }
    /**
     * Switches HEAD to the specified branch or detaches to a commit.
     */
    checkout(target, options = {}) {
        if (options.createBranch) {
            this.createBranch(target, this.currentCommitId ?? undefined);
            this._head = { type: "branch", target };
            return;
        }
        const commit = this.getCommit(target);
        if (options.detach || commit) {
            if (!commit) {
                throw new Error(`Commit '${target}' does not exist`);
            }
            this._head = {
                type: "detached",
                target,
            };
            return;
        }
        const branch = this.getBranch(target);
        if (!branch) {
            throw new Error(`Branch '${target}' not found`);
        }
        this._head = { type: "branch", target };
    }
    /**
     * Creates a new Commit, stores it, and advances the current branch pointer.
     */
    createCommit(params) {
        const parentIds = params.parentIds ?? (this.currentCommitId ? [this.currentCommitId] : []);
        const commit = new Commit({
            ...params,
            parentIds,
        });
        this.storeObject(commit);
        // Update current branch if not detached
        if (this._head.type === "branch") {
            const currentBranch = this.getBranch(this._head.target);
            if (currentBranch) {
                currentBranch.updateHead(commit.id);
            }
        }
        else {
            this._head.target = commit.id;
        }
        return commit;
    }
    // --- CRDT Sessions ---
    /**
     * Creates and registers a new CRDTSession for collaborative editing.
     */
    createCRDTSession(branchName, peerId, sessionId) {
        if (!this._branches.has(branchName)) {
            throw new Error(`Cannot start CRDTSession on non-existent branch '${branchName}'`);
        }
        const session = new CRDTSession({
            sessionId,
            peerId,
            branchName,
        });
        this._sessions.set(session.sessionId, session);
        return session;
    }
    /**
     * Creates a Git checkpoint from the current state of a CRDT session.
     *
     * The CRDT document state is exported as JSON, stored as a Blob,
     * referenced by a Tree, and committed to the session's branch.
     */
    checkpointSession(session, author, message) {
        // Make sure the session belongs to this repository.
        const registeredSession = this._sessions.get(session.sessionId);
        if (registeredSession !== session) {
            throw new Error(`CRDTSession '${session.sessionId}' is not registered in this repository`);
        }
        // The session must point to an existing branch.
        const branch = this.getBranch(session.branchName);
        if (!branch) {
            throw new Error(`Cannot checkpoint session: branch '${session.branchName}' does not exist`);
        }
        // For now, require the session's branch to be checked out.
        // This prevents accidentally committing CRDT state to another branch.
        if (this._head.type !== "branch" ||
            this._head.target !== session.branchName) {
            throw new Error(`Cannot checkpoint session: branch '${session.branchName}' is not checked out`);
        }
        // 1. Export the CRDT document state.
        const state = session.exportState();
        // 2. Serialize the state.
        const serializedState = JSON.stringify(state);
        // 3. Store the state as a Git Blob.
        const blob = Blob.fromString(serializedState);
        this.storeObject(blob);
        // 4. Create a Tree containing the checkpoint.
        const tree = new Tree();
        tree.addBlob("state.json", blob.id);
        this.storeObject(tree);
        // 5. Create a Git commit.
        const commit = this.createCommit({
            treeId: tree.id,
            author,
            message,
            metadata: {
                source: "crdt-checkpoint",
                sessionId: session.sessionId,
                peerId: session.peerId,
                branchName: session.branchName,
            },
        });
        return commit;
    }
    /**
     * Restores a new CRDTSession directly from a historical Git Commit tree.
     */
    createSessionFromCommit(params) {
        const commit = this.getCommit(params.commitId);
        if (!commit) {
            throw new Error(`Commit '${params.commitId}' does not exist`);
        }
        const tree = this.getTree(commit.treeId);
        if (!tree) {
            throw new Error(`Tree '${commit.treeId}' for commit '${params.commitId}' does not exist`);
        }
        const branchName = params.branchName ??
            (this._head.type === "branch" ? this._head.target : "main");
        const session = new CRDTSession({
            sessionId: params.sessionId,
            peerId: params.peerId,
            branchName,
        });
        const stateEntry = tree.getEntry("state.json");
        if (stateEntry) {
            const blob = this.getBlob(stateEntry.id);
            if (blob) {
                const content = blob.getContentAsString();
                try {
                    const stateData = JSON.parse(content);
                    if (stateData && typeof stateData === "object") {
                        for (const [k, v] of Object.entries(stateData)) {
                            session.setState(k, v);
                        }
                    }
                }
                catch {
                    session.setState("state.json", content);
                }
            }
        }
        else {
            for (const entry of tree.listEntries()) {
                const blob = this.getBlob(entry.id);
                if (blob) {
                    const content = blob.getContentAsString();
                    try {
                        const parsed = JSON.parse(content);
                        session.setState(entry.name, parsed);
                    }
                    catch {
                        session.setState(entry.name, content);
                    }
                }
            }
        }
        this._sessions.set(session.sessionId, session);
        return session;
    }
    /**
     * Retrieves an active CRDTSession by ID.
     */
    getCRDTSession(sessionId) {
        return this._sessions.get(sessionId);
    }
    /**
     * Lists all active CRDT sessions.
     */
    listCRDTSessions() {
        return Array.from(this._sessions.values());
    }
    /**
     * Closes / removes a CRDTSession.
     */
    closeCRDTSession(sessionId) {
        return this._sessions.delete(sessionId);
    }
    // --- Serialization ---
    /**
     * Serializes the entire repository into a JSON string.
     */
    serialize() {
        return JSON.stringify(this.toJSON());
    }
    /**
     * Converts the Repository into a plain JSON object.
     */
    toJSON() {
        const blobs = [];
        const trees = [];
        const commits = [];
        for (const obj of this._objects.values()) {
            if (obj instanceof Blob)
                blobs.push(obj.toJSON());
            else if (obj instanceof Tree)
                trees.push(obj.toJSON());
            else if (obj instanceof Commit)
                commits.push(obj.toJSON());
        }
        return {
            name: this.name,
            config: { ...this.config },
            head: { ...this._head },
            branches: this.listBranches().map((b) => b.toJSON()),
            objects: { blobs, trees, commits },
            sessions: this.listCRDTSessions().map((s) => s.toJSON()),
        };
    }
    /**
     * Deserializes a Repository from a JSON string.
     */
    static deserialize(serialized) {
        const data = JSON.parse(serialized);
        return Repository.fromJSON(data);
    }
    getCommitParents(commitId) {
        const commit = this.getCommit(commitId);
        if (!commit) {
            throw new Error(`Commit '${commitId}' does not exist`);
        }
        return commit.parentIds
            .map((parentId) => this.getCommit(parentId))
            .filter((parent) => parent !== undefined);
    }
    getAncestors(commitId) {
        const start = this.getCommit(commitId);
        if (!start) {
            throw new Error(`Commit '${commitId}' does not exist`);
        }
        const ancestors = new Set();
        const stack = [...start.parentIds];
        while (stack.length > 0) {
            const currentId = stack.pop();
            if (ancestors.has(currentId)) {
                continue;
            }
            const commit = this.getCommit(currentId);
            if (!commit) {
                continue;
            }
            ancestors.add(currentId);
            for (const parentId of commit.parentIds) {
                if (!ancestors.has(parentId)) {
                    stack.push(parentId);
                }
            }
        }
        return ancestors;
    }
    isAncestor(ancestorId, commitId) {
        if (ancestorId === commitId) {
            return false;
        }
        return this.getAncestors(commitId).has(ancestorId);
    }
    /**
     * Finds the nearest common ancestor of two commits.
     *
     * The nearest ancestor is chosen using the minimum
     * combined graph distance from both commits.
     *
     * Returns undefined when the commits belong to
     * completely unrelated histories.
     */
    findCommonAncestor(commitAId, commitBId) {
        const commitA = this.getCommit(commitAId);
        const commitB = this.getCommit(commitBId);
        if (!commitA) {
            throw new Error(`Commit '${commitAId}' does not exist`);
        }
        if (!commitB) {
            throw new Error(`Commit '${commitBId}' does not exist`);
        }
        // Same commit is its own common ancestor.
        if (commitAId === commitBId) {
            return commitA;
        }
        /**
         * Finds the shortest distance from a starting commit
         * to every reachable ancestor.
         */
        const getAncestorDistances = (startCommitId) => {
            const distances = new Map();
            const queue = [
                {
                    commitId: startCommitId,
                    distance: 0,
                },
            ];
            while (queue.length > 0) {
                const current = queue.shift();
                // Already found a shorter/equal path.
                const previousDistance = distances.get(current.commitId);
                if (previousDistance !== undefined &&
                    previousDistance <= current.distance) {
                    continue;
                }
                distances.set(current.commitId, current.distance);
                const commit = this.getCommit(current.commitId);
                if (!commit) {
                    continue;
                }
                for (const parentId of commit.parentIds) {
                    queue.push({
                        commitId: parentId,
                        distance: current.distance + 1,
                    });
                }
            }
            return distances;
        };
        const distancesA = getAncestorDistances(commitAId);
        const distancesB = getAncestorDistances(commitBId);
        let bestAncestor;
        let bestScore = Infinity;
        for (const [ancestorId, distanceA] of distancesA) {
            const distanceB = distancesB.get(ancestorId);
            if (distanceB === undefined) {
                continue;
            }
            const score = distanceA + distanceB;
            if (score < bestScore) {
                const ancestor = this.getCommit(ancestorId);
                if (ancestor) {
                    bestAncestor = ancestor;
                    bestScore = score;
                }
            }
        }
        return bestAncestor;
    }
    /**
     * Merges a source branch into a target branch using 3-way semantic CRDT merging.
     */
    mergeBranches(params) {
        const target = this.getBranch(params.targetBranch);
        if (!target) {
            throw new Error(`Target branch '${params.targetBranch}' does not exist`);
        }
        const source = this.getBranch(params.sourceBranch);
        if (!source) {
            throw new Error(`Source branch '${params.sourceBranch}' does not exist`);
        }
        const oursHeadId = target.headCommitId;
        const theirsHeadId = source.headCommitId;
        if (!theirsHeadId) {
            return { type: "already-up-to-date" };
        }
        if (!oursHeadId) {
            // Target branch has no commits yet: fast-forward
            target.updateHead(theirsHeadId);
            const commit = this.getCommit(theirsHeadId);
            return { type: "fast-forward", commit };
        }
        if (oursHeadId === theirsHeadId) {
            return { type: "already-up-to-date", mergeBaseId: oursHeadId };
        }
        const baseCommit = this.findCommonAncestor(oursHeadId, theirsHeadId);
        // Case 1: Source is already an ancestor of Target -> Already up to date
        if (baseCommit && baseCommit.id === theirsHeadId) {
            return { type: "already-up-to-date", mergeBaseId: baseCommit.id };
        }
        // Case 2: Target is an ancestor of Source -> Fast forward
        if (baseCommit && baseCommit.id === oursHeadId) {
            target.updateHead(theirsHeadId);
            const commit = this.getCommit(theirsHeadId);
            return { type: "fast-forward", commit, mergeBaseId: baseCommit.id };
        }
        // Case 3: True 3-Way CRDT Merge
        const sessionOurs = this.createSessionFromCommit({
            commitId: oursHeadId,
            peerId: `merge-ours-${Date.now()}`,
            branchName: params.targetBranch,
        });
        const sessionTheirs = this.createSessionFromCommit({
            commitId: theirsHeadId,
            peerId: `merge-theirs-${Date.now()}`,
            branchName: params.sourceBranch,
        });
        let baseState = {};
        if (baseCommit) {
            const sessionBase = this.createSessionFromCommit({
                commitId: baseCommit.id,
                peerId: `merge-base-${Date.now()}`,
                branchName: params.targetBranch,
            });
            baseState = sessionBase.exportState();
            this.closeCRDTSession(sessionBase.sessionId);
        }
        const mergedState = threeWayStateMerge(baseState, sessionOurs.exportState(), sessionTheirs.exportState());
        // Store state blob and tree
        const blob = Blob.fromString(JSON.stringify(mergedState));
        this.storeObject(blob);
        const tree = new Tree();
        tree.addBlob("state.json", blob.id);
        this.storeObject(tree);
        // Create merge commit with 2 parents: [oursHeadId, theirsHeadId]
        const mergeCommit = new Commit({
            treeId: tree.id,
            parentIds: [oursHeadId, theirsHeadId],
            author: params.author,
            message: params.message ??
                `Merge branch '${params.sourceBranch}' into '${params.targetBranch}'`,
            metadata: {
                source: "branch-crdt-merge",
                mergeBaseId: baseCommit?.id,
                targetBranch: params.targetBranch,
                sourceBranch: params.sourceBranch,
            },
        });
        this.storeObject(mergeCommit);
        target.updateHead(mergeCommit.id);
        // Clean up temporary merge sessions
        this.closeCRDTSession(sessionOurs.sessionId);
        this.closeCRDTSession(sessionTheirs.sessionId);
        return {
            type: "merged",
            commit: mergeCommit,
            mergeBaseId: baseCommit?.id,
            mergedState,
        };
    }
    /**
     * Creates a Repository from a plain JSON object.
     */
    static fromJSON(json) {
        const repo = new Repository(json.name, json.config);
        // Restore objects
        for (const b of json.objects.blobs) {
            repo.storeObject(Blob.fromJSON(b));
        }
        for (const t of json.objects.trees) {
            repo.storeObject(Tree.fromJSON(t));
        }
        for (const c of json.objects.commits) {
            repo.storeObject(Commit.fromJSON(c));
        }
        // Restore branches
        repo._branches.clear();
        for (const branchData of json.branches) {
            const branch = Branch.fromJSON(branchData);
            repo._branches.set(branch.name, branch);
        }
        // Restore HEAD
        repo._head = { ...json.head };
        // Restore CRDT sessions
        repo._sessions.clear();
        for (const sessionData of json.sessions) {
            const session = CRDTSession.fromJSON(sessionData);
            repo._sessions.set(session.sessionId, session);
        }
        return repo;
    }
}
//# sourceMappingURL=Repository.js.map