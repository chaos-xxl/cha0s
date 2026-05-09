/**
 * @doctorchaos-ai/openai
 *
 * OpenAI embedding adapter for Doctor Chaos. Drop this into a
 * {@link Clinic} instance to replace keyword matching with semantic
 * routing backed by OpenAI's `text-embedding-3-small` (or any
 * compatible endpoint).
 *
 * @example
 * ```ts
 * import { Clinic } from '@doctorchaos-ai/core';
 * import { openaiEmbedding, openaiClustering } from '@doctorchaos-ai/openai';
 *
 * const embedding = openaiEmbedding({ apiKey: process.env.OPENAI_API_KEY! });
 *
 * const clinic = new Clinic({
 *   engineOptions: { matchingStrategy: embedding },
 *   clusteringStrategy: openaiClustering({ client: embedding.client }),
 * });
 * ```
 *
 * Sharing the embedding client across strategies lets them reuse the
 * same vector cache.
 */

export { OpenAiEmbeddingClient, OpenAiEmbeddingError } from './client.js';
export type { FetchLike, OpenAiEmbeddingClientOptions } from './client.js';

export { createVectorCache } from './cache.js';
export type { VectorCache, VectorCacheOptions } from './cache.js';

export { OpenAiEmbeddingStrategy, openaiEmbedding } from './embedding-strategy.js';
export type { OpenAiEmbeddingStrategyOptions } from './embedding-strategy.js';

export { OpenAiClusteringStrategy, openaiClustering } from './clustering-strategy.js';
export type { OpenAiClusteringStrategyOptions } from './clustering-strategy.js';

export { averageVectors, cosineSimilarity, toRoutingScore } from './math.js';

// High-level, functional API — the recommended entry points.
export { openaiEmbed, openaiLLM } from './functional.js';
export type { OpenAiEmbedOptions, OpenAiLLMOptions } from './functional.js';
