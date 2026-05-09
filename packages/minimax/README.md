# @doctorchaos-ai/minimax

> MiniMax LLM adapter for Doctor Chaos.

## Install

```bash
npm install @doctorchaos-ai/core @doctorchaos-ai/minimax
```

## Use

```typescript
import { Clinic } from '@doctorchaos-ai/core';
import { minimax } from '@doctorchaos-ai/minimax';

const clinic = new Clinic({
  llm: minimax({ apiKey: process.env.MINIMAX_API_KEY! }),
});
```

## Options

| Option        | Default                       | Notes                                                                               |
| ------------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| `apiKey`      | —                             | Required. MiniMax API key.                                                          |
| `model`       | `MiniMax-Text-01`             | Flagship text model. Other options: `abab6.5s-chat`, `abab6.5t-chat`, `MiniMax-M1`. |
| `baseUrl`     | `https://api.minimaxi.com/v1` | CN endpoint. Use `https://api.minimax.io/v1` for the international deployment.      |
| `temperature` | `0`                           |                                                                                     |
| `maxTokens`   | `100`                         |                                                                                     |
| `fetch`       | `globalThis.fetch`            |                                                                                     |
| `signal`      | —                             | AbortSignal for cancellation.                                                       |

## Why this adapter exists

MiniMax speaks the OpenAI request/response shape but hosts its chat
endpoint at `/v1/text/chatcompletion_v2` instead of
`/v1/chat/completions`. This adapter wires up the correct path.

## License

MIT © Chaos
