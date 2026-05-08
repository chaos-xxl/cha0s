import { describe, expect, it } from 'vitest';
import type { TopicSpace } from '@cha0s-ai/core';
import { OpenAiEmbeddingClient, type FetchLike } from './client.js';
import { OpenAiEmbeddingStrategy, openaiEmbedding } from './embedding-strategy.js';

function space(id: string, keywords: string[]): TopicSpace {
  return {
    id,
    name: id,
    keywords,
    createdDate: new Date('2026-01-01'),
    lastActivityDate: new Date('2026-05-07'),
    creationSource: 'preset',
    status: 'active',
    messages: [],
  };
}

/**
 * Deterministic fake embedder: maps each input text to a small vector
 * whose first component encodes a "travel" bit and whose second
 * component encodes a "renovation" bit. Good enough to exercise the
 * cosine-similarity math without real OpenAI calls.
 */
function makeFakeFetch(): FetchLike {
  return async (_url, init) => {
    const body = init?.body ? (JSON.parse(init.body) as { input: string[] }) : { input: [] };
    const vectors = body.input.map((text) => {
      const lower = text.toLowerCase();
      const travel = /travel|flight|hotel|kyoto|osaka|ryokan|japan/.test(lower) ? 1 : 0;
      const reno = /renovation|tile|floor|kitchen|bathroom|budget/.test(lower) ? 1 : 0;
      const noise = /^$/.test(lower) ? 0 : 0.05;
      return [travel, reno, noise, noise];
    });
    const responseBody = {
      data: vectors.map((embedding, index) => ({ embedding, index })),
      model: 'text-embedding-3-small',
    };
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => JSON.stringify(responseBody),
      json: async () => responseBody,
    };
  };
}

function strategy(): OpenAiEmbeddingStrategy {
  const client = new OpenAiEmbeddingClient({ apiKey: 'sk-test', fetch: makeFakeFetch() });
  return new OpenAiEmbeddingStrategy({ apiKey: 'sk-test', client });
}

describe('OpenAiEmbeddingStrategy.relevanceScore', () => {
  it('returns 0 for an empty message', async () => {
    const s = strategy();
    expect(await s.relevanceScore('', space('a', ['travel']))).toBe(0);
  });

  it('returns 0 when the space has no keywords', async () => {
    const s = strategy();
    expect(await s.relevanceScore('travel flight', space('a', []))).toBe(0);
  });

  it('scores higher on topical matches than off-topic ones', async () => {
    const s = strategy();
    const travel = space('travel', ['travel', 'flight', 'hotel']);
    const matching = await s.relevanceScore('book a travel flight', travel);
    const orthogonal = await s.relevanceScore('pick tile for kitchen', travel);
    expect(matching).toBeGreaterThan(orthogonal);
    expect(matching).toBeGreaterThan(0);
  });

  it('distinguishes between unrelated topic spaces', async () => {
    const s = strategy();
    const travel = space('travel', ['travel', 'flight', 'hotel']);
    const reno = space('reno', ['renovation', 'tile', 'kitchen']);
    const msg = 'pick tile for the bathroom renovation';
    const scoreTravel = await s.relevanceScore(msg, travel);
    const scoreReno = await s.relevanceScore(msg, reno);
    expect(scoreReno).toBeGreaterThan(scoreTravel);
  });
});

describe('OpenAiEmbeddingStrategy.isNewTopicWorthy', () => {
  it('rejects short messages regardless of match', async () => {
    const s = strategy();
    expect(await s.isNewTopicWorthy('hi', [])).toBe(false);
  });

  it('accepts long messages when there are no existing spaces', async () => {
    const s = strategy();
    expect(await s.isNewTopicWorthy('a'.repeat(30), [])).toBe(true);
  });

  it('rejects long messages that strongly match an existing space', async () => {
    const s = strategy();
    const travel = space('travel', ['travel', 'flight', 'hotel']);
    expect(
      await s.isNewTopicWorthy('I want to book a travel flight and hotel package to Osaka', [
        travel,
      ]),
    ).toBe(false);
  });
});

describe('openaiEmbedding factory', () => {
  it('returns an OpenAiEmbeddingStrategy instance', () => {
    const s = openaiEmbedding({ apiKey: 'sk-test', fetch: makeFakeFetch() });
    expect(s).toBeInstanceOf(OpenAiEmbeddingStrategy);
  });
});
