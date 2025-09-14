export type FeedFilter = {
  topics?: string[]; // e.g. ["quiet-luxury","linen"]
  sources?: string[]; // e.g. ["Vogue","GQ"]
  constraints?: {
    weather?: 'hot' | 'cold' | 'rainy';
    occasion?: string;
  };
};

export type Chip = {
  id: string;
  label: string;
  type: 'personal' | 'trending' | 'context' | 'source';
  reason?: string;
  weight?: number;
  filter: FeedFilter; // ⬅️ this is the link to the feed
};
