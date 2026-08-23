export interface BranchJSON {
    name: string;
    headCommitId: string | null;
    remote?: string | null;
    metadata?: Record<string, unknown>;
}
/**
 * Branch represents a named pointer to a commit head in the repository.
 */
export declare class Branch {
    readonly name: string;
    private _headCommitId;
    private _remote;
    private _metadata;
    constructor(name: string, headCommitId?: string | null, remote?: string | null, metadata?: Record<string, unknown>);
    /**
     * Current commit ID pointed to by this branch.
     */
    get headCommitId(): string | null;
    /**
     * Remote tracking branch reference if any.
     */
    get remote(): string | null;
    /**
     * Custom branch metadata.
     */
    get metadata(): Readonly<Record<string, unknown>>;
    /**
     * Updates the head commit pointer of this branch.
     */
    updateHead(commitId: string | null): this;
    /**
     * Sets or updates remote tracking target.
     */
    setRemote(remote: string | null): this;
    /**
     * Sets custom metadata on the branch.
     */
    setMetadata(key: string, value: unknown): this;
    /**
     * Serializes the Branch into a JSON string.
     */
    serialize(): string;
    /**
     * Converts the Branch into a plain JSON object.
     */
    toJSON(): BranchJSON;
    /**
     * Deserializes a Branch from a JSON string.
     */
    static deserialize(serialized: string): Branch;
    /**
     * Creates a Branch from a plain JSON object.
     */
    static fromJSON(json: BranchJSON): Branch;
}
