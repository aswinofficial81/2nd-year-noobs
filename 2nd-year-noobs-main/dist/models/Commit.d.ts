import type { GitObject, ObjectType, AuthorSignature } from '../types/index.js';
export interface CommitParams {
    treeId: string;
    parentIds?: string[];
    author: AuthorSignature;
    committer?: AuthorSignature;
    message: string;
    metadata?: Record<string, unknown>;
    id?: string;
}
export interface CommitJSON {
    id: string;
    type: 'commit';
    treeId: string;
    parentIds: string[];
    author: AuthorSignature;
    committer: AuthorSignature;
    message: string;
    metadata?: Record<string, unknown>;
}
/**
 * Commit represents an immutable snapshot of repository
 * state at a point in time.
 */
export declare class Commit implements GitObject {
    readonly id: string;
    readonly type: ObjectType;
    readonly treeId: string;
    readonly parentIds: readonly string[];
    readonly author: Readonly<AuthorSignature>;
    readonly committer: Readonly<AuthorSignature>;
    readonly message: string;
    readonly metadata: Readonly<Record<string, unknown>>;
    constructor(params: CommitParams);
    /**
     * Returns true if this is the initial/root commit.
     */
    isRoot(): boolean;
    /**
     * Returns true if this is a merge commit.
     */
    isMerge(): boolean;
    /**
     * Sorts object keys recursively so that
     * metadata serialization is deterministic.
     */
    private canonicalizeMetadata;
    /**
     * Computes deterministic SHA-256 hash for the commit.
     */
    private computeCommitHash;
    /**
     * Serializes the Commit object into a JSON string.
     */
    serialize(): string;
    /**
     * Converts the Commit object to a plain JSON structure.
     */
    toJSON(): CommitJSON;
    /**
     * Deserializes a Commit from a JSON string.
     */
    static deserialize(serialized: string): Commit;
    /**
     * Creates a Commit from a plain JSON object.
     */
    static fromJSON(json: CommitJSON): Commit;
}
