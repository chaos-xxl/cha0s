import { describe, expect, it } from 'vitest';
import type { Message } from '../types/message.js';
import type { TopicSpace } from '../types/topic-space.js';
import { TopicSpaceLifecycleManager } from './topic-space-lifecycle-manager.js';

const NOW = new Date('2026-05-07T12:00:00Z');
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function msg(id: string, offsetMs: number, content = 'hi'): Message {
  return {
    id,
    role: 'user',
    content,
    timestamp: new Date(NOW.getTime() + offsetMs),
  };
}

function space(overrides: Partial<TopicSpace> & Pick<TopicSpace, 'id'>): TopicSpace {
  return {
    id: overrides.id,
    name: overrides.name ?? 'Space',
    keywords: overrides.keywords ?? [],
    createdDate: overrides.createdDate ?? new Date('2026-01-01'),
    lastActivityDate: overrides.lastActivityDate ?? NOW,
    creationSource: overrides.creationSource ?? 'preset',
    status: overrides.status ?? 'active',
    messages: overrides.messages ?? [],
    ...(overrides.contextSummary !== undefined && { contextSummary: overrides.contextSummary }),
  };
}

describe('TopicSpaceLifecycleManager.evaluate', () => {
  const manager = new TopicSpaceLifecycleManager({ clock: () => NOW });

  it('recommends archiving active spaces that passed the inactivity threshold', () => {
    const stale = space({
      id: 'stale',
      lastActivityDate: new Date(NOW.getTime() - THIRTY_DAYS_MS - 60_000),
    });
    const fresh = space({ id: 'fresh', lastActivityDate: NOW });
    const actions = manager.evaluate([stale, fresh]);
    expect(actions).toEqual([{ kind: 'archive', space: stale }]);
  });

  it('never recommends archiving non-active spaces', () => {
    const archived = space({
      id: 'archived',
      status: 'archived',
      lastActivityDate: new Date(NOW.getTime() - THIRTY_DAYS_MS - 60_000),
    });
    expect(manager.evaluate([archived])).toEqual([]);
  });

  it('returns an empty list when nothing meets the threshold', () => {
    expect(manager.evaluate([])).toEqual([]);
    const recent = space({ id: 'r', lastActivityDate: new Date(NOW.getTime() - 1000) });
    expect(manager.evaluate([recent])).toEqual([]);
  });
});

describe('TopicSpaceLifecycleManager.archive / reactivate', () => {
  const manager = new TopicSpaceLifecycleManager({ clock: () => NOW });

  it('archive flips status without touching other fields', () => {
    const original = space({ id: 's', keywords: ['x'], messages: [msg('m1', 0)] });
    const archived = manager.archive(original);
    expect(archived.status).toBe('archived');
    expect(archived.keywords).toEqual(['x']);
    expect(archived.messages).toHaveLength(1);
    expect(original.status).toBe('active'); // purity: input unchanged
  });

  it('reactivate resets status and refreshes lastActivityDate', () => {
    const original = space({
      id: 's',
      status: 'archived',
      lastActivityDate: new Date('2025-01-01'),
    });
    const reactivated = manager.reactivate(original);
    expect(reactivated.status).toBe('active');
    expect(reactivated.lastActivityDate).toEqual(NOW);
  });
});

describe('TopicSpaceLifecycleManager.merge', () => {
  const manager = new TopicSpaceLifecycleManager({ clock: () => NOW });

  it('combines messages chronologically', () => {
    const target = space({
      id: 'target',
      messages: [msg('m2', 2000), msg('m4', 4000)],
    });
    const source = space({
      id: 'source',
      messages: [msg('m1', 1000), msg('m3', 3000)],
    });
    const merged = manager.merge(source, target);
    expect(merged.messages.map((m) => m.id)).toEqual(['m1', 'm2', 'm3', 'm4']);
  });

  it('unions keywords, preserving target order first', () => {
    const target = space({ id: 't', keywords: ['a', 'b'] });
    const source = space({ id: 's', keywords: ['b', 'c'] });
    const merged = manager.merge(source, target);
    expect(merged.keywords).toEqual(['a', 'b', 'c']);
  });

  it('keeps target identity (id, name)', () => {
    const target = space({ id: 't', name: 'Keep me' });
    const source = space({ id: 's', name: 'Discarded' });
    const merged = manager.merge(source, target);
    expect(merged.id).toBe('t');
    expect(merged.name).toBe('Keep me');
  });

  it('concatenates context summaries with a blank line', () => {
    const target = space({ id: 't', contextSummary: 'First half.' });
    const source = space({ id: 's', contextSummary: 'Second half.' });
    const merged = manager.merge(source, target);
    expect(merged.contextSummary).toBe('First half.\n\nSecond half.');
  });

  it('takes the earlier createdDate and the later lastActivityDate', () => {
    const target = space({
      id: 't',
      createdDate: new Date('2026-02-01'),
      lastActivityDate: new Date('2026-05-07'),
    });
    const source = space({
      id: 's',
      createdDate: new Date('2026-01-01'),
      lastActivityDate: new Date('2026-04-01'),
    });
    const merged = manager.merge(source, target);
    expect(merged.createdDate).toEqual(new Date('2026-01-01'));
    expect(merged.lastActivityDate).toEqual(new Date('2026-05-07'));
  });
});

describe('TopicSpaceLifecycleManager.rename', () => {
  it('updates only the name field', () => {
    const manager = new TopicSpaceLifecycleManager({ clock: () => NOW });
    const original = space({ id: 's', name: 'Old', keywords: ['x'] });
    const renamed = manager.rename(original, 'New');
    expect(renamed.name).toBe('New');
    expect(renamed.keywords).toEqual(['x']);
    expect(original.name).toBe('Old');
  });
});
