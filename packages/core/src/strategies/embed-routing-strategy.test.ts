import { describe, expect, it, vi } from 'vitest';
import { EmbedRoutingStrategy, embedRouting } from './embed-routing-strategy.js';
import type { EmbedFunction } from './llm-types.js';
import type { TopicSpace } from '../types/topic-space.js';

function space(
  overrides: Partial<TopicSpace> & Pick<TopicSpace, 'id' | 'name' | 'keywords'>,
): TopicSpace {
  return {
    id: overrides.id,
    name: overrides.name,
    keywords: overrides.keywords,
    createdDate: overrides.createdDate ?? new Date('2026-01-01'),
    lastActivityDate: overrides.lastActivityDate ?? new Date('2026-05-07'),
    creationSource: overrides.creationSource ?? 'preset',
    status: overrides.status ?? 'active',
    messages: overrides.messages ?? [],
  };
}

/**
 * A small embedding stub: every token gets a vector where its
 * character sum goes into slot 0. Two tokens produce similar vectors
 * iff their character sums are close. This is silly but deterministic
 * and enough to exercise the routing logic.
 */
function charSumEmbed(): EmbedFunction {
  return vi.fn(async (texts: readonly string[]) => {
    return texts.map((t) => {
      const sum = [...t].reduce((acc, c) => acc + c.charCodeAt(0), 0);
      return [sum / 1000, 1]; // 2D vector; the 1 keeps the norm stable
    });
  });
}

describe('EmbedRoutingStrategy.relevanceScore', () => {
  it('returns 0 for empty messages', async () => {
    const strategy = new EmbedRoutingStrategy({ embed: charSumEmbed() });
    const score = await strategy.relevanceScore(
      '  ',
      space({ id: 's', name: 'Travel', keywords: ['flight'] }),
    );
    expect(score).toBe(0);
  });

  it('returns 0 for spaces without keywords', async () => {
    const strategy = new EmbedRoutingStrategy({ embed: charSumEmbed() });
    const score = await strategy.relevanceScore(
      'book a flight',
      space({ id: 's', name: 'Travel', keywords: [] }),
    );
    expect(score).toBe(0);
  });

  it('returns a value in [0, 1]', async () => {
    const strategy = new EmbedRoutingStrategy({ embed: charSumEmbed() });
    const score = await strategy.relevanceScore(
      'book a flight',
      space({ id: 's', name: 'Travel', keywords: ['flight', 'hotel', 'kyoto'] }),
    );
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('caches centroid embeddings', async () => {
    const embed = charSumEmbed();
    const strategy = new EmbedRoutingStrategy({ embed });
    const travel = space({ id: 's', name: 'Travel', keywords: ['flight', 'hotel'] });
    await strategy.relevanceScore('flight', travel);
    await strategy.relevanceScore('hotel', travel);
    await strategy.relevanceScore('trip', travel);
    // First call: 2 batches (message + keywords).
    // Subsequent calls: 1 batch each (message only; centroid cached).
    expect(embed).toHaveBeenCalledTimes(4); // 1 keyword batch + 3 message batches
  });
});

describe('EmbedRoutingStrategy.isNewTopicWorthy', () => {
  it('returns false for short messages', async () => {
    const strategy = new EmbedRoutingStrategy({
      embed: charSumEmbed(),
      newTopicMinLength: 20,
    });
    const worthy = await strategy.isNewTopicWorthy('hi', []);
    expect(worthy).toBe(false);
  });

  it('returns true when no existing spaces are present', async () => {
    const strategy = new EmbedRoutingStrategy({ embed: charSumEmbed() });
    const worthy = await strategy.isNewTopicWorthy(
      'Start a project about planning a kitchen renovation budget together',
      [],
    );
    expect(worthy).toBe(true);
  });
});

describe('embedRouting factory', () => {
  it('returns an EmbedRoutingStrategy instance', () => {
    const strategy = embedRouting({ embed: charSumEmbed() });
    expect(strategy).toBeInstanceOf(EmbedRoutingStrategy);
  });
});
