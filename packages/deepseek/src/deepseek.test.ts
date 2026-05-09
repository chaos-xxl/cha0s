import { describe, expect, it, vi } from 'vitest';
import { deepseek } from './index.js';

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

describe('deepseek', () => {
  it('targets the DeepSeek base URL by default', async () => {
    const { fetch, calls } = mockFetch('ok');
    const llm = deepseek({ apiKey: 'k', fetch });
    await llm('x');
    expect(calls[0]?.url).toBe('https://api.deepseek.com/v1/chat/completions');
  });

  it('uses deepseek-chat as the default model', async () => {
    const { fetch, calls } = mockFetch('ok');
    const llm = deepseek({ apiKey: 'k', fetch });
    await llm('x');
    const body = JSON.parse((calls[0]?.init?.body as string) ?? '{}') as { model: string };
    expect(body.model).toBe('deepseek-chat');
  });

  it('allows overriding the model', async () => {
    const { fetch, calls } = mockFetch('ok');
    const llm = deepseek({ apiKey: 'k', model: 'deepseek-reasoner', fetch });
    await llm('x');
    const body = JSON.parse((calls[0]?.init?.body as string) ?? '{}') as { model: string };
    expect(body.model).toBe('deepseek-reasoner');
  });

  it('returns the assistant content verbatim', async () => {
    const { fetch } = mockFetch('{"verdict":"inbox"}');
    const llm = deepseek({ apiKey: 'k', fetch });
    const reply = await llm('route me');
    expect(reply).toBe('{"verdict":"inbox"}');
  });
});
