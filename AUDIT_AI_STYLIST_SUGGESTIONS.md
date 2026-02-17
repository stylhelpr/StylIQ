# Forensic Audit: AI Stylist Suggestions

**Scope:** Only the "AI Stylist Suggestions" feature — what happens when a user taps "Suggest Outfits"
**Date:** 2026-02-16
**Method:** Read-only code trace. Every claim cites file + function. No opinions, no recommendations.

---

## SECTION 1 — High-Level Flow (Plain English)

When a user taps "Suggest Outfits," here is exactly what happens, step by step:

1. **The app sends a request** containing the user's wardrobe (all their clothing items with photos), the current weather, and any optional constraint they typed (e.g., "something for a wedding"). The backend verifies the user is logged in and hasn't exceeded 15 requests per minute.

2. **The system loads everything it knows about the user's taste.** Three pieces of information are fetched simultaneously, with a strict 200-millisecond time limit:
   - Their gender presentation (masculine, feminine, or mixed)
   - Their full style profile (~50 preferences: favorite colors, avoided colors, avoided materials, body coverage rules, preferred silhouettes, preferred fabrics, formality floor, walkability needs, etc.)
   - Their "fashion state" — a learned summary built over time from their likes, dislikes, and browsing behavior (favorite brands, favorite colors, avoided brands, etc.)

   If any of these fail to load in time, the system continues without them. It never blocks.

3. **The system loads the user's feedback history** — every time the user liked or disliked a specific clothing item, that score is retrieved. Items with a score of +2 or higher are "liked"; items at -2 or lower are "disliked."

4. **The wardrobe gets filtered.** Before the AI sees anything, certain items are removed:
   - Items at the cleaner (care status)
   - For masculine-presenting users: dresses, skirts, blouses, gowns, heels, ballet flats, earrings, bracelets, anklets, and purses
   - Items that were recently suggested (to promote variety, but only if the wardrobe is large enough to still have sufficient options)

5. **Every remaining item gets a weather score.** Temperature, rain, and wind affect each item differently. Short sleeves get boosted in heat; outerwear gets boosted in cold; suede gets penalized in rain; shorts get penalized below 68°F.

6. **Items are ranked by a blended score**: 60% weather fit + 40% user feedback. Items with extremely poor weather scores (below -5) are dropped entirely. The top 50 items are selected and sent to the AI.

7. **An AI (GPT-4o) is asked to create 6–9 outfit combinations** from those 50 items. The AI receives a detailed system prompt with rules: respect the weather, respect the user's feedback, maintain formality consistency within each outfit, respect the user's style profile, and honor any constraint the user typed. The AI responds with a structured list of outfit IDs and reasoning. The AI's creativity is set to "conservative" (temperature 0.2).

8. **The AI's response is validated and repaired.** If the top-ranked outfit contains items the user strongly dislikes, it's demoted. If any outfit is missing essential pieces (e.g., it has a top but no shoes), the system deterministically injects the best-matching item from the wardrobe, chosen by how well it coordinates with the outfit's "anchor" piece (considering color temperature, silhouette, material tier, and formality).

9. **Duplicate outfits are removed** — if two outfits share the same top+bottom (or same dress), the system swaps one of the anchor pieces.

10. **Formality coherence is enforced** — any outfit where the most formal piece and the least formal piece are more than 2 levels apart on a 5-point scale (athletic → casual → smart-casual → business → formal) is rejected.

11. **If there aren't enough candidates**, the system generates additional outfits synthetically — without calling the AI again — by anchoring on top-scoring items and building coordinated combinations using the same composition logic.

12. **All candidates are scored deterministically**: 40% average weather fitness + 30% average user feedback + 20% formality tightness penalty + 10% variety bonus, plus a composition coherence tie-breaker worth up to ±15% of the score. A daily-stable hash (based on user ID + today's date + anchor item) ensures the same user gets consistent results within a single day.

13. **A confidence check runs.** If the top outfit's confidence score (via sigmoid) falls below 0.4, the system makes one more AI call with a hint to focus on weather-appropriate, well-coordinated combinations. Better results from the retry replace weaker ones.

14. **Five post-processing quality gates run in sequence:**
    - Quality Gate: rejects athletic shoes + tailored top, heavy outerwear + shorts, multiple bold color families, warm/cool clashes without neutrals
    - Silhouette Diversity: penalizes showing three outfits that are all the same shape (all dresses, or all tailored, or all relaxed)
    - Canonicalization: forces clean structure — one top, one bottom, one pair of shoes; adds outerwear if it's cold, strips it if it's hot
    - Re-sort after any changes

15. **Taste validation runs.** This is the profile-enforcement layer. It checks 9 "hard fail" conditions — any one of which can kill an outfit or trigger a repair:
    - Cross-presentation violation (masculine user getting a dress)
    - Extreme weather contradiction (open sandals in freezing weather; heavy wool coat in heat)
    - Dress code mismatch (athletic items when business formal was requested)
    - Missing required slots (no shoes, no top, etc.)
    - Coverage violation (e.g., midriff exposure when user said no)
    - Avoided color present
    - Avoided material present
    - Below the user's formality floor
    - Violates walkability requirement (e.g., stilettos when user needs high walkability)

    If an outfit fails, the system attempts to swap the offending item for a valid alternative from the wardrobe. If repair succeeds, the outfit survives; if not, it's eliminated.

    It also applies 7 soft penalties (which lower score but don't kill the outfit): formality incoherence, fit preference mismatch, fabric-climate mismatch, disliked style match, style preference mismatch, avoided pattern present, silhouette mismatch.

16. **Elite scoring reranks outfits** based on how well they match the user's learned preferences: brand affinity, color affinity, category affinity, style affinity, presentation safety, fit preference, fabric preference, style preferences, disliked styles, profile-avoided colors, profile-avoided materials, pattern preferences, silhouette preference, contrast preference, and slot completeness. Each signal adds or subtracts points. Outfits are re-sorted by total score.

17. **Avoided colors are enforced one final time** — a triple-redundant guard. Any outfit still containing a color the user said to avoid is removed. If all outfits are eliminated, the system generates emergency replacements from wardrobe items that don't contain any avoided colors.

18. **The Style Veto checks structural coherence** — five universal clothing logic rules that apply regardless of personal taste (e.g., you cannot pair a blazer with gym shorts, or formal shoes with athletic pants).

19. **The Style Judge makes the final selection.** Starting from a score of 100, each surviving outfit is evaluated across 6 rule groups with capped penalties:
    - Formality Coherence (up to -35 points)
    - Silhouette Balance (up to -20 points)
    - Material Hierarchy (up to -20 points)
    - Color Harmony (up to -15 points, or +5 bonus for neutral-based outfits)
    - Intent Clarity (up to -25 points)
    - Occasion Appropriateness (up to -30 points, only for formal occasions like weddings/funerals/interviews)

    The top 3 outfits by score are selected and returned to the user.

20. **The app receives 3 outfits**, each with the clothing items (including photos), a weather summary, fashion context metadata (weather fit, silhouette type, color strategy, confidence level), and the AI's reasoning for each outfit.

---

## SECTION 2 — Data Inputs Used

### 2A. Weather

| What it represents | Where it enters | What it affects |
|---|---|---|
| Temperature (°F), precipitation (rain/snow/none), wind speed (mph) | `ai.service.ts:suggestVisualOutfits()` — passed in from the frontend via `body.weather` | Every item in the wardrobe gets a weather score. Items with score < -5 are hard-excluded. Weather accounts for 40% of the blended item ranking (via 60% weight in `0.6 * normWeather + 0.4 * normFeedback`), and 40% of the final outfit score. Also influences: outerwear injection/stripping in canonicalization, fabric-climate penalty in taste validation, extreme weather contradiction veto. |

### 2B. Wardrobe Metadata

| What it represents | Where it enters | What it affects |
|---|---|---|
| All user-owned clothing items with: name, main_category, subcategory, color, material, fit, formality_score, dress_code, brand, style_descriptors, style_archetypes, sleeve_length, layering, seasonality, waterproof_rating, care status, images | `ai.service.ts:suggestVisualOutfits()` — passed from frontend as `body.wardrobe` | This IS the raw material. Every outfit is built exclusively from items in the user's wardrobe. Item metadata drives weather scoring, composition scoring, formality estimation, material tier detection, silhouette classification, color family detection, presentation filtering, and all downstream quality gates. |

### 2C. User Feedback Scores

| What it represents | Where it enters | What it affects |
|---|---|---|
| Per-item preference scores (positive = liked, negative = disliked) accumulated over time | `ai.service.ts:getUserFeedbackContext()` → queries `user_pref_item` table | Items at score ≤ -2 are flagged as "disliked." If the AI's #1 outfit contains a strongly disliked item, it's demoted to #2. Feedback scores contribute 40% of the blended item ranking. A text summary of liked/disliked patterns is injected into the AI prompt. Feedback contributes 30% of the final deterministic outfit score. |

### 2D. Style Profile

| What it represents | Where it enters | What it affects |
|---|---|---|
| ~50 user-set preferences from the style_profiles table: fit preferences, fabric preferences, favorite/avoided colors, avoided materials, disliked styles, coverage rules, formality floor, walkability, silhouette preference, contrast preference, pattern preferences, body measurements, fashion boldness, budget range, style icons, lifestyle notes | `elite/stylistBrain.ts:loadStylistBrainContext()` → queries `style_profiles` table | Hard vetoes (P0): coverage no-go rules, avoided colors, avoided materials, formality floor, walkability requirement — any of these can kill an outfit in taste validation. Soft penalties (P1): fit mismatch, style preference mismatch, pattern avoidance, silhouette mismatch — these lower scores but don't eliminate. Elite scoring uses: fit preferences, fabric preferences, style preferences, disliked styles, avoided colors, avoided materials, pattern preferences, silhouette preference, contrast preference. The AI prompt receives style profile data for generation guidance. |

### 2E. Gender Presentation

| What it represents | Where it enters | What it affects |
|---|---|---|
| User's gender presentation setting: masculine, feminine, or mixed | `elite/stylistBrain.ts:loadStylistBrainContext()` → queries `users.gender_presentation` | If masculine: dresses, skirts, blouses, gowns, heels, ballet flats, earrings, bracelets, anklets, and purses are removed from the wardrobe before the AI sees it. A masculine post-filter also runs AFTER the AI returns results (twice — once after initial parse, once after all injection/repair). The AI prompt receives a gender directive. Elite scoring penalizes cross-presentation items. Taste validation has a cross-presentation hard fail. |

### 2F. Implicit Presentation Inference

| What it represents | Where it enters | What it affects |
|---|---|---|
| If the user is set to "mixed" AND has no style profile, the system infers presentation from wardrobe composition | `presentationFilter.ts:inferImplicitPresentation()` — called from `ai.service.ts` | If ≥70% of non-accessory wardrobe items are feminine-coded → treated as feminine. If ≤5% → treated as masculine. Otherwise → stays mixed (no filtering). |

### 2G. Fashion State (Learned Preferences)

| What it represents | Where it enters | What it affects |
|---|---|---|
| A summary derived from the user's behavioral history: top brands, avoided brands, top colors, avoided colors, top styles, avoided styles, top categories, price bracket, cold-start flag | `FashionStateService.getStateSummary()` — called via `loadStylistBrainContext()` | Elite scoring uses all of these signals for reranking. Brand affinity: +10 per match, -15 per avoided brand. Color affinity: +5 per liked color match, -8 per avoided color. Category affinity: +3. Style affinity: +5 per match, -8 per avoided. |

### 2H. User Constraint / Query

| What it represents | Where it enters | What it affects |
|---|---|---|
| Optional free-text constraint the user types, e.g., "something for a wedding" or "casual Friday" | `body.constraint` — passed through to the AI prompt and to judge/veto context | The AI receives this as the primary styling instruction. The Style Judge checks it for occasion keywords (church, wedding, funeral, interview, etc.) to activate the Occasion Appropriateness penalty group (up to -30 points). The Style Veto checks it for formal context to activate structural coherence rules. The Occasion Filter uses it to block inappropriate items (Hawaiian shirts, slides, athletic tops) in formal contexts. The Taste Validator uses it to set requested dress code. |

### 2I. Variety Exclusion Cache

| What it represents | Where it enters | What it affects |
|---|---|---|
| An in-memory cache (per user) of item IDs from the previous suggestion response | `ai.service.ts` — `this.visualExclusionCache` (in-memory Map) | Items suggested in the previous call are excluded from the next call's wardrobe, to promote outfit variety. Only applies if the wardrobe has ≥8 items and exclusion still leaves ≥3 tops, 3 bottoms, 3 shoes (or ≥2 dresses). Resets if the pool becomes too small. |

### 2J. Date (Tie-Breaker)

| What it represents | Where it enters | What it affects |
|---|---|---|
| Today's date | `ai.service.ts` — used in `hash(userId + today's date + anchor)` | Provides a daily-stable tie-breaker in the deterministic scoring phase. Ensures the same user sees consistent results within a day, but results naturally rotate day to day. |

---

## SECTION 3 — Candidate Creation

### How Outfits First Get Created

There are two creation pathways:

**Primary: AI-Generated (GPT-4o)**
- The LLM receives the top 50 wardrobe items (ranked by weather + feedback blended score) serialized as JSON, along with the weather, user preferences, feedback summary, style profile, and any constraint.
- The LLM is asked to create **6–9 outfit combinations**, each consisting of item IDs from the provided wardrobe.
- The LLM responds in structured JSON format with: item IDs per outfit, a rank, a summary, and reasoning.
- Source: `ai.service.ts:suggestVisualOutfits()` lines ~4080–4088, model `gpt-4o`, temperature `0.2`.

**Secondary: Synthetic Expansion**
- If the AI-generated pool (after filtering) has fewer than 18 candidates, the system creates additional outfits without calling the AI again.
- Synthetic outfits are built by anchoring on the highest-scored wardrobe items and selecting coordinating pieces using the composition engine (palette matching, silhouette matching, material tier matching, formality matching).
- Both separates-based (top + bottom + shoes) and dress-based (dress + shoes) synthetics are generated.
- Pre-filtered to exclude avoided colors before construction.
- Source: `ai.service.ts:suggestVisualOutfits()` lines ~4598–4753.

**Retry (Conditional)**
- If the top outfit's confidence (sigmoid of final score) is below 0.4 after deterministic scoring, a second GPT-4o call is made with a hint to focus on weather-appropriate, well-coordinated combinations.
- Retry results are merged into the pool if they score better than existing candidates.
- Source: `ai.service.ts:suggestVisualOutfits()` lines ~5218–5293.

### How Many Get Created

- The AI is asked for 6–9.
- Synthetic expansion brings the pool up to 18.
- After all filtering and scoring, exactly **3 are returned**.

### What Controls the Options the AI Sees

1. **Weather pre-filter**: items scoring below -5 on weather are hard-dropped.
2. **Presentation filter**: feminine-coded items removed for masculine users.
3. **Care status filter**: items at the cleaner are removed.
4. **Variety exclusion**: recently-suggested items removed (if wardrobe is large enough).
5. **Blended ranking**: remaining items sorted by `0.6 * weatherScore + 0.4 * feedbackScore`, top 50 selected.
6. **Token limit**: the 50-item cap prevents prompt overflow.

---

## SECTION 4 — Filtering & Repair

The following gates run in this exact order. Each either passes, rejects, or repairs.

### Gate 1: Disliked Item Guard
- **What it checks:** Whether the AI's Rank 1 outfit contains items with feedback score ≤ -2.
- **On failure:** Swaps Rank 1 and Rank 2 (demotion, not elimination).
- **Source:** `ai.service.ts` lines ~4094–4141

### Gate 2: Masculine Post-Filter (Pass 1)
- **What it checks:** Whether any item in each outfit is feminine-coded (via `isFeminineItem()`).
- **On failure:** The feminine item is removed from the outfit.
- **Only runs for:** Masculine-presenting users.
- **Source:** `ai.service.ts` lines ~4169–4189, `presentationFilter.ts:isFeminineItem()`

### Gate 3: Completeness Injection
- **What it checks:** Whether each outfit has all required slots: (top + bottom + shoes) or (dress + shoes).
- **On failure:** Injects the best-matching item from wardrobe pools, selected by composition scoring against the outfit's anchor piece. Weather pool thresholds degrade in tiers (strict → relaxed → degraded) to always find something.
- **Repair, not rejection.**
- **Source:** `ai.service.ts` lines ~4191–4437, `composition.ts:selectAnchorItem()`, `buildCompositionContext()`, `rankByComposition()`

### Gate 4: Anchor Deduplication
- **What it checks:** Whether two or more outfits share the same top+bottom combination (or same dress).
- **On failure:** Swaps the duplicate anchor piece from the category pool.
- **Repair, not rejection.**
- **Source:** `ai.service.ts` lines ~4439–4538

### Gate 5: Formality Coherence Gate
- **What it checks:** Whether max(formality) - min(formality) across non-accessory items exceeds 2 on a 0–4 scale (0=athletic, 1=casual, 2=smart-casual, 3=business, 4=formal).
- **On failure:** Outfit is rejected (removed from pool).
- **Source:** `ai.service.ts` lines ~4540–4596

### Gate 6: Quality Gate (in post-processing)
- **What it checks:** Five sub-rules:
  - Average weather score < -1
  - Athletic shoes + tailored top
  - Heavy outerwear + shorts
  - More than 1 bold color family
  - Warm + cool color clash without neutral base
- **On failure:** Outfit is rejected.
- **Source:** `ai.service.ts` — `qualityGateFilter()` in `applyPostProcessing()` lines ~4983–5213

### Gate 7: Canonicalization
- **What it checks:** Whether structure is clean (one top, one bottom, one shoes). Adds outerwear if cold; strips outerwear if hot.
- **On failure:** Repairs structure, rescores if changed.
- **Source:** `ai.service.ts` — `canonicalizeOutfit()` in `applyPostProcessing()`

### Gate 8: Masculine Post-Filter (Pass 2)
- **What it checks:** Same as Pass 1 — re-runs `isFeminineItem()` after all injection and repair.
- **On failure:** Feminine items removed.
- **Source:** `ai.service.ts` lines ~5296–5314

### Gate 9: Hard Completeness Gate
- **What it checks:** Final fail-closed check that every outfit has (top + bottom + shoes) or (dress + shoes).
- **On failure:** Outfit is eliminated. No repair at this stage.
- **Source:** `ai.service.ts` lines ~5316–5333

### Gate 10: Occasion Filter
- **What it checks:** If the user's query implies a formal occasion (church, wedding, funeral, interview, etc.), blocks items that are universally inappropriate: Hawaiian/loud floral shirts, athletic casual tops (hoodies, graphic tees, tank tops, crop tops), open casual footwear (slides, flip-flops, sandals, crocs), and loud-colored tailoring (neon blazers, etc.).
- **On failure:** Item is excluded from the outfit.
- **Source:** `occasionFilter.ts:isOccasionAppropriate()`

### Gate 11: Taste Validation (9 Hard Fails)
- **What it checks (each a separate sub-check):**
  1. **Cross-presentation:** Masculine user gets a feminine-coded item (or vice versa) — based on `presentation_code` field
  2. **Extreme weather contradiction:** Open sandals in freezing/cold weather; heavy wool/down/sherpa/fleece outerwear in hot weather
  3. **Dress code mismatch:** Athletic/ultra-casual items when formal/business was requested
  4. **Missing required slots:** No top, no bottom, or no shoes (with exceptions for swimwear and activewear)
  5. **Coverage no-go:** User said "no midriff exposure" but outfit has a crop top; "no leg exposure" but has mini skirt; "no shoulder exposure" but has strapless top; "no cleavage" but has plunging neckline
  6. **Avoided color present:** Item's color matches any color in the user's avoid_colors list (with synonym expansion for "navy" variants)
  7. **Avoided material present:** Item's material matches any material in the user's avoid_materials list
  8. **Below formality floor:** Item's formality rank is 2+ ranks below the user's minimum (with 1-step tolerance)
  9. **Walkability violation:** Stilettos/platform heels when user requires High walkability; stilettos for Medium

- **On failure:** System attempts per-item repair — swaps the offending item from wardrobe slot pools. If repair succeeds, outfit survives. If not, outfit is invalid and eliminated.
- **Source:** `elite/tasteValidator.ts:validateOutfit()`

### Gate 11b: Taste Validation (7 Soft Penalties)
- **Only run if no hard fails.** Each penalty subtracts 3 points from coherence score:
  1. Formality incoherence (formality score range > 4 across items)
  2. Fit preference mismatch (user wants slim but item is oversized, or vice versa)
  3. Fabric-climate mismatch (wool in hot weather, linen in cold)
  4. Disliked style match (item's style descriptors match user's disliked styles)
  5. Style preference mismatch (no items match any of the user's style preferences)
  6. Avoided pattern present (item has a pattern the user avoids)
  7. Silhouette mismatch (user prefers structured but item is relaxed, or vice versa)
- **Source:** `elite/tasteValidator.ts:validateOutfit()`

### Gate 12: Avoided Color Final Guards (Triple Redundant)
- **Three separate passes** of avoid-color enforcement:
  1. Post-elite filter: removes outfits with avoided colors, backfills from candidate pool
  2. If all eliminated: `_regenerateAvoidSafe()` creates emergency outfits from non-avoided items only
  3. Return-time guard: final fail-closed check with expanded color synonyms
- **Source:** `ai.service.ts` lines ~5954–6252

### Gate 13: Style Veto
- **What it checks:** Five universal structural coherence rules (not taste — universal clothing logic):
  1. Tailored upper (blazer, dress shirt) + athletic lower (gym shorts, joggers) — **VETOED**
  2. Formal footwear (oxfords, loafers, brogues) + athletic lower — **VETOED**
  3. Formal context (wedding, funeral, interview) + exposed athleticwear (shorts, slides, hoodie) — **VETOED**
  4. Tailored jacket (blazer, sport coat) + casual open footwear (sandals, flip-flops, slides) — **VETOED**
  5. Covered formal upper (blazer, dress shirt) + bare-leg lower (shorts, mini skirt) — **VETOED**
- **On failure:** Outfit is rejected.
- **Source:** `styleVeto.ts:isStylisticallyIncoherent()`

---

## SECTION 5 — Scoring & Selection

### Deterministic Outfit Score (Pre-Elite)

Each outfit receives a composite score computed as:

```
finalScore = 0.4 × avgWeatherScore
           + 0.3 × avgFeedbackScore
           - 0.2 × formalitySpread
           + 0.1 × diversityBonus
           ± 0.15 × compositionCoherence (tie-breaker)
```

- **Weather (40%):** Average weather score across all items in the outfit. Strongest individual signal.
- **Feedback (30%):** Average user feedback score. Second strongest.
- **Formality spread (20% penalty):** How far apart the most formal and least formal items are. Higher spread = larger penalty.
- **Diversity bonus (10%):** Rewards outfits that differ from others in the pool (different anchor items).
- **Composition coherence (±15%):** Determined by `scoreOutfitComposition()` in `composition.ts`. Evaluates palette compatibility, silhouette harmony, material tier consistency, formality alignment, and redundancy penalty across all non-anchor items.
- **Daily stable tie-breaker:** `hash(userId + today's date + anchor)` provides consistent ordering within a day.

Source: `ai.service.ts` lines ~4755–4897, `composition.ts:scoreOutfitComposition()`

### Elite Scoring (Post-Processing Rerank)

After the deterministic score, outfits are reranked by elite scoring. This layer scores each outfit on **16 dimensions** from the user's style context:

| Signal | Match Bonus | Violation Penalty | Source |
|---|---|---|---|
| Brand affinity (top brands + preferred brands) | +10 per item | -15 per avoided brand | `eliteScoring.ts:scoreOutfit()` |
| Color affinity (liked colors) | +5 per item | -8 per avoided color | `eliteScoring.ts:scoreOutfit()` |
| Category affinity (top categories) | +3 per item | — | `eliteScoring.ts:scoreOutfit()` |
| Style affinity (top styles) | +5 per token | -8 per avoided style | `eliteScoring.ts:scoreOutfit()` |
| Presentation safety | — | -15 per cross-presentation item | `eliteScoring.ts:scoreOutfit()` |
| Fit preference | +4 per match | — | `eliteScoring.ts:scoreOutfit()` |
| Fabric preference | +3 per match | — | `eliteScoring.ts:scoreOutfit()` |
| Style preferences (profile) | +3 per match | — | `eliteScoring.ts:scoreOutfit()` |
| Disliked styles (profile) | — | -6 per match | `eliteScoring.ts:scoreOutfit()` |
| Profile avoid_colors (P0) | — | -10 per match | `eliteScoring.ts:scoreOutfit()` |
| Profile avoid_materials (P0) | — | -10 per match | `eliteScoring.ts:scoreOutfit()` |
| Pattern preferences | +2 per match | -5 per avoided pattern | `eliteScoring.ts:scoreOutfit()` |
| Silhouette preference | +2 per match | -3 per mismatch | `eliteScoring.ts:scoreOutfit()` |
| Contrast preference | +3 when matched | — | `eliteScoring.ts:scoreOutfit()` |
| Slot completeness | +5 if complete | — | `eliteScoring.ts:scoreOutfit()` |

**Fail-open rule:** If no style-profile signal fires across ANY outfit, the original order is preserved (elite scoring does NOT rerank).

### Style Judge (Final Selection)

The final arbiter. Each outfit starts at **100 points**. Six rule groups apply capped penalties:

| Rule Group | Max Penalty | What Triggers It |
|---|---|---|
| **Formality Coherence** | -35 | Formality spread ≥ 4 across items (-20); athletic + tailored mixed (-25); casual bottoms/shoes in formal request (-30); suit pieces in smart-casual request (-15) |
| **Silhouette Balance** | -20 | All three zones (top+bottom+shoes) are bulky (-20); tailored top + oversized athletic bottom (-15); tailored outfit + work boots (-20) |
| **Material Hierarchy** | -20 | Tailoring materials + casual materials mixed (-15); formal item + athletic material (-20) |
| **Color Harmony** | -15 / +5 bonus | More than 4 color families (-10); neon + earth tones mixed (-10); neutral base + ≤1 non-neutral family (+5 bonus) |
| **Intent Clarity** | -25 | Athletic + tailored items mixed (-20); formal requested but avg formality < 5 (-25); casual requested but avg > 7 (-25) |
| **Occasion Appropriateness** | -30 | Only in formal occasions (church, wedding, funeral, interview): jeans (-25); loud/Hawaiian shirts (-25); loud colors on tailoring (-20) |

**Final formula:** `total = 100 + sum(penalties) + sum(bonuses)`, clamped to [0, 100].
**Selection:** Top 3 by score. Ties broken by original index (stable sort).

Source: `styleJudge.ts:scoreOutfit()`, `selectTopOutfits()`

### Which Signals Are Strongest vs. Weakest

**Strongest (can eliminate an outfit entirely):**
1. Hard fails in taste validation (any one = kill or force repair)
2. Style Veto (instant kill, no repair)
3. Formality coherence gate (pre-scoring elimination)
4. Avoided color guards (triple-redundant elimination)
5. Quality gate (pre-scoring elimination)

**Strong (major scoring influence):**
1. Weather fitness (40% of deterministic score; 40% of blended item ranking)
2. User feedback (30% of deterministic score; 40% of item ranking)
3. Formality Coherence judge penalty (up to -35 from 100)
4. Occasion Appropriateness judge penalty (up to -30)
5. Brand avoidance in elite scoring (-15 per item)
6. Presentation safety in elite scoring (-15 per cross-presentation item)

**Moderate:**
1. Composition coherence (±15% tie-breaker)
2. Elite color/style affinity penalties (-8)
3. Elite disliked style penalty (-6)
4. Material Hierarchy judge penalty (up to -20)
5. Silhouette Balance judge penalty (up to -20)
6. Intent Clarity judge penalty (up to -25)

**Weakest (incremental nudges):**
1. Category affinity (+3)
2. Pattern preference (+2 / -5)
3. Silhouette preference (+2 / -3)
4. Fabric preference (+3)
5. Contrast preference (+3)
6. Diversity bonus (10% of deterministic score)
7. Color harmony bonus (+5)

### Which Systems Can Override Others

- **Taste Validator hard fails** override everything — they can eliminate outfits that scored highly on all other metrics.
- **Style Veto** overrides everything — an outfit can score 100/100 on the Style Judge but still be vetoed for structural incoherence.
- **Avoided color guards** override everything — triple-redundant, can eliminate all candidates and force emergency regeneration.
- **Elite scoring** can reorder the top 3 selected by the deterministic scorer, but only if style signals actually fire.
- **Style Judge** makes the final pick from whatever survived all previous gates.
- **The AI (GPT-4o)** proposes but does NOT decide — every proposal is subject to all downstream gates.

---

## SECTION 6 — Final Guarantees

Based on the code, the system guarantees the following:

### Weather Appropriateness
- Items with weather score < -5 are hard-excluded before the AI sees them. (Source: `ai.service.ts` blended ranking)
- Outfits with average weather score < -1 are rejected by the Quality Gate. (Source: `ai.service.ts` — `qualityGateFilter`)
- Extreme weather contradictions (open sandals in freezing; heavy wool in hot) are hard-failed by Taste Validation. (Source: `tasteValidator.ts:checkWeatherContradiction()`)
- Canonicalization adds outerwear in cold weather and strips it in hot weather. (Source: `ai.service.ts` — `canonicalizeOutfit`)

### Presentation Consistency
- For masculine users: feminine items are removed from wardrobe before AI generation, removed again after AI responds (twice), and penalized in both Taste Validation and Elite Scoring. Five layers of enforcement. (Source: `ai.service.ts`, `presentationFilter.ts`, `tasteValidator.ts`, `eliteScoring.ts`)
- For feminine users: no items are excluded.
- For mixed: all items are allowed.

### Color Avoidance
- Avoided colors are enforced in THREE separate layers:
  1. Taste Validation hard fail with repair attempt (Source: `tasteValidator.ts:checkAvoidColors()`)
  2. Post-elite deterministic filter with backfill and emergency regeneration (Source: `ai.service.ts` lines ~6078–6152)
  3. Return-time guard with expanded synonyms and emergency regeneration (Source: `ai.service.ts` lines ~6165–6253)
- Synonym expansion covers: navy → navy blue, dark navy, midnight, ink (bidirectional). (Source: `tasteValidator.ts:expandAvoidColors()`)

### Structural Completeness
- Every returned outfit is guaranteed to have either (top + bottom + shoes) or (dress + shoes). Enforced by:
  1. Completeness injection (repair phase) (Source: `ai.service.ts` lines ~4191–4437)
  2. Hard completeness gate (final check) (Source: `ai.service.ts` lines ~5316–5333)
  3. Required slots check in Taste Validation (Source: `tasteValidator.ts:checkRequiredSlots()`)

### Formality Coherence
- Outfits with formality spread > 2 (on a 0–4 scale) are eliminated by the formality coherence gate. (Source: `ai.service.ts` lines ~4540–4596)
- The Style Judge further penalizes formality spread ≥ 4 (on a 1–9 scale) by up to -35 points. (Source: `styleJudge.ts:penaltyFormalityCoherence()`)
- Taste Validation applies a soft penalty for formality incoherence (score range > 4 on a 1–10 scale). (Source: `tasteValidator.ts:penaltyFormalityIncoherence()`)

### Return Count
- The system always attempts to return exactly **3 outfits**. (Source: `styleJudge.ts:selectTopOutfits()` with `count = 3`)
- If fewer than 3 survive all gates, fewer are returned. The system does NOT pad with low-quality results.
- If all candidates are eliminated by avoided-color guards, emergency regeneration attempts to produce replacements.

### Structural Coherence
- Five universal clothing-logic rules are enforced by the Style Veto:
  1. No blazer + gym shorts
  2. No dress shoes + athletic pants
  3. No athletic wear in formal contexts
  4. No tailored jacket + sandals/flip-flops
  5. No formal long-sleeve upper + bare-leg lower
- (Source: `styleVeto.ts:isStylisticallyIncoherent()`)

### Rate Limiting
- Maximum 15 suggestion requests per user per minute. (Source: `ai.controller.ts` line 21)

---

## SECTION 7 — What the System Does NOT Consider

The following factors are **provably not used** in the suggestion selection pipeline:

1. **Body measurements** — The style profile loads height, weight, chest, waist, hip, shoulder_width, inseam, shoe_size from the DB, but NONE of these values are referenced in any scoring, filtering, or selection logic in the suggestion pipeline. They are loaded but unused by this feature.

2. **Skin tone / undertone / hair color / eye color** — Loaded from style_profiles but not referenced in any suggestion pipeline logic. No color-to-complexion matching occurs.

3. **Budget / price** — `budget_min`, `budget_max`, and item `price` are loaded but not used in scoring or filtering. A $20 t-shirt is treated identically to a $2000 blazer.

4. **Item age / purchase date / wear frequency** — No timestamps or usage history are factored into selection. A brand-new item and a 5-year-old item are treated equally.

5. **Seasonal trends / fashion calendar** — The system checks item `seasonality` (SS/FW/ALL_SEASON) only indirectly via weather scoring (sleeve length, outerwear). There is no awareness of Spring 2026 runway trends, seasonal color palettes, or fashion week influence.

6. **Social context beyond occasion keywords** — The system detects formal occasions (wedding, funeral, church, interview) via keyword matching. It does NOT understand nuanced social contexts like "first date," "music festival," "casual Friday at a tech startup vs. law firm," or cultural dress codes.

7. **Other users' preferences** — No collaborative filtering. The system does not look at what similar users wear or like. Each user's suggestions are entirely self-contained.

8. **Item photos / visual analysis** — While item images are included in the response for display, the suggestion pipeline does NOT perform any visual analysis of the photos. All decisions are based on structured metadata (category, color, material, subcategory, name, etc.), not pixel data.

9. **Time of day** — No distinction between morning, afternoon, or evening suggestions.

10. **Specific brand styling rules** — While brand affinity affects scoring (+10/-15), there are no brand-specific styling rules (e.g., "pair Nike with Nike" or "don't mix luxury and fast fashion").

11. **Outfit history beyond the immediate previous call** — The variety exclusion cache only remembers the LAST suggestion call. There is no long-term outfit rotation or "you wore this combination last week" awareness.

12. **Proportions / body shape styling rules** — Despite loading `proportions` from the style profile, there is no logic that says "apple body shape should emphasize X" or "petite users should avoid Y."
