import type { Id } from './primitives.js';

/**
 * A record of the user overriding the router's placement decision.
 *
 * Corrections are the primary training signal for improving routing
 * quality over time. Each correction captures enough context to be
 * useful to both analytics ("how often do we get routing wrong?") and
 * learners ("given content X, prefer Y over Z").
 */
export interface RoutingCorrection {
  /** Stable unique identifier for the correction event. */
  readonly id: Id;

  /** The message whose placement was corrected. */
  readonly messageId: Id;

  /**
   * Where the router originally placed the message (topic space id or
   * `"inbox"`).
   */
  readonly originalDestination: string;

  /** Where the user moved the message to. */
  readonly correctedDestination: string;

  /** When the correction happened (not when the original message was sent). */
  readonly timestamp: Date;

  /**
   * The message content at the time of correction. Stored inline so the
   * correction remains interpretable even if the original message is
   * later deleted or edited.
   */
  readonly messageContent: string;
}
