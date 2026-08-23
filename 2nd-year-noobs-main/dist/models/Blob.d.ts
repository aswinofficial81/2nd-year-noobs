import type { GitObject, ObjectType } from '../types/index.js';
export interface BlobJSON {
    id: string;
    type: 'blob';
    content: string;
    encoding: 'utf8' | 'base64';
    size: number;
}
/**
 * Blob represents the raw, immutable content of a file or binary payload.
 *
 * The Blob ID is derived from the SHA-256 hash of its content.
 * Therefore, identical content produces the same Blob ID.
 */
export declare class Blob implements GitObject {
    readonly id: string;
    readonly type: ObjectType;
    readonly size: number;
    private readonly _content;
    private readonly _encoding;
    constructor(content: string | Uint8Array, encoding?: 'utf8' | 'base64', id?: string);
    /**
     * Returns file content as a UTF-8 string.
     */
    getContentAsString(): string;
    /**
     * Returns file content as a Base64 string.
     */
    getContentAsBase64(): string;
    /**
     * Returns a copy of the raw bytes.
     *
     * Returning a copy prevents callers from modifying
     * the internal Blob content.
     */
    getContentAsBytes(): Uint8Array;
    /**
     * Serializes the Blob into a JSON string.
     */
    serialize(): string;
    /**
     * Converts the Blob into a JSON-serializable structure.
     *
     * UTF-8 content is stored as a normal string.
     * Binary content is stored as Base64.
     */
    toJSON(): BlobJSON;
    /**
     * Deserializes a Blob from a JSON string.
     */
    static deserialize(serialized: string): Blob;
    /**
     * Creates a Blob from a plain JSON representation.
     *
     * The constructor will verify that the supplied ID
     * matches the content.
     */
    static fromJSON(json: BlobJSON): Blob;
    /**
     * Creates a Blob from UTF-8 text.
     */
    static fromString(text: string): Blob;
    /**
     * Creates a Blob from raw bytes.
     *
     * Binary content will be serialized as Base64.
     */
    static fromBytes(bytes: Uint8Array): Blob;
}
