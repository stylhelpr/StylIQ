import React, {useState} from 'react';
import {View, StyleSheet, TouchableOpacity, Text} from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ExploreScreen from '../screens/ExploreScreen';
import ClosetScreen from '../screens/ClosetScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AddItemScreen from '../screens/AddItemScreen';
import ItemDetailScreen from '../components/ItemDetailScreen/ItemDetailScreen';
import OutfitScreen from '../screens/OutfitScreen';
import SearchScreen from '../screens/SearchScreen';

import BottomNavigation from '../components/BottomNavigation/BottomNavigation';
import {useAppTheme} from '../context/ThemeContext';
import {mockClothingItems} from '../components/mockClothingItems/mockClothingItems';
import {WardrobeItem} from '../hooks/useOutfitSuggestion';
import LoginScreen from '../screens/LoginScreen';
import LayoutWrapper from '../components/LayoutWrapper/LayoutWrapper';

type Screen =
  | 'Login'
  | 'Home'
  | 'Profile'
  | 'Explore'
  | 'Closet'
  | 'Settings'
  | 'Voice'
  | 'ItemDetail'
  | 'AddItem'
  | 'Outfit'
  | 'Search';

const RootNavigator = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('Login');
  const [prevScreen, setPrevScreen] = useState<Screen>('Home');
  const [screenParams, setScreenParams] = useState<any>(null);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(mockClothingItems);

  const screensWithNoHeader = ['Login', 'ItemDetail', 'AddItem', 'Home'];
  const screensWithSettings = ['Profile'];

  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    screen: {
      flex: 1,
    },
    debugButton: {
      position: 'absolute',
      top: 55,
      right: 145,
      backgroundColor: '#007AFF',
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 8,
      zIndex: 999,
    },
    debugButtonText: {
      color: 'white',
      fontWeight: '700',
    },
  });

  const user = {
    name: 'Mike Giffin',
    avatarUrl: 'https://placekitten.com/300/300',
  };

  const navigate = (screen: Screen, params?: any) => {
    setPrevScreen(currentScreen);
    setCurrentScreen(screen);
    setScreenParams(params || null);
  };

  const addToWardrobe = (item: any) => {
    const newItem = {
      ...item,
      favorite: false,
    };
    setWardrobe(prev => [newItem, ...prev]);
    setCurrentScreen('Closet');
  };

  const toggleFavorite = (id: string) => {
    setWardrobe(prev =>
      prev.map(item =>
        item.id === id ? {...item, favorite: !item.favorite} : item,
      ),
    );
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Login':
        return (
          <LoginScreen
            onLoginSuccess={() => navigate('Home')}
            email={''}
            onGoogleLogin={() => {}}
            onFaceIdLogin={() => {}}
            onPasswordLogin={() => {}}
          />
        );
      case 'Profile':
        return (
          <ProfileScreen navigate={navigate} user={user} wardrobe={wardrobe} />
        );
      case 'Explore':
        return <ExploreScreen navigate={navigate} />;
      case 'Closet':
        return (
          <ClosetScreen
            key={wardrobe.length}
            navigate={navigate}
            wardrobe={wardrobe}
            toggleFavorite={toggleFavorite}
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
      case 'Outfit':
        return (
          <OutfitScreen
            wardrobe={wardrobe}
            prompt={screenParams?.prompt}
            navigate={navigate}
          />
        );
      case 'Search':
        return (
          <SearchScreen
            wardrobe={wardrobe}
            navigate={navigate}
            goBack={() => setCurrentScreen(prevScreen)}
          />
        );
      default:
        return <HomeScreen navigate={navigate} wardrobe={wardrobe} />;
    }
  };

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <LayoutWrapper
        navigate={navigate}
        hideHeader={screensWithNoHeader.includes(currentScreen)}
        showSettings={screensWithSettings.includes(currentScreen)}>
        <View style={styles.screen}>{renderScreen()}</View>
      </LayoutWrapper>

      {currentScreen !== 'Login' && (
        <TouchableOpacity
          style={styles.debugButton}
          onPress={() => navigate('Login')}>
          <Text style={styles.debugButtonText}>Logout</Text>
        </TouchableOpacity>
      )}

      <BottomNavigation current={currentScreen} navigate={navigate} />
    </View>
  );
};

export default RootNavigator;

/////////////////

// import React, {useState} from 'react';
// import {View, StyleSheet, TouchableOpacity, Text} from 'react-native';

// import HomeScreen from '../screens/HomeScreen';
// import ProfileScreen from '../screens/ProfileScreen';
// import ExploreScreen from '../screens/ExploreScreen';
// import ClosetScreen from '../screens/ClosetScreen';
// import SettingsScreen from '../screens/SettingsScreen';
// import AddItemScreen from '../screens/AddItemScreen';
// import ItemDetailScreen from '../components/ItemDetailScreen/ItemDetailScreen';
// import OutfitScreen from '../screens/OutfitScreen';
// import SearchScreen from '../screens/SearchScreen'; // ✅ Added

// import BottomNavigation from '../components/BottomNavigation/BottomNavigation';
// import {useAppTheme} from '../context/ThemeContext';
// import {mockClothingItems} from '../components/mockClothingItems/mockClothingItems';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';
// import LoginScreen from '../screens/LoginScreen';
// import LayoutWrapper from '../components/LayoutWrapper/LayoutWrapper';

// type Screen =
//   | 'Login'
//   | 'Home'
//   | 'Profile'
//   | 'Explore'
//   | 'Closet'
//   | 'Settings'
//   | 'Voice'
//   | 'ItemDetail'
//   | 'AddItem'
//   | 'Outfit'
//   | 'Search'; // ✅ Included

// const RootNavigator = () => {
//   const [currentScreen, setCurrentScreen] = useState<Screen>('Login');
//   const [screenParams, setScreenParams] = useState<any>(null);
//   const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(mockClothingItems);

//   const screensWithNoHeader = ['Login', 'ItemDetail', 'AddItem', 'Home'];
//   const screensWithSettings = ['Profile'];

//   const {theme} = useAppTheme();

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//     },
//     screen: {
//       flex: 1,
//       marginTop: 55,
//     },
//     debugButton: {
//       position: 'absolute',
//       top: 55,
//       right: 145,
//       backgroundColor: '#007AFF',
//       paddingVertical: 4,
//       paddingHorizontal: 10,
//       borderRadius: 8,
//       zIndex: 999,
//     },
//     debugButtonText: {
//       color: 'white',
//       fontWeight: '700',
//     },
//   });

//   const user = {
//     name: 'Mike Giffin',
//     avatarUrl: 'https://placekitten.com/300/300',
//   };

//   const navigate = (screen: Screen, params?: any) => {
//     setCurrentScreen(screen);
//     setScreenParams(params || null);
//   };

//   const addToWardrobe = (item: any) => {
//     const newItem = {
//       ...item,
//       favorite: false,
//     };
//     setWardrobe(prev => [newItem, ...prev]);
//     setCurrentScreen('Closet');
//   };

//   const toggleFavorite = (id: string) => {
//     setWardrobe(prev =>
//       prev.map(item =>
//         item.id === id ? {...item, favorite: !item.favorite} : item,
//       ),
//     );
//   };

//   const renderScreen = () => {
//     switch (currentScreen) {
//       case 'Login':
//         return (
//           <LoginScreen
//             onLoginSuccess={() => navigate('Home')}
//             email={''}
//             onGoogleLogin={() => {}}
//             onFaceIdLogin={() => {}}
//             onPasswordLogin={() => {}}
//           />
//         );
//       case 'Profile':
//         return (
//           <ProfileScreen navigate={navigate} user={user} wardrobe={wardrobe} />
//         );
//       case 'Explore':
//         return <ExploreScreen navigate={navigate} />;
//       case 'Closet':
//         return (
//           <ClosetScreen
//             key={wardrobe.length}
//             navigate={navigate}
//             wardrobe={wardrobe}
//             toggleFavorite={toggleFavorite}
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
//       case 'Outfit':
//         return (
//           <OutfitScreen
//             wardrobe={wardrobe}
//             prompt={screenParams?.prompt}
//             navigate={navigate}
//           />
//         );
//       case 'Search': // ✅ Handle search screen here
//         return <SearchScreen wardrobe={wardrobe} navigate={navigate} />;
//       default:
//         return <HomeScreen navigate={navigate} wardrobe={wardrobe} />;
//     }
//   };

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <LayoutWrapper
//         navigate={navigate}
//         hideHeader={screensWithNoHeader.includes(currentScreen)}
//         showSettings={screensWithSettings.includes(currentScreen)}>
//         <View style={styles.screen}>{renderScreen()}</View>
//       </LayoutWrapper>

//       {currentScreen !== 'Login' && (
//         <TouchableOpacity
//           style={styles.debugButton}
//           onPress={() => navigate('Login')}>
//           <Text style={styles.debugButtonText}>Logout</Text>
//         </TouchableOpacity>
//       )}

//       <BottomNavigation current={currentScreen} navigate={navigate} />
//     </View>
//   );
// };

// export default RootNavigator;

///////////////

// import React, {useState} from 'react';
// import {View, StyleSheet, TouchableOpacity, Text} from 'react-native';
// import HomeScreen from '../screens/HomeScreen';
// import ProfileScreen from '../screens/ProfileScreen';
// import ExploreScreen from '../screens/ExploreScreen';
// import ClosetScreen from '../screens/ClosetScreen';
// import SettingsScreen from '../screens/SettingsScreen';
// import AddItemScreen from '../screens/AddItemScreen';
// import ItemDetailScreen from '../components/ItemDetailScreen/ItemDetailScreen';
// import OutfitScreen from '../screens/OutfitScreen'; // ✅ NEW
// import BottomNavigation from '../components/BottomNavigation/BottomNavigation';
// import {useAppTheme} from '../context/ThemeContext';
// import {mockClothingItems} from '../components/mockClothingItems/mockClothingItems';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';
// import LoginScreen from '../screens/LoginScreen';
// import LayoutWrapper from '../components/LayoutWrapper/LayoutWrapper';

// type Screen =
//   | 'Login'
//   | 'Home'
//   | 'Profile'
//   | 'Explore'
//   | 'Closet'
//   | 'Settings'
//   | 'Voice'
//   | 'ItemDetail'
//   | 'AddItem'
//   | 'Outfit';

// const RootNavigator = () => {
//   const [currentScreen, setCurrentScreen] = useState<Screen>('Login');
//   const [screenParams, setScreenParams] = useState<any>(null);
//   const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(mockClothingItems);
//   const screensWithNoHeader = ['Login', 'ItemDetail', 'AddItem', 'Home'];
//   const screensWithSettings = ['Profile'];
//   const {theme} = useAppTheme();

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//     },
//     screen: {
//       flex: 1,
//     },
//     debugButton: {
//       position: 'absolute',
//       top: 54,
//       right: 150,
//       backgroundColor: '#007AFF',
//       paddingVertical: 4,
//       paddingHorizontal: 10,
//       borderRadius: 8,
//       zIndex: 999,
//     },
//     debugButtonText: {
//       color: 'white',
//       fontWeight: '700',
//     },
//   });

//   // Dummy user for now
//   const user = {
//     name: 'Mike Giffin',
//     avatarUrl: 'https://placekitten.com/300/300',
//   };

//   const navigate = (screen: Screen, params?: any) => {
//     setCurrentScreen(screen);
//     setScreenParams(params || null);
//   };

//   const addToWardrobe = (item: any) => {
//     const newItem = {
//       ...item,
//       favorite: false,
//     };
//     setWardrobe(prev => [newItem, ...prev]);
//     setCurrentScreen('Closet');
//   };

//   const toggleFavorite = (id: string) => {
//     setWardrobe(prev =>
//       prev.map(item =>
//         item.id === id ? {...item, favorite: !item.favorite} : item,
//       ),
//     );
//   };

//   const renderScreen = () => {
//     switch (currentScreen) {
//       case 'Login':
//         return (
//           <LoginScreen
//             onLoginSuccess={() => navigate('Home')}
//             email={''}
//             onGoogleLogin={() => {
//               /* TODO */
//             }}
//             onFaceIdLogin={() => {
//               /* TODO */
//             }}
//             onPasswordLogin={() => {
//               /* TODO */
//             }}
//           />
//         );
//       case 'Profile':
//         return (
//           <ProfileScreen navigate={navigate} user={user} wardrobe={wardrobe} />
//         ); // Pass user here
//       case 'Explore':
//         return <ExploreScreen navigate={navigate} />;
//       case 'Closet':
//         return (
//           <ClosetScreen
//             key={wardrobe.length}
//             navigate={navigate}
//             wardrobe={wardrobe}
//             toggleFavorite={toggleFavorite}
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
//       case 'Outfit':
//         return (
//           <OutfitScreen
//             wardrobe={wardrobe}
//             prompt={screenParams?.prompt}
//             navigate={navigate} // ✅ add this
//           />
//         );
//       default:
//         return <HomeScreen navigate={navigate} wardrobe={wardrobe} />;
//     }
//   };

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <LayoutWrapper
//         navigate={navigate}
//         hideHeader={screensWithNoHeader.includes(currentScreen)}
//         showSettings={screensWithSettings.includes(currentScreen)}>
//         <View style={styles.screen}>{renderScreen()}</View>
//       </LayoutWrapper>

//       {currentScreen !== 'Login' && (
//         <TouchableOpacity
//           style={styles.debugButton}
//           onPress={() => navigate('Login')}>
//           <Text style={styles.debugButtonText}>Logout</Text>
//         </TouchableOpacity>
//       )}

//       <BottomNavigation current={currentScreen} navigate={navigate} />
//     </View>
//   );
// };

// export default RootNavigator;

////////////

// import React, {useState} from 'react';
// import {View, StyleSheet, TouchableOpacity, Text} from 'react-native';
// import HomeScreen from '../screens/HomeScreen';
// import ProfileScreen from '../screens/ProfileScreen';
// import ExploreScreen from '../screens/ExploreScreen';
// import ClosetScreen from '../screens/ClosetScreen';
// import SettingsScreen from '../screens/SettingsScreen';
// import AddItemScreen from '../screens/AddItemScreen';
// import ItemDetailScreen from '../components/ItemDetailScreen/ItemDetailScreen';
// import OutfitScreen from '../screens/OutfitScreen'; // ✅ NEW
// import BottomNavigation from '../components/BottomNavigation/BottomNavigation';
// import {useAppTheme} from '../context/ThemeContext';
// import {mockClothingItems} from '../components/mockClothingItems/mockClothingItems';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';
// import LoginScreen from '../screens/LoginScreen';

// type Screen =
//   | 'Login'
//   | 'Home'
//   | 'Profile'
//   | 'Explore'
//   | 'Closet'
//   | 'Settings'
//   | 'Voice'
//   | 'ItemDetail'
//   | 'AddItem'
//   | 'Outfit';

// const RootNavigator = () => {
//   const [currentScreen, setCurrentScreen] = useState<Screen>('Login');
//   const [screenParams, setScreenParams] = useState<any>(null);
//   const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(mockClothingItems);
//   const {theme} = useAppTheme();

//   // Dummy user for now
//   const user = {
//     name: 'Mike Giffin',
//     avatarUrl: 'https://placekitten.com/300/300',
//   };

//   const navigate = (screen: Screen, params?: any) => {
//     setCurrentScreen(screen);
//     setScreenParams(params || null);
//   };

//   const addToWardrobe = (item: any) => {
//     const newItem = {
//       ...item,
//       favorite: false,
//     };
//     setWardrobe(prev => [newItem, ...prev]);
//     setCurrentScreen('Closet');
//   };

//   const toggleFavorite = (id: string) => {
//     setWardrobe(prev =>
//       prev.map(item =>
//         item.id === id ? {...item, favorite: !item.favorite} : item,
//       ),
//     );
//   };

//   const renderScreen = () => {
//     switch (currentScreen) {
//       case 'Login':
//         return (
//           <LoginScreen
//             onLoginSuccess={() => navigate('Home')}
//             email={''}
//             onGoogleLogin={() => {
//               /* TODO */
//             }}
//             onFaceIdLogin={() => {
//               /* TODO */
//             }}
//             onPasswordLogin={() => {
//               /* TODO */
//             }}
//           />
//         );
//       case 'Profile':
//         return (
//           <ProfileScreen navigate={navigate} user={user} wardrobe={wardrobe} />
//         ); // Pass user here
//       case 'Explore':
//         return <ExploreScreen navigate={navigate} />;
//       case 'Closet':
//         return (
//           <ClosetScreen
//             key={wardrobe.length}
//             navigate={navigate}
//             wardrobe={wardrobe}
//             toggleFavorite={toggleFavorite}
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
//       case 'Outfit':
//         return (
//           <OutfitScreen
//             wardrobe={wardrobe}
//             prompt={screenParams?.prompt} // pass prompt from navigation params
//           />
//         );
//       default:
//         return <HomeScreen navigate={navigate} wardrobe={wardrobe} />;
//     }
//   };

//   return (
//     <View
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <View style={styles.screen}>{renderScreen()}</View>

//       {/* Debug Button to quickly go back to Login */}
//       {currentScreen !== 'Login' && (
//         <TouchableOpacity
//           style={styles.debugButton}
//           onPress={() => navigate('Login')}>
//           <Text style={styles.debugButtonText}>Logout</Text>
//         </TouchableOpacity>
//       )}

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
//   debugButton: {
//     position: 'absolute',
//     top: 60,
//     right: 110,
//     backgroundColor: '#007AFF',
//     paddingVertical: 4,
//     paddingHorizontal: 10,
//     borderRadius: 8,
//     zIndex: 999,
//   },
//   debugButtonText: {
//     color: 'white',
//     fontWeight: '700',
//   },
// });

// export default RootNavigator;

//////////////////

// import React, {useState} from 'react';
// import {View, StyleSheet} from 'react-native';
// import HomeScreen from '../screens/HomeScreen';
// import ProfileScreen from '../screens/ProfileScreen';
// import ExploreScreen from '../screens/ExploreScreen';
// import ClosetScreen from '../screens/ClosetScreen';
// import SettingsScreen from '../screens/SettingsScreen';
// import AddItemScreen from '../screens/AddItemScreen';
// import ItemDetailScreen from '../components/ItemDetailScreen/ItemDetailScreen';
// import OutfitScreen from '../screens/OutfitScreen'; // ✅ NEW
// import BottomNavigation from '../components/BottomNavigation/BottomNavigation';
// import {useAppTheme} from '../context/ThemeContext';
// import {v4 as uuidv4} from 'uuid';
// import {mockClothingItems} from '../components/mockClothingItems/mockClothingItems';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';
// import LoginScreen from '../screens/LoginScreen';

// type Props = {
//   navigate: (screen: Screen) => void;
//   wardrobe?: WardrobeItem[];
// };

// type Screen =
//   | 'Login'
//   | 'Home'
//   | 'Profile'
//   | 'Explore'
//   | 'Closet'
//   | 'Settings'
//   | 'Voice'
//   | 'ItemDetail'
//   | 'AddItem'
//   | 'Outfit';

// const RootNavigator = () => {
//   const [currentScreen, setCurrentScreen] = useState<Screen>('Login');
//   const [screenParams, setScreenParams] = useState<any>(null);
//   const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(mockClothingItems);
//   const {theme} = useAppTheme();

//   // Dummy user for now
//   const user = {
//     name: 'Mike Giffin',
//     avatarUrl: 'https://placekitten.com/300/300',
//   };

//   const navigate = (screen: Screen, params?: any) => {
//     setCurrentScreen(screen);
//     setScreenParams(params || null);
//   };

//   const addToWardrobe = (item: any) => {
//     const newItem = {
//       ...item,
//       favorite: false,
//     };
//     setWardrobe(prev => [newItem, ...prev]);
//     setCurrentScreen('Closet');
//   };

//   const toggleFavorite = (id: string) => {
//     setWardrobe(prev =>
//       prev.map(item =>
//         item.id === id ? {...item, favorite: !item.favorite} : item,
//       ),
//     );
//   };

//   const renderScreen = () => {
//     switch (currentScreen) {
//       case 'Login':
//         return (
//           <LoginScreen
//             onLoginSuccess={() => navigate('Home')}
//             email={''}
//             onGoogleLogin={function (): void {
//               throw new Error('Function not implemented.');
//             }}
//             onFaceIdLogin={function (): void {
//               throw new Error('Function not implemented.');
//             }}
//             onPasswordLogin={function (): void {
//               throw new Error('Function not implemented.');
//             }}
//           />
//         );
//       case 'Profile':
//         return (
//           <ProfileScreen navigate={navigate} user={user} wardrobe={wardrobe} />
//         ); // Pass user here
//       case 'Explore':
//         return <ExploreScreen navigate={navigate} />;
//       case 'Closet':
//         return (
//           <ClosetScreen
//             key={wardrobe.length}
//             navigate={navigate}
//             wardrobe={wardrobe}
//             toggleFavorite={toggleFavorite}
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
//       case 'Outfit':
//         return (
//           <OutfitScreen
//             wardrobe={wardrobe}
//             prompt={screenParams?.prompt} // pass prompt from navigation params
//           />
//         );
//       default:
//         return <HomeScreen navigate={navigate} wardrobe={wardrobe} />;
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

//////////////

// import React, {useState} from 'react';
// import {View, StyleSheet} from 'react-native';
// import HomeScreen from '../screens/HomeScreen';
// import ProfileScreen from '../screens/ProfileScreen';
// import ExploreScreen from '../screens/ExploreScreen';
// import ClosetScreen from '../screens/ClosetScreen';
// import SettingsScreen from '../screens/SettingsScreen';
// import AddItemScreen from '../screens/AddItemScreen';
// import ItemDetailScreen from '../components/ItemDetailScreen/ItemDetailScreen';
// import OutfitScreen from '../screens/OutfitScreen'; // ✅ NEW
// import BottomNavigation from '../components/BottomNavigation/BottomNavigation';
// import {useAppTheme} from '../context/ThemeContext';
// import {v4 as uuidv4} from 'uuid';
// import {mockClothingItems} from '../components/mockClothingItems/mockClothingItems';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';

// type Props = {
//   navigate: (screen: Screen) => void;
//   wardrobe?: WardrobeItem[];
// };

// type Screen =
//   | 'Home'
//   | 'Profile'
//   | 'Explore'
//   | 'Closet'
//   | 'Settings'
//   | 'Voice'
//   | 'ItemDetail'
//   | 'AddItem'
//   | 'Outfit';

// const RootNavigator = () => {
//   const [currentScreen, setCurrentScreen] = useState<Screen>('Home');
//   const [screenParams, setScreenParams] = useState<any>(null);
//   const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(mockClothingItems);
//   const {theme} = useAppTheme();

//   // Dummy user for now
//   const user = {
//     name: 'Mike Giffin',
//     avatarUrl: 'https://placekitten.com/300/300',
//   };

//   const navigate = (screen: Screen, params?: any) => {
//     setCurrentScreen(screen);
//     setScreenParams(params || null);
//   };

//   const addToWardrobe = (item: any) => {
//     const newItem = {
//       ...item,
//       favorite: false,
//     };
//     setWardrobe(prev => [newItem, ...prev]);
//     setCurrentScreen('Closet');
//   };

//   const toggleFavorite = (id: string) => {
//     setWardrobe(prev =>
//       prev.map(item =>
//         item.id === id ? {...item, favorite: !item.favorite} : item,
//       ),
//     );
//   };

//   const renderScreen = () => {
//     switch (currentScreen) {
//       case 'Profile':
//         return (
//           <ProfileScreen navigate={navigate} user={user} wardrobe={wardrobe} />
//         ); // Pass user here
//       case 'Explore':
//         return <ExploreScreen navigate={navigate} />;
//       case 'Closet':
//         return (
//           <ClosetScreen
//             key={wardrobe.length}
//             navigate={navigate}
//             wardrobe={wardrobe}
//             toggleFavorite={toggleFavorite}
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
//       case 'Outfit':
//         return (
//           <OutfitScreen
//             wardrobe={wardrobe}
//             prompt={screenParams?.prompt} // pass prompt from navigation params
//           />
//         );
//       default:
//         return <HomeScreen navigate={navigate} wardrobe={wardrobe} />;
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

//////////////////

// import React, {useState} from 'react';
// import {View, StyleSheet} from 'react-native';
// import HomeScreen from '../screens/HomeScreen';
// import ProfileScreen from '../screens/ProfileScreen';
// import ExploreScreen from '../screens/ExploreScreen';
// import ClosetScreen from '../screens/ClosetScreen';
// import SettingsScreen from '../screens/SettingsScreen';
// import AddItemScreen from '../screens/AddItemScreen';
// import ItemDetailScreen from '../components/ItemDetailScreen/ItemDetailScreen';
// import OutfitScreen from '../screens/OutfitScreen'; // ✅ NEW
// import BottomNavigation from '../components/BottomNavigation/BottomNavigation';
// import {useAppTheme} from '../context/ThemeContext';
// import {v4 as uuidv4} from 'uuid';
// import {mockClothingItems} from '../components/mockClothingItems/mockClothingItems';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';

// type Props = {
//   navigate: (screen: Screen) => void;
//   wardrobe?: WardrobeItem[];
// };

// type Screen =
//   | 'Home'
//   | 'Profile'
//   | 'Explore'
//   | 'Closet'
//   | 'Settings'
//   | 'Voice'
//   | 'ItemDetail'
//   | 'AddItem'
//   | 'Outfit'; // ✅ Add this

// const RootNavigator = () => {
//   const [currentScreen, setCurrentScreen] = useState<Screen>('Home');
//   const [screenParams, setScreenParams] = useState<any>(null);
//   const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(mockClothingItems);
//   const {theme} = useAppTheme();

//   const navigate = (screen: Screen, params?: any) => {
//     setCurrentScreen(screen);
//     setScreenParams(params || null);
//   };

//   const addToWardrobe = (item: any) => {
//     const newItem = {
//       ...item,
//       favorite: false,
//     };
//     setWardrobe(prev => [newItem, ...prev]);
//     setCurrentScreen('Closet');
//   };

//   const toggleFavorite = (id: string) => {
//     setWardrobe(prev =>
//       prev.map(item =>
//         item.id === id ? {...item, favorite: !item.favorite} : item,
//       ),
//     );
//   };

//   const renderScreen = () => {
//     switch (currentScreen) {
//       case 'Profile':
//         return <ProfileScreen navigate={navigate} wardrobe={wardrobe} />;
//       case 'Explore':
//         return <ExploreScreen navigate={navigate} />;
//       case 'Closet':
//         return (
//           <ClosetScreen
//             key={wardrobe.length}
//             navigate={navigate}
//             wardrobe={wardrobe}
//             toggleFavorite={toggleFavorite}
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
//       case 'Outfit':
//         return (
//           <OutfitScreen
//             wardrobe={wardrobe}
//             prompt={screenParams?.prompt} // pass prompt from navigation params
//           />
//         );
//       default:
//         return <HomeScreen navigate={navigate} wardrobe={wardrobe} />;
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

////////////////

// import React, {useState} from 'react';
// import {View, StyleSheet} from 'react-native';
// import HomeScreen from '../screens/HomeScreen';
// import ProfileScreen from '../screens/ProfileScreen';
// import ExploreScreen from '../screens/ExploreScreen';
// import ClosetScreen from '../screens/ClosetScreen';
// import SettingsScreen from '../screens/SettingsScreen';
// import AddItemScreen from '../screens/AddItemScreen';
// import ItemDetailScreen from '../components/ItemDetailScreen/ItemDetailScreen';
// import OutfitScreen from '../screens/OutfitScreen'; // ✅ NEW
// import BottomNavigation from '../components/BottomNavigation/BottomNavigation';
// import {useAppTheme} from '../context/ThemeContext';
// import {v4 as uuidv4} from 'uuid';
// import {mockClothingItems} from '../components/mockClothingItems/mockClothingItems';

// type Screen =
//   | 'Home'
//   | 'Profile'
//   | 'Explore'
//   | 'Closet'
//   | 'Settings'
//   | 'Voice'
//   | 'ItemDetail'
//   | 'AddItem'
//   | 'Outfit'; // ✅ Add this

// const RootNavigator = () => {
//   const [currentScreen, setCurrentScreen] = useState<Screen>('Home');
//   const [screenParams, setScreenParams] = useState<any>(null);
//   const [wardrobe, setWardrobe] = useState<any[]>(mockClothingItems);
//   const {theme} = useAppTheme();

//   const navigate = (screen: Screen, params?: any) => {
//     setCurrentScreen(screen);
//     setScreenParams(params || null);
//   };

//   const addToWardrobe = (item: any) => {
//     const newItem = {
//       ...item,
//       favorite: false,
//     };
//     setWardrobe(prev => [newItem, ...prev]);
//     setCurrentScreen('Closet');
//   };

//   const toggleFavorite = (id: string) => {
//     setWardrobe(prev =>
//       prev.map(item =>
//         item.id === id ? {...item, favorite: !item.favorite} : item,
//       ),
//     );
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
//             key={wardrobe.length}
//             navigate={navigate}
//             wardrobe={wardrobe}
//             toggleFavorite={toggleFavorite}
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
//       case 'Outfit': // ✅ Add this
//         return <OutfitScreen wardrobe={wardrobe} />;
//       default:
//         return <HomeScreen navigate={navigate} wardrobe={wardrobe} />;
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

//////////////////

// import React, {useState} from 'react';
// import {View, StyleSheet} from 'react-native';
// import HomeScreen from '../screens/HomeScreen';
// import ProfileScreen from '../screens/ProfileScreen';
// import ExploreScreen from '../screens/ExploreScreen';
// import ClosetScreen from '../screens/ClosetScreen';
// import SettingsScreen from '../screens/SettingsScreen';
// import AddItemScreen from '../screens/AddItemScreen';
// import ItemDetailScreen from '../components/ItemDetailScreen/ItemDetailScreen';
// import OutfitScreen from '../screens/OutfitScreen'; // ✅ NEW
// import BottomNavigation from '../components/BottomNavigation/BottomNavigation';
// import {useAppTheme} from '../context/ThemeContext';
// import {v4 as uuidv4} from 'uuid';
// import {mockClothingItems} from '../components/mockClothingItems/mockClothingItems';

// type Screen =
//   | 'Home'
//   | 'Profile'
//   | 'Explore'
//   | 'Closet'
//   | 'Settings'
//   | 'Voice'
//   | 'ItemDetail'
//   | 'AddItem'
//   | 'Outfit'; // ✅ Add this

// const RootNavigator = () => {
//   const [currentScreen, setCurrentScreen] = useState<Screen>('Home');
//   const [screenParams, setScreenParams] = useState<any>(null);
//   const [wardrobe, setWardrobe] = useState<any[]>(mockClothingItems);
//   const {theme} = useAppTheme();

//   const navigate = (screen: Screen, params?: any) => {
//     setCurrentScreen(screen);
//     setScreenParams(params || null);
//   };

//   const addToWardrobe = (item: any) => {
//     const newItem = {
//       ...item,
//       favorite: false,
//     };
//     setWardrobe(prev => [newItem, ...prev]);
//     setCurrentScreen('Closet');
//   };

//   const toggleFavorite = (id: string) => {
//     setWardrobe(prev =>
//       prev.map(item =>
//         item.id === id ? {...item, favorite: !item.favorite} : item,
//       ),
//     );
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
//             key={wardrobe.length}
//             navigate={navigate}
//             wardrobe={wardrobe}
//             toggleFavorite={toggleFavorite}
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
//       case 'Outfit': // ✅ Add this
//         return <OutfitScreen wardrobe={wardrobe} />;
//       default:
//         return <HomeScreen navigate={navigate} wardrobe={wardrobe} />;
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
