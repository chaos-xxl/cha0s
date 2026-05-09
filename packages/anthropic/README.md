# @doctorchaos-ai/anthropic

> Anthropic Claude LLM adapter for Doctor Chaos.

## Install

```bash
npm install @doctorchaos-ai/core @doctorchaos-ai/anthropic
```

## Use

```typescript
import { Clinic } from '@doctorchaos-ai/core';
import { anthropic } from '@doctorchaos-ai/anthropic';

const clinic = new Clinic({
  llm: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! }),
});
```

## Options

| Option        | Default                        | Notes                                                              |
| ------------- | ------------------------------ | ------------------------------------------------------------------ |
| `apiKey`      | —                              | Required. Anthropic API key (`sk-ant-...`).                        |
| `model`       | `claude-3-5-haiku-20241022`    | Upgrade to `claude-3-5-sonnet-20241022` for harder classification. |
| `baseUrl`     | `https://api.anthropic.com/v1` |                                                                    |
| `version`     | `2023-06-01`                   | Sent as `anthropic-version` header.                                |
| `temperature` | `0`                            |                                                                    |
| `maxTokens`   | `100`                          | Anthropic requires `max_tokens`; 100 is enough for a JSON verdict. |
| `fetch`       | `globalThis.fetch`             |                                                                    |
| `signal`      | —                              | AbortSignal for cancellation.                                      |

## Why this adapter exists

Anthropic's chat API lives at `/messages`, not `/chat/completions`,
uses `x-api-key` instead of `Authorization: Bearer ...`, and returns
content as an array of blocks rather than a single string. This
adapter papers over those differences so Doctor Chaos can treat
Claude the same as any other LLM.

## License

MIT © Chaos
