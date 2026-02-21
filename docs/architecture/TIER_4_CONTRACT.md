# StylHelpr — Tier 4 Intelligence Contract

Version: 1.0  
Status: LOCKED  
Applies to:  
- AI Stylist Suggestions  
- Recommended Buys  
- Ask Styla Chat  
- Trips Capsule Engine  
- AI Outfit Studio  

---

## Definition

A feature is considered **Tier 4** only if it satisfies ALL categories below.

Failure in any category = NOT Tier 4.

No partial credit.

---

# 1. Deterministic Intelligence

The system must produce identical outputs for identical inputs.

### Requirements:
- No unseeded randomness
- No Date.now() in decision paths
- Stable sorting
- Deterministic scoring
- Weather integration must be cache-stable
- Identical input → identical output hash

### Proof Required:
- File:line references
- Log evidence
- Hash comparison if applicable

---

# 2. Hard Constraint Enforcement

The system must strictly enforce:

- avoid_colors
- avoid_materials
- avoid_patterns
- coverage_no_go
- formality_floor
- walkability_requirement
- body_type structural logic
- undertone-aware color logic

Constraints must be enforced BEFORE final selection.

### Proof Required:
- Veto layer invocation
- Example blocked scenario
- File:line references

---

# 3. Shared Brain Usage

The feature MUST invoke shared Tier 4 modules:

- styleJudge.ts
- eliteScoring.ts
- tasteValidator.ts
- styleVeto.ts
- stylistQualityGate.ts
- learning-events.service.ts

No bypassing allowed.

### Proof Required:
- Import statements
- Invocation proof
- Data flow verification

---

# 4. Inventory Integrity / No Hallucination

The system must:

- Only reference DB-backed items
- Validate item IDs
- Reject non-owned wardrobe references
- Avoid generic GPT filler suggestions

### Proof Required:
- DB lookup evidence
- ID validation logic
- Rejection path for invalid items

---

# 5. Authority-Level Decision Structure

Output must demonstrate:

- Structured stylist reasoning
- Silhouette logic
- Color harmony logic
- Climate alignment
- Body type reasoning
- Explicit item references

No vague language.
No filler.
No “it depends.”

### Proof Required:
- Output template
- Validation layer enforcement

---

# 6. Central Learning Integration

The feature must:

- Read prior feedback
- Adjust scoring based on feedback
- Log new learning events
- Influence user fashion state deterministically

### Proof Required:
- Learning read
- Learning write
- Scoring delta proof

---

# Final Rule

If ANY category fails → Feature is NOT Tier 4.

Tier 4 status requires documented PASS in all 6 categories.
