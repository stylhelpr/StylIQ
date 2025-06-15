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

import type {Screen} from '../navigation/types';

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
    container: {
      paddingTop: 24,
      paddingBottom: 60,
      paddingHorizontal: 16,
    },
    section: {
      marginBottom: 32,
    },
    headerRow: {
      flexDirection: 'row',
      paddingTop: 12,
      paddingBottom: 4,
      alignItems: 'center',
      marginTop: 20,
    },
    header: {
      fontSize: 28,
      fontWeight: '600',
      color: theme.colors.primary,
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
      justifyContent: 'space-between',
      flex: 1,
    },
    statBox: {
      alignItems: 'center',
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
      marginTop: 6,
      marginBottom: 4,
    },
    nameText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 17,
    },
    bioText: {
      color: 'white',
      fontSize: 17,
      marginTop: 4,
      lineHeight: 18,
    },
    linkText: {
      color: '#4ea1f2',
      fontSize: 17,
      marginTop: 2,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,

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
      fontSize: 17,
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
    tabRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: 8,
      marginTop: 10,
    },
    tabIcon: {},
    highlightBorder: {
      width: 70,
      height: 70,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    highlightImage: {
      width: 84,
      height: 84,
      borderRadius: 10,
      backgroundColor: '#888',
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '600',
      lineHeight: 24,
      color: theme.colors.foreground,
      paddingBottom: 12,
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      width: '100%',
    },
    tag: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 18,
      marginRight: 8,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 4,
      shadowOffset: {width: 0, height: 1},
      elevation: 2,
      alignSelf: 'flex-start',
    },
    tagText: {
      fontWeight: '600',
      fontSize: 13,
      color: theme.colors.primary,
    },
    profileMenuItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.button1,
      borderRadius: 10,
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
    editButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 10,
      borderRadius: 8,
      marginTop: 20,
    },
    editButtonText: {
      color: '#fff',
      textAlign: 'center',
      fontWeight: '600',
    },
  });

  return (
    <ScrollView style={[styles.screen, styles.container]}>
      <Text style={styles.header}>Profile</Text>

      <AppleTouchFeedback
        style={styles.settingsButton}
        onPress={() => navigate('Settings')}
        hapticStyle="impactMedium">
        <Icon name="settings" size={24} color="#405de6" />
      </AppleTouchFeedback>

      {/* Header Row */}
      <View style={styles.section}>
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Style Profile</Text>
        <AppleTouchFeedback
          style={styles.profileMenuItem}
          onPress={() => navigate('StyleProfileScreen')}
          hapticStyle="impactMedium">
          <View style={styles.menuRow}>
            <Icon
              name="person-outline"
              size={22}
              color={theme.colors.primary}
            />
            <Text style={[styles.menuText, {color: theme.colors.foreground}]}>
              Edit Style Profile
            </Text>
          </View>
          <Icon name="chevron-right" size={22} color="#666" />
        </AppleTouchFeedback>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Style Tags</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingLeft: 16, paddingRight: 8}}>
          {styleTags.map(tag => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle]}>Favorite Brands</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingLeft: 16, paddingRight: 8}}>
          {favoriteBrands.map(brand => (
            <View key={brand} style={styles.tag}>
              <Text style={styles.tagText}>{brand}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Favorite Outfits */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle]}>Favorite Outfits</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
      </View>
    </ScrollView>
  );
}

/////////

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
//     headerRow: {
//       flexDirection: 'row',
//       paddingHorizontal: 16,
//       paddingTop: 12,
//       paddingBottom: 4,
//       alignItems: 'center',
//     },
//     header: {
//       fontSize: 28,
//       fontWeight: '600',
//       color: theme.colors.primary,
//       paddingHorizontal: 16,
//     },
//     settingsButton: {
//       position: 'absolute',
//       top: 0,
//       right: 16,
//       zIndex: 10,
//       padding: 8,
//     },
//     container: {
//       paddingTop: 12,
//       paddingBottom: 20,
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
//       marginBottom: 4,
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
//       marginTop: 8,
//       paddingHorizontal: 16,
//       gap: 6,
//     },
//     actionButton: {
//       flex: 1,
//       backgroundColor: '#405de6',
//       paddingVertical: 6,
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
//       paddingVertical: 8,
//       marginTop: 10,
//     },
//     tabIcon: {
//       paddingHorizontal: 16,
//     },
//     highlightBorder: {
//       width: 70,
//       height: 70,
//       alignItems: 'center',
//       justifyContent: 'center',
//       marginBottom: 4,
//     },
//     highlightImage: {
//       width: 84,
//       height: 84,
//       borderRadius: 10,
//       backgroundColor: '#888',
//     },
//     sectionTitle: {
//       fontWeight: '700',
//       fontSize: 14,
//       color: '#fff',
//       paddingHorizontal: 16,
//       paddingTop: 14,
//       paddingBottom: 4,
//     },
//     tagsContainer: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'flex-start',
//       width: '100%',
//       paddingHorizontal: 16,
//       marginBottom: 12,
//     },
//     tag: {
//       backgroundColor: theme.colors.surface,
//       paddingHorizontal: 12,
//       paddingVertical: 5,
//       borderRadius: 18,
//       marginRight: 8,
//       shadowColor: '#000',
//       shadowOpacity: 0.1,
//       shadowRadius: 4,
//       shadowOffset: {width: 0, height: 1},
//       elevation: 2,
//       alignSelf: 'flex-start',
//     },
//     tagText: {
//       fontWeight: '600',
//       fontSize: 13,
//       color: theme.colors.primary,
//     },
//     profileMenuItem: {
//       flexDirection: 'row',
//       justifyContent: 'space-between',
//       alignItems: 'center',
//       paddingVertical: 8,
//       paddingHorizontal: 16,
//       marginTop: 12,
//       marginBottom: 12,
//       backgroundColor: '#405de6',
//       borderRadius: 10,
//       elevation: 1,
//       shadowColor: '#000',
//       shadowOpacity: 0.05,
//       shadowRadius: 4,
//       marginHorizontal: 16,
//     },
//     menuRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       gap: 12,
//     },
//     menuText: {
//       fontSize: 14,
//       fontWeight: '500',
//     },
//     editButton: {
//       backgroundColor: theme.colors.primary,
//       paddingVertical: 10,
//       borderRadius: 8,
//       marginTop: 20,
//     },
//     editButtonText: {
//       color: '#fff',
//       textAlign: 'center',
//       fontWeight: '600',
//     },
//   });

//   return (
//     <View style={{flex: 1}}>
//       <ScrollView contentContainerStyle={styles.container}>
//         <Text style={styles.header}>Profile</Text>
//         <TouchableOpacity
//           style={styles.settingsButton}
//           onPress={() => navigate('Settings')}>
//           <Icon name="settings" size={24} color="#405de6" />
//         </TouchableOpacity>

//         {/* Header Row */}
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

//         <Text style={styles.sectionTitle}>Style Profile</Text>
//         <TouchableOpacity
//           style={styles.profileMenuItem}
//           onPress={() => navigate('StyleProfileScreen')}>
//           <View style={styles.menuRow}>
//             <Icon
//               name="person-outline"
//               size={22}
//               color={theme.colors.primary}
//             />
//             <Text style={[styles.menuText, {color: theme.colors.foreground}]}>
//               Edit Style Profile
//             </Text>
//           </View>
//           <Icon name="chevron-right" size={22} color="#666" />
//         </TouchableOpacity>

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

//         <Text style={[styles.sectionTitle, {marginTop: -49}]}>
//           Favorite Brands
//         </Text>
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

//         {/* Favorite Outfits */}
//         <Text style={[styles.sectionTitle, {marginTop: -49}]}>
//           Favorite Outfits
//         </Text>
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
//       </ScrollView>
//     </View>
//   );
// }
