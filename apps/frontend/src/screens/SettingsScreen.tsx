import React, {useState, useEffect} from 'react';
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
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import type {ThemeType} from '../context/ThemeContext';
import {notifyOutfitForTomorrow} from '../utils/notifyOutfitForTomorrow';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotification from 'react-native-push-notification';
import DeviceInfo from 'react-native-device-info';

const skinOptions: {
  key: ThemeType | 'system';
  label: string;
  color: string;
}[] = [
  {key: 'system', label: 'System Default', color: '#888888'},
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

export default function SettingsScreen() {
  const {theme, mode, setSkin} = useAppTheme();
  const systemScheme = useColorScheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [appVersion, setAppVersion] = useState('');
  const colors = theme.colors;

  const handleSendFeedback = async () => {
    const appVersion = DeviceInfo.getVersion();
    const buildNumber = DeviceInfo.getBuildNumber();
    const systemName = DeviceInfo.getSystemName();
    const systemVersion = DeviceInfo.getSystemVersion();
    const model = DeviceInfo.getModel();

    const subject = encodeURIComponent('StyliQ Feedback');
    const body = encodeURIComponent(
      `Please describe your issue or feedback below:\n\n\n\n---\nDevice: ${model}\nOS: ${systemName} ${systemVersion}\nApp Version: ${appVersion} (Build ${buildNumber})`,
    );

    const mailto = `mailto:feedback@styliq.app?subject=${subject}&body=${body}`;

    const canOpen = await Linking.canOpenURL(mailto);
    if (canOpen) {
      Linking.openURL(mailto);
    } else {
      Alert.alert('Error', 'No email app available to send feedback.');
    }
  };

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
    if (skin === 'system') {
      const fallback = systemScheme === 'dark' ? 'dark' : 'light';
      setSkin(fallback);
    } else {
      setSkin(skin);
    }
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

  const sendFeedback = () => {
    Linking.openURL('mailto:support@yourapp.com?subject=App Feedback');
  };

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: colors.background}]}
      contentContainerStyle={{paddingBottom: 40}}>
      <Text style={[styles.title, {color: colors.primary}]}>⚙️ Settings</Text>

      {/* 🔔 Notifications */}
      <View style={styles.row}>
        <Text style={[styles.label, {color: colors.foreground}]}>
          Enable Notifications
        </Text>
        <Switch
          value={notificationsEnabled}
          onValueChange={handleToggleNotifications}
        />
      </View>

      {/* 🎨 Theme */}
      <Text style={[styles.label, {color: colors.foreground}]}>
        App Color Theme
      </Text>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={[styles.selectButton, {backgroundColor: colors.surface}]}>
        <Text style={{color: colors.foreground}}>{currentLabel}</Text>
      </TouchableOpacity>

      {/* 🧼 Reset */}
      <TouchableOpacity onPress={resetApp} style={styles.actionButton}>
        <Text style={[styles.actionText, {color: colors.error}]}>
          Reset App Data
        </Text>
      </TouchableOpacity>

      {/* ❌ Delete Local Data */}
      <TouchableOpacity
        onPress={handleDeleteAccount}
        style={styles.actionButton}>
        <Text style={[styles.actionText, {color: colors.error}]}>
          Delete My Data
        </Text>
      </TouchableOpacity>

      {/* 📖 Support / FAQ Links */}
      <TouchableOpacity
        onPress={() => Linking.openURL('https://styliq.app/privacy')}
        style={styles.actionButton}>
        <Text style={[styles.actionText, {color: colors.foreground}]}>
          Privacy Policy
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => Linking.openURL('https://styliq.app/faq')}
        style={styles.actionButton}>
        <Text style={[styles.actionText, {color: colors.foreground}]}>
          FAQ & Help
        </Text>
      </TouchableOpacity>

      {/* 📨 Feedback */}
      <TouchableOpacity onPress={handleSendFeedback}>
        <Text style={[styles.label, {color: colors.primary, marginTop: 12}]}>
          Send Feedback
        </Text>
      </TouchableOpacity>

      {/* 📚 Licenses */}
      <TouchableOpacity style={styles.actionButton}>
        <Text style={[styles.actionText, {color: colors.foreground}]}>
          Open Source Licenses
        </Text>
      </TouchableOpacity>

      {/* 📱 App Version */}
      <Text style={[styles.version, {color: colors.foreground}]}>
        App Version: {appVersion}
      </Text>

      {/* Theme Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setModalVisible(false)}>
          <View
            style={[styles.modalContent, {backgroundColor: colors.surface}]}>
            {skinOptions.map(option => (
              <TouchableOpacity
                key={option.key}
                onPress={() => handleSkinSelect(option.key as ThemeType)}
                style={[
                  styles.optionRow,
                  {
                    backgroundColor:
                      mode === option.key ? colors.primary : 'transparent',
                  },
                ]}>
                <View
                  style={[styles.colorSwatch, {backgroundColor: option.color}]}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: 20},
  title: {fontSize: 24, fontWeight: 'bold', marginBottom: 20},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {fontSize: 16, marginBottom: 10},
  selectButton: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 30,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {borderRadius: 12, padding: 16},
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
    borderWidth: 1,
    borderColor: '#ccc',
  },
  actionButton: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#4444',
  },
  actionText: {
    fontSize: 16,
  },
  version: {
    marginTop: 30,
    textAlign: 'center',
    fontSize: 14,
    opacity: 0.6,
  },
});

//////////////

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

// export default function SettingsScreen() {
//   const {theme, mode, setSkin} = useAppTheme();
//   const systemScheme = useColorScheme();
//   const [modalVisible, setModalVisible] = useState(false);
//   const [notificationsEnabled, setNotificationsEnabled] = useState(false);
//   const [appVersion, setAppVersion] = useState('');
//   const colors = theme.colors;

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
//       setSkin(fallback);
//     } else {
//       setSkin(skin);
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
//       style={[styles.container, {backgroundColor: colors.background}]}
//       contentContainerStyle={{paddingBottom: 40}}>
//       <Text style={[styles.title, {color: colors.primary}]}>⚙️ Settings</Text>

//       {/* 🔔 Notifications */}
//       <View style={styles.row}>
//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Enable Notifications
//         </Text>
//         <Switch
//           value={notificationsEnabled}
//           onValueChange={handleToggleNotifications}
//         />
//       </View>

//       {/* 🎨 Theme */}
//       <Text style={[styles.label, {color: colors.foreground}]}>
//         App Color Theme
//       </Text>
//       <TouchableOpacity
//         onPress={() => setModalVisible(true)}
//         style={[styles.selectButton, {backgroundColor: colors.surface}]}>
//         <Text style={{color: colors.foreground}}>{currentLabel}</Text>
//       </TouchableOpacity>

//       {/* 🧼 Reset */}
//       <TouchableOpacity onPress={resetApp} style={styles.actionButton}>
//         <Text style={[styles.actionText, {color: colors.error}]}>
//           Reset App Data
//         </Text>
//       </TouchableOpacity>

//       {/* 📨 Feedback */}
//       {/* <TouchableOpacity onPress={handleSendFeedback}>
//         <Text style={[styles.label, {color: colors.primary}]}>
//           Send Feedback
//         </Text>
//       </TouchableOpacity> */}

//       {/* 📚 Licenses */}
//       {/* <TouchableOpacity style={styles.actionButton}>
//         <Text style={[styles.actionText, {color: colors.foreground}]}>
//           Open Source Licenses
//         </Text>
//       </TouchableOpacity> */}

//       {/* 📱 App Version */}
//       <Text style={[styles.version, {color: colors.foreground}]}>
//         App Version: {appVersion}
//       </Text>

//       {/* Theme Modal */}
//       <Modal visible={modalVisible} animationType="slide" transparent>
//         <TouchableOpacity
//           style={styles.modalOverlay}
//           activeOpacity={1}
//           onPressOut={() => setModalVisible(false)}>
//           <View
//             style={[styles.modalContent, {backgroundColor: colors.surface}]}>
//             {skinOptions.map(option => (
//               <TouchableOpacity
//                 key={option.key}
//                 onPress={() => handleSkinSelect(option.key as ThemeType)}
//                 style={[
//                   styles.optionRow,
//                   {
//                     backgroundColor:
//                       mode === option.key ? colors.primary : 'transparent',
//                   },
//                 ]}>
//                 <View
//                   style={[styles.colorSwatch, {backgroundColor: option.color}]}
//                 />
//                 <Text
//                   style={{
//                     color:
//                       mode === option.key
//                         ? colors.background
//                         : colors.foreground,
//                   }}>
//                   {option.label}
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         </TouchableOpacity>
//       </Modal>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1, padding: 20},
//   title: {fontSize: 24, fontWeight: 'bold', marginBottom: 20},
//   row: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 20,
//   },
//   label: {fontSize: 16, marginBottom: 10},
//   selectButton: {
//     padding: 12,
//     borderRadius: 8,
//     marginBottom: 30,
//   },
//   modalOverlay: {
//     flex: 1,
//     justifyContent: 'center',
//     padding: 24,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//   },
//   modalContent: {borderRadius: 12, padding: 16},
//   optionRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 12,
//     paddingHorizontal: 10,
//     borderRadius: 8,
//     marginBottom: 6,
//   },
//   colorSwatch: {
//     width: 16,
//     height: 16,
//     borderRadius: 4,
//     marginRight: 10,
//     borderWidth: 1,
//     borderColor: '#ccc',
//   },
//   actionButton: {
//     paddingVertical: 12,
//     borderBottomWidth: 1,
//     borderColor: '#4444',
//   },
//   actionText: {
//     fontSize: 16,
//   },
//   version: {
//     marginTop: 30,
//     textAlign: 'center',
//     fontSize: 14,
//     opacity: 0.6,
//   },
// });

///////////

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
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import type {ThemeType} from '../context/ThemeContext';
// import {notifyOutfitForTomorrow} from '../utils/notifyOutfitForTomorrow';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import PushNotification from 'react-native-push-notification';

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

// export default function SettingsScreen() {
//   const {theme, mode, setSkin} = useAppTheme();
//   const systemScheme = useColorScheme();
//   const [modalVisible, setModalVisible] = useState(false);
//   const [notificationsEnabled, setNotificationsEnabled] = useState(false);
//   const colors = theme.colors;

//   const currentLabel =
//     skinOptions.find(s => s.key === mode)?.label || 'Unknown';

//   const handleSkinSelect = (skin: ThemeType | 'system') => {
//     if (skin === 'system') {
//       const fallback = systemScheme === 'dark' ? 'dark' : 'light';
//       setSkin(fallback);
//     } else {
//       setSkin(skin);
//     }
//     setModalVisible(false);
//   };

//   useEffect(() => {
//     AsyncStorage.getItem('notificationsEnabled').then(value => {
//       if (value !== null) {
//         setNotificationsEnabled(value === 'true');
//       }
//     });
//   }, []);

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

//   return (
//     <ScrollView
//       style={[styles.container, {backgroundColor: colors.background}]}
//       contentContainerStyle={{paddingBottom: 40}}>
//       <Text style={[styles.title, {color: colors.primary}]}>⚙️ Settings</Text>

//       {/* 🔔 Notifications toggle */}
//       <View style={styles.row}>
//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Enable Notifications
//         </Text>
//         <Switch
//           value={notificationsEnabled}
//           onValueChange={handleToggleNotifications}
//         />
//       </View>

//       {/* 🎨 Skin select */}
//       <Text style={[styles.label, {color: colors.foreground}]}>
//         App Color Theme
//       </Text>
//       <TouchableOpacity
//         onPress={() => setModalVisible(true)}
//         style={[styles.selectButton, {backgroundColor: colors.surface}]}>
//         <Text style={{color: colors.foreground}}>{currentLabel}</Text>
//       </TouchableOpacity>

//       {/* 🔽 Skin dropdown modal */}
//       <Modal visible={modalVisible} animationType="slide" transparent>
//         <TouchableOpacity
//           style={styles.modalOverlay}
//           activeOpacity={1}
//           onPressOut={() => setModalVisible(false)}>
//           <View
//             style={[styles.modalContent, {backgroundColor: colors.surface}]}>
//             {skinOptions.map(option => (
//               <TouchableOpacity
//                 key={option.key}
//                 onPress={() => handleSkinSelect(option.key as ThemeType)}
//                 style={[
//                   styles.optionRow,
//                   {
//                     backgroundColor:
//                       mode === option.key ? colors.primary : 'transparent',
//                   },
//                 ]}>
//                 <View
//                   style={[styles.colorSwatch, {backgroundColor: option.color}]}
//                 />
//                 <Text
//                   style={{
//                     color:
//                       mode === option.key
//                         ? colors.background
//                         : colors.foreground,
//                   }}>
//                   {option.label}
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         </TouchableOpacity>
//       </Modal>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     padding: 20,
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     marginBottom: 20,
//   },
//   row: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 20,
//   },
//   label: {
//     fontSize: 16,
//     marginBottom: 10,
//   },
//   selectButton: {
//     padding: 12,
//     borderRadius: 8,
//     marginBottom: 30,
//   },
//   modalOverlay: {
//     flex: 1,
//     justifyContent: 'center',
//     padding: 24,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//   },
//   modalContent: {
//     borderRadius: 12,
//     padding: 16,
//   },
//   optionRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 12,
//     paddingHorizontal: 10,
//     borderRadius: 8,
//     marginBottom: 6,
//   },
//   colorSwatch: {
//     width: 16,
//     height: 16,
//     borderRadius: 4,
//     marginRight: 10,
//     borderWidth: 1,
//     borderColor: '#ccc',
//   },
// });

//////////////

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
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import type {ThemeType} from '../context/ThemeContext';
// import {notifyOutfitForTomorrow} from '../utils/notifyOutfitForTomorrow';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import PushNotification from 'react-native-push-notification';

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

// export default function SettingsScreen() {
//   const {theme, mode, setSkin} = useAppTheme();
//   const systemScheme = useColorScheme();
//   const [modalVisible, setModalVisible] = useState(false);
//   const [notificationsEnabled, setNotificationsEnabled] = useState(false);
//   const colors = theme.colors;

//   const currentLabel =
//     skinOptions.find(s => s.key === mode)?.label || 'Unknown';

//   const handleSkinSelect = (skin: ThemeType | 'system') => {
//     if (skin === 'system') {
//       const fallback = systemScheme === 'dark' ? 'dark' : 'light';
//       setSkin(fallback);
//     } else {
//       setSkin(skin);
//     }
//     setModalVisible(false);
//   };

//   useEffect(() => {
//     AsyncStorage.getItem('notificationsEnabled').then(value => {
//       if (value !== null) {
//         setNotificationsEnabled(value === 'true');
//       }
//     });
//   }, []);

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

//   return (
//     <ScrollView
//       style={[styles.container, {backgroundColor: colors.background}]}
//       contentContainerStyle={{paddingBottom: 40}}>
//       <Text style={[styles.title, {color: colors.primary}]}>⚙️ Settings</Text>

//       {/* 🔔 Notifications toggle */}
//       <View style={styles.row}>
//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Enable Notifications
//         </Text>
//         <Switch
//           value={notificationsEnabled}
//           onValueChange={handleToggleNotifications}
//         />
//       </View>

//       {/* 🎨 Skin select */}
//       <Text style={[styles.label, {color: colors.foreground}]}>
//         App Color Theme
//       </Text>
//       <TouchableOpacity
//         onPress={() => setModalVisible(true)}
//         style={[styles.selectButton, {backgroundColor: colors.surface}]}>
//         <Text style={{color: colors.foreground}}>{currentLabel}</Text>
//       </TouchableOpacity>

//       {/* 🔽 Skin dropdown modal */}
//       <Modal visible={modalVisible} animationType="slide" transparent>
//         <TouchableOpacity
//           style={styles.modalOverlay}
//           activeOpacity={1}
//           onPressOut={() => setModalVisible(false)}>
//           <View
//             style={[styles.modalContent, {backgroundColor: colors.surface}]}>
//             {skinOptions.map(option => (
//               <TouchableOpacity
//                 key={option.key}
//                 onPress={() => handleSkinSelect(option.key as ThemeType)}
//                 style={[
//                   styles.optionRow,
//                   {
//                     backgroundColor:
//                       mode === option.key ? colors.primary : 'transparent',
//                   },
//                 ]}>
//                 <View
//                   style={[styles.colorSwatch, {backgroundColor: option.color}]}
//                 />
//                 <Text
//                   style={{
//                     color:
//                       mode === option.key
//                         ? colors.background
//                         : colors.foreground,
//                   }}>
//                   {option.label}
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         </TouchableOpacity>
//       </Modal>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     padding: 20,
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     marginBottom: 20,
//   },
//   row: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 20,
//   },
//   label: {
//     fontSize: 16,
//     marginBottom: 10,
//   },
//   selectButton: {
//     padding: 12,
//     borderRadius: 8,
//     marginBottom: 30,
//   },
//   modalOverlay: {
//     flex: 1,
//     justifyContent: 'center',
//     padding: 24,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//   },
//   modalContent: {
//     borderRadius: 12,
//     padding: 16,
//   },
//   optionRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 12,
//     paddingHorizontal: 10,
//     borderRadius: 8,
//     marginBottom: 6,
//   },
//   colorSwatch: {
//     width: 16,
//     height: 16,
//     borderRadius: 4,
//     marginRight: 10,
//     borderWidth: 1,
//     borderColor: '#ccc',
//   },
// });
