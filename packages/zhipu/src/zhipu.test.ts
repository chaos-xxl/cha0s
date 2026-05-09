import { describe, expect, it, vi } from 'vitest';
import { zhipu } from './index.js';

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

describe('zhipu', () => {
  it('targets the BigModel base URL by default', async () => {
    const { fetch, calls } = mockFetch('ok');
    const llm = zhipu({ apiKey: 'k', fetch });
    await llm('x');
    expect(calls[0]?.url).toBe('https://open.bigmodel.cn/api/paas/v4/chat/completions');
  });

  it('uses glm-4-flash as the default model', async () => {
    const { fetch, calls } = mockFetch('ok');
    const llm = zhipu({ apiKey: 'k', fetch });
    await llm('x');
    const body = JSON.parse((calls[0]?.init?.body as string) ?? '{}') as { model: string };
    expect(body.model).toBe('glm-4-flash');
  });

  it('returns the assistant content verbatim', async () => {
    const { fetch } = mockFetch('{"verdict":"inbox"}');
    const llm = zhipu({ apiKey: 'k', fetch });
    expect(await llm('route me')).toBe('{"verdict":"inbox"}');
  });
});
