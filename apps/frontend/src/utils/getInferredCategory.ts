import type {MainCategory, Subcategory} from '../types/categoryTypes';

export const getInferredCategory = (
  name: string,
): {main: MainCategory; sub: Subcategory} | null => {
  const lower = name.toLowerCase();

  if (lower.includes('t-shirt') || lower.includes('tee'))
    return {main: 'Tops', sub: 'T-Shirts'};
  if (lower.includes('shirt') && !lower.includes('t-shirt'))
    return {main: 'Tops', sub: 'Dress Shirts'};
  if (lower.includes('polo')) return {main: 'Tops', sub: 'Polo Shirts'};
  if (lower.includes('tank')) return {main: 'Tops', sub: 'Tank Tops'};
  if (lower.includes('sweater')) return {main: 'Tops', sub: 'Sweaters'};

  if (lower.includes('blazer')) return {main: 'Outerwear', sub: 'Blazers'};
  if (lower.includes('hoodie')) return {main: 'Outerwear', sub: 'Hoodies'};
  if (lower.includes('coat')) return {main: 'Outerwear', sub: 'Trench Coats'};
  if (lower.includes('jacket'))
    return {main: 'Outerwear', sub: 'Leather Jackets'};
  if (lower.includes('puffer')) return {main: 'Outerwear', sub: 'Parkas'};

  if (lower.includes('jeans')) return {main: 'Bottoms', sub: 'Jeans'};
  if (lower.includes('chinos')) return {main: 'Bottoms', sub: 'Chinos'};
  if (lower.includes('slacks') || lower.includes('trousers'))
    return {main: 'Bottoms', sub: 'Trousers'};
  if (lower.includes('shorts')) return {main: 'Bottoms', sub: 'Shorts'};

  if (lower.includes('sneakers'))
    return {main: 'Shoes', sub: 'Athletic Sneakers'};
  if (lower.includes('oxford') || lower.includes('dress shoe'))
    return {main: 'Shoes', sub: 'Oxfords'};
  if (lower.includes('loafers')) return {main: 'Shoes', sub: 'Loafers'};
  if (lower.includes('boots')) return {main: 'Shoes', sub: 'Chelsea Boots'};
  if (lower.includes('sandals')) return {main: 'Shoes', sub: 'Sandals'};

  if (lower.includes('watch')) return {main: 'Accessories', sub: 'Watches'};
  if (lower.includes('scarf')) return {main: 'Accessories', sub: 'Scarves'};
  if (lower.includes('hat')) return {main: 'Accessories', sub: 'Hats'};

  if (lower.includes('socks')) return {main: 'Undergarments', sub: 'Socks'};
  if (lower.includes('underwear') || lower.includes('brief'))
    return {main: 'Undergarments', sub: 'Briefs'};

  if (lower.includes('tracksuit'))
    return {main: 'Activewear', sub: 'Performance Jackets'};

  return null;
};
