import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
  Pressable,
  TextInput,
  Modal,
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
import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
import {TooltipBubble} from '../components/ToolTip/ToolTip1';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {GradientBackground} from '../components/LinearGradientComponents/GradientBackground';
import ConnectedAccountsSection from '../components/ConnectedAccounts/ConnectedAccountsSection';

const screenWidth = Dimensions.get('window').width;
const STORAGE_KEY = (uid: string) => `profile_picture:${uid}`;

type WardrobeItem = {
  id: string;
  image_url: string;
  name: string;
  favorite?: boolean;
};

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
  const styleTags = styleProfile?.style_preferences || [];

  const [favoriteBrands, setFavoriteBrands] = useState<string[]>([]);
  const [savedLooks, setSavedLooks] = useState<any[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedLook, setSelectedLook] = useState<any | null>(null);
  const [profilePicture, setProfilePicture] = useState<string>(''); // keep as string only
  const [sharedLooks, setSharedLooks] = useState<any[]>([]);
  const [hiddenSharedLooks, setHiddenSharedLooks] = useState<Set<string>>(new Set());
  const [bio, setBio] = useState<string>('');
  const [bioModalVisible, setBioModalVisible] = useState(false);
  const [editingBio, setEditingBio] = useState('');

  const HEADER_HEIGHT = 70; // adjust to your actual header height
  const BOTTOM_NAV_HEIGHT = 90; // adjust to your nav height
  const insets = useSafeAreaInsets();

  // ─────────────────────────────────────────────────────────────────────────────
  // Hydrate cached profile picture early
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const cached = await AsyncStorage.getItem(STORAGE_KEY(userId));
      if (cached) {
        console.log('[PROFILE] Cached profile pic found:', cached);
        setProfilePicture(cached);
      }
    })();
  }, [userId]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Fetch favorite brands
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/style-profile/${userId}/brands`,
        );
        const json = await res.json();
        setFavoriteBrands(Array.isArray(json.brands) ? json.brands : []);
      } catch {
        setFavoriteBrands([]);
      }
    })();
  }, [userId]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Fetch saved looks
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
        if (!res.ok) throw new Error('Failed to fetch saved looks');
        const data = await res.json();
        setSavedLooks(data);
      } catch {
      } finally {
        setLoadingSaved(false);
      }
    })();
  }, [userId]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Fetch shared looks (user's community posts)
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/community/posts/by-user/${userId}?limit=20`,
        );
        if (!res.ok) throw new Error('Failed to fetch shared looks');
        const data = await res.json();
        setSharedLooks(data);
      } catch {
        setSharedLooks([]);
      }
    })();
  }, [userId]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Fetch bio from community profile
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/community/users/${userId}/profile`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data?.bio) {
          setBio(data.bio);
        }
      } catch {
        // ignore
      }
    })();
  }, [userId]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Queries: profile, wardrobe, counts
  // ─────────────────────────────────────────────────────────────────────────────
  const {data: userProfileRaw} = useQuery<UserProfile>({
    enabled: !!userId,
    queryKey: ['userProfile', userId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/users/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch user profile');
      return res.json();
    },
  });

  // Only hydrate picture from backend if we don't already have one locally
  // useEffect(() => {
  //   if (
  //     userProfileRaw &&
  //     !profilePicture &&
  //     userProfileRaw.profile_picture &&
  //     userProfileRaw.profile_picture.trim() !== ''
  //   ) {
  //     setProfilePicture(userProfileRaw.profile_picture);
  //     if (userId) {
  //       AsyncStorage.setItem(
  //         STORAGE_KEY(userId),
  //         userProfileRaw.profile_picture,
  //       ).catch(() => {});
  //     }
  //   }
  // }, [userProfileRaw, profilePicture, userId]);

  // Replace this entire useEffect:
  useEffect(() => {
    if (
      userProfileRaw &&
      userProfileRaw.profile_picture &&
      userProfileRaw.profile_picture.trim() !== ''
    ) {
      console.log(
        '[PROFILE] Using backend profile picture:',
        userProfileRaw.profile_picture,
      );
      setProfilePicture(userProfileRaw.profile_picture);
      if (userId) {
        AsyncStorage.setItem(
          STORAGE_KEY(userId),
          userProfileRaw.profile_picture,
        ).catch(() => {});
      }
    }
  }, [userProfileRaw, userId]);

  // IMPORTANT: Don't construct a UserProfile when data is still undefined,
  // or TS will complain about missing required fields.
  const userProfile = userProfileRaw
    ? {
        ...userProfileRaw,
        // never assign null; use undefined or a string
        profile_picture:
          profilePicture || userProfileRaw.profile_picture || undefined,
      }
    : undefined;

  const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
    queryKey: ['wardrobe', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch wardrobe');
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
      const data = await res.json();
      return data.count;
    },
  });

  const {data: totalCustomOutfits = 0} = useQuery({
    queryKey: ['totalCustomOutfits', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/custom-outfits/count/${userId}`);
      const data = await res.json();
      return data.count;
    },
  });

  const totalItems = wardrobe.length;

  // ─────────────────────────────────────────────────────────────────────────────
  // Initials fallback logic
  // ─────────────────────────────────────────────────────────────────────────────
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

  // cache-busted URI so the newest image shows immediately
  const profileUri =
    profilePicture && profilePicture.length > 0
      ? `${profilePicture}${
          profilePicture.includes('?') ? '&' : '?'
        }v=${Date.now()}`
      : '';

  // ─────────────────────────────────────────────────────────────────────────────
  // Styles
  // ─────────────────────────────────────────────────────────────────────────────
  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      // backgroundColor: theme.colors.background,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
    },
    settingsButton: {
      position: 'absolute',
      bottom: -8,
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
      width: 92,
      height: 92,
      borderRadius: 45,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    initialsText: {
      color: theme.colors.foreground,
      fontWeight: tokens.fontWeight.bold,
      fontSize: 30,
      letterSpacing: 0.5,
    },
    statsContainer: {
      flex: 1,
    },
    statsRow: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    statBox: {
      flex: 1,
      alignItems: 'center',
    },
    statNumber: {
      fontWeight: tokens.fontWeight.bold,
      fontSize: 17,
      color: theme.colors.foreground2,
    },
    statLabel: {
      fontSize: 14,
      color: theme.colors.foreground3,
      fontWeight: tokens.fontWeight.semiBold,
    },
    bioContainer: {
      marginTop: 8,
    },
    nameText: {
      color: theme.colors.foreground,
      fontWeight: tokens.fontWeight.bold,
      fontSize: 17,
    },
    usernameText: {
      color: theme.colors.button1,
      fontSize: 16,
      marginTop: 2,
    },
    bioText: {
      color: theme.colors.foreground2,
      fontSize: 16,
      marginTop: 4,
      lineHeight: 18,
    },
    bioEditContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.cardBackground,
      borderRadius: 8,
    },
    linkText: {
      color: theme.colors.button1,
      fontSize: 16,
      marginTop: 4,
    },
  });

  return (
    // <GradientBackground>
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        globalStyles.container,
        {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top + HEADER_HEIGHT, // 👈 restore space for header
          paddingBottom: insets.bottom + BOTTOM_NAV_HEIGHT, // 👈 restore space for bottom nav
        },
      ]}>
      <Text style={globalStyles.header}>Profile</Text>

      {/* Settings Icon */}
      <AppleTouchFeedback
        style={styles.settingsButton}
        onPress={() => {
          if (global.goingBack) return;
          navigate('Settings', {goBack: () => navigate('Profile')});
        }}
        hapticStyle="impactLight">
        <Animatable.View
          animation="rotate"
          iterationCount="infinite"
          duration={16000}>
          <Icon name="settings" size={26} color={theme.colors.button1} />
        </Animatable.View>
      </AppleTouchFeedback>

      {/* Header Row */}
      <Animatable.View
        animation="fadeInUp"
        delay={300}
        style={globalStyles.section}>
        <View style={styles.headerRow}>
          {/* Avatar */}
          <Animatable.View
            animation="pulse"
            iterationCount="infinite"
            duration={5000}
            style={styles.avatarWrapper}>
            <View style={styles.avatarBorder}>
              {profilePicture ? (
                <Image source={{uri: profileUri}} style={styles.avatar} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.initialsText}>{initials}</Text>
                </View>
              )}
            </View>
          </Animatable.View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <Animatable.View
              animation="fadeIn"
              delay={500}
              style={styles.statsRow}>
              <View style={styles.statBox}>
                <Animatable.Text
                  animation="bounceIn"
                  delay={600}
                  style={styles.statNumber}>
                  {totalItems}
                </Animatable.Text>
                <Text style={styles.statLabel}>Wardrobe</Text>
              </View>
              <View style={styles.statBox}>
                <Animatable.Text
                  animation="bounceIn"
                  delay={800}
                  style={styles.statNumber}>
                  {totalCustomOutfits}
                </Animatable.Text>
                <Text style={styles.statLabel}>Outfits</Text>
              </View>
              <View style={styles.statBox}>
                <Animatable.Text
                  animation="bounceIn"
                  delay={1000}
                  style={styles.statNumber}>
                  {totalFavorites}
                </Animatable.Text>
                <Text style={styles.statLabel}>Favorites</Text>
              </View>
            </Animatable.View>
            <Animatable.View
              animation="fadeIn"
              delay={700}
              style={styles.statsRow}>
              <View style={styles.statBox}>
                <Animatable.Text
                  animation="bounceIn"
                  delay={1100}
                  style={styles.statNumber}>
                  0
                </Animatable.Text>
                <Text style={styles.statLabel}>Shared</Text>
              </View>
              <View style={styles.statBox}>
                <Animatable.Text
                  animation="bounceIn"
                  delay={1200}
                  style={styles.statNumber}>
                  0
                </Animatable.Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
              <View style={styles.statBox}>
                <Animatable.Text
                  animation="bounceIn"
                  delay={1300}
                  style={styles.statNumber}>
                  0
                </Animatable.Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
            </Animatable.View>
          </View>
        </View>

        {/* Bio Section */}
        <Animatable.View
          animation="fadeInUp"
          delay={1200}
          style={styles.bioContainer}>
          <Text style={styles.nameText}>
            {(userProfile?.first_name || '') +
              ' ' +
              (userProfile?.last_name || '')}
          </Text>
          <Text style={styles.usernameText}>
            @{userProfile?.first_name && userProfile?.last_name
              ? `${userProfile.first_name.toLowerCase()}${userProfile.last_name.toLowerCase()}`
              : 'stylhelpr'}
          </Text>
          {userProfile?.fashion_level && (
            <Text style={styles.bioText}>{userProfile.fashion_level}</Text>
          )}
          {userProfile?.profession && (
            <Text style={styles.bioText}>{userProfile.profession}</Text>
          )}
          {/* Actual Bio with Edit */}
          <Pressable
            onPress={() => {
              setEditingBio(bio);
              setBioModalVisible(true);
            }}
            style={styles.bioEditContainer}>
            {bio ? (
              <Text style={styles.bioText}>{bio}</Text>
            ) : (
              <Text style={[styles.bioText, {fontStyle: 'italic', opacity: 0.6}]}>
                Tap to add a bio...
              </Text>
            )}
            <Icon
              name="edit"
              size={16}
              color={theme.colors.foreground3}
              style={{marginLeft: 8}}
            />
          </Pressable>
        </Animatable.View>
      </Animatable.View>

      {/* Style Profile CTA */}
      <Animatable.View
        animation="fadeInUp"
        delay={1400}
        style={globalStyles.section}>
        <Text style={globalStyles.sectionTitle}>Style Profile</Text>
        <View style={{alignItems: 'center'}}>
          <AppleTouchFeedback
            onPress={() => navigate('StyleProfileScreen')}
            hapticStyle="impactLight"
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
                fontWeight: tokens.fontWeight.medium,
                flexShrink: 1,
                textAlign: 'center',
              }}
              numberOfLines={1}>
              Edit Style Profile
            </Text>
          </AppleTouchFeedback>
        </View>
      </Animatable.View>

      {/* Style Tags */}
      <Animatable.View
        animation="fadeInLeft"
        delay={1600}
        style={globalStyles.sectionScroll}>
        <Text style={globalStyles.sectionTitle}>Style Tags</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingRight: 8}}>
          {styleTags.length === 0 ? (
            <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
              <Text style={globalStyles.missingDataMessage1}>
                No saved styles.
              </Text>
              <TooltipBubble
                message='No styles added yet. Tap the "Edit Style Profile" button above and head over there to add your favorite styles.'
                position="top"
              />
            </View>
          ) : (
            styleTags.map((tag, index) => (
              <Animatable.View
                key={tag}
                animation="bounceInRight"
                delay={1700 + index * 80}
                useNativeDriver
                style={[
                  globalStyles.pill2,
                  {backgroundColor: theme.colors.surface},
                ]}>
                <Text style={globalStyles.pillText2}>#{tag}</Text>
              </Animatable.View>
            ))
          )}
        </ScrollView>
      </Animatable.View>

      {/* Favorite Brands */}
      <Animatable.View
        animation="fadeInRight"
        delay={1900}
        style={globalStyles.sectionScroll}>
        <Text style={[globalStyles.sectionTitle]}>Saved Brand Tags</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingRight: 8}}>
          {favoriteBrands.length === 0 ? (
            <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
              <Text style={globalStyles.missingDataMessage1}>
                No saved brands.
              </Text>
              <TooltipBubble
                message='No brands added yet. Tap the "Edit Style Profile" button above and head over there to add your favorite brands.'
                position="top"
              />
            </View>
          ) : (
            favoriteBrands.map((brand, index) => (
              <Animatable.View
                key={brand}
                animation="bounceInLeft"
                delay={2000 + index * 90}
                useNativeDriver
                style={[
                  globalStyles.pill2,
                  {backgroundColor: theme.colors.surface},
                ]}>
                <Text style={globalStyles.pillText2}>#{brand}</Text>
              </Animatable.View>
            ))
          )}
        </ScrollView>
      </Animatable.View>

      {/* Shared Looks */}
      <Animatable.View
        animation="fadeInUpBig"
        delay={2400}
        style={globalStyles.sectionScroll}>
        <Text style={[globalStyles.sectionTitle]}>Shared Looks</Text>
        {sharedLooks.length === 0 ? (
          <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
            <Text style={globalStyles.missingDataMessage1}>No shared looks.</Text>
            <TooltipBubble
              message="You haven't shared any looks yet. Share an outfit from the home screen to see it here."
              position="top"
            />
          </View>
        ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingRight: 8}}>
          {sharedLooks
            .filter(look => !hiddenSharedLooks.has(look.id))
            .map((look, index) => (
            <Animatable.View
              key={look.id}
              animation="zoomInUp"
              delay={2300 + index * 120}
              useNativeDriver
              style={[globalStyles.outfitCard, {width: 131}]}>
              <Pressable
                onPress={() => {
                  // Could navigate to look detail or show preview
                }}
                style={{alignItems: 'center'}}>
                {/* Card - single image or 2x2 grid */}
                <View
                  style={{
                    width: 130,
                    height: 130,
                    borderRadius: tokens.borderRadius.md,
                    overflow: 'hidden',
                    backgroundColor: '#000',
                  }}>
                  {look.image_url ? (
                    // Single image post
                    <Image
                      source={{uri: look.image_url}}
                      style={{width: 130, height: 130}}
                      resizeMode="cover"
                    />
                  ) : (
                    // 2x2 Grid for multi-item posts
                    <>
                      <View style={{flexDirection: 'row', height: 65}}>
                        <Image
                          source={{uri: look.top_image}}
                          style={{width: 65, height: 65}}
                          resizeMode="cover"
                        />
                        <Image
                          source={{uri: look.bottom_image}}
                          style={{width: 65, height: 65}}
                          resizeMode="cover"
                        />
                      </View>
                      <View style={{flexDirection: 'row', height: 65}}>
                        <Image
                          source={{uri: look.shoes_image}}
                          style={{width: 65, height: 65}}
                          resizeMode="cover"
                        />
                        <View
                          style={{
                            width: 65,
                            height: 65,
                            backgroundColor: '#000',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}>
                          <Text
                            style={{
                              color: '#fff',
                              fontSize: 8,
                              fontWeight: '800',
                              letterSpacing: 1,
                            }}>
                            StylHelpr
                          </Text>
                        </View>
                      </View>
                    </>
                  )}
                  {/* Hide button */}
                  <Pressable
                    onPress={() => {
                      setHiddenSharedLooks(prev => new Set(prev).add(look.id));
                    }}
                    style={{
                      position: 'absolute',
                      bottom: 4,
                      right: 4,
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: 'rgba(220, 38, 38, 0.9)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                    <Icon name="close" size={14} color="#fff" />
                  </Pressable>
                </View>
                {/* Look name and likes */}
                <Animatable.View
                  animation="fadeIn"
                  delay={2500 + index * 100}
                  style={{marginTop: 6, alignItems: 'center'}}>
                  <Text
                    style={[globalStyles.cardSubLabel, {textAlign: 'center'}]}
                    numberOfLines={1}>
                    {look.description || 'Shared Look'}
                  </Text>
                </Animatable.View>
              </Pressable>
            </Animatable.View>
          ))}
        </ScrollView>
        )}
      </Animatable.View>

      {/* Connected Accounts */}
      {/* <ConnectedAccountsSection /> */}

      {/* Footer */}
      <Animatable.View
        animation="fadeIn"
        delay={2800}
        style={[globalStyles.section, {paddingTop: 8}]}>
        <AppleTouchFeedback
          hapticStyle="impactLight"
          onPress={() => navigate('ContactScreen')}>
          <Animatable.Text
            animation="pulse"
            iterationCount="infinite"
            duration={5000}
            style={{
              textAlign: 'center',
              color: theme.colors.foreground,
              fontSize: 13,
              paddingVertical: 8,
            }}>
            Contact Support
          </Animatable.Text>
        </AppleTouchFeedback>

        <AppleTouchFeedback
          hapticStyle="impactLight"
          onPress={() => navigate('AboutScreen')}>
          <Animatable.Text
            animation="fadeInUp"
            delay={3000}
            style={{
              textAlign: 'center',
              color: theme.colors.foreground,
              fontSize: 12,
              opacity: 0.8,
              paddingBottom: 16,
            }}>
            About StylHelpr
          </Animatable.Text>
        </AppleTouchFeedback>
      </Animatable.View>

      <SavedLookPreviewModal
        visible={previewVisible}
        look={selectedLook}
        onClose={() => setPreviewVisible(false)}
      />

      {/* Bio Edit Modal */}
      <Modal
        visible={bioModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBioModalVisible(false)}>
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setBioModalVisible(false)}>
          <Pressable
            style={{
              width: '85%',
              backgroundColor: theme.colors.cardBackground,
              borderRadius: 16,
              padding: 20,
            }}
            onPress={e => e.stopPropagation()}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: theme.colors.foreground,
                marginBottom: 12,
              }}>
              Edit Bio
            </Text>
            <TextInput
              value={editingBio}
              onChangeText={setEditingBio}
              placeholder="Tell us about yourself..."
              placeholderTextColor={theme.colors.foreground3}
              multiline
              numberOfLines={4}
              maxLength={150}
              style={{
                backgroundColor: theme.colors.input,
                borderRadius: 8,
                padding: 12,
                color: theme.colors.foreground,
                fontSize: 16,
                minHeight: 100,
                textAlignVertical: 'top',
              }}
            />
            <Text
              style={{
                fontSize: 12,
                color: theme.colors.foreground3,
                textAlign: 'right',
                marginTop: 4,
              }}>
              {editingBio.length}/150
            </Text>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                marginTop: 16,
                gap: 12,
              }}>
              <Pressable
                onPress={() => setBioModalVisible(false)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderRadius: 8,
                }}>
                <Text style={{color: theme.colors.foreground2, fontSize: 16}}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  try {
                    const res = await fetch(
                      `${API_BASE_URL}/community/users/${userId}/bio`,
                      {
                        method: 'PATCH',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({bio: editingBio}),
                      },
                    );
                    if (res.ok) {
                      setBio(editingBio);
                      setBioModalVisible(false);
                    }
                  } catch {
                    // ignore
                  }
                }}
                style={{
                  backgroundColor: theme.colors.button1,
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderRadius: 8,
                }}>
                <Text style={{color: '#fff', fontSize: 16, fontWeight: '600'}}>
                  Save
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
    // </GradientBackground>
  );
}

///////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   Dimensions,
//   Pressable,
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
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
// import {GradientBackground} from '../components/LinearGradientComponents/GradientBackground';
// import ConnectedAccountsSection from '../components/ConnectedAccounts/ConnectedAccountsSection';

// const screenWidth = Dimensions.get('window').width;
// const STORAGE_KEY = (uid: string) => `profile_picture:${uid}`;

// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   favorite?: boolean;
// };

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
//   const styleTags = styleProfile?.style_preferences || [];

//   const [favoriteBrands, setFavoriteBrands] = useState<string[]>([]);
//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   const [loadingSaved, setLoadingSaved] = useState(true);
//   const [previewVisible, setPreviewVisible] = useState(false);
//   const [selectedLook, setSelectedLook] = useState<any | null>(null);
//   const [profilePicture, setProfilePicture] = useState<string>(''); // keep as string only

//   const HEADER_HEIGHT = 70; // adjust to your actual header height
//   const BOTTOM_NAV_HEIGHT = 90; // adjust to your nav height
//   const insets = useSafeAreaInsets();

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Hydrate cached profile picture early
//   // ─────────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       const cached = await AsyncStorage.getItem(STORAGE_KEY(userId));
//       if (cached) {
//         console.log('[PROFILE] Cached profile pic found:', cached);
//         setProfilePicture(cached);
//       }
//     })();
//   }, [userId]);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Fetch favorite brands
//   // ─────────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(
//           `${API_BASE_URL}/style-profile/${userId}/brands`,
//         );
//         const json = await res.json();
//         setFavoriteBrands(Array.isArray(json.brands) ? json.brands : []);
//       } catch {
//         setFavoriteBrands([]);
//       }
//     })();
//   }, [userId]);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Fetch saved looks
//   // ─────────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         setSavedLooks(data);
//       } catch {
//       } finally {
//         setLoadingSaved(false);
//       }
//     })();
//   }, [userId]);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Queries: profile, wardrobe, counts
//   // ─────────────────────────────────────────────────────────────────────────────
//   const {data: userProfileRaw} = useQuery<UserProfile>({
//     enabled: !!userId,
//     queryKey: ['userProfile', userId],
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/users/${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch user profile');
//       return res.json();
//     },
//   });

//   // Only hydrate picture from backend if we don't already have one locally
//   // useEffect(() => {
//   //   if (
//   //     userProfileRaw &&
//   //     !profilePicture &&
//   //     userProfileRaw.profile_picture &&
//   //     userProfileRaw.profile_picture.trim() !== ''
//   //   ) {
//   //     setProfilePicture(userProfileRaw.profile_picture);
//   //     if (userId) {
//   //       AsyncStorage.setItem(
//   //         STORAGE_KEY(userId),
//   //         userProfileRaw.profile_picture,
//   //       ).catch(() => {});
//   //     }
//   //   }
//   // }, [userProfileRaw, profilePicture, userId]);

//   // Replace this entire useEffect:
//   useEffect(() => {
//     if (
//       userProfileRaw &&
//       userProfileRaw.profile_picture &&
//       userProfileRaw.profile_picture.trim() !== ''
//     ) {
//       console.log(
//         '[PROFILE] Using backend profile picture:',
//         userProfileRaw.profile_picture,
//       );
//       setProfilePicture(userProfileRaw.profile_picture);
//       if (userId) {
//         AsyncStorage.setItem(
//           STORAGE_KEY(userId),
//           userProfileRaw.profile_picture,
//         ).catch(() => {});
//       }
//     }
//   }, [userProfileRaw, userId]);

//   // IMPORTANT: Don't construct a UserProfile when data is still undefined,
//   // or TS will complain about missing required fields.
//   const userProfile = userProfileRaw
//     ? {
//         ...userProfileRaw,
//         // never assign null; use undefined or a string
//         profile_picture:
//           profilePicture || userProfileRaw.profile_picture || undefined,
//       }
//     : undefined;

//   const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
//     queryKey: ['wardrobe', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
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
//       const data = await res.json();
//       return data.count;
//     },
//   });

//   const {data: totalCustomOutfits = 0} = useQuery({
//     queryKey: ['totalCustomOutfits', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/custom-outfits/count/${userId}`);
//       const data = await res.json();
//       return data.count;
//     },
//   });

//   const totalItems = wardrobe.length;

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Initials fallback logic
//   // ─────────────────────────────────────────────────────────────────────────────
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

//   // cache-busted URI so the newest image shows immediately
//   const profileUri =
//     profilePicture && profilePicture.length > 0
//       ? `${profilePicture}${
//           profilePicture.includes('?') ? '&' : '?'
//         }v=${Date.now()}`
//       : '';

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Styles
//   // ─────────────────────────────────────────────────────────────────────────────
//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       // backgroundColor: theme.colors.background,
//     },
//     headerRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       marginTop: 10,
//     },
//     settingsButton: {
//       position: 'absolute',
//       bottom: -8,
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
//       width: 92,
//       height: 92,
//       borderRadius: 45,
//       backgroundColor: theme.colors.surface,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     initialsText: {
//       color: theme.colors.foreground,
//       fontWeight: tokens.fontWeight.bold,
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
//       fontWeight: tokens.fontWeight.bold,
//       fontSize: 17,
//       color: theme.colors.foreground2,
//     },
//     statLabel: {
//       fontSize: 14,
//       color: theme.colors.foreground3,
//       fontWeight: tokens.fontWeight.semiBold,
//     },
//     bioContainer: {
//       marginTop: 8,
//     },
//     nameText: {
//       color: theme.colors.foreground,
//       fontWeight: tokens.fontWeight.bold,
//       fontSize: 17,
//     },
//     bioText: {
//       color: theme.colors.foreground2,
//       fontSize: 16,
//       marginTop: 4,
//       lineHeight: 18,
//     },
//     linkText: {
//       color: theme.colors.button1,
//       fontSize: 16,
//       marginTop: 4,
//     },
//   });

//   return (
//     // <GradientBackground>
//     <ScrollView
//       showsVerticalScrollIndicator={false}
//       contentContainerStyle={[
//         globalStyles.container,
//         {
//           backgroundColor: theme.colors.background,
//           paddingTop: insets.top + HEADER_HEIGHT, // 👈 restore space for header
//           paddingBottom: insets.bottom + BOTTOM_NAV_HEIGHT, // 👈 restore space for bottom nav
//         },
//       ]}>
//       <Text style={globalStyles.header}>Profile</Text>

//       {/* Settings Icon */}
//       <AppleTouchFeedback
//         style={styles.settingsButton}
//         onPress={() => {
//           if (global.goingBack) return;
//           navigate('Settings', {goBack: () => navigate('Profile')});
//         }}
//         hapticStyle="impactLight">
//         <Animatable.View
//           animation="rotate"
//           iterationCount="infinite"
//           duration={16000}>
//           <Icon name="settings" size={26} color={theme.colors.button1} />
//         </Animatable.View>
//       </AppleTouchFeedback>

//       {/* Header Row */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={300}
//         style={globalStyles.section}>
//         <View style={styles.headerRow}>
//           {/* Avatar */}
//           <Animatable.View
//             animation="pulse"
//             iterationCount="infinite"
//             duration={5000}
//             style={styles.avatarWrapper}>
//             <View style={styles.avatarBorder}>
//               {profilePicture ? (
//                 <Image source={{uri: profileUri}} style={styles.avatar} />
//               ) : (
//                 <View style={styles.avatar}>
//                   <Text style={styles.initialsText}>{initials}</Text>
//                 </View>
//               )}
//             </View>
//           </Animatable.View>

//           {/* Stats */}
//           <Animatable.View
//             animation="fadeIn"
//             delay={500}
//             style={styles.statsRow}>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={600}
//                 style={styles.statNumber}>
//                 {totalItems}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Wardrobe Items</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={800}
//                 style={styles.statNumber}>
//                 {totalCustomOutfits}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Outfits</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={1000}
//                 style={styles.statNumber}>
//                 {totalFavorites}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Favorites</Text>
//             </View>
//           </Animatable.View>
//         </View>

//         {/* Bio Section */}
//         <Animatable.View
//           animation="fadeInUp"
//           delay={1200}
//           style={styles.bioContainer}>
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
//         </Animatable.View>
//       </Animatable.View>

//       {/* Style Profile CTA */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={1400}
//         style={globalStyles.section}>
//         <Text style={globalStyles.sectionTitle}>Style Profile</Text>
//         <View style={{alignItems: 'center'}}>
//           <AppleTouchFeedback
//             onPress={() => navigate('StyleProfileScreen')}
//             hapticStyle="impactLight"
//             style={[
//               globalStyles.buttonPrimary,
//               {
//                 minWidth: 200,
//                 flexDirection: 'row',
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 marginTop: 4,
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
//                 fontWeight: tokens.fontWeight.medium,
//                 flexShrink: 1,
//                 textAlign: 'center',
//               }}
//               numberOfLines={1}>
//               Edit Style Profile
//             </Text>
//           </AppleTouchFeedback>
//         </View>
//       </Animatable.View>

//       {/* Style Tags */}
//       <Animatable.View
//         animation="fadeInLeft"
//         delay={1600}
//         style={globalStyles.sectionScroll}>
//         <Text style={globalStyles.sectionTitle}>Style Tags</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingRight: 8}}>
//           {styleTags.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved styles.
//               </Text>
//               <TooltipBubble
//                 message='No styles added yet. Tap the "Edit Style Profile" button above and head over there to add your favorite styles.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             styleTags.map((tag, index) => (
//               <Animatable.View
//                 key={tag}
//                 animation="bounceInRight"
//                 delay={1700 + index * 80}
//                 useNativeDriver
//                 style={[
//                   globalStyles.pill2,
//                   {backgroundColor: theme.colors.surface},
//                 ]}>
//                 <Text style={globalStyles.pillText2}>#{tag}</Text>
//               </Animatable.View>
//             ))
//           )}
//         </ScrollView>
//       </Animatable.View>

//       {/* Favorite Brands */}
//       <Animatable.View
//         animation="fadeInRight"
//         delay={1900}
//         style={globalStyles.sectionScroll}>
//         <Text style={[globalStyles.sectionTitle]}>Saved Brand Tags</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingRight: 8}}>
//           {favoriteBrands.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved brands.
//               </Text>
//               <TooltipBubble
//                 message='No brands added yet. Tap the "Edit Style Profile" button above and head over there to add your favorite brands.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             favoriteBrands.map((brand, index) => (
//               <Animatable.View
//                 key={brand}
//                 animation="bounceInLeft"
//                 delay={2000 + index * 90}
//                 useNativeDriver
//                 style={[
//                   globalStyles.pill2,
//                   {backgroundColor: theme.colors.surface},
//                 ]}>
//                 <Text style={globalStyles.pillText2}>#{brand}</Text>
//               </Animatable.View>
//             ))
//           )}
//         </ScrollView>
//       </Animatable.View>

//       {/* Saved Looks */}
//       <Animatable.View
//         animation="fadeInUpBig"
//         delay={2400}
//         style={globalStyles.sectionScroll}>
//         <Text style={[globalStyles.sectionTitle]}>Your Saved Looks</Text>
//         {savedLooks.length === 0 ? (
//           <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//             <Text style={globalStyles.missingDataMessage1}>
//               No saved looks.
//             </Text>
//             <TooltipBubble
//               message='You haven’t saved any looks yet. Tap "Home" in the bottom navigation bar and then tap "Add Look" to add your favorite looks.'
//               position="top"
//             />
//           </View>
//         ) : (
//           <ScrollView
//             horizontal
//             showsHorizontalScrollIndicator={false}
//             contentContainerStyle={{paddingRight: 8}}>
//             {savedLooks.map((look, index) => (
//               <Animatable.View
//                 key={look.id}
//                 animation="zoomInUp"
//                 delay={2300 + index * 120}
//                 useNativeDriver
//                 style={globalStyles.outfitCard}>
//                 <Pressable
//                   onPress={() => {
//                     setSelectedLook(look);
//                     setPreviewVisible(true);
//                   }}
//                   style={{alignItems: 'center'}}>
//                   <View>
//                     <Image
//                       source={{uri: look.image_url}}
//                       style={[globalStyles.image8]}
//                       resizeMode="cover"
//                     />
//                   </View>
//                   <Animatable.Text
//                     animation="fadeIn"
//                     delay={2500 + index * 100}
//                     style={[
//                       globalStyles.subLabel,
//                       {marginTop: 4, textAlign: 'center'},
//                     ]}
//                     numberOfLines={1}>
//                     {look.name}
//                   </Animatable.Text>
//                 </Pressable>
//               </Animatable.View>
//             ))}
//           </ScrollView>
//         )}
//       </Animatable.View>

//       {/* Connected Accounts */}
//       {/* <ConnectedAccountsSection /> */}

//       {/* Footer */}
//       <Animatable.View
//         animation="fadeIn"
//         delay={2800}
//         style={[globalStyles.section, {paddingTop: 8}]}>
//         <AppleTouchFeedback
//           hapticStyle="impactLight"
//           onPress={() => navigate('ContactScreen')}>
//           <Animatable.Text
//             animation="pulse"
//             iterationCount="infinite"
//             duration={5000}
//             style={{
//               textAlign: 'center',
//               color: theme.colors.foreground,
//               fontSize: 13,
//               paddingVertical: 8,
//             }}>
//             Contact Support
//           </Animatable.Text>
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           hapticStyle="impactLight"
//           onPress={() => navigate('AboutScreen')}>
//           <Animatable.Text
//             animation="fadeInUp"
//             delay={3000}
//             style={{
//               textAlign: 'center',
//               color: theme.colors.foreground,
//               fontSize: 12,
//               opacity: 0.8,
//               paddingBottom: 16,
//             }}>
//             About StylHelpr
//           </Animatable.Text>
//         </AppleTouchFeedback>
//       </Animatable.View>

//       <SavedLookPreviewModal
//         visible={previewVisible}
//         look={selectedLook}
//         onClose={() => setPreviewVisible(false)}
//       />
//     </ScrollView>
//     // </GradientBackground>
//   );
// }

///////////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   Dimensions,
//   Pressable,
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
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
// import {GradientBackground} from '../components/LinearGradientComponents/GradientBackground';

// const screenWidth = Dimensions.get('window').width;
// const STORAGE_KEY = (uid: string) => `profile_picture:${uid}`;

// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   favorite?: boolean;
// };

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
//   const styleTags = styleProfile?.style_preferences || [];

//   const [favoriteBrands, setFavoriteBrands] = useState<string[]>([]);
//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   const [loadingSaved, setLoadingSaved] = useState(true);
//   const [previewVisible, setPreviewVisible] = useState(false);
//   const [selectedLook, setSelectedLook] = useState<any | null>(null);
//   const [profilePicture, setProfilePicture] = useState<string>(''); // keep as string only

//   const HEADER_HEIGHT = 70; // adjust to your actual header height
//   const BOTTOM_NAV_HEIGHT = 90; // adjust to your nav height
//   const insets = useSafeAreaInsets();

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Hydrate cached profile picture early
//   // ─────────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       const cached = await AsyncStorage.getItem(STORAGE_KEY(userId));
//       if (cached) {
//         console.log('[PROFILE] Cached profile pic found:', cached);
//         setProfilePicture(cached);
//       }
//     })();
//   }, [userId]);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Fetch favorite brands
//   // ─────────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(
//           `${API_BASE_URL}/style-profile/${userId}/brands`,
//         );
//         const json = await res.json();
//         setFavoriteBrands(Array.isArray(json.brands) ? json.brands : []);
//       } catch {
//         setFavoriteBrands([]);
//       }
//     })();
//   }, [userId]);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Fetch saved looks
//   // ─────────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         setSavedLooks(data);
//       } catch {
//       } finally {
//         setLoadingSaved(false);
//       }
//     })();
//   }, [userId]);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Queries: profile, wardrobe, counts
//   // ─────────────────────────────────────────────────────────────────────────────
//   const {data: userProfileRaw} = useQuery<UserProfile>({
//     enabled: !!userId,
//     queryKey: ['userProfile', userId],
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/users/${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch user profile');
//       return res.json();
//     },
//   });

//   // Only hydrate picture from backend if we don't already have one locally
//   // useEffect(() => {
//   //   if (
//   //     userProfileRaw &&
//   //     !profilePicture &&
//   //     userProfileRaw.profile_picture &&
//   //     userProfileRaw.profile_picture.trim() !== ''
//   //   ) {
//   //     setProfilePicture(userProfileRaw.profile_picture);
//   //     if (userId) {
//   //       AsyncStorage.setItem(
//   //         STORAGE_KEY(userId),
//   //         userProfileRaw.profile_picture,
//   //       ).catch(() => {});
//   //     }
//   //   }
//   // }, [userProfileRaw, profilePicture, userId]);

//   // Replace this entire useEffect:
//   useEffect(() => {
//     if (
//       userProfileRaw &&
//       userProfileRaw.profile_picture &&
//       userProfileRaw.profile_picture.trim() !== ''
//     ) {
//       console.log(
//         '[PROFILE] Using backend profile picture:',
//         userProfileRaw.profile_picture,
//       );
//       setProfilePicture(userProfileRaw.profile_picture);
//       if (userId) {
//         AsyncStorage.setItem(
//           STORAGE_KEY(userId),
//           userProfileRaw.profile_picture,
//         ).catch(() => {});
//       }
//     }
//   }, [userProfileRaw, userId]);

//   // IMPORTANT: Don't construct a UserProfile when data is still undefined,
//   // or TS will complain about missing required fields.
//   const userProfile = userProfileRaw
//     ? {
//         ...userProfileRaw,
//         // never assign null; use undefined or a string
//         profile_picture:
//           profilePicture || userProfileRaw.profile_picture || undefined,
//       }
//     : undefined;

//   const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
//     queryKey: ['wardrobe', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
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
//       const data = await res.json();
//       return data.count;
//     },
//   });

//   const {data: totalCustomOutfits = 0} = useQuery({
//     queryKey: ['totalCustomOutfits', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/custom-outfits/count/${userId}`);
//       const data = await res.json();
//       return data.count;
//     },
//   });

//   const totalItems = wardrobe.length;

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Initials fallback logic
//   // ─────────────────────────────────────────────────────────────────────────────
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

//   // cache-busted URI so the newest image shows immediately
//   const profileUri =
//     profilePicture && profilePicture.length > 0
//       ? `${profilePicture}${
//           profilePicture.includes('?') ? '&' : '?'
//         }v=${Date.now()}`
//       : '';

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Styles
//   // ─────────────────────────────────────────────────────────────────────────────
//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       // backgroundColor: theme.colors.background,
//     },
//     headerRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       marginTop: 10,
//     },
//     settingsButton: {
//       position: 'absolute',
//       bottom: -8,
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
//       width: 92,
//       height: 92,
//       borderRadius: 45,
//       backgroundColor: theme.colors.surface,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     initialsText: {
//       color: theme.colors.foreground,
//       fontWeight: tokens.fontWeight.bold,
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
//       fontWeight: tokens.fontWeight.bold,
//       fontSize: 17,
//       color: theme.colors.foreground2,
//     },
//     statLabel: {
//       fontSize: 14,
//       color: theme.colors.foreground3,
//       fontWeight: tokens.fontWeight.semiBold,
//     },
//     bioContainer: {
//       marginTop: 8,
//     },
//     nameText: {
//       color: theme.colors.foreground,
//       fontWeight: tokens.fontWeight.bold,
//       fontSize: 17,
//     },
//     bioText: {
//       color: theme.colors.foreground2,
//       fontSize: 16,
//       marginTop: 4,
//       lineHeight: 18,
//     },
//     linkText: {
//       color: theme.colors.button1,
//       fontSize: 16,
//       marginTop: 4,
//     },
//   });

//   return (
//     // <GradientBackground>
//     <ScrollView
//       contentContainerStyle={[
//         globalStyles.container,
//         {
//           backgroundColor: theme.colors.background,
//           paddingTop: insets.top + HEADER_HEIGHT, // 👈 restore space for header
//           paddingBottom: insets.bottom + BOTTOM_NAV_HEIGHT, // 👈 restore space for bottom nav
//         },
//       ]}>
//       <Text style={globalStyles.header}>Profile</Text>

//       {/* Settings Icon */}
//       <AppleTouchFeedback
//         style={styles.settingsButton}
//         onPress={() => {
//           if (global.goingBack) return;
//           navigate('Settings', {goBack: () => navigate('Profile')});
//         }}
//         hapticStyle="impactLight">
//         <Animatable.View
//           animation="rotate"
//           iterationCount="infinite"
//           duration={16000}>
//           <Icon name="settings" size={26} color={theme.colors.button1} />
//         </Animatable.View>
//       </AppleTouchFeedback>

//       {/* Header Row */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={300}
//         style={globalStyles.section}>
//         <View style={styles.headerRow}>
//           {/* Avatar */}
//           <Animatable.View
//             animation="pulse"
//             iterationCount="infinite"
//             duration={5000}
//             style={styles.avatarWrapper}>
//             <View style={styles.avatarBorder}>
//               {profilePicture ? (
//                 <Image source={{uri: profileUri}} style={styles.avatar} />
//               ) : (
//                 <View style={styles.avatar}>
//                   <Text style={styles.initialsText}>{initials}</Text>
//                 </View>
//               )}
//             </View>
//           </Animatable.View>

//           {/* Stats */}
//           <Animatable.View
//             animation="fadeIn"
//             delay={500}
//             style={styles.statsRow}>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={600}
//                 style={styles.statNumber}>
//                 {totalItems}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Wardrobe Items</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={800}
//                 style={styles.statNumber}>
//                 {totalCustomOutfits}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Outfits</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={1000}
//                 style={styles.statNumber}>
//                 {totalFavorites}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Favorites</Text>
//             </View>
//           </Animatable.View>
//         </View>

//         {/* Bio Section */}
//         <Animatable.View
//           animation="fadeInUp"
//           delay={1200}
//           style={styles.bioContainer}>
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
//         </Animatable.View>
//       </Animatable.View>

//       {/* Style Profile CTA */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={1400}
//         style={globalStyles.section}>
//         <Text style={globalStyles.sectionTitle}>Style Profile</Text>
//         <View style={{alignItems: 'center'}}>
//           <AppleTouchFeedback
//             onPress={() => navigate('StyleProfileScreen')}
//             hapticStyle="impactLight"
//             style={[
//               globalStyles.buttonPrimary,
//               {
//                 minWidth: 200,
//                 flexDirection: 'row',
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 marginTop: 4,
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
//                 fontWeight: tokens.fontWeight.medium,
//                 flexShrink: 1,
//                 textAlign: 'center',
//               }}
//               numberOfLines={1}>
//               Edit Style Profile
//             </Text>
//           </AppleTouchFeedback>
//         </View>
//       </Animatable.View>

//       {/* Style Tags */}
//       <Animatable.View
//         animation="fadeInLeft"
//         delay={1600}
//         style={globalStyles.sectionScroll}>
//         <Text style={globalStyles.sectionTitle}>Style Tags</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingRight: 8}}>
//           {styleTags.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved styles.
//               </Text>
//               <TooltipBubble
//                 message='No styles added yet. Tap the "Edit Style Profile" button above and head over there to add your favorite styles.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             styleTags.map((tag, index) => (
//               <Animatable.View
//                 key={tag}
//                 animation="bounceInRight"
//                 delay={1700 + index * 80}
//                 useNativeDriver
//                 style={[
//                   globalStyles.pill2,
//                   {backgroundColor: theme.colors.surface},
//                 ]}>
//                 <Text style={globalStyles.pillText2}>#{tag}</Text>
//               </Animatable.View>
//             ))
//           )}
//         </ScrollView>
//       </Animatable.View>

//       {/* Favorite Brands */}
//       <Animatable.View
//         animation="fadeInRight"
//         delay={1900}
//         style={globalStyles.sectionScroll}>
//         <Text style={[globalStyles.sectionTitle]}>Saved Brand Tags</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingRight: 8}}>
//           {favoriteBrands.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved brands.
//               </Text>
//               <TooltipBubble
//                 message='No brands added yet. Tap the "Edit Style Profile" button above and head over there to add your favorite brands.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             favoriteBrands.map((brand, index) => (
//               <Animatable.View
//                 key={brand}
//                 animation="bounceInLeft"
//                 delay={2000 + index * 90}
//                 useNativeDriver
//                 style={[
//                   globalStyles.pill2,
//                   {backgroundColor: theme.colors.surface},
//                 ]}>
//                 <Text style={globalStyles.pillText2}>#{brand}</Text>
//               </Animatable.View>
//             ))
//           )}
//         </ScrollView>
//       </Animatable.View>

//       {/* Saved Looks */}
//       <Animatable.View
//         animation="fadeInUpBig"
//         delay={2200}
//         style={globalStyles.sectionScroll}>
//         <Text style={[globalStyles.sectionTitle]}>Your Saved Looks</Text>
//         {savedLooks.length === 0 ? (
//           <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//             <Text style={globalStyles.missingDataMessage1}>
//               No saved looks.
//             </Text>
//             <TooltipBubble
//               message='You haven’t saved any looks yet. Tap "Home" in the bottom navigation bar and then tap "Add Look" to add your favorite looks.'
//               position="top"
//             />
//           </View>
//         ) : (
//           <ScrollView
//             horizontal
//             showsHorizontalScrollIndicator={false}
//             contentContainerStyle={{paddingRight: 8}}>
//             {savedLooks.map((look, index) => (
//               <Animatable.View
//                 key={look.id}
//                 animation="zoomInUp"
//                 delay={2300 + index * 120}
//                 useNativeDriver
//                 style={globalStyles.outfitCard}>
//                 <Pressable
//                   onPress={() => {
//                     setSelectedLook(look);
//                     setPreviewVisible(true);
//                   }}
//                   style={{alignItems: 'center'}}>
//                   <View>
//                     <Image
//                       source={{uri: look.image_url}}
//                       style={[globalStyles.image8]}
//                       resizeMode="cover"
//                     />
//                   </View>
//                   <Animatable.Text
//                     animation="fadeIn"
//                     delay={2500 + index * 100}
//                     style={[
//                       globalStyles.subLabel,
//                       {marginTop: 4, textAlign: 'center'},
//                     ]}
//                     numberOfLines={1}>
//                     {look.name}
//                   </Animatable.Text>
//                 </Pressable>
//               </Animatable.View>
//             ))}
//           </ScrollView>
//         )}
//       </Animatable.View>

//       {/* Footer */}
//       <Animatable.View
//         animation="fadeIn"
//         delay={2800}
//         style={[globalStyles.section, {paddingTop: 8}]}>
//         <AppleTouchFeedback
//           hapticStyle="impactLight"
//           onPress={() => navigate('ContactScreen')}>
//           <Animatable.Text
//             animation="pulse"
//             iterationCount="infinite"
//             duration={5000}
//             style={{
//               textAlign: 'center',
//               color: theme.colors.foreground,
//               fontSize: 13,
//               paddingVertical: 8,
//             }}>
//             Contact Support
//           </Animatable.Text>
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           hapticStyle="impactLight"
//           onPress={() => navigate('AboutScreen')}>
//           <Animatable.Text
//             animation="fadeInUp"
//             delay={3000}
//             style={{
//               textAlign: 'center',
//               color: theme.colors.foreground,
//               fontSize: 12,
//               opacity: 0.8,
//               paddingBottom: 16,
//             }}>
//             About StylHelpr
//           </Animatable.Text>
//         </AppleTouchFeedback>
//       </Animatable.View>

//       <SavedLookPreviewModal
//         visible={previewVisible}
//         look={selectedLook}
//         onClose={() => setPreviewVisible(false)}
//       />
//     </ScrollView>
//     // </GradientBackground>
//   );
// }

////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   Dimensions,
//   Pressable,
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
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {GradientBackground} from '../components/LinearGradientComponents/GradientBackground';

// const screenWidth = Dimensions.get('window').width;
// const STORAGE_KEY = (uid: string) => `profile_picture:${uid}`;

// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   favorite?: boolean;
// };

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
//   const styleTags = styleProfile?.style_preferences || [];

//   const [favoriteBrands, setFavoriteBrands] = useState<string[]>([]);
//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   const [loadingSaved, setLoadingSaved] = useState(true);
//   const [previewVisible, setPreviewVisible] = useState(false);
//   const [selectedLook, setSelectedLook] = useState<any | null>(null);
//   const [profilePicture, setProfilePicture] = useState<string>(''); // keep as string only

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Hydrate cached profile picture early
//   // ─────────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       const cached = await AsyncStorage.getItem(STORAGE_KEY(userId));
//       if (cached) {
//         console.log('[PROFILE] Cached profile pic found:', cached);
//         setProfilePicture(cached);
//       }
//     })();
//   }, [userId]);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Fetch favorite brands
//   // ─────────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(
//           `${API_BASE_URL}/style-profile/${userId}/brands`,
//         );
//         const json = await res.json();
//         setFavoriteBrands(Array.isArray(json.brands) ? json.brands : []);
//       } catch {
//         setFavoriteBrands([]);
//       }
//     })();
//   }, [userId]);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Fetch saved looks
//   // ─────────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         setSavedLooks(data);
//       } catch {
//       } finally {
//         setLoadingSaved(false);
//       }
//     })();
//   }, [userId]);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Queries: profile, wardrobe, counts
//   // ─────────────────────────────────────────────────────────────────────────────
//   const {data: userProfileRaw} = useQuery<UserProfile>({
//     enabled: !!userId,
//     queryKey: ['userProfile', userId],
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/users/${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch user profile');
//       return res.json();
//     },
//   });

//   // Only hydrate picture from backend if we don't already have one locally
//   // useEffect(() => {
//   //   if (
//   //     userProfileRaw &&
//   //     !profilePicture &&
//   //     userProfileRaw.profile_picture &&
//   //     userProfileRaw.profile_picture.trim() !== ''
//   //   ) {
//   //     setProfilePicture(userProfileRaw.profile_picture);
//   //     if (userId) {
//   //       AsyncStorage.setItem(
//   //         STORAGE_KEY(userId),
//   //         userProfileRaw.profile_picture,
//   //       ).catch(() => {});
//   //     }
//   //   }
//   // }, [userProfileRaw, profilePicture, userId]);

//   // Replace this entire useEffect:
//   useEffect(() => {
//     if (
//       userProfileRaw &&
//       userProfileRaw.profile_picture &&
//       userProfileRaw.profile_picture.trim() !== ''
//     ) {
//       console.log(
//         '[PROFILE] Using backend profile picture:',
//         userProfileRaw.profile_picture,
//       );
//       setProfilePicture(userProfileRaw.profile_picture);
//       if (userId) {
//         AsyncStorage.setItem(
//           STORAGE_KEY(userId),
//           userProfileRaw.profile_picture,
//         ).catch(() => {});
//       }
//     }
//   }, [userProfileRaw, userId]);

//   // IMPORTANT: Don't construct a UserProfile when data is still undefined,
//   // or TS will complain about missing required fields.
//   const userProfile = userProfileRaw
//     ? {
//         ...userProfileRaw,
//         // never assign null; use undefined or a string
//         profile_picture:
//           profilePicture || userProfileRaw.profile_picture || undefined,
//       }
//     : undefined;

//   const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
//     queryKey: ['wardrobe', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
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
//       const data = await res.json();
//       return data.count;
//     },
//   });

//   const {data: totalCustomOutfits = 0} = useQuery({
//     queryKey: ['totalCustomOutfits', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/custom-outfits/count/${userId}`);
//       const data = await res.json();
//       return data.count;
//     },
//   });

//   const totalItems = wardrobe.length;

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Initials fallback logic
//   // ─────────────────────────────────────────────────────────────────────────────
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

//   // cache-busted URI so the newest image shows immediately
//   const profileUri =
//     profilePicture && profilePicture.length > 0
//       ? `${profilePicture}${
//           profilePicture.includes('?') ? '&' : '?'
//         }v=${Date.now()}`
//       : '';

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Styles
//   // ─────────────────────────────────────────────────────────────────────────────
//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       // backgroundColor: theme.colors.background,
//     },
//     headerRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       marginTop: 10,
//     },
//     settingsButton: {
//       position: 'absolute',
//       bottom: -8,
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
//       width: 92,
//       height: 92,
//       borderRadius: 45,
//       backgroundColor: theme.colors.surface,
//       alignItems: 'center',
//       justifyContent: 'center',
//     },
//     initialsText: {
//       color: theme.colors.foreground,
//       fontWeight: tokens.fontWeight.bold,
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
//       fontWeight: tokens.fontWeight.bold,
//       fontSize: 17,
//       color: theme.colors.foreground2,
//     },
//     statLabel: {
//       fontSize: 14,
//       color: theme.colors.foreground3,
//       fontWeight: tokens.fontWeight.semiBold,
//     },
//     bioContainer: {
//       marginTop: 8,
//     },
//     nameText: {
//       color: theme.colors.foreground,
//       fontWeight: tokens.fontWeight.bold,
//       fontSize: 17,
//     },
//     bioText: {
//       color: theme.colors.foreground2,
//       fontSize: 16,
//       marginTop: 4,
//       lineHeight: 18,
//     },
//     linkText: {
//       color: theme.colors.button1,
//       fontSize: 16,
//       marginTop: 4,
//     },
//   });

//   return (
//     // <GradientBackground>
//     <ScrollView
//       style={[
//         styles.screen,
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={globalStyles.header}>Profile</Text>

//       {/* Settings Icon */}
//       <AppleTouchFeedback
//         style={styles.settingsButton}
//         onPress={() => {
//           if (global.goingBack) return;
//           navigate('Settings', {goBack: () => navigate('Profile')});
//         }}
//         hapticStyle="impactLight">
//         <Animatable.View
//           animation="rotate"
//           iterationCount="infinite"
//           duration={16000}>
//           <Icon name="settings" size={26} color={theme.colors.button1} />
//         </Animatable.View>
//       </AppleTouchFeedback>

//       {/* Header Row */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={300}
//         style={globalStyles.section}>
//         <View style={styles.headerRow}>
//           {/* Avatar */}
//           <Animatable.View
//             animation="pulse"
//             iterationCount="infinite"
//             duration={5000}
//             style={styles.avatarWrapper}>
//             <View style={styles.avatarBorder}>
//               {profilePicture ? (
//                 <Image source={{uri: profileUri}} style={styles.avatar} />
//               ) : (
//                 <View style={styles.avatar}>
//                   <Text style={styles.initialsText}>{initials}</Text>
//                 </View>
//               )}
//             </View>
//           </Animatable.View>

//           {/* Stats */}
//           <Animatable.View
//             animation="fadeIn"
//             delay={500}
//             style={styles.statsRow}>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={600}
//                 style={styles.statNumber}>
//                 {totalItems}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Wardrobe Items</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={800}
//                 style={styles.statNumber}>
//                 {totalCustomOutfits}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Outfits</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={1000}
//                 style={styles.statNumber}>
//                 {totalFavorites}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Favorites</Text>
//             </View>
//           </Animatable.View>
//         </View>

//         {/* Bio Section */}
//         <Animatable.View
//           animation="fadeInUp"
//           delay={1200}
//           style={styles.bioContainer}>
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
//         </Animatable.View>
//       </Animatable.View>

//       {/* Style Profile CTA */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={1400}
//         style={globalStyles.section}>
//         <Text style={globalStyles.sectionTitle}>Style Profile</Text>
//         <View style={{alignItems: 'center'}}>
//           <AppleTouchFeedback
//             onPress={() => navigate('StyleProfileScreen')}
//             hapticStyle="impactLight"
//             style={[
//               globalStyles.buttonPrimary,
//               {
//                 minWidth: 200,
//                 flexDirection: 'row',
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 marginTop: 4,
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
//                 fontWeight: tokens.fontWeight.medium,
//                 flexShrink: 1,
//                 textAlign: 'center',
//               }}
//               numberOfLines={1}>
//               Edit Style Profile
//             </Text>
//           </AppleTouchFeedback>
//         </View>
//       </Animatable.View>

//       {/* Style Tags */}
//       <Animatable.View
//         animation="fadeInLeft"
//         delay={1600}
//         style={globalStyles.sectionScroll}>
//         <Text style={globalStyles.sectionTitle}>Style Tags</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingRight: 8}}>
//           {styleTags.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved styles.
//               </Text>
//               <TooltipBubble
//                 message='No styles added yet. Tap the "Edit Style Profile" button above and head over there to add your favorite styles.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             styleTags.map((tag, index) => (
//               <Animatable.View
//                 key={tag}
//                 animation="bounceInRight"
//                 delay={1700 + index * 80}
//                 useNativeDriver
//                 style={[
//                   globalStyles.pill,
//                   {backgroundColor: theme.colors.error},
//                 ]}>
//                 <Text style={globalStyles.pillText}>#{tag}</Text>
//               </Animatable.View>
//             ))
//           )}
//         </ScrollView>
//       </Animatable.View>

//       {/* Favorite Brands */}
//       <Animatable.View
//         animation="fadeInRight"
//         delay={1900}
//         style={globalStyles.sectionScroll}>
//         <Text style={[globalStyles.sectionTitle]}>Saved Brand Tags</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingRight: 8}}>
//           {favoriteBrands.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved brands.
//               </Text>
//               <TooltipBubble
//                 message='No brands added yet. Tap the "Edit Style Profile" button above and head over there to add your favorite brands.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             favoriteBrands.map((brand, index) => (
//               <Animatable.View
//                 key={brand}
//                 animation="bounceInLeft"
//                 delay={2000 + index * 90}
//                 useNativeDriver
//                 style={[
//                   globalStyles.pill,
//                   {backgroundColor: theme.colors.error},
//                 ]}>
//                 <Text style={globalStyles.pillText}>#{brand}</Text>
//               </Animatable.View>
//             ))
//           )}
//         </ScrollView>
//       </Animatable.View>

//       {/* Saved Looks */}
//       <Animatable.View
//         animation="fadeInUpBig"
//         delay={2200}
//         style={globalStyles.sectionScroll}>
//         <Text style={[globalStyles.sectionTitle]}>Your Saved Looks</Text>
//         {savedLooks.length === 0 ? (
//           <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//             <Text style={globalStyles.missingDataMessage1}>
//               No saved looks.
//             </Text>
//             <TooltipBubble
//               message='You haven’t saved any looks yet. Tap "Home" in the bottom navigation bar and then tap "Add Look" to add your favorite looks.'
//               position="top"
//             />
//           </View>
//         ) : (
//           <ScrollView
//             horizontal
//             showsHorizontalScrollIndicator={false}
//             contentContainerStyle={{paddingRight: 8}}>
//             {savedLooks.map((look, index) => (
//               <Animatable.View
//                 key={look.id}
//                 animation="zoomInUp"
//                 delay={2300 + index * 120}
//                 useNativeDriver
//                 style={globalStyles.outfitCard}>
//                 <Pressable
//                   onPress={() => {
//                     setSelectedLook(look);
//                     setPreviewVisible(true);
//                   }}
//                   style={{alignItems: 'center'}}>
//                   <View>
//                     <Image
//                       source={{uri: look.image_url}}
//                       style={[globalStyles.image8]}
//                       resizeMode="cover"
//                     />
//                   </View>
//                   <Animatable.Text
//                     animation="fadeIn"
//                     delay={2500 + index * 100}
//                     style={[
//                       globalStyles.subLabel,
//                       {marginTop: 4, textAlign: 'center'},
//                     ]}
//                     numberOfLines={1}>
//                     {look.name}
//                   </Animatable.Text>
//                 </Pressable>
//               </Animatable.View>
//             ))}
//           </ScrollView>
//         )}
//       </Animatable.View>

//       {/* Footer */}
//       <Animatable.View
//         animation="fadeIn"
//         delay={2800}
//         style={[globalStyles.section, {paddingTop: 8}]}>
//         <AppleTouchFeedback
//           hapticStyle="impactLight"
//           onPress={() => navigate('ContactScreen')}>
//           <Animatable.Text
//             animation="pulse"
//             iterationCount="infinite"
//             duration={5000}
//             style={{
//               textAlign: 'center',
//               color: theme.colors.foreground,
//               fontSize: 13,
//               paddingVertical: 8,
//             }}>
//             Contact Support
//           </Animatable.Text>
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           hapticStyle="impactLight"
//           onPress={() => navigate('AboutScreen')}>
//           <Animatable.Text
//             animation="fadeInUp"
//             delay={3000}
//             style={{
//               textAlign: 'center',
//               color: theme.colors.foreground,
//               fontSize: 12,
//               opacity: 0.8,
//               paddingBottom: 16,
//             }}>
//             About StylHelpr
//           </Animatable.Text>
//         </AppleTouchFeedback>
//       </Animatable.View>

//       <SavedLookPreviewModal
//         visible={previewVisible}
//         look={selectedLook}
//         onClose={() => setPreviewVisible(false)}
//       />
//     </ScrollView>
//     // </GradientBackground>
//   );
// }

/////////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   Dimensions,
//   Pressable,
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
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {GradientBackground} from '../components/LinearGradientComponents/GradientBackground';

// const screenWidth = Dimensions.get('window').width;
// const STORAGE_KEY = (uid: string) => `profile_picture:${uid}`;

// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   favorite?: boolean;
// };

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
//   const styleTags = styleProfile?.style_preferences || [];

//   const [favoriteBrands, setFavoriteBrands] = useState<string[]>([]);
//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   const [loadingSaved, setLoadingSaved] = useState(true);
//   const [previewVisible, setPreviewVisible] = useState(false);
//   const [selectedLook, setSelectedLook] = useState<any | null>(null);
//   const [profilePicture, setProfilePicture] = useState<string>(''); // keep as string only

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Hydrate cached profile picture early
//   // ─────────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       const cached = await AsyncStorage.getItem(STORAGE_KEY(userId));
//       if (cached) {
//         console.log('[PROFILE] Cached profile pic found:', cached);
//         setProfilePicture(cached);
//       }
//     })();
//   }, [userId]);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Fetch favorite brands
//   // ─────────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(
//           `${API_BASE_URL}/style-profile/${userId}/brands`,
//         );
//         const json = await res.json();
//         setFavoriteBrands(Array.isArray(json.brands) ? json.brands : []);
//       } catch {
//         setFavoriteBrands([]);
//       }
//     })();
//   }, [userId]);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Fetch saved looks
//   // ─────────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         setSavedLooks(data);
//       } catch {
//       } finally {
//         setLoadingSaved(false);
//       }
//     })();
//   }, [userId]);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Queries: profile, wardrobe, counts
//   // ─────────────────────────────────────────────────────────────────────────────
//   const {data: userProfileRaw} = useQuery<UserProfile>({
//     enabled: !!userId,
//     queryKey: ['userProfile', userId],
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/users/${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch user profile');
//       return res.json();
//     },
//   });

//   // Only hydrate picture from backend if we don't already have one locally
//   // useEffect(() => {
//   //   if (
//   //     userProfileRaw &&
//   //     !profilePicture &&
//   //     userProfileRaw.profile_picture &&
//   //     userProfileRaw.profile_picture.trim() !== ''
//   //   ) {
//   //     setProfilePicture(userProfileRaw.profile_picture);
//   //     if (userId) {
//   //       AsyncStorage.setItem(
//   //         STORAGE_KEY(userId),
//   //         userProfileRaw.profile_picture,
//   //       ).catch(() => {});
//   //     }
//   //   }
//   // }, [userProfileRaw, profilePicture, userId]);

//   // Replace this entire useEffect:
//   useEffect(() => {
//     if (
//       userProfileRaw &&
//       userProfileRaw.profile_picture &&
//       userProfileRaw.profile_picture.trim() !== ''
//     ) {
//       console.log(
//         '[PROFILE] Using backend profile picture:',
//         userProfileRaw.profile_picture,
//       );
//       setProfilePicture(userProfileRaw.profile_picture);
//       if (userId) {
//         AsyncStorage.setItem(
//           STORAGE_KEY(userId),
//           userProfileRaw.profile_picture,
//         ).catch(() => {});
//       }
//     }
//   }, [userProfileRaw, userId]);

//   // IMPORTANT: Don't construct a UserProfile when data is still undefined,
//   // or TS will complain about missing required fields.
//   const userProfile = userProfileRaw
//     ? {
//         ...userProfileRaw,
//         // never assign null; use undefined or a string
//         profile_picture:
//           profilePicture || userProfileRaw.profile_picture || undefined,
//       }
//     : undefined;

//   const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
//     queryKey: ['wardrobe', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
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
//       const data = await res.json();
//       return data.count;
//     },
//   });

//   const {data: totalCustomOutfits = 0} = useQuery({
//     queryKey: ['totalCustomOutfits', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/custom-outfits/count/${userId}`);
//       const data = await res.json();
//       return data.count;
//     },
//   });

//   const totalItems = wardrobe.length;

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Initials fallback logic
//   // ─────────────────────────────────────────────────────────────────────────────
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

//   // cache-busted URI so the newest image shows immediately
//   const profileUri =
//     profilePicture && profilePicture.length > 0
//       ? `${profilePicture}${
//           profilePicture.includes('?') ? '&' : '?'
//         }v=${Date.now()}`
//       : '';

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Styles
//   // ─────────────────────────────────────────────────────────────────────────────
//   const styles = StyleSheet.create({
//     screen: {
//       flex: 1,
//       // backgroundColor: theme.colors.background,
//     },
//     headerRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       marginTop: 10,
//     },
//     settingsButton: {
//       position: 'absolute',
//       bottom: -8,
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
//       width: 92,
//       height: 92,
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
//       color: theme.colors.button1,
//       fontSize: 16,
//       marginTop: 4,
//     },
//   });

//   return (
//     // <GradientBackground>
//     <ScrollView
//       style={[
//         styles.screen,
//         globalStyles.container,
//         {backgroundColor: theme.colors.background},
//       ]}>
//       <Text style={globalStyles.header}>Profile</Text>

//       {/* Settings Icon */}
//       <AppleTouchFeedback
//         style={styles.settingsButton}
//         onPress={() => {
//           if (global.goingBack) return;
//           navigate('Settings', {goBack: () => navigate('Profile')});
//         }}
//         hapticStyle="impactMedium">
//         <Animatable.View
//           animation="rotate"
//           iterationCount="infinite"
//           duration={16000}>
//           <Icon name="settings" size={26} color={theme.colors.button1} />
//         </Animatable.View>
//       </AppleTouchFeedback>

//       {/* Header Row */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={300}
//         style={globalStyles.section}>
//         <View style={styles.headerRow}>
//           {/* Avatar */}
//           <Animatable.View
//             animation="pulse"
//             iterationCount="infinite"
//             duration={5000}
//             style={styles.avatarWrapper}>
//             <View style={styles.avatarBorder}>
//               {profilePicture ? (
//                 <Image source={{uri: profileUri}} style={styles.avatar} />
//               ) : (
//                 <View style={styles.avatar}>
//                   <Text style={styles.initialsText}>{initials}</Text>
//                 </View>
//               )}
//             </View>
//           </Animatable.View>

//           {/* Stats */}
//           <Animatable.View
//             animation="fadeIn"
//             delay={500}
//             style={styles.statsRow}>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={600}
//                 style={styles.statNumber}>
//                 {totalItems}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Wardrobe Items</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={800}
//                 style={styles.statNumber}>
//                 {totalCustomOutfits}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Outfits</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={1000}
//                 style={styles.statNumber}>
//                 {totalFavorites}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Favorites</Text>
//             </View>
//           </Animatable.View>
//         </View>

//         {/* Bio Section */}
//         <Animatable.View
//           animation="fadeInUp"
//           delay={1200}
//           style={styles.bioContainer}>
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
//         </Animatable.View>
//       </Animatable.View>

//       {/* Style Profile CTA */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={1400}
//         style={globalStyles.section}>
//         <Text style={globalStyles.sectionTitle}>Style Profile</Text>
//         <View style={{alignItems: 'center'}}>
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
//                 marginTop: 4,
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
//       </Animatable.View>

//       {/* Style Tags */}
//       <Animatable.View
//         animation="fadeInLeft"
//         delay={1600}
//         style={globalStyles.sectionScroll}>
//         <Text style={globalStyles.sectionTitle}>Style Tags</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingRight: 8}}>
//           {styleTags.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved styles.
//               </Text>
//               <TooltipBubble
//                 message='No styles added yet. Tap the "Edit Style Profile" button above and head over there to add your favorite styles.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             styleTags.map((tag, index) => (
//               <Animatable.View
//                 key={tag}
//                 animation="bounceInRight"
//                 delay={1700 + index * 80}
//                 useNativeDriver
//                 style={[
//                   globalStyles.pill,
//                   {backgroundColor: theme.colors.error},
//                 ]}>
//                 <Text style={globalStyles.pillText}>#{tag}</Text>
//               </Animatable.View>
//             ))
//           )}
//         </ScrollView>
//       </Animatable.View>

//       {/* Favorite Brands */}
//       <Animatable.View
//         animation="fadeInRight"
//         delay={1900}
//         style={globalStyles.sectionScroll}>
//         <Text style={[globalStyles.sectionTitle]}>Saved Brand Tags</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingRight: 8}}>
//           {favoriteBrands.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved brands.
//               </Text>
//               <TooltipBubble
//                 message='No brands added yet. Tap the "Edit Style Profile" button above and head over there to add your favorite brands.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             favoriteBrands.map((brand, index) => (
//               <Animatable.View
//                 key={brand}
//                 animation="bounceInLeft"
//                 delay={2000 + index * 90}
//                 useNativeDriver
//                 style={[
//                   globalStyles.pill,
//                   {backgroundColor: theme.colors.error},
//                 ]}>
//                 <Text style={globalStyles.pillText}>#{brand}</Text>
//               </Animatable.View>
//             ))
//           )}
//         </ScrollView>
//       </Animatable.View>

//       {/* Saved Looks */}
//       <Animatable.View
//         animation="fadeInUpBig"
//         delay={2200}
//         style={globalStyles.sectionScroll}>
//         <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//         {savedLooks.length === 0 ? (
//           <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//             <Text style={globalStyles.missingDataMessage1}>
//               No saved looks.
//             </Text>
//             <TooltipBubble
//               message='You haven’t saved any looks yet. Tap "Home" in the bottom navigation bar and then tap "Add Look" to add your favorite looks.'
//               position="top"
//             />
//           </View>
//         ) : (
//           <ScrollView
//             horizontal
//             showsHorizontalScrollIndicator={false}
//             contentContainerStyle={{paddingRight: 8}}>
//             {savedLooks.map((look, index) => (
//               <Animatable.View
//                 key={look.id}
//                 animation="zoomInUp"
//                 delay={2300 + index * 120}
//                 useNativeDriver
//                 style={globalStyles.outfitCard}>
//                 <Pressable
//                   onPress={() => {
//                     setSelectedLook(look);
//                     setPreviewVisible(true);
//                   }}
//                   style={{alignItems: 'center'}}>
//                   <View>
//                     <Image
//                       source={{uri: look.image_url}}
//                       style={[globalStyles.image8]}
//                       resizeMode="cover"
//                     />
//                   </View>
//                   <Animatable.Text
//                     animation="fadeIn"
//                     delay={2500 + index * 100}
//                     style={[globalStyles.subLabel]}
//                     numberOfLines={1}>
//                     {look.name}
//                   </Animatable.Text>
//                 </Pressable>
//               </Animatable.View>
//             ))}
//           </ScrollView>
//         )}
//       </Animatable.View>

//       {/* Footer */}
//       <Animatable.View
//         animation="fadeIn"
//         delay={2800}
//         style={[globalStyles.section, {paddingTop: 8}]}>
//         <AppleTouchFeedback
//           hapticStyle="impactLight"
//           onPress={() => navigate('ContactScreen')}>
//           <Animatable.Text
//             animation="pulse"
//             iterationCount="infinite"
//             duration={5000}
//             style={{
//               textAlign: 'center',
//               color: theme.colors.foreground,
//               fontSize: 13,
//               paddingVertical: 8,
//             }}>
//             Contact Support
//           </Animatable.Text>
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           hapticStyle="impactLight"
//           onPress={() => navigate('AboutScreen')}>
//           <Animatable.Text
//             animation="fadeInUp"
//             delay={3000}
//             style={{
//               textAlign: 'center',
//               color: theme.colors.foreground,
//               fontSize: 12,
//               opacity: 0.8,
//               paddingBottom: 16,
//             }}>
//             About StylHelpr
//           </Animatable.Text>
//         </AppleTouchFeedback>
//       </Animatable.View>

//       <SavedLookPreviewModal
//         visible={previewVisible}
//         look={selectedLook}
//         onClose={() => setPreviewVisible(false)}
//       />
//     </ScrollView>
//     // </GradientBackground>
//   );
// }

//////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   Dimensions,
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
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const screenWidth = Dimensions.get('window').width;
// const STORAGE_KEY = (uid: string) => `profile_picture:${uid}`;

// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   favorite?: boolean;
// };

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
//   const styleTags = styleProfile?.style_preferences || [];

//   const [favoriteBrands, setFavoriteBrands] = useState<string[]>([]);
//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   const [loadingSaved, setLoadingSaved] = useState(true);
//   const [previewVisible, setPreviewVisible] = useState(false);
//   const [selectedLook, setSelectedLook] = useState<any | null>(null);
//   const [profilePicture, setProfilePicture] = useState<string>(''); // keep as string only

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Hydrate cached profile picture early
//   // ─────────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       const cached = await AsyncStorage.getItem(STORAGE_KEY(userId));
//       if (cached) {
//         console.log('[PROFILE] Cached profile pic found:', cached);
//         setProfilePicture(cached);
//       }
//     })();
//   }, [userId]);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Fetch favorite brands
//   // ─────────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(
//           `${API_BASE_URL}/style-profile/${userId}/brands`,
//         );
//         const json = await res.json();
//         setFavoriteBrands(Array.isArray(json.brands) ? json.brands : []);
//       } catch {
//         setFavoriteBrands([]);
//       }
//     })();
//   }, [userId]);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Fetch saved looks
//   // ─────────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         setSavedLooks(data);
//       } catch {
//       } finally {
//         setLoadingSaved(false);
//       }
//     })();
//   }, [userId]);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Queries: profile, wardrobe, counts
//   // ─────────────────────────────────────────────────────────────────────────────
//   const {data: userProfileRaw} = useQuery<UserProfile>({
//     enabled: !!userId,
//     queryKey: ['userProfile', userId],
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/users/${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch user profile');
//       return res.json();
//     },
//   });

//   // Only hydrate picture from backend if we don't already have one locally
//   // useEffect(() => {
//   //   if (
//   //     userProfileRaw &&
//   //     !profilePicture &&
//   //     userProfileRaw.profile_picture &&
//   //     userProfileRaw.profile_picture.trim() !== ''
//   //   ) {
//   //     setProfilePicture(userProfileRaw.profile_picture);
//   //     if (userId) {
//   //       AsyncStorage.setItem(
//   //         STORAGE_KEY(userId),
//   //         userProfileRaw.profile_picture,
//   //       ).catch(() => {});
//   //     }
//   //   }
//   // }, [userProfileRaw, profilePicture, userId]);

//   // Replace this entire useEffect:
//   useEffect(() => {
//     if (
//       userProfileRaw &&
//       userProfileRaw.profile_picture &&
//       userProfileRaw.profile_picture.trim() !== ''
//     ) {
//       console.log(
//         '[PROFILE] Using backend profile picture:',
//         userProfileRaw.profile_picture,
//       );
//       setProfilePicture(userProfileRaw.profile_picture);
//       if (userId) {
//         AsyncStorage.setItem(
//           STORAGE_KEY(userId),
//           userProfileRaw.profile_picture,
//         ).catch(() => {});
//       }
//     }
//   }, [userProfileRaw, userId]);

//   // IMPORTANT: Don't construct a UserProfile when data is still undefined,
//   // or TS will complain about missing required fields.
//   const userProfile = userProfileRaw
//     ? {
//         ...userProfileRaw,
//         // never assign null; use undefined or a string
//         profile_picture:
//           profilePicture || userProfileRaw.profile_picture || undefined,
//       }
//     : undefined;

//   const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
//     queryKey: ['wardrobe', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
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
//       const data = await res.json();
//       return data.count;
//     },
//   });

//   const {data: totalCustomOutfits = 0} = useQuery({
//     queryKey: ['totalCustomOutfits', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/custom-outfits/count/${userId}`);
//       const data = await res.json();
//       return data.count;
//     },
//   });

//   const totalItems = wardrobe.length;

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Initials fallback logic
//   // ─────────────────────────────────────────────────────────────────────────────
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

//   // cache-busted URI so the newest image shows immediately
//   const profileUri =
//     profilePicture && profilePicture.length > 0
//       ? `${profilePicture}${
//           profilePicture.includes('?') ? '&' : '?'
//         }v=${Date.now()}`
//       : '';

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Styles
//   // ─────────────────────────────────────────────────────────────────────────────
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
//       width: 92,
//       height: 92,
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
//   });

//   return (
//     <ScrollView style={[styles.screen, globalStyles.container]}>
//       <Text style={globalStyles.header}>Profile</Text>

//       {/* Settings Icon */}
//       <AppleTouchFeedback
//         style={styles.settingsButton}
//         onPress={() => navigate('Settings')}
//         hapticStyle="selection">
//         <Animatable.View
//           animation="rotate"
//           iterationCount="infinite"
//           duration={16000}>
//           <Icon name="settings" size={24} color={theme.colors.button1} />
//         </Animatable.View>
//       </AppleTouchFeedback>

//       {/* Header Row */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={300}
//         style={globalStyles.section}>
//         <View style={styles.headerRow}>
//           {/* Avatar */}
//           <Animatable.View
//             animation="pulse"
//             iterationCount="infinite"
//             duration={5000}
//             style={styles.avatarWrapper}>
//             <View style={styles.avatarBorder}>
//               {profilePicture ? (
//                 <Image source={{uri: profileUri}} style={styles.avatar} />
//               ) : (
//                 <View style={styles.avatar}>
//                   <Text style={styles.initialsText}>{initials}</Text>
//                 </View>
//               )}
//             </View>
//           </Animatable.View>

//           {/* Stats */}
//           <Animatable.View
//             animation="fadeIn"
//             delay={500}
//             style={styles.statsRow}>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={600}
//                 style={styles.statNumber}>
//                 {totalItems}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Wardrobe Items</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={800}
//                 style={styles.statNumber}>
//                 {totalCustomOutfits}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Outfits</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={1000}
//                 style={styles.statNumber}>
//                 {totalFavorites}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Favorites</Text>
//             </View>
//           </Animatable.View>
//         </View>

//         {/* Bio Section */}
//         <Animatable.View
//           animation="fadeInUp"
//           delay={1200}
//           style={styles.bioContainer}>
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
//         </Animatable.View>
//       </Animatable.View>

//       {/* Style Profile CTA */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={1400}
//         style={globalStyles.section}>
//         <Text style={globalStyles.sectionTitle}>Style Profile</Text>
//         <View style={{alignItems: 'center'}}>
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
//                 marginTop: 4,
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
//       </Animatable.View>

//       {/* Style Tags */}
//       <Animatable.View
//         animation="fadeInLeft"
//         delay={1600}
//         style={globalStyles.sectionScroll}>
//         <Text style={globalStyles.sectionTitle}>Style Tags</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingRight: 8}}>
//           {styleTags.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved styles.
//               </Text>
//               <TooltipBubble
//                 message='No styles added yet. Tap the "Edit Style Profile" button above and head over there to add your favorite styles.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             styleTags.map((tag, index) => (
//               <Animatable.View
//                 key={tag}
//                 animation="bounceInRight"
//                 delay={1700 + index * 80}
//                 useNativeDriver
//                 style={[
//                   globalStyles.pill,
//                   {backgroundColor: theme.colors.error},
//                 ]}>
//                 <Text style={globalStyles.pillText}>#{tag}</Text>
//               </Animatable.View>
//             ))
//           )}
//         </ScrollView>
//       </Animatable.View>

//       {/* Favorite Brands */}
//       <Animatable.View
//         animation="fadeInRight"
//         delay={1900}
//         style={globalStyles.sectionScroll}>
//         <Text style={[globalStyles.sectionTitle]}>Saved Brand Tags</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingRight: 8}}>
//           {favoriteBrands.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved brands.
//               </Text>
//               <TooltipBubble
//                 message='No brands added yet. Tap the "Edit Style Profile" button above and head over there to add your favorite brands.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             favoriteBrands.map((brand, index) => (
//               <Animatable.View
//                 key={brand}
//                 animation="bounceInLeft"
//                 delay={2000 + index * 90}
//                 useNativeDriver
//                 style={[
//                   globalStyles.pill,
//                   {backgroundColor: theme.colors.error},
//                 ]}>
//                 <Text style={globalStyles.pillText}>#{brand}</Text>
//               </Animatable.View>
//             ))
//           )}
//         </ScrollView>
//       </Animatable.View>

//       {/* Saved Looks */}
//       <Animatable.View
//         animation="fadeInUpBig"
//         delay={2200}
//         style={globalStyles.sectionScroll}>
//         <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//         {savedLooks.length === 0 ? (
//           <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//             <Text style={globalStyles.missingDataMessage1}>
//               No saved looks.
//             </Text>
//             <TooltipBubble
//               message='You haven’t saved any looks yet. Tap "Home" in the bottom navigation bar and then tap "Add Look" to add your favorite looks.'
//               position="top"
//             />
//           </View>
//         ) : (
//           <ScrollView
//             horizontal
//             showsHorizontalScrollIndicator={false}
//             contentContainerStyle={{paddingRight: 8}}>
//             {savedLooks.map((look, index) => (
//               <Animatable.View
//                 key={look.id}
//                 animation="zoomInUp"
//                 delay={2300 + index * 120}
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
//                   <Animatable.Text
//                     animation="fadeIn"
//                     delay={2500 + index * 100}
//                     style={[globalStyles.label, {marginTop: 6}]}
//                     numberOfLines={1}>
//                     {look.name}
//                   </Animatable.Text>
//                 </AppleTouchFeedback>
//               </Animatable.View>
//             ))}
//           </ScrollView>
//         )}
//       </Animatable.View>

//       {/* Footer */}
//       <Animatable.View
//         animation="fadeIn"
//         delay={2800}
//         style={[globalStyles.section, {paddingTop: 8}]}>
//         <AppleTouchFeedback
//           hapticStyle="impactLight"
//           onPress={() => navigate('ContactScreen')}>
//           <Animatable.Text
//             animation="pulse"
//             iterationCount="infinite"
//             duration={5000}
//             style={{
//               textAlign: 'center',
//               color: theme.colors.foreground,
//               fontSize: 13,
//               paddingVertical: 8,
//             }}>
//             Contact Support
//           </Animatable.Text>
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           hapticStyle="impactLight"
//           onPress={() => navigate('AboutScreen')}>
//           <Animatable.Text
//             animation="fadeInUp"
//             delay={3000}
//             style={{
//               textAlign: 'center',
//               color: theme.colors.foreground,
//               fontSize: 12,
//               opacity: 0.8,
//               paddingBottom: 16,
//             }}>
//             About StylHelpr
//           </Animatable.Text>
//         </AppleTouchFeedback>
//       </Animatable.View>

//       <SavedLookPreviewModal
//         visible={previewVisible}
//         look={selectedLook}
//         onClose={() => setPreviewVisible(false)}
//       />
//     </ScrollView>
//   );
// }

//////////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   Dimensions,
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
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const screenWidth = Dimensions.get('window').width;
// const STORAGE_KEY = (uid: string) => `profile_picture:${uid}`;

// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   favorite?: boolean;
// };

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
//   const styleTags = styleProfile?.style_preferences || [];

//   const [favoriteBrands, setFavoriteBrands] = useState<string[]>([]);
//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   const [loadingSaved, setLoadingSaved] = useState(true);
//   const [previewVisible, setPreviewVisible] = useState(false);
//   const [selectedLook, setSelectedLook] = useState<any | null>(null);
//   const [profilePicture, setProfilePicture] = useState<string>(''); // keep as string only

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Hydrate cached profile picture early
//   // ─────────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       const cached = await AsyncStorage.getItem(STORAGE_KEY(userId));
//       if (cached) {
//         console.log('[PROFILE] Cached profile pic found:', cached);
//         setProfilePicture(cached);
//       }
//     })();
//   }, [userId]);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Fetch favorite brands
//   // ─────────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(
//           `${API_BASE_URL}/style-profile/${userId}/brands`,
//         );
//         const json = await res.json();
//         setFavoriteBrands(Array.isArray(json.brands) ? json.brands : []);
//       } catch {
//         setFavoriteBrands([]);
//       }
//     })();
//   }, [userId]);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Fetch saved looks
//   // ─────────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         setSavedLooks(data);
//       } catch {
//       } finally {
//         setLoadingSaved(false);
//       }
//     })();
//   }, [userId]);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Queries: profile, wardrobe, counts
//   // ─────────────────────────────────────────────────────────────────────────────
//   const {data: userProfileRaw} = useQuery<UserProfile>({
//     enabled: !!userId,
//     queryKey: ['userProfile', userId],
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/users/${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch user profile');
//       return res.json();
//     },
//   });

//   // Only hydrate picture from backend if we don't already have one locally
//   // useEffect(() => {
//   //   if (
//   //     userProfileRaw &&
//   //     !profilePicture &&
//   //     userProfileRaw.profile_picture &&
//   //     userProfileRaw.profile_picture.trim() !== ''
//   //   ) {
//   //     setProfilePicture(userProfileRaw.profile_picture);
//   //     if (userId) {
//   //       AsyncStorage.setItem(
//   //         STORAGE_KEY(userId),
//   //         userProfileRaw.profile_picture,
//   //       ).catch(() => {});
//   //     }
//   //   }
//   // }, [userProfileRaw, profilePicture, userId]);

//   // Replace this entire useEffect:
//   useEffect(() => {
//     if (
//       userProfileRaw &&
//       userProfileRaw.profile_picture &&
//       userProfileRaw.profile_picture.trim() !== ''
//     ) {
//       console.log(
//         '[PROFILE] Using backend profile picture:',
//         userProfileRaw.profile_picture,
//       );
//       setProfilePicture(userProfileRaw.profile_picture);
//       if (userId) {
//         AsyncStorage.setItem(
//           STORAGE_KEY(userId),
//           userProfileRaw.profile_picture,
//         ).catch(() => {});
//       }
//     }
//   }, [userProfileRaw, userId]);

//   // IMPORTANT: Don't construct a UserProfile when data is still undefined,
//   // or TS will complain about missing required fields.
//   const userProfile = userProfileRaw
//     ? {
//         ...userProfileRaw,
//         // never assign null; use undefined or a string
//         profile_picture:
//           profilePicture || userProfileRaw.profile_picture || undefined,
//       }
//     : undefined;

//   const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
//     queryKey: ['wardrobe', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
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
//       const data = await res.json();
//       return data.count;
//     },
//   });

//   const {data: totalCustomOutfits = 0} = useQuery({
//     queryKey: ['totalCustomOutfits', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/custom-outfits/count/${userId}`);
//       const data = await res.json();
//       return data.count;
//     },
//   });

//   const totalItems = wardrobe.length;

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Initials fallback logic
//   // ─────────────────────────────────────────────────────────────────────────────
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

//   // cache-busted URI so the newest image shows immediately
//   const profileUri =
//     profilePicture && profilePicture.length > 0
//       ? `${profilePicture}${
//           profilePicture.includes('?') ? '&' : '?'
//         }v=${Date.now()}`
//       : '';

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Styles
//   // ─────────────────────────────────────────────────────────────────────────────
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
//   });

//   return (
//     <ScrollView style={[styles.screen, globalStyles.container]}>
//       <Text style={globalStyles.header}>Profile</Text>

//       {/* Settings Icon */}
//       <AppleTouchFeedback
//         style={styles.settingsButton}
//         onPress={() => navigate('Settings')}
//         hapticStyle="selection">
//         <Animatable.View
//           animation="rotate"
//           iterationCount="infinite"
//           duration={16000}>
//           <Icon name="settings" size={24} color={theme.colors.button1} />
//         </Animatable.View>
//       </AppleTouchFeedback>

//       {/* Header Row */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={300}
//         style={globalStyles.section}>
//         <View style={styles.headerRow}>
//           {/* Avatar */}
//           <Animatable.View
//             animation="pulse"
//             iterationCount="infinite"
//             duration={5000}
//             style={styles.avatarWrapper}>
//             <View style={styles.avatarBorder}>
//               {profilePicture ? (
//                 <Image source={{uri: profileUri}} style={styles.avatar} />
//               ) : (
//                 <View style={styles.avatar}>
//                   <Text style={styles.initialsText}>{initials}</Text>
//                 </View>
//               )}
//             </View>
//           </Animatable.View>

//           {/* Stats */}
//           <Animatable.View
//             animation="fadeIn"
//             delay={500}
//             style={styles.statsRow}>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={600}
//                 style={styles.statNumber}>
//                 {totalItems}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Wardrobe Items</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={800}
//                 style={styles.statNumber}>
//                 {totalCustomOutfits}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Outfits</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={1000}
//                 style={styles.statNumber}>
//                 {totalFavorites}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Favorites</Text>
//             </View>
//           </Animatable.View>
//         </View>

//         {/* Bio Section */}
//         <Animatable.View
//           animation="fadeInUp"
//           delay={1200}
//           style={styles.bioContainer}>
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
//         </Animatable.View>
//       </Animatable.View>

//       {/* Style Profile CTA */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={1400}
//         style={globalStyles.section}>
//         <Text style={globalStyles.sectionTitle}>Style Profile</Text>
//         <View style={{alignItems: 'center'}}>
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
//                 marginTop: 4,
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
//       </Animatable.View>

//       {/* Style Tags */}
//       <Animatable.View
//         animation="fadeInLeft"
//         delay={1600}
//         style={globalStyles.sectionScroll}>
//         <Text style={globalStyles.sectionTitle}>Style Tags</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingRight: 8}}>
//           {styleTags.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved styles.
//               </Text>
//               <TooltipBubble
//                 message='No styles added yet. Tap the "Edit Style Profile" button above and head over there to add your favorite styles.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             styleTags.map((tag, index) => (
//               <Animatable.View
//                 key={tag}
//                 animation="bounceInRight"
//                 delay={1700 + index * 80}
//                 useNativeDriver
//                 style={globalStyles.pill}>
//                 <Text style={globalStyles.pillText}>#{tag}</Text>
//               </Animatable.View>
//             ))
//           )}
//         </ScrollView>
//       </Animatable.View>

//       {/* Favorite Brands */}
//       <Animatable.View
//         animation="fadeInRight"
//         delay={1900}
//         style={globalStyles.sectionScroll}>
//         <Text style={[globalStyles.sectionTitle]}>Saved Brand Tags</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingRight: 8}}>
//           {favoriteBrands.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved brands.
//               </Text>
//               <TooltipBubble
//                 message='No brands added yet. Tap the "Edit Style Profile" button above and head over there to add your favorite brands.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             favoriteBrands.map((brand, index) => (
//               <Animatable.View
//                 key={brand}
//                 animation="bounceInLeft"
//                 delay={2000 + index * 90}
//                 useNativeDriver
//                 style={globalStyles.pill}>
//                 <Text style={globalStyles.pillText}>#{brand}</Text>
//               </Animatable.View>
//             ))
//           )}
//         </ScrollView>
//       </Animatable.View>

//       {/* Saved Looks */}
//       <Animatable.View
//         animation="fadeInUpBig"
//         delay={2200}
//         style={globalStyles.sectionScroll}>
//         <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//         {savedLooks.length === 0 ? (
//           <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//             <Text style={globalStyles.missingDataMessage1}>
//               No saved looks.
//             </Text>
//             <TooltipBubble
//               message='You haven’t saved any looks yet. Tap "Home" in the bottom navigation bar and then tap "Add Look" to add your favorite looks.'
//               position="top"
//             />
//           </View>
//         ) : (
//           <ScrollView
//             horizontal
//             showsHorizontalScrollIndicator={false}
//             contentContainerStyle={{paddingRight: 8}}>
//             {savedLooks.map((look, index) => (
//               <Animatable.View
//                 key={look.id}
//                 animation="zoomInUp"
//                 delay={2300 + index * 120}
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
//                   <Animatable.Text
//                     animation="fadeIn"
//                     delay={2500 + index * 100}
//                     style={[globalStyles.label, {marginTop: 6}]}
//                     numberOfLines={1}>
//                     {look.name}
//                   </Animatable.Text>
//                 </AppleTouchFeedback>
//               </Animatable.View>
//             ))}
//           </ScrollView>
//         )}
//       </Animatable.View>

//       {/* Footer */}
//       <Animatable.View
//         animation="fadeIn"
//         delay={2800}
//         style={[globalStyles.section, {paddingTop: 8}]}>
//         <AppleTouchFeedback
//           hapticStyle="impactLight"
//           onPress={() => navigate('ContactScreen')}>
//           <Animatable.Text
//             animation="pulse"
//             iterationCount="infinite"
//             duration={5000}
//             style={{
//               textAlign: 'center',
//               color: theme.colors.foreground,
//               fontSize: 13,
//               paddingVertical: 8,
//             }}>
//             Contact Support
//           </Animatable.Text>
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           hapticStyle="impactLight"
//           onPress={() => navigate('AboutScreen')}>
//           <Animatable.Text
//             animation="fadeInUp"
//             delay={3000}
//             style={{
//               textAlign: 'center',
//               color: theme.colors.foreground,
//               fontSize: 12,
//               opacity: 0.8,
//               paddingBottom: 16,
//             }}>
//             About StylHelpr
//           </Animatable.Text>
//         </AppleTouchFeedback>
//       </Animatable.View>

//       <SavedLookPreviewModal
//         visible={previewVisible}
//         look={selectedLook}
//         onClose={() => setPreviewVisible(false)}
//       />
//     </ScrollView>
//   );
// }

///////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   Dimensions,
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
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const screenWidth = Dimensions.get('window').width;
// const STORAGE_KEY = (uid: string) => `profile_picture:${uid}`;

// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   favorite?: boolean;
// };

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
//   const styleTags = styleProfile?.style_preferences || [];

//   const [favoriteBrands, setFavoriteBrands] = useState<string[]>([]);
//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   const [loadingSaved, setLoadingSaved] = useState(true);
//   const [previewVisible, setPreviewVisible] = useState(false);
//   const [selectedLook, setSelectedLook] = useState<any | null>(null);
//   const [profilePicture, setProfilePicture] = useState<string>(''); // keep as string only

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Hydrate cached profile picture early
//   // ─────────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       const cached = await AsyncStorage.getItem(STORAGE_KEY(userId));
//       if (cached) {
//         console.log('[PROFILE] Cached profile pic found:', cached);
//         setProfilePicture(cached);
//       }
//     })();
//   }, [userId]);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Fetch favorite brands
//   // ─────────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(
//           `${API_BASE_URL}/style-profile/${userId}/brands`,
//         );
//         const json = await res.json();
//         setFavoriteBrands(Array.isArray(json.brands) ? json.brands : []);
//       } catch {
//         setFavoriteBrands([]);
//       }
//     })();
//   }, [userId]);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Fetch saved looks
//   // ─────────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         setSavedLooks(data);
//       } catch {
//       } finally {
//         setLoadingSaved(false);
//       }
//     })();
//   }, [userId]);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Queries: profile, wardrobe, counts
//   // ─────────────────────────────────────────────────────────────────────────────
//   const {data: userProfileRaw} = useQuery<UserProfile>({
//     enabled: !!userId,
//     queryKey: ['userProfile', userId],
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/users/${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch user profile');
//       return res.json();
//     },
//   });

//   // Only hydrate picture from backend if we don't already have one locally
//   useEffect(() => {
//     if (
//       userProfileRaw &&
//       !profilePicture &&
//       userProfileRaw.profile_picture &&
//       userProfileRaw.profile_picture.trim() !== ''
//     ) {
//       setProfilePicture(userProfileRaw.profile_picture);
//       if (userId) {
//         AsyncStorage.setItem(
//           STORAGE_KEY(userId),
//           userProfileRaw.profile_picture,
//         ).catch(() => {});
//       }
//     }
//   }, [userProfileRaw, profilePicture, userId]);

//   // IMPORTANT: Don't construct a UserProfile when data is still undefined,
//   // or TS will complain about missing required fields.
//   const userProfile = userProfileRaw
//     ? {
//         ...userProfileRaw,
//         // never assign null; use undefined or a string
//         profile_picture:
//           profilePicture || userProfileRaw.profile_picture || undefined,
//       }
//     : undefined;

//   const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
//     queryKey: ['wardrobe', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
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
//       const data = await res.json();
//       return data.count;
//     },
//   });

//   const {data: totalCustomOutfits = 0} = useQuery({
//     queryKey: ['totalCustomOutfits', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/custom-outfits/count/${userId}`);
//       const data = await res.json();
//       return data.count;
//     },
//   });

//   const totalItems = wardrobe.length;

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Initials fallback logic
//   // ─────────────────────────────────────────────────────────────────────────────
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

//   // cache-busted URI so the newest image shows immediately
//   const profileUri =
//     profilePicture && profilePicture.length > 0
//       ? `${profilePicture}${
//           profilePicture.includes('?') ? '&' : '?'
//         }v=${Date.now()}`
//       : '';

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Styles
//   // ─────────────────────────────────────────────────────────────────────────────
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
//   });

//   return (
//     <ScrollView style={[styles.screen, globalStyles.container]}>
//       <Text style={globalStyles.header}>Profile</Text>

//       {/* Settings Icon */}
//       <AppleTouchFeedback
//         style={styles.settingsButton}
//         onPress={() => navigate('Settings')}
//         hapticStyle="selection">
//         <Animatable.View
//           animation="rotate"
//           iterationCount="infinite"
//           duration={16000}>
//           <Icon name="settings" size={24} color={theme.colors.button1} />
//         </Animatable.View>
//       </AppleTouchFeedback>

//       {/* Header Row */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={300}
//         style={globalStyles.section}>
//         <View style={styles.headerRow}>
//           {/* Avatar */}
//           <Animatable.View
//             animation="pulse"
//             iterationCount="infinite"
//             duration={5000}
//             style={styles.avatarWrapper}>
//             <View style={styles.avatarBorder}>
//               {profilePicture ? (
//                 <Image source={{uri: profileUri}} style={styles.avatar} />
//               ) : (
//                 <View style={styles.avatar}>
//                   <Text style={styles.initialsText}>{initials}</Text>
//                 </View>
//               )}
//             </View>
//           </Animatable.View>

//           {/* Stats */}
//           <Animatable.View
//             animation="fadeIn"
//             delay={500}
//             style={styles.statsRow}>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={600}
//                 style={styles.statNumber}>
//                 {totalItems}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Wardrobe Items</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={800}
//                 style={styles.statNumber}>
//                 {totalCustomOutfits}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Outfits</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={1000}
//                 style={styles.statNumber}>
//                 {totalFavorites}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Favorites</Text>
//             </View>
//           </Animatable.View>
//         </View>

//         {/* Bio Section */}
//         <Animatable.View
//           animation="fadeInUp"
//           delay={1200}
//           style={styles.bioContainer}>
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
//         </Animatable.View>
//       </Animatable.View>

//       {/* Style Profile CTA */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={1400}
//         style={globalStyles.section}>
//         <Text style={globalStyles.sectionTitle}>Style Profile</Text>
//         <View style={{alignItems: 'center'}}>
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
//                 marginTop: 4,
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
//       </Animatable.View>

//       {/* Style Tags */}
//       <Animatable.View
//         animation="fadeInLeft"
//         delay={1600}
//         style={globalStyles.sectionScroll}>
//         <Text style={globalStyles.sectionTitle}>Style Tags</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingRight: 8}}>
//           {styleTags.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved styles.
//               </Text>
//               <TooltipBubble
//                 message='No styles added yet. Tap the "Edit Style Profile" button above and head over there to add your favorite styles.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             styleTags.map((tag, index) => (
//               <Animatable.View
//                 key={tag}
//                 animation="bounceInRight"
//                 delay={1700 + index * 80}
//                 useNativeDriver
//                 style={globalStyles.pill}>
//                 <Text style={globalStyles.pillText}>#{tag}</Text>
//               </Animatable.View>
//             ))
//           )}
//         </ScrollView>
//       </Animatable.View>

//       {/* Favorite Brands */}
//       <Animatable.View
//         animation="fadeInRight"
//         delay={1900}
//         style={globalStyles.sectionScroll}>
//         <Text style={[globalStyles.sectionTitle]}>Saved Brand Tags</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingRight: 8}}>
//           {favoriteBrands.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved brands.
//               </Text>
//               <TooltipBubble
//                 message='No brands added yet. Tap the "Edit Style Profile" button above and head over there to add your favorite brands.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             favoriteBrands.map((brand, index) => (
//               <Animatable.View
//                 key={brand}
//                 animation="bounceInLeft"
//                 delay={2000 + index * 90}
//                 useNativeDriver
//                 style={globalStyles.pill}>
//                 <Text style={globalStyles.pillText}>#{brand}</Text>
//               </Animatable.View>
//             ))
//           )}
//         </ScrollView>
//       </Animatable.View>

//       {/* Saved Looks */}
//       <Animatable.View
//         animation="fadeInUpBig"
//         delay={2200}
//         style={globalStyles.sectionScroll}>
//         <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//         {savedLooks.length === 0 ? (
//           <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//             <Text style={globalStyles.missingDataMessage1}>
//               No saved looks.
//             </Text>
//             <TooltipBubble
//               message='You haven’t saved any looks yet. Tap "Home" in the bottom navigation bar and then tap "Add Look" to add your favorite looks.'
//               position="top"
//             />
//           </View>
//         ) : (
//           <ScrollView
//             horizontal
//             showsHorizontalScrollIndicator={false}
//             contentContainerStyle={{paddingRight: 8}}>
//             {savedLooks.map((look, index) => (
//               <Animatable.View
//                 key={look.id}
//                 animation="zoomInUp"
//                 delay={2300 + index * 120}
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
//                   <Animatable.Text
//                     animation="fadeIn"
//                     delay={2500 + index * 100}
//                     style={[globalStyles.label, {marginTop: 6}]}
//                     numberOfLines={1}>
//                     {look.name}
//                   </Animatable.Text>
//                 </AppleTouchFeedback>
//               </Animatable.View>
//             ))}
//           </ScrollView>
//         )}
//       </Animatable.View>

//       {/* Footer */}
//       <Animatable.View
//         animation="fadeIn"
//         delay={2800}
//         style={[globalStyles.section, {paddingTop: 8}]}>
//         <AppleTouchFeedback
//           hapticStyle="impactLight"
//           onPress={() => navigate('ContactScreen')}>
//           <Animatable.Text
//             animation="pulse"
//             iterationCount="infinite"
//             duration={5000}
//             style={{
//               textAlign: 'center',
//               color: theme.colors.foreground,
//               fontSize: 13,
//               paddingVertical: 8,
//             }}>
//             Contact Support
//           </Animatable.Text>
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           hapticStyle="impactLight"
//           onPress={() => navigate('AboutScreen')}>
//           <Animatable.Text
//             animation="fadeInUp"
//             delay={3000}
//             style={{
//               textAlign: 'center',
//               color: theme.colors.foreground,
//               fontSize: 12,
//               opacity: 0.8,
//               paddingBottom: 16,
//             }}>
//             About StylHelpr
//           </Animatable.Text>
//         </AppleTouchFeedback>
//       </Animatable.View>

//       <SavedLookPreviewModal
//         visible={previewVisible}
//         look={selectedLook}
//         onClose={() => setPreviewVisible(false)}
//       />
//     </ScrollView>
//   );
// }

//////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   Dimensions,
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
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const screenWidth = Dimensions.get('window').width;
// const STORAGE_KEY = (uid: string) => `profile_picture:${uid}`;

// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   favorite?: boolean;
// };

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
//   const styleTags = styleProfile?.style_preferences || [];

//   const [favoriteBrands, setFavoriteBrands] = useState<string[]>([]);
//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   const [loadingSaved, setLoadingSaved] = useState(true);
//   const [previewVisible, setPreviewVisible] = useState(false);
//   const [selectedLook, setSelectedLook] = useState<any | null>(null);
//   const [profilePicture, setProfilePicture] = useState<string>('');

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Hydrate cached profile picture early
//   // ─────────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       const cached = await AsyncStorage.getItem(STORAGE_KEY(userId));
//       if (cached) {
//         console.log('[PROFILE] Cached profile pic found:', cached);
//         setProfilePicture(cached);
//       }
//     })();
//   }, [userId]);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Fetch favorite brands
//   // ─────────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(
//           `${API_BASE_URL}/style-profile/${userId}/brands`,
//         );
//         const json = await res.json();
//         setFavoriteBrands(Array.isArray(json.brands) ? json.brands : []);
//       } catch {
//         setFavoriteBrands([]);
//       }
//     })();
//   }, [userId]);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Fetch saved looks
//   // ─────────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         setSavedLooks(data);
//       } catch {
//       } finally {
//         setLoadingSaved(false);
//       }
//     })();
//   }, [userId]);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Queries: profile, wardrobe, outfits, counts
//   // ─────────────────────────────────────────────────────────────────────────────
//   const {data: userProfileRaw} = useQuery<UserProfile>({
//     enabled: !!userId,
//     queryKey: ['userProfile', userId],
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/users/${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch user profile');
//       return res.json();
//     },
//   });

//   // ✅ Hydrate profile picture from backend ONLY if not already set
//   useEffect(() => {
//     if (
//       userProfileRaw &&
//       !profilePicture &&
//       userProfileRaw.profile_picture &&
//       userProfileRaw.profile_picture.trim() !== ''
//     ) {
//       setProfilePicture(userProfileRaw.profile_picture);
//       AsyncStorage.setItem(STORAGE_KEY(userId), userProfileRaw.profile_picture);
//     }
//   }, [userProfileRaw, profilePicture, userId]);

//   const userProfile: UserProfile = {
//     ...userProfileRaw,
//     profile_picture: profilePicture || userProfileRaw?.profile_picture || null,
//   };

//   const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
//     queryKey: ['wardrobe', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
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
//       const data = await res.json();
//       return data.count;
//     },
//   });

//   const {data: totalCustomOutfits = 0} = useQuery({
//     queryKey: ['totalCustomOutfits', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/custom-outfits/count/${userId}`);
//       const data = await res.json();
//       return data.count;
//     },
//   });

//   const totalItems = wardrobe.length;

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Initials fallback logic
//   // ─────────────────────────────────────────────────────────────────────────────
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

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Styles
//   // ─────────────────────────────────────────────────────────────────────────────
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
//   });

//   return (
//     <ScrollView style={[styles.screen, globalStyles.container]}>
//       <Text style={globalStyles.header}>Profile</Text>

//       {/* Settings Icon */}
//       <AppleTouchFeedback
//         style={styles.settingsButton}
//         onPress={() => navigate('Settings')}
//         hapticStyle="selection">
//         <Animatable.View
//           animation="rotate"
//           iterationCount="infinite"
//           duration={16000}>
//           <Icon name="settings" size={24} color={theme.colors.button1} />
//         </Animatable.View>
//       </AppleTouchFeedback>

//       {/* Header Row */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={300}
//         style={globalStyles.section}>
//         <View style={styles.headerRow}>
//           {/* Avatar */}
//           <Animatable.View
//             animation="pulse"
//             iterationCount="infinite"
//             duration={5000}
//             style={styles.avatarWrapper}>
//             <View style={styles.avatarBorder}>
//               {profilePicture ? (
//                 <Image source={{uri: profilePicture}} style={styles.avatar} />
//               ) : (
//                 <View style={styles.avatar}>
//                   <Text style={styles.initialsText}>{initials}</Text>
//                 </View>
//               )}
//             </View>
//           </Animatable.View>

//           {/* Stats */}
//           <Animatable.View
//             animation="fadeIn"
//             delay={500}
//             style={styles.statsRow}>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={600}
//                 style={styles.statNumber}>
//                 {totalItems}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Wardrobe Items</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={800}
//                 style={styles.statNumber}>
//                 {totalCustomOutfits}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Outfits</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={1000}
//                 style={styles.statNumber}>
//                 {totalFavorites}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Favorites</Text>
//             </View>
//           </Animatable.View>
//         </View>

//         {/* Bio Section */}
//         <Animatable.View
//           animation="fadeInUp"
//           delay={1200}
//           style={styles.bioContainer}>
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
//         </Animatable.View>
//       </Animatable.View>

//       {/* Style Profile CTA */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={1400}
//         style={globalStyles.section}>
//         <Text style={globalStyles.sectionTitle}>Style Profile</Text>
//         <View style={{alignItems: 'center'}}>
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
//                 marginTop: 4,
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
//       </Animatable.View>

//       {/* Style Tags */}
//       <Animatable.View
//         animation="fadeInLeft"
//         delay={1600}
//         style={globalStyles.sectionScroll}>
//         <Text style={globalStyles.sectionTitle}>Style Tags</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingRight: 8}}>
//           {styleTags.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved styles.
//               </Text>
//               <TooltipBubble
//                 message='No styles added yet. Tap the "Edit Style Profile" button above and head over there to add your favorite styles.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             styleTags.map((tag, index) => (
//               <Animatable.View
//                 key={tag}
//                 animation="bounceInRight"
//                 delay={1700 + index * 80}
//                 useNativeDriver
//                 style={globalStyles.pill}>
//                 <Text style={globalStyles.pillText}>#{tag}</Text>
//               </Animatable.View>
//             ))
//           )}
//         </ScrollView>
//       </Animatable.View>

//       {/* Favorite Brands */}
//       <Animatable.View
//         animation="fadeInRight"
//         delay={1900}
//         style={globalStyles.sectionScroll}>
//         <Text style={[globalStyles.sectionTitle]}>Saved Brand Tags</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingRight: 8}}>
//           {favoriteBrands.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved brands.
//               </Text>
//               <TooltipBubble
//                 message='No brands added yet. Tap the "Edit Style Profile" button above and head over there to add your favorite brands.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             favoriteBrands.map((brand, index) => (
//               <Animatable.View
//                 key={brand}
//                 animation="bounceInLeft"
//                 delay={2000 + index * 90}
//                 useNativeDriver
//                 style={globalStyles.pill}>
//                 <Text style={globalStyles.pillText}>#{brand}</Text>
//               </Animatable.View>
//             ))
//           )}
//         </ScrollView>
//       </Animatable.View>

//       {/* Saved Looks */}
//       <Animatable.View
//         animation="fadeInUpBig"
//         delay={2200}
//         style={globalStyles.sectionScroll}>
//         <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//         {savedLooks.length === 0 ? (
//           <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//             <Text style={globalStyles.missingDataMessage1}>
//               No saved looks.
//             </Text>
//             <TooltipBubble
//               message='You haven’t saved any looks yet. Tap "Home" in the bottom navigation bar and then tap "Add Look" to add your favorite looks.'
//               position="top"
//             />
//           </View>
//         ) : (
//           <ScrollView
//             horizontal
//             showsHorizontalScrollIndicator={false}
//             contentContainerStyle={{paddingRight: 8}}>
//             {savedLooks.map((look, index) => (
//               <Animatable.View
//                 key={look.id}
//                 animation="zoomInUp"
//                 delay={2300 + index * 120}
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
//                   <Animatable.Text
//                     animation="fadeIn"
//                     delay={2500 + index * 100}
//                     style={[globalStyles.label, {marginTop: 6}]}
//                     numberOfLines={1}>
//                     {look.name}
//                   </Animatable.Text>
//                 </AppleTouchFeedback>
//               </Animatable.View>
//             ))}
//           </ScrollView>
//         )}
//       </Animatable.View>

//       {/* Footer */}
//       <Animatable.View
//         animation="fadeIn"
//         delay={2800}
//         style={[globalStyles.section, {paddingTop: 8}]}>
//         <AppleTouchFeedback
//           hapticStyle="impactLight"
//           onPress={() => navigate('ContactScreen')}>
//           <Animatable.Text
//             animation="pulse"
//             iterationCount="infinite"
//             duration={5000}
//             style={{
//               textAlign: 'center',
//               color: theme.colors.foreground,
//               fontSize: 13,
//               paddingVertical: 8,
//             }}>
//             Contact Support
//           </Animatable.Text>
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           hapticStyle="impactLight"
//           onPress={() => navigate('AboutScreen')}>
//           <Animatable.Text
//             animation="fadeInUp"
//             delay={3000}
//             style={{
//               textAlign: 'center',
//               color: theme.colors.foreground,
//               fontSize: 12,
//               opacity: 0.8,
//               paddingBottom: 16,
//             }}>
//             About StylHelpr
//           </Animatable.Text>
//         </AppleTouchFeedback>
//       </Animatable.View>

//       <SavedLookPreviewModal
//         visible={previewVisible}
//         look={selectedLook}
//         onClose={() => setPreviewVisible(false)}
//       />
//     </ScrollView>
//   );
// }

//////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   Dimensions,
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
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const screenWidth = Dimensions.get('window').width;
// const STORAGE_KEY = (uid: string) => `profile_picture:${uid}`;

// type WardrobeItem = {
//   id: string;
//   image_url: string;
//   name: string;
//   favorite?: boolean;
// };

// type SavedOutfit = any;

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
//   const styleTags = styleProfile?.style_preferences || [];

//   const [favoriteBrands, setFavoriteBrands] = useState<string[]>([]);
//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   const [loadingSaved, setLoadingSaved] = useState(true);
//   const [previewVisible, setPreviewVisible] = useState(false);
//   const [selectedLook, setSelectedLook] = useState<any | null>(null);
//   const [profilePicture, setProfilePicture] = useState<string | null>(null);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Hydrate cached profile picture early
//   // ─────────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       const cached = await AsyncStorage.getItem(STORAGE_KEY(userId));
//       if (cached) {
//         console.log('[PROFILE] Cached profile pic found:', cached);
//         setProfilePicture(cached);
//       }
//     })();
//   }, [userId]);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Fetch favorite brands
//   // ─────────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(
//           `${API_BASE_URL}/style-profile/${userId}/brands`,
//         );
//         const json = await res.json();
//         setFavoriteBrands(Array.isArray(json.brands) ? json.brands : []);
//       } catch {
//         setFavoriteBrands([]);
//       }
//     })();
//   }, [userId]);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Fetch saved looks
//   // ─────────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         const res = await fetch(`${API_BASE_URL}/saved-looks/${userId}`);
//         if (!res.ok) throw new Error('Failed to fetch saved looks');
//         const data = await res.json();
//         setSavedLooks(data);
//       } catch {
//       } finally {
//         setLoadingSaved(false);
//       }
//     })();
//   }, [userId]);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Queries: profile, wardrobe, outfits, counts
//   // ─────────────────────────────────────────────────────────────────────────────
//   const {data: userProfileRaw} = useQuery<UserProfile>({
//     enabled: !!userId,
//     queryKey: ['userProfile', userId],
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/users/${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch user profile');
//       return res.json();
//     },
//     onSuccess: async data => {
//       // ✅ Only update picture if backend has a valid one
//       if (data?.profile_picture && data.profile_picture.trim() !== '') {
//         setProfilePicture(data.profile_picture);
//         await AsyncStorage.setItem(STORAGE_KEY(userId), data.profile_picture);
//       } else {
//         console.log(
//           '[PROFILE] Server returned no profile picture — keeping cached version',
//         );
//       }
//     },
//   });

//   const userProfile: UserProfile = {
//     ...userProfileRaw,
//     profile_picture: profilePicture || userProfileRaw?.profile_picture || null,
//   };

//   const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
//     queryKey: ['wardrobe', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe');
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
//       const data = await res.json();
//       return data.count;
//     },
//   });

//   const {data: totalCustomOutfits = 0} = useQuery({
//     queryKey: ['totalCustomOutfits', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/custom-outfits/count/${userId}`);
//       const data = await res.json();
//       return data.count;
//     },
//   });

//   const totalItems = wardrobe.length;

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Initials fallback logic
//   // ─────────────────────────────────────────────────────────────────────────────
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

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Styles
//   // ─────────────────────────────────────────────────────────────────────────────
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
//   });

//   return (
//     <ScrollView style={[styles.screen, globalStyles.container]}>
//       <Text style={globalStyles.header}>Profile</Text>

//       {/* Settings Icon */}
//       <AppleTouchFeedback
//         style={styles.settingsButton}
//         onPress={() => navigate('Settings')}
//         hapticStyle="selection">
//         <Animatable.View
//           animation="rotate"
//           iterationCount="infinite"
//           duration={16000}>
//           <Icon name="settings" size={24} color={theme.colors.button1} />
//         </Animatable.View>
//       </AppleTouchFeedback>

//       {/* Header Row */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={300}
//         style={globalStyles.section}>
//         <View style={styles.headerRow}>
//           {/* Avatar */}
//           <Animatable.View
//             animation="pulse"
//             iterationCount="infinite"
//             duration={5000}
//             style={styles.avatarWrapper}>
//             <View style={styles.avatarBorder}>
//               {profilePicture ? (
//                 <Image source={{uri: profilePicture}} style={styles.avatar} />
//               ) : (
//                 <View style={styles.avatar}>
//                   <Text style={styles.initialsText}>{initials}</Text>
//                 </View>
//               )}
//             </View>
//           </Animatable.View>

//           {/* Stats */}
//           <Animatable.View
//             animation="fadeIn"
//             delay={500}
//             style={styles.statsRow}>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={600}
//                 style={styles.statNumber}>
//                 {totalItems}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Wardrobe Items</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={800}
//                 style={styles.statNumber}>
//                 {totalCustomOutfits}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Outfits</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={1000}
//                 style={styles.statNumber}>
//                 {totalFavorites}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Favorites</Text>
//             </View>
//           </Animatable.View>
//         </View>

//         {/* Bio Section */}
//         <Animatable.View
//           animation="fadeInUp"
//           delay={1200}
//           style={styles.bioContainer}>
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
//         </Animatable.View>
//       </Animatable.View>

//       {/* Style Profile CTA */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={1400}
//         style={globalStyles.section}>
//         <Text style={globalStyles.sectionTitle}>Style Profile</Text>
//         <View style={{alignItems: 'center'}}>
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
//                 marginTop: 4,
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
//       </Animatable.View>

//       {/* Style Tags */}
//       <Animatable.View
//         animation="fadeInLeft"
//         delay={1600}
//         style={globalStyles.sectionScroll}>
//         <Text style={globalStyles.sectionTitle}>Style Tags</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingRight: 8}}>
//           {styleTags.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved styles.
//               </Text>
//               <TooltipBubble
//                 message='No styles added yet. Tap the "Edit Style Profile" button above and head over there to add your favorite styles.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             styleTags.map((tag, index) => (
//               <Animatable.View
//                 key={tag}
//                 animation="bounceInRight"
//                 delay={1700 + index * 80}
//                 useNativeDriver
//                 style={globalStyles.pill}>
//                 <Text style={globalStyles.pillText}>#{tag}</Text>
//               </Animatable.View>
//             ))
//           )}
//         </ScrollView>
//       </Animatable.View>

//       {/* Favorite Brands */}
//       <Animatable.View
//         animation="fadeInRight"
//         delay={1900}
//         style={globalStyles.sectionScroll}>
//         <Text style={[globalStyles.sectionTitle]}>Saved Brand Tags</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingRight: 8}}>
//           {favoriteBrands.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved brands.
//               </Text>
//               <TooltipBubble
//                 message='No brands added yet. Tap the "Edit Style Profile" button above and head over there to add your favorite brands.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             favoriteBrands.map((brand, index) => (
//               <Animatable.View
//                 key={brand}
//                 animation="bounceInLeft"
//                 delay={2000 + index * 90}
//                 useNativeDriver
//                 style={globalStyles.pill}>
//                 <Text style={globalStyles.pillText}>#{brand}</Text>
//               </Animatable.View>
//             ))
//           )}
//         </ScrollView>
//       </Animatable.View>

//       {/* Saved Looks */}
//       <Animatable.View
//         animation="fadeInUpBig"
//         delay={2200}
//         style={globalStyles.sectionScroll}>
//         <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//         {savedLooks.length === 0 ? (
//           <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//             <Text style={globalStyles.missingDataMessage1}>
//               No saved looks.
//             </Text>
//             <TooltipBubble
//               message='You haven’t saved any looks yet. Tap "Home" in the bottom navigation bar and then tap "Add Look" to add your favorite looks.'
//               position="top"
//             />
//           </View>
//         ) : (
//           <ScrollView
//             horizontal
//             showsHorizontalScrollIndicator={false}
//             contentContainerStyle={{paddingRight: 8}}>
//             {savedLooks.map((look, index) => (
//               <Animatable.View
//                 key={look.id}
//                 animation="zoomInUp"
//                 delay={2300 + index * 120}
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
//                   <Animatable.Text
//                     animation="fadeIn"
//                     delay={2500 + index * 100}
//                     style={[globalStyles.label, {marginTop: 6}]}
//                     numberOfLines={1}>
//                     {look.name}
//                   </Animatable.Text>
//                 </AppleTouchFeedback>
//               </Animatable.View>
//             ))}
//           </ScrollView>
//         )}
//       </Animatable.View>

//       {/* Footer */}
//       <Animatable.View
//         animation="fadeIn"
//         delay={2800}
//         style={[globalStyles.section, {paddingTop: 8}]}>
//         <AppleTouchFeedback
//           hapticStyle="impactLight"
//           onPress={() => navigate('ContactScreen')}>
//           <Animatable.Text
//             animation="pulse"
//             iterationCount="infinite"
//             duration={5000}
//             style={{
//               textAlign: 'center',
//               color: theme.colors.foreground,
//               fontSize: 13,
//               paddingVertical: 8,
//             }}>
//             Contact Support
//           </Animatable.Text>
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           hapticStyle="impactLight"
//           onPress={() => navigate('AboutScreen')}>
//           <Animatable.Text
//             animation="fadeInUp"
//             delay={3000}
//             style={{
//               textAlign: 'center',
//               color: theme.colors.foreground,
//               fontSize: 12,
//               opacity: 0.8,
//               paddingBottom: 16,
//             }}>
//             About StylHelpr
//           </Animatable.Text>
//         </AppleTouchFeedback>
//       </Animatable.View>

//       <SavedLookPreviewModal
//         visible={previewVisible}
//         look={selectedLook}
//         onClose={() => setPreviewVisible(false)}
//       />
//     </ScrollView>
//   );
// }

//////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   TouchableOpacity,
//   ActivityIndicator,
//   Dimensions,
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
// import SavedLookPreviewModal from '../components/SavedLookModal/SavedLookPreviewModal';
// import {TooltipBubble} from '../components/ToolTip/ToolTip1';

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
//   const styleTags = styleProfile?.style_preferences || [];

//   const [favoriteBrands, setFavoriteBrands] = useState<string[]>([]);
//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   const [loadingSaved, setLoadingSaved] = useState(true);
//   const [previewVisible, setPreviewVisible] = useState(false);
//   const [selectedLook, setSelectedLook] = useState<any | null>(null);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Fetch favorite brands from style_profile table
//   // ─────────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!userId) return;

//     (async () => {
//       try {
//         const res = await fetch(
//           `${API_BASE_URL}/style-profile/${userId}/brands`,
//         );
//         const json = await res.json();
//         console.log('👗 Preferred brands (ProfileScreen):', json);
//         setFavoriteBrands(Array.isArray(json.brands) ? json.brands : []);
//       } catch (err) {
//         console.error(
//           '❌ Failed to fetch preferred brands in ProfileScreen:',
//           err,
//         );
//         setFavoriteBrands([]);
//       }
//     })();
//   }, [userId]);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Fetch saved looks
//   // ─────────────────────────────────────────────────────────────────────────────
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

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Queries: profile, wardrobe, outfits, counts
//   // ─────────────────────────────────────────────────────────────────────────────
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

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Initials fallback logic
//   // ─────────────────────────────────────────────────────────────────────────────
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

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Styles
//   // ─────────────────────────────────────────────────────────────────────────────
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
//   });

//   return (
//     <ScrollView style={[styles.screen, globalStyles.container]}>
//       <Text style={globalStyles.header}>Profile</Text>

//       {/* Settings Icon */}
//       <AppleTouchFeedback
//         style={styles.settingsButton}
//         onPress={() => navigate('Settings')}
//         hapticStyle="selection">
//         <Animatable.View
//           animation="rotate"
//           iterationCount="infinite"
//           duration={16000}>
//           <Icon name="settings" size={24} color={theme.colors.button1} />
//         </Animatable.View>
//       </AppleTouchFeedback>

//       {/* Header Row */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={300}
//         style={globalStyles.section}>
//         <View style={styles.headerRow}>
//           {/* Avatar */}
//           <Animatable.View
//             animation="pulse"
//             iterationCount="infinite"
//             duration={5000}
//             style={styles.avatarWrapper}>
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
//           </Animatable.View>

//           {/* Stats */}
//           <Animatable.View
//             animation="fadeIn"
//             delay={500}
//             style={styles.statsRow}>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={600}
//                 style={styles.statNumber}>
//                 {totalItems}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Wardrobe Items</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={800}
//                 style={styles.statNumber}>
//                 {totalCustomOutfits}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Outfits</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={1000}
//                 style={styles.statNumber}>
//                 {totalFavorites}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Favorites</Text>
//             </View>
//           </Animatable.View>
//         </View>

//         {/* Bio Section */}
//         <Animatable.View
//           animation="fadeInUp"
//           delay={1200}
//           style={styles.bioContainer}>
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
//         </Animatable.View>
//       </Animatable.View>

//       {/* Style Profile CTA */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={1400}
//         style={globalStyles.section}>
//         <Text style={globalStyles.sectionTitle}>Style Profile</Text>
//         <View style={{alignItems: 'center'}}>
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
//                 marginTop: 4,
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
//       </Animatable.View>

//       {/* Style Tags */}
//       <Animatable.View
//         animation="fadeInLeft"
//         delay={1600}
//         style={globalStyles.sectionScroll}>
//         <Text style={globalStyles.sectionTitle}>Style Tags</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingRight: 8}}>
//           {styleTags.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved styles.
//               </Text>
//               <TooltipBubble
//                 message='No styles added yet. Tap the "Edit Style Profile" button above and head over
//               there to add your favorite styles.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             styleTags.map((tag, index) => (
//               <Animatable.View
//                 key={tag}
//                 animation="bounceInRight"
//                 delay={1700 + index * 80}
//                 useNativeDriver
//                 style={globalStyles.pill}>
//                 <Text style={globalStyles.pillText}>#{tag}</Text>
//               </Animatable.View>
//             ))
//           )}
//         </ScrollView>
//       </Animatable.View>

//       {/* Favorite Brands */}
//       <Animatable.View
//         animation="fadeInRight"
//         delay={1900}
//         style={globalStyles.sectionScroll}>
//         <Text style={[globalStyles.sectionTitle]}>Saved Brand Tags</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingRight: 8}}>
//           {favoriteBrands.length === 0 ? (
//             <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//               <Text style={globalStyles.missingDataMessage1}>
//                 No saved brands.
//               </Text>
//               <TooltipBubble
//                 message='No brands added yet. Tap the "Edit Style Profile" button above and head over
//               there to add your favorite brands.'
//                 position="top"
//               />
//             </View>
//           ) : (
//             favoriteBrands.map((brand, index) => (
//               <Animatable.View
//                 key={brand}
//                 animation="bounceInLeft"
//                 delay={2000 + index * 90}
//                 useNativeDriver
//                 style={globalStyles.pill}>
//                 <Text style={globalStyles.pillText}>#{brand}</Text>
//               </Animatable.View>
//             ))
//           )}
//         </ScrollView>
//       </Animatable.View>

//       {/* Saved Looks */}
//       <Animatable.View
//         animation="fadeInUpBig"
//         delay={2200}
//         style={globalStyles.sectionScroll}>
//         <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//         {savedLooks.length === 0 ? (
//           <View style={{flexDirection: 'row', alignSelf: 'flex-start'}}>
//             <Text style={globalStyles.missingDataMessage1}>
//               No saved looks.
//             </Text>
//             <TooltipBubble
//               message='You haven’t saved any looks yet. Tap "Home" in the bottom navigation bar and then tap
//             "Add Look" to add your favorite looks.'
//               position="top"
//             />
//           </View>
//         ) : (
//           <ScrollView
//             horizontal
//             showsHorizontalScrollIndicator={false}
//             contentContainerStyle={{paddingRight: 8}}>
//             {savedLooks.map((look, index) => (
//               <Animatable.View
//                 key={look.id}
//                 animation="zoomInUp"
//                 delay={2300 + index * 120}
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
//                   <Animatable.Text
//                     animation="fadeIn"
//                     delay={2500 + index * 100}
//                     style={[globalStyles.label, {marginTop: 6}]}
//                     numberOfLines={1}>
//                     {look.name}
//                   </Animatable.Text>
//                 </AppleTouchFeedback>
//               </Animatable.View>
//             ))}
//           </ScrollView>
//         )}
//       </Animatable.View>

//       {/* ───────── Profile Footer ───────── */}
//       <Animatable.View
//         animation="fadeIn"
//         delay={2800}
//         style={[globalStyles.section, {paddingTop: 8}]}>
//         <AppleTouchFeedback
//           hapticStyle="impactLight"
//           onPress={() => navigate('ContactScreen')}>
//           <Animatable.Text
//             animation="pulse"
//             iterationCount="infinite"
//             duration={5000}
//             style={{
//               textAlign: 'center',
//               color: theme.colors.foreground,
//               fontSize: 13,
//               paddingVertical: 8,
//             }}>
//             Contact Support
//           </Animatable.Text>
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           hapticStyle="impactLight"
//           onPress={() => navigate('AboutScreen')}>
//           <Animatable.Text
//             animation="fadeInUp"
//             delay={3000}
//             style={{
//               textAlign: 'center',
//               color: theme.colors.foreground,
//               fontSize: 12,
//               opacity: 0.8,
//               paddingBottom: 16,
//             }}>
//             About StylHelpr
//           </Animatable.Text>
//         </AppleTouchFeedback>
//       </Animatable.View>

//       {/* Saved Look Preview Modal */}
//       <SavedLookPreviewModal
//         visible={previewVisible}
//         look={selectedLook}
//         onClose={() => setPreviewVisible(false)}
//       />
//     </ScrollView>
//   );
// }

////////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   TouchableOpacity,
//   ActivityIndicator,
//   Dimensions,
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
//   const styleTags = styleProfile?.style_preferences || [];

//   const [favoriteBrands, setFavoriteBrands] = useState<string[]>([]);
//   const [savedLooks, setSavedLooks] = useState<any[]>([]);
//   const [loadingSaved, setLoadingSaved] = useState(true);
//   const [previewVisible, setPreviewVisible] = useState(false);
//   const [selectedLook, setSelectedLook] = useState<any | null>(null);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Fetch favorite brands from style_profile table
//   // ─────────────────────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!userId) return;

//     (async () => {
//       try {
//         const res = await fetch(
//           `${API_BASE_URL}/style-profile/${userId}/brands`,
//         );
//         const json = await res.json();
//         console.log('👗 Preferred brands (ProfileScreen):', json);
//         setFavoriteBrands(Array.isArray(json.brands) ? json.brands : []);
//       } catch (err) {
//         console.error(
//           '❌ Failed to fetch preferred brands in ProfileScreen:',
//           err,
//         );
//         setFavoriteBrands([]);
//       }
//     })();
//   }, [userId]);

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Fetch saved looks
//   // ─────────────────────────────────────────────────────────────────────────────
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

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Queries: profile, wardrobe, outfits, counts
//   // ─────────────────────────────────────────────────────────────────────────────
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

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Initials fallback logic
//   // ─────────────────────────────────────────────────────────────────────────────
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

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Styles
//   // ─────────────────────────────────────────────────────────────────────────────
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
//   });

//   return (
//     <ScrollView style={[styles.screen, globalStyles.container]}>
//       <Text style={globalStyles.header}>Profile</Text>

//       {/* Settings Icon */}
//       <AppleTouchFeedback
//         style={styles.settingsButton}
//         onPress={() => navigate('Settings')}
//         hapticStyle="selection">
//         <Animatable.View
//           animation="rotate"
//           iterationCount="infinite"
//           duration={16000}>
//           <Icon name="settings" size={24} color={theme.colors.button1} />
//         </Animatable.View>
//       </AppleTouchFeedback>

//       {/* Header Row */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={300}
//         style={globalStyles.section}>
//         <View style={styles.headerRow}>
//           {/* Avatar */}
//           <Animatable.View
//             animation="pulse"
//             iterationCount="infinite"
//             duration={5000}
//             style={styles.avatarWrapper}>
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
//           </Animatable.View>

//           {/* Stats */}
//           <Animatable.View
//             animation="fadeIn"
//             delay={500}
//             style={styles.statsRow}>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={600}
//                 style={styles.statNumber}>
//                 {totalItems}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Wardrobe Items</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={800}
//                 style={styles.statNumber}>
//                 {totalCustomOutfits}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Outfits</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={1000}
//                 style={styles.statNumber}>
//                 {totalFavorites}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Favorites</Text>
//             </View>
//           </Animatable.View>
//         </View>

//         {/* Bio Section */}
//         <Animatable.View
//           animation="fadeInUp"
//           delay={1200}
//           style={styles.bioContainer}>
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
//         </Animatable.View>
//       </Animatable.View>

//       {/* Style Profile CTA */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={1400}
//         style={globalStyles.section}>
//         <Text style={globalStyles.sectionTitle}>Style Profile</Text>
//         <View style={{alignItems: 'center'}}>
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
//                 marginTop: 4,
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
//       </Animatable.View>

//       {/* Style Tags */}
//       <Animatable.View
//         animation="fadeInLeft"
//         delay={1600}
//         style={globalStyles.sectionScroll}>
//         <Text style={globalStyles.sectionTitle}>Style Tags</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingRight: 8}}>
//           {styleTags.length === 0 ? (
//             <Text style={globalStyles.missingDataMessage1}>
//               No style tags added yet. Tap "Edit Style Profile" and head over
//               there to add some.
//             </Text>
//           ) : (
//             styleTags.map((tag, index) => (
//               <Animatable.View
//                 key={tag}
//                 animation="bounceInRight"
//                 delay={1700 + index * 80}
//                 useNativeDriver
//                 style={globalStyles.pill}>
//                 <Text style={globalStyles.pillText}>#{tag}</Text>
//               </Animatable.View>
//             ))
//           )}
//         </ScrollView>
//       </Animatable.View>

//       {/* Favorite Brands */}
//       <Animatable.View
//         animation="fadeInRight"
//         delay={1900}
//         style={globalStyles.sectionScroll}>
//         <Text style={[globalStyles.sectionTitle]}>Favorite Brands</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingRight: 8}}>
//           {favoriteBrands.length === 0 ? (
//             <Text style={globalStyles.missingDataMessage1}>
//               No brands added yet. Tap "Edit Style Profile" and head over there
//               to add some.
//             </Text>
//           ) : (
//             favoriteBrands.map((brand, index) => (
//               <Animatable.View
//                 key={brand}
//                 animation="bounceInLeft"
//                 delay={2000 + index * 90}
//                 useNativeDriver
//                 style={globalStyles.pill}>
//                 <Text style={globalStyles.pillText}>#{brand}</Text>
//               </Animatable.View>
//             ))
//           )}
//         </ScrollView>
//       </Animatable.View>

//       {/* Saved Looks */}
//       <Animatable.View
//         animation="fadeInUpBig"
//         delay={2200}
//         style={globalStyles.sectionScroll}>
//         <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//         {savedLooks.length === 0 ? (
//           <Text style={globalStyles.missingDataMessage1}>
//             You haven’t saved any outfits yet. Head to the Home page and tap
//             "Add Look" to add some.
//           </Text>
//         ) : (
//           <ScrollView
//             horizontal
//             showsHorizontalScrollIndicator={false}
//             contentContainerStyle={{paddingRight: 8}}>
//             {savedLooks.map((look, index) => (
//               <Animatable.View
//                 key={look.id}
//                 animation="zoomInUp"
//                 delay={2300 + index * 120}
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
//                   <Animatable.Text
//                     animation="fadeIn"
//                     delay={2500 + index * 100}
//                     style={[globalStyles.label, {marginTop: 6}]}
//                     numberOfLines={1}>
//                     {look.name}
//                   </Animatable.Text>
//                 </AppleTouchFeedback>
//               </Animatable.View>
//             ))}
//           </ScrollView>
//         )}
//       </Animatable.View>

//       {/* ───────── Profile Footer ───────── */}
//       <Animatable.View
//         animation="fadeIn"
//         delay={2800}
//         style={[globalStyles.section, {paddingTop: 8}]}>
//         <AppleTouchFeedback
//           hapticStyle="impactLight"
//           onPress={() => navigate('ContactScreen')}>
//           <Animatable.Text
//             animation="pulse"
//             iterationCount="infinite"
//             duration={5000}
//             style={{
//               textAlign: 'center',
//               color: theme.colors.foreground,
//               fontSize: 13,
//               paddingVertical: 8,
//             }}>
//             Contact Support
//           </Animatable.Text>
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           hapticStyle="impactLight"
//           onPress={() => navigate('AboutScreen')}>
//           <Animatable.Text
//             animation="fadeInUp"
//             delay={3000}
//             style={{
//               textAlign: 'center',
//               color: theme.colors.foreground,
//               fontSize: 12,
//               opacity: 0.8,
//               paddingBottom: 16,
//             }}>
//             About StylHelpr
//           </Animatable.Text>
//         </AppleTouchFeedback>
//       </Animatable.View>

//       {/* Saved Look Preview Modal */}
//       <SavedLookPreviewModal
//         visible={previewVisible}
//         look={selectedLook}
//         onClose={() => setPreviewVisible(false)}
//       />
//     </ScrollView>
//   );
// }

////////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   ScrollView,
//   TouchableOpacity,
//   ActivityIndicator,
//   Dimensions,
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

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Fetch saved looks
//   // ─────────────────────────────────────────────────────────────────────────────
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

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Queries: profile, wardrobe, outfits, counts
//   // ─────────────────────────────────────────────────────────────────────────────
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

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Initials fallback logic
//   // ─────────────────────────────────────────────────────────────────────────────
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

//   // ─────────────────────────────────────────────────────────────────────────────
//   // Styles
//   // ─────────────────────────────────────────────────────────────────────────────
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
//   });

//   return (
//     <ScrollView style={[styles.screen, globalStyles.container]}>
//       {/* Page Header */}
//       {/* <Animatable.Text
//         animation="fadeInDown"
//         delay={200}
//         style={globalStyles.header}>
//         Profile
//       </Animatable.Text> */}

//       <Text style={globalStyles.header}>Profile</Text>

//       {/* Settings Icon */}
//       <AppleTouchFeedback
//         style={styles.settingsButton}
//         onPress={() => navigate('Settings')}
//         hapticStyle="selection">
//         <Animatable.View
//           animation="rotate"
//           iterationCount="infinite"
//           duration={16000}>
//           <Icon name="settings" size={24} color={theme.colors.button1} />
//         </Animatable.View>
//       </AppleTouchFeedback>

//       {/* Header Row */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={300}
//         style={globalStyles.section}>
//         <View style={styles.headerRow}>
//           {/* Avatar */}
//           <Animatable.View
//             animation="pulse"
//             iterationCount="infinite"
//             duration={5000}
//             style={styles.avatarWrapper}>
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
//           </Animatable.View>

//           {/* Stats */}
//           <Animatable.View
//             animation="fadeIn"
//             delay={500}
//             style={styles.statsRow}>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={600}
//                 style={styles.statNumber}>
//                 {totalItems}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Wardrobe Items</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={800}
//                 style={styles.statNumber}>
//                 {totalCustomOutfits}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Outfits</Text>
//             </View>
//             <View style={styles.statBox}>
//               <Animatable.Text
//                 animation="bounceIn"
//                 delay={1000}
//                 style={styles.statNumber}>
//                 {totalFavorites}
//               </Animatable.Text>
//               <Text style={styles.statLabel}>Favorites</Text>
//             </View>
//           </Animatable.View>
//         </View>

//         {/* Bio Section */}
//         <Animatable.View
//           animation="fadeInUp"
//           delay={1200}
//           style={styles.bioContainer}>
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
//         </Animatable.View>
//       </Animatable.View>

//       {/* Style Profile CTA */}
//       <Animatable.View
//         animation="fadeInUp"
//         delay={1400}
//         style={globalStyles.section}>
//         <Text style={globalStyles.sectionTitle}>Style Profile</Text>
//         <View style={{alignItems: 'center'}}>
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
//                 marginTop: 4,
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
//       </Animatable.View>
//       {/* Style Tags */}
//       <Animatable.View
//         animation="fadeInLeft"
//         delay={1600}
//         style={globalStyles.sectionScroll}>
//         <Text style={globalStyles.sectionTitle}>Style Tags</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingRight: 8}}>
//           {styleTags.length === 0 ? (
//             <Text style={globalStyles.missingDataMessage1}>
//               No style tags added yet. Tap "Edit Style Profile" and head over
//               there to add some.
//             </Text>
//           ) : (
//             styleTags.map((tag, index) => (
//               <Animatable.View
//                 key={tag}
//                 animation="bounceInRight"
//                 delay={1700 + index * 80}
//                 useNativeDriver
//                 style={globalStyles.pill}>
//                 <Text style={globalStyles.pillText}>#{tag}</Text>
//               </Animatable.View>
//             ))
//           )}
//         </ScrollView>
//       </Animatable.View>

//       {/* Favorite Brands */}
//       <Animatable.View
//         animation="fadeInRight"
//         delay={1900}
//         style={globalStyles.sectionScroll}>
//         <Text style={[globalStyles.sectionTitle]}>Favorite Brands</Text>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={{paddingRight: 8}}>
//           {favoriteBrands.length === 0 ? (
//             <Text style={globalStyles.missingDataMessage1}>
//               No brands added yet. Tap "Edit Style Profile" and head over there
//               to add some.
//             </Text>
//           ) : (
//             favoriteBrands.map((brand, index) => (
//               <Animatable.View
//                 key={brand}
//                 animation="bounceInLeft"
//                 delay={2000 + index * 90}
//                 useNativeDriver
//                 style={globalStyles.pill}>
//                 <Text style={globalStyles.pillText}>#{brand}</Text>
//               </Animatable.View>
//             ))
//           )}
//         </ScrollView>
//       </Animatable.View>

//       {/* Saved Looks */}
//       <Animatable.View
//         animation="fadeInUpBig"
//         delay={2200}
//         style={globalStyles.sectionScroll}>
//         <Text style={[globalStyles.sectionTitle]}>Saved Looks</Text>
//         {savedLooks.length === 0 ? (
//           <Text style={globalStyles.missingDataMessage1}>
//             You haven’t saved any outfits yet. Head to the Home page and tap
//             "Add Look" to add some.
//           </Text>
//         ) : (
//           <ScrollView
//             horizontal
//             showsHorizontalScrollIndicator={false}
//             contentContainerStyle={{paddingRight: 8}}>
//             {savedLooks.map((look, index) => (
//               <Animatable.View
//                 key={look.id}
//                 animation="zoomInUp"
//                 delay={2300 + index * 120}
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
//                   <Animatable.Text
//                     animation="fadeIn"
//                     delay={2500 + index * 100}
//                     style={[globalStyles.label, {marginTop: 6}]}
//                     numberOfLines={1}>
//                     {look.name}
//                   </Animatable.Text>
//                 </AppleTouchFeedback>
//               </Animatable.View>
//             ))}
//           </ScrollView>
//         )}
//       </Animatable.View>

//       {/* ───────── Profile Footer ───────── */}
//       <Animatable.View
//         animation="fadeIn"
//         delay={2800}
//         style={[globalStyles.section, {paddingTop: 8}]}>
//         <AppleTouchFeedback
//           hapticStyle="impactLight"
//           onPress={() => navigate('ContactScreen')}>
//           <Animatable.Text
//             animation="pulse"
//             iterationCount="infinite"
//             duration={5000}
//             style={{
//               textAlign: 'center',
//               color: theme.colors.foreground,
//               fontSize: 13,
//               paddingVertical: 8,
//             }}>
//             Contact Support
//           </Animatable.Text>
//         </AppleTouchFeedback>

//         <AppleTouchFeedback
//           hapticStyle="impactLight"
//           onPress={() => navigate('AboutScreen')}>
//           <Animatable.Text
//             animation="fadeInUp"
//             delay={3000}
//             style={{
//               textAlign: 'center',
//               color: theme.colors.foreground,
//               fontSize: 12,
//               opacity: 0.8,
//               paddingBottom: 16,
//             }}>
//             About StylHelpr
//           </Animatable.Text>
//         </AppleTouchFeedback>
//       </Animatable.View>

//       {/* Saved Look Preview Modal */}
//       <SavedLookPreviewModal
//         visible={previewVisible}
//         look={selectedLook}
//         onClose={() => setPreviewVisible(false)}
//       />
//     </ScrollView>
//   );
// }

/////////////////////

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
//                 marginTop: 4,
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
