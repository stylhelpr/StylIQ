import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {SafeAreaView} from 'react-native-safe-area-context';
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
  const {user, clearSession} = useAuth0();

  const handleLogout = async () => {
    try {
      await clearSession();
      navigate('Login');
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  const styles = StyleSheet.create({
    safeArea: {
      backgroundColor: theme.colors.background,
    },
    header: {
      width: '100%',
      paddingHorizontal: 16,
      paddingTop: 0, // ✅ keep tight to safe area
      paddingBottom: 0, // ✅ shrink height even further
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      backgroundColor: theme.colors.background,
    },
    iconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: -5, // ✅ pull icons up just ~1px more
      backgroundColor: theme.colors.background,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.foreground,
      marginTop: -4, // ✅ nudge text up ~2px to align with icon row
    },

    iconCircle: {
      backgroundColor: theme.colors.surface3,
      padding: 8,
      marginLeft: 10,
      marginRight: 4,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconCircle2: {
      backgroundColor: theme.colors.button1,
      padding: 6,
      marginLeft: 10,
      marginRight: 4,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },

    iconButton: {
      marginLeft: 18,
    },
  });

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>StylHelpr</Text>

        <View style={styles.iconRow}>
          <AppleTouchFeedback
            style={styles.iconButton}
            hapticStyle="impactLight"
            onPress={() => navigate('Notifications')}>
            <Icon
              name="notifications-none"
              size={26}
              color={theme.colors.primary}
            />
          </AppleTouchFeedback>

          <AppleTouchFeedback
            style={styles.iconButton}
            hapticStyle="impactLight"
            onPress={() => navigate('Search')}>
            <Icon name="search" size={32} color={theme.colors.primary} />
          </AppleTouchFeedback>

          <AppleTouchFeedback
            style={styles.iconCircle2}
            hapticStyle="impactLight"
            onPress={() => navigate('AiStylistChatScreen')}>
            <MaterialIcons
              name="smart-toy"
              size={18}
              color={theme.colors.buttonText1}
            />
          </AppleTouchFeedback>

          {/* Planner */}
          <AppleTouchFeedback
            style={[styles.iconButton, {marginRight: 6}]}
            hapticStyle="impactLight"
            onPress={() => navigate('Planner')}>
            <Icon name="event-note" size={26} color={theme.colors.primary} />
          </AppleTouchFeedback>

          <AppleTouchFeedback
            style={styles.iconCircle}
            hapticStyle="impactLight"
            onPress={() => navigate('Profile')}>
            <MaterialIcons
              name="person"
              size={13}
              color={theme.colors.primary}
            />
          </AppleTouchFeedback>

          <AppleTouchFeedback
            style={styles.iconCircle}
            hapticStyle="notificationWarning"
            onPress={handleLogout}>
            <MaterialIcons
              name="logout"
              size={13}
              color={theme.colors.primary}
            />
          </AppleTouchFeedback>
        </View>
      </View>
    </SafeAreaView>
  );
}

//////////////

// import React from 'react';
// import {View, Text, StyleSheet} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {SafeAreaView} from 'react-native-safe-area-context';
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
//   const {user, clearSession} = useAuth0();

//   const handleLogout = async () => {
//     try {
//       await clearSession();
//       navigate('Login');
//     } catch (e) {
//       console.error('Logout failed:', e);
//     }
//   };

//   const styles = StyleSheet.create({
//     safeArea: {
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       width: '100%',
//       paddingHorizontal: 16,
//       paddingTop: 0, // ✅ keep tight to safe area
//       paddingBottom: 0, // ✅ shrink height even further
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'flex-start',
//       backgroundColor: theme.colors.background,
//     },
//     iconRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       marginTop: -5, // ✅ pull icons up just ~1px more
//       backgroundColor: 'red',
//     },
//     title: {
//       fontSize: 24,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//       marginTop: -4, // ✅ nudge text up ~2px to align with icon row
//     },

//     iconCircle: {
//       backgroundColor: theme.colors.surface3,
//       padding: 8,
//       marginLeft: 10,
//       marginRight: 4,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     iconCircle2: {
//       backgroundColor: theme.colors.button1,
//       padding: 6,
//       marginLeft: 10,
//       marginRight: 4,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },

//     iconButton: {
//       marginLeft: 18,
//     },
//   });

//   return (
//     <SafeAreaView edges={['top']} style={styles.safeArea}>
//       <View style={styles.header}>
//         <Text style={styles.title}>StylHelpr</Text>

//         <View style={styles.iconRow}>
//           <AppleTouchFeedback
//             style={styles.iconButton}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Notifications')}>
//             <Icon
//               name="notifications-none"
//               size={28}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconButton}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Search')}>
//             <Icon name="search" size={34} color={theme.colors.primary} />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle2}
//             hapticStyle="impactLight"
//             onPress={() => navigate('AiStylistChatScreen')}>
//             <MaterialIcons
//               name="smart-toy"
//               size={20}
//               color={theme.colors.buttonText1}
//             />
//           </AppleTouchFeedback>

//           {/* Planner */}
//           <AppleTouchFeedback
//             style={[styles.iconButton, {marginRight: 6}]}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Planner')}>
//             <Icon name="event-note" size={28} color={theme.colors.primary} />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Profile')}>
//             <MaterialIcons
//               name="person"
//               size={15}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle}
//             hapticStyle="notificationWarning"
//             onPress={handleLogout}>
//             <MaterialIcons
//               name="logout"
//               size={15}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// }

///////////////////

// import React from 'react';
// import {View, Text, StyleSheet} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useAuth0} from 'react-native-auth0';
// import type {Screen} from '../../navigation/types';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';

// type Props = {
//   navigate: (screen: Screen) => void;
//   showSettings?: boolean;
// };

// export default function GlobalHeader({navigate, showSettings = false}: Props) {
//   const {theme} = useAppTheme();
//   const {user, clearSession} = useAuth0();
//   const insets = useSafeAreaInsets(); // 👈 read safe area for Dynamic Island / notch

//   const handleLogout = async () => {
//     try {
//       await clearSession();
//       navigate('Login');
//     } catch (e) {
//       console.error('Logout failed:', e);
//     }
//   };

//   const styles = StyleSheet.create({
//     safeArea: {
//       backgroundColor: theme.colors.background,
//     },
//     header: {
//       width: '100%',
//       paddingHorizontal: 16,
//       paddingTop: 0, // ✅ Bring it right up against the safe area
//       paddingBottom: 14,
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       backgroundColor: theme.colors.background,
//     },
//     iconCircle: {
//       backgroundColor: theme.colors.surface3,
//       padding: 8,
//       marginLeft: 10,
//       marginRight: 4,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     iconCircle2: {
//       backgroundColor: theme.colors.button1,
//       padding: 6,
//       marginLeft: 10,
//       marginRight: 4,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     title: {
//       fontSize: 24,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//     },
//     iconRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     iconButton: {
//       marginLeft: 18,
//     },
//   });

//   return (
//     <SafeAreaView edges={['top']} style={styles.safeArea}>
//       <View style={styles.header}>
//         <Text style={styles.title}>StylHelpr</Text>

//         <View style={[styles.iconRow, {backgroundColor: 'red'}]}>
//           <AppleTouchFeedback
//             style={styles.iconButton}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Notifications')}>
//             <Icon
//               name="notifications-none"
//               size={28}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconButton}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Search')}>
//             <Icon name="search" size={34} color={theme.colors.primary} />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle2}
//             hapticStyle="impactLight"
//             onPress={() => navigate('AiStylistChatScreen')}>
//             <MaterialIcons
//               name="smart-toy"
//               size={20}
//               color={theme.colors.buttonText1}
//             />
//           </AppleTouchFeedback>

//           {/* Planner */}
//           <AppleTouchFeedback
//             style={[styles.iconButton, {marginRight: 6}]}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Planner')}>
//             <Icon name="event-note" size={28} color={theme.colors.primary} />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle}
//             hapticStyle="impactLight"
//             onPress={() => navigate('Profile')}>
//             <MaterialIcons
//               name="person"
//               size={15}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>

//           <AppleTouchFeedback
//             style={styles.iconCircle}
//             hapticStyle="notificationWarning"
//             onPress={handleLogout}>
//             <MaterialIcons
//               name="logout"
//               size={15}
//               color={theme.colors.primary}
//             />
//           </AppleTouchFeedback>
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// }

/////////////////

// import React from 'react';
// import {View, Text, StyleSheet} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useAuth0} from 'react-native-auth0';
// import type {Screen} from '../../navigation/types';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';

// type Props = {
//   navigate: (screen: Screen) => void;
//   showSettings?: boolean;
// };

// export default function GlobalHeader({navigate, showSettings = false}: Props) {
//   const {theme} = useAppTheme();
//   const {user} = useAuth0();
//   const {clearSession} = useAuth0();

//   const handleLogout = async () => {
//     try {
//       await clearSession();
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
//       backgroundColor: theme.colors.background,
//     },
//     iconCircle: {
//       backgroundColor: theme.colors.surface3,
//       padding: 8,
//       marginLeft: 10,
//       marginRight: 4,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     iconCircle2: {
//       backgroundColor: theme.colors.button1,
//       padding: 6,
//       marginLeft: 10,
//       marginRight: 4,
//       borderRadius: 24,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     title: {
//       fontSize: 24,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//     },
//     iconRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     iconButton: {
//       marginLeft: 18,
//     },
//   });

//   return (
//     <View style={styles.header}>
//       <Text style={styles.title}>StylHelpr</Text>

//       <View style={[styles.iconRow, {backgroundColor: 'red'}]}>
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
//           style={styles.iconCircle2}
//           hapticStyle="impactLight"
//           onPress={() => navigate('AiStylistChatScreen')}>
//           <MaterialIcons
//             name="smart-toy"
//             size={20}
//             color={theme.colors.buttonText1}
//           />
//         </AppleTouchFeedback>

//         {/* Planner */}
//         <AppleTouchFeedback
//           style={[styles.iconButton, {marginRight: 6}]}
//           hapticStyle="impactLight"
//           onPress={() => navigate('Planner')}>
//           <Icon name="event-note" size={28} color={theme.colors.primary} />
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           style={styles.iconCircle}
//           hapticStyle="impactLight"
//           onPress={() => navigate('Profile')}>
//           <MaterialIcons name="person" size={15} color={theme.colors.primary} />
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           style={styles.iconCircle}
//           hapticStyle="notificationWarning"
//           onPress={handleLogout}>
//           <MaterialIcons name="logout" size={15} color={theme.colors.primary} />
//         </AppleTouchFeedback>
//       </View>
//     </View>
//   );
// }

///////////////////////

// import React from 'react';
// import {View, Text, StyleSheet} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../../context/ThemeContext';
// import {useAuth0} from 'react-native-auth0';
// import type {Screen} from '../../navigation/types';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../../styles/useGlobalStyles';
// import {tokens} from '../../styles/tokens/tokens';

// type Props = {
//   navigate: (screen: Screen) => void;
//   showSettings?: boolean;
// };

// export default function GlobalHeader({navigate, showSettings = false}: Props) {
//   const {theme} = useAppTheme();
//   const {user} = useAuth0();
//   const {clearSession} = useAuth0();

//   const handleLogout = async () => {
//     try {
//       await clearSession();
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
//       backgroundColor: theme.colors.background,
//     },
//     iconCircle: {
//       backgroundColor: theme.colors.surface3,
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
//       color: theme.colors.foreground,
//     },
//     iconRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     iconButton: {
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
//           style={styles.iconButton}
//           hapticStyle="impactLight"
//           onPress={() => navigate('AiStylistChatScreen')}>
//           <MaterialIcons
//             name="smart-toy"
//             size={32}
//             // color="rgba(102, 0, 197, 1)"
//             color={theme.colors.button1}
//           />
//         </AppleTouchFeedback>

//         {/* ⬇️ NEW: Planner */}
//         <AppleTouchFeedback
//           style={[styles.iconButton, {marginRight: 6}]}
//           hapticStyle="impactLight"
//           onPress={() => navigate('Planner')}>
//           <Icon name="event-note" size={28} color={theme.colors.primary} />
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

//////////////

// import React from 'react';
// import {View, Text, StyleSheet} from 'react-native';
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

//         {/* ⬇️ NEW: Planner */}
//         <AppleTouchFeedback
//           style={styles.iconButton}
//           hapticStyle="impactLight"
//           onPress={() => navigate('Planner')}>
//           <Icon name="event-note" size={28} color={theme.colors.primary} />
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
