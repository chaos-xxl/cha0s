/**
 * @doctorchaos-ai/qwen
 *
 * Alibaba Qwen (DashScope) LLM adapter for Doctor Chaos. Routes every
 * incoming message by asking a Qwen chat model which topic space the
 * message belongs to.
 *
 * @example
 * ```ts
 * import { Clinic } from '@doctorchaos-ai/core';
 * import { qwen } from '@doctorchaos-ai/qwen';
 *
 * const clinic = new Clinic({
 *   llm: qwen({ apiKey: process.env.DASHSCOPE_API_KEY! }),
 * });
 * ```
 *
 * DashScope's "OpenAI-compatible" mode lives at
 * `https://dashscope.aliyuncs.com/compatible-mode/v1`, which is what
 * we default to. Use the `baseUrl` option to switch to an
 * international endpoint or a self-hosted proxy.
 */

import { openAiCompatibleLLM, type LLMFunction } from '@doctorchaos-ai/core';

export interface QwenOptions {
  /** Required. DashScope API key. */
  readonly apiKey: string;

  /**
   * Chat model. Default: `qwen-plus` (good balance of quality and
   * cost). Use `qwen-turbo` for cheaper and faster routing, or
   * `qwen-max` for harder cases.
   */
  readonly model?: string;

  /**
   * Custom base URL. Default:
   * `https://dashscope.aliyuncs.com/compatible-mode/v1`.
   *
   * International endpoint:
   * `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`.
   */
  readonly baseUrl?: string;

  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly fetch?: typeof fetch;
  readonly signal?: AbortSignal;
}

/**
 * Build a chat-completion function for Alibaba Qwen, ready to pass to
 * `new Clinic({ llm })`.
 */
export function qwen(options: QwenOptions): LLMFunction {
  return openAiCompatibleLLM({
    apiKey: options.apiKey,
    model: options.model ?? 'qwen-plus',
    baseUrl: options.baseUrl ?? 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    providerLabel: 'Qwen',
    ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    ...(options.maxTokens !== undefined ? { maxTokens: options.maxTokens } : {}),
    ...(options.fetch ? { fetch: options.fetch } : {}),
    ...(options.signal ? { signal: options.signal } : {}),
  });
}
