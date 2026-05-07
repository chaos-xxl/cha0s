import type { Fragment } from '../types/fragment.js';
import type { FragmentCluster } from '../types/fragment-cluster.js';
import type { InboxSpace } from '../types/inbox-space.js';
import { removeFragments } from '../types/inbox-space.js';
import type { Message } from '../types/message.js';
import type { Id } from '../types/primitives.js';
import type { TopicSpace } from '../types/topic-space.js';

/**
 * Error raised when a packaging transaction cannot complete cleanly.
 *
 * The executor guarantees "all or nothing": if any invariant check
 * fails, no state changes are applied and the caller sees a typed
 * error describing what went wrong.
 */
export class PackagingError extends Error {
  readonly kind: 'emptyCluster' | 'incompleteTransfer';

  constructor(kind: 'emptyCluster' | 'incompleteTransfer', message?: string) {
    super(message ?? defaultMessage(kind));
    this.kind = kind;
    this.name = 'PackagingError';
  }
}

function defaultMessage(kind: 'emptyCluster' | 'incompleteTransfer'): string {
  switch (kind) {
    case 'emptyCluster':
      return 'Cannot package an empty cluster: no fragments, or no messages inside the fragments.';
    case 'incompleteTransfer':
      return 'Packaging failed: some fragments could not be moved out of the inbox cleanly.';
  }
}

/**
 * Result of a successful packaging transaction.
 */
export interface PackagingResult {
  /** The freshly created topic space, containing all packaged messages. */
  readonly newSpace: TopicSpace;
  /** The inbox with the packaged fragments cut out. */
  readonly updatedInbox: InboxSpace;
}

/**
 * Options for constructing a {@link PackagingExecutor}.
 */
export interface PackagingExecutorOptions {
  /**
   * Generator for new topic space ids. Called exactly once per
   * successful {@link PackagingExecutor.execute} invocation.
   *
   * Default: ISO timestamp + short random suffix. Replace with UUIDs
   * or host-provided ids in tests and production.
   */
  readonly idGenerator?: () => Id;

  /**
   * Clock for timestamping the new space when messages have no
   * timestamps (edge case). Default: `new Date()`.
   */
  readonly clock?: () => Date;
}

/**
 * Turn a dense {@link FragmentCluster} into a brand-new
 * {@link TopicSpace}, transactionally moving its fragments out of the
 * inbox at the same time.
 *
 * ## Contract
 *
 * `execute(cluster, inbox)` returns `{ newSpace, updatedInbox }` on
 * success. On failure, it throws {@link PackagingError} and neither
 * input is modified. Callers should:
 *
 *   1. Persist `newSpace` into their topic-space store.
 *   2. Replace the old inbox with `updatedInbox`.
 *
 * Both steps must succeed or the caller must roll back themselves —
 * this executor guards its own invariants but has no visibility into
 * the host persistence layer.
 *
 * ## Design note: cut, not copy
 *
 * Packaging is a move operation: the fragments disappear from the
 * inbox. This is the deliberate choice that keeps the inbox clean.
 * Duplicate history would confuse both users and downstream
 * summarisers.
 */
export class PackagingExecutor {
  private readonly idGenerator: () => Id;
  private readonly clock: () => Date;

  constructor(options: PackagingExecutorOptions = {}) {
    this.idGenerator = options.idGenerator ?? defaultIdGenerator;
    this.clock = options.clock ?? (() => new Date());
  }

  execute(cluster: FragmentCluster, inbox: InboxSpace): PackagingResult {
    // Invariant 1: the cluster must carry at least one fragment with
    // at least one message.
    if (cluster.fragments.length === 0) {
      throw new PackagingError('emptyCluster');
    }
    const expectedMessages: Message[] = [];
    for (const fragment of cluster.fragments) {
      for (const message of fragment.messages) {
        expectedMessages.push(message);
      }
    }
    if (expectedMessages.length === 0) {
      throw new PackagingError('emptyCluster');
    }

    // Invariant 2: every cluster fragment must be present in the
    // inbox. Packaging a ghost cluster is a programmer bug.
    const inboxIds = new Set(inbox.fragments.map((f) => f.id));
    for (const fragment of cluster.fragments) {
      if (!inboxIds.has(fragment.id)) {
        throw new PackagingError('incompleteTransfer');
      }
    }

    // Build the new space. Messages sorted by timestamp ascending.
    const sortedMessages = [...expectedMessages].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
    const earliest = sortedMessages[0]!.timestamp;
    const latest = sortedMessages[sortedMessages.length - 1]!.timestamp;

    const newSpace: TopicSpace = {
      id: this.idGenerator(),
      name: cluster.suggestedName,
      keywords: [...cluster.themeKeywords],
      createdDate: earliest,
      lastActivityDate: latest,
      creationSource: 'packaging',
      status: 'active',
      messages: sortedMessages,
    };

    // Invariant 3: the new space must contain every expected message.
    // Defensive check: sort should never drop messages, but we verify
    // ids as a cheap correctness guarantee.
    if (newSpace.messages.length !== expectedMessages.length) {
      throw new PackagingError('incompleteTransfer');
    }
    const newIds = new Set<Id>(newSpace.messages.map((m) => m.id));
    for (const msg of expectedMessages) {
      if (!newIds.has(msg.id)) {
        throw new PackagingError('incompleteTransfer');
      }
    }

    // Cut the fragments out of the inbox.
    const fragmentIds = new Set<Id>(cluster.fragments.map((f) => f.id));
    const [updatedInbox, removed] = removeFragments(inbox, fragmentIds);

    // Invariant 4: every cluster fragment must actually have been
    // removed (ids matched).
    if (removed.length !== cluster.fragments.length) {
      throw new PackagingError('incompleteTransfer');
    }

    return { newSpace, updatedInbox };
  }
}

let idSequence = 0;

function defaultIdGenerator(): Id {
  idSequence++;
  return `space-${Date.now().toString(36)}-${idSequence}`;
}

// Re-export a type name consistent with the Swift reference ("packaging")
// even though the executor is also named 'Packaging' — avoids an import
// dance for consumers that only need the cluster shape.
export type { Fragment };
