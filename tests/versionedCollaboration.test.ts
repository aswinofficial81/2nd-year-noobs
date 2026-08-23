import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Repository, type AuthorSignature } from '../src/index.js';

describe('Phase 15: CRDT <-> Git Versioned Collaboration', () => {
  const author: AuthorSignature = {
    name: 'Alice Developer',
    email: 'alice@example.com',
    timestamp: 1700000000,
  };

  it('should checkpoint CRDT session into a Git commit with correct DAG linkage', () => {
    const repo = new Repository('collab-repo');
    const session = repo.createCRDTSession('main', 'alice');

    // Make collaborative edits
    session.applyOperation(session.createOperation('update', 'v1.0 Release', 'version'));
    session.applyOperation(session.createOperation('update', 'Initial collaborative document', 'readme'));

    // Checkpoint to Git
    const commit1 = repo.checkpointSession(session, author, 'feat: initial collaborative checkpoint');

    assert.strictEqual(repo.currentCommitId, commit1.id);
    assert.strictEqual(commit1.parentIds.length, 0); // Root commit

    // Make second round of edits
    session.applyOperation(session.createOperation('update', 'v1.1 Release', 'version'));
    const commit2 = repo.checkpointSession(session, author, 'feat: update to v1.1');

    assert.strictEqual(repo.currentCommitId, commit2.id);
    assert.deepStrictEqual(commit2.parentIds, [commit1.id]);
    assert.ok(repo.isAncestor(commit1.id, commit2.id));
  });

  it('should restore an exact replica CRDT session from a historical Git commit', () => {
    const repo = new Repository('collab-repo');
    const sessionOriginal = repo.createCRDTSession('main', 'alice');

    const complexState = {
      title: 'Distributed Systems Note',
      tags: ['git', 'crdt', 'typescript'],
      metadata: { author: 'Alice', views: 42 },
    };

    for (const [key, value] of Object.entries(complexState)) {
      sessionOriginal.applyOperation(
        sessionOriginal.createOperation('update', value, key),
      );
    }

    const checkpointCommit = repo.checkpointSession(
      sessionOriginal,
      author,
      'checkpoint: complex state snapshot',
    );

    // Restore new session for Bob from Alice's commit
    const sessionRestored = repo.createSessionFromCommit({
      commitId: checkpointCommit.id,
      peerId: 'bob',
      branchName: 'main',
    });

    assert.deepStrictEqual(sessionRestored.exportState(), complexState);
    assert.strictEqual(sessionRestored.peerId, 'bob');
    assert.strictEqual(sessionRestored.getState('title'), 'Distributed Systems Note');
  });

  it('should support branching off and editing from a historical checkpoint', () => {
    const repo = new Repository('collab-repo');
    const sessionMain = repo.createCRDTSession('main', 'alice');

    sessionMain.applyOperation(sessionMain.createOperation('update', 'Base Document', 'title'));
    const commitV1 = repo.checkpointSession(sessionMain, author, 'v1 base');

    // Create branch 'feature-exp' from commitV1
    repo.createBranch('feature-exp', commitV1.id);
    repo.checkout('feature-exp');

    // Restore session on the feature branch
    const sessionFeature = repo.createSessionFromCommit({
      commitId: commitV1.id,
      peerId: 'carol',
      branchName: 'feature-exp',
    });

    // Make edits on feature branch
    sessionFeature.applyOperation(
      sessionFeature.createOperation('update', 'Experimental Branch Document', 'title'),
    );
    const commitFeature = repo.checkpointSession(
      sessionFeature,
      author,
      'feat: experimental title',
    );

    // Verify DAG relationship
    assert.strictEqual(repo.currentCommitId, commitFeature.id);
    assert.deepStrictEqual(commitFeature.parentIds, [commitV1.id]);
    assert.strictEqual(
      repo.findCommonAncestor(commitV1.id, commitFeature.id)?.id,
      commitV1.id,
    );
  });
});
