// apps/frontend/src/lib/elite/eliteFlags.ts

/**
 * ONE SWITCH: Elite on/off for Trips (frontend)
 * Trips is client-side only; no backend flag can reach this code path.
 */
export const ELITE_ENABLED_TRIPS = true; // ← set false to turn Trips Elite OFF

export const ELITE_SCORING_TRIPS = ELITE_ENABLED_TRIPS;
export const ELITE_SCORING_TRIPS_V2 = ELITE_ENABLED_TRIPS;

// Optional debug logs (keep off unless you need proof logs)
export const ELITE_SCORING_DEBUG = false;
