import { describe, expect, it } from 'vitest';
import type { FragmentCluster } from './fragment-cluster.js';
import type { Fragment } from './fragment.js';

describe('FragmentCluster shape', () => {
  it('accepts a minimal single-fragment cluster', () => {
    const fragment: Fragment = {
      id: 'f-1',
      messages: [],
      timestamp: new Date(),
      keywords: ['travel'],
    };
    const cluster: FragmentCluster = {
      fragments: [fragment],
      themeKeywords: ['travel'],
      coherenceScore: 1.0,
      suggestedName: 'Travel',
    };
    expect(cluster.coherenceScore).toBe(1.0);
  });

  it('allows empty theme keywords when fragments share nothing', () => {
    const cluster: FragmentCluster = {
      fragments: [],
      themeKeywords: [],
      coherenceScore: 0,
      suggestedName: 'Untitled',
    };
    expect(cluster.themeKeywords).toEqual([]);
  });
});
