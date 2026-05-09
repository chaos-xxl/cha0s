# @doctorchaos-ai/zhipu

> Zhipu GLM LLM adapter for Doctor Chaos.

## Install

```bash
npm install @doctorchaos-ai/core @doctorchaos-ai/zhipu
```

## Use

```typescript
import { Clinic } from '@doctorchaos-ai/core';
import { zhipu } from '@doctorchaos-ai/zhipu';

const clinic = new Clinic({
  llm: zhipu({ apiKey: process.env.ZHIPU_API_KEY! }),
});
```

## Options

| Option        | Default                                | Notes                                                                   |
| ------------- | -------------------------------------- | ----------------------------------------------------------------------- |
| `apiKey`      | —                                      | Required. Zhipu API key (usually in `keyId.keySecret` form).            |
| `model`       | `glm-4-flash`                          | Free-tier fast model. Upgrade to `glm-4-air`, `glm-4-plus`, or `glm-4`. |
| `baseUrl`     | `https://open.bigmodel.cn/api/paas/v4` |                                                                         |
| `temperature` | `0`                                    |                                                                         |
| `maxTokens`   | `100`                                  |                                                                         |
| `fetch`       | `globalThis.fetch`                     |                                                                         |
| `signal`      | —                                      | AbortSignal for cancellation.                                           |

## License

MIT © Chaos
