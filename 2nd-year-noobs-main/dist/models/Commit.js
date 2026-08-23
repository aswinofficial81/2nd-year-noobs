import { computeHash } from '../utils/hash.js';
/**
 * Commit represents an immutable snapshot of repository
 * state at a point in time.
 */
export class Commit {
    id;
    type = 'commit';
    treeId;
    parentIds;
    author;
    committer;
    message;
    metadata;
    constructor(params) {
        this.treeId = params.treeId;
        this.parentIds = Object.freeze([
            ...(params.parentIds ?? [])
        ]);
        this.author = Object.freeze({
            ...params.author
        });
        this.committer = Object.freeze({
            ...(params.committer ?? params.author)
        });
        this.message = params.message;
        this.metadata = Object.freeze({
            ...(params.metadata ?? {})
        });
        /*
         * Compute the ID from the actual commit contents.
         */
        const computedId = this.computeCommitHash();
        /*
         * If an ID was supplied during deserialization,
         * verify that it matches the commit contents.
         */
        if (params.id !== undefined &&
            params.id !== computedId) {
            throw new Error(`Commit ID does not match content. ` +
                `Expected ${computedId}, received ${params.id}.`);
        }
        this.id = computedId;
    }
    /**
     * Returns true if this is the initial/root commit.
     */
    isRoot() {
        return this.parentIds.length === 0;
    }
    /**
     * Returns true if this is a merge commit.
     */
    isMerge() {
        return this.parentIds.length > 1;
    }
    /**
     * Sorts object keys recursively so that
     * metadata serialization is deterministic.
     */
    canonicalizeMetadata(value) {
        if (Array.isArray(value)) {
            return value.map(item => this.canonicalizeMetadata(item));
        }
        if (value !== null &&
            typeof value === 'object') {
            const obj = value;
            return Object.keys(obj)
                .sort()
                .reduce((result, key) => {
                result[key] =
                    this.canonicalizeMetadata(obj[key]);
                return result;
            }, {});
        }
        return value;
    }
    /**
     * Computes deterministic SHA-256 hash for the commit.
     */
    computeCommitHash() {
        const parentLines = this.parentIds
            .map(parentId => `parent ${parentId}`)
            .join('\n');
        const header = [
            `tree ${this.treeId}`,
            parentLines,
            `author ${this.author.name} <${this.author.email}> ${this.author.timestamp}`,
            `committer ${this.committer.name} <${this.committer.email}> ${this.committer.timestamp}`
        ]
            .filter(Boolean)
            .join('\n');
        const canonicalMetadata = this.canonicalizeMetadata(this.metadata);
        const metaStr = Object.keys(this.metadata).length > 0
            ? `\nmetadata ${JSON.stringify(canonicalMetadata)}`
            : '';
        const payload = `${header}${metaStr}\n\n${this.message}\n`;
        /*
         * Use actual UTF-8 byte length rather than
         * JavaScript string length.
         */
        const size = Buffer.byteLength(payload, 'utf8');
        return computeHash(`commit ${size}\0${payload}`);
    }
    /**
     * Serializes the Commit object into a JSON string.
     */
    serialize() {
        return JSON.stringify(this.toJSON());
    }
    /**
     * Converts the Commit object to a plain JSON structure.
     */
    toJSON() {
        return {
            id: this.id,
            type: 'commit',
            treeId: this.treeId,
            parentIds: [...this.parentIds],
            author: { ...this.author },
            committer: { ...this.committer },
            message: this.message,
            metadata: { ...this.metadata }
        };
    }
    /**
     * Deserializes a Commit from a JSON string.
     */
    static deserialize(serialized) {
        const data = JSON.parse(serialized);
        return Commit.fromJSON(data);
    }
    /**
     * Creates a Commit from a plain JSON object.
     */
    static fromJSON(json) {
        return new Commit({
            treeId: json.treeId,
            parentIds: json.parentIds,
            author: json.author,
            committer: json.committer,
            message: json.message,
            metadata: json.metadata,
            id: json.id
        });
    }
}
//# sourceMappingURL=Commit.js.map