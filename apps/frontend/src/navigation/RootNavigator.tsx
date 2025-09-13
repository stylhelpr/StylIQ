import React, {useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import UndertoneScreen from '../screens/UndertoneScreen';
import StyleKeywordsScreen from '../screens/StyleKeywordsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

import BottomNavigation from '../components/BottomNavigation/BottomNavigation';
import LayoutWrapper from '../components/LayoutWrapper/LayoutWrapper';

import {useAppTheme} from '../context/ThemeContext';
import {mockClothingItems} from '../components/mockClothingItems/mockClothingItems';
import {WardrobeItem} from '../hooks/useOutfitSuggestion';

import ReactNativeBiometrics from 'react-native-biometrics';
import {useAuth0} from 'react-native-auth0';

type Screen =
  | 'Login'
  | 'Home'
  | 'Profile'
  | 'StyleProfileScreen'
  | 'Explore'
  | 'Wardrobe'
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
  | 'Undertone'
  | 'StyleKeywords'
  | 'Onboarding'
  | 'Planner';

const RootNavigator = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('Login');
  const [prevScreen, setPrevScreen] = useState<Screen>('Home');
  const [screenParams, setScreenParams] = useState<any>(null);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(mockClothingItems);

  const screensWithNoHeader = ['Login', 'ItemDetail', 'AddItem', 'Home'];
  const screensWithSettings = ['Profile'];

  const {theme} = useAppTheme();
  const {authorize} = useAuth0();
  const rnBiometrics = new ReactNativeBiometrics();

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
    setCurrentScreen('Wardrobe');
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

  const routeAfterLogin = async () => {
    try {
      const [[, logged], [, onboarded]] = await AsyncStorage.multiGet([
        'auth_logged_in',
        'onboarding_complete',
      ]);
      if (logged === 'true') {
        setCurrentScreen(onboarded === 'true' ? 'Home' : 'Onboarding');
      } else {
        setCurrentScreen('Login');
      }
    } catch {
      // If anything is weird, fall back to Home
      setCurrentScreen('Home');
    }
  };

  useEffect(() => {
    routeAfterLogin();
  }, []);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Login':
        return (
          <LoginScreen
            onLoginSuccess={routeAfterLogin}
            email={''}
            onGoogleLogin={() => {}}
            onPasswordLogin={() => {}}
            onFaceIdLogin={async () => {
              try {
                const result = await rnBiometrics.simplePrompt({
                  promptMessage: 'Log in with Face ID',
                });

                if (result.success) {
                  const redirectUrl =
                    'com.stylhelpr.stylhelpr.auth0://dev-xeaol4s5b2zd7wuz.us.auth0.com/ios/com.stylhelpr.stylhelpr/callback';

                  await authorize({redirectUrl});
                  await routeAfterLogin();
                } else {
                  console.log('Face ID cancelled');
                }
              } catch (e) {
                console.error('Face ID login error:', e);
              }
            }}
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
      case 'Wardrobe':
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
      case 'Undertone':
        return <UndertoneScreen navigate={navigate} />;
      case 'StyleKeywords':
        return <StyleKeywordsScreen navigate={navigate} />;
      case 'Onboarding':
        return <OnboardingScreen navigate={navigate} />;
      case 'ItemDetail':
        return (
          <ItemDetailScreen
            route={{params: screenParams}}
            navigation={{goBack: () => setCurrentScreen('Wardrobe')}}
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

      {currentScreen !== 'Login' && currentScreen !== 'Onboarding' ? (
        <BottomNavigation current={currentScreen} navigate={navigate} />
      ) : null}
    </View>
  );
};

export default RootNavigator;

////////////////////

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
// import CalendarPlannerScreen from '../screens/CalendarPlannerScreen';
// import NotificationsScreen from '../screens/NotificationsScreen';
// import UndertoneScreen from '../screens/UndertoneScreen';
// import StyleKeywordsScreen from '../screens/StyleKeywordsScreen';
// import OnboardingScreen from '../screens/OnboardingScreen';

// import BottomNavigation from '../components/BottomNavigation/BottomNavigation';
// import LayoutWrapper from '../components/LayoutWrapper/LayoutWrapper';

// import {useAppTheme} from '../context/ThemeContext';
// import {mockClothingItems} from '../components/mockClothingItems/mockClothingItems';
// import {WardrobeItem} from '../hooks/useOutfitSuggestion';

// import ReactNativeBiometrics from 'react-native-biometrics';
// import {useAuth0} from 'react-native-auth0';

// type Screen =
//   | 'Login'
//   | 'Home'
//   | 'Profile'
//   | 'StyleProfileScreen'
//   | 'Explore'
//   | 'Wardrobe'
//   | 'Settings'
//   | 'Preferences'
//   | 'Measurements'
//   | 'BudgetAndBrands'
//   | 'Appearance'
//   | 'Lifestyle'
//   | 'ShoppingHabits'
//   | 'StyleSummary'
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
//   | 'TryOnOverlay'
//   | 'Notifications'
//   | 'Undertone'
//   | 'StyleKeywords'
//   | 'Onboarding'
//   | 'Planner';

// const RootNavigator = () => {
//   const [currentScreen, setCurrentScreen] = useState<Screen>('Login');
//   const [prevScreen, setPrevScreen] = useState<Screen>('Home');
//   const [screenParams, setScreenParams] = useState<any>(null);
//   const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(mockClothingItems);

//   const screensWithNoHeader = ['Login', 'ItemDetail', 'AddItem', 'Home'];
//   const screensWithSettings = ['Profile'];

//   const {theme} = useAppTheme();
//   const {authorize} = useAuth0();
//   const rnBiometrics = new ReactNativeBiometrics();

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
//     setCurrentScreen('Wardrobe');
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
//             onPasswordLogin={() => {}}
//             onFaceIdLogin={async () => {
//               try {
//                 const result = await rnBiometrics.simplePrompt({
//                   promptMessage: 'Log in with Face ID',
//                 });

//                 if (result.success) {
//                   const redirectUrl =
//                     'com.stylhelpr.stylhelpr.auth0://dev-xeaol4s5b2zd7wuz.us.auth0.com/ios/com.stylhelpr.stylhelpr/callback';

//                   await authorize({redirectUrl});
//                   navigate('Home');
//                 } else {
//                   console.log('Face ID cancelled');
//                 }
//               } catch (e) {
//                 console.error('Face ID login error:', e);
//               }
//             }}
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
//       case 'Wardrobe':
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
//       case 'Notifications':
//         return <NotificationsScreen navigate={navigate} />;
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
//       case 'Proportions':
//         return <ProportionsScreen navigate={navigate} />;
//       case 'SkinTone':
//         return <SkinToneScreen navigate={navigate} />;
//       case 'StyleIcon':
//         return <StyleIconsScreen navigate={navigate} />;
//       case 'Planner':
//         return <CalendarPlannerScreen />;
//       case 'Undertone':
//         return <UndertoneScreen navigate={navigate} />;
//       case 'StyleKeywords':
//         return <StyleKeywordsScreen navigate={navigate} />;
//       case 'Onboarding':
//         return <OnboardingScreen navigate={navigate} />;
//       case 'ItemDetail':
//         return (
//           <ItemDetailScreen
//             route={{params: screenParams}}
//             navigation={{goBack: () => setCurrentScreen('Wardrobe')}}
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

//       <BottomNavigation current={currentScreen} navigate={navigate} />
//     </View>
//   );
// };

// export default RootNavigator;
