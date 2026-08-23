import { Blob } from "./Blob.js";
import { Tree } from "./Tree.js";
import { Commit, type CommitParams } from "./Commit.js";
import { Branch } from "./Branch.js";
import { CRDTSession } from "./CRDTSession.js";
import type { GitObject, HeadReference, AuthorSignature, BranchMergeResult } from "../types/index.js";
export interface RepositoryConfig {
    defaultBranch?: string;
    author?: AuthorSignature;
    [key: string]: unknown;
}
export interface RepositoryJSON {
    name: string;
    config: RepositoryConfig;
    head: HeadReference;
    branches: ReturnType<Branch["toJSON"]>[];
    objects: {
        blobs: ReturnType<Blob["toJSON"]>[];
        trees: ReturnType<Tree["toJSON"]>[];
        commits: ReturnType<Commit["toJSON"]>[];
    };
    sessions: ReturnType<CRDTSession["toJSON"]>[];
}
/**
 * Repository is the central entity orchestrating object storage (Blobs, Trees, Commits),
 * reference tracking (Branches, HEAD), and collaborative CRDT sessions.
 */
export declare class Repository {
    readonly name: string;
    config: RepositoryConfig;
    private _objects;
    private _branches;
    private _head;
    private _sessions;
    constructor(name: string, config?: RepositoryConfig);
    /**
     * Stores a Git object (Blob, Tree, or Commit) in the repository.
     */
    storeObject<T extends GitObject>(object: T): T;
    /**
     * Retrieves an object by its hash ID.
     */
    getObject(id: string): GitObject | undefined;
    /**
     * Retrieves a Blob by ID.
     */
    getBlob(id: string): Blob | undefined;
    /**
     * Retrieves a Tree by ID.
     */
    getTree(id: string): Tree | undefined;
    /**
     * Retrieves a Commit by ID.
     */
    getCommit(id: string): Commit | undefined;
    /**
     * Checks if an object exists in storage.
     */
    hasObject(id: string): boolean;
    /**
     * Returns total count of objects stored.
     */
    get objectCount(): number;
    /**
     * Creates a new branch.
     */
    createBranch(name: string, startCommitId?: string): Branch;
    /**
     * Retrieves a branch by name.
     */
    getBranch(name: string): Branch | undefined;
    /**
     * Lists all branches.
     */
    listBranches(): Branch[];
    /**
     * Deletes a branch.
     */
    deleteBranch(name: string): boolean;
    /**
     * Gets current HEAD reference.
     */
    get head(): Readonly<HeadReference>;
    /**
     * Gets current Commit ID referenced by HEAD.
     */
    get currentCommitId(): string | null;
    /**
     * Gets current Commit object pointed to by HEAD.
     */
    get currentCommit(): Commit | undefined;
    /**
     * Switches HEAD to the specified branch or detaches to a commit.
     */
    checkout(target: string, options?: {
        createBranch?: boolean;
        detach?: boolean;
    }): void;
    /**
     * Creates a new Commit, stores it, and advances the current branch pointer.
     */
    createCommit(params: Omit<CommitParams, "parentIds"> & {
        parentIds?: string[];
    }): Commit;
    /**
     * Creates and registers a new CRDTSession for collaborative editing.
     */
    createCRDTSession(branchName: string, peerId: string, sessionId?: string): CRDTSession;
    /**
     * Creates a Git checkpoint from the current state of a CRDT session.
     *
     * The CRDT document state is exported as JSON, stored as a Blob,
     * referenced by a Tree, and committed to the session's branch.
     */
    checkpointSession(session: CRDTSession, author: AuthorSignature, message: string): Commit;
    /**
     * Restores a new CRDTSession directly from a historical Git Commit tree.
     */
    createSessionFromCommit(params: {
        commitId: string;
        peerId: string;
        branchName?: string;
        sessionId?: string;
    }): CRDTSession;
    /**
     * Retrieves an active CRDTSession by ID.
     */
    getCRDTSession(sessionId: string): CRDTSession | undefined;
    /**
     * Lists all active CRDT sessions.
     */
    listCRDTSessions(): CRDTSession[];
    /**
     * Closes / removes a CRDTSession.
     */
    closeCRDTSession(sessionId: string): boolean;
    /**
     * Serializes the entire repository into a JSON string.
     */
    serialize(): string;
    /**
     * Converts the Repository into a plain JSON object.
     */
    toJSON(): RepositoryJSON;
    /**
     * Deserializes a Repository from a JSON string.
     */
    static deserialize(serialized: string): Repository;
    getCommitParents(commitId: string): Commit[];
    getAncestors(commitId: string): Set<string>;
    isAncestor(ancestorId: string, commitId: string): boolean;
    /**
     * Finds the nearest common ancestor of two commits.
     *
     * The nearest ancestor is chosen using the minimum
     * combined graph distance from both commits.
     *
     * Returns undefined when the commits belong to
     * completely unrelated histories.
     */
    findCommonAncestor(commitAId: string, commitBId: string): Commit | undefined;
    /**
     * Merges a source branch into a target branch using 3-way semantic CRDT merging.
     */
    mergeBranches(params: {
        targetBranch: string;
        sourceBranch: string;
        author: AuthorSignature;
        message?: string;
    }): BranchMergeResult;
    /**
     * Creates a Repository from a plain JSON object.
     */
    static fromJSON(json: RepositoryJSON): Repository;
}
