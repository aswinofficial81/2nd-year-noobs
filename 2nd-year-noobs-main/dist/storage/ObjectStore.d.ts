import { Repository } from '../models/Repository.js';
import type { GitObject } from '../types/index.js';
/**
 * ObjectStore provides filesystem-based content-addressable storage
 * for Git objects, branches, HEAD references, and CRDT session state.
 */
export declare class ObjectStore {
    readonly repoRoot: string;
    readonly gitDir: string;
    constructor(repoRoot: string);
    get objectsDir(): string;
    get refsDir(): string;
    get sessionsDir(): string;
    /**
     * Initializes the .gitcrdt directory structure on disk.
     */
    init(): Promise<void>;
    /**
     * Computes loose object file path using 2-character prefix subdirectories.
     * e.g., .gitcrdt/objects/ab/c123...
     */
    getObjectPath(id: string): string;
    /**
     * Writes a Git object (Blob, Tree, Commit) to content-addressable disk storage.
     */
    writeObject(obj: GitObject): Promise<void>;
    /**
     * Reads a raw serialized object from disk by its SHA-256 ID.
     */
    readObject(id: string): Promise<string | undefined>;
    /**
     * Checks whether an object exists on disk.
     */
    hasObject(id: string): Promise<boolean>;
    /**
     * Lists all object IDs stored on disk.
     */
    listObjectIds(): Promise<string[]>;
    /**
     * Persists a full in-memory Repository (config, HEAD, refs, objects, sessions) to disk.
     */
    saveRepository(repo: Repository): Promise<void>;
    /**
     * Loads and reconstructs a Repository from disk.
     */
    loadRepository(): Promise<Repository>;
}
