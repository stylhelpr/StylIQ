/**
 * Feature Flags Configuration
 *
 * Controls gradual rollout of new features.
 * All learning features are OFF by default for safety.
 */

export const LEARNING_FLAGS = {
  /**
   * Enable event logging to user_learning_events table.
   * When false: no events are written, all logging calls are no-ops.
   * Default: false
   */
  EVENTS_ENABLED: process.env.LEARNING_EVENTS_ENABLED === 'true',

  /**
   * Enable consumption of user_fashion_state in AI pipelines.
   * When false: AI components use existing logic only.
   * Default: false
   */
  STATE_ENABLED: process.env.LEARNING_STATE_ENABLED === 'true',

  /**
   * Shadow mode: log what WOULD change without affecting output.
   * When true (and STATE_ENABLED=true): logs ranking changes but returns original results.
   * Default: true (safe mode)
   */
  SHADOW_MODE: process.env.LEARNING_SHADOW_MODE !== 'false',
};

/**
 * Aggregation configuration constants.
 * These control how events are processed into derived state.
 */
export const AGGREGATION_CONFIG = {
  /** Maximum age of events to consider (days) */
  MAX_EVENT_AGE_DAYS: 180,

  /** Half-life for positive signal decay (days) */
  POSITIVE_HALF_LIFE_DAYS: 30,

  /** Half-life for negative signal decay (days) - faster decay prevents over-narrowing */
  NEGATIVE_HALF_LIFE_DAYS: 14,

  /** Minimum events with polarity != 0 before exiting cold start */
  MIN_EVENTS_FOR_ACTIVE: 10,

  /** Minimum score after clamping (asymmetric to prevent permanent blacklisting) */
  SCORE_FLOOR: -3,

  /** Maximum score after clamping */
  SCORE_CEILING: 5,

  /** Staleness threshold - recompute if older than this (ms) */
  STALENESS_THRESHOLD_MS: 60 * 60 * 1000, // 1 hour
};

/**
 * Event logging configuration.
 * Controls timeout, circuit breaker, and failure handling.
 */
export const EVENT_LOGGING_CONFIG = {
  /** Hard timeout for event insert (ms) - never block longer */
  TIMEOUT_MS: 50,

  /** Open circuit breaker after this many consecutive failures */
  CIRCUIT_BREAKER_THRESHOLD: 10,

  /** Try to reset circuit breaker after this duration (ms) */
  CIRCUIT_BREAKER_RESET_MS: 30000,
};

/**
 * Consent cache configuration.
 */
export const CONSENT_CACHE_CONFIG = {
  /** Time-to-live for cached consent values (ms) */
  TTL_MS: 60000, // 1 minute
};

/**
 * Check if learning features are completely disabled.
 * Use this for early-exit in hot paths.
 */
export function isLearningDisabled(): boolean {
  return !LEARNING_FLAGS.EVENTS_ENABLED && !LEARNING_FLAGS.STATE_ENABLED;
}

/**
 * Check if we should apply learning state to rankings.
 * Returns true only when STATE_ENABLED=true AND SHADOW_MODE=false.
 */
export function shouldApplyLearningState(): boolean {
  return LEARNING_FLAGS.STATE_ENABLED && !LEARNING_FLAGS.SHADOW_MODE;
}
