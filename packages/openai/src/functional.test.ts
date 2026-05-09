import { describe, expect, it, vi } from 'vitest';
import { openaiEmbed, openaiLLM } from './functional.js';

/**
 * Build a mock fetch that returns a canned JSON body on success, or a
 * canned error body on failure. `calls` collects the (url, init) pairs
 * so assertions can inspect what was actually sent to OpenAI.
 */
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

describe('openaiEmbed', () => {
  it('returns embeddings in input order', async () => {
    const { fetch } = mockFetch({
      body: {
        data: [
          { index: 0, embedding: [1, 0, 0] },
          { index: 1, embedding: [0, 1, 0] },
        ],
      },
    });
    const embed = openaiEmbed({ apiKey: 'sk-test', fetch });
    const vectors = await embed(['hello', 'world']);
    expect(vectors).toHaveLength(2);
    expect(vectors[0]).toEqual([1, 0, 0]);
    expect(vectors[1]).toEqual([0, 1, 0]);
  });

  it('sends an Authorization header with the provided key', async () => {
    const { fetch, calls } = mockFetch({
      body: { data: [{ index: 0, embedding: [1] }] },
    });
    const embed = openaiEmbed({ apiKey: 'sk-my-test-key', fetch });
    await embed(['hi']);
    const headers = calls[0]?.init?.headers as Record<string, string> | undefined;
    expect(headers?.Authorization).toBe('Bearer sk-my-test-key');
  });

  it('respects a custom base URL', async () => {
    const { fetch, calls } = mockFetch({
      body: { data: [{ index: 0, embedding: [1] }] },
    });
    const embed = openaiEmbed({
      apiKey: 'sk-test',
      baseUrl: 'https://custom.proxy.example/v1',
      fetch,
    });
    await embed(['hi']);
    expect(calls[0]?.url).toBe('https://custom.proxy.example/v1/embeddings');
  });
});

describe('openaiLLM', () => {
  it('returns the assistant message content', async () => {
    const { fetch } = mockFetch({
      body: {
        choices: [{ message: { content: '{"verdict":"inbox"}' } }],
      },
    });
    const llm = openaiLLM({ apiKey: 'sk-test', fetch });
    const reply = await llm('please route this');
    expect(reply).toBe('{"verdict":"inbox"}');
  });

  it('sends the prompt as a single user message', async () => {
    const { fetch, calls } = mockFetch({
      body: { choices: [{ message: { content: 'ok' } }] },
    });
    const llm = openaiLLM({ apiKey: 'sk-test', fetch });
    await llm('this is the prompt');
    const body = JSON.parse((calls[0]?.init?.body as string) ?? '{}') as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0]?.role).toBe('user');
    expect(body.messages[0]?.content).toBe('this is the prompt');
  });

  it('throws on non-2xx responses', async () => {
    const { fetch } = mockFetch({
      status: 401,
      statusText: 'Unauthorized',
      body: { error: 'invalid_api_key' },
    });
    const llm = openaiLLM({ apiKey: 'sk-bad', fetch });
    await expect(llm('x')).rejects.toThrow(/401/);
  });

  it('sends temperature=0 by default (deterministic routing)', async () => {
    const { fetch, calls } = mockFetch({
      body: { choices: [{ message: { content: 'ok' } }] },
    });
    const llm = openaiLLM({ apiKey: 'sk-test', fetch });
    await llm('x');
    const body = JSON.parse((calls[0]?.init?.body as string) ?? '{}') as {
      temperature: number;
    };
    expect(body.temperature).toBe(0);
  });

  it('uses gpt-4o-mini by default', async () => {
    const { fetch, calls } = mockFetch({
      body: { choices: [{ message: { content: 'ok' } }] },
    });
    const llm = openaiLLM({ apiKey: 'sk-test', fetch });
    await llm('x');
    const body = JSON.parse((calls[0]?.init?.body as string) ?? '{}') as {
      model: string;
    };
    expect(body.model).toBe('gpt-4o-mini');
  });

  it('throws if apiKey is missing', () => {
    expect(() => openaiLLM({ apiKey: '' })).toThrow(/apiKey is required/);
  });
});
