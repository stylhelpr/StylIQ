import { buildOutfitPrompt } from './outfitPrompt';

describe('buildOutfitPrompt — FIX 4: Gender Directive', () => {
  const catalogLines = '1. Blue polo (Tops)\n2. Dark jeans (Bottoms)\n3. White sneakers (Shoes)';

  it('includes masculine directive when passed', () => {
    const directive =
      '\n════════════════════════\nGENDER CONTEXT\n════════════════════════\nThis user presents masculine. NEVER include dresses, skirts, gowns, blouses, heels, ballet flats, purses, or any feminine-coded garments. Only use items from the wardrobe list provided.\n';
    const prompt = buildOutfitPrompt(
      catalogLines,
      'casual outfit',
      undefined,
      undefined,
      directive,
    );
    expect(prompt).toContain('GENDER CONTEXT');
    expect(prompt).toContain('presents masculine');
    expect(prompt).toContain('NEVER include dresses');
  });

  it('includes feminine directive when passed', () => {
    const directive =
      '\n════════════════════════\nGENDER CONTEXT\n════════════════════════\nThis user presents feminine. Dresses, skirts, and all feminine garments are allowed and encouraged when appropriate.\n';
    const prompt = buildOutfitPrompt(
      catalogLines,
      'date night',
      undefined,
      undefined,
      directive,
    );
    expect(prompt).toContain('GENDER CONTEXT');
    expect(prompt).toContain('presents feminine');
  });

  it('omits gender section when no directive', () => {
    const prompt = buildOutfitPrompt(catalogLines, 'casual outfit');
    expect(prompt).not.toContain('GENDER CONTEXT');
  });

  it('omits gender section when directive is empty string', () => {
    const prompt = buildOutfitPrompt(
      catalogLines,
      'casual outfit',
      undefined,
      undefined,
      '',
    );
    expect(prompt).not.toContain('GENDER CONTEXT');
  });
});
