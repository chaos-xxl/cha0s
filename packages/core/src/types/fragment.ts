import type { Id } from './primitives.js';
import type { Message } from './message.js';

/**
 * A `Fragment` is a short, coherent burst of messages that has not yet
 * earned its own {@link TopicSpace}.
 *
 * Fragments live inside the {@link InboxSpace} — the catch-all area for
 * conversations that are too small, too one-off, or too off-topic to
 * belong to an existing space. They are the raw material that clustering
 * later packages into new topic spaces.
 *
 * A typical fragment is a question/answer pair (two messages) but it may
 * be longer if the interaction is continuous. What makes a fragment
 * distinct from a stream of messages is that the clustering engine
 * treats it as an indivisible unit: fragments are never broken apart,
 * only grouped.
 */
export interface Fragment {
  /** Stable unique identifier for the fragment. */
  readonly id: Id;

  /**
   * The messages that make up this fragment, in chronological order.
   * Typically a `user` message followed by an `assistant` reply, but
   * may contain more turns if the exchange is continuous.
   */
  readonly messages: readonly Message[];

  /**
   * The timestamp of the first message in the fragment. Exposed as a
   * top-level field so that inbox operations (sorting, filtering) do
   * not need to peek into `messages[0]`.
   */
  readonly timestamp: Date;

  /**
   * Keywords extracted from the fragment's content, used as input to
   * the clustering strategy. May be empty if keyword extraction has
   * not yet run.
   */
  readonly keywords: readonly string[];

  /**
   * An optional hint left by the clustering engine indicating which
   * emerging cluster (if any) this fragment leans toward. This is a
   * soft suggestion — the router and clustering engine remain free to
   * reconsider.
   */
  readonly clusterHint?: string;
}
