# @doctorchaos-ai/doubao

> Doubao (ByteDance Volcengine Ark) LLM adapter for Doctor Chaos.

## Install

```bash
npm install @doctorchaos-ai/core @doctorchaos-ai/doubao
```

## Use

```typescript
import { Clinic } from '@doctorchaos-ai/core';
import { doubao } from '@doctorchaos-ai/doubao';

const clinic = new Clinic({
  llm: doubao({
    apiKey: process.env.ARK_API_KEY!,
    model: 'ep-20250101-abcde', // your Volcengine endpoint id
  }),
});
```

## Options

| Option        | Default                                    | Notes                                                                                                                                                           |
| ------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apiKey`      | —                                          | Required. Volcengine Ark API key.                                                                                                                               |
| `model`       | —                                          | Required. Ark **endpoint id** (`ep-...`), created in the Volcengine console. Unlike other providers, Ark references models via endpoint id rather than by name. |
| `baseUrl`     | `https://ark.cn-beijing.volces.com/api/v3` | Regional Ark endpoint.                                                                                                                                          |
| `temperature` | `0`                                        |                                                                                                                                                                 |
| `maxTokens`   | `100`                                      |                                                                                                                                                                 |
| `fetch`       | `globalThis.fetch`                         |                                                                                                                                                                 |
| `signal`      | —                                          | AbortSignal for cancellation.                                                                                                                                   |

## Why `model` is an endpoint id

Volcengine Ark lets you configure specific deployments (rate limits,
quotas, model versions) as endpoints. You get a `ep-...` id for each
endpoint, and pass that where other providers would accept a model
name like `doubao-pro-128k`. Create and manage endpoints in the
[Volcengine console](https://console.volcengine.com/ark/region:ark+cn-beijing/endpoint).

## License

MIT © Chaos
