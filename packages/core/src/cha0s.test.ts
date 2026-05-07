import { beforeEach, describe, expect, it } from 'vitest';
import { Cha0s } from './cha0s.js';
import type { TopicSpace } from './types/topic-space.js';

function sequentialIds(prefix = 'id'): () => string {
  let n = 0;
  return () => {
    n++;
    return `${prefix}-${n}`;
  };
}

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

describe('Cha0s.send — routing into spaces', () => {
  it('routes into an existing space when keywords strongly match', async () => {
    const travel = space({
      id: 's-travel',
      name: 'Travel',
      keywords: ['travel', 'flight', 'hotel'],
    });
    const cha0s = new Cha0s({
      initialSpaces: [travel],
      idGenerator: sequentialIds('m'),
    });
    const result = await cha0s.send({
      role: 'user',
      content: 'book a travel flight and hotel for Kyoto',
    });
    expect(result.destination).toBe('topicSpace');
    if (result.destination === 'topicSpace') {
      expect(result.space.id).toBe('s-travel');
      expect(result.isNewSpace).toBe(false);
      expect(result.space.messages).toHaveLength(1);
    }
  });

  it('creates a new space for a substantive unmatched message', async () => {
    const travel = space({
      id: 's-travel',
      name: 'Travel',
      keywords: ['flight', 'hotel', 'passport', 'visa', 'kyoto'],
    });
    const cha0s = new Cha0s({
      initialSpaces: [travel],
      idGenerator: sequentialIds('m'),
    });
    const result = await cha0s.send({
      role: 'user',
      content: "Let's begin planning the kitchen renovation budget in detail today please",
    });
    expect(result.destination).toBe('topicSpace');
    if (result.destination === 'topicSpace') {
      expect(result.isNewSpace).toBe(true);
      expect(result.space.creationSource).toBe('direct');
      expect(result.space.messages).toHaveLength(1);
    }
  });

  it('stashes weak/trivial messages in the inbox as a new fragment', async () => {
    const cha0s = new Cha0s({ idGenerator: sequentialIds('m') });
    const result = await cha0s.send({
      role: 'user',
      content: "what's the weather",
    });
    expect(result.destination).toBe('inbox');
    if (result.destination === 'inbox') {
      expect(result.inbox.fragments).toHaveLength(1);
      expect(result.fragment.messages).toHaveLength(1);
    }
  });

  it('assigns ids and timestamps when the input omits them', async () => {
    const cha0s = new Cha0s({
      idGenerator: sequentialIds('gen'),
      clock: () => new Date('2026-05-07T12:00:00Z'),
    });
    const result = await cha0s.send({ role: 'user', content: 'hi' });
    expect(result.message.id).toBe('gen-1'); // first id consumed by the message
    expect(result.message.timestamp).toEqual(new Date('2026-05-07T12:00:00Z'));
  });

  it('provides decision.reasoning on every call', async () => {
    const cha0s = new Cha0s({ idGenerator: sequentialIds() });
    const result = await cha0s.send({ role: 'user', content: 'hi' });
    expect(result.decision.reasoning.length).toBeGreaterThan(0);
  });
});

describe('Cha0s.spaces / inbox / space', () => {
  it('exposes spaces filtered by status', async () => {
    const active = space({ id: 'a', name: 'A', keywords: [], status: 'active' });
    const archived = space({ id: 'b', name: 'B', keywords: [], status: 'archived' });
    const cha0s = new Cha0s({ initialSpaces: [active, archived] });
    expect(cha0s.spaces()).toHaveLength(2);
    expect(cha0s.spaces({ status: 'active' })).toEqual([active]);
    expect(cha0s.spaces({ status: ['archived'] })).toEqual([archived]);
  });

  it('looks up a single space by id', () => {
    const travel = space({ id: 't', name: 'T', keywords: [] });
    const cha0s = new Cha0s({ initialSpaces: [travel] });
    expect(cha0s.space('t')).toEqual(travel);
    expect(cha0s.space('unknown')).toBeUndefined();
  });

  it('returns the current inbox', () => {
    const cha0s = new Cha0s();
    expect(cha0s.inbox().fragments).toEqual([]);
  });
});

describe('Cha0s.moveMessage', () => {
  let cha0s: Cha0s;
  let messageId: string;

  beforeEach(async () => {
    cha0s = new Cha0s({ idGenerator: sequentialIds('id') });
    const res = await cha0s.send({ role: 'user', content: 'what is the weather' });
    if (res.destination !== 'inbox') throw new Error('expected weather to land in inbox');
    messageId = res.message.id;
  });

  it('moves a message from inbox to a topic space', async () => {
    // Seed a target space.
    const seed = await cha0s.send({
      role: 'user',
      content: 'planning a travel itinerary for Kyoto next spring please',
    });
    if (seed.destination !== 'topicSpace') throw new Error('expected a topic space');
    const targetId = seed.space.id;

    const updated = await cha0s.moveMessage(messageId, targetId);
    expect(updated.messages.map((m) => m.id)).toContain(messageId);
    expect(cha0s.inbox().fragments).toHaveLength(0);
  });

  it('throws for an unknown target space', async () => {
    await expect(cha0s.moveMessage(messageId, 'not-a-real-id')).rejects.toThrow(/unknown target/);
  });

  it('throws for an unknown message id', async () => {
    const seed = await cha0s.send({
      role: 'user',
      content: 'planning a travel itinerary for Kyoto next spring please',
    });
    if (seed.destination !== 'topicSpace') throw new Error('expected a topic space');
    await expect(cha0s.moveMessage('ghost-id', seed.space.id)).rejects.toThrow(/unknown message/);
  });

  it('records a correction in the snapshot after moving', async () => {
    const seed = await cha0s.send({
      role: 'user',
      content: 'planning a travel itinerary for Kyoto next spring please',
    });
    if (seed.destination !== 'topicSpace') throw new Error('expected topic space');
    await cha0s.moveMessage(messageId, seed.space.id);
    const snap = cha0s.snapshot();
    expect(snap.corrections.length).toBe(1);
    expect(snap.corrections[0]!.correctedDestination).toBe(seed.space.id);
  });
});

describe('Cha0s.checkPackaging', () => {
  it('creates no new spaces when clusters are below threshold', async () => {
    const cha0s = new Cha0s({ idGenerator: sequentialIds() });
    await cha0s.send({ role: 'user', content: 'weather today' });
    await cha0s.send({ role: 'user', content: 'weather tomorrow' });
    const created = await cha0s.checkPackaging();
    // default threshold is 3 fragments; only 2 inbox items here.
    expect(created).toEqual([]);
  });

  it('packages a dense cluster into a new topic space', async () => {
    const cha0s = new Cha0s({ idGenerator: sequentialIds() });
    // Three weather-trivia messages → all go to inbox, share 'weather' bigram/token.
    await cha0s.send({ role: 'user', content: 'weather today report' });
    await cha0s.send({ role: 'user', content: 'weather tomorrow forecast' });
    await cha0s.send({ role: 'user', content: 'weather next week outlook' });
    const created = await cha0s.checkPackaging();
    expect(created.length).toBeGreaterThanOrEqual(1);
    expect(cha0s.inbox().fragments).toHaveLength(0);
  });
});

describe('Cha0s.checkLifecycle', () => {
  it('archives spaces past the inactivity threshold', async () => {
    const veryOld = space({
      id: 'stale',
      name: 'Stale',
      keywords: [],
      status: 'active',
      lastActivityDate: new Date('2020-01-01'),
    });
    const cha0s = new Cha0s({ initialSpaces: [veryOld] });
    const changed = await cha0s.checkLifecycle();
    expect(changed).toHaveLength(1);
    expect(changed[0]!.status).toBe('archived');
    expect(cha0s.space('stale')!.status).toBe('archived');
  });
});

describe('Cha0s.snapshot', () => {
  it('returns the full in-memory state for persistence', async () => {
    const cha0s = new Cha0s({ idGenerator: sequentialIds('id') });
    await cha0s.send({ role: 'user', content: 'travel to Kyoto please' });
    const snap = cha0s.snapshot();
    expect(snap.spaces.length + snap.inbox.fragments.length).toBeGreaterThan(0);
    expect(Array.isArray(snap.corrections)).toBe(true);
  });
});
