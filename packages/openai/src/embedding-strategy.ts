import type { RoutingStrategy, TopicSpace } from '@doctorchaos-ai/core';
import { OpenAiEmbeddingClient, type OpenAiEmbeddingClientOptions } from './client.js';
import { averageVectors, cosineSimilarity, toRoutingScore } from './math.js';

/**
 * Options accepted by {@link openaiEmbedding}.
 *
 * Extends {@link OpenAiEmbeddingClientOptions} with strategy-level
 * controls. Most users pass just `{ apiKey }`.
 */
export interface OpenAiEmbeddingStrategyOptions extends OpenAiEmbeddingClientOptions {
  /**
   * Messages shorter than this character count are deemed too thin to
   * seed a new topic space, regardless of how little they match any
   * existing space.
   *
   * Default: 20. Aligns with the keyword strategy's behaviour so that
   * swapping strategies does not shift new-space rates unexpectedly.
   */
  readonly newTopicMinLength?: number;

  /**
   * If the top existing-space similarity score is at or below this
   * threshold AND the message is long enough, the strategy will
   * report the message as "new-topic-worthy".
   *
   * Default: 0.3. Matches the keyword strategy's behaviour.
   */
  readonly newTopicMaxExistingScore?: number;

  /**
   * Optional pre-built client. Use this to share a client (and its
   * cache) across multiple strategies — for example, a routing
   * strategy and a clustering strategy that hit the same vectors.
   */
  readonly client?: OpenAiEmbeddingClient;
}

/**
 * RoutingStrategy implementation that uses OpenAI embeddings to score
 * how well a message fits a topic space.
 *
 * ## How it scores
 *
 * 1. The message is embedded via `text-embedding-3-small` (default).
 * 2. Each topic space's keywords are embedded (cached; the first time
 *    is the only expensive time).
 * 3. The space's centroid vector is the mean of its keyword vectors.
 * 4. Cosine similarity between message vector and space centroid is
 *    clamped to `[0, 1]` and returned.
 *
 * Spaces with no keywords return 0 — we can't compare against nothing.
 * That matches the default keyword strategy's behaviour.
 *
 * ## Why keywords and not full message history
 *
 *  1. **Cost**: a single space might have hundreds of messages.
 *     Embedding all of them on every routing call would be 10x+ the
 *     cost of embedding the (usually <20) keywords.
 *  2. **Drift**: keywords describe what a space is *about*. Message
 *     history contains digressions, acknowledgements ('ok', 'thanks'),
 *     and one-off questions — averaging those dilutes the signal.
 *
 * Host applications that want full-history matching can fork or wrap
 * this class; the client, cache, and math helpers are all exported.
 */
export class OpenAiEmbeddingStrategy implements RoutingStrategy {
  readonly client: OpenAiEmbeddingClient;
  private readonly newTopicMinLength: number;
  private readonly newTopicMaxExistingScore: number;

  constructor(options: OpenAiEmbeddingStrategyOptions) {
    this.client = options.client ?? new OpenAiEmbeddingClient(options);
    this.newTopicMinLength = options.newTopicMinLength ?? 20;
    this.newTopicMaxExistingScore = options.newTopicMaxExistingScore ?? 0.3;
  }

  async relevanceScore(message: string, topicSpace: TopicSpace): Promise<number> {
    const trimmed = message.trim();
    if (trimmed.length === 0) return 0;
    if (topicSpace.keywords.length === 0) return 0;

    const [messageVec, keywordVecs] = await Promise.all([
      this.client.embed(trimmed),
      this.client.embedBatch(topicSpace.keywords),
    ]);
    if (messageVec.length === 0) return 0;
    const centroid = averageVectors(keywordVecs);
    if (centroid.length === 0) return 0;
    return toRoutingScore(cosineSimilarity(messageVec, centroid));
  }

  async isNewTopicWorthy(message: string, existingSpaces: readonly TopicSpace[]): Promise<boolean> {
    const trimmed = message.trim();
    if (trimmed.length < this.newTopicMinLength) return false;
    if (existingSpaces.length === 0) return true;
    let maxScore = 0;
    for (const space of existingSpaces) {
      const score = await this.relevanceScore(message, space);
      if (score > maxScore) maxScore = score;
    }
    return maxScore <= this.newTopicMaxExistingScore;
  }
}

/**
 * Shorthand constructor matching the verb-oriented factory style used
 * elsewhere in Doctor Chaos:
 *
 * ```ts
 * import { openaiEmbedding } from '@doctorchaos-ai/openai';
 *
 * const clinic = new Clinic({
 *   engineOptions: {
 *     matchingStrategy: openaiEmbedding({
 *       apiKey: process.env.OPENAI_API_KEY!,
 *     }),
 *   },
 * });
 * ```
 */
export function openaiEmbedding(options: OpenAiEmbeddingStrategyOptions): OpenAiEmbeddingStrategy {
  return new OpenAiEmbeddingStrategy(options);
}
