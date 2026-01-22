Before accepting ANY AI-generated solution:

AUTH & IDENTITY
- Is this scoped per-user or global?
- What happens on logout?
- What happens on account switch?
- What happens if tokens are stale?

STATE
- Where does state live?
- Who owns it?
- Can two users collide?
- Is anything cached or singleton?

FAILURE
- What happens if this fails halfway?
- Is there partial state?
- Is recovery possible?

SECURITY
- What boundary enforces this?
- What input is trusted?
- Could a client lie?

OPERATIONS
- What logs exist?
- What alerts would fire?
- Who gets paged?

EVOLUTION
- What breaks if requirements change?
- What assumptions are baked in?
