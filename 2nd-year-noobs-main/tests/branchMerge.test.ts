import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Repository, Commit, type AuthorSignature } from '../src/index.js';

describe('Phase 16: Branch + CRDT Merging', () => {
  const author: AuthorSignature = {
    name: 'Aswin Lead',
    email: 'aswin@example.com',
    timestamp: 1700000000,
  };

  it('should perform fast-forward merge when target is an ancestor of source', () => {
    const repo = new Repository('ff-repo');
    const sessionMain = repo.createCRDTSession('main', 'alice');

    sessionMain.applyOperation(sessionMain.createOperation('update', 'v1.0', 'version'));
    const commit1 = repo.checkpointSession(sessionMain, author, 'feat: v1.0');

    // Create feature branch
    repo.createBranch('feature', commit1.id);
    repo.checkout('feature');

    const sessionFeature = repo.createCRDTSession('feature', 'bob');
    sessionFeature.applyOperation(sessionFeature.createOperation('update', 'v1.1', 'version'));
    const commit2 = repo.checkpointSession(sessionFeature, author, 'feat: v1.1');

    // Merge feature into main (should fast-forward)
    const mergeResult = repo.mergeBranches({
      targetBranch: 'main',
      sourceBranch: 'feature',
      author,
    });

    assert.strictEqual(mergeResult.type, 'fast-forward');
    assert.strictEqual(repo.getBranch('main')?.headCommitId, commit2.id);
    assert.strictEqual((mergeResult.commit as Commit)?.id, commit2.id);
  });

  it('should detect already-up-to-date branch merge', () => {
    const repo = new Repository('up-to-date-repo');
    const sessionMain = repo.createCRDTSession('main', 'alice');

    sessionMain.applyOperation(sessionMain.createOperation('update', 'v1.0', 'version'));
    const commit1 = repo.checkpointSession(sessionMain, author, 'feat: v1.0');

    repo.createBranch('feature', commit1.id);

    // Merge feature into main (both at commit1)
    const result = repo.mergeBranches({
      targetBranch: 'main',
      sourceBranch: 'feature',
      author,
    });

    assert.strictEqual(result.type, 'already-up-to-date');
  });

  it('should perform true 3-way CRDT branch merge and create dual-parent merge commit', () => {
    const repo = new Repository('three-way-repo');
    const sessionBase = repo.createCRDTSession('main', 'alice');

    sessionBase.applyOperation(sessionBase.createOperation('update', 'Base Title', 'title'));
    sessionBase.applyOperation(sessionBase.createOperation('update', 0, 'counter'));
    const commitBase = repo.checkpointSession(sessionBase, author, 'base commit');

    // 1. Branch 'feature-ui' off base
    repo.createBranch('feature-ui', commitBase.id);
    repo.checkout('feature-ui');

    const sessionUI = repo.createSessionFromCommit({
      commitId: commitBase.id,
      peerId: 'designer',
      branchName: 'feature-ui',
    });
    sessionUI.applyOperation(sessionUI.createOperation('update', 'Modern Glassmorphic Title', 'title'));
    const commitUI = repo.checkpointSession(sessionUI, author, 'feat: update title');

    // 2. Switch back to 'main' and make independent edits
    repo.checkout('main');
    const sessionMain = repo.createSessionFromCommit({
      commitId: commitBase.id,
      peerId: 'alice',
      branchName: 'main',
    });
    sessionMain.applyOperation(sessionMain.createOperation('update', 100, 'counter'));
    const commitMain = repo.checkpointSession(sessionMain, author, 'feat: update counter');

    // 3. Merge feature-ui into main
    const mergeResult = repo.mergeBranches({
      targetBranch: 'main',
      sourceBranch: 'feature-ui',
      author,
      message: 'Merge feature-ui into main with CRDT convergence',
    });

    assert.strictEqual(mergeResult.type, 'merged');
    assert.strictEqual(mergeResult.mergeBaseId, commitBase.id);

    const mergeCommit = mergeResult.commit as Commit;
    assert.ok(mergeCommit);
    assert.deepStrictEqual(mergeCommit.parentIds, [commitMain.id, commitUI.id]);

    // Check DAG ancestry
    assert.ok(repo.isAncestor(commitBase.id, mergeCommit.id));
    assert.ok(repo.isAncestor(commitMain.id, mergeCommit.id));
    assert.ok(repo.isAncestor(commitUI.id, mergeCommit.id));

    // Verify merged state combines both branch modifications
    assert.deepStrictEqual(mergeResult.mergedState, {
      title: 'Modern Glassmorphic Title',
      counter: 100,
    });
  });
});
