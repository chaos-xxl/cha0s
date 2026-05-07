import { describe, expect, it } from 'vitest';
import type { RoutingCorrection } from './routing-correction.js';

describe('RoutingCorrection shape', () => {
  it('accepts a full correction record', () => {
    const correction: RoutingCorrection = {
      id: 'c-1',
      messageId: 'm-42',
      originalDestination: 'inbox',
      correctedDestination: 'space-travel',
      timestamp: new Date('2026-05-07T10:00:00Z'),
      messageContent: 'Book me a flight to Osaka.',
    };
    expect(correction.originalDestination).toBe('inbox');
    expect(correction.correctedDestination).toBe('space-travel');
  });
});
