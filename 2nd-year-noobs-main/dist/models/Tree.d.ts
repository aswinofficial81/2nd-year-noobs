import type { GitObject, ObjectType, TreeEntry, FileMode } from "../types/index.js";
export interface TreeJSON {
    id: string;
    type: "tree";
    entries: TreeEntry[];
}
/**
 * Tree represents a directory node containing references to Blobs and sub-Trees.
 */
export declare class Tree implements GitObject {
    readonly type: ObjectType;
    private _entries;
    private _id;
    constructor(entries?: TreeEntry[], id?: string);
    /**
     * Deterministic ID computed from sorted canonical entry representation.
     */
    get id(): string;
    /**
     * Adds or replaces an entry in the tree. Invalidates the cached hash ID.
     */
    addEntry(entry: TreeEntry): this;
    /**
     * Adds a Blob reference entry.
     */
    addBlob(name: string, blobId: string, mode?: FileMode): this;
    /**
     * Adds a subtree reference entry.
     */
    addSubtree(name: string, treeId: string): this;
    /**
     * Removes an entry by name. Invalidates the cached hash ID.
     */
    removeEntry(name: string): boolean;
    /**
     * Gets an entry by name.
     */
    getEntry(name: string): TreeEntry | undefined;
    /**
     * Checks if an entry exists.
     */
    hasEntry(name: string): boolean;
    /**
     * Returns all entries sorted lexicographically by name.
     */
    listEntries(): TreeEntry[];
    /**
     * Returns entry count.
     */
    get size(): number;
    /**
     * Computes SHA-256 hash of sorted tree entries.
     */
    private computeTreeHash;
    /**
     * Serializes the Tree into a JSON string.
     */
    serialize(): string;
    /**
     * Converts the Tree to a plain JSON object.
     */
    toJSON(): TreeJSON;
    /**
     * Deserializes a Tree from JSON string.
     */
    static deserialize(serialized: string): Tree;
    /**
     * Creates a Tree from JSON representation.
     */
    static fromJSON(json: TreeJSON): Tree;
}
