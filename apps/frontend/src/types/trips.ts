export type TripActivity =
  | 'Business'
  | 'Dinner'
  | 'Casual'
  | 'Beach'
  | 'Active'
  | 'Formal'
  | 'Sightseeing'
  | 'Cold Weather';

export type WeatherSource = 'live' | 'cached' | 'estimated';

export type WeatherResult = {
  days: DayWeather[];
  source: WeatherSource;
};

export type CapsuleWarning = {
  code: string;
  message: string;
};

export type WeatherCondition =
  | 'sunny'
  | 'partly-cloudy'
  | 'cloudy'
  | 'rainy'
  | 'snowy'
  | 'windy';

export type DayWeather = {
  date: string;
  dayLabel: string;
  highF: number;
  lowF: number;
  condition: WeatherCondition;
  rainChance: number;
};

export type ClosetLocation = {
  id: string;
  label: string;
  color?: string; // theme color key (e.g. 'success', 'warning'); optional for legacy
};

/**
 * Minimal wardrobe item shape for trips feature.
 * Handles the mixed camelCase/snake_case API response.
 */
export type TripWardrobeItem = {
  id: string;
  image_url?: string;
  thumbnailUrl?: string;
  processedImageUrl?: string;
  touchedUpImageUrl?: string;
  name: string;
  color?: string;
  main_category?: string;
  subcategory?: string;
  material?: string;
  seasonality?: string;
  thermalRating?: number;
  breathability?: number;
  rainOk?: boolean;
  climateSweetspotFMin?: number;
  climateSweetspotFMax?: number;
  layering?: string;
  occasionTags?: string[];
  dressCode?: string;
  formalityScore?: number;
};

export type TripPackingItem = {
  id: string;
  wardrobeItemId: string;
  name: string;
  imageUrl: string;
  color?: string;
  mainCategory: string;
  subCategory?: string;
  locationLabel: string;
  packed: boolean;
};

export type BackupSuggestion = {
  wardrobeItemId: string;
  name: string;
  imageUrl: string;
  reason: string;
};

export type CapsuleOutfit = {
  id: string;
  dayLabel: string;
  type?: 'anchor' | 'support';
  occasion?: string;
  items: TripPackingItem[];
};

export type PackingGroup = {
  category: string;
  items: TripPackingItem[];
};

export type TripCapsule = {
  build_id: string;
  outfits: CapsuleOutfit[];
  packingList: PackingGroup[];
  version?: number;
  fingerprint?: string;
  tripBackupKit?: BackupSuggestion[];
};

export type Trip = {
  id: string;
  destination: string;
  destinationLat?: number;
  destinationLng?: number;
  destinationPlaceKey?: string;
  startDate: string;
  endDate: string;
  activities: TripActivity[];
  startingLocationId: string;
  startingLocationLabel: string;
  weather: DayWeather[];
  weatherSource?: WeatherSource;
  capsule: TripCapsule | null;
  warnings?: CapsuleWarning[];
  createdAt: string;
};

export type TripsScreen = 'home' | 'create' | 'capsule';
