/**
 * TripAI Structured Logger
 *
 * Gated behind __DEV__ + TRIP_AI_DEBUG constant.
 * Enables full reconstruction of: INPUT → WEATHER → SLOTS → OVERRIDES → OUTPUT
 *
 * Toggle: set TRIP_AI_DEBUG = true below to enable during development.
 * Production builds (where __DEV__ is false) always skip logging.
 */

// ── Toggle ──────────────────────────────────────────────────────────────────
// Set to `true` to enable debug logging in development.
const TRIP_AI_DEBUG = false;

function isEnabled(): boolean {
  return __DEV__ && TRIP_AI_DEBUG;
}

function safeStringify(data: unknown, maxLen = 5000): string {
  try {
    const json = JSON.stringify(data);
    return json.length > maxLen ? json.slice(0, maxLen) + '…[truncated]' : json;
  } catch {
    return String(data);
  }
}

function emit(stage: string, requestId: string, data: Record<string, unknown>) {
  setTimeout(() => {
    console.log(`[TripAI] ${stage} ${safeStringify({requestId, ...data})}`);
  }, 0);
}

// ── Typed log functions ─────────────────────────────────────────────────────

export function logInput(
  requestId: string,
  data: {
    numDays: number;
    activities: string[];
    weatherDays: number;
    wardrobeSize: number;
    presentation: string;
    eligibleCount: number;
    location: string;
  },
) {
  if (!isEnabled()) return;
  emit('INPUT', requestId, data);
}

export function logWeatherAnalysis(
  requestId: string,
  data: {
    needsWarmLayer: boolean;
    needsRainLayer: boolean;
    isHot: boolean;
    isCold: boolean;
    climateZones?: string[];
  },
) {
  if (!isEnabled()) return;
  emit('WEATHER', requestId, data);
}

export function logSlotDecision(
  requestId: string,
  data: {
    category: string;
    requiredCount?: number;
    selectedCount: number;
    selected: string[];
    rejected?: string[];
    reason: string;
  },
) {
  if (!isEnabled()) return;
  emit('SLOT_DECISION', requestId, data);
}

export function logOverride(
  requestId: string,
  data: {
    rule: string;
    before: number;
    after: number;
    detail?: string;
  },
) {
  if (!isEnabled()) return;
  emit('OVERRIDE', requestId, data);
}

export function logOutput(
  requestId: string,
  data: {
    outfitCount: number;
    packingGroups: Array<{category: string; count: number}>;
    uniqueItems: number;
    buildId: string;
  },
) {
  if (!isEnabled()) return;
  emit('OUTPUT', requestId, data);
}
