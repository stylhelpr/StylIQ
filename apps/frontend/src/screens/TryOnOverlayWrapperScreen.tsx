import React from 'react';
import {Image} from 'react-native';
import TryOnOverlayScreen from './TryOnOverlayScreen';

import maleBody from '../assets/images/male-body-2.png';

const DEFAULT_USER_PHOTO = Image.resolveAssetSource(maleBody).uri;

export default function TryOnOverlayWrapperScreen({screenParams}: any) {
  const {outfit, userPhotoUri} = screenParams || {};

  if (!outfit) {
    console.warn('TryOnOverlay missing outfit');
    return null;
  }

  return (
    <TryOnOverlayScreen
      userPhotoUri={userPhotoUri || DEFAULT_USER_PHOTO}
      outfit={outfit}
    />
  );
}
