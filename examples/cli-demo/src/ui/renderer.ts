import type { Clinic, TopicSpace } from '@doctorchaos-ai/core';
import { clearScreen, color, paint } from './ansi.js';

/**
 * Render the two-pane layout: a spaces list on the left, the currently
 * "focused" space's recent messages on the right.
 *
 * The focused space is simply the most recently touched one — the demo
 * is linear, not multi-window. A real host application would render its
 * own UI; this one exists purely to make the clinic's decisions visible.
 */

export interface RenderState {
  readonly clinic: Clinic;
  readonly focusedSpaceId: string | null;
  readonly lastReasoning: string | null;
}

const LEFT_PANE_WIDTH = 32;
const RIGHT_PANE_MIN_WIDTH = 48;

export function render(state: RenderState): void {
  clearScreen();
  const rows = buildRows(state);
  for (const row of rows) {
    process.stdout.write(row + '\n');
  }
}

function buildRows(state: RenderState): string[] {
  const termWidth = Math.max(
    LEFT_PANE_WIDTH + RIGHT_PANE_MIN_WIDTH + 3,
    process.stdout.columns ?? 80,
  );
  const rightWidth = termWidth - LEFT_PANE_WIDTH - 3;

  const leftLines = buildLeftPane(state);
  const rightLines = buildRightPane(state, rightWidth);

  const rowCount = Math.max(leftLines.length, rightLines.length);
  const rows: string[] = [];

  // Header separator
  rows.push(
    paint('┌' + '─'.repeat(LEFT_PANE_WIDTH) + '┬' + '─'.repeat(rightWidth) + '┐', color.gray),
  );

  for (let i = 0; i < rowCount; i++) {
    const left = leftLines[i] ?? '';
    const right = rightLines[i] ?? '';
    rows.push(
      paint('│', color.gray) +
        padVisible(left, LEFT_PANE_WIDTH) +
        paint('│', color.gray) +
        padVisible(right, rightWidth) +
        paint('│', color.gray),
    );
  }

  rows.push(
    paint('└' + '─'.repeat(LEFT_PANE_WIDTH) + '┴' + '─'.repeat(rightWidth) + '┘', color.gray),
  );

  if (state.lastReasoning) {
    rows.push(paint(`  ↳ ${state.lastReasoning}`, color.dim));
  }

  return rows;
}

function buildLeftPane(state: RenderState): string[] {
  const lines: string[] = [];
  lines.push(paint(' Topic spaces', color.bold, color.orange));
  lines.push('');

  const active = state.clinic.spaces({ status: 'active' });
  const dormant = state.clinic.spaces({ status: 'dormant' });
  const archived = state.clinic.spaces({ status: 'archived' });

  if (active.length === 0 && dormant.length === 0 && archived.length === 0) {
    lines.push(paint(' (no spaces yet)', color.dim));
  }

  for (const space of active) {
    lines.push(formatSpaceRow(space, state.focusedSpaceId === space.id, color.white));
  }
  for (const space of dormant) {
    lines.push(formatSpaceRow(space, state.focusedSpaceId === space.id, color.dim));
  }
  for (const space of archived) {
    lines.push(formatSpaceRow(space, state.focusedSpaceId === space.id, color.gray));
  }

  lines.push('');
  const inbox = state.clinic.inbox();
  const inboxLine = ` · inbox (${inbox.fragments.length} frag / ${inbox.totalMessageCount} msg)`;
  lines.push(paint(inboxLine, state.focusedSpaceId === null ? color.orange : color.cyan));
  return lines;
}

function formatSpaceRow(space: TopicSpace, focused: boolean, base: string): string {
  const marker = focused ? '▶' : '·';
  const name = truncate(space.name, LEFT_PANE_WIDTH - 8);
  const count = `(${space.messages.length})`;
  const prefix = paint(` ${marker} `, focused ? color.orange : base);
  return prefix + paint(`${name} ${count}`, focused ? color.orange : base);
}

function buildRightPane(state: RenderState, width: number): string[] {
  const lines: string[] = [];
  const focused = state.focusedSpaceId ? state.clinic.space(state.focusedSpaceId) : null;

  if (focused) {
    lines.push(paint(` ${focused.name}`, color.bold, color.orange));
    lines.push(paint(`  ${focused.keywords.slice(0, 6).join(', ')}`.padEnd(width - 1), color.dim));
    lines.push('');
    const recent = focused.messages.slice(-6);
    for (const msg of recent) {
      const role = msg.role === 'user' ? paint('you:', color.cyan) : paint('asst:', color.green);
      const wrapped = wrap(msg.content, width - 8);
      lines.push(` ${role} ${wrapped[0] ?? ''}`);
      for (let i = 1; i < wrapped.length; i++) {
        lines.push('       ' + wrapped[i]);
      }
    }
  } else {
    lines.push(paint(' Inbox', color.bold, color.orange));
    lines.push('');
    const fragments = state.clinic.inbox().fragments.slice(-6);
    if (fragments.length === 0) {
      lines.push(paint(' (inbox is empty)', color.dim));
    }
    for (const fragment of fragments) {
      const first = fragment.messages[0]?.content ?? '';
      const wrapped = wrap(first, width - 4);
      lines.push(paint(' · ', color.dim) + wrapped[0]);
      for (let i = 1; i < wrapped.length; i++) {
        lines.push('   ' + wrapped[i]);
      }
    }
  }

  return lines;
}

function wrap(text: string, width: number): string[] {
  if (width <= 0) return [text];
  const lines: string[] = [];
  let remaining = text;
  while (remaining.length > width) {
    lines.push(remaining.slice(0, width));
    remaining = remaining.slice(width);
  }
  if (remaining.length > 0 || lines.length === 0) lines.push(remaining);
  return lines;
}

function truncate(text: string, max: number): string {
  if (max <= 1) return text.slice(0, Math.max(0, max));
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '…';
}

/**
 * Pad a string to a visible width, ignoring ANSI color escape sequences.
 * Width is approximate for CJK characters (counts them as 1 cell, which
 * is undercount but acceptable for a demo).
 */
function padVisible(text: string, width: number): string {
  const visibleLength = stripAnsi(text).length;
  if (visibleLength >= width) {
    return text;
  }
  return text + ' '.repeat(width - visibleLength);
}

function stripAnsi(text: string): string {
  // Pattern: ESC [ ... letter
  return text.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '');
}
