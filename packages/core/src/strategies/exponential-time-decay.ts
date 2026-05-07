import {
  defaultRoutingConfiguration,
  type RoutingConfiguration,
} from '../config/routing-configuration.js';
import type { TimeDecayCalculating } from './interfaces.js';

/**
 * Exponential time-decay calculator.
 *
 * Applies the classic half-life formula:
 * ```
 *   factor = exp(-ln(2) / halfLife * deltaSeconds)
 * ```
 *
 * This gives a score of exactly `0.5` at the configured half-life,
 * `0.25` at twice the half-life, and so on. The default half-life of
 * 7 days (from {@link defaultRoutingConfiguration}) encodes the
 * intuition that a topic "fades" over a week of inactivity without
 * vanishing outright.
 */
export class ExponentialTimeDecay implements TimeDecayCalculating {
  private readonly halfLifeSeconds: number;

  constructor(configuration: RoutingConfiguration = defaultRoutingConfiguration) {
    this.halfLifeSeconds = configuration.timeDecayHalfLifeSeconds;
  }

  decayFactor(lastActivity: Date, now: Date): number {
    const deltaMs = now.getTime() - lastActivity.getTime();
    // Clock skew or "active in the future" — treat as fully fresh.
    if (deltaMs <= 0) {
      return 1;
    }
    const deltaSeconds = deltaMs / 1000;
    const lambda = Math.LN2 / this.halfLifeSeconds;
    const factor = Math.exp(-lambda * deltaSeconds);
    // Clamp for numerical safety.
    if (factor >= 1) return 1;
    if (factor <= 0) return 0;
    return factor;
  }
}
