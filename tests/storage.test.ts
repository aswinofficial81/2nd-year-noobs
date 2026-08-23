import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  Repository,
  ObjectStore,
  Blob,
  Tree,
  Commit,
  type AuthorSignature,
} from '../src/index.js';

describe('Phase 17: Persistence / Object Store', () => {
  let tempDir: string;
  const author: AuthorSignature = {
    name: 'Aswin Babu',
    email: 'aswin@example.com',
    timestamp: 1700000000,
  };

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-crdt-test-'));
  });

  after(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it('should initialize the .gitcrdt directory structure', async () => {
    const store = new ObjectStore(tempDir);
    await store.init();

    const exists = await fs
      .access(store.objectsDir)
      .then(() => true)
      .catch(() => false);
    assert.strictEqual(exists, true);
  });

  it('should write and read loose objects with 2-character prefix sharding', async () => {
    const store = new ObjectStore(tempDir);
    const blob = Blob.fromString('Hello Persistent World!');

    await store.writeObject(blob);

    // Verify file is placed in .gitcrdt/objects/xx/yyyy...
    const expectedPath = store.getObjectPath(blob.id);
    const fileExists = await fs
      .access(expectedPath)
      .then(() => true)
      .catch(() => false);
    assert.strictEqual(fileExists, true);

    // Read object back
    const raw = await store.readObject(blob.id);
    assert.ok(raw);
    const loadedBlob = Blob.fromJSON(JSON.parse(raw));
    assert.strictEqual(loadedBlob.id, blob.id);
    assert.strictEqual(loadedBlob.getContentAsString(), 'Hello Persistent World!');
  });

  it('should persist and load a complete repository with commits, branches, and CRDT state', async () => {
    const repoDir = path.join(tempDir, 'sample-repo');
    const store = new ObjectStore(repoDir);

    const originalRepo = new Repository('sample-repo');
    const session = originalRepo.createCRDTSession('main', 'alice');

    session.applyOperation(session.createOperation('update', 'Persistent Doc Title', 'title'));
    session.applyOperation(session.createOperation('update', 42, 'score'));

    const commit1 = originalRepo.checkpointSession(session, author, 'feat: first checkpoint');

    // Create a feature branch
    originalRepo.createBranch('feature', commit1.id);

    // Save entire repo to disk
    await store.saveRepository(originalRepo);

    // Load repository from disk into a fresh instance
    const reloadedRepo = await store.loadRepository();

    assert.strictEqual(reloadedRepo.name, 'sample-repo');
    assert.strictEqual(reloadedRepo.currentCommitId, commit1.id);
    assert.strictEqual(reloadedRepo.listBranches().length, 2);

    // Verify commit and DAG ancestry
    const reloadedCommit = reloadedRepo.getCommit(commit1.id);
    assert.ok(reloadedCommit);
    assert.strictEqual(reloadedCommit.message, 'feat: first checkpoint');

    // Restore CRDT session from loaded commit
    const reloadedSession = reloadedRepo.createSessionFromCommit({
      commitId: commit1.id,
      peerId: 'bob',
      branchName: 'main',
    });

    assert.strictEqual(reloadedSession.getState('title'), 'Persistent Doc Title');
    assert.strictEqual(reloadedSession.getState('score'), 42);
  });

  it('should allow continuing development and making new commits on reloaded repo', async () => {
    const repoDir = path.join(tempDir, 'sample-repo');
    const store = new ObjectStore(repoDir);

    // Load existing repo
    const repo = await store.loadRepository();
    const prevHead = repo.currentCommitId!;

    // Create new commit
    const session = repo.createSessionFromCommit({
      commitId: prevHead,
      peerId: 'alice',
      branchName: 'main',
    });

    session.applyOperation(session.createOperation('update', 'Updated Title on Disk', 'title'));
    const commit2 = repo.checkpointSession(session, author, 'feat: updated title');

    assert.ok(repo.isAncestor(prevHead, commit2.id));
    assert.deepStrictEqual(commit2.parentIds, [prevHead]);

    // Re-save to disk
    await store.saveRepository(repo);

    // Reload again to verify persistence
    const reloadedAgain = await store.loadRepository();
    assert.strictEqual(reloadedAgain.currentCommitId, commit2.id);
  });
});
