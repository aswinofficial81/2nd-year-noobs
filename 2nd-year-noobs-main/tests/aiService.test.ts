import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  AIService,
  cosineSimilarity,
  generateDeterministicEmbedding,
} from '../src/server/aiService.js';

describe('Phase 18: Semantic RAG & AI Ingestion Pipeline', () => {
  it('should compute valid cosine similarity between 768-dim embeddings', () => {
    const vecA = generateDeterministicEmbedding('Distributed vector clocks and CRDTs');
    const vecB = generateDeterministicEmbedding('Distributed vector clocks and CRDTs');
    const vecC = generateDeterministicEmbedding('Completely unrelated astronomical telescope recipe');

    assert.strictEqual(vecA.length, 768);
    assert.strictEqual(vecB.length, 768);

    const simSelf = cosineSimilarity(vecA, vecB);
    const simDiff = cosineSimilarity(vecA, vecC);

    assert.ok(Math.abs(simSelf - 1.0) < 0.001, 'Identical texts should have similarity ~1.0');
    assert.ok(simDiff < simSelf, 'Different texts should have lower similarity than identical texts');
  });

  it('should ingest, chunk, and index research documents', async () => {
    const service = new AIService();
    const artifact = service.indexArtifact({
      id: 'test-crdt-spec',
      type: 'doc',
      title: 'CRDT Operation Sync Specification',
      raw_content: 'CRDT sessions synchronize operations between replicas using causal vector clocks.\n\nEvery operation carries peer ID and sequence counter to ensure deterministic ordering.',
      summary_line: 'Specifications on peer synchronization and causal ordering.',
      topics: ['crdt', 'synchronize', 'vector clocks', 'peer'],
      chunks: [
        'CRDT sessions synchronize operations between replicas using causal vector clocks.',
        'Every operation carries peer ID and sequence counter to ensure deterministic ordering.',
      ],
      created_at: Date.now(),
    });

    assert.strictEqual(artifact.id, 'test-crdt-spec');
    assert.strictEqual(service.getAllArtifacts().some(a => a.id === 'test-crdt-spec'), true);
  });

  it('should extract topics from text correctly', () => {
    const service = new AIService();
    const topics = service.extractTopics('CRDT vector clocks allow deterministic synchronization and conflict resolution across replicas.');
    assert.ok(topics.length > 0);
    assert.ok(topics.includes('crdt') || topics.includes('vector') || topics.includes('replicas'));
  });

  it('should retrieve relevant context chunks for arbitrary queries', async () => {
    const service = new AIService();
    // Mock callGeminiGeneration for fast, deterministic unit testing
    (service as any).callGeminiGeneration = async () => ({
      text: 'CRDT sessions synchronize operations between replicas using causal vector clocks [Git + CRDT Hybrid Architecture Specification].',
      model: 'gemini-3.6-flash',
    });

    const result = await service.searchAndSynthesize('How does the CRDT session synchronize operations between peers?');

    assert.strictEqual(result.query, 'How does the CRDT session synchronize operations between peers?');
    assert.ok(result.answer.length > 0, 'Answer must not be empty');
    assert.ok(result.context_used.length > 0, 'Must retrieve relevant context chunks');
    assert.ok(result.context_used.some(c => c.content.toLowerCase().includes('crdt') || c.content.toLowerCase().includes('peer')));
    assert.ok(result.latency_ms >= 0);
  });

  it('should retrieve relevant context chunks for concurrent edits question', async () => {
    const service = new AIService();
    (service as any).callGeminiGeneration = async () => ({
      text: 'Deterministic peer IDs break ties whenever Lamport counters are identical [AI Research Team Collaboration Log].',
      model: 'gemini-3.6-flash',
    });

    const result = await service.searchAndSynthesize('What happens when two peers make concurrent edits?');

    assert.strictEqual(result.query, 'What happens when two peers make concurrent edits?');
    assert.ok(result.answer.length > 0);
    assert.ok(result.context_used.length > 0);
    assert.ok(result.context_used.some(c => c.content.toLowerCase().includes('vector') || c.content.toLowerCase().includes('concurrent') || c.content.toLowerCase().includes('tie-breaker')));
  });
});
