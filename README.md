<div align="center">

<img src="./assets/logo-wordmark.svg" alt="Doctor Chaos" width="480"/>

**面向 AI 聊天应用与 agent 的对话组织层 · The conversation organization layer for AI chat apps and agents**

_Doctor Chaos will see you now._

[![npm](https://img.shields.io/npm/v/@doctorchaos-ai/core?color=%23ff7a00&label=%40doctorchaos-ai%2Fcore)](https://www.npmjs.com/package/@doctorchaos-ai/core)
[![CI](https://github.com/doctorchaos-ai/doctor-chaos/actions/workflows/ci.yml/badge.svg)](https://github.com/doctorchaos-ai/doctor-chaos/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-%23ff7a00)](./LICENSE)
[![tests](https://img.shields.io/badge/tests-249%20passing-brightgreen)](https://github.com/doctorchaos-ai/doctor-chaos/actions)
[![stage](https://img.shields.io/badge/stage-alpha-orange)](./README.md)

**[🇨🇳 中文](#为什么做这件事)** · **[🇬🇧 English](#english)**

</div>

---

## 为什么做这件事

打开任何一个主流 AI 聊天工具,你都在做一件本不该你做的事:重命名对话、建文件夹、在侧边栏翻找上周三那个会话。

**每一个 AI 用户都被悄悄地塞了一份兼职——做自己聊天记录的文件管理员。**

这是设计上的失败,不是功能。所有 AI 产品都在逼用户先回答"你要聊哪件事",再让你开口——对话归属这件事本该是 AI 的责任,不是用户的。

Doctor Chaos 修复的就是让这种失败感觉起来"理所当然"的那一层。**用户只负责说话,Doctor Chaos 负责知道这句话该去哪。**

---

## 三个卖点

> **① 用户不用管对话归属**
>
> 新消息自动路由到对应的话题空间;零散的碎片会聚合、涌现成新的话题空间;长期不活跃的话题悄悄归档。全程不问用户"你想去哪个房间"。

> **② 医院式设计,不是 AI 智能分类器**
>
> 你已经见过太多"AI 智能分类器"了,它们大多沦为噪音。Doctor Chaos 的架构源于医院运作方式——前台分诊、全科留观、专科接诊。这套结构是可以讲给产品经理、设计师、非技术团队听懂的,不只是工程师的玩具。

> **③ 主流大模型一等公民,不挑厂商**
>
> 做 agent 的开发者都知道一个痛点——搜对话组织相关的库,十有八九默认你用 OpenAI。
>
> Doctor Chaos 不一样。下面这 8 家厂商,**都是一等公民**,一行 import 就能接:
>
> - **海外**:OpenAI / Anthropic (Claude)
> - **国产**:DeepSeek / Kimi / 智谱 GLM / 通义千问 / MiniMax / 豆包
>
> 这是目前国内开发者生态里,第一个把 DeepSeek / Kimi / 豆包 / 智谱 / MiniMax / Qwen **全部当成一等公民**的对话组织库。

---

## 三档路由

Doctor Chaos 能开箱即用,但准确率取决于你给它的"眼睛"。三档递进:

| 档位                           | 触发条件                                   | 准确率 |   延迟    |    成本     |
| ------------------------------ | ------------------------------------------ | :----: | :-------: | :---------: |
| **🟧 第三档 · LLM 路由**       | 传 `llm: ...`                              | 95-99% | 300-800ms | ~$0.001/条  |
| **🟨 第二档 · Embedding 路由** | 传 `embed: ...` 或 env 有 `OPENAI_API_KEY` | 90-95% | 100-300ms | ~$0.0001/条 |
| **⬜ 第一档 · 关键词匹配**     | 零配置                                     | 60-75% |   <10ms   |    免费     |

```mermaid
flowchart TD
    A[new Clinic&#40;&#41;] --> B{用户传了什么?}
    B -->|llm: xxx| C[第三档<br/>LLM 路由]
    B -->|embed: xxx| D[第二档<br/>Embedding 路由]
    B -->|什么都没传| E{env 有<br/>OPENAI_API_KEY?}
    E -->|有| D
    E -->|没有| F[第一档<br/>关键词匹配]
```

<details>
<summary><b>第一档 · 关键词匹配（零配置，开箱即用）</b></summary>

<br/>

**怎么工作**:把用户的消息和每个话题空间的 keywords 做简单的字符串匹配,命中率高的就判为"属于这个空间"。

**特点**

- ✅ 零依赖、零配置、离线可用
- ✅ 延迟 <10ms,几乎感知不到
- ✅ 免费
- ❌ 准确率只有 60-75%,同义词、别称、跨语言全部失效

**适用场景**:本地开发、单元测试、POC demo。**生产环境不推荐。**

</details>

<details>
<summary><b>第二档 · Embedding 路由（自动嗅探 / 显式传入）</b></summary>

<br/>

**触发条件**(二选一):

- `process.env.OPENAI_API_KEY` 里有 OpenAI key,Doctor Chaos 自动嗅到并升级(也支持 `OPENAI_BASE_URL` 指向 Azure / OpenRouter / LiteLLM 等兼容端点)
- 显式传 `embed: openaiEmbed({ apiKey: ... })`

**怎么工作**:把消息和每个话题空间的 keywords 都转成向量,算余弦相似度,最接近的就是答案。

**特点**

- ✅ 准确率 90-95%,同义词、语义相近的自然匹配
- ✅ 延迟 100-300ms
- ✅ 成本极低,每条消息约 $0.0001
- ⚠️ 只适用于有 embedding 接口的厂商(OpenAI 及兼容厂商)

**适用场景**:大多数生产用户的默认选择。

</details>

<details>
<summary><b>第三档 · LLM 路由（任何大模型都能接）</b></summary>

<br/>

**怎么工作**:Doctor Chaos 构造一个 prompt,把"待路由的消息 + 当前所有话题空间的名字和 keywords"丢给大模型,让它直接回答"应该进哪个空间、新开一个、还是先留在全科"。

**特点**

- ✅ 准确率 95-99%,能理解"上周说的那件事"这种指代
- ✅ 支持所有 chat 模型——OpenAI / Claude / DeepSeek / Kimi / 智谱 / 千问 / MiniMax / 豆包 都行
- ✅ 无 embedding 端点的厂商(Anthropic、DeepSeek 等)的唯一靠谱方案
- ⚠️ 延迟 300-800ms(一次模型调用)
- ⚠️ 成本约 $0.001/条,比 embedding 贵 10 倍

**适用场景**:对准确率要求最高的产品,或你用的 LLM 厂商不提供 embedding。

</details>

---

## 快速开始

```bash
npm install @doctorchaos-ai/core @doctorchaos-ai/deepseek
# 换厂商只需要换包名:anthropic / kimi / zhipu / qwen / minimax / doubao / openai
```

```typescript
import { Clinic } from '@doctorchaos-ai/core';
import { deepseek } from '@doctorchaos-ai/deepseek';

const clinic = new Clinic({
  llm: deepseek({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

const result = await clinic.send({
  role: 'user',
  content: '帮我订下周去京都的机票',
});

if (result.destination === 'topicSpace') {
  console.log(`落入:${result.space.name}`);
  console.log(`理由:${result.decision.reasoning}`);
}
```

<details>
<summary><b>场景 A · 你用 OpenAI(或 OpenAI 兼容端点)</b></summary>

<br/>

```bash
npm install @doctorchaos-ai/core
```

环境变量里有 `OPENAI_API_KEY` 就够了,Doctor Chaos 自动升级到 Embedding 路由:

```typescript
import { Clinic } from '@doctorchaos-ai/core';
const clinic = new Clinic();
```

Key 不在 env 里,或想精确控制 model / baseUrl:

```typescript
import { Clinic } from '@doctorchaos-ai/core';
import { openaiEmbed } from '@doctorchaos-ai/openai';

const clinic = new Clinic({
  embed: openaiEmbed({ apiKey: 'sk-...', model: 'text-embedding-3-small' }),
});
```

</details>

<details>
<summary><b>场景 C · 你不想配任何 key(仅 demo)</b></summary>

<br/>

```bash
npm install @doctorchaos-ai/core
```

```typescript
import { Clinic } from '@doctorchaos-ai/core';
const clinic = new Clinic();
```

零配置,准确率 60-75%。POC / 测试 / demo 够用,**不推荐生产**。

</details>

---

## 完整 API

<details>
<summary><b>30 秒看完 Doctor Chaos 能做什么</b></summary>

<br/>

```typescript
import { Clinic } from '@doctorchaos-ai/core';
import { deepseek } from '@doctorchaos-ai/deepseek';

const clinic = new Clinic({
  llm: deepseek({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

// 1. 发消息,自动决定目的地
const result = await clinic.send({ role: 'user', content: '帮我订下周去京都的机票' });

// 2. 读取状态,用于渲染侧边栏
const spaces = clinic.spaces({ status: 'active' });
const inbox = clinic.inbox();

// 3. 用户手动纠正,路由器会学
await clinic.moveMessage(messageId, targetSpaceId);

// 4. 定期维护,任何时候都可以安全调用
await clinic.checkPackaging();
await clinic.checkLifecycle();

// 5. 持久化,快照 + 恢复
const snapshot = clinic.snapshot();
// 重启时:new Clinic({ initialSpaces: snapshot.spaces, initialInbox: snapshot.inbox, ... })
```

</details>

---

## 官方适配包

| 适配包                                                                                 | 厂商                                                         | 默认模型                                 |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------- |
| [`@doctorchaos-ai/openai`](https://www.npmjs.com/package/@doctorchaos-ai/openai)       | OpenAI / Azure / OpenRouter / LiteLLM / 任何 OpenAI 兼容端点 | `gpt-4o-mini` / `text-embedding-3-small` |
| [`@doctorchaos-ai/anthropic`](https://www.npmjs.com/package/@doctorchaos-ai/anthropic) | Anthropic Claude                                             | `claude-3-5-haiku-20241022`              |
| [`@doctorchaos-ai/deepseek`](https://www.npmjs.com/package/@doctorchaos-ai/deepseek)   | DeepSeek                                                     | `deepseek-chat`                          |
| [`@doctorchaos-ai/kimi`](https://www.npmjs.com/package/@doctorchaos-ai/kimi)           | Moonshot Kimi                                                | `moonshot-v1-8k`                         |
| [`@doctorchaos-ai/zhipu`](https://www.npmjs.com/package/@doctorchaos-ai/zhipu)         | 智谱 GLM                                                     | `glm-4-flash`                            |
| [`@doctorchaos-ai/qwen`](https://www.npmjs.com/package/@doctorchaos-ai/qwen)           | 通义千问(DashScope 兼容模式)                                 | `qwen-plus`                              |
| [`@doctorchaos-ai/minimax`](https://www.npmjs.com/package/@doctorchaos-ai/minimax)     | MiniMax                                                      | `MiniMax-Text-01`                        |
| [`@doctorchaos-ai/doubao`](https://www.npmjs.com/package/@doctorchaos-ai/doubao)       | 豆包(火山引擎 Ark)                                           | Ark endpoint id(自行创建)                |

> [!TIP]
> 没在这个列表里?用 core 自带的 `openAiCompatibleLLM` 一行代码接入任何 OpenAI 兼容端点——Groq、Together、自建代理都行。

---

## 医院隐喻:Doctor Chaos 内部长什么样

如果你要把 Doctor Chaos 集成进自己的产品,这一节帮你理解它的状态机。

三个空间,一个接诊流程,一条硬规则:**病人不需要自己诊断。**

| 空间                        | 职责                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------- |
| **前台 · Front Desk**       | 每条消息都先在这里被分诊。路由器决定它进入已有专科、新开一个专科,还是先留在全科。     |
| **全科 · General Practice** | 暂时还不是"一件事"的内容留在这里。消息在这里不需要被归类,直到主题浮现后再打包成专科。 |
| **专科 · Topic Space**      | 一个长期运行、拥有完整上下文的话题空间。由系统自动创建,不需要用户动手。               |

**关键动作**

- **分诊 · routing** — 每条新消息决定去哪
- **打包 · packaging** — 全科里某个方向的碎片积累到一定密度,系统自动剪切出来,打包成新的专科
- **生命周期 · lifecycle** — 专科长期不活跃会归档,用户再聊到相关内容会自动复活

这个库负责分诊。你的 agent 继续做它已经在做的事——只不过现在,它处理的消息流是已经被分门别类的。

---

## 定位

| 库                                                     | 职责                       |
| ------------------------------------------------------ | -------------------------- |
| [LangChain](https://github.com/langchain-ai/langchain) | 把 LLM 连接到工具和数据    |
| [Mem0](https://github.com/mem0ai/mem0)                 | 让 AI 记住用户的事实和偏好 |
| **Doctor Chaos**                                       | **组织对话本身**           |

三者互补,不冲突。一个完整的 agent 可以同时使用三者。

---

## 项目状态

> [!NOTE]
> Doctor Chaos 目前处于 **alpha** 阶段。alpha 不是免责声明,是承诺——v0.1.0 范围内的公开 API 已经完备,但可能根据真实集成反馈在小版本之间调整。

**已经可用**

- 三档路由:关键词 / Embedding / LLM
- 8 个官方适配包,覆盖主流海外与国产大模型
- 路由(strong / weak / trivial / normal 信号,带时间衰减权重)
- 聚类(关键词共现 + OpenAI embedding 两套策略)
- 打包、生命周期、纠正学习
- 完整 TypeScript 类型、249 个单元测试、CI 覆盖 Node 18/20/22

**接下来**

- `@doctorchaos-ai/react` · 无 UI 的 React hooks
- `@doctorchaos-ai/sqlite` / `@doctorchaos-ai/indexeddb` · 存储适配器
- 和成熟 TS agent 框架的适配包(OpenClaw 候选)

---

## 社区

诊室小,人不多,但门是开的。

- 🧑‍⚕️ 作者 · [Dr. Chaos](https://x.com/Chaosxinglong)
- 💬 Issues 与 Discussions · **alpha 期间暂时关闭**以保持迭代速度,v0.1.0 时开放
- 🔗 [npm 组织 @doctorchaos-ai](https://www.npmjs.com/org/doctorchaos-ai)

<details>
<summary><b>设计起源</b></summary>

<br/>

Doctor Chaos 最早是一个 iOS 参考实现,不是为了发布,是为了搞清楚一件事:AI 聊天 UI 怎么才能摆脱无尽侧边栏。

Swift 原型从来不是最终产品。它的任务只有一个——在 TypeScript 移植之前,压力测试"路由 + 聚类 + 打包"这套模型能不能立得住。`@doctorchaos-ai/core` 里的算法是这套模型的最终形态。

项目之前叫 **cha0s**,npm 上还能看到 `@cha0s-ai/core`(已废弃,请使用 `@doctorchaos-ai/core`)。换名字这事拖了挺久,主要是当时还没想清楚医院隐喻——直到分诊台、全科、专科这三层结构跑通,才意识到这个项目其实在"接诊"。

</details>

---

<div align="center">

<a id="english"></a>

— 🇬🇧 English version · 英文版点开 —

</div>

<details>
<summary><b>Read the English README</b></summary>

<br/>

## Why this exists

Open any mainstream AI chat tool and you're quietly doing a job nobody signed you up for: renaming conversations, building folders, archaeology in the sidebar for last Tuesday's thread.

**Every AI user has been drafted as a filing clerk for their own chat history.**

That's a design failure, not a feature. Every AI product makes you answer "which conversation is this?" before it lets you speak — but conversation placement should be the AI's job, not the user's.

Doctor Chaos fixes the layer that makes this failure feel inevitable. **The user just talks. Doctor Chaos figures out where the message belongs.**

## Three things that matter

> **① Users never manage conversation placement**
>
> New messages route themselves into the right topic space. Loose fragments cluster and promote themselves into brand-new spaces. Dormant threads quietly fade out of the way. Nobody asks the user "which room are we in?"

> **② Hospital-shaped, not another "AI smart classifier"**
>
> You've seen plenty of AI smart classifiers. Most of them are noise. Doctor Chaos is shaped like a hospital — triage at the front desk, watch-and-wait in general practice, specialty rooms for long-running topics. This structure is legible to product managers, designers, and non-technical teammates, not just engineers.

> **③ Every major LLM is a first-class citizen**
>
> Anyone building agents knows the pattern — search for a conversation-organization library and nine times out of ten, it silently assumes OpenAI.
>
> Doctor Chaos doesn't. These eight providers are **all first-class citizens**, plug in with one import:
>
> - **International**: OpenAI / Anthropic (Claude)
> - **Chinese**: DeepSeek / Kimi / Zhipu GLM / Qwen / MiniMax / Doubao
>
> This is the first conversation-organization library that treats DeepSeek, Kimi, Doubao, Zhipu, MiniMax, and Qwen as first-class citizens alongside the Western stack.

## Three-tier routing

| Tier                              | Trigger                                 | Accuracy |  Latency  |     Cost     |
| --------------------------------- | --------------------------------------- | :------: | :-------: | :----------: |
| **🟧 Tier 3 · LLM routing**       | `llm: ...`                              |  95-99%  | 300-800ms | ~$0.001/msg  |
| **🟨 Tier 2 · Embedding routing** | `embed: ...` or `OPENAI_API_KEY` in env |  90-95%  | 100-300ms | ~$0.0001/msg |
| **⬜ Tier 1 · Keyword matching**  | zero config                             |  60-75%  |   <10ms   |     free     |

```mermaid
flowchart TD
    A[new Clinic&#40;&#41;] --> B{What did you pass?}
    B -->|llm: xxx| C[Tier 3<br/>LLM routing]
    B -->|embed: xxx| D[Tier 2<br/>Embedding routing]
    B -->|nothing| E{OPENAI_API_KEY<br/>in env?}
    E -->|yes| D
    E -->|no| F[Tier 1<br/>Keyword matching]
```

<details>
<summary><b>Tier 1 · Keyword matching (zero config)</b></summary>

<br/>

**How**: Simple string matching between the incoming message and each space's keywords. Highest hit ratio wins.

**Characteristics**

- ✅ Zero dependencies, zero config, fully offline
- ✅ Latency <10ms
- ✅ Free
- ❌ 60-75% accuracy — synonyms, aliases, cross-language all fail

**Use when**: Local dev, unit tests, POC demos. **Not recommended for production.**

</details>

<details>
<summary><b>Tier 2 · Embedding routing (auto-detect / explicit)</b></summary>

<br/>

**Triggered when** (either):

- `OPENAI_API_KEY` is in env — Doctor Chaos auto-detects and upgrades. Also respects `OPENAI_BASE_URL` for Azure / OpenRouter / LiteLLM compatible endpoints.
- You pass `embed: openaiEmbed({ apiKey: ... })`.

**How**: Embed message and space keyword centroid. Cosine similarity wins.

**Characteristics**

- ✅ 90-95% accuracy — synonyms and semantic neighbors match naturally
- ✅ 100-300ms latency
- ✅ ~$0.0001 per message
- ⚠️ Only works with providers that ship an embedding endpoint

**Use when**: Default for most production users.

</details>

<details>
<summary><b>Tier 3 · LLM routing (works with any chat model)</b></summary>

<br/>

**How**: Doctor Chaos builds a prompt containing the message plus every active space's name and keywords, then asks the chat model which space the message belongs to (or "new space" or "inbox").

**Characteristics**

- ✅ 95-99% accuracy — can resolve references like "that thing from last week"
- ✅ Works with any chat model — OpenAI / Claude / DeepSeek / Kimi / Zhipu / Qwen / MiniMax / Doubao
- ✅ The only reliable path for providers without embedding endpoints
- ⚠️ 300-800ms latency per routed message
- ⚠️ ~$0.001 per message — 10× the embedding cost

**Use when**: Highest accuracy, or your LLM provider doesn't offer embeddings.

</details>

## Quick start

```bash
npm install @doctorchaos-ai/core @doctorchaos-ai/deepseek
# swap deepseek for: anthropic / kimi / zhipu / qwen / minimax / doubao / openai
```

```typescript
import { Clinic } from '@doctorchaos-ai/core';
import { deepseek } from '@doctorchaos-ai/deepseek';

const clinic = new Clinic({
  llm: deepseek({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

const result = await clinic.send({
  role: 'user',
  content: 'Book me a flight to Kyoto next week.',
});
```

## Official adapters

| Adapter                                                                                | Provider                                                               | Default model                            |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------- |
| [`@doctorchaos-ai/openai`](https://www.npmjs.com/package/@doctorchaos-ai/openai)       | OpenAI / Azure / OpenRouter / LiteLLM / any OpenAI-compatible endpoint | `gpt-4o-mini` / `text-embedding-3-small` |
| [`@doctorchaos-ai/anthropic`](https://www.npmjs.com/package/@doctorchaos-ai/anthropic) | Anthropic Claude                                                       | `claude-3-5-haiku-20241022`              |
| [`@doctorchaos-ai/deepseek`](https://www.npmjs.com/package/@doctorchaos-ai/deepseek)   | DeepSeek                                                               | `deepseek-chat`                          |
| [`@doctorchaos-ai/kimi`](https://www.npmjs.com/package/@doctorchaos-ai/kimi)           | Moonshot Kimi                                                          | `moonshot-v1-8k`                         |
| [`@doctorchaos-ai/zhipu`](https://www.npmjs.com/package/@doctorchaos-ai/zhipu)         | Zhipu GLM                                                              | `glm-4-flash`                            |
| [`@doctorchaos-ai/qwen`](https://www.npmjs.com/package/@doctorchaos-ai/qwen)           | Alibaba Qwen (DashScope compatible mode)                               | `qwen-plus`                              |
| [`@doctorchaos-ai/minimax`](https://www.npmjs.com/package/@doctorchaos-ai/minimax)     | MiniMax                                                                | `MiniMax-Text-01`                        |
| [`@doctorchaos-ai/doubao`](https://www.npmjs.com/package/@doctorchaos-ai/doubao)       | Doubao (Volcengine Ark)                                                | Ark endpoint id                          |

## The hospital metaphor

Three spaces, one admission process, and a strict rule: **patients are not asked to self-diagnose.**

| Space                       | Role                                                                                                                          |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Front Desk**              | Every message is triaged here first. The router decides: existing specialty, new specialty, or general practice.              |
| **General Practice**        | Anything not yet a "thing" waits here, without pressure to be labelled. When a theme emerges, it's packaged into a specialty. |
| **Topic Space (Specialty)** | A long-running, focused conversation with its full context. Created by the clinic, not by the user.                           |

## Where it fits

| Library                                                | Scope                                |
| ------------------------------------------------------ | ------------------------------------ |
| [LangChain](https://github.com/langchain-ai/langchain) | Connect LLMs to tools and data       |
| [Mem0](https://github.com/mem0ai/mem0)                 | Remember user facts and preferences  |
| **Doctor Chaos**                                       | **Organize the conversation itself** |

Complementary, not competitive. A complete agent can use all three.

## Project status

> [!NOTE]
> Doctor Chaos is in **alpha**. "Alpha" isn't a disclaimer — it's a commitment. The public API is feature-complete for v0.1.0 scope but may shift between minor versions based on real-world integration feedback.

- Three-tier routing: keyword / embedding / LLM
- Eight official adapters covering international and Chinese LLM providers
- Routing (strong / weak / trivial / normal signals, with time-decay weighting)
- Clustering (keyword co-occurrence + OpenAI embedding strategies)
- Packaging, lifecycle, correction learning
- Full TypeScript types, 249 unit tests, CI across Node 18/20/22

**What's next**

- `@doctorchaos-ai/react` — headless React hooks
- `@doctorchaos-ai/sqlite` / `@doctorchaos-ai/indexeddb` — storage adapters
- First adapter for an established TS agent framework (OpenClaw candidate)

## Community

The clinic is small, the waiting room is quiet, but the door is open.

- 🧑‍⚕️ Author · [Dr. Chaos](https://x.com/Chaosxinglong)
- 💬 Issues and Discussions · temporarily disabled during alpha to keep iteration fast. Both open at v0.1.0.
- 🔗 [@doctorchaos-ai on npm](https://www.npmjs.com/org/doctorchaos-ai)

## Design origin

Doctor Chaos started as an iOS reference implementation — not for release, but to answer a single question: how should AI chat UIs evolve beyond the sidebar-of-everything?

The Swift prototype was never the product. Its only job was stress-testing the "routing + clustering + packaging" model before the TypeScript port. The algorithms in `@doctorchaos-ai/core` are the final form of that model.

The project was previously known as **cha0s** (`@cha0s-ai/core`, deprecated). The renaming took a while — only when front desk, general practice, and specialty crystallized as three distinct layers did it become clear the project was really about triage.

</details>

---

<div align="center">

[MIT](./LICENSE) © [Chaos](https://github.com/chaos-xxl)

</div>
