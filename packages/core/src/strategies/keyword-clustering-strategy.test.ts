import { describe, expect, it } from 'vitest';
import { defaultRoutingConfiguration } from '../config/routing-configuration.js';
import type { Fragment } from '../types/fragment.js';
import type { Message } from '../types/message.js';
import { KeywordClusteringStrategy } from './keyword-clustering-strategy.js';

function fragment(id: string, keywords: string[], daysAgo = 0): Fragment {
  const t = new Date('2026-05-07T10:00:00Z');
  t.setDate(t.getDate() - daysAgo);
  const msg: Message = { id: `${id}-m0`, role: 'user', content: keywords.join(' '), timestamp: t };
  return { id, messages: [msg], timestamp: t, keywords };
}

const strategy = new KeywordClusteringStrategy();

describe('KeywordClusteringStrategy.evaluateClusters', () => {
  it('returns no clusters for an empty inbox', () => {
    expect(strategy.evaluateClusters([])).toEqual([]);
  });

  it('returns no clusters when no keyword appears in >=2 fragments', () => {
    const frags = [fragment('a', ['alpha']), fragment('b', ['beta']), fragment('c', ['gamma'])];
    expect(strategy.evaluateClusters(frags)).toEqual([]);
  });

  it('forms a cluster around a keyword appearing in multiple fragments', () => {
    const frags = [
      fragment('a', ['travel', 'flight']),
      fragment('b', ['travel', 'hotel']),
      fragment('c', ['travel', 'kyoto']),
    ];
    const clusters = strategy.evaluateClusters(frags);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.fragments.map((f) => f.id).sort()).toEqual(['a', 'b', 'c']);
    expect(clusters[0]!.themeKeywords).toContain('travel');
    expect(clusters[0]!.suggestedName).toBe('travel');
  });

  it('suggests the highest-frequency shared keyword as the name', () => {
    const frags = [
      fragment('a', ['travel', 'japan']),
      fragment('b', ['travel', 'japan']),
      fragment('c', ['travel', 'visa']),
    ];
    const clusters = strategy.evaluateClusters(frags);
    expect(clusters[0]!.suggestedName).toBe('travel'); // 3 hits > japan's 2
  });

  it('merges overlapping candidate clusters', () => {
    // two distinct themes share one fragment — should merge into one cluster
    const frags = [
      fragment('a', ['travel', 'shared']),
      fragment('b', ['travel', 'shared']),
      fragment('c', ['renovation', 'shared']),
      fragment('d', ['renovation', 'shared']),
    ];
    const clusters = strategy.evaluateClusters(frags);
    // 'shared' appears in all 4, 'travel' in 2, 'renovation' in 2.
    // The 'shared' cluster dominates and absorbs the others via >50% overlap.
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.fragments).toHaveLength(4);
  });

  it('emits cluster fragments sorted by timestamp ascending', () => {
    const frags = [
      fragment('late', ['travel'], 1),
      fragment('early', ['travel'], 5),
      fragment('middle', ['travel'], 3),
    ];
    const clusters = strategy.evaluateClusters(frags);
    expect(clusters[0]!.fragments.map((f) => f.id)).toEqual(['early', 'middle', 'late']);
  });

  it('yields a coherence score in [0, 1]', () => {
    const frags = [fragment('a', ['travel']), fragment('b', ['travel'])];
    const clusters = strategy.evaluateClusters(frags);
    expect(clusters[0]!.coherenceScore).toBeGreaterThanOrEqual(0);
    expect(clusters[0]!.coherenceScore).toBeLessThanOrEqual(1);
  });
});

describe('KeywordClusteringStrategy.meetsPackagingThreshold', () => {
  it('rejects clusters below the configured density', () => {
    const frags = [fragment('a', ['travel']), fragment('b', ['travel'])];
    const [cluster] = strategy.evaluateClusters(frags);
    // default threshold is 3; 2 fragments should fail
    expect(strategy.meetsPackagingThreshold(cluster!)).toBe(false);
  });

  it('accepts clusters at or above the configured density', () => {
    const frags = [fragment('a', ['travel']), fragment('b', ['travel']), fragment('c', ['travel'])];
    const [cluster] = strategy.evaluateClusters(frags);
    expect(strategy.meetsPackagingThreshold(cluster!)).toBe(true);
  });

  it('honours a lowered threshold from configuration', () => {
    const low = new KeywordClusteringStrategy({
      ...defaultRoutingConfiguration,
      packagingDensityThreshold: 2,
    });
    const frags = [fragment('a', ['travel']), fragment('b', ['travel'])];
    const [cluster] = low.evaluateClusters(frags);
    expect(low.meetsPackagingThreshold(cluster!)).toBe(true);
  });
});
