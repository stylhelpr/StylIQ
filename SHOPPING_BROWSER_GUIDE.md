# StylHelpr Shopping Browser Guide

## Overview

The Shopping Browser is a built-in web browsing experience that keeps users inside StylHelpr while shopping. Users can browse any website, search the web, and shop at their favorite fashion retailers without ever leaving the app.

## Features

✅ **URL Bar** - Enter any URL or search term
✅ **Quick Shopping Sites** - One-tap access to popular fashion retailers
✅ **Navigation Controls** - Back, Forward, Refresh buttons
✅ **Themed UI** - Matches StylHelpr's design and theming
✅ **Search Integration** - Search text automatically uses Google
✅ **Loading States** - Visual feedback while pages load

## Files Created/Modified

- **[WebBrowserScreen.tsx](apps/frontend/src/screens/WebBrowserScreen.tsx)** - Main shopping browser component
- **[RootNavigator.tsx](apps/frontend/src/navigation/RootNavigator.tsx)** - Added WebBrowser navigation
- **[ProfileScreen.tsx](apps/frontend/src/screens/ProfileScreen.tsx)** - Added shopping button

## How Users Access It

### From Profile Screen
1. Users tap **"Open Shopping Browser"** in the Browse & Shop section
2. Browser opens with suggested shopping sites
3. Users can tap a site or enter their own URL

### Programmatically
```typescript
navigate('WebBrowser', {url: 'https://amazon.com'})
navigate('WebBrowser', {url: 'https://asos.com'})
```

## Default Shopping Sites

The browser includes quick-access buttons for:
- Amazon
- ASOS
- H&M
- Zara
- Shein
- SSENSE
- Farfetch
- Google (search)

## Customization

### Adding More Shopping Sites

Edit the `SHOPPING_SITES` array in [WebBrowserScreen.tsx](apps/frontend/src/screens/WebBrowserScreen.tsx):

```typescript
const SHOPPING_SITES = [
  {name: 'Amazon', url: 'https://amazon.com', icon: 'shopping-bag'},
  {name: 'ASOS', url: 'https://asos.com', icon: 'shopping-bag'},
  {name: 'Your Store', url: 'https://yourstore.com', icon: 'shopping-bag'},
  // Add more sites here
];
```

### Changing Icons

Available Material Icons: `shopping-bag`, `shopping-cart`, `store`, `search`, etc.

### Styling Customization

All colors are theme-aware and automatically adapt to light/dark mode:
- `theme.colors.primary` - Button colors, icons
- `theme.colors.surface` - Background containers
- `theme.colors.foreground` - Text colors
- `theme.colors.button1` - Primary action buttons

## Integration Examples

### Add Shopping Button to Other Screens

```typescript
<AppleTouchFeedback
  onPress={() => navigate('WebBrowser')}
  hapticStyle="impactLight">
  <Icon name="shopping-bag" size={24} color={theme.colors.primary} />
  <Text>Shop Now</Text>
</AppleTouchFeedback>
```

### Link from Product Recommendations

```typescript
<TouchableOpacity
  onPress={() => navigate('WebBrowser', {
    url: 'https://asos.com/search?q=blue+dress'
  })}>
  <Text>Shop Similar on ASOS</Text>
</TouchableOpacity>
```

### Auto-Search from Style Profile

```typescript
const handleSearchBrand = (brand: string) => {
  navigate('WebBrowser', {
    url: `https://google.com/search?q=${encodeURIComponent(brand + ' fashion')}`
  });
};
```

## Browser Features

### URL Handling
- **Full URLs**: `https://amazon.com` → Opens directly
- **Domain-like input**: `asos.com` → Converted to `https://asos.com`
- **Search terms**: `blue dresses` → Google search

### Navigation
- **Back/Forward** - Navigate through history (disabled when not available)
- **Refresh** - Reload current page
- **Close** - Returns to Home screen

### Loading States
- Loading spinner appears while pages load
- URL and status update in real-time
- Current URL displayed in header

## Technical Details

### WebView Configuration
- JavaScript enabled for interactive sites
- DOM storage enabled for site preferences
- Mobile user agent string for better mobile-optimized views
- All origins whitelisted (`*`) for full web access

### Navigation Integration
- Opens as modal overlay
- Maintains app history stack
- Back button works intuitively (goes back in browser history first, then app)
- Close button returns to Home

## Best Practices

1. **Keep URLs Simple** - No need for `http://` or `https://`, browser auto-detects
2. **Use Specific Links** - Link directly to product searches or categories when possible
3. **Consider Affiliate Links** - Add affiliate program URLs to generate revenue from shopping
4. **Test on Real Device** - Some websites behave differently on mobile vs desktop
5. **Monitor Performance** - Heavy pages may take longer to load on older devices

## Troubleshooting

**Page won't load**: Check that the URL is correct and reachable. Some sites block app browsers - use the user agent fallback.

**Images not loading**: This usually indicates a network issue or the site blocking mobile access.

**Back button not working**: Make sure WebView ref is properly connected - check console logs.

**Theme colors not applying**: Ensure theme context is properly wrapped around the screen.

## Future Enhancements

Consider adding:
- Browser history/recent sites
- Bookmarks/favorites within the app
- In-app shopping cart indicator
- Affiliate link tracking
- Screenshot/share functionality for outfits found
- Integration with wardrobe (add found items directly)
