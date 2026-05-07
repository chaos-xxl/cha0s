import type { Id } from './primitives.js';
import type { Message } from './message.js';

/**
 * How a topic space came into existence.
 *
 * The lineage matters for at least two reasons: (1) correction learners
 * weigh user-created spaces more heavily than auto-generated ones, and
 * (2) UI consumers may want to present "this space appeared on its own"
 * differently from "you created this".
 */
export type CreationSource =
  /** Packaged from an inbox fragment cluster by the clustering engine. */
  | 'packaging'
  /** Spun up directly by the router on a strong, high-confidence signal. */
  | 'direct'
  /** Created explicitly by the end-user (or host application). */
  | 'user'
  /** Seeded by the host application at startup (e.g. preset spaces). */
  | 'preset';

/**
 * The lifecycle state of a topic space.
 *
 * State transitions are managed by the lifecycle manager, but stored on
 * the space itself so that persistence layers see a single source of
 * truth.
 */
export type TopicStatus =
  /** Eligible for routing; visible in the user's active space list. */
  | 'active'
  /**
   * No recent activity — hidden from the active list but retained. A
   * future message matching this space will re-activate it.
   */
  | 'dormant'
  /** Hidden from routing and from the user, kept only for history. */
  | 'archived'
  /** Folded into another space; future lookups redirect to the target. */
  | 'merged';

/**
 * A coherent, ongoing conversation thread identified by cha0s.
 *
 * A `TopicSpace` represents a "room" dedicated to one evolving topic
 * (e.g. a trip being planned, a bug being debugged, a recipe being
 * tweaked). Messages flow into a space once the router determines they
 * belong there; the space carries its own message history, keywords,
 * and lifecycle state.
 *
 * ## UI separation
 *
 * Deliberately, this interface contains no presentation fields (no
 * colour, icon, position, or rendering hints). The goal of cha0s is to
 * expose conversation structure — how spaces should be *rendered* is a
 * concern of the host application, which may or may not have a visible
 * side-bar at all (e.g. an IM agent surfaces spaces implicitly by
 * swapping context per turn).
 *
 * Host applications that want to attach presentation data can do so in
 * their own storage layer, keyed by `id`.
 */
export interface TopicSpace {
  /** Stable unique identifier for the space. */
  readonly id: Id;

  /**
   * A short, human-readable label. Suggested by the router/clustering
   * engine on creation; may be edited by the user or host application
   * afterwards.
   */
  name: string;

  /**
   * Terms that characterise this space's subject. Used by the matching
   * strategy when scoring new messages against existing spaces.
   * Typically maintained automatically as messages arrive, but can be
   * overridden by the host application.
   */
  keywords: readonly string[];

  /** When the space was created. */
  readonly createdDate: Date;

  /**
   * When the last message was routed into this space. Drives the
   * time-decay factor when scoring and the lifecycle transitions
   * between `active` → `dormant` → `archived`.
   */
  lastActivityDate: Date;

  /** How this space came into existence. */
  readonly creationSource: CreationSource;

  /** Current lifecycle state — see {@link TopicStatus}. */
  status: TopicStatus;

  /**
   * Optional short summary of the space's contents. Not computed by
   * core; host applications may populate this (e.g. by running an LLM
   * summary over `messages` periodically).
   */
  contextSummary?: string;

  /**
   * The full message history of the space, in chronological order.
   * This is the context that agents receive when continuing a
   * conversation in this space.
   */
  messages: readonly Message[];
}
