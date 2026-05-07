<div align="center">

# cha0s

**Turn your conversation chaos down to 0.**

_The conversation organization layer for AI chat apps._

[![npm](https://img.shields.io/npm/v/@cha0s-ai/core?color=%23ff7a00)](https://www.npmjs.com/package/@cha0s-ai/core)
[![license](https://img.shields.io/github/license/chaos-xxl/cha0s?color=%23ff7a00)](./LICENSE)
[![stage](https://img.shields.io/badge/stage-early_development-orange)](./README.md)

</div>

---

## 🚧 Project Status

**cha0s is in early development.** The v0.1.0 public release is not ready yet. This repo is public for transparency and authorship — you can watch the build, but the library is not production-ready.

- 📦 npm: [`@cha0s-ai/core`](https://www.npmjs.com/package/@cha0s-ai/core) (placeholder release only)
- 🧑‍💻 Author: [Chaos](https://x.com/Chaosxinglong)
- 💬 Issues and Discussions: **temporarily disabled** while the core ships. External PRs: **not accepted yet**. Both will open at v0.1.0.

Follow [@Chaosxinglong](https://x.com/Chaosxinglong) on X for development updates.

---

## What is cha0s?

cha0s is a TypeScript library that gives AI chat apps **automatic conversation structure** — so users never have to organize their own chat history.

Today, every AI user becomes a filing clerk:

- Renaming chats.
- Creating folders.
- Scrolling through a messy sidebar to find a conversation from last Tuesday.

That's a design failure, not a feature. AI has more than enough intelligence to organize its own conversations. cha0s is the library that makes it happen — one `route()` call at a time.

### Where cha0s fits

| Library                                                | Scope                                |
| ------------------------------------------------------ | ------------------------------------ |
| [LangChain](https://github.com/langchain-ai/langchain) | Connect LLMs to tools and data       |
| [Mem0](https://github.com/mem0ai/mem0)                 | Remember user facts and preferences  |
| **cha0s**                                              | **Organize the conversation itself** |

These are complementary. A full AI chat stack can use all three.

---

## The idea (30-second version)

```typescript
import { Cha0s } from '@cha0s-ai/core';
import { openai } from '@cha0s-ai/openai';

const cha0s = new Cha0s({
  llm: openai({ apiKey: process.env.OPENAI_API_KEY }),
});

// Send a message. cha0s decides where it belongs.
const result = await cha0s.route('Book me a flight to Beijing tomorrow.');

// → { destination: 'topic:travel', confidence: 0.89, reasoning: '...' }
```

No folders. No renaming. No sidebar archeology.

> ⚠️ This API is design-only right now. The actual implementation is under active development.

---

## Roadmap to v0.1.0

- [ ] `@cha0s-ai/core` — routing, clustering, packaging, time-decay
- [ ] `@cha0s-ai/openai` — OpenAI embedding + LLM adapter
- [ ] `@cha0s-ai/anthropic` — Anthropic adapter
- [ ] `@cha0s-ai/memory` — in-memory storage (testing + small apps)
- [ ] `@cha0s-ai/indexeddb` — browser storage
- [ ] Example: `examples/nextjs-chat`
- [ ] Full API documentation

Later (post-v0.1.0):

- [ ] `@cha0s-ai/gemini`, local embeddings (transformers.js)
- [ ] `@cha0s-ai/sqlite`, `@cha0s-ai/postgres`
- [ ] `@cha0s-ai/react` — headless React hooks
- [ ] `@cha0s-ai/pipeline` — advanced composable API

---

## Design Origin

The core design came from an iOS reference implementation where the ideas first took shape. That Swift prototype is not the product, but it's the source truth for the algorithms being ported to TypeScript here. Read the design notes in [`/docs/design`](./docs/design) (coming soon).

---

## License

[MIT](./LICENSE) © [Chaos](https://github.com/chaos-xxl)
