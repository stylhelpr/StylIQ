// Full deeply descriptive fashion metadata types for a production-grade fashion AI app

export type MainCategory =
  | 'Tops'
  | 'Bottoms'
  | 'Outerwear'
  | 'Shoes'
  | 'Accessories'
  | 'Undergarments'
  | 'Activewear'
  | 'Formalwear'
  | 'Loungewear'
  | 'Sleepwear'
  | 'Swimwear'
  | 'Maternity'
  | 'Unisex'
  | 'Costumes'
  | 'Traditional Wear';

export type Subcategory =
  // Tops
  | 'T-Shirts'
  | 'Graphic T-Shirts'
  | 'Long Sleeve Shirts'
  | 'Polo Shirts'
  | 'Dress Shirts'
  | 'Blouses'
  | 'Henleys'
  | 'Tank Tops'
  | 'Crop Tops'
  | 'Bodysuits'
  | 'Sweaters'
  | 'Hoodies'
  | 'Corsets'

  // Bottoms
  | 'Jeans'
  | 'Chinos'
  | 'Trousers'
  | 'Joggers'
  | 'Shorts'
  | 'Cargo Pants'
  | 'Skirts'
  | 'Culottes'
  | 'Leggings'

  // Outerwear
  | 'Bomber Jackets'
  | 'Blazers'
  | 'Trench Coats'
  | 'Peacoats'
  | 'Leather Jackets'
  | 'Denim Jackets'
  | 'Parkas'
  | 'Raincoats'
  | 'Capes'
  | 'Vests'

  // Shoes
  | 'Athletic Sneakers'
  | 'Lifestyle Sneakers'
  | 'Oxfords'
  | 'Derbies'
  | 'Monk Straps'
  | 'Loafers'
  | 'Boat Shoes'
  | 'Espadrilles'
  | 'Chelsea Boots'
  | 'Combat Boots'
  | 'Chukkas'
  | 'Heels'
  | 'Flats'
  | 'Sandals'
  | 'Slides'
  | 'Clogs'
  | 'Slippers'

  // Accessories
  | 'Belts'
  | 'Hats'
  | 'Scarves'
  | 'Gloves'
  | 'Sunglasses'
  | 'Watches'
  | 'Jewelry'
  | 'Hair Accessories'
  | 'Bags'
  | 'Ties'
  | 'Bow Ties'
  | 'Pocket Squares'
  | 'Pins & Brooches'
  | 'Face Masks'
  | 'Tech Accessories'

  // Undergarments
  | 'Undershirts'
  | 'Briefs'
  | 'Boxers'
  | 'Boxer Briefs'
  | 'Bras'
  | 'Panties'
  | 'Socks'
  | 'Shapewear'

  // Activewear
  | 'Athletic Tops'
  | 'Running Shorts'
  | 'Leggings'
  | 'Performance Jackets'
  | 'Gym Hoodies'
  | 'Sports Bras'
  | 'Track Pants'

  // Formalwear
  | 'Suits'
  | 'Tuxedos'
  | 'Waistcoats'
  | 'Gowns'
  | 'Evening Dresses'
  | 'Dress Pants'

  // Loungewear / Sleepwear / etc.
  | 'Pajamas'
  | 'Robes'
  | 'Nightgowns'
  | 'Swim Trunks'
  | 'Bikinis'
  | 'One-piece Swimsuits'
  | 'Maternity Tops'
  | 'Maternity Dresses'
  | 'Gender-Neutral Tees'
  | 'Oversized Tees'
  | 'Utility Vests'
  | 'Costumes'
  | 'Cultural Attire';

export type MaterialType =
  | 'Cotton'
  | 'Wool'
  | 'Cashmere'
  | 'Linen'
  | 'Silk'
  | 'Polyester'
  | 'Nylon'
  | 'Leather'
  | 'Denim'
  | 'Suede'
  | 'Velvet'
  | 'Fleece'
  | 'Rayon'
  | 'Spandex'
  | 'Acrylic'
  | 'Tweed'
  | 'Corduroy'
  | 'Satin'
  | 'Bamboo'
  | 'Mesh'
  | 'Tencel'
  | 'Modal'
  | 'Other';

export type FitType =
  | 'Slim Fit'
  | 'Regular Fit'
  | 'Relaxed Fit'
  | 'Modern Fit'
  | 'Classic Fit'
  | 'Oversized Fit'
  | 'Tailored Fit'
  | 'Boxy Fit';

export type BottomFitType =
  | 'Straight Leg'
  | 'Slim Leg'
  | 'Skinny Fit'
  | 'Tapered Fit'
  | 'Bootcut'
  | 'Flared'
  | 'Wide Leg'
  | 'Relaxed Fit'
  | 'High-Waisted'
  | 'Low-Rise'
  | 'Mid-Rise';

export type SizeType =
  | 'Alpha'
  | 'Numeric'
  | 'Lettered'
  | 'ShoeSize'
  | 'BraSize'
  | 'Waist/Inseam'
  | 'One Size';

export type ClothingSize =
  | 'XXXS'
  | 'XXS'
  | 'XS'
  | 'S'
  | 'M'
  | 'L'
  | 'XL'
  | 'XXL'
  | 'XXXL'
  | 'One Size'
  | '0'
  | '2'
  | '4'
  | '6'
  | '8'
  | '10'
  | '12'
  | '14'
  | '16'
  | '18'
  | '20'
  | '22'
  | '24'
  | '28'
  | '30'
  | '32'
  | '34'
  | '36'
  | '38'
  | '40'
  | '42'
  | '44'
  | '46'
  | '48'
  | '50'
  | '28/30'
  | '30/30'
  | '30/32'
  | '32/32'
  | '32/34'
  | '34/30'
  | '34/32'
  | '36/32'
  | '38/34'
  | '40/34'
  | '42/36'
  | string;

export type ShoeSize =
  | '5'
  | '5.5'
  | '6'
  | '6.5'
  | '7'
  | '7.5'
  | '8'
  | '8.5'
  | '9'
  | '9.5'
  | '10'
  | '10.5'
  | '11'
  | '11.5'
  | '12'
  | '13'
  | '14'
  | string;

export type StyleType =
  | 'Casual'
  | 'Formal'
  | 'Business'
  | 'Smart Casual'
  | 'Streetwear'
  | 'Athleisure'
  | 'Vintage'
  | 'Luxury'
  | 'Trendy'
  | 'Minimalist'
  | 'Bohemian'
  | 'Preppy'
  | 'Grunge'
  | 'Edgy'
  | 'Classic'
  | 'Artsy'
  | 'Glam'
  | 'Y2K'
  | 'Hipster'
  | 'Blue Collar'
  | 'Rugged'
  | 'Techwear'
  | 'Goth'
  | 'Romantic'
  | 'Eclectic'
  | 'Normcore'
  | 'Other';

export type SeasonType = 'Spring' | 'Summer' | 'Fall' | 'Winter' | 'All-Season';

export type OccasionType =
  | 'Casual'
  | 'Business Casual'
  | 'Business Formal'
  | 'Evening Out'
  | 'Date'
  | 'Wedding'
  | 'Interview'
  | 'Gym'
  | 'Beach'
  | 'Vacation'
  | 'Festival'
  | 'Streetwear'
  | 'Homewear'
  | 'Travel'
  | 'Religious Event'
  | 'Funeral'
  | 'Party'
  | 'Photoshoot'
  | 'Performance';

export type ColorType =
  | 'Black'
  | 'White'
  | 'Gray'
  | 'Navy'
  | 'Brown'
  | 'Beige'
  | 'Green'
  | 'Red'
  | 'Blue'
  | 'Yellow'
  | 'Pink'
  | 'Purple'
  | 'Orange'
  | 'Burgundy'
  | 'Olive'
  | 'Gold'
  | 'Silver'
  | 'Multicolor';

export type PatternType =
  | 'Solid'
  | 'Striped'
  | 'Plaid'
  | 'Checked'
  | 'Polka Dot'
  | 'Floral'
  | 'Graphic'
  | 'Animal Print'
  | 'Abstract';

export type AgeGroup =
  | 'Infant' // 0–2 years
  | 'Toddler' // 2–5 years
  | 'Child' // 6–12 years
  | 'Teen' // 13–19 years
  | 'Young Adult' // 20–29 years
  | 'Adult' // 30–54 years
  | 'Mature'; // 55+ years;

export type ClimateType =
  | 'All Weather'
  | 'Hot'
  | 'Humid'
  | 'Dry Heat'
  | 'Mild'
  | 'Cool'
  | 'Cold'
  | 'Wet / Rainy'
  | 'Snow / Freezing';

export type GenderPresentation =
  | 'Masculine'
  | 'Feminine'
  | 'Androgynous'
  | 'Unisex'
  | 'Genderfluid';

export type StyleArchetype =
  | 'Minimalist'
  | 'Luxury'
  | 'Streetwear'
  | 'Classic'
  | 'Preppy'
  | 'Bohemian'
  | 'Trendy'
  | 'Edgy'
  | 'Artistic'
  | 'Athleisure'
  | 'Businesswear'
  | 'Vintage'
  | 'Y2K'
  | 'Goth'
  | 'Techwear'
  | 'Blue Collar'
  | 'Western'
  | 'Grunge'
  | 'Coastal'
  | 'Cottagecore';

export type SustainabilityTag =
  | 'Vegan'
  | 'Organic'
  | 'Recycled'
  | 'Ethically Made'
  | 'Fair Trade'
  | 'Carbon Neutral'
  | 'Local Brand';

export type SpecialTag =
  | 'Adaptive Clothing'
  | 'Post-Surgery'
  | 'Nursing Friendly'
  | 'Pregnancy Friendly'
  | 'Compression Wear'
  | 'Uniform'
  | 'Protective Gear'
  | 'High-Visibility'
  | 'Religious Wear';

export type CulturalInfluence =
  | 'Western'
  | 'Eastern'
  | 'South Asian'
  | 'Middle Eastern'
  | 'African'
  | 'East Asian'
  | 'Caribbean'
  | 'Indigenous'
  | 'Latin American'
  | 'European Classic'
  | 'Nordic';

export type FormalityLevel =
  | 'Ultra Casual'
  | 'Casual'
  | 'Smart Casual'
  | 'Business Casual'
  | 'Business Formal'
  | 'Cocktail'
  | 'Semi-Formal'
  | 'Black Tie'
  | 'White Tie';

export type LayeringType =
  | 'Base Layer'
  | 'Mid Layer'
  | 'Outer Layer'
  | 'Standalone';

export type FabricWeight = 'Lightweight' | 'Mediumweight' | 'Heavyweight';

export type CareLevel =
  | 'Machine Washable'
  | 'Hand Wash Only'
  | 'Dry Clean Only'
  | 'Wrinkle Resistant'
  | 'Delicate Care';

export type MobilityRange =
  | 'Rigid'
  | 'Structured'
  | 'Semi-Flexible'
  | 'Flexible'
  | 'Stretch';

export type ClosureType =
  | 'Zipper'
  | 'Buttons'
  | 'Hook & Eye'
  | 'Velcro'
  | 'Snap'
  | 'Elastic'
  | 'Drawstring'
  | 'Slip-On';

export type NecklineType =
  | 'Crew Neck'
  | 'V-Neck'
  | 'Scoop Neck'
  | 'Boat Neck'
  | 'Turtleneck'
  | 'Collared'
  | 'Off Shoulder'
  | 'Sweetheart'
  | 'Square Neck'
  | 'Keyhole';

export type SleeveType =
  | 'Sleeveless'
  | 'Short Sleeve'
  | 'Half Sleeve'
  | '3/4 Sleeve'
  | 'Long Sleeve'
  | 'Bell Sleeve'
  | 'Puff Sleeve'
  | 'Cap Sleeve'
  | 'Drop Shoulder';

export type HemlineType =
  | 'Mini'
  | 'Above Knee'
  | 'Knee Length'
  | 'Midi'
  | 'Maxi'
  | 'Asymmetrical';

export type GarmentPurpose =
  | 'Daily Wear'
  | 'Workwear'
  | 'Special Occasion'
  | 'Sleepwear'
  | 'Athletic Performance'
  | 'Lounge'
  | 'Travel'
  | 'Protective';

export type FabricConstruction =
  | 'Knit'
  | 'Woven'
  | 'Fleece'
  | 'Ribbed'
  | 'Mesh'
  | 'Lace'
  | 'Jacquard'
  | 'Quilted'
  | 'Chiffon'
  | 'Sateen'
  | 'Twill';

export type GarmentOrigin =
  | 'Handmade'
  | 'Locally Produced'
  | 'Mass-Produced'
  | 'Luxury Designer'
  | 'Boutique'
  | 'Fast Fashion Brand';

export type LayerIndex = 1 | 2 | 3; // 1 = base, 2 = mid, 3 = outer

export type PriceTier = 'Budget' | 'Midrange' | 'Premium' | 'Luxury';

export type FabricFeel =
  | 'Soft'
  | 'Smooth'
  | 'Rough'
  | 'Textured'
  | 'Silky'
  | 'Stiff'
  | 'Stretchy';

export type CountryOfOrigin =
  | 'USA'
  | 'Italy'
  | 'France'
  | 'Japan'
  | 'UK'
  | 'China'
  | 'India'
  | 'Bangladesh'
  | 'Vietnam'
  | 'Other';

export type BrandAffiliation =
  | 'Nike'
  | 'Zara'
  | 'Gucci'
  | 'Uniqlo'
  | 'H&M'
  | 'Louis Vuitton'
  | string;

export type UserStyleGoals =
  | 'Refresh Wardrobe'
  | 'Elevate Style'
  | 'Stay Trendy'
  | 'Pack for Trip'
  | 'Seasonal Update'
  | 'Professional Look'
  | 'Special Event'
  | 'Minimal Wardrobe';

export type BodyType =
  | 'Hourglass'
  | 'Pear'
  | 'Rectangle'
  | 'Apple'
  | 'Inverted Triangle'
  | 'Tall'
  | 'Petite'
  | 'Athletic'
  | 'Plus Size';

export type SkinTone =
  | 'Fair'
  | 'Light'
  | 'Medium'
  | 'Olive'
  | 'Tan'
  | 'Brown'
  | 'Dark';

export type Undertone = 'Cool' | 'Warm' | 'Neutral';
