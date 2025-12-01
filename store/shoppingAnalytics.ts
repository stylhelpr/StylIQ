import {useShoppingStore} from './shoppingStore';

/**
 * Quick helpers for recording the 10 gold data points
 */

export const shoppingAnalytics = {
  // GOLD #1: Start tracking dwell time
  startPageTimer: () => {
    return Date.now();
  },

  endPageTimer: (startTime: number) => {
    return Math.round((Date.now() - startTime) / 1000); // Return seconds
  },

  // GOLD #3: Auto-generate session ID
  newSession: () => {
    useShoppingStore.getState().startSession();
  },

  endSession: () => {
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
    const categories = ['shoes', 'boots', 'sneakers', 'heels', 'flats', 'tops', 'shirts', 'blouses', 'dresses', 'pants', 'jeans', 'skirts', 'jackets', 'coats', 'hoodies', 'sweaters', 'accessories', 'bags', 'belts', 'scarves'];
    const combined = `${title} ${url}`.toLowerCase();
    return categories.find(cat => combined.includes(cat));
  },

  // Extract all available page content for better analytics
  extractPageContent: (title: string, url: string, bodyText?: string): string => {
    // Combine title, URL, and any body text for comprehensive extraction
    return `${title} ${url} ${bodyText || ''}`.toLowerCase();
  },

  // Extract brand from URL/title
  extractBrand: (title: string, url: string): string | undefined => {
    const brands = [
      'nike', 'adidas', 'puma', 'reebok', 'converse', 'vans', 'timberland',
      'gucci', 'prada', 'chanel', 'versace', 'dior', 'fendi', 'burberry',
      'zara', 'h&m', 'uniqlo', 'gap', 'forever21', 'asos', 'shein',
      'amazon', 'walmart', 'target', 'nordstrom', 'macy\'s',
      'levis', 'tommy hilfiger', 'calvin klein', 'ralph lauren', 'polo',
      'lululemon', 'athleta', 'sweaty betty', 'missguided', 'boohoo',
      'pretty little thing', 'fashion nova', 'revolve', 'ssense', 'farfetch'
    ];
    const combined = `${title} ${url}`.toLowerCase();
    return brands.find(brand => combined.includes(brand));
  },

  // Detect price from text (looks for currency patterns)
  extractPrice: (pageText: string): number | undefined => {
    if (!pageText) {
      console.log('[PRICE] No pageText provided');
      return undefined;
    }

    console.log('[PRICE] Extracting from text length:', pageText.length);
    console.log('[PRICE] First 300 chars:', pageText.substring(0, 300));

    // Try multiple price patterns in order:

    // 1. Currency symbol + price: $99.99, $99, £99.99, €50.00, etc
    // More lenient: allow optional decimals
    let match = pageText.match(/[$£€¥]\s*(\d+(?:[.,]\d{1,2})?)/);
    if (match && match[1]) {
      const priceStr = match[1].replace(',', '.');
      const price = parseFloat(priceStr);
      console.log('[PRICE] Pattern 1 match:', match[1], 'parsed:', price);
      if (!isNaN(price) && price >= 0.5 && price <= 100000) {
        console.log('[PRICE] ✅ Found via pattern 1:', price);
        return price;
      }
    }

    // 2. URL patterns: price=99.99, cost=50, amount:100.00, etc
    match = pageText.match(/(?:price|cost|amount|total)\s*[=:\/\-]\s*(\d+(?:[.,]\d{1,2})?)/i);
    if (match && match[1]) {
      const priceStr = match[1].replace(',', '.');
      const price = parseFloat(priceStr);
      console.log('[PRICE] Pattern 2 match:', match[1], 'parsed:', price);
      if (!isNaN(price) && price >= 0.5 && price <= 100000) {
        console.log('[PRICE] ✅ Found via pattern 2:', price);
        return price;
      }
    }

    // 3. Text patterns: "Price: $99.99", "Cost $50", "from 100.00", etc
    match = pageText.match(/(?:price|cost|now|from|sale|was|selling|buy)\s*(?:at)?\s*[:=]?\s*[$£€¥]?\s*(\d+(?:[.,]\d{1,2})?)/i);
    if (match && match[1]) {
      const priceStr = match[1].replace(',', '.');
      const price = parseFloat(priceStr);
      console.log('[PRICE] Pattern 3 match:', match[1], 'parsed:', price);
      if (!isNaN(price) && price >= 0.5 && price <= 100000) {
        console.log('[PRICE] ✅ Found via pattern 3:', price);
        return price;
      }
    }

    // 4. Just numbers with decimals: 99.99, 199.50, 5.00, etc
    match = pageText.match(/\b(\d+[.,]\d{1,2})\b/);
    if (match && match[1]) {
      const priceStr = match[1].replace(',', '.');
      const price = parseFloat(priceStr);
      console.log('[PRICE] Pattern 4 match:', match[1], 'parsed:', price);
      if (!isNaN(price) && price >= 0.5 && price <= 100000) {
        console.log('[PRICE] ✅ Found via pattern 4:', price);
        return price;
      }
    }

    // 5. Whole numbers that could be prices: 99, 199, 5000 (but not numbers used elsewhere)
    match = pageText.match(/[$£€¥]\s*(\d+)(?!\d)/);
    if (match && match[1]) {
      const price = parseFloat(match[1]);
      console.log('[PRICE] Pattern 5 match:', match[1], 'parsed:', price);
      if (!isNaN(price) && price >= 5 && price <= 100000) {
        console.log('[PRICE] ✅ Found via pattern 5:', price);
        return price;
      }
    }

    console.log('[PRICE] ❌ No price found');
    return undefined;
  },

  // GOLD #4: Track price changes
  updatePriceHistory: (bookmarkId: string, newPrice: number) => {
    const store = useShoppingStore.getState();
    const bookmark = store.bookmarks.find(b => b.id === bookmarkId);
    if (bookmark) {
      const history = bookmark.priceHistory || [];
      store.updateBookmarkMetadata(bookmarkId, {
        price: newPrice,
        priceHistory: [{price: newPrice, date: Date.now()}, ...history].slice(0, 20),
      });
    }
  },

  // GOLD #5: Record emotion when saving
  saveWithEmotion: (bookmarkId: string, emotion: string) => {
    useShoppingStore.getState().updateBookmarkMetadata(bookmarkId, {
      emotionAtSave: emotion,
    });
  },

  // GOLD #6: Track when they revisit
  incrementViewCount: (bookmarkId: string) => {
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
    useShoppingStore.getState().recordProductInteraction(
      useShoppingStore.getState().bookmarks.find(b => b.id === bookmarkId)?.url || '',
      'bookmark',
      bodyMeasurements,
    );
  },

  // GOLD #10: Record colors they clicked
  recordColorView: (bookmarkId: string, color: string) => {
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
    return {
      totalSessions: new Set(store.productInteractions.map(i => i.sessionId)).size,
      avgDwellTime: Math.round(
        store.history.reduce((sum, h) => sum + (h.dwellTime || 0), 0) /
        store.history.filter(h => h.dwellTime).length || 0
      ),
      topCategories: Array.from(
        store.bookmarks
          .filter(b => b.category)
          .reduce((map, b) => {
            const cat = b.category!;
            map.set(cat, (map.get(cat) || 0) + 1);
            return map;
          }, new Map<string, number>())
          .entries()
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      bookmarksWithPriceHistory: store.bookmarks.filter(b => b.priceHistory?.length || 0 > 0).length,
      bookmarksWithEmotion: store.bookmarks.filter(b => b.emotionAtSave).length,
      mostRevisitedItem: store.bookmarks.reduce((max, b) =>
        (b.viewCount || 0) > (max.viewCount || 0) ? b : max
      ),
    };
  },

  // Log all gold data to console for review
  logAllGoldData: () => {
    const store = useShoppingStore.getState();
    const insights = shoppingAnalytics.getGoldInsights();

    console.log('\n=== 🏆 GOLD DATA SUMMARY ===\n');
    console.log('Bookmarks:', store.bookmarks.length);
    console.log('Interactions:', store.productInteractions.length);
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
    output += `  With Category: ${store.bookmarks.filter(b => b.category).length}\n`;
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
    output += `  Views: ${store.productInteractions.filter(i => i.type === 'view').length}\n`;
    output += `  Bookmarks: ${store.productInteractions.filter(i => i.type === 'bookmark').length}\n`;
    output += `  Cart Adds: ${store.productInteractions.filter(i => i.type === 'add_to_cart').length}\n\n`;

    output += 'ALL BOOKMARKS (DETAILED)\n';
    store.bookmarks.forEach((bookmark, idx) => {
      output += `\n  ${idx + 1}. ${bookmark.title}\n`;
      output += `     URL: ${bookmark.url}\n`;
      output += `     Source: ${bookmark.source}\n`;
      output += `     Category: ${bookmark.category || 'N/A'}\n`;
      output += `     Views: ${bookmark.viewCount || 1}\n`;
      if (bookmark.emotionAtSave) output += `     Emotion: ${bookmark.emotionAtSave}\n`;
      if (bookmark.sizesViewed?.length) output += `     Sizes: ${bookmark.sizesViewed.join(', ')}\n`;
      if (bookmark.colorsViewed?.length) output += `     Colors: ${bookmark.colorsViewed.join(', ')}\n`;
      if (bookmark.priceHistory?.length) output += `     Price: $${bookmark.priceHistory[0].price}\n`;
    });
    output += '\n';

    output += 'ALL INTERACTIONS (DETAILED)\n';
    store.productInteractions.forEach((interaction, idx) => {
      const typeEmoji = interaction.type === 'view' ? 'VIEW' : interaction.type === 'bookmark' ? 'BOOKMARK' : 'CART';
      output += `\n  ${idx + 1}. ${typeEmoji}\n`;
      output += `     URL: ${interaction.productUrl}\n`;
      output += `     Time: ${new Date(interaction.timestamp).toLocaleString()}\n`;
      output += `     Session: ${interaction.sessionId || 'none'}\n`;
    });
    output += '\n';

    output += 'RAW JSON\n';
    output += 'Bookmarks: ' + JSON.stringify(store.bookmarks, null, 2) + '\n\n';
    output += 'Interactions: ' + JSON.stringify(store.productInteractions, null, 2) + '\n\n';
    output += 'History (last 10): ' + JSON.stringify(store.history.slice(0, 10), null, 2);

    return output;
  },
};
