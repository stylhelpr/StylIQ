# Price Alerts - Quick Reference

## Files Created

| File | Purpose |
|------|---------|
| `apps/backend-nest/src/price-tracking/price-tracking.module.ts` | Module registration |
| `apps/backend-nest/src/price-tracking/price-tracking.service.ts` | Database operations |
| `apps/backend-nest/src/price-tracking/price-tracking.controller.ts` | API endpoints |
| `apps/backend-nest/src/price-tracking/price-check-cron.service.ts` | Hourly alert checker |
| `apps/backend-nest/src/price-tracking/dto/track-item.dto.ts` | Data types |
| `store/priceAlertStore.ts` | State management |
| `apps/frontend/src/hooks/usePriceAlerts.ts` | API hook |
| `apps/frontend/src/screens/PriceAlertsScreen.tsx` | Alerts dashboard |
| `apps/frontend/src/components/PriceAlertModal/PriceAlertModal.tsx` | Set alert modal |
| `apps/frontend/src/components/PriceUpdatePrompt/PriceUpdatePrompt.tsx` | Update price prompt |

## 3 Files to Edit (Simple)

### 1. RootNavigator.tsx
```typescript
// Add 'PriceAlerts' to Screen type
// Add case for PriceAlertsScreen
```

### 2. ShoppingDashboardScreen.tsx
```typescript
// Add quick action button pointing to 'PriceAlerts'
```

### 3. ShoppingBookmarksScreen.tsx
```typescript
// Add imports: PriceAlertModal, usePriceAlerts, useAuthStore
// Add state: alertModalVisible, selectedBookmark
// Add notification button to each bookmark
// Add modal component before closing tag
```

## Core Functionality

| Feature | How It Works |
|---------|-------------|
| **Create Alert** | User picks bookmark → Sets target price → Backend stores it |
| **Track Price** | User manually updates when they see new price |
| **Check Alerts** | Cron runs hourly → Compares current vs target |
| **Notify User** | Alert triggered → Firebase push notification (optional) |
| **View History** | UI shows price over time + % change |

## API Quick Calls

```bash
# Create alert
POST /api/price-tracking/track
{ url, title, currentPrice, targetPrice, brand, source }

# Get all alerts
GET /api/price-tracking/alerts

# Update price
PUT /api/price-tracking/:id/price
{ price: 79.99 }

# Update target
PUT /api/price-tracking/:id
{ targetPrice: 60, enabled: true }

# Delete alert
DELETE /api/price-tracking/:id
```

## Hook Usage

```typescript
const { createAlert, updatePrice, fetchAlerts, alerts } = usePriceAlerts();

// Create
await createAlert(token, { url, title, currentPrice, targetPrice, brand, source });

// Update
await updatePrice(token, alertId, 79.99);

// Fetch
await fetchAlerts(token);
```

## Store Usage

```typescript
const { alerts, addAlert, updateAlert, removeAlert } = usePriceAlertStore();

// Get alerts for ASOS
const asos = getAlertsBySource('ASOS');

// Get alerts that hit target
const dropped = getAlertsWithPriceDrop();

// Get % change
const change = getPriceChangePercent(alertId); // -15.5
```

## Database

```sql
-- price_tracking: id, user_id, url, title, brand, source, current_price, target_price, enabled, alert_sent, created_at, updated_at

-- price_history: id, tracking_id, price, recorded_at, user_updated
```

## Components

```typescript
// Set Alert Modal
<PriceAlertModal
  visible={bool}
  currentPrice={num}
  itemTitle={str}
  onDismiss={() => {}}
  onConfirm={async (price) => {}}
/>

// Update Price Prompt
<PriceUpdatePrompt
  visible={bool}
  itemTitle={str}
  oldPrice={num}
  onDismiss={() => {}}
  onConfirm={async (newPrice) => {}}
/>

// Alerts Dashboard
<PriceAlertsScreen navigate={navigate} />
```

## Error Handling

```typescript
const { error, setError, clearError } = usePriceAlerts();

if (error) {
  // Display error message
}

clearError();
```

## No Breaking Changes ✅

- ✅ Shopping store untouched
- ✅ Bookmarks untouched
- ✅ Collections untouched
- ✅ Web browser untouched
- ✅ All other screens untouched

---

**Status:** Ready to integrate | **Time to integrate:** ~30 minutes | **Complexity:** Low
