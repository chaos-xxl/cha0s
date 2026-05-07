export type {
  ClusteringStrategy,
  RoutingStrategy,
  SignalDetecting,
  TimeDecayCalculating,
} from './interfaces.js';

export { ExponentialTimeDecay } from './exponential-time-decay.js';
export { KeywordSignalDetector, defaultSignalLexicon } from './keyword-signal-detector.js';
export type { SignalLexicon } from './keyword-signal-detector.js';
export {
  KeywordMatchingStrategy,
  NEW_TOPIC_MAX_EXISTING_SCORE,
} from './keyword-matching-strategy.js';
export { KeywordClusteringStrategy } from './keyword-clustering-strategy.js';
