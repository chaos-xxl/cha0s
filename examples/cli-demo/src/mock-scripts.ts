import type { Cha0s } from '@cha0s-ai/core';

/**
 * A small corpus of seed messages the demo replays on startup. The
 * point is to make the UI interesting from the first keystroke — we do
 * not ship a pristine empty workspace because "nothing routed" is a
 * boring first impression.
 *
 * Each entry is a plain message string. The demo pipes them through
 * `cha0s.send()` one by one, pausing briefly so a watcher can see
 * spaces appear.
 */

export interface Scripted {
  readonly delayMs: number;
  readonly messages: readonly string[];
}

export const SEED_SCRIPT: Scripted = {
  delayMs: 140,
  messages: [
    // These seed messages are worded to match the preset space keywords
    // strongly. The keyword-only MVP strategy shipped with core needs a
    // decent hit-ratio; swap in an embedding adapter and a vaguer
    // message will still route correctly.

    // Travel cluster — heavy keyword overlap with the Travel space
    'plan travel trip to Kyoto — book flight and hotel',
    'Osaka flight dates: ryokan booking in spring',
    'Japan travel plan: Kyoto Osaka ryokan hotel flight',

    // Inbox material (no space-keyword overlap)
    'remind me to water the plants later tonight',
    'quick question — what is the capital of Mongolia',

    // Renovation cluster — heavy keyword overlap
    'renovation: pick tile for master bathroom floor this weekend',
    'engineered wood vs luxury vinyl floor for living room',
    'kitchen renovation budget is tight — pick cheaper tile',
  ],
};

export async function replaySeedScript(cha0s: Cha0s, onStep: () => void): Promise<void> {
  for (const content of SEED_SCRIPT.messages) {
    await cha0s.send({ role: 'user', content });
    onStep();
    await sleep(SEED_SCRIPT.delayMs);
  }
  // One final packaging pass — the dense clusters should now get
  // promoted into proper topic spaces.
  await cha0s.checkPackaging();
  onStep();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
