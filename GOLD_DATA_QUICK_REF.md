# Gold Data Quick Reference Guide

## Where Everything Is

### Documentation
- **INVESTOR_PITCH.md** - Use this for investor presentations
- **GOLD_DATA_STATUS.md** - Full technical details
- **GOLD_DATA_QUICK_REF.md** - This file

### Code Files

**State Management**
- `store/shoppingStore.ts` - Zustand store with all types and functions
- `store/shoppingAnalytics.ts` - Helper functions for extraction and insights

**UI Components**
- `apps/frontend/src/screens/GoldDataViewer.tsx` - Dashboard showing all metrics
- `apps/frontend/src/screens/WebBrowserScreen.tsx` - Browser with JS injection
- `apps/frontend/src/screens/ShoppingDashboardScreen.tsx` - Quick access button

---

## What's Tracking Right Now

### ✅ Working (9 Data Points)

1. **Session Tracking** - Groups related shopping behavior
2. **Browsing History** - URLs, titles, timestamps
3. **Product Interactions** - Views, bookmarks, cart adds
4. **Bookmarks** - Title, URL, source, timestamp
5. **Categories** - Auto-extracted (shoes, dresses, etc.)
6. **Brands** - Auto-extracted (Nike, Zara, etc.)
7. **Prices** - Auto-extracted with currency validation
8. **Sizes Clicked** - Tracks user selections (S, M, L, 8, 42 EU, etc.)
9. **Colors Clicked** - Tracks color selections (25+ named colors)
10. **Cart View Detection** - Identifies cart/checkout pages
11. **Cart Abandonment** - Identifies carts without purchase
12. **Purchase Completion** - Detects order confirmation pages ⭐ NEW
13. **Conversion Metrics** - Calculates completion rate %

### ⚠️ Structure Ready (But Not Capturing)

- Dwell Time (field exists, JS injection exists)
- Scroll Depth (field exists, JS injection exists)
- Emotion at Save (field exists, needs Mentalist integration)
- Body Measurements (field exists, needs UI integration)

---

## JavaScript Injection Scripts

All injected in `WebBrowserScreen.tsx:handleWebViewLoadEnd()`

### 1. Page Text Extraction
- Captures 5,000 chars of page body
- Used for price/brand/category extraction
- Sent as `pageText` message

### 2. Size/Color Click Detection
- Watches for clicks on variant elements
- Detects sizes: S-4XL, numbered, international
- Detects colors: 25+ named colors + swatches
- Sent as `sizeClick` and `colorClick` messages

### 3. Cart Detection
- Identifies /cart, /bag, /checkout URLs
- Extracts item count and total
- Sent as `cartDetected` message with itemCount & cartValue

### 4. Purchase Detection ⭐ NEW
- Identifies order confirmation pages
- Pattern matches URL, text, and title
- Extracts order number, total, item count
- Sent as `purchaseComplete` message

---

## Key Metrics for Investor Pitch

### Conversion Metrics
```
Conversion Rate = Completed Purchases / Total Carts × 100%
Abandonment Rate = Abandoned Carts / Total Carts × 100%
```

### Product Engagement
```
Top Sizes = Most clicked sizes across all bookmarks
Top Colors = Most clicked colors across all bookmarks
Most Revisited = Product with highest view count
```

### User Behavior
```
Total Sessions = Distinct shopping sessions
Total Bookmarks = Products saved
Total Interactions = Views + Bookmarks + Cart Adds
```

---

## Demo Flow

### Step 1: Start Shopping
1. Open StylIQ app
2. Click "Start Shopping" button
3. Browse to ASOS/Amazon/Zara

### Step 2: Interact with Products
1. Click product image (tracked as VIEW)
2. Click size/color options (tracked as SIZE/COLOR click)
3. Bookmark the product (tracked as BOOKMARK)

### Step 3: Add to Cart
1. Add item to cart on retailer site (detected as CART ADD)
2. Go to checkout (detected as CHECKOUT_START)

### Step 4: Complete Purchase
1. Complete payment on retailer site
2. See order confirmation (detected as CHECKOUT_COMPLETE)

### Step 5: View Metrics
1. Return to StylIQ
2. Click "🏆 Data" button
3. Show "Cart" tab with complete journey
4. Show "Summary" tab with conversion rate

---

## Files to Show Investors

In the app:

### Gold Data Viewer - Summary Tab
Shows:
- Total Sessions tracked
- Total Bookmarks
- Total Interactions (views/bookmarks/carts)
- Top 5 Categories
- Top 5 Brands
- Top Sizes/Colors
- **Cart Behavior** with conversion rate ⭐

### Gold Data Viewer - Cart Tab
Shows:
- Each cart with status (✅ Completed or ❌ Abandoned)
- Complete event timeline
- Purchase total and items (if completed)
- Time from add to purchase

### Gold Data Viewer - Raw Tab
Shows:
- Full JSON export of all data
- Can be shared with stakeholders for verification

---

## Where the Data Comes From

### Automatic Capture (No User Input)
1. **URLs** - From WebView navigation
2. **Titles** - From page title tag
3. **Prices** - Regex extraction from page text
4. **Categories** - Dictionary matching in title/URL
5. **Brands** - Dictionary matching in title/URL
6. **Sizes** - JavaScript click listeners
7. **Colors** - JavaScript click listeners
8. **Cart Events** - JavaScript URL pattern matching
9. **Purchase Events** - JavaScript order confirmation detection

### All Stored Locally
- AsyncStorage on iOS (SQLite)
- Survives app restart
- Never sent to server (until explicitly shared)

---

## Investor Pitch Opening

**"StylIQ tracks the complete shopping funnel - from product discovery all the way through to purchase completion. We capture behavioral signals competitors can't access: which sizes and colors users click before buying, cart abandonment rates, and actual purchase completion metrics."**

Then show:
1. User browsing history (multiple sites)
2. Bookmarked products (with sizes/colors clicked)
3. Cart history showing abandoned vs completed
4. Conversion rate calculation

---

## To Activate Optional Features

### Dwell Time (show time on product)
In `WebBrowserScreen.tsx`, find `handleWebViewLoadEnd()`:
- Uncomment the continuous dwell time tracking
- Will update as user spends time on page

### Emotion Detection (correlate mood with purchases)
In `WebBrowserScreen.tsx` bookmark handler:
- Call `shoppingAnalytics.saveWithEmotion(bookmarkId, emotion)`
- Requires Mentalist integration for facial detection

### Body Measurements (show measurement→size correlation)
In `WebBrowserScreen.tsx` interaction handler:
- Pass `measurementStore` data to `recordProductInteraction()`
- Will show "users who measure L prefer L sizes"

---

## GitHub Commits Related to Gold Data

**Latest Session** (Nov 30, 2025):
```
13dde2f9e - Add comprehensive documentation for Gold Data Analytics system
065e58568 - Add purchase completion detection to close conversion funnel
```

**Previous Session** (Nov 29, 2025):
```
5ce75a9dc - color and size working
82da7ba88 - Fix price extraction: extract page text at bookmark time
```

---

## For Support

If you have questions about:
- **Implementation**: See GOLD_DATA_STATUS.md
- **Investor Pitch**: See INVESTOR_PITCH.md
- **Quick Answers**: See this file
- **Code Details**: Check comments in WebBrowserScreen.tsx and shoppingStore.ts

---

## Status Summary

✅ **READY FOR INVESTOR PITCH**

All critical metrics are operational:
- Conversion funnel tracking (View → Bookmark → Cart → Purchase)
- Cart abandonment detection
- Purchase completion detection
- Behavioral signals (sizes, colors, categories, prices)
- Session and interaction tracking

The system is working, data is flowing, metrics are compelling.
