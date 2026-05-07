import { describe, expect, it } from 'vitest';
import type { Fragment } from './fragment.js';
import type { Message } from './message.js';

function makeMessage(id: string, role: 'user' | 'assistant', content: string): Message {
  return {
    id,
    role,
    content,
    timestamp: new Date('2026-05-07T00:00:00Z'),
  };
}

describe('Fragment shape', () => {
  it('accepts a fragment with a single user/assistant turn', () => {
    const frag: Fragment = {
      id: 'f-1',
      messages: [
        makeMessage('m-1', 'user', 'How is the weather?'),
        makeMessage('m-2', 'assistant', '22°C and sunny.'),
      ],
      timestamp: new Date('2026-05-07T00:00:00Z'),
      keywords: ['weather'],
    };
    expect(frag.messages).toHaveLength(2);
  });

  it('accepts a fragment without keywords before extraction runs', () => {
    const frag: Fragment = {
      id: 'f-2',
      messages: [makeMessage('m-3', 'user', 'hi')],
      timestamp: new Date(),
      keywords: [],
    };
    expect(frag.keywords).toEqual([]);
  });

  it('optionally carries a cluster hint from the clustering engine', () => {
    const frag: Fragment = {
      id: 'f-3',
      messages: [makeMessage('m-4', 'user', 'planning a trip to Kyoto')],
      timestamp: new Date(),
      keywords: ['travel', 'kyoto'],
      clusterHint: 'travel-japan',
    };
    expect(frag.clusterHint).toBe('travel-japan');
  });
});
