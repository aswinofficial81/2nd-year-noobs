import { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeSemanticDiff, detectStateConflicts, detailedThreeWayStateMerge } from '../src/index.js';

describe('Semantic Diff & Conflict Detection Engine', () => {
  it('should detect metric performance updates between research prose versions', () => {
    const versionA = 'The model achieved 82% accuracy on the ImageNet validation split with 15ms latency.';
    const versionB = 'The model achieved 87% accuracy on the ImageNet validation split with 12ms latency.';

    const diff = computeSemanticDiff(versionA, versionB);

    assert.strictEqual(diff.metricChanges.length >= 2, true);
    assert.strictEqual(diff.metricChanges.some(m => m.fromValue === '82%' && m.toValue === '87%'), true);
    assert.strictEqual(diff.metricChanges.some(m => m.fromValue === '15ms' && m.toValue === '12ms'), true);
    assert.strictEqual(diff.changes.length >= 2, true);
  });

  it('should detect title renames and metadata tag modifications', () => {
    const docA = {
      title: 'Decentralized VCS Whitepaper v1',
      text: 'Original research text.',
      metadata: { status: 'draft', version: '1.0' },
    };

    const docB = {
      title: 'Decentralized VCS Whitepaper v2 Final',
      text: 'Original research text with expanded conclusion.',
      metadata: { status: 'published', version: '2.0', reviewed: true },
    };

    const diff = computeSemanticDiff(docA, docB);

    assert.strictEqual(diff.changes.some(c => c.category === 'title'), true);
    assert.strictEqual(diff.changes.some(c => c.category === 'metadata' && c.summary.includes('reviewed')), true);
    assert.strictEqual(diff.stats.wordsAdded > 0, true);
  });

  it('should detect sentence additions and deletions cleanly', () => {
    const textA = 'First sentence. Second sentence to remove. Third sentence.';
    const textB = 'First sentence. Third sentence. Fourth sentence added.';

    const diff = computeSemanticDiff(textA, textB);

    assert.strictEqual(diff.changes.some(c => c.type === 'deletion' && c.oldText?.includes('Second sentence')), true);
    assert.strictEqual(diff.changes.some(c => c.type === 'addition' && c.newText?.includes('Fourth sentence')), true);
  });

  it('should detect overlapping 3-way merge conflicts across divergent branches', () => {
    const baseState = {
      title: 'Common Title',
      content: 'Base content paragraph.',
      meta_version: '1.0',
    };

    const oursState = {
      title: 'Target Branch Title',
      content: 'Base content paragraph.',
      meta_version: '1.1-target',
    };

    const theirsState = {
      title: 'Source Branch Title',
      content: 'Base content paragraph.',
      meta_version: '1.1-source',
    };

    const conflicts = detectStateConflicts(baseState, oursState, theirsState);

    assert.strictEqual(conflicts.length, 2); // title and meta_version
    assert.strictEqual(conflicts.some(c => c.key === 'title'), true);
    assert.strictEqual(conflicts.some(c => c.key === 'meta_version'), true);

    const detailedMerge = detailedThreeWayStateMerge(baseState, oursState, theirsState, 'crdt');
    assert.strictEqual(detailedMerge.hasConflicts, true);
    assert.strictEqual(detailedMerge.conflicts.length, 2);
    assert.strictEqual(typeof detailedMerge.mergedState.title, 'string');
  });
});
