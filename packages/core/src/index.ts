/**
 * @doctorchaos-ai/core
 *
 * Doctor Chaos — the conversation organization layer for AI chat apps.
 * Routes every incoming message to its rightful specialty; rests the
 * ambiguous ones in the waiting room until a pattern emerges.
 *
 * This is an early-stage release. The public API is under active design.
 * Follow https://github.com/doctorchaos-ai/doctor-chaos for updates.
 */

/**
 * Current package version.
 *
 * Kept in sync with package.json. Exposed so host apps can detect the
 * installed version at runtime (useful in bug reports and telemetry).
 */
export const VERSION = '0.2.0-alpha.0' as const;

/**
 * Lifecycle status of the library.
 *
 * - `alpha`: Public API is expected to change between minor releases.
 * - `beta`:  Public API is largely frozen, but edge cases may shift.
 * - `stable`: Semantic versioning guarantees apply.
 */
export const STATUS = 'alpha' as const;

export * from './clinic.js';
export * from './adapters/index.js';
export * from './config/index.js';
export * from './keywords/index.js';
export * from './learning/index.js';
export * from './lifecycle/index.js';
export * from './routing/index.js';
export * from './strategies/index.js';
export * from './types/index.js';
