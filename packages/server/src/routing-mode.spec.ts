import { describe, expect, it } from 'vitest';
import { resolveRoutingOptions, SUPPORTED_PROVIDER_IDS } from './routing-mode.js';

/**
 * Unit tests for the routing tier + provider sniffer. We never hit
 * the network here — we only check which options shape we hand to
 * Clinic, which tier we claim to have picked, and which provider
 * we attached to the LLM tier.
 */

const PROVIDER_KEYS: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  kimi: 'MOONSHOT_API_KEY',
  zhipu: 'ZHIPUAI_API_KEY',
  qwen: 'DASHSCOPE_API_KEY',
  minimax: 'MINIMAX_API_KEY',
  doubao: 'ARK_API_KEY',
};

describe('resolveRoutingOptions — provider sniffing', () => {
  it('exports every supported provider id', () => {
    expect(new Set(SUPPORTED_PROVIDER_IDS)).toEqual(
      new Set([
        'openai',
        'anthropic',
        'deepseek',
        'kimi',
        'zhipu',
        'qwen',
        'minimax',
        'doubao',
      ]),
    );
  });

  it.each(Object.entries(PROVIDER_KEYS))(
    'auto: picks LLM tier for %s when %s is set',
    (providerId, envVar) => {
      const env = { [envVar]: 'sk-test' };
      const r = resolveRoutingOptions('auto', env);
      expect(r.picked).toBe('llm');
      expect(r.provider).toBe(providerId);
      expect(r.options.llm).toBeTypeOf('function');
      expect(r.options.autoDetectOpenAI).toBe(false);
    },
  );

  it('auto: falls back to keyword when no provider key is set', () => {
    const r = resolveRoutingOptions('auto', {});
    expect(r.picked).toBe('keyword');
    expect(r.provider).toBeUndefined();
    expect(r.options.llm).toBeUndefined();
  });

  it('auto: preserves precedence — OpenAI wins over Anthropic when both present', () => {
    const r = resolveRoutingOptions('auto', {
      OPENAI_API_KEY: 'sk-openai',
      ANTHROPIC_API_KEY: 'sk-anthropic',
    });
    expect(r.picked).toBe('llm');
    expect(r.provider).toBe('openai');
  });
});

describe('resolveRoutingOptions — forced modes', () => {
  it('keyword: forces keyword regardless of env', () => {
    const r = resolveRoutingOptions('keyword', { OPENAI_API_KEY: 'sk-test' });
    expect(r.picked).toBe('keyword');
    expect(r.options.llm).toBeUndefined();
    expect(r.options.autoDetectOpenAI).toBe(false);
  });

  it('llm: picks LLM for any supported provider key', () => {
    const r = resolveRoutingOptions('llm', { DEEPSEEK_API_KEY: 'sk-ds' });
    expect(r.picked).toBe('llm');
    expect(r.provider).toBe('deepseek');
  });

  it('llm: falls back to keyword when no key (caller should warn)', () => {
    const r = resolveRoutingOptions('llm', {});
    expect(r.picked).toBe('keyword');
    expect(r.provider).toBeUndefined();
  });

  it('llm with specific provider: only accepts that provider key', () => {
    const onlyAnthropic = resolveRoutingOptions(
      'llm',
      { OPENAI_API_KEY: 'sk-openai', ANTHROPIC_API_KEY: 'sk-anthropic' },
      'anthropic',
    );
    expect(onlyAnthropic.picked).toBe('llm');
    expect(onlyAnthropic.provider).toBe('anthropic');
  });

  it('llm with specific provider: falls back when that provider has no key', () => {
    const r = resolveRoutingOptions(
      'llm',
      { OPENAI_API_KEY: 'sk-openai' },
      'deepseek',
    );
    expect(r.picked).toBe('keyword');
  });

  it('embedding: needs OPENAI_API_KEY specifically (core dependency)', () => {
    const r = resolveRoutingOptions('embedding', { OPENAI_API_KEY: 'sk-test' });
    expect(r.picked).toBe('embedding');
    expect(r.options.autoDetectOpenAI).toBe(true);
  });

  it('embedding: does NOT activate for non-OpenAI keys', () => {
    // Embedding tier currently requires OpenAI-format embeddings
    // because that's what core knows how to build. Non-OpenAI keys
    // drop to keyword.
    const r = resolveRoutingOptions('embedding', { DEEPSEEK_API_KEY: 'sk-ds' });
    expect(r.picked).toBe('keyword');
  });
});
