import {MainCategory, Subcategory} from '../types/categoryTypes';

export function getInferredCategory(name: string): {
  main: MainCategory;
  sub: Subcategory;
} | null {
  const lower = name.toLowerCase();

  if (lower.includes('t-shirt')) return {main: 'Tops', sub: 'T-Shirts'};
  if (lower.includes('polo')) return {main: 'Tops', sub: 'Polo Shirts'};
  if (lower.includes('dress shirt')) return {main: 'Tops', sub: 'Dress Shirts'};
  if (lower.includes('henley')) return {main: 'Tops', sub: 'Henleys'};
  if (lower.includes('tank')) return {main: 'Tops', sub: 'Tank Tops'};
  if (lower.includes('sweater')) return {main: 'Tops', sub: 'Sweaters'};
  if (lower.includes('hoodie')) return {main: 'Tops', sub: 'Hoodies'};
  if (lower.includes('jean')) return {main: 'Bottoms', sub: 'Jeans'};
  if (lower.includes('chino')) return {main: 'Bottoms', sub: 'Chinos'};
  if (lower.includes('trouser')) return {main: 'Bottoms', sub: 'Trousers'};
  if (lower.includes('jogger')) return {main: 'Bottoms', sub: 'Joggers'};
  if (lower.includes('short')) return {main: 'Bottoms', sub: 'Shorts'};
  if (lower.includes('cargo')) return {main: 'Bottoms', sub: 'Cargo Pants'};

  if (lower.includes('bomber'))
    return {main: 'Outerwear', sub: 'Bomber Jackets'};
  if (lower.includes('blazer')) return {main: 'Outerwear', sub: 'Blazers'};
  if (lower.includes('trench')) return {main: 'Outerwear', sub: 'Trench Coats'};
  if (lower.includes('peacoat')) return {main: 'Outerwear', sub: 'Peacoats'};
  if (lower.includes('leather'))
    return {main: 'Outerwear', sub: 'Leather Jackets'};
  if (lower.includes('denim jacket'))
    return {main: 'Outerwear', sub: 'Denim Jackets'};
  if (lower.includes('parka')) return {main: 'Outerwear', sub: 'Parkas'};
  if (lower.includes('vest')) return {main: 'Outerwear', sub: 'Vests'};

  if (lower.includes('sneaker'))
    return {main: 'Shoes', sub: 'Lifestyle Sneakers'};
  if (lower.includes('oxford')) return {main: 'Shoes', sub: 'Oxfords'};
  if (lower.includes('derby')) return {main: 'Shoes', sub: 'Derbies'};
  if (lower.includes('monk')) return {main: 'Shoes', sub: 'Monk Straps'};
  if (lower.includes('loafer')) return {main: 'Shoes', sub: 'Loafers'};
  if (lower.includes('boat')) return {main: 'Shoes', sub: 'Boat Shoes'};
  if (lower.includes('espadrille')) return {main: 'Shoes', sub: 'Espadrilles'};
  if (lower.includes('chelsea')) return {main: 'Shoes', sub: 'Chelsea Boots'};
  if (lower.includes('combat')) return {main: 'Shoes', sub: 'Combat Boots'};
  if (lower.includes('chukka')) return {main: 'Shoes', sub: 'Chukkas'};
  if (lower.includes('sandal')) return {main: 'Shoes', sub: 'Sandals'};
  if (lower.includes('slide')) return {main: 'Shoes', sub: 'Slides'};

  if (lower.includes('belt')) return {main: 'Accessories', sub: 'Belts'};
  if (lower.includes('hat')) return {main: 'Accessories', sub: 'Hats'};
  if (lower.includes('scarf')) return {main: 'Accessories', sub: 'Scarves'};
  if (lower.includes('glove')) return {main: 'Accessories', sub: 'Gloves'};
  if (lower.includes('sunglass'))
    return {main: 'Accessories', sub: 'Sunglasses'};
  if (lower.includes('watch')) return {main: 'Accessories', sub: 'Watches'};
  if (lower.includes('jewelry')) return {main: 'Accessories', sub: 'Jewelry'};
  if (lower.includes('bag')) return {main: 'Accessories', sub: 'Bags'};

  if (lower.includes('undershirt'))
    return {main: 'Undergarments', sub: 'Undershirts'};
  if (lower.includes('brief')) return {main: 'Undergarments', sub: 'Briefs'};
  if (lower.includes('boxer')) return {main: 'Undergarments', sub: 'Boxers'};
  if (lower.includes('sock')) return {main: 'Undergarments', sub: 'Socks'};

  if (lower.includes('athletic top'))
    return {main: 'Activewear', sub: 'Athletic Tops'};
  if (lower.includes('running short'))
    return {main: 'Activewear', sub: 'Running Shorts'};
  if (lower.includes('legging')) return {main: 'Activewear', sub: 'Leggings'};
  if (lower.includes('performance jacket'))
    return {main: 'Activewear', sub: 'Performance Jackets'};
  if (lower.includes('gym hoodie'))
    return {main: 'Activewear', sub: 'Gym Hoodies'};

  if (lower.includes('suit')) return {main: 'Formalwear', sub: 'Suits'};
  if (lower.includes('tuxedo')) return {main: 'Formalwear', sub: 'Tuxedos'};
  if (lower.includes('waistcoat'))
    return {main: 'Formalwear', sub: 'Waistcoats'};

  return null;
}
