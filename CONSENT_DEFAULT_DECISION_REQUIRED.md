# CONSENT DEFAULT DECISION — Required Before Production

**Status:** 🟡 BLOCKS PRODUCTION (medium priority)
**Location:** `store/shoppingStore.ts:878`
**Decision Needed:** Legal/Compliance team review

---

## THE ISSUE

Current default:
```typescript
// store/shoppingStore.ts:878
trackingConsent: 'accepted' as 'pending' | 'accepted' | 'declined',
```

**Problem:** Events are queued immediately with `trackingConsent: 'accepted'` before the user has explicitly consented.

**GDPR Implication:** Article 7 requires "freely given, specific, informed and unambiguous" consent. Setting default to `'accepted'` implies pre-checked consent, which violates GDPR principles.

---

## THE FIX

Change line 878 to:
```typescript
trackingConsent: 'pending' as 'pending' | 'accepted' | 'declined',
```

**Impact:**
- Events will NOT be queued until user explicitly accepts
- Requires adding a consent UI flow in onboarding
- Legal compliance improved to GDPR-compliant

**Code Changes Required:**
1. Change default from `'accepted'` to `'pending'`
2. Add consent dialog/toggle in onboarding or settings
3. Only call `setTrackingConsent('accepted')` after user explicitly accepts

**Effort:** 1-2 days (UI flow design + implementation)

---

## OPTIONS

### Option A: GDPR-Compliant (RECOMMENDED)
- Change default to `'pending'`
- Add explicit consent flow
- Status: ✅ GDPR-compliant
- Timeline: Implement before production launch

### Option B: Keep Current (NOT GDPR-COMPLIANT)
- Keep default as `'accepted'`
- Accept GDPR compliance risk
- Status: ❌ GDPR non-compliant
- Timeline: Deploy as-is; legal review required

### Option C: Hybrid (PARTIALLY COMPLIANT)
- Add disclaimer: "Analytics enabled by default"
- Require explicit opt-out
- Status: ⚠️ Partial GDPR compliance (opt-out vs opt-in)
- Timeline: Implement UI flow; legal review required

---

## RECOMMENDATION

**Option A (GDPR-Compliant) is strongly recommended** because:
1. GDPR is enforceable across EU users
2. Fines are up to €20 million or 4% of global revenue
3. Implementation is straightforward (1-2 days)
4. Better for investor disclosure ("we're GDPR-compliant by design")

---

## WHAT TO DO NOW

1. **Legal Review:** Consult with legal/compliance team on consent approach
2. **Product Decision:** Decide between Options A, B, or C
3. **Implementation:** Once decided, implement UI flow
4. **Testing:** Verify consent state is properly gated at capture/queue/sync
5. **Deploy:** Production launch can proceed

---

## WHERE ELSE TO LOOK

The consent default affects these locations:

1. **Frontend Capture:** `shoppingAnalytics.ts:11-12`
   - Only queues if `trackingConsent === 'accepted'`
   - With pending default: events will not be queued until consent given
   - ✅ Code is ready; no changes needed

2. **Queue Check:** `analyticsQueue.ts` (no changes needed)
   - Queue methods check consent before queueing
   - ✅ Code is ready

3. **Settings UI:** `SettingsScreen.tsx:695`
   - Shows toggle: `value={trackingConsent === 'accepted'}`
   - ✅ UI already supports consent toggle

4. **Onboarding:** May need new flow to ask for consent on first launch
   - ❌ Currently missing; needs design + implementation

---

## GDPR ARTICLES REFERENCE

**Article 4(11) - Consent:**
> Freely given, specific, informed and unambiguous indication of the data subject's wishes.

**Article 7 - Conditions for consent:**
> Consent must be as easy to withdraw as to give.

**Recital 32:**
> Silence, pre-ticked boxes or inactivity should not therefore constitute consent.

**Current Status:** Pre-ticked boxes (implied in default `'accepted'`)
**Required Status:** Explicit, affirmative action by user

---

## SIGN-OFF REQUIRED

**Question for Leadership/Legal:**

"Should tracking analytics be opt-in (pending → accepted) or opt-out (accepted → declined)?"

- **Opt-in (Recommended):** Default pending; user must explicitly accept
  - GDPR compliant ✅
  - Better privacy perception ✅
  - Requires onboarding flow ⚠️

- **Opt-out (Not Recommended):** Default accepted; user can toggle off
  - GDPR non-compliant ❌
  - Higher initial data collection ✅
  - Risk of regulatory penalties ❌

**Recommendation:** Opt-in (Option A)

---

**Next Step:** Confirm decision with legal team, then implement.

