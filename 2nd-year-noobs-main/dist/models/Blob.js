import { computeHash } from '../utils/hash.js';
/**
 * Blob represents the raw, immutable content of a file or binary payload.
 *
 * The Blob ID is derived from the SHA-256 hash of its content.
 * Therefore, identical content produces the same Blob ID.
 */
export class Blob {
    id;
    type = 'blob';
    size;
    _content;
    _encoding;
    constructor(content, encoding = 'utf8', id) {
        /*
         * Convert everything into bytes internally.
         *
         * This gives us one consistent representation for:
         * - hashing
         * - size calculation
         * - storing content
         */
        if (typeof content === 'string') {
            this._encoding = encoding;
            if (encoding === 'base64') {
                this._content = new Uint8Array(Buffer.from(content, 'base64'));
            }
            else {
                this._content = new Uint8Array(Buffer.from(content, 'utf8'));
            }
        }
        else {
            /*
             * IMPORTANT:
             * Make a copy instead of storing the original Uint8Array.
             *
             * This keeps the Blob immutable from the outside.
             */
            this._content = new Uint8Array(content);
            /*
             * Uint8Array represents raw bytes internally.
             * We use base64 when serializing those bytes.
             */
            this._encoding = 'base64';
        }
        /*
         * Size is based on actual bytes, not string length.
         */
        this.size = this._content.byteLength;
        /*
         * Blob identity is always determined by its content.
         */
        const computedId = computeHash(this._content);
        /*
         * If an ID was supplied during deserialization,
         * verify that it actually matches the content.
         */
        if (id !== undefined && id !== computedId) {
            throw new Error(`Blob ID does not match content. Expected ${computedId}, received ${id}.`);
        }
        this.id = computedId;
    }
    /**
     * Returns file content as a UTF-8 string.
     */
    getContentAsString() {
        return Buffer.from(this._content).toString('utf8');
    }
    /**
     * Returns file content as a Base64 string.
     */
    getContentAsBase64() {
        return Buffer.from(this._content).toString('base64');
    }
    /**
     * Returns a copy of the raw bytes.
     *
     * Returning a copy prevents callers from modifying
     * the internal Blob content.
     */
    getContentAsBytes() {
        return new Uint8Array(this._content);
    }
    /**
     * Serializes the Blob into a JSON string.
     */
    serialize() {
        return JSON.stringify(this.toJSON());
    }
    /**
     * Converts the Blob into a JSON-serializable structure.
     *
     * UTF-8 content is stored as a normal string.
     * Binary content is stored as Base64.
     */
    toJSON() {
        return {
            id: this.id,
            type: 'blob',
            content: this._encoding === 'base64'
                ? this.getContentAsBase64()
                : this.getContentAsString(),
            encoding: this._encoding,
            size: this.size
        };
    }
    /**
     * Deserializes a Blob from a JSON string.
     */
    static deserialize(serialized) {
        const data = JSON.parse(serialized);
        return Blob.fromJSON(data);
    }
    /**
     * Creates a Blob from a plain JSON representation.
     *
     * The constructor will verify that the supplied ID
     * matches the content.
     */
    static fromJSON(json) {
        return new Blob(json.content, json.encoding, json.id);
    }
    /**
     * Creates a Blob from UTF-8 text.
     */
    static fromString(text) {
        return new Blob(text, 'utf8');
    }
    /**
     * Creates a Blob from raw bytes.
     *
     * Binary content will be serialized as Base64.
     */
    static fromBytes(bytes) {
        return new Blob(bytes, 'base64');
    }
}
//# sourceMappingURL=Blob.js.map