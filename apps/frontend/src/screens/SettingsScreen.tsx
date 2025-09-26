// apps/mobile/src/screens/SettingsScreen.tsx
import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Switch,
  useColorScheme,
  Alert,
  Linking,
  Animated,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import type {ThemeType} from '../context/ThemeContext';
import {notifyOutfitForTomorrow} from '../utils/notifyOutfitForTomorrow';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotification from 'react-native-push-notification';
import DeviceInfo from 'react-native-device-info';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import {useHomePrefs} from '../hooks/useHomePrefs';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

type Props = {
  navigate: (screen: string, params?: any) => void;
};

const skinOptions: {
  key: ThemeType | 'system';
  label: string;
  color: string;
}[] = [
  {key: 'fashion1', label: 'Fashion 1', color: '#f5f5f5'},
  {key: 'modernDark', label: 'Modern Dark', color: '#00050e'},
  {key: 'modernDark2', label: 'Modern Dark 2', color: '#121212'},
  {key: 'modernLight', label: 'Modern Light', color: '#f5f5f5'},
  {key: 'retro', label: 'Retro', color: '#FDEDDC'},
  {key: 'minimal', label: 'Minimal', color: '#FFFFFF'},
  {key: 'vibrant', label: 'Vibrant', color: '#1B0032'},
  {key: 'nord', label: 'Nord', color: '#2E3440'},
  {key: 'dracula', label: 'Dracula', color: '#282A36'},
  {key: 'oneDark', label: 'One Dark', color: '#282C34'},
  {key: 'solarizedLight', label: 'Solarized Light', color: '#FDF6E3'},
  {key: 'solarizedDark', label: 'Solarized Dark', color: '#002B36'},
  {key: 'pastelPop', label: 'Pastel Pop', color: '#FFE5EC'},
  {key: 'cyberpunk', label: 'Cyberpunk', color: '#0D0221'},
  {key: 'monokai', label: 'Monokai', color: '#272822'},
];

export default function SettingsScreen({navigate}: Props) {
  const {theme, mode, setSkin} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const systemScheme = useColorScheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [appVersion, setAppVersion] = useState('');
  const colors = theme.colors;

  const {prefs, setVisible} = useHomePrefs();

  // ✨ Fade-in animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  const h = (type: string) =>
    ReactNativeHapticFeedback.trigger(type, {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    enableRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      backgroundColor: theme.colors.surface,
      borderRadius: tokens.borderRadius.md,
      paddingHorizontal: 22,
      paddingVertical: 14,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      padding: 24,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
      borderRadius: 12,
      padding: 16,
      width: '100%',
      maxWidth: 720,
      alignSelf: 'center',
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: 8,
      marginBottom: 6,
    },
    colorSwatch: {
      width: 16,
      height: 16,
      borderRadius: 4,
      marginRight: 10,
      borderWidth: tokens.borderWidth.md,
      borderColor: '#ccc',
    },
    version: {
      textAlign: 'center',
      fontSize: 14,
      opacity: 0.6,
    },
  });

  useEffect(() => {
    const version = DeviceInfo.getVersion();
    setAppVersion(version);
  }, []);

  const currentLabel =
    skinOptions.find(s => s.key === mode)?.label || 'Unknown';

  useEffect(() => {
    const fetchNotificationSetting = async () => {
      const value = await AsyncStorage.getItem('notificationsEnabled');
      if (value !== null) {
        setNotificationsEnabled(value === 'true');
      }
    };
    fetchNotificationSetting();
  }, []);

  const handleSkinSelect = (skin: ThemeType | 'system') => {
    h('impactLight');
    if (skin === 'system') {
      const fallback = systemScheme === 'dark' ? 'dark' : 'light';
      setSkin(fallback as ThemeType);
    } else {
      setSkin(skin as ThemeType);
    }
    h('selection');
    setModalVisible(false);
  };

  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    await AsyncStorage.setItem('notificationsEnabled', value.toString());
    if (value) {
      notifyOutfitForTomorrow();
    } else {
      const Notifier = PushNotification as any;
      Notifier.cancelAllLocalNotifications?.();
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Your Data?',
      'This will permanently delete all local wardrobe and style data. This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            const Notifier = PushNotification as any;
            Notifier.cancelAllLocalNotifications?.();
            setNotificationsEnabled(false);
            Alert.alert('Your data has been deleted.');
          },
        },
      ],
    );
  };

  const resetApp = () => {
    Alert.alert('Reset All Data?', 'This will erase all local data.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.clear();
          const Notifier = PushNotification as any;
          Notifier.cancelAllLocalNotifications?.();
          setNotificationsEnabled(false);
          Alert.alert('App reset complete.');
        },
      },
    ]);
  };

  return (
    <Animated.ScrollView
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background, opacity: fadeAnim},
      ]}>
      <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
        Settings
      </Text>

      <View style={globalStyles.section}>
        <View
          style={[
            globalStyles.backContainer,
            {marginTop: 16, marginBottom: 36},
          ]}>
          <AppleTouchFeedback
            onPress={() => navigate('Profile')}
            hapticStyle="impactMedium"
            style={{alignSelf: 'flex-start'}}>
            <MaterialIcons name="arrow-back" size={24} color={colors.button3} />
          </AppleTouchFeedback>
          <Text style={[globalStyles.backText, {marginLeft: 12}]}>Back</Text>
        </View>

        <View style={globalStyles.centeredSection}>
          <View style={[globalStyles.section2]}>
            <Text
              style={[globalStyles.sectionTitle, {color: colors.foreground}]}>
              Notifications
            </Text>

            <View
              style={[
                styles.enableRow,
                globalStyles.cardStyles3,
                {borderWidth: tokens.borderWidth.md},
              ]}>
              <Text
                style={[globalStyles.menuLabel, {color: colors.foreground}]}>
                Enable Notifications
              </Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{false: colors.muted, true: theme.colors.button1}}
                ios_backgroundColor={colors.muted}
              />
            </View>

            <View style={[globalStyles.section2]}>
              <Text
                style={[
                  globalStyles.sectionTitle2,
                  {color: colors.foreground},
                ]}>
                Customize Home Screen
              </Text>

              <View
                style={[
                  globalStyles.menuContainer1,
                  globalStyles.cardStyles3,
                  {borderWidth: tokens.borderWidth.md},
                ]}>
                {(
                  [
                    ['weather', 'Weather'],
                    ['locationMap', 'Location Map'],
                    ['quickAccess', 'Quick Access'],
                    ['topFashionStories', 'Top Fashion Stories'],
                    ['recommendedItems', 'Recommended Items'],
                    ['savedLooks', 'Saved Looks'],
                  ] as const
                ).map(([key, label], idx, arr) => (
                  <View
                    key={key}
                    style={[
                      globalStyles.menuSection1,
                      idx < arr.length - 1 && globalStyles.hrLine,
                      {
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      },
                    ]}>
                    <Text
                      style={[
                        globalStyles.menuLabel,
                        {color: colors.foreground},
                      ]}>
                      {label}
                    </Text>
                    <Switch
                      value={(prefs as any)[key]}
                      onValueChange={v =>
                        setVisible(key as keyof typeof prefs, v)
                      }
                      trackColor={{
                        false: colors.muted,
                        true: theme.colors.button1,
                      }}
                      ios_backgroundColor={colors.muted}
                    />
                  </View>
                ))}
              </View>
            </View>

            <View style={globalStyles.section2}>
              <Text
                style={[globalStyles.sectionTitle, {color: colors.foreground}]}>
                App Color Theme
              </Text>

              <View
                style={[
                  globalStyles.menuSection2,
                  globalStyles.cardStyles3,
                  {
                    backgroundColor: colors.surface,
                    borderWidth: tokens.borderWidth.md,
                  },
                ]}>
                <AppleTouchFeedback
                  onPress={() => setModalVisible(true)}
                  hapticStyle="impactMedium"
                  style={[{backgroundColor: colors.surface}]}>
                  <Text
                    style={[
                      globalStyles.menuLabel,
                      {color: colors.foreground},
                    ]}>
                    {currentLabel}
                  </Text>
                </AppleTouchFeedback>
              </View>
            </View>

            <View>
              <Text
                style={[
                  globalStyles.sectionTitle2,
                  {color: colors.foreground},
                ]}>
                Profile and Data
              </Text>
              <View
                style={[
                  globalStyles.menuContainer1,
                  globalStyles.cardStyles3,
                  {borderWidth: tokens.borderWidth.md},
                ]}>
                <AppleTouchFeedback
                  onPress={() => navigate('PersonalInformation')}
                  hapticStyle="impactLight"
                  style={[globalStyles.menuSection1, globalStyles.hrLine]}>
                  <Text
                    style={[
                      globalStyles.menuLabel,
                      {color: colors.foreground},
                    ]}>
                    Profile Information
                  </Text>
                </AppleTouchFeedback>

                <AppleTouchFeedback
                  onPress={resetApp}
                  hapticStyle="impactHeavy"
                  style={[globalStyles.menuSection1, globalStyles.hrLine]}>
                  <Text style={[globalStyles.menuLabel, {color: colors.error}]}>
                    Reset App Data
                  </Text>
                </AppleTouchFeedback>

                <AppleTouchFeedback
                  onPress={handleDeleteAccount}
                  hapticStyle="impactHeavy"
                  style={[globalStyles.menuSection1]}>
                  <Text style={[globalStyles.menuLabel, {color: colors.error}]}>
                    Delete My Data
                  </Text>
                </AppleTouchFeedback>
              </View>
            </View>

            <View style={[globalStyles.section2]}>
              <Text
                style={[
                  globalStyles.sectionTitle2,
                  {color: colors.foreground, marginTop: 24},
                ]}>
                Help & Support
              </Text>

              <View
                style={[
                  globalStyles.menuContainer1,
                  globalStyles.cardStyles3,
                  {borderWidth: tokens.borderWidth.md},
                ]}>
                <AppleTouchFeedback
                  onPress={() => navigate('ContactScreen')}
                  hapticStyle="impactMedium"
                  style={[globalStyles.menuSection1, globalStyles.hrLine]}>
                  <Text
                    style={[
                      globalStyles.menuLabel,
                      {color: colors.foreground},
                    ]}>
                    Contact Support
                  </Text>
                </AppleTouchFeedback>

                <AppleTouchFeedback
                  onPress={() =>
                    navigate('WebPageScreen', {
                      url: 'https://styliq.app/faq',
                      title: 'FAQ & Help',
                    })
                  }
                  hapticStyle="impactLight"
                  style={[globalStyles.menuSection1, globalStyles.hrLine]}>
                  <Text
                    style={[
                      globalStyles.menuLabel,
                      {color: colors.foreground},
                    ]}>
                    FAQ & Help
                  </Text>
                </AppleTouchFeedback>

                <AppleTouchFeedback
                  onPress={() => navigate('FeedbackScreen')}
                  hapticStyle="impactMedium"
                  style={[globalStyles.menuSection1, globalStyles.hrLine]}>
                  <Text
                    style={[globalStyles.menuLabel, {color: colors.primary}]}>
                    Send Feedback
                  </Text>
                </AppleTouchFeedback>

                <AppleTouchFeedback
                  onPress={() => navigate('AboutScreen')}
                  hapticStyle="impactLight"
                  style={[globalStyles.menuSection1]}>
                  <Text
                    style={[
                      globalStyles.menuLabel,
                      {color: colors.foreground},
                    ]}>
                    About StylHelpr
                  </Text>
                </AppleTouchFeedback>
              </View>
            </View>

            <View style={[globalStyles.section2]}>
              <Text
                style={[
                  globalStyles.sectionTitle2,
                  {color: colors.foreground},
                ]}>
                Legal
              </Text>

              <View
                style={[
                  globalStyles.menuContainer1,
                  globalStyles.cardStyles3,
                  {borderWidth: tokens.borderWidth.md},
                ]}>
                <AppleTouchFeedback
                  onPress={() =>
                    navigate('WebPageScreen', {
                      url: 'https://styliq.app/privacy',
                      title: 'Privacy Policy',
                    })
                  }
                  hapticStyle="impactLight"
                  style={[globalStyles.menuSection1, globalStyles.hrLine]}>
                  <Text
                    style={[
                      globalStyles.menuLabel,
                      {color: colors.foreground},
                    ]}>
                    Privacy Policy
                  </Text>
                </AppleTouchFeedback>

                <AppleTouchFeedback
                  onPress={() =>
                    navigate('WebPageScreen', {
                      url: 'https://styliq.app/terms',
                      title: 'Terms of Service',
                    })
                  }
                  hapticStyle="impactLight"
                  style={[globalStyles.menuSection1]}>
                  <Text
                    style={[
                      globalStyles.menuLabel,
                      {color: colors.foreground},
                    ]}>
                    Terms of Service
                  </Text>
                </AppleTouchFeedback>
              </View>
            </View>

            <Text
              style={[
                globalStyles.title,
                {marginTop: 8, textAlign: 'center', color: colors.foreground},
              ]}>
              App Version: {appVersion}
            </Text>

            <Modal visible={modalVisible} animationType="slide" transparent>
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPressOut={() => {
                  h('selection');
                  setModalVisible(false);
                }}>
                <View
                  style={[
                    styles.modalContent,
                    {backgroundColor: colors.surface},
                  ]}>
                  {skinOptions.map(option => (
                    <TouchableOpacity
                      key={option.key}
                      onPress={() => handleSkinSelect(option.key as ThemeType)}
                      style={[
                        styles.optionRow,
                        {
                          backgroundColor:
                            mode === option.key
                              ? colors.primary
                              : 'transparent',
                        },
                      ]}>
                      <View
                        style={[
                          styles.colorSwatch,
                          {backgroundColor: option.color},
                        ]}
                      />
                      <Text
                        style={{
                          color:
                            mode === option.key
                              ? colors.background
                              : colors.foreground,
                        }}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            </Modal>
          </View>
        </View>
      </View>
    </Animated.ScrollView>
  );
}

////////////////////

// // apps/mobile/src/screens/SettingsScreen.tsx
// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   ScrollView,
//   Modal,
//   Switch,
//   useColorScheme,
//   Alert,
//   Linking,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import type {ThemeType} from '../context/ThemeContext';
// import {notifyOutfitForTomorrow} from '../utils/notifyOutfitForTomorrow';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import PushNotification from 'react-native-push-notification';
// import DeviceInfo from 'react-native-device-info';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {useHomePrefs} from '../hooks/useHomePrefs';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// const skinOptions: {
//   key: ThemeType | 'system';
//   label: string;
//   color: string;
// }[] = [
//   {key: 'fashion1', label: 'Fashion 1', color: '#f5f5f5'},
//   {key: 'modernDark', label: 'Modern Dark', color: '#00050e'},
//   {key: 'modernDark2', label: 'Modern Dark 2', color: '#121212'},
//   {key: 'modernLight', label: 'Modern Light', color: '#f5f5f5'},
//   {key: 'retro', label: 'Retro', color: '#FDEDDC'},
//   {key: 'minimal', label: 'Minimal', color: '#FFFFFF'},
//   {key: 'vibrant', label: 'Vibrant', color: '#1B0032'},
//   {key: 'nord', label: 'Nord', color: '#2E3440'},
//   {key: 'dracula', label: 'Dracula', color: '#282A36'},
//   {key: 'oneDark', label: 'One Dark', color: '#282C34'},
//   {key: 'solarizedLight', label: 'Solarized Light', color: '#FDF6E3'},
//   {key: 'solarizedDark', label: 'Solarized Dark', color: '#002B36'},
//   {key: 'pastelPop', label: 'Pastel Pop', color: '#FFE5EC'},
//   {key: 'cyberpunk', label: 'Cyberpunk', color: '#0D0221'},
//   {key: 'monokai', label: 'Monokai', color: '#272822'},
// ];

// export default function SettingsScreen({navigate}: Props) {
//   const {theme, mode, setSkin} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const systemScheme = useColorScheme();
//   const [modalVisible, setModalVisible] = useState(false);
//   const [notificationsEnabled, setNotificationsEnabled] = useState(false);
//   const [appVersion, setAppVersion] = useState('');
//   const colors = theme.colors;

//   // 👇 Home visibility preferences (Weather, Map, Quick Access, Saved Looks)
//   const {prefs, setVisible} = useHomePrefs();

//   const h = (type: string) =>
//     ReactNativeHapticFeedback.trigger(type, {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     enableRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       marginBottom: 20,
//       backgroundColor: theme.colors.surface,
//       borderRadius: tokens.borderRadius.md,
//       paddingHorizontal: 22,
//       paddingVertical: 14,
//     },
//     modalOverlay: {
//       flex: 1,
//       justifyContent: 'center',
//       padding: 24,
//       backgroundColor: 'rgba(0,0,0,0.5)',
//     },
//     modalContent: {
//       borderRadius: 12,
//       padding: 16,
//       width: '100%',
//       maxWidth: 720,
//       alignSelf: 'center',
//     },
//     optionRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingVertical: 12,
//       paddingHorizontal: 10,
//       borderRadius: 8,
//       marginBottom: 6,
//     },
//     colorSwatch: {
//       width: 16,
//       height: 16,
//       borderRadius: 4,
//       marginRight: 10,
//       borderWidth: tokens.borderWidth.md,
//       borderColor: '#ccc',
//     },
//     version: {
//       textAlign: 'center',
//       fontSize: 14,
//       opacity: 0.6,
//     },
//   });

//   const handleSendFeedback = async () => {
//     const appVersion = DeviceInfo.getVersion();
//     const buildNumber = DeviceInfo.getBuildNumber();
//     const systemName = DeviceInfo.getSystemName();
//     const systemVersion = DeviceInfo.getSystemVersion();
//     const model = DeviceInfo.getModel();

//     const subject = encodeURIComponent('StyliQ Feedback');
//     const body = encodeURIComponent(
//       `Please describe your issue or feedback below:\n\n\n\n---\nDevice: ${model}\nOS: ${systemName} ${systemVersion}\nApp Version: ${appVersion} (Build ${buildNumber})`,
//     );

//     const mailto = `mailto:feedback@styliq.app?subject=${subject}&body=${body}`;

//     const canOpen = await Linking.canOpenURL(mailto);
//     if (canOpen) {
//       Linking.openURL(mailto);
//     } else {
//       Alert.alert('Error', 'No email app available to send feedback.');
//     }
//   };

//   useEffect(() => {
//     const version = DeviceInfo.getVersion();
//     setAppVersion(version);
//   }, []);

//   const currentLabel =
//     skinOptions.find(s => s.key === mode)?.label || 'Unknown';

//   useEffect(() => {
//     const fetchNotificationSetting = async () => {
//       const value = await AsyncStorage.getItem('notificationsEnabled');
//       if (value !== null) {
//         setNotificationsEnabled(value === 'true');
//       }
//     };
//     fetchNotificationSetting();
//   }, []);

//   const handleSkinSelect = (skin: ThemeType | 'system') => {
//     h('impactLight'); // 🔔 fire haptic on theme pick

//     if (skin === 'system') {
//       const fallback = systemScheme === 'dark' ? 'dark' : 'light';
//       setSkin(fallback as ThemeType);
//     } else {
//       setSkin(skin as ThemeType);
//     }

//     h('selection'); // subtle confirmation
//     setModalVisible(false);
//   };

//   const handleToggleNotifications = async (value: boolean) => {
//     setNotificationsEnabled(value);
//     await AsyncStorage.setItem('notificationsEnabled', value.toString());
//     if (value) {
//       notifyOutfitForTomorrow();
//     } else {
//       const Notifier = PushNotification as any;
//       Notifier.cancelAllLocalNotifications?.();
//     }
//   };

//   const handleDeleteAccount = () => {
//     Alert.alert(
//       'Delete Your Data?',
//       'This will permanently delete all local wardrobe and style data. This cannot be undone.',
//       [
//         {text: 'Cancel', style: 'cancel'},
//         {
//           text: 'Delete',
//           style: 'destructive',
//           onPress: async () => {
//             await AsyncStorage.clear();
//             const Notifier = PushNotification as any;
//             Notifier.cancelAllLocalNotifications?.();
//             setNotificationsEnabled(false);
//             Alert.alert('Your data has been deleted.');
//           },
//         },
//       ],
//     );
//   };

//   const resetApp = () => {
//     Alert.alert('Reset All Data?', 'This will erase all local data.', [
//       {text: 'Cancel', style: 'cancel'},
//       {
//         text: 'Reset',
//         style: 'destructive',
//         onPress: async () => {
//           await AsyncStorage.clear();
//           const Notifier = PushNotification as any;
//           Notifier.cancelAllLocalNotifications?.();
//           setNotificationsEnabled(false);
//           Alert.alert('App reset complete.');
//         },
//       },
//     ]);
//   };

//   const sendFeedback = () => {
//     Linking.openURL('mailto:support@yourapp.com?subject=App Feedback');
//   };

//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Settings
//       </Text>

//       <View style={globalStyles.section}>
//         <View
//           style={[
//             globalStyles.backContainer,
//             {marginTop: 16, marginBottom: 36},
//           ]}>
//           <AppleTouchFeedback
//             onPress={() => navigate('Profile')}
//             hapticStyle="impactMedium"
//             style={{alignSelf: 'flex-start'}}>
//             <MaterialIcons name="arrow-back" size={24} color={colors.button3} />
//           </AppleTouchFeedback>
//           <Text style={[globalStyles.backText, {marginLeft: 12}]}>Back</Text>
//         </View>

//         <View style={globalStyles.centeredSection}>
//           <View style={[globalStyles.section2]}>
//             <Text
//               style={[globalStyles.sectionTitle, {color: colors.foreground}]}>
//               Notifications
//             </Text>

//             {/* 🔔 Notifications */}
//             <View
//               style={[
//                 styles.enableRow,
//                 globalStyles.cardStyles3,
//                 {borderWidth: tokens.borderWidth.md},
//               ]}>
//               <Text
//                 style={[globalStyles.menuLabel, {color: colors.foreground}]}>
//                 Enable Notifications
//               </Text>
//               <Switch
//                 value={notificationsEnabled}
//                 onValueChange={handleToggleNotifications}
//                 trackColor={{false: colors.muted, true: theme.colors.button1}}
//                 ios_backgroundColor={colors.muted}
//               />
//             </View>

//             {/* 🎛 Customize Home — toggle Home sections */}
//             <View style={[globalStyles.section2]}>
//               <Text
//                 style={[
//                   globalStyles.sectionTitle2,
//                   {color: colors.foreground},
//                 ]}>
//                 Customize Home Screen
//               </Text>

//               <View
//                 style={[
//                   globalStyles.menuContainer1,
//                   globalStyles.cardStyles3,
//                   {borderWidth: tokens.borderWidth.md},
//                 ]}>
//                 {(
//                   [
//                     ['weather', 'Weather'],
//                     ['locationMap', 'Location Map'],
//                     ['quickAccess', 'Quick Access'],
//                     ['topFashionStories', 'Top Fashion Stories'],
//                     ['recommendedItems', 'Recommended Items'],
//                     ['savedLooks', 'Saved Looks'],
//                   ] as const
//                 ).map(([key, label], idx, arr) => (
//                   <View
//                     key={key}
//                     style={[
//                       globalStyles.menuSection1,
//                       idx < arr.length - 1 && globalStyles.hrLine,
//                       {
//                         flexDirection: 'row',
//                         justifyContent: 'space-between',
//                         alignItems: 'center',
//                       },
//                     ]}>
//                     <Text
//                       style={[
//                         globalStyles.menuLabel,
//                         {color: colors.foreground},
//                       ]}>
//                       {label}
//                     </Text>
//                     <Switch
//                       value={(prefs as any)[key]}
//                       onValueChange={v =>
//                         setVisible(key as keyof typeof prefs, v)
//                       }
//                       trackColor={{
//                         false: colors.muted,
//                         true: theme.colors.button1,
//                       }}
//                       ios_backgroundColor={colors.muted}
//                     />
//                   </View>
//                 ))}
//               </View>
//             </View>

//             <View style={globalStyles.section2}>
//               {/* 🎨 Theme */}
//               <Text
//                 style={[globalStyles.sectionTitle, {color: colors.foreground}]}>
//                 App Color Theme
//               </Text>

//               {/* Theme selection */}
//               <View
//                 style={[
//                   globalStyles.menuSection2,
//                   globalStyles.cardStyles3,
//                   {
//                     backgroundColor: colors.surface,
//                     borderWidth: tokens.borderWidth.md,
//                   },
//                 ]}>
//                 <AppleTouchFeedback
//                   onPress={() => setModalVisible(true)}
//                   hapticStyle="impactMedium"
//                   style={[{backgroundColor: colors.surface}]}>
//                   <Text
//                     style={[
//                       globalStyles.menuLabel,
//                       {color: colors.foreground},
//                     ]}>
//                     {currentLabel}
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>

//             <View>
//               <Text
//                 style={[
//                   globalStyles.sectionTitle2,
//                   {color: colors.foreground},
//                 ]}>
//                 Profile and Data
//               </Text>
//               <View
//                 style={[
//                   globalStyles.menuContainer1,
//                   globalStyles.cardStyles3,
//                   {borderWidth: tokens.borderWidth.md},
//                 ]}>
//                 {/* Profile Information */}
//                 <AppleTouchFeedback
//                   onPress={() => navigate('PersonalInformation')}
//                   hapticStyle="impactLight"
//                   style={[globalStyles.menuSection1, globalStyles.hrLine]}>
//                   <Text
//                     style={[
//                       globalStyles.menuLabel,
//                       {color: colors.foreground},
//                     ]}>
//                     Profile Information
//                   </Text>
//                 </AppleTouchFeedback>

//                 {/* Reset App Data */}
//                 <AppleTouchFeedback
//                   onPress={resetApp}
//                   hapticStyle="impactHeavy"
//                   style={[globalStyles.menuSection1, globalStyles.hrLine]}>
//                   <Text style={[globalStyles.menuLabel, {color: colors.error}]}>
//                     Reset App Data
//                   </Text>
//                 </AppleTouchFeedback>

//                 {/* Delete My Data */}
//                 <AppleTouchFeedback
//                   onPress={handleDeleteAccount}
//                   hapticStyle="impactHeavy"
//                   style={[globalStyles.menuSection1]}>
//                   <Text style={[globalStyles.menuLabel, {color: colors.error}]}>
//                     Delete My Data
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>

//             {/* ───────── Help & Support (Apple-style placement) ───────── */}
//             <View style={[globalStyles.section2]}>
//               <Text
//                 style={[
//                   globalStyles.sectionTitle2,
//                   {color: colors.foreground, marginTop: 24},
//                 ]}>
//                 Help & Support
//               </Text>

//               <View
//                 style={[
//                   globalStyles.menuContainer1,
//                   globalStyles.cardStyles3,
//                   {borderWidth: tokens.borderWidth.md},
//                 ]}>
//                 {/* Contact Support */}
//                 <AppleTouchFeedback
//                   onPress={() => navigate('ContactScreen')}
//                   hapticStyle="impactMedium"
//                   style={[globalStyles.menuSection1, globalStyles.hrLine]}>
//                   <Text
//                     style={[
//                       globalStyles.menuLabel,
//                       {color: colors.foreground},
//                     ]}>
//                     Contact Support
//                   </Text>
//                 </AppleTouchFeedback>

//                 {/* FAQ & Help */}
//                 <AppleTouchFeedback
//                   onPress={() =>
//                     navigate('WebPageScreen', {
//                       url: 'https://styliq.app/faq',
//                       title: 'FAQ & Help',
//                     })
//                   }
//                   hapticStyle="impactLight"
//                   style={[globalStyles.menuSection1, globalStyles.hrLine]}>
//                   <Text
//                     style={[
//                       globalStyles.menuLabel,
//                       {color: colors.foreground},
//                     ]}>
//                     FAQ & Help
//                   </Text>
//                 </AppleTouchFeedback>

//                 {/* Send Feedback */}
//                 <AppleTouchFeedback
//                   onPress={() => navigate('FeedbackScreen')}
//                   hapticStyle="impactMedium"
//                   style={[globalStyles.menuSection1, globalStyles.hrLine]}>
//                   <Text
//                     style={[globalStyles.menuLabel, {color: colors.primary}]}>
//                     Send Feedback
//                   </Text>
//                 </AppleTouchFeedback>

//                 {/* About StylHelpr */}
//                 <AppleTouchFeedback
//                   onPress={() => navigate('AboutScreen')}
//                   hapticStyle="impactLight"
//                   style={[globalStyles.menuSection1]}>
//                   <Text
//                     style={[
//                       globalStyles.menuLabel,
//                       {color: colors.foreground},
//                     ]}>
//                     About StylHelpr
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>

//             {/* Legal */}
//             <View style={[globalStyles.section2]}>
//               <Text
//                 style={[
//                   globalStyles.sectionTitle2,
//                   {color: colors.foreground},
//                 ]}>
//                 Legal
//               </Text>

//               <View
//                 style={[
//                   globalStyles.menuContainer1,
//                   globalStyles.cardStyles3,
//                   {borderWidth: tokens.borderWidth.md},
//                 ]}>
//                 {/* Privacy Policy */}
//                 <AppleTouchFeedback
//                   onPress={() =>
//                     navigate('WebPageScreen', {
//                       url: 'https://styliq.app/privacy',
//                       title: 'Privacy Policy',
//                     })
//                   }
//                   hapticStyle="impactLight"
//                   style={[globalStyles.menuSection1, globalStyles.hrLine]}>
//                   <Text
//                     style={[
//                       globalStyles.menuLabel,
//                       {color: colors.foreground},
//                     ]}>
//                     Privacy Policy
//                   </Text>
//                 </AppleTouchFeedback>

//                 {/* Terms of Service */}
//                 <AppleTouchFeedback
//                   onPress={() =>
//                     navigate('WebPageScreen', {
//                       url: 'https://styliq.app/terms',
//                       title: 'Terms of Service',
//                     })
//                   }
//                   hapticStyle="impactLight"
//                   style={[globalStyles.menuSection1]}>
//                   <Text
//                     style={[
//                       globalStyles.menuLabel,
//                       {color: colors.foreground},
//                     ]}>
//                     Terms of Service
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>

//             {/* 📱 App Version */}
//             <Text
//               style={[
//                 globalStyles.title,
//                 {marginTop: 8, textAlign: 'center', color: colors.foreground},
//               ]}>
//               App Version: {appVersion}
//             </Text>

//             {/* Theme Modal */}
//             <Modal visible={modalVisible} animationType="slide" transparent>
//               <TouchableOpacity
//                 style={styles.modalOverlay}
//                 activeOpacity={1}
//                 onPressOut={() => {
//                   h('selection'); // 🔔 haptic when closing modal by tapping outside
//                   setModalVisible(false);
//                 }}>
//                 <View
//                   style={[
//                     styles.modalContent,
//                     {backgroundColor: colors.surface},
//                   ]}>
//                   {skinOptions.map(option => (
//                     <TouchableOpacity
//                       key={option.key}
//                       onPress={() => handleSkinSelect(option.key as ThemeType)}
//                       style={[
//                         styles.optionRow,
//                         {
//                           backgroundColor:
//                             mode === option.key
//                               ? colors.primary
//                               : 'transparent',
//                         },
//                       ]}>
//                       <View
//                         style={[
//                           styles.colorSwatch,
//                           {backgroundColor: option.color},
//                         ]}
//                       />
//                       <Text
//                         style={{
//                           color:
//                             mode === option.key
//                               ? colors.background
//                               : colors.foreground,
//                         }}>
//                         {option.label}
//                       </Text>
//                     </TouchableOpacity>
//                   ))}
//                 </View>
//               </TouchableOpacity>
//             </Modal>
//           </View>
//         </View>
//       </View>
//     </ScrollView>
//   );
// }

///////////////////

// // apps/mobile/src/screens/SettingsScreen.tsx
// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   ScrollView,
//   Modal,
//   Switch,
//   useColorScheme,
//   Alert,
//   Linking,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import type {ThemeType} from '../context/ThemeContext';
// import {notifyOutfitForTomorrow} from '../utils/notifyOutfitForTomorrow';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import PushNotification from 'react-native-push-notification';
// import DeviceInfo from 'react-native-device-info';
// // import BackHeader from '../components/Backheader/Backheader'; // (unused)
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {useHomePrefs} from '../hooks/useHomePrefs';
// import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// const skinOptions: {
//   key: ThemeType | 'system';
//   label: string;
//   color: string;
// }[] = [
//   {key: 'modernDark', label: 'Modern Dark', color: '#00050e'},
//   {key: 'modernDark2', label: 'Modern Dark 2', color: '#121212'},
//   {key: 'modernLight', label: 'Modern Light', color: '#f5f5f5'},
//   {key: 'retro', label: 'Retro', color: '#FDEDDC'},
//   {key: 'minimal', label: 'Minimal', color: '#FFFFFF'},
//   {key: 'vibrant', label: 'Vibrant', color: '#1B0032'},
//   {key: 'nord', label: 'Nord', color: '#2E3440'},
//   {key: 'dracula', label: 'Dracula', color: '#282A36'},
//   {key: 'oneDark', label: 'One Dark', color: '#282C34'},
//   {key: 'solarizedLight', label: 'Solarized Light', color: '#FDF6E3'},
//   {key: 'solarizedDark', label: 'Solarized Dark', color: '#002B36'},
//   {key: 'pastelPop', label: 'Pastel Pop', color: '#FFE5EC'},
//   {key: 'cyberpunk', label: 'Cyberpunk', color: '#0D0221'},
//   {key: 'monokai', label: 'Monokai', color: '#272822'},
// ];

// export default function SettingsScreen({navigate}: Props) {
//   const {theme, mode, setSkin} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const systemScheme = useColorScheme();
//   const [modalVisible, setModalVisible] = useState(false);
//   const [notificationsEnabled, setNotificationsEnabled] = useState(false);
//   const [appVersion, setAppVersion] = useState('');
//   const colors = theme.colors;

//   // 👇 Home visibility preferences (Weather, Map, Quick Access, Saved Looks)
//   const {prefs, setVisible} = useHomePrefs();

//   const h = (type: string) =>
//     ReactNativeHapticFeedback.trigger(type, {
//       enableVibrateFallback: true,
//       ignoreAndroidSystemSettings: false,
//     });

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     enableRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       marginBottom: 20,
//       backgroundColor: theme.colors.surface,
//       borderRadius: tokens.borderRadius.md,
//       paddingHorizontal: 22,
//       paddingVertical: 14,
//     },
//     modalOverlay: {
//       flex: 1,
//       justifyContent: 'center',
//       padding: 24,
//       backgroundColor: 'rgba(0,0,0,0.5)',
//     },
//     modalContent: {
//       borderRadius: 12,
//       padding: 16,
//       width: '100%',
//       maxWidth: 720,
//       alignSelf: 'center',
//     },
//     optionRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingVertical: 12,
//       paddingHorizontal: 10,
//       borderRadius: 8,
//       marginBottom: 6,
//     },
//     colorSwatch: {
//       width: 16,
//       height: 16,
//       borderRadius: 4,
//       marginRight: 10,
//       borderWidth: tokens.borderWidth.md,
//       borderColor: '#ccc',
//     },
//     version: {
//       textAlign: 'center',
//       fontSize: 14,
//       opacity: 0.6,
//     },
//   });

//   const handleSendFeedback = async () => {
//     const appVersion = DeviceInfo.getVersion();
//     const buildNumber = DeviceInfo.getBuildNumber();
//     const systemName = DeviceInfo.getSystemName();
//     const systemVersion = DeviceInfo.getSystemVersion();
//     const model = DeviceInfo.getModel();

//     const subject = encodeURIComponent('StyliQ Feedback');
//     const body = encodeURIComponent(
//       `Please describe your issue or feedback below:\n\n\n\n---\nDevice: ${model}\nOS: ${systemName} ${systemVersion}\nApp Version: ${appVersion} (Build ${buildNumber})`,
//     );

//     const mailto = `mailto:feedback@styliq.app?subject=${subject}&body=${body}`;

//     const canOpen = await Linking.canOpenURL(mailto);
//     if (canOpen) {
//       Linking.openURL(mailto);
//     } else {
//       Alert.alert('Error', 'No email app available to send feedback.');
//     }
//   };

//   useEffect(() => {
//     const version = DeviceInfo.getVersion();
//     setAppVersion(version);
//   }, []);

//   const currentLabel =
//     skinOptions.find(s => s.key === mode)?.label || 'Unknown';

//   useEffect(() => {
//     const fetchNotificationSetting = async () => {
//       const value = await AsyncStorage.getItem('notificationsEnabled');
//       if (value !== null) {
//         setNotificationsEnabled(value === 'true');
//       }
//     };
//     fetchNotificationSetting();
//   }, []);

//   const handleSkinSelect = (skin: ThemeType | 'system') => {
//     h('impactLight'); // 🔔 fire haptic on theme pick

//     if (skin === 'system') {
//       const fallback = systemScheme === 'dark' ? 'dark' : 'light';
//       setSkin(fallback as ThemeType);
//     } else {
//       setSkin(skin as ThemeType);
//     }

//     h('selection'); // subtle confirmation
//     setModalVisible(false);
//   };

//   const handleToggleNotifications = async (value: boolean) => {
//     setNotificationsEnabled(value);
//     await AsyncStorage.setItem('notificationsEnabled', value.toString());
//     if (value) {
//       notifyOutfitForTomorrow();
//     } else {
//       const Notifier = PushNotification as any;
//       Notifier.cancelAllLocalNotifications?.();
//     }
//   };

//   const handleDeleteAccount = () => {
//     Alert.alert(
//       'Delete Your Data?',
//       'This will permanently delete all local wardrobe and style data. This cannot be undone.',
//       [
//         {text: 'Cancel', style: 'cancel'},
//         {
//           text: 'Delete',
//           style: 'destructive',
//           onPress: async () => {
//             await AsyncStorage.clear();
//             const Notifier = PushNotification as any;
//             Notifier.cancelAllLocalNotifications?.();
//             setNotificationsEnabled(false);
//             Alert.alert('Your data has been deleted.');
//           },
//         },
//       ],
//     );
//   };

//   const resetApp = () => {
//     Alert.alert('Reset All Data?', 'This will erase all local data.', [
//       {text: 'Cancel', style: 'cancel'},
//       {
//         text: 'Reset',
//         style: 'destructive',
//         onPress: async () => {
//           await AsyncStorage.clear();
//           const Notifier = PushNotification as any;
//           Notifier.cancelAllLocalNotifications?.();
//           setNotificationsEnabled(false);
//           Alert.alert('App reset complete.');
//         },
//       },
//     ]);
//   };

//   const sendFeedback = () => {
//     Linking.openURL('mailto:support@yourapp.com?subject=App Feedback');
//   };

//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Settings
//       </Text>

//       <View style={globalStyles.section}>
//         <View
//           style={[
//             globalStyles.backContainer,
//             {marginTop: 16, marginBottom: 36},
//           ]}>
//           <AppleTouchFeedback
//             onPress={() => navigate('Profile')}
//             hapticStyle="impactMedium"
//             style={{alignSelf: 'flex-start'}}>
//             <MaterialIcons name="arrow-back" size={24} color={colors.button3} />
//           </AppleTouchFeedback>
//           <Text style={[globalStyles.backText, {marginLeft: 12}]}>Back</Text>
//         </View>

//         <View style={globalStyles.centeredSection}>
//           <View style={[globalStyles.section2]}>
//             <Text
//               style={[globalStyles.sectionTitle, {color: colors.foreground}]}>
//               Notifications
//             </Text>

//             {/* 🔔 Notifications */}
//             <View
//               style={[
//                 styles.enableRow,
//                 globalStyles.cardStyles3,
//                 {borderWidth: tokens.borderWidth.md},
//               ]}>
//               <Text
//                 style={[globalStyles.menuLabel, {color: colors.foreground}]}>
//                 Enable Notifications
//               </Text>
//               <Switch
//                 value={notificationsEnabled}
//                 onValueChange={handleToggleNotifications}
//                 trackColor={{false: colors.muted, true: theme.colors.button1}}
//                 ios_backgroundColor={colors.muted}
//               />
//             </View>

//             {/* 🎛 Customize Home — toggle Home sections */}
//             <View style={[globalStyles.section2]}>
//               <Text
//                 style={[
//                   globalStyles.sectionTitle2,
//                   {color: colors.foreground},
//                 ]}>
//                 Customize Home Screen
//               </Text>

//               <View
//                 style={[
//                   globalStyles.menuContainer1,
//                   globalStyles.cardStyles3,
//                   {borderWidth: tokens.borderWidth.md},
//                 ]}>
//                 {(
//                   [
//                     ['weather', 'Weather'],
//                     ['locationMap', 'Location Map'],
//                     ['quickAccess', 'Quick Access'],
//                     ['topFashionStories', 'Top Fashion Stories'],
//                     ['recommendedItems', 'Recommended Items'],
//                     ['savedLooks', 'Saved Looks'],
//                   ] as const
//                 ).map(([key, label], idx, arr) => (
//                   <View
//                     key={key}
//                     style={[
//                       globalStyles.menuSection1,
//                       idx < arr.length - 1 && globalStyles.hrLine,
//                       {
//                         flexDirection: 'row',
//                         justifyContent: 'space-between',
//                         alignItems: 'center',
//                       },
//                     ]}>
//                     <Text
//                       style={[
//                         globalStyles.menuLabel,
//                         {color: colors.foreground},
//                       ]}>
//                       {label}
//                     </Text>
//                     <Switch
//                       value={(prefs as any)[key]}
//                       onValueChange={v =>
//                         setVisible(key as keyof typeof prefs, v)
//                       }
//                       trackColor={{
//                         false: colors.muted,
//                         true: theme.colors.button1,
//                       }}
//                       ios_backgroundColor={colors.muted}
//                     />
//                   </View>
//                 ))}
//               </View>
//             </View>

//             <View style={globalStyles.section2}>
//               {/* 🎨 Theme */}
//               <Text
//                 style={[globalStyles.sectionTitle, {color: colors.foreground}]}>
//                 App Color Theme
//               </Text>

//               {/* Theme selection */}
//               <View
//                 style={[
//                   globalStyles.menuSection2,
//                   globalStyles.cardStyles3,
//                   {
//                     backgroundColor: colors.surface,
//                     borderWidth: tokens.borderWidth.md,
//                   },
//                 ]}>
//                 <AppleTouchFeedback
//                   onPress={() => setModalVisible(true)}
//                   hapticStyle="impactMedium"
//                   style={[{backgroundColor: colors.surface}]}>
//                   <Text
//                     style={[
//                       globalStyles.menuLabel,
//                       {color: colors.foreground},
//                     ]}>
//                     {currentLabel}
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>

//             <View>
//               <Text
//                 style={[
//                   globalStyles.sectionTitle2,
//                   {color: colors.foreground},
//                 ]}>
//                 Profile and Data
//               </Text>
//               <View
//                 style={[
//                   globalStyles.menuContainer1,
//                   globalStyles.cardStyles3,
//                   {borderWidth: tokens.borderWidth.md},
//                 ]}>
//                 {/* Profile Information */}
//                 <AppleTouchFeedback
//                   onPress={() => navigate('PersonalInformation')}
//                   hapticStyle="impactLight"
//                   style={[globalStyles.menuSection1, globalStyles.hrLine]}>
//                   <Text
//                     style={[
//                       globalStyles.menuLabel,
//                       {color: colors.foreground},
//                     ]}>
//                     Profile Information
//                   </Text>
//                 </AppleTouchFeedback>

//                 {/* Reset App Data */}
//                 <AppleTouchFeedback
//                   onPress={resetApp}
//                   hapticStyle="impactHeavy"
//                   style={[globalStyles.menuSection1, globalStyles.hrLine]}>
//                   <Text style={[globalStyles.menuLabel, {color: colors.error}]}>
//                     Reset App Data
//                   </Text>
//                 </AppleTouchFeedback>

//                 {/* Delete My Data */}
//                 <AppleTouchFeedback
//                   onPress={handleDeleteAccount}
//                   hapticStyle="impactHeavy"
//                   style={[globalStyles.menuSection1]}>
//                   <Text style={[globalStyles.menuLabel, {color: colors.error}]}>
//                     Delete My Data
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>

//             {/* ───────── Help & Support (Apple-style placement) ───────── */}
//             <View style={[globalStyles.section2]}>
//               <Text
//                 style={[
//                   globalStyles.sectionTitle2,
//                   {color: colors.foreground, marginTop: 24},
//                 ]}>
//                 Help & Support
//               </Text>

//               <View
//                 style={[
//                   globalStyles.menuContainer1,
//                   globalStyles.cardStyles3,
//                   {borderWidth: tokens.borderWidth.md},
//                 ]}>
//                 {/* Contact Support */}
//                 <AppleTouchFeedback
//                   onPress={() => navigate('ContactScreen')}
//                   hapticStyle="impactMedium"
//                   style={[globalStyles.menuSection1, globalStyles.hrLine]}>
//                   <Text
//                     style={[
//                       globalStyles.menuLabel,
//                       {color: colors.foreground},
//                     ]}>
//                     Contact Support
//                   </Text>
//                 </AppleTouchFeedback>

//                 {/* FAQ & Help */}
//                 <AppleTouchFeedback
//                   onPress={() => Linking.openURL('https://styliq.app/faq')}
//                   hapticStyle="impactLight"
//                   style={[globalStyles.menuSection1, globalStyles.hrLine]}>
//                   <Text
//                     style={[
//                       globalStyles.menuLabel,
//                       {color: colors.foreground},
//                     ]}>
//                     FAQ & Help
//                   </Text>
//                 </AppleTouchFeedback>

//                 {/* Send Feedback */}
//                 <AppleTouchFeedback
//                   onPress={() => navigate('FeedbackScreen')}
//                   hapticStyle="impactMedium"
//                   style={[globalStyles.menuSection1, globalStyles.hrLine]}>
//                   <Text
//                     style={[globalStyles.menuLabel, {color: colors.primary}]}>
//                     Send Feedback
//                   </Text>
//                 </AppleTouchFeedback>

//                 {/* About StylHelpr */}
//                 <AppleTouchFeedback
//                   onPress={() => navigate('AboutScreen')}
//                   hapticStyle="impactLight"
//                   style={[globalStyles.menuSection1]}>
//                   <Text
//                     style={[
//                       globalStyles.menuLabel,
//                       {color: colors.foreground},
//                     ]}>
//                     About StylHelpr
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>

//             {/* ───────── Legal ───────── */}
//             <View style={[globalStyles.section2]}>
//               <Text
//                 style={[
//                   globalStyles.sectionTitle2,
//                   {color: colors.foreground},
//                 ]}>
//                 Legal
//               </Text>

//               <View
//                 style={[
//                   globalStyles.menuContainer1,
//                   globalStyles.cardStyles3,
//                   {borderWidth: tokens.borderWidth.md},
//                 ]}>
//                 {/* Privacy Policy */}
//                 <AppleTouchFeedback
//                   onPress={() => Linking.openURL('https://styliq.app/privacy')}
//                   hapticStyle="impactLight"
//                   style={[globalStyles.menuSection1, globalStyles.hrLine]}>
//                   <Text
//                     style={[
//                       globalStyles.menuLabel,
//                       {color: colors.foreground},
//                     ]}>
//                     Privacy Policy
//                   </Text>
//                 </AppleTouchFeedback>

//                 {/* Terms of Service */}
//                 <AppleTouchFeedback
//                   onPress={() => Linking.openURL('https://styliq.app/terms')}
//                   hapticStyle="impactLight"
//                   style={[globalStyles.menuSection1, globalStyles.hrLine]}>
//                   <Text
//                     style={[
//                       globalStyles.menuLabel,
//                       {color: colors.foreground},
//                     ]}>
//                     Terms of Service
//                   </Text>
//                 </AppleTouchFeedback>

//                 {/* Open Source Licenses */}
//                 <AppleTouchFeedback
//                   onPress={() => {
//                     /* add logic if needed */
//                   }}
//                   hapticStyle="impactLight"
//                   style={[globalStyles.menuSection1]}>
//                   <Text
//                     style={[
//                       globalStyles.menuLabel,
//                       {color: colors.foreground},
//                     ]}>
//                     Open Source Licenses
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>

//             {/* 📱 App Version */}
//             <Text
//               style={[
//                 globalStyles.title,
//                 {marginTop: 8, textAlign: 'center', color: colors.foreground},
//               ]}>
//               App Version: {appVersion}
//             </Text>

//             {/* Theme Modal */}
//             <Modal visible={modalVisible} animationType="slide" transparent>
//               <TouchableOpacity
//                 style={styles.modalOverlay}
//                 activeOpacity={1}
//                 onPressOut={() => {
//                   h('selection'); // 🔔 haptic when closing modal by tapping outside
//                   setModalVisible(false);
//                 }}>
//                 <View
//                   style={[
//                     styles.modalContent,
//                     {backgroundColor: colors.surface},
//                   ]}>
//                   {skinOptions.map(option => (
//                     <TouchableOpacity
//                       key={option.key}
//                       onPress={() => handleSkinSelect(option.key as ThemeType)}
//                       style={[
//                         styles.optionRow,
//                         {
//                           backgroundColor:
//                             mode === option.key
//                               ? colors.primary
//                               : 'transparent',
//                         },
//                       ]}>
//                       <View
//                         style={[
//                           styles.colorSwatch,
//                           {backgroundColor: option.color},
//                         ]}
//                       />
//                       <Text
//                         style={{
//                           color:
//                             mode === option.key
//                               ? colors.background
//                               : colors.foreground,
//                         }}>
//                         {option.label}
//                       </Text>
//                     </TouchableOpacity>
//                   ))}
//                 </View>
//               </TouchableOpacity>
//             </Modal>
//           </View>
//         </View>
//       </View>
//     </ScrollView>
//   );
// }

////////////////////

// // apps/mobile/src/screens/SettingsScreen.tsx
// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   ScrollView,
//   Modal,
//   Switch,
//   useColorScheme,
//   Alert,
//   Linking,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import type {ThemeType} from '../context/ThemeContext';
// import {notifyOutfitForTomorrow} from '../utils/notifyOutfitForTomorrow';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import PushNotification from 'react-native-push-notification';
// import DeviceInfo from 'react-native-device-info';
// // import BackHeader from '../components/Backheader/Backheader'; // (unused)
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {useHomePrefs} from '../hooks/useHomePrefs';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// const skinOptions: {
//   key: ThemeType | 'system';
//   label: string;
//   color: string;
// }[] = [
//   {key: 'modernDark', label: 'Modern Dark', color: '#00050e'},
//   {key: 'modernDark2', label: 'Modern Dark 2', color: '#121212'},
//   {key: 'modernLight', label: 'Modern Light', color: '#f5f5f5'},
//   {key: 'retro', label: 'Retro', color: '#FDEDDC'},
//   {key: 'minimal', label: 'Minimal', color: '#FFFFFF'},
//   {key: 'vibrant', label: 'Vibrant', color: '#1B0032'},
//   {key: 'nord', label: 'Nord', color: '#2E3440'},
//   {key: 'dracula', label: 'Dracula', color: '#282A36'},
//   {key: 'oneDark', label: 'One Dark', color: '#282C34'},
//   {key: 'solarizedLight', label: 'Solarized Light', color: '#FDF6E3'},
//   {key: 'solarizedDark', label: 'Solarized Dark', color: '#002B36'},
//   {key: 'pastelPop', label: 'Pastel Pop', color: '#FFE5EC'},
//   {key: 'cyberpunk', label: 'Cyberpunk', color: '#0D0221'},
//   {key: 'monokai', label: 'Monokai', color: '#272822'},
// ];

// export default function SettingsScreen({navigate}: Props) {
//   const {theme, mode, setSkin} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const systemScheme = useColorScheme();
//   const [modalVisible, setModalVisible] = useState(false);
//   const [notificationsEnabled, setNotificationsEnabled] = useState(false);
//   const [appVersion, setAppVersion] = useState('');
//   const colors = theme.colors;

//   // 👇 Home visibility preferences (Weather, Map, Quick Access, Saved Looks)
//   const {prefs, setVisible} = useHomePrefs();

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     enableRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       marginBottom: 20,
//       backgroundColor: theme.colors.surface,
//       borderRadius: tokens.borderRadius.md,
//       paddingHorizontal: 22,
//       paddingVertical: 14,
//     },
//     modalOverlay: {
//       flex: 1,
//       justifyContent: 'center',
//       padding: 24,
//       backgroundColor: 'rgba(0,0,0,0.5)',
//     },
//     modalContent: {
//       borderRadius: 12,
//       padding: 16,
//       width: '100%',
//       maxWidth: 720,
//       alignSelf: 'center',
//     },
//     optionRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingVertical: 12,
//       paddingHorizontal: 10,
//       borderRadius: 8,
//       marginBottom: 6,
//     },
//     colorSwatch: {
//       width: 16,
//       height: 16,
//       borderRadius: 4,
//       marginRight: 10,
//       borderWidth: tokens.borderWidth.md,
//       borderColor: '#ccc',
//     },
//     version: {
//       textAlign: 'center',
//       fontSize: 14,
//       opacity: 0.6,
//     },
//   });

//   const handleSendFeedback = async () => {
//     const appVersion = DeviceInfo.getVersion();
//     const buildNumber = DeviceInfo.getBuildNumber();
//     const systemName = DeviceInfo.getSystemName();
//     const systemVersion = DeviceInfo.getSystemVersion();
//     const model = DeviceInfo.getModel();

//     const subject = encodeURIComponent('StyliQ Feedback');
//     const body = encodeURIComponent(
//       `Please describe your issue or feedback below:\n\n\n\n---\nDevice: ${model}\nOS: ${systemName} ${systemVersion}\nApp Version: ${appVersion} (Build ${buildNumber})`,
//     );

//     const mailto = `mailto:feedback@styliq.app?subject=${subject}&body=${body}`;

//     const canOpen = await Linking.canOpenURL(mailto);
//     if (canOpen) {
//       Linking.openURL(mailto);
//     } else {
//       Alert.alert('Error', 'No email app available to send feedback.');
//     }
//   };

//   useEffect(() => {
//     const version = DeviceInfo.getVersion();
//     setAppVersion(version);
//   }, []);

//   const currentLabel =
//     skinOptions.find(s => s.key === mode)?.label || 'Unknown';

//   useEffect(() => {
//     const fetchNotificationSetting = async () => {
//       const value = await AsyncStorage.getItem('notificationsEnabled');
//       if (value !== null) {
//         setNotificationsEnabled(value === 'true');
//       }
//     };
//     fetchNotificationSetting();
//   }, []);

//   const handleSkinSelect = (skin: ThemeType | 'system') => {
//     if (skin === 'system') {
//       const fallback = systemScheme === 'dark' ? 'dark' : 'light';
//       setSkin(fallback as ThemeType);
//     } else {
//       setSkin(skin as ThemeType);
//     }
//     setModalVisible(false);
//   };

//   const handleToggleNotifications = async (value: boolean) => {
//     setNotificationsEnabled(value);
//     await AsyncStorage.setItem('notificationsEnabled', value.toString());
//     if (value) {
//       notifyOutfitForTomorrow();
//     } else {
//       const Notifier = PushNotification as any;
//       Notifier.cancelAllLocalNotifications?.();
//     }
//   };

//   const handleDeleteAccount = () => {
//     Alert.alert(
//       'Delete Your Data?',
//       'This will permanently delete all local wardrobe and style data. This cannot be undone.',
//       [
//         {text: 'Cancel', style: 'cancel'},
//         {
//           text: 'Delete',
//           style: 'destructive',
//           onPress: async () => {
//             await AsyncStorage.clear();
//             const Notifier = PushNotification as any;
//             Notifier.cancelAllLocalNotifications?.();
//             setNotificationsEnabled(false);
//             Alert.alert('Your data has been deleted.');
//           },
//         },
//       ],
//     );
//   };

//   const resetApp = () => {
//     Alert.alert('Reset All Data?', 'This will erase all local data.', [
//       {text: 'Cancel', style: 'cancel'},
//       {
//         text: 'Reset',
//         style: 'destructive',
//         onPress: async () => {
//           await AsyncStorage.clear();
//           const Notifier = PushNotification as any;
//           Notifier.cancelAllLocalNotifications?.();
//           setNotificationsEnabled(false);
//           Alert.alert('App reset complete.');
//         },
//       },
//     ]);
//   };

//   const sendFeedback = () => {
//     Linking.openURL('mailto:support@yourapp.com?subject=App Feedback');
//   };

//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Settings
//       </Text>

//       <View style={globalStyles.section}>
//         <View
//           style={[
//             globalStyles.backContainer,
//             {marginTop: 16, marginBottom: 36},
//           ]}>
//           <AppleTouchFeedback
//             onPress={() => navigate('Profile')}
//             hapticStyle="impactMedium"
//             style={{alignSelf: 'flex-start'}}>
//             <MaterialIcons name="arrow-back" size={24} color={colors.button3} />
//           </AppleTouchFeedback>
//           <Text style={[globalStyles.backText, {marginLeft: 12}]}>Back</Text>
//         </View>

//         <View style={globalStyles.centeredSection}>
//           <View style={[globalStyles.section2]}>
//             <Text
//               style={[globalStyles.sectionTitle, {color: colors.foreground}]}>
//               Notifications
//             </Text>

//             {/* 🔔 Notifications */}
//             <View
//               style={[
//                 styles.enableRow,
//                 globalStyles.cardStyles3,
//                 {borderWidth: tokens.borderWidth.md},
//               ]}>
//               <Text
//                 style={[globalStyles.menuLabel, {color: colors.foreground}]}>
//                 Enable Notifications
//               </Text>
//               <Switch
//                 value={notificationsEnabled}
//                 onValueChange={handleToggleNotifications}
//                 trackColor={{false: colors.muted, true: theme.colors.button1}}
//                 ios_backgroundColor={colors.muted}
//               />
//             </View>

//             {/* 🎛 Customize Home — toggle Home sections */}
//             <View style={[globalStyles.section2]}>
//               <Text
//                 style={[
//                   globalStyles.sectionTitle2,
//                   {color: colors.foreground},
//                 ]}>
//                 Customize Home Screen
//               </Text>

//               <View
//                 style={[
//                   globalStyles.menuContainer1,
//                   globalStyles.cardStyles3,
//                   {borderWidth: tokens.borderWidth.md},
//                 ]}>
//                 {(
//                   [
//                     ['weather', 'Weather'],
//                     ['locationMap', 'Location Map'],
//                     ['quickAccess', 'Quick Access'],
//                     ['topFashionStories', 'Top Fashion Stories'],
//                     ['recommendedItems', 'Recommended Items'],
//                     ['savedLooks', 'Saved Looks'],
//                   ] as const
//                 ).map(([key, label], idx, arr) => (
//                   <View
//                     key={key}
//                     style={[
//                       globalStyles.menuSection1,
//                       idx < arr.length - 1 && globalStyles.hrLine,
//                       {
//                         flexDirection: 'row',
//                         justifyContent: 'space-between',
//                         alignItems: 'center',
//                       },
//                     ]}>
//                     <Text
//                       style={[
//                         globalStyles.menuLabel,
//                         {color: colors.foreground},
//                       ]}>
//                       {label}
//                     </Text>
//                     <Switch
//                       value={(prefs as any)[key]}
//                       onValueChange={v =>
//                         setVisible(key as keyof typeof prefs, v)
//                       }
//                       trackColor={{
//                         false: colors.muted,
//                         true: theme.colors.button1,
//                       }}
//                       ios_backgroundColor={colors.muted}
//                     />
//                   </View>
//                 ))}
//               </View>
//             </View>

//             <View style={globalStyles.section2}>
//               {/* 🎨 Theme */}
//               <Text
//                 style={[globalStyles.sectionTitle, {color: colors.foreground}]}>
//                 App Color Theme
//               </Text>

//               {/* Theme selection */}
//               <View
//                 style={[
//                   globalStyles.menuSection2,
//                   globalStyles.cardStyles3,
//                   {
//                     backgroundColor: colors.surface,
//                     borderWidth: tokens.borderWidth.md,
//                   },
//                 ]}>
//                 <AppleTouchFeedback
//                   onPress={() => setModalVisible(true)}
//                   hapticStyle="impactMedium"
//                   style={[{backgroundColor: colors.surface}]}>
//                   <Text
//                     style={[
//                       globalStyles.menuLabel,
//                       {color: colors.foreground},
//                     ]}>
//                     {currentLabel}
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>

//             <View>
//               <Text
//                 style={[
//                   globalStyles.sectionTitle2,
//                   {color: colors.foreground},
//                 ]}>
//                 Profile and Data
//               </Text>
//               <View
//                 style={[
//                   globalStyles.menuContainer1,
//                   globalStyles.cardStyles3,
//                   {borderWidth: tokens.borderWidth.md},
//                 ]}>
//                 {/* Profile Information */}
//                 <AppleTouchFeedback
//                   onPress={() => navigate('PersonalInformation')}
//                   hapticStyle="impactLight"
//                   style={[globalStyles.menuSection1, globalStyles.hrLine]}>
//                   <Text
//                     style={[
//                       globalStyles.menuLabel,
//                       {color: colors.foreground},
//                     ]}>
//                     Profile Information
//                   </Text>
//                 </AppleTouchFeedback>

//                 {/* Reset App Data */}
//                 <AppleTouchFeedback
//                   onPress={resetApp}
//                   hapticStyle="impactHeavy"
//                   style={[globalStyles.menuSection1, globalStyles.hrLine]}>
//                   <Text style={[globalStyles.menuLabel, {color: colors.error}]}>
//                     Reset App Data
//                   </Text>
//                 </AppleTouchFeedback>

//                 {/* Delete My Data */}
//                 <AppleTouchFeedback
//                   onPress={handleDeleteAccount}
//                   hapticStyle="impactHeavy"
//                   style={[globalStyles.menuSection1]}>
//                   <Text style={[globalStyles.menuLabel, {color: colors.error}]}>
//                     Delete My Data
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>

//             {/* ───────── Help & Support (Apple-style placement) ───────── */}
//             <View style={[globalStyles.section2]}>
//               <Text
//                 style={[
//                   globalStyles.sectionTitle2,
//                   {color: colors.foreground, marginTop: 24},
//                 ]}>
//                 Help & Support
//               </Text>

//               <View
//                 style={[
//                   globalStyles.menuContainer1,
//                   globalStyles.cardStyles3,
//                   {borderWidth: tokens.borderWidth.md},
//                 ]}>
//                 {/* Contact Support */}
//                 <AppleTouchFeedback
//                   onPress={() => navigate('ContactScreen')}
//                   hapticStyle="impactMedium"
//                   style={[globalStyles.menuSection1, globalStyles.hrLine]}>
//                   <Text
//                     style={[
//                       globalStyles.menuLabel,
//                       {color: colors.foreground},
//                     ]}>
//                     Contact Support
//                   </Text>
//                 </AppleTouchFeedback>

//                 {/* FAQ & Help */}
//                 <AppleTouchFeedback
//                   onPress={() => Linking.openURL('https://styliq.app/faq')}
//                   hapticStyle="impactLight"
//                   style={[globalStyles.menuSection1, globalStyles.hrLine]}>
//                   <Text
//                     style={[
//                       globalStyles.menuLabel,
//                       {color: colors.foreground},
//                     ]}>
//                     FAQ & Help
//                   </Text>
//                 </AppleTouchFeedback>

//                 {/* Send Feedback */}
//                 <AppleTouchFeedback
//                   onPress={() => navigate('FeedbackScreen')}
//                   hapticStyle="impactMedium"
//                   style={[globalStyles.menuSection1, globalStyles.hrLine]}>
//                   <Text
//                     style={[globalStyles.menuLabel, {color: colors.primary}]}>
//                     Send Feedback
//                   </Text>
//                 </AppleTouchFeedback>

//                 {/* About StylHelpr */}
//                 <AppleTouchFeedback
//                   onPress={() => navigate('AboutScreen')}
//                   hapticStyle="impactLight"
//                   style={[globalStyles.menuSection1]}>
//                   <Text
//                     style={[
//                       globalStyles.menuLabel,
//                       {color: colors.foreground},
//                     ]}>
//                     About StylHelpr
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>

//             {/* ───────── Legal ───────── */}
//             <View style={[globalStyles.section2]}>
//               <Text
//                 style={[
//                   globalStyles.sectionTitle2,
//                   {color: colors.foreground},
//                 ]}>
//                 Legal
//               </Text>

//               <View
//                 style={[
//                   globalStyles.menuContainer1,
//                   globalStyles.cardStyles3,
//                   {borderWidth: tokens.borderWidth.md},
//                 ]}>
//                 {/* Privacy Policy */}
//                 <AppleTouchFeedback
//                   onPress={() => Linking.openURL('https://styliq.app/privacy')}
//                   hapticStyle="impactLight"
//                   style={[globalStyles.menuSection1, globalStyles.hrLine]}>
//                   <Text
//                     style={[
//                       globalStyles.menuLabel,
//                       {color: colors.foreground},
//                     ]}>
//                     Privacy Policy
//                   </Text>
//                 </AppleTouchFeedback>

//                 {/* Terms of Service */}
//                 <AppleTouchFeedback
//                   onPress={() => Linking.openURL('https://styliq.app/terms')}
//                   hapticStyle="impactLight"
//                   style={[globalStyles.menuSection1, globalStyles.hrLine]}>
//                   <Text
//                     style={[
//                       globalStyles.menuLabel,
//                       {color: colors.foreground},
//                     ]}>
//                     Terms of Service
//                   </Text>
//                 </AppleTouchFeedback>

//                 {/* Open Source Licenses */}
//                 <AppleTouchFeedback
//                   onPress={() => {
//                     /* add logic if needed */
//                   }}
//                   hapticStyle="impactLight"
//                   style={[globalStyles.menuSection1]}>
//                   <Text
//                     style={[
//                       globalStyles.menuLabel,
//                       {color: colors.foreground},
//                     ]}>
//                     Open Source Licenses
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>

//             {/* 📱 App Version */}
//             <Text
//               style={[
//                 globalStyles.title,
//                 {marginTop: 8, textAlign: 'center', color: colors.foreground},
//               ]}>
//               App Version: {appVersion}
//             </Text>

//             {/* Theme Modal */}
//             <Modal visible={modalVisible} animationType="slide" transparent>
//               <TouchableOpacity
//                 style={styles.modalOverlay}
//                 activeOpacity={1}
//                 onPressOut={() => setModalVisible(false)}>
//                 <View
//                   style={[
//                     styles.modalContent,
//                     {backgroundColor: colors.surface},
//                   ]}>
//                   {skinOptions.map(option => (
//                     <TouchableOpacity
//                       key={option.key}
//                       onPress={() => handleSkinSelect(option.key as ThemeType)}
//                       style={[
//                         styles.optionRow,
//                         {
//                           backgroundColor:
//                             mode === option.key
//                               ? colors.primary
//                               : 'transparent',
//                         },
//                       ]}>
//                       <View
//                         style={[
//                           styles.colorSwatch,
//                           {backgroundColor: option.color},
//                         ]}
//                       />
//                       <Text
//                         style={{
//                           color:
//                             mode === option.key
//                               ? colors.background
//                               : colors.foreground,
//                         }}>
//                         {option.label}
//                       </Text>
//                     </TouchableOpacity>
//                   ))}
//                 </View>
//               </TouchableOpacity>
//             </Modal>
//           </View>
//         </View>
//       </View>
//     </ScrollView>
//   );
// }

///////////////////

// // apps/mobile/src/screens/SettingsScreen.tsx
// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   ScrollView,
//   Modal,
//   Switch,
//   useColorScheme,
//   Alert,
//   Linking,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import type {ThemeType} from '../context/ThemeContext';
// import {notifyOutfitForTomorrow} from '../utils/notifyOutfitForTomorrow';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import PushNotification from 'react-native-push-notification';
// import DeviceInfo from 'react-native-device-info';
// // import BackHeader from '../components/Backheader/Backheader'; // (unused)
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {useHomePrefs} from '../hooks/useHomePrefs';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
// };

// const skinOptions: {
//   key: ThemeType | 'system';
//   label: string;
//   color: string;
// }[] = [
//   {key: 'system', label: 'System Default', color: '#888888'},
//   {key: 'modernDark', label: 'Modern Dark', color: '#00050e'},
//   {key: 'modernDark2', label: 'Modern Dark 2', color: '#121212'},
//   {key: 'modernLight', label: 'Modern Light', color: '#f5f5f5'},
//   {key: 'retro', label: 'Retro', color: '#FDEDDC'},
//   {key: 'minimal', label: 'Minimal', color: '#FFFFFF'},
//   {key: 'vibrant', label: 'Vibrant', color: '#1B0032'},
//   {key: 'nord', label: 'Nord', color: '#2E3440'},
//   {key: 'dracula', label: 'Dracula', color: '#282A36'},
//   {key: 'oneDark', label: 'One Dark', color: '#282C34'},
//   {key: 'solarizedLight', label: 'Solarized Light', color: '#FDF6E3'},
//   {key: 'solarizedDark', label: 'Solarized Dark', color: '#002B36'},
//   {key: 'pastelPop', label: 'Pastel Pop', color: '#FFE5EC'},
//   {key: 'cyberpunk', label: 'Cyberpunk', color: '#0D0221'},
//   {key: 'monokai', label: 'Monokai', color: '#272822'},
// ];

// export default function SettingsScreen({navigate}: Props) {
//   const {theme, mode, setSkin} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const systemScheme = useColorScheme();
//   const [modalVisible, setModalVisible] = useState(false);
//   const [notificationsEnabled, setNotificationsEnabled] = useState(false);
//   const [appVersion, setAppVersion] = useState('');
//   const colors = theme.colors;

//   // 👇 Home visibility preferences (Weather, Map, Quick Access, Saved Looks)
//   const {prefs, setVisible} = useHomePrefs();

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     enableRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       marginBottom: 20,
//       backgroundColor: theme.colors.surface,
//       borderRadius: tokens.borderRadius.md,
//       paddingHorizontal: 22,
//       paddingVertical: 14,
//     },
//     modalOverlay: {
//       flex: 1,
//       justifyContent: 'center',
//       padding: 24,
//       backgroundColor: 'rgba(0,0,0,0.5)',
//     },
//     modalContent: {
//       borderRadius: 12,
//       padding: 16,
//       width: '100%',
//       maxWidth: 720,
//       alignSelf: 'center',
//     },
//     optionRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingVertical: 12,
//       paddingHorizontal: 10,
//       borderRadius: 8,
//       marginBottom: 6,
//     },
//     colorSwatch: {
//       width: 16,
//       height: 16,
//       borderRadius: 4,
//       marginRight: 10,
//       borderWidth: tokens.borderWidth.md,
//       borderColor: '#ccc',
//     },
//     version: {
//       textAlign: 'center',
//       fontSize: 14,
//       opacity: 0.6,
//     },
//   });

//   const handleSendFeedback = async () => {
//     const appVersion = DeviceInfo.getVersion();
//     const buildNumber = DeviceInfo.getBuildNumber();
//     const systemName = DeviceInfo.getSystemName();
//     const systemVersion = DeviceInfo.getSystemVersion();
//     const model = DeviceInfo.getModel();

//     const subject = encodeURIComponent('StyliQ Feedback');
//     const body = encodeURIComponent(
//       `Please describe your issue or feedback below:\n\n\n\n---\nDevice: ${model}\nOS: ${systemName} ${systemVersion}\nApp Version: ${appVersion} (Build ${buildNumber})`,
//     );

//     const mailto = `mailto:feedback@styliq.app?subject=${subject}&body=${body}`;

//     const canOpen = await Linking.canOpenURL(mailto);
//     if (canOpen) {
//       Linking.openURL(mailto);
//     } else {
//       Alert.alert('Error', 'No email app available to send feedback.');
//     }
//   };

//   useEffect(() => {
//     const version = DeviceInfo.getVersion();
//     setAppVersion(version);
//   }, []);

//   const currentLabel =
//     skinOptions.find(s => s.key === mode)?.label || 'Unknown';

//   useEffect(() => {
//     const fetchNotificationSetting = async () => {
//       const value = await AsyncStorage.getItem('notificationsEnabled');
//       if (value !== null) {
//         setNotificationsEnabled(value === 'true');
//       }
//     };
//     fetchNotificationSetting();
//   }, []);

//   const handleSkinSelect = (skin: ThemeType | 'system') => {
//     if (skin === 'system') {
//       const fallback = systemScheme === 'dark' ? 'dark' : 'light';
//       setSkin(fallback as ThemeType);
//     } else {
//       setSkin(skin as ThemeType);
//     }
//     setModalVisible(false);
//   };

//   const handleToggleNotifications = async (value: boolean) => {
//     setNotificationsEnabled(value);
//     await AsyncStorage.setItem('notificationsEnabled', value.toString());
//     if (value) {
//       notifyOutfitForTomorrow();
//     } else {
//       const Notifier = PushNotification as any;
//       Notifier.cancelAllLocalNotifications?.();
//     }
//   };

//   const handleDeleteAccount = () => {
//     Alert.alert(
//       'Delete Your Data?',
//       'This will permanently delete all local wardrobe and style data. This cannot be undone.',
//       [
//         {text: 'Cancel', style: 'cancel'},
//         {
//           text: 'Delete',
//           style: 'destructive',
//           onPress: async () => {
//             await AsyncStorage.clear();
//             const Notifier = PushNotification as any;
//             Notifier.cancelAllLocalNotifications?.();
//             setNotificationsEnabled(false);
//             Alert.alert('Your data has been deleted.');
//           },
//         },
//       ],
//     );
//   };

//   const resetApp = () => {
//     Alert.alert('Reset All Data?', 'This will erase all local data.', [
//       {text: 'Cancel', style: 'cancel'},
//       {
//         text: 'Reset',
//         style: 'destructive',
//         onPress: async () => {
//           await AsyncStorage.clear();
//           const Notifier = PushNotification as any;
//           Notifier.cancelAllLocalNotifications?.();
//           setNotificationsEnabled(false);
//           Alert.alert('App reset complete.');
//         },
//       },
//     ]);
//   };

//   const sendFeedback = () => {
//     Linking.openURL('mailto:support@yourapp.com?subject=App Feedback');
//   };

//   return (
//     <ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
//         Settings
//       </Text>

//       <View style={globalStyles.section}>
//         <View
//           style={[
//             globalStyles.backContainer,
//             {marginTop: 16, marginBottom: 36},
//           ]}>
//           <AppleTouchFeedback
//             onPress={() => navigate('Profile')}
//             hapticStyle="impactMedium"
//             style={{alignSelf: 'flex-start'}}>
//             <MaterialIcons name="arrow-back" size={24} color={colors.button3} />
//           </AppleTouchFeedback>
//           <Text style={[globalStyles.backText, {marginLeft: 12}]}>Back</Text>
//         </View>

//         <View style={globalStyles.centeredSection}>
//           <View style={[globalStyles.section2]}>
//             <Text
//               style={[globalStyles.sectionTitle, {color: colors.foreground}]}>
//               Notifications
//             </Text>

//             {/* 🔔 Notifications */}
//             <View
//               style={[
//                 styles.enableRow,
//                 globalStyles.cardStyles3,
//                 {borderWidth: tokens.borderWidth.md},
//               ]}>
//               <Text
//                 style={[globalStyles.menuLabel, {color: colors.foreground}]}>
//                 Enable Notifications
//               </Text>
//               <Switch
//                 value={notificationsEnabled}
//                 onValueChange={handleToggleNotifications}
//                 trackColor={{false: colors.muted, true: theme.colors.button1}}
//                 ios_backgroundColor={colors.muted}
//               />
//             </View>

//             {/* 🎛 Customize Home — toggle Home sections */}
//             <View style={[globalStyles.section2]}>
//               <Text
//                 style={[
//                   globalStyles.sectionTitle2,
//                   {color: colors.foreground},
//                 ]}>
//                 Customize Home Screen
//               </Text>

//               <View
//                 style={[
//                   globalStyles.menuContainer1,
//                   globalStyles.cardStyles3,
//                   {borderWidth: tokens.borderWidth.md},
//                 ]}>
//                 {(
//                   [
//                     ['weather', 'Weather'],
//                     ['locationMap', 'Location Map'],
//                     ['quickAccess', 'Quick Access'],
//                     ['topFashionStories', 'Top Fashion Stories'],
//                     ['recommendedItems', 'Recommended Items'],
//                     ['savedLooks', 'Saved Looks'],
//                   ] as const
//                 ).map(([key, label], idx, arr) => (
//                   <View
//                     key={key}
//                     style={[
//                       globalStyles.menuSection1,
//                       idx < arr.length - 1 && globalStyles.hrLine,
//                       {
//                         flexDirection: 'row',
//                         justifyContent: 'space-between',
//                         alignItems: 'center',
//                       },
//                     ]}>
//                     <Text
//                       style={[
//                         globalStyles.menuLabel,
//                         {color: colors.foreground},
//                       ]}>
//                       {label}
//                     </Text>
//                     <Switch
//                       value={(prefs as any)[key]}
//                       onValueChange={v =>
//                         setVisible(key as keyof typeof prefs, v)
//                       }
//                       trackColor={{
//                         false: colors.muted,
//                         true: theme.colors.button1,
//                       }}
//                       ios_backgroundColor={colors.muted}
//                     />
//                   </View>
//                 ))}
//               </View>
//             </View>

//             <View style={globalStyles.section2}>
//               {/* 🎨 Theme */}
//               <Text
//                 style={[globalStyles.sectionTitle, {color: colors.foreground}]}>
//                 App Color Theme
//               </Text>

//               {/* Theme selection */}
//               <View
//                 style={[
//                   globalStyles.menuSection2,
//                   globalStyles.cardStyles3,
//                   {
//                     backgroundColor: colors.surface,
//                     borderWidth: tokens.borderWidth.md,
//                   },
//                 ]}>
//                 <AppleTouchFeedback
//                   onPress={() => setModalVisible(true)}
//                   hapticStyle="impactMedium"
//                   style={[{backgroundColor: colors.surface}]}>
//                   <Text
//                     style={[
//                       globalStyles.menuLabel,
//                       {color: colors.foreground},
//                     ]}>
//                     {currentLabel}
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>

//             <View>
//               <Text
//                 style={[
//                   globalStyles.sectionTitle2,
//                   {color: colors.foreground},
//                 ]}>
//                 Profile and Data
//               </Text>
//               <View
//                 style={[
//                   globalStyles.menuContainer1,
//                   globalStyles.cardStyles3,
//                   {borderWidth: tokens.borderWidth.md},
//                 ]}>
//                 {/* Profile Information */}
//                 <AppleTouchFeedback
//                   onPress={() => navigate('PersonalInformation')}
//                   hapticStyle="impactLight"
//                   style={[globalStyles.menuSection1, globalStyles.hrLine]}>
//                   <Text
//                     style={[
//                       globalStyles.menuLabel,
//                       {color: colors.foreground},
//                     ]}>
//                     Profile Information
//                   </Text>
//                 </AppleTouchFeedback>

//                 {/* Reset App Data */}
//                 <AppleTouchFeedback
//                   onPress={resetApp}
//                   hapticStyle="impactHeavy"
//                   style={[globalStyles.menuSection1, globalStyles.hrLine]}>
//                   <Text style={[globalStyles.menuLabel, {color: colors.error}]}>
//                     Reset App Data
//                   </Text>
//                 </AppleTouchFeedback>

//                 {/* Delete My Data */}
//                 <AppleTouchFeedback
//                   onPress={handleDeleteAccount}
//                   hapticStyle="impactHeavy"
//                   style={[globalStyles.menuSection1]}>
//                   <Text style={[globalStyles.menuLabel, {color: colors.error}]}>
//                     Delete My Data
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>

//             {/* ───────── Help & Support (Apple-style placement) ───────── */}
//             <View style={[globalStyles.section2]}>
//               <Text
//                 style={[
//                   globalStyles.sectionTitle2,
//                   {color: colors.foreground, marginTop: 24},
//                 ]}>
//                 Help & Support
//               </Text>

//               <View
//                 style={[
//                   globalStyles.menuContainer1,
//                   globalStyles.cardStyles3,
//                   {borderWidth: tokens.borderWidth.md},
//                 ]}>
//                 {/* Contact Support */}
//                 <AppleTouchFeedback
//                   onPress={() => navigate('ContactScreen')}
//                   hapticStyle="impactMedium"
//                   style={[globalStyles.menuSection1, globalStyles.hrLine]}>
//                   <Text
//                     style={[
//                       globalStyles.menuLabel,
//                       {color: colors.foreground},
//                     ]}>
//                     Contact Support
//                   </Text>
//                 </AppleTouchFeedback>

//                 {/* FAQ & Help */}
//                 <AppleTouchFeedback
//                   onPress={() => Linking.openURL('https://styliq.app/faq')}
//                   hapticStyle="impactLight"
//                   style={[globalStyles.menuSection1, globalStyles.hrLine]}>
//                   <Text
//                     style={[
//                       globalStyles.menuLabel,
//                       {color: colors.foreground},
//                     ]}>
//                     FAQ & Help
//                   </Text>
//                 </AppleTouchFeedback>

//                 {/* Send Feedback */}
//                 <AppleTouchFeedback
//                   onPress={() => navigate('FeedbackScreen')}
//                   hapticStyle="impactLight"
//                   style={[globalStyles.menuSection1, globalStyles.hrLine]}>
//                   <Text
//                     style={[globalStyles.menuLabel, {color: colors.primary}]}>
//                     Send Feedback
//                   </Text>
//                 </AppleTouchFeedback>

//                 {/* About StylHelpr */}
//                 <AppleTouchFeedback
//                   onPress={() => navigate('AboutScreen')}
//                   hapticStyle="impactLight"
//                   style={[globalStyles.menuSection1]}>
//                   <Text
//                     style={[
//                       globalStyles.menuLabel,
//                       {color: colors.foreground},
//                     ]}>
//                     About StylHelpr
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>

//             {/* ───────── Legal ───────── */}
//             <View style={[globalStyles.section2]}>
//               <Text
//                 style={[
//                   globalStyles.sectionTitle2,
//                   {color: colors.foreground, marginTop: 24},
//                 ]}>
//                 Legal
//               </Text>

//               <View
//                 style={[
//                   globalStyles.menuContainer1,
//                   globalStyles.cardStyles3,
//                   {borderWidth: tokens.borderWidth.md},
//                 ]}>
//                 {/* Privacy Policy */}
//                 <AppleTouchFeedback
//                   onPress={() => Linking.openURL('https://styliq.app/privacy')}
//                   hapticStyle="impactLight"
//                   style={[globalStyles.menuSection1, globalStyles.hrLine]}>
//                   <Text
//                     style={[
//                       globalStyles.menuLabel,
//                       {color: colors.foreground},
//                     ]}>
//                     Privacy Policy
//                   </Text>
//                 </AppleTouchFeedback>

//                 {/* Open Source Licenses */}
//                 <AppleTouchFeedback
//                   onPress={() => {
//                     /* add logic if needed */
//                   }}
//                   hapticStyle="impactLight"
//                   style={[globalStyles.menuSection1]}>
//                   <Text
//                     style={[
//                       globalStyles.menuLabel,
//                       {color: colors.foreground},
//                     ]}>
//                     Open Source Licenses
//                   </Text>
//                 </AppleTouchFeedback>
//               </View>
//             </View>

//             {/* 📱 App Version */}
//             <Text
//               style={[
//                 globalStyles.title,
//                 {marginTop: 8, textAlign: 'center', color: colors.foreground},
//               ]}>
//               App Version: {appVersion}
//             </Text>

//             {/* Theme Modal */}
//             <Modal visible={modalVisible} animationType="slide" transparent>
//               <TouchableOpacity
//                 style={styles.modalOverlay}
//                 activeOpacity={1}
//                 onPressOut={() => setModalVisible(false)}>
//                 <View
//                   style={[
//                     styles.modalContent,
//                     {backgroundColor: colors.surface},
//                   ]}>
//                   {skinOptions.map(option => (
//                     <TouchableOpacity
//                       key={option.key}
//                       onPress={() => handleSkinSelect(option.key as ThemeType)}
//                       style={[
//                         styles.optionRow,
//                         {
//                           backgroundColor:
//                             mode === option.key
//                               ? colors.primary
//                               : 'transparent',
//                         },
//                       ]}>
//                       <View
//                         style={[
//                           styles.colorSwatch,
//                           {backgroundColor: option.color},
//                         ]}
//                       />
//                       <Text
//                         style={{
//                           color:
//                             mode === option.key
//                               ? colors.background
//                               : colors.foreground,
//                         }}>
//                         {option.label}
//                       </Text>
//                     </TouchableOpacity>
//                   ))}
//                 </View>
//               </TouchableOpacity>
//             </Modal>
//           </View>
//         </View>
//       </View>
//     </ScrollView>
//   );
// }
