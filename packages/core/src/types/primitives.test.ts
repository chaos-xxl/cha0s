import { describe, expect, it } from 'vitest';
import { IntentSignal } from './primitives.js';

describe('IntentSignal constructors', () => {
  it('creates a strong signal without a target', () => {
    const sig = IntentSignal.strong();
    expect(sig).toEqual({ kind: 'strong' });
  });

  it('creates a strong signal with a target', () => {
    const sig = IntentSignal.strong('space-123');
    expect(sig).toEqual({ kind: 'strong', target: 'space-123' });
  });

  it('creates a weak signal', () => {
    expect(IntentSignal.weak()).toEqual({ kind: 'weak' });
  });

  it('creates a normal signal', () => {
    expect(IntentSignal.normal()).toEqual({ kind: 'normal' });
  });

  it('creates a trivial signal', () => {
    expect(IntentSignal.trivial()).toEqual({ kind: 'trivial' });
  });

  it('narrows correctly via discriminated union', () => {
    const sig: IntentSignal = IntentSignal.strong('topic-1');
    if (sig.kind === 'strong') {
      // Target is accessible only inside this branch — this is what
      // we want to verify: the type narrows.
      expect(sig.target).toBe('topic-1');
    } else {
      throw new Error('expected strong signal');
    }
  });
});
