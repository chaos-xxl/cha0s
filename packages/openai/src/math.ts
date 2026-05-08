/**
 * Cosine similarity between two equal-length vectors, in the range
 * `[-1, 1]`. OpenAI's embedding vectors are pre-normalised, so dot
 * product would suffice — we compute the full cosine anyway for
 * safety against non-normalised sources (e.g. a custom baseUrl).
 *
 * Returns 0 for mismatched or empty vectors instead of throwing, so
 * the strategy can degrade gracefully when an input text was blank.
 */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    dot += x * y;
    magA += x * x;
    magB += y * y;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Average a list of vectors into a single centroid. Skips empty
 * vectors. Returns `[]` if there is nothing to average.
 */
export function averageVectors(vectors: readonly number[][]): number[] {
  const nonEmpty = vectors.filter((v) => v.length > 0);
  if (nonEmpty.length === 0) return [];
  const dim = nonEmpty[0]!.length;
  const sum = new Array(dim).fill(0);
  let contributing = 0;
  for (const vector of nonEmpty) {
    if (vector.length !== dim) continue;
    for (let i = 0; i < dim; i++) {
      sum[i] += vector[i]!;
    }
    contributing++;
  }
  if (contributing === 0) return [];
  return sum.map((s) => s / contributing);
}

/**
 * Clamp a similarity value from `[-1, 1]` into the routing-friendly
 * range `[0, 1]`. Negative similarity (semantically opposed) is
 * treated as "no relation" and collapsed to 0.
 */
export function toRoutingScore(similarity: number): number {
  if (similarity <= 0) return 0;
  if (similarity >= 1) return 1;
  return similarity;
}
