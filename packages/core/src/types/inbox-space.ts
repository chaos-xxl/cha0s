import type { Id } from './primitives.js';
import type { Fragment } from './fragment.js';

/**
 * The catch-all staging area for conversation material that has not
 * (yet) been assigned to a {@link TopicSpace}.
 *
 * ## Why it exists
 *
 * Real conversations are messy. Users say things that are too short,
 * too one-off, or too orthogonal to any current topic to deserve their
 * own space. Rather than force a premature decision, cha0s accumulates
 * these as {@link Fragment} entries in the inbox. The clustering engine
 * then periodically inspects the inbox looking for emergent topics,
 * and when a cluster is dense enough, "packages" it into a new
 * {@link TopicSpace} — at which point the fragments are *moved out*
 * (not copied) to keep the inbox lean.
 *
 * ## Design note: cut, not copy
 *
 * Packaging is deliberately a move operation. Duplicate history would
 * confuse both the user and any downstream summariser. The inbox is an
 * antechamber, not an archive.
 */
export interface InboxSpace {
  /**
   * Stable unique identifier. Typically a single well-known constant
   * per user (e.g. `"inbox"`), but represented as an {@link Id} so that
   * multi-tenant deployments can carry a user- or session-scoped value.
   */
  readonly id: Id;

  /**
   * The fragments currently held in the inbox, sorted by their
   * {@link Fragment.timestamp} ascending. New fragments are inserted
   * in chronological order (see {@link addFragment}); packaged
   * fragments are removed (see {@link removeFragments}).
   */
  readonly fragments: readonly Fragment[];

  /**
   * A running total of message count across all fragments currently in
   * the inbox. Maintained incrementally to avoid O(n) recomputation on
   * every read (inbox dashboards and lifecycle policies read this
   * frequently).
   */
  readonly totalMessageCount: number;
}

/**
 * Create an empty inbox with the given id.
 *
 * @param id - Identifier for the inbox. Defaults to `"inbox"` which is
 *             suitable for single-user host applications.
 */
export function createInboxSpace(id: Id = 'inbox'): InboxSpace {
  return {
    id,
    fragments: [],
    totalMessageCount: 0,
  };
}

/**
 * Insert a new fragment into the inbox, preserving chronological order.
 *
 * Returns a new inbox — the input is not mutated. This is the only way
 * to add content to an inbox; it guarantees the sort invariant holds.
 */
export function addFragment(inbox: InboxSpace, fragment: Fragment): InboxSpace {
  const insertIndex = inbox.fragments.findIndex((f) => f.timestamp > fragment.timestamp);
  const next =
    insertIndex === -1
      ? [...inbox.fragments, fragment]
      : [...inbox.fragments.slice(0, insertIndex), fragment, ...inbox.fragments.slice(insertIndex)];
  return {
    id: inbox.id,
    fragments: next,
    totalMessageCount: inbox.totalMessageCount + fragment.messages.length,
  };
}

/**
 * Remove fragments from the inbox by id — the "cut" half of packaging.
 *
 * Returns a tuple: `[updatedInbox, removedFragments]`. The caller is
 * responsible for placing the removed fragments elsewhere (typically by
 * assembling them into a new {@link TopicSpace}). Unknown ids are
 * silently ignored.
 */
export function removeFragments(inbox: InboxSpace, ids: ReadonlySet<Id>): [InboxSpace, Fragment[]] {
  if (ids.size === 0) {
    return [inbox, []];
  }
  const removed: Fragment[] = [];
  const kept: Fragment[] = [];
  for (const fragment of inbox.fragments) {
    if (ids.has(fragment.id)) {
      removed.push(fragment);
    } else {
      kept.push(fragment);
    }
  }
  const removedMessageCount = removed.reduce((sum, f) => sum + f.messages.length, 0);
  const updated: InboxSpace = {
    id: inbox.id,
    fragments: kept,
    totalMessageCount: inbox.totalMessageCount - removedMessageCount,
  };
  return [updated, removed];
}
