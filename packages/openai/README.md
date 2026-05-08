# @cha0s-ai/openai

> OpenAI embedding adapter for cha0s. Drop-in upgrade from keyword matching to semantic routing.

**Status**: 🚧 Alpha. Public API may change between minor releases.

## Install

```bash
npm install @cha0s-ai/core @cha0s-ai/openai
```

## Use

```typescript
import { Cha0s } from '@cha0s-ai/core';
import { openaiEmbedding, openaiClustering } from '@cha0s-ai/openai';

const embedding = openaiEmbedding({
  apiKey: process.env.OPENAI_API_KEY!,
  // model: 'text-embedding-3-small',  // default
});

const cha0s = new Cha0s({
  engineOptions: { matchingStrategy: embedding },
  clusteringStrategy: openaiClustering({
    client: embedding.client, // share the vector cache
  }),
});

const result = await cha0s.send({
  role: 'user',
  content: 'pick up where we left off on the Kyoto trip',
});
// result.space -> the right topic space, even if no keyword literally matches.
```

## What changes vs the default keyword strategy

| Scenario                                     | Keyword default      | OpenAI embedding          |
| -------------------------------------------- | -------------------- | ------------------------- |
| "flight to Kyoto"                            | hits travel keywords | ✅ routes to Travel space |
| "thinking about heading to Japan next month" | ❌ no keyword hits   | ✅ routes to Travel space |
| "订个机票" (Chinese, no English keyword)     | ❌ no keyword hits   | ✅ routes to Travel space |
| Empty message                                | 0 score              | 0 score (no API call)     |

## Cost and performance

- Model: `text-embedding-3-small` (default) at about **$0.02 per million tokens** as of writing.
- A single typical routing call embeds 1 message + one-off embedding of each space's keywords (cached).
- First call per space: ~200–400ms. Subsequent calls: ~100–200ms (keyword vectors cached).

To reduce cost further:

- Share a client across embedding + clustering strategies (see `client` option).
- Set `cacheOptions.maxEntries` higher for long-running agents.

## Custom providers (Azure / OpenRouter / LiteLLM / local)

The adapter speaks the plain OpenAI embeddings JSON protocol, so any compatible endpoint works:

```typescript
openaiEmbedding({
  apiKey: 'sk-proxy-key',
  baseUrl: 'https://openrouter.ai/api/v1',
  model: 'text-embedding-3-large',
});
```

## Bring your own fetch

```typescript
import { openaiEmbedding } from '@cha0s-ai/openai';
import fetchWithRetry from 'your-retry-fetcher';

openaiEmbedding({
  apiKey: '...',
  fetch: fetchWithRetry,
});
```

Works in Node 18+, Bun, Deno, Cloudflare Workers, and modern browsers.

## License

MIT © Chaos
