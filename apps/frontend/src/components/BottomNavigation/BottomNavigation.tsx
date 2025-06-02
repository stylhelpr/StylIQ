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
  }>({
    navBar: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      height: 67,
      justifyContent: 'space-around',
      alignItems: 'center',
      borderTopWidth: 0.3,
      width: '100%',
      padding: 10,
      marginBottom: 15,
    },
    tabButton: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabLabel: {
      fontSize: 11,
      color: theme.colors.foreground,
      marginTop: 3,
    },
    activeLabel: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
  });

  const TabButton = ({icon, label, onPress, isActive}: TabButtonProps) => (
    <TouchableOpacity style={themedStyles.tabButton} onPress={onPress}>
      <Icon
        name={icon}
        size={28}
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
        <TabButton
          icon="auto-awesome"
          label="Style Me"
          onPress={() => navigate('Outfit')}
          isActive={current === 'Outfit'}
        />
        <TabButton
          icon="explore"
          label="Explore"
          onPress={() => navigate('Explore')}
          isActive={current === 'Explore'}
        />
        <TabButton
          icon="favorite"
          label="Favorites"
          onPress={() => navigate('SavedOutfits')}
          isActive={current === 'SavedOutfits'}
        />
      </View>
    </SafeAreaView>
  );
};

export default BottomNavigation;

/////////////

// // components/BottomNavigation/BottomNavigation.tsx
// import React from 'react';
// import {
//   View,
//   TouchableOpacity,
//   Text,
//   StyleSheet,
//   ViewStyle,
//   TextStyle,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import {SafeAreaView} from 'react-native-safe-area-context';
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

//   const themedStyles = StyleSheet.create<{
//     navBar: ViewStyle;
//     tabButton: ViewStyle;
//     tabLabel: TextStyle;
//     activeLabel: TextStyle;
//   }>({
//     navBar: {
//       flexDirection: 'row',
//       backgroundColor: theme.colors.surface,
//       height: 67,
//       justifyContent: 'space-around',
//       alignItems: 'center',
//       borderTopWidth: 0.3,
//       width: '100%',
//       padding: 10,
//       marginBottom: 15,
//     },
//     tabButton: {
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     tabLabel: {
//       fontSize: 11,
//       color: theme.colors.foreground,
//       marginTop: 3,
//     },
//     activeLabel: {
//       color: theme.colors.primary,
//       fontWeight: '600',
//     },
//   });

//   const TabButton = ({icon, label, onPress, isActive}: TabButtonProps) => (
//     <TouchableOpacity style={themedStyles.tabButton} onPress={onPress}>
//       <Icon
//         name={icon}
//         size={28}
//         color={isActive ? theme.colors.primary : theme.colors.foreground2}
//       />
//       <Text
//         style={[themedStyles.tabLabel, isActive && themedStyles.activeLabel]}>
//         {label}
//       </Text>
//     </TouchableOpacity>
//   );

//   return (
//     <SafeAreaView
//       edges={['bottom']}
//       style={{backgroundColor: theme.colors.background}}>
//       <View style={themedStyles.navBar}>
//         <TabButton
//           icon="home"
//           label="Home"
//           onPress={() => navigate('Home')}
//           isActive={current === 'Home'}
//         />
//         <TabButton
//           icon="style"
//           label="Closet"
//           onPress={() => navigate('Closet')}
//           isActive={current === 'Closet'}
//         />
//         <TabButton
//           icon="checkroom"
//           label="Outfit"
//           onPress={() => navigate('Outfit')}
//           isActive={current === 'Outfit'}
//         />
//         <TabButton
//           icon="explore"
//           label="Explore"
//           onPress={() => navigate('Explore')}
//           isActive={current === 'Explore'}
//         />
//         <TabButton
//           icon="event-note"
//           label="Planner"
//           onPress={() => navigate('Planner')}
//           isActive={current === 'Planner'}
//         />
//         <TabButton
//           icon="favorite"
//           label="Saved"
//           onPress={() => navigate('SavedOutfits')}
//           isActive={current === 'SavedOutfits'}
//         />
//       </View>
//     </SafeAreaView>
//   );
// };

// export default BottomNavigation;

//////////////

// // components/BottomNavigation/BottomNavigation.tsx
// import React from 'react';
// import {
//   View,
//   TouchableOpacity,
//   Text,
//   StyleSheet,
//   ViewStyle,
//   TextStyle,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import {SafeAreaView} from 'react-native-safe-area-context';
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

//   const themedStyles = StyleSheet.create<{
//     navBar: ViewStyle;
//     tabButton: ViewStyle;
//     tabLabel: TextStyle;
//     activeLabel: TextStyle;
//   }>({
//     navBar: {
//       flexDirection: 'row',
//       backgroundColor: theme.colors.surface,
//       height: 67,
//       justifyContent: 'space-around',
//       alignItems: 'center',
//       borderTopWidth: 0.3,
//       width: '100%',
//       padding: 10,
//       marginBottom: 15,
//     },
//     tabButton: {
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     tabLabel: {
//       fontSize: 11,
//       color: theme.colors.foreground,
//       marginTop: 3,
//     },
//     activeLabel: {
//       color: theme.colors.primary,
//       fontWeight: '600',
//     },
//   });

//   const TabButton = ({icon, label, onPress, isActive}: TabButtonProps) => (
//     <TouchableOpacity style={themedStyles.tabButton} onPress={onPress}>
//       <Icon
//         name={icon}
//         size={28}
//         color={isActive ? theme.colors.primary : theme.colors.foreground2}
//       />
//       <Text
//         style={[themedStyles.tabLabel, isActive && themedStyles.activeLabel]}>
//         {label}
//       </Text>
//     </TouchableOpacity>
//   );

//   return (
//     <SafeAreaView
//       edges={['bottom']}
//       style={{backgroundColor: theme.colors.background}}>
//       <View style={themedStyles.navBar}>
//         <TabButton
//           icon="home"
//           label="Home"
//           onPress={() => navigate('Home')}
//           isActive={current === 'Home'}
//         />
//         <TabButton
//           icon="style"
//           label="Closet"
//           onPress={() => navigate('Closet')}
//           isActive={current === 'Closet'}
//         />
//         <TabButton
//           icon="checkroom"
//           label="Outfit"
//           onPress={() => navigate('Outfit')}
//           isActive={current === 'Outfit'}
//         />
//         <TabButton
//           icon="explore"
//           label="Explore"
//           onPress={() => navigate('Explore')}
//           isActive={current === 'Explore'}
//         />
//         <TabButton
//           icon="person"
//           label="Profile"
//           onPress={() => navigate('Profile')}
//           isActive={current === 'Profile'}
//         />
//       </View>
//     </SafeAreaView>
//   );
// };

// export default BottomNavigation;
