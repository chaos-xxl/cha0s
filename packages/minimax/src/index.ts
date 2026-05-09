/**
 * @doctorchaos-ai/minimax
 *
 * MiniMax LLM adapter for Doctor Chaos. Routes every incoming
 * message by asking a MiniMax chat model which topic space the
 * message belongs to.
 *
 * @example
 * ```ts
 * import { Clinic } from '@doctorchaos-ai/core';
 * import { minimax } from '@doctorchaos-ai/minimax';
 *
 * const clinic = new Clinic({
 *   llm: minimax({ apiKey: process.env.MINIMAX_API_KEY! }),
 * });
 * ```
 *
 * MiniMax speaks the OpenAI request/response shape but hosts its
 * chat endpoint at `/v1/text/chatcompletion_v2`. We route through
 * `openAiCompatibleLLM` with a custom `path`.
 */

import { openAiCompatibleLLM, type LLMFunction } from '@doctorchaos-ai/core';

export interface MiniMaxOptions {
  /** Required. MiniMax API key. */
  readonly apiKey: string;

  /**
   * Chat model. Default: `MiniMax-Text-01` (the current flagship
   * text-chat model). Swap in `abab6.5s-chat`, `abab6.5t-chat`, or
   * `MiniMax-M1` depending on your plan.
   */
  readonly model?: string;

  /**
   * Custom base URL. Default: `https://api.minimaxi.com/v1`
   * (the CN endpoint). Use `https://api.minimax.io/v1` for the
   * international deployment.
   */
  readonly baseUrl?: string;

  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly fetch?: typeof fetch;
  readonly signal?: AbortSignal;
}

/**
 * Build a chat-completion function for MiniMax, ready to pass to
 * `new Clinic({ llm })`.
 */
export function minimax(options: MiniMaxOptions): LLMFunction {
  return openAiCompatibleLLM({
    apiKey: options.apiKey,
    model: options.model ?? 'MiniMax-Text-01',
    baseUrl: options.baseUrl ?? 'https://api.minimaxi.com/v1',
    path: 'text/chatcompletion_v2',
    providerLabel: 'MiniMax',
    ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    ...(options.maxTokens !== undefined ? { maxTokens: options.maxTokens } : {}),
    ...(options.fetch ? { fetch: options.fetch } : {}),
    ...(options.signal ? { signal: options.signal } : {}),
  });
}
