export function useProfileProgress(userProfile: any, wardrobe: WardrobeItem[]) {
  let progress = 0;

  if (wardrobe.length >= 3) progress += 20;
  if (userProfile.body_type) progress += 10;
  if (userProfile.fit_preferences?.length) progress += 10;
  if (
    userProfile.color_preferences?.length ||
    userProfile.style_keywords?.length
  )
    progress += 10;
  if (userProfile.height && userProfile.weight) progress += 15;
  if (userProfile.preferred_brands?.length) progress += 10;
  if (userProfile.climate || userProfile.lifestyle_notes) progress += 10;
  if (userProfile.proportions && userProfile.personality_traits) progress += 15;

  console.log('🔍 Progress Debug:', {
    wardrobeCount: wardrobe.length,
    hasBodyType: !!userProfile.body_type,
    hasFitPreferences: !!userProfile.fit_preferences?.length,
    hasColorPreferences: !!userProfile.color_preferences?.length,
    hasStyleKeywords: !!userProfile.style_keywords?.length,
    hasMeasurements: !!userProfile.height && !!userProfile.weight,
    hasFavoriteBrands: !!userProfile.preferred_brands?.length,
    hasClimate: !!userProfile.climate,
    hasLifestyle: !!userProfile.lifestyle_notes,
    hasProportions: !!userProfile.proportions,
    hasPersonalityTraits: !!userProfile.personality_traits,
  });

  return Math.min(progress, 100);
}
