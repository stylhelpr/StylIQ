// // RootNavigator.tsx
// import React, {useState} from 'react';
// import HomeScreen from '../screens/HomeScreen';
// import ProfileScreen from '../screens/ProfileScreen';

// export type Screen = 'Home' | 'Profile';

// interface ScreenResult {
//   screen: Screen;
//   component: JSX.Element;
// }

// const useCustomRouter = (): [
//   JSX.Element,
//   (screen: Screen, params?: {userId: string}) => void,
// ] => {
//   const [currentScreen, setCurrentScreen] = useState<Screen>('Home');
//   const [userId, setUserId] = useState<string | null>(null);

//   const navigate = (screen: Screen, params?: {userId: string}) => {
//     if (screen === 'Profile' && params?.userId) setUserId(params.userId);
//     setCurrentScreen(screen);
//   };

//   let content: JSX.Element;

//   if (currentScreen === 'Profile' && userId) {
//     content = <ProfileScreen userId={userId} navigate={navigate} />;
//   } else {
//     content = <HomeScreen navigate={navigate} />;
//   }

//   return [content, navigate];
// };

// export default useCustomRouter;

//////////

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
