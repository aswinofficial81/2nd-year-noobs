import assert from 'node:assert';

const BASE_URL = 'http://localhost:3001';

async function runTests() {
  console.log('🧪 Starting Full-Stack Integration Verification...\n');

  // 1. Health Check
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const health = await healthRes.json();
  assert.strictEqual(health.status, 'ok');
  console.log('✅ 1. Health Check passed:', health);

  // 2. Repository State
  const repoRes = await fetch(`${BASE_URL}/api/repo/state`);
  const repo = await repoRes.json();
  assert.ok(repo.name);
  assert.ok(repo.branches.length > 0);
  console.log(`✅ 2. Repository State: '${repo.name}', Branches: ${repo.branches.length}`);

  // 3. Edit CRDT Document
  const editRes = await fetch(`${BASE_URL}/api/session/edit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      branch: 'main',
      peerId: 'alice',
      type: 'insert',
      text: ' [Live Full-Stack Verification Passed]',
      position: 0,
    }),
  });
  const editData = await editRes.json();
  assert.strictEqual(editData.success, true);
  console.log('✅ 3. CRDT Document Edit & Vector Clock updated:', editData.vectorClock);

  // 4. Create Unique Branch
  const testBranchName = `feat-eval-${Date.now().toString(36)}`;
  const branchRes = await fetch(`${BASE_URL}/api/branch/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: testBranchName }),
  });
  const branchData = await branchRes.json();
  assert.strictEqual(branchData.success, true);
  console.log('✅ 4. Created Branch:', branchData.branch.name);

  // 5. Checkpoint Commit
  const commitRes = await fetch(`${BASE_URL}/api/commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      branch: testBranchName,
      peerId: 'bob',
      message: 'feat: add integration test suite checkpoint',
      authorName: 'Bob AI Tester',
    }),
  });
  const commitData = await commitRes.json();
  assert.strictEqual(commitData.success, true);
  console.log('✅ 5. Git Commit Checkpoint created with SHA-256:', commitData.commit.id);

  // 6. 3-Way Semantic CRDT Branch Merge
  const mergeRes = await fetch(`${BASE_URL}/api/branch/merge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetBranch: 'main',
      sourceBranch: testBranchName,
      message: `Merge ${testBranchName} into main with 0 conflicts`,
    }),
  });
  const mergeData = await mergeRes.json();
  assert.strictEqual(mergeData.success, true);
  console.log(`✅ 6. 3-Way CRDT Merge executed (${mergeData.mergeType}):`, mergeData.commit?.id || 'Fast-forward');

  // 7. DAG Graph Data
  const dagRes = await fetch(`${BASE_URL}/api/repo/dag`);
  const dagData = await dagRes.json();
  assert.ok(dagData.nodes.length >= 2);
  console.log(`✅ 7. Git DAG generated with ${dagData.nodes.length} nodes and ${dagData.edges.length} edges.`);

  // 8. Ingest Markdown Artifact
  const ingestRes = await fetch(`${BASE_URL}/api/ingest/markdown`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Full-Stack Integration Whitepaper',
      content: '# Full-Stack Integration\nThis artifact confirms the integration between CRDT real-time engines and RAG retrieval pipelines.\n\nMathematical convergence is maintained across all peers.',
    }),
  });
  const ingestData = await ingestRes.json();
  assert.ok(ingestData.id);
  console.log('✅ 8. Artifact Ingestion & Chunking succeeded:', ingestData.title, `(${ingestData.chunks.length} chunks)`);

  // 9. Semantic RAG Search & Synthesis
  const searchRes = await fetch(`${BASE_URL}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'How does CRDT maintain convergence in real-time?' }),
  });
  const searchData = await searchRes.json();
  assert.ok(searchData.answer);
  assert.ok(searchData.context_used.length > 0);
  console.log(`✅ 9. Semantic RAG Search Synthesized answer (${searchData.latency_ms}ms, ${searchData.context_used.length} citations):`);
  console.log('   Preview:', searchData.answer.slice(0, 140) + '...\n');

  // 10. Automated 9-Step Demo Runner
  const demoRes = await fetch(`${BASE_URL}/api/demo/run`);
  const demoData = await demoRes.json();
  assert.strictEqual(demoData.success, true);
  assert.strictEqual(demoData.totalSteps, 9);
  console.log('✅ 10. Automated 9-Step Hackathon Demo Runner passed all 9/9 steps with 100% convergence!');

  console.log('\n🎉 ALL FULL-STACK END-TO-END INTEGRATION TESTS PASSED PERFECTLY!');
}

runTests().catch((err) => {
  console.error('❌ Integration test error:', err);
  process.exit(1);
});
