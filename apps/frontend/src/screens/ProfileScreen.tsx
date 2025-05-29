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

/////////////

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
//   });

//   return (
//     <ScrollView contentContainerStyle={styles.container}>
//       <View style={styles.avatarWrapper}>
//         <Image
//           source={{uri: user.avatarUrl || 'https://placekitten.com/300/300'}}
//           style={styles.avatar}
//         />
//       </View>

//       <Text style={styles.nameText}>{user.name || 'Guest'}</Text>
//       <Text style={styles.email}>mike.giffin@example.com</Text>

//       <View style={styles.editRow}>
//         <Text style={styles.editProfile}>App Settings</Text>
//         <TouchableOpacity
//           onPress={() => navigate('Settings')}
//           style={styles.gearIcon}>
//           <Icon name="settings" size={20} color={theme.colors.primary} />
//         </TouchableOpacity>
//       </View>

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

//////////////

// import React from 'react';
// import {View, Text, StyleSheet, Image, ScrollView} from 'react-native';
// import BioSection from '../components/BioSection/BioSection';
// import type {Screen} from '../navigation/types';
// import {useAppTheme} from '../context/ThemeContext';

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
//     statsRow: {
//       flexDirection: 'row',
//       marginTop: 18,
//       marginBottom: 24,
//       justifyContent: 'space-around',
//       width: '80%',
//     },
//     statBox: {
//       backgroundColor: '#405de6', // Instagram blue-ish purple
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
//       color: '#fff', // white text
//     },
//     statLabel: {
//       marginTop: 6,
//       fontSize: 14,
//       color: '#fff', // white text
//       textAlign: 'center',
//     },
//     sectionTitle: {
//       fontWeight: '700',
//       fontSize: 16,
//       alignSelf: 'flex-start',
//       marginLeft: 24,
//       marginBottom: 12,
//       color: theme.colors.onBackground || theme.colors.primary,
//     },
//     tagsContainer: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'flex-start',
//       width: '90%',
//       marginBottom: 24,
//       gap: 8,
//     },
//     email: {
//       fontSize: 16,
//       color: '#405de6',
//       fontWeight: '600',
//       marginBottom: 18,
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
//   });

//   return (
//     <ScrollView contentContainerStyle={styles.container}>
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
//       <BioSection
//         initialBio=""
//         onBioChange={(text: any) => console.log('Bio changed:', text)}
//       />
//     </ScrollView>
//   );
// }

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
// import type {Screen} from '../navigation/types';
// import {useAppTheme} from '../context/ThemeContext';

// type Props = {
//   navigate: (screen: Screen) => void;
//   user: {name: string; avatarUrl?: string};
//   wardrobe: any[];
// };

// const favoriteBrands = ['Ferragamo', 'Eton', 'GOBI', 'Amiri']; // example data
// const styleTags = ['Modern', 'Tailored', 'Neutral Tones', 'Luxury'];

// export default function ProfileScreen({navigate, user, wardrobe}: Props) {
//   const {theme} = useAppTheme();
//   const totalItems = wardrobe.length;
//   const favoriteCount = wardrobe.filter(i => i.favorite).length;

//   const styles = StyleSheet.create({
//     container: {
//       padding: 30,
//       alignItems: 'center',
//       flexGrow: 1,
//       backgroundColor: theme.colors.background,
//     },
//     avatarWrapper: {
//       position: 'relative',
//       marginBottom: 16,
//     },
//     avatar: {
//       width: 140,
//       height: 140,
//       borderRadius: 70,
//       zIndex: 10,
//       borderWidth: 3,
//       borderColor: theme.colors.primary,
//     },
//     avatarGlow: {
//       position: 'absolute',
//       top: -6,
//       left: -6,
//       width: 152,
//       height: 152,
//       borderRadius: 76,
//       backgroundColor: theme.colors.primary + '66', // 40% opacity
//       shadowColor: theme.colors.primary,
//       shadowRadius: 15,
//       shadowOpacity: 0.8,
//       shadowOffset: {width: 0, height: 0},
//       zIndex: 5,
//     },
//     heading: {
//       fontSize: 32,
//       fontWeight: '900',
//       color: theme.colors.primary,
//       marginBottom: 24,
//       letterSpacing: 1.2,
//     },
//     statsContainer: {
//       flexDirection: 'row',
//       justifyContent: 'space-around',
//       width: '100%',
//       marginBottom: 32,
//     },
//     statCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       paddingVertical: 24,
//       paddingHorizontal: 30,
//       alignItems: 'center',
//       width: '45%',
//       shadowColor: '#000', // black shadow color
//       shadowOffset: {width: 7, height: 7}, // horizontal & vertical offset
//       shadowOpacity: 0.5, // opacity of shadow
//       shadowRadius: 5, // blur radius
//       elevation: 10, // for Android shadow
//     },
//     statNumber: {
//       fontSize: 36,
//       fontWeight: '700',
//       color: theme.colors.foreground,
//     },
//     statLabel: {
//       marginTop: 6,
//       fontSize: 16,
//       fontWeight: '600',
//       color: theme.colors.prim,
//     },
//     section: {
//       width: '100%',
//       marginBottom: 30,
//     },
//     sectionTitle: {
//       fontSize: 22,
//       fontWeight: '700',
//       color: theme.colors.primary,
//       marginBottom: 12,
//     },
//     tagsContainer: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       gap: 10,
//     },
//     tag: {
//       backgroundColor: theme.colors.foreground2,
//       borderRadius: 20,
//       paddingVertical: 6,
//       paddingHorizontal: 14,
//       marginRight: 10,
//       marginBottom: 10,
//     },
//     tagText: {
//       fontSize: 14,
//       fontWeight: '600',
//       color: 'black',
//     },
//     button: {
//       backgroundColor: theme.colors.foreground2,
//       paddingVertical: 14,
//       paddingHorizontal: 80,
//       borderRadius: 40,
//       marginTop: 20,
//       marginBottom: 40,
//       shadowColor: theme.colors.primary,
//       shadowOpacity: 0.7,
//       shadowRadius: 15,
//       shadowOffset: {width: 0, height: 6},
//     },
//     buttonText: {
//       color: theme.colors.onPrimary,
//       fontWeight: '900',
//       fontSize: 18,
//       textAlign: 'center',
//     },
//   });

//   return (
//     <ScrollView contentContainerStyle={styles.container}>
//       <View style={styles.avatarWrapper}>
//         <Image
//           style={styles.avatar}
//           source={{uri: user.avatarUrl || 'https://placekitten.com/300/300'}}
//         />
//         <View style={styles.avatarGlow} />
//       </View>

//       <Text style={styles.heading}>{user.name || 'Guest'}</Text>

//       <View style={styles.statsContainer}>
//         <View style={styles.statCard}>
//           <Text style={styles.statNumber}>{totalItems}</Text>
//           <Text style={styles.statLabel}>Items in Wardrobe</Text>
//         </View>
//         <View style={styles.statCard}>
//           <Text style={styles.statNumber}>{favoriteCount}</Text>
//           <Text style={styles.statLabel}>Favorites</Text>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Style Tags</Text>
//         <View style={styles.tagsContainer}>
//           {styleTags.map(tag => (
//             <View key={tag} style={styles.tag}>
//               <Text style={styles.tagText}>#{tag}</Text>
//             </View>
//           ))}
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Favorite Brands</Text>
//         <View style={styles.tagsContainer}>
//           {favoriteBrands.map(brand => (
//             <View key={brand} style={styles.tag}>
//               <Text style={styles.tagText}>{brand}</Text>
//             </View>
//           ))}
//         </View>
//       </View>
//     </ScrollView>
//   );
// }

/////////////

// import React from 'react';
// import {View, Text, StyleSheet, Image, ScrollView, Button} from 'react-native';
// import type {Screen, NavigateFunction} from '../navigation/types'; // if you have it

// type Props = {
//   navigate: (screen: Screen) => void;
//   user: {name: string; avatarUrl?: string};
//   wardrobe: any[];
// };

// export default function ProfileScreen({navigate, user, wardrobe}: Props) {
//   const totalItems = wardrobe.length;
//   const favoriteCount = wardrobe.filter(i => i.favorite).length;

//   return (
//     <ScrollView contentContainerStyle={styles.container}>
//       <Text style={styles.heading}>👤 {user.name || 'Guest'}</Text>

//       <Image
//         style={styles.avatar}
//         source={{uri: user.avatarUrl || 'https://placekitten.com/300/300'}}
//       />

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Items in Wardrobe</Text>
//         <Text style={styles.sectionText}>{totalItems}</Text>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Favorites</Text>
//         <Text style={styles.sectionText}>{favoriteCount}</Text>
//       </View>

//       <Button title="Back to Home" onPress={() => navigate('Home')} />
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     padding: 24,
//     backgroundColor: '#fdfdfd',
//   },
//   heading: {
//     fontSize: 28,
//     fontWeight: 'bold',
//     marginBottom: 12,
//   },
//   subheading: {
//     fontSize: 16,
//     color: '#666',
//     marginBottom: 20,
//   },
//   avatar: {
//     width: 150,
//     height: 150,
//     borderRadius: 75,
//     alignSelf: 'center',
//     marginBottom: 20,
//   },
//   section: {
//     marginBottom: 24,
//   },
//   sectionTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     marginBottom: 6,
//   },
//   sectionText: {
//     fontSize: 15,
//     color: '#333',
//   },
// });
