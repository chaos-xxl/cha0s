import { describe, expect, it } from 'vitest';
import { Clinic } from '@doctorchaos-ai/core';
import { replaySeedScript, SEED_SCRIPT } from './mock-scripts.js';

describe('SEED_SCRIPT shape', () => {
  it('has messages for the demo to replay', () => {
    expect(SEED_SCRIPT.messages.length).toBeGreaterThan(0);
    for (const m of SEED_SCRIPT.messages) {
      expect(typeof m).toBe('string');
      expect(m.length).toBeGreaterThan(0);
    }
  });

  it('uses a small delay so interactive replays are watchable', () => {
    expect(SEED_SCRIPT.delayMs).toBeGreaterThanOrEqual(0);
    expect(SEED_SCRIPT.delayMs).toBeLessThan(1000);
  });
});

describe('replaySeedScript', () => {
  it('drains the seed script into a clinic instance', async () => {
    const clinic = new Clinic({
      initialSpaces: [
        {
          id: 'travel',
          name: 'Travel',
          keywords: ['travel', 'trip', 'flight', 'hotel', 'kyoto', 'ryokan', 'osaka'],
          createdDate: new Date(),
          lastActivityDate: new Date(),
          creationSource: 'preset',
          status: 'active',
          messages: [],
        },
      ],
      configuration: {
        confidenceThreshold: 0.25,
        timeDecayHalfLifeSeconds: 7 * 24 * 60 * 60,
        packagingDensityThreshold: 3,
        archiveInactivityDays: 30,
        newTopicMinLength: 20,
      },
    });
    let stepCount = 0;
    await replaySeedScript(clinic, () => {
      stepCount++;
    });
    expect(stepCount).toBeGreaterThanOrEqual(SEED_SCRIPT.messages.length);
    // The Travel space should have collected at least one message.
    expect(clinic.space('travel')!.messages.length).toBeGreaterThan(0);
  }, 10000); // generous timeout to absorb the delay
});
