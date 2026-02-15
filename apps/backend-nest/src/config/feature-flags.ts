/**
 * Feature Flags Configuration
 *
 * Controls gradual rollout of new features.
 * All learning features are OFF by default for safety.
 */

import { secretExists, getSecret } from './secrets';

function getFlag(name: string, defaultValue: boolean): boolean {
  if (!secretExists(name)) return defaultValue;
  return getSecret(name).toLowerCase() === 'true';
}

export const LEARNING_FLAGS = {
  /**
   * Enable event logging to user_learning_events table.
   * When false: no events are written, all logging calls are no-ops.
   * Default: false
   */
  EVENTS_ENABLED: getFlag('LEARNING_EVENTS_ENABLED', false),

  /**
   * Enable consumption of user_fashion_state in AI pipelines.
   * When false: AI components use existing logic only.
   * Default: false
   */
  STATE_ENABLED: getFlag('LEARNING_STATE_ENABLED', false),

  /**
   * Shadow mode: log what WOULD change without affecting output.
   * When true (and STATE_ENABLED=true): logs ranking changes but returns original results.
   * Default: true (safe mode)
   */
  SHADOW_MODE: getFlag('LEARNING_SHADOW_MODE', true),
};

/**
 * Elite Scoring flags — Phase 2 V2 flags default OFF.
 * Controls whether elitePostProcessOutfits() is called per surface.
 */
export const ELITE_FLAGS = {
  STYLIST: getFlag('ELITE_SCORING_STYLIST', false),
  STUDIO: getFlag('ELITE_SCORING_STUDIO', false),
  STUDIO_V2: getFlag('ELITE_SCORING_STUDIO_V2', false),
  STYLIST_V2: getFlag('ELITE_SCORING_STYLIST_V2', false),
  DEBUG: getFlag('ELITE_SCORING_DEBUG', false),
};

// Demo: set ELITE_DEMO_USER_IDS=<comma-separated Auth0 user IDs> to force-enable
// elite scoring + rerank for Stylist + Studio surfaces in production demos.
const ELITE_DEMO_ALLOWLIST: Set<string> = new Set(
  (process.env.ELITE_DEMO_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean),
);

export function isEliteDemoUser(userId: string): boolean {
  return ELITE_DEMO_ALLOWLIST.has(userId);
}

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
