# @doctorchaos-ai/core

> Doctor Chaos will see you now.
> The conversation organization layer for AI chat apps.

**Status**: 🚧 Alpha — under active development. Public API may change between minor releases.

## Install

```bash
npm install @doctorchaos-ai/core
# or
pnpm add @doctorchaos-ai/core
# or
yarn add @doctorchaos-ai/core
```

## What is Doctor Chaos?

Doctor Chaos is a TypeScript library that gives AI chat apps automatic conversation structure — so users never have to organize their own chat history.

Three places, one admission process:

- **Front Desk** — every message is triaged here
- **General Practice** — the safe waiting room for anything not yet a "thing"
- **Topic Space (Specialty)** — long-running, focused conversations the library creates for you

Think of it as the missing layer between LLMs and chat UIs:

| Library                                                | Scope                                |
| ------------------------------------------------------ | ------------------------------------ |
| [LangChain](https://github.com/langchain-ai/langchain) | Connect LLMs to tools and data       |
| [Mem0](https://github.com/mem0ai/mem0)                 | Remember user facts and preferences  |
| **Doctor Chaos**                                       | **Organize the conversation itself** |

## What's included today

The library has finished the Swift → TypeScript port and ships a working alpha:

- Message routing with time-decay confidence weighting
- Topic-space emergence from conversation fragments
- Fragment clustering & packaging
- Lifecycle management (archive / reactivate / merge / rename)
- Correction learning from user overrides
- Pluggable strategy interfaces for embedding-backed routing and clustering

## Available adapters

- [`@doctorchaos-ai/openai`](https://www.npmjs.com/package/@doctorchaos-ai/openai) — OpenAI embedding + semantic clustering

## Planned

- `@doctorchaos-ai/anthropic` — Anthropic-backed adapter
- `@doctorchaos-ai/react` — headless React hooks
- `@doctorchaos-ai/sqlite`, `@doctorchaos-ai/indexeddb` — storage adapters

## Links

- **Project**: [github.com/doctorchaos-ai/doctor-chaos](https://github.com/doctorchaos-ai/doctor-chaos)
- **Author**: [@Chaosxinglong](https://x.com/Chaosxinglong) on X

## License

MIT © Chaos
