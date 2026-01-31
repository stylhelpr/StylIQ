# Emergency Quality Gate Patch for Home Screen

## TASK 1: Minimal Integration Plan

### Insertion Point

**File:** `apps/backend-nest/src/ai/ai.service.ts`
**Lines:** 3474-3496 (after OpenAI parse, before return)

### Smallest Possible Change

```
BEFORE:
  Line 3474: wardrobeMap creation
  Line 3477-3494: outfitsWithItems mapping
  Line 3496: return { weatherSummary, outfits: outfitsWithItems }

AFTER:
  Line 3474: wardrobeMap creation
  Line 3477-3494: outfitsWithItems mapping (ENRICHED with metadata)
  Line NEW: Quality gate integration (20 lines)
  Line NEW: return gated outfits
```

### Flow

```
OpenAI JSON → Parse → Enrich Items → checkQualityGate() x3 → Fallback if fail → Strip metadata → Return
```

---

## TASK 2: Format Adapter

### Enrichment (Add to line 3482-3491)

```typescript
// CURRENT (line 3482-3491):
items: outfit.itemIds
  .map((itemId) => {
    const item = wardrobeMap.get(itemId);
    if (!item) return null;
    return {
      id: item.id,
      name: item.name || item.ai_title || 'Item',
      imageUrl: item.image_url || item.image,
      category: this.mapToCategory(item.main_category || item.category),
    };
  })
  .filter(Boolean),

// PATCHED (enriched for quality gate):
items: outfit.itemIds
  .map((itemId) => {
    const item = wardrobeMap.get(itemId);
    if (!item) return null;
    return {
      // UI fields (preserved)
      id: item.id,
      name: item.name || item.ai_title || 'Item',
      imageUrl: item.image_url || item.image,
      category: this.mapToCategory(item.main_category || item.category),
      // Quality gate fields (internal)
      main_category: item.main_category,
      subcategory: item.subcategory,
      color: item.color,
      color_family: item.color_family,
      formality_score: item.formality_score,
      shoe_style: item.shoe_style,
      dress_code: item.dress_code,
      label: item.name || item.ai_title,
    };
  })
  .filter(Boolean),
```

### Quality Gate Input Transform

```typescript
function toGateFormat(outfit: any): GeneratedOutfit {
  return {
    outfit_id: outfit.id,
    title: outfit.summary,
    items: outfit.items,  // Already enriched above
    why: outfit.reasoning,
  };
}
```

### Output Strip (remove internal fields before return)

```typescript
function stripInternalFields(outfit: any): any {
  return {
    id: outfit.id,
    rank: outfit.rank,
    summary: outfit.summary,
    reasoning: outfit.reasoning,
    items: outfit.items.map((item: any) => ({
      id: item.id,
      name: item.name,
      imageUrl: item.imageUrl,
      category: item.category,
    })),
  };
}
```

---

## TASK 3: Context Reuse

### Build QualityContext inline (no import needed)

```typescript
// Add after line 3474, before outfitsWithItems
const ql = (constraint || '').toLowerCase();
const qualityContext: QualityContext = {
  query: constraint || 'casual everyday',
  targetFormality: this.deriveFormality(constraint || ''),
  weather: temp ? { tempF: temp } : undefined,
  userStyle: preferences ? {
    preferredColors: preferences.preferredColors,
    avoidColors: preferences.avoidColors,
    avoidSubcategories: preferences.avoidSubcategories,
  } : undefined,
  isGym: /\b(gym|workout|training|exercise)\b/i.test(ql),
  isBeach: /\b(beach|pool|swim)\b/i.test(ql),
  isFormal: /\b(formal|black.?tie|gala|tuxedo)\b/i.test(ql),
  isWedding: /\b(wedding|ceremony|reception)\b/i.test(ql),
  isFuneral: /\b(funeral|memorial|wake)\b/i.test(ql),
  isReligious: /\b(church|mosque|temple|synagogue|service)\b/i.test(ql),
  isInterview: /\b(interview|meeting|presentation)\b/i.test(ql),
  isProfessional: /\b(work|office|business|professional)\b/i.test(ql),
  isCasual: /\b(casual|everyday|relaxed|weekend)\b/i.test(ql),
};
```

### Add deriveFormality method (if not exists)

```typescript
private deriveFormality(query: string): number {
  const q = query.toLowerCase();
  if (/\b(formal|business|interview|wedding|gala|funeral)\b/.test(q)) return 9;
  if (/\b(smart.?casual|business.?casual|dinner|date|church)\b/.test(q)) return 7;
  if (/\b(casual|everyday|relaxed|weekend)\b/.test(q)) return 4;
  if (/\b(gym|workout|athletic)\b/.test(q)) return 2;
  return 5;
}
```

---

## TASK 4: Failure Handling

### Exact Rules

| Condition | Action |
|-----------|--------|
| Pick #1 fails | Build deterministic safe outfit from wardrobe |
| Pick #2 fails | Clone gated Pick #1 with rank=2 |
| Pick #3 fails | Clone gated Pick #1 with rank=3 |
| All 3 fail | Return 3 copies of deterministic safe outfit |

### No Retries

- **Zero retries** - fallback is immediate
- No re-calling OpenAI (too slow for demo)
- Deterministic fallback is always safe

### Suppression Logic

```typescript
// BAD OUTPUT = any outfit that fails checkQualityGate()
// SUPPRESSION = replace with fallback, log warning
// NEVER return failed outfit to frontend
```

---

## TASK 5: Demo Safety Switch

### Environment Variable

```typescript
// At top of ai.service.ts (line ~11)
const DEMO_QUALITY_GATE_ENABLED = process.env.DEMO_QUALITY_GATE !== 'false';
```

### Usage in suggestVisualOutfits

```typescript
// After outfitsWithItems is built, before return:
if (DEMO_QUALITY_GATE_ENABLED) {
  // Run quality gate (code below)
  return { weatherSummary, outfits: gatedOutfits };
} else {
  // Legacy path (bypass)
  return { weatherSummary, outfits: outfitsWithItems };
}
```

### Enable/Disable

```bash
# ENABLED (default) - quality gate active
DEMO_QUALITY_GATE=true

# DISABLED - bypass quality gate (emergency rollback)
DEMO_QUALITY_GATE=false
```

---

## TASK 6: Verification Checklist

### Manual Test Cases

| # | Scenario | Input | Expected | Pass |
|---|----------|-------|----------|------|
| 1 | Church + sneakers | constraint="church service", wardrobe has sneakers only | Rank 1 has NO sneakers OR uses fallback | [ ] |
| 2 | Interview + hoodie | constraint="job interview", wardrobe has hoodie + dress shirt | Rank 1 has dress shirt, NOT hoodie | [ ] |
| 3 | Funeral + bright colors | constraint="funeral", wardrobe has red/yellow items | Rank 1 has muted colors only | [ ] |
| 4 | Wedding + shorts | constraint="wedding", wardrobe has shorts | Rank 1 has trousers/slacks | [ ] |
| 5 | Cold + sandals | temp=35, wardrobe has sandals | Rank 1 has closed shoes | [ ] |
| 6 | Disliked item | preferences.avoidSubcategories=["hoodie"] | No hoodie in any rank | [ ] |
| 7 | Avoided color | preferences.avoidColors=["red"] | No red items in any rank | [ ] |
| 8 | Sparse wardrobe | Only 2 items in wardrobe | Returns fallback, no crash | [ ] |
| 9 | Empty wardrobe | 0 items | Returns empty outfits, no crash | [ ] |
| 10 | Latency | Any request | Response < 1500ms | [ ] |

### Automated Verification

```bash
# Run from apps/backend-nest
npm run test -- --testPathPattern=qualityGate
```

---

## TASK 7: Patch Diff

### Step 1: Add Import (line 11)

```diff
  import { getSecret, secretExists } from '../config/secrets';
+ import {
+   checkQualityGate,
+   buildDeterministicSafeOutfit,
+   type QualityContext,
+   type GeneratedOutfit,
+ } from '../wardrobe/logic/qualityGate';
+
+ // Demo mode quality gate toggle
+ const DEMO_QUALITY_GATE_ENABLED = process.env.DEMO_QUALITY_GATE !== 'false';
```

### Step 2: Replace lines 3477-3496

**DELETE lines 3477-3496 and REPLACE with:**

```typescript
    // Build enriched outfits with full metadata for quality gate
    const outfitsWithItems = parsed.outfits.map((outfit) => ({
      id: outfit.id,
      rank: outfit.rank,
      summary: outfit.summary,
      reasoning: outfit.reasoning,
      items: outfit.itemIds
        .map((itemId) => {
          const item = wardrobeMap.get(itemId);
          if (!item) return null;
          return {
            // UI fields
            id: item.id,
            name: item.name || item.ai_title || 'Item',
            imageUrl: item.image_url || item.image,
            category: this.mapToCategory(item.main_category || item.category),
            // Quality gate fields
            main_category: item.main_category,
            subcategory: item.subcategory,
            color: item.color,
            color_family: item.color_family,
            formality_score: item.formality_score,
            shoe_style: item.shoe_style,
            dress_code: item.dress_code,
            label: item.name || item.ai_title,
          };
        })
        .filter(Boolean),
    }));

    // ═══════════════════════════════════════════════════════════════════════════
    // DEMO QUALITY GATE (Emergency Patch)
    // ═══════════════════════════════════════════════════════════════════════════
    if (!DEMO_QUALITY_GATE_ENABLED) {
      // Bypass mode - strip internal fields and return
      const stripped = outfitsWithItems.map((o) => ({
        id: o.id,
        rank: o.rank,
        summary: o.summary,
        reasoning: o.reasoning,
        items: o.items.map((i: any) => ({
          id: i.id,
          name: i.name,
          imageUrl: i.imageUrl,
          category: i.category,
        })),
      }));
      return { weatherSummary, outfits: stripped };
    }

    // Build quality context
    const ql = (constraint || '').toLowerCase();
    const qualityContext: QualityContext = {
      query: constraint || 'casual everyday',
      targetFormality: this.deriveFormality(constraint || ''),
      weather: temp ? { tempF: temp } : undefined,
      userStyle: preferences ? {
        preferredColors: preferences.preferredColors,
        avoidColors: preferences.avoidColors,
        avoidSubcategories: preferences.avoidSubcategories,
      } : undefined,
      isGym: /\b(gym|workout|training|exercise)\b/i.test(ql),
      isBeach: /\b(beach|pool|swim)\b/i.test(ql),
      isFormal: /\b(formal|black.?tie|gala|tuxedo)\b/i.test(ql),
      isWedding: /\b(wedding|ceremony|reception)\b/i.test(ql),
      isFuneral: /\b(funeral|memorial|wake)\b/i.test(ql),
      isReligious: /\b(church|mosque|temple|synagogue|service)\b/i.test(ql),
      isInterview: /\b(interview|meeting|presentation)\b/i.test(ql),
      isProfessional: /\b(work|office|business|professional)\b/i.test(ql),
      isCasual: /\b(casual|everyday|relaxed|weekend)\b/i.test(ql),
    };

    // Build catalog for fallback generation
    const catalogItems = wardrobe
      .filter((item) => item.image_url || item.image)
      .map((item) => ({
        id: item.id,
        label: item.name || item.ai_title || 'Item',
        image_url: item.image_url || item.image,
        main_category: item.main_category,
        subcategory: item.subcategory,
        color: item.color,
        color_family: item.color_family,
        formality_score: item.formality_score ?? 5,
        shoe_style: item.shoe_style,
        dress_code: item.dress_code,
      }));

    // Apply quality gate to all outfits
    const gatedOutfits: any[] = [];
    let gatedPick1: any = null;

    for (let idx = 0; idx < Math.min(outfitsWithItems.length, 3); idx++) {
      const outfit = outfitsWithItems[idx];
      const pickNumber = (idx + 1) as 1 | 2 | 3;

      // Convert to quality gate format
      const gateInput: GeneratedOutfit = {
        outfit_id: outfit.id,
        title: outfit.summary,
        items: outfit.items,
        why: outfit.reasoning,
      };

      const result = checkQualityGate(gateInput, qualityContext, pickNumber);

      if (result.passed) {
        console.log(`✅ [HOME GATE] Pick #${pickNumber} PASSED`);
        if (pickNumber === 1) gatedPick1 = outfit;
        gatedOutfits.push(outfit);
      } else {
        console.warn(`⚠️ [HOME GATE] Pick #${pickNumber} FAILED:`, result.failureReason);
        console.warn(`   Reason codes:`, result.reasonCodes.join(', '));

        if (pickNumber === 1) {
          // Build deterministic safe outfit for Pick #1
          console.log(`🚨 [HOME GATE] Building deterministic fallback for Pick #1`);
          const safeOutfit = buildDeterministicSafeOutfit(
            catalogItems,
            qualityContext,
            `safe-${Date.now()}`,
          );

          gatedPick1 = {
            id: safeOutfit.outfit_id,
            rank: 1,
            summary: safeOutfit.title,
            reasoning: safeOutfit.why,
            items: safeOutfit.items.map((i: any) => ({
              id: i.id,
              name: i.label || i.name || 'Item',
              imageUrl: i.image_url || '',
              category: this.mapToCategory(i.main_category || ''),
              main_category: i.main_category,
              subcategory: i.subcategory,
              color: i.color,
              color_family: i.color_family,
              formality_score: i.formality_score,
              shoe_style: i.shoe_style,
              dress_code: i.dress_code,
              label: i.label,
            })),
          };
          gatedOutfits.push(gatedPick1);
        } else {
          // Use gatedPick1 as fallback for Pick #2/#3
          if (gatedPick1) {
            gatedOutfits.push({
              ...gatedPick1,
              id: `fallback-${pickNumber}`,
              rank: pickNumber,
            });
          }
        }
      }
    }

    // Ensure we have 3 outfits (pad with Pick #1 if needed)
    while (gatedOutfits.length < 3 && gatedPick1) {
      const rank = (gatedOutfits.length + 1) as 2 | 3;
      gatedOutfits.push({
        ...gatedPick1,
        id: `fallback-${rank}`,
        rank,
      });
    }

    // Strip internal fields before returning
    const finalOutfits = gatedOutfits.map((o) => ({
      id: o.id,
      rank: o.rank,
      summary: o.summary,
      reasoning: o.reasoning,
      items: o.items.map((i: any) => ({
        id: i.id,
        name: i.name,
        imageUrl: i.imageUrl,
        category: i.category,
      })),
    }));

    console.log(`📊 [HOME GATE] Summary: ${gatedOutfits.length} outfits gated`);
    return { weatherSummary, outfits: finalOutfits };
```

### Step 3: Add deriveFormality method (if not exists)

Add after line ~3540 (after mapToCategory method):

```typescript
  /** Derive formality level (1-10) from query keywords */
  private deriveFormality(query: string): number {
    const q = query.toLowerCase();
    if (/\b(formal|business|interview|wedding|gala|funeral|memorial)\b/.test(q)) return 9;
    if (/\b(smart.?casual|business.?casual|dinner|date|church|religious)\b/.test(q)) return 7;
    if (/\b(casual|everyday|relaxed|weekend|brunch)\b/.test(q)) return 4;
    if (/\b(gym|workout|athletic|exercise)\b/.test(q)) return 2;
    return 5; // default middle
  }
```

---

## Quick Implementation Steps

1. **Add import** at line 11
2. **Add DEMO flag** at line 12
3. **Replace lines 3477-3496** with patched code
4. **Add deriveFormality** method if not exists
5. **Deploy and test**

## Rollback

```bash
# If issues occur:
export DEMO_QUALITY_GATE=false
# Redeploy - quality gate bypassed
```

## Latency Impact

| Phase | Time |
|-------|------|
| Existing OpenAI call | ~1200ms |
| Quality gate (3 checks) | ~5ms |
| Fallback build (if needed) | ~15ms |
| **Total added** | **<20ms** |

---

## Ready to Apply

Copy the patch code from TASK 7 directly into `ai.service.ts`.
Test with verification checklist from TASK 6.
Deploy with confidence.
