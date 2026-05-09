import type { LLMFunction } from '../strategies/llm-types.js';

/**
 * Options shared by every OpenAI-compatible chat-completion adapter.
 *
 * Most Chinese and international LLM providers expose their chat API
 * using the OpenAI request/response shape — DeepSeek, Kimi, Qwen,
 * Zhipu GLM, LiteLLM, OpenRouter, Groq, Together, and many more. This
 * interface captures the small surface that's universally meaningful:
 * a key, a model name, a base URL, and the usual HTTP knobs.
 */
export interface OpenAiCompatibleLLMOptions {
  /** Required. The provider's API key. */
  readonly apiKey: string;

  /** Required. The chat model to use. */
  readonly model: string;

  /**
   * Required. The base URL of the provider's OpenAI-compatible
   * endpoint. Usually ends in `/v1` (we strip any trailing slash).
   */
  readonly baseUrl: string;

  /**
   * Sampling temperature. Default: `0` for deterministic routing
   * classification.
   */
  readonly temperature?: number;

  /**
   * Max tokens in the reply. Default: `100`. The routing prompt asks
   * for one line of JSON, so a tight cap both saves cost and
   * discourages the model from rambling.
   */
  readonly maxTokens?: number;

  /**
   * Custom fetch implementation. Falls back to `globalThis.fetch`.
   */
  readonly fetch?: typeof fetch;

  /**
   * Optional AbortSignal forwarded to every request.
   */
  readonly signal?: AbortSignal;

  /**
   * Optional extra headers. Some providers (Azure OpenAI, certain
   * proxies) require extra auth headers on top of the standard
   * `Authorization` one.
   */
  readonly extraHeaders?: Record<string, string>;

  /**
   * Label used in error messages. Defaults to "LLM"; adapter packages
   * set this to "DeepSeek", "Kimi", etc. so failures are legible.
   */
  readonly providerLabel?: string;

  /**
   * Path appended to `baseUrl`. Defaults to `chat/completions`, which
   * is the standard OpenAI endpoint. Override for providers that
   * speak OpenAI's JSON shape but host the endpoint elsewhere (for
   * example MiniMax uses `text/chatcompletion_v2`).
   */
  readonly path?: string;
}

/**
 * Build an {@link LLMFunction} against any OpenAI-compatible chat
 * endpoint. This is the workhorse shared by the Chinese LLM adapter
 * packages (`@doctorchaos-ai/deepseek`, `.../kimi`, etc.) as well as
 * by any user who wants to wire up a proxy or a less-common provider.
 *
 * The returned function wraps a single `/chat/completions` call per
 * message, with a one-user-turn prompt and low max-tokens. Errors on
 * non-2xx; no retry or rate-limit logic — callers should wrap.
 */
export function openAiCompatibleLLM(options: OpenAiCompatibleLLMOptions): LLMFunction {
  if (!options.apiKey) {
    throw new Error(`${options.providerLabel ?? 'LLM'}: apiKey is required.`);
  }
  if (!options.model) {
    throw new Error(`${options.providerLabel ?? 'LLM'}: model is required.`);
  }
  if (!options.baseUrl) {
    throw new Error(`${options.providerLabel ?? 'LLM'}: baseUrl is required.`);
  }

  const apiKey = options.apiKey;
  const model = options.model;
  const baseUrl = options.baseUrl.replace(/\/$/, '');
  const temperature = options.temperature ?? 0;
  const maxTokens = options.maxTokens ?? 100;
  const signal = options.signal;
  const extraHeaders = options.extraHeaders ?? {};
  const label = options.providerLabel ?? 'LLM';
  const path = (options.path ?? 'chat/completions').replace(/^\//, '');

  const fetchImpl =
    options.fetch ?? ((globalThis as { fetch?: typeof fetch }).fetch as typeof fetch | undefined);
  if (!fetchImpl) {
    throw new Error(
      `${label}: no fetch implementation found. Pass \`fetch\` in options, or run on Node 18+.`,
    );
  }

  return async (prompt) => {
    const response = await fetchImpl(`${baseUrl}/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...extraHeaders,
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
        `${label}: chat completion failed (${response.status} ${response.statusText}): ${body}`,
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content ?? '';
    return content;
  };
}
