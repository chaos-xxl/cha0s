import { createVectorCache, type VectorCache, type VectorCacheOptions } from './cache.js';

/**
 * A minimal view of `fetch` — just enough to let us mock it in tests
 * and let consumers inject proxies, retrying fetchers, or Cloudflare
 * Workers' native fetch without importing the OpenAI SDK.
 */
export type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
}>;

/**
 * Options for constructing an {@link OpenAiEmbeddingClient}.
 */
export interface OpenAiEmbeddingClientOptions {
  /** Required. An OpenAI API key (`sk-...`). */
  readonly apiKey: string;

  /**
   * Optional override for the embedding model. Defaults to
   * `text-embedding-3-small` (cheap, good enough for routing).
   */
  readonly model?: string;

  /**
   * Optional base URL override. Useful for:
   *   - Azure OpenAI deployments
   *   - OpenAI-compatible proxies (LiteLLM, OpenRouter, etc.)
   *   - Local emulators for integration tests
   *
   * Default: `https://api.openai.com/v1`
   */
  readonly baseUrl?: string;

  /**
   * Custom fetch implementation. If omitted, uses the global `fetch`.
   * Inject a mock here in tests.
   */
  readonly fetch?: FetchLike;

  /**
   * Optional cache. Pass your own to share across multiple clients, or
   * omit for a fresh per-client LRU. Disable caching by passing
   * `{ maxEntries: 0 }` through `cacheOptions`, or by using a cache
   * implementation that does nothing.
   */
  readonly cache?: VectorCache;
  readonly cacheOptions?: VectorCacheOptions;

  /**
   * Optional AbortSignal forwarded to every request. Useful for
   * cancelling long-running routing passes on tab close.
   */
  readonly signal?: AbortSignal;
}

/**
 * Error raised when the OpenAI API responds with a non-2xx status.
 */
export class OpenAiEmbeddingError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, statusText: string, body: string) {
    super(`OpenAI embeddings request failed: ${status} ${statusText}`);
    this.name = 'OpenAiEmbeddingError';
    this.status = status;
    this.body = body;
  }
}

/**
 * Shape of the relevant subset of OpenAI's `POST /v1/embeddings`
 * response. We decode only what we need.
 */
interface OpenAiEmbeddingResponse {
  readonly data: Array<{ readonly embedding: number[]; readonly index: number }>;
  readonly model: string;
  readonly usage?: { prompt_tokens: number; total_tokens: number };
}

/**
 * A tiny, dependency-free client for OpenAI's embeddings endpoint.
 *
 * Rationale for rolling our own instead of depending on the `openai`
 * SDK:
 *  - The SDK pulls in a large transitive tree we do not need.
 *  - Our call shape is trivial: one endpoint, one payload.
 *  - Allowing `fetch` injection makes the whole thing testable and
 *    usable in any JS runtime (Node 18+, browsers, workers, Deno, Bun)
 *    without a runtime-specific build.
 *
 * Caching is built in: identical input texts return the same vector
 * from an in-memory LRU. For a typical chat workload this reduces API
 * cost by an order of magnitude (keywords of existing topic spaces
 * only need to be embedded once).
 */
export class OpenAiEmbeddingClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;
  private readonly cache: VectorCache;
  private readonly signal: AbortSignal | undefined;

  constructor(options: OpenAiEmbeddingClientOptions) {
    if (!options.apiKey) {
      throw new Error('OpenAiEmbeddingClient: apiKey is required.');
    }
    this.apiKey = options.apiKey;
    this.model = options.model ?? 'text-embedding-3-small';
    this.baseUrl = (options.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    const globalFetch = (globalThis as { fetch?: FetchLike }).fetch;
    if (!options.fetch && !globalFetch) {
      throw new Error(
        'OpenAiEmbeddingClient: no fetch implementation found. Pass `fetch` in options, or run on Node 18+ / a modern runtime.',
      );
    }
    this.fetchImpl = options.fetch ?? (globalFetch as FetchLike);
    this.cache = options.cache ?? createVectorCache(options.cacheOptions);
    this.signal = options.signal;
  }

  /**
   * Current cache size (number of cached vectors). Mainly useful in
   * tests and ops dashboards.
   */
  get cacheSize(): number {
    return this.cache.size;
  }

  /**
   * Embed a single text. Returns a vector (array of numbers). Hits the
   * cache before making a network call.
   *
   * Empty-string input short-circuits to a zero vector of length 0
   * (callers should treat that as "undefined"). This avoids surprising
   * API errors — OpenAI rejects empty inputs.
   */
  async embed(text: string): Promise<number[]> {
    if (text.length === 0) return [];
    const cached = this.cache.get(text);
    if (cached) return cached;

    const [vector] = await this.embedBatch([text]);
    // embedBatch guarantees at least one result when input is non-empty.
    return vector ?? [];
  }

  /**
   * Embed a batch of texts in a single API call (cheaper and faster
   * than embedding them one by one). Empty strings are removed from
   * the request but filled back in as `[]` in the returned array so
   * the output aligns 1:1 with the input.
   */
  async embedBatch(texts: readonly string[]): Promise<number[][]> {
    // Collect the indices of non-empty strings that are not already cached.
    const requested: { inputIndex: number; text: string }[] = [];
    const results: number[][] = new Array(texts.length);
    for (let i = 0; i < texts.length; i++) {
      const t = texts[i] ?? '';
      if (t.length === 0) {
        results[i] = [];
        continue;
      }
      const cached = this.cache.get(t);
      if (cached) {
        results[i] = cached;
        continue;
      }
      requested.push({ inputIndex: i, text: t });
    }

    if (requested.length === 0) return results;

    const body = JSON.stringify({
      model: this.model,
      input: requested.map((r) => r.text),
    });

    const response = await this.fetchImpl(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body,
      ...(this.signal ? { signal: this.signal } : {}),
    });

    if (!response.ok) {
      const text = await safeReadText(response);
      throw new OpenAiEmbeddingError(response.status, response.statusText, text);
    }

    const payload = (await response.json()) as OpenAiEmbeddingResponse;
    if (!payload.data || !Array.isArray(payload.data)) {
      throw new OpenAiEmbeddingError(
        response.status,
        response.statusText,
        'Malformed OpenAI response: missing "data" array.',
      );
    }

    // OpenAI preserves input order via the `index` field.
    const byIndex = new Map<number, number[]>();
    for (const item of payload.data) {
      byIndex.set(item.index, item.embedding);
    }
    for (let i = 0; i < requested.length; i++) {
      const { inputIndex, text } = requested[i]!;
      const vector = byIndex.get(i);
      if (!vector) {
        throw new OpenAiEmbeddingError(
          response.status,
          response.statusText,
          `Missing vector for input index ${i}.`,
        );
      }
      results[inputIndex] = vector;
      this.cache.set(text, vector);
    }

    return results;
  }
}

async function safeReadText(response: { text: () => Promise<string> }): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '<unreadable body>';
  }
}
