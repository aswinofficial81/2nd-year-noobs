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
 * Splits text into sentences cleanly.
 */
function splitSentences(text: string): string[] {
  if (!text) return [];
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Splits text into non-empty paragraphs.
 */
function splitParagraphs(text: string): string[] {
  if (!text) return [];
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Jaccard word similarity between two sentences.
 */
function wordSimilarity(s1: string, s2: string): number {
  const words1 = new Set(s1.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean));
  const words2 = new Set(s2.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean));
  if (words1.size === 0 && words2.size === 0) return 1;
  if (words1.size === 0 || words2.size === 0) return 0;

  let intersection = 0;
  for (const w of words1) {
    if (words2.has(w)) intersection++;
  }
  const union = new Set([...words1, ...words2]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Extracts percentage / numeric metrics from text and compares them.
 */
function detectMetricChanges(oldSentence: string, newSentence: string): MetricChange[] {
  const metricRegex = /(\b\w+[\w\s]{0,15}?)?\s*(\d+(?:\.\d+)?%|\d+(?:\.\d+)?\s*(?:ms|kb|mb|gb|fps|x|params|tokens|epochs|loss|accuracy|score|f1|bleu|rouge)?\b)/gi;

  const oldMatches = Array.from(oldSentence.matchAll(metricRegex));
  const newMatches = Array.from(newSentence.matchAll(metricRegex));

  const changes: MetricChange[] = [];

  for (let i = 0; i < Math.min(oldMatches.length, newMatches.length); i++) {
    const oldVal = oldMatches[i][2]?.trim();
    const newVal = newMatches[i][2]?.trim();
    const context = newMatches[i][1]?.trim() || oldMatches[i][1]?.trim() || 'Metric';

    if (oldVal && newVal && oldVal !== newVal) {
      // Calculate delta if both are numbers or percentages
      const numOld = parseFloat(oldVal);
      const numNew = parseFloat(newVal);
      let deltaStr = '';
      if (!isNaN(numOld) && !isNaN(numNew)) {
        const diff = Math.round((numNew - numOld) * 100) / 100;
        const sign = diff > 0 ? `+${diff}` : `${diff}`;
        deltaStr = ` (${sign}${oldVal.includes('%') ? ' pp' : ''})`;
      }

      changes.push({
        metricName: context,
        fromValue: oldVal,
        toValue: newVal,
        description: `${context} changed from ${oldVal} to ${newVal}${deltaStr}`,
      });
    }
  }

  return changes;
}

/**
 * Computes a human-readable semantic diff between two versions of text or document states.
 */
export function computeSemanticDiff(
  oldDoc: { title?: string; text?: string; metadata?: Record<string, unknown> } | string,
  newDoc: { title?: string; text?: string; metadata?: Record<string, unknown> } | string
): SemanticDiffResult {
  const oldText = typeof oldDoc === 'string' ? oldDoc : oldDoc?.text || '';
  const newText = typeof newDoc === 'string' ? newDoc : newDoc?.text || '';
  const oldTitle = typeof oldDoc === 'object' ? oldDoc?.title : undefined;
  const newTitle = typeof newDoc === 'object' ? newDoc?.title : undefined;
  const oldMeta = typeof oldDoc === 'object' ? oldDoc?.metadata || {} : {};
  const newMeta = typeof newDoc === 'object' ? newDoc?.metadata || {} : {};

  const changes: SemanticChangeItem[] = [];
  const metricChanges: MetricChange[] = [];

  // 1. Title Change
  if (oldTitle !== undefined && newTitle !== undefined && oldTitle !== newTitle) {
    changes.push({
      type: 'modification',
      category: 'title',
      oldText: oldTitle,
      newText: newTitle,
      summary: `Title renamed from "${oldTitle}" to "${newTitle}"`,
    });
  }

  // 2. Metadata Changes
  const allMetaKeys = new Set([...Object.keys(oldMeta), ...Object.keys(newMeta)]);
  for (const k of allMetaKeys) {
    const vOld = oldMeta[k];
    const vNew = newMeta[k];
    if (vOld === undefined && vNew !== undefined) {
      changes.push({
        type: 'addition',
        category: 'metadata',
        newText: `${k}: ${String(vNew)}`,
        summary: `Added metadata tag [${k} = ${String(vNew)}]`,
      });
    } else if (vOld !== undefined && vNew === undefined) {
      changes.push({
        type: 'deletion',
        category: 'metadata',
        oldText: `${k}: ${String(vOld)}`,
        summary: `Removed metadata tag [${k}]`,
      });
    } else if (JSON.stringify(vOld) !== JSON.stringify(vNew)) {
      changes.push({
        type: 'modification',
        category: 'metadata',
        oldText: `${k}: ${String(vOld)}`,
        newText: `${k}: ${String(vNew)}`,
        summary: `Updated metadata [${k}] from "${String(vOld)}" to "${String(vNew)}"`,
      });
    }
  }

  // 3. Prose Sentences Diff
  const oldSentences = splitSentences(oldText);
  const newSentences = splitSentences(newText);

  const matchedNewIndices = new Set<number>();
  const matchedOldIndices = new Set<number>();

  // Detect exact matches & modifications
  for (let i = 0; i < oldSentences.length; i++) {
    const sOld = oldSentences[i];
    let bestMatchIdx = -1;
    let bestSim = 0;

    for (let j = 0; j < newSentences.length; j++) {
      if (matchedNewIndices.has(j)) continue;
      const sim = wordSimilarity(sOld, newSentences[j]);
      if (sim > bestSim) {
        bestSim = sim;
        bestMatchIdx = j;
      }
    }

    if (bestMatchIdx !== -1 && bestSim >= 0.35) {
      matchedOldIndices.add(i);
      matchedNewIndices.add(bestMatchIdx);
      const sNew = newSentences[bestMatchIdx];

      if (sOld !== sNew) {
        // Detect metrics inside
        const metrics = detectMetricChanges(sOld, sNew);
        if (metrics.length > 0) {
          metricChanges.push(...metrics);
          for (const m of metrics) {
            changes.push({
              type: 'metric',
              category: 'prose',
              oldText: sOld,
              newText: sNew,
              summary: m.description,
            });
          }
        } else {
          changes.push({
            type: 'modification',
            category: 'prose',
            oldText: sOld,
            newText: sNew,
            summary: `Revised statement: "${sNew}"`,
          });
        }
      }
    }
  }

  // Deleted sentences
  for (let i = 0; i < oldSentences.length; i++) {
    if (!matchedOldIndices.has(i)) {
      changes.push({
        type: 'deletion',
        category: 'prose',
        oldText: oldSentences[i],
        summary: `Removed: "${oldSentences[i]}"`,
      });
    }
  }

  // Added sentences
  for (let j = 0; j < newSentences.length; j++) {
    if (!matchedNewIndices.has(j)) {
      changes.push({
        type: 'addition',
        category: 'prose',
        newText: newSentences[j],
        summary: `Added: "${newSentences[j]}"`,
      });
    }
  }

  // Stats calculation
  const oldWords = oldText.split(/\s+/).filter(Boolean).length;
  const newWords = newText.split(/\s+/).filter(Boolean).length;
  const oldParas = splitParagraphs(oldText).length;
  const newParas = splitParagraphs(newText).length;

  const wordsAdded = Math.max(0, newWords - oldWords);
  const wordsRemoved = Math.max(0, oldWords - newWords);
  const paragraphsAdded = Math.max(0, newParas - oldParas);
  const paragraphsRemoved = Math.max(0, oldParas - newParas);

  // Overall human summary
  let summary = '';
  if (changes.length === 0) {
    summary = 'No semantic or textual differences detected between the versions.';
  } else {
    const parts: string[] = [];
    if (metricChanges.length > 0) {
      parts.push(`${metricChanges.length} key metric update(s)`);
    }
    const proseMods = changes.filter((c) => c.category === 'prose');
    if (proseMods.length > 0) {
      parts.push(`${proseMods.length} prose revision(s)`);
    }
    const metaMods = changes.filter((c) => c.category === 'metadata');
    if (metaMods.length > 0) {
      parts.push(`${metaMods.length} metadata change(s)`);
    }
    summary = `Detected ${changes.length} semantic change(s): ${parts.join(', ')}.`;
  }

  return {
    summary,
    stats: {
      wordsAdded,
      wordsRemoved,
      paragraphsAdded,
      paragraphsRemoved,
      totalChanges: changes.length,
    },
    changes,
    metricChanges,
  };
}
