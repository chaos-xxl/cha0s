<div align="center">

# cha0s

**Turn your conversation chaos down to 0.**

_The conversation organization layer for AI chat apps and agents._

[![npm](https://img.shields.io/npm/v/@cha0s-ai/core?color=%23ff7a00)](https://www.npmjs.com/package/@cha0s-ai/core)
[![CI](https://github.com/chaos-xxl/cha0s/actions/workflows/ci.yml/badge.svg)](https://github.com/chaos-xxl/cha0s/actions/workflows/ci.yml)
[![license](https://img.shields.io/github/license/chaos-xxl/cha0s?color=%23ff7a00)](./LICENSE)
[![stage](https://img.shields.io/badge/stage-alpha-orange)](./README.md)

</div>

---

## What is cha0s?

cha0s gives any AI chat or agent app **automatic conversation structure** — so users never have to organize their own chat history. Incoming messages route themselves into the right topic space. Loose fragments cluster and promote themselves into brand-new spaces. Dormant threads quietly fade out of the way.

Today, every AI user is a filing clerk: renaming chats, building folders, archaeology through the sidebar for Tuesday's thread. That's a design failure, not a feature. cha0s fixes the layer that makes this failure feel inevitable.

### Where cha0s fits

| Library                                                | Scope                                |
| ------------------------------------------------------ | ------------------------------------ |
| [LangChain](https://github.com/langchain-ai/langchain) | Connect LLMs to tools and data       |
| [Mem0](https://github.com/mem0ai/mem0)                 | Remember user facts and preferences  |
| **cha0s**                                              | **Organize the conversation itself** |

cha0s is complementary, not competitive. A full agent stack can use all three.

---

## See it move

```bash
git clone https://github.com/chaos-xxl/cha0s.git
cd cha0s
pnpm install
pnpm demo
```

You'll land in a split-screen terminal UI — type messages, watch cha0s pick a destination, and see it explain why.

_A recorded walkthrough is coming with the v0.1.0 announcement._

---

## Install

```bash
npm install @cha0s-ai/core
# or
pnpm add @cha0s-ai/core
```

## Thirty-second tour

```typescript
import { Cha0s } from '@cha0s-ai/core';

const cha0s = new Cha0s();

// Send a user message — cha0s picks a destination.
const result = await cha0s.send({
  role: 'user',
  content: 'Book me a flight to Kyoto next week.',
});

if (result.destination === 'topicSpace') {
  console.log(`Landed in: ${result.space.name}`);
  console.log(`Why: ${result.decision.reasoning}`);
}

// Read state — e.g. to render a sidebar.
const spaces = cha0s.spaces({ status: 'active' });
const inbox = cha0s.inbox();

// User correction — the router learns from it.
await cha0s.moveMessage(messageId, targetSpaceId);

// Periodic maintenance — safe to run any time.
await cha0s.checkPackaging();
await cha0s.checkLifecycle();

// Persistence — snapshot and rehydrate.
const snapshot = cha0s.snapshot();
// Later: new Cha0s({ initialSpaces: snapshot.spaces, initialInbox: snapshot.inbox, ... })
```

## For agent builders

Got an AI agent that already handles LLM, UI, and messaging? cha0s plugs in as a thin middleware — 10 lines of integration, no migration:

- **Stays your agent**: cha0s never talks to the user or the LLM directly. It decides where a message belongs; your agent keeps serving the context it chooses.
- **Framework-agnostic**: zero runtime dependencies in the core. Works in Node, Bun, Deno, browsers, workers, and edge runtimes.
- **LLM-agnostic**: swap in embedding-backed strategies via adapter packages (coming soon), or stick with the keyword-based defaults.
- **Stateless-friendly**: call `snapshot()` when you need to persist, hydrate on restart.

See [`examples/cli-demo`](./examples/cli-demo) for a working integration.

---

## Project status

cha0s is in **alpha**. The public API is feature-complete for the v0.1.0 scope but may still shift between minor versions based on real-world integration feedback.

**What works today**

- Routing (strong / weak / trivial / normal signals, with time-decay weighting)
- Clustering (keyword co-occurrence MVP; embedding adapters planned)
- Packaging (transactional cut of fragments into new spaces)
- Lifecycle (archive / reactivate / merge / rename)
- Correction learning (user overrides bias future routing)
- Full TypeScript types, 135+ unit tests, CI across Node 18/20/22

**What's next**

- `@cha0s-ai/openai`, `@cha0s-ai/anthropic` — embedding-backed strategies
- `@cha0s-ai/react` — headless React hooks for chat UIs
- `@cha0s-ai/sqlite`, `@cha0s-ai/indexeddb` — storage adapters
- First adapter for an established TS agent framework (OpenClaw candidate)

---

## Community

- 🧑‍💻 Author: [Chaos](https://x.com/Chaosxinglong)
- 💬 Issues and Discussions: **temporarily disabled** during alpha to keep iteration fast. Both open at v0.1.0.
- 🔗 [npm package](https://www.npmjs.com/package/@cha0s-ai/core)

Follow [@Chaosxinglong](https://x.com/Chaosxinglong) on X for development updates.

---

## Design origin

cha0s began as an iOS reference implementation exploring how AI chat UIs should evolve beyond the sidebar-of-everything. The Swift prototype is not the product — its role was to stress-test the model of routing + clustering + packaging before the TypeScript port. The algorithms in `@cha0s-ai/core` are the final-form port, with pluggable strategy interfaces so embedding-backed replacements drop in cleanly.

---

## License

[MIT](./LICENSE) © [Chaos](https://github.com/chaos-xxl)
