import { describe, expect, it } from 'vitest';
import { addFragment, createInboxSpace } from '../types/inbox-space.js';
import type { Fragment } from '../types/fragment.js';
import type { Message } from '../types/message.js';
import type { FragmentCluster } from '../types/fragment-cluster.js';
import { PackagingError, PackagingExecutor } from './packaging-executor.js';

const BASE = new Date('2026-05-07T10:00:00Z');

function makeMessage(id: string, offsetMs: number): Message {
  return {
    id,
    role: 'user',
    content: id,
    timestamp: new Date(BASE.getTime() + offsetMs),
  };
}

function makeFragment(
  id: string,
  msgIds: string[],
  offsetMs: number,
  keywords: string[] = [],
): Fragment {
  return {
    id,
    messages: msgIds.map((m, i) => makeMessage(m, offsetMs + i * 1000)),
    timestamp: new Date(BASE.getTime() + offsetMs),
    keywords,
  };
}

describe('PackagingExecutor.execute', () => {
  const executor = new PackagingExecutor({
    idGenerator: () => 'space-new',
    clock: () => BASE,
  });

  it('throws emptyCluster when no fragments are provided', () => {
    const cluster: FragmentCluster = {
      fragments: [],
      themeKeywords: ['x'],
      coherenceScore: 0,
      suggestedName: 'x',
    };
    const inbox = createInboxSpace();
    expect(() => executor.execute(cluster, inbox)).toThrow(PackagingError);
  });

  it('throws emptyCluster when fragments exist but none contains messages', () => {
    const cluster: FragmentCluster = {
      fragments: [{ id: 'f-1', messages: [], timestamp: BASE, keywords: [] }],
      themeKeywords: [],
      coherenceScore: 0,
      suggestedName: 'x',
    };
    const inbox = addFragment(createInboxSpace(), cluster.fragments[0]!);
    expect(() => executor.execute(cluster, inbox)).toThrow(PackagingError);
  });

  it('creates a new space containing all messages, sorted chronologically', () => {
    const f1 = makeFragment('f-1', ['m3', 'm4'], 3000, ['travel']);
    const f2 = makeFragment('f-2', ['m1', 'm2'], 1000, ['travel']);
    let inbox = createInboxSpace();
    inbox = addFragment(inbox, f1);
    inbox = addFragment(inbox, f2);

    const cluster: FragmentCluster = {
      fragments: [f1, f2],
      themeKeywords: ['travel'],
      coherenceScore: 0.9,
      suggestedName: 'Travel Planning',
    };
    const { newSpace, updatedInbox } = executor.execute(cluster, inbox);

    expect(newSpace.id).toBe('space-new');
    expect(newSpace.name).toBe('Travel Planning');
    expect(newSpace.creationSource).toBe('packaging');
    expect(newSpace.status).toBe('active');
    expect(newSpace.keywords).toEqual(['travel']);
    expect(newSpace.messages.map((m) => m.id)).toEqual(['m1', 'm2', 'm3', 'm4']);

    expect(updatedInbox.fragments).toHaveLength(0);
    expect(updatedInbox.totalMessageCount).toBe(0);
  });

  it('sets createdDate to earliest message, lastActivityDate to latest', () => {
    const f = makeFragment('f-1', ['a', 'b', 'c'], 0);
    let inbox = createInboxSpace();
    inbox = addFragment(inbox, f);
    const cluster: FragmentCluster = {
      fragments: [f],
      themeKeywords: [],
      coherenceScore: 1,
      suggestedName: 'x',
    };
    const { newSpace } = executor.execute(cluster, inbox);
    expect(newSpace.createdDate.getTime()).toBe(f.messages[0]!.timestamp.getTime());
    expect(newSpace.lastActivityDate.getTime()).toBe(f.messages[2]!.timestamp.getTime());
  });

  it('is transactional: does not mutate the input inbox on success', () => {
    const f = makeFragment('f-1', ['a', 'b'], 0);
    const originalInbox = addFragment(createInboxSpace(), f);
    const cluster: FragmentCluster = {
      fragments: [f],
      themeKeywords: [],
      coherenceScore: 1,
      suggestedName: 'x',
    };
    executor.execute(cluster, originalInbox);
    expect(originalInbox.fragments).toHaveLength(1);
    expect(originalInbox.totalMessageCount).toBe(2);
  });

  it('throws incompleteTransfer if the cluster references fragments not in the inbox', () => {
    const f = makeFragment('f-ghost', ['m1'], 0);
    const inbox = createInboxSpace(); // empty
    const cluster: FragmentCluster = {
      fragments: [f],
      themeKeywords: [],
      coherenceScore: 1,
      suggestedName: 'x',
    };
    expect(() => executor.execute(cluster, inbox)).toThrow(PackagingError);
  });
});
