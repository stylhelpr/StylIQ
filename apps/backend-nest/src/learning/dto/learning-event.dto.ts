/**
 * DTOs for Learning Events
 */

/**
 * Valid event types for the learning system.
 * Each maps to a specific user action with known polarity and weight.
 */
export type LearningEventType =
  | 'OUTFIT_RATED_POSITIVE'
  | 'OUTFIT_RATED_NEGATIVE'
  | 'OUTFIT_WORN'
  | 'OUTFIT_FAVORITED'
  | 'OUTFIT_UNFAVORITED'
  | 'PRODUCT_SAVED'
  | 'PRODUCT_UNSAVED'
  | 'PRODUCT_PURCHASED'
  | 'PRODUCT_RETURNED'
  | 'LOOK_SAVED'
  | 'POST_LIKED'
  | 'POST_SAVED'
  | 'POST_DISMISSED'
  | 'ITEM_EXPLICITLY_DISMISSED'
  | 'ELITE_SUGGESTION_SERVED';

/**
 * Entity types that can be the subject of learning events.
 */
export type EntityType =
  | 'outfit'
  | 'product'
  | 'post'
  | 'look'
  | 'notification';

/**
 * Signal polarity values.
 * -1: negative/dislike
 *  0: neutral/impression (reserved for future use)
 * +1: positive/like
 */
export type SignalPolarity = -1 | 0 | 1;

/**
 * Extracted features from an entity for aggregation.
 * All fields are optional - extract what's available.
 */
export interface ExtractedFeatures {
  brands?: string[];
  colors?: string[];
  categories?: string[];
  styles?: string[];
  materials?: string[];
  tags?: string[];
  item_ids?: string[];
}

/**
 * Context snapshot at the time of the event.
 * Denormalized for efficient querying.
 */
export interface EventContext {
  weather_code?: string;
  temp_f?: number;
  season?: string;
  occasion?: string;
  location_type?: string;
  schema_version?: number;
  pipeline_version?: number;
}

/**
 * Input DTO for creating a learning event.
 * This is what callers provide to the LearningEventsService.
 */
export interface CreateLearningEventInput {
  /** User who performed the action */
  userId: string;

  /** Type of event */
  eventType: LearningEventType;

  /** Type of entity acted upon */
  entityType: EntityType;

  /** ID of the entity (UUID or external ID) */
  entityId?: string;

  /** Normalized signature for similarity matching */
  entitySignature?: string;

  /** Direction of signal */
  signalPolarity: SignalPolarity;

  /** Strength of signal (0.1 to 1.0) */
  signalWeight: number;

  /** Features extracted from the entity */
  extractedFeatures: ExtractedFeatures;

  /** Context at time of event */
  context?: EventContext;

  /** Source feature that generated this event */
  sourceFeature: string;

  /** Client-generated event ID for idempotency */
  clientEventId?: string;
}

/**
 * Mapping of event types to their default signal values.
 * Used to ensure consistency across the codebase.
 */
export const EVENT_SIGNAL_DEFAULTS: Record<
  LearningEventType,
  { polarity: SignalPolarity; weight: number }
> = {
  OUTFIT_RATED_POSITIVE: { polarity: 1, weight: 0.6 },
  OUTFIT_RATED_NEGATIVE: { polarity: -1, weight: 0.6 },
  OUTFIT_WORN: { polarity: 1, weight: 0.6 },
  OUTFIT_FAVORITED: { polarity: 1, weight: 0.3 },
  OUTFIT_UNFAVORITED: { polarity: -1, weight: 0.2 },
  PRODUCT_SAVED: { polarity: 1, weight: 0.6 },
  PRODUCT_UNSAVED: { polarity: -1, weight: 0.2 },
  PRODUCT_PURCHASED: { polarity: 1, weight: 1.0 },
  PRODUCT_RETURNED: { polarity: -1, weight: 0.8 },
  LOOK_SAVED: { polarity: 1, weight: 0.3 },
  POST_LIKED: { polarity: 1, weight: 0.3 },
  POST_SAVED: { polarity: 1, weight: 0.5 },
  POST_DISMISSED: { polarity: -1, weight: 0.2 },
  ITEM_EXPLICITLY_DISMISSED: { polarity: -1, weight: 0.4 },
  ELITE_SUGGESTION_SERVED: { polarity: 0, weight: 0 },
};
