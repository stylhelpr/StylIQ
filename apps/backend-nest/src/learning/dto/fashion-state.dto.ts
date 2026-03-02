/**
 * DTOs for User Fashion State
 */

/**
 * Score map type: key -> score in [-3, +5]
 */
export type ScoreMap = Record<string, number>;

/**
 * Price bracket derived from purchase history.
 */
export type PriceBracket = 'budget' | 'mid' | 'premium' | 'luxury' | null;

/**
 * The derived user fashion state.
 * Computed from aggregating learning events.
 */
export interface UserFashionState {
  /** User ID this state belongs to */
  userId: string;

  /** Brand affinity scores */
  brandScores: ScoreMap;

  /** Color affinity scores */
  colorScores: ScoreMap;

  /** Category affinity scores */
  categoryScores: ScoreMap;

  /** Style affinity scores */
  styleScores: ScoreMap;

  /** Material affinity scores */
  materialScores: ScoreMap;

  /** Tag affinity scores (freeform) */
  tagScores: ScoreMap;

  /** Fit issues from returns */
  fitIssues: ScoreMap;

  /** Average purchase price */
  avgPurchasePrice: number | null;

  /** Derived price bracket */
  priceBracket: PriceBracket;

  /** Occasion frequency counts */
  occasionFrequency: ScoreMap;

  /** Number of events processed */
  eventsProcessedCount: number;

  /** Whether user is in cold start (< 10 explicit events) */
  isColdStart: boolean;

  /** When this state was last computed */
  lastComputedAt: Date;

  /** State schema version */
  stateVersion: number;
}

/**
 * Summary of user's top preferences for injection into AI context.
 * This is the lightweight view used by AI consumers.
 */
export interface FashionStateSummary {
  /** Top 5 preferred brands (positive scores) */
  topBrands: string[];

  /** Top 3 avoided brands (negative scores) */
  avoidBrands: string[];

  /** Top 5 preferred colors */
  topColors: string[];

  /** Top 3 avoided colors */
  avoidColors: string[];

  /** Top 5 preferred styles */
  topStyles: string[];

  /** Top 3 avoided styles */
  avoidStyles: string[];

  /** Top 5 preferred categories */
  topCategories: string[];

  /** Price bracket if known */
  priceBracket: PriceBracket;

  /** Whether this is a cold start user */
  isColdStart: boolean;
}

/**
 * Extract top N keys from a score map by score value.
 * @param scores The score map
 * @param n Number of results
 * @param direction 'positive' for highest scores, 'negative' for lowest
 */
export function getTopN(
  scores: ScoreMap,
  n: number,
  direction: 'positive' | 'negative',
): string[] {
  const entries = Object.entries(scores);

  if (direction === 'positive') {
    return entries
      .filter(([, score]) => score > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([key]) => key);
  } else {
    return entries
      .filter(([, score]) => score < 0)
      .sort((a, b) => a[1] - b[1])
      .slice(0, n)
      .map(([key]) => key);
  }
}

/**
 * Create a summary from full fashion state.
 * Used for AI context injection.
 */
export function createStateSummary(
  state: UserFashionState,
): FashionStateSummary {
  return {
    topBrands: getTopN(state.brandScores, 5, 'positive'),
    avoidBrands: getTopN(state.brandScores, 3, 'negative'),
    topColors: getTopN(state.colorScores, 5, 'positive'),
    avoidColors: getTopN(state.colorScores, 3, 'negative'),
    topStyles: getTopN(state.styleScores, 5, 'positive'),
    avoidStyles: getTopN(state.styleScores, 3, 'negative'),
    topCategories: getTopN(state.categoryScores, 5, 'positive'),
    priceBracket: state.priceBracket,
    isColdStart: state.isColdStart,
  };
}
