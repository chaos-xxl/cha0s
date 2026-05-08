/**
 * Minimal ANSI helpers for the CLI demo.
 *
 * We avoid pulling in a dependency like chalk because the demo's zero-
 * dep posture is part of the message: Doctor Chaos works offline, so
 * should its showcase.
 */

const ESC = '\u001b[';

export const color = {
  reset: `${ESC}0m`,
  bold: `${ESC}1m`,
  dim: `${ESC}2m`,

  // Foreground
  gray: `${ESC}90m`,
  red: `${ESC}31m`,
  green: `${ESC}32m`,
  yellow: `${ESC}33m`,
  blue: `${ESC}34m`,
  magenta: `${ESC}35m`,
  cyan: `${ESC}36m`,
  white: `${ESC}37m`,

  // Bright foreground
  brightRed: `${ESC}91m`,
  brightGreen: `${ESC}92m`,
  brightYellow: `${ESC}93m`,
  brightCyan: `${ESC}96m`,

  // Orange-ish via 256-color palette (Doctor Chaos brand orange)
  orange: `${ESC}38;5;208m`,
} as const;

export function paint(text: string, ...codes: string[]): string {
  return `${codes.join('')}${text}${color.reset}`;
}

export function clearScreen(): void {
  process.stdout.write(`${ESC}2J${ESC}H`);
}

export function moveCursor(row: number, col: number): void {
  process.stdout.write(`${ESC}${row};${col}H`);
}

export function hideCursor(): void {
  process.stdout.write(`${ESC}?25l`);
}

export function showCursor(): void {
  process.stdout.write(`${ESC}?25h`);
}
