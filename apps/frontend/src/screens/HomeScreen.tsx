import React from 'react';
import {View, Text, Button} from 'react-native';
import {useNavigationState} from '../../../../store/navigation';

export default function HomeScreen() {
  const {navigate} = useNavigationState();

  return (
    <View>
      <Text>Home</Text>
      <Button
        title="Go to Profile"
        onPress={() => navigate('Profile', {userId: '123'})}
      />
    </View>
  );
}
