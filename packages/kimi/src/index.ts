/**
 * @doctorchaos-ai/kimi
 *
 * Moonshot Kimi LLM adapter for Doctor Chaos. Routes every incoming
 * message by asking a Moonshot chat model which topic space the
 * message belongs to.
 *
 * @example
 * ```ts
 * import { Clinic } from '@doctorchaos-ai/core';
 * import { kimi } from '@doctorchaos-ai/kimi';
 *
 * const clinic = new Clinic({
 *   llm: kimi({ apiKey: process.env.MOONSHOT_API_KEY! }),
 * });
 * ```
 *
 * Moonshot exposes an OpenAI-compatible chat completions API at
 * `https://api.moonshot.cn/v1`, so this adapter is a thin wrapper
 * around `openAiCompatibleLLM`.
 */

import { openAiCompatibleLLM, type LLMFunction } from '@doctorchaos-ai/core';

export interface KimiOptions {
  /** Required. Moonshot API key. */
  readonly apiKey: string;

  /**
   * Chat model. Default: `moonshot-v1-8k` (cheap, fast, plenty of
   * context for routing classification). Use `moonshot-v1-32k` or
   * `moonshot-v1-128k` if your spaces / keywords get unusually long.
   */
  readonly model?: string;

  /**
   * Custom base URL. Default: `https://api.moonshot.cn/v1`.
   * Set to `https://api.moonshot.ai/v1` for the international
   * endpoint.
   */
  readonly baseUrl?: string;

  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly fetch?: typeof fetch;
  readonly signal?: AbortSignal;
}

/**
 * Build a chat-completion function for Moonshot Kimi, ready to pass
 * to `new Clinic({ llm })`.
 */
export function kimi(options: KimiOptions): LLMFunction {
  return openAiCompatibleLLM({
    apiKey: options.apiKey,
    model: options.model ?? 'moonshot-v1-8k',
    baseUrl: options.baseUrl ?? 'https://api.moonshot.cn/v1',
    providerLabel: 'Kimi',
    ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    ...(options.maxTokens !== undefined ? { maxTokens: options.maxTokens } : {}),
    ...(options.fetch ? { fetch: options.fetch } : {}),
    ...(options.signal ? { signal: options.signal } : {}),
  });
}
