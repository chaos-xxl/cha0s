import {
  defaultRoutingConfiguration,
  type RoutingConfiguration,
} from '../config/routing-configuration.js';
import type { TopicSpace } from '../types/topic-space.js';

/**
 * A suggested lifecycle action emitted by {@link TopicSpaceLifecycleManager.evaluate}.
 *
 * The manager only recommends — the host application (or the Cha0s
 * facade) decides whether to apply them. This split matters in the
 * rare case a host wants to override or log before acting.
 */
export type LifecycleAction =
  | { kind: 'archive'; space: TopicSpace }
  | { kind: 'reactivate'; space: TopicSpace }
  | { kind: 'merge'; source: TopicSpace; target: TopicSpace }
  | { kind: 'rename'; space: TopicSpace; newName: string };

/**
 * Options for constructing a {@link TopicSpaceLifecycleManager}.
 */
export interface LifecycleManagerOptions {
  readonly configuration?: RoutingConfiguration;
  /**
   * Clock used to compute "how long ago was this space last active".
   * Replace in tests to simulate time passing.
   */
  readonly clock?: () => Date;
}

/**
 * Manages the lifecycle of topic spaces: archival of stale ones,
 * reactivation of sleeping ones, and merging of duplicates.
 *
 * All execution methods are pure — they return a new {@link TopicSpace}
 * and never mutate the input. This lets host applications apply actions
 * atomically and keep undo stacks cheap.
 */
export class TopicSpaceLifecycleManager {
  private readonly configuration: RoutingConfiguration;
  private readonly clock: () => Date;

  constructor(options: LifecycleManagerOptions = {}) {
    this.configuration = options.configuration ?? defaultRoutingConfiguration;
    this.clock = options.clock ?? (() => new Date());
  }

  /**
   * Scan all spaces and propose lifecycle transitions.
   *
   * MVP policy: any `active` space whose `lastActivityDate` is older
   * than {@link RoutingConfiguration.archiveInactivityDays} is
   * recommended for archival. Future versions may add merge and
   * rename heuristics.
   */
  evaluate(spaces: readonly TopicSpace[]): LifecycleAction[] {
    const now = this.clock();
    const thresholdMs = this.configuration.archiveInactivityDays * 24 * 60 * 60 * 1000;
    const actions: LifecycleAction[] = [];
    for (const space of spaces) {
      if (space.status !== 'active') continue;
      const elapsed = now.getTime() - space.lastActivityDate.getTime();
      if (elapsed >= thresholdMs) {
        actions.push({ kind: 'archive', space });
      }
    }
    return actions;
  }

  /**
   * Archive a space: retain all messages and metadata, flip its status
   * to `archived`.
   */
  archive(space: TopicSpace): TopicSpace {
    return { ...space, status: 'archived' };
  }

  /**
   * Reactivate a space: flip status back to `active` and refresh
   * `lastActivityDate` to now.
   */
  reactivate(space: TopicSpace): TopicSpace {
    return {
      ...space,
      status: 'active',
      lastActivityDate: this.clock(),
    };
  }

  /**
   * Merge `source` into `target`. The returned space keeps `target`'s
   * id and name (and any other identity-bearing fields the host cares
   * about); only the aggregated content changes.
   *
   * Aggregation rules:
   * - messages: concatenated and sorted by timestamp ascending.
   * - keywords: union, keeping target's order then appending new source keywords.
   * - lastActivityDate: the later of the two.
   * - createdDate: the earlier of the two.
   * - contextSummary: concatenated with a blank line separator if both present.
   *
   * The source space itself is NOT modified; callers typically mark it
   * as `merged` separately (e.g. via a subsequent call to set its
   * status).
   */
  merge(source: TopicSpace, target: TopicSpace): TopicSpace {
    const mergedMessages = [...target.messages, ...source.messages].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    const seen = new Set<string>();
    const mergedKeywords: string[] = [];
    for (const keyword of [...target.keywords, ...source.keywords]) {
      if (!seen.has(keyword)) {
        seen.add(keyword);
        mergedKeywords.push(keyword);
      }
    }

    const latest = new Date(
      Math.max(target.lastActivityDate.getTime(), source.lastActivityDate.getTime()),
    );
    const earliest = new Date(Math.min(target.createdDate.getTime(), source.createdDate.getTime()));

    const mergedSummary = joinSummaries(target.contextSummary, source.contextSummary);

    return {
      id: target.id,
      name: target.name,
      keywords: mergedKeywords,
      createdDate: earliest,
      lastActivityDate: latest,
      creationSource: target.creationSource,
      status: 'active',
      ...(mergedSummary !== undefined && { contextSummary: mergedSummary }),
      messages: mergedMessages,
    };
  }

  /**
   * Rename a space. Returns a new space with the updated name.
   */
  rename(space: TopicSpace, newName: string): TopicSpace {
    return { ...space, name: newName };
  }
}

function joinSummaries(a: string | undefined, b: string | undefined): string | undefined {
  if (a === undefined && b === undefined) return undefined;
  if (a !== undefined && b === undefined) return a;
  if (a === undefined && b !== undefined) return b;
  return `${a}\n\n${b}`;
}
