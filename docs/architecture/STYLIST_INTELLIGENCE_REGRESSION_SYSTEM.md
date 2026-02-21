# StylHelpr — Stylist Intelligence Regression System

Version: 1.0
Status: REQUIRED FOR TIER 4 VALIDATION

This system guarantees:
- Deterministic stylist outputs
- Cross-surface learning coherence
- Weather-driven correctness
- No scoring drift
- No silent regressions

AI audits are not sufficient.
This regression system enforces truth mechanically.

---

# 1. Deterministic Scenario Harness

## 1.1 Purpose

Every core surface must be tested using fixed scenarios with frozen inputs.

Surfaces:
- AI Stylist Suggestions
- Recommended Buys
- Ask Styla Chat
- Trips Capsule Engine
- AI Outfit Studio

---

## 1.2 Required Scenario Set

The following scenarios must exist as test fixtures:

### S1 — Hot Climate Casual
- Location: Miami
- Weather: 92°F
- Context: Casual day
- Body type: Rectangle
- Avoid: Red family
- Undertone: Olive

### S2 — Cold Business Formal
- Location: NYC
- Weather: 28°F
- Context: Business formal
- Formality floor: 8
- Avoid materials: Polyester

### S3 — Trip Multi-Context
- Location: Dubai
- 7 days
- 3 formal events
- 2 casual outings
- High heat

### S4 — Strong Dislike Reinforcement
- User has rejected structured blazers 5 times.

### S5 — Comfort Priority
- Walkability requirement: High
- Avoid narrow shoes

These inputs must be static JSON fixtures.

---

# 2. Snapshot Output Testing

For each scenario + surface:

1. Run evaluation
2. Capture:
   - Selected item IDs
   - Ranking scores
   - Weather influence flags
   - Learning modifiers applied
3. Hash the final output
4. Store snapshot

If hash changes without intentional update → FAIL CI.

This prevents silent logic drift.

---

# 3. Cross-Surface Learning Verification

This is mandatory.

## Test Case: Learning Propagation

1. In Outfit Studio:
   - Reject structured blazer
2. Persist learning event
3. Re-run:
   - AI Stylist Suggestions
   - Recommended Buys
   - Trips

Expected:
- Structured blazer score decreases
- Alternative silhouette rises
- Ranking order changes deterministically

If not → FAIL.

---

# 4. Weather Injection Verification

Each weather-driven surface must:

- Inject weather before scoring
- Modify candidate pool
- Influence material filtering
- Influence footwear logic

Test:

Run scenario with:
- 92°F
- 28°F

Compare:
- Fabric selection
- Layering count
- Coverage logic

If output does not change appropriately → FAIL.

---

# 5. Shared Brain Enforcement Test

Each surface must prove invocation of:

- styleJudge
- eliteScoring
- tasteValidator
- styleVeto
- stylistQualityGate
- learning-events

This is validated via:

- Import existence
- Execution path tracing
- Mock injection test

If any surface bypasses stack → FAIL.

---

# 6. Professional Stylist Quality Snapshot

For at least 2 scenarios per surface:

Store structured reasoning output.

Must include:
- Silhouette logic
- Color harmony logic
- Climate logic
- Formality alignment

If reasoning structure disappears → FAIL.

---

# 7. CI Enforcement Rule

CI must block merge if:

- Snapshot hash changes
- Learning propagation fails
- Weather variation fails
- Shared brain invocation missing
- Constraint enforcement bypassed

No exceptions.

---

# 8. What This System Guarantees

If all tests pass:

- All features share one brain
- All features influence each other
- Weather logic is real
- Learning is real
- No regressions slip through
- Outputs are stable
- Tier 4 contract is mechanically enforced

This removes reliance on:
- AI opinion
- Subjective audits
- Vague "quality" judgments

The system becomes self-validating.
