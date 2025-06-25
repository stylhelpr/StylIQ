import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useAuth0} from 'react-native-auth0';
import {useUUID} from '../context/UUIDContext';
import {API_BASE_URL} from '../config/api';
import StyleProfileScreen from './StyleProfileScreen';
import {useStyleProfile} from '../hooks/useStyleProfile';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import type {Screen} from '../navigation/types';
import {Dimensions} from 'react-native';

const screenWidth = Dimensions.get('window').width;

type Props = {
  navigate: (screen: string) => void;
  userProfile: {
    name: string;
    email: string;
    jobTitle: string;
    fashionExpert: boolean;
    avatarUrl?: string;
    styleTags: string[];
    favoriteBrands: string[];
  };
  wardrobe: WardrobeItem[]; // existing
  outfits: SavedOutfit[]; // new
};

type UserProfile = {
  first_name: string;
  last_name: string;
  email: string;
  profile_picture?: string;
  fashion_level?: string;
  profession?: string;
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

export default function ProfileScreen({navigate}: Props) {
  const LOCAL_IP = '192.168.0.106';
  const PORT = 3001;
  const BASE_URL = `${API_BASE_URL}/wardrobe`;

  const userId = useUUID();

  const {theme} = useAppTheme();
  const {user} = useAuth0();
  const globalStyles = useGlobalStyles();
  const auth0Sub = user?.sub;
  const {styleProfile} = useStyleProfile(auth0Sub || '');
  const favoriteBrands = styleProfile?.preferred_brands || [];
  const styleTags = styleProfile?.style_keywords || [];
  console.log('📦 styleProfile:', styleProfile);

  // const {data: userProfile} = useQuery({
  //   enabled: !!userId,
  //   queryKey: ['userProfile', userId],
  //   queryFn: async () => {
  //     const res = await fetch(`${API_BASE_URL}/users/${userId}`);
  //     if (!res.ok) throw new Error('Failed to fetch user profile');
  //     return res.json();
  //   },
  // });

  const {data: userProfile} = useQuery<UserProfile>({
    enabled: !!userId,
    queryKey: ['userProfile', userId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/users/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch user profile');
      return res.json();
    },
  });

  const {data: wardrobe = []} = useQuery({
    queryKey: ['wardrobe', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch wardrobe');
      return res.json();
    },
  });

  const {data: outfits = []} = useQuery({
    queryKey: ['outfits', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE_URL}/custom-outfits?user_id=${userId}`,
      );
      if (!res.ok) throw new Error('Failed to fetch outfits');
      return res.json();
    },
  });

  const {data: totalFavorites = 0} = useQuery({
    queryKey: ['totalFavorites', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE_URL}/outfit-favorites/count/${userId}`,
      );
      if (!res.ok) throw new Error('Failed to fetch total favorites count');
      const data = await res.json();
      return data.count;
    },
  });

  const {data: totalCustomOutfits = 0} = useQuery({
    queryKey: ['totalCustomOutfits', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/custom-outfits/count/${userId}`);
      if (!res.ok)
        throw new Error('Failed to fetch total custom outfits count');
      const data = await res.json();
      return data.count;
    },
  });

  const favorites = wardrobe.filter(i => i.favorite);
  const totalItems = wardrobe.length;
  const favoriteCount = wardrobe.filter(i => i.favorite).length;

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
    },
    settingsButton: {
      position: 'absolute',
      bottom: 0,
      right: 16,
      zIndex: 10,
      padding: 8,
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
      justifyContent: screenWidth >= 768 ? 'flex-start' : 'space-between',
      flex: 1,
    },
    statBox: {
      alignItems: 'center',
      marginRight: screenWidth >= 768 ? 32 : 0,
    },
    statNumber: {
      fontWeight: 'bold',
      fontSize: 17,
      color: 'white',
    },
    statLabel: {
      fontSize: 14,
      color: '#bbb',
      fontWeight: '600',
    },
    bioContainer: {
      marginTop: 8,
    },
    nameText: {
      color: 'white',
      fontWeight: '700',
      fontSize: 17,
    },
    bioText: {
      color: 'white',
      fontSize: 16,
      marginTop: 4,
      lineHeight: 18,
    },
    linkText: {
      color: '#4ea1f2',
      fontSize: 16,
      marginTop: 4,
    },
    highlightCircle: {
      alignItems: 'center',
      marginRight: 24,
    },
    highlightText: {
      marginTop: 8,
      color: '#ddd',
      fontSize: 17,
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
    highlightBorder: {
      width: 92,
      height: 92,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    highlightImage: {
      width: 92,
      height: 92,
      borderRadius: tokens.borderRadius.md,
      backgroundColor: '#888',
    },
    profileMenuItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.button1,
      borderRadius: tokens.borderRadius.md,
      elevation: 1,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 4,
      marginHorizontal: 16,
    },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    menuText: {
      fontSize: 17,
      fontWeight: '500',
    },
  });

  return (
    <ScrollView style={[styles.screen, globalStyles.container]}>
      <Text style={globalStyles.header}>Profile</Text>

      <AppleTouchFeedback
        style={styles.settingsButton}
        onPress={() => navigate('Settings')}
        hapticStyle="impactMedium">
        <Icon name="settings" size={24} color="#405de6" />
      </AppleTouchFeedback>

      {/* Header Row */}
      <View style={globalStyles.section}>
        <View style={styles.headerRow}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarBorder}>
              <Image
                source={
                  userProfile?.avatarUrl
                    ? {uri: userProfile.avatarUrl}
                    : require('../assets/images/free1.jpg')
                }
                style={styles.avatar}
              />
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{wardrobe.length}</Text>
              <Text style={styles.statLabel}>Wardrobe Items</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{totalCustomOutfits}</Text>
              <Text style={styles.statLabel}>Outfits</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{totalFavorites}</Text>
              <Text style={styles.statLabel}>Favorites</Text>
            </View>
          </View>
        </View>

        {/* Name and Bio */}
        <View style={styles.bioContainer}>
          <Text style={styles.nameText}>
            {(userProfile?.first_name || '') +
              ' ' +
              (userProfile?.last_name || '')}
          </Text>
          {userProfile?.fashion_level && (
            <Text style={styles.bioText}>{userProfile.fashion_level}</Text>
          )}
          {userProfile?.profession && (
            <Text style={styles.bioText}>{userProfile.profession}</Text>
          )}
          <Text style={styles.linkText}>{userProfile?.email}</Text>
        </View>
      </View>

      <View style={globalStyles.section}>
        <Text style={globalStyles.sectionTitle}>Style Profile</Text>

        <View
          style={{
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
            padding: 16,
            borderWidth: 1,
            borderRadius: tokens.borderRadius.md,
          }}>
          <AppleTouchFeedback
            style={[globalStyles.buttonPrimary, {width: 280}]}
            onPress={() => navigate('StyleProfileScreen')}
            hapticStyle="impactMedium">
            <View style={styles.menuRow}>
              <Icon
                name="person-outline"
                size={22}
                color={theme.colors.primary}
              />
              <Text style={[globalStyles.buttonPrimaryText]}>
                Edit Style Profile
              </Text>
            </View>
          </AppleTouchFeedback>
        </View>
      </View>

      <View style={globalStyles.sectionScroll}>
        <Text style={globalStyles.sectionTitle}>Style Tags</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingRight: 8}}>
          {styleTags.map(tag => (
            <View key={tag} style={globalStyles.pill}>
              <Text style={globalStyles.pillText}>#{tag}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={globalStyles.sectionScroll}>
        <Text style={[globalStyles.sectionTitle]}>Favorite Brands</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingRight: 8}}>
          {favoriteBrands.map(brand => (
            <View key={brand} style={globalStyles.pill}>
              <Text style={globalStyles.pillText}>{brand}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Favorite Outfits */}
      <View style={globalStyles.sectionScroll}>
        <Text style={[globalStyles.sectionTitle]}>Favorite Outfits</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {storyHighlights.map((label, index) => (
            <View key={index}>
              <View style={styles.highlightBorder}>
                <Image
                  source={{
                    uri: profileImages[index % profileImages.length].uri,
                  }}
                  style={styles.highlightImage}
                />
              </View>
              <Text
                style={[
                  globalStyles.label,
                  {marginTop: 6, textAlign: 'center'},
                ]}>
                {label}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

//////////////////

// import React from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   TouchableOpacity,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import {useAuth0} from 'react-native-auth0';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import StyleProfileScreen from './StyleProfileScreen';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';

// import type {Screen} from '../navigation/types';

// type Props = {
//   navigate: (screen: string) => void;
//   userProfile: {
//     name: string;
//     email: string;
//     jobTitle: string;
//     fashionExpert: boolean;
//     avatarUrl?: string;
//     styleTags: string[];
//     favoriteBrands: string[];
//   };
//   wardrobe: WardrobeItem[]; // existing
//   outfits: SavedOutfit[]; // new
// };

// type UserProfile = {
//   first_name: string;
//   last_name: string;
//   email: string;
//   profile_picture?: string;
//   fashion_level?: string;
//   profession?: string;
// };

// const storyHighlights = [
//   'Luxury',
//   'Vintage',
//   'Posh',
//   'Modern',
//   'Classic',
//   'Avant-Garde',
//   'Minimalist',
//   'Streetwear',
//   'Bohemian',
//   'Preppy',
//   'Retro',
//   'Chic',
//   'Eclectic',
//   'Casual',
//   'Formal',
//   'Sporty',
//   'Business',
//   'Grunge',
//   'Artsy',
//   'Resortwear',
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

// export default function ProfileScreen({navigate}: Props) {
//   const LOCAL_IP = '192.168.0.106';
//   const PORT = 3001;
//   const BASE_URL = `${API_BASE_URL}/wardrobe`;

//   const userId = useUUID();

//   const {theme} = useAppTheme();
//   const {user} = useAuth0();
//   const globalStyles = useGlobalStyles();
//   const auth0Sub = user?.sub;
//   const {styleProfile} = useStyleProfile(auth0Sub || '');
//   const favoriteBrands = styleProfile?.preferred_brands || [];
//   const styleTags = styleProfile?.style_keywords || [];
//   console.log('📦 styleProfile:', styleProfile);

//   // const {data: userProfile} = useQuery({
//   //   enabled: !!userId,
//   //   queryKey: ['userProfile', userId],
//   //   queryFn: async () => {
//   //     const res = await fetch(`${API_BASE_URL}/users/${userId}`);
//   //     if (!res.ok) throw new Error('Failed to fetch user profile');
//   //     return res.json();
//   //   },
//   // });

//   const {data: userProfile} = useQuery<UserProfile>({
//     enabled: !!userId,
//     queryKey: ['userProfile', userId],
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/users/${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch user profile');
//       return res.json();
//     },
//   });

//   const {data: wardrobe = []} = useQuery({
//     queryKey: ['wardrobe', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
//       return res.json();
//     },
//   });

//   const {data: outfits = []} = useQuery({
//     queryKey: ['outfits', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(
//         `${API_BASE_URL}/custom-outfits?user_id=${userId}`,
//       );
//       if (!res.ok) throw new Error('Failed to fetch outfits');
//       return res.json();
//     },
//   });

//   const {data: totalFavorites = 0} = useQuery({
//     queryKey: ['totalFavorites', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(
//         `${API_BASE_URL}/outfit-favorites/count/${userId}`,
//       );
//       if (!res.ok) throw new Error('Failed to fetch total favorites count');
//       const data = await res.json();
//       return data.count;
//     },
//   });

//   const {data: totalCustomOutfits = 0} = useQuery({
//     queryKey: ['totalCustomOutfits', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/custom-outfits/count/${userId}`);
//       if (!res.ok)
//         throw new Error('Failed to fetch total custom outfits count');
//       const data = await res.json();
//       return data.count;
//     },
//   });

//   const favorites = wardrobe.filter(i => i.favorite);
//   const totalItems = wardrobe.length;
//   const favoriteCount = wardrobe.filter(i => i.favorite).length;

//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       backgroundColor: theme.colors.background,
//     },
//     headerRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       marginTop: 10,
//     },
//     settingsButton: {
//       position: 'absolute',
//       bottom: 0,
//       right: 16,
//       zIndex: 10,
//       padding: 8,
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
//       fontSize: 17,
//       color: 'white',
//     },
//     statLabel: {
//       fontSize: 14,
//       color: '#bbb',
//       fontWeight: '600',
//     },
//     bioContainer: {
//       marginTop: 8,
//     },
//     nameText: {
//       color: 'white',
//       fontWeight: '700',
//       fontSize: 17,
//     },
//     bioText: {
//       color: 'white',
//       fontSize: 16,
//       marginTop: 4,
//       lineHeight: 18,
//     },
//     linkText: {
//       color: '#4ea1f2',
//       fontSize: 16,
//       marginTop: 4,
//     },
//     highlightCircle: {
//       alignItems: 'center',
//       marginRight: 24,
//     },
//     highlightText: {
//       marginTop: 8,
//       color: '#ddd',
//       fontSize: 17,
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
//     highlightBorder: {
//       width: 92,
//       height: 92,
//       alignItems: 'center',
//       justifyContent: 'center',
//       marginRight: 12,
//     },
//     highlightImage: {
//       width: 92,
//       height: 92,
//       borderRadius: tokens.borderRadius.md,
//       backgroundColor: '#888',
//     },
//     profileMenuItem: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       paddingVertical: 12,
//       paddingHorizontal: 16,
//       backgroundColor: theme.colors.button1,
//       borderRadius: tokens.borderRadius.md,
//       elevation: 1,
//       shadowColor: '#000',
//       shadowOpacity: 0.05,
//       shadowRadius: 4,
//       marginHorizontal: 16,
//     },
//     menuRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//     },
//     menuText: {
//       fontSize: 17,
//       fontWeight: '500',
//     },
//   });

//   return (
//     <ScrollView style={[styles.screen, globalStyles.container]}>
//       <Text style={globalStyles.header}>Profile</Text>

//       <AppleTouchFeedback
//         style={styles.settingsButton}
//         onPress={() => navigate('Settings')}
//         hapticStyle="impactMedium">
//         <Icon name="settings" size={24} color="#405de6" />
//       </AppleTouchFeedback>

//       {/* Header Row */}
//       <View style={globalStyles.section}>
//         <View style={styles.headerRow}>
//           <View style={styles.avatarWrapper}>
//             <View style={styles.avatarBorder}>
//               <Image
//                 source={
//                   userProfile?.avatarUrl
//                     ? {uri: userProfile.avatarUrl}
//                     : require('../assets/images/free1.jpg')
//                 }
//                 style={styles.avatar}
//               />
//             </View>
//           </View>
//           <View style={styles.statsRow}>
//             <View style={styles.statBox}>
//               <Text style={styles.statNumber}>{wardrobe.length}</Text>
//               <Text style={styles.statLabel}>Wardrobe Items</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Text style={styles.statNumber}>{totalCustomOutfits}</Text>
//               <Text style={styles.statLabel}>Outfits</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Text style={styles.statNumber}>{totalFavorites}</Text>
//               <Text style={styles.statLabel}>Favorites</Text>
//             </View>
//           </View>
//         </View>

//         {/* Name and Bio */}
//         <View style={styles.bioContainer}>
//           <Text style={styles.nameText}>
//             {(userProfile?.first_name || '') +
//               ' ' +
//               (userProfile?.last_name || '')}
//           </Text>
//           {userProfile?.fashion_level && (
//             <Text style={styles.bioText}>{userProfile.fashion_level}</Text>
//           )}
//           {userProfile?.profession && (
//             <Text style={styles.bioText}>{userProfile.profession}</Text>
//           )}
//           <Text style={styles.linkText}>{userProfile?.email}</Text>
//         </View>
//       </View>

//       <View style={globalStyles.section}>
//         <Text style={globalStyles.sectionTitle}>Style Profile</Text>

//         <AppleTouchFeedback
//           style={globalStyles.buttonPrimary}
//           onPress={() => navigate('StyleProfileScreen')}
//           hapticStyle="impactMedium">
//           <View style={styles.menuRow}>
//             <Icon
//               name="person-outline"
//               size={22}
//               color={theme.colors.primary}
//             />
//             <Text style={[globalStyles.buttonPrimaryText]}>
//               Edit Style Profile
//             </Text>
//           </View>
//         </AppleTouchFeedback>
//       </View>

//       <View style={globalStyles.sectionScroll}>
//         <Text style={globalStyles.sectionTitle}>Style Tags</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingRight: 8}}>
//           {styleTags.map(tag => (
//             <View key={tag} style={globalStyles.pill}>
//               <Text style={globalStyles.pillText}>#{tag}</Text>
//             </View>
//           ))}
//         </ScrollView>
//       </View>

//       <View style={globalStyles.sectionScroll}>
//         <Text style={[globalStyles.sectionTitle]}>Favorite Brands</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingRight: 8}}>
//           {favoriteBrands.map(brand => (
//             <View key={brand} style={globalStyles.pill}>
//               <Text style={globalStyles.pillText}>{brand}</Text>
//             </View>
//           ))}
//         </ScrollView>
//       </View>

//       {/* Favorite Outfits */}
//       <View style={globalStyles.sectionScroll}>
//         <Text style={[globalStyles.sectionTitle]}>Favorite Outfits</Text>
//         <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//           {storyHighlights.map((label, index) => (
//             <View key={index}>
//               <View style={styles.highlightBorder}>
//                 <Image
//                   source={{
//                     uri: profileImages[index % profileImages.length].uri,
//                   }}
//                   style={styles.highlightImage}
//                 />
//               </View>
//               <Text
//                 style={[
//                   globalStyles.label,
//                   {marginTop: 6, textAlign: 'center'},
//                 ]}>
//                 {label}
//               </Text>
//             </View>
//           ))}
//         </ScrollView>
//       </View>
//     </ScrollView>
//   );
// }
