import { describe, expect, it } from 'vitest';
import { OpenAiEmbeddingClient, OpenAiEmbeddingError, type FetchLike } from './client.js';

function mockFetch(
  responder: (request: { url: string; body: unknown; headers?: Record<string, string> }) => {
    status: number;
    body: unknown;
  },
): { fetch: FetchLike; calls: Array<{ url: string; body: unknown }> } {
  const calls: Array<{ url: string; body: unknown }> = [];
  const fetch: FetchLike = async (url, init) => {
    const parsedBody = init?.body ? JSON.parse(init.body) : undefined;
    const headers = init?.headers;
    calls.push({ url, body: parsedBody });
    const { status, body } = responder({ url, body: parsedBody, ...(headers ? { headers } : {}) });
    const text = JSON.stringify(body);
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      text: async () => text,
      json: async () => body,
    };
  };
  return { fetch, calls };
}

function successfulEmbeddingResponse(texts: string[]): unknown {
  return {
    data: texts.map((_, index) => ({
      embedding: new Array(8).fill(0).map((_, i) => (index + 1) / (i + 1)),
      index,
    })),
    model: 'text-embedding-3-small',
    usage: { prompt_tokens: 10, total_tokens: 10 },
  };
}

describe('OpenAiEmbeddingClient', () => {
  it('requires an apiKey', () => {
    // @ts-expect-error - validating runtime guard
    expect(() => new OpenAiEmbeddingClient({})).toThrow(/apiKey/);
  });

  it('returns an empty vector for empty input without calling the API', async () => {
    const { fetch, calls } = mockFetch(() => ({ status: 500, body: {} }));
    const client = new OpenAiEmbeddingClient({ apiKey: 'sk-test', fetch });
    expect(await client.embed('')).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it('embeds a single text and caches the result', async () => {
    const { fetch, calls } = mockFetch(({ body }) => {
      const inputs = (body as { input: string[] }).input;
      return { status: 200, body: successfulEmbeddingResponse(inputs) };
    });
    const client = new OpenAiEmbeddingClient({ apiKey: 'sk-test', fetch });
    const v1 = await client.embed('hello world');
    expect(v1).toHaveLength(8);
    expect(calls).toHaveLength(1);

    // Second call with same text should hit the cache.
    const v2 = await client.embed('hello world');
    expect(v2).toEqual(v1);
    expect(calls).toHaveLength(1);
    expect(client.cacheSize).toBe(1);
  });

  it('embeds a batch in a single API call, aligned to input order', async () => {
    const { fetch, calls } = mockFetch(({ body }) => {
      const inputs = (body as { input: string[] }).input;
      return { status: 200, body: successfulEmbeddingResponse(inputs) };
    });
    const client = new OpenAiEmbeddingClient({ apiKey: 'sk-test', fetch });
    const vectors = await client.embedBatch(['first', '', 'third']);
    expect(vectors).toHaveLength(3);
    expect(vectors[1]).toEqual([]); // empty input -> empty vector, skipped by API
    expect(vectors[0]?.length).toBe(8);
    expect(vectors[2]?.length).toBe(8);
    expect(calls).toHaveLength(1);
    // Only non-empty inputs were sent
    expect((calls[0]!.body as { input: string[] }).input).toEqual(['first', 'third']);
  });

  it('reuses cached vectors within a batch, only sending the uncached items', async () => {
    const { fetch, calls } = mockFetch(({ body }) => {
      const inputs = (body as { input: string[] }).input;
      return { status: 200, body: successfulEmbeddingResponse(inputs) };
    });
    const client = new OpenAiEmbeddingClient({ apiKey: 'sk-test', fetch });
    await client.embed('cached');
    expect(calls).toHaveLength(1);

    await client.embedBatch(['cached', 'fresh']);
    expect(calls).toHaveLength(2);
    expect((calls[1]!.body as { input: string[] }).input).toEqual(['fresh']);
  });

  it('sends the Authorization header and posts to /v1/embeddings by default', async () => {
    let capturedHeaders: Record<string, string> | undefined;
    const fetch: FetchLike = async (url, init) => {
      capturedHeaders = init?.headers;
      expect(url).toBe('https://api.openai.com/v1/embeddings');
      const body = successfulEmbeddingResponse(['x']);
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify(body),
        json: async () => body,
      };
    };
    const client = new OpenAiEmbeddingClient({ apiKey: 'sk-secret', fetch });
    await client.embed('x');
    expect(capturedHeaders?.Authorization).toBe('Bearer sk-secret');
    expect(capturedHeaders?.['Content-Type']).toBe('application/json');
  });

  it('uses a custom baseUrl when provided', async () => {
    let receivedUrl = '';
    const fetch: FetchLike = async (url) => {
      receivedUrl = url;
      const body = successfulEmbeddingResponse(['x']);
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify(body),
        json: async () => body,
      };
    };
    const client = new OpenAiEmbeddingClient({
      apiKey: 'sk-test',
      baseUrl: 'https://example.com/openai-proxy/v1',
      fetch,
    });
    await client.embed('x');
    expect(receivedUrl).toBe('https://example.com/openai-proxy/v1/embeddings');
  });

  it('throws a typed error on non-2xx responses', async () => {
    const { fetch } = mockFetch(() => ({ status: 429, body: { error: 'rate limited' } }));
    const client = new OpenAiEmbeddingClient({ apiKey: 'sk-test', fetch });
    await expect(client.embed('hello')).rejects.toBeInstanceOf(OpenAiEmbeddingError);
  });

  it('throws a typed error when the response is missing data', async () => {
    const { fetch } = mockFetch(() => ({ status: 200, body: { notData: [] } }));
    const client = new OpenAiEmbeddingClient({ apiKey: 'sk-test', fetch });
    await expect(client.embed('hello')).rejects.toBeInstanceOf(OpenAiEmbeddingError);
  });
});
