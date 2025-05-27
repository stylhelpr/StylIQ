import React from 'react';
import {View, Text} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack'; // ✅ use JS stack
import {RootStackParamList} from '../navigation/RootNavigator';

type Props = StackScreenProps<RootStackParamList, 'Profile'>;

export default function ProfileScreen({route}: Props) {
  return (
    <View>
      <Text>Profile Screen</Text>
      <Text>User ID: {route.params.userId}</Text>
    </View>
  );
}
