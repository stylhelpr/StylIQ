import React from 'react';
import TryOnOverlayScreen from './TryOnOverlayScreen';

const mockOutfit = {
  top: {
    name: 'Red Tee',
    imageUri:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/T-shirt_red.png/200px-T-shirt_red.png',
  },
  bottom: {
    name: 'Jeans',
    imageUri:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Jeans_for_men.jpg/200px-Jeans_for_men.jpg',
  },
  shoes: {
    name: 'Sneakers',
    imageUri:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Sneakers_icon.png/240px-Sneakers_icon.png',
  },
};

export default function TryOnOverlayWrapperScreen({screenParams}: any) {
  const {outfit, userPhotoUri} = screenParams || {};

  if (!outfit || !userPhotoUri) {
    console.warn('TryOnOverlay missing outfit or userPhotoUri');
    return null;
  }

  return <TryOnOverlayScreen userPhotoUri={userPhotoUri} outfit={outfit} />;
}
