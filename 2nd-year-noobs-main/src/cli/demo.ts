import {
  Repository,
  CollaborativeDocument,
  CollaborativeChat,
  ObjectStore,
  type AuthorSignature,
} from '../index.js';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

export interface DemoStepResult {
  step: string;
  details: string;
  state?: Record<string, unknown>;
}

/**
 * Runs an automated end-to-end hackathon demonstration of Git + CRDT collaboration.
 */
export async function runHackathonDemo(
  outputDir?: string,
): Promise<DemoStepResult[]> {
  const steps: DemoStepResult[] = [];
  const tempDir =
    outputDir ??
    (await fs.mkdtemp(path.join(os.tmpdir(), 'git-crdt-demo-')));

  const authorAlice: AuthorSignature = {
    name: 'Alice Engineer',
    email: 'alice@hackathon.ai',
    timestamp: 1700000000,
  };
  const authorBob: AuthorSignature = {
    name: 'Bob AI Researcher',
    email: 'bob@hackathon.ai',
    timestamp: 1700000000,
  };

  // 1. Init Repository
  const repo = new Repository('ai-hackathon-collab');
  const store = new ObjectStore(tempDir);
  await store.init();
  steps.push({
    step: '1. Initialize Repository',
    details: `Created Git + CRDT repo at ${tempDir}`,
  });

  // 2. Collaborative Document Editing
  const sessionAlice = repo.createCRDTSession('main', 'alice');
  const docAlice = new CollaborativeDocument(sessionAlice);
  docAlice.setTitle('Autonomous Agents Whitepaper');
  docAlice.insertText('Introduction: Decentralized AI systems.');
  steps.push({
    step: '2. Alice Edits Document',
    details: `Title: "${docAlice.getTitle()}", Text: "${docAlice.getText()}"`,
  });

  // 3. Bob joins and collaborates
  const sessionBob = repo.createCRDTSession('main', 'bob');
  const docBob = new CollaborativeDocument(sessionBob);
  docBob.syncWith(docAlice);
  docBob.insertText(
    ' Methodology: CRDT + Git version control.',
    docBob.getText().length,
  );
  docAlice.syncWith(docBob);
  steps.push({
    step: '3. Bob Syncs & Appends Text',
    details: `Synced text: "${docAlice.getText()}"`,
  });

  // 4. Team Chat with Reactions
  const chatAlice = new CollaborativeChat(sessionAlice);
  const chatBob = new CollaborativeChat(sessionBob);
  const msg1 = chatAlice.postMessage('Draft v1.0 ready for review!');
  chatBob.syncWith(chatAlice);
  chatBob.addReaction(msg1.id, '🚀', 'bob');
  chatBob.postMessage('Looks fantastic, creating v1.0 checkpoint!');
  chatAlice.syncWith(chatBob);
  steps.push({
    step: '4. Team Chat & Reactions',
    details: `Messages: ${chatAlice.getMessages().length}, Reactions: ${JSON.stringify(
      chatAlice.getMessages()[0].reactions,
    )}`,
  });

  // 5. Checkpoint v1.0 into Git Commit
  const commitV1 = repo.checkpointSession(
    sessionAlice,
    authorAlice,
    'feat: release v1.0 whitepaper & chat',
  );
  steps.push({
    step: '5. Git Checkpoint Commit v1.0',
    details: `Commit ID: ${commitV1.id}, Tree: ${commitV1.treeId}`,
  });

  // 6. Branching in Git (feature-model-eval)
  repo.createBranch('feature-model-eval', commitV1.id);
  repo.checkout('feature-model-eval');
  const sessionEval = repo.createSessionFromCommit({
    commitId: commitV1.id,
    peerId: 'bob',
    branchName: 'feature-model-eval',
  });
  const docEval = new CollaborativeDocument(sessionEval);
  docEval.setMetadata('model_benchmark', 'MMLU: 92.4%');
  const commitEval = repo.checkpointSession(
    sessionEval,
    authorBob,
    'feat: add benchmark metrics',
  );
  steps.push({
    step: '6. Feature Branch Checkpoint',
    details: `Branch 'feature-model-eval' commit: ${commitEval.id}`,
  });

  // 7. Main Branch Parallel Edit
  repo.checkout('main');
  const sessionMain = repo.createSessionFromCommit({
    commitId: commitV1.id,
    peerId: 'alice',
    branchName: 'main',
  });
  const docMain = new CollaborativeDocument(sessionMain);
  docMain.setMetadata('status', 'Camera Ready');
  const commitMain = repo.checkpointSession(
    sessionMain,
    authorAlice,
    'feat: update publication status',
  );
  steps.push({
    step: '7. Main Branch Checkpoint',
    details: `Branch 'main' commit: ${commitMain.id}`,
  });

  // 8. 3-Way CRDT Branch Merge
  const mergeResult = repo.mergeBranches({
    targetBranch: 'main',
    sourceBranch: 'feature-model-eval',
    author: authorAlice,
    message: 'Merge feature-model-eval into main with zero conflicts',
  });
  steps.push({
    step: '8. 3-Way CRDT Branch Merge',
    details: `Merge Commit: ${mergeResult.commit?.id}, Parents: ${JSON.stringify(
      (mergeResult.commit as any)?.parentIds,
    )}`,
    state: mergeResult.mergedState,
  });

  // 9. Persist to Disk & Reload
  await store.saveRepository(repo);
  const reloadedRepo = await store.loadRepository();
  steps.push({
    step: '9. Persistent Disk Storage Verified',
    details: `Successfully saved and reloaded repository '${reloadedRepo.name}' from disk with ${reloadedRepo.objectCount} objects`,
  });

  return steps;
}
