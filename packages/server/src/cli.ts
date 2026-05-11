/**
 * `doctor-chaos-server` CLI entry point.
 *
 * Usage:
 *   doctor-chaos-server start [--port 18790] [--host 127.0.0.1]
 *                             [--snapshot <path>]
 *   doctor-chaos-server --version
 *   doctor-chaos-server --help
 *
 * The environment variable `DOCTOR_CHAOS_PORT` is honoured when
 * `--port` is not provided. All other options can only be set via
 * flags — we deliberately avoid growing a config file at A0.
 */

import { VERSION } from './version.js';
import { startServer } from './server.js';
import type { RoutingMode } from './routing-mode.js';

const DEFAULT_PORT = 18790;

interface CliArgs {
  readonly command: 'start' | 'help' | 'version';
  readonly port: number;
  readonly host: string;
  readonly snapshotPath: string | undefined;
  readonly routingMode: RoutingMode;
}

const VALID_ROUTING_MODES: readonly RoutingMode[] = ['auto', 'llm', 'embedding', 'keyword'];

function printHelp(): void {
  // eslint-disable-next-line no-console
  console.log(
    [
      `doctor-chaos-server ${VERSION}`,
      '',
      'Usage:',
      '  doctor-chaos-server start [--port N] [--host H] [--snapshot PATH]',
      '                            [--routing-mode auto|llm|embedding|keyword]',
      '  doctor-chaos-server --version',
      '  doctor-chaos-server --help',
      '',
      'Options:',
      '  --port N            TCP port to listen on (default: 18790, env: DOCTOR_CHAOS_PORT)',
      '  --host H            Hostname to bind (default: 127.0.0.1, loopback only)',
      '  --snapshot PATH     Path to the snapshot file (default: ~/.doctorchaos/tenants/default/snapshot.json)',
      '  --routing-mode M    Routing tier (default: auto).',
      '                      auto      — LLM when any supported provider key is in env,',
      '                                  else embedding (OPENAI_API_KEY only), else keyword.',
      '                      llm       — force LLM direct routing (best quality, one API call per message).',
      '                      embedding — force embedding similarity (cheap, decent quality; needs OPENAI_API_KEY).',
      '                      keyword   — force keyword matcher (zero-dep fallback).',
      '',
      'Provider auto-detection (LLM tier; first match wins, in this order):',
      '  OPENAI_API_KEY      — OpenAI (gpt-4o-mini by default)',
      '  ANTHROPIC_API_KEY   — Anthropic Claude (claude-3-5-haiku by default)',
      '  DEEPSEEK_API_KEY    — DeepSeek',
      '  MOONSHOT_API_KEY    — Kimi / Moonshot',
      '  ZHIPUAI_API_KEY     — 智谱 GLM',
      '  DASHSCOPE_API_KEY   — 通义千问 (Qwen)',
      '  MINIMAX_API_KEY     — MiniMax',
      '  ARK_API_KEY         — 豆包 / Volcengine Ark',
      '',
      'For every provider, *_BASE_URL and *_MODEL override defaults.',
      '',
      'This is the Doctor Chaos HTTP daemon. It listens on localhost by',
      'design. For the full list of endpoints see the package README.',
    ].join('\n'),
  );
}

function parseArgs(argv: readonly string[]): CliArgs {
  // Drop node + script path.
  const args = argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    return {
      command: 'help',
      port: DEFAULT_PORT,
      host: '127.0.0.1',
      snapshotPath: undefined,
      routingMode: 'auto',
    };
  }

  if (args[0] === '--version' || args[0] === '-v') {
    return {
      command: 'version',
      port: DEFAULT_PORT,
      host: '127.0.0.1',
      snapshotPath: undefined,
      routingMode: 'auto',
    };
  }

  if (args[0] !== 'start') {
    throw new Error(
      `Unknown subcommand: '${args[0]}'. Run 'doctor-chaos-server --help' for usage.`,
    );
  }

  let port = DEFAULT_PORT;
  const envPort = process.env['DOCTOR_CHAOS_PORT'];
  if (envPort !== undefined) {
    const parsed = Number.parseInt(envPort, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      port = parsed;
    }
  }
  let host = '127.0.0.1';
  let snapshotPath: string | undefined = undefined;
  let routingMode: RoutingMode = 'auto';

  for (let i = 1; i < args.length; i++) {
    const flag = args[i];
    const value = args[i + 1];
    if (flag === '--port') {
      if (value === undefined) throw new Error("'--port' requires a value.");
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`'--port' must be a positive integer; got '${value}'.`);
      }
      port = parsed;
      i++;
    } else if (flag === '--host') {
      if (value === undefined) throw new Error("'--host' requires a value.");
      host = value;
      i++;
    } else if (flag === '--snapshot') {
      if (value === undefined) throw new Error("'--snapshot' requires a value.");
      snapshotPath = value;
      i++;
    } else if (flag === '--routing-mode') {
      if (value === undefined) throw new Error("'--routing-mode' requires a value.");
      if (!VALID_ROUTING_MODES.includes(value as RoutingMode)) {
        throw new Error(
          `'--routing-mode' must be one of ${VALID_ROUTING_MODES.join(', ')}; got '${value}'.`,
        );
      }
      routingMode = value as RoutingMode;
      i++;
    } else {
      throw new Error(
        `Unknown flag: '${flag}'. Run 'doctor-chaos-server --help' for usage.`,
      );
    }
  }

  return { command: 'start', port, host, snapshotPath, routingMode };
}

async function runStart(args: CliArgs): Promise<void> {
  const server = await startServer({
    port: args.port,
    host: args.host,
    routingMode: args.routingMode,
    ...(args.snapshotPath !== undefined ? { snapshotPath: args.snapshotPath } : {}),
  });

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ event: 'received_signal', signal }));
    try {
      await server.stop();
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

async function main(): Promise<void> {
  let args: CliArgs;
  try {
    args = parseArgs(process.argv);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(2);
    return;
  }

  if (args.command === 'help') {
    printHelp();
    process.exit(0);
    return;
  }
  if (args.command === 'version') {
    // eslint-disable-next-line no-console
    console.log(VERSION);
    process.exit(0);
    return;
  }

  try {
    await runStart(args);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

void main();
