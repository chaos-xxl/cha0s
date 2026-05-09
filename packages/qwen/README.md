# @doctorchaos-ai/qwen

> Alibaba Qwen (DashScope) LLM adapter for Doctor Chaos.

## Install

```bash
npm install @doctorchaos-ai/core @doctorchaos-ai/qwen
```

## Use

```typescript
import { Clinic } from '@doctorchaos-ai/core';
import { qwen } from '@doctorchaos-ai/qwen';

const clinic = new Clinic({
  llm: qwen({ apiKey: process.env.DASHSCOPE_API_KEY! }),
});
```

## Options

| Option        | Default                                             | Notes                                                                                           |
| ------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `apiKey`      | —                                                   | Required. DashScope API key.                                                                    |
| `model`       | `qwen-plus`                                         | Use `qwen-turbo` (cheaper/faster) or `qwen-max` (higher quality).                               |
| `baseUrl`     | `https://dashscope.aliyuncs.com/compatible-mode/v1` | Set to `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` for the international endpoint. |
| `temperature` | `0`                                                 |                                                                                                 |
| `maxTokens`   | `100`                                               |                                                                                                 |
| `fetch`       | `globalThis.fetch`                                  |                                                                                                 |
| `signal`      | —                                                   | AbortSignal for cancellation.                                                                   |

## License

MIT © Chaos
