/**
 * Elite Scoring feature flags (frontend).
 *
 * Master switch: set ELITE_ENABLED_TRIPS = true to force-enable elite scoring +
 * V2 rerank for Trips capsule outfits. Default: false.
 */
const ELITE_ENABLED_TRIPS = false;

export const ELITE_SCORING_TRIPS = ELITE_ENABLED_TRIPS;
export const ELITE_SCORING_TRIPS_V2 = ELITE_ENABLED_TRIPS;
export const ELITE_SCORING_DEBUG = false;
