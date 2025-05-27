// RootNavigator.tsx
import React, {useState} from 'react';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';

type Screen = 'Home' | 'Profile';

const RootNavigator = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('Home');
  const [userId, setUserId] = useState<string | null>(null);

  const navigate = (screen: Screen, params?: {userId: string}) => {
    if (screen === 'Profile' && params?.userId) {
      setUserId(params.userId);
    }
    setCurrentScreen(screen);
  };

  if (currentScreen === 'Profile' && userId) {
    return <ProfileScreen userId={userId} navigate={navigate} />;
  }

  return <HomeScreen navigate={navigate} />;
};

export default RootNavigator;
