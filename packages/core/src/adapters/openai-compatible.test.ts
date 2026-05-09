import { describe, expect, it, vi } from 'vitest';
import { openAiCompatibleLLM } from './openai-compatible.js';

function mockFetch(options: { body?: unknown; status?: number; statusText?: string }): {
  fetch: typeof fetch;
  calls: Array<{ url: string; init: RequestInit | undefined }>;
} {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const status = options.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: options.statusText ?? 'OK',
      text: async () => JSON.stringify(options.body ?? {}),
      json: async () => options.body ?? {},
    } as unknown as Response;
  });
  return { fetch: fetchImpl as unknown as typeof fetch, calls };
}

describe('openAiCompatibleLLM', () => {
  it('returns the assistant message content', async () => {
    const { fetch } = mockFetch({
      body: { choices: [{ message: { content: 'hi' } }] },
    });
    const llm = openAiCompatibleLLM({
      apiKey: 'k',
      model: 'gpt-oss',
      baseUrl: 'https://example.com/v1',
      fetch,
    });
    const reply = await llm('hi');
    expect(reply).toBe('hi');
  });

  it('hits the base URL + /chat/completions path', async () => {
    const { fetch, calls } = mockFetch({
      body: { choices: [{ message: { content: 'ok' } }] },
    });
    const llm = openAiCompatibleLLM({
      apiKey: 'k',
      model: 'm',
      baseUrl: 'https://api.deepseek.com/v1',
      fetch,
    });
    await llm('x');
    expect(calls[0]?.url).toBe('https://api.deepseek.com/v1/chat/completions');
  });

  it('strips a trailing slash from baseUrl', async () => {
    const { fetch, calls } = mockFetch({
      body: { choices: [{ message: { content: 'ok' } }] },
    });
    const llm = openAiCompatibleLLM({
      apiKey: 'k',
      model: 'm',
      baseUrl: 'https://api.example.com/v1/',
      fetch,
    });
    await llm('x');
    expect(calls[0]?.url).toBe('https://api.example.com/v1/chat/completions');
  });

  it('forwards extraHeaders for providers that need them', async () => {
    const { fetch, calls } = mockFetch({
      body: { choices: [{ message: { content: 'ok' } }] },
    });
    const llm = openAiCompatibleLLM({
      apiKey: 'k',
      model: 'm',
      baseUrl: 'https://example.com/v1',
      extraHeaders: { 'x-my-header': 'value' },
      fetch,
    });
    await llm('x');
    const headers = calls[0]?.init?.headers as Record<string, string> | undefined;
    expect(headers?.['x-my-header']).toBe('value');
    expect(headers?.Authorization).toBe('Bearer k');
  });

  it('uses providerLabel in error messages', async () => {
    const { fetch } = mockFetch({
      status: 401,
      statusText: 'Unauthorized',
      body: 'nope',
    });
    const llm = openAiCompatibleLLM({
      apiKey: 'k',
      model: 'm',
      baseUrl: 'https://example.com/v1',
      providerLabel: 'DeepSeek',
      fetch,
    });
    await expect(llm('x')).rejects.toThrow(/DeepSeek/);
  });

  it('throws when apiKey is missing', () => {
    expect(() => openAiCompatibleLLM({ apiKey: '', model: 'm', baseUrl: 'u' })).toThrow(/apiKey/);
  });

  it('throws when model is missing', () => {
    expect(() => openAiCompatibleLLM({ apiKey: 'k', model: '', baseUrl: 'u' })).toThrow(/model/);
  });

  it('throws when baseUrl is missing', () => {
    expect(() => openAiCompatibleLLM({ apiKey: 'k', model: 'm', baseUrl: '' })).toThrow(/baseUrl/);
  });
});
