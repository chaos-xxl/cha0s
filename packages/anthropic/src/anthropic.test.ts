import { describe, expect, it, vi } from 'vitest';
import { anthropic } from './index.js';

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

describe('anthropic', () => {
  it('targets the /messages endpoint', async () => {
    const { fetch, calls } = mockFetch({
      body: { content: [{ type: 'text', text: 'hi' }] },
    });
    const llm = anthropic({ apiKey: 'sk-ant-test', fetch });
    await llm('x');
    expect(calls[0]?.url).toBe('https://api.anthropic.com/v1/messages');
  });

  it('sends x-api-key instead of Authorization', async () => {
    const { fetch, calls } = mockFetch({
      body: { content: [{ type: 'text', text: 'hi' }] },
    });
    const llm = anthropic({ apiKey: 'sk-ant-test', fetch });
    await llm('x');
    const headers = calls[0]?.init?.headers as Record<string, string> | undefined;
    expect(headers?.['x-api-key']).toBe('sk-ant-test');
    expect(headers?.['anthropic-version']).toBe('2023-06-01');
    expect(headers?.Authorization).toBeUndefined();
  });

  it('uses claude-3-5-haiku as the default model', async () => {
    const { fetch, calls } = mockFetch({
      body: { content: [{ type: 'text', text: 'ok' }] },
    });
    const llm = anthropic({ apiKey: 'k', fetch });
    await llm('x');
    const body = JSON.parse((calls[0]?.init?.body as string) ?? '{}') as { model: string };
    expect(body.model).toBe('claude-3-5-haiku-20241022');
  });

  it('returns the text from the first content block', async () => {
    const { fetch } = mockFetch({
      body: {
        content: [{ type: 'text', text: '{"verdict":"inbox"}' }],
      },
    });
    const llm = anthropic({ apiKey: 'k', fetch });
    expect(await llm('route me')).toBe('{"verdict":"inbox"}');
  });

  it('concatenates multiple text blocks in order', async () => {
    const { fetch } = mockFetch({
      body: {
        content: [
          { type: 'text', text: 'part one ' },
          { type: 'text', text: 'part two' },
        ],
      },
    });
    const llm = anthropic({ apiKey: 'k', fetch });
    expect(await llm('x')).toBe('part one part two');
  });

  it('skips non-text content blocks', async () => {
    const { fetch } = mockFetch({
      body: {
        content: [
          { type: 'tool_use', text: 'should be ignored' },
          { type: 'text', text: 'kept' },
        ],
      },
    });
    const llm = anthropic({ apiKey: 'k', fetch });
    expect(await llm('x')).toBe('kept');
  });

  it('throws on non-2xx', async () => {
    const { fetch } = mockFetch({
      status: 401,
      statusText: 'Unauthorized',
      body: { error: { message: 'invalid key' } },
    });
    const llm = anthropic({ apiKey: 'bad', fetch });
    await expect(llm('x')).rejects.toThrow(/401/);
  });

  it('throws if apiKey is missing', () => {
    expect(() => anthropic({ apiKey: '' })).toThrow(/apiKey is required/);
  });
});
