import React from 'react';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import {View} from 'react-native';
import {useNavigationState} from '../../../../store/navigation';

const RootNavigator = () => {
  const {currentScreen, params} = useNavigationState();

  return (
    <View style={{flex: 1}}>
      {currentScreen === 'Home' && <HomeScreen />}
      {currentScreen === 'Profile' && <ProfileScreen userId={params?.userId} />}
    </View>
  );
};

export default RootNavigator;
