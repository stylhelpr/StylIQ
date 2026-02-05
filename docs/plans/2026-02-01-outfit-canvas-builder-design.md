# Outfit Canvas Builder Design

## Overview

Replace the current grid-based outfit builder with a free-placement canvas where users compose stylized flat-lay outfits by dragging, positioning, and resizing clothing items.

## User Flow

1. User opens ClosetScreen
2. Taps "Build Outfit" button in header → enters selection mode
3. Taps any clothing item → OutfitCanvasScreen opens with that item centered
4. Bottom drawer shows wardrobe items with category tabs
5. User taps items in drawer → they appear centered on canvas
6. User drags items to position, pinch-resizes to scale
7. Long-press any item → menu with "Bring to Front", "Send to Back", "Remove"
8. Taps floating Save button → names outfit → saves to backend → exits
9. Swipe back or tap back → discard confirmation if unsaved changes

## MVP Scope

**In Scope:**
- Free-placement canvas with drag and pinch-resize
- Bottom drawer item picker with category tabs
- Layer ordering (last-touched on top + long-press menu)
- Backend persistence with JSONB canvas_data column
- Theme-matched canvas background

**Out of Scope (Future):**
- Background picker
- Sticker overlays
- Rotation gesture
- Guided layout mode
- Offline creation

## Component Architecture

### New Components

```
apps/frontend/src/screens/
  OutfitCanvasScreen.tsx        # Main screen with canvas + drawer

apps/frontend/src/components/OutfitCanvas/
  OutfitCanvas.tsx              # The draggable canvas container
  CanvasItem.tsx                # Individual placed item (drag + pinch-resize)
  ItemDrawer.tsx                # Bottom drawer with category tabs + items
  CategoryTabs.tsx              # Tab bar for filtering
  ItemContextMenu.tsx           # Long-press menu (layer controls, remove)
  SaveOutfitModal.tsx           # Modal for naming outfit before save
  DiscardConfirmModal.tsx       # "Discard changes?" confirmation
```

### Modified Components

- **ClosetScreen.tsx** - Add "Build Outfit" header button, selection mode state
- **RootNavigator.tsx** - Add OutfitCanvasScreen route with item param

### Removed Components

- **OutfitBuilderScreen.tsx** - Replaced by OutfitCanvasScreen

## Data Model

### Frontend Canvas State

```typescript
type PlacedItem = {
  id: string;              // Unique placement ID (uuid)
  wardrobeItemId: string;  // Reference to wardrobe item
  imageUrl: string;        // Cached for rendering
  x: number;               // Position from left (0-1 normalized)
  y: number;               // Position from top (0-1 normalized)
  scale: number;           // Scale factor (default 1.0)
  zIndex: number;          // Layer order (higher = on top)
};

type CanvasState = {
  placedItems: PlacedItem[];
  nextZIndex: number;
};
```

### Backend Schema Change

```sql
ALTER TABLE custom_outfits
ADD COLUMN canvas_data JSONB;
```

### canvas_data Structure

```json
{
  "version": 1,
  "placedItems": [
    {
      "id": "uuid",
      "wardrobeItemId": "uuid",
      "x": 0.5,
      "y": 0.3,
      "scale": 1.2,
      "zIndex": 2
    }
  ]
}
```

## Gesture Implementation

Using existing react-native-gesture-handler + react-native-reanimated:

- **Gesture.Pan()** - Drag to move
- **Gesture.Pinch()** - Resize (scale clamped 0.3–3.0)
- **Gesture.LongPress()** - Context menu (500ms)
- **Touch start** - Brings item to front (increment zIndex)

Positions normalized as 0–1 for device-independence.

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Primary mode | Free-placement only | User priority, simplifies architecture |
| Entry point | Selection mode in closet | Explicit, clear flow |
| Item picker | Bottom drawer with tabs | Matches ACloset pattern |
| Gestures | Drag + pinch only | Rotation rarely needed for flat-lays |
| Layer control | Auto + long-press menu | Intuitive default with explicit override |
| Duplicates | Not allowed | Simpler state management |
| Item removal | Long-press menu | Consistent with layer controls |
| Persistence | Backend first | No offline sync complexity |
| Schema | Add JSONB column | Backwards compatible |
| Initial placement | Center of canvas | Simple and predictable |
| Canvas style | Match app theme | Visual consistency |
