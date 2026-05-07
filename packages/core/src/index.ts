/**
 * @cha0s-ai/core
 *
 * Turn your conversation chaos down to 0.
 * The conversation organization layer for AI chat apps.
 *
 * This is an early-stage release. The public API is under active design.
 * Follow https://github.com/chaos-xxl/cha0s for updates.
 */

/**
 * Current package version.
 *
 * Kept in sync with package.json. Exposed so host apps can detect the
 * installed version at runtime (useful in bug reports and telemetry).
 */
export const VERSION = '0.1.0-alpha.0' as const;

/**
 * Lifecycle status of the library.
 *
 * - `alpha`: Public API is expected to change between minor releases.
 * - `beta`:  Public API is largely frozen, but edge cases may shift.
 * - `stable`: Semantic versioning guarantees apply.
 */
export const STATUS = 'alpha' as const;

export type { Fragment } from './types/fragment.js';
export type { Message, RoutingMetadata } from './types/message.js';
export type { Id, IntentSignal, Role } from './types/primitives.js';
export { IntentSignal as IntentSignalCtor } from './types/primitives.js';
