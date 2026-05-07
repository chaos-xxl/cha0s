import { IntentSignal } from '../types/primitives.js';
import type { SignalDetecting } from './interfaces.js';

/**
 * The set of phrases a {@link KeywordSignalDetector} looks for.
 *
 * Each array is a flat list of substrings. A message matches if it
 * contains any of the substrings (case-sensitive, trimmed). The first
 * matching category (in the order `strong` → `weak` → `trivial`) wins,
 * so put more specific phrases before more general ones.
 *
 * Host applications whose users speak a specific language should pass
 * their own lexicon; the defaults below are a bilingual
 * Chinese/English baseline suitable for proof-of-concept use.
 */
export interface SignalLexicon {
  /**
   * Phrases that explicitly continue a prior topic. Messages matching
   * these are routed with high confidence to the most recently active
   * matching space.
   */
  readonly strong: readonly string[];

  /**
   * Phrases that hint at a vague or one-off request. Messages matching
   * these are routed to the inbox instead of forcing a topic decision.
   */
  readonly weak: readonly string[];

  /**
   * Phrases that indicate an utilitarian one-shot query (weather, time,
   * unit conversion, ...). Same behaviour as weak, but semantically
   * distinct so downstream systems can treat them differently.
   */
  readonly trivial: readonly string[];
}

/**
 * A reasonable starting-point lexicon covering Chinese and English.
 *
 * It is intentionally small: the detector is meant to be a fast
 * pre-filter, not a full NLU engine. Host applications are expected to
 * extend or replace this based on their users' vocabulary.
 */
export const defaultSignalLexicon: SignalLexicon = {
  strong: [
    // Chinese
    '接着上次说的',
    '继续之前的',
    '上次聊到',
    '接着聊',
    '继续说',
    // English
    'pick up where we left off',
    'continue from',
    'as we discussed',
    'back to',
    'continuing',
  ],
  weak: [
    // Chinese
    '帮我查个',
    '随便问下',
    '查一下',
    '算一下',
    // English
    'quick question',
    'just curious',
    'by the way',
    'random question',
  ],
  trivial: [
    // Chinese
    '天气',
    '几点',
    '时间',
    '汇率',
    '计算',
    '翻译',
    '单位换算',
    // English
    'weather',
    'what time',
    'convert',
    'translate',
    'exchange rate',
  ],
};

/**
 * Keyword-based signal detector.
 *
 * A trivially simple but effective first-pass classifier: if the
 * message contains any strong-cue phrase, treat it as a strong signal;
 * otherwise try weak, then trivial, then fall back to `normal`. Empty
 * messages are always `normal` (the caller should generally not pass
 * them in at all).
 *
 * The detector is deliberately a keyword pre-filter, not a full NLU
 * layer. Its job is to short-circuit obvious cases cheaply so that the
 * more expensive similarity scorer only runs on messages that need it.
 */
export class KeywordSignalDetector implements SignalDetecting {
  private readonly lexicon: SignalLexicon;

  constructor(lexicon: SignalLexicon = defaultSignalLexicon) {
    this.lexicon = lexicon;
  }

  detectSignal(message: string): IntentSignal {
    const trimmed = message.trim();
    if (trimmed.length === 0) {
      return IntentSignal.normal();
    }

    const lower = trimmed.toLowerCase();
    const matches = (needle: string): boolean =>
      trimmed.includes(needle) || lower.includes(needle.toLowerCase());

    if (this.lexicon.strong.some(matches)) {
      return IntentSignal.strong();
    }
    if (this.lexicon.weak.some(matches)) {
      return IntentSignal.weak();
    }
    if (this.lexicon.trivial.some(matches)) {
      return IntentSignal.trivial();
    }
    return IntentSignal.normal();
  }
}
