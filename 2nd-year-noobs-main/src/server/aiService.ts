import * as dotenv from 'dotenv';
dotenv.config();

export interface IngestedArtifact {
  id: string;
  type: 'doc' | 'chat' | 'pdf';
  title: string;
  raw_content: string;
  summary_line: string;
  topics: string[];
  chunks: string[];
  normalized_messages?: Array<{ role: string; content: string; timestamp?: number }>;
  created_at: number;
}

export interface SearchResult {
  query: string;
  answer: string;
  context_used: Array<{
    title: string;
    artifactId: string;
    content: string;
    type: 'vector' | 'topic';
    score: number;
  }>;
  topics_matched: string[];
  latency_ms: number;
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

/**
 * Computes cosine similarity between two numeric vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generates simple pseudo-embedding vector (768-dim deterministic bag-of-words / character hash)
 * when Gemini API key is missing or rate limited.
 */
export function generateDeterministicEmbedding(text: string, dims = 768): number[] {
  const vec = new Array(dims).fill(0);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let j = 0; j < word.length; j++) {
      hash = (hash << 5) - hash + word.charCodeAt(j);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dims;
    vec[idx] += 1;
    const secondaryIdx = Math.abs(hash * 31 + i) % dims;
    vec[secondaryIdx] += 0.5;
  }

  // Normalize
  let norm = 0;
  for (let i = 0; i < dims; i++) norm += vec[i] * vec[i];
  if (norm > 0) {
    const sqrtNorm = Math.sqrt(norm);
    for (let i = 0; i < dims; i++) vec[i] /= sqrtNorm;
  }
  return vec;
}

export class AIService {
  private artifacts: Map<string, IngestedArtifact> = new Map();
  private chunkEmbeddings: Map<string, { embedding: number[]; artifactId: string; text: string }> = new Map();

  constructor() {
    this.seedDefaultArtifacts();
  }

  private seedDefaultArtifacts() {
    const defaultDoc: IngestedArtifact = {
      id: 'art-git-crdt-arch',
      type: 'doc',
      title: 'Git + CRDT Hybrid Architecture Specification',
      raw_content: `# Git + CRDT Hybrid Architecture
This project bridges the gap between asynchronous version control and real-time collaborative editing:
1. Live Collaboration Layer (CRDT): High-speed, in-memory peer-to-peer document and chat state synchronization powered by Vector Clocks and Deterministic Conflict Resolution.
2. Version Control Layer (Git): Content-addressable SHA-256 object store (Blob, Tree, Commit, Branch, HEAD) providing full immutable history, commit DAGs, and branch navigation.
3. Semantic 3-Way CRDT Merge Engine: Branch merges calculate the Nearest Common Ancestor (NCA) and merge diverged states with zero merge conflicts and proven mathematical convergence.`,
      summary_line: 'Comprehensive architectural overview of Git immutability combined with real-time CRDT multi-peer synchronization.',
      topics: ['crdt', 'git', 'version control', 'vector clocks', '3-way merge'],
      chunks: [
        'This project bridges the gap between asynchronous version control and real-time collaborative editing.',
        '1. Live Collaboration Layer (CRDT): High-speed, in-memory peer-to-peer document and chat state synchronization powered by Vector Clocks and Deterministic Conflict Resolution.',
        '2. Version Control Layer (Git): Content-addressable SHA-256 object store (Blob, Tree, Commit, Branch, HEAD) providing full immutable history, commit DAGs, and branch navigation.',
        '3. Semantic 3-Way CRDT Merge Engine: Branch merges calculate the Nearest Common Ancestor (NCA) and merge diverged states with zero merge conflicts and proven mathematical convergence.'
      ],
      created_at: Date.now() - 3600000,
    };

    const defaultChat: IngestedArtifact = {
      id: 'art-research-chat-v1',
      type: 'chat',
      title: 'AI Research Team Collaboration Log',
      raw_content: `Alice: Have we tested the Vector Clock tie-breaker during concurrent edits?
Bob: Yes, deterministic peer IDs break ties whenever Lamport counters are identical.
Carol: Branch merging with NCA also verified. Zero conflicts across 118 test cases.`,
      summary_line: 'Discussion confirming vector clock tie-breaking and zero-conflict NCA branch merging.',
      topics: ['vector clocks', 'concurrency', 'tie-breaker', 'branch merge', 'nca'],
      chunks: [
        'Alice: Have we tested the Vector Clock tie-breaker during concurrent edits?\nBob: Yes, deterministic peer IDs break ties whenever Lamport counters are identical.',
        'Carol: Branch merging with NCA also verified. Zero conflicts across 118 test cases.'
      ],
      normalized_messages: [
        { role: 'user', content: 'Have we tested the Vector Clock tie-breaker during concurrent edits?' },
        { role: 'assistant', content: 'Yes, deterministic peer IDs break ties whenever Lamport counters are identical.' },
        { role: 'user', content: 'Branch merging with NCA also verified. Zero conflicts across 118 test cases.' }
      ],
      created_at: Date.now() - 1800000,
    };

    this.indexArtifact(defaultDoc);
    this.indexArtifact(defaultChat);
  }

  public getAllArtifacts(): IngestedArtifact[] {
    return Array.from(this.artifacts.values()).sort((a, b) => b.created_at - a.created_at);
  }

  public getArtifact(id: string): IngestedArtifact | undefined {
    return this.artifacts.get(id);
  }

  public indexArtifact(artifact: IngestedArtifact): IngestedArtifact {
    this.artifacts.set(artifact.id, artifact);

    // Index chunks with embeddings
    artifact.chunks.forEach((chunkText, idx) => {
      const chunkKey = `${artifact.id}_chunk_${idx}`;
      const emb = generateDeterministicEmbedding(chunkText);
      this.chunkEmbeddings.set(chunkKey, {
        embedding: emb,
        artifactId: artifact.id,
        text: chunkText,
      });
    });

    return artifact;
  }

  public chunkText(text: string, maxParagraphs = 2): string[] {
    const paragraphs = text
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (paragraphs.length === 0) return [text.trim()];

    const chunks: string[] = [];
    for (let i = 0; i < paragraphs.length; i += maxParagraphs) {
      chunks.push(paragraphs.slice(i, i + maxParagraphs).join('\n\n'));
    }
    return chunks;
  }

  public extractTopics(text: string): string[] {
    const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    const stopWords = new Set([
      'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'are', 'was',
      'were', 'will', 'been', 'each', 'they', 'what', 'which', 'when', 'some',
      'into', 'then', 'also', 'over', 'such', 'only', 'more', 'other', 'after'
    ]);

    const freq: Record<string, number> = {};
    for (const w of words) {
      if (!stopWords.has(w)) {
        freq[w] = (freq[w] || 0) + 1;
      }
    }

    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  public async generateSummary(text: string): Promise<string> {
    if (!text.trim()) return '';
    if (GEMINI_API_KEY) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: `Summarize the following research text concisely in 1-2 sentences:\n\n${text.slice(0, 3000)}` }]
              }]
            })
          }
        );
        const data = await response.json() as any;
        const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (summary) return summary.trim();
      } catch (err) {
        console.warn('Gemini summary call failed, falling back:', err);
      }
    }
    // Fallback: first 2 non-empty sentences
    const sentences = text.replace(/\n+/g, ' ').split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
    return sentences.slice(0, 2).join('. ') + (sentences.length ? '.' : '');
  }

  public async searchAndSynthesize(query: string): Promise<SearchResult> {
    const startTime = Date.now();
    const queryEmb = generateDeterministicEmbedding(query);
    const queryTopics = this.extractTopics(query);

    // Tier 1: Vector Similarity search over chunks
    const chunkScores: Array<{
      artifactId: string;
      content: string;
      score: number;
    }> = [];

    for (const [, item] of this.chunkEmbeddings.entries()) {
      const sim = cosineSimilarity(queryEmb, item.embedding);
      chunkScores.push({
        artifactId: item.artifactId,
        content: item.text,
        score: sim,
      });
    }

    chunkScores.sort((a, b) => b.score - a.score);
    const topChunks = chunkScores.slice(0, 5);

    // Tier 2: Topic matching over artifacts
    const topicMatches: Array<{
      artifactId: string;
      content: string;
      score: number;
    }> = [];

    const matchedTopicsSet = new Set<string>();

    for (const art of this.artifacts.values()) {
      const artTopics = art.topics || [];
      const common = queryTopics.filter(t => artTopics.includes(t) || art.title.toLowerCase().includes(t));
      if (common.length > 0) {
        common.forEach(t => matchedTopicsSet.add(t));
        topicMatches.push({
          artifactId: art.id,
          content: `[Topic Match: ${common.join(', ')}] ${art.summary_line || art.title}`,
          score: common.length * 0.35,
        });
      }
    }

    const contextUsed: SearchResult['context_used'] = [];

    topChunks.forEach(c => {
      const art = this.artifacts.get(c.artifactId);
      contextUsed.push({
        title: art?.title || 'Unknown Artifact',
        artifactId: c.artifactId,
        content: c.content,
        type: 'vector',
        score: Math.round(c.score * 100) / 100,
      });
    });

    topicMatches.slice(0, 3).forEach(t => {
      const art = this.artifacts.get(t.artifactId);
      contextUsed.push({
        title: art?.title || 'Topic Result',
        artifactId: t.artifactId,
        content: t.content,
        type: 'topic',
        score: Math.round(t.score * 100) / 100,
      });
    });

    // Synthesize Answer with Gemini or Local Synthesis
    let answer = '';
    const contextString = contextUsed.map(c => `[Source: ${c.title}]\n${c.content}`).join('\n\n---\n\n');

    if (GEMINI_API_KEY) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `You are a research assistant answering questions based on the provided collaborative repository documents and chat logs.
Answer the question accurately using ONLY the provided context. If not mentioned, state what is known from context.
Include source citations in brackets where applicable (e.g. [Git + CRDT Hybrid Architecture Specification]).

Context:
${contextString || 'No direct context found.'}

Question:
${query}`
                }]
              }]
            })
          }
        );
        const data = await response.json() as any;
        const resText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (resText) answer = resText.trim();
      } catch (err) {
        console.warn('Gemini RAG synthesis failed, using local synthesizer:', err);
      }
    }

    if (!answer) {
      if (contextUsed.length > 0) {
        answer = `Based on our ingested repository knowledge base and collaborative logs:\n\n` +
          contextUsed.slice(0, 3).map(c => `• ${c.content.replace(/\n+/g, ' ')} (Source: "${c.title}")`).join('\n\n') +
          `\n\nAll operations and documents are causally tracked via Vector Clocks and checkpointed to Git trees.`;
      } else {
        answer = `I could not find directly relevant context for "${query}" in the currently indexed artifacts. You can ingest more Markdown files, PDFs, or ChatGPT/Claude exports to expand the research corpus.`;
      }
    }

    return {
      query,
      answer,
      context_used: contextUsed,
      topics_matched: Array.from(matchedTopicsSet),
      latency_ms: Date.now() - startTime,
    };
  }
}

export const aiService = new AIService();
