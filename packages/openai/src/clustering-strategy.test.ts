import { describe, expect, it } from 'vitest';
import type { Fragment, Message } from '@doctorchaos-ai/core';
import { OpenAiEmbeddingClient, type FetchLike } from './client.js';
import { OpenAiClusteringStrategy, openaiClustering } from './clustering-strategy.js';

const BASE = new Date('2026-05-07T12:00:00Z');

function fragment(id: string, content: string, keywords: string[] = []): Fragment {
  const msg: Message = { id: `${id}-m`, role: 'user', content, timestamp: BASE };
  return { id, messages: [msg], timestamp: BASE, keywords };
}

/**
 * Deterministic embedder: three-dimensional "topic axes" picked by
 * substring match. Good enough to make cosine similarity meaningful
 * in tests without real OpenAI calls.
 */
function makeFakeFetch(): FetchLike {
  return async (_url, init) => {
    const body = init?.body ? (JSON.parse(init.body) as { input: string[] }) : { input: [] };
    const vectors = body.input.map((text) => {
      const lower = text.toLowerCase();
      const travel = /travel|flight|hotel|kyoto|osaka|ryokan/.test(lower) ? 1 : 0;
      const reno = /renovation|tile|floor|kitchen|bathroom/.test(lower) ? 1 : 0;
      const food = /recipe|dinner|restaurant|cook|taste/.test(lower) ? 1 : 0;
      return [travel, reno, food, 0.01];
    });
    const response = {
      data: vectors.map((embedding, index) => ({ embedding, index })),
      model: 'text-embedding-3-small',
    };
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => JSON.stringify(response),
      json: async () => response,
    };
  };
}

function strategy(): OpenAiClusteringStrategy {
  const client = new OpenAiEmbeddingClient({ apiKey: 'sk-test', fetch: makeFakeFetch() });
  return new OpenAiClusteringStrategy({ apiKey: 'sk-test', client });
}

describe('OpenAiClusteringStrategy.evaluateClustersAsync', () => {
  it('returns no clusters for an empty input', async () => {
    expect(await strategy().evaluateClustersAsync([])).toEqual([]);
  });

  it('groups topically similar fragments together', async () => {
    const fragments = [
      fragment('a', 'travel flight to Kyoto'),
      fragment('b', 'flight hotel Osaka'),
      fragment('c', 'ryokan travel Japan'),
      fragment('d', 'pick tile for bathroom renovation'),
      fragment('e', 'kitchen floor tile renovation'),
    ];
    const clusters = await strategy().evaluateClustersAsync(fragments);
    expect(clusters).toHaveLength(2);
    const sizes = clusters.map((c) => c.fragments.length).sort();
    expect(sizes).toEqual([2, 3]);
  });

  it('drops singleton buckets', async () => {
    const fragments = [
      fragment('a', 'travel flight'),
      fragment('b', 'travel hotel'),
      fragment('c', 'completely unrelated cat'),
    ];
    const clusters = await strategy().evaluateClustersAsync(fragments);
    // The cat fragment is on its own and should not produce a cluster.
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.fragments.map((f) => f.id).sort()).toEqual(['a', 'b']);
  });

  it('sorts fragments chronologically inside each cluster', async () => {
    const t1 = new Date(BASE.getTime());
    const t2 = new Date(BASE.getTime() + 1000);
    const f1: Fragment = {
      id: 'late',
      messages: [{ id: 'm-late', role: 'user', content: 'flight hotel', timestamp: t2 }],
      timestamp: t2,
      keywords: [],
    };
    const f2: Fragment = {
      id: 'early',
      messages: [{ id: 'm-early', role: 'user', content: 'travel kyoto', timestamp: t1 }],
      timestamp: t1,
      keywords: [],
    };
    const clusters = await strategy().evaluateClustersAsync([f1, f2]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.fragments.map((f) => f.id)).toEqual(['early', 'late']);
  });

  it('picks the top shared keyword as the cluster name', async () => {
    const fragments = [
      fragment('a', 'travel flight', ['travel', 'flight']),
      fragment('b', 'travel hotel', ['travel', 'hotel']),
      fragment('c', 'ryokan travel', ['travel', 'ryokan']),
    ];
    const clusters = await strategy().evaluateClustersAsync(fragments);
    expect(clusters[0]!.suggestedName).toBe('travel');
  });

  it('coherenceScore is a number in [0, 1]', async () => {
    const fragments = [fragment('a', 'travel flight Kyoto'), fragment('b', 'travel hotel Osaka')];
    const clusters = await strategy().evaluateClustersAsync(fragments);
    expect(clusters[0]!.coherenceScore).toBeGreaterThanOrEqual(0);
    expect(clusters[0]!.coherenceScore).toBeLessThanOrEqual(1);
  });
});

describe('OpenAiClusteringStrategy.meetsPackagingThreshold', () => {
  it('respects the configured density threshold', () => {
    const s = strategy();
    expect(
      s.meetsPackagingThreshold({
        fragments: [fragment('a', 'x'), fragment('b', 'y')],
        themeKeywords: [],
        coherenceScore: 0,
        suggestedName: '',
      }),
    ).toBe(false);
    expect(
      s.meetsPackagingThreshold({
        fragments: [fragment('a', 'x'), fragment('b', 'y'), fragment('c', 'z')],
        themeKeywords: [],
        coherenceScore: 0,
        suggestedName: '',
      }),
    ).toBe(true);
  });
});

describe('OpenAiClusteringStrategy.evaluateClusters (sync)', () => {
  it('throws, directing the caller to the async variant', () => {
    const s = strategy();
    expect(() => s.evaluateClusters([])).toThrow(/async/i);
  });
});

describe('openaiClustering factory', () => {
  it('builds an OpenAiClusteringStrategy', () => {
    const s = openaiClustering({ apiKey: 'sk-test', fetch: makeFakeFetch() });
    expect(s).toBeInstanceOf(OpenAiClusteringStrategy);
  });
});
