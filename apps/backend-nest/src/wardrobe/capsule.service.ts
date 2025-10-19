import { Injectable } from '@nestjs/common';

export type CapsuleItem = {
  category: string;
  subcategory: string;
  recommended: number;
};

export type CapsuleTemplate = {
  season: 'Spring' | 'Summer' | 'Fall' | 'Winter';
  core: CapsuleItem[];
  notes?: string[];
};

@Injectable()
export class CapsuleService {
  private templates: CapsuleTemplate[] = [
    {
      season: 'Spring',
      core: [
        { category: 'Outerwear', subcategory: 'Light Jacket', recommended: 2 },
        { category: 'Tops', subcategory: 'Oxford Shirt', recommended: 3 },
        { category: 'Bottoms', subcategory: 'Chinos', recommended: 2 },
        { category: 'Shoes', subcategory: 'Loafers', recommended: 1 },
        { category: 'Shoes', subcategory: 'Sneakers', recommended: 1 },
      ],
      notes: [
        'Layering versatility is key — temperatures fluctuate.',
        'Lightweight fabrics like cotton and linen excel in this season.',
      ],
    },
    {
      season: 'Summer',
      core: [
        { category: 'Tops', subcategory: 'Short Sleeve Shirt', recommended: 4 },
        { category: 'Tops', subcategory: 'Polo Shirt', recommended: 2 },
        { category: 'Bottoms', subcategory: 'Linen Trousers', recommended: 2 },
        { category: 'Shoes', subcategory: 'Loafers', recommended: 1 },
        { category: 'Shoes', subcategory: 'Sandals', recommended: 1 },
      ],
      notes: [
        'Breathable materials like linen and cotton are essential.',
        'Aim for relaxed fits and ventilation.',
      ],
    },
    {
      season: 'Fall',
      core: [
        { category: 'Outerwear', subcategory: 'Field Jacket', recommended: 1 },
        { category: 'Outerwear', subcategory: 'Blazer', recommended: 1 },
        { category: 'Tops', subcategory: 'Knit Sweater', recommended: 2 },
        { category: 'Bottoms', subcategory: 'Wool Trousers', recommended: 2 },
        { category: 'Shoes', subcategory: 'Chelsea Boots', recommended: 1 },
      ],
      notes: [
        'Focus on transitional fabrics like brushed cotton and merino.',
        'Earth tones and textured layers add depth.',
      ],
    },
    {
      season: 'Winter',
      core: [
        { category: 'Outerwear', subcategory: 'Overcoat', recommended: 1 },
        { category: 'Outerwear', subcategory: 'Heavy Parka', recommended: 1 },
        { category: 'Tops', subcategory: 'Heavy Knit Sweater', recommended: 2 },
        { category: 'Bottoms', subcategory: 'Wool Trousers', recommended: 2 },
        { category: 'Shoes', subcategory: 'Boots', recommended: 2 },
      ],
      notes: [
        'Insulation and weather resistance matter most.',
        'Layer strategically with thermal underlayers.',
      ],
    },
  ];

  /**
   * ✅ Get capsule template for a season
   */
  getTemplateForSeason(season: CapsuleTemplate['season']): CapsuleTemplate {
    const found = this.templates.find((t) => t.season === season);
    if (!found) throw new Error(`No capsule template found for ${season}`);
    return found;
  }

  /**
   * 📊 Compare a user's wardrobe against a seasonal capsule
   * and return a simple list of missing pieces.
   */
  getWardrobeGaps(
    season: CapsuleTemplate['season'],
    wardrobe: { category: string; subcategory: string }[],
  ): string {
    const template = this.getTemplateForSeason(season);
    const gapMessages: string[] = [];

    template.core.forEach((item) => {
      const ownedCount = wardrobe.filter(
        (w) =>
          w.category.toLowerCase() === item.category.toLowerCase() &&
          w.subcategory.toLowerCase() === item.subcategory.toLowerCase(),
      ).length;

      if (ownedCount < item.recommended) {
        const needed = item.recommended - ownedCount;
        gapMessages.push(`${needed} × ${item.subcategory}`);
      }
    });

    if (gapMessages.length === 0) {
      return `✅ Your ${season} capsule is complete.`;
    }

    return `For ${season}, you’re missing: ${gapMessages.join(', ')}.`;
  }
}
