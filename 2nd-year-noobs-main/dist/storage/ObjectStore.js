import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Repository } from '../models/Repository.js';
import { Blob } from '../models/Blob.js';
import { Tree } from '../models/Tree.js';
import { Commit } from '../models/Commit.js';
import { CRDTSession } from '../models/CRDTSession.js';
/**
 * ObjectStore provides filesystem-based content-addressable storage
 * for Git objects, branches, HEAD references, and CRDT session state.
 */
export class ObjectStore {
    repoRoot;
    gitDir;
    constructor(repoRoot) {
        this.repoRoot = repoRoot;
        this.gitDir = path.join(repoRoot, '.gitcrdt');
    }
    get objectsDir() {
        return path.join(this.gitDir, 'objects');
    }
    get refsDir() {
        return path.join(this.gitDir, 'refs', 'heads');
    }
    get sessionsDir() {
        return path.join(this.gitDir, 'sessions');
    }
    /**
     * Initializes the .gitcrdt directory structure on disk.
     */
    async init() {
        await fs.mkdir(this.objectsDir, { recursive: true });
        await fs.mkdir(this.refsDir, { recursive: true });
        await fs.mkdir(this.sessionsDir, { recursive: true });
    }
    /**
     * Computes loose object file path using 2-character prefix subdirectories.
     * e.g., .gitcrdt/objects/ab/c123...
     */
    getObjectPath(id) {
        const prefix = id.slice(0, 2);
        const rest = id.slice(2);
        return path.join(this.objectsDir, prefix, rest);
    }
    /**
     * Writes a Git object (Blob, Tree, Commit) to content-addressable disk storage.
     */
    async writeObject(obj) {
        const objPath = this.getObjectPath(obj.id);
        await fs.mkdir(path.dirname(objPath), { recursive: true });
        await fs.writeFile(objPath, obj.serialize(), 'utf8');
    }
    /**
     * Reads a raw serialized object from disk by its SHA-256 ID.
     */
    async readObject(id) {
        const objPath = this.getObjectPath(id);
        try {
            return await fs.readFile(objPath, 'utf8');
        }
        catch {
            return undefined;
        }
    }
    /**
     * Checks whether an object exists on disk.
     */
    async hasObject(id) {
        const objPath = this.getObjectPath(id);
        try {
            await fs.access(objPath);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Lists all object IDs stored on disk.
     */
    async listObjectIds() {
        const ids = [];
        try {
            const prefixes = await fs.readdir(this.objectsDir);
            for (const prefix of prefixes) {
                const prefixDir = path.join(this.objectsDir, prefix);
                const stat = await fs.stat(prefixDir);
                if (stat.isDirectory()) {
                    const files = await fs.readdir(prefixDir);
                    for (const file of files) {
                        ids.push(prefix + file);
                    }
                }
            }
        }
        catch {
            // Return empty if objects directory doesn't exist
        }
        return ids;
    }
    /**
     * Persists a full in-memory Repository (config, HEAD, refs, objects, sessions) to disk.
     */
    async saveRepository(repo) {
        await this.init();
        // 1. Write config
        const configPath = path.join(this.gitDir, 'config.json');
        await fs.writeFile(configPath, JSON.stringify({ name: repo.name, config: repo.config }, null, 2), 'utf8');
        // 2. Write HEAD
        const headPath = path.join(this.gitDir, 'HEAD');
        const head = repo.head;
        const headContent = head.type === 'branch'
            ? `ref: refs/heads/${head.target}\n`
            : `${head.target}\n`;
        await fs.writeFile(headPath, headContent, 'utf8');
        // 3. Write Branch refs
        for (const branch of repo.listBranches()) {
            if (branch.headCommitId) {
                const refPath = path.join(this.refsDir, branch.name);
                await fs.mkdir(path.dirname(refPath), { recursive: true });
                await fs.writeFile(refPath, `${branch.headCommitId}\n`, 'utf8');
            }
        }
        // 4. Write all Git objects
        const json = repo.toJSON();
        for (const b of json.objects.blobs) {
            await this.writeObject(Blob.fromJSON(b));
        }
        for (const t of json.objects.trees) {
            await this.writeObject(Tree.fromJSON(t));
        }
        for (const c of json.objects.commits) {
            await this.writeObject(Commit.fromJSON(c));
        }
        // 5. Write CRDT sessions
        for (const session of repo.listCRDTSessions()) {
            const sessionPath = path.join(this.sessionsDir, `${session.sessionId}.json`);
            await fs.writeFile(sessionPath, session.serialize(), 'utf8');
        }
    }
    /**
     * Loads and reconstructs a Repository from disk.
     */
    async loadRepository() {
        const configPath = path.join(this.gitDir, 'config.json');
        const configRaw = await fs.readFile(configPath, 'utf8');
        const { name, config } = JSON.parse(configRaw);
        const repo = new Repository(name, config);
        // 1. Load objects
        const objectIds = await this.listObjectIds();
        for (const id of objectIds) {
            const raw = await this.readObject(id);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.type === 'blob') {
                    repo.storeObject(Blob.fromJSON(parsed));
                }
                else if (parsed.type === 'tree') {
                    repo.storeObject(Tree.fromJSON(parsed));
                }
                else if (parsed.type === 'commit') {
                    repo.storeObject(Commit.fromJSON(parsed));
                }
            }
        }
        // 2. Load branch refs
        try {
            const branchFiles = await fs.readdir(this.refsDir);
            for (const branchName of branchFiles) {
                const refPath = path.join(this.refsDir, branchName);
                const commitId = (await fs.readFile(refPath, 'utf8')).trim();
                const branch = repo.getBranch(branchName);
                if (branch) {
                    branch.updateHead(commitId);
                }
                else {
                    repo.createBranch(branchName, commitId);
                }
            }
        }
        catch {
            // refs dir may be empty
        }
        // 3. Load HEAD
        try {
            const headContent = (await fs.readFile(path.join(this.gitDir, 'HEAD'), 'utf8')).trim();
            if (headContent.startsWith('ref: refs/heads/')) {
                const branchName = headContent.replace('ref: refs/heads/', '').trim();
                repo.checkout(branchName);
            }
            else if (headContent.length > 0) {
                repo.checkout(headContent, { detach: true });
            }
        }
        catch {
            // Default to main
        }
        // 4. Load sessions
        try {
            const sessionFiles = await fs.readdir(this.sessionsDir);
            for (const file of sessionFiles) {
                if (file.endsWith('.json')) {
                    const raw = await fs.readFile(path.join(this.sessionsDir, file), 'utf8');
                    const session = CRDTSession.deserialize(raw);
                    const existing = repo.getCRDTSession(session.sessionId);
                    if (!existing) {
                        repo._sessions.set(session.sessionId, session);
                    }
                }
            }
        }
        catch {
            // sessions dir may be empty
        }
        return repo;
    }
}
//# sourceMappingURL=ObjectStore.js.map