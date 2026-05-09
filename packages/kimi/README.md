# @doctorchaos-ai/kimi

> Moonshot Kimi LLM adapter for Doctor Chaos.

## Install

```bash
npm install @doctorchaos-ai/core @doctorchaos-ai/kimi
```

## Use

```typescript
import { Clinic } from '@doctorchaos-ai/core';
import { kimi } from '@doctorchaos-ai/kimi';

const clinic = new Clinic({
  llm: kimi({ apiKey: process.env.MOONSHOT_API_KEY! }),
});
```

## Options

| Option        | Default                      | Notes                                                                                      |
| ------------- | ---------------------------- | ------------------------------------------------------------------------------------------ |
| `apiKey`      | —                            | Required. Moonshot API key.                                                                |
| `model`       | `moonshot-v1-8k`             | Use `moonshot-v1-32k` or `moonshot-v1-128k` only if your keyword lists run unusually long. |
| `baseUrl`     | `https://api.moonshot.cn/v1` | Set to `https://api.moonshot.ai/v1` for the international endpoint.                        |
| `temperature` | `0`                          | Classification — keep it deterministic.                                                    |
| `maxTokens`   | `100`                        | The routing prompt wants one JSON line.                                                    |
| `fetch`       | `globalThis.fetch`           | Inject your own for retries, logging, etc.                                                 |
| `signal`      | —                            | AbortSignal for cancellation.                                                              |

## License

MIT © Chaos
