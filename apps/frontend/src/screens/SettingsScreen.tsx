// import React from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Switch,
//   TouchableOpacity,
//   ScrollView,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import type {ThemeType} from '../context/ThemeContext';

// const skinOptions: ThemeType[] = [
//   'modernDark',
//   'modernLight',
//   'retro',
//   'minimal',
//   'vibrant',
// ];

// export default function SettingsScreen() {
//   const {mode, theme, setSkin} = useAppTheme();
//   const colors = theme.colors;

//   const isDark =
//     mode === 'modernDark' ||
//     mode === 'retro' || // optional: if you want retro to behave dark
//     mode === 'vibrant';

//   const toggleDarkMode = () => {
//     if (isDark) {
//       setSkin('modernLight');
//     } else {
//       setSkin('modernDark');
//     }
//   };

//   return (
//     <ScrollView
//       style={[styles.container, {backgroundColor: colors.background}]}
//       contentContainerStyle={{paddingBottom: 40}}>
//       <Text style={[styles.title, {color: colors.primary}]}>⚙️ Settings</Text>

//       <View style={styles.row}>
//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Enable Notifications
//         </Text>
//         <Switch />
//       </View>

//       <View style={styles.row}>
//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Dark Mode
//         </Text>
//         <Switch value={isDark} onValueChange={toggleDarkMode} />
//       </View>

//       <Text
//         style={[
//           styles.label,
//           {color: colors.foreground, marginBottom: 10, marginTop: 20},
//         ]}>
//         App Skin
//       </Text>

//       {skinOptions.map(skin => (
//         <TouchableOpacity
//           key={skin}
//           style={[
//             styles.skinButton,
//             {
//               backgroundColor: mode === skin ? colors.primary : colors.surface,
//               borderRadius: theme.borderRadius,
//             },
//           ]}
//           onPress={() => setSkin(skin)}>
//           <Text
//             style={{
//               color: mode === skin ? colors.background : colors.text,
//               fontWeight: mode === skin ? '600' : '400',
//             }}>
//             {skin}
//           </Text>
//         </TouchableOpacity>
//       ))}
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
//   },
//   skinButton: {
//     padding: 12,
//     marginBottom: 10,
//     alignItems: 'center',
//   },
// });

//////////////////

import React from 'react';
import {View, Text, StyleSheet, Switch} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';

export default function SettingsScreen() {
  const {mode, theme, toggleTheme} = useAppTheme();
  const colors = theme.colors;

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <Text style={[styles.title, {color: colors.primary}]}>⚙️ Settings</Text>

      <View style={styles.row}>
        <Text style={[styles.label, {color: colors.foreground}]}>
          Enable Notifications
        </Text>
        <Switch />
      </View>

      <View style={styles.row}>
        <Text style={[styles.label, {color: colors.foreground}]}>
          Dark Mode
        </Text>
        <Switch value={mode === 'dark'} onValueChange={toggleTheme} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
  },
});
