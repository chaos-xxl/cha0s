import {
  defaultRoutingConfiguration,
  type RoutingConfiguration,
} from '../config/routing-configuration.js';
import type { TopicSpace } from '../types/topic-space.js';
import type { RoutingStrategy } from './interfaces.js';

/**
 * Threshold used by {@link KeywordMatchingStrategy.isNewTopicWorthy}:
 * a message is only considered "worth its own new space" if it scores
 * at or below this against every existing space.
 *
 * Exposed as a named constant so the meaning of the number is not a
 * mystery at the call site, and so tests can reference it directly.
 */
export const NEW_TOPIC_MAX_EXISTING_SCORE = 0.3;

/**
 * A deliberately simple routing strategy based on keyword hit ratio.
 *
 * This is the MVP strategy — the one you get out of the box when you
 * `new Clinic()` without plugging in anything smarter. It exists for
 * three reasons:
 *
 *  1. Zero dependencies. No embeddings, no LLM calls — Doctor Chaos
 *     works offline and without API keys.
 *  2. Predictable. The score is a flat fraction of keyword hits, so
 *     you can reason about routing decisions with a calculator.
 *  3. Fast. Good enough as a baseline; embedding-backed strategies
 *     shipping in adapter packages strictly improve on this.
 *
 * The scoring formula is intentionally trivial:
 * ```
 *   relevance = (# keywords of the space that appear in the message)
 *               / (# keywords of the space)
 * ```
 *
 * A smarter TF-IDF / BM25 / cosine scorer belongs in a separate
 * strategy (and in an adapter package), not here.
 */
export class KeywordMatchingStrategy implements RoutingStrategy {
  private readonly configuration: RoutingConfiguration;

  constructor(configuration: RoutingConfiguration = defaultRoutingConfiguration) {
    this.configuration = configuration;
  }

  relevanceScore(message: string, topicSpace: TopicSpace): number {
    const trimmed = message.trim();
    if (trimmed.length === 0) return 0;
    if (isPurePunctuation(trimmed)) return 0;
    if (topicSpace.keywords.length === 0) return 0;

    const messageLower = trimmed.toLowerCase();
    let hits = 0;
    for (const keyword of topicSpace.keywords) {
      const kLower = keyword.toLowerCase();
      if (messageLower.includes(kLower)) {
        hits++;
      }
    }
    const raw = hits / topicSpace.keywords.length;
    return clamp(raw, 0, 1);
  }

  isNewTopicWorthy(message: string, existingSpaces: readonly TopicSpace[]): boolean {
    const trimmed = message.trim();
    if (trimmed.length < this.configuration.newTopicMinLength) {
      return false;
    }
    let maxScore = 0;
    for (const space of existingSpaces) {
      const score = this.relevanceScore(message, space);
      if (score > maxScore) maxScore = score;
    }
    return maxScore <= NEW_TOPIC_MAX_EXISTING_SCORE;
  }
}

/**
 * Whether a string has no alphanumeric or CJK characters — used to
 * short-circuit empty routing work on punctuation-only inputs.
 */
function isPurePunctuation(text: string): boolean {
  // Any letter, digit, or CJK-ish codepoint disqualifies the string.
  // Range covers ASCII alnum, common Latin extensions, and CJK unified.
  return !/[\p{L}\p{N}]/u.test(text);
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
