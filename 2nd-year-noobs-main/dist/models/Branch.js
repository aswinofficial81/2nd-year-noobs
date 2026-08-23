/**
 * Branch represents a named pointer to a commit head in the repository.
 */
export class Branch {
    name;
    _headCommitId;
    _remote;
    _metadata;
    constructor(name, headCommitId = null, remote = null, metadata = {}) {
        if (!name || name.trim() === '') {
            throw new Error('Branch name cannot be empty');
        }
        this.name = name;
        this._headCommitId = headCommitId;
        this._remote = remote;
        this._metadata = { ...metadata };
    }
    /**
     * Current commit ID pointed to by this branch.
     */
    get headCommitId() {
        return this._headCommitId;
    }
    /**
     * Remote tracking branch reference if any.
     */
    get remote() {
        return this._remote;
    }
    /**
     * Custom branch metadata.
     */
    get metadata() {
        return this._metadata;
    }
    /**
     * Updates the head commit pointer of this branch.
     */
    updateHead(commitId) {
        this._headCommitId = commitId;
        return this;
    }
    /**
     * Sets or updates remote tracking target.
     */
    setRemote(remote) {
        this._remote = remote;
        return this;
    }
    /**
     * Sets custom metadata on the branch.
     */
    setMetadata(key, value) {
        this._metadata[key] = value;
        return this;
    }
    /**
     * Serializes the Branch into a JSON string.
     */
    serialize() {
        return JSON.stringify(this.toJSON());
    }
    /**
     * Converts the Branch into a plain JSON object.
     */
    toJSON() {
        return {
            name: this.name,
            headCommitId: this._headCommitId,
            remote: this._remote,
            metadata: { ...this._metadata }
        };
    }
    /**
     * Deserializes a Branch from a JSON string.
     */
    static deserialize(serialized) {
        const data = JSON.parse(serialized);
        return Branch.fromJSON(data);
    }
    /**
     * Creates a Branch from a plain JSON object.
     */
    static fromJSON(json) {
        return new Branch(json.name, json.headCommitId, json.remote ?? null, json.metadata ?? {});
    }
}
//# sourceMappingURL=Branch.js.map