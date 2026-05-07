import { describe, expect, it } from 'vitest';
import { defaultRoutingConfiguration } from './routing-configuration.js';

describe('defaultRoutingConfiguration', () => {
  it('has a confidence threshold in the valid range', () => {
    expect(defaultRoutingConfiguration.confidenceThreshold).toBeGreaterThanOrEqual(0);
    expect(defaultRoutingConfiguration.confidenceThreshold).toBeLessThanOrEqual(1);
  });

  it('uses 7 days as the time-decay half-life', () => {
    expect(defaultRoutingConfiguration.timeDecayHalfLifeSeconds).toBe(7 * 24 * 60 * 60);
  });

  it('requires at least three fragments before packaging', () => {
    expect(defaultRoutingConfiguration.packagingDensityThreshold).toBe(3);
  });

  it('archives topic spaces after 30 days of inactivity', () => {
    expect(defaultRoutingConfiguration.archiveInactivityDays).toBe(30);
  });

  it('requires at least 20 characters to seed a new topic', () => {
    expect(defaultRoutingConfiguration.newTopicMinLength).toBe(20);
  });
});
