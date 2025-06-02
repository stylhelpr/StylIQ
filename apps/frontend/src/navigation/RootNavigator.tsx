import React, {useState} from 'react';
import {View, StyleSheet, TouchableOpacity, Text} from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ExploreScreen from '../screens/ExploreScreen';
import ClosetScreen from '../screens/ClosetScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AddItemScreen from '../screens/AddItemScreen';
import ItemDetailScreen from '../components/ItemDetailScreen/ItemDetailScreen';
import OutfitSuggestionScreen from '../screens/OutfitSuggestionScreen';
import SearchScreen from '../screens/SearchScreen';
import LoginScreen from '../screens/LoginScreen';
import StyleProfileScreen from '../screens/StyleProfileScreen';
import PreferencesScreen from '../screens/PreferencesScreen';
import MeasurementsScreen from '../screens/MeasurementsScreen';
import BudgetAndBrandsScreen from '../screens/BudgetAndBrandsScreen';
import AppearanceScreen from '../screens/AppearanceScreen';
import LifestyleScreen from '../screens/LifestyleScreen';
import ActivitiesScreen from '../screens/ActivitiesScreen';
import BodyTypesScreen from '../screens/BodyTypesScreen';
import ClimateScreen from '../screens/ClimateScreen';
import ColorPreferencesScreen from '../screens/ColorPreferencesScreen';
import EyeColorScreen from '../screens/EyeColorScreen';
import FashionGoalsScreen from '../screens/FashionGoalsScreen';
import FitPreferencesScreen from '../screens/FitPreferencesScreen';
import HairColorScreen from '../screens/HairColorScreen';
import PersonalityTraitsScreen from '../screens/PersonalityTraitsScreen';
import ProportionsScreen from '../screens/ProportionsScreen';
import ShoppingHabitScreen from '../screens/ShoppingHabitScreen';
import SkinToneScreen from '../screens/SkinToneScreen';
import StyleIconsScreen from '../screens/StyleIconsScreen';
import OutfitBuilderScreen from '../screens/OutfitBuilderScreen';
import SavedOutfitsScreen from '../screens/SavedOutfitsScreen';
import {useSavedOutfits} from '../hooks/useSavedOutfits';
import TryOnOverlayWrapperScreen from '../screens/TryOnOverlayWrapperScreen';
import CalendarPlannerScreen from '../screens/CalendarPlannerScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

import BottomNavigation from '../components/BottomNavigation/BottomNavigation';
import LayoutWrapper from '../components/LayoutWrapper/LayoutWrapper';

import {useAppTheme} from '../context/ThemeContext';
import {mockClothingItems} from '../components/mockClothingItems/mockClothingItems';
import {WardrobeItem} from '../hooks/useOutfitSuggestion';

type Screen =
  | 'Login'
  | 'Home'
  | 'Profile'
  | 'StyleProfileScreen'
  | 'Explore'
  | 'Closet'
  | 'Settings'
  | 'Preferences'
  | 'Measurements'
  | 'BudgetAndBrands'
  | 'Appearance'
  | 'Lifestyle'
  | 'ShoppingHabits'
  | 'StyleSummary'
  | 'Activities'
  | 'BodyTypes'
  | 'Climate'
  | 'ColorPreferences'
  | 'EyeColor'
  | 'FashionGoals'
  | 'FitPreferences'
  | 'HairColor'
  | 'PersonalityTraits'
  | 'PreferenceStrength'
  | 'Proportions'
  | 'SearchScreen'
  | 'SkinTone'
  | 'StyleIcon'
  | 'Voice'
  | 'ItemDetail'
  | 'AddItem'
  | 'Outfit'
  | 'Search'
  | 'OutfitBuilder'
  | 'SavedOutfits'
  | 'TryOnOverlay'
  | 'Notifications'
  | 'Planner';

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

  const {
    savedOutfits,
    saveOutfit,
    deleteOutfit,
    toggleFavorite: toggleOutfitFavorite,
  } = useSavedOutfits();

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
      case 'StyleProfileScreen':
        return <StyleProfileScreen navigate={navigate} />;
      case 'Explore':
        return <ExploreScreen navigate={navigate} />;
      case 'Closet':
        return (
          <ClosetScreen
            key={wardrobe.length}
            navigate={navigate}
            wardrobe={screenParams?.updatedWardrobe || wardrobe}
            toggleFavorite={toggleFavorite}
          />
        );
      case 'OutfitBuilder':
        return (
          <OutfitBuilderScreen
            wardrobe={wardrobe}
            navigate={navigate}
            saveOutfit={saveOutfit}
          />
        );
      case 'SavedOutfits':
        return (
          <SavedOutfitsScreen
            savedOutfits={savedOutfits}
            onDelete={deleteOutfit}
            onToggleFavorite={toggleOutfitFavorite}
          />
        );
      case 'Settings':
        return <SettingsScreen navigate={navigate} />;
      case 'Notifications':
        return <NotificationsScreen navigate={navigate} />;
      case 'Preferences':
        return <PreferencesScreen navigate={navigate} />;
      case 'Measurements':
        return <MeasurementsScreen navigate={navigate} />;
      case 'TryOnOverlay':
        return <TryOnOverlayWrapperScreen screenParams={screenParams} />;
      case 'BudgetAndBrands':
        return <BudgetAndBrandsScreen navigate={navigate} />;
      case 'Appearance':
        return <AppearanceScreen navigate={navigate} />;
      case 'Lifestyle':
        return <LifestyleScreen navigate={navigate} />;
      case 'ShoppingHabits':
        return <ShoppingHabitScreen navigate={navigate} />;
      case 'Activities':
        return <ActivitiesScreen navigate={navigate} />;
      case 'BodyTypes':
        return <BodyTypesScreen navigate={navigate} />;
      case 'Climate':
        return <ClimateScreen navigate={navigate} />;
      case 'ColorPreferences':
        return <ColorPreferencesScreen navigate={navigate} />;
      case 'EyeColor':
        return <EyeColorScreen navigate={navigate} />;
      case 'FashionGoals':
        return <FashionGoalsScreen navigate={navigate} />;
      case 'FitPreferences':
        return <FitPreferencesScreen navigate={navigate} />;
      case 'HairColor':
        return <HairColorScreen navigate={navigate} />;
      case 'PersonalityTraits':
        return <PersonalityTraitsScreen navigate={navigate} />;
      case 'Proportions':
        return <ProportionsScreen navigate={navigate} />;
      case 'SkinTone':
        return <SkinToneScreen navigate={navigate} />;
      case 'StyleIcon':
        return <StyleIconsScreen navigate={navigate} />;
      case 'Planner':
        return <CalendarPlannerScreen />;
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
        return <OutfitSuggestionScreen navigate={navigate} />;
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

///////////////////

// import React, {useState} from 'react';
// import {View, StyleSheet, TouchableOpacity, Text} from 'react-native';

// import HomeScreen from '../screens/HomeScreen';
// import ProfileScreen from '../screens/ProfileScreen';
// import ExploreScreen from '../screens/ExploreScreen';
// import ClosetScreen from '../screens/ClosetScreen';
// import SettingsScreen from '../screens/SettingsScreen';
// import AddItemScreen from '../screens/AddItemScreen';
// import ItemDetailScreen from '../components/ItemDetailScreen/ItemDetailScreen';
// import OutfitSuggestionScreen from '../screens/OutfitSuggestionScreen';
// import SearchScreen from '../screens/SearchScreen';
// import LoginScreen from '../screens/LoginScreen';
// import StyleProfileScreen from '../screens/StyleProfileScreen';
// import PreferencesScreen from '../screens/PreferencesScreen';
// import MeasurementsScreen from '../screens/MeasurementsScreen';
// import BudgetAndBrandsScreen from '../screens/BudgetAndBrandsScreen';
// import AppearanceScreen from '../screens/AppearanceScreen';
// import LifestyleScreen from '../screens/LifestyleScreen';
// import ActivitiesScreen from '../screens/ActivitiesScreen';
// import BodyTypesScreen from '../screens/BodyTypesScreen';
// import ClimateScreen from '../screens/ClimateScreen';
// import ColorPreferencesScreen from '../screens/ColorPreferencesScreen';
// import EyeColorScreen from '../screens/EyeColorScreen';
// import FashionGoalsScreen from '../screens/FashionGoalsScreen';
// import FitPreferencesScreen from '../screens/FitPreferencesScreen';
// import HairColorScreen from '../screens/HairColorScreen';
// import PersonalityTraitsScreen from '../screens/PersonalityTraitsScreen';
// import ProportionsScreen from '../screens/ProportionsScreen';
// import ShoppingHabitScreen from '../screens/ShoppingHabitScreen';
// import SkinToneScreen from '../screens/SkinToneScreen';
// import StyleIconsScreen from '../screens/StyleIconsScreen';
// import OutfitBuilderScreen from '../screens/OutfitBuilderScreen';
// import SavedOutfitsScreen from '../screens/SavedOutfitsScreen';
// import {useSavedOutfits} from '../hooks/useSavedOutfits';
// import TryOnOverlayWrapperScreen from '../screens/TryOnOverlayWrapperScreen';

// import BottomNavigation from '../components/BottomNavigation/BottomNavigation';
// import LayoutWrapper from '../components/LayoutWrapper/LayoutWrapper';

// import {useAppTheme} from '../context/ThemeContext';
// import {mockClothingItems} from '../components/mockClothingItems/mockClothingItems';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';

// type Screen =
//   | 'Login'
//   | 'Home'
//   | 'Profile'
//   | 'StyleProfileScreen'
//   | 'Explore'
//   | 'Closet'
//   | 'Settings'
//   | 'Preferences'
//   | 'Measurements'
//   | 'BudgetAndBrands'
//   | 'Appearance'
//   | 'Lifestyle'
//   | 'ShoppingHabits'
//   | 'StyleSummary'
//   | 'OutfitFrequency'
//   | 'Activities'
//   | 'BodyTypes'
//   | 'Climate'
//   | 'ColorPreferences'
//   | 'EyeColor'
//   | 'FashionGoals'
//   | 'FitPreferences'
//   | 'HairColor'
//   | 'PersonalityTraits'
//   | 'PreferenceStrength'
//   | 'Proportions'
//   | 'SearchScreen'
//   | 'SkinTone'
//   | 'StyleIcon'
//   | 'Voice'
//   | 'ItemDetail'
//   | 'AddItem'
//   | 'Outfit'
//   | 'Search'
//   | 'OutfitBuilder'
//   | 'SavedOutfits'
//   | 'TryOnOverlay';

// const RootNavigator = () => {
//   const [currentScreen, setCurrentScreen] = useState<Screen>('Login');
//   const [prevScreen, setPrevScreen] = useState<Screen>('Home');
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
//     setPrevScreen(currentScreen);
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

//   const {
//     savedOutfits,
//     saveOutfit,
//     deleteOutfit,
//     toggleFavorite: toggleOutfitFavorite,
//   } = useSavedOutfits();

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
//       case 'StyleProfileScreen':
//         return <StyleProfileScreen navigate={navigate} />;
//       case 'Explore':
//         return <ExploreScreen navigate={navigate} />;
//       case 'Closet':
//         return (
//           <ClosetScreen
//             key={wardrobe.length}
//             navigate={navigate}
//             wardrobe={screenParams?.updatedWardrobe || wardrobe}
//             toggleFavorite={toggleFavorite}
//           />
//         );
//       case 'OutfitBuilder':
//         return (
//           <OutfitBuilderScreen
//             wardrobe={wardrobe}
//             navigate={navigate}
//             saveOutfit={saveOutfit}
//           />
//         );
//       case 'SavedOutfits':
//         return (
//           <SavedOutfitsScreen
//             savedOutfits={savedOutfits}
//             onDelete={deleteOutfit}
//             onToggleFavorite={toggleOutfitFavorite}
//           />
//         );
//       case 'Settings':
//         return <SettingsScreen navigate={navigate} />;
//       case 'Preferences':
//         return <PreferencesScreen navigate={navigate} />;
//       case 'Measurements':
//         return <MeasurementsScreen navigate={navigate} />;
//       case 'TryOnOverlay':
//         return <TryOnOverlayWrapperScreen screenParams={screenParams} />;
//       case 'BudgetAndBrands':
//         return <BudgetAndBrandsScreen navigate={navigate} />;
//       case 'Appearance':
//         return <AppearanceScreen navigate={navigate} />;
//       case 'Lifestyle':
//         return <LifestyleScreen navigate={navigate} />;
//       case 'ShoppingHabits':
//         return <ShoppingHabitScreen navigate={navigate} />;
//       case 'Activities':
//         return <ActivitiesScreen navigate={navigate} />;
//       case 'BodyTypes':
//         return <BodyTypesScreen navigate={navigate} />;
//       case 'Climate':
//         return <ClimateScreen navigate={navigate} />;
//       case 'ColorPreferences':
//         return <ColorPreferencesScreen navigate={navigate} />;
//       case 'EyeColor':
//         return <EyeColorScreen navigate={navigate} />;
//       case 'FashionGoals':
//         return <FashionGoalsScreen navigate={navigate} />;
//       case 'FitPreferences':
//         return <FitPreferencesScreen navigate={navigate} />;
//       case 'HairColor':
//         return <HairColorScreen navigate={navigate} />;
//       case 'PersonalityTraits':
//         return <PersonalityTraitsScreen navigate={navigate} />;
//       case 'PreferenceStrength':
//         return <ProportionsScreen navigate={navigate} />;
//       case 'SkinTone':
//         return <SkinToneScreen navigate={navigate} />;
//       case 'StyleIcon':
//         return <StyleIconsScreen navigate={navigate} />;
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
//         return <OutfitSuggestionScreen navigate={navigate} />;
//       case 'Search':
//         return (
//           <SearchScreen
//             wardrobe={wardrobe}
//             navigate={navigate}
//             goBack={() => setCurrentScreen(prevScreen)}
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

//////////

// import React, {useState} from 'react';
// import {View, StyleSheet, TouchableOpacity, Text} from 'react-native';

// import HomeScreen from '../screens/HomeScreen';
// import ProfileScreen from '../screens/ProfileScreen';
// import ExploreScreen from '../screens/ExploreScreen';
// import ClosetScreen from '../screens/ClosetScreen';
// import SettingsScreen from '../screens/SettingsScreen';
// import AddItemScreen from '../screens/AddItemScreen';
// import ItemDetailScreen from '../components/ItemDetailScreen/ItemDetailScreen';
// import OutfitSuggestionScreen from '../screens/OutfitSuggestionScreen';
// import SearchScreen from '../screens/SearchScreen';
// import LoginScreen from '../screens/LoginScreen';
// import StyleProfileScreen from '../screens/StyleProfileScreen';
// import PreferencesScreen from '../screens/PreferencesScreen';
// import MeasurementsScreen from '../screens/MeasurementsScreen';
// import BudgetAndBrandsScreen from '../screens/BudgetAndBrandsScreen';
// import AppearanceScreen from '../screens/AppearanceScreen';
// import LifestyleScreen from '../screens/LifestyleScreen';
// import ActivitiesScreen from '../screens/ActivitiesScreen';
// import BodyTypesScreen from '../screens/BodyTypesScreen';
// import ClimateScreen from '../screens/ClimateScreen';
// import ColorPreferencesScreen from '../screens/ColorPreferencesScreen';
// import EyeColorScreen from '../screens/EyeColorScreen';
// import FashionGoalsScreen from '../screens/FashionGoalsScreen';
// import FitPreferencesScreen from '../screens/FitPreferencesScreen';
// import HairColorScreen from '../screens/HairColorScreen';
// import PersonalityTraitsScreen from '../screens/PersonalityTraitsScreen';
// import ProportionsScreen from '../screens/ProportionsScreen';
// import SearchScreenScreen from '../screens/SearchScreen';
// import ShoppingHabitScreen from '../screens/ShoppingHabitScreen';
// import SkinToneScreen from '../screens/SkinToneScreen';
// import StyleIconsScreen from '../screens/StyleIconsScreen';
// import OutfitBuilderScreen from '../screens/OutfitBuilderScreen';
// import SavedOutfitsScreen from '../screens/SavedOutfitsScreen';
// import TryOnPreviewScreen from '../screens/TryOnPreviewScreen';
// import {useSavedOutfits} from '../hooks/useSavedOutfits';

// import BottomNavigation from '../components/BottomNavigation/BottomNavigation';
// import LayoutWrapper from '../components/LayoutWrapper/LayoutWrapper';

// import {useAppTheme} from '../context/ThemeContext';
// import {mockClothingItems} from '../components/mockClothingItems/mockClothingItems';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';

// type Screen =
//   | 'Login'
//   | 'Home'
//   | 'Profile'
//   | 'StyleProfileScreen'
//   | 'Explore'
//   | 'Closet'
//   | 'Settings'
//   | 'Preferences'
//   | 'Measurements'
//   | 'BudgetAndBrands'
//   | 'Appearance'
//   | 'Lifestyle'
//   | 'ShoppingHabits'
//   | 'StyleSummary'
//   | 'OutfitFrequency'
//   | 'Activities'
//   | 'BodyTypes'
//   | 'Climate'
//   | 'ColorPreferences'
//   | 'EyeColor'
//   | 'FashionGoals'
//   | 'FitPreferences'
//   | 'HairColor'
//   | 'PersonalityTraits'
//   | 'PreferenceStrength'
//   | 'Proportions'
//   | 'SearchScreen'
//   | 'SkinTone'
//   | 'StyleIcon'
//   | 'Voice'
//   | 'ItemDetail'
//   | 'AddItem'
//   | 'Outfit'
//   | 'Search'
//   | 'OutfitBuilder'
//   | 'SavedOutfits'
//   | 'TryOnPreview';

// const RootNavigator = () => {
//   const [currentScreen, setCurrentScreen] = useState<Screen>('Login');
//   const [prevScreen, setPrevScreen] = useState<Screen>('Home');
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
//     setPrevScreen(currentScreen);
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

//   const {
//     savedOutfits,
//     saveOutfit,
//     deleteOutfit,
//     toggleFavorite: toggleOutfitFavorite,
//   } = useSavedOutfits();

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
//       case 'StyleProfileScreen':
//         return <StyleProfileScreen navigate={navigate} />;
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
//       case 'OutfitBuilder':
//         return (
//           <OutfitBuilderScreen
//             wardrobe={wardrobe}
//             navigate={navigate}
//             saveOutfit={saveOutfit}
//           />
//         );

//       case 'SavedOutfits':
//         return (
//           <SavedOutfitsScreen
//             savedOutfits={savedOutfits}
//             onDelete={deleteOutfit}
//             onToggleFavorite={toggleOutfitFavorite}
//           />
//         );
//       case 'Settings':
//         return <SettingsScreen navigate={navigate} />;
//       case 'Preferences':
//         return <PreferencesScreen navigate={navigate} />;
//       case 'Measurements':
//         return <MeasurementsScreen navigate={navigate} />;
//       case 'BudgetAndBrands':
//         return <BudgetAndBrandsScreen navigate={navigate} />;
//       case 'Appearance':
//         return <AppearanceScreen navigate={navigate} />;
//       case 'Lifestyle':
//         return <LifestyleScreen navigate={navigate} />;
//       case 'ShoppingHabits':
//         return <ShoppingHabitScreen navigate={navigate} />;
//       case 'Activities':
//         return <ActivitiesScreen navigate={navigate} />;
//       case 'BodyTypes':
//         return <BodyTypesScreen navigate={navigate} />;
//       case 'Climate':
//         return <ClimateScreen navigate={navigate} />;
//       case 'ColorPreferences':
//         return <ColorPreferencesScreen navigate={navigate} />;
//       case 'EyeColor':
//         return <EyeColorScreen navigate={navigate} />;
//       case 'FashionGoals':
//         return <FashionGoalsScreen navigate={navigate} />;
//       case 'FitPreferences':
//         return <FitPreferencesScreen navigate={navigate} />;
//       case 'HairColor':
//         return <HairColorScreen navigate={navigate} />;
//       case 'PersonalityTraits':
//         return <PersonalityTraitsScreen navigate={navigate} />;
//       case 'PreferenceStrength':
//         return <ProportionsScreen navigate={navigate} />;
//       case 'Proportions':
//         return <SearchScreenScreen navigate={navigate} />;
//       case 'SkinTone':
//         return <SkinToneScreen navigate={navigate} />;
//       case 'StyleIcon':
//         return <StyleIconsScreen navigate={navigate} />;

//       case 'TryOnPreview':
//         return (
//           <TryOnPreviewScreen
//             imageUri={screenParams?.imageUri}
//             onBack={() => setCurrentScreen(prevScreen)}
//           />
//         );
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
//         return <OutfitSuggestionScreen navigate={navigate} />;
//       case 'Search':
//         return (
//           <SearchScreen
//             wardrobe={wardrobe}
//             navigate={navigate}
//             goBack={() => setCurrentScreen(prevScreen)}
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

/////////////

// import React, {useState} from 'react';
// import {View, StyleSheet, TouchableOpacity, Text} from 'react-native';

// import HomeScreen from '../screens/HomeScreen';
// import ProfileScreen from '../screens/ProfileScreen';
// import ExploreScreen from '../screens/ExploreScreen';
// import ClosetScreen from '../screens/ClosetScreen';
// import SettingsScreen from '../screens/SettingsScreen';
// import AddItemScreen from '../screens/AddItemScreen';
// import ItemDetailScreen from '../components/ItemDetailScreen/ItemDetailScreen';
// import OutfitSuggestionScreen from '../screens/OutfitSuggestionScreen';
// import SearchScreen from '../screens/SearchScreen';
// import LoginScreen from '../screens/LoginScreen';
// import StyleProfileScreen from '../screens/StyleProfileScreen';
// import PreferencesScreen from '../screens/PreferencesScreen';
// import MeasurementsScreen from '../screens/MeasurementsScreen';
// import BudgetAndBrandsScreen from '../screens/BudgetAndBrandsScreen';
// import AppearanceScreen from '../screens/AppearanceScreen';
// import LifestyleScreen from '../screens/LifestyleScreen';
// import ActivitiesScreen from '../screens/ActivitiesScreen';
// import BodyTypesScreen from '../screens/BodyTypesScreen';
// import ClimateScreen from '../screens/ClimateScreen';
// import ColorPreferencesScreen from '../screens/ColorPreferencesScreen';
// import EyeColorScreen from '../screens/EyeColorScreen';
// import FashionGoalsScreen from '../screens/FashionGoalsScreen';
// import FitPreferencesScreen from '../screens/FitPreferencesScreen';
// import HairColorScreen from '../screens/HairColorScreen';
// import PersonalityTraitsScreen from '../screens/PersonalityTraitsScreen';
// import ProportionsScreen from '../screens/ProportionsScreen';
// import SearchScreenScreen from '../screens/SearchScreen';
// import ShoppingHabitScreen from '../screens/ShoppingHabitScreen';
// import SkinToneScreen from '../screens/SkinToneScreen';
// import StyleIconsScreen from '../screens/StyleIconsScreen';
// import OutfitFrequencyScreen from '../screens/OutfitFrequencyScreen';
// import OutfitBuilderScreen from '../screens/OutfitBuilderScreen';
// import SavedOutfitsScreen from '../screens/SavedOutfitsScreen';
// import TryOnPreviewScreen from '../screens/TryOnPreviewScreen';

// import BottomNavigation from '../components/BottomNavigation/BottomNavigation';
// import LayoutWrapper from '../components/LayoutWrapper/LayoutWrapper';

// import {useAppTheme} from '../context/ThemeContext';
// import {mockClothingItems} from '../components/mockClothingItems/mockClothingItems';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';

// type Screen =
//   | 'Login'
//   | 'Home'
//   | 'Profile'
//   | 'StyleProfileScreen'
//   | 'Explore'
//   | 'Closet'
//   | 'Settings'
//   | 'Preferences'
//   | 'Measurements'
//   | 'BudgetAndBrands'
//   | 'Appearance'
//   | 'Lifestyle'
//   | 'ShoppingHabits'
//   | 'StyleSummary'
//   | 'OutfitFrequency'
//   | 'Activities'
//   | 'BodyTypes'
//   | 'Climate'
//   | 'ColorPreferences'
//   | 'EyeColor'
//   | 'FashionGoals'
//   | 'FitPreferences'
//   | 'HairColor'
//   | 'PersonalityTraits'
//   | 'PreferenceStrength'
//   | 'Proportions'
//   | 'SearchScreen'
//   | 'SkinTone'
//   | 'StyleIcon'
//   | 'Voice'
//   | 'ItemDetail'
//   | 'AddItem'
//   | 'Outfit'
//   | 'Search'
//   | 'OutfitBuilder'
//   | 'SavedOutfits'
//   | 'TryOnPreview';

// const RootNavigator = () => {
//   const [currentScreen, setCurrentScreen] = useState<Screen>('Login');
//   const [prevScreen, setPrevScreen] = useState<Screen>('Home');
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
//     setPrevScreen(currentScreen);
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
//       case 'StyleProfileScreen':
//         return <StyleProfileScreen navigate={navigate} />;
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
//       case 'Preferences':
//         return <PreferencesScreen navigate={navigate} />;
//       case 'Measurements':
//         return <MeasurementsScreen navigate={navigate} />;
//       case 'BudgetAndBrands':
//         return <BudgetAndBrandsScreen navigate={navigate} />;
//       case 'Appearance':
//         return <AppearanceScreen navigate={navigate} />;
//       case 'Lifestyle':
//         return <LifestyleScreen navigate={navigate} />;
//       case 'ShoppingHabits':
//         return <ShoppingHabitScreen navigate={navigate} />;
//       case 'OutfitFrequency':
//         return <OutfitFrequencyScreen navigate={navigate} />;
//       case 'Activities':
//         return <ActivitiesScreen navigate={navigate} />;
//       case 'BodyTypes':
//         return <BodyTypesScreen navigate={navigate} />;
//       case 'Climate':
//         return <ClimateScreen navigate={navigate} />;
//       case 'ColorPreferences':
//         return <ColorPreferencesScreen navigate={navigate} />;
//       case 'EyeColor':
//         return <EyeColorScreen navigate={navigate} />;
//       case 'FashionGoals':
//         return <FashionGoalsScreen navigate={navigate} />;
//       case 'FitPreferences':
//         return <FitPreferencesScreen navigate={navigate} />;
//       case 'HairColor':
//         return <HairColorScreen navigate={navigate} />;
//       case 'PersonalityTraits':
//         return <PersonalityTraitsScreen navigate={navigate} />;
//       case 'PreferenceStrength':
//         return <ProportionsScreen navigate={navigate} />;
//       case 'Proportions':
//         return <SearchScreenScreen navigate={navigate} />;
//       case 'SkinTone':
//         return <SkinToneScreen navigate={navigate} />;
//       case 'StyleIcon':
//         return <StyleIconsScreen navigate={navigate} />;
//       case 'OutfitBuilder':
//         return (
//           <OutfitBuilderScreen
//             wardrobe={wardrobe}
//             onSaveOutfit={(items, name) => {
//               // TODO: Save this outfit to context or local state
//               console.log('Saved outfit:', name, items);
//               navigate('SavedOutfits');
//             }}
//           />
//         );
//       case 'SavedOutfits':
//         return (
//           <SavedOutfitsScreen
//             savedOutfits={[]} // TODO: Replace with real state
//             onDelete={name => console.log('Delete outfit:', name)}
//             onToggleFavorite={name => console.log('Favorite toggled:', name)}
//           />
//         );
//       case 'TryOnPreview':
//         return (
//           <TryOnPreviewScreen
//             imageUri={screenParams?.imageUri}
//             onBack={() => setCurrentScreen(prevScreen)}
//           />
//         );
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
//         return <OutfitSuggestionScreen navigate={navigate} />;
//       case 'Search':
//         return (
//           <SearchScreen
//             wardrobe={wardrobe}
//             navigate={navigate}
//             goBack={() => setCurrentScreen(prevScreen)}
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

//////////

// import React, {useState} from 'react';
// import {View, StyleSheet, TouchableOpacity, Text} from 'react-native';

// import HomeScreen from '../screens/HomeScreen';
// import ProfileScreen from '../screens/ProfileScreen';
// import ExploreScreen from '../screens/ExploreScreen';
// import ClosetScreen from '../screens/ClosetScreen';
// import SettingsScreen from '../screens/SettingsScreen';
// import AddItemScreen from '../screens/AddItemScreen';
// import ItemDetailScreen from '../components/ItemDetailScreen/ItemDetailScreen';
// import OutfitSuggestionScreen from '../screens/OutfitSuggestionScreen';
// import SearchScreen from '../screens/SearchScreen';
// import LoginScreen from '../screens/LoginScreen';
// import StyleProfileScreen from '../screens/StyleProfileScreen';
// import PreferencesScreen from '../screens/PreferencesScreen';
// import MeasurementsScreen from '../screens/MeasurementsScreen';
// import BudgetAndBrandsScreen from '../screens/BudgetAndBrandsScreen';
// import AppearanceScreen from '../screens/AppearanceScreen';
// import LifestyleScreen from '../screens/LifestyleScreen';
// import ActivitiesScreen from '../screens/ActivitiesScreen';
// import BodyTypesScreen from '../screens/BodyTypesScreen';
// import ClimateScreen from '../screens/ClimateScreen';
// import ColorPreferencesScreen from '../screens/ColorPreferencesScreen';
// import EyeColorScreen from '../screens/EyeColorScreen';
// import FashionGoalsScreen from '../screens/FashionGoalsScreen';
// import FitPreferencesScreen from '../screens/FitPreferencesScreen';
// import HairColorScreen from '../screens/HairColorScreen';
// import PersonalityTraitsScreen from '../screens/PersonalityTraitsScreen';
// import ProportionsScreen from '../screens/ProportionsScreen';
// import SearchScreenScreen from '../screens/SearchScreen';
// import ShoppingHabitScreen from '../screens/ShoppingHabitScreen';
// import SkinToneScreen from '../screens/SkinToneScreen';
// import StyleIconsScreen from '../screens/StyleIconsScreen';
// import OutfitFrequencyScreen from '../screens/OutfitFrequencyScreen';

// import BottomNavigation from '../components/BottomNavigation/BottomNavigation';
// import LayoutWrapper from '../components/LayoutWrapper/LayoutWrapper';

// import {useAppTheme} from '../context/ThemeContext';
// import {mockClothingItems} from '../components/mockClothingItems/mockClothingItems';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';

// type Screen =
//   | 'Login'
//   | 'Home'
//   | 'Profile'
//   | 'StyleProfileScreen'
//   | 'Explore'
//   | 'Closet'
//   | 'Settings'
//   | 'Preferences'
//   | 'Measurements'
//   | 'BudgetAndBrands'
//   | 'Appearance'
//   | 'Lifestyle'
//   | 'ShoppingHabits'
//   | 'StyleSummary'
//   | 'OutfitFrequency'
//   | 'Activities'
//   | 'BodyTypes'
//   | 'Climate'
//   | 'ColorPreferences'
//   | 'EyeColor'
//   | 'FashionGoals'
//   | 'FitPreferences'
//   | 'HairColor'
//   | 'PersonalityTraits'
//   | 'PreferenceStrength'
//   | 'Proportions'
//   | 'SearchScreen'
//   | 'SkinTone'
//   | 'StyleIcon'
//   | 'Voice'
//   | 'ItemDetail'
//   | 'AddItem'
//   | 'Outfit'
//   | 'Search';

// const RootNavigator = () => {
//   const [currentScreen, setCurrentScreen] = useState<Screen>('Login');
//   const [prevScreen, setPrevScreen] = useState<Screen>('Home');
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
//     setPrevScreen(currentScreen);
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
//       case 'StyleProfileScreen':
//         return <StyleProfileScreen navigate={navigate} />;
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
//       case 'Preferences':
//         return <PreferencesScreen navigate={navigate} />;
//       case 'Measurements':
//         return <MeasurementsScreen navigate={navigate} />;
//       case 'BudgetAndBrands':
//         return <BudgetAndBrandsScreen navigate={navigate} />;
//       case 'Appearance':
//         return <AppearanceScreen navigate={navigate} />;
//       case 'Lifestyle':
//         return <LifestyleScreen navigate={navigate} />;
//       case 'ShoppingHabits':
//         return <ShoppingHabitScreen navigate={navigate} />;
//       case 'OutfitFrequency':
//         return <OutfitFrequencyScreen navigate={navigate} />;
//       case 'Activities':
//         return <ActivitiesScreen navigate={navigate} />;
//       case 'BodyTypes':
//         return <BodyTypesScreen navigate={navigate} />;
//       case 'Climate':
//         return <ClimateScreen navigate={navigate} />;
//       case 'ColorPreferences':
//         return <ColorPreferencesScreen navigate={navigate} />;
//       case 'EyeColor':
//         return <EyeColorScreen navigate={navigate} />;
//       case 'FashionGoals':
//         return <FashionGoalsScreen navigate={navigate} />;
//       case 'FitPreferences':
//         return <FitPreferencesScreen navigate={navigate} />;
//       case 'HairColor':
//         return <HairColorScreen navigate={navigate} />;
//       case 'PersonalityTraits':
//         return <PersonalityTraitsScreen navigate={navigate} />;
//       case 'PreferenceStrength':
//         return <ProportionsScreen navigate={navigate} />;
//       case 'Proportions':
//         return <SearchScreenScreen navigate={navigate} />;
//       case 'SkinTone':
//         return <SkinToneScreen navigate={navigate} />;
//       case 'StyleIcon':
//         return <StyleIconsScreen navigate={navigate} />;
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
//         return <OutfitSuggestionScreen navigate={navigate} />;
//       case 'Search':
//         return (
//           <SearchScreen
//             wardrobe={wardrobe}
//             navigate={navigate}
//             goBack={() => setCurrentScreen(prevScreen)}
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
// import OutfitScreen from '../screens/OutfitScreen';
// import SearchScreen from '../screens/SearchScreen';

// import BottomNavigation from '../components/BottomNavigation/BottomNavigation';
// import {useAppTheme} from '../context/ThemeContext';
// import {mockClothingItems} from '../components/mockClothingItems/mockClothingItems';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';
// import LoginScreen from '../screens/LoginScreen';
// import StyleProfileScreen from '../screens/StyleProfileScreen';
// import PreferencesScreen from '../screens/PreferencesScreen';
// import MeasurementsScreen from '../screens/MeasurementsScreen';
// import BudgetAndBrandsScreen from '../screens/BudgetAndBrandsScreen';
// import AppearanceScreen from '../screens/AppearanceScreen';
// import LifestyleScreen from '../screens/LifestyleScreen';
// import LayoutWrapper from '../components/LayoutWrapper/LayoutWrapper';

// type Screen =
//   | 'Login'
//   | 'Home'
//   | 'Profile'
//   | 'StyleProfileScreen'
//   | 'Explore'
//   | 'Closet'
//   | 'Settings'
//   | 'Preferences'
//   | 'Measurements'
//   | 'BudgetAndBrands'
//   | 'Appearance'
//   | 'Lifestyle'
//   | 'Voice'
//   | 'ItemDetail'
//   | 'AddItem'
//   | 'Outfit'
//   | 'Search';

// const RootNavigator = () => {
//   const [currentScreen, setCurrentScreen] = useState<Screen>('Login');
//   const [prevScreen, setPrevScreen] = useState<Screen>('Home');
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
//     setPrevScreen(currentScreen);
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
//       case 'StyleProfileScreen':
//         return <StyleProfileScreen navigate={navigate} />;

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
//       case 'Preferences':
//         return <PreferencesScreen navigate={navigate} />;
//       case 'Measurements':
//         return <MeasurementsScreen navigate={navigate} />;
//       case 'BudgetAndBrands':
//         return <BudgetAndBrandsScreen navigate={navigate} />;
//       case 'Appearance':
//         return <AppearanceScreen navigate={navigate} />;
//       case 'Lifestyle':
//         return <LifestyleScreen navigate={navigate} />;
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
//       case 'Search':
//         return (
//           <SearchScreen
//             wardrobe={wardrobe}
//             navigate={navigate}
//             goBack={() => setCurrentScreen(prevScreen)}
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
