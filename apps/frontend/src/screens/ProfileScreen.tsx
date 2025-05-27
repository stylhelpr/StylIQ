import React from 'react';
import {View, Text, Button} from 'react-native';

type Screen = 'Home' | 'Profile';

type Props = {
  userId: string;
  navigate: (screen: Screen, params?: {userId: string}) => void;
};

export default function ProfileScreen({userId, navigate}: Props) {
  return (
    <View>
      <Text>👤 Profile Screen</Text>
      <Text>User ID: {userId}</Text>
      <Button title="Back to Home" onPress={() => navigate('Home')} />
    </View>
  );
}
