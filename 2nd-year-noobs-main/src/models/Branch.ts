export interface BranchJSON {
  name: string;
  headCommitId: string | null;
  remote?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Branch represents a named pointer to a commit head in the repository.
 */
export class Branch {
  public readonly name: string;
  private _headCommitId: string | null;
  private _remote: string | null;
  private _metadata: Record<string, unknown>;

  constructor(
    name: string,
    headCommitId: string | null = null,
    remote: string | null = null,
    metadata: Record<string, unknown> = {}
  ) {
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
  public get headCommitId(): string | null {
    return this._headCommitId;
  }

  /**
   * Remote tracking branch reference if any.
   */
  public get remote(): string | null {
    return this._remote;
  }

  /**
   * Custom branch metadata.
   */
  public get metadata(): Readonly<Record<string, unknown>> {
    return this._metadata;
  }

  /**
   * Updates the head commit pointer of this branch.
   */
  public updateHead(commitId: string | null): this {
    this._headCommitId = commitId;
    return this;
  }

  /**
   * Sets or updates remote tracking target.
   */
  public setRemote(remote: string | null): this {
    this._remote = remote;
    return this;
  }

  /**
   * Sets custom metadata on the branch.
   */
  public setMetadata(key: string, value: unknown): this {
    this._metadata[key] = value;
    return this;
  }

  /**
   * Serializes the Branch into a JSON string.
   */
  public serialize(): string {
    return JSON.stringify(this.toJSON());
  }

  /**
   * Converts the Branch into a plain JSON object.
   */
  public toJSON(): BranchJSON {
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
  public static deserialize(serialized: string): Branch {
    const data = JSON.parse(serialized) as BranchJSON;
    return Branch.fromJSON(data);
  }

  /**
   * Creates a Branch from a plain JSON object.
   */
  public static fromJSON(json: BranchJSON): Branch {
    return new Branch(json.name, json.headCommitId, json.remote ?? null, json.metadata ?? {});
  }
}
