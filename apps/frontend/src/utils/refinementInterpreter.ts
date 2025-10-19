import {VertexAI} from '@google-cloud/vertexai';

const SLOT_SYNONYMS: Record<string, string> = {
  kicks: 'shoes',
  sneaks: 'shoes',
  sneakers: 'shoes',
  shoes: 'shoes',
  loafers: 'shoes',
  heels: 'shoes',
  boots: 'shoes',
  pants: 'bottoms',
  trousers: 'bottoms',
  shorts: 'bottoms',
  jeans: 'bottoms',
  skirt: 'bottoms',
  dress: 'bottoms',
  shirt: 'top',
  tee: 'top',
  't-shirt': 'top',
  hoodie: 'top',
  jacket: 'top',
  top: 'top',
  blouse: 'top',
  drip: 'style',
  fire: 'stylish',
  mid: 'boring',
  chill: 'casual',
  classy: 'elegant',
};

const FILLER_WORDS =
  /\b(uh|um|like|idk|maybe|kinda|sorta|whatever|you know)\b/gi;

function normalizeSlot(word: string): string {
  return SLOT_SYNONYMS[word.toLowerCase()] || word.toLowerCase();
}

function cleanInput(text: string): string {
  return text.replace(FILLER_WORDS, '').trim();
}

export interface RefinementResult {
  keep: string[];
  remove: string[];
  replace: {
    slot: string;
    desired_color?: string;
    desired_style?: string;
    sentiment?: string;
  }[];
  vibe: string[];
  notes: string;
  lockedItemIds: string[];
}

export async function interpretRefinement(
  userInput: string,
  currentOutfit: {
    top?: string;
    bottoms?: string;
    shoes?: string;
    accessories?: string;
  },
): Promise<RefinementResult> {
  const vertex = new VertexAI({
    project: 'stylhelpr-prod',
    location: 'us-central1',
  });
  const model = vertex.getGenerativeModel({model: 'gemini-2.5-flash'});

  const cleaned = cleanInput(userInput);

  const systemPrompt = `
You are a universal fashion outfit refinement interpreter.
Your task: read casual, slangy, emotional, or formal user text about changing an outfit,
and output JSON describing what they want to KEEP, REMOVE, or REPLACE.

Requirements:
- Always use these slot names: "top", "bottoms", "shoes", "accessories"
- Be tolerant of slang (kicks, fire, mid), emojis, and vague phrasing
- If user praises something, treat it as keep (sentiment: like)
- If user dislikes something, treat it as replace or remove (sentiment: dislike)
- Extract optional: desired_color, desired_style, vibe adjectives ("beachy","edgy","elegant")
- Output only valid JSON. No commentary.
`;

  const userPrompt = `User said: "${cleaned}"`;

  const result = await model.generateContent({
    contents: [
      {role: 'system', parts: [{text: systemPrompt}]},
      {role: 'user', parts: [{text: userPrompt}]},
    ],
    generationConfig: {temperature: 0.2, maxOutputTokens: 512},
  });

  const text =
    result.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{}';

  let parsed: Partial<RefinementResult>;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    console.error('⚠️ Failed to parse refinement JSON', text);
    parsed = {};
  }

  const keep = parsed.keep?.map(normalizeSlot) ?? [];
  const remove = parsed.remove?.map(normalizeSlot) ?? [];
  const replace =
    parsed.replace?.map(r => ({
      ...r,
      slot: normalizeSlot(r.slot),
    })) ?? [];

  const slotToId: Record<string, string | undefined> = {
    top: currentOutfit.top,
    bottoms: currentOutfit.bottoms,
    shoes: currentOutfit.shoes,
    accessories: currentOutfit.accessories,
  };

  const lockedItemIds = keep
    .map(slot => slotToId[slot])
    .filter((x): x is string => Boolean(x));

  return {
    keep,
    remove,
    replace,
    vibe: parsed.vibe ?? [],
    notes: parsed.notes ?? '',
    lockedItemIds,
  };
}
