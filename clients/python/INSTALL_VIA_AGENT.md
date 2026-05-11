# Install Doctor Chaos into Hermes via an AI Agent

如果你在用 Hermes、OpenClaw、Claude Desktop、Cursor 或任何有终端权限的 agent，**直接把下面那段 `<install-prompt>` 里面的内容发给它**，它会把 Doctor Chaos 装好、配好、跑起来。

你不用自己敲任何命令。

---

<install-prompt>

你好。我想把 Doctor Chaos（一个开源的话题路由 context engine）装进我当前这个 agent，让它从此按话题空间整理我的对话历史。请按下面的步骤帮我执行，每一步都在我的机器上真实运行命令，遇到问题**停下来问我**，不要瞎猜往下走。

## 项目信息

- GitHub: https://github.com/doctorchaos-ai/doctor-chaos
- 你要装的两个部分：
  1. `@doctorchaos-ai/server` —— Node.js 后台 daemon，跑在 `localhost:18790`
  2. `doctorchaos-hermes` —— Python 客户端 + Hermes `ContextEngine` 插件

## 第一步：摸清环境

**在开始之前，先回答我**：

1. 你是跑在什么 agent 里？（Hermes / OpenClaw / Claude Desktop / Cursor / 其他）
2. 我的操作系统是什么？（运行 `uname -a`）
3. 我是否已经装了 Node.js 18 或以上？（运行 `node --version`，如果没装或版本低于 18，告诉我去哪里装——推荐 https://nodejs.org 或 `brew install node`）
4. 我是否已经装了 Python 3.9 或以上？（运行 `python3 --version`）
5. 我的 shell 里是否已经有任何一家 LLM 厂商的 API key？（Doctor Chaos 支持 **8 家**：OpenAI / Anthropic / DeepSeek / Kimi / 智谱 / 通义 / MiniMax / 豆包；任意一个 key 存在就能启用最高档位）

   逐一检查，不要把 key 本身打出来：

   ```bash
   for var in OPENAI_API_KEY ANTHROPIC_API_KEY DEEPSEEK_API_KEY \
              MOONSHOT_API_KEY ZHIPUAI_API_KEY DASHSCOPE_API_KEY \
              MINIMAX_API_KEY ARK_API_KEY; do
     val=$(eval echo \$$var)
     if [ -n "$val" ]; then
       echo "$var: set"
     else
       echo "$var: unset"
     fi
   done
   ```

   把哪些是 `set` 告诉我就行。如果一个都没有，daemon 会自动降级到 keyword 档位——能跑，但分房间的质量会差一截。
6. 我当前这个 agent 的插件目录在哪里？（Hermes 默认是 `~/.hermes/plugins/context_engine/`；如果你不确定，查一下你这个 agent 的文档）

**如果上面任何一个答不出来，先停下来告诉我缺什么**，不要强行继续。

## 第二步：拉代码

```bash
# 建个工作目录（如果你已经 clone 过这个仓库，跳到第三步）
mkdir -p ~/src && cd ~/src
git clone https://github.com/doctorchaos-ai/doctor-chaos.git
cd doctor-chaos
```

## 第三步：构建并启动 daemon

```bash
# 装 workspace 依赖
corepack enable
pnpm install

# 构建 server 包
pnpm --filter @doctorchaos-ai/server build

# 前台启动 daemon（留这个终端不关）
# 档位自动挑最高：有 OPENAI_API_KEY 走 LLM，否则 embedding，否则 keyword
node packages/server/dist/cli.cjs start
```

**验证 daemon 起来了**：新开一个终端跑

```bash
curl -s http://127.0.0.1:18790/v1/health
# 期望输出：{"status":"ok","version":"0.1.0-alpha.0"}
```

另外看 daemon 启动的那一行 JSON 日志里的 `"routing_tier"` 字段——应该是 `"llm"`、`"embedding"` 或 `"keyword"`，告诉我实际走的是哪一档。如果是 `"llm"`，还会有个 `"routing_provider"` 字段告诉我用的是哪家（openai / anthropic / deepseek / kimi / zhipu / qwen / minimax / doubao）。

## 第四步：装 Python 客户端和插件

```bash
cd ~/src/doctor-chaos/clients/python

# 用 venv 避免污染系统 Python；如果我有偏好的 Python 管理器（conda/uv/rye），按我的偏好来
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -e .

# 跑一下单元测试确认装好了
.venv/bin/python -m pytest tests -q
# 期望输出：38 passed
```

## 第五步：把插件接到当前 agent

这一步要根据我用的 agent 不同而变。请根据第一步里我告诉你的 agent 类型选：

### 如果是 Hermes

```bash
# Hermes 插件目录（如果我告诉你的路径不同，用我给你的路径）
mkdir -p ~/.hermes/plugins/context_engine/doctor_chaos

# 放 plugin.yaml
cp ~/src/doctor-chaos/clients/python/plugin.yaml ~/.hermes/plugins/context_engine/doctor_chaos/

# 让 Hermes 能 import doctorchaos_hermes 这个 Python 包
# 两种做法挑一种：
#   a) 把 doctorchaos-hermes 装到 Hermes 用的 Python 环境里
#      先问我："Hermes 用的是哪个 Python 解释器？"，然后用那个 python 跑 pip install
#   b) 或者把 clients/python/doctorchaos_hermes 目录 symlink 到 Hermes 的 PYTHONPATH
#      问我哪种方便
```

然后找到我的 Hermes `config.yaml`（一般在 `~/.hermes/config.yaml` 或 `~/.config/hermes/config.yaml`），在里面的 `context` 段改成：

```yaml
context:
  engine: doctor-chaos
  doctor_chaos:
    base_url: http://127.0.0.1:18790
    tenant_id: default
    timeout: 10.0
    compression_threshold_fraction: 0.75
    # 可选：嵌套一个子 context engine 做单空间内压缩
    # sub_engine: lcm
```

**别直接覆盖整个 config**，先把原文件备份（`cp config.yaml config.yaml.bak`），改完告诉我你改了哪些行。

重启 Hermes。

### 如果是 OpenClaw / Claude Desktop / 其他 agent

A1 阶段我们只正式支持 Hermes 的 ContextEngine ABC。其他 agent 的适配需要我（Chaos）单独立一个 spec。

**你能做的诊断**：告诉我你用的 agent 是否有类似的 "context engine 插件" 或 "memory provider" 扩展点。如果有，把它的文档链接和接口描述告诉我，我会单独评估。

如果没有这个扩展点，那现阶段你只能用 Python 客户端自己在脚本里调 daemon，**不能作为 drop-in 插件装进你的 agent**。

## 第六步：冒烟测试

回到 daemon 所在的终端，发一条消息进去：

```bash
curl -s -X POST http://127.0.0.1:18790/v1/tenants/default/messages \
  -H 'Content-Type: application/json' \
  -d '{"role":"user","content":"帮我想想这周末干啥"}'
```

期望看到一个 JSON 响应，里面有 `"destination"`、`"space"` 或 `"inbox"`、`"decision"` 字段。

然后：

```bash
# 看有哪些话题空间了
curl -s http://127.0.0.1:18790/v1/tenants/default/spaces | python3 -m json.tool

# 看整个快照落到了磁盘
cat ~/.doctorchaos/tenants/default/snapshot.json | python3 -m json.tool | head -50
```

## 第七步：把 daemon 做成后台自启（可选）

这一步我们故意没自动化——想等 dogfood 几天后再决定是否值得。**如果你问我，我会说先手动 `node packages/server/dist/cli.cjs start` 跑**，开机后自己手起一次，用几天看看。

## 完成后告诉我

装完之后，总结一句话告诉我：

- daemon 当前 `routing_tier` 是哪一档
- Hermes（或其他 agent）重启后 `context.engine` 是否认出了 `doctor-chaos`
- 第一次测试发消息，daemon 日志里有没有看到 `POST /v1/tenants/default/messages`
- 有没有任何步骤失败或需要我手动介入

## 出问题了怎么办

- daemon 起不来 / 端口被占 → 换端口：`node packages/server/dist/cli.cjs start --port 28790`，然后改 Hermes config 里的 `base_url` 对齐
- `pnpm install` 失败 → 先检查 Node 版本 `node --version`（要 18+）
- Python 插件 import 失败 → 确认装到的 Python 和 Hermes 用的 Python 是**同一个**
- Hermes 看不到 `doctor-chaos` 这个 engine → 检查 `plugin.yaml` 是否在正确目录，以及 Hermes 是否完整重启（不是 reload config）
- daemon 日志里看到 `"routing_tier":"keyword"` 但你觉得应该是 `"llm"` → shell 里的厂商 key 没有被传给 daemon 进程；启动前再跑一遍第一步里的那个 for 循环确认至少有一个是 `set`，而且必须在**启动 daemon 的那个终端里**。如果你用的是 anthropic-only 环境（没有 OPENAI_API_KEY），记得 daemon 支持所有 8 家，不要以为只认 OpenAI。

**任何一步卡住，停下来问我**。不要改我其他配置，不要猜 API key，不要沉默地降级。

</install-prompt>

---

## 给 Chaos 自己看的版本（给上面这段提示词做补充）

这段 `<install-prompt>` 目的是让任何有终端权限的 agent 都能自己把 Doctor Chaos 装好。写的时候特意：

- **每一步都可停可问**。agent 有权限不等于它有判断力，所以每次环境没明确时停下来问你。
- **默认 auto 档**，让 `OPENAI_API_KEY` 自动升级档位（LLM 优先）。
- **不预设 agent 类型**。第一步先问是哪个 agent。
- **不覆盖 config**。强制先备份再改。
- **失败即停**，不自动试"另一个类似的东西"。

你可以把这段直接复制粘贴给你的 Hermes。如果你想改它的语气（比如更简洁或更详尽），改 `<install-prompt>...</install-prompt>` 之间的内容就行。
