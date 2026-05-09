import { describe, expect, it, vi } from 'vitest';
import { qwen } from './index.js';

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

describe('qwen', () => {
  it('targets the DashScope compatible-mode base URL by default', async () => {
    const { fetch, calls } = mockFetch('ok');
    const llm = qwen({ apiKey: 'k', fetch });
    await llm('x');
    expect(calls[0]?.url).toBe(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    );
  });

  it('uses qwen-plus as the default model', async () => {
    const { fetch, calls } = mockFetch('ok');
    const llm = qwen({ apiKey: 'k', fetch });
    await llm('x');
    const body = JSON.parse((calls[0]?.init?.body as string) ?? '{}') as { model: string };
    expect(body.model).toBe('qwen-plus');
  });

  it('returns the assistant content verbatim', async () => {
    const { fetch } = mockFetch('{"verdict":"inbox"}');
    const llm = qwen({ apiKey: 'k', fetch });
    expect(await llm('route me')).toBe('{"verdict":"inbox"}');
  });
});
