<div align="center">

# Doctor Chaos

**The conversation organization layer for AI chat apps and agents.**

_Doctor Chaos will see you now._

[![npm](https://img.shields.io/npm/v/@doctorchaos-ai/core?color=%23ff7a00)](https://www.npmjs.com/package/@doctorchaos-ai/core)
[![CI](https://github.com/doctorchaos-ai/doctor-chaos/actions/workflows/ci.yml/badge.svg)](https://github.com/doctorchaos-ai/doctor-chaos/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-%23ff7a00)](./LICENSE)
[![stage](https://img.shields.io/badge/stage-alpha-orange)](./README.md)

</div>

🇨🇳 [中文文档](./README_zh.md)

---

## What is Doctor Chaos?

Doctor Chaos gives any AI chat or agent app **automatic conversation structure** — so users never have to organize their own chat history. Incoming messages route themselves into the right topic space. Loose fragments cluster and promote themselves into brand-new spaces. Dormant threads quietly fade out of the way.

Today, every AI user is a filing clerk: renaming chats, building folders, archaeology through the sidebar for Tuesday's thread. That's a design failure, not a feature. Doctor Chaos fixes the layer that makes this failure feel inevitable.

---

## The hospital metaphor

Doctor Chaos borrows its architecture from how a hospital actually works. Three places, one admission process, and a strict rule: **patients are not asked to self-diagnose.**

| Space                       | Role                                                                                                                                                            |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Front Desk**              | Every message is triaged here first. The router decides whether it belongs in an existing specialty, a brand-new one, or general practice.                      |
| **General Practice**        | The safe place for anything that's not yet a "thing." Messages wait here without pressure to be labelled. When a theme emerges, it's packaged into a specialty. |
| **Topic Space (Specialty)** | A long-running, focused conversation with its full context. Created by the clinic, not by the user.                                                             |

The library does the triage. Your agent keeps doing what it already does.

---

## Where Doctor Chaos fits

| Library                                                | Scope                                |
| ------------------------------------------------------ | ------------------------------------ |
| [LangChain](https://github.com/langchain-ai/langchain) | Connect LLMs to tools and data       |
| [Mem0](https://github.com/mem0ai/mem0)                 | Remember user facts and preferences  |
| **Doctor Chaos**                                       | **Organize the conversation itself** |

Complementary, not competitive. A full agent stack can use all three.

---

## See it move

```bash
git clone https://github.com/doctorchaos-ai/doctor-chaos.git
cd doctor-chaos
pnpm install
pnpm demo
```

You'll land in a split-screen terminal UI — type messages, watch the clinic pick a destination, and see it explain why.

_A recorded walkthrough is coming with the v0.1.0 announcement._

---

## Install

```bash
npm install @doctorchaos-ai/core
# or
pnpm add @doctorchaos-ai/core
```

## Thirty-second tour

```typescript
import { Clinic } from '@doctorchaos-ai/core';

const clinic = new Clinic();

// Send a user message — the clinic picks a destination.
const result = await clinic.send({
  role: 'user',
  content: 'Book me a flight to Kyoto next week.',
});

if (result.destination === 'topicSpace') {
  console.log(`Landed in: ${result.space.name}`);
  console.log(`Why: ${result.decision.reasoning}`);
}

// Read state — e.g. to render a sidebar.
const spaces = clinic.spaces({ status: 'active' });
const inbox = clinic.inbox();

// User correction — the router learns from it.
await clinic.moveMessage(messageId, targetSpaceId);

// Periodic maintenance — safe to run any time.
await clinic.checkPackaging();
await clinic.checkLifecycle();

// Persistence — snapshot and rehydrate.
const snapshot = clinic.snapshot();
// Later: new Clinic({ initialSpaces: snapshot.spaces, initialInbox: snapshot.inbox, ... })
```

## For agent builders

Got an AI agent that already handles LLM, UI, and messaging? Doctor Chaos plugs in as a thin middleware — 10 lines of integration, no migration:

- **Stays your agent**: The clinic never talks to the user or the LLM directly. It decides where a message belongs; your agent keeps serving the context it chooses.
- **Framework-agnostic**: zero runtime dependencies in the core. Works in Node, Bun, Deno, browsers, workers, and edge runtimes.
- **LLM-agnostic**: swap in embedding-backed strategies via adapter packages (coming soon), or stick with the keyword-based defaults.
- **Stateless-friendly**: call `snapshot()` when you need to persist, hydrate on restart.

See [`examples/cli-demo`](./examples/cli-demo) for a working integration.

---

## Project status

Doctor Chaos is in **alpha**. The public API is feature-complete for the v0.1.0 scope but may still shift between minor versions based on real-world integration feedback.

**What works today**

- Routing (strong / weak / trivial / normal signals, with time-decay weighting)
- Clustering (keyword co-occurrence MVP; embedding adapters planned)
- Packaging (transactional cut of fragments into new spaces)
- Lifecycle (archive / reactivate / merge / rename)
- Correction learning (user overrides bias future routing)
- Full TypeScript types, 135+ unit tests, CI across Node 18/20/22

**What's next**

- `@doctorchaos-ai/openai`, `@doctorchaos-ai/anthropic` — embedding-backed strategies
- `@doctorchaos-ai/react` — headless React hooks for chat UIs
- `@doctorchaos-ai/sqlite`, `@doctorchaos-ai/indexeddb` — storage adapters
- First adapter for an established TS agent framework (OpenClaw candidate)

---

## Community

- 🧑‍💻 Author: [Dr. Chaos](https://x.com/Chaosxinglong)
- 💬 Issues and Discussions: **temporarily disabled** during alpha to keep iteration fast. Both open at v0.1.0.
- 🔗 [npm package](https://www.npmjs.com/package/@doctorchaos-ai/core)

Follow [@Chaosxinglong](https://x.com/Chaosxinglong) on X for development updates.

---

## Design origin

Doctor Chaos began as an iOS reference implementation exploring how AI chat UIs should evolve beyond the sidebar-of-everything. The Swift prototype is not the product — its role was to stress-test the model of routing + clustering + packaging before the TypeScript port. The algorithms in `@doctorchaos-ai/core` are the final-form port, with pluggable strategy interfaces so embedding-backed replacements drop in cleanly.

The project was previously known as **cha0s** and is still available on npm as `@cha0s-ai/core` (deprecated — please use `@doctorchaos-ai/core`).

---

## License

[MIT](./LICENSE) © [Chaos](https://github.com/chaos-xxl)
