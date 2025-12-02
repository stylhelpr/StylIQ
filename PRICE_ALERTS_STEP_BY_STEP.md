# Price Alerts - Step-by-Step Integration Guide

## Overview
You have 3 simple edits to make to integrate price alerts into your app. No breaking changes, just adding new functionality.

---

## STEP 1: Add Screen to Navigation
**File:** `apps/frontend/src/navigation/RootNavigator.tsx`

### 1A: Add the import at the top
Find line 52 where other screens are imported:
```typescript
import ShoppingCollectionsScreen from '../screens/ShoppingCollectionsScreen';
```

After this line, add:
```typescript
import PriceAlertsScreen from '../screens/PriceAlertsScreen';
```

### 1B: Add to Screen type union
Find the `type Screen` definition (around line 84). It currently ends with `'GoldDataViewer'` on line 151.

Look for this pattern (around line 151):
```typescript
  | 'MeasurementAutoScreen'
  | 'GoldDataViewer';
```

Change it to:
```typescript
  | 'MeasurementAutoScreen'
  | 'GoldDataViewer'
  | 'PriceAlerts';
```

### 1C: Add render case
Find where `'ShoppingDashboard'` is rendered (line 457). After that case block (around line 476), find this:

```typescript
      case 'ShoppingInsights':
        return <ShoppingInsightsScreen navigate={navigate} />;
      case 'MeasurementAutoScreen':
```

Add this right after the 'ShoppingInsights' case:
```typescript
      case 'PriceAlerts':
        return <PriceAlertsScreen navigate={navigate} />;
```

**Result:**
```typescript
      case 'ShoppingInsights':
        return <ShoppingInsightsScreen navigate={navigate} />;
      case 'PriceAlerts':  // ← YOUR NEW SCREEN
        return <PriceAlertsScreen navigate={navigate} />;
      case 'MeasurementAutoScreen':
```

---

## STEP 2: Add Quick Action Button to Dashboard
**File:** `apps/frontend/src/screens/ShoppingDashboardScreen.tsx`

### 2A: Find the quick actions section
Search for `quickActionGrid` in the file. You'll find it around where the quick action buttons are rendered.

Look for this pattern (should be around line 391-431):
```typescript
        <Animatable.View
          animation="fadeInUp"
          delay={200}
          style={styles.sectionContainer}>
          <View style={styles.quickActionGrid}>
            <AppleTouchFeedback
              style={styles.quickActionButton}
              onPress={() => navigate?.('ShoppingBookmarks')}
              // ... BookmarksButton

            <AppleTouchFeedback
              style={styles.quickActionButton}
              onPress={() => navigate?.('ShoppingCollections')}
              // ... CollectionsButton

            <AppleTouchFeedback
              style={styles.quickActionButton}
              onPress={() => navigate?.('ShoppingInsights')}
              // ... InsightsButton
          </View>
        </Animatable.View>
```

### 2B: Add new button
After the InsightsButton (which ends with `</AppleTouchFeedback>`), add this new button:

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

**Result:** Your quick action grid now has 4 buttons: Bookmarks, Wishlists, Insights, **Price Alerts**

---

## STEP 3: Add Price Alert Button to Bookmarks
**File:** `apps/frontend/src/screens/ShoppingBookmarksScreen.tsx`

This is the most involved step, but still straightforward.

### 3A: Add imports at the top
Find the existing imports section (top of file). Add these three imports:

```typescript
import PriceAlertModal from '../components/PriceAlertModal/PriceAlertModal';
import { usePriceAlerts } from '../hooks/usePriceAlerts';
import { useAuthStore } from '../../../../store/authStore';
```

### 3B: Add state variables in component
Find the component function definition:
```typescript
export default function ShoppingBookmarksScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const {bookmarks, removeBookmark, history} = useShoppingStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'brand' | 'name'>('recent');
```

After the existing state, add:
```typescript
  const { token } = useAuthStore();
  const { createAlert } = usePriceAlerts();
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [selectedBookmark, setSelectedBookmark] = useState<ShoppingItem | null>(null);
  const [isCreatingAlert, setIsCreatingAlert] = useState(false);
```

### 3C: Add button to bookmark cards
Find the bookmark card render section. Look for where it shows the bookmark actions (around line 318-338):

```typescript
                <View style={styles.bookmarkActions}>
                  <AppleTouchFeedback
                    style={styles.actionButton}
                    onPress={() => navigate?.('WebBrowser', {url: item.url})}
                    hapticStyle="impactLight">
                    <MaterialIcons
                      name="open-in-new"
                      size={20}
                      color={theme.colors.primary}
                    />
                  </AppleTouchFeedback>
                  <AppleTouchFeedback
                    style={styles.actionButton}
                    onPress={() => handleDelete(item.id, item.title)}
                    hapticStyle="impactLight">
                    <MaterialIcons
                      name="delete"
                      size={20}
                      color={theme.colors.foreground3}
                    />
                  </AppleTouchFeedback>
                </View>
```

Add this new button between the "open" and "delete" buttons:
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

### 3D: Add the modal at the bottom
Find the closing `</SafeAreaView>` tag near the end of the file (around line 348).

Before it, add:
```typescript
      <PriceAlertModal
        visible={alertModalVisible}
        currentPrice={selectedBookmark?.price || 0}
        itemTitle={selectedBookmark?.title || ''}
        onDismiss={() => setAlertModalVisible(false)}
        onConfirm={async (targetPrice) => {
          if (selectedBookmark && token) {
            setIsCreatingAlert(true);
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
            } finally {
              setIsCreatingAlert(false);
            }
          }
        }}
        isLoading={isCreatingAlert}
      />
```

---

## Done! 🎉

That's it! You now have price alerts integrated. Here's what users can do:

### User Flow
1. **Browse** - User finds items while shopping
2. **Bookmark** - Click bookmark icon to save item
3. **Go to Dashboard** - Tap "Price Alerts" quick action
4. **View Bookmarks** - Go to Bookmarks screen
5. **Set Alert** - Tap notification icon on any bookmark
6. **Set Target** - Enter price they want to be alerted at
7. **Get Notified** - Backend checks hourly, notifies when price drops

---

## Testing Checklist

After integration, test these:

- [ ] Can navigate to PriceAlertsScreen from dashboard
- [ ] Can set a price alert from bookmarks
- [ ] Modal validates price input
- [ ] Can see alerts dashboard with stats
- [ ] Can toggle alerts on/off
- [ ] Can delete alerts
- [ ] No console errors

---

## Troubleshooting

**Q: Can't find ShoppingDashboardScreen imports?**
A: Look at line 49 - you'll see where to add the new import

**Q: Not sure where the quick action buttons are?**
A: Search for `quickActionGrid` - that's the section with Bookmarks, Wishlists, Insights buttons

**Q: Modal not appearing?**
A: Make sure you added the imports and state variables - they're required

**Q: Getting type errors?**
A: Add `| 'PriceAlerts'` to the `type Screen` union - that's the most common one

---

## What Was Already Built For You

Backend API:
- ✅ POST /api/price-tracking/track - Create alert
- ✅ GET /api/price-tracking/alerts - Get all alerts
- ✅ PUT /api/price-tracking/:id/price - Update price
- ✅ DELETE /api/price-tracking/:id - Delete alert
- ✅ Hourly cron job checks for price drops

Frontend Components:
- ✅ PriceAlertModal - Beautiful modal to set alert
- ✅ PriceUpdatePrompt - Quick price update component
- ✅ PriceAlertsScreen - Full dashboard
- ✅ usePriceAlerts hook - All API operations
- ✅ priceAlertStore - State management

You just wired them together! 🔌

---

## Next (Optional): Enable Push Notifications

When price drops hit target, send push notification:

Edit `apps/backend-nest/src/price-tracking/price-check-cron.service.ts`:

```typescript
import { NotificationsService } from '../notifications/notifications.service';

constructor(
  private readonly priceTrackingService: PriceTrackingService,
  private readonly db: DatabaseService,
  private readonly notificationsService: NotificationsService, // ← ADD
) {}

// In checkPriceAlerts method, when alert triggers:
await this.notificationsService.sendToUser(tracking.user_id, {
  title: '💰 Price Drop Alert!',
  body: `${tracking.title} is now $${tracking.current_price}`,
  data: { trackingId: tracking.id.toString() }
});
```

---

**You're all set!** 🚀
