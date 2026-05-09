import { describe, expect, it, vi } from 'vitest';
import { kimi } from './index.js';

function mockFetch(reply: string): {
  fetch: typeof fetch;
  calls: Array<{ url: string; init: RequestInit | undefined }>;
} {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '',
      json: async () => ({ choices: [{ message: { content: reply } }] }),
    } as unknown as Response;
  });
  return { fetch: fetchImpl as unknown as typeof fetch, calls };
}

describe('kimi', () => {
  it('targets the Moonshot CN base URL by default', async () => {
    const { fetch, calls } = mockFetch('ok');
    const llm = kimi({ apiKey: 'k', fetch });
    await llm('x');
    expect(calls[0]?.url).toBe('https://api.moonshot.cn/v1/chat/completions');
  });

  it('uses moonshot-v1-8k as the default model', async () => {
    const { fetch, calls } = mockFetch('ok');
    const llm = kimi({ apiKey: 'k', fetch });
    await llm('x');
    const body = JSON.parse((calls[0]?.init?.body as string) ?? '{}') as { model: string };
    expect(body.model).toBe('moonshot-v1-8k');
  });

  it('returns the assistant content verbatim', async () => {
    const { fetch } = mockFetch('{"verdict":"inbox"}');
    const llm = kimi({ apiKey: 'k', fetch });
    expect(await llm('route me')).toBe('{"verdict":"inbox"}');
  });

  it('errors surface with the Kimi label', async () => {
    const fetchImpl = vi.fn(async () => {
      return {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'bad key',
        json: async () => ({}),
      } as unknown as Response;
    });
    const llm = kimi({ apiKey: 'bad', fetch: fetchImpl as unknown as typeof fetch });
    await expect(llm('x')).rejects.toThrow(/Kimi/);
  });
});
