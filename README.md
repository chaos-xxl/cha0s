<div align="center">

# Doctor Chaos

**面向 AI 聊天应用与 agent 的对话组织层。**
**The conversation organization layer for AI chat apps and agents.**

_Doctor Chaos will see you now._

[![npm](https://img.shields.io/npm/v/@doctorchaos-ai/core?color=%23ff7a00)](https://www.npmjs.com/package/@doctorchaos-ai/core)
[![CI](https://github.com/doctorchaos-ai/doctor-chaos/actions/workflows/ci.yml/badge.svg)](https://github.com/doctorchaos-ai/doctor-chaos/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-%23ff7a00)](./LICENSE)
[![stage](https://img.shields.io/badge/stage-alpha-orange)](./README.md)

[中文](#doctor-chaos-是什么) · [English](#what-is-doctor-chaos)

</div>

---

## Doctor Chaos 是什么

Doctor Chaos 给任何 AI 聊天应用或 agent 提供自动化的对话结构。新消息会自动路由到对应的话题空间;零散的碎片会聚合、涌现成新的话题空间;长期不活跃的话题悄悄归档。用户不再需要自己管理聊天历史。

打开任何一个主流 AI 聊天工具,你都在做一件本不该你做的事:重命名对话、建文件夹、在侧边栏翻找上周三那个会话。每一个 AI 用户都被悄悄地塞了一份兼职——做自己聊天记录的文件管理员。

这是设计上的失败,不是功能。Doctor Chaos 修复的就是让这种失败感觉起来"理所当然"的那一层。

---

## 医院隐喻

我们没有把它做成"AI 智能分类器",因为聪明的分类器你已经见过太多了。

Doctor Chaos 的架构源于医院的运作方式。三个空间,一个接诊流程,一条硬规则:**病人不需要自己诊断。**

| 空间                       | 职责                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------- |
| **前台(Front Desk)**       | 每条消息都先在这里被分诊。路由器决定它是进入已有专科、新开一个专科,还是先留在全科。   |
| **全科(General Practice)** | 暂时还不是"一件事"的内容留在这里。消息在这里不需要被归类,直到主题浮现后再打包成专科。 |
| **专科(Topic Space)**      | 一个长期运行、拥有完整上下文的话题空间。由系统自动创建,不需要用户动手。               |

这个库负责分诊。你的 agent 继续做它已经在做的事。

---

## Doctor Chaos 的定位

| 库                                                     | 职责                       |
| ------------------------------------------------------ | -------------------------- |
| [LangChain](https://github.com/langchain-ai/langchain) | 把 LLM 连接到工具和数据    |
| [Mem0](https://github.com/mem0ai/mem0)                 | 让 AI 记住用户的事实和偏好 |
| **Doctor Chaos**                                       | **组织对话本身**           |

三者互补,不冲突。一个完整的 agent 可以同时使用三者。

---

## 跑起来看看

```bash
git clone https://github.com/doctorchaos-ai/doctor-chaos.git
cd doctor-chaos
pnpm install
pnpm demo
```

你会进入一个终端 UI——输入消息,看 Doctor Chaos 如何选择目的地,并解释它为什么这么选。

_v0.1.0 发布时会附带一段录屏演示。_

---

## 安装

```bash
npm install @doctorchaos-ai/core
# 或
pnpm add @doctorchaos-ai/core
```

## 三十秒上手

```typescript
import { Clinic } from '@doctorchaos-ai/core';

const clinic = new Clinic();

// 发送一条用户消息——Doctor Chaos 自动选择目的地
const result = await clinic.send({
  role: 'user',
  content: '帮我订下周去京都的机票',
});

if (result.destination === 'topicSpace') {
  console.log(`落入话题空间:${result.space.name}`);
  console.log(`理由:${result.decision.reasoning}`);
}

// 读取状态——用于渲染侧边栏
const spaces = clinic.spaces({ status: 'active' });
const inbox = clinic.inbox();

// 用户纠正——路由器会从中学习
await clinic.moveMessage(messageId, targetSpaceId);

// 定期维护——任何时候都可以安全调用
await clinic.checkPackaging();
await clinic.checkLifecycle();

// 持久化——快照和恢复
const snapshot = clinic.snapshot();
// 稍后:new Clinic({ initialSpaces: snapshot.spaces, initialInbox: snapshot.inbox, ... })
```

## 给 agent 作者

我们不抢你的 agent。Doctor Chaos 是一层薄薄的中间件,大约 10 行代码集成,不需要迁移原有架构:

- **agent 还是你的**:Doctor Chaos 不直接和用户或 LLM 对话。它只决定消息归属;你的 agent 继续提供它选择的上下文。
- **框架无关**:core 零运行时依赖。可在 Node、Bun、Deno、浏览器、Worker、edge runtime 中运行。
- **LLM 无关**:可以通过适配包接入 embedding 策略,也可以继续用默认的关键词策略。
- **有状态但不强制**:需要持久化时调 `snapshot()`,重启时 rehydrate。

完整接入示例见 [`examples/cli-demo`](./examples/cli-demo)。

---

## 项目状态

Doctor Chaos 目前处于 **alpha** 阶段。alpha 不是免责声明,是承诺——v0.1.0 范围内的公开 API 已经完备,但可能根据真实集成反馈在小版本之间调整。

**已经可用的功能**

- 路由(strong / weak / trivial / normal 信号,带时间衰减权重)
- 聚类(关键词共现 MVP;计划中的 embedding 适配)
- 打包(把 inbox 碎片事务性地剪切成新话题空间)
- 生命周期(归档 / 复活 / 合并 / 重命名)
- 纠正学习(用户手动修正会影响后续路由)
- 完整 TypeScript 类型定义、135+ 单元测试、CI 覆盖 Node 18/20/22

**接下来的计划**

- `@doctorchaos-ai/openai`、`@doctorchaos-ai/anthropic`——基于 embedding 的策略
- `@doctorchaos-ai/react`——无 UI 的 React hooks
- `@doctorchaos-ai/sqlite`、`@doctorchaos-ai/indexeddb`——存储适配器
- 第一个和成熟 TS agent 框架的适配包(OpenClaw 候选)

---

## 社区

诊室小,人不多,但门是开的。

- 🧑‍💻 作者:[Dr. Chaos](https://x.com/Chaosxinglong)
- 💬 Issues 与 Discussions:**alpha 期间暂时关闭**以保持迭代速度。v0.1.0 时开放。
- 🔗 [npm 包](https://www.npmjs.com/package/@doctorchaos-ai/core)

在 X 上关注 [@Chaosxinglong](https://x.com/Chaosxinglong) 获取开发进度。

---

## 设计起源

Doctor Chaos 最早是一个 iOS 参考实现,不是为了发布,是为了搞清楚一件事:AI 聊天 UI 怎么才能摆脱无尽侧边栏。

Swift 原型从来不是最终产品。它的任务只有一个——在 TypeScript 移植之前,压力测试"路由 + 聚类 + 打包"这套模型能不能立得住。`@doctorchaos-ai/core` 里的算法是这套模型的最终形态,接口设计预留了 embedding 策略的扩展点。

项目之前叫 **cha0s**,npm 上还能看到 `@cha0s-ai/core`(已废弃,请使用 `@doctorchaos-ai/core`)。换名字这事拖了挺久,主要是当时还没想清楚医院隐喻——直到分诊台、全科、专科这三层结构跑通,才意识到这个项目其实在"接诊"。

---

<div align="center">

— English version below · 英文版在下方 —

</div>

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
