import React from 'react';
import {View, Text, StyleSheet, ViewStyle, TextStyle} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppTheme} from '../../context/ThemeContext';
import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
import {fontScale, moderateScale} from '../../utils/scale';
import {tokens} from '../../styles/tokens/tokens';

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
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.surfaceBorder,
      height: 47,
      justifyContent: 'space-around',
      alignItems: 'center',
      width: '100%',
    },
    tabButton: {
      width: 72,
      height: 42,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: moderateScale(tokens.spacing.xxs),
    },
    tabLabel: {
      fontSize: fontScale(tokens.fontSize.xxxs),
      color: theme.colors.foreground,
      fontWeight: '300',
      marginTop: 0,
    },
    activeLabel: {
      fontSize: fontScale(tokens.fontSize.xxs),
      color: theme.colors.primary,
      fontWeight: '400',
    },
  });

  const TabButton = ({icon, label, onPress, isActive}: TabButtonProps) => (
    <AppleTouchFeedback
      style={themedStyles.tabButton}
      hapticStyle={isActive ? undefined : 'impactLight'}
      onPress={onPress}>
      <>
        <Icon
          name={icon}
          size={26}
          color={isActive ? theme.colors.primary : theme.colors.foreground2}
        />
        <Text
          style={[themedStyles.tabLabel, isActive && themedStyles.activeLabel]}>
          {label}
        </Text>
      </>
    </AppleTouchFeedback>
  );

  return (
    <SafeAreaView
      edges={['bottom']}
      style={{backgroundColor: theme.colors.background}}>
      <View style={themedStyles.navBar}>
        <TabButton
          icon="home"
          label="Home"
          onPress={() => current !== 'Home' && navigate('Home')}
          isActive={current === 'Home'}
        />

        <TabButton
          icon="explore"
          label="Fashion News"
          onPress={() => current !== 'Explore' && navigate('Explore')}
          isActive={current === 'Explore'}
        />

        <TabButton
          icon="auto-awesome"
          label="Style Me"
          onPress={() => current !== 'Outfit' && navigate('Outfit')}
          isActive={current === 'Outfit'}
        />

        <TabButton
          icon="style"
          label="Wardrobe"
          onPress={() => current !== 'Wardrobe' && navigate('Wardrobe')}
          isActive={current === 'Wardrobe'}
        />

        <TabButton
          icon="checkroom"
          label="Saved"
          onPress={() => current !== 'SavedOutfits' && navigate('SavedOutfits')}
          isActive={current === 'SavedOutfits'}
        />
      </View>
    </SafeAreaView>
  );
};

export default BottomNavigation;

/////////////////////////

// import React from 'react';
// import {View, Text, StyleSheet, ViewStyle, TextStyle} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import {useAppTheme} from '../../context/ThemeContext';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';

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
//       backgroundColor: theme.colors.background,
//       borderTopWidth: 1,
//       borderTopColor: theme.colors.surfaceBorder,
//       height: 47,
//       justifyContent: 'space-around',
//       alignItems: 'center',
//       width: '100%',
//     },
//     tabButton: {
//       width: 72,
//       height: 42,
//       alignItems: 'center',
//       justifyContent: 'flex-start',
//       paddingTop: 6,
//     },
//     tabLabel: {
//       fontSize: 9,
//       color: theme.colors.foreground,
//       fontWeight: '300',
//       marginTop: 0,
//     },
//     activeLabel: {
//       fontSize: 10,
//       color: theme.colors.primary,
//       fontWeight: '400',
//     },
//   });

//   const TabButton = ({icon, label, onPress, isActive}: TabButtonProps) => (
//     <AppleTouchFeedback
//       style={themedStyles.tabButton}
//       hapticStyle={isActive ? undefined : 'impactLight'}
//       onPress={onPress}>
//       <>
//         <Icon
//           name={icon}
//           size={26}
//           color={isActive ? theme.colors.primary : theme.colors.foreground2}
//         />
//         <Text
//           style={[themedStyles.tabLabel, isActive && themedStyles.activeLabel]}>
//           {label}
//         </Text>
//       </>
//     </AppleTouchFeedback>
//   );

//   return (
//     <SafeAreaView
//       edges={['bottom']}
//       style={{backgroundColor: theme.colors.background}}>
//       <View style={themedStyles.navBar}>
//         <TabButton
//           icon="home"
//           label="Home"
//           onPress={() => current !== 'Home' && navigate('Home')}
//           isActive={current === 'Home'}
//         />

//         <TabButton
//           icon="explore"
//           label="Fashion News"
//           onPress={() => current !== 'Explore' && navigate('Explore')}
//           isActive={current === 'Explore'}
//         />

//         <TabButton
//           icon="qr-code-scanner"
//           label="Barcode"
//           onPress={() =>
//             current !== 'BarcodeScannerScreen' &&
//             navigate('BarcodeScannerScreen')
//           }
//           isActive={current === 'BarcodeScannerScreen'}
//         />

//         <TabButton
//           icon="auto-awesome"
//           label="Style Me"
//           onPress={() => current !== 'Outfit' && navigate('Outfit')}
//           isActive={current === 'Outfit'}
//         />

//         <TabButton
//           icon="style"
//           label="Wardrobe"
//           onPress={() => current !== 'Wardrobe' && navigate('Wardrobe')}
//           isActive={current === 'Wardrobe'}
//         />

//         <TabButton
//           icon="checkroom"
//           label="Saved"
//           onPress={() => current !== 'SavedOutfits' && navigate('SavedOutfits')}
//           isActive={current === 'SavedOutfits'}
//         />
//       </View>
//     </SafeAreaView>
//   );
// };

// export default BottomNavigation;

/////////////////

// import React from 'react';
// import {View, Text, StyleSheet, ViewStyle, TextStyle} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import {useAppTheme} from '../../context/ThemeContext';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';

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
//       backgroundColor: theme.colors.background,
//       borderTopWidth: 1,
//       borderTopColor: theme.colors.surfaceBorder,
//       height: 47,
//       justifyContent: 'space-around',
//       alignItems: 'center',
//       width: '100%',
//     },
//     tabButton: {
//       width: 90,
//       height: 42,
//       alignItems: 'center',
//       justifyContent: 'flex-start',
//       paddingTop: 6,
//     },
//     tabLabel: {
//       fontSize: 9,
//       color: theme.colors.foreground,
//       fontWeight: '300',
//       marginTop: 0,
//     },
//     activeLabel: {
//       fontSize: 10,
//       color: theme.colors.primary,
//       fontWeight: '400',
//     },
//   });

//   const TabButton = ({icon, label, onPress, isActive}: TabButtonProps) => (
//     <AppleTouchFeedback
//       style={themedStyles.tabButton}
//       // Only buzz when changing tabs; no haptic on active tab
//       hapticStyle={isActive ? undefined : 'impactLight'}
//       onPress={onPress}>
//       <>
//         <Icon
//           name={icon}
//           size={26}
//           color={isActive ? theme.colors.primary : theme.colors.foreground2}
//         />
//         <Text
//           style={[themedStyles.tabLabel, isActive && themedStyles.activeLabel]}>
//           {label}
//         </Text>
//       </>
//     </AppleTouchFeedback>
//   );

//   return (
//     <SafeAreaView
//       edges={['bottom']}
//       style={{backgroundColor: theme.colors.background}}>
//       <View style={themedStyles.navBar}>
//         <TabButton
//           icon="home"
//           label="Home"
//           onPress={() => current !== 'Home' && navigate('Home')}
//           isActive={current === 'Home'}
//         />
//         <TabButton
//           icon="explore"
//           label="Fashion News"
//           onPress={() => current !== 'Explore' && navigate('Explore')}
//           isActive={current === 'Explore'}
//         />
//         <TabButton
//           icon="auto-awesome"
//           label="Style Me"
//           onPress={() => current !== 'Outfit' && navigate('Outfit')}
//           isActive={current === 'Outfit'}
//         />
//         <TabButton
//           icon="style"
//           label="Wardrobe"
//           onPress={() => current !== 'Wardrobe' && navigate('Wardrobe')}
//           isActive={current === 'Wardrobe'}
//         />
//         <TabButton
//           icon="checkroom"
//           label="Saved Outfits"
//           onPress={() => current !== 'SavedOutfits' && navigate('SavedOutfits')}
//           isActive={current === 'SavedOutfits'}
//         />
//       </View>
//     </SafeAreaView>
//   );
// };

// export default BottomNavigation;

//////////////////////////

// import React from 'react';
// import {View, Text, StyleSheet, ViewStyle, TextStyle} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import {SafeAreaView} from 'react-native-safe-area-context';
// import {useAppTheme} from '../../context/ThemeContext';
// import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';

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
//       backgroundColor: theme.colors.background,
//       borderTopWidth: 1,
//       borderTopColor: theme.colors.surfaceBorder,
//       height: 47,
//       justifyContent: 'space-around',
//       alignItems: 'center',
//       width: '100%',
//     },
//     tabButton: {
//       width: 90,
//       height: 42,
//       alignItems: 'center',
//       justifyContent: 'flex-start',
//       paddingTop: 6,
//     },
//     tabLabel: {
//       fontSize: 9,
//       color: theme.colors.foreground,
//       fontWeight: '300',
//       marginTop: 0,
//     },
//     activeLabel: {
//       fontSize: 10,
//       color: theme.colors.primary,
//       fontWeight: '400',
//     },
//   });

//   const TabButton = ({icon, label, onPress, isActive}: TabButtonProps) => (
//     <AppleTouchFeedback
//       style={themedStyles.tabButton}
//       hapticStyle="impactLight"
//       onPress={onPress}>
//       <>
//         <Icon
//           name={icon}
//           size={icon === 'home' ? 26 : 26}
//           // style={{marginTop: -32}}
//           color={isActive ? theme.colors.primary : theme.colors.foreground2}
//         />
//         <Text
//           style={[themedStyles.tabLabel, isActive && themedStyles.activeLabel]}>
//           {label}
//         </Text>
//       </>
//     </AppleTouchFeedback>
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
//           icon="explore"
//           label="Fashion News"
//           onPress={() => navigate('Explore')}
//           isActive={current === 'Explore'}
//         />
//         <TabButton
//           icon="auto-awesome"
//           label="Style Me"
//           onPress={() => navigate('Outfit')}
//           isActive={current === 'Outfit'}
//         />
//         <TabButton
//           icon="style"
//           label="Wardrobe"
//           onPress={() => navigate('Wardrobe')}
//           isActive={current === 'Closet'}
//         />

//         <TabButton
//           icon="checkroom"
//           label="Saved Outfits"
//           onPress={() => navigate('SavedOutfits')}
//           isActive={current === 'SavedOutfits'}
//         />
//       </View>
//     </SafeAreaView>
//   );
// };

// export default BottomNavigation;
