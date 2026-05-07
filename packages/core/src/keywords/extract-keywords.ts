/**
 * Extract a lightweight keyword set from a text message.
 *
 * cha0s needs a "good enough" keyword list for two jobs:
 *  - Seeding {@link Fragment.keywords} when a message lands in the inbox.
 *  - Comparing messages by keyword overlap in the correction learner.
 *
 * This implementation is deliberately dependency-free and
 * language-agnostic. It does two passes:
 *
 *  1. Latin / alphanumeric tokens: split on whitespace and punctuation,
 *     lowercase, keep tokens of length >= 2. Works for English,
 *     European languages, transliterated names, and numbers.
 *
 *  2. CJK bigrams: for any run of Chinese/Japanese/Korean ideographs,
 *     generate sliding two-character windows. "装修预算" becomes
 *     ["装修", "修预", "预算"]. This is a widely-used approximation
 *     that avoids a full-blown segmenter while still producing useful
 *     overlap signals.
 *
 * The goal is NOT to be a production-grade NLP pipeline — adapter
 * packages that call into LLM embeddings will replace this entirely.
 * The goal IS to make core usable out of the box with zero network.
 */
export function extractKeywords(text: string): string[] {
  const tokens = new Set<string>();

  // Pass 1: alnum tokens (letters, digits, Latin marks).
  // We split on anything that is NOT a letter/digit/underscore.
  const latin = text.split(/[^\p{L}\p{N}_]+/u);
  for (const raw of latin) {
    if (raw.length < 2) continue;
    tokens.add(raw.toLowerCase());
  }

  // Pass 2: CJK bigrams. Walk the string one codepoint at a time
  // so surrogate pairs (rare-ideograph extensions) don't split.
  const codepoints = [...text];
  for (let i = 0; i < codepoints.length - 1; i++) {
    const a = codepoints[i]!;
    const b = codepoints[i + 1]!;
    if (isCJK(a) && isCJK(b)) {
      tokens.add(a + b);
    }
  }

  return [...tokens];
}

function isCJK(ch: string): boolean {
  const code = ch.codePointAt(0);
  if (code === undefined) return false;
  return (
    (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified Ideographs
    (code >= 0x3400 && code <= 0x4dbf) || // CJK Extension A
    (code >= 0x20000 && code <= 0x2a6df) // CJK Extension B
  );
}
