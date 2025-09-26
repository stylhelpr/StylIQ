import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {useQuery} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useAuth0} from 'react-native-auth0';
import {useUUID} from '../context/UUIDContext';
import {API_BASE_URL} from '../config/api';
import {useStyleProfile} from '../hooks/useStyleProfile';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import * as Animatable from 'react-native-animatable';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import {Dimensions} from 'react-native';
import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';

const screenWidth = Dimensions.get('window').width;

type WardrobeItem = {
  id: string;
  image_url: string;
  name: string;
  favorite?: boolean;
};

type SavedOutfit = any; // kept as in your code

type Props = {
  navigate: (screen: string) => void;
};

type UserProfile = {
  first_name: string;
  last_name: string;
  email: string;
  profile_picture?: string;
  fashion_level?: string;
  profession?: string;
};

export default function ProfileScreen({navigate}: Props) {
  const userId = useUUID();

  const {theme} = useAppTheme();
  const {user} = useAuth0();
  const globalStyles = useGlobalStyles();
  const auth0Sub = user?.sub;
  const {styleProfile} = useStyleProfile(auth0Sub || '');
  const favoriteBrands = styleProfile?.preferred_brands || [];
  const styleTags = styleProfile?.style_preferences || [];

  const [savedLooks, setSavedLooks] = useState<any[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedLook, setSelectedLook] = useState<any | null>(null);

  useEffect(() => {
    if (!userId) return;
    const fetchSavedLooks = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
        if (!res.ok) throw new Error('Failed to fetch saved looks');
        const data = await res.json();
        setSavedLooks(data);
      } catch (err) {
        console.error('❌ Failed to fetch saved looks:', err);
      } finally {
        setLoadingSaved(false);
      }
    };
    fetchSavedLooks();
  }, [userId]);

  const {data: userProfile} = useQuery<UserProfile>({
    enabled: !!userId,
    queryKey: ['userProfile', userId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/users/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch user profile');
      return res.json();
    },
  });

  const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
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

  const totalItems = wardrobe.length;

  // 🔤 First + Last initials (fallback to email local-part if needed)
  let initials = '';
  if (userProfile?.first_name || userProfile?.last_name) {
    const f = (userProfile?.first_name?.trim?.()[0] || '').toUpperCase();
    const l = (userProfile?.last_name?.trim?.()[0] || '').toUpperCase();
    initials = `${f}${l}`;
  } else if (userProfile?.email) {
    const local = userProfile.email.split('@')[0];
    const parts = local.split(/[^a-zA-Z]/).filter(Boolean);
    const f = (parts[0]?.[0] || '').toUpperCase();
    const l = (parts[1]?.[0] || '').toUpperCase();
    initials = f + l || local.slice(0, 2).toUpperCase();
  }

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
      borderWidth: tokens.borderWidth.xl,
      borderColor: theme.colors.surfaceBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatar: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    initialsText: {
      color: theme.colors.foreground,
      fontWeight: '800',
      fontSize: 30,
      letterSpacing: 0.5,
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
      color: theme.colors.foreground2,
    },
    statLabel: {
      fontSize: 14,
      color: theme.colors.foreground3,
      fontWeight: '600',
    },
    bioContainer: {
      marginTop: 8,
    },
    nameText: {
      color: theme.colors.foreground,
      fontWeight: '700',
      fontSize: 17,
    },
    bioText: {
      color: theme.colors.foreground2,
      fontSize: 16,
      marginTop: 4,
      lineHeight: 18,
    },
    linkText: {
      color: '#4ea1f2',
      fontSize: 16,
      marginTop: 4,
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

      {/* Settings: subtle haptic on navigation only */}
      <AppleTouchFeedback
        style={styles.settingsButton}
        onPress={() => navigate('Settings')}
        hapticStyle="selection">
        <Icon name="settings" size={24} color={theme.colors.button1} />
      </AppleTouchFeedback>

      {/* Header Row */}
      <View style={globalStyles.section}>
        <View style={styles.headerRow}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarBorder}>
              {userProfile?.profile_picture ? (
                <Image
                  source={{uri: userProfile.profile_picture}}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.initialsText}>{initials}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{totalItems}</Text>
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

        <View style={{alignItems: 'center'}}>
          {/* Primary action: slightly stronger haptic */}
          <AppleTouchFeedback
            onPress={() => navigate('StyleProfileScreen')}
            hapticStyle="impactMedium"
            style={[
              globalStyles.buttonPrimary,
              {
                minWidth: 200,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 4,
              },
            ]}>
            <Icon
              name="person-outline"
              size={20}
              color={theme.colors.buttonText1}
              style={{marginRight: 8}}
            />
            <Text
              style={{
                color: theme.colors.buttonText1,
                fontSize: 16,
                fontWeight: '500',
                flexShrink: 1,
                textAlign: 'center',
              }}
              numberOfLines={1}>
              Edit Style Profile
            </Text>
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
              <Text style={globalStyles.pillText}>#{brand}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Saved Looks */}
      <View style={globalStyles.sectionScroll}>
        <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
        {savedLooks.length === 0 ? (
          <Text
            style={{
              color: theme.colors.foreground,
              paddingLeft: 16,
              fontStyle: 'italic',
            }}>
            You haven’t saved any outfits yet. Tap the heart on your favorite
            looks!
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{paddingRight: 8}}>
            {savedLooks.map((look, index) => (
              <Animatable.View
                key={look.id}
                animation="fadeInUp"
                delay={index * 120}
                useNativeDriver
                style={globalStyles.outfitCard}>
                <AppleTouchFeedback
                  hapticStyle="impactLight"
                  onPress={() => {
                    setSelectedLook(look);
                    setPreviewVisible(true);
                  }}
                  style={{alignItems: 'center'}}>
                  <View>
                    <Image
                      source={{uri: look.image_url}}
                      style={[
                        globalStyles.image4,
                        {
                          borderColor: theme.colors.surfaceBorder,
                          borderWidth: tokens.borderWidth.md,
                          borderRadius: tokens.borderRadius.md,
                        },
                      ]}
                      resizeMode="cover"
                    />
                  </View>
                  <Text
                    style={[globalStyles.label, {marginTop: 6}]}
                    numberOfLines={1}>
                    {look.name}
                  </Text>
                </AppleTouchFeedback>
              </Animatable.View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* ───────── Profile Footer (tiny help link) ───────── */}
      <View style={[globalStyles.section, {paddingTop: 8}]}>
        <AppleTouchFeedback
          hapticStyle="impactLight"
          onPress={() => navigate('ContactScreen')}>
          <Text
            style={{
              textAlign: 'center',
              color: theme.colors.foreground,
              fontSize: 13,
              paddingVertical: 8,
            }}>
            Contact Support
          </Text>
        </AppleTouchFeedback>

        <AppleTouchFeedback
          hapticStyle="impactLight"
          onPress={() => navigate('AboutScreen')}>
          <Text
            style={{
              textAlign: 'center',
              color: theme.colors.foreground,
              fontSize: 12,
              opacity: 0.8,
              paddingBottom: 16,
            }}>
            About StylHelpr
          </Text>
        </AppleTouchFeedback>
      </View>

      <SavedLookPreviewModal
        visible={previewVisible}
        look={selectedLook}
        onClose={() => setPreviewVisible(false)}
      />
    </ScrollView>
  );
}

////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   TouchableOpacity,
//   ActivityIndicator,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useQuery} from '@tanstack/react-query';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import {useAuth0} from 'react-native-auth0';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {useStyleProfile} from '../hooks/useStyleProfile';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import * as Animatable from 'react-native-animatable';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import {Dimensions} from 'react-native';
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';

// const screenWidth = Dimensions.get('window').width;

// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   favorite?: boolean;
// };

// type SavedOutfit = any; // kept as in your code

// type Props = {
//   navigate: (screen: string) => void;
// };

// type UserProfile = {
//   first_name: string;
//   last_name: string;
//   email: string;
//   profile_picture?: string;
//   fashion_level?: string;
//   profession?: string;
// };

// export default function ProfileScreen({navigate}: Props) {
//   const userId = useUUID();

//   const {theme} = useAppTheme();
//   const {user} = useAuth0();
//   const globalStyles = useGlobalStyles();
//   const auth0Sub = user?.sub;
//   const {styleProfile} = useStyleProfile(auth0Sub || '');
//   const favoriteBrands = styleProfile?.preferred_brands || [];
//   const styleTags = styleProfile?.style_preferences || [];

//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   const [loadingSaved, setLoadingSaved] = useState(true);
//   const [previewVisible, setPreviewVisible] = useState(false);
//   const [selectedLook, setSelectedLook] = useState<any | null>(null);

//   useEffect(() => {
//     if (!userId) return;
//     const fetchSavedLooks = async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         setSavedLooks(data);
//       } catch (err) {
//         console.error('❌ Failed to fetch saved looks:', err);
//       } finally {
//         setLoadingSaved(false);
//       }
//     };
//     fetchSavedLooks();
//   }, [userId]);

//   const {data: userProfile} = useQuery<UserProfile>({
//     enabled: !!userId,
//     queryKey: ['userProfile', userId],
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/users/${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch user profile');
//       return res.json();
//     },
//   });

//   const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
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

//   const totalItems = wardrobe.length;

//   // 🔤 First + Last initials (fallback to email local-part if needed)
//   let initials = '';
//   if (userProfile?.first_name || userProfile?.last_name) {
//     const f = (userProfile?.first_name?.trim?.()[0] || '').toUpperCase();
//     const l = (userProfile?.last_name?.trim?.()[0] || '').toUpperCase();
//     initials = `${f}${l}`;
//   } else if (userProfile?.email) {
//     const local = userProfile.email.split('@')[0];
//     const parts = local.split(/[^a-zA-Z]/).filter(Boolean);
//     const f = (parts[0]?.[0] || '').toUpperCase();
//     const l = (parts[1]?.[0] || '').toUpperCase();
//     initials = f + l || local.slice(0, 2).toUpperCase();
//   }

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
//       borderWidth: tokens.borderWidth.xl,
//       borderColor: theme.colors.surfaceBorder,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     avatar: {
//       width: 90,
//       height: 90,
//       borderRadius: 45,
//       backgroundColor: theme.colors.surface,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     initialsText: {
//       color: theme.colors.foreground,
//       fontWeight: '800',
//       fontSize: 30,
//       letterSpacing: 0.5,
//     },
//     statsRow: {
//       flexDirection: 'row',
//       justifyContent: screenWidth >= 768 ? 'flex-start' : 'space-between',
//       flex: 1,
//     },
//     statBox: {
//       alignItems: 'center',
//       marginRight: screenWidth >= 768 ? 32 : 0,
//     },
//     statNumber: {
//       fontWeight: 'bold',
//       fontSize: 17,
//       color: theme.colors.foreground2,
//     },
//     statLabel: {
//       fontSize: 14,
//       color: theme.colors.foreground3,
//       fontWeight: '600',
//     },
//     bioContainer: {
//       marginTop: 8,
//     },
//     nameText: {
//       color: theme.colors.foreground,
//       fontWeight: '700',
//       fontSize: 17,
//     },
//     bioText: {
//       color: theme.colors.foreground2,
//       fontSize: 16,
//       marginTop: 4,
//       lineHeight: 18,
//     },
//     linkText: {
//       color: '#4ea1f2',
//       fontSize: 16,
//       marginTop: 4,
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

//       {/* Settings: subtle haptic on navigation only */}
//       <AppleTouchFeedback
//         style={styles.settingsButton}
//         onPress={() => navigate('Settings')}
//         hapticStyle="selection">
//         <Icon name="settings" size={24} color={theme.colors.button1} />
//       </AppleTouchFeedback>

//       {/* Header Row */}
//       <View style={globalStyles.section}>
//         <View style={styles.headerRow}>
//           <View style={styles.avatarWrapper}>
//             <View style={styles.avatarBorder}>
//               {userProfile?.profile_picture ? (
//                 <Image
//                   source={{uri: userProfile.profile_picture}}
//                   style={styles.avatar}
//                 />
//               ) : (
//                 <View style={styles.avatar}>
//                   <Text style={styles.initialsText}>{initials}</Text>
//                 </View>
//               )}
//             </View>
//           </View>
//           <View style={styles.statsRow}>
//             <View style={styles.statBox}>
//               <Text style={styles.statNumber}>{totalItems}</Text>
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

//         <View style={{alignItems: 'center'}}>
//           {/* Primary action: slightly stronger haptic */}
//           <AppleTouchFeedback
//             onPress={() => navigate('StyleProfileScreen')}
//             hapticStyle="impactMedium"
//             style={[
//               globalStyles.buttonPrimary,
//               {
//                 minWidth: 200,
//                 flexDirection: 'row',
//                 alignItems: 'center',
//                 justifyContent: 'center',
//               },
//             ]}>
//             <Icon
//               name="person-outline"
//               size={20}
//               color={theme.colors.buttonText1}
//               style={{marginRight: 8}}
//             />
//             <Text
//               style={{
//                 color: theme.colors.buttonText1,
//                 fontSize: 16,
//                 fontWeight: '500',
//                 flexShrink: 1,
//                 textAlign: 'center',
//               }}
//               numberOfLines={1}>
//               Edit Style Profile
//             </Text>
//           </AppleTouchFeedback>
//         </View>
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
//               <Text style={globalStyles.pillText}>#{brand}</Text>
//             </View>
//           ))}
//         </ScrollView>
//       </View>

//       {/* Saved Looks */}
//       <View style={globalStyles.sectionScroll}>
//         <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//         {savedLooks.length === 0 ? (
//           <Text
//             style={{
//               color: theme.colors.foreground,
//               paddingLeft: 16,
//               fontStyle: 'italic',
//             }}>
//             You haven’t saved any outfits yet. Tap the heart on your favorite
//             looks!
//           </Text>
//         ) : (
//           <ScrollView
//             horizontal
//             showsHorizontalScrollIndicator={false}
//             contentContainerStyle={{paddingRight: 8}}>
//             {savedLooks.map((look, index) => (
//               <Animatable.View
//                 key={look.id}
//                 animation="fadeInUp"
//                 delay={index * 120}
//                 useNativeDriver
//                 style={globalStyles.outfitCard}>
//                 <AppleTouchFeedback
//                   hapticStyle="impactLight"
//                   onPress={() => {
//                     setSelectedLook(look);
//                     setPreviewVisible(true);
//                   }}
//                   style={{alignItems: 'center'}}>
//                   <View>
//                     <Image
//                       source={{uri: look.image_url}}
//                       style={[
//                         globalStyles.image4,
//                         {
//                           borderColor: theme.colors.surfaceBorder,
//                           borderWidth: tokens.borderWidth.md,
//                           borderRadius: tokens.borderRadius.md,
//                         },
//                       ]}
//                       resizeMode="cover"
//                     />
//                   </View>
//                   <Text
//                     style={[globalStyles.label, {marginTop: 6}]}
//                     numberOfLines={1}>
//                     {look.name}
//                   </Text>
//                 </AppleTouchFeedback>
//               </Animatable.View>
//             ))}
//           </ScrollView>
//         )}
//       </View>

//       {/* ───────── Profile Footer (tiny help link) ───────── */}
//       <View style={[globalStyles.section, {paddingTop: 8}]}>
//         <AppleTouchFeedback
//           hapticStyle="impactLight"
//           onPress={() => navigate('ContactScreen')}>
//           <Text
//             style={{
//               textAlign: 'center',
//               color: theme.colors.foreground,
//               fontSize: 13,
//               paddingVertical: 8,
//             }}>
//             Contact Support
//           </Text>
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           hapticStyle="impactLight"
//           onPress={() => navigate('AboutScreen')}>
//           <Text
//             style={{
//               textAlign: 'center',
//               color: theme.colors.foreground,
//               fontSize: 12,
//               opacity: 0.8,
//               paddingBottom: 16,
//             }}>
//             About StylHelpr
//           </Text>
//         </AppleTouchFeedback>
//       </View>

//       <SavedLookPreviewModal
//         visible={previewVisible}
//         look={selectedLook}
//         onClose={() => setPreviewVisible(false)}
//       />
//     </ScrollView>
//   );
// }
