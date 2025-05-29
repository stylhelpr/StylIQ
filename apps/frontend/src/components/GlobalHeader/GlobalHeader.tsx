import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Image} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useAppTheme} from '../../context/ThemeContext';
import type {Screen} from '../../navigation/types';

type Props = {
  navigate: (screen: Screen) => void;
  showSettings?: boolean;
};

export default function GlobalHeader({navigate, showSettings = false}: Props) {
  const {theme} = useAppTheme();
  const styles = StyleSheet.create({
    header: {
      width: '100%',
      paddingHorizontal: 16,
      paddingTop: 52,
      paddingBottom: 14,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    iconCircle: {
      backgroundColor: theme.colors.surface,
      padding: 8,
      marginLeft: 10,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: '#fff',
    },
    iconRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconButton: {
      marginLeft: 18,
    },
    avatar: {
      width: 23,
      height: 23,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#666',
      marginLeft: 18,
    },
  });

  return (
    <View style={styles.header}>
      <Text style={styles.title}>StylIQ</Text>

      <View style={styles.iconRow}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => console.log('Bell')}>
          <Icon
            name="notifications-none"
            size={28}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigate('Search')}>
          <Icon name="search" size={28} color={theme.colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconCircle}>
          <MaterialIcons name="person" size={15} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

///////////////

// import React from 'react';
// import {View, TouchableOpacity, StyleSheet, Image} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../../context/ThemeContext';
// import type {Screen} from '../../navigation/types';

// type Props = {
//   navigate: (screen: Screen) => void;
//   showSettings?: boolean;
// };

// export default function GlobalHeader({navigate, showSettings = false}: Props) {
//   const {theme} = useAppTheme();

//   return (
//     <View style={styles.header}>
//       <TouchableOpacity onPress={() => navigate('Search')}>
//         <Icon name="search" size={24} color={theme.colors.primary} />
//       </TouchableOpacity>

//       <TouchableOpacity
//         onPress={() => console.log('notifications')}
//         style={{marginLeft: 20}}>
//         <Icon
//           name="notifications-none"
//           size={24}
//           color={theme.colors.primary}
//         />
//       </TouchableOpacity>

//       <TouchableOpacity
//         onPress={() => navigate('Profile')}
//         style={{marginLeft: 20}}>
//         <Image
//           source={{uri: 'https://placekitten.com/300/300'}}
//           style={styles.avatar}
//         />
//       </TouchableOpacity>

//       {showSettings && (
//         <TouchableOpacity
//           onPress={() => navigate('Settings')}
//           style={{marginLeft: 20}}>
//           <Icon name="settings" size={24} color={theme.colors.primary} />
//         </TouchableOpacity>
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   header: {
//     width: '100%',
//     paddingHorizontal: 16,
//     paddingTop: 60,
//     paddingBottom: 8,
//     flexDirection: 'row',
//     justifyContent: 'flex-end',
//     alignItems: 'center',
//   },
//   avatar: {
//     width: 28,
//     height: 28,
//     borderRadius: 14,
//     borderWidth: 1,
//     borderColor: '#666',
//   },
// });

///////////

// import React from 'react';
// import {View, TouchableOpacity, StyleSheet} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../../context/ThemeContext';
// import type {Screen} from '../../navigation/types';

// type Props = {
//   navigate: (screen: Screen) => void;
// };

// export default function GlobalHeader({navigate}: Props) {
//   const {theme} = useAppTheme();

//   return (
//     <View style={styles.header}>
//       <TouchableOpacity onPress={() => navigate('Search')}>
//         <Icon name="search" size={24} color={theme.colors.primary} />
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   header: {
//     width: '100%',
//     paddingHorizontal: 16,
//     paddingTop: 16,
//     flexDirection: 'row',
//     justifyContent: 'flex-end',
//     gap: 20,
//   },
// });
