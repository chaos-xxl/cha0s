import { describe, expect, it } from 'vitest';
import { defaultRoutingConfiguration } from '../config/routing-configuration.js';
import { ExponentialTimeDecay } from './exponential-time-decay.js';

const ONE_DAY_SECONDS = 24 * 60 * 60;

describe('ExponentialTimeDecay', () => {
  it('returns 1 for a lastActivity equal to now', () => {
    const decay = new ExponentialTimeDecay();
    const t = new Date('2026-05-07T10:00:00Z');
    expect(decay.decayFactor(t, t)).toBe(1);
  });

  it('returns 1 for a future lastActivity (clock skew guard)', () => {
    const decay = new ExponentialTimeDecay();
    const now = new Date('2026-05-07T10:00:00Z');
    const later = new Date('2026-05-07T11:00:00Z');
    expect(decay.decayFactor(later, now)).toBe(1);
  });

  it('returns ~0.5 at exactly one half-life ago', () => {
    const decay = new ExponentialTimeDecay(); // default half-life = 7 days
    const now = new Date('2026-05-07T10:00:00Z');
    const halfLifeAgo = new Date(
      now.getTime() - defaultRoutingConfiguration.timeDecayHalfLifeSeconds * 1000,
    );
    const factor = decay.decayFactor(halfLifeAgo, now);
    expect(factor).toBeCloseTo(0.5, 5);
  });

  it('returns ~0.25 at two half-lives ago', () => {
    const decay = new ExponentialTimeDecay();
    const now = new Date('2026-05-07T10:00:00Z');
    const twoHalfLivesAgo = new Date(
      now.getTime() - 2 * defaultRoutingConfiguration.timeDecayHalfLifeSeconds * 1000,
    );
    const factor = decay.decayFactor(twoHalfLivesAgo, now);
    expect(factor).toBeCloseTo(0.25, 5);
  });

  it('monotonically decreases as the gap grows', () => {
    const decay = new ExponentialTimeDecay();
    const now = new Date('2026-05-07T10:00:00Z');
    const factors = [0, 1, 3, 7, 14, 30].map((days) => {
      const past = new Date(now.getTime() - days * ONE_DAY_SECONDS * 1000);
      return decay.decayFactor(past, now);
    });
    for (let i = 1; i < factors.length; i++) {
      expect(factors[i]).toBeLessThanOrEqual(factors[i - 1]!);
    }
  });

  it('respects a custom half-life', () => {
    const decay = new ExponentialTimeDecay({
      ...defaultRoutingConfiguration,
      timeDecayHalfLifeSeconds: ONE_DAY_SECONDS, // 1 day half-life
    });
    const now = new Date('2026-05-07T10:00:00Z');
    const oneDayAgo = new Date(now.getTime() - ONE_DAY_SECONDS * 1000);
    expect(decay.decayFactor(oneDayAgo, now)).toBeCloseTo(0.5, 5);
  });

  it('stays within [0, 1] for extreme ages', () => {
    const decay = new ExponentialTimeDecay();
    const now = new Date('2026-05-07T10:00:00Z');
    const ancient = new Date(now.getTime() - 365 * 10 * ONE_DAY_SECONDS * 1000); // 10 years
    const factor = decay.decayFactor(ancient, now);
    expect(factor).toBeGreaterThanOrEqual(0);
    expect(factor).toBeLessThanOrEqual(1);
  });
});
