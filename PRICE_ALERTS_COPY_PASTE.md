# Price Alerts - Copy & Paste Guide

Just copy and paste these exact snippets. No thinking required!

---

## EDIT #1: RootNavigator.tsx

### Change 1A: Add import (after line 52)

**Find this:**
```typescript
import ShoppingCollectionsScreen from '../screens/ShoppingCollectionsScreen';
import ShoppingInsightsScreen from '../screens/ShoppingInsightsScreen';
```

**Add this after:**
```typescript
import PriceAlertsScreen from '../screens/PriceAlertsScreen';
```

---

### Change 1B: Add to type (modify line 151)

**Find this:**
```typescript
  | 'MeasurementAutoScreen'
  | 'GoldDataViewer';
```

**Replace with:**
```typescript
  | 'MeasurementAutoScreen'
  | 'GoldDataViewer'
  | 'PriceAlerts';
```

---

### Change 1C: Add case (after line 476)

**Find this:**
```typescript
      case 'ShoppingInsights':
        return <ShoppingInsightsScreen navigate={navigate} />;
      case 'MeasurementAutoScreen':
```

**Add between them:**
```typescript
      case 'PriceAlerts':
        return <PriceAlertsScreen navigate={navigate} />;
```

---

## EDIT #2: ShoppingDashboardScreen.tsx

### Change 2A: Add button to quick actions

**Find this section (around line 417-430):**
```typescript
            <AppleTouchFeedback
              style={styles.quickActionButton}
              onPress={() => navigate?.('ShoppingInsights')}
              hapticStyle="impactLight">
              <MaterialIcons
                name="trending-up"
                size={28}
                color={theme.colors.primary}
                style={styles.quickActionIcon}
              />
              <Text style={styles.quickActionLabel}>Insights</Text>
            </AppleTouchFeedback>
          </View>
        </Animatable.View>
```

**Add this after the closing `</AppleTouchFeedback>` of Insights:**
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

---

## EDIT #3: ShoppingBookmarksScreen.tsx

### Change 3A: Add imports (at top after other imports)

**Find this (around line 18):**
```typescript
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

type Props = {
```

**Add before `type Props`:**
```typescript
import PriceAlertModal from '../components/PriceAlertModal/PriceAlertModal';
import { usePriceAlerts } from '../hooks/usePriceAlerts';
import { useAuthStore } from '../../../../store/authStore';

```

---

### Change 3B: Add state variables

**Find this (around line 24-29):**
```typescript
export default function ShoppingBookmarksScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const {bookmarks, removeBookmark, history} = useShoppingStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'brand' | 'name'>('recent');
```

**Add these three lines after `setSortBy` line:**
```typescript
  const { token } = useAuthStore();
  const { createAlert } = usePriceAlerts();
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [selectedBookmark, setSelectedBookmark] = useState<ShoppingItem | null>(null);
  const [isCreatingAlert, setIsCreatingAlert] = useState(false);
```

---

### Change 3C: Add notification button to actions

**Find this (around line 318-338):**
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

**Add this between the two `</AppleTouchFeedback>` tags:**
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

---

### Change 3D: Add modal before closing SafeAreaView

**Find the closing tag (around line 348):**
```typescript
      )}
    </SafeAreaView>
  );
}
```

**Add this before the closing `</SafeAreaView>`:**
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

## That's It!

3 edits, all done. Run your app and test:

1. ✅ Can you see "Price Alerts" button on dashboard?
2. ✅ Can you click it and see the alerts screen?
3. ✅ Can you click the notification icon on a bookmark?
4. ✅ Can you set a target price?
5. ✅ Does the alert appear in the Price Alerts screen?

If all 5 work → **You're done!** 🎉

---

## Didn't Work?

**Import Error?**
- Make sure PriceAlertModal, usePriceAlerts, useAuthStore imports are there

**Modal not showing?**
- Make sure alertModalVisible state is added
- Make sure the modal JSX is before closing SafeAreaView

**Button not appearing?**
- Make sure you added it to the quickActionGrid (4 buttons now)

**Navigation error?**
- Make sure 'PriceAlerts' is added to type Screen union

Check the PRICE_ALERTS_STEP_BY_STEP.md file for detailed explanation.
