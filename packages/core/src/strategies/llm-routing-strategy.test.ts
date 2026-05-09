import { describe, expect, it, vi } from 'vitest';
import { LLMRoutingStrategy, llmRouting } from './llm-routing-strategy.js';
import type { LLMFunction } from './llm-types.js';
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

function llmStub(reply: string): LLMFunction {
  return vi.fn().mockResolvedValue(reply);
}

describe('LLMRoutingStrategy.relevanceScore', () => {
  it('returns 0 for empty messages without calling the LLM', async () => {
    const llm = llmStub('{"verdict":"inbox"}');
    const strategy = new LLMRoutingStrategy({ llm });
    const result = await strategy.relevanceScore(
      '   ',
      space({ id: 's', name: 'Travel', keywords: [] }),
    );
    expect(result).toBe(0);
    expect(llm).not.toHaveBeenCalled();
  });

  it('returns high relevance when the LLM names the matching space', async () => {
    const travel = space({ id: 's', name: 'Travel 2026', keywords: ['flight'] });
    const strategy = new LLMRoutingStrategy({
      llm: llmStub('{"verdict":"existing","space":"Travel 2026"}'),
    });
    await strategy.primeForMessage('book a flight', [travel]);
    const score = await strategy.relevanceScore('book a flight', travel);
    expect(score).toBeGreaterThan(0.9);
  });

  it('returns 0 for a space the LLM did not pick', async () => {
    const travel = space({ id: 's1', name: 'Travel', keywords: [] });
    const renovation = space({ id: 's2', name: 'Renovation', keywords: [] });
    const strategy = new LLMRoutingStrategy({
      llm: llmStub('{"verdict":"existing","space":"Travel"}'),
    });
    await strategy.primeForMessage('flight to Kyoto', [travel, renovation]);
    const matched = await strategy.relevanceScore('flight to Kyoto', travel);
    const unmatched = await strategy.relevanceScore('flight to Kyoto', renovation);
    expect(matched).toBeGreaterThan(0.9);
    expect(unmatched).toBe(0);
  });

  it('parses markdown-fenced JSON replies', async () => {
    const travel = space({ id: 's', name: 'Travel', keywords: [] });
    const strategy = new LLMRoutingStrategy({
      llm: llmStub('```json\n{"verdict":"existing","space":"Travel"}\n```'),
    });
    await strategy.primeForMessage('flights', [travel]);
    const score = await strategy.relevanceScore('flights', travel);
    expect(score).toBeGreaterThan(0.9);
  });

  it('parses JSON embedded in prose', async () => {
    const travel = space({ id: 's', name: 'Travel', keywords: [] });
    const strategy = new LLMRoutingStrategy({
      llm: llmStub(
        'Sure! Here is my answer: {"verdict":"existing","space":"Travel"} hope this helps.',
      ),
    });
    await strategy.primeForMessage('flights', [travel]);
    const score = await strategy.relevanceScore('flights', travel);
    expect(score).toBeGreaterThan(0.9);
  });

  it('rejects hallucinated space names', async () => {
    const travel = space({ id: 's', name: 'Travel', keywords: [] });
    const strategy = new LLMRoutingStrategy({
      llm: llmStub('{"verdict":"existing","space":"Does-not-exist"}'),
    });
    await strategy.primeForMessage('what', [travel]);
    const score = await strategy.relevanceScore('what', travel);
    expect(score).toBe(0);
  });

  it('yields 0 on malformed JSON so the engine can fall back', async () => {
    const travel = space({ id: 's', name: 'Travel', keywords: [] });
    const strategy = new LLMRoutingStrategy({
      llm: llmStub('sorry, I cannot route this'),
    });
    await strategy.primeForMessage('hi', [travel]);
    const score = await strategy.relevanceScore('hi', travel);
    expect(score).toBe(0);
  });

  it('swallows transport errors and yields 0', async () => {
    const travel = space({ id: 's', name: 'Travel', keywords: [] });
    const failing = vi.fn().mockRejectedValue(new Error('network down'));
    const strategy = new LLMRoutingStrategy({ llm: failing });
    await strategy.primeForMessage('hi', [travel]);
    const score = await strategy.relevanceScore('hi', travel);
    expect(score).toBe(0);
  });

  it('calls the LLM exactly once per message when primed', async () => {
    const a = space({ id: 'a', name: 'A', keywords: [] });
    const b = space({ id: 'b', name: 'B', keywords: [] });
    const c = space({ id: 'c', name: 'C', keywords: [] });
    const llm = llmStub('{"verdict":"existing","space":"A"}');
    const strategy = new LLMRoutingStrategy({ llm });
    await strategy.primeForMessage('message', [a, b, c]);
    await strategy.relevanceScore('message', a);
    await strategy.relevanceScore('message', b);
    await strategy.relevanceScore('message', c);
    expect(llm).toHaveBeenCalledTimes(1);
  });
});

describe('LLMRoutingStrategy.isNewTopicWorthy', () => {
  it('returns false for messages below newTopicMinLength', async () => {
    const strategy = new LLMRoutingStrategy({
      llm: llmStub('{"verdict":"new","name":"Whatever"}'),
    });
    const worthy = await strategy.isNewTopicWorthy('hi', []);
    expect(worthy).toBe(false);
  });

  it('returns true when the LLM votes "new" and length passes', async () => {
    const strategy = new LLMRoutingStrategy({
      llm: llmStub('{"verdict":"new","name":"Kitchen renovation"}'),
    });
    const worthy = await strategy.isNewTopicWorthy(
      'Let us plan the kitchen renovation budget for next month properly',
      [],
    );
    expect(worthy).toBe(true);
  });

  it('returns false when the LLM votes "inbox"', async () => {
    const strategy = new LLMRoutingStrategy({
      llm: llmStub('{"verdict":"inbox"}'),
    });
    const worthy = await strategy.isNewTopicWorthy('what is the capital of Iceland by the way', []);
    expect(worthy).toBe(false);
  });
});

describe('llmRouting factory', () => {
  it('returns an LLMRoutingStrategy instance', () => {
    const strategy = llmRouting({ llm: llmStub('{}') });
    expect(strategy).toBeInstanceOf(LLMRoutingStrategy);
  });
});
