import type { RoutingConfiguration } from '../config/routing-configuration.js';
import type { Fragment } from '../types/fragment.js';
import type { FragmentCluster } from '../types/fragment-cluster.js';
import type { IntentSignal } from '../types/primitives.js';
import type { TopicSpace } from '../types/topic-space.js';

/**
 * A plug-in that scores how relevant a message is to an existing topic
 * space, and decides whether a message is "interesting enough" to seed
 * a brand-new space.
 *
 * The default implementation is {@link KeywordMatchingStrategy}, which
 * uses keyword overlap. Adapter packages (e.g. `@cha0s-ai/openai`) ship
 * embedding-based strategies by implementing this same interface.
 *
 * Implementations should be pure: the same inputs must yield the same
 * outputs. State (if any) belongs in the configuration, not in the
 * instance.
 */
export interface RoutingStrategy {
  /**
   * Score a message's relevance to a given topic space, in the range
   * `[0, 1]`. Higher means "this message belongs here".
   *
   * Implementations must handle empty or punctuation-only messages by
   * returning 0, and must tolerate topic spaces with no keywords.
   */
  relevanceScore(message: string, topicSpace: TopicSpace): number;

  /**
   * Decide whether a message is substantive enough to seed a new topic
   * space when no existing space scores above the confidence threshold.
   *
   * Implementations typically check length and content diversity.
   */
  isNewTopicWorthy(message: string, existingSpaces: readonly TopicSpace[]): boolean;
}

/**
 * A plug-in that groups inbox fragments into candidate clusters, and
 * decides whether a cluster is dense enough to be packaged into a new
 * topic space.
 *
 * The default implementation is {@link KeywordClusteringStrategy},
 * which uses keyword co-occurrence. Embedding-based clusterers are the
 * obvious upgrade path.
 */
export interface ClusteringStrategy {
  /**
   * Evaluate the given fragments and produce candidate clusters.
   *
   * The return order is not guaranteed — callers that care about
   * priority should sort by {@link FragmentCluster.coherenceScore}
   * explicitly.
   */
  evaluateClusters(fragments: readonly Fragment[]): FragmentCluster[];

  /**
   * Decide whether a cluster is dense enough to promote into a new
   * topic space. Typically compares `cluster.fragments.length` against
   * {@link RoutingConfiguration.packagingDensityThreshold}.
   */
  meetsPackagingThreshold(cluster: FragmentCluster): boolean;
}

/**
 * A plug-in that inspects a raw user message and classifies it as one
 * of the four {@link IntentSignal} variants.
 *
 * The detector runs before the relevance scorer, so that obvious
 * continuation cues, throwaways, and trivia can short-circuit the more
 * expensive similarity computation.
 */
export interface SignalDetecting {
  /**
   * Classify the intent signal carried by a message. Must return a
   * defined {@link IntentSignal} even for empty input (typically
   * `{ kind: 'normal' }`).
   */
  detectSignal(message: string): IntentSignal;
}

/**
 * A plug-in that computes a time-based weight describing how much a
 * topic space's age should reduce its relevance score.
 *
 * The returned factor is in `[0, 1]`, where `1` means "no decay" and
 * `0` means "so old it should be ignored". The default implementation
 * uses exponential decay with a half-life taken from
 * {@link RoutingConfiguration.timeDecayHalfLifeSeconds}.
 */
export interface TimeDecayCalculating {
  /**
   * Compute the decay factor for the time interval between
   * `lastActivity` and `now`. Implementations should tolerate
   * `lastActivity > now` (clock skew) by returning `1`.
   */
  decayFactor(lastActivity: Date, now: Date): number;
}
