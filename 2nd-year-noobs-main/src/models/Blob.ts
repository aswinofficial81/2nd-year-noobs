import { computeHash } from '../utils/hash.js';
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
export class Blob implements GitObject {
  public readonly id: string;
  public readonly type: ObjectType = 'blob';
  public readonly size: number;

  private readonly _content: Uint8Array;
  private readonly _encoding: 'utf8' | 'base64';

  constructor(
    content: string | Uint8Array,
    encoding: 'utf8' | 'base64' = 'utf8',
    id?: string
  ) {
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
        this._content = new Uint8Array(
          Buffer.from(content, 'base64')
        );
      } else {
        this._content = new Uint8Array(
          Buffer.from(content, 'utf8')
        );
      }
    } else {
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
      throw new Error(
        `Blob ID does not match content. Expected ${computedId}, received ${id}.`
      );
    }

    this.id = computedId;
  }

  /**
   * Returns file content as a UTF-8 string.
   */
  public getContentAsString(): string {
    return Buffer.from(this._content).toString('utf8');
  }

  /**
   * Returns file content as a Base64 string.
   */
  public getContentAsBase64(): string {
    return Buffer.from(this._content).toString('base64');
  }

  /**
   * Returns a copy of the raw bytes.
   *
   * Returning a copy prevents callers from modifying
   * the internal Blob content.
   */
  public getContentAsBytes(): Uint8Array {
    return new Uint8Array(this._content);
  }

  /**
   * Serializes the Blob into a JSON string.
   */
  public serialize(): string {
    return JSON.stringify(this.toJSON());
  }

  /**
   * Converts the Blob into a JSON-serializable structure.
   *
   * UTF-8 content is stored as a normal string.
   * Binary content is stored as Base64.
   */
  public toJSON(): BlobJSON {
    return {
      id: this.id,
      type: 'blob',
      content:
        this._encoding === 'base64'
          ? this.getContentAsBase64()
          : this.getContentAsString(),
      encoding: this._encoding,
      size: this.size
    };
  }

  /**
   * Deserializes a Blob from a JSON string.
   */
  public static deserialize(serialized: string): Blob {
    const data = JSON.parse(serialized) as BlobJSON;

    return Blob.fromJSON(data);
  }

  /**
   * Creates a Blob from a plain JSON representation.
   *
   * The constructor will verify that the supplied ID
   * matches the content.
   */
  public static fromJSON(json: BlobJSON): Blob {
    return new Blob(
      json.content,
      json.encoding,
      json.id
    );
  }

  /**
   * Creates a Blob from UTF-8 text.
   */
  public static fromString(text: string): Blob {
    return new Blob(text, 'utf8');
  }

  /**
   * Creates a Blob from raw bytes.
   *
   * Binary content will be serialized as Base64.
   */
  public static fromBytes(bytes: Uint8Array): Blob {
    return new Blob(bytes, 'base64');
  }
}