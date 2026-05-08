import type { ClusteringStrategy, Fragment, FragmentCluster } from '@cha0s-ai/core';
import { OpenAiEmbeddingClient, type OpenAiEmbeddingClientOptions } from './client.js';
import { cosineSimilarity } from './math.js';

/**
 * Options accepted by {@link openaiClustering}.
 *
 * Extends {@link OpenAiEmbeddingClientOptions} with clustering-level
 * controls.
 */
export interface OpenAiClusteringStrategyOptions extends OpenAiEmbeddingClientOptions {
  /**
   * Cosine-similarity threshold above which two fragments are treated
   * as belonging to the same cluster. Lower = more lenient (more
   * cluster merging), higher = stricter (more singleton clusters).
   *
   * Default: 0.55. Calibrated against OpenAI `text-embedding-3-small`.
   */
  readonly similarityThreshold?: number;

  /**
   * Minimum number of fragments required for a cluster to be
   * considered for packaging into a new topic space.
   *
   * Default: 3. Matches the keyword clusterer and the core config.
   */
  readonly packagingDensityThreshold?: number;

  /**
   * Optional pre-built client. Pass this to share a cache with an
   * {@link OpenAiEmbeddingStrategy} — cluster and routing both benefit
   * from the same text-to-vector memo.
   */
  readonly client?: OpenAiEmbeddingClient;
}

/**
 * ClusteringStrategy that groups inbox fragments by embedding
 * similarity.
 *
 * ## Algorithm
 *
 * 1. Embed the text of every fragment (concatenation of its messages)
 *    in a single batched call.
 * 2. Greedy agglomerative clustering: iterate fragments in order; for
 *    each, either join the first existing cluster whose centroid is
 *    similar enough (cosine ≥ `similarityThreshold`), or start a new
 *    cluster.
 * 3. For each cluster of size ≥ 2, emit a {@link FragmentCluster} with
 *    a coherence score (average pairwise similarity) and a suggested
 *    name derived from the most common keyword in the cluster's
 *    fragments.
 *
 * ## Why not k-means
 *
 * The number of topics is unknown up front; k-means requires fixing
 * `k`. Density-based methods (DBSCAN, HDBSCAN) would be better but
 * require more dependencies. Greedy agglomerative is the sweet spot
 * for a first adapter: easy to reason about, predictable, and does
 * not need an extra library.
 */
export class OpenAiClusteringStrategy implements ClusteringStrategy {
  readonly client: OpenAiEmbeddingClient;
  private readonly similarityThreshold: number;
  private readonly packagingDensityThreshold: number;

  constructor(options: OpenAiClusteringStrategyOptions) {
    this.client = options.client ?? new OpenAiEmbeddingClient(options);
    this.similarityThreshold = options.similarityThreshold ?? 0.55;
    this.packagingDensityThreshold = options.packagingDensityThreshold ?? 3;
  }

  /**
   * Group the fragments into clusters. Returns an empty array if the
   * input is empty.
   *
   * The `ClusteringStrategy` interface is synchronous, so this method
   * returns the array directly — but behind the scenes it issues an
   * async network call. Callers should use {@link evaluateClustersAsync}
   * whenever possible. The sync contract exists because the keyword
   * clusterer is synchronous; for embedding-backed strategies, host
   * applications should use the async path exposed through Cha0s's
   * `checkPackaging` flow (which awaits).
   *
   * Implementation note: calling this from a strictly-synchronous
   * caller will throw, because we cannot perform the embedding
   * request without awaiting. Use the async variant.
   */
  evaluateClusters(_fragments: readonly Fragment[]): FragmentCluster[] {
    throw new Error(
      'OpenAiClusteringStrategy: call evaluateClustersAsync. Embedding-backed ' +
        'clustering requires a network call and cannot run synchronously.',
    );
  }

  /**
   * The real clusterer. Returns a list of candidate clusters sorted
   * by size descending (densest first).
   */
  async evaluateClustersAsync(fragments: readonly Fragment[]): Promise<FragmentCluster[]> {
    if (fragments.length === 0) return [];

    const texts = fragments.map((f) => fragmentText(f));
    const vectors = await this.client.embedBatch(texts);

    type Bucket = { fragments: Fragment[]; vectors: number[][] };
    const buckets: Bucket[] = [];

    for (let i = 0; i < fragments.length; i++) {
      const fragment = fragments[i]!;
      const vector = vectors[i];
      if (!vector || vector.length === 0) continue;

      let placed = false;
      for (const bucket of buckets) {
        const centroid = average(bucket.vectors);
        if (cosineSimilarity(vector, centroid) >= this.similarityThreshold) {
          bucket.fragments.push(fragment);
          bucket.vectors.push(vector);
          placed = true;
          break;
        }
      }
      if (!placed) {
        buckets.push({ fragments: [fragment], vectors: [vector] });
      }
    }

    const clusters: FragmentCluster[] = [];
    for (const bucket of buckets) {
      if (bucket.fragments.length < 2) continue;
      const coherence = averagePairwiseSimilarity(bucket.vectors);
      const themeKeywords = topKeywordsFrom(bucket.fragments);
      clusters.push({
        fragments: [...bucket.fragments].sort(
          (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
        ),
        themeKeywords,
        coherenceScore: coherence,
        suggestedName: themeKeywords[0] ?? 'Untitled',
      });
    }
    clusters.sort((a, b) => b.fragments.length - a.fragments.length);
    return clusters;
  }

  meetsPackagingThreshold(cluster: FragmentCluster): boolean {
    return cluster.fragments.length >= this.packagingDensityThreshold;
  }
}

/**
 * Factory matching the verb-style used elsewhere:
 *
 * ```ts
 * new Cha0s({ clusteringStrategy: openaiClustering({ apiKey }) });
 * ```
 */
export function openaiClustering(
  options: OpenAiClusteringStrategyOptions,
): OpenAiClusteringStrategy {
  return new OpenAiClusteringStrategy(options);
}

function fragmentText(fragment: Fragment): string {
  return fragment.messages.map((m) => m.content).join(' ');
}

function average(vectors: number[][]): number[] {
  const nonEmpty = vectors.filter((v) => v.length > 0);
  if (nonEmpty.length === 0) return [];
  const dim = nonEmpty[0]!.length;
  const sum = new Array(dim).fill(0);
  for (const vector of nonEmpty) {
    if (vector.length !== dim) continue;
    for (let i = 0; i < dim; i++) sum[i] += vector[i]!;
  }
  return sum.map((v) => v / nonEmpty.length);
}

function averagePairwiseSimilarity(vectors: number[][]): number {
  if (vectors.length < 2) return 0;
  let total = 0;
  let count = 0;
  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      total += cosineSimilarity(vectors[i]!, vectors[j]!);
      count++;
    }
  }
  return count === 0 ? 0 : Math.max(0, Math.min(1, total / count));
}

function topKeywordsFrom(fragments: readonly Fragment[]): string[] {
  const frequency = new Map<string, number>();
  for (const fragment of fragments) {
    for (const keyword of fragment.keywords) {
      frequency.set(keyword, (frequency.get(keyword) ?? 0) + 1);
    }
  }
  return [...frequency.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => {
      if (a[1] !== b[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .map(([k]) => k);
}
