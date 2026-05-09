# Doctor Chaos — Integration Guide for AI Editors

> This document is written for AI coding assistants (Cursor, Claude
> Code, Kiro, Cline, Aider, Windsurf, Copilot Chat, etc.) to read when
> a user asks: "add Doctor Chaos to this project."
>
> It is **not** aimed at humans directly — humans should read
> [README.md](./README.md). This file contains the precise, step-by-
> step procedure an AI should follow to integrate the library into an
> existing codebase without surprises.

## What is Doctor Chaos

Doctor Chaos is a TypeScript library that auto-organises conversation
history for AI chat apps and agents. Instead of the user choosing
which conversation a message belongs to, the library routes each
incoming message into the correct "topic space" automatically.

Three routing tiers, from lowest to highest accuracy:

| Tier | Trigger                                            | Accuracy |
| ---- | -------------------------------------------------- | -------- |
| 1    | Zero config                                        | 60-75%   |
| 2    | `OPENAI_API_KEY` in env, or explicit `embed: ...`  | 90-95%   |
| 3    | Explicit `llm: ...` (works with any chat provider) | 95-99%   |

Tier 3 is the recommended default. It works with:

- OpenAI (via `@doctorchaos-ai/openai`)
- Anthropic Claude (`@doctorchaos-ai/anthropic`)
- DeepSeek (`@doctorchaos-ai/deepseek`)
- Moonshot Kimi (`@doctorchaos-ai/kimi`)
- Zhipu GLM (`@doctorchaos-ai/zhipu`)
- Alibaba Qwen (`@doctorchaos-ai/qwen`)
- MiniMax (`@doctorchaos-ai/minimax`)
- Doubao / Volcengine Ark (`@doctorchaos-ai/doubao`)

## When to integrate vs. skip

**DO integrate when** the user's project:

- Has a message handler (anything like `bot.on('message', ...)`,
  `onMessage()`, a webhook route, or a chat loop) where user messages
  flow through a single point
- Already uses an LLM via HTTP (OpenAI, Anthropic, or any of the
  Chinese providers listed above)
- Is TypeScript or JavaScript running on Node.js 18+, Bun, Deno, or
  a modern browser

**DO NOT integrate when**:

- The project has no concept of "conversations over time" (one-shot
  completion endpoints, stateless agents)
- The project is not TypeScript/JavaScript (Doctor Chaos has no
  Python/Go/Ruby port — tell the user to wait)
- The project already has conversation organisation working
  correctly — integrating would add complexity without benefit

If you're unsure, ask the user: "Where in your code do you receive
user messages? Show me that handler so I can wire Doctor Chaos into
it correctly."

## Integration procedure

Execute these steps **in order**. Do not skip ahead.

### Step 1 — Detect the framework

Look at the user's `package.json` dependencies and ask before guessing
if signals are ambiguous. Common patterns:

| Framework               | Dependency signal                     | Message handler pattern           |
| ----------------------- | ------------------------------------- | --------------------------------- |
| OpenClaw                | `@openclaw/*` packages                | Plugin-based; hook into a channel |
| Koishi                  | `koishi`                              | `ctx.on('message', ...)`          |
| Vercel AI SDK (Next.js) | `ai` + Next.js                        | Route handler `POST /api/chat`    |
| Raw Telegram            | `node-telegram-bot-api` or `telegraf` | `bot.on('message', ...)`          |
| Raw Discord             | `discord.js`                          | `client.on('messageCreate', ...)` |
| Custom                  | None of the above                     | Ask the user directly             |

### Step 2 — Ask the user which LLM provider

If `package.json` or `.env` already implies a provider (e.g., there's
an `openai` dep, or a `DEEPSEEK_API_KEY` env var), propose it. Otherwise
ask:

> "Which LLM are you using? OpenAI, Anthropic Claude, DeepSeek, Kimi,
> Zhipu, Qwen, MiniMax, or Doubao?"

### Step 3 — Install the two required packages

```bash
npm install @doctorchaos-ai/core @doctorchaos-ai/<provider>
```

Where `<provider>` is one of: `openai`, `anthropic`, `deepseek`,
`kimi`, `zhipu`, `qwen`, `minimax`, `doubao`.

Use `pnpm` or `yarn` if that's what the project uses — check for a
lockfile to decide.

### Step 4 — Initialize a Clinic instance

Create (or modify) a module that exports a single shared `Clinic`
instance. Recommended filename: `src/clinic.ts` or `lib/clinic.ts`
depending on the project's convention.

**Template** (replace `<provider>` with the chosen provider name):

```typescript
import { Clinic } from '@doctorchaos-ai/core';
import { <provider> } from '@doctorchaos-ai/<provider>';

export const clinic = new Clinic({
  llm: <provider>({
    apiKey: process.env.<PROVIDER>_API_KEY!,
    // Add `model: 'xxx'` if the project already pins a specific model.
  }),
});
```

Check for an existing `.env`, `.env.example`, or `.env.local` file and
add the required env var to all that exist:

```
<PROVIDER>_API_KEY=your-key-here
```

Provider-specific env var names:

| Provider    | Env var name        |
| ----------- | ------------------- |
| `openai`    | `OPENAI_API_KEY`    |
| `anthropic` | `ANTHROPIC_API_KEY` |
| `deepseek`  | `DEEPSEEK_API_KEY`  |
| `kimi`      | `MOONSHOT_API_KEY`  |
| `zhipu`     | `ZHIPU_API_KEY`     |
| `qwen`      | `DASHSCOPE_API_KEY` |
| `minimax`   | `MINIMAX_API_KEY`   |
| `doubao`    | `ARK_API_KEY`       |

Note on `doubao`: the `model` parameter is required and must be a
Volcengine Ark endpoint id (e.g. `ep-20250101-abcde`), not a model name.
Ask the user to provide it.

### Step 5 — Wire into the message handler

Find the existing message handler. Insert two lines at the top of the
handler and one line where the LLM is called:

**Before** (user's existing code):

```typescript
bot.on('message', async (msg) => {
  const reply = await llm.chat(msg.text);
  bot.send(reply);
});
```

**After**:

```typescript
import { clinic } from './clinic.js'; // or wherever you put it

bot.on('message', async (msg) => {
  // Route the message — Doctor Chaos picks a topic space.
  const result = await clinic.send({ role: 'user', content: msg.text });
  // Pull the topic space's full context (messages) for the LLM.
  const space = result.destination === 'topicSpace' ? clinic.space(result.space.id) : undefined;

  const reply = await llm.chat(msg.text, {
    // Adapt this to however the user's LLM client takes context.
    messages: space?.messages ?? [],
  });
  bot.send(reply);
});
```

The exact shape of the `messages: ...` argument depends on the user's
LLM client. Adapt it — don't paste verbatim.

### Step 6 — Add lifecycle maintenance (optional but recommended)

Doctor Chaos has two maintenance methods that should be called
periodically:

- `clinic.checkPackaging()` — promotes dense inbox fragments into new
  topic spaces
- `clinic.checkLifecycle()` — archives long-inactive topic spaces

Options to run these (pick one appropriate for the project):

| Project shape        | How to call maintenance                         |
| -------------------- | ----------------------------------------------- |
| Long-running bot     | After every N messages in the handler, or on a  |
|                      | `setInterval` (every few minutes)               |
| Request-response API | Call before responding (cheap, bounded)         |
| Serverless           | Skip these for now; recommend user call them on |
|                      | a scheduled cron                                |

Example (after every 10 messages):

```typescript
let counter = 0;
bot.on('message', async (msg) => {
  // ...existing handler...
  if (++counter % 10 === 0) {
    await clinic.checkPackaging();
    await clinic.checkLifecycle();
  }
});
```

### Step 7 — Add persistence (if the project has state)

If the project persists conversation state to a database or disk,
Doctor Chaos's in-memory state should be snapshotted alongside:

```typescript
// On shutdown / periodic save:
const snapshot = clinic.snapshot();
// Persist `snapshot.spaces`, `snapshot.inbox`, and
// `snapshot.corrections` however the project persists other state.

// On startup / rehydrate:
const clinic = new Clinic({
  initialSpaces: persistedSpaces,
  initialInbox: persistedInbox,
  correctionOptions: { corrections: persistedCorrections },
});
```

If the project has no persistence and runs in-memory only, skip this
step.

### Step 8 — Verify the integration

Run the project and test one conversation. Expected outcomes:

1. First message sent by the user: `clinic.send()` returns
   `result.destination === 'topicSpace'` with a new space, OR
   `'inbox'` if the message was too short/generic
2. Reply from the LLM references the correct context
3. A second unrelated message (e.g., first was about travel, second
   about home renovation) lands in a different topic space

If routing feels wrong, first suspect the tier: verify the user is
passing `llm: ...` (Tier 3) and that the env var has a valid key.

## Common pitfalls

### Pitfall 1: Using Tier 1 by mistake

If the user says "routing accuracy is terrible," the first thing to
check is: did we set up Tier 2 or Tier 3? Tier 1 (keyword matching,
the zero-config default) has 60-75% accuracy and should almost never
be left in production.

Verify by looking at the Clinic constructor call. If it's bare
`new Clinic()` and there's no `OPENAI_API_KEY` in env, the project is
on Tier 1. Fix by adding the `llm: ...` option.

### Pitfall 2: Calling clinic.send() on every token of a streaming LLM

`clinic.send()` is meant to be called **once per user message**, not
per token of the LLM's response. If the user's code is in a streaming
loop, put the `clinic.send()` call outside the loop, at the point
where the user's message first arrives.

### Pitfall 3: Using the `content` field wrongly

`clinic.send({ role: 'user', content: msg.text })` expects `content`
to be a plain string. If the user's agent passes multimodal content
(images, audio), extract the text portion first. Doctor Chaos does
not currently route based on non-text content.

### Pitfall 4: Forgetting peer dependency

The provider adapter packages (e.g., `@doctorchaos-ai/deepseek`) have
`@doctorchaos-ai/core` as a **peer dependency**. If the user has only
`@doctorchaos-ai/deepseek` installed without core, `npm install` will
warn and runtime imports will fail. Always install both.

### Pitfall 5: Mixing providers in one Clinic

A single `Clinic` instance has one `llm`. Don't try to pass an array
of LLMs or load-balance across providers inside the Clinic. If the
user wants fallback or load-balancing, wire that in their own LLM
wrapper function that matches the `LLMFunction` signature
`(prompt: string) => Promise<string>`.

## What NOT to do

- Do not modify any file outside of: the Clinic module you create,
  the message handler, and the `.env*` files. Explicitly do not touch
  the user's unrelated business logic.
- Do not uninstall or downgrade existing dependencies.
- Do not run `npm publish` or anything that affects the user's
  account state outside their repo.
- Do not invent new Doctor Chaos API surfaces that aren't in the
  official types. If a method isn't exported from
  `@doctorchaos-ai/core`, it doesn't exist.

## After integration — what to tell the user

Summarise the changes you made:

```
I integrated Doctor Chaos into your project. Here's what changed:

1. Installed packages: @doctorchaos-ai/core, @doctorchaos-ai/<provider>
2. Created src/clinic.ts (the shared Clinic instance)
3. Modified <message handler file> to route messages through Doctor
   Chaos before calling your LLM
4. Added <PROVIDER>_API_KEY to .env.example

To finish setup:

1. Put your actual API key in .env (not .env.example)
2. Run your project as normal
3. Send a few messages to your bot and watch topic spaces get created

To see routing decisions in action, log `result.decision.reasoning`
after each clinic.send() call.
```

## Reference links

- Full TypeScript API: `@doctorchaos-ai/core` package exports
- Repo: https://github.com/doctorchaos-ai/doctor-chaos
- npm org: https://www.npmjs.com/org/doctorchaos-ai
- Issues and discussion: disabled during alpha; open at v0.1.0

## Version

This file applies to `@doctorchaos-ai/core@0.2.0-alpha.0` and all
provider adapters at `0.1.0-alpha.0`. Later versions may diverge —
fetch the latest `LLMS.md` from the repo on every integration.
