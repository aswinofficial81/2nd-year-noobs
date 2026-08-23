import { computeHash } from '../utils/hash.js';
import type {
  GitObject,
  ObjectType,
  AuthorSignature
} from '../types/index.js';

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
export class Commit implements GitObject {
  public readonly id: string;
  public readonly type: ObjectType = 'commit';

  public readonly treeId: string;
  public readonly parentIds: readonly string[];

  public readonly author: Readonly<AuthorSignature>;
  public readonly committer: Readonly<AuthorSignature>;

  public readonly message: string;

  public readonly metadata: Readonly<Record<string, unknown>>;

  constructor(params: CommitParams) {
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
    if (
      params.id !== undefined &&
      params.id !== computedId
    ) {
      throw new Error(
        `Commit ID does not match content. ` +
        `Expected ${computedId}, received ${params.id}.`
      );
    }

    this.id = computedId;
  }

  /**
   * Returns true if this is the initial/root commit.
   */
  public isRoot(): boolean {
    return this.parentIds.length === 0;
  }

  /**
   * Returns true if this is a merge commit.
   */
  public isMerge(): boolean {
    return this.parentIds.length > 1;
  }

  /**
   * Sorts object keys recursively so that
   * metadata serialization is deterministic.
   */
  private canonicalizeMetadata(
    value: unknown
  ): unknown {
    if (Array.isArray(value)) {
      return value.map(item =>
        this.canonicalizeMetadata(item)
      );
    }

    if (
      value !== null &&
      typeof value === 'object'
    ) {
      const obj = value as Record<string, unknown>;

      return Object.keys(obj)
        .sort()
        .reduce<Record<string, unknown>>(
          (result, key) => {
            result[key] =
              this.canonicalizeMetadata(obj[key]);

            return result;
          },
          {}
        );
    }

    return value;
  }

  /**
   * Computes deterministic SHA-256 hash for the commit.
   */
  private computeCommitHash(): string {
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

    const canonicalMetadata =
      this.canonicalizeMetadata(this.metadata);

    const metaStr =
      Object.keys(this.metadata).length > 0
        ? `\nmetadata ${JSON.stringify(canonicalMetadata)}`
        : '';

    const payload =
      `${header}${metaStr}\n\n${this.message}\n`;

    /*
     * Use actual UTF-8 byte length rather than
     * JavaScript string length.
     */
    const size = Buffer.byteLength(
      payload,
      'utf8'
    );

    return computeHash(
      `commit ${size}\0${payload}`
    );
  }

  /**
   * Serializes the Commit object into a JSON string.
   */
  public serialize(): string {
    return JSON.stringify(this.toJSON());
  }

  /**
   * Converts the Commit object to a plain JSON structure.
   */
  public toJSON(): CommitJSON {
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
  public static deserialize(
    serialized: string
  ): Commit {
    const data =
      JSON.parse(serialized) as CommitJSON;

    return Commit.fromJSON(data);
  }

  /**
   * Creates a Commit from a plain JSON object.
   */
  public static fromJSON(
    json: CommitJSON
  ): Commit {
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