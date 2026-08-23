import * as dotenv from 'dotenv';
dotenv.config();

export interface ArtifactChunk {
  id: string;
  artifactId: string;
  pageNumber?: number;
  text: string;
}

export interface IngestedArtifact {
  id: string;
  type: 'doc' | 'chat' | 'pdf';
  title: string;
  raw_content: string;
  summary_line: string;
  topics: string[];
  chunks: string[];
  structured_chunks?: ArtifactChunk[];
  pages_count?: number;
  requires_ocr?: boolean;
  normalized_messages?: Array<{ role: string; content: string; timestamp?: number }>;
  created_at: number;
}

export interface SearchResult {
  query: string;
  answer: string;
  model: string;
  gemini_configured: boolean;
  context_used: Array<{
    title: string;
    artifactId: string;
    chunkId?: string;
    pageNumber?: number;
    content: string;
    type: 'vector' | 'topic';
    score: number;
  }>;
  topics_matched: string[];
  latency_ms: number;
}

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
 * Generates deterministic 768-dimensional token-hashed normalized embedding vector.
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

  // Normalize to unit length for cosine similarity
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
  private chunkEmbeddings: Map<string, {
    embedding: number[];
    artifactId: string;
    chunkId: string;
    pageNumber?: number;
    text: string;
  }> = new Map();

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
3. Semantic 3-Way CRDT Merge Engine: Branch merges calculate the Nearest Common Ancestor (NCA) and merge diverged states with deterministic reconciliation and explicit conflict detection.`,
      summary_line: 'Comprehensive architectural overview of Git immutability combined with real-time CRDT multi-peer synchronization.',
      topics: ['crdt', 'git', 'version control', 'vector clocks', '3-way merge', 'nca'],
      chunks: [
        'This project bridges the gap between asynchronous version control and real-time collaborative editing.',
        '1. Live Collaboration Layer (CRDT): High-speed, in-memory peer-to-peer document and chat state synchronization powered by Vector Clocks and Deterministic Conflict Resolution.',
        '2. Version Control Layer (Git): Content-addressable SHA-256 object store (Blob, Tree, Commit, Branch, HEAD) providing full immutable history, commit DAGs, and branch navigation.',
        '3. Semantic 3-Way CRDT Merge Engine: Branch merges calculate the Nearest Common Ancestor (NCA) and merge diverged states with deterministic reconciliation and explicit conflict detection.'
      ],
      created_at: Date.now() - 3600000,
    };

    const defaultChat: IngestedArtifact = {
      id: 'art-research-chat-v1',
      type: 'chat',
      title: 'AI Research Team Collaboration Log',
      raw_content: `Researcher A: Have we tested the Vector Clock tie-breaker during concurrent edits?
Researcher B: Yes, deterministic peer IDs break ties whenever Lamport counters are identical.
Researcher C: Branch merging with NCA also verified with deterministic reconciliation across concurrent operations.`,
      summary_line: 'Discussion confirming vector clock tie-breaking and deterministic NCA branch merging.',
      topics: ['vector clocks', 'concurrency', 'tie-breaker', 'branch merge', 'nca'],
      chunks: [
        'Researcher A: Have we tested the Vector Clock tie-breaker during concurrent edits?\nResearcher B: Yes, deterministic peer IDs break ties whenever Lamport counters are identical.',
        'Researcher C: Branch merging with NCA also verified with deterministic reconciliation across concurrent operations.'
      ],
      normalized_messages: [
        { role: 'user', content: 'Have we tested the Vector Clock tie-breaker during concurrent edits?' },
        { role: 'assistant', content: 'Yes, deterministic peer IDs break ties whenever Lamport counters are identical.' },
        { role: 'user', content: 'Branch merging with NCA also verified with deterministic reconciliation across concurrent operations.' }
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

    // Index structured chunks if provided (e.g., from PDF with page numbers)
    if (artifact.structured_chunks && artifact.structured_chunks.length > 0) {
      artifact.structured_chunks.forEach((chunk) => {
        const emb = generateDeterministicEmbedding(chunk.text);
        this.chunkEmbeddings.set(chunk.id, {
          embedding: emb,
          artifactId: artifact.id,
          chunkId: chunk.id,
          pageNumber: chunk.pageNumber,
          text: chunk.text,
        });
      });
    } else {
      // Index standard chunks
      artifact.chunks.forEach((chunkText, idx) => {
        const chunkKey = `${artifact.id}_chunk_${idx}`;
        const emb = generateDeterministicEmbedding(chunkText);
        this.chunkEmbeddings.set(chunkKey, {
          embedding: emb,
          artifactId: artifact.id,
          chunkId: chunkKey,
          text: chunkText,
        });
      });
    }

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
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const models = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-flash-latest', 'gemini-3.1-pro-preview'];
        for (const model of models) {
          try {
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
            if (response.ok) {
              const data = await response.json() as any;
              const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (summary && summary.trim()) return summary.trim();
            }
          } catch {
            // try next model
          }
        }
      } catch (err) {
        console.warn('[AI Service] Gemini summary generation failed, falling back:', err);
      }
    }
    // Fallback: first 2 non-empty sentences
    const sentences = text.replace(/\n+/g, ' ').split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
    return sentences.slice(0, 2).join('. ') + (sentences.length ? '.' : '');
  }

  private async callGeminiGeneration(prompt: string, apiKey: string): Promise<{ text: string; model: string }> {
    const models = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-flash-latest', 'gemini-3.1-pro-preview'];
    let lastError: any = null;

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: prompt }]
              }],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 1024,
              }
            })
          }
        );

        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`HTTP ${response.status} (${model}): ${errBody}`);
        }

        const data = (await response.json()) as any;
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) {
          return { text: text.trim(), model };
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini RAG] Attempt with ${model} failed, trying next fallback:`, err.message);
      }
    }

    throw lastError || new Error('Gemini API returned empty response');
  }

  public async searchAndSynthesize(query: string): Promise<SearchResult> {
    const startTime = Date.now();
    const queryEmb = generateDeterministicEmbedding(query);
    const queryTopics = this.extractTopics(query);

    // Tier 1: Vector Similarity search over chunks
    const chunkScores: Array<{
      artifactId: string;
      chunkId: string;
      pageNumber?: number;
      content: string;
      score: number;
    }> = [];

    for (const [, item] of this.chunkEmbeddings.entries()) {
      const sim = cosineSimilarity(queryEmb, item.embedding);
      if (sim > 0.05) {
        chunkScores.push({
          artifactId: item.artifactId,
          chunkId: item.chunkId,
          pageNumber: item.pageNumber,
          content: item.text,
          score: sim,
        });
      }
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
          score: Math.min(0.9, common.length * 0.3),
        });
      }
    }

    const contextUsed: SearchResult['context_used'] = [];

    topChunks.forEach(c => {
      const art = this.artifacts.get(c.artifactId);
      contextUsed.push({
        title: art?.title || 'Unknown Artifact',
        artifactId: c.artifactId,
        chunkId: c.chunkId,
        pageNumber: c.pageNumber,
        content: c.content,
        type: 'vector',
        score: Math.round(c.score * 100) / 100,
      });
    });

    topicMatches.slice(0, 3).forEach(t => {
      // Avoid duplicate artifact representation if already in top chunks
      if (!contextUsed.some(c => c.artifactId === t.artifactId)) {
        const art = this.artifacts.get(t.artifactId);
        contextUsed.push({
          title: art?.title || 'Topic Result',
          artifactId: t.artifactId,
          content: t.content,
          type: 'topic',
          score: Math.round(t.score * 100) / 100,
        });
      }
    });

    const apiKey = process.env.GEMINI_API_KEY;
    let answer = '';
    let modelName = 'local-retrieval';
    let geminiConfigured = false;

    const contextString = contextUsed
      .map(c => {
        const pageLabel = c.pageNumber ? ` • Page ${c.pageNumber}` : '';
        return `[Source: ${c.title}${pageLabel}] (Similarity Score: ${c.score})\n${c.content}`;
      })
      .join('\n\n---\n\n');

    if (apiKey) {
      try {
        const prompt = `You are an expert AI research assistant analyzing collaborative version control documents, CRDT specifications, and engineering discussions.
Answer the user's question accurately using ONLY the provided retrieved context.
If the answer is only partially addressed, state what is known from context and what remains unspecified.
Always cite the source document titles in brackets (e.g. [Git + CRDT Hybrid Architecture Specification]) when drawing facts.

Retrieved Context:
${contextString || 'No direct matching context found.'}

User Question:
${query}`;

        const result = await this.callGeminiGeneration(prompt, apiKey);
        answer = result.text;
        modelName = result.model;
        geminiConfigured = true;
      } catch (err: any) {
        console.warn('[RAG] Gemini call failed, returning grounded local retrieval with error status:', err.message);
      }
    }

    if (!answer) {
      if (!apiKey) {
        if (contextUsed.length > 0) {
          answer = `⚠️ GEMINI_API_KEY is not configured in the backend environment (.env). To enable live Gemini Pro neural synthesis, add your API key to .env.\n\nRetrieved Grounded Sources (${contextUsed.length} matching excerpts):\n\n` +
            contextUsed.map(c => `• [${c.title}] (Score: ${c.score})\n  ${c.content.replace(/\n+/g, ' ')}`).join('\n\n');
        } else {
          answer = `⚠️ GEMINI_API_KEY is not configured in the backend environment (.env).\n\nNo matching excerpts were found in the current indexed artifacts for "${query}". Upload research documents, PDFs, or chat transcripts in the Ingestion tab to expand the knowledge base.`;
        }
      } else {
        if (contextUsed.length > 0) {
          answer = `Based on retrieved repository artifacts:\n\n` +
            contextUsed.map(c => `• ${c.content.replace(/\n+/g, ' ')} (Source: [${c.title}])`).join('\n\n');
        } else {
          answer = `I could not find matching context for "${query}" in the currently indexed artifacts. You can ingest more Markdown files, PDFs, or chat exports in the Ingestion Hub.`;
        }
      }
    }

    return {
      query,
      answer,
      model: modelName,
      gemini_configured: geminiConfigured,
      context_used: contextUsed,
      topics_matched: Array.from(matchedTopicsSet),
      latency_ms: Date.now() - startTime,
    };
  }
}

export const aiService = new AIService();
