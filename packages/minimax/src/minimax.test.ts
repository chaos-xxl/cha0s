import { describe, expect, it, vi } from 'vitest';
import { minimax } from './index.js';

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

describe('minimax', () => {
  it('targets the MiniMax chatcompletion_v2 path', async () => {
    const { fetch, calls } = mockFetch('ok');
    const llm = minimax({ apiKey: 'k', fetch });
    await llm('x');
    expect(calls[0]?.url).toBe('https://api.minimaxi.com/v1/text/chatcompletion_v2');
  });

  it('uses MiniMax-Text-01 as the default model', async () => {
    const { fetch, calls } = mockFetch('ok');
    const llm = minimax({ apiKey: 'k', fetch });
    await llm('x');
    const body = JSON.parse((calls[0]?.init?.body as string) ?? '{}') as { model: string };
    expect(body.model).toBe('MiniMax-Text-01');
  });

  it('uses the international base URL when passed', async () => {
    const { fetch, calls } = mockFetch('ok');
    const llm = minimax({
      apiKey: 'k',
      baseUrl: 'https://api.minimax.io/v1',
      fetch,
    });
    await llm('x');
    expect(calls[0]?.url).toBe('https://api.minimax.io/v1/text/chatcompletion_v2');
  });

  it('returns the assistant content verbatim', async () => {
    const { fetch } = mockFetch('{"verdict":"inbox"}');
    const llm = minimax({ apiKey: 'k', fetch });
    expect(await llm('route me')).toBe('{"verdict":"inbox"}');
  });
});
