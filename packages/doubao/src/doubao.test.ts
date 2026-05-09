import { describe, expect, it, vi } from 'vitest';
import { doubao } from './index.js';

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

describe('doubao', () => {
  it('targets the Ark chat/completions endpoint', async () => {
    const { fetch, calls } = mockFetch('ok');
    const llm = doubao({ apiKey: 'k', model: 'ep-xxx', fetch });
    await llm('x');
    expect(calls[0]?.url).toBe('https://ark.cn-beijing.volces.com/api/v3/chat/completions');
  });

  it('passes the Ark endpoint id through as `model`', async () => {
    const { fetch, calls } = mockFetch('ok');
    const llm = doubao({ apiKey: 'k', model: 'ep-20250101-abcde', fetch });
    await llm('x');
    const body = JSON.parse((calls[0]?.init?.body as string) ?? '{}') as { model: string };
    expect(body.model).toBe('ep-20250101-abcde');
  });

  it('returns the assistant content verbatim', async () => {
    const { fetch } = mockFetch('{"verdict":"inbox"}');
    const llm = doubao({ apiKey: 'k', model: 'ep-xxx', fetch });
    expect(await llm('route me')).toBe('{"verdict":"inbox"}');
  });
});
