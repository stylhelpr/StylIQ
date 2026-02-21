# StylHelpr — Tier 4 Unified Intelligence System

Version: 8.0  
Status: LOCKED — NON-NEGOTIABLE  
Mode: DETERMINISTIC AUDIT  
Scope: Entire AI Styling Platform  

Applies to:
- AI Stylist Suggestions  
- Recommended Buys  
- Ask Styla Chat  
- Trips Capsule Engine  
- AI Outfit Studio  

---

# AUDIT MODE — DETERMINISTIC OUTPUT CONTRACT

You MUST:

- Use Temperature = 0 (if configurable)
- Produce identical structure every run
- Output ONLY PASS / FAIL / UNKNOWN
- Cite concrete evidence (filePath:lineRange OR logTag)
- Never assume missing code exists
- Never speculate
- Never propose improvements unless explicitly asked
- If evidence is missing → mark UNKNOWN

---

# REQUIRED OUTPUT TEMPLATE (MANDATORY)

1. Shared Brain Invocation: PASS|FAIL|UNKNOWN — Evidence:
2. No Illegal Imports: PASS|FAIL|UNKNOWN — Evidence:
3. Learning Read Before Score: PASS|FAIL|UNKNOWN — Evidence:
4. Canonical Learning Write Path: PASS|FAIL|UNKNOWN — Evidence:
5. Cross-Surface Learning Propagation: PASS|FAIL|UNKNOWN — Evidence:
6. Weather Injection Correctness: PASS|FAIL|UNKNOWN — Evidence:
7. Deterministic Safeguards: PASS|FAIL|UNKNOWN — Evidence:
8. Regression Test Enforcement: PASS|FAIL|UNKNOWN — Evidence:
9. No Bypass Architecture: PASS|FAIL|UNKNOWN — Evidence:

Final Verdict:
- TIER 4 COMPLIANT
- NOT TIER 4
- INDETERMINATE

No additional commentary allowed.

---

# 1. Tier 4 Definition

A surface is Tier 4 only if ALL conditions below are satisfied:

- Deterministic intelligence
- Hard constraint enforcement before scoring
- Shared brain usage (no independent ranking logic)
- Central learning read + canonical write
- Cross-surface learning propagation
- Weather injected before scoring (when applicable only)
- Professional stylist-level output reasoning
- Mechanical regression enforcement
- Zero bypass architecture

Failure in ANY category = NOT Tier 4.

---

# 2. Required Architecture

There is exactly ONE decision engine:

/src/ai/stylistBrain.ts

Must export:

evaluateWithStylistBrain(input: StylistBrainInput): StylistBrainOutput

This is the ONLY legal ranking path.

All five surfaces must call this function.

---

# 3. Shared Scoring Modules (Brain-Only)

/src/ai/modules/styleJudge.ts  
/src/ai/modules/eliteScoring.ts  
/src/ai/modules/tasteValidator.ts  
/src/ai/modules/styleVeto.ts  
/src/ai/modules/stylistQualityGate.ts  

If any surface imports these directly → FAIL.

---

# 4. Learning System

Required files:

/src/learning/learningEvents.service.ts  
/src/learning/learningReader.ts  
/src/learning/learningInfluence.ts  

Rules:

- learningReader.loadLearningState(userId) MUST be called before scoring
- learningInfluence MUST execute inside stylistBrain
- learningEvents.service.recordLearningEvent(...) is the ONLY write path
- Surfaces must NOT write directly
- Learning must deterministically alter ranking
- Learning created in ANY surface must influence ALL others

---

# 5. Weather Layer

Required files:

/src/weather/weatherContextBuilder.ts  
/src/weather/weatherCache.ts  

Weather injection REQUIRED for:
- AI Stylist Suggestions
- Trips Capsule Engine
- AI Outfit Studio (real-world outfits)

Weather OPTIONAL for:
- Recommended Buys
- Ask Styla Chat

Rules:

- Must inject BEFORE scoring
- Must be cache-stable
- Must influence filtering + ranking
- Must NOT override hard constraints
- No surface-level weather logic allowed

---

# 6. Surface Adapters (Thin Only)

/src/surfaces/aiStylistSuggestions.ts  
/src/surfaces/recommendedBuys.ts  
/src/surfaces/askStylaChat.ts  
/src/surfaces/tripsCapsuleEngine.ts  
/src/surfaces/aiOutfitStudio.ts  

Each surface must:

1. Normalize context
2. Call evaluateWithStylistBrain(...)
3. Return output unchanged

Surfaces may NOT:

- Re-rank
- Score
- Apply constraints
- Inject learning
- Inject weather
- Post-process ordering

---

# 7. Deterministic Safeguards

Required utilities:

/src/utils/stableSort.ts  
/src/utils/hashOutput.ts  
/src/utils/deterministicSeed.ts  

Rules:

- No Math.random()
- No Date.now()
- Stable sorting only
- Identical input → identical output hash

---

# 8. Canonical Brain Execution Order (Mandatory)

1. Context normalization
2. Deterministic candidate generation
3. Hard constraint enforcement (styleVeto + constraints)
4. styleJudge
5. eliteScoring
6. tasteValidator
7. stylistQualityGate
8. Learning influence
9. Final stableSort ranking
10. Output hashing

Reordering = FAIL.

---

# 9. Professional Stylist Output Standard

Outputs must demonstrate:

- Silhouette reasoning
- Undertone-aware color logic
- Occasion calibration
- Climate alignment (when applicable)
- Explicit constraint adherence

Outputs must NOT:

- Use filler language
- Use “it depends”
- Recommend non-DB items
- Violate known constraints

---

# 10. Regression Enforcement

Required test files:

/tests/tier4/snapshot.test.ts  
/tests/tier4/learningPropagation.test.ts  
/tests/tier4/weatherVariation.test.ts  
/tests/tier4/sharedBrainInvocation.test.ts  

CI must block merge if:

- Snapshot hash changes unexpectedly
- Learning propagation fails
- Weather variation fails
- Shared brain invocation missing
- Constraints bypassed

No exceptions.

---

# 11. Failure Mode Policy

If stylistBrain fails:

- No surface may fallback to alternate scoring
- No GPT-only fallback allowed
- Controlled failure must occur

---

# 12. Completion Criteria

A surface is Tier 4 only when:

- It calls evaluateWithStylistBrain
- It triggers canonical learning write
- Learning propagates cross-surface
- Weather verified when applicable
- Deterministic reruns match hash
- Regression tests pass
- No bypass architecture exists

---

END OF CONTRACT.