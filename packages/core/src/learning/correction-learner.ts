import { extractKeywords } from '../keywords/extract-keywords.js';
import type { RoutingCorrection } from '../types/routing-correction.js';
import type { TopicSpace } from '../types/topic-space.js';

/**
 * Options for constructing a {@link CorrectionLearner}.
 */
export interface CorrectionLearnerOptions {
  /**
   * Seed corrections (e.g. rehydrated from persistent storage).
   */
  readonly corrections?: readonly RoutingCorrection[];

  /**
   * How much each matching past correction nudges the score. Defaults
   * to 0.1 per match. Raising this makes the learner more aggressive
   * (fast adaptation, more volatility); lowering makes it more
   * conservative.
   */
  readonly boostPerMatch?: number;

  /**
   * How many shared keywords two messages need before they count as
   * "similar" for the purpose of this learner. Default: 2.
   */
  readonly similarityThreshold?: number;
}

/**
 * Turns past user overrides into a score adjustment signal.
 *
 * ## How it works
 *
 * When a user moves a message from space A to space B, the learner
 * stores a {@link RoutingCorrection}. On the next similar message:
 *
 * - Past corrections where the user moved a similar message **to**
 *   the candidate space → boost the candidate's score.
 * - Past corrections where the user moved a similar message **away
 *   from** the candidate space → reduce the candidate's score.
 *
 * "Similar" means the two messages share at least
 * {@link CorrectionLearnerOptions.similarityThreshold} keywords
 * (extracted via {@link extractKeywords}).
 *
 * ## Storage
 *
 * The MVP keeps corrections in memory. Host applications that need
 * durability can:
 *   - pass a hydrated array via `options.corrections`, and
 *   - snapshot via {@link CorrectionLearner.export} on persist.
 *
 * Future versions may introduce a pluggable store interface.
 */
export class CorrectionLearner {
  private readonly corrections: RoutingCorrection[];
  private readonly boostPerMatch: number;
  private readonly similarityThreshold: number;

  constructor(options: CorrectionLearnerOptions = {}) {
    this.corrections = options.corrections ? [...options.corrections] : [];
    this.boostPerMatch = options.boostPerMatch ?? 0.1;
    this.similarityThreshold = options.similarityThreshold ?? 2;
  }

  /**
   * Record a new user override.
   */
  record(correction: RoutingCorrection): void {
    this.corrections.push(correction);
  }

  /**
   * Snapshot the current correction history. Intended for
   * serialisation to persistent storage.
   */
  export(): RoutingCorrection[] {
    return [...this.corrections];
  }

  /**
   * Number of corrections currently held.
   */
  get size(): number {
    return this.corrections.length;
  }

  /**
   * Adjust a candidate space's routing score based on past corrections.
   *
   * The result is clamped to `[0, 1]`.
   *
   * @param baseScore   - The score produced by the routing strategy,
   *                      before any correction adjustment.
   * @param message     - The current message being routed.
   * @param candidate   - The candidate topic space whose score is
   *                      being adjusted.
   */
  adjustScore(baseScore: number, message: string, candidate: TopicSpace): number {
    const messageKeywords = new Set(extractKeywords(message));
    if (messageKeywords.size === 0) {
      return clamp(baseScore);
    }

    let adjustment = 0;
    for (const correction of this.corrections) {
      const pastKeywords = new Set(extractKeywords(correction.messageContent));
      let shared = 0;
      for (const kw of messageKeywords) {
        if (pastKeywords.has(kw)) shared++;
      }
      if (shared < this.similarityThreshold) continue;

      if (correction.correctedDestination === candidate.id) {
        adjustment += this.boostPerMatch;
      } else if (correction.originalDestination === candidate.id) {
        adjustment -= this.boostPerMatch;
      }
    }

    return clamp(baseScore + adjustment);
  }
}

function clamp(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
