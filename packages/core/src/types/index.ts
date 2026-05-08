/**
 * Public type surface for @doctorchaos-ai/core.
 *
 * Every type used by downstream adapters (`@doctorchaos-ai/openai`,
 * `@doctorchaos-ai/anthropic`, ...) and by host applications is re-exported
 * here. Imports from deep paths (`'@doctorchaos-ai/core/types/message.js'`)
 * are not considered part of the public API.
 */

export type { Fragment } from './fragment.js';
export type { FragmentCluster } from './fragment-cluster.js';
export type { InboxSpace } from './inbox-space.js';
export { addFragment, createInboxSpace, removeFragments } from './inbox-space.js';
export type { Message, RoutingMetadata } from './message.js';
export type { Id, IntentSignal, Role } from './primitives.js';
export { IntentSignal as IntentSignalCtor } from './primitives.js';
export type { RoutingCorrection } from './routing-correction.js';
export type { CreationSource, TopicSpace, TopicStatus } from './topic-space.js';
