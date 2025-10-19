import React from 'react';
import {Image} from 'react-native';
import TryOnOverlayScreen from '../../screens/TryOnOverlayScreen';
import userPhoto from '../assets/images/full-body-temp1.png';

const mockOutfit = {
  top: {
    name: 'Red Tee',
    imageUri: 'https://yourserver.com/mock/red-shirt.png',
  },
  bottom: {
    name: 'Jeans',
    imageUri: 'https://yourserver.com/mock/jeans.png',
  },
  shoes: {
    name: 'Shoes',
    imageUri: 'https://yourserver.com/mock/shoes.png',
  },
};

export default function TryOnDemoScreen() {
  return (
    <TryOnOverlayScreen
      userPhotoUri={Image.resolveAssetSource(userPhoto).uri}
      outfit={mockOutfit}
    />
  );
}
