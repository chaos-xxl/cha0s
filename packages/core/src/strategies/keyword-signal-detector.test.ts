import { describe, expect, it } from 'vitest';
import { KeywordSignalDetector, defaultSignalLexicon } from './keyword-signal-detector.js';

describe('KeywordSignalDetector with default lexicon', () => {
  const detector = new KeywordSignalDetector();

  it('classifies explicit Chinese continuation cues as strong', () => {
    expect(detector.detectSignal('接着上次说的京都那个')).toMatchObject({ kind: 'strong' });
    expect(detector.detectSignal('我们继续之前的讨论')).toMatchObject({ kind: 'strong' });
  });

  it('classifies explicit English continuation cues as strong', () => {
    expect(detector.detectSignal("let's pick up where we left off")).toMatchObject({
      kind: 'strong',
    });
    expect(detector.detectSignal('Continuing the trip planning')).toMatchObject({ kind: 'strong' });
  });

  it('classifies vague requests as weak', () => {
    expect(detector.detectSignal('帮我查个东西')).toMatchObject({ kind: 'weak' });
    expect(detector.detectSignal('Quick question about React')).toMatchObject({ kind: 'weak' });
  });

  it('classifies one-shot utilities as trivial', () => {
    expect(detector.detectSignal('今天天气怎么样')).toMatchObject({ kind: 'trivial' });
    expect(detector.detectSignal("what's the weather like")).toMatchObject({ kind: 'trivial' });
    expect(detector.detectSignal('translate "hello" to Spanish')).toMatchObject({
      kind: 'trivial',
    });
  });

  it('falls back to normal when no cue matches', () => {
    expect(detector.detectSignal('I want to build an agent framework')).toMatchObject({
      kind: 'normal',
    });
  });

  it('returns normal for empty or whitespace-only input', () => {
    expect(detector.detectSignal('')).toMatchObject({ kind: 'normal' });
    expect(detector.detectSignal('   \n\t  ')).toMatchObject({ kind: 'normal' });
  });

  it('prefers strong over weak when both substrings are present', () => {
    // contains both "接着上次说的" (strong) and "查一下" (weak)
    const msg = '接着上次说的那个，帮我查一下定价';
    expect(detector.detectSignal(msg)).toMatchObject({ kind: 'strong' });
  });

  it('has a balanced default lexicon covering both Chinese and English', () => {
    expect(defaultSignalLexicon.strong.length).toBeGreaterThan(0);
    expect(defaultSignalLexicon.weak.length).toBeGreaterThan(0);
    expect(defaultSignalLexicon.trivial.length).toBeGreaterThan(0);
  });
});

describe('KeywordSignalDetector with a custom lexicon', () => {
  it('uses the provided lexicon exclusively', () => {
    const detector = new KeywordSignalDetector({
      strong: ['RESUME'],
      weak: ['LOOKUP'],
      trivial: ['CALC'],
    });
    expect(detector.detectSignal('please RESUME the topic')).toMatchObject({ kind: 'strong' });
    expect(detector.detectSignal('LOOKUP the price')).toMatchObject({ kind: 'weak' });
    expect(detector.detectSignal('CALC 2+2')).toMatchObject({ kind: 'trivial' });
    // default-lexicon phrases do not leak in
    expect(detector.detectSignal('接着上次说的')).toMatchObject({ kind: 'normal' });
  });

  it('performs case-insensitive matching for English cues', () => {
    const detector = new KeywordSignalDetector({
      strong: ['resume'],
      weak: [],
      trivial: [],
    });
    expect(detector.detectSignal('Please RESUME work')).toMatchObject({ kind: 'strong' });
    expect(detector.detectSignal('resume the conversation')).toMatchObject({ kind: 'strong' });
  });
});
