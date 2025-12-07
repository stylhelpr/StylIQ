# Price Drop Alerts - Complete Setup Guide

## 🎯 Overview

You now have a **complete, scrape-free price tracking system** built into StylIQ. Users manually update prices (or the system suggests them), set target prices, and get alerts when items hit those targets.

**Zero Breaking Changes** - All existing features remain untouched.

---

## 📦 What Was Created

### Backend Files (NestJS)
```
apps/backend-nest/src/price-tracking/
├── price-tracking.module.ts          # Module declaration
├── price-tracking.service.ts         # Core business logic
├── price-tracking.controller.ts      # API endpoints
├── price-check-cron.service.ts       # Hourly alert checker
└── dto/
    └── track-item.dto.ts             # Data transfer objects
```

**Modified:**
- `apps/backend-nest/src/app.module.ts` - Added PriceTrackingModule

### Frontend Files (React Native)
```
store/
└── priceAlertStore.ts                # Zustand store for alerts

apps/frontend/src/
├── hooks/
│   └── usePriceAlerts.ts             # Hook for API calls
├── screens/
│   └── PriceAlertsScreen.tsx         # Full alerts dashboard
└── components/PriceAlertModal/
    └── PriceAlertModal.tsx            # Set price alert modal
└── components/PriceUpdatePrompt/
    └── PriceUpdatePrompt.tsx          # Update price quick prompt
```

---

## 🔧 Integration Steps

### Step 1: Register the PriceAlertsScreen

Edit `apps/frontend/src/navigation/RootNavigator.tsx`:

```typescript
// 1. Add to the Screen type union
type Screen =
  | 'Home'
  | 'ShoppingDashboard'
  | 'ShoppingBookmarks'
  | 'ShoppingCollections'
  | 'WebBrowser'
  | 'PriceAlerts'  // ← ADD THIS
  | /* ... other screens */;

// 2. Add to the render switch
switch (screen) {
  case 'ShoppingDashboard':
    return <ShoppingDashboardScreen navigate={navigate} />;
  case 'PriceAlerts':  // ← ADD THIS
    return <PriceAlertsScreen navigate={navigate} />;
  // ... other cases
}
```

### Step 2: Add Quick Action Button to Dashboard

Edit `apps/frontend/src/screens/ShoppingDashboardScreen.tsx`:

Find the quick actions section and add:

```typescript
<AppleTouchFeedback
  style={styles.quickActionButton}
  onPress={() => navigate?.('PriceAlerts')}
  hapticStyle="impactLight">
  <MaterialIcons
    name="trending-down"
    size={28}
    color={theme.colors.primary}
    style={styles.quickActionIcon}
  />
  <Text style={styles.quickActionLabel}>Price Alerts</Text>
</AppleTouchFeedback>
```

### Step 3: Add Price Alert to Bookmarks

Edit `apps/frontend/src/screens/ShoppingBookmarksScreen.tsx`:

**At the top, add imports:**
```typescript
import PriceAlertModal from '../components/PriceAlertModal/PriceAlertModal';
import { usePriceAlerts } from '../hooks/usePriceAlerts';
import { useAuthStore } from '../../../../store/authStore';
```

**In the component function, add state:**
```typescript
export default function ShoppingBookmarksScreen({ navigate }: Props) {
  const { theme } = useAppTheme();
  const { token } = useAuthStore();  // ← ADD
  const { removeBookmark } = useShoppingStore();
  const { createAlert } = usePriceAlerts();  // ← ADD
  const [alertModalVisible, setAlertModalVisible] = useState(false);  // ← ADD
  const [selectedBookmark, setSelectedBookmark] = useState<ShoppingItem | null>(null);  // ← ADD

  // ... rest of component
```

**In the bookmark card render, add button after the "open" button:**
```typescript
<AppleTouchFeedback
  style={styles.actionButton}
  onPress={() => {
    setSelectedBookmark(item);
    setAlertModalVisible(true);
  }}
  hapticStyle="impactLight">
  <MaterialIcons
    name="notifications"
    size={20}
    color={theme.colors.primary}
  />
</AppleTouchFeedback>
```

**Before the closing `</SafeAreaView>`, add the modal:**
```typescript
<PriceAlertModal
  visible={alertModalVisible}
  currentPrice={selectedBookmark?.price || 0}
  itemTitle={selectedBookmark?.title || ''}
  onDismiss={() => setAlertModalVisible(false)}
  onConfirm={async (targetPrice) => {
    if (selectedBookmark && token) {
      try {
        await createAlert(token, {
          url: selectedBookmark.url,
          title: selectedBookmark.title,
          currentPrice: selectedBookmark.price || 0,
          targetPrice,
          brand: selectedBookmark.brand,
          source: selectedBookmark.source,
        });
      } catch (err) {
        console.error('Failed to create alert:', err);
      }
    }
  }}
  isLoading={false}
/>
```

---

## 🔌 API Endpoints

All endpoints require `Authorization: Bearer {jwt_token}` header.

### Create/Update Tracking
```
POST /api/price-tracking/track
Content-Type: application/json

{
  "url": "https://asos.com/item",
  "title": "Oversized Blazer",
  "currentPrice": 89.99,
  "targetPrice": 60.00,
  "brand": "ASOS",
  "source": "ASOS"
}

Response: { id, url, title, currentPrice, targetPrice, ... }
```

### Get All Alerts
```
GET /api/price-tracking/alerts

Response: [
  { id, url, title, currentPrice, targetPrice, priceHistory: [...], ... },
  ...
]
```

### Update Alert Settings
```
PUT /api/price-tracking/:id
Content-Type: application/json

{
  "targetPrice": 50.00,  // optional
  "enabled": true        // optional
}

Response: { id, ... }
```

### Update Price (User Reports New Price)
```
PUT /api/price-tracking/:id/price
Content-Type: application/json

{ "price": 79.99 }

Response: { id, currentPrice: 79.99, ... }
```

### Get Price History
```
GET /api/price-tracking/:id/history

Response: [
  { id, price: 89.99, recordedAt: "2024-01-15T10:30:00Z" },
  { id, price: 79.99, recordedAt: "2024-01-20T14:22:00Z" },
  ...
]
```

### Delete Alert
```
DELETE /api/price-tracking/:id

Response: { success: true }
```

---

## 📊 Database Schema

### price_tracking Table
| Column | Type | Notes |
|--------|------|-------|
| id | INT | Primary key |
| user_id | VARCHAR(255) | From JWT |
| url | VARCHAR(500) | Product URL |
| title | VARCHAR(255) | Product name |
| brand | VARCHAR(100) | Brand name |
| source | VARCHAR(100) | Store (ASOS, Zara, etc) |
| current_price | DECIMAL(10,2) | Latest price |
| target_price | DECIMAL(10,2) | Alert threshold |
| enabled | BOOLEAN | Is alert active? |
| alert_sent | BOOLEAN | Has notification been sent? |
| created_at | TIMESTAMP | When created |
| updated_at | TIMESTAMP | Last modified |
| last_checked | TIMESTAMP | Last cron check |

### price_history Table
| Column | Type | Notes |
|--------|------|-------|
| id | INT | Primary key |
| tracking_id | INT | FK → price_tracking |
| price | DECIMAL(10,2) | Price at time |
| recorded_at | TIMESTAMP | When recorded |
| user_updated | BOOLEAN | User-entered or system? |

---

## 🎨 Components

### PriceAlertModal
Modal for setting up a price alert on a bookmark.

**Usage:**
```typescript
import PriceAlertModal from '../components/PriceAlertModal/PriceAlertModal';

<PriceAlertModal
  visible={isOpen}
  currentPrice={89.99}
  itemTitle="Oversized Blazer"
  onDismiss={() => setOpen(false)}
  onConfirm={async (targetPrice) => {
    await api.createAlert(targetPrice);
  }}
  isLoading={false}
/>
```

**Props:**
- `visible: boolean` - Show/hide modal
- `currentPrice: number` - Current item price
- `itemTitle: string` - Item name for display
- `onDismiss: () => void` - Close handler
- `onConfirm: (price: number) => Promise<void>` - Create alert handler
- `isLoading?: boolean` - Loading state

### PriceUpdatePrompt
Quick prompt to update price when revisiting a bookmarked item.

**Usage:**
```typescript
import PriceUpdatePrompt from '../components/PriceUpdatePrompt/PriceUpdatePrompt';

<PriceUpdatePrompt
  visible={showPrompt}
  itemTitle="Oversized Blazer"
  oldPrice={89.99}
  onDismiss={() => setShowPrompt(false)}
  onConfirm={async (newPrice) => {
    await api.updatePrice(alertId, newPrice);
  }}
  isLoading={false}
/>
```

### PriceAlertsScreen
Full dashboard showing all price alerts with history.

**Usage:**
```typescript
<PriceAlertsScreen navigate={navigate} />
```

---

## 🪝 Zustand Store

```typescript
import { usePriceAlertStore } from '../../store/priceAlertStore';

const {
  alerts,                      // All alerts
  loading,                      // API loading state
  error,                        // Error message
  addAlert,                     // Add to local state
  updateAlert,                  // Update local state
  removeAlert,                  // Remove from local state
  getAlertsBySource,            // Filter alerts by store
  getAlertsWithPriceDrop,       // Get alerts that hit target
  getPriceChangePercent,        // Get % change for alert
  hasActiveAlerts,              // Any active alerts?
} = usePriceAlertStore();
```

---

## 🪝 usePriceAlerts Hook

```typescript
import { usePriceAlerts } from '../hooks/usePriceAlerts';

const {
  // Data
  alerts,
  loading,
  error,

  // API Methods
  fetchAlerts,                  // Load from backend
  createAlert,                  // Create new alert
  updatePriceAlert,             // Change target/enabled
  updatePrice,                  // User updates price
  deleteAlert,                  // Remove alert
  getPriceHistory,              // Load price timeline

  // Helpers
  getAlertsBySource,
  getAlertsWithPriceDrop,
  getPriceChangePercent,
  hasActiveAlerts,
} = usePriceAlerts();

// Example usage
useEffect(() => {
  if (token) fetchAlerts(token);
}, [token]);

// Create alert
await createAlert(token, {
  url: 'https://...',
  title: 'Item',
  currentPrice: 100,
  targetPrice: 75,
  brand: 'Brand',
  source: 'Store'
});

// Update price when user sees new price
await updatePrice(token, alertId, 79.99);
```

---

## 🔔 Background Price Checking

The `PriceCheckCronService` runs **every hour**:

1. Finds all active alerts with target prices
2. Checks if `current_price <= target_price`
3. Marks `alert_sent = true` (prevents duplicate notifications)

**To Enable Push Notifications:**

Edit `apps/backend-nest/src/price-tracking/price-check-cron.service.ts`:

```typescript
import { NotificationsService } from '../notifications/notifications.service';

export class PriceCheckCronService {
  constructor(
    private readonly priceTrackingService: PriceTrackingService,
    private readonly db: DatabaseService,
    private readonly notificationsService: NotificationsService, // ← ADD
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async checkPriceAlerts() {
    // ... existing code ...

    for (const tracking of trackings) {
      if (tracking.current_price <= tracking.target_price && !tracking.alert_sent) {
        // ← ADD THIS BLOCK:
        try {
          await this.notificationsService.sendPriceDropNotification(
            tracking.user_id,
            {
              title: '💰 Price Drop!',
              body: `${tracking.title} is now $${tracking.current_price}`,
              data: { trackingId: tracking.id.toString() }
            }
          );
        } catch (err) {
          console.error('Failed to send notification:', err);
        }

        await this.priceTrackingService.markAlertSent(tracking.id);
      }
    }
  }
}
```

---

## ✅ Testing Checklist

- [ ] Database tables created on first backend start
- [ ] Can POST to `/api/price-tracking/track` (with JWT)
- [ ] Can GET `/api/price-tracking/alerts`
- [ ] Can PUT `/api/price-tracking/:id/price` to update
- [ ] PriceAlertsScreen renders in navigation
- [ ] Can set alert from ShoppingBookmarksScreen
- [ ] Modal validates price input
- [ ] Cron job logs "Price alert check started" every hour
- [ ] Zustand store persists to AsyncStorage

---

## 🎯 Quick Start for Users

1. **Browse & Bookmark** - User finds item and bookmarks it ($89.99)
2. **Set Alert** - Click notification icon → Set target price ($60)
3. **Wait** - System checks hourly, user goes about day
4. **Notification** - When price drops to $60 or below → Get alert
5. **Update Price** - If user sees different price while browsing → Quick update

---

## 🚀 Future Enhancements

- Chart UI for price history
- Bulk operations (enable/disable all)
- Price alerts by category
- Wishlist integration (alert when item added to collections)
- Export price history as CSV
- Price comparison across stores
- Machine learning price predictions

---

## 🆘 Troubleshooting

**Alerts not showing?**
- Check JWT token is valid in `Authorization` header
- Verify `user_id` in JWT matches database records

**Prices not updating?**
- Check cron job logs: `Price alert check` should appear hourly
- Verify `enabled: true` and `target_price` is set

**Modal not appearing?**
- Ensure `usePriceAlerts` is imported and initialized
- Check `token` from `useAuthStore` is available

---

## 📝 Notes

- All prices are user-reported (no scraping = no bot flags)
- Price history is automatically recorded
- Alerts can be toggled on/off without deleting
- System handles duplicates via `UNIQUE(user_id, url)` constraint
- Hourly checks ensure minimal server load

---

**Built with ❤️ - Zero breaking changes, maximum impact.**
