# @doctorchaos-ai/deepseek

> DeepSeek LLM adapter for Doctor Chaos.

## Install

```bash
npm install @doctorchaos-ai/core @doctorchaos-ai/deepseek
```

## Use

```typescript
import { Clinic } from '@doctorchaos-ai/core';
import { deepseek } from '@doctorchaos-ai/deepseek';

const clinic = new Clinic({
  llm: deepseek({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

const result = await clinic.send({
  role: 'user',
  content: '帮我订下周去京都的机票',
});
```

## Options

| Option        | Default                       | Notes                                                                    |
| ------------- | ----------------------------- | ------------------------------------------------------------------------ |
| `apiKey`      | —                             | Required. Your DeepSeek API key.                                         |
| `model`       | `deepseek-chat`               | Use `deepseek-reasoner` for harder classification at higher latency.     |
| `baseUrl`     | `https://api.deepseek.com/v1` | Override for proxies or regional endpoints.                              |
| `temperature` | `0`                           | Routing is classification — keep it deterministic.                       |
| `maxTokens`   | `100`                         | Routing replies are one JSON line; don't raise this unless you know why. |
| `fetch`       | `globalThis.fetch`            | Inject your own for retries, logging, etc.                               |
| `signal`      | —                             | AbortSignal for cancellation.                                            |

## License

MIT © Chaos
