import { validateCategoryPair, CATEGORY_MAP } from './categoryValidator';

describe('validateCategoryPair', () => {
  // ── Correct pairs pass through unchanged ──────────────────────────
  it('passes a valid Tops + T-Shirts pair', () => {
    const r = validateCategoryPair('Tops', 'T-Shirts');
    expect(r.main_category).toBe('Tops');
    expect(r.subcategory).toBe('T-Shirts');
    expect(r.corrected).toBe(false);
  });

  it('passes a valid Shoes + Chelsea Boots pair', () => {
    const r = validateCategoryPair('Shoes', 'Chelsea Boots');
    expect(r.main_category).toBe('Shoes');
    expect(r.subcategory).toBe('Chelsea Boots');
    expect(r.corrected).toBe(false);
  });

  // ── Exact subcategory remapping ───────────────────────────────────
  it('remaps "Midi Dresses" from Tops → Dresses', () => {
    const r = validateCategoryPair('Tops', 'Midi Dresses');
    expect(r.main_category).toBe('Dresses');
    expect(r.corrected).toBe(true);
  });

  it('remaps "Pencil Skirts" from Bottoms → Skirts', () => {
    const r = validateCategoryPair('Bottoms', 'Pencil Skirts');
    expect(r.main_category).toBe('Skirts');
    expect(r.corrected).toBe(true);
  });

  it('remaps "Bomber Jackets" from Tops → Outerwear', () => {
    const r = validateCategoryPair('Tops', 'Bomber Jackets');
    expect(r.main_category).toBe('Outerwear');
    expect(r.corrected).toBe(true);
  });

  // ── Keyword inference from subcategory text ───────────────────────
  it('infers "Halter Dress" → Dresses (keyword: dress)', () => {
    const r = validateCategoryPair('Tops', 'Halter Dress');
    expect(r.main_category).toBe('Dresses');
    expect(r.corrected).toBe(true);
  });

  it('infers "Midi Skirt" → Skirts (keyword: skirt)', () => {
    const r = validateCategoryPair('Bottoms', 'Midi Skirt');
    expect(r.main_category).toBe('Skirts');
    expect(r.corrected).toBe(true);
  });

  it('infers "Puffer Coat" → Outerwear (keyword: coat)', () => {
    const r = validateCategoryPair('Tops', 'Puffer Coat');
    expect(r.main_category).toBe('Outerwear');
    expect(r.corrected).toBe(true);
  });

  it('infers "Sports Bra" → Activewear (keyword: sports bra)', () => {
    const r = validateCategoryPair('Undergarments', 'Sports Bra');
    expect(r.main_category).toBe('Activewear');
    expect(r.corrected).toBe(true);
  });

  // ── Keyword inference from item name ──────────────────────────────
  it('corrects main via item name: "Black Midi Dress" saved as Tops', () => {
    const r = validateCategoryPair('Tops', undefined, 'Black Midi Dress');
    expect(r.main_category).toBe('Dresses');
    expect(r.corrected).toBe(true);
  });

  it('corrects main via item name: "Denim Jacket" saved as Tops', () => {
    const r = validateCategoryPair('Tops', undefined, 'Denim Jacket');
    expect(r.main_category).toBe('Outerwear');
    expect(r.corrected).toBe(true);
  });

  // ── No subcategory, no name signal → trust main ───────────────────
  it('keeps main when no subcategory and no name signal', () => {
    const r = validateCategoryPair('Tops');
    expect(r.main_category).toBe('Tops');
    expect(r.subcategory).toBeUndefined();
    expect(r.corrected).toBe(false);
  });

  // ── Unknown subcategory → trust existing main ─────────────────────
  it('keeps main for unknown subcategory with no keyword match', () => {
    const r = validateCategoryPair('Tops', 'Futuristic Mesh Panel');
    expect(r.main_category).toBe('Tops');
    expect(r.subcategory).toBe('Futuristic Mesh Panel');
    expect(r.corrected).toBe(false);
  });

  // ── Case insensitivity ────────────────────────────────────────────
  it('handles case-insensitive subcategory matching', () => {
    const r = validateCategoryPair('Tops', 'midi dresses');
    expect(r.main_category).toBe('Dresses');
    expect(r.corrected).toBe(true);
  });

  // ── Shirt dress should go to Dresses, not Tops ────────────────────
  it('classifies "Shirt Dress" as Dresses (dress keyword before shirt)', () => {
    const r = validateCategoryPair('Tops', 'Shirt Dress');
    expect(r.main_category).toBe('Dresses');
    expect(r.corrected).toBe(true);
  });

  // ── Halter dress override ──────────────────────────────────────────
  it('corrects "Black halterneck maxi satin slip" from Tops/Camisole → Dresses', () => {
    const r = validateCategoryPair('Tops', 'Camisole', 'Black halterneck maxi satin slip');
    expect(r.main_category).toBe('Dresses');
    expect(r.corrected).toBe(true);
  });

  it('corrects "Halter midi gown" from Tops/Camisole → Dresses', () => {
    const r = validateCategoryPair('Tops', 'Camisole', 'Halter midi gown');
    expect(r.main_category).toBe('Dresses');
    expect(r.corrected).toBe(true);
  });

  it('keeps "Halter crop top" as Tops (no dress-length signal)', () => {
    const r = validateCategoryPair('Tops', 'Camisole', 'Halter crop top');
    expect(r.main_category).toBe('Tops');
    expect(r.corrected).toBe(false);
  });

  it('keeps "Halter camisole" as Tops (no dress-length signal)', () => {
    const r = validateCategoryPair('Tops', 'Camisole', 'Halter camisole');
    expect(r.main_category).toBe('Tops');
    expect(r.corrected).toBe(false);
  });

  // ── Shacket / Overshirt → Outerwear ────────────────────────────────
  it('corrects "Shacket" from Tops → Outerwear (keyword)', () => {
    const r = validateCategoryPair('Tops', 'Shacket');
    expect(r.main_category).toBe('Outerwear');
    expect(r.corrected).toBe(true);
  });

  it('corrects "Overshirt" from Tops → Outerwear (keyword)', () => {
    const r = validateCategoryPair('Tops', 'Overshirt');
    expect(r.main_category).toBe('Outerwear');
    expect(r.corrected).toBe(true);
  });

  it('corrects "Linen Shacket" from Tops → Outerwear via name', () => {
    const r = validateCategoryPair('Tops', undefined, 'Linen Shacket');
    expect(r.main_category).toBe('Outerwear');
    expect(r.corrected).toBe(true);
  });

  it('keeps "Overshirt" as Outerwear when already correct (no correction)', () => {
    const r = validateCategoryPair('Outerwear', 'Overshirt');
    expect(r.main_category).toBe('Outerwear');
    expect(r.corrected).toBe(false);
  });

  // Negative: "Shirt" alone must NOT trigger Outerwear
  it('keeps "Dress Shirt" as Tops (shirt ≠ overshirt)', () => {
    const r = validateCategoryPair('Tops', 'Dress Shirts');
    expect(r.main_category).toBe('Tops');
    expect(r.corrected).toBe(false);
  });

  // ── Jumpsuit / Romper — taxonomy confirmation ─────────────────────
  it('Jumpsuits belong to Dresses per canonical taxonomy', () => {
    const r = validateCategoryPair('Dresses', 'Jumpsuits');
    expect(r.main_category).toBe('Dresses');
    expect(r.corrected).toBe(false);
  });

  it('Rompers belong to Dresses per canonical taxonomy', () => {
    const r = validateCategoryPair('Dresses', 'Rompers');
    expect(r.main_category).toBe('Dresses');
    expect(r.corrected).toBe(false);
  });

  // ── CATEGORY_MAP sanity ───────────────────────────────────────────
  it('CATEGORY_MAP has all 21 main categories', () => {
    expect(Object.keys(CATEGORY_MAP)).toHaveLength(21);
  });
});
