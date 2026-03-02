import {MainCategory, Subcategory} from '../types/categoryTypes';

export function getInferredCategory(name: string): {
  main: MainCategory;
  sub: Subcategory;
} | null {
  const lower = name.toLowerCase();

  // --- Tops ---
  if (lower.includes('graphic')) return {main: 'Tops', sub: 'Graphic T-Shirts'};
  if (lower.includes('t-shirt')) return {main: 'Tops', sub: 'T-Shirts'};
  if (lower.includes('long sleeve'))
    return {main: 'Tops', sub: 'Long Sleeve Shirts'};
  if (lower.includes('polo')) return {main: 'Tops', sub: 'Polo Shirts'};
  if (lower.includes('dress shirt')) return {main: 'Tops', sub: 'Dress Shirts'};
  if (lower.includes('blouse')) return {main: 'Tops', sub: 'Blouses'};
  if (lower.includes('henley')) return {main: 'Tops', sub: 'Henleys'};
  if (lower.includes('tank')) return {main: 'Tops', sub: 'Tank Tops'};
  if (lower.includes('crop')) return {main: 'Tops', sub: 'Crop Tops'};
  if (lower.includes('bodysuit')) return {main: 'Tops', sub: 'Bodysuits'};
  if (lower.includes('sweater')) return {main: 'Tops', sub: 'Sweaters'};
  if (lower.includes('hoodie')) return {main: 'Tops', sub: 'Hoodies'};
  if (lower.includes('corset')) return {main: 'Tops', sub: 'Corsets'};

  // --- Bottoms ---
  if (lower.includes('jean')) return {main: 'Bottoms', sub: 'Jeans'};
  if (lower.includes('chino')) return {main: 'Bottoms', sub: 'Chinos'};
  if (lower.includes('trouser')) return {main: 'Bottoms', sub: 'Trousers'};
  if (lower.includes('jogger')) return {main: 'Bottoms', sub: 'Joggers'};
  if (lower.includes('short')) return {main: 'Bottoms', sub: 'Shorts'};
  if (lower.includes('cargo')) return {main: 'Bottoms', sub: 'Cargo Pants'};
  if (lower.includes('skirt')) return {main: 'Bottoms', sub: 'Skirts'};
  if (lower.includes('culotte')) return {main: 'Bottoms', sub: 'Culottes'};
  if (lower.includes('legging')) return {main: 'Bottoms', sub: 'Leggings'};

  // --- Outerwear ---
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
  if (lower.includes('raincoat')) return {main: 'Outerwear', sub: 'Raincoats'};
  if (lower.includes('cape')) return {main: 'Outerwear', sub: 'Capes'};
  if (lower.includes('vest')) return {main: 'Outerwear', sub: 'Vests'};

  // --- Shoes ---
  if (lower.includes('athletic'))
    return {main: 'Shoes', sub: 'Athletic Sneakers'};
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
  if (lower.includes('heel')) return {main: 'Shoes', sub: 'Heels'};
  if (lower.includes('flat')) return {main: 'Shoes', sub: 'Flats'};
  if (lower.includes('sandal')) return {main: 'Shoes', sub: 'Sandals'};
  if (lower.includes('slide')) return {main: 'Shoes', sub: 'Slides'};
  if (lower.includes('clog')) return {main: 'Shoes', sub: 'Clogs'};
  if (lower.includes('slipper')) return {main: 'Shoes', sub: 'Slippers'};

  // --- Accessories ---
  if (lower.includes('belt')) return {main: 'Accessories', sub: 'Belts'};
  if (lower.includes('hat')) return {main: 'Accessories', sub: 'Hats'};
  if (lower.includes('scarf')) return {main: 'Accessories', sub: 'Scarves'};
  if (lower.includes('glove')) return {main: 'Accessories', sub: 'Gloves'};
  if (lower.includes('sunglass'))
    return {main: 'Accessories', sub: 'Sunglasses'};
  if (lower.includes('watch')) return {main: 'Accessories', sub: 'Watches'};
  if (lower.includes('jewelry')) return {main: 'Accessories', sub: 'Jewelry'};
  if (lower.includes('hair'))
    return {main: 'Accessories', sub: 'Hair Accessories'};
  if (lower.includes('bag')) return {main: 'Accessories', sub: 'Bags'};
  if (lower.includes('tie') && lower.includes('bow'))
    return {main: 'Accessories', sub: 'Bow Ties'};
  if (lower.includes('pocket square'))
    return {main: 'Accessories', sub: 'Pocket Squares'};
  if (lower.includes('tie')) return {main: 'Accessories', sub: 'Ties'};
  if (lower.includes('pin') || lower.includes('brooch'))
    return {main: 'Accessories', sub: 'Pins & Brooches'};
  if (lower.includes('mask')) return {main: 'Accessories', sub: 'Face Masks'};
  if (lower.includes('tech'))
    return {main: 'Accessories', sub: 'Tech Accessories'};

  // --- Undergarments ---
  if (lower.includes('undershirt'))
    return {main: 'Undergarments', sub: 'Undershirts'};
  if (lower.includes('brief')) return {main: 'Undergarments', sub: 'Briefs'};
  if (lower.includes('boxer brief'))
    return {main: 'Undergarments', sub: 'Boxer Briefs'};
  if (lower.includes('boxer')) return {main: 'Undergarments', sub: 'Boxers'};
  if (lower.includes('bra')) return {main: 'Undergarments', sub: 'Bras'};
  if (lower.includes('panty')) return {main: 'Undergarments', sub: 'Panties'};
  if (lower.includes('sock')) return {main: 'Undergarments', sub: 'Socks'};
  if (lower.includes('shapewear'))
    return {main: 'Undergarments', sub: 'Shapewear'};

  // --- Activewear ---
  if (lower.includes('athletic top'))
    return {main: 'Activewear', sub: 'Athletic Tops'};
  if (lower.includes('running short'))
    return {main: 'Activewear', sub: 'Running Shorts'};
  if (lower.includes('legging')) return {main: 'Activewear', sub: 'Leggings'};
  if (lower.includes('performance jacket'))
    return {main: 'Activewear', sub: 'Performance Jackets'};
  if (lower.includes('gym hoodie'))
    return {main: 'Activewear', sub: 'Gym Hoodies'};
  if (lower.includes('sports bra'))
    return {main: 'Activewear', sub: 'Sports Bras'};
  if (lower.includes('track pant'))
    return {main: 'Activewear', sub: 'Track Pants'};

  // --- Formalwear ---
  if (lower.includes('suit')) return {main: 'Formalwear', sub: 'Suits'};
  if (lower.includes('tuxedo')) return {main: 'Formalwear', sub: 'Tuxedos'};
  if (lower.includes('waistcoat'))
    return {main: 'Formalwear', sub: 'Waistcoats'};
  if (lower.includes('gown')) return {main: 'Formalwear', sub: 'Gowns'};
  if (lower.includes('evening dress'))
    return {main: 'Formalwear', sub: 'Evening Dresses'};
  if (lower.includes('dress pant'))
    return {main: 'Formalwear', sub: 'Dress Pants'};

  // --- Dresses (unambiguous compound keywords only) ---
  if (lower.includes('wrap dress'))
    return {main: 'Dresses', sub: 'Wrap Dresses'};
  if (lower.includes('midi dress'))
    return {main: 'Dresses', sub: 'Midi Dresses'};
  if (lower.includes('maxi dress'))
    return {main: 'Dresses', sub: 'Maxi Dresses'};
  if (lower.includes('mini dress'))
    return {main: 'Dresses', sub: 'Mini Dresses'};
  if (lower.includes('shirt dress'))
    return {main: 'Dresses', sub: 'Shirt Dresses'};
  if (lower.includes('cocktail dress'))
    return {main: 'Dresses', sub: 'Cocktail Dresses'};
  if (lower.includes('sundress'))
    return {main: 'Dresses', sub: 'Casual Dresses'};

  // --- Loungewear / Sleepwear / Swimwear / Maternity / Unisex / Traditional ---
  if (lower.includes('pajama')) return {main: 'Sleepwear', sub: 'Pajamas'};
  if (lower.includes('robe')) return {main: 'Sleepwear', sub: 'Robes'};
  if (lower.includes('nightgown'))
    return {main: 'Sleepwear', sub: 'Nightgowns'};
  if (lower.includes('swim trunk'))
    return {main: 'Swimwear', sub: 'Swim Trunks'};
  if (lower.includes('bikini')) return {main: 'Swimwear', sub: 'Bikinis'};
  if (lower.includes('one-piece'))
    return {main: 'Swimwear', sub: 'One-piece Swimsuits'};
  if (lower.includes('maternity dress'))
    return {main: 'Maternity', sub: 'Maternity Dresses'};
  if (lower.includes('maternity'))
    return {main: 'Maternity', sub: 'Maternity Tops'};
  if (lower.includes('gender-neutral'))
    return {main: 'Unisex', sub: 'Gender-Neutral Tees'};
  if (lower.includes('oversized'))
    return {main: 'Unisex', sub: 'Oversized Tees'};
  if (lower.includes('utility vest'))
    return {main: 'Unisex', sub: 'Utility Vests'};
  if (lower.includes('costume')) return {main: 'Costumes', sub: 'Costumes'};
  if (lower.includes('cultural'))
    return {main: 'TraditionalWear', sub: 'Cultural Attire'};

  return null;
}
