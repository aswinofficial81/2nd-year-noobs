/**
 * Semantic Diff Engine for Research Prose, Code & Versioned Artifacts
 * Generates human-readable semantic explanations and metric changes between versions.
 */
export interface MetricChange {
    metricName?: string;
    fromValue: string;
    toValue: string;
    description: string;
}
export interface SemanticChangeItem {
    type: 'addition' | 'deletion' | 'modification' | 'metric';
    category: 'title' | 'prose' | 'metadata' | 'structure';
    oldText?: string;
    newText?: string;
    summary: string;
}
export interface SemanticDiffResult {
    summary: string;
    stats: {
        wordsAdded: number;
        wordsRemoved: number;
        paragraphsAdded: number;
        paragraphsRemoved: number;
        totalChanges: number;
    };
    changes: SemanticChangeItem[];
    metricChanges: MetricChange[];
}
/**
 * Computes a human-readable semantic diff between two versions of text or document states.
 */
export declare function computeSemanticDiff(oldDoc: {
    title?: string;
    text?: string;
    metadata?: Record<string, unknown>;
} | string, newDoc: {
    title?: string;
    text?: string;
    metadata?: Record<string, unknown>;
} | string): SemanticDiffResult;
