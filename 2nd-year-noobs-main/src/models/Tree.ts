import { computeHash } from "../utils/hash.js";
import type {
  GitObject,
  ObjectType,
  TreeEntry,
  FileMode,
} from "../types/index.js";

export interface TreeJSON {
  id: string;
  type: "tree";
  entries: TreeEntry[];
}

/**
 * Tree represents a directory node containing references to Blobs and sub-Trees.
 */
export class Tree implements GitObject {
  public readonly type: ObjectType = "tree";
  private _entries: Map<string, TreeEntry> = new Map();
  private _id: string | null = null;

  constructor(entries: TreeEntry[] = [], id?: string) {
    for (const entry of entries) {
      this._entries.set(entry.name, { ...entry });
    }

    const computedId = this.computeTreeHash();

    if (id !== undefined && id !== computedId) {
      throw new Error(
        `Tree ID does not match entries. Expected ${computedId}, received ${id}.`,
      );
    }

    this._id = computedId;
  }

  /**
   * Deterministic ID computed from sorted canonical entry representation.
   */
  public get id(): string {
    if (!this._id) {
      this._id = this.computeTreeHash();
    }
    return this._id;
  }

  /**
   * Adds or replaces an entry in the tree. Invalidates the cached hash ID.
   */
  public addEntry(entry: TreeEntry): this {
    this._entries.set(entry.name, { ...entry });
    this._id = null; // Invalidate cached hash
    return this;
  }

  /**
   * Adds a Blob reference entry.
   */
  public addBlob(
    name: string,
    blobId: string,
    mode: FileMode = "100644",
  ): this {
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
  public addSubtree(name: string, treeId: string): this {
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
  public removeEntry(name: string): boolean {
    const deleted = this._entries.delete(name);
    if (deleted) {
      this._id = null;
    }
    return deleted;
  }

  /**
   * Gets an entry by name.
   */
  public getEntry(name: string): TreeEntry | undefined {
    const entry = this._entries.get(name);
    return entry ? { ...entry } : undefined;
  }

  /**
   * Checks if an entry exists.
   */
  public hasEntry(name: string): boolean {
    return this._entries.has(name);
  }

  /**
   * Returns all entries sorted lexicographically by name.
   */
  public listEntries(): TreeEntry[] {
    return Array.from(this._entries.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  /**
   * Returns entry count.
   */
  public get size(): number {
    return this._entries.size;
  }

  /**
   * Computes SHA-256 hash of sorted tree entries.
   */
  private computeTreeHash(): string {
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
  public serialize(): string {
    return JSON.stringify(this.toJSON());
  }

  /**
   * Converts the Tree to a plain JSON object.
   */
  public toJSON(): TreeJSON {
    return {
      id: this.id,
      type: "tree",
      entries: this.listEntries(),
    };
  }

  /**
   * Deserializes a Tree from JSON string.
   */
  public static deserialize(serialized: string): Tree {
    const data = JSON.parse(serialized) as TreeJSON;
    return Tree.fromJSON(data);
  }

  /**
   * Creates a Tree from JSON representation.
   */
  public static fromJSON(json: TreeJSON): Tree {
    return new Tree(json.entries, json.id);
  }
}
