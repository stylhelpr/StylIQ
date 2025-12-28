import {useShoppingStore} from './shoppingStore';
import {analyticsQueue} from '../apps/frontend/src/services/analyticsQueue';
import {
  sanitizeUrlForAnalytics,
  sanitizeTitle,
} from '../apps/frontend/src/utils/sanitize';

/**
 * Quick helpers for recording the 10 gold data points
 */

export const shoppingAnalytics = {
  // Kill switch - check if tracking is enabled before any data capture
  isTrackingEnabled: (): boolean => {
    return useShoppingStore.getState().trackingConsent === 'accepted';
  },

  // GOLD #1: Start tracking dwell time
  startPageTimer: () => {
    if (!shoppingAnalytics.isTrackingEnabled()) return 0;
    return Date.now();
  },

  endPageTimer: (startTime: number) => {
    return Math.round((Date.now() - startTime) / 1000); // Return seconds
  },

  // GOLD #3: Auto-generate session ID
  newSession: () => {
    if (!shoppingAnalytics.isTrackingEnabled()) return;
    useShoppingStore.getState().startSession();
  },

  endSession: () => {
    if (!shoppingAnalytics.isTrackingEnabled()) return;
    useShoppingStore.getState().endSession();
  },

  // GOLD #3b: Detect if it's a cart page
  isCartUrl: (url: string): boolean => {
    return /(\bcart\b|\bbag\b|\bcheckout\b)/i.test(url);
  },

  // GOLD #1+#3+#9: Record page visit with all metadata
  recordPageVisit: (
    url: string,
    title: string,
    source: string,
    dwellTime?: number,
    scrollDepth?: number,
  ) => {
    if (!shoppingAnalytics.isTrackingEnabled()) return;
    const store = useShoppingStore.getState();
    store.addToHistory(url, title, source);
    if (dwellTime !== undefined || scrollDepth !== undefined) {
      store.updateHistoryMetadata(url, {
        dwellTime,
        scrollDepth,
        isCartPage: shoppingAnalytics.isCartUrl(url),
      });
    }
  },

  // GOLD #2: Extract category from title/URL
  extractCategory: (title: string, url: string): string | undefined => {
    const categories = [
      'shoes',
      'boots',
      'sneakers',
      'heels',
      'flats',
      'tops',
      'shirts',
      'blouses',
      'dresses',
      'pants',
      'jeans',
      'skirts',
      'jackets',
      'coats',
      'hoodies',
      'sweaters',
      'accessories',
      'bags',
      'belts',
      'scarves',
    ];
    const combined = `${title} ${url}`.toLowerCase();
    return categories.find(cat => combined.includes(cat));
  },

  // Extract all available page content for better analytics
  extractPageContent: (
    title: string,
    url: string,
    bodyText?: string,
  ): string => {
    // Combine title, URL, and any body text for comprehensive extraction
    return `${title} ${url} ${bodyText || ''}`.toLowerCase();
  },

  // Extract brand from URL/title
  extractBrand: (title: string, url: string): string | undefined => {
    const brands = [
      'nike',
      'adidas',
      'puma',
      'reebok',
      'converse',
      'vans',
      'timberland',
      'gucci',
      'prada',
      'chanel',
      'versace',
      'dior',
      'fendi',
      'burberry',
      'zara',
      'h&m',
      'uniqlo',
      'gap',
      'forever21',
      'asos',
      'shein',
      'amazon',
      'walmart',
      'target',
      'nordstrom',
      "macy's",
      'levis',
      'tommy hilfiger',
      'calvin klein',
      'ralph lauren',
      'polo',
      'lululemon',
      'athleta',
      'sweaty betty',
      'missguided',
      'boohoo',
      'pretty little thing',
      'fashion nova',
      'revolve',
      'ssense',
      'farfetch',
    ];
    const combined = `${title} ${url}`.toLowerCase();
    return brands.find(brand => combined.includes(brand));
  },

  // Detect price from text (looks for currency patterns)
  extractPrice: (pageText: string): number | undefined => {
    if (!pageText) {
      // console.log('[PRICE] No pageText provided');
      return undefined;
    }

    // console.log('[PRICE] Extracting from text length:', pageText.length);
    // console.log('[PRICE] First 300 chars:', pageText.substring(0, 300));

    // Strategy: Find ALL prices with currency symbols, then pick the best one
    // Product pages typically show the main price prominently early in the text

    // Collect all currency-prefixed prices (both decimal and whole)
    const priceMatches: {price: number; index: number; hasDecimal: boolean}[] =
      [];

    // Pattern A: Currency + decimal price: $99.99, $3,200.00, £50.00
    const decimalRegex = /[$£€¥]\s*([\d,]+)[.,](\d{2})\b/g;
    let match;
    while ((match = decimalRegex.exec(pageText)) !== null) {
      const wholePart = match[1].replace(/,/g, '');
      const decimalPart = match[2];
      const price = parseFloat(`${wholePart}.${decimalPart}`);
      if (!isNaN(price) && price >= 1 && price <= 500000) {
        priceMatches.push({price, index: match.index, hasDecimal: true});
        // console.log(
        //   '[PRICE] Found decimal price:',
        //   price,
        //   'at index:',
        //   match.index,
        // );
      }
    }

    // Pattern B: Currency + whole number: $99, $3200, £50
    const wholeRegex = /[$£€¥]\s*([\d,]+)\b(?![.,]\d)/g;
    while ((match = wholeRegex.exec(pageText)) !== null) {
      const numStr = match[1].replace(/,/g, '');
      const price = parseFloat(numStr);
      if (!isNaN(price) && price >= 5 && price <= 500000) {
        // Avoid duplicates (same position as decimal match)
        const isDupe = priceMatches.some(
          p => Math.abs(p.index - match!.index) < 5,
        );
        if (!isDupe) {
          priceMatches.push({price, index: match.index, hasDecimal: false});
          // console.log(
          //   '[PRICE] Found whole price:',
          //   price,
          //   'at index:',
          //   match.index,
          // );
        }
      }
    }

    // If we found prices with currency symbols, pick the best one
    if (priceMatches.length > 0) {
      // Sort by: 1) has decimal (more precise), 2) appears earlier in text
      priceMatches.sort((a, b) => {
        // Prefer prices with decimals
        if (a.hasDecimal !== b.hasDecimal) {
          return a.hasDecimal ? -1 : 1;
        }
        // Then prefer earlier in text (likely the main product price)
        return a.index - b.index;
      });

      // console.log('[PRICE] ✅ Best match:', priceMatches[0].price);
      return priceMatches[0].price;
    }

    // Fallback: Look for price keywords
    match = pageText.match(
      /(?:price|cost|now|sale)\s*[:=]?\s*[$£€¥]?\s*([\d,]+)(?:[.,](\d{2}))?\b/i,
    );
    if (match && match[1]) {
      const wholePart = match[1].replace(/,/g, '');
      const decimalPart = match[2] || '00';
      const price = parseFloat(`${wholePart}.${decimalPart}`);
      // console.log('[PRICE] Fallback keyword match:', price);
      if (!isNaN(price) && price >= 1 && price <= 500000) {
        // console.log('[PRICE] ✅ Found via keyword:', price);
        return price;
      }
    }

    // console.log('[PRICE] ❌ No price found');
    return undefined;
  },

  // GOLD #4: Track price changes
  updatePriceHistory: (bookmarkId: string, newPrice: number) => {
    if (!shoppingAnalytics.isTrackingEnabled()) return;
    const store = useShoppingStore.getState();
    const bookmark = store.bookmarks.find(b => b.id === bookmarkId);
    if (bookmark) {
      const history = bookmark.priceHistory || [];
      store.updateBookmarkMetadata(bookmarkId, {
        price: newPrice,
        priceHistory: [{price: newPrice, date: Date.now()}, ...history].slice(
          0,
          20,
        ),
      });
    }
  },

  // GOLD #5: Record emotion when saving
  saveWithEmotion: (bookmarkId: string, emotion: string) => {
    if (!shoppingAnalytics.isTrackingEnabled()) return;
    useShoppingStore.getState().updateBookmarkMetadata(bookmarkId, {
      emotionAtSave: emotion,
    });
  },

  // GOLD #6: Track when they revisit
  incrementViewCount: (bookmarkId: string) => {
    if (!shoppingAnalytics.isTrackingEnabled()) return;
    const store = useShoppingStore.getState();
    const bookmark = store.bookmarks.find(b => b.id === bookmarkId);
    if (bookmark) {
      store.updateBookmarkMetadata(bookmarkId, {
        viewCount: (bookmark.viewCount || 0) + 1,
        lastViewed: Date.now(),
      });
    }
  },

  // GOLD #7: Record sizes they viewed
  recordSizeView: (bookmarkId: string, size: string) => {
    if (!shoppingAnalytics.isTrackingEnabled()) return;
    const store = useShoppingStore.getState();
    const bookmark = store.bookmarks.find(b => b.id === bookmarkId);
    if (bookmark) {
      const sizes = new Set(bookmark.sizesViewed || []);
      sizes.add(size);
      store.updateBookmarkMetadata(bookmarkId, {
        sizesViewed: Array.from(sizes),
      });
    }
  },

  // GOLD #8: Link body measurements to bookmark
  saveWithBodyContext: (bookmarkId: string, bodyMeasurements: any) => {
    if (!shoppingAnalytics.isTrackingEnabled()) return;
    useShoppingStore
      .getState()
      .recordProductInteraction(
        useShoppingStore.getState().bookmarks.find(b => b.id === bookmarkId)
          ?.url || '',
        'bookmark',
        bodyMeasurements,
      );
  },

  // GOLD #10: Record colors they clicked
  recordColorView: (bookmarkId: string, color: string) => {
    if (!shoppingAnalytics.isTrackingEnabled()) return;
    const store = useShoppingStore.getState();
    const bookmark = store.bookmarks.find(b => b.id === bookmarkId);
    if (bookmark) {
      const colors = new Set(bookmark.colorsViewed || []);
      colors.add(color);
      store.updateBookmarkMetadata(bookmarkId, {
        colorsViewed: Array.from(colors),
      });
    }
  },

  // Get insights from all the gold data
  getGoldInsights: () => {
    const store = useShoppingStore.getState();
    const cartStats = store.getCartAbandonmentStats();
    return {
      totalSessions: new Set(store.productInteractions.map(i => i.sessionId))
        .size,
      avgDwellTime: Math.round(
        store.history.reduce((sum, h) => sum + (h.dwellTime || 0), 0) /
          store.history.filter(h => h.dwellTime).length || 0,
      ),
      topCategories: Array.from(
        store.bookmarks
          .filter(b => b.category)
          .reduce((map, b) => {
            const cat = b.category!;
            map.set(cat, (map.get(cat) || 0) + 1);
            return map;
          }, new Map<string, number>())
          .entries(),
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      bookmarksWithPriceHistory: store.bookmarks.filter(
        b => b.priceHistory?.length || 0 > 0,
      ).length,
      bookmarksWithEmotion: store.bookmarks.filter(b => b.emotionAtSave).length,
      mostRevisitedItem:
        store.bookmarks.length > 0
          ? store.bookmarks.reduce((max, b) =>
              (b.viewCount || 0) > (max.viewCount || 0) ? b : max,
            )
          : null,
      ...cartStats,
    };
  },

  // Log all gold data to console for review
  logAllGoldData: () => {
    // const store = useShoppingStore.getState();
    // const insights = shoppingAnalytics.getGoldInsights();

    // console.log('\n=== 🏆 GOLD DATA SUMMARY ===\n');
    // console.log('Bookmarks:', store.bookmarks.length);
    // console.log('Interactions:', store.productInteractions.length);
  },

  // Generate full gold data as a string for display
  getGoldDataString: (): string => {
    const store = useShoppingStore.getState();
    const insights = shoppingAnalytics.getGoldInsights();
    let output = '';

    output += '=== GOLD DATA SUMMARY ===\n\n';

    output += 'SESSIONS & STATS\n';
    output += `  Total Sessions: ${insights.totalSessions}\n`;
    output += `  Current Session: ${store.currentSessionId || 'none'}\n`;
    output += `  Avg Dwell Time: ${insights.avgDwellTime}s\n\n`;

    output += 'BOOKMARKS\n';
    output += `  Total: ${store.bookmarks.length}\n`;
    output += `  With Category: ${
      store.bookmarks.filter(b => b.category).length
    }\n`;
    output += `  With Emotion: ${insights.bookmarksWithEmotion}\n`;
    output += `  With Price History: ${insights.bookmarksWithPriceHistory}\n\n`;

    output += 'TOP CATEGORIES\n';
    if (insights.topCategories.length > 0) {
      insights.topCategories.forEach(([cat, count]) => {
        output += `  ${cat}: ${count}\n`;
      });
    } else {
      output += '  (none)\n';
    }
    output += '\n';

    output += 'INTERACTIONS\n';
    output += `  Total: ${store.productInteractions.length}\n`;
    output += `  Views: ${
      store.productInteractions.filter(i => i.type === 'view').length
    }\n`;
    output += `  Bookmarks: ${
      store.productInteractions.filter(i => i.type === 'bookmark').length
    }\n`;
    output += `  Cart Adds: ${
      store.productInteractions.filter(i => i.type === 'add_to_cart').length
    }\n\n`;

    output += 'ALL BOOKMARKS (DETAILED)\n';
    store.bookmarks.forEach((bookmark, idx) => {
      output += `\n  ${idx + 1}. ${bookmark.title}\n`;
      output += `     URL: ${bookmark.url}\n`;
      output += `     Source: ${bookmark.source}\n`;
      output += `     Category: ${bookmark.category || 'N/A'}\n`;
      output += `     Views: ${bookmark.viewCount || 1}\n`;
      if (bookmark.emotionAtSave)
        output += `     Emotion: ${bookmark.emotionAtSave}\n`;
      if (bookmark.sizesViewed?.length)
        output += `     Sizes: ${bookmark.sizesViewed.join(', ')}\n`;
      if (bookmark.colorsViewed?.length)
        output += `     Colors: ${bookmark.colorsViewed.join(', ')}\n`;
      if (bookmark.priceHistory?.length)
        output += `     Price: $${bookmark.priceHistory[0].price}\n`;
    });
    output += '\n';

    output += 'ALL INTERACTIONS (DETAILED)\n';
    store.productInteractions.forEach((interaction, idx) => {
      const typeEmoji =
        interaction.type === 'view'
          ? 'VIEW'
          : interaction.type === 'bookmark'
            ? 'BOOKMARK'
            : 'CART';
      output += `\n  ${idx + 1}. ${typeEmoji}\n`;
      output += `     URL: ${interaction.productUrl}\n`;
      output += `     Time: ${new Date(
        interaction.timestamp,
      ).toLocaleString()}\n`;
      output += `     Session: ${interaction.sessionId || 'none'}\n`;
    });
    output += '\n';

    output += 'RAW JSON\n';
    output += 'Bookmarks: ' + JSON.stringify(store.bookmarks, null, 2) + '\n\n';
    output +=
      'Interactions: ' +
      JSON.stringify(store.productInteractions, null, 2) +
      '\n\n';
    output +=
      'History (last 10): ' +
      JSON.stringify(store.history.slice(0, 10), null, 2);

    return output;
  },

  // ============================================================
  // CORRECTED: Queue-based analytics with consent gating
  // ============================================================
  // Import at top of file:
  // import { analyticsQueue } from '../apps/frontend/src/services/analyticsQueue';
  // import { sanitizeUrlForAnalytics, sanitizeTitle } from '../apps/frontend/src/utils';

  /**
   * Record page visit to analytics queue (with consent gate).
   * ✅ Consent checked
   * ✅ URL sanitized (no query params, no hash)
   * ✅ Title sanitized (no HTML, max 200 chars)
   * ✅ Idempotency: client_event_id generated by queue
   */
  recordPageVisitQueue: (
    url: string,
    title: string,
    dwellTime?: number,
    scrollDepth?: number,
  ) => {
    // ✅ CONSENT GATE
    if (!shoppingAnalytics.isTrackingEnabled()) {
      // console.log('[Analytics] Page visit blocked: tracking not accepted');
      return;
    }

    try {
      // ✅ URL SANITIZATION
      const canonicalUrl = sanitizeUrlForAnalytics(url);
      const domain = new URL(canonicalUrl).hostname || 'unknown';

      // Queue event (client_event_id generated internally)
      analyticsQueue.queueEvent({
        event_type: 'page_view',
        event_ts: new Date().toISOString(),
        canonical_url: canonicalUrl || '',
        domain,
        title_sanitized: sanitizeTitle(title),
        session_id: useShoppingStore.getState().currentSessionId,
        payload: {
          dwell_time_sec: dwellTime,
          scroll_depth_pct: scrollDepth,
          brand: shoppingAnalytics.extractBrand(title, url),
          category: shoppingAnalytics.extractCategory(title, url),
        },
      });

      // console.log('[Analytics] Page visit queued:', canonicalUrl);
    } catch (err) {
      // console.error('[Analytics] Failed to queue page visit:', err);
    }
  },

  /**
   * Record bookmark event to analytics queue (with consent gate).
   * ✅ Consent checked
   * ✅ URL sanitized
   * ✅ Title sanitized
   */
  recordBookmarkQueue: (url: string, title: string) => {
    // ✅ CONSENT GATE
    if (!shoppingAnalytics.isTrackingEnabled()) {
      return;
    }

    try {
      const canonicalUrl = sanitizeUrlForAnalytics(url);
      const domain = new URL(canonicalUrl).hostname || 'unknown';

      analyticsQueue.queueEvent({
        event_type: 'bookmark',
        event_ts: new Date().toISOString(),
        canonical_url: canonicalUrl || '',
        domain,
        title_sanitized: sanitizeTitle(title),
        session_id: useShoppingStore.getState().currentSessionId,
        payload: {
          category: shoppingAnalytics.extractCategory(title, url),
          brand: shoppingAnalytics.extractBrand(title, url),
        },
      });

      // console.log('[Analytics] Bookmark queued:', canonicalUrl);
    } catch (err) {
      // console.error('[Analytics] Failed to queue bookmark:', err);
    }
  },

  /**
   * Record size click event to analytics queue.
   */
  recordSizeClickQueue: (url: string, size: string) => {
    if (!shoppingAnalytics.isTrackingEnabled()) {
      return;
    }

    try {
      const canonicalUrl = sanitizeUrlForAnalytics(url);
      const domain = new URL(canonicalUrl).hostname || 'unknown';

      analyticsQueue.queueEvent({
        event_type: 'size_click',
        event_ts: new Date().toISOString(),
        canonical_url: canonicalUrl || '',
        domain,
        session_id: useShoppingStore.getState().currentSessionId,
        payload: {
          size,
          category: shoppingAnalytics.extractCategory('', url),
        },
      });
    } catch (err) {
      // console.error('[Analytics] Failed to queue size click:', err);
    }
  },

  /**
   * Record color click event to analytics queue.
   */
  recordColorClickQueue: (url: string, color: string) => {
    if (!shoppingAnalytics.isTrackingEnabled()) {
      return;
    }

    try {
      const canonicalUrl = sanitizeUrlForAnalytics(url);
      const domain = new URL(canonicalUrl).hostname || 'unknown';

      analyticsQueue.queueEvent({
        event_type: 'color_click',
        event_ts: new Date().toISOString(),
        canonical_url: canonicalUrl || '',
        domain,
        session_id: useShoppingStore.getState().currentSessionId,
        payload: {
          color,
          category: shoppingAnalytics.extractCategory('', url),
        },
      });
    } catch (err) {
      // console.error('[Analytics] Failed to queue color click:', err);
    }
  },

  /**
   * Record cart add event to analytics queue.
   */
  recordCartAddQueue: (url: string, title: string) => {
    if (!shoppingAnalytics.isTrackingEnabled()) {
      return;
    }

    try {
      const canonicalUrl = sanitizeUrlForAnalytics(url);
      const domain = new URL(canonicalUrl).hostname || 'unknown';

      analyticsQueue.queueEvent({
        event_type: 'cart_add',
        event_ts: new Date().toISOString(),
        canonical_url: canonicalUrl || '',
        domain,
        title_sanitized: sanitizeTitle(title),
        session_id: useShoppingStore.getState().currentSessionId,
        payload: {
          category: shoppingAnalytics.extractCategory(title, url),
          brand: shoppingAnalytics.extractBrand(title, url),
        },
      });
    } catch (err) {
      // console.error('[Analytics] Failed to queue cart add:', err);
    }
  },

  /**
   * Clear queue on GDPR delete (called when user requests data deletion).
   */
  clearQueueOnGDPRDelete: () => {
    try {
      analyticsQueue.clear();
      // console.log('[Analytics] Queue cleared (GDPR delete)');
    } catch (err) {
      // console.error('[Analytics] Failed to clear queue:', err);
    }
  },

  /**
   * Clear queue on consent decline (called when user opts out).
   */
  clearQueueOnConsentDecline: () => {
    try {
      analyticsQueue.clear();
      // console.log('[Analytics] Queue cleared (consent declined)');
    } catch (err) {
      // console.error('[Analytics] Failed to clear queue:', err);
    }
  },
};

///////////////////

// import {useShoppingStore} from './shoppingStore';

// /**
//  * Quick helpers for recording the 10 gold data points
//  */

// export const shoppingAnalytics = {
//   // GOLD #1: Start tracking dwell time
//   startPageTimer: () => {
//     return Date.now();
//   },

//   endPageTimer: (startTime: number) => {
//     return Math.round((Date.now() - startTime) / 1000); // Return seconds
//   },

//   // GOLD #3: Auto-generate session ID
//   newSession: () => {
//     useShoppingStore.getState().startSession();
//   },

//   endSession: () => {
//     useShoppingStore.getState().endSession();
//   },

//   // GOLD #3b: Detect if it's a cart page
//   isCartUrl: (url: string): boolean => {
//     return /(\bcart\b|\bbag\b|\bcheckout\b)/i.test(url);
//   },

//   // GOLD #1+#3+#9: Record page visit with all metadata
//   recordPageVisit: (
//     url: string,
//     title: string,
//     source: string,
//     dwellTime?: number,
//     scrollDepth?: number,
//   ) => {
//     const store = useShoppingStore.getState();
//     store.addToHistory(url, title, source);
//     if (dwellTime !== undefined || scrollDepth !== undefined) {
//       store.updateHistoryMetadata(url, {
//         dwellTime,
//         scrollDepth,
//         isCartPage: shoppingAnalytics.isCartUrl(url),
//       });
//     }
//   },

//   // GOLD #2: Extract category from title/URL
//   extractCategory: (title: string, url: string): string | undefined => {
//     const categories = ['shoes', 'boots', 'sneakers', 'heels', 'flats', 'tops', 'shirts', 'blouses', 'dresses', 'pants', 'jeans', 'skirts', 'jackets', 'coats', 'hoodies', 'sweaters', 'accessories', 'bags', 'belts', 'scarves'];
//     const combined = `${title} ${url}`.toLowerCase();
//     return categories.find(cat => combined.includes(cat));
//   },

//   // Extract all available page content for better analytics
//   extractPageContent: (title: string, url: string, bodyText?: string): string => {
//     // Combine title, URL, and any body text for comprehensive extraction
//     return `${title} ${url} ${bodyText || ''}`.toLowerCase();
//   },

//   // Extract brand from URL/title
//   extractBrand: (title: string, url: string): string | undefined => {
//     const brands = [
//       'nike', 'adidas', 'puma', 'reebok', 'converse', 'vans', 'timberland',
//       'gucci', 'prada', 'chanel', 'versace', 'dior', 'fendi', 'burberry',
//       'zara', 'h&m', 'uniqlo', 'gap', 'forever21', 'asos', 'shein',
//       'amazon', 'walmart', 'target', 'nordstrom', 'macy\'s',
//       'levis', 'tommy hilfiger', 'calvin klein', 'ralph lauren', 'polo',
//       'lululemon', 'athleta', 'sweaty betty', 'missguided', 'boohoo',
//       'pretty little thing', 'fashion nova', 'revolve', 'ssense', 'farfetch'
//     ];
//     const combined = `${title} ${url}`.toLowerCase();
//     return brands.find(brand => combined.includes(brand));
//   },

//   // Detect price from text (looks for currency patterns)
//   extractPrice: (pageText: string): number | undefined => {
//     if (!pageText) {
//       console.log('[PRICE] No pageText provided');
//       return undefined;
//     }

//     console.log('[PRICE] Extracting from text length:', pageText.length);
//     console.log('[PRICE] First 300 chars:', pageText.substring(0, 300));

//     // Strategy: Find ALL prices with currency symbols, then pick the best one
//     // Product pages typically show the main price prominently early in the text

//     // Collect all currency-prefixed prices (both decimal and whole)
//     const priceMatches: {price: number; index: number; hasDecimal: boolean}[] = [];

//     // Pattern A: Currency + decimal price: $99.99, $3,200.00, £50.00
//     const decimalRegex = /[$£€¥]\s*([\d,]+)[.,](\d{2})\b/g;
//     let match;
//     while ((match = decimalRegex.exec(pageText)) !== null) {
//       const wholePart = match[1].replace(/,/g, '');
//       const decimalPart = match[2];
//       const price = parseFloat(`${wholePart}.${decimalPart}`);
//       if (!isNaN(price) && price >= 1 && price <= 50000) {
//         priceMatches.push({price, index: match.index, hasDecimal: true});
//         console.log('[PRICE] Found decimal price:', price, 'at index:', match.index);
//       }
//     }

//     // Pattern B: Currency + whole number: $99, $3200, £50
//     const wholeRegex = /[$£€¥]\s*([\d,]+)\b(?![.,]\d)/g;
//     while ((match = wholeRegex.exec(pageText)) !== null) {
//       const numStr = match[1].replace(/,/g, '');
//       const price = parseFloat(numStr);
//       if (!isNaN(price) && price >= 5 && price <= 50000) {
//         // Avoid duplicates (same position as decimal match)
//         const isDupe = priceMatches.some(p => Math.abs(p.index - match!.index) < 5);
//         if (!isDupe) {
//           priceMatches.push({price, index: match.index, hasDecimal: false});
//           console.log('[PRICE] Found whole price:', price, 'at index:', match.index);
//         }
//       }
//     }

//     // If we found prices with currency symbols, pick the best one
//     if (priceMatches.length > 0) {
//       // Sort by: 1) has decimal (more precise), 2) appears earlier in text
//       priceMatches.sort((a, b) => {
//         // Prefer prices with decimals
//         if (a.hasDecimal !== b.hasDecimal) {
//           return a.hasDecimal ? -1 : 1;
//         }
//         // Then prefer earlier in text (likely the main product price)
//         return a.index - b.index;
//       });

//       console.log('[PRICE] ✅ Best match:', priceMatches[0].price);
//       return priceMatches[0].price;
//     }

//     // Fallback: Look for price keywords
//     match = pageText.match(/(?:price|cost|now|sale)\s*[:=]?\s*[$£€¥]?\s*([\d,]+)(?:[.,](\d{2}))?\b/i);
//     if (match && match[1]) {
//       const wholePart = match[1].replace(/,/g, '');
//       const decimalPart = match[2] || '00';
//       const price = parseFloat(`${wholePart}.${decimalPart}`);
//       console.log('[PRICE] Fallback keyword match:', price);
//       if (!isNaN(price) && price >= 1 && price <= 50000) {
//         console.log('[PRICE] ✅ Found via keyword:', price);
//         return price;
//       }
//     }

//     console.log('[PRICE] ❌ No price found');
//     return undefined;
//   },

//   // GOLD #4: Track price changes
//   updatePriceHistory: (bookmarkId: string, newPrice: number) => {
//     const store = useShoppingStore.getState();
//     const bookmark = store.bookmarks.find(b => b.id === bookmarkId);
//     if (bookmark) {
//       const history = bookmark.priceHistory || [];
//       store.updateBookmarkMetadata(bookmarkId, {
//         price: newPrice,
//         priceHistory: [{price: newPrice, date: Date.now()}, ...history].slice(0, 20),
//       });
//     }
//   },

//   // GOLD #5: Record emotion when saving
//   saveWithEmotion: (bookmarkId: string, emotion: string) => {
//     useShoppingStore.getState().updateBookmarkMetadata(bookmarkId, {
//       emotionAtSave: emotion,
//     });
//   },

//   // GOLD #6: Track when they revisit
//   incrementViewCount: (bookmarkId: string) => {
//     const store = useShoppingStore.getState();
//     const bookmark = store.bookmarks.find(b => b.id === bookmarkId);
//     if (bookmark) {
//       store.updateBookmarkMetadata(bookmarkId, {
//         viewCount: (bookmark.viewCount || 0) + 1,
//         lastViewed: Date.now(),
//       });
//     }
//   },

//   // GOLD #7: Record sizes they viewed
//   recordSizeView: (bookmarkId: string, size: string) => {
//     const store = useShoppingStore.getState();
//     const bookmark = store.bookmarks.find(b => b.id === bookmarkId);
//     if (bookmark) {
//       const sizes = new Set(bookmark.sizesViewed || []);
//       sizes.add(size);
//       store.updateBookmarkMetadata(bookmarkId, {
//         sizesViewed: Array.from(sizes),
//       });
//     }
//   },

//   // GOLD #8: Link body measurements to bookmark
//   saveWithBodyContext: (bookmarkId: string, bodyMeasurements: any) => {
//     useShoppingStore.getState().recordProductInteraction(
//       useShoppingStore.getState().bookmarks.find(b => b.id === bookmarkId)?.url || '',
//       'bookmark',
//       bodyMeasurements,
//     );
//   },

//   // GOLD #10: Record colors they clicked
//   recordColorView: (bookmarkId: string, color: string) => {
//     const store = useShoppingStore.getState();
//     const bookmark = store.bookmarks.find(b => b.id === bookmarkId);
//     if (bookmark) {
//       const colors = new Set(bookmark.colorsViewed || []);
//       colors.add(color);
//       store.updateBookmarkMetadata(bookmarkId, {
//         colorsViewed: Array.from(colors),
//       });
//     }
//   },

//   // Get insights from all the gold data
//   getGoldInsights: () => {
//     const store = useShoppingStore.getState();
//     const cartStats = store.getCartAbandonmentStats();
//     return {
//       totalSessions: new Set(store.productInteractions.map(i => i.sessionId)).size,
//       avgDwellTime: Math.round(
//         store.history.reduce((sum, h) => sum + (h.dwellTime || 0), 0) /
//         store.history.filter(h => h.dwellTime).length || 0
//       ),
//       topCategories: Array.from(
//         store.bookmarks
//           .filter(b => b.category)
//           .reduce((map, b) => {
//             const cat = b.category!;
//             map.set(cat, (map.get(cat) || 0) + 1);
//             return map;
//           }, new Map<string, number>())
//           .entries()
//       )
//         .sort((a, b) => b[1] - a[1])
//         .slice(0, 5),
//       bookmarksWithPriceHistory: store.bookmarks.filter(b => b.priceHistory?.length || 0 > 0).length,
//       bookmarksWithEmotion: store.bookmarks.filter(b => b.emotionAtSave).length,
//       mostRevisitedItem: store.bookmarks.reduce((max, b) =>
//         (b.viewCount || 0) > (max.viewCount || 0) ? b : max
//       ),
//       ...cartStats,
//     };
//   },

//   // Log all gold data to console for review
//   logAllGoldData: () => {
//     const store = useShoppingStore.getState();
//     const insights = shoppingAnalytics.getGoldInsights();

//     console.log('\n=== 🏆 GOLD DATA SUMMARY ===\n');
//     console.log('Bookmarks:', store.bookmarks.length);
//     console.log('Interactions:', store.productInteractions.length);
//   },

//   // Generate full gold data as a string for display
//   getGoldDataString: (): string => {
//     const store = useShoppingStore.getState();
//     const insights = shoppingAnalytics.getGoldInsights();
//     let output = '';

//     output += '=== GOLD DATA SUMMARY ===\n\n';

//     output += 'SESSIONS & STATS\n';
//     output += `  Total Sessions: ${insights.totalSessions}\n`;
//     output += `  Current Session: ${store.currentSessionId || 'none'}\n`;
//     output += `  Avg Dwell Time: ${insights.avgDwellTime}s\n\n`;

//     output += 'BOOKMARKS\n';
//     output += `  Total: ${store.bookmarks.length}\n`;
//     output += `  With Category: ${store.bookmarks.filter(b => b.category).length}\n`;
//     output += `  With Emotion: ${insights.bookmarksWithEmotion}\n`;
//     output += `  With Price History: ${insights.bookmarksWithPriceHistory}\n\n`;

//     output += 'TOP CATEGORIES\n';
//     if (insights.topCategories.length > 0) {
//       insights.topCategories.forEach(([cat, count]) => {
//         output += `  ${cat}: ${count}\n`;
//       });
//     } else {
//       output += '  (none)\n';
//     }
//     output += '\n';

//     output += 'INTERACTIONS\n';
//     output += `  Total: ${store.productInteractions.length}\n`;
//     output += `  Views: ${store.productInteractions.filter(i => i.type === 'view').length}\n`;
//     output += `  Bookmarks: ${store.productInteractions.filter(i => i.type === 'bookmark').length}\n`;
//     output += `  Cart Adds: ${store.productInteractions.filter(i => i.type === 'add_to_cart').length}\n\n`;

//     output += 'ALL BOOKMARKS (DETAILED)\n';
//     store.bookmarks.forEach((bookmark, idx) => {
//       output += `\n  ${idx + 1}. ${bookmark.title}\n`;
//       output += `     URL: ${bookmark.url}\n`;
//       output += `     Source: ${bookmark.source}\n`;
//       output += `     Category: ${bookmark.category || 'N/A'}\n`;
//       output += `     Views: ${bookmark.viewCount || 1}\n`;
//       if (bookmark.emotionAtSave) output += `     Emotion: ${bookmark.emotionAtSave}\n`;
//       if (bookmark.sizesViewed?.length) output += `     Sizes: ${bookmark.sizesViewed.join(', ')}\n`;
//       if (bookmark.colorsViewed?.length) output += `     Colors: ${bookmark.colorsViewed.join(', ')}\n`;
//       if (bookmark.priceHistory?.length) output += `     Price: $${bookmark.priceHistory[0].price}\n`;
//     });
//     output += '\n';

//     output += 'ALL INTERACTIONS (DETAILED)\n';
//     store.productInteractions.forEach((interaction, idx) => {
//       const typeEmoji = interaction.type === 'view' ? 'VIEW' : interaction.type === 'bookmark' ? 'BOOKMARK' : 'CART';
//       output += `\n  ${idx + 1}. ${typeEmoji}\n`;
//       output += `     URL: ${interaction.productUrl}\n`;
//       output += `     Time: ${new Date(interaction.timestamp).toLocaleString()}\n`;
//       output += `     Session: ${interaction.sessionId || 'none'}\n`;
//     });
//     output += '\n';

//     output += 'RAW JSON\n';
//     output += 'Bookmarks: ' + JSON.stringify(store.bookmarks, null, 2) + '\n\n';
//     output += 'Interactions: ' + JSON.stringify(store.productInteractions, null, 2) + '\n\n';
//     output += 'History (last 10): ' + JSON.stringify(store.history.slice(0, 10), null, 2);

//     return output;
//   },
// };
