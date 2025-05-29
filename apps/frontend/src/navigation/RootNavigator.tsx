// RootNavigator.tsx
import React, {useState} from 'react';
import {View, StyleSheet} from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ExploreScreen from '../screens/ExploreScreen';
import ClosetScreen from '../screens/ClosetScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AddItemScreen from '../screens/AddItemScreen';
import ItemDetailScreen from '../components/ItemDetailScreen/ItemDetailScreen';
import BottomNavigation from '../components/BottomNavigation/BottomNavigation';
import {useAppTheme} from '../context/ThemeContext';
import {v4 as uuidv4} from 'uuid';
import {mockClothingItems} from '../components/mockClothingItems/mockClothingItems'; // ✅ import mock data

type Screen =
  | 'Home'
  | 'Profile'
  | 'Explore'
  | 'Closet'
  | 'Settings'
  | 'Voice'
  | 'ItemDetail'
  | 'AddItem';

const RootNavigator = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('Home');
  const [screenParams, setScreenParams] = useState<any>(null);
  const [wardrobe, setWardrobe] = useState<any[]>(mockClothingItems); // ✅ start with mock items
  const {theme} = useAppTheme();

  const navigate = (screen: Screen, params?: any) => {
    setCurrentScreen(screen);
    setScreenParams(params || null);
  };

  const addToWardrobe = (item: any) => {
    setWardrobe(prev => [item, ...prev]);
    setCurrentScreen('Closet');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Profile':
        return <ProfileScreen navigate={navigate} />;
      case 'Explore':
        return <ExploreScreen navigate={navigate} />;
      case 'Closet':
        return (
          <ClosetScreen
            key={wardrobe.length}
            navigate={navigate}
            wardrobe={wardrobe}
          />
        );
      case 'Settings':
        return <SettingsScreen navigate={navigate} />;
      case 'ItemDetail':
        return (
          <ItemDetailScreen
            route={{params: screenParams}}
            navigation={{goBack: () => setCurrentScreen('Closet')}}
          />
        );
      case 'AddItem':
        return <AddItemScreen navigate={navigate} addItem={addToWardrobe} />;
      default:
        return <HomeScreen navigate={navigate} />;
    }
  };

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <View style={styles.screen}>{renderScreen()}</View>
      <BottomNavigation current={currentScreen} navigate={navigate} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screen: {
    flex: 1,
    marginTop: 55,
  },
});

export default RootNavigator;

///////////

// // RootNavigator.tsx
// import React, {useState} from 'react';
// import {View, StyleSheet} from 'react-native';
// import HomeScreen from '../screens/HomeScreen';
// import ProfileScreen from '../screens/ProfileScreen';
// import ExploreScreen from '../screens/ExploreScreen';
// import ClosetScreen from '../screens/ClosetScreen';
// import SettingsScreen from '../screens/SettingsScreen';
// import AddItemScreen from '../screens/AddItemScreen';
// import ItemDetailScreen from '../components/ItemDetailScreen/ItemDetailScreen';
// import BottomNavigation from '../components/BottomNavigation/BottomNavigation';
// import {useAppTheme} from '../context/ThemeContext';
// import {v4 as uuidv4} from 'uuid';

// type Screen =
//   | 'Home'
//   | 'Profile'
//   | 'Explore'
//   | 'Closet'
//   | 'Settings'
//   | 'Voice'
//   | 'ItemDetail'
//   | 'AddItem';

// const RootNavigator = () => {
//   const [currentScreen, setCurrentScreen] = useState<Screen>('Home');
//   const [screenParams, setScreenParams] = useState<any>(null);
//   const [wardrobe, setWardrobe] = useState<any[]>([]);
//   const {theme} = useAppTheme();

//   const navigate = (screen: Screen, params?: any) => {
//     setCurrentScreen(screen);
//     setScreenParams(params || null);
//   };

//   const addToWardrobe = (item: any) => {
//     setWardrobe(prev => [...prev, item]);
//     setCurrentScreen('Closet'); // OPTIONAL: Redundant if already navigating in AddItem
//   };

//   const renderScreen = () => {
//     switch (currentScreen) {
//       case 'Profile':
//         return <ProfileScreen navigate={navigate} />;
//       case 'Explore':
//         return <ExploreScreen navigate={navigate} />;
//       case 'Closet':
//         return (
//           <ClosetScreen
//             key={wardrobe.length} // 👈 forces rerender when new item is added
//             navigate={navigate}
//             wardrobe={wardrobe}
//           />
//         );
//       case 'Settings':
//         return <SettingsScreen navigate={navigate} />;
//       case 'ItemDetail':
//         return (
//           <ItemDetailScreen
//             route={{params: screenParams}}
//             navigation={{goBack: () => setCurrentScreen('Closet')}}
//           />
//         );
//       case 'AddItem':
//         return <AddItemScreen navigate={navigate} addItem={addToWardrobe} />;
//       default:
//         return <HomeScreen navigate={navigate} />;
//     }
//   };

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <View style={styles.screen}>{renderScreen()}</View>
//       <BottomNavigation current={currentScreen} navigate={navigate} />
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   screen: {
//     flex: 1,
//     marginTop: 55,
//   },
// });

// export default RootNavigator;

/////////////

// import React, {useState} from 'react';
// import {View, StyleSheet} from 'react-native';
// import HomeScreen from '../screens/HomeScreen';
// import ProfileScreen from '../screens/ProfileScreen';
// import ExploreScreen from '../screens/ExploreScreen';
// import ClosetScreen from '../screens/ClosetScreen';
// import SettingsScreen from '../screens/SettingsScreen';
// import BottomNavigation from '../components/BottomNavigation/BottomNavigation';
// import {useAppTheme} from '../context/ThemeContext';

// type Screen = 'Home' | 'Profile' | 'Explore' | 'Closet' | 'Settings' | 'Voice';

// const RootNavigator = () => {
//   const [currentScreen, setCurrentScreen] = useState<Screen>('Home');
//   const {theme} = useAppTheme();

//   const navigate = (screen: Screen) => {
//     setCurrentScreen(screen);
//   };

//   const renderScreen = () => {
//     switch (currentScreen) {
//       case 'Profile':
//         return <ProfileScreen navigate={navigate} />;
//       case 'Explore':
//         return <ExploreScreen navigate={navigate} />;
//       case 'Closet':
//         return <ClosetScreen navigate={navigate} />;
//       case 'Settings':
//         return <SettingsScreen navigate={navigate} />;
//       default:
//         return <HomeScreen navigate={navigate} />;
//     }
//   };

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <View style={styles.screen}>{renderScreen()}</View>
//       <BottomNavigation current={currentScreen} navigate={navigate} />
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   screen: {
//     flex: 1,
//     marginTop: 55, // 👈 Add your top margin here
//   },
// });

// export default RootNavigator;

/////////////

// import React, {useState} from 'react';
// import {View, Button, StyleSheet} from 'react-native';
// import HomeScreen from '../screens/HomeScreen';
// import ProfileScreen from '../screens/ProfileScreen';
// import ExploreScreen from '../screens/ExploreScreen';
// import ClosetScreen from '../screens/ClosetScreen';
// import SettingsScreen from '../screens/SettingsScreen';

// type Screen = 'Home' | 'Profile' | 'Explore' | 'Closet' | 'Settings';

// const RootNavigator = () => {
//   const [currentScreen, setCurrentScreen] = useState<Screen>('Home');

//   const navigate = (screen: Screen) => {
//     setCurrentScreen(screen);
//   };

//   const renderScreen = () => {
//     switch (currentScreen) {
//       case 'Profile':
//         return <ProfileScreen navigate={navigate} />;
//       case 'Explore':
//         return <ExploreScreen navigate={navigate} />;
//       case 'Closet':
//         return <ClosetScreen navigate={navigate} />;
//       case 'Settings':
//         return <SettingsScreen navigate={navigate} />;
//       default:
//         return <HomeScreen navigate={navigate} />;
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <View style={styles.screen}>{renderScreen()}</View>
//       <View style={styles.tabBar}>
//         <Button title="Home" onPress={() => navigate('Home')} />
//         <Button title="Profile" onPress={() => navigate('Profile')} />
//         <Button title="Explore" onPress={() => navigate('Explore')} />
//         <Button title="Closet" onPress={() => navigate('Closet')} />
//         <Button title="Settings" onPress={() => navigate('Settings')} />
//       </View>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {flex: 1},
//   screen: {flex: 1},
//   tabBar: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     paddingVertical: 12,
//     backgroundColor: '#eee',
//     borderTopWidth: 1,
//     borderColor: '#ccc',
//   },
// });

// export default RootNavigator;

/////////////

// import React, {useState} from 'react';
// import {View, Button, StyleSheet} from 'react-native';
// import HomeScreen from '../screens/HomeScreen';
// import ProfileScreen from '../screens/ProfileScreen';
// import ExploreScreen from '../screens/ExploreScreen';
// import ClosetScreen from '../screens/ClosetScreen';
// import SettingsScreen from '../screens/SettingsScreen';

// type Screen = 'Home' | 'Profile' | 'Explore' | 'Closet' | 'Settings';

// const RootNavigator = () => {
//   const [currentScreen, setCurrentScreen] = useState<Screen>('Home');

//   const navigate = (screen: Screen) => {
//     setCurrentScreen(screen);
//   };

//   const renderScreen = () => {
//     switch (currentScreen) {
//       case 'Profile':
//         return <ProfileScreen />;
//       case 'Explore':
//         return <ExploreScreen navigate={navigate} />;
//       case 'Closet':
//         return <ClosetScreen navigate={navigate} />;
//       case 'Settings':
//         return <SettingsScreen navigate={navigate} />;
//       default:
//         return <HomeScreen navigate={navigate} />;
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <View style={styles.screen}>{renderScreen()}</View>
//       <View style={styles.tabBar}>
//         <Button title="Home" onPress={() => navigate('Home')} />
//         <Button title="Profile" onPress={() => navigate('Profile')} />
//         <Button title="Explore" onPress={() => navigate('Explore')} />
//         <Button title="Closet" onPress={() => navigate('Closet')} />
//         <Button title="Settings" onPress={() => navigate('Settings')} />
//       </View>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {flex: 1},
//   screen: {flex: 1},
//   tabBar: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     paddingVertical: 12,
//     backgroundColor: '#eee',
//     borderTopWidth: 1,
//     borderColor: '#ccc',
//   },
// });

// export default RootNavigator;

///////////

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
// import React, {useState} from 'react';
// import HomeScreen from '../screens/HomeScreen';
// import ProfileScreen from '../screens/ProfileScreen';

// type Screen = 'Home' | 'Profile';

// const RootNavigator = () => {
//   const [currentScreen, setCurrentScreen] = useState<Screen>('Home');
//   const [userId, setUserId] = useState<string | null>(null);

//   const navigate = (screen: Screen, params?: {userId: string}) => {
//     if (screen === 'Profile' && params?.userId) {
//       setUserId(params.userId);
//     }
//     setCurrentScreen(screen);
//   };

//   if (currentScreen === 'Profile' && userId) {
//     return <ProfileScreen userId={userId} navigate={navigate} />;
//   }

//   return <HomeScreen navigate={navigate} />;
// };

// export default RootNavigator;
