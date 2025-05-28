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

///////////////

// import React from 'react';
// import {View, Text, StyleSheet, Switch, Button} from 'react-native';
// import type {Screen, NavigateFunction} from '../navigation/types';

// type Props = {
//   navigate: NavigateFunction;
// };

// export default function SettingsScreen({navigate}: Props) {
//   const [enabled, setEnabled] = React.useState(true);

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>⚙️ Settings</Text>
//       <View style={styles.row}>
//         <Text style={styles.label}>Enable Notifications</Text>
//         <Switch value={enabled} onValueChange={setEnabled} />
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {padding: 20},
//   title: {fontSize: 24, fontWeight: 'bold', marginBottom: 20},
//   row: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   label: {fontSize: 16},
// });
