import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {useQuery} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {API_BASE_URL} from '../config/api';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import * as Animatable from 'react-native-animatable';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useStyleProfile} from '../hooks/useStyleProfile';

type Props = {
  navigate: (screen: string, params?: any) => void;
  route?: {
    userId: string;
    userName?: string;
    userAvatar?: string;
  };
  goBack?: () => void;
};

type UserProfile = {
  first_name: string;
  last_name: string;
  email: string;
  profile_picture?: string;
  fashion_level?: string;
  profession?: string;
};

type SharedLook = {
  id: string;
  image_url?: string;
  top_image?: string;
  bottom_image?: string;
  shoes_image?: string;
  description?: string;
};

export default function UserProfileScreen({navigate, route, goBack}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const insets = useSafeAreaInsets();

  const userId = route?.userId;
  const passedName = route?.userName;
  const passedAvatar = route?.userAvatar;

  const BOTTOM_NAV_HEIGHT = 90;

  const [sharedLooks, setSharedLooks] = useState<SharedLook[]>([]);
  const [favoriteBrands, setFavoriteBrands] = useState<string[]>([]);

  // Fetch user profile
  const {data: userProfile, isLoading: loadingProfile} = useQuery<UserProfile>({
    enabled: !!userId,
    queryKey: ['publicUserProfile', userId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/users/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch user profile');
      return res.json();
    },
  });

  // Fetch style profile (for style tags)
  const {styleProfile} = useStyleProfile(userId || '');
  const styleTags = styleProfile?.style_preferences || [];

  // Fetch wardrobe count
  const {data: wardrobeItems = []} = useQuery<{id: string}[]>({
    queryKey: ['publicWardrobe', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch favorites count
  const {data: totalFavorites = 0} = useQuery({
    queryKey: ['publicTotalFavorites', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE_URL}/outfit-favorites/count/${userId}`,
      );
      if (!res.ok) return 0;
      const data = await res.json();
      return data.count;
    },
  });

  // Fetch custom outfits count
  const {data: totalCustomOutfits = 0} = useQuery({
    queryKey: ['publicTotalCustomOutfits', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/custom-outfits/count/${userId}`);
      if (!res.ok) return 0;
      const data = await res.json();
      return data.count;
    },
  });

  // Fetch favorite brands
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

  // Fetch shared looks
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

  const totalItems = wardrobeItems.length;

  // Initials fallback logic
  let initials = '';
  if (userProfile?.first_name || userProfile?.last_name) {
    const f = (userProfile?.first_name?.trim?.()[0] || '').toUpperCase();
    const l = (userProfile?.last_name?.trim?.()[0] || '').toUpperCase();
    initials = `${f}${l}`;
  } else if (passedName) {
    const parts = passedName.trim().split(' ').filter(Boolean);
    if (parts.length === 1) {
      initials = parts[0][0].toUpperCase();
    } else if (parts.length >= 2) {
      initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
  } else if (userProfile?.email) {
    const local = userProfile.email.split('@')[0];
    const parts = local.split(/[^a-zA-Z]/).filter(Boolean);
    const f = (parts[0]?.[0] || '').toUpperCase();
    const l = (parts[1]?.[0] || '').toUpperCase();
    initials = f + l || local.slice(0, 2).toUpperCase();
  }

  const profileUri = userProfile?.profile_picture || passedAvatar || '';
  const displayName =
    userProfile?.first_name && userProfile?.last_name
      ? `${userProfile.first_name} ${userProfile.last_name}`
      : passedName || 'User';
  const username =
    userProfile?.first_name && userProfile?.last_name
      ? `@${userProfile.first_name.toLowerCase()}${userProfile.last_name.toLowerCase()}`
      : passedName
      ? `@${passedName.toLowerCase().replace(/\s+/g, '')}`
      : '@user';

  const handleMessage = () => {
    navigate('ChatScreen', {
      recipientId: userId,
      recipientName: displayName,
      recipientAvatar: profileUri,
    });
  };

  const handleBack = () => {
    if (goBack) {
      goBack();
    } else {
      navigate('MessagesScreen');
    }
  };

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
    },
    topHeader: {
      paddingTop: insets.top + 60,
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: theme.colors.background,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backText: {
      color: theme.colors.button1,
      fontSize: 16,
      marginLeft: 4,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 100,
    },
  });

  if (!userId) {
    return (
      <View style={[styles.screen, {backgroundColor: theme.colors.background}]}>
        <View style={styles.loadingContainer}>
          <Text style={{color: theme.colors.foreground}}>User not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{flex: 1, backgroundColor: theme.colors.background}}>
      {/* Fixed Header with Back Button */}
      <View style={styles.topHeader}>
        <AppleTouchFeedback
          style={styles.backButton}
          onPress={handleBack}
          hapticStyle="impactLight">
          <Icon name="arrow-back" size={26} color={theme.colors.button1} />
          <Text style={styles.backText}>Back</Text>
        </AppleTouchFeedback>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          globalStyles.container,
          {
            backgroundColor: theme.colors.background,
            paddingTop: 0,
            paddingBottom: insets.bottom + BOTTOM_NAV_HEIGHT,
          },
        ]}>
        <Text style={globalStyles.header}>Profile</Text>

        {loadingProfile ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.button1} />
          </View>
        ) : (
          <>
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
                    {profileUri ? (
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
                        {sharedLooks.length}
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
                <Text style={styles.nameText}>{displayName}</Text>
                <Text style={styles.usernameText}>{username}</Text>
                {userProfile?.fashion_level && (
                  <Text style={styles.bioText}>
                    {userProfile.fashion_level}
                  </Text>
                )}
                {userProfile?.profession && (
                  <Text style={styles.bioText}>{userProfile.profession}</Text>
                )}
              </Animatable.View>
            </Animatable.View>

            {/* Message Button */}
            <Animatable.View
              animation="fadeInUp"
              delay={1400}
              style={globalStyles.section}>
              <View style={{alignItems: 'center'}}>
                <AppleTouchFeedback
                  onPress={handleMessage}
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
                    name="message"
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
                    Message
                  </Text>
                </AppleTouchFeedback>
              </View>
            </Animatable.View>

            {/* Style Tags */}
            <Animatable.View
              animation="fadeInLeft"
              delay={1500}
              style={globalStyles.sectionScroll}>
              <Text style={globalStyles.sectionTitle}>Style Tags</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{paddingRight: 8}}>
                {styleTags.length === 0 ? (
                  <Text style={globalStyles.missingDataMessage1}>
                    No saved styles.
                  </Text>
                ) : (
                  styleTags.map((tag: string, index: number) => (
                    <Animatable.View
                      key={tag}
                      animation="bounceInRight"
                      delay={1600 + index * 80}
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

            {/* Saved Brand Tags */}
            <Animatable.View
              animation="fadeInRight"
              delay={1700}
              style={globalStyles.sectionScroll}>
              <Text style={globalStyles.sectionTitle}>Saved Brand Tags</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{paddingRight: 8}}>
                {favoriteBrands.length === 0 ? (
                  <Text style={globalStyles.missingDataMessage1}>
                    No saved brands.
                  </Text>
                ) : (
                  favoriteBrands.map((brand, index) => (
                    <Animatable.View
                      key={brand}
                      animation="bounceInLeft"
                      delay={1800 + index * 90}
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
              delay={1900}
              style={globalStyles.sectionScroll}>
              <Text style={[globalStyles.sectionTitle]}>Shared Looks</Text>
              {sharedLooks.length === 0 ? (
                <Text style={globalStyles.missingDataMessage1}>
                  No shared looks yet.
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{paddingRight: 8}}>
                  {sharedLooks.map((look, index) => (
                    <Animatable.View
                      key={look.id}
                      animation="zoomInUp"
                      delay={1700 + index * 120}
                      useNativeDriver
                      style={[globalStyles.outfitCard, {width: 131}]}>
                      <Pressable style={{alignItems: 'center'}}>
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
                            <Image
                              source={{uri: look.image_url}}
                              style={{width: 130, height: 130}}
                              resizeMode="cover"
                            />
                          ) : (
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
                        </View>
                        {/* Look description */}
                        <Animatable.View
                          animation="fadeIn"
                          delay={1900 + index * 100}
                          style={{marginTop: 6, alignItems: 'center'}}>
                          <Text
                            style={[
                              globalStyles.cardSubLabel,
                              {textAlign: 'center'},
                            ]}
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
          </>
        )}
      </ScrollView>
    </View>
  );
}
