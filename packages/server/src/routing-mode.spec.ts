import { describe, expect, it } from 'vitest';
import { resolveRoutingOptions } from './routing-mode.js';

/**
 * Unit tests for the routing tier sniffer. We don't hit the network
 * here — we only check which options shape we hand to Clinic and
 * which tier we claim to have picked, given various env states.
 */

describe('resolveRoutingOptions', () => {
  it('auto: picks LLM when OPENAI_API_KEY present', () => {
    const r = resolveRoutingOptions('auto', { OPENAI_API_KEY: 'sk-test' });
    expect(r.picked).toBe('llm');
    expect(r.options.llm).toBeTypeOf('function');
    expect(r.options.autoDetectOpenAI).toBe(false);
  });

  it('auto: falls back to keyword when no key', () => {
    const r = resolveRoutingOptions('auto', {});
    expect(r.picked).toBe('keyword');
    expect(r.options.llm).toBeUndefined();
    expect(r.options.autoDetectOpenAI).toBe(false);
  });

  it('keyword: forces keyword regardless of env', () => {
    const r = resolveRoutingOptions('keyword', { OPENAI_API_KEY: 'sk-test' });
    expect(r.picked).toBe('keyword');
    expect(r.options.llm).toBeUndefined();
    expect(r.options.autoDetectOpenAI).toBe(false);
  });

  it('llm: picks LLM when key present', () => {
    const r = resolveRoutingOptions('llm', { OPENAI_API_KEY: 'sk-test' });
    expect(r.picked).toBe('llm');
    expect(r.options.llm).toBeTypeOf('function');
  });

  it('llm: falls back to keyword when no key (caller should warn)', () => {
    const r = resolveRoutingOptions('llm', {});
    expect(r.picked).toBe('keyword');
    expect(r.options.llm).toBeUndefined();
  });

  it('embedding: activates Clinic auto-detect when key present', () => {
    const r = resolveRoutingOptions('embedding', { OPENAI_API_KEY: 'sk-test' });
    expect(r.picked).toBe('embedding');
    expect(r.options.autoDetectOpenAI).toBe(true);
    expect(r.options.llm).toBeUndefined();
  });

  it('embedding: falls back to keyword when no key', () => {
    const r = resolveRoutingOptions('embedding', {});
    expect(r.picked).toBe('keyword');
    expect(r.options.autoDetectOpenAI).toBe(false);
  });
});
