import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useAppTheme} from '../../context/ThemeContext';
import {useAuth0} from 'react-native-auth0';
import type {Screen} from '../../navigation/types';
import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';

type Props = {
  navigate: (screen: Screen) => void;
  showSettings?: boolean;
};

export default function GlobalHeader({navigate, showSettings = false}: Props) {
  const {theme} = useAppTheme();
  const {clearSession} = useAuth0();

  const handleLogout = async () => {
    try {
      await clearSession();
      navigate('Login');
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

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
      backgroundColor: 'rgb(47, 47, 47)',
      padding: 8,
      marginLeft: 10,
      marginRight: 4,
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
  });

  return (
    <View style={styles.header}>
      <Text style={styles.title}>StylHelpr</Text>

      <View style={styles.iconRow}>
        <AppleTouchFeedback
          style={styles.iconButton}
          hapticStyle="impactLight"
          onPress={() => navigate('Notifications')}>
          <Icon
            name="notifications-none"
            size={28}
            color={theme.colors.primary}
          />
        </AppleTouchFeedback>

        <AppleTouchFeedback
          style={styles.iconButton}
          hapticStyle="impactLight"
          onPress={() => navigate('Search')}>
          <Icon name="search" size={34} color={theme.colors.primary} />
        </AppleTouchFeedback>

        {/* ⬇️ NEW: Planner */}
        <AppleTouchFeedback
          style={styles.iconButton}
          hapticStyle="impactLight"
          onPress={() => navigate('Planner')}>
          <Icon name="event-note" size={28} color={theme.colors.primary} />
        </AppleTouchFeedback>

        <AppleTouchFeedback
          style={styles.iconCircle}
          hapticStyle="impactLight"
          onPress={() => navigate('Profile')}>
          <MaterialIcons name="person" size={15} color={theme.colors.primary} />
        </AppleTouchFeedback>

        <AppleTouchFeedback
          style={styles.iconCircle}
          hapticStyle="impactMedium"
          onPress={handleLogout}>
          <MaterialIcons name="logout" size={15} color={theme.colors.primary} />
        </AppleTouchFeedback>
      </View>
    </View>
  );
}

/////////////////

// import React from 'react';
// import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useAuth0} from 'react-native-auth0';
// import type {Screen} from '../../navigation/types';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';

// type Props = {
//   navigate: (screen: Screen) => void;
//   showSettings?: boolean;
// };

// export default function GlobalHeader({navigate, showSettings = false}: Props) {
//   const {theme} = useAppTheme();

//   const {clearSession} = useAuth0();

//   const handleLogout = async () => {
//     try {
//       await clearSession();
//       console.log('Logged out successfully');
//       navigate('Login');
//     } catch (e) {
//       console.error('Logout failed:', e);
//     }
//   };

//   const styles = StyleSheet.create({
//     header: {
//       width: '100%',
//       paddingHorizontal: 16,
//       paddingTop: 52,
//       paddingBottom: 14,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//     },
//     iconCircle: {
//       backgroundColor: 'rgb(47, 47, 47)',
//       padding: 8,
//       marginLeft: 10,
//       marginRight: 4,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     title: {
//       fontSize: 24,
//       fontWeight: '700',
//       color: '#fff',
//     },
//     iconRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     iconButton: {
//       marginLeft: 18,
//     },
//     avatar: {
//       width: 23,
//       height: 23,
//       borderRadius: 14,
//       borderWidth: 1,
//       borderColor: '#666',
//       marginLeft: 18,
//     },
//   });

//   return (
//     <View style={styles.header}>
//       <Text style={styles.title}>StylHelpr</Text>

//       <View style={styles.iconRow}>
//         <AppleTouchFeedback
//           style={styles.iconButton}
//           hapticStyle="impactLight"
//           onPress={() => navigate('Notifications')}>
//           <Icon
//             name="notifications-none"
//             size={28}
//             color={theme.colors.primary}
//           />
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           style={styles.iconButton}
//           hapticStyle="impactLight"
//           onPress={() => navigate('Search')}>
//           <Icon name="search" size={34} color={theme.colors.primary} />
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           style={styles.iconCircle}
//           hapticStyle="impactLight"
//           onPress={() => navigate('Profile')}>
//           <MaterialIcons name="person" size={15} color={theme.colors.primary} />
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           style={styles.iconCircle}
//           hapticStyle="impactMedium"
//           onPress={handleLogout}>
//           <MaterialIcons name="logout" size={15} color={theme.colors.primary} />
//         </AppleTouchFeedback>
//       </View>
//     </View>
//   );
// }
