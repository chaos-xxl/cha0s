import type { EmbedFunction, LLMFunction } from '@doctorchaos-ai/core';
import { OpenAiEmbeddingClient, type OpenAiEmbeddingClientOptions } from './client.js';

/**
 * Options for {@link openaiEmbed}. Extends the underlying client
 * options — any client knob (custom fetch, cache, base URL, model)
 * is fair game.
 */
export type OpenAiEmbedOptions = OpenAiEmbeddingClientOptions;

/**
 * Build an embedding function backed by OpenAI's
 * `/v1/embeddings` endpoint. The returned function matches the
 * {@link EmbedFunction} shape expected by
 * `new Clinic({ embed })`.
 *
 * ```ts
 * import { Clinic } from '@doctorchaos-ai/core';
 * import { openaiEmbed } from '@doctorchaos-ai/openai';
 *
 * const clinic = new Clinic({
 *   embed: openaiEmbed({ apiKey: process.env.OPENAI_API_KEY! }),
 * });
 * ```
 *
 * Works with any OpenAI-compatible endpoint (Azure OpenAI, OpenRouter,
 * LiteLLM, local emulators) — just set `baseUrl`.
 *
 * Caching, batching, and request reuse are all handled internally;
 * identical input texts resolve from cache after the first call.
 */
export function openaiEmbed(options: OpenAiEmbedOptions): EmbedFunction {
  const client = new OpenAiEmbeddingClient(options);
  return async (texts) => client.embedBatch(texts);
}

/**
 * Options for {@link openaiLLM}.
 */
export interface OpenAiLLMOptions {
  /** Required. OpenAI API key (`sk-...`). */
  readonly apiKey: string;

  /**
   * Chat model to use. Defaults to `gpt-4o-mini` — a sensible balance
   * of quality and cost for the routing-classification task (short
   * input, structured output, no reasoning chains needed).
   */
  readonly model?: string;

  /**
   * Optional base URL override (Azure, OpenRouter, LiteLLM, Groq,
   * Together, etc. — any OpenAI-compatible `/chat/completions`).
   * Defaults to `https://api.openai.com/v1`.
   */
  readonly baseUrl?: string;

  /**
   * Sampling temperature. Default: `0` for deterministic routing
   * decisions. Routing is a classification task; creativity is not
   * helpful.
   */
  readonly temperature?: number;

  /**
   * Max tokens for the reply. Default: `100`. The routing prompt asks
   * for a single-line JSON object, so this is deliberately tight — it
   * both caps cost and discourages the model from rambling.
   */
  readonly maxTokens?: number;

  /**
   * Custom fetch implementation. Falls back to the global `fetch`.
   */
  readonly fetch?: typeof fetch;

  /**
   * Optional AbortSignal forwarded to every request.
   */
  readonly signal?: AbortSignal;
}

/**
 * Build a chat-completion function backed by OpenAI's
 * `/v1/chat/completions` endpoint. Matches the {@link LLMFunction}
 * shape expected by `new Clinic({ llm })`.
 *
 * ```ts
 * import { Clinic } from '@doctorchaos-ai/core';
 * import { openaiLLM } from '@doctorchaos-ai/openai';
 *
 * const clinic = new Clinic({
 *   llm: openaiLLM({ apiKey: process.env.OPENAI_API_KEY! }),
 * });
 * ```
 *
 * As with {@link openaiEmbed}, this works against any OpenAI-
 * compatible endpoint — set `baseUrl` for Azure, OpenRouter,
 * LiteLLM, or a self-hosted proxy.
 *
 * The default model is `gpt-4o-mini`, which in our testing routes
 * accurately for message-classification tasks at a fraction of a cent
 * per call.
 */
export function openaiLLM(options: OpenAiLLMOptions): LLMFunction {
  if (!options.apiKey) {
    throw new Error('openaiLLM: apiKey is required.');
  }
  const apiKey = options.apiKey;
  const model = options.model ?? 'gpt-4o-mini';
  const baseUrl = (options.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  const temperature = options.temperature ?? 0;
  const maxTokens = options.maxTokens ?? 100;
  const signal = options.signal;

  const fetchImpl =
    options.fetch ?? ((globalThis as { fetch?: typeof fetch }).fetch as typeof fetch | undefined);
  if (!fetchImpl) {
    throw new Error(
      'openaiLLM: no fetch implementation found. Pass `fetch` in options, or run on Node 18+.',
    );
  }

  return async (prompt) => {
    const response = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
      ...(signal ? { signal } : {}),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '<unreadable body>');
      throw new Error(
        `openaiLLM: chat completion failed (${response.status} ${response.statusText}): ${body}`,
      );
    }
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content ?? '';
    return content;
  };
}
