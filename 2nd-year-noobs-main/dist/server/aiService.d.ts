export interface IngestedArtifact {
    id: string;
    type: 'doc' | 'chat' | 'pdf';
    title: string;
    raw_content: string;
    summary_line: string;
    topics: string[];
    chunks: string[];
    normalized_messages?: Array<{
        role: string;
        content: string;
        timestamp?: number;
    }>;
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
/**
 * Computes cosine similarity between two numeric vectors.
 */
export declare function cosineSimilarity(vecA: number[], vecB: number[]): number;
/**
 * Generates simple pseudo-embedding vector (768-dim deterministic bag-of-words / character hash)
 * when Gemini API key is missing or rate limited.
 */
export declare function generateDeterministicEmbedding(text: string, dims?: number): number[];
export declare class AIService {
    private artifacts;
    private chunkEmbeddings;
    constructor();
    private seedDefaultArtifacts;
    getAllArtifacts(): IngestedArtifact[];
    getArtifact(id: string): IngestedArtifact | undefined;
    indexArtifact(artifact: IngestedArtifact): IngestedArtifact;
    chunkText(text: string, maxParagraphs?: number): string[];
    extractTopics(text: string): string[];
    generateSummary(text: string): Promise<string>;
    searchAndSynthesize(query: string): Promise<SearchResult>;
}
export declare const aiService: AIService;
