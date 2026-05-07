import { describe, expect, it } from 'vitest';
import type { Fragment } from './fragment.js';
import type { Message } from './message.js';
import { addFragment, createInboxSpace, removeFragments } from './inbox-space.js';

function makeMessage(id: string, content: string): Message {
  return {
    id,
    role: 'user',
    content,
    timestamp: new Date(),
  };
}

function makeFragment(id: string, timestamp: Date, messageCount = 1): Fragment {
  const messages: Message[] = [];
  for (let i = 0; i < messageCount; i++) {
    messages.push(makeMessage(`${id}-m${i}`, `content-${i}`));
  }
  return {
    id,
    messages,
    timestamp,
    keywords: [],
  };
}

describe('createInboxSpace', () => {
  it('creates an empty inbox with the default id', () => {
    const inbox = createInboxSpace();
    expect(inbox.id).toBe('inbox');
    expect(inbox.fragments).toEqual([]);
    expect(inbox.totalMessageCount).toBe(0);
  });

  it('accepts a custom id', () => {
    expect(createInboxSpace('user-42-inbox').id).toBe('user-42-inbox');
  });
});

describe('addFragment', () => {
  it('adds a fragment to an empty inbox', () => {
    const inbox = createInboxSpace();
    const frag = makeFragment('f-1', new Date('2026-01-01'), 2);
    const next = addFragment(inbox, frag);
    expect(next.fragments).toHaveLength(1);
    expect(next.totalMessageCount).toBe(2);
  });

  it('preserves chronological order on insertion', () => {
    let inbox = createInboxSpace();
    inbox = addFragment(inbox, makeFragment('late', new Date('2026-03-01')));
    inbox = addFragment(inbox, makeFragment('early', new Date('2026-01-01')));
    inbox = addFragment(inbox, makeFragment('middle', new Date('2026-02-01')));
    expect(inbox.fragments.map((f) => f.id)).toEqual(['early', 'middle', 'late']);
  });

  it('does not mutate the input inbox', () => {
    const original = createInboxSpace();
    addFragment(original, makeFragment('f-1', new Date()));
    expect(original.fragments).toHaveLength(0);
  });

  it('tracks total message count across fragments', () => {
    let inbox = createInboxSpace();
    inbox = addFragment(inbox, makeFragment('f-1', new Date('2026-01-01'), 3));
    inbox = addFragment(inbox, makeFragment('f-2', new Date('2026-02-01'), 2));
    expect(inbox.totalMessageCount).toBe(5);
  });
});

describe('removeFragments', () => {
  it('removes matching fragments and returns them', () => {
    let inbox = createInboxSpace();
    inbox = addFragment(inbox, makeFragment('f-1', new Date('2026-01-01'), 2));
    inbox = addFragment(inbox, makeFragment('f-2', new Date('2026-02-01'), 3));
    inbox = addFragment(inbox, makeFragment('f-3', new Date('2026-03-01'), 1));

    const [updated, removed] = removeFragments(inbox, new Set(['f-1', 'f-3']));

    expect(updated.fragments.map((f) => f.id)).toEqual(['f-2']);
    expect(removed.map((f) => f.id)).toEqual(['f-1', 'f-3']);
    expect(updated.totalMessageCount).toBe(3);
  });

  it('silently ignores ids that are not in the inbox', () => {
    let inbox = createInboxSpace();
    inbox = addFragment(inbox, makeFragment('f-1', new Date('2026-01-01')));
    const [updated, removed] = removeFragments(inbox, new Set(['unknown']));
    expect(updated.fragments).toHaveLength(1);
    expect(removed).toEqual([]);
  });

  it('returns the inbox unchanged when the id set is empty', () => {
    let inbox = createInboxSpace();
    inbox = addFragment(inbox, makeFragment('f-1', new Date('2026-01-01')));
    const [updated, removed] = removeFragments(inbox, new Set());
    expect(updated).toBe(inbox);
    expect(removed).toEqual([]);
  });
});
