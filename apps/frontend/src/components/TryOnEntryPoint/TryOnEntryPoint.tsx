import React from 'react';
import TryOnOverlayScreen from 'screens/TryOnOverlayScreen';
import {mockOutfit} from 'components/MockOutfit/MockOutfit';

export default function TryOnEntryPoint() {
  return (
    <TryOnOverlayScreen
      userPhotoUri="https://yourdomain.com/uploads/user-fullbody.png"
      outfit={mockOutfit}
    />
  );
}
