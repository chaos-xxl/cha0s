/**
 * Primitive types used across the cha0s core library.
 *
 * These are the lowest-level building blocks: identifiers, roles, and
 * the intent signal enumeration. Higher-level models (Message, Fragment,
 * TopicSpace, ...) build on top of these.
 */

/**
 * A universally unique identifier, encoded as a string.
 *
 * cha0s uses string IDs (as opposed to opaque objects) so they can be
 * freely serialised, compared with `===`, and used as object keys.
 * The format is not prescribed — any reasonably unique string works,
 * including UUIDs, ULIDs, or host-provided IDs.
 */
export type Id = string;

/**
 * The role of a message participant.
 *
 * - `user`: A human end-user speaking to the agent.
 * - `assistant`: The AI agent responding to the user.
 * - `system`: A control message (e.g. system prompts, tool results).
 *
 * The shape mirrors the de-facto standard used by OpenAI, Anthropic,
 * and most LLM SDKs, so integration is one-to-one.
 */
export type Role = 'user' | 'assistant' | 'system';

/**
 * Intent signal detected in an incoming message.
 *
 * Signals steer the router's first-pass decision before any similarity
 * matching is performed:
 *
 * - `strong`: Explicit continuation cue ("let's keep talking about X").
 *   May carry an optional `target` hint pointing to a specific space.
 * - `weak`: A vague or one-off request that is unlikely to fit any
 *   existing topic ("just look something up for me").
 * - `normal`: A plain message that should be scored against all topic
 *   spaces using the configured matching strategy.
 * - `trivial`: Utilitarian one-shot queries such as weather, time,
 *   or unit conversion — routed to the inbox and not worth topic space.
 */
export type IntentSignal =
  | { kind: 'strong'; target?: Id }
  | { kind: 'weak' }
  | { kind: 'normal' }
  | { kind: 'trivial' };

/**
 * Convenience constructors for IntentSignal variants.
 *
 * Using these instead of object literals keeps call sites tidy and
 * guarantees discriminant correctness at compile time.
 */
export const IntentSignal = {
  strong(target?: Id): IntentSignal {
    return target === undefined ? { kind: 'strong' } : { kind: 'strong', target };
  },
  weak(): IntentSignal {
    return { kind: 'weak' };
  },
  normal(): IntentSignal {
    return { kind: 'normal' };
  },
  trivial(): IntentSignal {
    return { kind: 'trivial' };
  },
} as const;
