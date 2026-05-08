import { describe, expect, it } from 'vitest';
import { averageVectors, cosineSimilarity, toRoutingScore } from './math.js';

describe('cosineSimilarity', () => {
  it('returns 1 for identical unit vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBe(1);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBe(0);
  });

  it('returns -1 for opposite directions', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBe(-1);
  });

  it('returns 0 for an empty input', () => {
    expect(cosineSimilarity([], [1, 2, 3])).toBe(0);
    expect(cosineSimilarity([1, 2, 3], [])).toBe(0);
  });

  it('returns 0 when lengths differ', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it('is independent of magnitude', () => {
    expect(cosineSimilarity([2, 0], [5, 0])).toBeCloseTo(1, 6);
  });
});

describe('averageVectors', () => {
  it('averages a pair of vectors element-wise', () => {
    expect(
      averageVectors([
        [0, 2],
        [2, 0],
      ]),
    ).toEqual([1, 1]);
  });

  it('ignores empty vectors', () => {
    expect(averageVectors([[2, 4], []])).toEqual([2, 4]);
  });

  it('returns [] when given nothing useful', () => {
    expect(averageVectors([])).toEqual([]);
    expect(averageVectors([[], []])).toEqual([]);
  });

  it('skips vectors of mismatched dimension', () => {
    expect(
      averageVectors([
        [1, 1],
        [9, 9, 9],
        [3, 3],
      ]),
    ).toEqual([2, 2]);
  });
});

describe('toRoutingScore', () => {
  it('collapses negative similarity to 0', () => {
    expect(toRoutingScore(-0.3)).toBe(0);
  });

  it('passes positive similarity through', () => {
    expect(toRoutingScore(0.42)).toBeCloseTo(0.42, 6);
  });

  it('clamps at 1', () => {
    expect(toRoutingScore(1.5)).toBe(1);
  });
});
