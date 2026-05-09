import type { TopicSpace } from '../types/topic-space.js';
import type { RoutingStrategy } from './interfaces.js';
import type { EmbedFunction } from './llm-types.js';

/**
 * Options for {@link EmbedRoutingStrategy} and the {@link embedRouting}
 * factory.
 */
export interface EmbedRoutingStrategyOptions {
  /**
   * The embedding function. See {@link EmbedFunction}.
   */
  readonly embed: EmbedFunction;

  /**
   * Messages shorter than this character count are deemed too thin to
   * seed a new topic space, regardless of how little they match any
   * existing space. Default: 20.
   */
  readonly newTopicMinLength?: number;

  /**
   * If the top existing-space similarity score is at or below this
   * threshold AND the message is long enough, the strategy will
   * report the message as "new-topic-worthy". Default: 0.3.
   */
  readonly newTopicMaxExistingScore?: number;
}

/**
 * Provider-agnostic embedding-backed routing strategy.
 *
 * Where {@link LLMRoutingStrategy} asks a chat model for a verdict,
 * this strategy takes the numerical route: embed the message, embed
 * each space's keyword centroid, and rank by cosine similarity.
 *
 * ## Why it is here instead of the openai adapter package
 *
 * The adapter package ships a provider-specific class that also bakes
 * in caching, rate limiting, and the OpenAI HTTP protocol. This class
 * is the minimum viable path for any user who already has an embed
 * function from anywhere — a local model, a custom proxy, Cohere,
 * Voyage, whatever. Accepting a plain `EmbedFunction` keeps core
 * provider-agnostic while still offering a drop-in routing strategy.
 */
export class EmbedRoutingStrategy implements RoutingStrategy {
  private readonly embed: EmbedFunction;
  private readonly newTopicMinLength: number;
  private readonly newTopicMaxExistingScore: number;

  /**
   * Cache keyword-centroid vectors so repeated routing calls against
   * the same space do not re-embed the same keyword list. Keyed on a
   * canonical form of the keyword array.
   */
  private readonly centroidCache = new Map<string, number[]>();

  constructor(options: EmbedRoutingStrategyOptions) {
    this.embed = options.embed;
    this.newTopicMinLength = options.newTopicMinLength ?? 20;
    this.newTopicMaxExistingScore = options.newTopicMaxExistingScore ?? 0.3;
  }

  async relevanceScore(message: string, topicSpace: TopicSpace): Promise<number> {
    const trimmed = message.trim();
    if (trimmed.length === 0) return 0;
    if (topicSpace.keywords.length === 0) return 0;

    const [messageVec, centroid] = await Promise.all([
      this.embedOne(trimmed),
      this.getCentroid(topicSpace),
    ]);
    if (messageVec.length === 0 || centroid.length === 0) return 0;
    return clampScore(cosineSimilarity(messageVec, centroid));
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

  private async embedOne(text: string): Promise<number[]> {
    const [vec] = await this.embed([text]);
    return vec ?? [];
  }

  private async getCentroid(topicSpace: TopicSpace): Promise<number[]> {
    const cacheKey = topicSpace.keywords.slice().sort().join('\u0001');
    const cached = this.centroidCache.get(cacheKey);
    if (cached) return cached;

    const vectors = await this.embed(topicSpace.keywords);
    const centroid = averageVectors(vectors);
    this.centroidCache.set(cacheKey, centroid);
    return centroid;
  }
}

/**
 * Shorthand factory.
 *
 * ```ts
 * import { embedRouting } from '@doctorchaos-ai/core';
 *
 * const clinic = new Clinic({
 *   embed: async (texts) => myEmbedder.embedMany(texts),
 * });
 * // or equivalently:
 * const clinic = new Clinic({
 *   engineOptions: { matchingStrategy: embedRouting({ embed: ... }) },
 * });
 * ```
 */
export function embedRouting(options: EmbedRoutingStrategyOptions): EmbedRoutingStrategy {
  return new EmbedRoutingStrategy(options);
}

// ─── Math helpers ──────────────────────────────────────────────────

function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  const dim = Math.min(a.length, b.length);
  if (dim === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < dim; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function averageVectors(vectors: readonly (readonly number[])[]): number[] {
  const nonEmpty = vectors.filter((v) => v.length > 0);
  if (nonEmpty.length === 0) return [];
  const dim = nonEmpty[0]!.length;
  const sum = new Array<number>(dim).fill(0);
  let count = 0;
  for (const v of nonEmpty) {
    if (v.length !== dim) continue;
    for (let i = 0; i < dim; i++) {
      sum[i] = (sum[i] ?? 0) + (v[i] ?? 0);
    }
    count++;
  }
  if (count === 0) return [];
  return sum.map((v) => v / count);
}

function clampScore(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
