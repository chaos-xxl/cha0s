/**
 * Routing-strategy auto-detection for the daemon.
 *
 * Doctor Chaos does not ship its own LLM credentials. Instead it
 * sniffs the shell environment for **any supported provider's**
 * API key (OpenAI, Anthropic, DeepSeek, Kimi, 智谱, 通义, MiniMax,
 * 豆包) and wires up an OpenAI-compatible chat completion call
 * against that provider. This keeps the daemon provider-agnostic
 * and honours the project principle that every major vendor is a
 * first-class citizen.
 *
 * Precedence at ``auto`` mode:
 *   1. LLM tier (highest fidelity — one chat call per routed message)
 *      using whichever provider's key we detect first in the order
 *      listed in ``PROVIDERS``.
 *   2. Embedding tier (falls back to Clinic's built-in
 *      ``autoDetectOpenAI`` which needs ``OPENAI_API_KEY``).
 *   3. Keyword tier (zero-dependency fallback).
 *
 * The CLI can force a tier with ``--routing-mode`` and a specific
 * provider with ``--llm-provider``.
 */

import type { ClinicOptions, LLMFunction } from '@doctorchaos-ai/core';

export type RoutingMode = 'auto' | 'llm' | 'embedding' | 'keyword';

/**
 * Canonical list of provider ids that the daemon can auto-detect.
 */
export type ProviderId =
  | 'openai'
  | 'anthropic'
  | 'deepseek'
  | 'kimi'
  | 'zhipu'
  | 'qwen'
  | 'minimax'
  | 'doubao';

/**
 * Description of how to detect and talk to one provider.
 *
 * Every entry describes: the env var names we look at, the default
 * base URL and model (used when the user hasn't overridden them),
 * and the wire protocol shape (OpenAI Chat Completions or Anthropic
 * Messages).
 */
interface ProviderSpec {
  readonly id: ProviderId;
  readonly apiKeyEnv: readonly string[];
  readonly baseUrlEnv: readonly string[];
  readonly modelEnv: readonly string[];
  readonly defaultBaseUrl: string;
  readonly defaultModel: string;
  readonly shape: 'openai-compat' | 'anthropic';
}

/**
 * Provider preference order at ``auto`` mode.
 *
 * First match wins. The order is tuned for the Doctor Chaos
 * target users (Hermes / OpenClaw / Claude Desktop operators who
 * mix global and Chinese providers), not for any provider-quality
 * ranking.
 */
const PROVIDERS: readonly ProviderSpec[] = [
  {
    id: 'openai',
    apiKeyEnv: ['OPENAI_API_KEY'],
    baseUrlEnv: ['OPENAI_BASE_URL'],
    modelEnv: ['OPENAI_MODEL'],
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    shape: 'openai-compat',
  },
  {
    id: 'anthropic',
    apiKeyEnv: ['ANTHROPIC_API_KEY'],
    baseUrlEnv: ['ANTHROPIC_BASE_URL'],
    modelEnv: ['ANTHROPIC_MODEL'],
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-haiku-20241022',
    shape: 'anthropic',
  },
  {
    id: 'deepseek',
    apiKeyEnv: ['DEEPSEEK_API_KEY'],
    baseUrlEnv: ['DEEPSEEK_BASE_URL'],
    modelEnv: ['DEEPSEEK_MODEL'],
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    shape: 'openai-compat',
  },
  {
    id: 'kimi',
    apiKeyEnv: ['MOONSHOT_API_KEY', 'KIMI_API_KEY'],
    baseUrlEnv: ['MOONSHOT_BASE_URL', 'KIMI_BASE_URL'],
    modelEnv: ['MOONSHOT_MODEL', 'KIMI_MODEL'],
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    shape: 'openai-compat',
  },
  {
    id: 'zhipu',
    apiKeyEnv: ['ZHIPUAI_API_KEY', 'ZHIPU_API_KEY'],
    baseUrlEnv: ['ZHIPUAI_BASE_URL', 'ZHIPU_BASE_URL'],
    modelEnv: ['ZHIPUAI_MODEL', 'ZHIPU_MODEL'],
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-flash',
    shape: 'openai-compat',
  },
  {
    id: 'qwen',
    apiKeyEnv: ['DASHSCOPE_API_KEY', 'QWEN_API_KEY'],
    baseUrlEnv: ['DASHSCOPE_BASE_URL', 'QWEN_BASE_URL'],
    modelEnv: ['DASHSCOPE_MODEL', 'QWEN_MODEL'],
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    shape: 'openai-compat',
  },
  {
    id: 'minimax',
    apiKeyEnv: ['MINIMAX_API_KEY'],
    baseUrlEnv: ['MINIMAX_BASE_URL'],
    modelEnv: ['MINIMAX_MODEL'],
    defaultBaseUrl: 'https://api.minimaxi.com/v1',
    defaultModel: 'MiniMax-Text-01',
    shape: 'openai-compat',
  },
  {
    id: 'doubao',
    apiKeyEnv: ['ARK_API_KEY', 'DOUBAO_API_KEY'],
    baseUrlEnv: ['ARK_BASE_URL', 'DOUBAO_BASE_URL'],
    modelEnv: ['ARK_MODEL', 'DOUBAO_MODEL'],
    defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    defaultModel: 'doubao-1-5-pro-32k-250115',
    shape: 'openai-compat',
  },
];

/**
 * All provider ids the daemon knows about. Exported so the CLI
 * can validate ``--llm-provider`` values without re-deriving.
 */
export const SUPPORTED_PROVIDER_IDS: readonly ProviderId[] = PROVIDERS.map(
  (p) => p.id,
);

/**
 * Return the first provider whose primary API key env var is set
 * in ``env``, or undefined when no supported provider is found.
 */
function detectProvider(
  env: Record<string, string | undefined>,
  onlyId?: ProviderId,
): ProviderSpec | undefined {
  for (const p of PROVIDERS) {
    if (onlyId && p.id !== onlyId) continue;
    for (const keyName of p.apiKeyEnv) {
      if (typeof env[keyName] === 'string' && env[keyName]!.length > 0) {
        return p;
      }
    }
  }
  return undefined;
}

/**
 * Read the first defined value among ``names`` from the environment.
 */
function readEnv(
  env: Record<string, string | undefined>,
  names: readonly string[],
): string | undefined {
  for (const n of names) {
    const v = env[n];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return undefined;
}

// ─── LLMFunction builders ────────────────────────────────────────────

function buildOpenAICompatLLM(
  spec: ProviderSpec,
  env: Record<string, string | undefined>,
): LLMFunction {
  const apiKey = readEnv(env, spec.apiKeyEnv)!;
  const baseUrl = (readEnv(env, spec.baseUrlEnv) ?? spec.defaultBaseUrl).replace(
    /\/$/,
    '',
  );
  const model = readEnv(env, spec.modelEnv) ?? spec.defaultModel;

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
        `Doctor Chaos: ${spec.id} chat completion failed (${response.status}).`,
      );
    }
    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new Error(`Doctor Chaos: ${spec.id} response missing message.content.`);
    }
    return content;
  };
}

function buildAnthropicLLM(
  spec: ProviderSpec,
  env: Record<string, string | undefined>,
): LLMFunction {
  const apiKey = readEnv(env, spec.apiKeyEnv)!;
  const baseUrl = (readEnv(env, spec.baseUrlEnv) ?? spec.defaultBaseUrl).replace(
    /\/$/,
    '',
  );
  const model = readEnv(env, spec.modelEnv) ?? spec.defaultModel;

  return async (prompt: string) => {
    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!response.ok) {
      throw new Error(
        `Doctor Chaos: anthropic chat completion failed (${response.status}).`,
      );
    }
    const body = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const textBlock = body.content?.find((c) => c.type === 'text');
    if (!textBlock || typeof textBlock.text !== 'string') {
      throw new Error('Doctor Chaos: anthropic response missing content[].text.');
    }
    return textBlock.text;
  };
}

function buildLLM(
  spec: ProviderSpec,
  env: Record<string, string | undefined>,
): LLMFunction {
  if (spec.shape === 'anthropic') return buildAnthropicLLM(spec, env);
  return buildOpenAICompatLLM(spec, env);
}

// ─── Public API ──────────────────────────────────────────────────────

export interface RoutingResolution {
  readonly options: Partial<ClinicOptions>;
  readonly picked: 'llm' | 'embedding' | 'keyword';
  readonly provider?: ProviderId;
}

/**
 * Decide what routing options to hand Clinic for the requested mode
 * and the current environment.
 *
 * Returns:
 *   - ``options``: a partial ClinicOptions to spread into the
 *     Clinic constructor
 *   - ``picked``: the concrete tier we ended up using, for logging
 *   - ``provider``: when picked === 'llm', which provider drives it
 */
export function resolveRoutingOptions(
  requested: RoutingMode,
  env: Record<string, string | undefined> = process.env,
  onlyProvider?: ProviderId,
): RoutingResolution {
  switch (requested) {
    case 'keyword':
      return { options: { autoDetectOpenAI: false }, picked: 'keyword' };

    case 'embedding': {
      if (typeof env['OPENAI_API_KEY'] === 'string' && env['OPENAI_API_KEY']!.length > 0) {
        return { options: { autoDetectOpenAI: true }, picked: 'embedding' };
      }
      return { options: { autoDetectOpenAI: false }, picked: 'keyword' };
    }

    case 'llm': {
      const provider = detectProvider(env, onlyProvider);
      if (provider) {
        return {
          options: { llm: buildLLM(provider, env), autoDetectOpenAI: false },
          picked: 'llm',
          provider: provider.id,
        };
      }
      // User forced LLM but no known provider key. Caller warns.
      return { options: { autoDetectOpenAI: false }, picked: 'keyword' };
    }

    case 'auto':
    default: {
      // 1. LLM via any detected provider.
      const provider = detectProvider(env, onlyProvider);
      if (provider) {
        return {
          options: { llm: buildLLM(provider, env), autoDetectOpenAI: false },
          picked: 'llm',
          provider: provider.id,
        };
      }
      // 2. Embedding via Clinic auto-detect (OPENAI_API_KEY only).
      //    Only reachable if no LLM-tier provider matched above, so
      //    strictly speaking unreachable today (OPENAI_API_KEY would
      //    already have returned at step 1). Left here for forward
      //    compatibility with an embedding-only key variant.
      if (typeof env['OPENAI_API_KEY'] === 'string' && env['OPENAI_API_KEY']!.length > 0) {
        return { options: { autoDetectOpenAI: true }, picked: 'embedding' };
      }
      // 3. Keyword tier.
      return { options: { autoDetectOpenAI: false }, picked: 'keyword' };
    }
  }
}
