import { describe, expect, it } from 'vitest';
import { defaultRoutingConfiguration } from '../config/routing-configuration.js';
import type { TopicSpace } from '../types/topic-space.js';
import { KeywordMatchingStrategy } from './keyword-matching-strategy.js';

function makeSpace(
  partial: Partial<TopicSpace> & Pick<TopicSpace, 'id' | 'name' | 'keywords'>,
): TopicSpace {
  return {
    id: partial.id,
    name: partial.name,
    keywords: partial.keywords,
    createdDate: partial.createdDate ?? new Date('2026-01-01'),
    lastActivityDate: partial.lastActivityDate ?? new Date('2026-05-07'),
    creationSource: partial.creationSource ?? 'preset',
    status: partial.status ?? 'active',
    messages: partial.messages ?? [],
    ...(partial.contextSummary !== undefined && { contextSummary: partial.contextSummary }),
  };
}

const strategy = new KeywordMatchingStrategy();

describe('KeywordMatchingStrategy.relevanceScore', () => {
  const travel = makeSpace({
    id: 'travel',
    name: 'Travel 2026',
    keywords: ['travel', 'flight', 'hotel', 'kyoto'],
  });

  it('scores 0 for an empty message', () => {
    expect(strategy.relevanceScore('', travel)).toBe(0);
    expect(strategy.relevanceScore('   ', travel)).toBe(0);
  });

  it('scores 0 for pure punctuation or symbols', () => {
    expect(strategy.relevanceScore('...???!!!', travel)).toBe(0);
    expect(strategy.relevanceScore('——、。', travel)).toBe(0);
  });

  it('scores 0 when the space has no keywords', () => {
    const empty = makeSpace({ id: 's', name: 's', keywords: [] });
    expect(strategy.relevanceScore('hello travel', empty)).toBe(0);
  });

  it('scores > 0 when at least one keyword hits', () => {
    expect(strategy.relevanceScore('booking a flight tomorrow', travel)).toBeGreaterThan(0);
  });

  it('scores 1 when every keyword hits', () => {
    expect(strategy.relevanceScore('travel flight hotel kyoto itinerary', travel)).toBe(1);
  });

  it('scores proportionally to hit ratio', () => {
    // 2 of 4 keywords hit
    const score = strategy.relevanceScore('flight to kyoto', travel);
    expect(score).toBeCloseTo(0.5, 5);
  });

  it('clamps to [0, 1] even with repeated hits', () => {
    const score = strategy.relevanceScore('flight flight flight', travel);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe('KeywordMatchingStrategy.isNewTopicWorthy', () => {
  const minLen = defaultRoutingConfiguration.newTopicMinLength;

  it('rejects messages shorter than the minimum length', () => {
    const short = 'x'.repeat(minLen - 1);
    expect(strategy.isNewTopicWorthy(short, [])).toBe(false);
  });

  it('accepts long enough messages when no spaces exist', () => {
    const long = 'x'.repeat(minLen + 10);
    expect(strategy.isNewTopicWorthy(long, [])).toBe(true);
  });

  it('rejects long messages that already strongly match an existing space', () => {
    const travel = makeSpace({
      id: 'travel',
      name: 'Travel',
      keywords: ['travel', 'flight', 'hotel'],
    });
    // All 3 keywords hit → relevance 1.0 (> 0.3 threshold)
    const msg = 'I want to book a travel flight and hotel package together';
    expect(strategy.isNewTopicWorthy(msg, [travel])).toBe(false);
  });

  it('accepts long messages that only weakly match existing spaces', () => {
    const travel = makeSpace({
      id: 'travel',
      name: 'Travel',
      keywords: ['flight', 'hotel', 'passport', 'visa', 'kyoto'],
    });
    // 1 of 5 keywords = 0.2 < 0.3 threshold
    const msg = 'Let us discuss the kitchen renovation plan in great depth today please';
    expect(msg.length).toBeGreaterThanOrEqual(minLen);
    expect(strategy.isNewTopicWorthy(msg, [travel])).toBe(true);
  });
});
