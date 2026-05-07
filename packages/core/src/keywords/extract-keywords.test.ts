import { describe, expect, it } from 'vitest';
import { extractKeywords } from './extract-keywords.js';

describe('extractKeywords — English / Latin', () => {
  it('splits on whitespace and punctuation, lowercases tokens', () => {
    const kw = extractKeywords('Book me a flight, then a hotel!');
    expect(kw).toEqual(expect.arrayContaining(['book', 'flight', 'then', 'hotel']));
  });

  it('drops one-character tokens', () => {
    const kw = extractKeywords('a book');
    expect(kw).toContain('book');
    expect(kw).not.toContain('a');
  });

  it('dedupes repeated tokens', () => {
    const kw = extractKeywords('flight flight FLIGHT');
    expect(kw.filter((t) => t === 'flight')).toHaveLength(1);
  });

  it('keeps numbers of length >= 2', () => {
    const kw = extractKeywords('meeting at 10 on 2026');
    expect(kw).toContain('10');
    expect(kw).toContain('2026');
  });

  it('returns an empty list for a blank string', () => {
    expect(extractKeywords('')).toEqual([]);
    expect(extractKeywords('   \n\t')).toEqual([]);
  });
});

describe('extractKeywords — CJK bigrams', () => {
  it('produces sliding bigrams for a pure-CJK phrase', () => {
    const kw = extractKeywords('装修预算');
    // Expected bigrams: 装修, 修预, 预算
    expect(kw).toEqual(expect.arrayContaining(['装修', '修预', '预算']));
  });

  it('does not produce bigrams across a non-CJK boundary', () => {
    const kw = extractKeywords('装修 budget 预算');
    // 装修 on its own has no pairable neighbour in-run beyond itself,
    // so no "装修" bigram is produced from a single ideograph run of length 2?
    // Actually "装修" is exactly length 2 so 装修 IS a bigram. Check that
    // "修 b" and "t 预" are NOT in the output.
    expect(kw).toContain('装修');
    expect(kw).toContain('预算');
    expect(kw).toContain('budget');
    // Spot-check: no cross-language pair sneaks in.
    expect(kw.filter((t) => t.includes(' '))).toEqual([]);
  });

  it('handles mixed Chinese + English smoothly', () => {
    const kw = extractKeywords('我想去 Kyoto 旅行 next week');
    expect(kw).toContain('kyoto');
    expect(kw).toContain('next');
    expect(kw).toContain('week');
    expect(kw).toContain('旅行');
  });
});
