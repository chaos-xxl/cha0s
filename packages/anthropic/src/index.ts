/**
 * @doctorchaos-ai/anthropic
 *
 * Anthropic Claude LLM adapter for Doctor Chaos. Routes every
 * incoming message by asking a Claude model which topic space the
 * message belongs to.
 *
 * @example
 * ```ts
 * import { Clinic } from '@doctorchaos-ai/core';
 * import { anthropic } from '@doctorchaos-ai/anthropic';
 *
 * const clinic = new Clinic({
 *   llm: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! }),
 * });
 * ```
 *
 * Anthropic's API uses a slightly different request/response shape
 * from OpenAI (no `Authorization` header — they use `x-api-key`,
 * the response has `content: [{ type: 'text', text }]` instead of
 * `choices[0].message.content`, and `max_tokens` is required). This
 * adapter handles those differences in a thin HTTP wrapper.
 */

import type { LLMFunction } from '@doctorchaos-ai/core';

export interface AnthropicOptions {
  /** Required. Anthropic API key (`sk-ant-...`). */
  readonly apiKey: string;

  /**
   * Claude model. Default: `claude-3-5-haiku-20241022` — the cheapest
   * and fastest capable Claude, which is plenty for message
   * classification. Upgrade to `claude-3-5-sonnet-20241022` for
   * tricky cases.
   */
  readonly model?: string;

  /**
   * Custom base URL. Default: `https://api.anthropic.com/v1`.
   */
  readonly baseUrl?: string;

  /**
   * Anthropic API version. Default: `2023-06-01`. Override if you
   * need to opt into newer features that require a different
   * version header.
   */
  readonly version?: string;

  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly fetch?: typeof fetch;
  readonly signal?: AbortSignal;
}

interface AnthropicResponse {
  readonly content?: Array<{ readonly type?: string; readonly text?: string }>;
  readonly error?: { readonly message?: string };
}

/**
 * Build a chat-completion function for Anthropic Claude, ready to
 * pass to `new Clinic({ llm })`.
 */
export function anthropic(options: AnthropicOptions): LLMFunction {
  if (!options.apiKey) {
    throw new Error('anthropic: apiKey is required.');
  }

  const apiKey = options.apiKey;
  const model = options.model ?? 'claude-3-5-haiku-20241022';
  const baseUrl = (options.baseUrl ?? 'https://api.anthropic.com/v1').replace(/\/$/, '');
  const version = options.version ?? '2023-06-01';
  const temperature = options.temperature ?? 0;
  const maxTokens = options.maxTokens ?? 100;
  const signal = options.signal;

  const fetchImpl =
    options.fetch ?? ((globalThis as { fetch?: typeof fetch }).fetch as typeof fetch | undefined);
  if (!fetchImpl) {
    throw new Error(
      'anthropic: no fetch implementation found. Pass `fetch` in options, or run on Node 18+.',
    );
  }

  return async (prompt) => {
    const response = await fetchImpl(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': version,
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
        `anthropic: chat completion failed (${response.status} ${response.statusText}): ${body}`,
      );
    }

    const payload = (await response.json()) as AnthropicResponse;
    // Anthropic returns an array of content blocks; we flatten all
    // `text` blocks in order, which for a plain prompt is a single
    // block. Non-text blocks (e.g. tool use) are ignored because
    // they're not in the routing prompt's design.
    const parts = (payload.content ?? [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text ?? '');
    return parts.join('');
  };
}
