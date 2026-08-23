import { computeHash } from "../utils/hash.js";
/**
 * Tree represents a directory node containing references to Blobs and sub-Trees.
 */
export class Tree {
    type = "tree";
    _entries = new Map();
    _id = null;
    constructor(entries = [], id) {
        for (const entry of entries) {
            this._entries.set(entry.name, { ...entry });
        }
        const computedId = this.computeTreeHash();
        if (id !== undefined && id !== computedId) {
            throw new Error(`Tree ID does not match entries. Expected ${computedId}, received ${id}.`);
        }
        this._id = computedId;
    }
    /**
     * Deterministic ID computed from sorted canonical entry representation.
     */
    get id() {
        if (!this._id) {
            this._id = this.computeTreeHash();
        }
        return this._id;
    }
    /**
     * Adds or replaces an entry in the tree. Invalidates the cached hash ID.
     */
    addEntry(entry) {
        this._entries.set(entry.name, { ...entry });
        this._id = null; // Invalidate cached hash
        return this;
    }
    /**
     * Adds a Blob reference entry.
     */
    addBlob(name, blobId, mode = "100644") {
        return this.addEntry({
            name,
            mode,
            type: "blob",
            id: blobId,
        });
    }
    /**
     * Adds a subtree reference entry.
     */
    addSubtree(name, treeId) {
        return this.addEntry({
            name,
            mode: "040000",
            type: "tree",
            id: treeId,
        });
    }
    /**
     * Removes an entry by name. Invalidates the cached hash ID.
     */
    removeEntry(name) {
        const deleted = this._entries.delete(name);
        if (deleted) {
            this._id = null;
        }
        return deleted;
    }
    /**
     * Gets an entry by name.
     */
    getEntry(name) {
        const entry = this._entries.get(name);
        return entry ? { ...entry } : undefined;
    }
    /**
     * Checks if an entry exists.
     */
    hasEntry(name) {
        return this._entries.has(name);
    }
    /**
     * Returns all entries sorted lexicographically by name.
     */
    listEntries() {
        return Array.from(this._entries.values()).sort((a, b) => a.name.localeCompare(b.name));
    }
    /**
     * Returns entry count.
     */
    get size() {
        return this._entries.size;
    }
    /**
     * Computes SHA-256 hash of sorted tree entries.
     */
    computeTreeHash() {
        const sorted = this.listEntries();
        const representation = sorted
            .map((e) => `${e.mode} ${e.type} ${e.id}\t${e.name}`)
            .join("\n");
        const size = Buffer.byteLength(representation, "utf8");
        return computeHash(`tree ${size}\0${representation}`);
    }
    /**
     * Serializes the Tree into a JSON string.
     */
    serialize() {
        return JSON.stringify(this.toJSON());
    }
    /**
     * Converts the Tree to a plain JSON object.
     */
    toJSON() {
        return {
            id: this.id,
            type: "tree",
            entries: this.listEntries(),
        };
    }
    /**
     * Deserializes a Tree from JSON string.
     */
    static deserialize(serialized) {
        const data = JSON.parse(serialized);
        return Tree.fromJSON(data);
    }
    /**
     * Creates a Tree from JSON representation.
     */
    static fromJSON(json) {
        return new Tree(json.entries, json.id);
    }
}
//# sourceMappingURL=Tree.js.map