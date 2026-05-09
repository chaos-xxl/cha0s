/**
 * @doctorchaos-ai/deepseek
 *
 * DeepSeek LLM adapter for Doctor Chaos. Routes every incoming
 * message by asking a DeepSeek chat model which topic space the
 * message belongs to.
 *
 * @example
 * ```ts
 * import { Clinic } from '@doctorchaos-ai/core';
 * import { deepseek } from '@doctorchaos-ai/deepseek';
 *
 * const clinic = new Clinic({
 *   llm: deepseek({ apiKey: process.env.DEEPSEEK_API_KEY! }),
 * });
 * ```
 *
 * DeepSeek exposes an OpenAI-compatible chat completions API, so this
 * adapter is a thin wrapper around `openAiCompatibleLLM` with the
 * DeepSeek base URL and `deepseek-chat` as the default model.
 */

import { openAiCompatibleLLM, type LLMFunction } from '@doctorchaos-ai/core';

export interface DeepSeekOptions {
  /** Required. DeepSeek API key. */
  readonly apiKey: string;

  /**
   * Chat model. Default: `deepseek-chat`. Use `deepseek-reasoner`
   * for harder classification tasks at the cost of higher latency.
   */
  readonly model?: string;

  /**
   * Custom base URL. Default: `https://api.deepseek.com/v1`.
   * Override for self-hosted proxies or regional endpoints.
   */
  readonly baseUrl?: string;

  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly fetch?: typeof fetch;
  readonly signal?: AbortSignal;
}

/**
 * Build a chat-completion function for DeepSeek, ready to pass to
 * `new Clinic({ llm })`.
 */
export function deepseek(options: DeepSeekOptions): LLMFunction {
  return openAiCompatibleLLM({
    apiKey: options.apiKey,
    model: options.model ?? 'deepseek-chat',
    baseUrl: options.baseUrl ?? 'https://api.deepseek.com/v1',
    providerLabel: 'DeepSeek',
    ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    ...(options.maxTokens !== undefined ? { maxTokens: options.maxTokens } : {}),
    ...(options.fetch ? { fetch: options.fetch } : {}),
    ...(options.signal ? { signal: options.signal } : {}),
  });
}
