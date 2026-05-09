/**
 * @doctorchaos-ai/zhipu
 *
 * Zhipu GLM LLM adapter for Doctor Chaos. Routes every incoming
 * message by asking a GLM chat model which topic space the message
 * belongs to.
 *
 * @example
 * ```ts
 * import { Clinic } from '@doctorchaos-ai/core';
 * import { zhipu } from '@doctorchaos-ai/zhipu';
 *
 * const clinic = new Clinic({
 *   llm: zhipu({ apiKey: process.env.ZHIPU_API_KEY! }),
 * });
 * ```
 *
 * Zhipu exposes an OpenAI-compatible chat completions API at
 * `https://open.bigmodel.cn/api/paas/v4`. The key format is
 * `<keyId>.<keySecret>` (used as a bearer token directly; no JWT
 * signing is required for this endpoint).
 */

import { openAiCompatibleLLM, type LLMFunction } from '@doctorchaos-ai/core';

export interface ZhipuOptions {
  /**
   * Required. Zhipu API key (commonly in the form `xxx.yyy`). Used
   * as a bearer token.
   */
  readonly apiKey: string;

  /**
   * Chat model. Default: `glm-4-flash` (free tier, fast enough for
   * routing). Upgrade to `glm-4-air`, `glm-4-plus`, or `glm-4` for
   * better quality.
   */
  readonly model?: string;

  /**
   * Custom base URL. Default: `https://open.bigmodel.cn/api/paas/v4`.
   */
  readonly baseUrl?: string;

  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly fetch?: typeof fetch;
  readonly signal?: AbortSignal;
}

/**
 * Build a chat-completion function for Zhipu GLM, ready to pass to
 * `new Clinic({ llm })`.
 */
export function zhipu(options: ZhipuOptions): LLMFunction {
  return openAiCompatibleLLM({
    apiKey: options.apiKey,
    model: options.model ?? 'glm-4-flash',
    baseUrl: options.baseUrl ?? 'https://open.bigmodel.cn/api/paas/v4',
    providerLabel: 'Zhipu',
    ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    ...(options.maxTokens !== undefined ? { maxTokens: options.maxTokens } : {}),
    ...(options.fetch ? { fetch: options.fetch } : {}),
    ...(options.signal ? { signal: options.signal } : {}),
  });
}
