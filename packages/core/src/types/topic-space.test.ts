import { describe, expect, it } from 'vitest';
import type { CreationSource, TopicSpace, TopicStatus } from './topic-space.js';

describe('TopicSpace shape', () => {
  it('accepts a minimal preset space', () => {
    const space: TopicSpace = {
      id: 'space-travel',
      name: 'Travel 2026',
      keywords: ['travel', 'flight', 'hotel'],
      createdDate: new Date('2026-01-01'),
      lastActivityDate: new Date('2026-05-07'),
      creationSource: 'preset',
      status: 'active',
      messages: [],
    };
    expect(space.name).toBe('Travel 2026');
  });

  it('does not contain any presentation fields', () => {
    const space: TopicSpace = {
      id: 'space-1',
      name: 'A',
      keywords: [],
      createdDate: new Date(),
      lastActivityDate: new Date(),
      creationSource: 'direct',
      status: 'active',
      messages: [],
    };
    // The purpose of this assertion is documentation: we want to be
    // loud if a future change leaks colour/icon/position back into
    // TopicSpace. It keeps the core API lean for non-UI hosts.
    expect(space).not.toHaveProperty('color');
    expect(space).not.toHaveProperty('icon');
    expect(space).not.toHaveProperty('positionX');
    expect(space).not.toHaveProperty('positionY');
  });

  it('allows all CreationSource values', () => {
    const sources: CreationSource[] = ['packaging', 'direct', 'user', 'preset'];
    expect(sources).toHaveLength(4);
  });

  it('allows all TopicStatus values', () => {
    const statuses: TopicStatus[] = ['active', 'dormant', 'archived', 'merged'];
    expect(statuses).toHaveLength(4);
  });
});
