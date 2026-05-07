import { describe, expect, it } from 'vitest';
import type { Message, RoutingMetadata } from './message.js';

describe('Message shape', () => {
  it('accepts a minimal unrouted message', () => {
    const msg: Message = {
      id: 'm-1',
      role: 'user',
      content: 'Book me a flight to Beijing tomorrow.',
      timestamp: new Date('2026-05-07T00:00:00Z'),
    };
    expect(msg.routing).toBeUndefined();
  });

  it('accepts a routed message with metadata', () => {
    const routing: RoutingMetadata = {
      originalDestination: 'space-travel',
      confidence: 0.87,
      wasReassigned: false,
    };
    const msg: Message = {
      id: 'm-2',
      role: 'user',
      content: 'hello',
      timestamp: new Date(),
      routing,
    };
    expect(msg.routing?.confidence).toBe(0.87);
  });

  it('records a reassignment source when corrected', () => {
    const routing: RoutingMetadata = {
      originalDestination: 'space-travel',
      confidence: 0.62,
      wasReassigned: true,
      reassignedFrom: 'inbox',
    };
    expect(routing.wasReassigned).toBe(true);
    expect(routing.reassignedFrom).toBe('inbox');
  });
});
