import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Platform,
  AppState,
  PermissionsAndroid,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Geolocation from 'react-native-geolocation-service';
import {ensureLocationPermission} from '../utils/permissions';
import {fetchWeather} from '../utils/travelWeather';
import VoiceControlComponent from '../components/VoiceControlComponent/VoiceControlComponent';
import PushNotification from 'react-native-push-notification'; // Android
import PushNotificationIOS from '@react-native-community/push-notification-ios'; // iOS
import {notifyOutfitForTomorrow} from '../utils/notifyOutfitForTomorrow';
import {useAppTheme} from '../context/ThemeContext';

type ScheduledNotification = {
  channelId: string;
  message: string;
  date: Date;
  allowWhileIdle?: boolean;
};

export const scheduleNotification = (options: ScheduledNotification) => {
  (PushNotification as any).localNotificationSchedule(options);
};

type Props = {
  navigate: (screen: string, params?: any) => void;
  wardrobe: any[];
};

const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
  const {theme} = useAppTheme();

  // Call this in your component
  const sendTestNotification = () => {
    const fireDate = new Date(Date.now() + 5000); // 5s delay
    console.log('⏰ Scheduling test notification...');

    if (Platform.OS === 'ios') {
      if (AppState.currentState === 'active') {
        console.log('🔔 Showing iOS foreground notif...');
        PushNotificationIOS.presentLocalNotification({
          alertTitle: '📱 Foreground Notification',
          alertBody: 'This is shown while the app is open.',
          soundName: 'default',
        });
      } else {
        console.log('🔔 Scheduling iOS background notif...');
        PushNotificationIOS.addNotificationRequest({
          id: 'test-id',
          title: '📱 Foreground Test',
          body: 'This is a test notification while app is open.',
          fireDate: new Date(Date.now() + 1000),
          sound: 'default',
          isSilent: false,
        });
      }
    } else {
      console.log('🔔 Scheduling Android notif...');
      PushNotification.localNotificationSchedule({
        channelId: 'style-channel',
        title: '📱 Android Notification',
        message: 'This is a test notification on Android.',
        date: fireDate,
        allowWhileIdle: true,
        playSound: true,
        soundName: 'default',
      });
    }
  };

  useEffect(() => {
    PushNotification.configure({
      onNotification: (notification: any) => {
        console.log('🔔 Notification received:', notification);

        if (
          Platform.OS === 'ios' &&
          typeof notification.finish === 'function'
        ) {
          notification.finish(PushNotificationIOS.FetchResult.NoData);
        }
      },
      requestPermissions: Platform.OS === 'ios',
    });

    if (Platform.OS === 'ios') {
      PushNotificationIOS.requestPermissions().then(status => {
        console.log('🔐 iOS permission status:', status);
      });
    }

    PushNotification.createChannel(
      {
        channelId: 'style-channel',
        channelName: 'Style Reminders',
      },
      created => console.log(`🛠 Channel created: ${created}`),
    );
  }, []);

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      paddingVertical: 0,
      paddingHorizontal: 20,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    greeting: {
      fontSize: 24,
      fontWeight: '600',
      color: theme.colors.foreground,
    },
    iconRow: {
      flexDirection: 'row',
      gap: 10,
    },
    iconCircle: {
      backgroundColor: theme.colors.surface,
      padding: 8,
      marginLeft: 10,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressBox: {
      backgroundColor: theme.colors.surface,
      padding: 16,
      borderRadius: 16,
      marginVertical: 24,
    },
    progressContent: {},
    progressText: {
      fontSize: 16,
      marginBottom: 8,
      color: theme.colors.foreground,
    },
    progressButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignSelf: 'flex-start',
    },
    progressButtonText: {
      color: theme.colors.surface,
    },
    progressFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      gap: 12,
    },
    progressCount: {
      color: theme.colors.surface,
    },
    progressBar: {
      flex: 1,
      height: 4,
      backgroundColor: theme.colors.muted,
      borderRadius: 8,
      overflow: 'hidden',
    },
    progressFill: {
      width: '3.3%',
      height: 4,
      backgroundColor: theme.colors.primary,
    },
    section: {
      marginBottom: 24,
    },
    sectionWeather: {
      marginTop: 6,
      marginBottom: 24,
      backgroundColor: 'grey',
      borderRadius: 15,
      padding: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '500',
      marginBottom: 12,
      color: theme.colors.foreground,
    },
    askBox: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      alignItems: 'center',
      marginBottom: 16,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.foreground,
    },
    sendButton: {
      backgroundColor: theme.colors.surface,
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendArrow: {
      color: '#fff',
      fontSize: 16,
    },
    rowButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    actionCardBlue: {
      backgroundColor: 'blue',
      flex: 1,
      padding: 16,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    actionCardGray: {
      backgroundColor: theme.colors.surface,
      flex: 1,
      padding: 16,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.foreground,
    },
    rowItems: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    itemCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    plus: {
      fontSize: 28,
      color: theme.colors.surface,
    },
    itemImage: {
      width: 64,
      height: 80,
      borderRadius: 12,
    },
    bottomNav: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingVertical: 12,
      borderTopColor: theme.colors.surface,
      borderTopWidth: 1,
      backgroundColor: theme.colors.background,
    },
    navItem: {
      alignItems: 'center',
      flex: 1,
    },
    navText: {
      fontSize: 12,
      color: theme.colors.foreground,
      marginTop: 4,
    },
    navTextDisabled: {
      fontSize: 12,
      color: theme.colors.foreground,
      marginTop: 4,
    },
    navCenter: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: -20,
    },
  });

  const [weather, setWeather] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const hasPermission = await ensureLocationPermission();
      if (!hasPermission) return;

      Geolocation.getCurrentPosition(
        async pos => {
          try {
            const data = await fetchWeather(
              pos.coords.latitude,
              pos.coords.longitude,
            );
            setWeather(data);
          } catch (err) {
            console.warn('❌ Weather fetch failed:', err);
          }
        },
        err => {
          console.warn('❌ Location error:', err);
        },
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 1000},
      );
    };

    fetchData();
  }, []);

  const handlePromptResult = (prompt: string) => {
    console.log('HomeScreen received prompt:', prompt); // LOG HERE
    navigate('Outfit', {wardrobe, prompt});
  };

  useEffect(() => {
    notifyOutfitForTomorrow();
  }, []);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{paddingBottom: 90}}>
        <View style={styles.progressBox}>
          <View style={styles.progressContent}>
            <Text style={styles.progressText}>
              Add 30 items and get outfits for tomorrow!
            </Text>
            <TouchableOpacity style={styles.progressButton}>
              <Text style={styles.progressButtonText}>Add items</Text>
            </TouchableOpacity>
            <View style={styles.progressFooter}>
              <Text style={styles.progressCount}>1/30</Text>
              <View style={styles.progressBar}>
                <View style={styles.progressFill} />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Stylist</Text>
          <View style={styles.askBox}>
            <TextInput
              placeholder="Ask anything about fashion!"
              style={styles.input}
              placeholderTextColor={theme.colors.foreground}
            />
            <TouchableOpacity style={styles.sendButton}>
              <Text style={styles.sendArrow}>➔</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rowButtons}>
            <VoiceControlComponent onPromptResult={handlePromptResult} />
            <TouchableOpacity style={styles.actionCardGray}>
              <Text style={styles.cardText}>History</Text>
              <MaterialIcons
                name="access-time"
                size={26}
                color={theme.colors.surface}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently Added Items</Text>
          <View style={styles.rowItems}>
            <TouchableOpacity
              style={styles.itemCircle}
              onPress={() => navigate('AddItem')}>
              <Text style={styles.plus}>+</Text>
            </TouchableOpacity>

            {wardrobe.slice(0, 3).map(item => (
              <TouchableOpacity
                key={item.id}
                onPress={() => navigate('ItemDetail', {item})}>
                <Image source={{uri: item.image}} style={styles.itemImage} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today’s Suggestion</Text>
          <View style={styles.sectionWeather}>
            {weather && (
              <View style={{marginTop: 8}}>
                <Text style={{color: theme.colors.foreground}}>
                  {weather.celsius.name}
                </Text>
                <Text style={{color: theme.colors.secondary}}>
                  🌡️ {weather.fahrenheit.main.temp}°F —{' '}
                  {weather.celsius.weather[0].description}
                </Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={{
            marginTop: 20,
            backgroundColor: theme.colors.primary,
            padding: 12,
            borderRadius: 8,
            alignItems: 'center',
          }}
          onPress={() => {
            const fireDate = new Date(Date.now() + 5000);
            console.log('⏰ Scheduling test notification...');

            // if (Platform.OS === 'ios') {
            //   console.log('🔔 Scheduling iOS background notif...');
            //   const triggerDate = new Date(Date.now() + 5000); // 5s later
            //   PushNotificationIOS.addNotificationRequest({
            //     id: 'test-id',
            //     title: '📱 Test Notification',
            //     body: 'This is a background notification in 5 seconds.',
            //     fireDate: triggerDate,
            //     sound: 'default',
            //   });
            if (Platform.OS === 'ios') {
              console.log('🔔 Showing iOS foreground notif...');
              PushNotificationIOS.presentLocalNotification({
                alertTitle: '📱 Foreground Notification',
                alertBody: 'This notification should show while app is open.',
                soundName: 'default',
              });
            } else {
              // Android logic...
            }
          }}>
          <Text style={{color: theme.colors.surface}}>Test Notification</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default HomeScreen;

///////////////

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

//             if (Platform.OS === 'ios') {
//               console.log('🔔 Scheduling iOS background notif...');

//               const triggerDate = new Date(Date.now() + 5000); // 5s later

//               PushNotificationIOS.addNotificationRequest({
//                 id: 'test-id',
//                 title: '📱 Test Notification',
//                 body: 'This is a background notification in 5 seconds.',
//                 fireDate: triggerDate,
//                 sound: 'default',
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

//////////////

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
//   PermissionsAndroid,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import Geolocation from 'react-native-geolocation-service';
// import {ensureLocationPermission} from '../utils/permissions';
// import {fetchWeather} from '../utils/travelWeather';
// import VoiceControlComponent from '../components/VoiceControlComponent/VoiceControlComponent';
// import PushNotification from 'react-native-push-notification';
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

//   useEffect(() => {
//     PushNotification.configure({
//       onNotification: notification => {
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
//                 color={theme.colors.icon}
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
//             console.log('⏰ Scheduling test notification...');
//             (PushNotification as any).localNotificationSchedule({
//               channelId: 'style-channel',
//               title: 'Test Notification',
//               message: 'This is a test notification.',
//               date: new Date(Date.now() + 5000),
//               allowWhileIdle: true,
//             });
//           }}>
//           <Text style={{color: theme.colors.surface}}>Test Notification</Text>
//         </TouchableOpacity>
//       </ScrollView>
//     </View>
//   );
// };

// export default HomeScreen;

///////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   TextInput,
//   ScrollView,
//   Image,
// } from 'react-native';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import Geolocation from 'react-native-geolocation-service';
// import {ensureLocationPermission} from '../utils/permissions';
// import {fetchWeather} from '../utils/travelWeather';
// import VoiceControlComponent from '../components/VoiceControlComponent/VoiceControlComponent';
// import {useAppTheme} from '../context/ThemeContext';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: any[];
// };

// const HomeScreen: React.FC<Props> = ({navigate, wardrobe}) => {
//   const {theme} = useAppTheme();

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
//       color: theme.colors.subtleText,
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
//                 color={theme.colors.icon}
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
//       </ScrollView>
//     </View>
//   );
// };

// export default HomeScreen;
