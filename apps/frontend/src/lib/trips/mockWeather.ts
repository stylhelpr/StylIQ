import {DayWeather, WeatherCondition} from '../../types/trips';

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type WeatherProfile = {
  baseHighF: number;
  baseLowF: number;
  conditions: WeatherCondition[];
  rainChanceBase: number;
};

const DESTINATION_PROFILES: Record<string, WeatherProfile> = {
  miami: {
    baseHighF: 87,
    baseLowF: 74,
    conditions: ['sunny', 'partly-cloudy', 'sunny'],
    rainChanceBase: 30,
  },
  cancun: {
    baseHighF: 90,
    baseLowF: 76,
    conditions: ['sunny', 'sunny', 'partly-cloudy'],
    rainChanceBase: 25,
  },
  hawaii: {
    baseHighF: 85,
    baseLowF: 72,
    conditions: ['sunny', 'partly-cloudy', 'sunny'],
    rainChanceBase: 20,
  },
  aspen: {
    baseHighF: 38,
    baseLowF: 18,
    conditions: ['snowy', 'cloudy', 'partly-cloudy'],
    rainChanceBase: 40,
  },
  nyc: {
    baseHighF: 55,
    baseLowF: 40,
    conditions: ['cloudy', 'partly-cloudy', 'rainy'],
    rainChanceBase: 35,
  },
  london: {
    baseHighF: 58,
    baseLowF: 45,
    conditions: ['rainy', 'cloudy', 'partly-cloudy'],
    rainChanceBase: 55,
  },
  paris: {
    baseHighF: 62,
    baseLowF: 48,
    conditions: ['partly-cloudy', 'cloudy', 'sunny'],
    rainChanceBase: 30,
  },
  tokyo: {
    baseHighF: 68,
    baseLowF: 52,
    conditions: ['partly-cloudy', 'sunny', 'cloudy'],
    rainChanceBase: 25,
  },
  la: {
    baseHighF: 78,
    baseLowF: 60,
    conditions: ['sunny', 'sunny', 'partly-cloudy'],
    rainChanceBase: 10,
  },
  dubai: {
    baseHighF: 95,
    baseLowF: 78,
    conditions: ['sunny', 'sunny', 'sunny'],
    rainChanceBase: 5,
  },
  barcelona: {
    baseHighF: 75,
    baseLowF: 60,
    conditions: ['sunny', 'partly-cloudy', 'sunny'],
    rainChanceBase: 15,
  },
  chicago: {
    baseHighF: 50,
    baseLowF: 35,
    conditions: ['windy', 'cloudy', 'partly-cloudy'],
    rainChanceBase: 30,
  },
  denver: {
    baseHighF: 52,
    baseLowF: 30,
    conditions: ['sunny', 'partly-cloudy', 'snowy'],
    rainChanceBase: 20,
  },
  seattle: {
    baseHighF: 55,
    baseLowF: 42,
    conditions: ['rainy', 'cloudy', 'rainy'],
    rainChanceBase: 60,
  },
};

const DEFAULT_PROFILE: WeatherProfile = {
  baseHighF: 70,
  baseLowF: 52,
  conditions: ['partly-cloudy', 'sunny', 'cloudy'],
  rainChanceBase: 25,
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getProfile(destination: string): WeatherProfile {
  const lower = destination.toLowerCase().trim();
  for (const [key, profile] of Object.entries(DESTINATION_PROFILES)) {
    if (lower.includes(key)) return profile;
  }
  if (lower.includes('new york')) return DESTINATION_PROFILES.nyc;
  if (lower.includes('los angeles')) return DESTINATION_PROFILES.la;
  if (lower.includes('san francisco')) {
    return {
      baseHighF: 65,
      baseLowF: 50,
      conditions: ['cloudy', 'partly-cloudy', 'sunny'],
      rainChanceBase: 20,
    };
  }
  return DEFAULT_PROFILE;
}

/**
 * Deterministic mock weather for a destination and date range.
 * Same inputs always produce the same output.
 */
export function generateMockWeather(
  destination: string,
  startDate: string,
  endDate: string,
): DayWeather[] {
  const profile = getProfile(destination);
  const seed = hashString(`${destination}:${startDate}:${endDate}`);
  const rand = seededRandom(seed);

  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const days: DayWeather[] = [];
  const current = new Date(start);

  while (current <= end) {
    const r = rand();
    const highVariation = Math.round((r - 0.5) * 12);
    const lowVariation = Math.round((rand() - 0.5) * 8);
    const highF = profile.baseHighF + highVariation;
    const lowF = Math.min(profile.baseLowF + lowVariation, highF - 5);

    const conditionIdx = Math.floor(rand() * profile.conditions.length);
    const condition = profile.conditions[conditionIdx];

    const rainVariation = Math.round((rand() - 0.5) * 30);
    const rainChance = Math.max(
      0,
      Math.min(100, profile.rainChanceBase + rainVariation),
    );

    days.push({
      date: current.toISOString().split('T')[0],
      dayLabel: DAY_LABELS[current.getDay()],
      highF,
      lowF,
      condition,
      rainChance,
    });

    current.setDate(current.getDate() + 1);
  }

  return days;
}
