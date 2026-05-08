import { Clinic } from '@doctorchaos-ai/core';
import * as readline from 'node:readline';
import { color, paint, showCursor } from './ui/ansi.js';
import { render, type RenderState } from './ui/renderer.js';
import { replaySeedScript } from './mock-scripts.js';

/**
 * Print the clinic's arrival notice. Sets the tone for the rest of
 * the session.
 */
function printWelcome(): void {
  const lines = [
    '┌─── Welcome to Doctor Chaos v0.1.0 ────────────────┐',
    '│                                                    │',
    '│  Waiting time: unknown                             │',
    '│  Bed availability: sufficient                      │',
    '│  Your assigned doctor: whoever shows up first      │',
    '│                                                    │',
    '│  If this is an emergency, please type faster.      │',
    '│                                                    │',
    '└────────────────────────────────────────────────────┘',
  ];
  for (const line of lines) {
    console.log(paint(line, color.orange));
  }
  console.log();
}

async function main(): Promise<void> {
  printWelcome();

  // Pre-seed a few "homes" for messages so routing looks intelligent
  // out of the gate. These are the spaces we expect messages to land
  // into. In a real host application they'd come from persistent
  // storage.
  const clinic = new Clinic({
    configuration: {
      ...{
        confidenceThreshold: 0.25,
        timeDecayHalfLifeSeconds: 7 * 24 * 60 * 60,
        packagingDensityThreshold: 3,
        archiveInactivityDays: 30,
        newTopicMinLength: 20,
      },
    },
    initialSpaces: [
      {
        id: 'travel',
        name: 'Travel 2026',
        keywords: [
          'travel',
          'trip',
          'flight',
          'hotel',
          'ryokan',
          'kyoto',
          'osaka',
          'japan',
          'book',
          'plan',
          'spring',
          'beijing',
          'translate',
          'weather',
        ],
        createdDate: new Date(),
        lastActivityDate: new Date(),
        creationSource: 'preset',
        status: 'active',
        messages: [],
      },
      {
        id: 'renovation',
        name: 'Home renovation',
        keywords: [
          'renovation',
          'tile',
          'floor',
          'kitchen',
          'bathroom',
          'wood',
          'vinyl',
          'budget',
          'living',
          'master',
          'engineered',
          'luxury',
          'pick',
          'weekend',
        ],
        createdDate: new Date(),
        lastActivityDate: new Date(),
        creationSource: 'preset',
        status: 'active',
        messages: [],
      },
    ],
  });

  const mutableState = {
    focusedSpaceId: null as string | null,
    lastReasoning: null as string | null,
    isClosing: false,
  };

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    prompt: paint('> ', color.orange),
  });

  const redraw = (): void => {
    if (mutableState.isClosing) return;
    render({
      clinic,
      focusedSpaceId: mutableState.focusedSpaceId,
      lastReasoning: mutableState.lastReasoning,
    });
    try {
      rl.prompt(true);
    } catch {
      // readline was closed between the check and the prompt call
      // (e.g. EOF on a piped stdin). Nothing to do.
    }
  };

  console.log(paint('Seeding demo conversations…', color.dim));
  await replaySeedScript(clinic, () => {
    if (mutableState.isClosing) return;
    render({
      clinic,
      focusedSpaceId: mutableState.focusedSpaceId,
      lastReasoning: mutableState.lastReasoning,
    });
  });
  if (mutableState.isClosing) return;
  mutableState.focusedSpaceId = clinic.spaces({ status: 'active' })[0]?.id ?? null;
  mutableState.lastReasoning =
    'The clinic is open. Type a message and watch it triage. /help for commands.';
  redraw();

  rl.on('line', async (raw) => {
    const line = raw.trim();
    if (line.length === 0) {
      redraw();
      return;
    }

    if (line.startsWith('/')) {
      const result = await handleCommand(line, clinic);
      if (result === 'quit') {
        rl.close();
        return;
      }
      mutableState.lastReasoning = result;
      redraw();
      return;
    }

    const result = await clinic.send({ role: 'user', content: line });
    if (result.destination === 'topicSpace') {
      mutableState.focusedSpaceId = result.space.id;
      const label = result.isNewSpace ? 'new space' : 'routed';
      mutableState.lastReasoning = `[${label}: ${result.space.name}] ${result.decision.reasoning}`;
    } else {
      mutableState.focusedSpaceId = null;
      mutableState.lastReasoning = `[inbox] ${result.decision.reasoning}`;
    }
    await clinic.checkPackaging();
    redraw();
  });

  rl.on('close', () => {
    mutableState.isClosing = true;
    showCursor();
    console.log();
    console.log(
      paint(
        'The clinic is now closed. Please collect your belongings on the way out.',
        color.orange,
      ),
    );
    // Give pending async work a tick to notice the flag, then exit.
    setImmediate(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    rl.close();
  });
}

async function handleCommand(line: string, clinic: Clinic): Promise<string> {
  const [cmd] = line.slice(1).split(/\s+/);
  switch (cmd) {
    case 'spaces': {
      const all = clinic.spaces();
      if (all.length === 0) return 'no spaces yet.';
      return `${all.length} spaces: ${all.map((s) => `${s.name}[${s.status}]`).join(', ')}`;
    }
    case 'inbox': {
      const inbox = clinic.inbox();
      return `${inbox.fragments.length} fragments, ${inbox.totalMessageCount} messages.`;
    }
    case 'package': {
      const created = await clinic.checkPackaging();
      return created.length > 0
        ? `packaged ${created.length} new space(s): ${created.map((s) => s.name).join(', ')}`
        : 'nothing dense enough to package yet.';
    }
    case 'clear': {
      return '';
    }
    case 'quit':
    case 'exit': {
      return 'quit';
    }
    case 'help': {
      return '/spaces /inbox /package /clear /quit';
    }
    default:
      return `unknown command: /${cmd}`;
  }
}

main().catch((err) => {
  console.error(paint('Fatal:', color.brightRed), err);
  process.exit(1);
});
