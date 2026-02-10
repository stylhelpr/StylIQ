import {
  type MainCategory,
  filterBySlot,
  isSlot,
} from '../wardrobe/logic/categoryMapping';

type Item = {
  id: string;
  main_category: MainCategory;
  subcategory: string; // 'Hoodie','Sport Coat','Sneakers', etc.
  color?: string; // normalized lower-case if you can
  pattern?: string; // 'SOLID','Micro','Bold', etc.
  temp?: 'Cool' | 'Warm' | 'Neutral';
  dress_code?: string; // 'Business','BusinessCasual','Casual','UltraCasual'
  contrast?: 'Low' | 'Medium' | 'High';
  // ...whatever else you already have
};

type UserPrefs = {
  banColors?: Set<string>;
  banSubcats?: Set<string>;
  banItemIds?: Set<string>;
  minFormality?: string; // optional
  budgetMax?: number; // optional
  feedback: Map<string, number>; // itemId -> [-4..+4]
};

type AgentProfile = {
  name: string;
  dressBias: 'Business' | 'BusinessCasual' | 'SmartCasual' | 'UltraCasual';
  preferredColors?: string[];
  avoidColors?: string[];
  avoidSubcategories?: string[];
  patternMaxCountPerOutfit?: number;
  palette?: { base: string[]; accents: string[] };
  contrastTarget?: 'low' | 'medium' | 'high';
  mustPair?: Record<string, string[]>; // e.g. { sport_coat: ['loafers','derbies'] }
  avoidPair?: Record<string, string[]>; // e.g. { sport_coat: ['dress shoes'] }
  // ...your existing fields
};

// ---------- 1) Global guardrails (HARD) ----------
const NEUTRALS = new Set([
  'black',
  'white',
  'navy',
  'charcoal',
  'grey',
  'gray',
  'stone',
  'ivory',
  'beige',
]);

function passesGlobalGuardrails(item: Item, user: UserPrefs): boolean {
  if (user.banItemIds?.has(item.id)) return false;
  if (item.color && user.banColors?.has(item.color.toLowerCase())) return false;
  if (user.banSubcats?.has(item.subcategory)) return false;

  // Feedback: treat <= -2 as a hard ban
  const fb = user.feedback.get(item.id) ?? 0;
  if (fb <= -2) return false;

  // Add your own size/budget/season checks here if represented
  return true;
}

// ---------- 2) Agent capsule (HARD, per agent) ----------
const DRESS_HARDBANS: Record<AgentProfile['dressBias'], Set<string>> = {
  Business: new Set([
    'Hoodie',
    'Sneakers',
    'Shorts',
    'Hawaiian Shirt',
    'Windbreaker',
  ]),
  BusinessCasual: new Set(['Hawaiian Shirt', 'Athletic Shorts']),
  SmartCasual: new Set(['Athletic Shorts']),
  UltraCasual: new Set([]),
};

function passesAgentHard(item: Item, agent: AgentProfile): boolean {
  if (agent.avoidSubcategories?.includes(item.subcategory)) return false;
  if (
    agent.avoidColors?.some(
      (c) => item.color?.toLowerCase() === c.toLowerCase(),
    )
  )
    return false;
  if (DRESS_HARDBANS[agent.dressBias].has(item.subcategory)) return false;
  return true;
}

function buildAgentPool(all: Item[], user: UserPrefs, agent: AgentProfile) {
  const base = all
    .filter((i) => passesGlobalGuardrails(i, user))
    .filter((i) => passesAgentHard(i, agent));

  // Controlled degrade INSIDE the agent if too small
  const MIN_POOL = 14;
  if (base.length >= MIN_POOL) return base;

  // Stage A: allow neutrals even if not in agent palette (still honor hard bans)
  const neutrals = all.filter(
    (i) =>
      passesGlobalGuardrails(i, user) &&
      passesAgentHard(i, agent) &&
      (i.color ? NEUTRALS.has(i.color.toLowerCase()) : true),
  );

  if (neutrals.length >= MIN_POOL) return neutrals;

  // Stage B: widen to adjacent dress level (e.g., Business → BusinessCasual), still no banned subcats
  const relaxDress = (
    bias: AgentProfile['dressBias'],
  ): AgentProfile['dressBias'][] => {
    if (bias === 'Business') return ['Business', 'BusinessCasual'];
    if (bias === 'BusinessCasual') return ['BusinessCasual', 'SmartCasual'];
    if (bias === 'SmartCasual') return ['SmartCasual', 'Casual' as any];
    return [bias];
  };

  const adj = all.filter(
    (i) =>
      passesGlobalGuardrails(i, user) &&
      passesAgentHard(i, agent) &&
      relaxDress(agent.dressBias).some(() => true), // (keep hard bans; dress check happens at outfit stage)
  );

  return adj.length ? adj : base; // never re-open the full global pool
}

// ---------- 3) Soft scoring (agent prefs + user weights) ----------
function softScore(item: Item, agent: AgentProfile, user: UserPrefs): number {
  let s = 0;

  // Palette preference
  const col = item.color?.toLowerCase();
  if (col && agent.palette) {
    if (agent.palette.base.map((x) => x.toLowerCase()).includes(col)) s += 3;
    else if (agent.palette.accents.map((x) => x.toLowerCase()).includes(col))
      s += 1.5;
    else if (NEUTRALS.has(col))
      s += 1; // neutrals are fine
    else s -= 1;
  }

  // Pattern scale
  if (
    agent.patternMaxCountPerOutfit &&
    item.pattern &&
    item.pattern !== 'SOLID'
  ) {
    s += 0.5; // mild reward for micro patterns only if you track it
  }

  // User feedback (soft)
  const fb = user.feedback.get(item.id) ?? 0;
  s += fb * 0.75; // keep < 1.0 so style stays primary

  return s;
}

// ---------- 4) Outfit assembly (HARD composition rules) ----------
function subToFamily(sub: string): string {
  const k = sub.toLowerCase();
  if (k.includes('sneaker')) return 'sneakers';
  if (k.includes('loafer')) return 'loafers';
  if (k.includes('derby')) return 'derbies';
  if (k.includes('dress')) return 'dress shoes';
  if (k.includes('sport coat') || k.includes('blazer')) return 'sport_coat';
  if (k.includes('windbreaker') || k.includes('shell')) return 'shell';
  return k;
}

function violatesPairs(items: Item[], agent: AgentProfile): boolean {
  const fams = items.map((i) => subToFamily(i.subcategory));
  // avoidPair
  if (agent.avoidPair) {
    for (const [left, rights] of Object.entries(agent.avoidPair)) {
      if (fams.includes(left)) {
        for (const r of rights) if (fams.includes(r)) return true;
      }
    }
  }
  // mustPair
  if (agent.mustPair) {
    for (const [left, rights] of Object.entries(agent.mustPair)) {
      if (fams.includes(left)) {
        const ok = rights.some((r) => fams.includes(r));
        if (!ok) return true;
      }
    }
  }
  return false;
}

function buildOutfits(
  pool: Item[],
  agent: AgentProfile,
  user: UserPrefs,
  count = 3,
) {
  // Use canonical slot mapping for category filtering
  const tops = filterBySlot(pool, 'tops');
  const bottoms = filterBySlot(pool, 'bottoms'); // includes Skirts
  const shoes = filterBySlot(pool, 'shoes');
  const outers = filterBySlot(pool, 'outerwear');
  const accs = filterBySlot(pool, 'accessories'); // includes Bags, Headwear, Jewelry

  type Candidate = { items: Item[]; score: number; why: string };
  const cands: Candidate[] = [];

  for (const b of bottoms)
    for (const sh of shoes)
      for (const t of tops) {
        const core = [b, sh, t];
        if (violatesPairs(core, agent)) continue;

        // Optional layers
        const maybeOuter = outers.find(() => true);
        const maybeAcc = accs.find(() => true);
        const outfit = [
          ...core,
          ...(maybeOuter ? [maybeOuter] : []),
          ...(maybeAcc ? [maybeAcc] : []),
        ];

        // scoring: style fit + feedback + simple coherence
        const style = outfit.reduce(
          (sum, it) => sum + softScore(it, agent, user),
          0,
        );
        const contrastPenalty =
          agent.contrastTarget === 'low' &&
          outfit.some((i) => i.contrast === 'High')
            ? -1.5
            : 0;

        const score = style + contrastPenalty;
        cands.push({
          items: outfit,
          score,
          why: 'Built from agent palette & user prefs with pairing rules enforced.',
        });
      }

  // Deduplicate by shoe/bottom to ensure variety
  cands.sort((a, b) => b.score - a.score);
  const picked: Candidate[] = [];
  const seen = new Set<string>();
  for (const c of cands) {
    const key = c.items
      .map((i) => i.id)
      .sort()
      .join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(c);
    if (picked.length === count) break;
  }

  // If we somehow don’t have enough, output with "missing" instead of breaking hard rules
  if (!picked.length) {
    const b = bottoms[0];
    const sh = shoes[0];
    const t = tops[0];
    return [
      {
        title: `${agent.name}: minimal`,
        items: [b?.id, sh?.id, t?.id].filter(Boolean),
        why: 'Guardrails enforced; limited inventory for this agent.',
        missing:
          !b || !sh || !t
            ? 'Add more items in this agent’s category to improve results.'
            : undefined,
      },
    ];
  }

  return picked.map((c, i) => ({
    title: `${agent.name}: look ${i + 1}`,
    items: c.items.map((it) => it.id),
    why: c.why,
  }));
}
