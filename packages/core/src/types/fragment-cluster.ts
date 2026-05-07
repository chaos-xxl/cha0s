import type { Fragment } from './fragment.js';

/**
 * A candidate grouping of {@link Fragment}s proposed by the clustering
 * engine.
 *
 * A `FragmentCluster` represents "these fragments look like they might
 * belong together — consider packaging them into a new topic space".
 * The router and packaging executor decide whether to act on the
 * proposal based on {@link coherenceScore} and the configured
 * packaging threshold.
 *
 * Clusters are disposable: they are recomputed whenever the inbox
 * changes materially, and are not persisted.
 */
export interface FragmentCluster {
  /**
   * The fragments that make up the cluster, in chronological order.
   */
  readonly fragments: readonly Fragment[];

  /**
   * The keywords that characterise the cluster, ordered from most
   * representative to least. Typically the intersection or frequent
   * co-occurrence of each fragment's own keywords.
   */
  readonly themeKeywords: readonly string[];

  /**
   * A score in `[0, 1]` describing how tightly the fragments cohere
   * around a shared subject. `0` means the grouping is incidental;
   * `1` means every fragment shares the same dominant theme.
   * Packaging decisions compare this against a configured threshold.
   */
  readonly coherenceScore: number;

  /**
   * A suggested name for the topic space that would be created if this
   * cluster were packaged. Typically the top theme keyword, or a short
   * phrase derived from the fragments' content.
   */
  readonly suggestedName: string;
}
