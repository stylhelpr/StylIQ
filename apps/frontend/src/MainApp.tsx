// import React, {useEffect, useState} from 'react';
// import {SafeAreaView, Text, Pressable, View} from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import {useAppTheme} from './context/ThemeContext';
// import Geolocation from 'react-native-geolocation-service';
// import {ensureLocationPermission} from './utils/permissions';
// import {OPENWEATHER_API_KEY} from '@env';
// import {
//   fetchTomorrowWeather,
//   reverseGeocode,
// } from './utils/fetchTomorrowWeather';
// import {fetchWeather} from './utils/travelWeather';

// import MessageTester from './components/MessageTester';
// import TempPost from './components/TempPost';
// import TestReactQuery from './components/TestReactQuery';
// import VoiceControlComponent from './components/VoiceControlComponent/VoiceControlComponent';
// import ImagePickerGrid from './components/ImagePickerGrid/ImagePickerGrid';

// const Section: React.FC<{title: string; children: React.ReactNode}> = ({
//   children,
//   title,
// }) => {
//   const {theme: currentTheme} = useAppTheme();
//   const result = {a: {b: {c: 123}}}?.a?.b?.c;

//   return (
//     <Pressable onPress={() => console.log('Section tapped')}>
//       <Animatable.View
//         animation="fadeInUp"
//         duration={1800}
//         style={{
//           marginTop: currentTheme.spacing.xl,
//           paddingHorizontal: currentTheme.spacing.lg,
//         }}>
//         <Text
//           style={{
//             fontSize: currentTheme.fontSize['2xl'],
//             fontWeight: currentTheme.fontWeight.semiBold,
//             color: currentTheme.colors.primary,
//           }}>
//           {title}
//         </Text>
//         <Text
//           style={{
//             marginTop: currentTheme.spacing.sm,
//             fontSize: currentTheme.fontSize.lg,
//             fontWeight: currentTheme.fontWeight.normal,
//             color: currentTheme.colors.secondary,
//           }}>
//           {children}
//         </Text>
//         <Text
//           style={{
//             marginTop: currentTheme.spacing.md,
//             fontSize: currentTheme.fontSize.base,
//             color: currentTheme.colors.success,
//           }}>
//           Optional chaining result: {result}
//         </Text>
//       </Animatable.View>
//     </Pressable>
//   );
// };

// const MainApp = () => {
//   const {theme: currentTheme, toggleTheme} = useAppTheme();
//   const [weather, setWeather] = useState<any>(null);
//   const [city, setCity] = useState<string>('...');

//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     const fetchLocation = async () => {
//       const hasPermission = await ensureLocationPermission();
//       if (!hasPermission) return;

//       Geolocation.getCurrentPosition(
//         pos => {
//           console.log('📍 User location:', pos.coords);
//           // Optionally: fetch weather here
//         },
//         err => console.warn('❌ Location error:', err),
//         {
//           enableHighAccuracy: true,
//           timeout: 15000,
//           maximumAge: 1000,
//         },
//       );
//     };

//     fetchLocation();
//   }, []);

//   useEffect(() => {
//     const fetchWeather = async () => {
//       const hasPermission = await ensureLocationPermission();
//       if (!hasPermission) return;

//       Geolocation.getCurrentPosition(
//         async pos => {
//           const {latitude, longitude} = pos.coords;

//           try {
//             // Run both API requests in parallel
//             const [weatherData, cityName] = await Promise.all([
//               fetchTomorrowWeather(latitude, longitude),
//               reverseGeocode(latitude, longitude),
//             ]);

//             console.log('🧠 Weather Insights:', weatherData);
//             console.log('🏙️ Reverse geocoded city:', cityName);

//             setWeather(weatherData);
//             setCity(cityName);
//           } catch (err) {
//             console.error('❌ Failed to fetch weather or city info', err);
//             setError('Failed to load weather data.');
//           }
//         },
//         err => {
//           console.warn('❌ Location error:', err);
//           setError('Location permission error');
//         },
//         {
//           enableHighAccuracy: true,
//           timeout: 15000,
//           maximumAge: 1000,
//         },
//       );
//     };

//     fetchWeather();
//   }, []);

//   return (
//     <SafeAreaView
//       style={{
//         flex: 1,
//         backgroundColor: currentTheme.colors.background,
//         justifyContent: 'center',
//         padding: currentTheme.spacing.md,
//       }}>
//       <VoiceControlComponent />
//       <View style={{height: 300}}>
//         <ImagePickerGrid />
//       </View>
//       {weather?.data?.values?.temperatureApparent ? (
//         <View style={{marginTop: 20}}>
//           <Text style={{fontSize: 18, color: currentTheme.colors.primary}}>
//             📍 Location: {weather.location.lat}, {weather.location.lon}
//           </Text>
//           <Text style={{fontSize: 16, color: currentTheme.colors.secondary}}>
//             🌡️ {weather.data.values.temperatureApparent}°C
//           </Text>
//           <Text
//             style={{
//               marginTop: 4,
//               fontStyle: 'italic',
//               color: currentTheme.colors.secondary,
//             }}>
//             👕 Recommended: {getStyleAdvice(weather.data.values.weatherCode)}
//           </Text>
//         </View>
//       ) : (
//         <Text style={{color: currentTheme.colors.primary}}>
//           Loading weather...
//         </Text>
//       )}

//       {/* <MessageTester />
//       <TempPost />
//       <TestReactQuery />
//       <Section title="Step One">
//         Edit{' '}
//         <Text
//           style={{
//             fontWeight: currentTheme.fontWeight.bold,
//             color: currentTheme.colors.error,
//           }}
//         >
//           App.tsx
//         </Text>{' '}
//         to animate this screen.
//       </Section> */}

//       <Pressable
//         onPress={toggleTheme}
//         style={{
//           marginTop: 32,
//           backgroundColor: currentTheme.colors.surface,
//           padding: 12,
//           borderRadius: currentTheme.borderRadius.md,
//         }}>
//         <Text style={{color: currentTheme.colors.primary, textAlign: 'center'}}>
//           Toggle Theme
//         </Text>
//       </Pressable>
//     </SafeAreaView>
//   );
// };

// export default MainApp;

// const getWeatherLabel = (code: string) => {
//   const map: Record<string, string> = {
//     clear: 'Clear skies',
//     rain_light: 'Light rain',
//     rain_heavy: 'Heavy rain',
//     snow_light: 'Light snow',
//     snow_heavy: 'Heavy snow',
//     cloudy: 'Cloudy',
//     partly_cloudy: 'Partly cloudy',
//     fog: 'Foggy',
//     thunderstorm: 'Storm',
//     drizzle: 'Drizzle',
//   };
//   return map[code] || code;
// };

// const getStyleAdvice = (code: number) => {
//   const map: Record<number, string> = {
//     1000: 'T-shirt and shades',
//     1100: 'Light jacket or sweater',
//     1101: 'Jacket and layers',
//     4000: 'Raincoat and waterproof shoes',
//     5001: 'Winter coat and boots',
//     4200: 'Umbrella and rain boots',
//   };
//   return map[code] || 'Check conditions and dress accordingly';
// };

///////////

import React, {useEffect, useState} from 'react';
import {SafeAreaView, Text, Pressable, View} from 'react-native';
import * as Animatable from 'react-native-animatable';
import {useAppTheme} from './context/ThemeContext';
import Geolocation from 'react-native-geolocation-service';
import {ensureLocationPermission} from './utils/permissions';
import {OPENWEATHER_API_KEY} from '@env';
import {fetchWeather} from './utils/travelWeather';

import MessageTester from './components/MessageTester';
import TempPost from './components/TempPost';
import TestReactQuery from './components/TestReactQuery';
import VoiceControlComponent from './components/VoiceControlComponent/VoiceControlComponent';
import ImagePickerGrid from './components/ImagePickerGrid/ImagePickerGrid';

const Section: React.FC<{title: string; children: React.ReactNode}> = ({
  children,
  title,
}) => {
  const {theme: currentTheme} = useAppTheme();
  const result = {a: {b: {c: 123}}}?.a?.b?.c;

  return (
    <Pressable onPress={() => console.log('Section tapped')}>
      <Animatable.View
        animation="fadeInUp"
        duration={1800}
        style={{
          marginTop: currentTheme.spacing.xl,
          paddingHorizontal: currentTheme.spacing.lg,
        }}>
        <Text
          style={{
            fontSize: currentTheme.fontSize['2xl'],
            fontWeight: currentTheme.fontWeight.semiBold,
            color: currentTheme.colors.primary,
          }}>
          {title}
        </Text>
        <Text
          style={{
            marginTop: currentTheme.spacing.sm,
            fontSize: currentTheme.fontSize.lg,
            fontWeight: currentTheme.fontWeight.normal,
            color: currentTheme.colors.secondary,
          }}>
          {children}
        </Text>
        <Text
          style={{
            marginTop: currentTheme.spacing.md,
            fontSize: currentTheme.fontSize.base,
            color: currentTheme.colors.success,
          }}>
          Optional chaining result: {result}
        </Text>
      </Animatable.View>
    </Pressable>
  );
};

const MainApp = () => {
  const {theme: currentTheme, toggleTheme} = useAppTheme();
  const [weather, setWeather] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWeather = async () => {
      const hasPermission = await ensureLocationPermission();
      if (!hasPermission) {
        setError('Location permission denied');
        return;
      }

      Geolocation.getCurrentPosition(
        async pos => {
          const {latitude, longitude} = pos.coords;
          // console.log('📍 User location:', pos.coords);

          try {
            const data = await fetchWeather(latitude, longitude);
            // console.log('✅ Weather data returned:', data);
            setWeather(data);
          } catch (err) {
            // console.error('❌ Weather fetch error:', err);
            setError('Failed to fetch weather');
          }
        },
        err => {
          // console.warn('❌ Location error:', err);
          setError('Failed to get location');
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 1000,
        },
      );
    };

    loadWeather();
  }, []);

  useEffect(() => {
    const fetchLocation = async () => {
      const hasPermission = await ensureLocationPermission();
      if (!hasPermission) return;

      Geolocation.getCurrentPosition(
        pos => {
          // console.log('📍 User location:', pos.coords);
          // Optionally: fetch weather here
        },
        err => console.warn('❌ Location error:', err),
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 1000,
        },
      );
    };

    fetchLocation();
  }, []);

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: currentTheme.colors.background,
        justifyContent: 'center',
        padding: currentTheme.spacing.md,
      }}>
      <VoiceControlComponent />
      <View style={{height: 300}}>
        <ImagePickerGrid />
      </View>
      {weather ? (
        <View style={{marginTop: 20}}>
          <Text style={{color: currentTheme.colors.primary, fontSize: 18}}>
            📍 {weather.name}
          </Text>
          <Text style={{color: currentTheme.colors.secondary, fontSize: 16}}>
            🌡️ {weather.main.temp}°C — {weather.weather[0].description}
          </Text>
        </View>
      ) : error ? (
        <Text style={{color: currentTheme.colors.error}}>{error}</Text>
      ) : (
        <Text style={{color: currentTheme.colors.primary}}>
          Loading weather...
        </Text>
      )}

      {/* <MessageTester />
      <TempPost />
      <TestReactQuery />
      <Section title="Step One">
        Edit{' '}
        <Text
          style={{
            fontWeight: currentTheme.fontWeight.bold,
            color: currentTheme.colors.error,
          }}
        >
          App.tsx
        </Text>{' '}
        to animate this screen.
      </Section> */}

      <Pressable
        onPress={toggleTheme}
        style={{
          marginTop: 32,
          backgroundColor: currentTheme.colors.surface,
          padding: 12,
          borderRadius: currentTheme.borderRadius.md,
        }}>
        <Text style={{color: currentTheme.colors.primary, textAlign: 'center'}}>
          Toggle Theme
        </Text>
      </Pressable>
    </SafeAreaView>
  );
};

export default MainApp;

//////////////

// import React, {useEffect} from 'react';
// import {SafeAreaView, Text, Pressable, View} from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import {useAppTheme} from './context/ThemeContext';
// import Geolocation from 'react-native-geolocation-service';
// import {ensureLocationPermission} from './utils/permissions';
// import {OPENWEATHER_API_KEY} from '@env';
// import {fetchWeather} from './utils/travelWeather';

// import MessageTester from './components/MessageTester';
// import TempPost from './components/TempPost';
// import TestReactQuery from './components/TestReactQuery';
// import VoiceControlComponent from './components/VoiceControlComponent/VoiceControlComponent';
// import ImagePickerGrid from './components/ImagePickerGrid/ImagePickerGrid';

// const Section: React.FC<{title: string; children: React.ReactNode}> = ({
//   children,
//   title,
// }) => {
//   const {theme: currentTheme} = useAppTheme();
//   const result = {a: {b: {c: 123}}}?.a?.b?.c;

//   return (
//     <Pressable onPress={() => console.log('Section tapped')}>
//       <Animatable.View
//         animation="fadeInUp"
//         duration={1800}
//         style={{
//           marginTop: currentTheme.spacing.xl,
//           paddingHorizontal: currentTheme.spacing.lg,
//         }}>
//         <Text
//           style={{
//             fontSize: currentTheme.fontSize['2xl'],
//             fontWeight: currentTheme.fontWeight.semiBold,
//             color: currentTheme.colors.primary,
//           }}>
//           {title}
//         </Text>
//         <Text
//           style={{
//             marginTop: currentTheme.spacing.sm,
//             fontSize: currentTheme.fontSize.lg,
//             fontWeight: currentTheme.fontWeight.normal,
//             color: currentTheme.colors.secondary,
//           }}>
//           {children}
//         </Text>
//         <Text
//           style={{
//             marginTop: currentTheme.spacing.md,
//             fontSize: currentTheme.fontSize.base,
//             color: currentTheme.colors.success,
//           }}>
//           Optional chaining result: {result}
//         </Text>
//       </Animatable.View>
//     </Pressable>
//   );
// };

// const MainApp = () => {
//   const {theme: currentTheme, toggleTheme} = useAppTheme();

//   useEffect(() => {
//     const fetchLocation = async () => {
//       const hasPermission = await ensureLocationPermission();
//       if (!hasPermission) return;

//       Geolocation.getCurrentPosition(
//         pos => {
//           console.log('📍 User location:', pos.coords);
//           // Optionally: fetch weather here
//         },
//         err => console.warn('❌ Location error:', err),
//         {
//           enableHighAccuracy: true,
//           timeout: 15000,
//           maximumAge: 1000,
//         },
//       );
//     };

//     fetchLocation();
//   }, []);

//   useEffect(() => {
//     const testFetch = async () => {
//       console.log('🚀 Calling fetchWeather() directly...');
//       try {
//         const data = await fetchWeather(34.0522, -118.2437); // Los Angeles
//         console.log('✅ Weather data returned:', data);
//       } catch (err) {
//         console.error('❌ Weather fetch test error:', err);
//       }
//     };

//     testFetch();
//   }, []);

//   return (
//     <SafeAreaView
//       style={{
//         flex: 1,
//         backgroundColor: currentTheme.colors.background,
//         justifyContent: 'center',
//         padding: currentTheme.spacing.md,
//       }}>
//       <VoiceControlComponent />
//       <View style={{height: 300}}>
//         <ImagePickerGrid />
//       </View>

//       {/* <MessageTester />
//       <TempPost />
//       <TestReactQuery />
//       <Section title="Step One">
//         Edit{' '}
//         <Text
//           style={{
//             fontWeight: currentTheme.fontWeight.bold,
//             color: currentTheme.colors.error,
//           }}
//         >
//           App.tsx
//         </Text>{' '}
//         to animate this screen.
//       </Section> */}

//       <Pressable
//         onPress={toggleTheme}
//         style={{
//           marginTop: 32,
//           backgroundColor: currentTheme.colors.surface,
//           padding: 12,
//           borderRadius: currentTheme.borderRadius.md,
//         }}>
//         <Text style={{color: currentTheme.colors.primary, textAlign: 'center'}}>
//           Toggle Theme
//         </Text>
//       </Pressable>
//     </SafeAreaView>
//   );
// };

// export default MainApp;

//////////////

// // src/MainApp.tsx
// import React from 'react';
// import {SafeAreaView, Text, Pressable, View} from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import {useAppTheme} from './context/ThemeContext';
// import MessageTester from './components/MessageTester';
// import TempPost from './components/TempPost';
// import TestReactQuery from './components/TestReactQuery';
// import VoiceControlComponent from './components/VoiceControlComponent/VoiceControlComponent';
// import ImagePickerGrid from './components/ImagePickerGrid/ImagePickerGrid';

// const Section: React.FC<{title: string; children: React.ReactNode}> = ({
//   children,
//   title,
// }) => {
//   const {theme: currentTheme} = useAppTheme();

//   const result = {a: {b: {c: 123}}}?.a?.b?.c;

//   return (
//     <Pressable onPress={() => console.log('Section tapped')}>
//       <Animatable.View
//         animation="fadeInUp"
//         duration={1800}
//         style={{
//           marginTop: currentTheme.spacing.xl,
//           paddingHorizontal: currentTheme.spacing.lg,
//         }}>
//         <Text
//           style={{
//             fontSize: currentTheme.fontSize['2xl'],
//             fontWeight: currentTheme.fontWeight.semiBold,
//             color: currentTheme.colors.primary,
//           }}>
//           {title}
//         </Text>
//         <Text
//           style={{
//             marginTop: currentTheme.spacing.sm,
//             fontSize: currentTheme.fontSize.lg,
//             fontWeight: currentTheme.fontWeight.normal,
//             color: currentTheme.colors.secondary,
//           }}>
//           {children}
//         </Text>
//         <Text
//           style={{
//             marginTop: currentTheme.spacing.md,
//             fontSize: currentTheme.fontSize.base,
//             color: currentTheme.colors.success,
//           }}>
//           Optional chaining result: {result}
//         </Text>
//       </Animatable.View>
//     </Pressable>
//   );
// };

// const MainApp = () => {
//   const {theme: currentTheme, toggleTheme} = useAppTheme();

//   return (
//     <SafeAreaView
//       style={{
//         flex: 1,
//         backgroundColor: currentTheme.colors.background,
//         justifyContent: 'center',
//         padding: currentTheme.spacing.md,
//       }}>
//       <VoiceControlComponent />
//       <View
//         style={{
//           height: 300,
//         }}>
//         <ImagePickerGrid />
//       </View>
//       {/* <MessageTester />
//       <TempPost />
//       <TestReactQuery />
//       <Section title="Step One">
//         Edit{' '}
//         <Text
//           style={{
//             fontWeight: currentTheme.fontWeight.bold,
//             color: currentTheme.colors.error,
//           }}>
//           App.tsx
//         </Text>{' '}
//         to animate this screen.
//       </Section> */}

//       <Pressable
//         onPress={toggleTheme}
//         style={{
//           marginTop: 32,
//           backgroundColor: currentTheme.colors.surface,
//           padding: 12,
//           borderRadius: currentTheme.borderRadius.md,
//         }}>
//         <Text style={{color: currentTheme.colors.primary, textAlign: 'center'}}>
//           Toggle Theme
//         </Text>
//       </Pressable>
//     </SafeAreaView>
//   );
// };

// export default MainApp;

/////////////

// // src/MainApp.tsx
// import React from 'react';
// import {SafeAreaView, Text, Pressable} from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import {useAppTheme} from './context/ThemeContext';
// import MessageTester from './components/MessageTester';
// import TempPost from './components/TempPost';
// import TestReactQuery from './components/TestReactQuery';
// import VoiceControlComponent from './components/VoiceControlComponent/VoiceControlComponent';
// import ImagePicker from './components/ImagePicker/ImagePicker';

// const Section: React.FC<{title: string; children: React.ReactNode}> = ({
//   children,
//   title,
// }) => {
//   const {theme: currentTheme} = useAppTheme();

//   const result = {a: {b: {c: 123}}}?.a?.b?.c;

//   return (
//     <Pressable onPress={() => console.log('Section tapped')}>
//       <Animatable.View
//         animation="fadeInUp"
//         duration={1800}
//         style={{
//           marginTop: currentTheme.spacing.xl,
//           paddingHorizontal: currentTheme.spacing.lg,
//         }}>
//         <Text
//           style={{
//             fontSize: currentTheme.fontSize['2xl'],
//             fontWeight: currentTheme.fontWeight.semiBold,
//             color: currentTheme.colors.primary,
//           }}>
//           {title}
//         </Text>
//         <Text
//           style={{
//             marginTop: currentTheme.spacing.sm,
//             fontSize: currentTheme.fontSize.lg,
//             fontWeight: currentTheme.fontWeight.normal,
//             color: currentTheme.colors.secondary,
//           }}>
//           {children}
//         </Text>
//         <Text
//           style={{
//             marginTop: currentTheme.spacing.md,
//             fontSize: currentTheme.fontSize.base,
//             color: currentTheme.colors.success,
//           }}>
//           Optional chaining result: {result}
//         </Text>
//       </Animatable.View>
//     </Pressable>
//   );
// };

// const MainApp = () => {
//   const {theme: currentTheme, toggleTheme} = useAppTheme();

//   return (
//     <SafeAreaView
//       style={{
//         flex: 1,
//         backgroundColor: currentTheme.colors.background,
//         justifyContent: 'center',
//         padding: currentTheme.spacing.md,
//       }}>
//       <VoiceControlComponent />
//       <ImagePicker />
//       {/* <MessageTester />
//       <TempPost />
//       <TestReactQuery />
//       <Section title="Step One">
//         Edit{' '}
//         <Text
//           style={{
//             fontWeight: currentTheme.fontWeight.bold,
//             color: currentTheme.colors.error,
//           }}>
//           App.tsx
//         </Text>{' '}
//         to animate this screen.
//       </Section> */}

//       <Pressable
//         onPress={toggleTheme}
//         style={{
//           marginTop: 32,
//           backgroundColor: currentTheme.colors.surface,
//           padding: 12,
//           borderRadius: currentTheme.borderRadius.md,
//         }}>
//         <Text style={{color: currentTheme.colors.primary, textAlign: 'center'}}>
//           Toggle Theme
//         </Text>
//       </Pressable>
//     </SafeAreaView>
//   );
// };

// export default MainApp;

/////////////////

//////////

// import React, { type PropsWithChildren } from 'react';
// import {
//   SafeAreaView,
//   StyleSheet,
//   Text,
//   useColorScheme,
//   View,
//   Pressable,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import { theme } from './styles/tokens/theme';

// const Section: React.FC<
//   PropsWithChildren<{
//     title: string;
//   }>
// > = ({ children, title }) => {
//   const isDarkMode = useColorScheme() === 'dark';
//   const currentTheme = isDarkMode ? theme.dark : theme.light;

//   const deepValue: { a?: { b?: { c?: number } } } = { a: { b: { c: 123 } } };
//   const result = deepValue?.a?.b?.c;

//   const handleTap = () => {
//     console.log('Section tapped!');
//   };

//   return (
//     <Pressable onPress={handleTap}>
//       <Animatable.View
//         animation="fadeInUp"
//         duration={1800}
//         style={{
//           marginTop: currentTheme.spacing.xl,
//           paddingHorizontal: currentTheme.spacing.lg,
//         }}
//       >
//         <Text
//           style={{
//             fontSize: currentTheme.fontSize['2xl'],
//             fontWeight: currentTheme.fontWeight.semiBold,
//             color: currentTheme.colors.primary,
//           }}
//         >
//           {title}
//         </Text>
//         <Text
//           style={{
//             marginTop: currentTheme.spacing.sm,
//             fontSize: currentTheme.fontSize.lg,
//             fontWeight: currentTheme.fontWeight.normal,
//             color: currentTheme.colors.secondary,
//           }}
//         >
//           {children}
//         </Text>
//         <Text
//           style={{
//             marginTop: currentTheme.spacing.md,
//             fontSize: currentTheme.fontSize.base,
//             color: currentTheme.colors.success,
//           }}
//         >
//           Optional chaining result: {result}
//         </Text>
//       </Animatable.View>
//     </Pressable>
//   );
// };

// const App: React.FC = () => {
//   const isDarkMode = useColorScheme() === 'dark';
//   const currentTheme = isDarkMode ? theme.dark : theme.light;

//   return (
//     <SafeAreaView
//       style={{
//         flex: 1,
//         backgroundColor: currentTheme.colors.background,
//         justifyContent: 'center',
//         padding: currentTheme.spacing.md,
//       }}
//     >
//       <Section title="Step One">
//         Edit{' '}
//         <Text
//           style={{
//             fontWeight: currentTheme.fontWeight.bold,
//             color: currentTheme.colors.separator,
//           }}
//         >
//           App.tsx
//         </Text>{' '}
//         to animate this screen.
//       </Section>
//     </SafeAreaView>
//   );
// };

// export default App;

////////

// import React, { type PropsWithChildren } from 'react';
// import {
//   SafeAreaView,
//   StyleSheet,
//   Text,
//   useColorScheme,
//   View,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import { theme } from './styles/tokens/theme';

// const Section: React.FC<
//   PropsWithChildren<{
//     title: string;
//   }>
// > = ({ children, title }) => {
//   const isDarkMode = useColorScheme() === 'dark';
//   const currentTheme = isDarkMode ? theme.dark : theme.light;

//   const deepValue: { a?: { b?: { c?: number } } } = { a: { b: { c: 123 } } };
//   const result = deepValue?.a?.b?.c;

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={1800}
//       style={{
//         marginTop: currentTheme.spacing.xl,
//         paddingHorizontal: currentTheme.spacing.lg,
//       }}
//     >
//   <Text
//   style={{
//     fontSize: currentTheme.fontSize['2xl'],
//     fontWeight: currentTheme.fontWeight.semiBold,
//     color: currentTheme.colors.primary,
//   }}
// >
//   {title}
// </Text>
//       <Text
//         style={{
//           marginTop: currentTheme.spacing.sm,
//           fontSize: currentTheme.fontSize.lg,
//           fontWeight: currentTheme.fontWeight.normal,
//           color: currentTheme.colors.secondary,
//         }}
//       >
//         {children}
//       </Text>
//       <Text
//         style={{
//           marginTop: currentTheme.spacing.md,
//           fontSize: currentTheme.fontSize.base,
//           color: currentTheme.colors.success,
//         }}
//       >
//         Optional chaining result: {result}
//       </Text>
//     </Animatable.View>
//   );
// };

// const App: React.FC = () => {
//   const isDarkMode = useColorScheme() === 'dark';
//   const currentTheme = isDarkMode ? theme.dark : theme.light;

//   return (
//     <SafeAreaView
//       style={{
//         flex: 1,
//         backgroundColor: currentTheme.colors.background,
//         justifyContent: 'center',
//         padding: currentTheme.spacing.md,
//       }}
//     >
//       <Section title="Step One">
//         Edit <Text style={{ fontWeight: currentTheme.fontWeight.bold, color: 'red' }}>App.tsx</Text> to animate this screen.
//       </Section>
//     </SafeAreaView>
//   );
// };

// export default App;

/////////////

// import React, { type PropsWithChildren } from 'react';
// import {
//   SafeAreaView,
//   StyleSheet,
//   Text,
//   useColorScheme,
//   View,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import { theme } from './styles/tokens/theme';

// const Section: React.FC<
//   PropsWithChildren<{
//     title: string;
//   }>
// > = ({ children, title }) => {
//   const isDarkMode = useColorScheme() === 'dark';
//   const currentTheme = isDarkMode ? theme.dark : theme.light;

//   const deepValue: { a?: { b?: { c?: number } } } = { a: { b: { c: 123 } } };
//   const result = deepValue?.a?.b?.c;

//   return (
//     <Animatable.View
//       animation="fadeInUp"
//       duration={1800}
//       style={{
//         marginTop: currentTheme.spacing.xl,
//         paddingHorizontal: currentTheme.spacing.lg,
//       }}
//     >
//   <Text
//   style={{
//     fontSize: currentTheme.fontSize['2xl'],
//     fontWeight: currentTheme.fontWeight.semiBold,
//     color: currentTheme.colors.primary,
//   }}
// >
//   {title}
// </Text>
//       <Text
//         style={{
//           marginTop: currentTheme.spacing.sm,
//           fontSize: currentTheme.fontSize.lg,
//           fontWeight: currentTheme.fontWeight.normal,
//           color: currentTheme.colors.secondary,
//         }}
//       >
//         {children}
//       </Text>
//       <Text
//         style={{
//           marginTop: currentTheme.spacing.md,
//           fontSize: currentTheme.fontSize.base,
//           color: currentTheme.colors.success,
//         }}
//       >
//         Optional chaining result: {result}
//       </Text>
//     </Animatable.View>
//   );
// };

// const App: React.FC = () => {
//   const isDarkMode = useColorScheme() === 'dark';
//   const currentTheme = isDarkMode ? theme.dark : theme.light;

//   return (
//     <SafeAreaView
//       style={{
//         flex: 1,
//         backgroundColor: currentTheme.colors.background,
//         justifyContent: 'center',
//         padding: currentTheme.spacing.md,
//       }}
//     >
//       <Section title="Step One">
//         Edit <Text style={{ fontWeight: currentTheme.fontWeight.bold, color: 'red' }}>App.tsx</Text> to animate this screen.
//       </Section>
//     </SafeAreaView>
//   );
// };

// export default App;

////////////

// import React, { type PropsWithChildren } from 'react';
// import {
//   SafeAreaView,
//   StyleSheet,
//   Text,
//   useColorScheme,
//   View,
// } from 'react-native';
// import { Colors } from 'react-native/Libraries/NewAppScreen';

// const Section: React.FC<
//   PropsWithChildren<{
//     title: string;
//   }>
// > = ({ children, title }) => {
//   const isDarkMode = useColorScheme() === 'dark';

//   // ✅ Optional chaining test (TS-safe)
//   const deepValue: { a?: { b?: { c?: number } } } = { a: { b: { c: 123 } } };
//   const result = deepValue?.a?.b?.c;

//   return (
//     <View style={styles.sectionContainer}>
//       <Text
//         style={[
//           styles.sectionTitle,
//           { color: isDarkMode ? Colors.white : Colors.black },
//         ]}>
//         {title}
//       </Text>
//       <Text
//         style={[
//           styles.sectionDescription,
//           { color: isDarkMode ? Colors.light : Colors.dark },
//         ]}>
//         {children}
//       </Text>
//       <Text style={styles.result}>Optional chaining result: {result}</Text>
//     </View>
//   );
// };

// const App: React.FC = () => {
//   const isDarkMode = useColorScheme() === 'dark';

//   const backgroundStyle = {
//     backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
//     flex: 1,
//   };
//   // console.log('✅ App component is rendering!');

//   return (
//     <SafeAreaView style={backgroundStyle}>
//       <Section title="Step One">
//         Edit <Text style={styles.highlight}>App.tsx</Text> to changasdsdfsdfe this screen.
//       </Section>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   sectionContainer: {
//     marginTop: 32,
//     paddingHorizontal: 24,
//   },
//   sectionTitle: {
//     fontSize: 24,
//     fontWeight: '600',
//   },
//   sectionDescription: {
//     marginTop: 8,
//     fontSize: 18,
//     fontWeight: '400',
//   },
//   highlight: {
//     fontWeight: '900',
//     color: 'red',
//   },
//   result: {
//     marginTop: 12,
//     fontSize: 16,
//     color: '#00aa00',
//   },
// });

// export default App;

////////////

// import React from 'react';
// import {
//   SafeAreaView,
//   useColorScheme,
//   Text,
//   StyleSheet,
// } from 'react-native';
// import { MotiView, MotiText } from 'moti';

// const App = () => {
//   const isDarkMode = useColorScheme() === 'dark';

//   return (
//     <SafeAreaView style={styles.container}>
//       <MotiView
//         from={{ opacity: 0, translateY: -50, scale: 0.9 }}
//         animate={{ opacity: 1, translateY: 0, scale: 1 }}
//         exit={{ opacity: 0, scale: 0.5 }}
//         transition={{
//           opacity: { type: 'spring', damping: 14, mass: 1 },
//           translateY: { type: 'spring', damping: 14, mass: 1 },
//           scale: { type: 'spring', damping: 14, mass: 1 },
//         }}

//         style={styles.card}
//       >
//         <MotiText
//           from={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           transition={{ delay: 200 }}
//           style={[
//             styles.title,
//             { color: isDarkMode ? '#fff' : '#000' },
//           ]}
//         >
//           Animated with Moti ✨
//         </MotiText>
//         <Text style={styles.description}>
//           This demo shows entrance animation, scaling, and fading using Framer Motion-style syntax in React Native.
//         </Text>
//       </MotiView>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#121212',
//   },
//   card: {
//     backgroundColor: '#282828',
//     borderRadius: 20,
//     padding: 24,
//     width: '90%',
//     shadowColor: '#000',
//     shadowOpacity: 0.2,
//     shadowRadius: 10,
//     elevation: 10,
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: 'bold',
//     marginBottom: 12,
//   },
//   description: {
//     fontSize: 16,
//     color: '#ccc',
//   },
// });

// export default App;

//////////

// import React, {type PropsWithChildren} from 'react';
// import {
//   SafeAreaView,
//   ScrollView,
//   StatusBar,
//   StyleSheet,
//   Text,
//   useColorScheme,
//   View,
// } from 'react-native';

// import {
//   Colors,
//   DebugInstructions,
//   Header,
//   LearnMoreLinks,
//   ReloadInstructions,
// } from 'react-native/Libraries/NewAppScreen';

// const Section: React.FC<
//   PropsWithChildren<{
//     title: string;
//   }>
// > = ({children, title}) => {
//   const isDarkMode = useColorScheme() === 'dark';
//   return (
//     <View style={styles.sectionContainer}>
//       <Text
//         style={[
//           styles.sectionTitle,
//           {
//             color: isDarkMode ? Colors.white : Colors.black,
//           },
//         ]}>
//         {title}
//       </Text>
//       <Text
//         style={[
//           styles.sectionDescription,
//           {
//             color: isDarkMode ? Colors.light : Colors.dark,
//           },
//         ]}>
//         {children}
//       </Text>
//     </View>
//   );
// };

// const App = () => {
//   const isDarkMode = useColorScheme() === 'dark';

//   const backgroundStyle = {
//     backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
//   };

//   return (
//     <SafeAreaView style={backgroundStyle}>
//         <Section title="Step One">
//             Eddsfgdfgit <Text style={styles.highlight}>App.tsx</Text> to change this
//      sssssssssss
//            </Section>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   sectionContainer: {
//     marginTop: 32,
//     paddingHorizontal: 24,
//   },
//   sectionTitle: {
//     fontSize: 24,
//     fontWeight: '600',
//   },
//   sectionDescription: {
//     marginTop: 8,
//     fontSize: 18,
//     fontWeight: '400',
//   },
//   highlight: {
//     fontWeight: '900',
//     color: 'red'
//   },
// });

// export default App;

/////////////

// /**
//  * Sample React Native App
//  * https://github.com/facebook/react-native
//  *
//  * Generated with the TypeScript template
//  * https://github.com/react-native-community/react-native-template-typescript
//  *
//  * @format
//  */

// import React, {type PropsWithChildren} from 'react';
// import {
//   SafeAreaView,
//   ScrollView,
//   StatusBar,
//   StyleSheet,
//   Text,
//   useColorScheme,
//   View,
// } from 'react-native';

// import {
//   Colors,
//   DebugInstructions,
//   Header,
//   LearnMoreLinks,
//   ReloadInstructions,
// } from 'react-native/Libraries/NewAppScreen';

// const Section: React.FC<
//   PropsWithChildren<{
//     title: string;
//   }>
// > = ({children, title}) => {
//   const isDarkMode = useColorScheme() === 'dark';
//   return (
//     <View style={styles.sectionContainer}>
//       <Text
//         style={[
//           styles.sectionTitle,
//           {
//             color: isDarkMode ? Colors.white : Colors.black,
//           },
//         ]}>
//         {title}
//       </Text>
//       <Text
//         style={[
//           styles.sectionDescription,
//           {
//             color: isDarkMode ? Colors.light : Colors.dark,
//           },
//         ]}>
//         {children}
//       </Text>
//     </View>
//   );
// };

// const App = () => {
//   const isDarkMode = useColorScheme() === 'dark';

//   const backgroundStyle = {
//     backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
//   };

//   return (
//     <SafeAreaView style={backgroundStyle}>
//       <StatusBar
//         barStyle={isDarkMode ? 'light-content' : 'dark-content'}
//         backgroundColor={backgroundStyle.backgroundColor}
//       />
//       <ScrollView
//         contentInsetAdjustmentBehavior="automatic"
//         style={backgroundStyle}>
//         <Header />
//         <View
//           style={{
//             backgroundColor: isDarkMode ? Colors.black : Colors.white,
//           }}>
//           <Section title="Step One">
//             Edit <Text style={styles.highlight}>App.tsx</Text> to change this
//             screen and then come back to see your edits.
//           </Section>
//           <Section title="See Your Changes">
//             <ReloadInstructions />
//           </Section>
//           <Section title="Debug">
//             <DebugInstructions />
//           </Section>
//           <Section title="Learn More">
//             Read the docs to discover what to do next:
//           </Section>
//           <LearnMoreLinks />
//         </View>
//       </ScrollView>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   sectionContainer: {
//     marginTop: 32,
//     paddingHorizontal: 24,
//   },
//   sectionTitle: {
//     fontSize: 24,
//     fontWeight: '600',
//   },
//   sectionDescription: {
//     marginTop: 8,
//     fontSize: 18,
//     fontWeight: '400',
//   },
//   highlight: {
//     fontWeight: '700',
//   },
// });

// export default App;
