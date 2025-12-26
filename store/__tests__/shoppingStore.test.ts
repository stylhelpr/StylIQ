/**
 * Shopping Store Tests
 * Tests for tracking consent and clear analytics functionality
 */

// Mock AsyncStorage before importing the store
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-uuid
jest.mock('react-native-uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234-5678-9abc-def012345678'),
}));

import {useShoppingStore} from '../shoppingStore';

describe('ShoppingStore - Tracking Consent', () => {
  beforeEach(() => {
    // Reset store state before each test
    useShoppingStore.setState({
      trackingConsent: 'pending',
      productInteractions: [],
      cartHistory: [],
      history: [],
      timeToActionLog: [],
      recentSearches: [],
      tabs: [],
      currentTabId: null,
      currentSessionId: null,
      aiShoppingAssistantSuggestions: [],
      hasAiSuggestionsLoaded: false,
      aiSuggestionsCachedAt: null,
    });
  });

  describe('isTrackingEnabled', () => {
    it('should return false when consent is pending', () => {
      useShoppingStore.setState({trackingConsent: 'pending'});
      expect(useShoppingStore.getState().isTrackingEnabled()).toBe(false);
    });

    it('should return false when consent is declined', () => {
      useShoppingStore.setState({trackingConsent: 'declined'});
      expect(useShoppingStore.getState().isTrackingEnabled()).toBe(false);
    });

    it('should return true when consent is accepted', () => {
      useShoppingStore.setState({trackingConsent: 'accepted'});
      expect(useShoppingStore.getState().isTrackingEnabled()).toBe(true);
    });
  });

  describe('setTrackingConsent', () => {
    it('should set consent to accepted', () => {
      useShoppingStore.getState().setTrackingConsent('accepted');
      expect(useShoppingStore.getState().trackingConsent).toBe('accepted');
    });

    it('should set consent to declined', () => {
      useShoppingStore.getState().setTrackingConsent('declined');
      expect(useShoppingStore.getState().trackingConsent).toBe('declined');
    });
  });

  describe('recordProductInteraction - consent gating', () => {
    it('should NOT record interaction when consent is pending', () => {
      useShoppingStore.setState({trackingConsent: 'pending'});
      useShoppingStore.getState().recordProductInteraction('https://example.com/product', 'view');
      expect(useShoppingStore.getState().productInteractions).toHaveLength(0);
    });

    it('should NOT record interaction when consent is declined', () => {
      useShoppingStore.setState({trackingConsent: 'declined'});
      useShoppingStore.getState().recordProductInteraction('https://example.com/product', 'view');
      expect(useShoppingStore.getState().productInteractions).toHaveLength(0);
    });

    it('should record interaction when consent is accepted', () => {
      useShoppingStore.setState({trackingConsent: 'accepted'});
      useShoppingStore.getState().recordProductInteraction('https://example.com/product', 'view');
      expect(useShoppingStore.getState().productInteractions).toHaveLength(1);
      expect(useShoppingStore.getState().productInteractions[0].productUrl).toBe('https://example.com/product');
      expect(useShoppingStore.getState().productInteractions[0].type).toBe('view');
    });

    it('should include clientEventId (UUID) in recorded interaction', () => {
      useShoppingStore.setState({trackingConsent: 'accepted'});
      useShoppingStore.getState().recordProductInteraction('https://example.com/product', 'bookmark');
      expect(useShoppingStore.getState().productInteractions[0].clientEventId).toBe('test-uuid-1234-5678-9abc-def012345678');
    });
  });

  describe('recordTimeToAction - consent gating', () => {
    it('should NOT record time-to-action when consent is pending', () => {
      useShoppingStore.setState({trackingConsent: 'pending'});
      useShoppingStore.getState().recordTimeToAction('https://example.com/product', 'bookmark', 5.5);
      expect(useShoppingStore.getState().timeToActionLog).toHaveLength(0);
    });

    it('should NOT record time-to-action when consent is declined', () => {
      useShoppingStore.setState({trackingConsent: 'declined'});
      useShoppingStore.getState().recordTimeToAction('https://example.com/product', 'cart', 10.2);
      expect(useShoppingStore.getState().timeToActionLog).toHaveLength(0);
    });

    it('should record time-to-action when consent is accepted', () => {
      useShoppingStore.setState({trackingConsent: 'accepted'});
      useShoppingStore.getState().recordTimeToAction('https://example.com/product', 'bookmark', 5.5);
      expect(useShoppingStore.getState().timeToActionLog).toHaveLength(1);
      expect(useShoppingStore.getState().timeToActionLog[0].productUrl).toBe('https://example.com/product');
      expect(useShoppingStore.getState().timeToActionLog[0].actionType).toBe('bookmark');
      expect(useShoppingStore.getState().timeToActionLog[0].seconds).toBe(5.5);
    });

    it('should include clientEventId (UUID) in recorded time-to-action', () => {
      useShoppingStore.setState({trackingConsent: 'accepted'});
      useShoppingStore.getState().recordTimeToAction('https://example.com/product', 'cart', 3.0);
      expect(useShoppingStore.getState().timeToActionLog[0].clientEventId).toBe('test-uuid-1234-5678-9abc-def012345678');
    });
  });

  describe('recordCartEvent - consent gating', () => {
    it('should NOT record cart event when consent is pending', () => {
      useShoppingStore.setState({trackingConsent: 'pending'});
      useShoppingStore.getState().recordCartEvent({
        cartUrl: 'https://example.com/cart',
        eventType: 'add',
        timestamp: Date.now(),
      });
      expect(useShoppingStore.getState().cartHistory).toHaveLength(0);
    });

    it('should NOT record cart event when consent is declined', () => {
      useShoppingStore.setState({trackingConsent: 'declined'});
      useShoppingStore.getState().recordCartEvent({
        cartUrl: 'https://example.com/cart',
        eventType: 'add',
        timestamp: Date.now(),
      });
      expect(useShoppingStore.getState().cartHistory).toHaveLength(0);
    });

    it('should record cart event when consent is accepted', () => {
      useShoppingStore.setState({trackingConsent: 'accepted'});
      useShoppingStore.getState().recordCartEvent({
        cartUrl: 'https://example.com/cart',
        eventType: 'add',
        timestamp: Date.now(),
      });
      expect(useShoppingStore.getState().cartHistory).toHaveLength(1);
    });
  });
});

describe('ShoppingStore - Clear Analytics', () => {
  beforeEach(() => {
    // Set up store with some analytics data
    useShoppingStore.setState({
      trackingConsent: 'accepted',
      productInteractions: [
        {
          id: 'interaction_1',
          clientEventId: 'uuid-1',
          productUrl: 'https://example.com/product1',
          type: 'view',
          timestamp: Date.now(),
        },
        {
          id: 'interaction_2',
          clientEventId: 'uuid-2',
          productUrl: 'https://example.com/product2',
          type: 'bookmark',
          timestamp: Date.now(),
        },
      ],
      cartHistory: [
        {
          cartUrl: 'https://example.com/cart',
          events: [{cartUrl: 'https://example.com/cart', eventType: 'add', timestamp: Date.now()}],
          abandoned: false,
        },
      ],
      history: [
        {
          url: 'https://example.com/product1',
          title: 'Product 1',
          visitedAt: Date.now(),
          visitCount: 1,
        },
      ],
      timeToActionLog: [
        {
          clientEventId: 'uuid-tta-1',
          productUrl: 'https://example.com/product1',
          actionType: 'bookmark',
          seconds: 5.5,
          timestamp: Date.now(),
        },
      ],
      recentSearches: ['shoes', 'dresses'],
      tabs: [{id: 'tab1', url: 'https://example.com', title: 'Example'}],
      currentTabId: 'tab1',
      currentSessionId: 'session_123',
      aiShoppingAssistantSuggestions: [{id: 'suggestion1', text: 'Try this'}],
      hasAiSuggestionsLoaded: true,
      aiSuggestionsCachedAt: Date.now(),
      // Non-analytics data that should be preserved
      bookmarks: [{id: 'bookmark1', url: 'https://saved.com', title: 'Saved', source: 'test', addedAt: Date.now()}],
      collections: [{id: 'collection1', name: 'My Collection', items: [], createdAt: Date.now(), updatedAt: Date.now()}],
    });
  });

  describe('deleteAllAnalyticsData', () => {
    it('should clear all analytics data', () => {
      useShoppingStore.getState().deleteAllAnalyticsData();

      const state = useShoppingStore.getState();
      expect(state.history).toHaveLength(0);
      expect(state.productInteractions).toHaveLength(0);
      expect(state.cartHistory).toHaveLength(0);
      expect(state.recentSearches).toHaveLength(0);
      expect(state.timeToActionLog).toHaveLength(0);
      expect(state.tabs).toHaveLength(0);
      expect(state.currentTabId).toBeNull();
      expect(state.currentSessionId).toBeNull();
      expect(state.aiShoppingAssistantSuggestions).toHaveLength(0);
      expect(state.hasAiSuggestionsLoaded).toBe(false);
      expect(state.aiSuggestionsCachedAt).toBeNull();
    });

    it('should preserve bookmarks (user-created content)', () => {
      useShoppingStore.getState().deleteAllAnalyticsData();

      const state = useShoppingStore.getState();
      expect(state.bookmarks).toHaveLength(1);
      expect(state.bookmarks[0].id).toBe('bookmark1');
    });

    it('should preserve collections (user-created content)', () => {
      useShoppingStore.getState().deleteAllAnalyticsData();

      const state = useShoppingStore.getState();
      expect(state.collections).toHaveLength(1);
      expect(state.collections[0].id).toBe('collection1');
    });

    it('should preserve tracking consent setting', () => {
      useShoppingStore.getState().deleteAllAnalyticsData();

      const state = useShoppingStore.getState();
      expect(state.trackingConsent).toBe('accepted');
    });
  });
});

describe('ShoppingStore - Derived Metrics with Consent', () => {
  beforeEach(() => {
    useShoppingStore.setState({
      trackingConsent: 'accepted',
      timeToActionLog: [
        {clientEventId: 'uuid-1', productUrl: 'url1', actionType: 'bookmark', seconds: 5, timestamp: Date.now()},
        {clientEventId: 'uuid-2', productUrl: 'url2', actionType: 'bookmark', seconds: 10, timestamp: Date.now()},
        {clientEventId: 'uuid-3', productUrl: 'url3', actionType: 'cart', seconds: 15, timestamp: Date.now()},
      ],
      history: [],
      bookmarks: [],
    });
  });

  describe('getAvgTimeToAction', () => {
    it('should return 0 when consent is declined', () => {
      useShoppingStore.setState({trackingConsent: 'declined'});
      expect(useShoppingStore.getState().getAvgTimeToAction()).toBe(0);
    });

    it('should calculate average for all actions when consented', () => {
      const avg = useShoppingStore.getState().getAvgTimeToAction();
      expect(avg).toBe(10); // (5 + 10 + 15) / 3 = 10
    });

    it('should calculate average for specific action type when consented', () => {
      const avgBookmark = useShoppingStore.getState().getAvgTimeToAction('bookmark');
      expect(avgBookmark).toBe(8); // (5 + 10) / 2 = 7.5, rounded to 8

      const avgCart = useShoppingStore.getState().getAvgTimeToAction('cart');
      expect(avgCart).toBe(15); // 15 / 1 = 15
    });
  });

  describe('getBrandAffinityScores', () => {
    it('should return empty array when consent is declined', () => {
      useShoppingStore.setState({trackingConsent: 'declined'});
      expect(useShoppingStore.getState().getBrandAffinityScores()).toEqual([]);
    });
  });

  describe('getCrossSessionProducts', () => {
    it('should return empty array when consent is declined', () => {
      useShoppingStore.setState({trackingConsent: 'declined'});
      expect(useShoppingStore.getState().getCrossSessionProducts()).toEqual([]);
    });
  });

  describe('getSizeSwitchFrequency', () => {
    it('should return 0 when consent is declined', () => {
      useShoppingStore.setState({trackingConsent: 'declined'});
      expect(useShoppingStore.getState().getSizeSwitchFrequency('some-url')).toBe(0);
    });
  });
});
