import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import type {Screen} from '../navigation/types';

type Props = {
  navigate: (screen: string) => void;
  user: {name: string; avatarUrl?: string};
  wardrobe: any[];
};

const storyHighlights = [
  'Luxury',
  'Vintage',
  'Posh',
  'Modern',
  'Classic',
  'Avant-Garde',
  'Minimalist',
  'Streetwear',
  'Bohemian',
  'Preppy',
  'Retro',
  'Chic',
  'Eclectic',
  'Casual',
  'Formal',
  'Sporty',
  'Business',
  'Grunge',
  'Artsy',
  'Resortwear',
];

const profileImages = [
  {
    id: '1',
    uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '2',
    uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '3',
    uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '4',
    uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '5',
    uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '6',
    uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '7',
    uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '8',
    uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '9',
    uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '10',
    uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '11',
    uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '12',
    uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '13',
    uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '14',
    uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '15',
    uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '16',
    uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '17',
    uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: '18',
    uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
  },
];

export default function ProfileScreen({navigate, user, wardrobe}: Props) {
  const {theme} = useAppTheme();
  const favorites = wardrobe.filter(i => i.favorite);
  const totalItems = wardrobe.length;
  const favoriteCount = wardrobe.filter(i => i.favorite).length;

  const styleTags = [
    'Modern',
    'Tailored',
    'Neutral Tones',
    'Minimalist',
    'Streetwear',
    'Monochrome',
    'Layered',
    'Luxury',
    'Smart Casual',
  ];

  const favoriteBrands = [
    'Ferragamo',
    'Eton',
    'GOBI',
    'Amiri',
    'Gucci',
    'Versace',
    'Tom Ford',
    'Prada',
    'Burberry',
    'Balmain',
    'Brioni',
    'Berluti',
  ];

  const styles = StyleSheet.create({
    headerRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 4,
      alignItems: 'center',
    },
    settingsButton: {
      position: 'absolute',
      top: 0,
      right: 16,
      zIndex: 10,
      padding: 8,
    },
    container: {
      paddingTop: 12,
      paddingBottom: 20,
      backgroundColor: theme.colors.background,
      minHeight: '100%',
    },
    avatarWrapper: {
      marginRight: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    avatarBorder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 3,
      borderColor: 'grey',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatar: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: theme.colors.surface,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      flex: 1,
    },
    statBox: {
      alignItems: 'center',
    },
    statNumber: {
      fontWeight: 'bold',
      fontSize: 16,
      color: 'white',
    },
    statLabel: {
      fontSize: 14,
      color: '#bbb',
      fontWeight: '600',
    },
    bioContainer: {
      paddingHorizontal: 16,
      marginTop: 6,
      marginBottom: 4,
    },
    nameText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 15,
    },
    bioText: {
      color: 'white',
      fontSize: 14,
      marginTop: 4,
      lineHeight: 18,
    },
    linkText: {
      color: '#4ea1f2',
      fontSize: 14,
      marginTop: 2,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
      paddingHorizontal: 16,
      gap: 6,
    },
    actionButton: {
      flex: 1,
      backgroundColor: '#405de6',
      paddingVertical: 6,
      borderRadius: 6,
      alignItems: 'center',
    },
    buttonText: {
      color: 'white',
      fontWeight: '600',
      fontSize: 16,
    },
    highlightsScroll: {
      marginTop: 0,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    highlightCircle: {
      alignItems: 'center',
      marginRight: 24,
    },
    highlightText: {
      marginTop: 8,
      color: '#ddd',
      fontSize: 12,
    },
    gridRow: {
      justifyContent: 'space-between',
      paddingHorizontal: 1,
    },
    imageGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      paddingHorizontal: 1,
      minHeight: 300,
    },
    gridImage: {
      width: '33.33%',
      height: 120,
      marginBottom: 1,
      backgroundColor: '#000',
    },
    tabRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: 8,
      marginTop: 10,
    },
    tabIcon: {
      paddingHorizontal: 16,
    },
    highlightBorder: {
      width: 70,
      height: 70,
      // borderRadius: 35,
      // borderWidth: 2,
      // borderColor: 'grey',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    highlightImage: {
      width: 84,
      height: 84,
      // borderRadius: 32,
      borderRadius: 10,
      backgroundColor: '#888',
    },
    sectionTitle: {
      fontWeight: '700',
      fontSize: 14,
      color: '#fff',
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 4,
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      width: '100%',
      paddingHorizontal: 16,
      marginBottom: 12,
      gap: 8,
    },
    tag: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 18,
      marginRight: 8,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 4,
      shadowOffset: {width: 0, height: 1},
      elevation: 2,
    },
    tagText: {
      fontWeight: '600',
      fontSize: 13,
      color: theme.colors.primary,
    },
  });

  return (
    <View style={{flex: 1}}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigate('Settings')}>
          <Icon name="settings" size={24} color={theme.colors.primary} />
        </TouchableOpacity>

        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarBorder}>
              <Image
                source={
                  user.avatarUrl
                    ? require('../assets/images/free1.jpg')
                    : {uri: user.avatarUrl}
                }
                style={styles.avatar}
              />
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{wardrobe.length}</Text>
              <Text style={styles.statLabel}>Items</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>50</Text>
              <Text style={styles.statLabel}>Outfits</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{favoriteCount}</Text>
              <Text style={styles.statLabel}>Favorites</Text>
            </View>
          </View>
        </View>

        {/* Name and Bio */}
        <View style={styles.bioContainer}>
          <Text style={styles.nameText}>{user.name || 'Guest'}</Text>
          <Text style={styles.bioText}>
            Fahion Expert{'\n'}Software Enggineer
          </Text>
          <Text style={styles.linkText}>giffinmike@hotmail.com</Text>
        </View>

        {/* Buttons Row */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.actionButton, {marginRight: 6}]}>
            <Text style={styles.buttonText}>Boards</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, {marginRight: 6}]}>
            <Text style={styles.buttonText}>Trends</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, {marginRight: 6}]}>
            <Icon name="email" size={18} color="white" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Style Tags</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingLeft: 16, paddingRight: 8}}
          style={styles.highlightsScroll}>
          {styleTags.map(tag => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </ScrollView>
        <Text style={styles.sectionTitle}>Favorite Brands</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingLeft: 16, paddingRight: 8}}
          style={styles.highlightsScroll}>
          {favoriteBrands.map(brand => (
            <View key={brand} style={styles.tag}>
              <Text style={styles.tagText}>{brand}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Story Highlights */}
        <Text style={styles.sectionTitle}>Favorite Outfits</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.highlightsScroll}>
          {storyHighlights.map((label, index) => (
            <View key={index} style={styles.highlightCircle}>
              <View style={styles.highlightBorder}>
                <Image
                  source={{
                    uri: profileImages[index % profileImages.length].uri,
                  }}
                  style={styles.highlightImage}
                />
              </View>
              <Text style={styles.highlightText}>{label}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.tabRow}>
          <TouchableOpacity style={styles.tabIcon}>
            <Icon name="grid-on" size={26} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabIcon}>
            <Icon name="play-circle-outline" size={28} color="gray" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabIcon}>
            <Icon name="portrait" size={28} color="gray" />
          </TouchableOpacity>
        </View>

        {/* Grid Posts */}
        <View style={styles.imageGrid}>
          {profileImages.map((img, index) => (
            <Image
              key={img.id || index.toString()}
              source={{uri: img.uri}}
              style={styles.gridImage}
              resizeMode="cover"
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

///////////

// import React from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   TouchableOpacity,
//   FlatList,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import Icon from 'react-native-vector-icons/MaterialIcons';

// type Props = {
//   navigate: (screen: string) => void;
//   user: {name: string; avatarUrl?: string};
//   wardrobe: any[];
// };

// const storyHighlights = [
//   'Luxury',
//   'Vintge',
//   'Posh',
//   'Modern',
//   'Classic',
//   'Luxury',
//   'Vintge',
//   'Posh',
//   'Modern',
//   'Classic',
//   'Luxury',
//   'Vintge',
//   'Posh',
//   'Modern',
//   'Classic',
//   'Luxury',
//   'Vintge',
//   'Posh',
//   'Modern',
//   'Classic',
// ];

// const profileImages = [
//   {
//     id: '1',
//     uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '2',
//     uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '3',
//     uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '4',
//     uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '5',
//     uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '6',
//     uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '7',
//     uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '8',
//     uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '9',
//     uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '10',
//     uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '11',
//     uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '12',
//     uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '13',
//     uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '14',
//     uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '15',
//     uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '16',
//     uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '17',
//     uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '18',
//     uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
// ];

// export default function ProfileScreen({navigate, user, wardrobe}: Props) {
//   const {theme} = useAppTheme();
//   const totalItems = wardrobe.length;
//   const favorites = wardrobe.filter(i => i.favorite);
//   const styleTags = [
//     'Modern',
//     'Tailored',
//     'Neutral Tones',
//     'Modern',
//     'Tailored',
//     'Neutral Tones',
//     'Modern',
//     'Tailored',
//     'Neutral Tones',
//     'Modern',
//     'Tailored',
//     'Neutral Tones',
//     'Modern',
//     'Tailored',
//     'Neutral Tones',
//     'Modern',
//     'Tailored',
//     'Neutral Tones',
//     'Modern',
//     'Tailored',
//     'Neutral Tones',
//     'Modern',
//     'Tailored',
//     'Neutral Tones',
//     'Modern',
//     'Tailored',
//     'Neutral Tones',
//   ];
//   const favoriteBrands = [
//     'Ferragamo',
//     'Eton',
//     'GOBI',
//     'Amiri',
//     'Ferragamo',
//     'Eton',
//     'GOBI',
//     'Amiri',
//     'Ferragamo',
//     'Eton',
//     'GOBI',
//     'Amiri',
//     'Ferragamo',
//     'Eton',
//     'GOBI',
//     'Amiri',
//     'Ferragamo',
//     'Eton',
//     'GOBI',
//     'Amiri',
//     'Ferragamo',
//     'Eton',
//     'GOBI',
//     'Amiri',
//     'Ferragamo',
//     'Eton',
//     'GOBI',
//     'Amiri',
//     'Ferragamo',
//     'Eton',
//     'GOBI',
//     'Amiri',
//     'Ferragamo',
//     'Eton',
//     'GOBI',
//     'Amiri',
//   ];

//   const styles = StyleSheet.create({
//     headerRow: {
//       flexDirection: 'row',
//       paddingHorizontal: 16,
//       alignItems: 'center',
//     },
//     settingsButton: {
//       position: 'absolute',
//       top: 0,
//       right: 16,
//       zIndex: 10,
//       padding: 8,
//     },
//     container: {
//       paddingVertical: 16,
//       backgroundColor: theme.colors.background,
//       minHeight: '100%',
//     },
//     avatarWrapper: {
//       marginRight: 20,
//       alignItems: 'center',
//       justifyContent: 'center',
//       marginBottom: 4,
//     },
//     avatarBorder: {
//       width: 100,
//       height: 100,
//       borderRadius: 50,
//       borderWidth: 3,
//       borderColor: 'grey',
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     avatar: {
//       width: 90,
//       height: 90,
//       borderRadius: 45,
//       backgroundColor: theme.colors.surface,
//     },
//     statsRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       flex: 1,
//     },
//     statBox: {
//       alignItems: 'center',
//     },
//     statNumber: {
//       fontWeight: 'bold',
//       fontSize: 16,
//       color: 'white',
//     },
//     statLabel: {
//       fontSize: 14,
//       color: '#bbb',
//       fontWeight: '600',
//     },
//     bioContainer: {
//       paddingHorizontal: 16,
//       marginTop: 6,
//     },
//     nameText: {
//       color: 'white',
//       fontWeight: 'bold',
//       fontSize: 15,
//     },
//     bioText: {
//       color: 'white',
//       fontSize: 14,
//       marginTop: 4,
//       lineHeight: 18,
//     },
//     linkText: {
//       color: '#4ea1f2',
//       fontSize: 14,
//       marginTop: 2,
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       marginTop: 12,
//       paddingHorizontal: 16,
//       gap: 8,
//     },
//     actionButton: {
//       flex: 1,
//       backgroundColor: '#405de6',
//       paddingVertical: 7,
//       borderRadius: 6,
//       alignItems: 'center',
//     },
//     buttonText: {
//       color: 'white',
//       fontWeight: '600',
//       fontSize: 16,
//     },
//     highlightsScroll: {
//       marginTop: 0,
//       paddingHorizontal: 12,
//       paddingVertical: 12,
//     },
//     highlightCircle: {
//       alignItems: 'center',
//       marginRight: 24,
//     },
//     highlightText: {
//       marginTop: 8,
//       color: '#ddd',
//       fontSize: 12,
//     },
//     gridRow: {
//       justifyContent: 'space-between',
//       paddingHorizontal: 1,
//     },
//     imageGrid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//       paddingHorizontal: 1,
//       minHeight: 300,
//     },
//     gridImage: {
//       width: '33.33%',
//       height: 120,
//       marginBottom: 1,
//       backgroundColor: '#000',
//     },
//     tabRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-around',
//       paddingVertical: 12,
//       marginTop: 12,
//     },
//     tabIcon: {
//       paddingHorizontal: 20,
//     },
//     highlightBorder: {
//       width: 70,
//       height: 70,
//       // borderRadius: 35,
//       // borderWidth: 2,
//       // borderColor: 'grey',
//       alignItems: 'center',
//       justifyContent: 'center',
//       marginBottom: 4,
//     },
//     highlightImage: {
//       width: 84,
//       height: 84,
//       // borderRadius: 32,
//       borderRadius: 10,
//       backgroundColor: '#888',
//     },
//     sectionTitle: {
//       fontWeight: '700',
//       fontSize: 15,
//       color: '#fff',
//       paddingHorizontal: 16,
//       paddingTop: 16,
//       paddingBottom: 6,
//     },
//     tagsContainer: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'flex-start',
//       width: '100%',
//       paddingHorizontal: 16,
//       marginBottom: 12,
//       gap: 8,
//     },
//     tag: {
//       backgroundColor: theme.colors.surface,
//       paddingHorizontal: 14,
//       paddingVertical: 6,
//       borderRadius: 20,
//       marginRight: 8,
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
//     <View style={{flex: 1}}>
//       <ScrollView contentContainerStyle={styles.container}>
//         <TouchableOpacity
//           style={styles.settingsButton}
//           onPress={() => navigate('Settings')}>
//           <Icon name="settings" size={24} color={theme.colors.primary} />
//         </TouchableOpacity>

//         {/* Header Row */}
//         <View style={styles.headerRow}>
//           <View style={styles.avatarWrapper}>
//             <View style={styles.avatarBorder}>
//               <Image
//                 source={
//                   user.avatarUrl
//                     ? require('../assets/images/free1.jpg')
//                     : {uri: user.avatarUrl}
//                 }
//                 style={styles.avatar}
//               />
//             </View>
//           </View>
//           <View style={styles.statsRow}>
//             <View style={styles.statBox}>
//               <Text style={styles.statNumber}>{wardrobe.length}</Text>
//               <Text style={styles.statLabel}>Items</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Text style={styles.statNumber}>50</Text>
//               <Text style={styles.statLabel}>Outfits</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Text style={styles.statNumber}>5</Text>
//               <Text style={styles.statLabel}>Trends</Text>
//             </View>
//           </View>
//         </View>

//         {/* Name and Bio */}
//         <View style={styles.bioContainer}>
//           <Text style={styles.nameText}>{user.name || 'Guest'}</Text>
//           <Text style={styles.bioText}>
//             Fahion Expert{'\n'}Software Enggineer
//           </Text>
//           <Text style={styles.linkText}>giffinmike@hotmail.com</Text>
//         </View>

//         {/* Buttons Row */}
//         <View style={styles.buttonRow}>
//           <TouchableOpacity style={[styles.actionButton, {marginRight: 6}]}>
//             <Text style={styles.buttonText}>Boards</Text>
//           </TouchableOpacity>
//           <TouchableOpacity style={[styles.actionButton, {marginRight: 6}]}>
//             <Text style={styles.buttonText}>Trends</Text>
//           </TouchableOpacity>
//           <TouchableOpacity style={[styles.actionButton, {marginRight: 6}]}>
//             <Icon name="email" size={18} color="white" />
//           </TouchableOpacity>
//         </View>

//         <Text style={styles.sectionTitle}>Style Tags</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingLeft: 16, paddingRight: 8}}
//           style={styles.highlightsScroll}>
//           {styleTags.map(tag => (
//             <View key={tag} style={styles.tag}>
//               <Text style={styles.tagText}>#{tag}</Text>
//             </View>
//           ))}
//         </ScrollView>
//         <Text style={styles.sectionTitle}>Favorite Brands</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingLeft: 16, paddingRight: 8}}
//           style={styles.highlightsScroll}>
//           {favoriteBrands.map(brand => (
//             <View key={brand} style={styles.tag}>
//               <Text style={styles.tagText}>{brand}</Text>
//             </View>
//           ))}
//         </ScrollView>

//         {/* Story Highlights */}
//         <Text style={styles.sectionTitle}>Favorite Outfits</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           style={styles.highlightsScroll}>
//           {storyHighlights.map((label, index) => (
//             <View key={index} style={styles.highlightCircle}>
//               <View style={styles.highlightBorder}>
//                 <Image
//                   source={{
//                     uri: profileImages[index % profileImages.length].uri,
//                   }}
//                   style={styles.highlightImage}
//                 />
//               </View>
//               <Text style={styles.highlightText}>{label}</Text>
//             </View>
//           ))}
//         </ScrollView>

//         <View style={styles.tabRow}>
//           <TouchableOpacity style={styles.tabIcon}>
//             <Icon name="grid-on" size={26} color="white" />
//           </TouchableOpacity>
//           <TouchableOpacity style={styles.tabIcon}>
//             <Icon name="play-circle-outline" size={28} color="gray" />
//           </TouchableOpacity>
//           <TouchableOpacity style={styles.tabIcon}>
//             <Icon name="portrait" size={28} color="gray" />
//           </TouchableOpacity>
//         </View>

//         {/* Grid Posts */}
//         <View style={styles.imageGrid}>
//           {profileImages.map((img, index) => (
//             <Image
//               key={img.id || index.toString()}
//               source={{uri: img.uri}}
//               style={styles.gridImage}
//               resizeMode="cover"
//             />
//           ))}
//         </View>
//       </ScrollView>
//     </View>
//   );
// }

////////////

// import React from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   TouchableOpacity,
//   FlatList,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import Icon from 'react-native-vector-icons/MaterialIcons';

// type Props = {
//   navigate: (screen: string) => void;
//   user: {name: string; avatarUrl?: string};
//   wardrobe: any[];
// };

// const storyHighlights = [
//   'Thailand',
//   'Amsterdam',
//   'London',
//   'Pilot',
//   'Physique',
// ];

// const profileImages = [
//   {
//     id: '1',
//     uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '2',
//     uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '3',
//     uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '4',
//     uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '5',
//     uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '6',
//     uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '7',
//     uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '8',
//     uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '9',
//     uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '10',
//     uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '11',
//     uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '12',
//     uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '13',
//     uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '14',
//     uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '15',
//     uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '16',
//     uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '17',
//     uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '18',
//     uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
// ];

// export default function ProfileScreen({navigate, user, wardrobe}: Props) {
//   const {theme} = useAppTheme();
//   const totalItems = wardrobe.length;
//   const favorites = wardrobe.filter(i => i.favorite);
//   const styleTags = ['Modern', 'Tailored', 'Neutral Tones'];
//   const favoriteBrands = ['Ferragamo', 'Eton', 'GOBI', 'Amiri'];

//   const styles = StyleSheet.create({
//     headerRow: {
//       flexDirection: 'row',
//       paddingHorizontal: 16,
//       alignItems: 'center',
//     },
//     settingsButton: {
//       position: 'absolute',
//       top: 0,
//       right: 16,
//       zIndex: 10,
//       padding: 8,
//     },
//     container: {
//       paddingVertical: 16,
//       backgroundColor: theme.colors.background,
//       minHeight: '100%',
//     },
//     avatarWrapper: {
//       marginRight: 20,
//       alignItems: 'center',
//       justifyContent: 'center',
//       marginBottom: 4,
//     },
//     avatarBorder: {
//       width: 100,
//       height: 100,
//       borderRadius: 50,
//       borderWidth: 3,
//       borderColor: 'grey',
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     avatar: {
//       width: 90,
//       height: 90,
//       borderRadius: 45,
//       backgroundColor: theme.colors.surface,
//     },
//     statsRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       flex: 1,
//     },
//     statBox: {
//       alignItems: 'center',
//     },
//     statNumber: {
//       fontWeight: 'bold',
//       fontSize: 16,
//       color: 'white',
//     },
//     statLabel: {
//       fontSize: 14,
//       color: '#bbb',
//       fontWeight: '600',
//     },
//     bioContainer: {
//       paddingHorizontal: 16,
//       marginTop: 6,
//     },
//     nameText: {
//       color: 'white',
//       fontWeight: 'bold',
//       fontSize: 15,
//     },
//     bioText: {
//       color: 'white',
//       fontSize: 14,
//       marginTop: 4,
//       lineHeight: 18,
//     },
//     linkText: {
//       color: '#4ea1f2',
//       fontSize: 14,
//       marginTop: 2,
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       marginTop: 12,
//       paddingHorizontal: 16,
//       gap: 8,
//     },
//     actionButton: {
//       flex: 1,
//       backgroundColor: '#405de6',
//       paddingVertical: 7,
//       borderRadius: 6,
//       alignItems: 'center',
//     },
//     buttonText: {
//       color: 'white',
//       fontWeight: '600',
//       fontSize: 16,
//     },
//     highlightsScroll: {
//       marginTop: 18,
//       paddingHorizontal: 12,
//     },
//     highlightCircle: {
//       alignItems: 'center',
//       marginRight: 14,
//     },
//     highlightText: {
//       color: '#ddd',
//       fontSize: 12,
//     },
//     gridRow: {
//       justifyContent: 'space-between',
//       paddingHorizontal: 1,
//     },
//     imageGrid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//       paddingHorizontal: 1,
//       minHeight: 300,
//     },
//     gridImage: {
//       width: '33.33%',
//       height: 120,
//       marginBottom: 1,
//       backgroundColor: '#000',
//     },
//     tabRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-around',
//       paddingVertical: 12,
//       marginTop: 12,
//     },
//     tabIcon: {
//       paddingHorizontal: 20,
//     },
//     highlightBorder: {
//       width: 70,
//       height: 70,
//       borderRadius: 35,
//       borderWidth: 2,
//       borderColor: 'grey',
//       alignItems: 'center',
//       justifyContent: 'center',
//       marginBottom: 4,
//     },
//     highlightImage: {
//       width: 64,
//       height: 64,
//       borderRadius: 32,
//       backgroundColor: '#888',
//     },
//     sectionTitle: {
//       fontWeight: '700',
//       fontSize: 16,
//       alignSelf: 'flex-start',
//       marginBottom: 12,
//       marginTop: 12,
//       color: theme.colors.onBackground || theme.colors.primary,
//     },
//     tagsContainer: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'flex-start',
//       width: '100%',
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
//     <View style={{flex: 1}}>
//       <ScrollView contentContainerStyle={styles.container}>
//         <TouchableOpacity
//           style={styles.settingsButton}
//           onPress={() => navigate('Settings')}>
//           <Icon name="settings" size={24} color={theme.colors.primary} />
//         </TouchableOpacity>

//         {/* Header Row */}
//         <View style={styles.headerRow}>
//           <View style={styles.avatarWrapper}>
//             <View style={styles.avatarBorder}>
//               <Image
//                 source={
//                   user.avatarUrl
//                     ? require('../assets/images/free1.jpg')
//                     : {uri: user.avatarUrl}
//                 }
//                 style={styles.avatar}
//               />
//             </View>
//           </View>
//           <View style={styles.statsRow}>
//             <View style={styles.statBox}>
//               <Text style={styles.statNumber}>{wardrobe.length}</Text>
//               <Text style={styles.statLabel}>Items</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Text style={styles.statNumber}>50</Text>
//               <Text style={styles.statLabel}>Outfits</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Text style={styles.statNumber}>5</Text>
//               <Text style={styles.statLabel}>Trends</Text>
//             </View>
//           </View>
//         </View>

//         {/* Name and Bio */}
//         <View style={styles.bioContainer}>
//           <Text style={styles.nameText}>{user.name || 'Guest'}</Text>
//           <Text style={styles.bioText}>
//             Fahion Expert{'\n'}Software Enggineer
//           </Text>
//           <Text style={styles.linkText}>giffinmike@hotmail.com</Text>
//         </View>

//         {/* Buttons Row */}
//         <View style={styles.buttonRow}>
//           <TouchableOpacity style={[styles.actionButton, {marginRight: 6}]}>
//             <Text style={styles.buttonText}>Boards</Text>
//           </TouchableOpacity>
//           <TouchableOpacity style={[styles.actionButton, {marginRight: 6}]}>
//             <Text style={styles.buttonText}>Trends</Text>
//           </TouchableOpacity>
//           <TouchableOpacity style={[styles.actionButton, {marginRight: 6}]}>
//             <Icon name="email" size={18} color="white" />
//           </TouchableOpacity>
//         </View>

//         <Text style={styles.sectionTitle}>Style Tags</Text>
//         <View style={styles.tagsContainer}>
//           {styleTags.map(tag => (
//             <View key={tag} style={styles.tag}>
//               <Text style={styles.tagText}>#{tag}</Text>
//             </View>
//           ))}
//         </View>

//         <Text style={styles.sectionTitle}>Favorite Brands</Text>
//         <View style={styles.tagsContainer}>
//           {favoriteBrands.map(brand => (
//             <View key={brand} style={styles.tag}>
//               <Text style={styles.tagText}>{brand}</Text>
//             </View>
//           ))}
//         </View>

//         {/* Story Highlights */}
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           style={styles.highlightsScroll}>
//           {storyHighlights.map((label, index) => (
//             <View key={index} style={styles.highlightCircle}>
//               <View style={styles.highlightBorder}>
//                 <Image
//                   source={{
//                     uri: profileImages[index % profileImages.length].uri,
//                   }}
//                   style={styles.highlightImage}
//                 />
//               </View>
//               <Text style={styles.highlightText}>{label}</Text>
//             </View>
//           ))}
//         </ScrollView>

//         <View style={styles.tabRow}>
//           <TouchableOpacity style={styles.tabIcon}>
//             <Icon name="grid-on" size={26} color="white" />
//           </TouchableOpacity>
//           <TouchableOpacity style={styles.tabIcon}>
//             <Icon name="play-circle-outline" size={28} color="gray" />
//           </TouchableOpacity>
//           <TouchableOpacity style={styles.tabIcon}>
//             <Icon name="portrait" size={28} color="gray" />
//           </TouchableOpacity>
//         </View>

//         {/* Grid Posts */}
//         <View style={styles.imageGrid}>
//           {profileImages.map((img, index) => (
//             <Image
//               key={img.id || index.toString()}
//               source={{uri: img.uri}}
//               style={styles.gridImage}
//               resizeMode="cover"
//             />
//           ))}
//         </View>
//       </ScrollView>
//     </View>
//   );
// }

////////////////

// import React from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   TouchableOpacity,
//   FlatList,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import Icon from 'react-native-vector-icons/MaterialIcons';

// type Props = {
//   navigate: (screen: string) => void;
//   user: {name: string; avatarUrl?: string};
//   wardrobe: any[];
// };

// const storyHighlights = [
//   'Thailand',
//   'Amsterdam',
//   'London',
//   'Pilot',
//   'Physique',
// ];

// const profileImages = [
//   {
//     id: '1',
//     uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '2',
//     uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '3',
//     uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '4',
//     uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '5',
//     uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '6',
//     uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '7',
//     uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '8',
//     uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '9',
//     uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '10',
//     uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '11',
//     uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '12',
//     uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '13',
//     uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '14',
//     uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '15',
//     uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '16',
//     uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '17',
//     uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '18',
//     uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
// ];

// export default function ProfileScreen({navigate, user, wardrobe}: Props) {
//   const {theme} = useAppTheme();
//   const totalItems = wardrobe.length;
//   const favorites = wardrobe.filter(i => i.favorite);

//   const styles = StyleSheet.create({
//     headerRow: {
//       flexDirection: 'row',
//       paddingHorizontal: 16,
//       alignItems: 'center',
//     },
//     settingsButton: {
//       position: 'absolute',
//       top: 16,
//       right: 16,
//       zIndex: 10,
//       padding: 8,
//     },
//     container: {
//       // paddingVertical: 16,
//       backgroundColor: 'black',
//       minHeight: '100%',
//     },
//     avatarWrapper: {
//       marginRight: 20,
//       alignItems: 'center',
//       justifyContent: 'center',
//       marginBottom: 4,
//     },
//     avatarBorder: {
//       width: 100,
//       height: 100,
//       borderRadius: 50,
//       borderWidth: 3,
//       borderColor: 'grey',
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     avatar: {
//       width: 90,
//       height: 90,
//       borderRadius: 45,
//       backgroundColor: theme.colors.surface,
//     },
//     statsRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       flex: 1,
//     },
//     statBox: {
//       alignItems: 'center',
//     },
//     statNumber: {
//       fontWeight: 'bold',
//       fontSize: 16,
//       color: 'white',
//     },
//     statLabel: {
//       fontSize: 14,
//       color: '#bbb',
//       fontWeight: '600',
//     },
//     bioContainer: {
//       paddingHorizontal: 16,
//       marginTop: 6,
//     },
//     nameText: {
//       color: 'white',
//       fontWeight: 'bold',
//       fontSize: 15,
//     },
//     bioText: {
//       color: 'white',
//       fontSize: 14,
//       marginTop: 4,
//       lineHeight: 18,
//     },
//     linkText: {
//       color: '#4ea1f2',
//       fontSize: 14,
//       marginTop: 2,
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       marginTop: 12,
//       paddingHorizontal: 16,
//       gap: 8,
//     },
//     actionButton: {
//       flex: 1,
//       backgroundColor: '#405de6',
//       paddingVertical: 7,
//       borderRadius: 6,
//       alignItems: 'center',
//     },
//     buttonText: {
//       color: 'white',
//       fontWeight: '600',
//       fontSize: 16,
//     },
//     highlightsScroll: {
//       marginTop: 18,
//       paddingHorizontal: 12,
//     },
//     highlightCircle: {
//       alignItems: 'center',
//       marginRight: 14,
//     },
//     highlightText: {
//       color: '#ddd',
//       fontSize: 12,
//     },
//     gridRow: {
//       justifyContent: 'space-between',
//       paddingHorizontal: 1,
//     },
//     imageGrid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//       paddingHorizontal: 1,
//       minHeight: 300,
//     },
//     gridImage: {
//       width: '33.33%',
//       height: 120,
//       marginBottom: 1,
//       backgroundColor: '#000',
//     },
//     tabRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-around',
//       paddingVertical: 12,
//       marginTop: 12,
//     },
//     tabIcon: {
//       paddingHorizontal: 20,
//     },
//     highlightBorder: {
//       width: 70,
//       height: 70,
//       borderRadius: 35,
//       borderWidth: 2,
//       borderColor: 'grey',
//       alignItems: 'center',
//       justifyContent: 'center',
//       marginBottom: 4,
//     },
//     highlightImage: {
//       width: 64,
//       height: 64,
//       borderRadius: 32,
//       backgroundColor: '#888',
//     },
//   });

//   return (
//     <View style={{flex: 1}}>
//       <ScrollView contentContainerStyle={styles.container}>
//         {/* <TouchableOpacity
//           style={styles.settingsButton}
//           onPress={() => navigate('Settings')}>
//           <Icon name="settings" size={24} color={theme.colors.primary} />
//         </TouchableOpacity> */}

//         {/* Header Row */}
//         <View style={styles.headerRow}>
//           <View style={styles.avatarWrapper}>
//             <View style={styles.avatarBorder}>
//               <Image
//                 source={
//                   user.avatarUrl
//                     ? require('../assets/images/free1.jpg')
//                     : {uri: user.avatarUrl}
//                 }
//                 style={styles.avatar}
//               />
//             </View>
//           </View>
//           <View style={styles.statsRow}>
//             <View style={styles.statBox}>
//               <Text style={styles.statNumber}>{wardrobe.length}</Text>
//               <Text style={styles.statLabel}>Items</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Text style={styles.statNumber}>50</Text>
//               <Text style={styles.statLabel}>Outfits</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Text style={styles.statNumber}>5</Text>
//               <Text style={styles.statLabel}>Trends</Text>
//             </View>
//           </View>
//         </View>

//         {/* Name and Bio */}
//         <View style={styles.bioContainer}>
//           <Text style={styles.nameText}>{user.name || 'Guest'}</Text>
//           <Text style={styles.bioText}>
//             Fahion Expert{'\n'}Software Enggineer
//           </Text>
//           <Text style={styles.linkText}>giffinmike@hotmail.com</Text>
//         </View>

//         {/* Buttons Row */}
//         <View style={styles.buttonRow}>
//           <TouchableOpacity style={[styles.actionButton, {marginRight: 6}]}>
//             <Text style={styles.buttonText}>Boards</Text>
//           </TouchableOpacity>
//           <TouchableOpacity style={[styles.actionButton, {marginRight: 6}]}>
//             <Text style={styles.buttonText}>Trends</Text>
//           </TouchableOpacity>
//           <TouchableOpacity style={[styles.actionButton, {marginRight: 6}]}>
//             <Icon name="email" size={18} color="white" />
//           </TouchableOpacity>
//         </View>

//         {/* Story Highlights */}
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           style={styles.highlightsScroll}>
//           {storyHighlights.map((label, index) => (
//             <View key={index} style={styles.highlightCircle}>
//               <View style={styles.highlightBorder}>
//                 <Image
//                   source={{
//                     uri: profileImages[index % profileImages.length].uri,
//                   }}
//                   style={styles.highlightImage}
//                 />
//               </View>
//               <Text style={styles.highlightText}>{label}</Text>
//             </View>
//           ))}
//         </ScrollView>

//         <View style={styles.tabRow}>
//           <TouchableOpacity style={styles.tabIcon}>
//             <Icon name="grid-on" size={26} color="white" />
//           </TouchableOpacity>
//           <TouchableOpacity style={styles.tabIcon}>
//             <Icon name="play-circle-outline" size={28} color="gray" />
//           </TouchableOpacity>
//           <TouchableOpacity style={styles.tabIcon}>
//             <Icon name="portrait" size={28} color="gray" />
//           </TouchableOpacity>
//         </View>

//         {/* Grid Posts */}
//         <View style={styles.imageGrid}>
//           {profileImages.map((img, index) => (
//             <Image
//               key={img.id || index.toString()}
//               source={{uri: img.uri}}
//               style={styles.gridImage}
//               resizeMode="cover"
//             />
//           ))}
//         </View>
//       </ScrollView>
//     </View>
//   );
// }

////////////

// import React from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   TouchableOpacity,
//   FlatList,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import Icon from 'react-native-vector-icons/MaterialIcons';

// type Props = {
//   navigate: (screen: string) => void;
//   user: {name: string; avatarUrl?: string};
//   wardrobe: any[];
// };

// const storyHighlights = [
//   'Thailand',
//   'Amsterdam',
//   'London',
//   'Pilot',
//   'Physique',
// ];

// const profileImages = [
//   {
//     id: '1',
//     uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '2',
//     uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '3',
//     uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '4',
//     uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '5',
//     uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '6',
//     uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '7',
//     uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '8',
//     uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '9',
//     uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '10',
//     uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '11',
//     uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '12',
//     uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '13',
//     uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '14',
//     uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '15',
//     uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '16',
//     uri: 'https://images.unsplash.com/photo-1542068829-1115f7259450?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '17',
//     uri: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80',
//   },
//   {
//     id: '18',
//     uri: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80',
//   },
// ];

// export default function ProfileScreen({navigate, user, wardrobe}: Props) {
//   const {theme} = useAppTheme();
//   const totalItems = wardrobe.length;
//   const favorites = wardrobe.filter(i => i.favorite);

//   const styles = StyleSheet.create({
//     headerRow: {
//       flexDirection: 'row',
//       padding: 16,
//       alignItems: 'center',
//     },
//     settingsButton: {
//       position: 'absolute',
//       top: 16,
//       right: 16,
//       zIndex: 10,
//       padding: 8,
//     },
//     container: {
//       paddingVertical: 16,
//       backgroundColor: theme.colors.background,
//       minHeight: '100%',
//     },
//     avatarWrapper: {
//       marginRight: 20,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     avatarBorder: {
//       width: 100,
//       height: 100,
//       borderRadius: 50,
//       borderWidth: 3,
//       borderColor: 'grey',
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     avatar: {
//       width: 90,
//       height: 90,
//       borderRadius: 45,
//       backgroundColor: theme.colors.surface,
//     },
//     statsRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       flex: 1,
//     },
//     statBox: {
//       alignItems: 'center',
//     },
//     statNumber: {
//       fontWeight: 'bold',
//       fontSize: 16,
//       color: 'white',
//     },
//     statLabel: {
//       fontSize: 13,
//       color: '#bbb',
//     },
//     bioContainer: {
//       paddingHorizontal: 16,
//       marginTop: 6,
//     },
//     nameText: {
//       color: 'white',
//       fontWeight: 'bold',
//       fontSize: 15,
//     },
//     bioText: {
//       color: 'white',
//       fontSize: 14,
//       marginTop: 4,
//       lineHeight: 18,
//     },
//     linkText: {
//       color: '#4ea1f2',
//       fontSize: 14,
//       marginTop: 2,
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       marginTop: 12,
//       paddingHorizontal: 16,
//       gap: 8,
//     },
//     actionButton: {
//       flex: 1,
//       backgroundColor: '#405de6',
//       paddingVertical: 7,
//       borderRadius: 6,
//       alignItems: 'center',
//     },
//     buttonText: {
//       color: 'white',
//       fontWeight: '600',
//       fontSize: 16,
//     },
//     highlightsScroll: {
//       marginTop: 18,
//       paddingHorizontal: 12,
//     },
//     highlightCircle: {
//       alignItems: 'center',
//       marginRight: 14,
//     },
//     highlightImage: {
//       width: 64,
//       height: 64,
//       borderRadius: 32,
//       backgroundColor: '#888',
//       marginBottom: 4,
//     },
//     highlightText: {
//       color: '#ddd',
//       fontSize: 12,
//     },
//     gridRow: {
//       justifyContent: 'space-between',
//       paddingHorizontal: 1,
//     },
//     imageGrid: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//       paddingHorizontal: 1,
//       minHeight: 300,
//     },
//     gridImage: {
//       width: '33.33%',
//       height: 120,
//       marginBottom: 1,
//       backgroundColor: '#000',
//     },
//   });

//   return (
//     <View style={{flex: 1}}>
//       <ScrollView contentContainerStyle={styles.container}>
//         <TouchableOpacity
//           style={styles.settingsButton}
//           onPress={() => navigate('Settings')}>
//           <Icon name="settings" size={24} color={theme.colors.primary} />
//         </TouchableOpacity>

//         {/* Header Row */}
//         <View style={styles.headerRow}>
//           <View style={styles.avatarWrapper}>
//             <View style={styles.avatarBorder}>
//               <Image
//                 source={
//                   user.avatarUrl
//                     ? require('../assets/images/free1.jpg')
//                     : {uri: user.avatarUrl}
//                 }
//                 style={styles.avatar}
//               />
//             </View>
//           </View>
//           <View style={styles.statsRow}>
//             <View style={styles.statBox}>
//               <Text style={styles.statNumber}>{wardrobe.length}</Text>
//               <Text style={styles.statLabel}>Items</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Text style={styles.statNumber}>50</Text>
//               <Text style={styles.statLabel}>Outfits</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Text style={styles.statNumber}>5</Text>
//               <Text style={styles.statLabel}>Trends</Text>
//             </View>
//           </View>
//         </View>

//         {/* Name and Bio */}
//         <View style={styles.bioContainer}>
//           <Text style={styles.nameText}>{user.name || 'Guest'}</Text>
//           <Text style={styles.bioText}>
//             Fahion Expert{'\n'}Software Enggineer
//           </Text>
//           <Text style={styles.linkText}>giffinmike@hotmail.com</Text>
//         </View>

//         {/* Buttons Row */}
//         <View style={styles.buttonRow}>
//           <TouchableOpacity style={[styles.actionButton, {marginRight: 6}]}>
//             <Text style={styles.buttonText}>Follow</Text>
//           </TouchableOpacity>
//           <TouchableOpacity style={[styles.actionButton, {marginRight: 6}]}>
//             <Text style={styles.buttonText}>Message</Text>
//           </TouchableOpacity>
//           <TouchableOpacity style={[styles.actionButton, {marginRight: 6}]}>
//             <Icon name="email" size={18} color="white" />
//           </TouchableOpacity>
//         </View>

//         {/* Story Highlights */}
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           style={styles.highlightsScroll}>
//           {storyHighlights.map((label, index) => (
//             <View key={index} style={styles.highlightCircle}>
//               <View style={styles.highlightImage} />
//               <Text style={styles.highlightText}>{label}</Text>
//             </View>
//           ))}
//         </ScrollView>

//         {/* Grid Posts */}

//         <View style={styles.imageGrid}>
//           {profileImages.map((img, index) => (
//             <Image
//               key={img.id || index.toString()}
//               source={{uri: img.uri}}
//               style={styles.gridImage}
//               resizeMode="cover"
//             />
//           ))}
//         </View>
//         <Text
//           style={{
//             color: 'white',
//             fontSize: 18,
//             textAlign: 'center',
//             marginVertical: 40,
//           }}>
//           ✅ Bottom reached
//         </Text>
//       </ScrollView>
//     </View>
//   );
// }

///////////////

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
// import LayoutWrapper from '../components/LayoutWrapper/LayoutWrapper';

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
