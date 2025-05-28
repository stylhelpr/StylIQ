// components/BottomNavigation/BottomNavigation.tsx
import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppTheme} from '../../context/ThemeContext';

interface TabButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  isActive?: boolean;
}

const BottomNavigation = ({
  current,
  navigate,
}: {
  current: string;
  navigate: (screen: string) => void;
}) => {
  const {theme} = useAppTheme();

  const themedStyles = StyleSheet.create<{
    navBar: ViewStyle;
    tabButton: ViewStyle;
    tabLabel: TextStyle;
    activeLabel: TextStyle;
    fabContainer: ViewStyle;
    fab: ViewStyle;
  }>({
    navBar: {
      flexDirection: 'row',
      backgroundColor: theme.colors.background,
      height: 100,
      justifyContent: 'space-around',
      alignItems: 'center',
      borderTopWidth: 0.5,
      borderTopColor: theme.colors.surfaceBorder,
      width: '100%',
      padding: 10,
    },
    tabButton: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabLabel: {
      fontSize: 12,
      color: theme.colors.foreground2,
    },
    activeLabel: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    fabContainer: {
      position: 'relative',
      top: -5,
      backgroundColor: theme.colors.background,
      borderRadius: 35,
      padding: 2,
    },
    fab: {
      backgroundColor: theme.colors.primary,
      borderRadius: 35,
      width: 55,
      height: 55,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  const TabButton = ({icon, label, onPress, isActive}: TabButtonProps) => (
    <TouchableOpacity style={themedStyles.tabButton} onPress={onPress}>
      <Icon
        name={icon}
        size={30}
        color={isActive ? theme.colors.primary : theme.colors.foreground2}
      />
      <Text
        style={[themedStyles.tabLabel, isActive && themedStyles.activeLabel]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      edges={['bottom']}
      style={{backgroundColor: theme.colors.background}}>
      <View style={themedStyles.navBar}>
        <TabButton
          icon="home"
          label="Home"
          onPress={() => navigate('Home')}
          isActive={current === 'Home'}
        />
        <TabButton
          icon="style"
          label="Closet"
          onPress={() => navigate('Closet')}
          isActive={current === 'Closet'}
        />
        <TouchableOpacity
          style={themedStyles.fabContainer}
          onPress={() => navigate('Voice')}>
          <View style={themedStyles.fab}>
            <Icon name="add-circle-outline" size={30} color="#fff" />
          </View>
        </TouchableOpacity>
        <TabButton
          icon="explore"
          label="Explore"
          onPress={() => navigate('Explore')}
          isActive={current === 'Explore'}
        />
        <TabButton
          icon="settings"
          label="Settings"
          onPress={() => navigate('Settings')}
          isActive={current === 'Settings'}
        />
      </View>
    </SafeAreaView>
  );
};

export default BottomNavigation;

///////////////

// // components/BottomNavigation.tsx
// import React from 'react';
// import {View, TouchableOpacity, Text, StyleSheet} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import {useAppTheme} from '../../context/ThemeContext';

// interface TabButtonProps {
//   icon: string;
//   label: string;
//   onPress: () => void;
//   isActive?: boolean;
// }

// const BottomNavigation = ({
//   current,
//   navigate,
// }: {
//   current: string;
//   navigate: (screen: string) => void;
// }) => {
//   const {theme} = useAppTheme();

//   const themedStyles = StyleSheet.create({
//     navBar: {
//       flexDirection: 'row',
//       backgroundColor: theme.colors.background,
//       height: 60,
//       justifyContent: 'space-around',
//       alignItems: 'center',
//       borderTopWidth: 1,
//       borderTopColor: theme.colors.surfaceBorder,
//       position: 'absolute',
//       bottom: 0,
//       width: '100%',
//     },
//     tabButton: {
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     tabLabel: {
//       fontSize: 12,
//       color: theme.colors.foreground2,
//     },
//     activeLabel: {
//       color: theme.colors.primary,
//       fontWeight: '600',
//     },
//     fabContainer: {
//       position: 'relative',
//       top: -10,
//     },
//     fab: {
//       backgroundColor: theme.colors.primary,
//       borderRadius: 35,
//       width: 55,
//       height: 55,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//   });

//   const TabButton = ({icon, label, onPress, isActive}: TabButtonProps) => (
//     <TouchableOpacity style={themedStyles.tabButton} onPress={onPress}>
//       <Icon
//         name={icon}
//         size={30}
//         color={isActive ? theme.colors.primary : theme.colors.foreground2}
//       />
//       <Text
//         style={[themedStyles.tabLabel, isActive && themedStyles.activeLabel]}>
//         {label}
//       </Text>
//     </TouchableOpacity>
//   );

//   return (
//     <View style={themedStyles.navBar}>
//       <TabButton
//         icon="home"
//         label="Home"
//         onPress={() => navigate('Home')}
//         isActive={current === 'Home'}
//       />
//       <TabButton
//         icon="style"
//         label="Closet"
//         onPress={() => navigate('Closet')}
//         isActive={current === 'Closet'}
//       />
//       <TouchableOpacity
//         style={themedStyles.fabContainer}
//         onPress={() => navigate('Voice')}>
//         <View style={themedStyles.fab}>
//           <Icon name="add-circle-outline" size={30} color="#fff" />
//         </View>
//       </TouchableOpacity>
//       <TabButton
//         icon="explore"
//         label="Explore"
//         onPress={() => navigate('Explore')}
//         isActive={current === 'Explore'}
//       />
//       <TabButton
//         icon="settings"
//         label="Settings"
//         onPress={() => navigate('Settings')}
//         isActive={current === 'Settings'}
//       />
//     </View>
//   );
// };

// export default BottomNavigation;

/////////////

// // components/BottomNavigation.tsx
// import React from 'react';
// import {View, TouchableOpacity, Text, StyleSheet} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';

// interface TabButtonProps {
//   icon: string;
//   label: string;
//   onPress: () => void;
//   isActive?: boolean;
// }

// const TabButton = ({icon, label, onPress, isActive}: TabButtonProps) => (
//   <TouchableOpacity style={styles.tabButton} onPress={onPress}>
//     <Icon name={icon} size={30} color={isActive ? '#000' : '#777'} />
//     <Text style={[styles.tabLabel, isActive && styles.activeLabel]}>
//       {label}
//     </Text>
//   </TouchableOpacity>
// );

// const BottomNavigation = ({
//   current,
//   navigate,
// }: {
//   current: string;
//   navigate: (screen: string) => void;
// }) => {
//   return (
//     <View style={styles.navBar}>
//       <TabButton
//         icon="home"
//         label="Home"
//         onPress={() => navigate('Home')}
//         isActive={current === 'Home'}
//       />
//       <TabButton
//         icon="style"
//         label="Closet"
//         onPress={() => navigate('Closet')}
//         isActive={current === 'Closet'}
//       />
//       <TouchableOpacity
//         style={styles.fabContainer}
//         onPress={() => navigate('Voice')}>
//         <View style={styles.fab}>
//           <Icon name="add-circle-outline" size={30} color="#fff" />
//         </View>
//       </TouchableOpacity>
//       <TabButton
//         icon="explore"
//         label="Explore"
//         onPress={() => navigate('Explore')}
//         isActive={current === 'Explore'}
//       />

//       <TabButton
//         icon="settings"
//         label="Settings"
//         onPress={() => navigate('Settings')}
//         isActive={current === 'Settings'}
//       />
//       {/* <TabButton
//         icon="person-outline"
//         label="Profile"
//         onPress={() => navigate('Profile')}
//         isActive={current === 'Profile'}
//       /> */}
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   navBar: {
//     flexDirection: 'row',
//     backgroundColor: '#fff',
//     height: 60,
//     justifyContent: 'space-around',
//     alignItems: 'center',
//     borderTopWidth: 1,
//     borderTopColor: '#ddd',
//     position: 'absolute',
//     bottom: 0,
//     width: '100%',
//   },
//   tabButton: {
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   tabLabel: {
//     fontSize: 12,
//     color: '#777',
//   },
//   activeLabel: {
//     color: '#000',
//     fontWeight: '600',
//   },
//   fabContainer: {
//     position: 'relative',
//     top: -10,
//   },
//   fab: {
//     backgroundColor: '#000',
//     borderRadius: 35,
//     width: 55,
//     height: 55,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
// });

// export default BottomNavigation;

///////////

// // components/BottomNavigation.tsx
// import React from 'react';
// import {View, TouchableOpacity, Text, StyleSheet} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';

// interface TabButtonProps {
//   icon: string;
//   label: string;
//   onPress: () => void;
//   isActive?: boolean;
// }

// const TabButton = ({icon, label, onPress, isActive}: TabButtonProps) => (
//   <TouchableOpacity style={styles.tabButton} onPress={onPress}>
//     <Icon name={icon} size={24} color={isActive ? '#000' : '#777'} />
//     <Text style={[styles.tabLabel, isActive && styles.activeLabel]}>
//       {label}
//     </Text>
//   </TouchableOpacity>
// );

// const BottomNavigation = ({
//   current,
//   navigate,
// }: {
//   current: string;
//   navigate: (screen: string) => void;
// }) => {
//   return (
//     <View style={styles.navBar}>
//       <TabButton
//         icon="home"
//         label="Home"
//         onPress={() => navigate('Home')}
//         isActive={current === 'Home'}
//       />
//       <TabButton
//         icon="explore"
//         label="Explore"
//         onPress={() => navigate('Explore')}
//         isActive={current === 'Explore'}
//       />
//       <TouchableOpacity
//         style={styles.fabContainer}
//         onPress={() => navigate('Voice')}>
//         <View style={styles.fab}>
//           <Icon name="add-circle-outline" size={40} color="#fff" />
//         </View>
//       </TouchableOpacity>
//       <TabButton
//         icon="style"
//         label="Closet"
//         onPress={() => navigate('Closet')}
//         isActive={current === 'Closet'}
//       />
//       <TabButton
//         icon="person-outline"
//         label="Profile"
//         onPress={() => navigate('Profile')}
//         isActive={current === 'Profile'}
//       />
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   navBar: {
//     flexDirection: 'row',
//     backgroundColor: '#fff',
//     height: 80,
//     justifyContent: 'space-around',
//     alignItems: 'center',
//     borderTopWidth: 1,
//     borderTopColor: '#ddd',
//     position: 'absolute',
//     bottom: 0,
//     width: '100%',
//   },
//   tabButton: {
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   tabLabel: {
//     fontSize: 12,
//     color: '#777',
//   },
//   activeLabel: {
//     color: '#000',
//     fontWeight: '600',
//   },
//   fabContainer: {
//     position: 'relative',
//     top: -30,
//   },
//   fab: {
//     backgroundColor: '#000',
//     borderRadius: 35,
//     width: 70,
//     height: 70,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
// });

// export default BottomNavigation;
