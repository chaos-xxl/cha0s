# @cha0s-ai/core

> Turn your conversation chaos down to 0.
> The conversation organization layer for AI chat apps.

**Status**: 🚧 Alpha — under active development. Public API may change between minor releases.

## Install

```bash
npm install @cha0s-ai/core
# or
pnpm add @cha0s-ai/core
# or
yarn add @cha0s-ai/core
```

## What is cha0s?

cha0s is a TypeScript library that gives AI chat apps automatic conversation structure — so users never have to organize their own chat history.

Think of it as the missing layer between LLMs and chat UIs:

| Library                                                | Scope                                |
| ------------------------------------------------------ | ------------------------------------ |
| [LangChain](https://github.com/langchain-ai/langchain) | Connect LLMs to tools and data       |
| [Mem0](https://github.com/mem0ai/mem0)                 | Remember user facts and preferences  |
| **cha0s**                                              | **Organize the conversation itself** |

## Roadmap

The real API is being ported from a Swift reference implementation. Upcoming modules:

- Message routing with time-decay confidence weighting
- Topic-space emergence from conversation fragments
- Fragment clustering & packaging
- Pluggable LLM and embedding adapters (`@cha0s-ai/openai`, `@cha0s-ai/anthropic`, ...)
- Pluggable storage adapters (`@cha0s-ai/memory`, `@cha0s-ai/indexeddb`, ...)

## Links

- **Project**: [github.com/chaos-xxl/cha0s](https://github.com/chaos-xxl/cha0s)
- **Author**: [@Chaosxinglong](https://x.com/Chaosxinglong) on X

## License

MIT © Chaos
