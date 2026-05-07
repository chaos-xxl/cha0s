import { describe, expect, it } from 'vitest';
import type { RoutingCorrection } from '../types/routing-correction.js';
import type { TopicSpace } from '../types/topic-space.js';
import { CorrectionLearner } from './correction-learner.js';

function space(id: string, keywords: string[] = []): TopicSpace {
  return {
    id,
    name: id,
    keywords,
    createdDate: new Date('2026-01-01'),
    lastActivityDate: new Date('2026-05-07'),
    creationSource: 'preset',
    status: 'active',
    messages: [],
  };
}

function correction(id: string, from: string, to: string, content: string): RoutingCorrection {
  return {
    id,
    messageId: `m-${id}`,
    originalDestination: from,
    correctedDestination: to,
    timestamp: new Date(),
    messageContent: content,
  };
}

describe('CorrectionLearner — storage', () => {
  it('starts empty unless seeded', () => {
    expect(new CorrectionLearner().size).toBe(0);
  });

  it('accepts seed corrections and reports the right size', () => {
    const learner = new CorrectionLearner({
      corrections: [correction('c1', 'inbox', 'space-a', 'anything')],
    });
    expect(learner.size).toBe(1);
  });

  it('records and exports corrections', () => {
    const learner = new CorrectionLearner();
    learner.record(correction('c1', 'inbox', 'space-a', 'message about travel plans'));
    learner.record(correction('c2', 'inbox', 'space-a', 'another travel discussion'));
    const exported = learner.export();
    expect(exported).toHaveLength(2);
    expect(exported[0]!.id).toBe('c1');
  });

  it('export returns a copy — external mutation does not leak', () => {
    const learner = new CorrectionLearner();
    learner.record(correction('c1', 'inbox', 'space-a', 'travel plans'));
    const exported = learner.export();
    exported.pop();
    expect(learner.size).toBe(1);
  });
});

describe('CorrectionLearner — adjustScore', () => {
  it('returns the base score unchanged when there are no similar corrections', () => {
    const learner = new CorrectionLearner();
    const travel = space('travel');
    expect(learner.adjustScore(0.5, 'hello world', travel)).toBe(0.5);
  });

  it('boosts when past similar messages were moved TO the candidate', () => {
    const learner = new CorrectionLearner({
      corrections: [
        correction('c1', 'inbox', 'travel', 'book a travel flight tomorrow'),
        correction('c2', 'inbox', 'travel', 'arrange travel hotel booking'),
      ],
    });
    const travel = space('travel');
    const adjusted = learner.adjustScore(0.5, 'travel flight to Kyoto', travel);
    expect(adjusted).toBeGreaterThan(0.5);
  });

  it('penalises when past similar messages were moved AWAY FROM the candidate', () => {
    const learner = new CorrectionLearner({
      corrections: [
        correction('c1', 'inbox', 'renovation', 'pick tile color for bathroom floor'),
        correction('c2', 'inbox', 'renovation', 'choose tile and floor material'),
      ],
    });
    const inbox = space('inbox');
    const adjusted = learner.adjustScore(0.5, 'should I pick marble tile for the floor', inbox);
    expect(adjusted).toBeLessThan(0.5);
  });

  it('clamps to [0, 1]', () => {
    const learner = new CorrectionLearner({
      boostPerMatch: 0.5,
      corrections: [
        correction('c1', 'inbox', 'travel', 'travel flight plan'),
        correction('c2', 'inbox', 'travel', 'flight plan travel'),
        correction('c3', 'inbox', 'travel', 'travel flight'),
      ],
    });
    const travel = space('travel');
    // base 0.8 + 3 * 0.5 = 2.3, should clamp to 1.
    const adjusted = learner.adjustScore(0.8, 'travel flight plan', travel);
    expect(adjusted).toBe(1);
  });

  it('ignores corrections without sufficient keyword overlap', () => {
    const learner = new CorrectionLearner({
      similarityThreshold: 2,
      corrections: [correction('c1', 'inbox', 'travel', 'completely unrelated topic about cats')],
    });
    const travel = space('travel');
    const adjusted = learner.adjustScore(0.5, 'travel flight booking', travel);
    expect(adjusted).toBe(0.5);
  });
});
