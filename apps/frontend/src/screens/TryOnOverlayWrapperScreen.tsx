import React from 'react';
import {Image} from 'react-native';
import TryOnOverlayScreen from './TryOnOverlayScreen';
import userPhoto from '../assets/images/full-body-temp1.png';

const mockOutfit = {
  top: {
    name: 'Red Tee',
    imageUri: 'https://yourdomain.com/mock/red-shirt.png',
  },
  bottom: {
    name: 'Black Jeans',
    imageUri: 'https://yourdomain.com/mock/black-jeans.png',
  },
  shoes: {
    name: 'Sneakers',
    imageUri: 'https://yourdomain.com/mock/sneakers.png',
  },
};

export default function TryOnOverlayWrapperScreen() {
  return (
    <TryOnOverlayScreen
      userPhotoUri={Image.resolveAssetSource(userPhoto).uri}
      outfit={mockOutfit}
    />
  );
}
