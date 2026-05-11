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

const DEFAULT_PORT = 18790;

interface CliArgs {
  readonly command: 'start' | 'help' | 'version';
  readonly port: number;
  readonly host: string;
  readonly snapshotPath: string | undefined;
}

function printHelp(): void {
  // eslint-disable-next-line no-console
  console.log(
    [
      `doctor-chaos-server ${VERSION}`,
      '',
      'Usage:',
      '  doctor-chaos-server start [--port N] [--host H] [--snapshot PATH]',
      '  doctor-chaos-server --version',
      '  doctor-chaos-server --help',
      '',
      'Options:',
      '  --port N        TCP port to listen on (default: 18790, env: DOCTOR_CHAOS_PORT)',
      '  --host H        Hostname to bind (default: 127.0.0.1, loopback only)',
      '  --snapshot PATH Path to the snapshot file (default: ~/.doctorchaos/tenants/default/snapshot.json)',
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
    };
  }

  if (args[0] === '--version' || args[0] === '-v') {
    return {
      command: 'version',
      port: DEFAULT_PORT,
      host: '127.0.0.1',
      snapshotPath: undefined,
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
    } else {
      throw new Error(
        `Unknown flag: '${flag}'. Run 'doctor-chaos-server --help' for usage.`,
      );
    }
  }

  return { command: 'start', port, host, snapshotPath };
}

async function runStart(args: CliArgs): Promise<void> {
  const server = await startServer({
    port: args.port,
    host: args.host,
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
