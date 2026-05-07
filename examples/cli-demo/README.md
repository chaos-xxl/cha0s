# @cha0s-ai/cli-demo

> Watch cha0s organise a conversation — live, in your terminal.

An interactive terminal demo that lets you type messages and see the cha0s router place each one into the right topic space (or the inbox, or a brand-new space). No API keys, no network calls — everything runs locally with the zero-dependency keyword-matching default strategy.

## Run it

From the repository root:

```bash
pnpm install
pnpm --filter @cha0s-ai/cli-demo start
```

You'll see a split-screen terminal UI:

```
┌─ Topic spaces ────────┬─ Current space ───────────────┐
│ · Travel 2026   (3)   │ > Book a flight to Kyoto      │
│ · Home reno     (5)   │                                │
│ · (inbox)       (2)   │ [reasoning: keyword match     │
│                       │  on 'travel' + 'flight']      │
└───────────────────────┴────────────────────────────────┘
> type your message here_
```

Type something and hit Enter. cha0s picks a destination, explains why, and appends your message.

## Scripted warm-up

When the demo starts, it seeds a handful of spaces and inbox fragments so the layout is interesting from the first keystroke. The seed conversations live in `src/mock-scripts.ts` and are readable — edit them to match your own scenarios.

## Commands

Inside the prompt:

- Any text → sent as a user message.
- `/spaces` → list all spaces with their status.
- `/inbox` → list inbox fragments.
- `/package` → manually trigger `cha0s.checkPackaging()`.
- `/clear` → clear the screen.
- `/quit` → exit.

## Why this demo exists

cha0s is a library, not a product. This demo is the shortest bridge between "I read the README" and "I see the idea move". Everything you watch happen is `@cha0s-ai/core` doing its job — the demo is ~300 lines of glue around it.
