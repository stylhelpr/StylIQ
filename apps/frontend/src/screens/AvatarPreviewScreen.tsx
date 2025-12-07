import React from 'react';
import {View, Text} from 'react-native';
import AvatarViewer from '../components/AvatarViewer/AvatarViewer';
import {mapMeasurementsToMorphs} from '../utils/avatarMorphMapping';

export default function AvatarPreviewScreen({route}) {
  const {gender, measurements} = route.params;

  const morphs = mapMeasurementsToMorphs(measurements);

  return (
    <View style={{flex: 1, backgroundColor: 'black'}}>
      <Text
        style={{
          color: 'white',
          fontSize: 24,
          fontWeight: '600',
          textAlign: 'center',
          marginTop: 20,
        }}>
        Your 3D Body Model
      </Text>

      <AvatarViewer gender={gender} morphs={morphs} />
    </View>
  );
}
