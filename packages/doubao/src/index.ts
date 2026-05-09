/**
 * @doctorchaos-ai/doubao
 *
 * Doubao (ByteDance Volcengine Ark) LLM adapter for Doctor Chaos.
 * Routes every incoming message by asking a Doubao chat model which
 * topic space the message belongs to.
 *
 * @example
 * ```ts
 * import { Clinic } from '@doctorchaos-ai/core';
 * import { doubao } from '@doctorchaos-ai/doubao';
 *
 * const clinic = new Clinic({
 *   llm: doubao({
 *     apiKey: process.env.ARK_API_KEY!,
 *     model: 'ep-20250101-abcde', // your Volcengine endpoint id
 *   }),
 * });
 * ```
 *
 * Ark speaks the OpenAI request/response shape at
 * `https://ark.cn-beijing.volces.com/api/v3/chat/completions`, with
 * the twist that `model` expects an **endpoint id** (`ep-...`) rather
 * than a model name — you create endpoints in the Volcengine console
 * and pass the id here.
 */

import { openAiCompatibleLLM, type LLMFunction } from '@doctorchaos-ai/core';

export interface DoubaoOptions {
  /** Required. Ark / Volcengine API key. */
  readonly apiKey: string;

  /**
   * Required. Ark endpoint id — for example `ep-20250101-abcde`.
   * Create endpoints in the Volcengine console. Unlike most other
   * providers, Ark requires you to register the model you want to
   * use and reference it by endpoint id, not by model name.
   */
  readonly model: string;

  /**
   * Custom base URL. Default:
   * `https://ark.cn-beijing.volces.com/api/v3`.
   */
  readonly baseUrl?: string;

  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly fetch?: typeof fetch;
  readonly signal?: AbortSignal;
}

/**
 * Build a chat-completion function for Doubao (Volcengine Ark),
 * ready to pass to `new Clinic({ llm })`.
 */
export function doubao(options: DoubaoOptions): LLMFunction {
  return openAiCompatibleLLM({
    apiKey: options.apiKey,
    model: options.model,
    baseUrl: options.baseUrl ?? 'https://ark.cn-beijing.volces.com/api/v3',
    providerLabel: 'Doubao',
    ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    ...(options.maxTokens !== undefined ? { maxTokens: options.maxTokens } : {}),
    ...(options.fetch ? { fetch: options.fetch } : {}),
    ...(options.signal ? { signal: options.signal } : {}),
  });
}
