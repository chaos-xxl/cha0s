# @doctorchaos-ai/server

Doctor Chaos 的 HTTP daemon。把 `@doctorchaos-ai/core` 里的 `Clinic` 类包成一个 localhost HTTP 服务，让非 TypeScript 的 agent（Hermes、其他 Python 工具、以后的 Go / Rust / Swift 客户端）都能通过一根薄线协议驱动话题路由。

> **alpha 不是免责声明，是承诺。** 现在只支持 localhost 绑定、无认证、单租户；URL 里的 `tenant_id` 段永远是 `default`。系统性的升级计划在 spec 仓库的 `deferred-requirements.md` 里排队。

## 安装与启动

```bash
# 工程内开发
pnpm --filter @doctorchaos-ai/server build
node packages/server/dist/cli.cjs start

# 全局装完以后（v0.2 以后发 npm）
npm install -g @doctorchaos-ai/server
doctor-chaos-server start
```

命令行选项：

```
doctor-chaos-server start [--port N] [--host H] [--snapshot PATH]
                          [--routing-mode auto|llm|embedding|keyword]
```

- `--port N`：监听端口（默认 `18790`，env: `DOCTOR_CHAOS_PORT`）
- `--host H`：绑定主机（默认 `127.0.0.1`，loopback）
- `--snapshot PATH`：快照文件路径（默认 `~/.doctorchaos/tenants/default/snapshot.json`）
- `--routing-mode M`：路由档位（默认 `auto`）
  - `auto` —— 有 `OPENAI_API_KEY` 走 LLM；只有嵌入 key 走 embedding；都没有才降级 keyword
  - `llm` —— 强制 LLM 直接路由（质量最好，每条消息一次 API 调用）
  - `embedding` —— 强制嵌入相似度（便宜，质量不错）
  - `keyword` —— 强制关键词匹配（零依赖兜底）

环境变量（启动时读）：

- `OPENAI_API_KEY` —— 解锁 LLM / embedding 档位
- `OPENAI_BASE_URL` —— 可选，默认 `https://api.openai.com/v1`，支持任何 OpenAI 兼容 API
- `OPENAI_MODEL` —— 可选，默认 `gpt-4o-mini`（只影响 LLM 档位）

优雅停机：`SIGINT` / `SIGTERM`，默认 5 秒 grace。

## HTTP 接口

所有 Clinic 相关接口都挂在 `/v1/tenants/{tenant_id}/...` 前缀下。当前 `tenant_id` 只支持 `default`。

| Method | Path | 作用 |
|--------|------|------|
| `GET`  | `/v1/health` | 存活检查，无需认证 |
| `POST` | `/v1/tenants/{tenant_id}/messages` | 路由一条消息 |
| `GET`  | `/v1/tenants/{tenant_id}/spaces` | 列话题空间（支持 `?status=active,dormant`） |
| `GET`  | `/v1/tenants/{tenant_id}/spaces/{space_id}` | 取单个话题空间（含完整消息） |
| `GET`  | `/v1/tenants/{tenant_id}/inbox` | 取 inbox |
| `POST` | `/v1/tenants/{tenant_id}/packaging/check` | 触发打包评估 |
| `POST` | `/v1/tenants/{tenant_id}/lifecycle/check` | 触发生命周期评估 |
| `POST` | `/v1/tenants/{tenant_id}/messages/{message_id}/move` | 移动一条消息 |

每个响应都带两个 header：

- `X-Request-Id`：请求 id，出现在日志里，贴进 issue 很方便
- `X-DoctorChaos-Version`：当前 daemon 版本

### 错误响应

所有错误返回统一形状：

```json
{
  "code": "space_not_found",
  "message": "Space 'xyz' not found.",
  "request_id": "req-..."
}
```

错误码词汇表：

| HTTP | code | 触发条件 |
|------|------|---------|
| 400  | `bad_request` | 请求 body 缺字段、schema 不合法、非 JSON Content-Type |
| 404  | `tenant_not_found` | `tenant_id` 不是 `default` |
| 404  | `space_not_found` | 指定的 space id 不存在 |
| 404  | `message_not_found` | 指定的 message id 在 tenant 内不存在 |
| 500  | `internal_error` | Clinic 抛了未捕获异常（body 里不带 stack，日志里有） |

## Idempotency

所有写端点（`POST /messages`、`packaging/check`、`lifecycle/check`、`messages/:id/move`）都接受一个可选的 `idempotency_key` 字段。在同一个进程生命周期内、10 分钟 TTL 内、相同 key 的重复请求会直接返回第一次的响应，不会重复路由 / 重复打包。

**已知限制**：这个 idempotency cache **不跨进程重启**。如果 A2 dogfood 期间撞到，升级为持久化——这个在 `deferred-requirements.md` 里记账了。

## 持久化

每次写操作成功后，daemon 把 `Clinic.snapshot()` 完整写到磁盘：

- 策略：`write-through after mutation`
- 原子性：先写 `snapshot.json.tmp`，再 `rename`
- 格式：JSON，Date 用 ISO 8601 字符串

重启时从快照加载。快照文件不存在时正常 cold-start；**快照文件存在但解析失败时 daemon 拒绝启动**——比静默扔掉状态更安全。

## 使用建议

- 本包设计目标是被 `doctorchaos_hermes`（Python 客户端）以及未来的语言客户端调用。直接 curl 也没问题，但你要自己处理重试 / 降级。
- 如果 daemon 崩了或没启动，任何合规客户端都应该**降级**而不是挂起用户。
- 这是 alpha 版本。接口在 A1 和 A2 期间可能小幅调整；`/v1` 前缀保证不会发生 wire protocol 破坏性变更。

## 开发

```bash
pnpm --filter @doctorchaos-ai/server dev       # tsup --watch
pnpm --filter @doctorchaos-ai/server test      # vitest run
pnpm --filter @doctorchaos-ai/server typecheck # tsc --noEmit
```
