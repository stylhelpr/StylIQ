// hooks/useStyleProfile.ts
import {useState} from 'react';

export function useStyleProfile() {
  const [styleProfile, setStyleProfile] = useState({
    height: '',
    weight: '',
    bodyType: '',
    skinTone: '',
    hairColor: '',
    topSize: '',
    bottomSize: '',
    shoeSize: '',
    preferredFit: '',
    primaryStyles: [],
    colorPreferences: [],
    patterns: [],
    location: '',
    dailyActivities: [],
    occasions: [],
    priceRange: '',
    preferredBrands: [],
    dislikes: [],
    desiredImpression: '',
    notes: '',
  });

  const updateProfile = (field: string, value: any) => {
    setStyleProfile(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return {styleProfile, updateProfile};
}
