import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  Text,
  Pressable,
  View,
  ScrollView,
  Alert,
  Button,
  Platform,
  StyleSheet,
} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import * as Animatable from 'react-native-animatable';
import Geolocation from 'react-native-geolocation-service';
import Contacts from 'react-native-contacts';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAppTheme} from './context/ThemeContext';
import {ensureLocationPermission} from './utils/permissions';
import {OPENWEATHER_API_KEY} from '@env';
import {fetchWeather} from './utils/travelWeather';
import MapScreen from './components/MapScreen/MapScreen';
import VoiceControlComponent from './components/VoiceControlComponent/VoiceControlComponent';
import ImagePickerGrid from './components/ImagePickerGrid/ImagePickerGrid';
import AddReminderButton from './components/AddReminderButon/AddReminderButton';
import {theme} from './styles/tokens/theme';
import ResponsiveContainer from './components/ResponsiveContainer';
import './lib/firebaseConfig';

type NotificationPayload = {
  title?: string;
  message?: string;
  userInfo?: any;
  data?: any;
  [key: string]: any;
};

const MainApp = () => {
  const {theme: currentTheme, toggleTheme} = useAppTheme();
  const [weather, setWeather] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);

  useEffect(() => {
    PushNotification.configure({
      onNotification: (notification: NotificationPayload) => {
        console.log('🔔 Local Notification:', notification);
      },
      requestPermissions: Platform.OS === 'ios',
    });

    PushNotification.createChannel(
      {
        channelId: 'style-channel',
        channelName: 'Style Reminders',
      },
      created => console.log(`🛠 Notification channel created: ${created}`),
    );
  }, []);

  useEffect(() => {
    const setupPush = async () => {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      if (enabled) {
        const token = await messaging().getToken();
        console.log('📱 FCM Token:', token);
      }
    };
    setupPush();
  }, []);

  useEffect(() => {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      Alert.alert(
        remoteMessage.notification?.title || 'Notification',
        remoteMessage.notification?.body || 'You have a new message.',
      );
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const fetchLocationAndWeather = async () => {
      const hasPermission = await ensureLocationPermission();
      if (!hasPermission) return setError('Location permission denied');

      Geolocation.getCurrentPosition(
        async pos => {
          try {
            const data = await fetchWeather(
              pos.coords.latitude,
              pos.coords.longitude,
            );
            setWeather(data);
          } catch {
            setError('Failed to fetch weather');
          }
        },
        err => setError('Failed to get location'),
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 1000,
        },
      );
    };
    fetchLocationAndWeather();
  }, []);

  const loadContacts = async () => {
    try {
      const permission = await Contacts.requestPermission();
      if (permission === 'authorized') {
        const allContacts = await Contacts.getAll();
        setContacts(allContacts);
      } else {
        console.warn('❌ Contacts permission denied');
      }
    } catch (err) {
      console.warn('❌ Failed to load contacts:', err);
    }
  };

  const saveReminder = async () => {
    try {
      await AsyncStorage.setItem('lastReminder', 'brown-suede-loafers');
      console.log('✅ Saved reminder');
    } catch (err) {
      console.warn('❌ Save error', err);
    }
  };

  const loadReminder = async () => {
    try {
      const reminder = await AsyncStorage.getItem('lastReminder');
      console.log('📦 Loaded reminder:', reminder);
    } catch (err) {
      console.warn('❌ Load error', err);
    }
  };

  return (
    <SafeAreaView
      style={{flex: 1, backgroundColor: currentTheme.colors.background}}>
      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={{flexGrow: 1}}
        showsVerticalScrollIndicator={false}>
        <ResponsiveContainer>
          <VoiceControlComponent />

          <View style={styles.imagePickerContainer}>
            <ImagePickerGrid />
          </View>

          {weather ? (
            <View style={styles.weatherBlock}>
              <Text
                style={[
                  styles.weatherLocation,
                  {color: currentTheme.colors.primary},
                ]}>
                📍 {weather.celsius.name}
              </Text>
              <Text
                style={[
                  styles.weatherDescription,
                  {color: currentTheme.colors.secondary},
                ]}>
                🌡️ {weather.fahrenheit.main.temp}°F —{' '}
                {weather.celsius.weather[0].description}
              </Text>
            </View>
          ) : error ? (
            <Text style={{color: currentTheme.colors.error}}>{error}</Text>
          ) : (
            <Text style={{color: currentTheme.colors.primary}}>
              Loading weather...
            </Text>
          )}

          <View style={styles.mapContainer}>
            <MapScreen />
          </View>

          <Pressable onPress={toggleTheme} style={styles.toggleButton}>
            <Text style={styles.toggleButtonText}>Toggle Theme</Text>
          </Pressable>

          <View style={styles.reminderButtonWrapper}>
            <AddReminderButton />
          </View>
        </ResponsiveContainer>
      </ScrollView>

      <Button title="Save Reminder" onPress={saveReminder} />
      <Button title="Load Reminder" onPress={loadReminder} />
      <Button title="Load Contacts" onPress={loadContacts} />

      {contacts.length > 0 && (
        <View style={styles.contactList}>
          <Text
            style={[styles.contactTitle, {color: currentTheme.colors.primary}]}>
            Sample Contacts:
          </Text>
          {contacts.slice(0, 5).map(contact => (
            <Text
              key={contact.recordID}
              style={[
                styles.contactItem,
                {color: currentTheme.colors.secondary},
              ]}>
              • {contact.givenName} {contact.familyName}
            </Text>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  imagePickerContainer: {
    height: 300,
  },
  weatherBlock: {
    marginTop: theme.light.spacing.lg,
  },
  weatherLocation: {
    fontSize: theme.light.fontSize.lg,
  },
  weatherDescription: {
    fontSize: theme.light.fontSize.md,
  },
  mapContainer: {
    height: 300,
    marginTop: theme.light.spacing.lg,
  },
  toggleButton: {
    marginTop: theme.light.spacing.xl,
    backgroundColor: theme.light.colors.surface,
    padding: theme.light.spacing.md,
    borderRadius: theme.light.borderRadius.md,
  },
  toggleButtonText: {
    color: theme.light.colors.primary,
    textAlign: 'center',
  },
  reminderButtonWrapper: {
    marginTop: theme.light.spacing.xxl,
    backgroundColor: theme.light.colors.primary,
    padding: theme.light.spacing.md,
    borderRadius: theme.light.borderRadius.md,
  },
  contactList: {
    marginTop: theme.light.spacing.xl,
  },
  contactTitle: {
    fontSize: theme.light.fontSize.md,
  },
  contactItem: {
    fontSize: theme.light.fontSize.sm,
  },
});

export default MainApp;

///////////

// import React, {useEffect, useState} from 'react';
// import {
//   SafeAreaView,
//   Text,
//   Pressable,
//   View,
//   ScrollView,
//   Alert,
//   Button,
//   Platform,
// } from 'react-native';
// import messaging from '@react-native-firebase/messaging';
// import * as Animatable from 'react-native-animatable';
// import Geolocation from 'react-native-geolocation-service';
// import Contacts from 'react-native-contacts';
// import PushNotification from 'react-native-push-notification';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useAppTheme} from './context/ThemeContext';
// import {ensureLocationPermission} from './utils/permissions';
// import {OPENWEATHER_API_KEY} from '@env';
// import {fetchWeather} from './utils/travelWeather';
// import MapScreen from './components/MapScreen/MapScreen';
// import VoiceControlComponent from './components/VoiceControlComponent/VoiceControlComponent';
// import ImagePickerGrid from './components/ImagePickerGrid/ImagePickerGrid';
// import AddReminderButton from './components/AddReminderButon/AddReminderButton';
// import './lib/firebaseConfig';

// type NotificationPayload = {
//   title?: string;
//   message?: string;
//   userInfo?: any;
//   data?: any;
//   [key: string]: any;
// };

// const Section: React.FC<{title: string; children: React.ReactNode}> = ({
//   title,
//   children,
// }) => {
//   const {theme: currentTheme} = useAppTheme();
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
//       </Animatable.View>
//     </Pressable>
//   );
// };

// const MainApp = () => {
//   const {theme: currentTheme, toggleTheme} = useAppTheme();
//   const [weather, setWeather] = useState<any>(null);
//   const [error, setError] = useState<string | null>(null);
//   const [contacts, setContacts] = useState<any[]>([]);

//   useEffect(() => {
//     PushNotification.configure({
//       onNotification: (notification: NotificationPayload) => {
//         console.log('🔔 Local Notification:', notification);
//       },
//       requestPermissions: Platform.OS === 'ios',
//     });

//     PushNotification.createChannel(
//       {
//         channelId: 'style-channel',
//         channelName: 'Style Reminders',
//       },
//       created => console.log(`🛠 Notification channel created: ${created}`),
//     );
//   }, []);

//   useEffect(() => {
//     const setupPush = async () => {
//       const authStatus = await messaging().requestPermission();
//       const enabled =
//         authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
//         authStatus === messaging.AuthorizationStatus.PROVISIONAL;
//       if (enabled) {
//         const token = await messaging().getToken();
//         console.log('📱 FCM Token:', token);
//       }
//     };
//     setupPush();
//   }, []);

//   useEffect(() => {
//     const unsubscribe = messaging().onMessage(async remoteMessage => {
//       Alert.alert(
//         remoteMessage.notification?.title || 'Notification',
//         remoteMessage.notification?.body || 'You have a new message.',
//       );
//     });
//     return unsubscribe;
//   }, []);

//   useEffect(() => {
//     const fetchLocationAndWeather = async () => {
//       const hasPermission = await ensureLocationPermission();
//       if (!hasPermission) return setError('Location permission denied');

//       Geolocation.getCurrentPosition(
//         async pos => {
//           try {
//             const data = await fetchWeather(
//               pos.coords.latitude,
//               pos.coords.longitude,
//             );
//             setWeather(data);
//           } catch {
//             setError('Failed to fetch weather');
//           }
//         },
//         err => setError('Failed to get location'),
//         {
//           enableHighAccuracy: true,
//           timeout: 15000,
//           maximumAge: 1000,
//         },
//       );
//     };
//     fetchLocationAndWeather();
//   }, []);

//   const loadContacts = async () => {
//     try {
//       const permission = await Contacts.requestPermission();
//       if (permission === 'authorized') {
//         const allContacts = await Contacts.getAll();
//         setContacts(allContacts);
//       } else {
//         console.warn('❌ Contacts permission denied');
//       }
//     } catch (err) {
//       console.warn('❌ Failed to load contacts:', err);
//     }
//   };

//   const saveReminder = async () => {
//     try {
//       await AsyncStorage.setItem('lastReminder', 'brown-suede-loafers');
//       console.log('✅ Saved reminder');
//     } catch (err) {
//       console.warn('❌ Save error', err);
//     }
//   };

//   const loadReminder = async () => {
//     try {
//       const reminder = await AsyncStorage.getItem('lastReminder');
//       console.log('📦 Loaded reminder:', reminder);
//     } catch (err) {
//       console.warn('❌ Load error', err);
//     }
//   };

//   return (
//     <SafeAreaView
//       style={{flex: 1, backgroundColor: currentTheme.colors.background}}>
//       <ScrollView
//         contentContainerStyle={{
//           padding: currentTheme.spacing.md,
//           paddingBottom: 80,
//         }}
//         showsVerticalScrollIndicator={false}>
//         <VoiceControlComponent />

//         <View style={{height: 300}}>
//           <ImagePickerGrid />
//         </View>

//         {weather ? (
//           <View style={{marginTop: 20}}>
//             <Text style={{color: currentTheme.colors.primary, fontSize: 18}}>
//               📍 {weather.celsius.name}
//             </Text>
//             <Text style={{color: currentTheme.colors.secondary, fontSize: 16}}>
//               🌡️ {weather.fahrenheit.main.temp}°F —{' '}
//               {weather.celsius.weather[0].description}
//             </Text>
//           </View>
//         ) : error ? (
//           <Text style={{color: currentTheme.colors.error}}>{error}</Text>
//         ) : (
//           <Text style={{color: currentTheme.colors.primary}}>
//             Loading weather...
//           </Text>
//         )}

//         <View style={{height: 300, marginTop: 20}}>
//           <MapScreen />
//         </View>

//         <Pressable
//           onPress={toggleTheme}
//           style={{
//             marginTop: 32,
//             backgroundColor: currentTheme.colors.surface,
//             padding: 12,
//             borderRadius: currentTheme.borderRadius.md,
//           }}>
//           <Text
//             style={{color: currentTheme.colors.primary, textAlign: 'center'}}>
//             Toggle Theme
//           </Text>
//         </Pressable>

//         <View
//           style={{
//             marginTop: 40,
//             backgroundColor: 'black',
//             padding: 12,
//             borderRadius: currentTheme.borderRadius.md,
//           }}>
//           <AddReminderButton />
//         </View>
//       </ScrollView>

//       <Button title="Save Reminder" onPress={saveReminder} />
//       <Button title="Load Reminder" onPress={loadReminder} />
//       <Button title="Load Contacts" onPress={loadContacts} />

//       {contacts.length > 0 && (
//         <View style={{marginTop: 20}}>
//           <Text style={{color: currentTheme.colors.primary, fontSize: 16}}>
//             Sample Contacts:
//           </Text>
//           {contacts.slice(0, 5).map(contact => (
//             <Text
//               key={contact.recordID}
//               style={{color: currentTheme.colors.secondary}}>
//               • {contact.givenName} {contact.familyName}
//             </Text>
//           ))}
//         </View>
//       )}
//     </SafeAreaView>
//   );
// };

// export default MainApp;

/////////////

// import React, {useEffect, useState} from 'react';
// import messaging from '@react-native-firebase/messaging';
// import {Alert} from 'react-native';
// import {SafeAreaView, Text, Pressable, View, ScrollView} from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import {useAppTheme} from './context/ThemeContext';
// import Geolocation from 'react-native-geolocation-service';
// import {ensureLocationPermission} from './utils/permissions';
// import {OPENWEATHER_API_KEY} from '@env';
// import {fetchWeather} from './utils/travelWeather';
// import MapScreen from './components/MapScreen/MapScreen';
// import MessageTester from './components/MessageTester';
// import TempPost from './components/TempPost';
// import TestReactQuery from './components/TestReactQuery';
// import VoiceControlComponent from './components/VoiceControlComponent/VoiceControlComponent';
// import ImagePickerGrid from './components/ImagePickerGrid/ImagePickerGrid';
// import AddReminderButton from './components/AddReminderButon/AddReminderButton';
// import Contacts from 'react-native-contacts';
// import {Button} from 'react-native';
// import './lib/firebaseConfig';

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
//   const [error, setError] = useState<string | null>(null);
//   const [contacts, setContacts] = useState<any[]>([]);

//   // console.log('🧪 OPENWEATHER_API_KEY from @env:', OPENWEATHER_API_KEY);

//   const loadContacts = async () => {
//     try {
//       const permission = await Contacts.requestPermission();

//       if (permission === 'authorized') {
//         const allContacts = await Contacts.getAll();
//         setContacts(allContacts);
//         console.log('📇 Contacts:', allContacts.slice(0, 5)); // Show first 5
//       } else {
//         console.warn('❌ Contacts permission denied');
//       }
//     } catch (err) {
//       console.warn('❌ Failed to load contacts:', err);
//     }
//   };

//   useEffect(() => {
//     const setupPush = async () => {
//       const authStatus = await messaging().requestPermission();
//       const enabled =
//         authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
//         authStatus === messaging.AuthorizationStatus.PROVISIONAL;

//       if (enabled) {
//         console.log('✅ Push permission granted:', authStatus);
//         const token = await messaging().getToken();
//         console.log('📱 FCM Token:', token);
//       } else {
//         console.warn('❌ Push permission denied');
//       }
//     };

//     setupPush();
//   }, []);

//   useEffect(() => {
//     const unsubscribe = messaging().onMessage(async remoteMessage => {
//       console.log('📨 Foreground push:', remoteMessage);
//       Alert.alert(
//         remoteMessage.notification?.title || 'Notification',
//         remoteMessage.notification?.body || 'You have a new message.',
//       );
//     });

//     return unsubscribe;
//   }, []);

//   useEffect(() => {
//     const loadWeather = async () => {
//       const hasPermission = await ensureLocationPermission();
//       if (!hasPermission) {
//         setError('Location permission denied');
//         return;
//       }

//       Geolocation.getCurrentPosition(
//         async pos => {
//           const {latitude, longitude} = pos.coords;
//           // console.log('📍 User location:', pos.coords);

//           try {
//             const data = await fetchWeather(latitude, longitude);
//             // console.log('✅ Weather data returned:', data);
//             setWeather(data);
//           } catch (err) {
//             // console.error('❌ Weather fetch error:', err);
//             setError('Failed to fetch weather');
//           }
//         },
//         err => {
//           // console.warn('❌ Location error:', err);
//           setError('Failed to get location');
//         },
//         {
//           enableHighAccuracy: true,
//           timeout: 15000,
//           maximumAge: 1000,
//         },
//       );
//     };

//     loadWeather();
//   }, []);

//   useEffect(() => {
//     const fetchLocation = async () => {
//       const hasPermission = await ensureLocationPermission();
//       if (!hasPermission) return;

//       Geolocation.getCurrentPosition(
//         pos => {
//           // console.log('📍 User location:', pos.coords);
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

//   return (
//     <SafeAreaView
//       style={{
//         flex: 1,
//         backgroundColor: currentTheme.colors.background,
//       }}>
//       <ScrollView
//         contentContainerStyle={{
//           padding: currentTheme.spacing.md,
//           paddingBottom: 80,
//         }}
//         showsVerticalScrollIndicator={false}>
//         <VoiceControlComponent />

//         <View style={{height: 300}}>
//           <ImagePickerGrid />
//         </View>

//         {weather ? (
//           <View style={{marginTop: 20}}>
//             <Text style={{color: currentTheme.colors.primary, fontSize: 18}}>
//               📍 {weather.celsius.name}
//             </Text>
//             <Text style={{color: currentTheme.colors.secondary, fontSize: 16}}>
//               {/* 🌡️ {weather.celsius.main.temp}°C / {weather.fahrenheit.main.temp} */}
//               🌡️ {weather.fahrenheit.main.temp}
//               °F — {weather.celsius.weather[0].description}
//             </Text>
//           </View>
//         ) : error ? (
//           <Text style={{color: currentTheme.colors.error}}>{error}</Text>
//         ) : (
//           <Text style={{color: currentTheme.colors.primary}}>
//             Loading weather...
//           </Text>
//         )}

//         <View style={{height: 300, marginTop: 20}}>
//           <MapScreen />
//         </View>

//         <Pressable
//           onPress={toggleTheme}
//           style={{
//             marginTop: 32,
//             backgroundColor: currentTheme.colors.surface,
//             padding: 12,
//             borderRadius: currentTheme.borderRadius.md,
//           }}>
//           <Text
//             style={{color: currentTheme.colors.primary, textAlign: 'center'}}>
//             Toggle Theme
//           </Text>
//         </Pressable>
//         <View
//           style={{
//             marginTop: 40,
//             backgroundColor: 'black',
//             padding: 12,
//             borderRadius: currentTheme.borderRadius.md,
//           }}>
//           <AddReminderButton />
//         </View>
//       </ScrollView>
//       <Button title="Load Contacts" onPress={loadContacts} />
//       {contacts.length > 0 && (
//         <View style={{marginTop: 20}}>
//           <Text style={{color: currentTheme.colors.primary, fontSize: 16}}>
//             Sample Contacts:
//           </Text>
//           {contacts.slice(0, 5).map(contact => (
//             <Text
//               key={contact.recordID}
//               style={{color: currentTheme.colors.secondary}}>
//               • {contact.givenName} {contact.familyName}
//             </Text>
//           ))}
//         </View>
//       )}
//     </SafeAreaView>
//   );
// };

// export default MainApp;

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
