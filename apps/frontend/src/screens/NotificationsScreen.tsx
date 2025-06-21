import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAppTheme} from '../context/ThemeContext';
import BackHeader from '../components/Backheader/Backheader';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';

interface Notification {
  id: string;
  message: string;
  timestamp: string;
}

type Props = {
  navigate: (screen: string) => void;
};

export default function NotificationsScreen({navigate}: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const colors = theme.colors;

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    chipGroup: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 4,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.surface,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      fontSize: 16,
      color: colors.foreground,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    card: {
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    message: {
      fontSize: 16,
      marginBottom: 4,
    },
    chipRow: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 4},
  });

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const raw = await AsyncStorage.getItem('notifications');
        if (raw) {
          const parsed = JSON.parse(raw);
          setNotifications(parsed);
        }
      } catch (err) {
        console.error('Failed to load notifications:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  if (loading) {
    return (
      <View style={[styles.center, {backgroundColor: theme.colors.background}]}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}>
      <Text style={[globalStyles.header, {color: theme.colors.primary}]}>
        Notifications
      </Text>
      <View style={globalStyles.section}>
        <BackHeader title="" onBack={() => navigate('StyleProfileScreen')} />
        {notifications.length === 0 ? (
          <Text style={{color: theme.colors.foreground2}}>
            No notifications yet.
          </Text>
        ) : (
          notifications.map(notification => (
            <View
              key={notification.id}
              style={[styles.card, {backgroundColor: theme.colors.surface}]}>
              <Text style={[styles.message, {color: theme.colors.foreground}]}>
                {notification.message}
              </Text>
              <Text style={{color: theme.colors.foreground2, fontSize: 12}}>
                {notification.timestamp}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

///////////

// import React, {useEffect, useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
// } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useAppTheme} from '../context/ThemeContext';

// interface Notification {
//   id: string;
//   message: string;
//   timestamp: string;
// }

// type Props = {
//   navigate: (screen: string) => void;
// };

// export default function NotificationsScreen({navigate}: Props) {
//   const [notifications, setNotifications] = useState<Notification[]>([]);
//   const [loading, setLoading] = useState(true);
//   const {theme} = useAppTheme();

//   useEffect(() => {
//     const fetchNotifications = async () => {
//       try {
//         const raw = await AsyncStorage.getItem('notifications');
//         if (raw) {
//           const parsed = JSON.parse(raw);
//           setNotifications(parsed);
//         }
//       } catch (err) {
//         console.error('Failed to load notifications:', err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchNotifications();
//   }, []);

//   if (loading) {
//     return (
//       <View style={[styles.center, {backgroundColor: theme.colors.background}]}>
//         <ActivityIndicator color={theme.colors.primary} size="large" />
//       </View>
//     );
//   }

//   return (
//     <ScrollView
//       style={{backgroundColor: theme.colors.background}}
//       contentContainerStyle={{padding: 16}}>
//       <Text style={[styles.header, {color: theme.colors.foreground}]}>
//         Notifications
//       </Text>
//       {notifications.length === 0 ? (
//         <Text style={{color: theme.colors.foreground2}}>
//           No notifications yet.
//         </Text>
//       ) : (
//         notifications.map(notification => (
//           <View
//             key={notification.id}
//             style={[styles.card, {backgroundColor: theme.colors.surface}]}>
//             <Text style={[styles.message, {color: theme.colors.foreground}]}>
//               {notification.message}
//             </Text>
//             <Text style={{color: theme.colors.foreground2, fontSize: 12}}>
//               {notification.timestamp}
//             </Text>
//           </View>
//         ))
//       )}
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   center: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   header: {
//     fontSize: 22,
//     fontWeight: '700',
//     marginBottom: 12,
//   },
//   card: {
//     borderRadius: 12,
//     padding: 12,
//     marginBottom: 12,
//     shadowColor: '#000',
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 2,
//   },
//   message: {
//     fontSize: 16,
//     marginBottom: 4,
//   },
// });
