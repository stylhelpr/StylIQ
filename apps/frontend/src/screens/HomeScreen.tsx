import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import VoiceControlComponent from '../components/VoiceControlComponent/VoiceControlComponent';
import {fetchWeather} from '../utils/travelWeather';
import {ensureLocationPermission} from '../utils/permissions';
import Geolocation from 'react-native-geolocation-service';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Animatable from 'react-native-animatable';
import LinearGradient from 'react-native-linear-gradient';
import {BlurView} from '@react-native-community/blur';

type Props = {
  navigate: (screen: string, params?: any) => void;
  wardrobe: any[];
};

const profileImages = [
  {
    id: '1',
    uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '2',
    uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '3',
    uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '4',
    uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '5',
    uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '6',
    uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
  },
];

const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
  const {theme} = useAppTheme();
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const hasPermission = await ensureLocationPermission();
      if (!hasPermission) return;
      Geolocation.getCurrentPosition(
        async pos => {
          const data = await fetchWeather(
            pos.coords.latitude,
            pos.coords.longitude,
          );
          setWeather(data);
        },
        err => console.warn(err),
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 1000},
      );
    };
    fetchData();
  }, []);

  const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: theme.colors.background},
    container: {paddingVertical: 16, paddingHorizontal: 16, paddingBottom: 100},
    section: {marginBottom: 20},
    bannerImage: {
      width: '100%',
      height: 180,
      borderRadius: 14,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 12,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 3,
      marginBottom: 10,
    },
    cardText: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500',
      color: theme.colors.foreground,
    },
    bannerOverlay: {
      position: 'absolute',
      bottom: 14,
      left: 14,
      right: 14,
      backgroundColor: 'rgba(0,0,0,0.4)',
      padding: 10,
      borderRadius: 10,
    },
    bannerText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    bannerSubtext: {
      color: '#ddd',
      marginTop: 2,
      fontSize: 12,
    },
    sectionTitle: {
      fontWeight: '700',
      fontSize: 14,
      color: '#fff',
      paddingHorizontal: 12,
      paddingBottom: 14,
    },
    aiTitle: {
      fontWeight: '700',
      fontSize: 14,
      color: '#fff',
      paddingHorizontal: 16,
    },
    dailyLookCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 14,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    dailyLookText: {
      fontSize: 13,
      color: theme.colors.foreground,
      lineHeight: 18,
    },
    tryButton: {
      backgroundColor: '#405de6',
      paddingVertical: 6,
      borderRadius: 8,
      marginTop: 14,
      alignItems: 'center',
    },
    tryButtonText: {
      color: theme.colors.foreground,
      fontWeight: '600',
      fontSize: 16,
      letterSpacing: 0.2,
    },
    tileRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    tile: {
      width: '49.3%',
      backgroundColor: '#405de6',
      borderRadius: 8,
      paddingVertical: 6,
      marginBottom: 6,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    tileText: {
      fontWeight: '600',
      fontSize: 14,
      color: theme.colors.foreground,
      letterSpacing: 0.2,
    },
    highlightScroll: {
      flexDirection: 'row',
      paddingHorizontal: 12,
    },
    savedLookItem: {
      alignItems: 'center',
      marginRight: 10,
    },
    savedLookImageWrapper: {
      width: 84,
      height: 84,
      borderRadius: 10,
      backgroundColor: '#ccc',
      overflow: 'hidden',
    },
    savedLookImage: {
      width: 90,
      height: 90,
      borderRadius: 10,
      marginHorizontal: 6,
    },
    tag: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 18,
      marginRight: 6,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 1,
    },
    tagText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    sectionWeather: {
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 2,
    },
    weatherTextBlock: {
      flex: 1,
    },
    weatherCity: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
      marginBottom: 2,
    },
    weatherDesc: {
      fontSize: 12,
      color: '#ccc',
    },
    weatherTemp: {
      fontSize: 28,
      fontWeight: '800',
      color: '#fff',
    },
    outfitCard: {
      width: 84,
      marginRight: 12,
      alignItems: 'center',
    },
    outfitImage: {
      width: 84,
      height: 84,
      borderRadius: 10,
      backgroundColor: '#ccc',
    },
    outfitLabel: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.foreground,
      textAlign: 'center',
      maxWidth: 84,
    },
    weatherCard: {
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'flex-start',
      height: 80,
    },

    weatherSuggestionWrapper: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 8,
    },

    weatherAdvice: {
      fontSize: 13,
      fontWeight: '700',
      color: '#ccc',
      textAlign: 'left',
      lineHeight: 18,
    },
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={{paddingHorizontal: 16, marginBottom: 8}}>
        {/* <Text
          style={{
            fontSize: 20,
            color: theme.colors.foreground,
            fontWeight: '900',
            textAlign: 'center',
          }}>
          Welcome Back
        </Text> */}
      </View>
      <View style={{position: 'relative', marginBottom: 20}}>
        <Image
          source={require('../assets/images/free1.jpg')}
          style={styles.bannerImage}
        />
        <View style={styles.bannerOverlay}>
          <Text style={styles.bannerText}>Discover Your Signature Look</Text>
          <Text style={styles.bannerSubtext}>
            Curated just for you this season.
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weather</Text>
        {weather && (
          <Animatable.View
            animation="fadeInUp"
            duration={600}
            delay={100}
            useNativeDriver
            style={styles.sectionWeather}>
            <View style={styles.cardContent}>
              <Text style={styles.weatherCity}>{weather.celsius.name}</Text>
              <Text style={styles.weatherDesc}>
                {weather.celsius.weather[0].description}
              </Text>
            </View>
            <Text style={styles.weatherTemp}>
              {weather.fahrenheit.main.temp}° F
            </Text>
          </Animatable.View>
        )}
      </View>

      {/* <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weather</Text>
        {weather && (
          <Animatable.View
            animation="fadeInUp"
            duration={600}
            delay={100}
            useNativeDriver
            style={[styles.sectionWeather, {flexDirection: 'row', gap: 12}]}>
            <View style={{flex: 1}}>
              <View style={styles.weatherCard}>
                <Text style={styles.weatherCity}>{weather.celsius.name}</Text>
                <Text style={styles.weatherDesc}>
                  {weather.celsius.weather[0].description}
                </Text>
                <Text style={styles.weatherTemp}>
                  {weather.fahrenheit.main.temp}° F
                </Text>
              </View>
            </View>
            <View style={styles.weatherSuggestionWrapper}>
              <Text style={styles.weatherAdvice}>
                {weather.fahrenheit.main.temp < 50
                  ? 'It’s chilly — layer up.'
                  : weather.fahrenheit.main.temp > 85
                  ? 'Hot day — keep it light.'
                  : 'Perfect weather — dress freely.'}
              </Text>
            </View>
          </Animatable.View>
        )}
      </View> */}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Editorial Look</Text>
        <View style={styles.dailyLookCard}>
          <Text style={styles.dailyLookText}>
            Cream knit sweater layered over a sharp-collar shirt. Black tailored
            trousers. Chelsea boots. Effortlessly sharp.
          </Text>
          <TouchableOpacity
            style={styles.tryButton}
            onPress={() => navigate('Outfit', {look: 'editorial'})}>
            <Text style={styles.tryButtonText}>Try This Look</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.tileRow}>
          <TouchableOpacity
            style={styles.tile}
            onPress={() => navigate('Closet')}>
            <Text style={styles.tileText}>My Closet</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tile}
            onPress={() => navigate('AddItem')}>
            <Text style={styles.tileText}>Add Item</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tile}
            onPress={() => navigate('OutfitSuggestion')}>
            <Text style={styles.tileText}>Style Me</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tile}
            onPress={() => navigate('TryOn')}>
            <Text style={styles.tileText}>Try-On</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recommended Outfit</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingLeft: 16, paddingRight: 8}}>
          {wardrobe.slice(0, 5).map((item, idx) => (
            <View key={idx} style={styles.outfitCard}>
              <Image
                source={{uri: item.image}}
                style={styles.outfitImage}
                resizeMode="cover"
              />
              <Text style={styles.outfitLabel} numberOfLines={1}>
                {item.name}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Style Tags</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagScroll}>
          {[...Array(12)]
            .fill(null)
            .flatMap(() => [
              'Minimalist',
              'Luxury',
              'Streetwear',
              'Neutral Tones',
            ])
            .map((tag, idx) => (
              <View style={styles.tag} key={idx}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Saved Looks</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingLeft: 16, paddingRight: 8}}>
          {profileImages.map((img, index) => (
            <Image
              key={img.id || index.toString()}
              source={{uri: img.uri}}
              style={styles.savedLookImage}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.aiTitle}>Ask AI</Text>
        <VoiceControlComponent
          onPromptResult={prompt => navigate('Outfit', {prompt})}
        />
      </View>
      {/* <TouchableOpacity
        onPress={() => navigate('Voice')}
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          backgroundColor: '#405de6',
          borderRadius: 32,
          width: 56,
          height: 56,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 6,
          elevation: 4,
        }}>
        <Icon name="keyboard-voice" size={28} color="#fff" />
      </TouchableOpacity> */}
    </ScrollView>
  );
};

export default HomeScreen;

////////////

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import VoiceControlComponent from '../components/VoiceControlComponent/VoiceControlComponent';
// import {fetchWeather} from '../utils/travelWeather';
// import {ensureLocationPermission} from '../utils/permissions';
// import Geolocation from 'react-native-geolocation-service';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';
// import LinearGradient from 'react-native-linear-gradient';
// import {BlurView} from '@react-native-community/blur';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: any[];
// };

// const profileImages = [
//   {
//     id: '1',
//     uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '2',
//     uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '3',
//     uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '4',
//     uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '5',
//     uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '6',
//     uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
// ];

// const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
//   const {theme} = useAppTheme();
//   const [weather, setWeather] = useState(null);

//   useEffect(() => {
//     const fetchData = async () => {
//       const hasPermission = await ensureLocationPermission();
//       if (!hasPermission) return;
//       Geolocation.getCurrentPosition(
//         async pos => {
//           const data = await fetchWeather(
//             pos.coords.latitude,
//             pos.coords.longitude,
//           );
//           setWeather(data);
//         },
//         err => console.warn(err),
//         {enableHighAccuracy: true, timeout: 15000, maximumAge: 1000},
//       );
//     };
//     fetchData();
//   }, []);

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     container: {paddingVertical: 16, paddingHorizontal: 16, paddingBottom: 100},
//     section: {marginBottom: 20},
//     bannerImage: {
//       width: '100%',
//       height: 180,
//       borderRadius: 14,
//     },
//     card: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 12,
//       padding: 12,
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 1},
//       shadowOpacity: 0.08,
//       shadowRadius: 4,
//       elevation: 3,
//       marginBottom: 10,
//     },
//     cardText: {
//       fontSize: 13,
//       lineHeight: 18,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//     },
//     bannerOverlay: {
//       position: 'absolute',
//       bottom: 14,
//       left: 14,
//       right: 14,
//       backgroundColor: 'rgba(0,0,0,0.4)',
//       padding: 10,
//       borderRadius: 10,
//     },
//     bannerText: {
//       color: '#fff',
//       fontSize: 14,
//       fontWeight: '600',
//     },
//     bannerSubtext: {
//       color: '#ddd',
//       marginTop: 2,
//       fontSize: 12,
//     },
//     sectionTitle: {
//       fontWeight: '700',
//       fontSize: 14,
//       color: '#fff',
//       paddingHorizontal: 12,
//       paddingBottom: 14,
//     },
//     aiTitle: {
//       fontWeight: '700',
//       fontSize: 14,
//       color: '#fff',
//       paddingHorizontal: 16,
//     },
//     dailyLookCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 12,
//       padding: 14,
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 1},
//       shadowOpacity: 0.06,
//       shadowRadius: 4,
//       elevation: 2,
//     },
//     dailyLookText: {
//       fontSize: 13,
//       color: theme.colors.foreground,
//       lineHeight: 18,
//     },
//     tryButton: {
//       backgroundColor: '#405de6',
//       paddingVertical: 6,
//       borderRadius: 8,
//       marginTop: 14,
//       alignItems: 'center',
//     },
//     tryButtonText: {
//       color: theme.colors.foreground,
//       fontWeight: '600',
//       fontSize: 16,
//       letterSpacing: 0.2,
//     },
//     tileRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//     },
//     tile: {
//       width: '49.3%',
//       backgroundColor: '#405de6',
//       borderRadius: 8,
//       paddingVertical: 6,
//       marginBottom: 6,
//       alignItems: 'center',
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 1},
//       shadowOpacity: 0.05,
//       shadowRadius: 3,
//       elevation: 1,
//     },
//     tileText: {
//       fontWeight: '600',
//       fontSize: 14,
//       color: theme.colors.foreground,
//       letterSpacing: 0.2,
//     },
//     highlightScroll: {
//       flexDirection: 'row',
//       paddingHorizontal: 12,
//     },
//     savedLookItem: {
//       alignItems: 'center',
//       marginRight: 10,
//     },
//     savedLookImageWrapper: {
//       width: 84,
//       height: 84,
//       borderRadius: 10,
//       backgroundColor: '#ccc',
//       overflow: 'hidden',
//     },
//     savedLookImage: {
//       width: 90,
//       height: 90,
//       borderRadius: 10,
//       marginHorizontal: 6,
//     },
//     tag: {
//       backgroundColor: theme.colors.surface,
//       paddingHorizontal: 12,
//       paddingVertical: 5,
//       borderRadius: 18,
//       marginRight: 6,
//       shadowColor: '#000',
//       shadowOpacity: 0.04,
//       shadowRadius: 3,
//       elevation: 1,
//     },
//     tagText: {
//       fontSize: 12,
//       fontWeight: '600',
//       color: theme.colors.primary,
//     },
//     tagRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 8,
//     },
//     sectionWeather: {
//       borderRadius: 16,
//       backgroundColor: theme.colors.surface,
//       padding: 16,
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       shadowColor: '#000',
//       shadowOpacity: 0.08,
//       shadowRadius: 10,
//       elevation: 2,
//     },
//     weatherTextBlock: {
//       flex: 1,
//     },
//     weatherCity: {
//       fontSize: 14,
//       fontWeight: '600',
//       color: '#fff',
//       marginBottom: 2,
//     },
//     weatherDesc: {
//       fontSize: 12,
//       color: '#ccc',
//     },
//     weatherTemp: {
//       fontSize: 28,
//       fontWeight: '800',
//       color: '#fff',
//     },
//     outfitCard: {
//       width: 84,
//       marginRight: 12,
//       alignItems: 'center',
//     },
//     outfitImage: {
//       width: 84,
//       height: 84,
//       borderRadius: 10,
//       backgroundColor: '#ccc',
//     },
//     outfitLabel: {
//       marginTop: 6,
//       fontSize: 12,
//       fontWeight: '600',
//       color: theme.colors.foreground,
//       textAlign: 'center',
//       maxWidth: 84,
//     },
//     weatherCard: {
//       backgroundColor: 'rgba(255,255,255,0.08)',
//       borderRadius: 16,
//       paddingVertical: 16,
//       paddingHorizontal: 16,
//       borderWidth: 0.5,
//       borderColor: 'rgba(255,255,255,0.2)',
//       justifyContent: 'center',
//       alignItems: 'flex-start',
//       height: 80,
//     },

//     weatherSuggestionWrapper: {
//       flex: 1,
//       justifyContent: 'center',
//       alignItems: 'center',
//       paddingHorizontal: 8,
//     },

//     weatherAdvice: {
//       fontSize: 13,
//       fontWeight: '700',
//       color: '#ccc',
//       textAlign: 'left',
//       lineHeight: 18,
//     },
//   });

//   return (
//     <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
//       <View style={{paddingHorizontal: 16, marginBottom: 8}}>
//         {/* <Text
//           style={{
//             fontSize: 20,
//             color: theme.colors.foreground,
//             fontWeight: '900',
//             textAlign: 'center',
//           }}>
//           Welcome Back
//         </Text> */}
//       </View>
//       <View style={{position: 'relative', marginBottom: 20}}>
//         <Image
//           source={require('../assets/images/free1.jpg')}
//           style={styles.bannerImage}
//         />
//         <View style={styles.bannerOverlay}>
//           <Text style={styles.bannerText}>Discover Your Signature Look</Text>
//           <Text style={styles.bannerSubtext}>
//             Curated just for you this season.
//           </Text>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Weather</Text>
//         {weather && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={600}
//             delay={100}
//             useNativeDriver
//             style={styles.sectionWeather}>
//             <View style={styles.cardContent}>
//               <Text style={styles.weatherCity}>{weather.celsius.name}</Text>
//               <Text style={styles.weatherDesc}>
//                 {weather.celsius.weather[0].description}
//               </Text>
//             </View>
//             <Text style={styles.weatherTemp}>
//               {weather.fahrenheit.main.temp}° F
//             </Text>
//           </Animatable.View>
//         )}
//       </View>

//       {/* <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Weather</Text>
//         {weather && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={600}
//             delay={100}
//             useNativeDriver
//             style={[styles.sectionWeather, {flexDirection: 'row', gap: 12}]}>
//             <View style={{flex: 1}}>
//               <View style={styles.weatherCard}>
//                 <Text style={styles.weatherCity}>{weather.celsius.name}</Text>
//                 <Text style={styles.weatherDesc}>
//                   {weather.celsius.weather[0].description}
//                 </Text>
//                 <Text style={styles.weatherTemp}>
//                   {weather.fahrenheit.main.temp}° F
//                 </Text>
//               </View>
//             </View>
//             <View style={styles.weatherSuggestionWrapper}>
//               <Text style={styles.weatherAdvice}>
//                 {weather.fahrenheit.main.temp < 50
//                   ? 'It’s chilly — layer up.'
//                   : weather.fahrenheit.main.temp > 85
//                   ? 'Hot day — keep it light.'
//                   : 'Perfect weather — dress freely.'}
//               </Text>
//             </View>
//           </Animatable.View>
//         )}
//       </View> */}

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Editorial Look</Text>
//         <View style={styles.dailyLookCard}>
//           <Text style={styles.dailyLookText}>
//             Cream knit sweater layered over a sharp-collar shirt. Black tailored
//             trousers. Chelsea boots. Effortlessly sharp.
//           </Text>
//           <TouchableOpacity style={styles.tryButton}>
//             <Text style={styles.tryButtonText}>Try This Look</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Quick Access</Text>
//         <View style={styles.tileRow}>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('Closet')}>
//             <Text style={styles.tileText}>My Closet</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('AddItem')}>
//             <Text style={styles.tileText}>Add Item</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('OutfitSuggestion')}>
//             <Text style={styles.tileText}>Style Me</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('TryOn')}>
//             <Text style={styles.tileText}>Try-On</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Recommended Outfit</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingLeft: 16, paddingRight: 8}}>
//           {wardrobe.slice(0, 5).map((item, idx) => (
//             <View key={idx} style={styles.outfitCard}>
//               <Image
//                 source={{uri: item.image}}
//                 style={styles.outfitImage}
//                 resizeMode="cover"
//               />
//               <Text style={styles.outfitLabel} numberOfLines={1}>
//                 {item.name}
//               </Text>
//             </View>
//           ))}
//         </ScrollView>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Your Style Tags</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={styles.tagScroll}>
//           {[...Array(12)]
//             .fill(null)
//             .flatMap(() => [
//               'Minimalist',
//               'Luxury',
//               'Streetwear',
//               'Neutral Tones',
//             ])
//             .map((tag, idx) => (
//               <View style={styles.tag} key={idx}>
//                 <Text style={styles.tagText}>#{tag}</Text>
//               </View>
//             ))}
//         </ScrollView>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Saved Looks</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingLeft: 16, paddingRight: 8}}>
//           {profileImages.map((img, index) => (
//             <Image
//               key={img.id || index.toString()}
//               source={{uri: img.uri}}
//               style={styles.savedLookImage}
//               resizeMode="cover"
//             />
//           ))}
//         </ScrollView>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.aiTitle}>Ask AI</Text>
//         <VoiceControlComponent
//           onPromptResult={prompt => navigate('Outfit', {prompt})}
//         />
//       </View>
//       {/* <TouchableOpacity
//         onPress={() => navigate('Voice')}
//         style={{
//           position: 'absolute',
//           bottom: 24,
//           right: 24,
//           backgroundColor: '#405de6',
//           borderRadius: 32,
//           width: 56,
//           height: 56,
//           alignItems: 'center',
//           justifyContent: 'center',
//           shadowColor: '#000',
//           shadowOpacity: 0.2,
//           shadowRadius: 6,
//           elevation: 4,
//         }}>
//         <Icon name="keyboard-voice" size={28} color="#fff" />
//       </TouchableOpacity> */}
//     </ScrollView>
//   );
// };

// export default HomeScreen;

//////////////////

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import VoiceControlComponent from '../components/VoiceControlComponent/VoiceControlComponent';
// import {fetchWeather} from '../utils/travelWeather';
// import {ensureLocationPermission} from '../utils/permissions';
// import Geolocation from 'react-native-geolocation-service';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import * as Animatable from 'react-native-animatable';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: any[];
// };

// const profileImages = [
//   {
//     id: '1',
//     uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '2',
//     uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '3',
//     uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '4',
//     uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '5',
//     uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '6',
//     uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
// ];

// const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
//   const {theme} = useAppTheme();
//   const [weather, setWeather] = useState(null);

//   useEffect(() => {
//     const fetchData = async () => {
//       const hasPermission = await ensureLocationPermission();
//       if (!hasPermission) return;
//       Geolocation.getCurrentPosition(
//         async pos => {
//           const data = await fetchWeather(
//             pos.coords.latitude,
//             pos.coords.longitude,
//           );
//           setWeather(data);
//         },
//         err => console.warn(err),
//         {enableHighAccuracy: true, timeout: 15000, maximumAge: 1000},
//       );
//     };
//     fetchData();
//   }, []);

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     container: {paddingVertical: 16, paddingHorizontal: 16, paddingBottom: 100},
//     section: {marginBottom: 20},
//     bannerImage: {
//       width: '100%',
//       height: 180,
//       borderRadius: 14,
//     },
//     bannerOverlay: {
//       position: 'absolute',
//       bottom: 14,
//       left: 14,
//       right: 14,
//       backgroundColor: 'rgba(0,0,0,0.4)',
//       padding: 10,
//       borderRadius: 10,
//     },
//     bannerText: {
//       color: '#fff',
//       fontSize: 14,
//       fontWeight: '600',
//     },
//     bannerSubtext: {
//       color: '#ddd',
//       marginTop: 2,
//       fontSize: 12,
//     },
//     sectionTitle: {
//       fontWeight: '700',
//       fontSize: 14,
//       color: '#fff',
//       paddingHorizontal: 12,
//       paddingBottom: 14,
//     },
//     aiTitle: {
//       fontWeight: '700',
//       fontSize: 14,
//       color: '#fff',
//       paddingHorizontal: 16,
//     },
//     dailyLookCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 12,
//       padding: 14,
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 1},
//       shadowOpacity: 0.06,
//       shadowRadius: 4,
//       elevation: 2,
//     },
//     dailyLookText: {
//       fontSize: 13,
//       color: theme.colors.foreground,
//       lineHeight: 18,
//     },
//     tryButton: {
//       backgroundColor: '#405de6',
//       paddingVertical: 6,
//       borderRadius: 8,
//       marginTop: 14,
//       alignItems: 'center',
//     },
//     tryButtonText: {
//       color: theme.colors.foreground,
//       fontWeight: '600',
//       fontSize: 16,
//       letterSpacing: 0.2,
//     },
//     tileRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//     },
//     tile: {
//       width: '49.3%',
//       backgroundColor: '#405de6',
//       borderRadius: 8,
//       paddingVertical: 6,
//       marginBottom: 6,
//       alignItems: 'center',
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 1},
//       shadowOpacity: 0.05,
//       shadowRadius: 3,
//       elevation: 1,
//     },
//     tileText: {
//       fontWeight: '600',
//       fontSize: 14,
//       color: theme.colors.foreground,
//       letterSpacing: 0.2,
//     },
//     highlightScroll: {
//       flexDirection: 'row',
//       paddingHorizontal: 12,
//     },
//     savedLookItem: {
//       alignItems: 'center',
//       marginRight: 10,
//     },
//     savedLookImageWrapper: {
//       width: 84,
//       height: 84,
//       borderRadius: 10,
//       backgroundColor: '#ccc',
//       overflow: 'hidden',
//     },
//     savedLookImage: {
//       width: 90,
//       height: 90,
//       borderRadius: 10,
//       marginHorizontal: 6,
//     },
//     tag: {
//       backgroundColor: theme.colors.surface,
//       paddingHorizontal: 12,
//       paddingVertical: 5,
//       borderRadius: 18,
//       marginRight: 6,
//       shadowColor: '#000',
//       shadowOpacity: 0.04,
//       shadowRadius: 3,
//       elevation: 1,
//     },
//     tagText: {
//       fontSize: 12,
//       fontWeight: '600',
//       color: theme.colors.primary,
//     },
//     tagRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 8,
//     },
//     sectionWeather: {
//       borderRadius: 16,
//       backgroundColor: theme.colors.surface,
//       padding: 16,
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       shadowColor: '#000',
//       shadowOpacity: 0.08,
//       shadowRadius: 10,
//       elevation: 2,
//     },
//     weatherTextBlock: {
//       flex: 1,
//     },
//     weatherCity: {
//       fontSize: 14,
//       fontWeight: '600',
//       color: '#fff',
//       marginBottom: 2,
//     },
//     weatherDesc: {
//       fontSize: 12,
//       color: '#ccc',
//     },
//     weatherTemp: {
//       fontSize: 28,
//       fontWeight: '800',
//       color: '#fff',
//     },
//     outfitCard: {
//       width: 84,
//       marginRight: 12,
//       alignItems: 'center',
//     },
//     outfitImage: {
//       width: 84,
//       height: 84,
//       borderRadius: 10,
//       backgroundColor: '#ccc',
//     },
//     outfitLabel: {
//       marginTop: 6,
//       fontSize: 12,
//       fontWeight: '600',
//       color: theme.colors.foreground,
//       textAlign: 'center',
//       maxWidth: 84,
//     },
//   });

//   return (
//     <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
//       <View style={{paddingHorizontal: 16, marginBottom: 8}}>
//         {/* <Text
//           style={{
//             fontSize: 20,
//             color: theme.colors.foreground,
//             fontWeight: '900',
//             textAlign: 'center',
//           }}>
//           Welcome Back
//         </Text> */}
//       </View>
//       <View style={{position: 'relative', marginBottom: 20}}>
//         <Image
//           source={require('../assets/images/free1.jpg')}
//           style={styles.bannerImage}
//         />
//         <View style={styles.bannerOverlay}>
//           <Text style={styles.bannerText}>Discover Your Signature Look</Text>
//           <Text style={styles.bannerSubtext}>
//             Curated just for you this season.
//           </Text>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Today’s Weather</Text>
//         {weather && (
//           <Animatable.View
//             animation="fadeInUp"
//             duration={600}
//             delay={100}
//             useNativeDriver
//             style={styles.sectionWeather}>
//             <View style={styles.weatherTextBlock}>
//               <Text style={styles.weatherCity}>{weather.celsius.name}</Text>
//               <Text style={styles.weatherDesc}>
//                 {weather.celsius.weather[0].description}
//               </Text>
//             </View>
//             <Text style={styles.weatherTemp}>
//               {weather.fahrenheit.main.temp}° F
//             </Text>
//           </Animatable.View>
//         )}
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Today’s Editorial Look</Text>
//         <View style={styles.dailyLookCard}>
//           <Text style={styles.dailyLookText}>
//             Cream knit sweater layered over a sharp-collar shirt. Black tailored
//             trousers. Chelsea boots. Effortlessly sharp.
//           </Text>
//           <TouchableOpacity style={styles.tryButton}>
//             <Text style={styles.tryButtonText}>Try This Look</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Quick Access</Text>
//         <View style={styles.tileRow}>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('Closet')}>
//             <Text style={styles.tileText}>My Closet</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('AddItem')}>
//             <Text style={styles.tileText}>Add Item</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('OutfitSuggestion')}>
//             <Text style={styles.tileText}>Style Me</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('TryOn')}>
//             <Text style={styles.tileText}>Try-On</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Today’s Recommended Outfit</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingLeft: 16, paddingRight: 8}}>
//           {wardrobe.slice(0, 5).map((item, idx) => (
//             <View key={idx} style={styles.outfitCard}>
//               <Image
//                 source={{uri: item.image}}
//                 style={styles.outfitImage}
//                 resizeMode="cover"
//               />
//               <Text style={styles.outfitLabel} numberOfLines={1}>
//                 {item.name}
//               </Text>
//             </View>
//           ))}
//         </ScrollView>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Your Style Tags</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={styles.tagScroll}>
//           {[...Array(12)]
//             .fill(null)
//             .flatMap(() => [
//               'Minimalist',
//               'Luxury',
//               'Streetwear',
//               'Neutral Tones',
//             ])
//             .map((tag, idx) => (
//               <View style={styles.tag} key={idx}>
//                 <Text style={styles.tagText}>#{tag}</Text>
//               </View>
//             ))}
//         </ScrollView>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Saved Looks</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingLeft: 16, paddingRight: 8}}>
//           {profileImages.map((img, index) => (
//             <Image
//               key={img.id || index.toString()}
//               source={{uri: img.uri}}
//               style={styles.savedLookImage}
//               resizeMode="cover"
//             />
//           ))}
//         </ScrollView>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.aiTitle}>Ask AI</Text>
//         <VoiceControlComponent
//           onPromptResult={prompt => navigate('Outfit', {prompt})}
//         />
//       </View>
//       {/* <TouchableOpacity
//         onPress={() => navigate('Voice')}
//         style={{
//           position: 'absolute',
//           bottom: 24,
//           right: 24,
//           backgroundColor: '#405de6',
//           borderRadius: 32,
//           width: 56,
//           height: 56,
//           alignItems: 'center',
//           justifyContent: 'center',
//           shadowColor: '#000',
//           shadowOpacity: 0.2,
//           shadowRadius: 6,
//           elevation: 4,
//         }}>
//         <Icon name="keyboard-voice" size={28} color="#fff" />
//       </TouchableOpacity> */}
//     </ScrollView>
//   );
// };

// export default HomeScreen;

////////////

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import VoiceControlComponent from '../components/VoiceControlComponent/VoiceControlComponent';

// const HomeScreen = ({navigate, wardrobe}) => {
//   const {theme} = useAppTheme();

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     container: {paddingVertical: 16, paddingHorizontal: 16, paddingBottom: 100},
//     section: {marginBottom: 20},
//     bannerImage: {
//       width: '100%',
//       height: 180,
//       borderRadius: 14,
//     },
//     bannerOverlay: {
//       position: 'absolute',
//       bottom: 14,
//       left: 14,
//       right: 14,
//       backgroundColor: 'rgba(0,0,0,0.4)',
//       padding: 10,
//       borderRadius: 10,
//     },
//     bannerText: {
//       color: '#fff',
//       fontSize: 14,
//       fontWeight: '600',
//     },
//     bannerSubtext: {
//       color: '#ddd',
//       marginTop: 2,
//       fontSize: 12,
//     },
//     sectionTitle: {
//       fontSize: 15,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//       marginBottom: 10,
//       letterSpacing: 0.2,
//     },
//     dailyLookCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 12,
//       padding: 14,
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 1},
//       shadowOpacity: 0.06,
//       shadowRadius: 4,
//       elevation: 2,
//     },
//     dailyLookText: {
//       fontSize: 13,
//       color: theme.colors.foreground,
//       lineHeight: 18,
//     },
//     tryButton: {
//       backgroundColor: '#405de6',
//       paddingVertical: 10,
//       borderRadius: 8,
//       marginTop: 14,
//       alignItems: 'center',
//     },
//     tryButtonText: {
//       color: theme.colors.foreground,
//       fontWeight: '600',
//       fontSize: 14,
//       letterSpacing: 0.2,
//     },
//     tileRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//     },
//     tile: {
//       width: '49%',
//       backgroundColor: '#405de6',
//       borderRadius: 8,
//       paddingVertical: 6,
//       marginBottom: 6,
//       alignItems: 'center',
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 1},
//       shadowOpacity: 0.05,
//       shadowRadius: 3,
//       elevation: 1,
//     },
//     tileText: {
//       fontWeight: '600',
//       fontSize: 14,
//       color: theme.colors.foreground,
//       letterSpacing: 0.2,
//     },
//     highlightScroll: {
//       flexDirection: 'row',
//       gap: 14,
//       paddingVertical: 12,
//       paddingHorizontal: 12,
//     },
//     savedLookItem: {
//       alignItems: 'center',
//     },
//     savedLookImageWrapper: {
//       width: 84,
//       height: 84,
//       borderRadius: 10,
//       backgroundColor: '#ccc',
//       overflow: 'hidden',
//     },
//     savedLookImage: {
//       width: '100%',
//       height: '100%',
//       borderRadius: 10,
//     },
//     tag: {
//       backgroundColor: theme.colors.surface,
//       paddingHorizontal: 12,
//       paddingVertical: 5,
//       borderRadius: 18,
//       marginRight: 6,
//       shadowColor: '#000',
//       shadowOpacity: 0.04,
//       shadowRadius: 3,
//       elevation: 1,
//     },
//     tagText: {
//       fontSize: 12,
//       fontWeight: '600',
//       color: theme.colors.primary,
//     },
//     tagRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 8,
//     },
//   });

//   return (
//     <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
//       <View style={{position: 'relative', marginBottom: 20}}>
//         <Image
//           source={require('../assets/images/free1.jpg')}
//           style={styles.bannerImage}
//         />
//         <View style={styles.bannerOverlay}>
//           <Text style={styles.bannerText}>Discover Your Signature Look</Text>
//           <Text style={styles.bannerSubtext}>
//             Curated just for you this season.
//           </Text>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Today’s Editorial Look</Text>
//         <View style={styles.dailyLookCard}>
//           <Text style={styles.dailyLookText}>
//             Cream knit sweater layered over a sharp-collar shirt. Black tailored
//             trousers. Chelsea boots. Effortlessly sharp.
//           </Text>
//           <TouchableOpacity style={styles.tryButton}>
//             <Text style={styles.tryButtonText}>Try This Look</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Quick Access</Text>
//         <View style={styles.tileRow}>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('Closet')}>
//             <Text style={styles.tileText}>My Closet</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('AddItem')}>
//             <Text style={styles.tileText}>Add Item</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('OutfitSuggestion')}>
//             <Text style={styles.tileText}>Style Me</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('TryOn')}>
//             <Text style={styles.tileText}>Try-On</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Your Style Tags</Text>
//         <View style={styles.tagRow}>
//           {['Minimalist', 'Luxury', 'Streetwear', 'Neutral Tones'].map(tag => (
//             <View style={styles.tag} key={tag}>
//               <Text style={styles.tagText}>#{tag}</Text>
//             </View>
//           ))}
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Saved Looks</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           style={styles.highlightScroll}>
//           {[...Array(6)].map((_, index) => (
//             <View key={index} style={styles.savedLookItem}>
//               <View style={styles.savedLookImageWrapper}>
//                 <Image
//                   source={{
//                     uri: `https://source.unsplash.com/featured/?style,outfit,${index}`,
//                   }}
//                   style={styles.savedLookImage}
//                 />
//               </View>
//             </View>
//           ))}
//         </ScrollView>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Need Help Deciding?</Text>
//         <VoiceControlComponent
//           onPromptResult={prompt => navigate('Outfit', {prompt})}
//         />
//       </View>
//     </ScrollView>
//   );
// };

// export default HomeScreen;

/////////////////////

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import VoiceControlComponent from '../components/VoiceControlComponent/VoiceControlComponent';

// const HomeScreen = ({navigate, wardrobe}) => {
//   const {theme} = useAppTheme();

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     container: {paddingVertical: 16, paddingHorizontal: 16, paddingBottom: 100},
//     section: {marginBottom: 20},
//     bannerImage: {
//       width: '100%',
//       height: 180,
//       borderRadius: 14,
//     },
//     bannerOverlay: {
//       position: 'absolute',
//       bottom: 14,
//       left: 14,
//       right: 14,
//       backgroundColor: 'rgba(0,0,0,0.4)',
//       padding: 10,
//       borderRadius: 10,
//     },
//     bannerText: {
//       color: '#fff',
//       fontSize: 14,
//       fontWeight: '600',
//     },
//     bannerSubtext: {
//       color: '#ddd',
//       marginTop: 2,
//       fontSize: 12,
//     },
//     sectionTitle: {
//       fontSize: 15,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//       marginBottom: 10,
//       letterSpacing: 0.2,
//     },
//     dailyLookCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 12,
//       padding: 14,
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 1},
//       shadowOpacity: 0.06,
//       shadowRadius: 4,
//       elevation: 2,
//     },
//     dailyLookText: {
//       fontSize: 13,
//       color: theme.colors.foreground,
//       lineHeight: 18,
//     },
//     tryButton: {
//       backgroundColor: theme.colors.primary,
//       paddingVertical: 10,
//       borderRadius: 8,
//       marginTop: 14,
//       alignItems: 'center',
//     },
//     tryButtonText: {
//       color: theme.colors.surface,
//       fontWeight: '600',
//       fontSize: 13,
//       letterSpacing: 0.2,
//     },
//     tileRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//       gap: 10,
//     },
//     tile: {
//       width: '48%',
//       backgroundColor: theme.colors.surface,
//       borderRadius: 12,
//       paddingVertical: 16,
//       alignItems: 'center',
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 1},
//       shadowOpacity: 0.05,
//       shadowRadius: 3,
//       elevation: 1,
//     },
//     tileText: {
//       fontSize: 13,
//       fontWeight: '600',
//       color: theme.colors.foreground,
//       letterSpacing: 0.2,
//     },
//     highlightScroll: {
//       flexDirection: 'row',
//       gap: 10,
//       paddingVertical: 8,
//     },
//     highlightImage: {
//       width: 100,
//       height: 140,
//       borderRadius: 12,
//       backgroundColor: '#ccc',
//     },
//     tag: {
//       backgroundColor: theme.colors.surface,
//       paddingHorizontal: 12,
//       paddingVertical: 5,
//       borderRadius: 18,
//       marginRight: 6,
//       shadowColor: '#000',
//       shadowOpacity: 0.04,
//       shadowRadius: 3,
//       elevation: 1,
//     },
//     tagText: {
//       fontSize: 12,
//       fontWeight: '600',
//       color: theme.colors.primary,
//     },
//     tagRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 8,
//     },
//   });

//   return (
//     <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
//       <View style={{position: 'relative', marginBottom: 20}}>
//         <Image
//           source={require('../assets/images/free1.jpg')}
//           style={styles.bannerImage}
//         />
//         <View style={styles.bannerOverlay}>
//           <Text style={styles.bannerText}>Discover Your Signature Look</Text>
//           <Text style={styles.bannerSubtext}>
//             Curated just for you this season.
//           </Text>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Today’s Editorial Look</Text>
//         <View style={styles.dailyLookCard}>
//           <Text style={styles.dailyLookText}>
//             Cream knit sweater layered over a sharp-collar shirt. Black tailored
//             trousers. Chelsea boots. Effortlessly sharp.
//           </Text>
//           <TouchableOpacity style={styles.tryButton}>
//             <Text style={styles.tryButtonText}>Try This Look</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Quick Access</Text>
//         <View style={styles.tileRow}>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('Closet')}>
//             <Text style={styles.tileText}>🧳 My Closet</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('AddItem')}>
//             <Text style={styles.tileText}>➕ Add Item</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('OutfitSuggestion')}>
//             <Text style={styles.tileText}>🎯 Style Me</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('TryOn')}>
//             <Text style={styles.tileText}>🪞 Try-On</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Your Style Tags</Text>
//         <View style={styles.tagRow}>
//           {['Minimalist', 'Luxury', 'Streetwear', 'Neutral Tones'].map(tag => (
//             <View style={styles.tag} key={tag}>
//               <Text style={styles.tagText}>#{tag}</Text>
//             </View>
//           ))}
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Saved Looks</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           style={styles.highlightScroll}>
//           {[...Array(6)].map((_, index) => (
//             <Image
//               key={index}
//               style={styles.highlightImage}
//               source={{
//                 uri: `https://source.unsplash.com/featured/?style,outfit,${index}`,
//               }}
//             />
//           ))}
//         </ScrollView>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Need Help Deciding?</Text>
//         <VoiceControlComponent
//           onPromptResult={prompt => navigate('Outfit', {prompt})}
//         />
//       </View>
//     </ScrollView>
//   );
// };

// export default HomeScreen;

///////////////////

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import VoiceControlComponent from '../components/VoiceControlComponent/VoiceControlComponent';

// const HomeScreen = ({navigate, wardrobe}) => {
//   const {theme} = useAppTheme();

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     container: {paddingVertical: 24, paddingHorizontal: 16, paddingBottom: 100},
//     section: {marginBottom: 28},
//     bannerImage: {
//       width: '100%',
//       height: 220,
//       borderRadius: 14,
//     },
//     bannerOverlay: {
//       position: 'absolute',
//       bottom: 16,
//       left: 16,
//       right: 16,
//       backgroundColor: 'rgba(0,0,0,0.4)',
//       padding: 12,
//       borderRadius: 12,
//     },
//     bannerText: {
//       color: '#fff',
//       fontSize: 15,
//       fontWeight: '600',
//     },
//     bannerSubtext: {
//       color: '#ddd',
//       marginTop: 2,
//       fontSize: 12,
//     },
//     sectionTitle: {
//       fontSize: 16,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//       marginBottom: 10,
//       letterSpacing: 0.2,
//     },
//     dailyLookCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 14,
//       padding: 16,
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 2},
//       shadowOpacity: 0.08,
//       shadowRadius: 6,
//       elevation: 4,
//     },
//     dailyLookText: {
//       fontSize: 14,
//       color: theme.colors.foreground,
//       lineHeight: 20,
//     },
//     tryButton: {
//       backgroundColor: theme.colors.primary,
//       paddingVertical: 10,
//       borderRadius: 10,
//       marginTop: 16,
//       alignItems: 'center',
//     },
//     tryButtonText: {
//       color: theme.colors.surface,
//       fontWeight: '600',
//       fontSize: 14,
//       letterSpacing: 0.2,
//     },
//     tileRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//       gap: 12,
//     },
//     tile: {
//       width: '48%',
//       backgroundColor: theme.colors.surface,
//       borderRadius: 12,
//       paddingVertical: 20,
//       alignItems: 'center',
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 1},
//       shadowOpacity: 0.05,
//       shadowRadius: 4,
//       elevation: 2,
//     },
//     tileText: {
//       marginTop: 6,
//       fontSize: 13,
//       fontWeight: '600',
//       color: theme.colors.foreground,
//       letterSpacing: 0.2,
//     },
//     highlightScroll: {
//       flexDirection: 'row',
//       gap: 12,
//       paddingVertical: 8,
//     },
//     highlightImage: {
//       width: 110,
//       height: 160,
//       borderRadius: 12,
//       backgroundColor: '#ccc',
//     },
//     tag: {
//       backgroundColor: theme.colors.surface,
//       paddingHorizontal: 12,
//       paddingVertical: 6,
//       borderRadius: 18,
//       marginRight: 8,
//       shadowColor: '#000',
//       shadowOpacity: 0.04,
//       shadowRadius: 3,
//       elevation: 1,
//     },
//     tagText: {
//       fontSize: 12,
//       fontWeight: '600',
//       color: theme.colors.primary,
//     },
//     tagRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 8,
//     },
//   });

//   return (
//     <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
//       <View style={{position: 'relative', marginBottom: 28}}>
//         <Image
//           source={require('../assets/images/free1.jpg')}
//           style={styles.bannerImage}
//         />
//         <View style={styles.bannerOverlay}>
//           <Text style={styles.bannerText}>Discover Your Signature Look</Text>
//           <Text style={styles.bannerSubtext}>
//             Curated just for you this season.
//           </Text>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Today’s Editorial Look</Text>
//         <View style={styles.dailyLookCard}>
//           <Text style={styles.dailyLookText}>
//             Cream knit sweater layered over a sharp-collar shirt. Black tailored
//             trousers. Chelsea boots. Effortlessly sharp.
//           </Text>
//           <TouchableOpacity style={styles.tryButton}>
//             <Text style={styles.tryButtonText}>Try This Look</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Quick Access</Text>
//         <View style={styles.tileRow}>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('Closet')}>
//             <Text style={styles.tileText}>🧳 My Closet</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('AddItem')}>
//             <Text style={styles.tileText}>➕ Add Item</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('OutfitSuggestion')}>
//             <Text style={styles.tileText}>🎯 Style Me</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('TryOn')}>
//             <Text style={styles.tileText}>🪞 Try-On</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Your Style Tags</Text>
//         <View style={styles.tagRow}>
//           {['Minimalist', 'Luxury', 'Streetwear', 'Neutral Tones'].map(tag => (
//             <View style={styles.tag} key={tag}>
//               <Text style={styles.tagText}>#{tag}</Text>
//             </View>
//           ))}
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Saved Looks</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           style={styles.highlightScroll}>
//           {[...Array(6)].map((_, index) => (
//             <Image
//               key={index}
//               style={styles.highlightImage}
//               source={{
//                 uri: `https://source.unsplash.com/featured/?style,outfit,${index}`,
//               }}
//             />
//           ))}
//         </ScrollView>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Need Help Deciding?</Text>
//         <VoiceControlComponent
//           onPromptResult={prompt => navigate('Outfit', {prompt})}
//         />
//       </View>
//     </ScrollView>
//   );
// };

// export default HomeScreen;

///////////////

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import VoiceControlComponent from '../components/VoiceControlComponent/VoiceControlComponent';

// const HomeScreen = ({navigate, wardrobe}) => {
//   const {theme} = useAppTheme();

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     container: {paddingVertical: 20, paddingHorizontal: 16, paddingBottom: 120},
//     section: {marginBottom: 28},
//     bannerImage: {
//       width: '100%',
//       height: 240,
//       borderRadius: 16,
//     },
//     bannerOverlay: {
//       position: 'absolute',
//       bottom: 16,
//       left: 16,
//       right: 16,
//       backgroundColor: 'rgba(0,0,0,0.4)',
//       padding: 14,
//       borderRadius: 12,
//     },
//     bannerText: {
//       color: '#fff',
//       fontSize: 16,
//       fontWeight: '600',
//     },
//     bannerSubtext: {
//       color: '#ddd',
//       fontSize: 13,
//       marginTop: 4,
//     },
//     sectionTitle: {
//       fontSize: 18,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//       marginBottom: 10,
//       letterSpacing: 0.3,
//     },
//     dailyLookCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 14,
//       padding: 18,
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 2},
//       shadowOpacity: 0.08,
//       shadowRadius: 6,
//       elevation: 3,
//     },
//     dailyLookText: {
//       fontSize: 14,
//       color: theme.colors.foreground,
//       lineHeight: 20,
//     },
//     tryButton: {
//       backgroundColor: theme.colors.primary,
//       paddingVertical: 12,
//       borderRadius: 10,
//       marginTop: 16,
//       alignItems: 'center',
//     },
//     tryButtonText: {
//       color: theme.colors.surface,
//       fontWeight: '600',
//       fontSize: 14,
//       letterSpacing: 0.3,
//     },
//     tileRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//       gap: 12,
//     },
//     tile: {
//       width: '48%',
//       backgroundColor: theme.colors.surface,
//       borderRadius: 12,
//       paddingVertical: 22,
//       alignItems: 'center',
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 1},
//       shadowOpacity: 0.06,
//       shadowRadius: 4,
//       elevation: 2,
//     },
//     tileText: {
//       marginTop: 8,
//       fontSize: 13,
//       fontWeight: '600',
//       color: theme.colors.foreground,
//       letterSpacing: 0.2,
//     },
//     highlightScroll: {
//       flexDirection: 'row',
//       gap: 12,
//       paddingVertical: 8,
//     },
//     highlightImage: {
//       width: 120,
//       height: 160,
//       borderRadius: 14,
//       backgroundColor: '#ccc',
//     },
//     tag: {
//       backgroundColor: theme.colors.surface,
//       paddingHorizontal: 12,
//       paddingVertical: 6,
//       borderRadius: 18,
//       marginRight: 6,
//       shadowColor: '#000',
//       shadowOpacity: 0.04,
//       shadowRadius: 2,
//       elevation: 1,
//     },
//     tagText: {
//       fontSize: 12,
//       fontWeight: '600',
//       color: theme.colors.primary,
//     },
//     tagRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 8,
//     },
//   });

//   return (
//     <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
//       {/* Hero Banner */}
//       <View style={{position: 'relative', marginBottom: 24}}>
//         <Image
//           source={require('../assets/images/free1.jpg')}
//           style={styles.bannerImage}
//         />
//         <View style={styles.bannerOverlay}>
//           <Text style={styles.bannerText}>Discover Your Signature Look</Text>
//           <Text style={styles.bannerSubtext}>
//             Curated just for you this season.
//           </Text>
//         </View>
//       </View>

//       {/* Daily Look */}
//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Today’s Editorial Look</Text>
//         <View style={styles.dailyLookCard}>
//           <Text style={styles.dailyLookText}>
//             Cream knit sweater layered over a sharp-collar shirt. Black tailored
//             trousers. Chelsea boots. Effortlessly sharp.
//           </Text>
//           <TouchableOpacity style={styles.tryButton}>
//             <Text style={styles.tryButtonText}>Try This Look</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       {/* Explore Actions */}
//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Quick Access</Text>
//         <View style={styles.tileRow}>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('Closet')}>
//             <Text style={styles.tileText}>🧳 My Closet</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('AddItem')}>
//             <Text style={styles.tileText}>➕ Add Item</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('OutfitSuggestion')}>
//             <Text style={styles.tileText}>🎯 Style Me</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('TryOn')}>
//             <Text style={styles.tileText}>🪞 Try-On</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       {/* Style Tags */}
//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Your Style Tags</Text>
//         <View style={styles.tagRow}>
//           {['Minimalist', 'Luxury', 'Streetwear', 'Neutral Tones'].map(tag => (
//             <View style={styles.tag} key={tag}>
//               <Text style={styles.tagText}>#{tag}</Text>
//             </View>
//           ))}
//         </View>
//       </View>

//       {/* Favorite Looks */}
//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Saved Looks</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           style={styles.highlightScroll}>
//           {[...Array(6)].map((_, index) => (
//             <Image
//               key={index}
//               style={styles.highlightImage}
//               source={{
//                 uri: `https://source.unsplash.com/featured/?style,outfit,${index}`,
//               }}
//             />
//           ))}
//         </ScrollView>
//       </View>

//       {/* Voice Assistant */}
//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Need Help Deciding?</Text>
//         <VoiceControlComponent
//           onPromptResult={prompt => navigate('Outfit', {prompt})}
//         />
//       </View>
//     </ScrollView>
//   );
// };

// export default HomeScreen;

///////////////

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import VoiceControlComponent from '../components/VoiceControlComponent/VoiceControlComponent';

// const HomeScreen = ({navigate, wardrobe}) => {
//   const {theme} = useAppTheme();

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     container: {paddingVertical: 32, paddingHorizontal: 20, paddingBottom: 140},
//     section: {marginBottom: 36},
//     bannerImage: {
//       width: '100%',
//       height: 280,
//       borderRadius: 20,
//     },
//     bannerOverlay: {
//       position: 'absolute',
//       bottom: 20,
//       left: 20,
//       right: 20,
//       backgroundColor: 'rgba(0,0,0,0.4)',
//       padding: 16,
//       borderRadius: 14,
//     },
//     bannerText: {
//       color: '#fff',
//       fontSize: 18,
//       fontWeight: '600',
//     },
//     bannerSubtext: {
//       color: '#ddd',
//       marginTop: 4,
//     },
//     sectionTitle: {
//       fontSize: 22,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//       marginBottom: 14,
//       letterSpacing: 0.3,
//     },
//     dailyLookCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 18,
//       padding: 24,
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 4},
//       shadowOpacity: 0.1,
//       shadowRadius: 12,
//       elevation: 6,
//     },
//     dailyLookText: {
//       fontSize: 16,
//       color: theme.colors.foreground,
//       lineHeight: 22,
//     },
//     tryButton: {
//       backgroundColor: theme.colors.primary,
//       paddingVertical: 14,
//       borderRadius: 14,
//       marginTop: 20,
//       alignItems: 'center',
//     },
//     tryButtonText: {
//       color: theme.colors.surface,
//       fontWeight: '600',
//       fontSize: 16,
//       letterSpacing: 0.3,
//     },
//     tileRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//       gap: 14,
//     },
//     tile: {
//       width: '48%',
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       paddingVertical: 28,
//       alignItems: 'center',
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 2},
//       shadowOpacity: 0.08,
//       shadowRadius: 6,
//       elevation: 4,
//     },
//     tileText: {
//       marginTop: 10,
//       fontSize: 15,
//       fontWeight: '600',
//       color: theme.colors.foreground,
//       letterSpacing: 0.2,
//     },
//     highlightScroll: {
//       flexDirection: 'row',
//       gap: 16,
//       paddingVertical: 10,
//     },
//     highlightImage: {
//       width: 130,
//       height: 180,
//       borderRadius: 16,
//       backgroundColor: '#ccc',
//     },
//     tag: {
//       backgroundColor: theme.colors.surface,
//       paddingHorizontal: 14,
//       paddingVertical: 6,
//       borderRadius: 20,
//       marginRight: 8,
//       shadowColor: '#000',
//       shadowOpacity: 0.05,
//       shadowRadius: 4,
//       elevation: 2,
//     },
//     tagText: {
//       fontSize: 13,
//       fontWeight: '600',
//       color: theme.colors.primary,
//     },
//     tagRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 10,
//     },
//   });

//   return (
//     <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
//       {/* Hero Banner */}
//       <View style={{position: 'relative', marginBottom: 32}}>
//         <Image
//           source={require('../assets/images/free1.jpg')}
//           style={styles.bannerImage}
//         />
//         <View style={styles.bannerOverlay}>
//           <Text style={styles.bannerText}>Discover Your Signature Look</Text>
//           <Text style={styles.bannerSubtext}>
//             Curated just for you this season.
//           </Text>
//         </View>
//       </View>

//       {/* Daily Look */}
//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Today’s Editorial Look</Text>
//         <View style={styles.dailyLookCard}>
//           <Text style={styles.dailyLookText}>
//             Cream knit sweater layered over a sharp-collar shirt. Black tailored
//             trousers. Chelsea boots. Effortlessly sharp.
//           </Text>
//           <TouchableOpacity style={styles.tryButton}>
//             <Text style={styles.tryButtonText}>Try This Look</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       {/* Explore Actions */}
//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Quick Access</Text>
//         <View style={styles.tileRow}>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('Closet')}>
//             <Text style={styles.tileText}>🧳 My Closet</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('AddItem')}>
//             <Text style={styles.tileText}>➕ Add Item</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('OutfitSuggestion')}>
//             <Text style={styles.tileText}>🎯 Style Me</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('TryOn')}>
//             <Text style={styles.tileText}>🪞 Try-On</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       {/* Style Tags */}
//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Your Style Tags</Text>
//         <View style={styles.tagRow}>
//           {['Minimalist', 'Luxury', 'Streetwear', 'Neutral Tones'].map(tag => (
//             <View style={styles.tag} key={tag}>
//               <Text style={styles.tagText}>#{tag}</Text>
//             </View>
//           ))}
//         </View>
//       </View>

//       {/* Favorite Looks */}
//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Saved Looks</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           style={styles.highlightScroll}>
//           {[...Array(6)].map((_, index) => (
//             <Image
//               key={index}
//               style={styles.highlightImage}
//               source={{
//                 uri: `https://source.unsplash.com/featured/?style,outfit,${index}`,
//               }}
//             />
//           ))}
//         </ScrollView>
//       </View>

//       {/* Voice Assistant */}
//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Need Help Deciding?</Text>
//         <VoiceControlComponent
//           onPromptResult={prompt => navigate('Outfit', {prompt})}
//         />
//       </View>
//     </ScrollView>
//   );
// };

// export default HomeScreen;

///////////////

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import VoiceControlComponent from '../components/VoiceControlComponent/VoiceControlComponent';

// const HomeScreen = ({navigate, wardrobe}) => {
//   const {theme} = useAppTheme();

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     container: {paddingVertical: 24, paddingHorizontal: 16, paddingBottom: 120},
//     section: {marginBottom: 36},
//     bannerImage: {
//       width: '100%',
//       height: 240,
//       borderRadius: 20,
//       marginBottom: 20,
//     },
//     sectionTitle: {
//       fontSize: 22,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//       marginBottom: 12,
//     },
//     dailyLookCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 18,
//       padding: 20,
//     },
//     dailyLookText: {
//       fontSize: 16,
//       color: theme.colors.foreground,
//     },
//     tryButton: {
//       backgroundColor: theme.colors.primary,
//       paddingVertical: 12,
//       borderRadius: 12,
//       marginTop: 16,
//       alignItems: 'center',
//     },
//     tryButtonText: {
//       color: theme.colors.surface,
//       fontWeight: '600',
//       fontSize: 16,
//     },
//     tileRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//       gap: 12,
//     },
//     tile: {
//       width: '48%',
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       paddingVertical: 24,
//       alignItems: 'center',
//     },
//     tileText: {
//       marginTop: 10,
//       fontSize: 14,
//       fontWeight: '600',
//       color: theme.colors.foreground,
//     },
//     highlightScroll: {
//       flexDirection: 'row',
//       gap: 12,
//       paddingVertical: 10,
//     },
//     highlightImage: {
//       width: 110,
//       height: 160,
//       borderRadius: 14,
//       backgroundColor: '#ccc',
//     },
//     tag: {
//       backgroundColor: theme.colors.surface,
//       paddingHorizontal: 12,
//       paddingVertical: 6,
//       borderRadius: 18,
//       marginRight: 8,
//     },
//     tagText: {
//       fontSize: 13,
//       fontWeight: '600',
//       color: theme.colors.primary,
//     },
//     tagRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 10,
//     },
//   });

//   return (
//     <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
//       {/* Feature Banner */}
//       <Image
//         source={{uri: 'https://source.unsplash.com/featured/?fashion,lookbook'}}
//         style={styles.bannerImage}
//       />

//       {/* Daily Look */}
//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Today’s Editorial Look</Text>
//         <View style={styles.dailyLookCard}>
//           <Text style={styles.dailyLookText}>
//             Cream knit sweater layered over a sharp-collar shirt. Black tailored
//             trousers. Chelsea boots. Effortlessly sharp.
//           </Text>
//           <TouchableOpacity style={styles.tryButton}>
//             <Text style={styles.tryButtonText}>Try This Look</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       {/* Explore Actions */}
//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Quick Access</Text>
//         <View style={styles.tileRow}>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('Closet')}>
//             <Text style={styles.tileText}>🧳 My Closet</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('AddItem')}>
//             <Text style={styles.tileText}>➕ Add Item</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('OutfitSuggestion')}>
//             <Text style={styles.tileText}>🎯 Style Me</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('TryOn')}>
//             <Text style={styles.tileText}>🪞 Try-On</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       {/* Style Tags */}
//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Your Style Tags</Text>
//         <View style={styles.tagRow}>
//           {['Minimalist', 'Luxury', 'Streetwear', 'Neutral Tones'].map(tag => (
//             <View style={styles.tag} key={tag}>
//               <Text style={styles.tagText}>#{tag}</Text>
//             </View>
//           ))}
//         </View>
//       </View>

//       {/* Favorite Looks */}
//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Saved Looks</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           style={styles.highlightScroll}>
//           {[...Array(6)].map((_, index) => (
//             <Image
//               key={index}
//               style={styles.highlightImage}
//               source={{
//                 uri: `https://source.unsplash.com/featured/?style,outfit,${index}`,
//               }}
//             />
//           ))}
//         </ScrollView>
//       </View>

//       {/* Voice Assistant */}
//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Need Help Deciding?</Text>
//         <VoiceControlComponent
//           onPromptResult={prompt => navigate('Outfit', {prompt})}
//         />
//       </View>
//     </ScrollView>
//   );
// };

// export default HomeScreen;

///////////////

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import VoiceControlComponent from '../components/VoiceControlComponent/VoiceControlComponent';

// const HomeScreen = ({navigate, wardrobe}) => {
//   const {theme} = useAppTheme();

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     container: {padding: 20, paddingBottom: 120},
//     section: {marginBottom: 32},
//     heroImage: {
//       width: '100%',
//       height: 220,
//       borderRadius: 20,
//       marginBottom: 20,
//     },
//     title: {
//       fontSize: 24,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//       marginBottom: 8,
//     },
//     subtitle: {
//       fontSize: 16,
//       color: theme.colors.secondary,
//       marginBottom: 16,
//     },
//     card: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       padding: 20,
//       marginBottom: 16,
//     },
//     cta: {
//       backgroundColor: theme.colors.primary,
//       paddingVertical: 14,
//       borderRadius: 12,
//       alignItems: 'center',
//     },
//     ctaText: {
//       color: theme.colors.surface,
//       fontWeight: '600',
//       fontSize: 16,
//     },
//     tileGrid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 12,
//       justifyContent: 'space-between',
//     },
//     tile: {
//       width: '48%',
//       backgroundColor: theme.colors.surface,
//       paddingVertical: 20,
//       borderRadius: 14,
//       alignItems: 'center',
//     },
//     tileText: {
//       marginTop: 8,
//       fontSize: 14,
//       color: theme.colors.foreground,
//       fontWeight: '600',
//     },
//     tagRow: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 8,
//     },
//     tag: {
//       backgroundColor: theme.colors.surface,
//       paddingHorizontal: 12,
//       paddingVertical: 6,
//       borderRadius: 18,
//     },
//     tagText: {
//       fontSize: 13,
//       color: theme.colors.primary,
//       fontWeight: '600',
//     },
//     horizontalScroll: {
//       flexDirection: 'row',
//       gap: 12,
//       paddingVertical: 10,
//     },
//     imageCard: {
//       width: 120,
//       height: 160,
//       borderRadius: 16,
//       backgroundColor: '#ccc',
//     },
//   });

//   return (
//     <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
//       {/* Hero Mood Banner */}
//       <Image
//         source={{
//           uri: 'https://source.unsplash.com/featured/?fashion,editorial',
//         }}
//         style={styles.heroImage}
//       />

//       {/* Daily Inspiration */}
//       <View style={styles.section}>
//         <Text style={styles.title}>Today's Look</Text>
//         <View style={styles.card}>
//           <Text style={styles.subtitle}>"Effortless Street Luxe"</Text>
//           <Text style={{color: theme.colors.foreground}}>
//             Charcoal oversized blazer, white crew tee, tapered jeans, and
//             leather boots.
//           </Text>
//           <TouchableOpacity style={[styles.cta, {marginTop: 16}]}>
//             <Text style={styles.ctaText}>Try This Look</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       {/* Style Shortcuts */}
//       <View style={styles.section}>
//         <Text style={styles.title}>Explore</Text>
//         <View style={styles.tileGrid}>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('Closet')}>
//             <Text style={styles.tileText}>My Closet</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('AddItem')}>
//             <Text style={styles.tileText}>Add Item</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('OutfitSuggestion')}>
//             <Text style={styles.tileText}>Style Me</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.tile}
//             onPress={() => navigate('TryOn')}>
//             <Text style={styles.tileText}>Try-On</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       {/* Tags */}
//       <View style={styles.section}>
//         <Text style={styles.title}>Your Style Tags</Text>
//         <View style={styles.tagRow}>
//           {[
//             'Luxury',
//             'Streetwear',
//             'Minimalist',
//             'Neutral Tones',
//             'Tailored',
//           ].map(tag => (
//             <View style={styles.tag} key={tag}>
//               <Text style={styles.tagText}>#{tag}</Text>
//             </View>
//           ))}
//         </View>
//       </View>

//       {/* Favorite Brands */}
//       <View style={styles.section}>
//         <Text style={styles.title}>Favorite Brands</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           style={styles.horizontalScroll}>
//           {['Gucci', 'Eton', 'Amiri', 'Versace', 'Ferragamo'].map(
//             (brand, index) => (
//               <View key={index} style={styles.tag}>
//                 <Text style={styles.tagText}>{brand}</Text>
//               </View>
//             ),
//           )}
//         </ScrollView>
//       </View>

//       {/* Saved Looks */}
//       <View style={styles.section}>
//         <Text style={styles.title}>Saved Looks</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           style={styles.horizontalScroll}>
//           {[...Array(6)].map((_, index) => (
//             <Image
//               key={index}
//               style={styles.imageCard}
//               source={{
//                 uri: `https://source.unsplash.com/featured/?outfit,style,${index}`,
//               }}
//             />
//           ))}
//         </ScrollView>
//       </View>

//       {/* Voice Assistant */}
//       <View style={styles.section}>
//         <Text style={styles.title}>Need Help Styling?</Text>
//         <VoiceControlComponent
//           onPromptResult={prompt => navigate('Outfit', {prompt})}
//         />
//       </View>
//     </ScrollView>
//   );
// };

// export default HomeScreen;

/////////////

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import VoiceControlComponent from '../components/VoiceControlComponent/VoiceControlComponent';
// import Geolocation from 'react-native-geolocation-service';
// import {fetchWeather} from '../utils/travelWeather';
// import {ensureLocationPermission} from '../utils/permissions';

// const NewHomeScreen = ({navigate, wardrobe}) => {
//   const {theme} = useAppTheme();
//   const [weather, setWeather] = useState(null);

//   useEffect(() => {
//     const fetchData = async () => {
//       const hasPermission = await ensureLocationPermission();
//       if (!hasPermission) return;
//       Geolocation.getCurrentPosition(
//         async pos => {
//           const data = await fetchWeather(
//             pos.coords.latitude,
//             pos.coords.longitude,
//           );
//           setWeather(data);
//         },
//         err => console.warn(err),
//         {enableHighAccuracy: true, timeout: 15000, maximumAge: 1000},
//       );
//     };
//     fetchData();
//   }, []);

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     container: {padding: 24, paddingBottom: 100},
//     section: {marginBottom: 32},
//     title: {
//       fontSize: 26,
//       fontWeight: '800',
//       color: theme.colors.foreground,
//       marginBottom: 8,
//     },
//     visualCard: {
//       backgroundColor: theme.colors.surface,
//       padding: 20,
//       borderRadius: 20,
//       alignItems: 'center',
//       justifyContent: 'center',
//       shadowColor: '#000',
//       shadowOffset: {width: 0, height: 4},
//       shadowOpacity: 0.1,
//       shadowRadius: 8,
//       elevation: 4,
//     },
//     imageHighlight: {
//       width: '100%',
//       height: 180,
//       borderRadius: 16,
//       marginBottom: 16,
//     },
//     largeCTA: {
//       backgroundColor: theme.colors.primary,
//       paddingVertical: 14,
//       paddingHorizontal: 20,
//       borderRadius: 12,
//       alignItems: 'center',
//       marginBottom: 24,
//     },
//     ctaText: {fontSize: 16, color: theme.colors.surface, fontWeight: '600'},
//     gridRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       flexWrap: 'wrap',
//       gap: 12,
//     },
//     gridItem: {
//       width: '48%',
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       padding: 16,
//       alignItems: 'center',
//     },
//     gridText: {fontSize: 14, color: theme.colors.foreground, marginTop: 8},
//   });

//   return (
//     <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
//       <View style={styles.section}>
//         <Text style={styles.title}>Style Moodboard</Text>
//         <View style={styles.visualCard}>
//           <Image
//             source={{
//               uri: 'https://source.unsplash.com/featured/?fashion,outfit',
//             }}
//             style={styles.imageHighlight}
//           />
//           <Text style={{color: theme.colors.foreground, fontSize: 16}}>
//             Discover new outfit aesthetics based on your style.
//           </Text>
//         </View>
//       </View>

//       <TouchableOpacity
//         style={styles.largeCTA}
//         onPress={() => navigate('Closet')}>
//         <Text style={styles.ctaText}>🧳 View My Wardrobe</Text>
//       </TouchableOpacity>

//       <View style={styles.section}>
//         <Text style={styles.title}>Try Something New</Text>
//         <View style={styles.gridRow}>
//           <TouchableOpacity
//             style={styles.gridItem}
//             onPress={() => navigate('AddItem')}>
//             <Text style={styles.gridText}>Add New Item</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.gridItem}
//             onPress={() => navigate('OutfitSuggestion')}>
//             <Text style={styles.gridText}>Generate Outfit</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.gridItem}
//             onPress={() => navigate('Explore')}>
//             <Text style={styles.gridText}>Explore Styles</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.gridItem}
//             onPress={() => navigate('TryOn')}>
//             <Text style={styles.gridText}>Virtual Try-On</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.title}>🎙️ Talk to Your Stylist</Text>
//         <VoiceControlComponent
//           onPromptResult={prompt => navigate('Outfit', {prompt})}
//         />
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.title}>☁️ Current Weather</Text>
//         <View style={styles.visualCard}>
//           {weather ? (
//             <Text style={{color: theme.colors.foreground}}>
//               {weather.celsius.name} | {weather.fahrenheit.main.temp}°F |{' '}
//               {weather.celsius.weather[0].description}
//             </Text>
//           ) : (
//             <Text style={{color: theme.colors.foreground}}>
//               Fetching weather...
//             </Text>
//           )}
//         </View>
//       </View>
//     </ScrollView>
//   );
// };

// export default NewHomeScreen;

/////////////

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   TextInput,
//   Image,
//   Platform,
//   StyleSheet,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import Geolocation from 'react-native-geolocation-service';
// import {useAppTheme} from '../context/ThemeContext';
// import {fetchWeather} from '../utils/travelWeather';
// import {ensureLocationPermission} from '../utils/permissions';
// import VoiceControlComponent from '../components/VoiceControlComponent/VoiceControlComponent';

// const NewHomeScreen = ({navigate, wardrobe}) => {
//   const {theme} = useAppTheme();
//   const [weather, setWeather] = useState(null);

//   useEffect(() => {
//     const fetchData = async () => {
//       const hasPermission = await ensureLocationPermission();
//       if (!hasPermission) return;
//       Geolocation.getCurrentPosition(
//         async pos => {
//           const data = await fetchWeather(
//             pos.coords.latitude,
//             pos.coords.longitude,
//           );
//           setWeather(data);
//         },
//         err => console.warn(err),
//         {enableHighAccuracy: true, timeout: 15000, maximumAge: 1000},
//       );
//     };
//     fetchData();
//   }, []);

//   const styles = StyleSheet.create({
//     screen: {flex: 1, backgroundColor: theme.colors.background},
//     container: {padding: 20, paddingBottom: 120},
//     section: {marginBottom: 28},
//     header: {fontSize: 24, fontWeight: '700', color: theme.colors.foreground},
//     subText: {fontSize: 16, color: theme.colors.secondary, marginTop: 4},
//     card: {
//       backgroundColor: theme.colors.surface,
//       padding: 16,
//       borderRadius: 16,
//       marginBottom: 12,
//     },
//     weatherBox: {
//       backgroundColor: theme.colors.surface,
//       padding: 16,
//       borderRadius: 16,
//       alignItems: 'center',
//     },
//     promptBox: {
//       flexDirection: 'row',
//       backgroundColor: theme.colors.surface,
//       borderRadius: 999,
//       paddingHorizontal: 12,
//       paddingVertical: 10,
//       alignItems: 'center',
//     },
//     promptInput: {flex: 1, fontSize: 16, color: theme.colors.foreground},
//     voiceWrapper: {marginTop: 16},
//     quickRow: {flexDirection: 'row', justifyContent: 'space-between', gap: 12},
//     quickButton: {
//       flex: 1,
//       padding: 16,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 12,
//       alignItems: 'center',
//     },
//     quickText: {color: theme.colors.foreground, fontSize: 14},
//     wardrobeRow: {flexDirection: 'row', gap: 12, marginTop: 12},
//     itemImage: {width: 64, height: 80, borderRadius: 12},
//     addItemCircle: {
//       width: 64,
//       height: 80,
//       borderRadius: 12,
//       backgroundColor: theme.colors.primary,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     addItemText: {fontSize: 28, color: theme.colors.surface},
//   });

//   return (
//     <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
//       <View style={styles.section}>
//         <Text style={styles.header}>👋 Welcome back!</Text>
//         <Text style={styles.subText}>Let’s style your day right.</Text>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.header}>📦 Style Checklist</Text>
//         <View style={styles.card}>
//           <Text>Add 3 more items to unlock full outfits ➔</Text>
//         </View>
//         <View style={styles.card}>
//           <Text>Complete measurements for better fit ➔</Text>
//         </View>
//         <View style={styles.card}>
//           <Text>Set style preferences ➔</Text>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.header}>🎯 Today’s Look</Text>
//         <View style={styles.card}>
//           <Text>Navy tee, cream chinos, white sneakers</Text>
//           <Text>Inspired by your weather & style</Text>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.header}>🌤️ Weather</Text>
//         <View style={styles.weatherBox}>
//           {weather ? (
//             <>
//               <Text style={{color: theme.colors.foreground}}>
//                 {weather.celsius.name} —{' '}
//                 {weather.celsius.weather[0].description}
//               </Text>
//               <Text style={{color: theme.colors.secondary}}>
//                 {weather.fahrenheit.main.temp}°F
//               </Text>
//             </>
//           ) : (
//             <Text style={{color: theme.colors.foreground}}>Loading...</Text>
//           )}
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.header}>🧠 Ask the AI Stylist</Text>
//         <View style={styles.promptBox}>
//           <TextInput
//             placeholder="What should I wear to a beach wedding?"
//             style={styles.promptInput}
//             placeholderTextColor={theme.colors.secondary}
//           />
//           <MaterialIcons name="send" size={22} color={theme.colors.primary} />
//         </View>
//         <View style={styles.voiceWrapper}>
//           <VoiceControlComponent
//             onPromptResult={prompt => navigate('Outfit', {prompt})}
//           />
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.header}>⚡ Quick Access</Text>
//         <View style={styles.quickRow}>
//           <TouchableOpacity
//             style={styles.quickButton}
//             onPress={() => navigate('AddItem')}>
//             <Text style={styles.quickText}>Add Item</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.quickButton}
//             onPress={() => navigate('Closet')}>
//             <Text style={styles.quickText}>My Closet</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={styles.quickButton}
//             onPress={() => navigate('Explore')}>
//             <Text style={styles.quickText}>Explore</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.header}>🆕 Recently Added</Text>
//         <View style={styles.wardrobeRow}>
//           <TouchableOpacity
//             style={styles.addItemCircle}
//             onPress={() => navigate('AddItem')}>
//             <Text style={styles.addItemText}>+</Text>
//           </TouchableOpacity>
//           {wardrobe.slice(0, 3).map(item => (
//             <TouchableOpacity
//               key={item.id}
//               onPress={() => navigate('ItemDetail', {item})}>
//               <Image source={{uri: item.image}} style={styles.itemImage} />
//             </TouchableOpacity>
//           ))}
//         </View>
//       </View>
//     </ScrollView>
//   );
// };

// export default NewHomeScreen;

//////////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   TextInput,
//   ScrollView,
//   Image,
//   Platform,
//   AppState,
//   PermissionsAndroid,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import Geolocation from 'react-native-geolocation-service';
// import {ensureLocationPermission} from '../utils/permissions';
// import {fetchWeather} from '../utils/travelWeather';
// import VoiceControlComponent from '../components/VoiceControlComponent/VoiceControlComponent';
// import PushNotification from 'react-native-push-notification'; // Android
// import PushNotificationIOS from '@react-native-community/push-notification-ios'; // iOS
// import {notifyOutfitForTomorrow} from '../utils/notifyOutfitForTomorrow';
// import {useAppTheme} from '../context/ThemeContext';

// type ScheduledNotification = {
//   channelId: string;
//   message: string;
//   date: Date;
//   allowWhileIdle?: boolean;
// };

// export const scheduleNotification = (options: ScheduledNotification) => {
//   (PushNotification as any).localNotificationSchedule(options);
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: any[];
// };

// const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
//   const {theme} = useAppTheme();

//   // Call this in your component
//   const sendTestNotification = () => {
//     const fireDate = new Date(Date.now() + 5000); // 5s delay
//     console.log('⏰ Scheduling test notification...');

//     if (Platform.OS === 'ios') {
//       if (AppState.currentState === 'active') {
//         console.log('🔔 Showing iOS foreground notif...');
//         PushNotificationIOS.presentLocalNotification({
//           alertTitle: '📱 Foreground Notification',
//           alertBody: 'This is shown while the app is open.',
//           soundName: 'default',
//         });
//       } else {
//         console.log('🔔 Scheduling iOS background notif...');
//         PushNotificationIOS.addNotificationRequest({
//           id: 'test-id',
//           title: '📱 Foreground Test',
//           body: 'This is a test notification while app is open.',
//           fireDate: new Date(Date.now() + 1000),
//           sound: 'default',
//           isSilent: false,
//         });
//       }
//     } else {
//       console.log('🔔 Scheduling Android notif...');
//       PushNotification.localNotificationSchedule({
//         channelId: 'style-channel',
//         title: '📱 Android Notification',
//         message: 'This is a test notification on Android.',
//         date: fireDate,
//         allowWhileIdle: true,
//         playSound: true,
//         soundName: 'default',
//       });
//     }
//   };

//   useEffect(() => {
//     PushNotification.configure({
//       onNotification: (notification: any) => {
//         console.log('🔔 Notification received:', notification);

//         if (
//           Platform.OS === 'ios' &&
//           typeof notification.finish === 'function'
//         ) {
//           notification.finish(PushNotificationIOS.FetchResult.NoData);
//         }
//       },
//       requestPermissions: Platform.OS === 'ios',
//     });

//     if (Platform.OS === 'ios') {
//       PushNotificationIOS.requestPermissions().then(status => {
//         console.log('🔐 iOS permission status:', status);
//       });
//     }

//     PushNotification.createChannel(
//       {
//         channelId: 'style-channel',
//         channelName: 'Style Reminders',
//       },
//       created => console.log(`🛠 Channel created: ${created}`),
//     );
//   }, []);

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     container: {
//       paddingVertical: 0,
//       paddingHorizontal: 20,
//     },
//     topRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//     },
//     greeting: {
//       fontSize: 24,
//       fontWeight: '600',
//       color: theme.colors.foreground,
//     },
//     iconRow: {
//       flexDirection: 'row',
//       gap: 10,
//     },
//     iconCircle: {
//       backgroundColor: theme.colors.surface,
//       padding: 8,
//       marginLeft: 10,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     progressBox: {
//       backgroundColor: theme.colors.surface,
//       padding: 16,
//       borderRadius: 16,
//       marginVertical: 24,
//     },
//     progressContent: {},
//     progressText: {
//       fontSize: 16,
//       marginBottom: 8,
//       color: theme.colors.foreground,
//     },
//     progressButton: {
//       backgroundColor: theme.colors.primary,
//       paddingVertical: 8,
//       paddingHorizontal: 16,
//       borderRadius: 8,
//       alignSelf: 'flex-start',
//     },
//     progressButtonText: {
//       color: theme.colors.surface,
//     },
//     progressFooter: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       marginTop: 12,
//       gap: 12,
//     },
//     progressCount: {
//       color: theme.colors.surface,
//     },
//     progressBar: {
//       flex: 1,
//       height: 4,
//       backgroundColor: theme.colors.muted,
//       borderRadius: 8,
//       overflow: 'hidden',
//     },
//     progressFill: {
//       width: '3.3%',
//       height: 4,
//       backgroundColor: theme.colors.primary,
//     },
//     section: {
//       marginBottom: 24,
//     },
//     sectionWeather: {
//       marginTop: 6,
//       marginBottom: 24,
//       backgroundColor: 'grey',
//       borderRadius: 15,
//       padding: 12,
//     },
//     sectionTitle: {
//       fontSize: 18,
//       fontWeight: '500',
//       marginBottom: 12,
//       color: theme.colors.foreground,
//     },
//     askBox: {
//       flexDirection: 'row',
//       backgroundColor: theme.colors.surface,
//       borderRadius: 999,
//       paddingHorizontal: 12,
//       paddingVertical: 8,
//       alignItems: 'center',
//       marginBottom: 16,
//     },
//     input: {
//       flex: 1,
//       fontSize: 16,
//       color: theme.colors.foreground,
//     },
//     sendButton: {
//       backgroundColor: theme.colors.surface,
//       width: 32,
//       height: 32,
//       borderRadius: 16,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     sendArrow: {
//       color: '#fff',
//       fontSize: 16,
//     },
//     rowButtons: {
//       flexDirection: 'row',
//       gap: 12,
//     },
//     actionCardBlue: {
//       backgroundColor: 'blue',
//       flex: 1,
//       padding: 16,
//       borderRadius: 12,
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//     },
//     actionCardGray: {
//       backgroundColor: theme.colors.surface,
//       flex: 1,
//       padding: 16,
//       borderRadius: 12,
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//     },
//     cardText: {
//       fontSize: 16,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//     },
//     rowItems: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 16,
//     },
//     itemCircle: {
//       width: 64,
//       height: 64,
//       borderRadius: 32,
//       backgroundColor: theme.colors.surface,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     plus: {
//       fontSize: 28,
//       color: theme.colors.surface,
//     },
//     itemImage: {
//       width: 64,
//       height: 80,
//       borderRadius: 12,
//     },
//     bottomNav: {
//       flexDirection: 'row',
//       justifyContent: 'space-around',
//       alignItems: 'center',
//       paddingVertical: 12,
//       borderTopColor: theme.colors.surface,
//       borderTopWidth: 1,
//       backgroundColor: theme.colors.background,
//     },
//     navItem: {
//       alignItems: 'center',
//       flex: 1,
//     },
//     navText: {
//       fontSize: 12,
//       color: theme.colors.foreground,
//       marginTop: 4,
//     },
//     navTextDisabled: {
//       fontSize: 12,
//       color: theme.colors.foreground,
//       marginTop: 4,
//     },
//     navCenter: {
//       width: 60,
//       height: 60,
//       borderRadius: 30,
//       backgroundColor: theme.colors.primary,
//       alignItems: 'center',
//       justifyContent: 'center',
//       marginTop: -20,
//     },
//   });

//   const [weather, setWeather] = useState<any>(null);

//   useEffect(() => {
//     const fetchData = async () => {
//       const hasPermission = await ensureLocationPermission();
//       if (!hasPermission) return;

//       Geolocation.getCurrentPosition(
//         async pos => {
//           try {
//             const data = await fetchWeather(
//               pos.coords.latitude,
//               pos.coords.longitude,
//             );
//             setWeather(data);
//           } catch (err) {
//             console.warn('❌ Weather fetch failed:', err);
//           }
//         },
//         err => {
//           console.warn('❌ Location error:', err);
//         },
//         {enableHighAccuracy: true, timeout: 15000, maximumAge: 1000},
//       );
//     };

//     fetchData();
//   }, []);

//   const handlePromptResult = (prompt: string) => {
//     console.log('HomeScreen received prompt:', prompt); // LOG HERE
//     navigate('Outfit', {wardrobe, prompt});
//   };

//   useEffect(() => {
//     notifyOutfitForTomorrow();
//   }, []);

//   return (
//     <View style={styles.screen}>
//       <ScrollView
//         style={styles.container}
//         contentContainerStyle={{paddingBottom: 90}}>
//         <View style={styles.progressBox}>
//           <View style={styles.progressContent}>
//             <Text style={styles.progressText}>
//               Add 30 items and get outfits for tomorrow!
//             </Text>
//             <TouchableOpacity style={styles.progressButton}>
//               <Text style={styles.progressButtonText}>Add items</Text>
//             </TouchableOpacity>
//             <View style={styles.progressFooter}>
//               <Text style={styles.progressCount}>1/30</Text>
//               <View style={styles.progressBar}>
//                 <View style={styles.progressFill} />
//               </View>
//             </View>
//           </View>
//         </View>

//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>AI Stylist</Text>
//           <View style={styles.askBox}>
//             <TextInput
//               placeholder="Ask anything about fashion!"
//               style={styles.input}
//               placeholderTextColor={theme.colors.foreground}
//             />
//             <TouchableOpacity style={styles.sendButton}>
//               <Text style={styles.sendArrow}>➔</Text>
//             </TouchableOpacity>
//           </View>

//           <View style={styles.rowButtons}>
//             <VoiceControlComponent onPromptResult={handlePromptResult} />
//             <TouchableOpacity style={styles.actionCardGray}>
//               <Text style={styles.cardText}>History</Text>
//               <MaterialIcons
//                 name="access-time"
//                 size={26}
//                 color={theme.colors.surface}
//               />
//             </TouchableOpacity>
//           </View>
//         </View>

//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>Recently Added Items</Text>
//           <View style={styles.rowItems}>
//             <TouchableOpacity
//               style={styles.itemCircle}
//               onPress={() => navigate('AddItem')}>
//               <Text style={styles.plus}>+</Text>
//             </TouchableOpacity>

//             {wardrobe.slice(0, 3).map(item => (
//               <TouchableOpacity
//                 key={item.id}
//                 onPress={() => navigate('ItemDetail', {item})}>
//                 <Image source={{uri: item.image}} style={styles.itemImage} />
//               </TouchableOpacity>
//             ))}
//           </View>
//         </View>

//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>Today’s Suggestion</Text>
//           <View style={styles.sectionWeather}>
//             {weather && (
//               <View style={{marginTop: 8}}>
//                 <Text style={{color: theme.colors.foreground}}>
//                   {weather.celsius.name}
//                 </Text>
//                 <Text style={{color: theme.colors.secondary}}>
//                   🌡️ {weather.fahrenheit.main.temp}°F —{' '}
//                   {weather.celsius.weather[0].description}
//                 </Text>
//               </View>
//             )}
//           </View>
//         </View>
//         <TouchableOpacity
//           style={{
//             marginTop: 20,
//             backgroundColor: theme.colors.primary,
//             padding: 12,
//             borderRadius: 8,
//             alignItems: 'center',
//           }}
//           onPress={() => {
//             const fireDate = new Date(Date.now() + 5000);
//             console.log('⏰ Scheduling test notification...');

//             // if (Platform.OS === 'ios') {
//             //   console.log('🔔 Scheduling iOS background notif...');
//             //   const triggerDate = new Date(Date.now() + 5000); // 5s later
//             //   PushNotificationIOS.addNotificationRequest({
//             //     id: 'test-id',
//             //     title: '📱 Test Notification',
//             //     body: 'This is a background notification in 5 seconds.',
//             //     fireDate: triggerDate,
//             //     sound: 'default',
//             //   });
//             if (Platform.OS === 'ios') {
//               console.log('🔔 Showing iOS foreground notif...');
//               PushNotificationIOS.presentLocalNotification({
//                 alertTitle: '📱 Foreground Notification',
//                 alertBody: 'This notification should show while app is open.',
//                 soundName: 'default',
//               });
//             } else {
//               // Android logic...
//             }
//           }}>
//           <Text style={{color: theme.colors.surface}}>Test Notification</Text>
//         </TouchableOpacity>
//       </ScrollView>
//     </View>
//   );
// };

// export default HomeScreen;

////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   TextInput,
//   ScrollView,
//   Image,
//   Platform,
//   AppState,
//   PermissionsAndroid,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import Geolocation from 'react-native-geolocation-service';
// import {ensureLocationPermission} from '../utils/permissions';
// import {fetchWeather} from '../utils/travelWeather';
// import VoiceControlComponent from '../components/VoiceControlComponent/VoiceControlComponent';
// import PushNotification from 'react-native-push-notification'; // Android
// import PushNotificationIOS from '@react-native-community/push-notification-ios'; // iOS
// import {notifyOutfitForTomorrow} from '../utils/notifyOutfitForTomorrow';
// import {useAppTheme} from '../context/ThemeContext';

// type ScheduledNotification = {
//   channelId: string;
//   message: string;
//   date: Date;
//   allowWhileIdle?: boolean;
// };

// export const scheduleNotification = (options: ScheduledNotification) => {
//   (PushNotification as any).localNotificationSchedule(options);
// };

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: any[];
// };

// const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
//   const {theme} = useAppTheme();

//   // Call this in your component
//   const sendTestNotification = () => {
//     const fireDate = new Date(Date.now() + 5000); // 5s delay
//     console.log('⏰ Scheduling test notification...');

//     if (Platform.OS === 'ios') {
//       if (AppState.currentState === 'active') {
//         console.log('🔔 Showing iOS foreground notif...');
//         PushNotificationIOS.presentLocalNotification({
//           alertTitle: '📱 Foreground Notification',
//           alertBody: 'This is shown while the app is open.',
//           soundName: 'default',
//         });
//       } else {
//         console.log('🔔 Scheduling iOS background notif...');
//         PushNotificationIOS.addNotificationRequest({
//           id: 'test-id',
//           title: '📱 Foreground Test',
//           body: 'This is a test notification while app is open.',
//           fireDate: new Date(Date.now() + 1000),
//           sound: 'default',
//           isSilent: false,
//         });
//       }
//     } else {
//       console.log('🔔 Scheduling Android notif...');
//       PushNotification.localNotificationSchedule({
//         channelId: 'style-channel',
//         title: '📱 Android Notification',
//         message: 'This is a test notification on Android.',
//         date: fireDate,
//         allowWhileIdle: true,
//         playSound: true,
//         soundName: 'default',
//       });
//     }
//   };

//   useEffect(() => {
//     PushNotification.configure({
//       onNotification: (notification: any) => {
//         console.log('🔔 Notification received:', notification);

//         if (
//           Platform.OS === 'ios' &&
//           typeof notification.finish === 'function'
//         ) {
//           notification.finish(PushNotificationIOS.FetchResult.NoData);
//         }
//       },
//       requestPermissions: Platform.OS === 'ios',
//     });

//     if (Platform.OS === 'ios') {
//       PushNotificationIOS.requestPermissions().then(status => {
//         console.log('🔐 iOS permission status:', status);
//       });
//     }

//     PushNotification.createChannel(
//       {
//         channelId: 'style-channel',
//         channelName: 'Style Reminders',
//       },
//       created => console.log(`🛠 Channel created: ${created}`),
//     );
//   }, []);

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     container: {
//       paddingVertical: 0,
//       paddingHorizontal: 20,
//     },
//     topRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//     },
//     greeting: {
//       fontSize: 24,
//       fontWeight: '600',
//       color: theme.colors.foreground,
//     },
//     iconRow: {
//       flexDirection: 'row',
//       gap: 10,
//     },
//     iconCircle: {
//       backgroundColor: theme.colors.surface,
//       padding: 8,
//       marginLeft: 10,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     progressBox: {
//       backgroundColor: theme.colors.surface,
//       padding: 16,
//       borderRadius: 16,
//       marginVertical: 24,
//     },
//     progressContent: {},
//     progressText: {
//       fontSize: 16,
//       marginBottom: 8,
//       color: theme.colors.foreground,
//     },
//     progressButton: {
//       backgroundColor: theme.colors.primary,
//       paddingVertical: 8,
//       paddingHorizontal: 16,
//       borderRadius: 8,
//       alignSelf: 'flex-start',
//     },
//     progressButtonText: {
//       color: theme.colors.surface,
//     },
//     progressFooter: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       marginTop: 12,
//       gap: 12,
//     },
//     progressCount: {
//       color: theme.colors.surface,
//     },
//     progressBar: {
//       flex: 1,
//       height: 4,
//       backgroundColor: theme.colors.muted,
//       borderRadius: 8,
//       overflow: 'hidden',
//     },
//     progressFill: {
//       width: '3.3%',
//       height: 4,
//       backgroundColor: theme.colors.primary,
//     },
//     section: {
//       marginBottom: 24,
//     },
//     sectionWeather: {
//       marginTop: 6,
//       marginBottom: 24,
//       backgroundColor: 'grey',
//       borderRadius: 15,
//       padding: 12,
//     },
//     sectionTitle: {
//       fontSize: 18,
//       fontWeight: '500',
//       marginBottom: 12,
//       color: theme.colors.foreground,
//     },
//     askBox: {
//       flexDirection: 'row',
//       backgroundColor: theme.colors.surface,
//       borderRadius: 999,
//       paddingHorizontal: 12,
//       paddingVertical: 8,
//       alignItems: 'center',
//       marginBottom: 16,
//     },
//     input: {
//       flex: 1,
//       fontSize: 16,
//       color: theme.colors.foreground,
//     },
//     sendButton: {
//       backgroundColor: theme.colors.surface,
//       width: 32,
//       height: 32,
//       borderRadius: 16,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     sendArrow: {
//       color: '#fff',
//       fontSize: 16,
//     },
//     rowButtons: {
//       flexDirection: 'row',
//       gap: 12,
//     },
//     actionCardBlue: {
//       backgroundColor: 'blue',
//       flex: 1,
//       padding: 16,
//       borderRadius: 12,
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//     },
//     actionCardGray: {
//       backgroundColor: theme.colors.surface,
//       flex: 1,
//       padding: 16,
//       borderRadius: 12,
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//     },
//     cardText: {
//       fontSize: 16,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//     },
//     rowItems: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 16,
//     },
//     itemCircle: {
//       width: 64,
//       height: 64,
//       borderRadius: 32,
//       backgroundColor: theme.colors.surface,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     plus: {
//       fontSize: 28,
//       color: theme.colors.surface,
//     },
//     itemImage: {
//       width: 64,
//       height: 80,
//       borderRadius: 12,
//     },
//     bottomNav: {
//       flexDirection: 'row',
//       justifyContent: 'space-around',
//       alignItems: 'center',
//       paddingVertical: 12,
//       borderTopColor: theme.colors.surface,
//       borderTopWidth: 1,
//       backgroundColor: theme.colors.background,
//     },
//     navItem: {
//       alignItems: 'center',
//       flex: 1,
//     },
//     navText: {
//       fontSize: 12,
//       color: theme.colors.foreground,
//       marginTop: 4,
//     },
//     navTextDisabled: {
//       fontSize: 12,
//       color: theme.colors.foreground,
//       marginTop: 4,
//     },
//     navCenter: {
//       width: 60,
//       height: 60,
//       borderRadius: 30,
//       backgroundColor: theme.colors.primary,
//       alignItems: 'center',
//       justifyContent: 'center',
//       marginTop: -20,
//     },
//   });

//   const [weather, setWeather] = useState<any>(null);

//   useEffect(() => {
//     const fetchData = async () => {
//       const hasPermission = await ensureLocationPermission();
//       if (!hasPermission) return;

//       Geolocation.getCurrentPosition(
//         async pos => {
//           try {
//             const data = await fetchWeather(
//               pos.coords.latitude,
//               pos.coords.longitude,
//             );
//             setWeather(data);
//           } catch (err) {
//             console.warn('❌ Weather fetch failed:', err);
//           }
//         },
//         err => {
//           console.warn('❌ Location error:', err);
//         },
//         {enableHighAccuracy: true, timeout: 15000, maximumAge: 1000},
//       );
//     };

//     fetchData();
//   }, []);

//   const handlePromptResult = (prompt: string) => {
//     console.log('HomeScreen received prompt:', prompt); // LOG HERE
//     navigate('Outfit', {wardrobe, prompt});
//   };

//   useEffect(() => {
//     notifyOutfitForTomorrow();
//   }, []);

//   return (
//     <View style={styles.screen}>
//       <ScrollView
//         style={styles.container}
//         contentContainerStyle={{paddingBottom: 90}}>
//         <View style={styles.progressBox}>
//           <View style={styles.progressContent}>
//             <Text style={styles.progressText}>
//               Add 30 items and get outfits for tomorrow!
//             </Text>
//             <TouchableOpacity style={styles.progressButton}>
//               <Text style={styles.progressButtonText}>Add items</Text>
//             </TouchableOpacity>
//             <View style={styles.progressFooter}>
//               <Text style={styles.progressCount}>1/30</Text>
//               <View style={styles.progressBar}>
//                 <View style={styles.progressFill} />
//               </View>
//             </View>
//           </View>
//         </View>

//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>AI Stylist</Text>
//           <View style={styles.askBox}>
//             <TextInput
//               placeholder="Ask anything about fashion!"
//               style={styles.input}
//               placeholderTextColor={theme.colors.foreground}
//             />
//             <TouchableOpacity style={styles.sendButton}>
//               <Text style={styles.sendArrow}>➔</Text>
//             </TouchableOpacity>
//           </View>

//           <View style={styles.rowButtons}>
//             <VoiceControlComponent onPromptResult={handlePromptResult} />
//             <TouchableOpacity style={styles.actionCardGray}>
//               <Text style={styles.cardText}>History</Text>
//               <MaterialIcons
//                 name="access-time"
//                 size={26}
//                 color={theme.colors.surface}
//               />
//             </TouchableOpacity>
//           </View>
//         </View>

//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>Recently Added Items</Text>
//           <View style={styles.rowItems}>
//             <TouchableOpacity
//               style={styles.itemCircle}
//               onPress={() => navigate('AddItem')}>
//               <Text style={styles.plus}>+</Text>
//             </TouchableOpacity>

//             {wardrobe.slice(0, 3).map(item => (
//               <TouchableOpacity
//                 key={item.id}
//                 onPress={() => navigate('ItemDetail', {item})}>
//                 <Image source={{uri: item.image}} style={styles.itemImage} />
//               </TouchableOpacity>
//             ))}
//           </View>
//         </View>

//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>Today’s Suggestion</Text>
//           <View style={styles.sectionWeather}>
//             {weather && (
//               <View style={{marginTop: 8}}>
//                 <Text style={{color: theme.colors.foreground}}>
//                   {weather.celsius.name}
//                 </Text>
//                 <Text style={{color: theme.colors.secondary}}>
//                   🌡️ {weather.fahrenheit.main.temp}°F —{' '}
//                   {weather.celsius.weather[0].description}
//                 </Text>
//               </View>
//             )}
//           </View>
//         </View>
//         <TouchableOpacity
//           style={{
//             marginTop: 20,
//             backgroundColor: theme.colors.primary,
//             padding: 12,
//             borderRadius: 8,
//             alignItems: 'center',
//           }}
//           onPress={() => {
//             const fireDate = new Date(Date.now() + 5000);
//             console.log('⏰ Scheduling test notification...');

//             // if (Platform.OS === 'ios') {
//             //   console.log('🔔 Scheduling iOS background notif...');
//             //   const triggerDate = new Date(Date.now() + 5000); // 5s later
//             //   PushNotificationIOS.addNotificationRequest({
//             //     id: 'test-id',
//             //     title: '📱 Test Notification',
//             //     body: 'This is a background notification in 5 seconds.',
//             //     fireDate: triggerDate,
//             //     sound: 'default',
//             //   });
//             if (Platform.OS === 'ios') {
//               console.log('🔔 Showing iOS foreground notif...');
//               PushNotificationIOS.presentLocalNotification({
//                 alertTitle: '📱 Foreground Notification',
//                 alertBody: 'This notification should show while app is open.',
//                 soundName: 'default',
//               });
//             } else {
//               // Android logic...
//             }
//           }}>
//           <Text style={{color: theme.colors.surface}}>Test Notification</Text>
//         </TouchableOpacity>
//       </ScrollView>
//     </View>
//   );
// };

// export default HomeScreen;
