# StylHelpr — Professional Stylist System Contract

Version: 1.0  
Status: LOCKED  
Owner: Platform Intelligence  
Applies to surfaces:
- AI Stylist Suggestions
- Recommended Buys
- Ask Styla Chat
- Trips Capsule Engine
- AI Outfit Studio

This document defines what it means for StylHelpr to behave like a **professional personal stylist** across all surfaces, while sharing a **single central learning system + stylist brain** and (where applicable) being **weather-driven**.

---

## 0) Core Definition

StylHelpr meets “Professional Stylist Parity” only if:

1) Every surface produces **high-quality, stylist-curated** outputs (no generic / random results).  
2) Weather meaningfully influences the correct surfaces without breaking constraints.  
3) All surfaces share the **same**:
   - Central learning system
   - Stylist brain decision pipeline
   - Constraint enforcement (veto/quality gate)
4) Learning and feedback from one surface influences all other surfaces.

If any section below fails, the system is NOT considered professional-stylist-grade.

---

## 1) Single Stylist Brain Requirement (No Fragmented Intelligence)

### Requirement
All five surfaces MUST evaluate outfits/items through the same centralized decision pipeline (the “Stylist Brain”).

### Must be true
- Style profile is loaded consistently across surfaces.
- Wardrobe is loaded consistently across surfaces (when relevant).
- Feedback history is loaded consistently across surfaces.
- The same scoring/validation stack is invoked:
  - `styleJudge`
  - `eliteScoring`
  - `tasteValidator`
  - `styleVeto`
  - `stylistQualityGate`

### Forbidden
- Any surface implementing its own “mini brain” scoring/ranking logic that bypasses the central pipeline.
- Any surface skipping veto/quality gates “because it’s faster.”
- Any surface generating final outputs without passing the same constraint enforcement.

### Proof required (for audits)
- File:line evidence showing shared brain invocation from each surface.
- Evidence that veto + quality gating are in the call path before final output.

---

## 2) Central Learning System Requirement (Read + Write + Influence)

### Requirement
All surfaces must participate in a single learning loop.

### 2.1 Read requirements (every surface)
Each surface MUST read the learning signals needed to avoid repeating mistakes and to personalize outcomes, including:
- Likes/dislikes (items, outfits, attributes)
- Avoid lists and expanded avoid families (colors/materials/patterns)
- Successful outcomes (saves, wears, purchases)
- Negative outcomes (skips, removals, “not me,” “too loud,” etc.)
- Preference trends (silhouette, formality, comfort, palette, etc.)

### 2.2 Write requirements (every surface)
Each surface MUST write learning events when the user interacts, including:
- Final selections shown to user
- Items/outfits saved
- Items/outfits dismissed
- Chat corrections (“don’t do that,” “I hate X”)
- Outfit Studio refinements (“remove blazer,” “swap shoes”)
- Trip packing accept/reject and per-item feedback
- Purchase clicks / conversions / ignores (Recommended Buys)

### 2.3 Cross-surface influence requirement
Learning created in ONE surface must affect scoring/selection behavior in ALL OTHER surfaces.

Example invariants:
- If user repeatedly removes structured jackets in Outfit Studio, Trips + AI Stylist + Recommended Buys must reduce structured jacket recommendations.
- If user flags “no red/magenta,” every surface must enforce it consistently.
- If user prioritizes comfort/walkability, all applicable surfaces must reflect it.

### Proof required (for audits)
- File:line evidence of learning reads and learning writes per surface.
- Evidence that learning signals change scoring outcomes (scoring deltas / ranking change) across surfaces.

---

## 3) Weather Intelligence Standard

### 3.1 Which surfaces are weather-driven?
- AI Stylist Suggestions: REQUIRED
- Trips Capsule Engine: REQUIRED
- Ask Styla Chat: REQUIRED when user question is weather/context related OR when outfit advice implies real-world conditions
- AI Outfit Studio: CONTEXTUAL (apply weather if not explicitly overridden/locked)
- Recommended Buys: OPTIONAL but climate-aware (do not recommend obviously climate-wrong items for the user’s typical climate/seasonality)

### 3.2 Weather must influence these decisions
- Fabric weight / insulation
- Layering strategy
- Coverage requirements
- Footwear practicality (rain, heat, snow)
- Material choice (breathability, water resistance)
- Heat/cold safety constraints (no sandals in freezing conditions, etc.)

### 3.3 Weather must NEVER override
- Avoid lists (colors/materials/patterns)
- Coverage no-go rules
- Body-type structural rules
- Formality floor (unless explicitly user-requested and still gated)

### Proof required (for audits)
- Evidence of weather context injection before scoring.
- Evidence of resulting selection differences under different weather conditions.
- Evidence constraints still veto climate-inappropriate items.

---

## 4) Professional Stylist Quality Standard (Output Quality)

A result is “professional stylist” only if it satisfies ALL:

### 4.1 Silhouette control
- Aligns with body type and proportion goals.
- Maintains coherent silhouette (top/bottom/outerwear balance).
- Avoids mismatched structure (e.g., overly boxy + overly loose without intention).

### 4.2 Color intelligence
- Undertone-aware (warm/cool/olive logic applied where available).
- Harmony across pieces (palette coherence).
- Contrast is intentional (not random).
- Avoid families enforced (no “close enough” violations).

### 4.3 Occasion/formality intelligence
- Formality aligned to the context.
- No violations of formality_floor.
- “Smart casual vs business vs formal” decisions are consistent and explainable.

### 4.4 Cohesion + curation
- Outfit reads as curated, not algorithmic.
- Avoids random noise pieces.
- Avoids filler advice (“it depends”) when the system has data.

### Proof required (for audits)
- Example outputs demonstrating silhouette/color/formality reasoning.
- Evidence that low-quality candidates are vetoed by quality gates.

---

## 5) Surface-Specific Requirements

### 5.1 AI Stylist Suggestions
- Must generate daily/occasion outfits that feel handpicked for the user.
- Must incorporate weather (required).
- Must apply learning + feedback strongly (required).

### 5.2 Trips Capsule Engine
- Must pack for forecast range, events, formality, and redundancy control.
- Must be weather-driven (required).
- Must apply learning + avoid rules (required).
- Must avoid overpacking / underpacking based on trip duration and laundry assumptions.

### 5.3 Ask Styla Chat
- Must answer like a stylist: structured, decisive, constraints-first.
- Must not hallucinate owned items.
- Must incorporate learning + profile.
- Must incorporate weather when relevant.

### 5.4 Recommended Buys
- Must recommend items that match the user’s style identity and gaps.
- Must respect avoid lists and strong dislikes.
- Must use central learning signals.
- Must be climate-aware (optional weather dependency, but cannot recommend obviously wrong climate items).

### 5.5 AI Outfit Studio
- Must refine outfits while preserving cohesion.
- Must treat user refinements as learning events.
- Must not break constraints when swapping/removing items.
- Weather applied contextually unless user locks the aesthetic against weather (still must not violate safety/constraints).

---

## 6) Audit Method (Binary Pass/Fail)

Any audit MUST produce a PASS/FAIL per section:

1) Single Stylist Brain Requirement
2) Central Learning System Requirement
3) Weather Intelligence Standard
4) Professional Stylist Quality Standard
5) Surface-Specific Requirements

Each PASS must include:
- File:line evidence
- Data flow proof (inputs → scoring/veto → outputs)
- Example scenario outputs (at least 2)

Any FAIL must include:
- Exact violation
- File:line evidence
- Minimal patch plan that does not break shared modules

---

## 7) Non-Negotiables

- No fragmented scoring brains per surface.
- No skipping veto/quality gates.
- No “generic GPT” filler as a substitute for stylist logic.
- No learning system that is write-only or read-only.
- No weather integration that can bypass constraints.

---

## 8) Completion Criteria (“Feature is Done”)

A surface is considered DONE only when:
- It passes all relevant requirements above,
- With proof from scenario runs,
- With deterministic reruns producing identical results,
- And with learning events verified as both written and read by at least one other surface.

End of contract.
