/**
 * Routing-strategy auto-detection for the daemon.
 *
 * Core's own ``autoDetectOpenAI`` only lights up *embedding* routing
 * when ``OPENAI_API_KEY`` is present. The daemon goes one step
 * higher: if a chat-model key is available, it prefers the
 * highest-fidelity **LLM direct routing** tier first, falling back
 * to embedding, then to the zero-dependency keyword matcher.
 *
 * Rationale: virtually every Hermes / OpenClaw / Claude Desktop user
 * already has an API key in their shell environment. Shipping a
 * daemon whose default is keyword-only wastes that fact and makes
 * the very first dogfood experience look worse than the library
 * actually is.
 *
 * The CLI may override the sniffed decision with ``--routing-mode``.
 */

import type { ClinicOptions, EmbedFunction, LLMFunction } from '@doctorchaos-ai/core';

export type RoutingMode = 'auto' | 'llm' | 'embedding' | 'keyword';

/**
 * Decide what routing options to hand to Clinic, given a requested
 * mode and the current environment.
 *
 * Returns:
 *   - ``options``: a partial ClinicOptions to spread into the
 *     Clinic constructor
 *   - ``picked``: the concrete tier we ended up using, for logging
 */
export function resolveRoutingOptions(
  requested: RoutingMode,
  env: Record<string, string | undefined> = process.env,
): {
  options: Partial<ClinicOptions>;
  picked: 'llm' | 'embedding' | 'keyword';
} {
  switch (requested) {
    case 'keyword':
      return { options: { autoDetectOpenAI: false }, picked: 'keyword' };
    case 'embedding': {
      // Force embedding path by keeping Clinic's built-in
      // ``autoDetectOpenAI`` on — it will sniff ``OPENAI_API_KEY`` and
      // wire up an embedding strategy. If the key is absent, Clinic
      // falls back to keyword silently; we surface that to the caller
      // via ``picked``.
      if (hasOpenAIKey(env)) {
        return { options: { autoDetectOpenAI: true }, picked: 'embedding' };
      }
      return { options: { autoDetectOpenAI: false }, picked: 'keyword' };
    }
    case 'llm': {
      const llm = buildOpenAIChatCompletion(env);
      if (llm) {
        return { options: { llm, autoDetectOpenAI: false }, picked: 'llm' };
      }
      // Ask for LLM but no key available → keyword (loud warning
      // handled by the CLI caller based on ``picked``).
      return { options: { autoDetectOpenAI: false }, picked: 'keyword' };
    }
    case 'auto':
    default: {
      // Preferred tier order at 'auto':
      //   1. LLM (highest fidelity — one network call per routed message)
      //   2. Embedding (cheap, decent fidelity)
      //   3. Keyword (zero-dependency fallback)
      const llm = buildOpenAIChatCompletion(env);
      if (llm) {
        return { options: { llm, autoDetectOpenAI: false }, picked: 'llm' };
      }
      if (hasOpenAIKey(env)) {
        // No chat-model reachable but an embedding-capable key is
        // present. Let Clinic's auto-detect wire it up.
        return { options: { autoDetectOpenAI: true }, picked: 'embedding' };
      }
      return { options: { autoDetectOpenAI: false }, picked: 'keyword' };
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

function hasOpenAIKey(env: Record<string, string | undefined>): boolean {
  return typeof env['OPENAI_API_KEY'] === 'string' && env['OPENAI_API_KEY']!.length > 0;
}

/**
 * Build a minimal, zero-dep OpenAI-compatible chat completion
 * LLMFunction from environment variables. Returns undefined if no
 * ``OPENAI_API_KEY`` is available.
 *
 * Reads:
 *   - OPENAI_API_KEY     (required)
 *   - OPENAI_BASE_URL    (default: https://api.openai.com/v1)
 *   - OPENAI_MODEL       (default: gpt-4o-mini — cheap, fast, good
 *                         enough for the short classification prompts
 *                         Doctor Chaos sends; override for any other
 *                         OpenAI-compatible provider)
 */
function buildOpenAIChatCompletion(
  env: Record<string, string | undefined>,
): LLMFunction | undefined {
  const apiKey = env['OPENAI_API_KEY'];
  if (!apiKey || apiKey.length === 0) return undefined;
  const baseUrl = (env['OPENAI_BASE_URL'] ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = env['OPENAI_MODEL'] ?? 'gpt-4o-mini';

  return async (prompt: string) => {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
      }),
    });
    if (!response.ok) {
      throw new Error(
        `Doctor Chaos: LLM chat completion request failed (${response.status}).`,
      );
    }
    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new Error('Doctor Chaos: LLM response missing message.content.');
    }
    return content;
  };
}

// Kept as a type-only re-export so callers don't need a direct import
// path. The ``_`` suffix prevents an unused-import complaint.
export type { EmbedFunction as EmbedFunction_ };
