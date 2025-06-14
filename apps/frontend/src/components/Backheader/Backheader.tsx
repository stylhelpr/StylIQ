import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
import {useAppTheme} from '../../context/ThemeContext';

type Props = {
  title: string;
  onBack: () => void;
};

export default function BackHeader({title, onBack}: Props) {
  const {theme} = useAppTheme();

  return (
    <View style={[styles.header, {backgroundColor: theme.colors.background}]}>
      <AppleTouchFeedback
        onPress={onBack}
        hapticStyle="impactMedium"
        style={styles.iconWrapper}>
        <Icon name="arrow-back" size={24} color={theme.colors.primary} />
      </AppleTouchFeedback>
      <Text style={[styles.title, {color: theme.colors.primary}]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconWrapper: {
    paddingRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
});

///////////

// import React from 'react';
// import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';

// type Props = {
//   title: string;
//   onBack: () => void;
// };

// export default function BackHeader({title, onBack}: Props) {
//   return (
//     <View style={styles.header}>
//       <TouchableOpacity onPress={onBack} style={styles.iconWrapper}>
//         <Icon name="arrow-back" size={24} color="#fff" />
//       </TouchableOpacity>
//       <Text style={styles.title}>{title}</Text>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 16,
//     backgroundColor: '#000', // Or use your theme
//   },
//   iconWrapper: {
//     paddingRight: 12,
//   },
//   title: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#fff',
//   },
// });
