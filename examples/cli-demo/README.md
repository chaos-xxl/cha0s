# @doctorchaos-ai/cli-demo

> Watch Doctor Chaos organise a conversation — live, in your terminal.

An interactive terminal demo that lets you type messages and see the clinic's router place each one into the right topic space (or the inbox, or a brand-new space). No API keys, no network calls — everything runs locally with the zero-dependency keyword-matching default strategy.

## Run it

From the repository root:

```bash
pnpm install
pnpm --filter @doctorchaos-ai/cli-demo start
```

On startup you'll be greeted with the clinic's standard arrival notice, then dropped into a split-screen terminal UI:

```
┌─── Welcome to Doctor Chaos v0.1.0 ────────────────┐
│                                                    │
│  Waiting time: unknown                             │
│  Bed availability: sufficient                      │
│  Your assigned doctor: whoever shows up first      │
│                                                    │
│  If this is an emergency, please type faster.      │
│                                                    │
└────────────────────────────────────────────────────┘

┌─ Topic spaces ────────┬─ Current space ───────────────┐
│ · Travel 2026   (3)   │ > Book a flight to Kyoto      │
│ · Home reno     (5)   │                                │
│ · (inbox)       (2)   │ [reasoning: keyword match     │
│                       │  on 'travel' + 'flight']      │
└───────────────────────┴────────────────────────────────┘
> type your message here_
```

Type something and hit Enter. The clinic picks a destination, explains why, and appends your message.

## Scripted warm-up

When the demo starts, it seeds a handful of spaces and inbox fragments so the layout is interesting from the first keystroke. The seed conversations live in `src/mock-scripts.ts` and are readable — edit them to match your own scenarios.

## Commands

Inside the prompt:

- Any text → sent as a user message.
- `/spaces` → list all spaces with their status.
- `/inbox` → list inbox fragments.
- `/package` → manually trigger `clinic.checkPackaging()`.
- `/clear` → clear the screen.
- `/quit` → exit.

## Why this demo exists

Doctor Chaos is a library, not a product. This demo is the shortest bridge between "I read the README" and "I see the idea move". Everything you watch happen is `@doctorchaos-ai/core` doing its job — the demo is ~300 lines of glue around it.
