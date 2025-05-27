import React from 'react';
import {View, Text, Button} from 'react-native';

type Screen = 'Home' | 'Profile';

type Props = {
  navigate: (screen: Screen, params?: {userId: string}) => void;
};

export default function HomeScreen({navigate}: Props) {
  return (
    <View>
      <Text>🏠 Home Screen</Text>
      <Button
        title="Go to Profile"
        onPress={() => navigate('Profile', {userId: '123'})}
      />
    </View>
  );
}
