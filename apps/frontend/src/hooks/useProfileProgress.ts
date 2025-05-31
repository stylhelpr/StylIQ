import type {WardrobeItem} from '../hooks/useOutfitSuggestion';

export function useProfileProgress(userProfile: any, wardrobe: WardrobeItem[]) {
  let progress = 0;

  if (wardrobe.length >= 3) progress += 20;
  if (userProfile.bodyType) progress += 10;
  if (userProfile.fitPreferences?.length) progress += 10;
  if (userProfile.colorPreferences?.length || userProfile.styleTags?.length)
    progress += 10;
  if (userProfile.measurements?.height && userProfile.measurements?.weight)
    progress += 15;
  if (userProfile.favoriteBrands?.length) progress += 10;
  if (userProfile.climate || userProfile.lifestyle) progress += 10;
  if (userProfile.proportions && userProfile.personality) progress += 15;

  return Math.min(progress, 100);
}
