/**
 * capsuleCoherence.ts — Capsule-level state tracker for color + silhouette drift.
 * Applied as a deterministic penalty during outfit selection.
 *
 * LOCKED: Does NOT import any shared backend modules.
 */
import {TripWardrobeItem, TripPackingItem} from '../../types/trips';

export type ColorTemperature = 'warm' | 'cool' | 'neutral' | 'earth';

export interface CapsuleCoherenceState {
  colorTempCounts: Record<ColorTemperature, number>;
  silhouetteDirection: 'structured' | 'relaxed' | 'mixed' | null;
  totalOutfits: number;
}

const WARM_TOKENS = ['red', 'orange', 'yellow', 'coral', 'peach', 'gold', 'amber', 'rust', 'copper', 'salmon', 'brick'];
const COOL_TOKENS = ['blue', 'navy', 'cobalt', 'teal', 'cyan', 'mint', 'lavender', 'periwinkle', 'ice', 'slate', 'indigo'];
const EARTH_TOKENS = ['brown', 'tan', 'olive', 'khaki', 'sienna', 'taupe', 'espresso', 'camel', 'chocolate', 'sage', 'forest', 'moss'];
const NEUTRAL_TOKENS = ['black', 'white', 'gray', 'grey', 'beige', 'cream', 'ivory', 'charcoal', 'nude'];

const STRUCTURED_TOKENS = ['slim', 'skinny', 'tailored', 'fitted', 'structured'];
const RELAXED_TOKENS = ['relaxed', 'oversized', 'loose', 'wide', 'baggy'];

function classifyColorTemp(color: string): ColorTemperature {
  const words = color.toLowerCase().split(/[\s,/&+\-]+/).filter(Boolean);
  for (const w of words) {
    if (WARM_TOKENS.some(t => w.includes(t))) return 'warm';
    if (COOL_TOKENS.some(t => w.includes(t))) return 'cool';
    if (EARTH_TOKENS.some(t => w.includes(t))) return 'earth';
  }
  return 'neutral';
}

function classifySilhouette(fit: string): 'structured' | 'relaxed' | null {
  const f = fit.toLowerCase();
  if (STRUCTURED_TOKENS.some(t => f.includes(t))) return 'structured';
  if (RELAXED_TOKENS.some(t => f.includes(t))) return 'relaxed';
  return null;
}

export function createCoherenceState(): CapsuleCoherenceState {
  return {
    colorTempCounts: {warm: 0, cool: 0, neutral: 0, earth: 0},
    silhouetteDirection: null,
    totalOutfits: 0,
  };
}

export function updateCoherence(
  state: CapsuleCoherenceState,
  outfitItems: TripPackingItem[],
  itemLookup: Map<string, TripWardrobeItem>,
): void {
  state.totalOutfits++;

  // Track color temperatures
  for (const pi of outfitItems) {
    const full = itemLookup.get(pi.wardrobeItemId);
    if (full?.color) {
      const temp = classifyColorTemp(full.color);
      state.colorTempCounts[temp]++;
    }
  }

  // Track silhouette direction
  let structured = 0;
  let relaxed = 0;
  for (const pi of outfitItems) {
    const full = itemLookup.get(pi.wardrobeItemId);
    if (full?.fit) {
      const dir = classifySilhouette(full.fit);
      if (dir === 'structured') structured++;
      if (dir === 'relaxed') relaxed++;
    }
  }

  if (state.silhouetteDirection === null) {
    if (structured > relaxed) state.silhouetteDirection = 'structured';
    else if (relaxed > structured) state.silhouetteDirection = 'relaxed';
  } else if (state.silhouetteDirection !== 'mixed') {
    if (structured > 0 && relaxed > 0) state.silhouetteDirection = 'mixed';
  }
}

/**
 * Returns penalty [-0.3, 0] for capsule drift.
 * Only activates after 2+ outfits have established a direction.
 */
export function capsuleDriftPenalty(
  candidate: TripWardrobeItem,
  state: CapsuleCoherenceState,
): number {
  if (state.totalOutfits < 2) return 0;

  let penalty = 0;

  // Color temperature drift: penalize opposite temperature when >60% in one direction
  if (candidate.color) {
    const temp = classifyColorTemp(candidate.color);
    const total = state.colorTempCounts.warm + state.colorTempCounts.cool +
      state.colorTempCounts.earth + state.colorTempCounts.neutral;
    if (total > 0 && temp !== 'neutral') {
      const warmRatio = state.colorTempCounts.warm / total;
      const coolRatio = state.colorTempCounts.cool / total;
      if (warmRatio > 0.6 && temp === 'cool') penalty -= 0.15;
      if (coolRatio > 0.6 && temp === 'warm') penalty -= 0.15;
    }
  }

  // Silhouette drift: penalize if direction is established and candidate contradicts
  if (candidate.fit && state.silhouetteDirection && state.silhouetteDirection !== 'mixed') {
    const candidateDir = classifySilhouette(candidate.fit);
    if (candidateDir && candidateDir !== state.silhouetteDirection) {
      penalty -= 0.15;
    }
  }

  return Math.max(-0.3, penalty);
}
