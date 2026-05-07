import type { Id, Role } from './primitives.js';

/**
 * Provenance data describing how a message was routed by cha0s.
 *
 * Attached to {@link Message} so that downstream systems (UI, analytics,
 * correction learners) can understand — and, when needed, reconstruct —
 * the routing decision that placed the message where it ended up.
 *
 * All fields are optional so that raw messages (those that have not yet
 * gone through the router) can still be represented as {@link Message}.
 */
export interface RoutingMetadata {
  /**
   * The identifier of the space or inbox where the router initially
   * placed this message (e.g. a topic space id, or `"inbox"`).
   */
  readonly originalDestination: string;

  /**
   * The router's confidence in the decision, in the range `[0, 1]`.
   * A value of `1` means "certain"; a value near `0` means the message
   * was placed by fallback rather than strong signal.
   */
  readonly confidence: number;

  /**
   * `true` if the user has since moved this message to a different
   * location (correction event). `false` if the message has stayed where
   * the router originally put it.
   */
  readonly wasReassigned: boolean;

  /**
   * When `wasReassigned` is `true`, the destination the message was
   * moved *from*. Useful for correction learners to learn the
   * "was X, should have been Y" signal.
   */
  readonly reassignedFrom?: string;
}

/**
 * A single turn in a conversation.
 *
 * A `Message` is the atomic unit of data that flows through cha0s. It
 * intentionally mirrors the message shape used by major LLM SDKs
 * (OpenAI, Anthropic, Vercel AI SDK) so that integration requires zero
 * data mapping: host applications can pass their existing messages
 * directly to the router.
 *
 * Messages are immutable by convention — routing metadata is attached
 * by returning a new message with the `routing` field populated, rather
 * than mutating the original.
 */
export interface Message {
  /** Stable unique identifier for the message. */
  readonly id: Id;

  /** Which conversational party produced this message. */
  readonly role: Role;

  /** The raw textual content of the message. */
  readonly content: string;

  /** When the message was produced (not when it was routed). */
  readonly timestamp: Date;

  /**
   * Routing provenance, populated after the message passes through the
   * cha0s router. Absent on messages that have not yet been routed.
   */
  readonly routing?: RoutingMetadata;
}
