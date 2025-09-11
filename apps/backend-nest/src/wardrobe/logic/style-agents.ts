import { UserStyle } from './style';

export const STYLE_AGENTS: Record<string, UserStyle> = {
  agent1: {
    name: 'Pro Stylist – Clean Minimal',
    preferredColors: ['Black', 'White', 'Gray'],
    avoidColors: ['Brights', 'Patterns'],
    favoriteBrands: ['Theory', 'Eton', 'Jil Sander'],
    avoidSubcategories: ['Baggy', 'Graphic Tee', 'Cargo'],
    dressBias: 'BusinessCasual',
    styleKeywords: ['Minimal', 'Tailored', 'Polished', 'Understated'],
    lifestyle: ['Work', 'Networking', 'Formal Events'],
    fashionGoals: ['Always look sharp and professional'],
    budgetLevel: 800,
    confidence: 'Very confident',
    climate: 'Temperate',
    bodyType: 'Slim',
  },

  agent2: {
    name: 'Rebel Streetwear',
    preferredColors: ['Black', 'Red', 'Neon'],
    avoidColors: ['Beige', 'Pastel'],
    favoriteBrands: ['Amiri', 'Off-White', 'Nike', 'Supreme'],
    avoidSubcategories: ['Dress Shirt', 'Loafers', 'Suit'],
    dressBias: 'UltraCasual',
    styleKeywords: ['Bold', 'Youthful', 'Oversized', 'Statement'],
    lifestyle: ['City Nights', 'Concerts', 'Skate Parks'],
    fashionGoals: ['Stand out, break rules'],
    budgetLevel: 300,
    confidence: 'Experimental',
    climate: 'Urban Cool',
    bodyType: 'Athletic',
  },

  agent3: {
    name: 'Classic Heritage Gentleman',
    preferredColors: ['Brown', 'Olive', 'Navy', 'Beige'],
    avoidColors: ['Neon', 'Black'],
    favoriteBrands: ['Burberry', 'Ralph Lauren', 'Brooks Brothers'],
    avoidSubcategories: ['Sneakers', 'Hoodies', 'Cargo'],
    dressBias: 'SmartCasual',
    styleKeywords: ['Traditional', 'Timeless', 'Elegant', 'Country Club'],
    lifestyle: ['Travel', 'Golf', 'Fine Dining', 'Family Events'],
    fashionGoals: ['Invest in timeless pieces'],
    budgetLevel: 1000,
    confidence: 'Conservative',
    climate: 'Four Seasons',
    bodyType: 'Broad',
  },
};

///////////////////

// import { UserStyle } from './style';

// export const STYLE_AGENTS: Record<string, UserStyle> = {
//   agent1: {
//     name: 'Pro Stylist – Clean Minimal',
//     preferredColors: ['Black', 'White'],
//     avoidColors: ['Brights'],
//     favoriteBrands: ['Zara', 'Theory', 'Eton'],
//     avoidSubcategories: ['Baggy'],
//     dressBias: 'BusinessCasual',
//     styleKeywords: ['Clean', 'Minimal', 'Understated'],
//     lifestyle: ['Work', 'Gym', 'Events'],
//     fashionGoals: ['Dress better for events'],
//     budgetLevel: 500,
//     confidence: 'Very confident',
//     climate: 'Tropical',
//     skinTone: 'Medium',
//     undertone: 'Warm',
//     bodyType: 'Athletic',
//     shoppingHabits: ['Online shopper', 'Brand loyalist'],
//   },
//   agent2: {
//     name: 'Edgy Streetwear',
//     preferredColors: ['Black', 'Earth Tones'],
//     favoriteBrands: ['Amiri', 'Gucci', 'Nike'],
//     dressBias: 'Casual',
//     styleKeywords: ['Street', 'Bold', 'Youthful'],
//     lifestyle: ['City', 'Music'],
//     fashionGoals: ['Stand out'],
//   },
//   agent3: {
//     name: 'Classic Heritage',
//     preferredColors: ['Beige', 'Brown', 'Olive'],
//     favoriteBrands: ['Burberry', 'Ralph Lauren'],
//     dressBias: 'SmartCasual',
//     styleKeywords: ['Timeless', 'Traditional'],
//     lifestyle: ['Travel', 'Country Club'],
//     fashionGoals: ['Invest in long-lasting wardrobe'],
//   },
// };
