import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import BioSection from '../components/BioSection/BioSection';
import type {Screen} from '../navigation/types';
import {useAppTheme} from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LayoutWrapper from '../components/LayoutWrapper/LayoutWrapper';

type Props = {
  navigate: (screen: Screen) => void;
  user: {name: string; avatarUrl?: string};
  wardrobe: any[];
};

const favoriteBrands = ['Ferragamo', 'Eton', 'GOBI', 'Amiri'];
const styleTags = ['Modern', 'Tailored', 'Neutral Tones', 'Luxury'];

export default function ProfileScreen({navigate, user, wardrobe}: Props) {
  const {theme} = useAppTheme();
  const totalItems = wardrobe.length;
  const favoriteCount = wardrobe.filter(i => i.favorite).length;

  const styles = StyleSheet.create({
    container: {
      flexGrow: 1,
      paddingVertical: 16,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    avatarWrapper: {
      marginTop: 24,
      marginBottom: 8,
      position: 'relative',
    },
    avatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 2,
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.surface,
    },
    nameText: {
      marginTop: 6,
      fontWeight: '700',
      fontSize: 24,
      color: theme.colors.onBackground || theme.colors.primary,
      textAlign: 'center',
    },
    email: {
      fontSize: 16,
      color: '#405de6',
      fontWeight: '600',
      marginBottom: 10,
    },
    editRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    editProfile: {
      color: theme.colors.primary,
      fontWeight: '600',
      fontSize: 14,
      marginRight: 8,
    },
    gearIcon: {
      padding: 4,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      width: '100%',
      marginBottom: 24,
    },
    statBox: {
      backgroundColor: '#405de6',
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 22,
      alignItems: 'center',
      minWidth: 110,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 8,
      shadowOffset: {width: 0, height: 3},
      elevation: 5,
    },
    statNumber: {
      fontWeight: '700',
      fontSize: 22,
      color: '#fff',
    },
    statLabel: {
      marginTop: 6,
      fontSize: 14,
      color: '#fff',
      textAlign: 'center',
    },
    sectionTitle: {
      fontWeight: '700',
      fontSize: 16,
      alignSelf: 'flex-start',
      marginBottom: 12,
      color: theme.colors.onBackground || theme.colors.primary,
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      width: '100%',
      marginBottom: 24,
      gap: 8,
    },
    tag: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      marginRight: 8,
      marginBottom: 8,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 6,
      shadowOffset: {width: 0, height: 2},
      elevation: 3,
    },
    tagText: {
      fontWeight: '600',
      fontSize: 14,
      color: theme.colors.primary,
    },
    settingsButton: {
      position: 'absolute',
      top: 16,
      right: 16,
      zIndex: 10,
      padding: 8,
    },
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Top-right gear icon */}
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => navigate('Settings')}>
        <Icon name="settings" size={24} color={theme.colors.primary} />
      </TouchableOpacity>

      <View style={styles.avatarWrapper}>
        <Image
          source={{uri: user.avatarUrl || 'https://placekitten.com/300/300'}}
          style={styles.avatar}
        />
      </View>

      <Text style={styles.nameText}>{user.name || 'Guest'}</Text>
      <Text style={styles.email}>mike.giffin@example.com</Text>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{totalItems}</Text>
          <Text style={styles.statLabel}>Items in Wardrobe</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{favoriteCount}</Text>
          <Text style={styles.statLabel}>Favorites</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Bio</Text>
      <BioSection
        initialBio=""
        onBioChange={(text: any) => console.log('Bio changed:', text)}
      />

      <Text style={styles.sectionTitle}>Style Tags</Text>
      <View style={styles.tagsContainer}>
        {styleTags.map(tag => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>#{tag}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Favorite Brands</Text>
      <View style={styles.tagsContainer}>
        {favoriteBrands.map(brand => (
          <View key={brand} style={styles.tag}>
            <Text style={styles.tagText}>{brand}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

//////////////

// import React from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   TouchableOpacity,
// } from 'react-native';
// import BioSection from '../components/BioSection/BioSection';
// import type {Screen} from '../navigation/types';
// import {useAppTheme} from '../context/ThemeContext';
// import Icon from 'react-native-vector-icons/MaterialIcons';

// type Props = {
//   navigate: (screen: Screen) => void;
//   user: {name: string; avatarUrl?: string};
//   wardrobe: any[];
// };

// const favoriteBrands = ['Ferragamo', 'Eton', 'GOBI', 'Amiri'];
// const styleTags = ['Modern', 'Tailored', 'Neutral Tones', 'Luxury'];

// export default function ProfileScreen({navigate, user, wardrobe}: Props) {
//   const {theme} = useAppTheme();
//   const totalItems = wardrobe.length;
//   const favoriteCount = wardrobe.filter(i => i.favorite).length;

//   const styles = StyleSheet.create({
//     container: {
//       flexGrow: 1,
//       paddingVertical: 16,
//       backgroundColor: theme.colors.background,
//       alignItems: 'center',
//       paddingHorizontal: 20,
//     },
//     avatarWrapper: {
//       marginTop: 24,
//       marginBottom: 8,
//       position: 'relative',
//     },
//     avatar: {
//       width: 120,
//       height: 120,
//       borderRadius: 60,
//       borderWidth: 2,
//       borderColor: theme.colors.primary,
//       backgroundColor: theme.colors.surface,
//     },
//     nameText: {
//       marginTop: 6,
//       fontWeight: '700',
//       fontSize: 24,
//       color: theme.colors.onBackground || theme.colors.primary,
//       textAlign: 'center',
//     },
//     email: {
//       fontSize: 16,
//       color: '#405de6',
//       fontWeight: '600',
//       marginBottom: 10,
//     },
//     editRow: {
//       flexDirection: 'row',
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginBottom: 12,
//     },
//     editProfile: {
//       color: theme.colors.primary,
//       fontWeight: '600',
//       fontSize: 14,
//       marginRight: 8,
//     },
//     gearIcon: {
//       padding: 4,
//     },
//     statsRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-around',
//       width: '100%',
//       marginBottom: 24,
//     },
//     statBox: {
//       backgroundColor: '#405de6',
//       borderRadius: 14,
//       paddingVertical: 14,
//       paddingHorizontal: 22,
//       alignItems: 'center',
//       minWidth: 110,
//       shadowColor: '#000',
//       shadowOpacity: 0.25,
//       shadowRadius: 8,
//       shadowOffset: {width: 0, height: 3},
//       elevation: 5,
//     },
//     statNumber: {
//       fontWeight: '700',
//       fontSize: 22,
//       color: '#fff',
//     },
//     statLabel: {
//       marginTop: 6,
//       fontSize: 14,
//       color: '#fff',
//       textAlign: 'center',
//     },
//     sectionTitle: {
//       fontWeight: '700',
//       fontSize: 16,
//       alignSelf: 'flex-start',
//       marginBottom: 12,
//       color: theme.colors.onBackground || theme.colors.primary,
//     },
//     tagsContainer: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'flex-start',
//       width: '100%',
//       marginBottom: 24,
//       gap: 8,
//     },
//     tag: {
//       backgroundColor: theme.colors.surface,
//       paddingHorizontal: 14,
//       paddingVertical: 6,
//       borderRadius: 20,
//       marginRight: 8,
//       marginBottom: 8,
//       shadowColor: '#000',
//       shadowOpacity: 0.1,
//       shadowRadius: 6,
//       shadowOffset: {width: 0, height: 2},
//       elevation: 3,
//     },
//     tagText: {
//       fontWeight: '600',
//       fontSize: 14,
//       color: theme.colors.primary,
//     },
//     settingsButton: {
//       position: 'absolute',
//       top: 16,
//       right: 16,
//       zIndex: 10,
//       padding: 8,
//     },
//   });

//   return (
//     <ScrollView contentContainerStyle={styles.container}>
//       {/* Top-right gear icon */}
//       <TouchableOpacity
//         style={styles.settingsButton}
//         onPress={() => navigate('Settings')}>
//         <Icon name="settings" size={24} color={theme.colors.primary} />
//       </TouchableOpacity>
//       <View style={styles.avatarWrapper}>
//         <Image
//           source={{uri: user.avatarUrl || 'https://placekitten.com/300/300'}}
//           style={styles.avatar}
//         />
//       </View>

//       <Text style={styles.nameText}>{user.name || 'Guest'}</Text>
//       <Text style={styles.email}>mike.giffin@example.com</Text>

//       <View style={styles.statsRow}>
//         <View style={styles.statBox}>
//           <Text style={styles.statNumber}>{totalItems}</Text>
//           <Text style={styles.statLabel}>Items in Wardrobe</Text>
//         </View>
//         <View style={styles.statBox}>
//           <Text style={styles.statNumber}>{favoriteCount}</Text>
//           <Text style={styles.statLabel}>Favorites</Text>
//         </View>
//       </View>

//       <Text style={styles.sectionTitle}>Bio</Text>
//       <BioSection
//         initialBio=""
//         onBioChange={(text: any) => console.log('Bio changed:', text)}
//       />

//       <Text style={styles.sectionTitle}>Style Tags</Text>
//       <View style={styles.tagsContainer}>
//         {styleTags.map(tag => (
//           <View key={tag} style={styles.tag}>
//             <Text style={styles.tagText}>#{tag}</Text>
//           </View>
//         ))}
//       </View>

//       <Text style={styles.sectionTitle}>Favorite Brands</Text>
//       <View style={styles.tagsContainer}>
//         {favoriteBrands.map(brand => (
//           <View key={brand} style={styles.tag}>
//             <Text style={styles.tagText}>{brand}</Text>
//           </View>
//         ))}
//       </View>
//     </ScrollView>
//   );
// }
