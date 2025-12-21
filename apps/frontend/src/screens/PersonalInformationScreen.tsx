import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  ActivityIndicator,
  Animated,
  PermissionsAndroid,
  Platform,
  Alert,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import * as ImagePicker from 'react-native-image-picker';
import {API_BASE_URL} from '../config/api';
import {useUUID} from '../context/UUIDContext';
import {useAuth0} from 'react-native-auth0';
import {tokens} from '../styles/tokens/tokens';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SafeScreenWrapper from '../components/SafeScreenWrapper';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

const STORAGE_KEY = (uid: string) => `profile_picture:${uid}`;

// ✅ Fix: Always return string | null (no undefined)
const stripVersion = (url?: string | null): string | null => {
  if (!url) return null;
  return url.split('?v=')[0];
};

export default function PersonalInformationScreen({navigate}: any) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();
  const userId = useUUID();
  const {user} = useAuth0();
  const sub = user?.sub;

  const insets = useSafeAreaInsets();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  const styles = StyleSheet.create({
    centered: {justifyContent: 'center', alignItems: 'center'},
    content: {padding: 24, paddingBottom: 60},
    title: {
      fontSize: 28,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 38,
    },
    avatarContainer: {alignItems: 'center', marginBottom: 32},
    avatar: {width: 120, height: 120, borderRadius: 60, marginBottom: 14},
    avatarPlaceholder: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.surfaceBorder,
    },
    photoButton: {paddingHorizontal: 22, borderRadius: tokens.borderRadius.sm},
    formCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: tokens.borderRadius.sm,
      padding: 18,
      marginBottom: 32,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: {width: 0, height: 4},
    },
    label: {fontSize: 15, fontWeight: '600', marginTop: 12, marginBottom: 6},
    input: {
      borderWidth: theme.borderWidth.lg,
      borderRadius: 10,
      padding: 14,
      fontSize: 16,
      backgroundColor: theme.colors.surface3,
      borderColor: theme.colors.surfaceBorder,
      marginBottom: 10,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profession, setProfession] = useState('');
  const [bio, setBio] = useState('');
  const [fashionLevel, setFashionLevel] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState<any>({});

  const requestMediaPermission = async () => {
    if (Platform.OS === 'android') {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES ||
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      ]);
    }
  };

  // ✅ Universal uriToBlob (works on device + simulator)
  const uriToBlob = (uri: string): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = () => reject(new Error('Failed to convert URI to blob'));
      xhr.responseType = 'blob';
      // 🔥 Critical: ensure "file://" URIs work in simulator too
      xhr.open(
        'GET',
        uri.startsWith('file://') ? uri.replace('file://', '') : uri,
        true,
      );
      xhr.send(null);
    });

  const safeSetProfile = async (
    uid: string,
    url: string | null,
    source: string,
  ) => {
    const clean = stripVersion(url);
    console.log('[PFI S] safeSetProfile from', source, '->', clean);

    if (clean) {
      setProfilePicture(clean);
      if (uid) {
        await AsyncStorage.setItem(STORAGE_KEY(uid), clean).catch(() => {});
      }
    }
  };

  // ---------- hydrate from storage early ----------
  useEffect(() => {
    (async () => {
      if (!userId) return;
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEY(userId));
        console.log('[PFI BOOT] cached =', cached);
        if (cached) setProfilePicture(cached);
      } catch {}
    })();
  }, [userId]);

  // ---------- fetch user ----------
  useEffect(() => {
    const fetchUser = async () => {
      if (!userId && !sub) return;

      const endpoint = userId
        ? `${API_BASE_URL}/users/${userId}`
        : sub
        ? `${API_BASE_URL}/users/auth0/${sub}`
        : null;

      if (!endpoint) return;

      console.log('[USR F1] GET', endpoint);
      try {
        const res = await fetch(endpoint);
        const data = await res.json();
        console.log('[USR F1] ok', {
          id: data?.id,
          profile_picture: data?.profile_picture,
        });

        setInitialData(data || {});
        setFirstName(data?.first_name || '');
        setLastName(data?.last_name || '');
        setProfession(data?.profession || '');
        setBio(data?.bio || '');
        setFashionLevel(data?.fashion_level || '');

        if (data?.profile_picture && data.profile_picture.trim() !== '') {
          await safeSetProfile(
            userId || sub || 'me',
            stripVersion(data.profile_picture),
            'server',
          );
        } else {
          console.log(
            '[USR F1] Skipping safeSetProfile — server returned no profile picture',
          );
        }
      } catch (err) {
        console.error('Failed to load user info', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId, sub]);

  // ---------- pick + upload ----------
  const pickImage = async () => {
    try {
      console.log('[PFI] pickImage:start');
      await requestMediaPermission();

      const result = await ImagePicker.launchImageLibrary({
        mediaType: 'photo',
        quality: 1,
        selectionLimit: 1,
      });

      const asset = result?.assets?.[0];
      const localUri = asset?.uri;
      const filename = asset?.fileName || 'profile.jpg';
      const type = asset?.type || 'image/jpeg';

      console.log('[PFI] picker:result', {
        didCancel: result?.didCancel,
        uri: localUri,
        name: filename,
        type,
      });

      if (result?.didCancel || !localUri) return;

      setProfilePicture(localUri);

      const presignUrl = `${API_BASE_URL}/profile-upload/presign?userId=${userId}&filename=${encodeURIComponent(
        filename,
      )}&contentType=${encodeURIComponent(type)}`;
      const presignRes = await fetch(presignUrl);
      if (!presignRes.ok) throw new Error('Failed to get presigned URL');
      const {uploadUrl, publicUrl, objectKey} = await presignRes.json();

      console.log('[PFI] 📡 Upload URL:', uploadUrl);
      console.log('[PFI] 📡 Public URL (expected GCS):', publicUrl);

      // ✅ Blob conversion that works everywhere
      const blob = await uriToBlob(localUri);

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {'Content-Type': type},
        body: blob,
      });

      if (!uploadRes.ok)
        throw new Error(`GCS upload failed: ${uploadRes.status}`);

      console.log('[PFI] ✅ Upload complete');

      const completeRes = await fetch(
        `${API_BASE_URL}/profile-upload/complete`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            user_id: userId,
            image_url: stripVersion(publicUrl),
            object_key: objectKey,
          }),
        },
      );

      if (!completeRes.ok) throw new Error('Failed to save profile picture');
      console.log('[PFI] ✅ Backend save complete:', publicUrl);

      await safeSetProfile(
        userId || sub || 'me',
        stripVersion(publicUrl),
        'final',
      );
    } catch (err) {
      console.error('❌ Upload failed:', err);
      Alert.alert('Upload Failed', 'There was a problem uploading your image.');
    }
  };

  const hasChanges = Boolean(
    (firstName && firstName !== initialData.first_name) ||
      (lastName && lastName !== initialData.last_name) ||
      (profession && profession !== initialData.profession) ||
      bio !== (initialData.bio || '') ||
      (fashionLevel && fashionLevel !== initialData.fashion_level) ||
      stripVersion(profilePicture) !==
        stripVersion(initialData.profile_picture),
  );

  const handleSave = async () => {
    console.log('[PFI SAVE] start hasChanges=', hasChanges);
    try {
      const dto: any = {};
      const cleanUrl = stripVersion(profilePicture);

      if (cleanUrl && cleanUrl !== stripVersion(initialData.profile_picture)) {
        dto.profile_picture = cleanUrl;
      }
      if (firstName && firstName !== initialData.first_name)
        dto.first_name = firstName;
      if (lastName && lastName !== initialData.last_name)
        dto.last_name = lastName;
      if (profession && profession !== initialData.profession)
        dto.profession = profession;
      if (bio !== (initialData.bio || '')) dto.bio = bio;
      if (fashionLevel && fashionLevel !== initialData.fashion_level)
        dto.fashion_level = fashionLevel;

      if (Object.keys(dto).length === 0) {
        navigate('Settings');
        return;
      }

      const endpoint = userId
        ? `${API_BASE_URL}/users/${userId}`
        : `${API_BASE_URL}/users/auth0/${sub}`;

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(dto),
      });

      const updated = await res.json();
      setInitialData(updated);

      if (updated?.profile_picture && updated.profile_picture.trim() !== '') {
        await safeSetProfile(
          userId || sub || 'me',
          stripVersion(updated.profile_picture),
          'save',
        );
      }
      navigate('Settings');
    } catch (err) {
      console.error('Save failed', err);
    }
  };

  if (loading) {
    return (
      <View style={[globalStyles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const displayUrl = profilePicture
    ? `${stripVersion(profilePicture)}?v=${Date.now()}`
    : null;

  return (
    <Animated.ScrollView
      style={[
        globalStyles.container,
        {backgroundColor: colors.background, opacity: fadeAnim},
      ]}
      contentContainerStyle={[styles.content, {paddingBottom: 350}]}
      showsVerticalScrollIndicator={false}>
      <View
        style={{
          height: insets.top + 56, // ⬅️ 56 is about the old navbar height
          backgroundColor: theme.colors.background, // same tone as old nav
        }}
      />
      <Text style={[styles.title, {color: colors.primary}]}>
        Personal Information
      </Text>

      <View style={styles.avatarContainer}>
        {/* {displayUrl ? (
          <Image
            source={{uri: displayUrl}}
            style={styles.avatar}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]} />
        )} */}

        {displayUrl ? (
          <Image
            source={{uri: displayUrl}}
            style={styles.avatar}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.avatar,
              styles.avatarPlaceholder,
              {
                backgroundColor: theme.colors.surface,
                borderWidth: theme.borderWidth.xl,
                borderColor: theme.colors.surface3,
                justifyContent: 'center',
                alignItems: 'center',
              },
            ]}>
            <Text
              style={{
                fontSize: 40,
                fontWeight: '700',
                color: theme.colors.foreground,
              }}>
              {`${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()}
            </Text>
          </View>
        )}

        <AppleTouchFeedback
          onPress={pickImage}
          hapticStyle="impactLight"
          style={[globalStyles.buttonPrimary, styles.photoButton]}>
          <Text style={globalStyles.buttonPrimaryText}>Change Photo</Text>
        </AppleTouchFeedback>
      </View>

      <View style={styles.formCard}>
        <Text style={[styles.label, {color: colors.foreground}]}>
          First Name
        </Text>
        <TextInput
          value={firstName}
          onChangeText={setFirstName}
          style={[styles.input, {color: colors.foreground}]}
          placeholder="Enter your first name"
          placeholderTextColor={colors.muted}
        />

        <Text style={[styles.label, {color: colors.foreground}]}>
          Last Name
        </Text>
        <TextInput
          value={lastName}
          onChangeText={setLastName}
          style={[styles.input, {color: colors.foreground}]}
          placeholder="Enter your last name"
          placeholderTextColor={colors.muted}
        />

        <Text style={[styles.label, {color: colors.foreground}]}>
          Profession
        </Text>
        <TextInput
          value={profession}
          onChangeText={setProfession}
          style={[styles.input, {color: colors.foreground}]}
          placeholder="Enter your profession"
          placeholderTextColor={colors.muted}
        />

        <Text style={[styles.label, {color: colors.foreground}]}>Bio</Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          style={[
            styles.input,
            {color: colors.foreground, minHeight: 80, textAlignVertical: 'top'},
          ]}
          placeholder="Tell us about yourself..."
          placeholderTextColor={colors.muted}
          multiline
          numberOfLines={3}
          maxLength={150}
        />
        <Text
          style={{
            fontSize: 12,
            color: colors.muted,
            textAlign: 'right',
            marginTop: -6,
            marginBottom: 10,
          }}>
          {bio.length}/150
        </Text>

        <Text style={[styles.label, {color: colors.foreground}]}>
          Fashion Expertise
        </Text>
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
          {['Beginner', 'Intermediate', 'Advanced', 'Expert'].map(level => (
            <AppleTouchFeedback
              key={level}
              onPress={() => setFashionLevel(level)}
              hapticStyle="impactLight"
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor:
                  fashionLevel === level
                    ? theme.colors.button1
                    : theme.colors.surface3,
                borderWidth: 1,
                borderColor:
                  fashionLevel === level
                    ? theme.colors.button1
                    : theme.colors.surfaceBorder,
              }}>
              <Text
                style={{
                  color:
                    fashionLevel === level ? '#fff' : theme.colors.foreground,
                  fontWeight: fashionLevel === level ? '600' : '400',
                }}>
                {level}
              </Text>
            </AppleTouchFeedback>
          ))}
        </View>
      </View>

      <View style={styles.buttonRow}>
        <AppleTouchFeedback
          onPress={hasChanges ? handleSave : () => {}}
          hapticStyle="impactMedium"
          style={[
            globalStyles.buttonPrimary,
            {width: 120, opacity: hasChanges ? 1 : 0.5},
          ]}>
          <Text style={globalStyles.buttonPrimaryText}>Save</Text>
        </AppleTouchFeedback>

        <View style={{width: 12}} />

        <AppleTouchFeedback
          onPress={() => navigate('Settings')}
          hapticStyle="impactLight"
          style={[
            globalStyles.buttonPrimary,
            {width: 120, backgroundColor: 'grey'},
          ]}>
          <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
        </AppleTouchFeedback>
      </View>
    </Animated.ScrollView>
  );
}

/////////////////////

// import React, {useState, useEffect, useRef} from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   Image,
//   StyleSheet,
//   ActivityIndicator,
//   Animated,
//   PermissionsAndroid,
//   Platform,
//   Alert,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import * as ImagePicker from 'react-native-image-picker';
// import {API_BASE_URL} from '../config/api';
// import {useUUID} from '../context/UUIDContext';
// import {useAuth0} from 'react-native-auth0';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const STORAGE_KEY = (uid: string) => `profile_picture:${uid}`;

// // ✅ Fix: Always return string | null (no undefined)
// const stripVersion = (url?: string | null): string | null => {
//   if (!url) return null;
//   return url.split('?v=')[0];
// };

// export default function PersonalInformationScreen({navigate}: any) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID();
//   const {user} = useAuth0();
//   const sub = user?.sub;

//   const fadeAnim = useRef(new Animated.Value(0)).current;
//   useEffect(() => {
//     Animated.timing(fadeAnim, {
//       toValue: 1,
//       duration: 700,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   const styles = StyleSheet.create({
//     centered: {justifyContent: 'center', alignItems: 'center'},
//     content: {padding: 24, paddingBottom: 60},
//     title: {
//       fontSize: 28,
//       fontWeight: '700',
//       textAlign: 'center',
//       marginBottom: 28,
//     },
//     avatarContainer: {alignItems: 'center', marginBottom: 32},
//     avatar: {width: 120, height: 120, borderRadius: 60, marginBottom: 14},
//     avatarPlaceholder: {
//       backgroundColor: theme.colors.surface,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     photoButton: {paddingHorizontal: 22, borderRadius: 50},
//     formCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       padding: 18,
//       marginBottom: 32,
//       shadowColor: '#000',
//       shadowOpacity: 0.08,
//       shadowRadius: 12,
//       shadowOffset: {width: 0, height: 4},
//     },
//     label: {fontSize: 15, fontWeight: '600', marginTop: 12, marginBottom: 6},
//     input: {
//       borderWidth: theme.borderWidth.lg,
//       borderRadius: 10,
//       padding: 14,
//       fontSize: 16,
//       backgroundColor: theme.colors.surface3,
//       borderColor: theme.colors.surfaceBorder,
//       marginBottom: 10,
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//   });

//   const [firstName, setFirstName] = useState('');
//   const [lastName, setLastName] = useState('');
//   const [profession, setProfession] = useState('');
//   const [fashionLevel, setFashionLevel] = useState('');
//   const [profilePicture, setProfilePicture] = useState<string | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [initialData, setInitialData] = useState<any>({});

//   const requestMediaPermission = async () => {
//     if (Platform.OS === 'android') {
//       await PermissionsAndroid.requestMultiple([
//         PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES ||
//           PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
//         PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
//       ]);
//     }
//   };

//   // ✅ Universal uriToBlob (works on device + simulator)
//   const uriToBlob = (uri: string): Promise<Blob> =>
//     new Promise((resolve, reject) => {
//       const xhr = new XMLHttpRequest();
//       xhr.onload = () => resolve(xhr.response);
//       xhr.onerror = () => reject(new Error('Failed to convert URI to blob'));
//       xhr.responseType = 'blob';
//       // 🔥 Critical: ensure "file://" URIs work in simulator too
//       xhr.open(
//         'GET',
//         uri.startsWith('file://') ? uri.replace('file://', '') : uri,
//         true,
//       );
//       xhr.send(null);
//     });

//   const safeSetProfile = async (
//     uid: string,
//     url: string | null,
//     source: string,
//   ) => {
//     const clean = stripVersion(url);
//     console.log('[PFI S] safeSetProfile from', source, '->', clean);

//     if (clean) {
//       setProfilePicture(clean);
//       if (uid) {
//         await AsyncStorage.setItem(STORAGE_KEY(uid), clean).catch(() => {});
//       }
//     }
//   };

//   // ---------- hydrate from storage early ----------
//   useEffect(() => {
//     (async () => {
//       if (!userId) return;
//       try {
//         const cached = await AsyncStorage.getItem(STORAGE_KEY(userId));
//         console.log('[PFI BOOT] cached =', cached);
//         if (cached) setProfilePicture(cached);
//       } catch {}
//     })();
//   }, [userId]);

//   // ---------- fetch user ----------
//   useEffect(() => {
//     const fetchUser = async () => {
//       if (!userId && !sub) return;

//       const endpoint = userId
//         ? `${API_BASE_URL}/users/${userId}`
//         : sub
//         ? `${API_BASE_URL}/users/auth0/${sub}`
//         : null;

//       if (!endpoint) return;

//       console.log('[USR F1] GET', endpoint);
//       try {
//         const res = await fetch(endpoint);
//         const data = await res.json();
//         console.log('[USR F1] ok', {
//           id: data?.id,
//           profile_picture: data?.profile_picture,
//         });

//         setInitialData(data || {});
//         setFirstName(data?.first_name || '');
//         setLastName(data?.last_name || '');
//         setProfession(data?.profession || '');
//         setFashionLevel(data?.fashion_level || '');

//         if (data?.profile_picture && data.profile_picture.trim() !== '') {
//           await safeSetProfile(
//             userId || sub || 'me',
//             stripVersion(data.profile_picture),
//             'server',
//           );
//         } else {
//           console.log(
//             '[USR F1] Skipping safeSetProfile — server returned no profile picture',
//           );
//         }
//       } catch (err) {
//         console.error('Failed to load user info', err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchUser();
//   }, [userId, sub]);

//   // ---------- pick + upload ----------
//   const pickImage = async () => {
//     try {
//       console.log('[PFI] pickImage:start');
//       await requestMediaPermission();

//       const result = await ImagePicker.launchImageLibrary({
//         mediaType: 'photo',
//         quality: 1,
//         selectionLimit: 1,
//       });

//       const asset = result?.assets?.[0];
//       const localUri = asset?.uri;
//       const filename = asset?.fileName || 'profile.jpg';
//       const type = asset?.type || 'image/jpeg';

//       console.log('[PFI] picker:result', {
//         didCancel: result?.didCancel,
//         uri: localUri,
//         name: filename,
//         type,
//       });

//       if (result?.didCancel || !localUri) return;

//       setProfilePicture(localUri);

//       const presignUrl = `${API_BASE_URL}/profile-upload/presign?userId=${userId}&filename=${encodeURIComponent(
//         filename,
//       )}&contentType=${encodeURIComponent(type)}`;
//       const presignRes = await fetch(presignUrl);
//       if (!presignRes.ok) throw new Error('Failed to get presigned URL');
//       const {uploadUrl, publicUrl, objectKey} = await presignRes.json();

//       console.log('[PFI] 📡 Upload URL:', uploadUrl);
//       console.log('[PFI] 📡 Public URL (expected GCS):', publicUrl);

//       // ✅ Blob conversion that works everywhere
//       const blob = await uriToBlob(localUri);

//       const uploadRes = await fetch(uploadUrl, {
//         method: 'PUT',
//         headers: {'Content-Type': type},
//         body: blob,
//       });

//       if (!uploadRes.ok)
//         throw new Error(`GCS upload failed: ${uploadRes.status}`);

//       console.log('[PFI] ✅ Upload complete');

//       const completeRes = await fetch(
//         `${API_BASE_URL}/profile-upload/complete`,
//         {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({
//             user_id: userId,
//             image_url: stripVersion(publicUrl),
//             object_key: objectKey,
//           }),
//         },
//       );

//       if (!completeRes.ok) throw new Error('Failed to save profile picture');
//       console.log('[PFI] ✅ Backend save complete:', publicUrl);

//       await safeSetProfile(
//         userId || sub || 'me',
//         stripVersion(publicUrl),
//         'final',
//       );
//     } catch (err) {
//       console.error('❌ Upload failed:', err);
//       Alert.alert('Upload Failed', 'There was a problem uploading your image.');
//     }
//   };

//   const hasChanges = Boolean(
//     (firstName && firstName !== initialData.first_name) ||
//       (lastName && lastName !== initialData.last_name) ||
//       (profession && profession !== initialData.profession) ||
//       (fashionLevel && fashionLevel !== initialData.fashion_level) ||
//       stripVersion(profilePicture) !==
//         stripVersion(initialData.profile_picture),
//   );

//   const handleSave = async () => {
//     console.log('[PFI SAVE] start hasChanges=', hasChanges);
//     try {
//       const dto: any = {};
//       const cleanUrl = stripVersion(profilePicture);

//       if (cleanUrl && cleanUrl !== stripVersion(initialData.profile_picture)) {
//         dto.profile_picture = cleanUrl;
//       }
//       if (firstName && firstName !== initialData.first_name)
//         dto.first_name = firstName;
//       if (lastName && lastName !== initialData.last_name)
//         dto.last_name = lastName;
//       if (profession && profession !== initialData.profession)
//         dto.profession = profession;
//       if (fashionLevel && fashionLevel !== initialData.fashion_level)
//         dto.fashion_level = fashionLevel;

//       if (Object.keys(dto).length === 0) {
//         navigate('Settings');
//         return;
//       }

//       const endpoint = userId
//         ? `${API_BASE_URL}/users/${userId}`
//         : `${API_BASE_URL}/users/auth0/${sub}`;

//       const res = await fetch(endpoint, {
//         method: 'PUT',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(dto),
//       });

//       const updated = await res.json();
//       setInitialData(updated);

//       if (updated?.profile_picture && updated.profile_picture.trim() !== '') {
//         await safeSetProfile(
//           userId || sub || 'me',
//           stripVersion(updated.profile_picture),
//           'save',
//         );
//       }
//       navigate('Settings');
//     } catch (err) {
//       console.error('Save failed', err);
//     }
//   };

//   if (loading) {
//     return (
//       <View style={[globalStyles.container, styles.centered]}>
//         <ActivityIndicator size="large" color={colors.primary} />
//       </View>
//     );
//   }

//   const displayUrl = profilePicture
//     ? `${stripVersion(profilePicture)}?v=${Date.now()}`
//     : null;

//   return (
//     <Animated.ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: colors.background, opacity: fadeAnim},
//       ]}
//       contentContainerStyle={styles.content}>
//       <Text style={[styles.title, {color: colors.primary}]}>
//         Personal Information
//       </Text>

//       <View style={styles.avatarContainer}>
//         {displayUrl ? (
//           <Image
//             source={{uri: displayUrl}}
//             style={styles.avatar}
//             resizeMode="cover"
//           />
//         ) : (
//           <View style={[styles.avatar, styles.avatarPlaceholder]} />
//         )}

//         <AppleTouchFeedback
//           onPress={pickImage}
//           hapticStyle="impactLight"
//           style={[globalStyles.buttonPrimary, styles.photoButton]}>
//           <Text style={globalStyles.buttonPrimaryText}>Change Photo</Text>
//         </AppleTouchFeedback>
//       </View>

//       <View style={styles.formCard}>
//         <Text style={[styles.label, {color: colors.foreground}]}>
//           First Name
//         </Text>
//         <TextInput
//           value={firstName}
//           onChangeText={setFirstName}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your first name"
//           placeholderTextColor={colors.muted}
//         />

//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Last Name
//         </Text>
//         <TextInput
//           value={lastName}
//           onChangeText={setLastName}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your last name"
//           placeholderTextColor={colors.muted}
//         />

//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Profession
//         </Text>
//         <TextInput
//           value={profession}
//           onChangeText={setProfession}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your profession"
//           placeholderTextColor={colors.muted}
//         />
//       </View>

//       <View style={styles.buttonRow}>
//         <AppleTouchFeedback
//           onPress={hasChanges ? handleSave : () => {}}
//           hapticStyle="impactMedium"
//           style={[
//             globalStyles.buttonPrimary,
//             {width: 120, opacity: hasChanges ? 1 : 0.5},
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>Save</Text>
//         </AppleTouchFeedback>

//         <View style={{width: 12}} />

//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={[
//             globalStyles.buttonPrimary,
//             {width: 120, backgroundColor: 'grey'},
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
//         </AppleTouchFeedback>
//       </View>
//     </Animated.ScrollView>
//   );
// }

///////////////////

// WORKS FOR IMAGE CHANGE BELOW ON REAL PHONE BUT NOT SIMULATOR

// import React, {useState, useEffect, useRef} from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   Image,
//   StyleSheet,
//   ActivityIndicator,
//   Animated,
//   PermissionsAndroid,
//   Platform,
//   Alert,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import * as ImagePicker from 'react-native-image-picker';
// import {API_BASE_URL} from '../config/api';
// import {useUUID} from '../context/UUIDContext';
// import {useAuth0} from 'react-native-auth0';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const STORAGE_KEY = (uid: string) => `profile_picture:${uid}`;

// // ✅ Fix: Always return string | null (no undefined)
// const stripVersion = (url?: string | null): string | null => {
//   if (!url) return null;
//   return url.split('?v=')[0];
// };

// export default function PersonalInformationScreen({navigate}: any) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID();
//   const {user} = useAuth0();
//   const sub = user?.sub;

//   const fadeAnim = useRef(new Animated.Value(0)).current;
//   useEffect(() => {
//     Animated.timing(fadeAnim, {
//       toValue: 1,
//       duration: 700,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   const styles = StyleSheet.create({
//     centered: {justifyContent: 'center', alignItems: 'center'},
//     content: {padding: 24, paddingBottom: 60},
//     title: {
//       fontSize: 28,
//       fontWeight: '700',
//       textAlign: 'center',
//       marginBottom: 28,
//     },
//     avatarContainer: {alignItems: 'center', marginBottom: 32},
//     avatar: {width: 120, height: 120, borderRadius: 60, marginBottom: 14},
//     avatarPlaceholder: {
//       backgroundColor: theme.colors.surface,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     photoButton: {paddingHorizontal: 22, borderRadius: 50},
//     formCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       padding: 18,
//       marginBottom: 32,
//       shadowColor: '#000',
//       shadowOpacity: 0.08,
//       shadowRadius: 12,
//       shadowOffset: {width: 0, height: 4},
//     },
//     label: {fontSize: 15, fontWeight: '600', marginTop: 12, marginBottom: 6},
//     input: {
//       borderWidth: theme.borderWidth.lg,
//       borderRadius: 10,
//       padding: 14,
//       fontSize: 16,
//       backgroundColor: theme.colors.surface3,
//       borderColor: theme.colors.surfaceBorder,
//       marginBottom: 10,
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//   });

//   const [firstName, setFirstName] = useState('');
//   const [lastName, setLastName] = useState('');
//   const [profession, setProfession] = useState('');
//   const [fashionLevel, setFashionLevel] = useState('');
//   const [profilePicture, setProfilePicture] = useState<string | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [initialData, setInitialData] = useState<any>({});

//   const requestMediaPermission = async () => {
//     if (Platform.OS === 'android') {
//       await PermissionsAndroid.requestMultiple([
//         PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES ||
//           PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
//         PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
//       ]);
//     }
//   };

//   const uriToBlob = (uri: string): Promise<Blob> =>
//     new Promise((resolve, reject) => {
//       const xhr = new XMLHttpRequest();
//       xhr.onload = () => resolve(xhr.response);
//       xhr.onerror = () => reject(new Error('Failed to convert URI to blob'));
//       xhr.responseType = 'blob';
//       xhr.open('GET', uri, true);
//       xhr.send(null);
//     });

//   const safeSetProfile = async (
//     uid: string,
//     url: string | null,
//     source: string,
//   ) => {
//     const clean = stripVersion(url);
//     console.log('[PFI S] safeSetProfile from', source, '->', clean);

//     if (clean) {
//       setProfilePicture(clean); // ✅ Always update state immediately
//       if (uid) {
//         await AsyncStorage.setItem(STORAGE_KEY(uid), clean).catch(() => {});
//       }
//     }
//   };

//   // ---------- hydrate from storage early ----------
//   useEffect(() => {
//     (async () => {
//       if (!userId) return;
//       try {
//         const cached = await AsyncStorage.getItem(STORAGE_KEY(userId));
//         console.log('[PFI BOOT] cached =', cached);
//         if (cached) setProfilePicture(cached);
//       } catch {}
//     })();
//   }, [userId]);

//   // ---------- fetch user ----------
//   useEffect(() => {
//     const fetchUser = async () => {
//       if (!userId && !sub) return;

//       const endpoint = userId
//         ? `${API_BASE_URL}/users/${userId}`
//         : sub
//         ? `${API_BASE_URL}/users/auth0/${sub}`
//         : null;

//       if (!endpoint) return;

//       console.log('[USR F1] GET', endpoint);
//       try {
//         const res = await fetch(endpoint);
//         const data = await res.json();
//         console.log('[USR F1] ok', {
//           id: data?.id,
//           profile_picture: data?.profile_picture,
//         });

//         setInitialData(data || {});
//         setFirstName(data?.first_name || '');
//         setLastName(data?.last_name || '');
//         setProfession(data?.profession || '');
//         setFashionLevel(data?.fashion_level || '');

//         // ✅ Only update profile if server has a real URL
//         if (data?.profile_picture && data.profile_picture.trim() !== '') {
//           await safeSetProfile(
//             userId || sub || 'me',
//             stripVersion(data.profile_picture),
//             'server',
//           );
//         } else {
//           console.log(
//             '[USR F1] Skipping safeSetProfile — server returned no profile picture',
//           );
//         }
//       } catch (err) {
//         console.error('Failed to load user info', err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchUser();
//   }, [userId, sub]);

//   // ---------- pick + upload ----------
//   const pickImage = async () => {
//     try {
//       console.log('[PFI] pickImage:start');
//       await requestMediaPermission();

//       const result = await ImagePicker.launchImageLibrary({
//         mediaType: 'photo',
//         quality: 1,
//         selectionLimit: 1,
//       });

//       const asset = result?.assets?.[0];
//       const localUri = asset?.uri;
//       const filename = asset?.fileName || 'profile.jpg';
//       const type = asset?.type || 'image/jpeg';

//       console.log('[PFI] picker:result', {
//         didCancel: result?.didCancel,
//         uri: localUri,
//         name: filename,
//         type,
//       });

//       if (result?.didCancel || !localUri) return;

//       // Temporary preview while upload runs
//       setProfilePicture(localUri);

//       // 🔐 Step 1: Presigned URL
//       const presignUrl = `${API_BASE_URL}/profile-upload/presign?userId=${userId}&filename=${encodeURIComponent(
//         filename,
//       )}&contentType=${encodeURIComponent(type)}`;
//       const presignRes = await fetch(presignUrl);
//       if (!presignRes.ok) throw new Error('Failed to get presigned URL');
//       const {uploadUrl, publicUrl, objectKey} = await presignRes.json();

//       // 📤 Step 2: Upload binary
//       const fileResp = await fetch(localUri);
//       const blob = await fileResp.blob(); // ✅ Works on iOS & Android

//       console.log('[PFI] 📡 Upload URL:', uploadUrl);
//       console.log('[PFI] 📡 Public URL (expected GCS):', publicUrl);

//       const uploadRes = await fetch(uploadUrl, {
//         method: 'PUT',
//         headers: {'Content-Type': type},
//         body: blob,
//       });

//       console.log('[PFI] 📡 Upload URL:', uploadUrl);
//       console.log('[PFI] 📡 Public URL (expected GCS):', publicUrl);

//       if (!uploadRes.ok)
//         throw new Error(`GCS upload failed: ${uploadRes.status}`);

//       console.log('[PFI] ✅ Upload complete');

//       // 🧠 Step 3: Save to DB
//       const completeRes = await fetch(
//         `${API_BASE_URL}/profile-upload/complete`,
//         {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({
//             user_id: userId,
//             image_url: stripVersion(publicUrl),
//             object_key: objectKey,
//           }),
//         },
//       );

//       if (!completeRes.ok) throw new Error('Failed to save profile picture');
//       console.log('[PFI] ✅ Backend save complete:', publicUrl);

//       // ✅ Step 4: Swap file:// for GCS URL
//       await safeSetProfile(
//         userId || sub || 'me',
//         stripVersion(publicUrl),
//         'final',
//       );
//     } catch (err) {
//       console.error('❌ Upload failed:', err);
//       Alert.alert('Upload Failed', 'There was a problem uploading your image.');
//     }
//   };

//   const hasChanges = Boolean(
//     (firstName && firstName !== initialData.first_name) ||
//       (lastName && lastName !== initialData.last_name) ||
//       (profession && profession !== initialData.profession) ||
//       (fashionLevel && fashionLevel !== initialData.fashion_level) ||
//       stripVersion(profilePicture) !==
//         stripVersion(initialData.profile_picture),
//   );

//   const handleSave = async () => {
//     console.log('[PFI SAVE] start hasChanges=', hasChanges);
//     try {
//       const dto: any = {};
//       const cleanUrl = stripVersion(profilePicture);

//       if (cleanUrl && cleanUrl !== stripVersion(initialData.profile_picture)) {
//         dto.profile_picture = cleanUrl;
//       }
//       if (firstName && firstName !== initialData.first_name)
//         dto.first_name = firstName;
//       if (lastName && lastName !== initialData.last_name)
//         dto.last_name = lastName;
//       if (profession && profession !== initialData.profession)
//         dto.profession = profession;
//       if (fashionLevel && fashionLevel !== initialData.fashion_level)
//         dto.fashion_level = fashionLevel;

//       if (Object.keys(dto).length === 0) {
//         navigate('Settings');
//         return;
//       }

//       const endpoint = userId
//         ? `${API_BASE_URL}/users/${userId}`
//         : `${API_BASE_URL}/users/auth0/${sub}`;

//       const res = await fetch(endpoint, {
//         method: 'PUT',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(dto),
//       });

//       const updated = await res.json();
//       setInitialData(updated);

//       if (updated?.profile_picture && updated.profile_picture.trim() !== '') {
//         await safeSetProfile(
//           userId || sub || 'me',
//           stripVersion(updated.profile_picture),
//           'save',
//         );
//       }
//       navigate('Settings');
//     } catch (err) {
//       console.error('Save failed', err);
//     }
//   };

//   if (loading) {
//     return (
//       <View style={[globalStyles.container, styles.centered]}>
//         <ActivityIndicator size="large" color={colors.primary} />
//       </View>
//     );
//   }

//   const displayUrl = profilePicture
//     ? `${stripVersion(profilePicture)}?v=${Date.now()}`
//     : null;

//   return (
//     <Animated.ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: colors.background, opacity: fadeAnim},
//       ]}
//       contentContainerStyle={styles.content}>
//       <Text style={[styles.title, {color: colors.primary}]}>
//         Personal Information
//       </Text>

//       <View style={styles.avatarContainer}>
//         {displayUrl ? (
//           <Image
//             source={{uri: displayUrl}}
//             style={styles.avatar}
//             resizeMode="cover"
//           />
//         ) : (
//           <View style={[styles.avatar, styles.avatarPlaceholder]} />
//         )}

//         <AppleTouchFeedback
//           onPress={pickImage}
//           hapticStyle="impactLight"
//           style={[globalStyles.buttonPrimary, styles.photoButton]}>
//           <Text style={globalStyles.buttonPrimaryText}>Change Photo</Text>
//         </AppleTouchFeedback>
//       </View>

//       <View style={styles.formCard}>
//         <Text style={[styles.label, {color: colors.foreground}]}>
//           First Name
//         </Text>
//         <TextInput
//           value={firstName}
//           onChangeText={setFirstName}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your first name"
//           placeholderTextColor={colors.muted}
//         />

//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Last Name
//         </Text>
//         <TextInput
//           value={lastName}
//           onChangeText={setLastName}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your last name"
//           placeholderTextColor={colors.muted}
//         />

//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Profession
//         </Text>
//         <TextInput
//           value={profession}
//           onChangeText={setProfession}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your profession"
//           placeholderTextColor={colors.muted}
//         />
//       </View>

//       <View style={styles.buttonRow}>
//         <AppleTouchFeedback
//           onPress={hasChanges ? handleSave : () => {}}
//           hapticStyle="impactMedium"
//           style={[
//             globalStyles.buttonPrimary,
//             {width: 120, opacity: hasChanges ? 1 : 0.5},
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>Save</Text>
//         </AppleTouchFeedback>

//         <View style={{width: 12}} />

//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={[
//             globalStyles.buttonPrimary,
//             {width: 120, backgroundColor: 'grey'},
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
//         </AppleTouchFeedback>
//       </View>
//     </Animated.ScrollView>
//   );
// }

///////////////////

// import React, {useState, useEffect, useRef} from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   Image,
//   StyleSheet,
//   ActivityIndicator,
//   Animated,
//   PermissionsAndroid,
//   Platform,
//   Alert,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import * as ImagePicker from 'react-native-image-picker';
// import {API_BASE_URL} from '../config/api';
// import {useUUID} from '../context/UUIDContext';
// import {useAuth0} from 'react-native-auth0';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const STORAGE_KEY = (uid: string) => `profile_picture:${uid}`;

// const stripVersion = (url?: string | null) => {
//   if (!url) return url;
//   return url.split('?v=')[0];
// };

// export default function PersonalInformationScreen({navigate}: any) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID();
//   const {user} = useAuth0();
//   const sub = user?.sub;

//   const fadeAnim = useRef(new Animated.Value(0)).current;
//   useEffect(() => {
//     Animated.timing(fadeAnim, {
//       toValue: 1,
//       duration: 700,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   const styles = StyleSheet.create({
//     centered: {justifyContent: 'center', alignItems: 'center'},
//     content: {padding: 24, paddingBottom: 60},
//     title: {
//       fontSize: 28,
//       fontWeight: '700',
//       textAlign: 'center',
//       marginBottom: 28,
//     },
//     avatarContainer: {alignItems: 'center', marginBottom: 32},
//     avatar: {width: 120, height: 120, borderRadius: 60, marginBottom: 14},
//     avatarPlaceholder: {
//       backgroundColor: theme.colors.surface,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     photoButton: {paddingHorizontal: 22, borderRadius: 50},
//     formCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       padding: 18,
//       marginBottom: 32,
//       shadowColor: '#000',
//       shadowOpacity: 0.08,
//       shadowRadius: 12,
//       shadowOffset: {width: 0, height: 4},
//     },
//     label: {fontSize: 15, fontWeight: '600', marginTop: 12, marginBottom: 6},
//     input: {
//       borderWidth: theme.borderWidth.lg,
//       borderRadius: 10,
//       padding: 14,
//       fontSize: 16,
//       backgroundColor: theme.colors.surface3,
//       borderColor: theme.colors.surfaceBorder,
//       marginBottom: 10,
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//   });

//   const [firstName, setFirstName] = useState('');
//   const [lastName, setLastName] = useState('');
//   const [profession, setProfession] = useState('');
//   const [fashionLevel, setFashionLevel] = useState('');
//   const [profilePicture, setProfilePicture] = useState<string | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [initialData, setInitialData] = useState<any>({});

//   const requestMediaPermission = async () => {
//     if (Platform.OS === 'android') {
//       await PermissionsAndroid.requestMultiple([
//         PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES ||
//           PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
//         PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
//       ]);
//     }
//   };

//   const uriToBlob = (uri: string): Promise<Blob> =>
//     new Promise((resolve, reject) => {
//       const xhr = new XMLHttpRequest();
//       xhr.onload = () => resolve(xhr.response);
//       xhr.onerror = () => reject(new Error('Failed to convert URI to blob'));
//       xhr.responseType = 'blob';
//       xhr.open('GET', uri, true);
//       xhr.send(null);
//     });

//   // const safeSetProfile = async (
//   //   uid: string,
//   //   url: string | null,
//   //   source: string,
//   // ) => {
//   //   const clean = stripVersion(url);
//   //   console.log('[PFI S] safeSetProfile from', source, '->', clean);
//   //   setProfilePicture(prev => {
//   //     if (!prev) return clean;
//   //     const prevIsLocal = prev.startsWith('file://');
//   //     const incomingIsLocal = !!clean && clean.startsWith('file://');
//   //     if (prevIsLocal && !incomingIsLocal) return clean;
//   //     if (incomingIsLocal) return prev;
//   //     return clean ?? prev;
//   //   });
//   //   if (clean && uid) {
//   //     await AsyncStorage.setItem(STORAGE_KEY(uid), clean).catch(() => {});
//   //   }
//   // };

//   const safeSetProfile = async (
//     uid: string,
//     url: string | null,
//     source: string,
//   ) => {
//     const clean = stripVersion(url);
//     console.log('[PFI S] safeSetProfile from', source, '->', clean);

//     if (clean) {
//       setProfilePicture(clean); // ✅ Always update state immediately
//       if (uid) {
//         await AsyncStorage.setItem(STORAGE_KEY(uid), clean).catch(() => {});
//       }
//     }
//   };

//   // ---------- hydrate from storage early ----------
//   useEffect(() => {
//     (async () => {
//       if (!userId) return;
//       try {
//         const cached = await AsyncStorage.getItem(STORAGE_KEY(userId));
//         console.log('[PFI BOOT] cached =', cached);
//         if (cached) setProfilePicture(cached);
//       } catch {}
//     })();
//   }, [userId]);

//   // ---------- fetch user ----------
//   useEffect(() => {
//     const fetchUser = async () => {
//       if (!userId && !sub) return;

//       const endpoint = userId
//         ? `${API_BASE_URL}/users/${userId}`
//         : sub
//         ? `${API_BASE_URL}/users/auth0/${sub}`
//         : null;

//       if (!endpoint) return;

//       console.log('[USR F1] GET', endpoint);
//       try {
//         const res = await fetch(endpoint);
//         const data = await res.json();
//         console.log('[USR F1] ok', {
//           id: data?.id,
//           profile_picture: data?.profile_picture,
//         });

//         setInitialData(data || {});
//         setFirstName(data?.first_name || '');
//         setLastName(data?.last_name || '');
//         setProfession(data?.profession || '');
//         setFashionLevel(data?.fashion_level || '');

//         // ✅ Only update profile if server has a real URL
//         if (data?.profile_picture && data.profile_picture.trim() !== '') {
//           await safeSetProfile(
//             userId || sub || 'me',
//             stripVersion(data.profile_picture),
//             'server',
//           );
//         } else {
//           console.log(
//             '[USR F1] Skipping safeSetProfile — server returned no profile picture',
//           );
//         }
//       } catch (err) {
//         console.error('Failed to load user info', err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchUser();
//   }, [userId, sub]);

//   // ---------- pick + upload ----------
//   // const pickImage = async () => {
//   //   try {
//   //     console.log('[PFI 1] pickImage:start');
//   //     await requestMediaPermission();

//   //     const result = await ImagePicker.launchImageLibrary({
//   //       mediaType: 'photo',
//   //       quality: 1,
//   //       selectionLimit: 1,
//   //     });

//   //     const asset = result?.assets?.[0];
//   //     const localUri = asset?.uri;
//   //     const filename = asset?.fileName || 'profile.jpg';
//   //     const type = asset?.type || 'image/jpeg';

//   //     console.log('[PFI 1] picker:result', {
//   //       didCancel: result?.didCancel,
//   //       uri: localUri,
//   //       name: filename,
//   //       type,
//   //     });
//   //     if (result?.didCancel || !localUri) return;

//   //     await safeSetProfile(userId || sub || 'me', localUri, 'local');

//   //     const presignUrl = `${API_BASE_URL}/profile-upload/presign?userId=${userId}&filename=${encodeURIComponent(
//   //       filename,
//   //     )}&contentType=${encodeURIComponent(type)}`;
//   //     const presignRes = await fetch(presignUrl);
//   //     const {uploadUrl, publicUrl, objectKey} = await presignRes.json();

//   //     const blob = await uriToBlob(localUri);
//   //     const uploadRes = await fetch(uploadUrl, {
//   //       method: 'PUT',
//   //       headers: {'Content-Type': type},
//   //       body: blob,
//   //     });
//   //     if (!uploadRes.ok)
//   //       throw new Error(`GCS upload failed: ${uploadRes.status}`);

//   //     const completeUrl = `${API_BASE_URL}/profile-upload/complete`;
//   //     await fetch(completeUrl, {
//   //       method: 'POST',
//   //       headers: {'Content-Type': 'application/json'},
//   //       body: JSON.stringify({
//   //         user_id: userId,
//   //         image_url: stripVersion(publicUrl),
//   //         object_key: objectKey,
//   //       }),
//   //     });

//   //     await safeSetProfile(
//   //       userId || sub || 'me',
//   //       stripVersion(publicUrl),
//   //       'final',
//   //     );
//   //   } catch (err) {
//   //     console.error('❌ Upload failed:', err);
//   //     Alert.alert('Upload Failed', 'There was an issue uploading your photo.');
//   //   }
//   // };

//   const pickImage = async () => {
//     try {
//       console.log('[PFI] pickImage:start');
//       await requestMediaPermission();

//       const result = await ImagePicker.launchImageLibrary({
//         mediaType: 'photo',
//         quality: 1,
//         selectionLimit: 1,
//       });

//       const asset = result?.assets?.[0];
//       const localUri = asset?.uri;
//       const filename = asset?.fileName || 'profile.jpg';
//       const type = asset?.type || 'image/jpeg';

//       console.log('[PFI] picker:result', {
//         didCancel: result?.didCancel,
//         uri: localUri,
//         name: filename,
//         type,
//       });

//       if (result?.didCancel || !localUri) return;

//       // 🟡 TEMP preview only (don't save file:// to AsyncStorage or DB)
//       setProfilePicture(localUri);

//       // 🔐 Step 1: Request presigned upload URL
//       const presignUrl = `${API_BASE_URL}/profile-upload/presign?userId=${userId}&filename=${encodeURIComponent(
//         filename,
//       )}&contentType=${encodeURIComponent(type)}`;
//       const presignRes = await fetch(presignUrl);
//       if (!presignRes.ok) throw new Error('Failed to get presigned URL');
//       const {uploadUrl, publicUrl, objectKey} = await presignRes.json();

//       // 📤 Step 2: Upload to GCS
//       const blob = await uriToBlob(localUri);
//       const uploadRes = await fetch(uploadUrl, {
//         method: 'PUT',
//         headers: {'Content-Type': type},
//         body: blob,
//       });
//       if (!uploadRes.ok)
//         throw new Error(`GCS upload failed: ${uploadRes.status}`);

//       console.log('[PFI] ✅ Upload complete');

//       // 🧠 Step 3: Tell backend to save URL
//       const completeRes = await fetch(
//         `${API_BASE_URL}/profile-upload/complete`,
//         {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({
//             user_id: userId,
//             image_url: stripVersion(publicUrl),
//             object_key: objectKey,
//           }),
//         },
//       );
//       if (!completeRes.ok) throw new Error('Failed to save profile picture');

//       console.log('[PFI] ✅ Backend save complete:', publicUrl);

//       // ✅ Step 4: Replace temp file:// with final GCS URL
//       await safeSetProfile(
//         userId || sub || 'me',
//         stripVersion(publicUrl),
//         'final',
//       );
//     } catch (err) {
//       console.error('❌ Upload failed:', err);
//       Alert.alert('Upload Failed', 'There was a problem uploading your image.');
//     }
//   };

//   const hasChanges = Boolean(
//     (firstName && firstName !== initialData.first_name) ||
//       (lastName && lastName !== initialData.last_name) ||
//       (profession && profession !== initialData.profession) ||
//       (fashionLevel && fashionLevel !== initialData.fashion_level) ||
//       stripVersion(profilePicture) !==
//         stripVersion(initialData.profile_picture),
//   );

//   const handleSave = async () => {
//     console.log('[PFI SAVE] start hasChanges=', hasChanges);
//     try {
//       const dto: any = {};
//       const cleanUrl = stripVersion(profilePicture);

//       if (cleanUrl && cleanUrl !== stripVersion(initialData.profile_picture)) {
//         dto.profile_picture = cleanUrl;
//       }
//       if (firstName && firstName !== initialData.first_name)
//         dto.first_name = firstName;
//       if (lastName && lastName !== initialData.last_name)
//         dto.last_name = lastName;
//       if (profession && profession !== initialData.profession)
//         dto.profession = profession;
//       if (fashionLevel && fashionLevel !== initialData.fashion_level)
//         dto.fashion_level = fashionLevel;

//       if (Object.keys(dto).length === 0) {
//         navigate('Settings');
//         return;
//       }

//       const endpoint = userId
//         ? `${API_BASE_URL}/users/${userId}`
//         : `${API_BASE_URL}/users/auth0/${sub}`;

//       const res = await fetch(endpoint, {
//         method: 'PUT',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(dto),
//       });

//       const updated = await res.json();
//       setInitialData(updated);

//       // ✅ Only set profile if the response actually has one
//       if (updated?.profile_picture && updated.profile_picture.trim() !== '') {
//         await safeSetProfile(
//           userId || sub || 'me',
//           stripVersion(updated.profile_picture),
//           'save',
//         );
//       }
//       navigate('Settings');
//     } catch (err) {
//       console.error('Save failed', err);
//     }
//   };

//   if (loading) {
//     return (
//       <View style={[globalStyles.container, styles.centered]}>
//         <ActivityIndicator size="large" color={colors.primary} />
//       </View>
//     );
//   }

//   const displayUrl = profilePicture
//     ? `${stripVersion(profilePicture)}?v=${Date.now()}`
//     : null;

//   return (
//     <Animated.ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: colors.background, opacity: fadeAnim},
//       ]}
//       contentContainerStyle={styles.content}>
//       <Text style={[styles.title, {color: colors.primary}]}>
//         Personal Information
//       </Text>

//       <View style={styles.avatarContainer}>
//         {displayUrl ? (
//           <Image
//             source={{uri: displayUrl}}
//             style={styles.avatar}
//             resizeMode="cover"
//           />
//         ) : (
//           <View style={[styles.avatar, styles.avatarPlaceholder]} />
//         )}

//         <AppleTouchFeedback
//           onPress={pickImage}
//           hapticStyle="impactLight"
//           style={[globalStyles.buttonPrimary, styles.photoButton]}>
//           <Text style={globalStyles.buttonPrimaryText}>Change Photo</Text>
//         </AppleTouchFeedback>
//       </View>

//       <View style={styles.formCard}>
//         <Text style={[styles.label, {color: colors.foreground}]}>
//           First Name
//         </Text>
//         <TextInput
//           value={firstName}
//           onChangeText={setFirstName}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your first name"
//           placeholderTextColor={colors.muted}
//         />

//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Last Name
//         </Text>
//         <TextInput
//           value={lastName}
//           onChangeText={setLastName}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your last name"
//           placeholderTextColor={colors.muted}
//         />

//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Profession
//         </Text>
//         <TextInput
//           value={profession}
//           onChangeText={setProfession}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your profession"
//           placeholderTextColor={colors.muted}
//         />
//       </View>

//       <View style={styles.buttonRow}>
//         <AppleTouchFeedback
//           onPress={hasChanges ? handleSave : () => {}}
//           hapticStyle="impactMedium"
//           style={[
//             globalStyles.buttonPrimary,
//             {width: 120, opacity: hasChanges ? 1 : 0.5},
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>Save</Text>
//         </AppleTouchFeedback>

//         <View style={{width: 12}} />

//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={[
//             globalStyles.buttonPrimary,
//             {width: 120, backgroundColor: 'grey'},
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
//         </AppleTouchFeedback>
//       </View>
//     </Animated.ScrollView>
//   );
// }

/////////////////////

// import React, {useState, useEffect, useRef} from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   Image,
//   StyleSheet,
//   ActivityIndicator,
//   Animated,
//   PermissionsAndroid,
//   Platform,
//   Alert,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import * as ImagePicker from 'react-native-image-picker';
// import {API_BASE_URL} from '../config/api';
// import {useUUID} from '../context/UUIDContext';
// import {useAuth0} from 'react-native-auth0';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const STORAGE_KEY = (uid: string) => `profile_picture:${uid}`;

// const stripVersion = (url?: string | null) => {
//   if (!url) return url;
//   return url.split('?v=')[0];
// };

// export default function PersonalInformationScreen({navigate}: any) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID();
//   const {user} = useAuth0();
//   const sub = user?.sub;

//   const fadeAnim = useRef(new Animated.Value(0)).current;
//   useEffect(() => {
//     Animated.timing(fadeAnim, {
//       toValue: 1,
//       duration: 700,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   const styles = StyleSheet.create({
//     centered: {justifyContent: 'center', alignItems: 'center'},
//     content: {padding: 24, paddingBottom: 60},
//     title: {
//       fontSize: 28,
//       fontWeight: '700',
//       textAlign: 'center',
//       marginBottom: 28,
//     },
//     avatarContainer: {alignItems: 'center', marginBottom: 32},
//     avatar: {width: 120, height: 120, borderRadius: 60, marginBottom: 14},
//     avatarPlaceholder: {
//       backgroundColor: theme.colors.surface,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     photoButton: {paddingHorizontal: 22, borderRadius: 50},
//     formCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       padding: 18,
//       marginBottom: 32,
//       shadowColor: '#000',
//       shadowOpacity: 0.08,
//       shadowRadius: 12,
//       shadowOffset: {width: 0, height: 4},
//     },
//     label: {fontSize: 15, fontWeight: '600', marginTop: 12, marginBottom: 6},
//     input: {
//       borderWidth: theme.borderWidth.lg,
//       borderRadius: 10,
//       padding: 14,
//       fontSize: 16,
//       backgroundColor: theme.colors.surface3,
//       borderColor: theme.colors.surfaceBorder,
//       marginBottom: 10,
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//   });

//   const [firstName, setFirstName] = useState('');
//   const [lastName, setLastName] = useState('');
//   const [profession, setProfession] = useState('');
//   const [fashionLevel, setFashionLevel] = useState('');
//   const [profilePicture, setProfilePicture] = useState<string | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [initialData, setInitialData] = useState<any>({});

//   const requestMediaPermission = async () => {
//     if (Platform.OS === 'android') {
//       await PermissionsAndroid.requestMultiple([
//         PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES ||
//           PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
//         PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
//       ]);
//     }
//   };

//   const uriToBlob = (uri: string): Promise<Blob> =>
//     new Promise((resolve, reject) => {
//       const xhr = new XMLHttpRequest();
//       xhr.onload = () => resolve(xhr.response);
//       xhr.onerror = () => reject(new Error('Failed to convert URI to blob'));
//       xhr.responseType = 'blob';
//       xhr.open('GET', uri, true);
//       xhr.send(null);
//     });

//   // const safeSetProfile = async (
//   //   uid: string,
//   //   url: string | null,
//   //   source: string,
//   // ) => {
//   //   const clean = stripVersion(url);
//   //   console.log('[PFI S] safeSetProfile from', source, '->', clean);
//   //   setProfilePicture(prev => {
//   //     if (!prev) return clean;
//   //     const prevIsLocal = prev.startsWith('file://');
//   //     const incomingIsLocal = !!clean && clean.startsWith('file://');
//   //     if (prevIsLocal && !incomingIsLocal) return clean;
//   //     if (incomingIsLocal) return prev;
//   //     return clean ?? prev;
//   //   });
//   //   if (clean && uid) {
//   //     await AsyncStorage.setItem(STORAGE_KEY(uid), clean).catch(() => {});
//   //   }
//   // };

//   const safeSetProfile = async (
//     uid: string,
//     url: string | null,
//     source: string,
//   ) => {
//     const clean = stripVersion(url);
//     console.log('[PFI S] safeSetProfile from', source, '->', clean);

//     if (clean) {
//       setProfilePicture(clean); // ✅ Always update state immediately
//       if (uid) {
//         await AsyncStorage.setItem(STORAGE_KEY(uid), clean).catch(() => {});
//       }
//     }
//   };

//   // ---------- hydrate from storage early ----------
//   useEffect(() => {
//     (async () => {
//       if (!userId) return;
//       try {
//         const cached = await AsyncStorage.getItem(STORAGE_KEY(userId));
//         console.log('[PFI BOOT] cached =', cached);
//         if (cached) setProfilePicture(cached);
//       } catch {}
//     })();
//   }, [userId]);

//   // ---------- fetch user ----------
//   useEffect(() => {
//     const fetchUser = async () => {
//       if (!userId && !sub) return;

//       const endpoint = userId
//         ? `${API_BASE_URL}/users/${userId}`
//         : sub
//         ? `${API_BASE_URL}/users/auth0/${sub}`
//         : null;

//       if (!endpoint) return;

//       console.log('[USR F1] GET', endpoint);
//       try {
//         const res = await fetch(endpoint);
//         const data = await res.json();
//         console.log('[USR F1] ok', {
//           id: data?.id,
//           profile_picture: data?.profile_picture,
//         });

//         setInitialData(data || {});
//         setFirstName(data?.first_name || '');
//         setLastName(data?.last_name || '');
//         setProfession(data?.profession || '');
//         setFashionLevel(data?.fashion_level || '');

//         // ✅ Only update profile if server has a real URL
//         if (data?.profile_picture && data.profile_picture.trim() !== '') {
//           await safeSetProfile(
//             userId || sub || 'me',
//             stripVersion(data.profile_picture),
//             'server',
//           );
//         } else {
//           console.log(
//             '[USR F1] Skipping safeSetProfile — server returned no profile picture',
//           );
//         }
//       } catch (err) {
//         console.error('Failed to load user info', err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchUser();
//   }, [userId, sub]);

//   // ---------- pick + upload ----------
//   const pickImage = async () => {
//     try {
//       console.log('[PFI 1] pickImage:start');
//       await requestMediaPermission();

//       const result = await ImagePicker.launchImageLibrary({
//         mediaType: 'photo',
//         quality: 1,
//         selectionLimit: 1,
//       });

//       const asset = result?.assets?.[0];
//       const localUri = asset?.uri;
//       const filename = asset?.fileName || 'profile.jpg';
//       const type = asset?.type || 'image/jpeg';

//       console.log('[PFI 1] picker:result', {
//         didCancel: result?.didCancel,
//         uri: localUri,
//         name: filename,
//         type,
//       });
//       if (result?.didCancel || !localUri) return;

//       await safeSetProfile(userId || sub || 'me', localUri, 'local');

//       const presignUrl = `${API_BASE_URL}/profile-upload/presign?userId=${userId}&filename=${encodeURIComponent(
//         filename,
//       )}&contentType=${encodeURIComponent(type)}`;
//       const presignRes = await fetch(presignUrl);
//       const {uploadUrl, publicUrl, objectKey} = await presignRes.json();

//       const blob = await uriToBlob(localUri);
//       const uploadRes = await fetch(uploadUrl, {
//         method: 'PUT',
//         headers: {'Content-Type': type},
//         body: blob,
//       });
//       if (!uploadRes.ok)
//         throw new Error(`GCS upload failed: ${uploadRes.status}`);

//       const completeUrl = `${API_BASE_URL}/profile-upload/complete`;
//       await fetch(completeUrl, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           image_url: stripVersion(publicUrl),
//           object_key: objectKey,
//         }),
//       });

//       await safeSetProfile(
//         userId || sub || 'me',
//         stripVersion(publicUrl),
//         'final',
//       );
//     } catch (err) {
//       console.error('❌ Upload failed:', err);
//       Alert.alert('Upload Failed', 'There was an issue uploading your photo.');
//     }
//   };

//   const hasChanges = Boolean(
//     (firstName && firstName !== initialData.first_name) ||
//       (lastName && lastName !== initialData.last_name) ||
//       (profession && profession !== initialData.profession) ||
//       (fashionLevel && fashionLevel !== initialData.fashion_level) ||
//       stripVersion(profilePicture) !==
//         stripVersion(initialData.profile_picture),
//   );

//   const handleSave = async () => {
//     console.log('[PFI SAVE] start hasChanges=', hasChanges);
//     try {
//       const dto: any = {};
//       const cleanUrl = stripVersion(profilePicture);

//       if (cleanUrl && cleanUrl !== stripVersion(initialData.profile_picture)) {
//         dto.profile_picture = cleanUrl;
//       }
//       if (firstName && firstName !== initialData.first_name)
//         dto.first_name = firstName;
//       if (lastName && lastName !== initialData.last_name)
//         dto.last_name = lastName;
//       if (profession && profession !== initialData.profession)
//         dto.profession = profession;
//       if (fashionLevel && fashionLevel !== initialData.fashion_level)
//         dto.fashion_level = fashionLevel;

//       if (Object.keys(dto).length === 0) {
//         navigate('Settings');
//         return;
//       }

//       const endpoint = userId
//         ? `${API_BASE_URL}/users/${userId}`
//         : `${API_BASE_URL}/users/auth0/${sub}`;

//       const res = await fetch(endpoint, {
//         method: 'PUT',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(dto),
//       });

//       const updated = await res.json();
//       setInitialData(updated);

//       // ✅ Only set profile if the response actually has one
//       if (updated?.profile_picture && updated.profile_picture.trim() !== '') {
//         await safeSetProfile(
//           userId || sub || 'me',
//           stripVersion(updated.profile_picture),
//           'save',
//         );
//       }
//       navigate('Settings');
//     } catch (err) {
//       console.error('Save failed', err);
//     }
//   };

//   if (loading) {
//     return (
//       <View style={[globalStyles.container, styles.centered]}>
//         <ActivityIndicator size="large" color={colors.primary} />
//       </View>
//     );
//   }

//   const displayUrl = profilePicture
//     ? `${stripVersion(profilePicture)}?v=${Date.now()}`
//     : null;

//   return (
//     <Animated.ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: colors.background, opacity: fadeAnim},
//       ]}
//       contentContainerStyle={styles.content}>
//       <Text style={[styles.title, {color: colors.primary}]}>
//         Personal Information
//       </Text>

//       <View style={styles.avatarContainer}>
//         {displayUrl ? (
//           <Image
//             source={{uri: displayUrl}}
//             style={styles.avatar}
//             resizeMode="cover"
//           />
//         ) : (
//           <View style={[styles.avatar, styles.avatarPlaceholder]} />
//         )}

//         <AppleTouchFeedback
//           onPress={pickImage}
//           hapticStyle="impactLight"
//           style={[globalStyles.buttonPrimary, styles.photoButton]}>
//           <Text style={globalStyles.buttonPrimaryText}>Change Photo</Text>
//         </AppleTouchFeedback>
//       </View>

//       <View style={styles.formCard}>
//         <Text style={[styles.label, {color: colors.foreground}]}>
//           First Name
//         </Text>
//         <TextInput
//           value={firstName}
//           onChangeText={setFirstName}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your first name"
//           placeholderTextColor={colors.muted}
//         />

//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Last Name
//         </Text>
//         <TextInput
//           value={lastName}
//           onChangeText={setLastName}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your last name"
//           placeholderTextColor={colors.muted}
//         />

//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Profession
//         </Text>
//         <TextInput
//           value={profession}
//           onChangeText={setProfession}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your profession"
//           placeholderTextColor={colors.muted}
//         />
//       </View>

//       <View style={styles.buttonRow}>
//         <AppleTouchFeedback
//           onPress={hasChanges ? handleSave : () => {}}
//           hapticStyle="impactMedium"
//           style={[
//             globalStyles.buttonPrimary,
//             {width: 120, opacity: hasChanges ? 1 : 0.5},
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>Save</Text>
//         </AppleTouchFeedback>

//         <View style={{width: 12}} />

//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={[
//             globalStyles.buttonPrimary,
//             {width: 120, backgroundColor: 'grey'},
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
//         </AppleTouchFeedback>
//       </View>
//     </Animated.ScrollView>
//   );
// }

//////////////////////

// // apps/frontend/screens/PersonalInformationScreen.tsx
// import React, {useState, useEffect, useRef} from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   Image,
//   StyleSheet,
//   ActivityIndicator,
//   Animated,
//   PermissionsAndroid,
//   Platform,
//   Alert,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import * as ImagePicker from 'react-native-image-picker';
// import {API_BASE_URL} from '../config/api';
// import {useUUID} from '../context/UUIDContext';
// import {useAuth0} from 'react-native-auth0';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const STORAGE_KEY = (uid: string) => `profile_picture:${uid}`;

// export default function PersonalInformationScreen({navigate}: any) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID();
//   const {user} = useAuth0();
//   const sub = user?.sub;

//   const fadeAnim = useRef(new Animated.Value(0)).current;
//   useEffect(() => {
//     Animated.timing(fadeAnim, {
//       toValue: 1,
//       duration: 700,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   const styles = StyleSheet.create({
//     centered: {justifyContent: 'center', alignItems: 'center'},
//     content: {padding: 24, paddingBottom: 60},
//     title: {
//       fontSize: 28,
//       fontWeight: '700',
//       textAlign: 'center',
//       marginBottom: 28,
//     },
//     avatarContainer: {alignItems: 'center', marginBottom: 32},
//     avatar: {width: 120, height: 120, borderRadius: 60, marginBottom: 14},
//     avatarPlaceholder: {
//       backgroundColor: theme.colors.surface,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     photoButton: {paddingHorizontal: 22, borderRadius: 50},
//     formCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       padding: 18,
//       marginBottom: 32,
//       shadowColor: '#000',
//       shadowOpacity: 0.08,
//       shadowRadius: 12,
//       shadowOffset: {width: 0, height: 4},
//     },
//     label: {fontSize: 15, fontWeight: '600', marginTop: 12, marginBottom: 6},
//     input: {
//       borderWidth: theme.borderWidth.lg,
//       borderRadius: 10,
//       padding: 14,
//       fontSize: 16,
//       backgroundColor: theme.colors.surface3,
//       borderColor: theme.colors.surfaceBorder,
//       marginBottom: 10,
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//   });

//   const [firstName, setFirstName] = useState('');
//   const [lastName, setLastName] = useState('');
//   const [profession, setProfession] = useState('');
//   const [fashionLevel, setFashionLevel] = useState('');
//   const [profilePicture, setProfilePicture] = useState<string | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [initialData, setInitialData] = useState<any>({});

//   // ---------- helpers ----------
//   const requestMediaPermission = async () => {
//     if (Platform.OS === 'android') {
//       await PermissionsAndroid.requestMultiple([
//         PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES ||
//           PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
//         PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
//       ]);
//     }
//   };

//   const uriToBlob = (uri: string): Promise<Blob> =>
//     new Promise((resolve, reject) => {
//       const xhr = new XMLHttpRequest();
//       xhr.onload = () => resolve(xhr.response);
//       xhr.onerror = () => reject(new Error('Failed to convert URI to blob'));
//       xhr.responseType = 'blob';
//       xhr.open('GET', uri, true);
//       xhr.send(null);
//     });

//   const safeSetProfile = async (
//     uid: string,
//     url: string | null,
//     source: string,
//   ) => {
//     console.log('[PFI S] safeSetProfile from', source, '->', url);
//     setProfilePicture(prev => {
//       // do not overwrite a freshly-picked local file or a more recent http url with an older value
//       if (!prev) return url;
//       const prevIsLocal = prev.startsWith('file://');
//       const incomingIsLocal = !!url && url.startsWith('file://');
//       if (prevIsLocal && !incomingIsLocal) return url; // local -> final http
//       if (incomingIsLocal) return prev; // never replace http with local accidentally
//       return url ?? prev;
//     });
//     if (url && uid) {
//       await AsyncStorage.setItem(STORAGE_KEY(uid), url).catch(() => {});
//     }
//   };

//   // ---------- hydrate from storage early ----------
//   useEffect(() => {
//     (async () => {
//       if (!userId) return;
//       try {
//         const cached = await AsyncStorage.getItem(STORAGE_KEY(userId));
//         console.log('[PFI BOOT] cached =', cached);
//         if (cached) setProfilePicture(cached);
//       } catch {}
//     })();
//   }, [userId]);

//   // ---------- fetch user from API ----------
//   useEffect(() => {
//     const fetchUser = async () => {
//       if (!userId && !sub) {
//         // don’t flip loading off yet; wait for one of them
//         return;
//       }

//       const endpoint = userId
//         ? `${API_BASE_URL}/users/${userId}`
//         : sub
//         ? `${API_BASE_URL}/users/auth0/${sub}`
//         : null;

//       if (!endpoint) return;

//       console.log('[USR F1] GET', endpoint);
//       try {
//         const res = await fetch(endpoint);
//         const data = await res.json();
//         console.log(
//           '[USR F1] ok',
//           JSON.stringify({
//             id: data?.id,
//             profile_picture: data?.profile_picture,
//           }),
//         );
//         setInitialData(data || {});
//         setFirstName(data?.first_name || '');
//         setLastName(data?.last_name || '');
//         setProfession(data?.profession || '');
//         setFashionLevel(data?.fashion_level || '');

//         if (data?.profile_picture) {
//           await safeSetProfile(
//             userId || sub || 'me',
//             data.profile_picture,
//             'server',
//           );
//         }
//       } catch (err) {
//         console.error('Failed to load user info', err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchUser();
//   }, [userId, sub]); // re-run when identifiers are ready

//   // ---------- pick + upload ----------
//   const pickImage = async () => {
//     try {
//       console.log('[PFI 1] pickImage:start');
//       await requestMediaPermission();

//       const result = await ImagePicker.launchImageLibrary({
//         mediaType: 'photo',
//         quality: 1,
//         selectionLimit: 1,
//       });

//       const asset = result?.assets?.[0];
//       const localUri = asset?.uri;
//       const filename = asset?.fileName || 'profile.jpg';
//       const type = asset?.type || 'image/jpeg';

//       console.log('[PFI 1] picker:result', {
//         didCancel: result?.didCancel,
//         uri: localUri,
//         name: filename,
//         type,
//       });
//       if (result?.didCancel || !localUri) return;

//       // show local preview immediately
//       await safeSetProfile(userId || sub || 'me', localUri, 'local');

//       // get presigned url
//       const presignUrl = `${API_BASE_URL}/profile-upload/presign?userId=${userId}&filename=${encodeURIComponent(
//         filename,
//       )}&contentType=${encodeURIComponent(type)}`;

//       console.log('[PFI 1] presign:GET', presignUrl);
//       const presignRes = await fetch(presignUrl);
//       const {uploadUrl, publicUrl, objectKey} = await presignRes.json();

//       console.log('[PFI 1] presign:ok', {
//         hasUploadUrl: !!uploadUrl,
//         publicUrl,
//         objectKey,
//       });

//       // convert to blob
//       const blob = await uriToBlob(localUri);
//       console.log('[PFI 1] uriToBlob: success');

//       // upload to GCS
//       console.log('[PFI 1] upload:PUT', uploadUrl.slice(0, 120) + '...');
//       const uploadRes = await fetch(uploadUrl, {
//         method: 'PUT',
//         headers: {'Content-Type': type},
//         body: blob,
//       });
//       if (!uploadRes.ok)
//         throw new Error(`GCS upload failed: ${uploadRes.status}`);
//       console.log('[PFI 1] upload:ok');

//       // save in DB
//       const completeUrl = `${API_BASE_URL}/profile-upload/complete`;
//       console.log('[PFI 1] complete:POST', completeUrl, {
//         user_id: userId,
//         image_url: publicUrl,
//         object_key: objectKey,
//       });

//       const saveRes = await fetch(completeUrl, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           image_url: publicUrl,
//           object_key: objectKey,
//         }),
//       });

//       const saved = await saveRes.json();
//       console.log('[PFI 1] complete:ok', saved);

//       // add cache-buster and persist
//       const finalUrl = `${publicUrl}?v=${Date.now()}`;
//       console.log('[PFI 1] ui:set public url', finalUrl);
//       await safeSetProfile(userId || sub || 'me', finalUrl, 'final');
//       console.log('[PFI 1] done');
//     } catch (err) {
//       console.error('❌ Upload failed:', err);
//       Alert.alert('Upload Failed', 'There was an issue uploading your photo.');
//     }
//   };

//   const hasChanges = Boolean(
//     (firstName && firstName !== initialData.first_name) ||
//       (lastName && lastName !== initialData.last_name) ||
//       (profession && profession !== initialData.profession) ||
//       (fashionLevel && fashionLevel !== initialData.fashion_level) ||
//       (profilePicture && profilePicture !== initialData.profile_picture),
//   );

//   const handleSave = async () => {
//     console.log('[PFI SAVE] start hasChanges=', hasChanges);
//     try {
//       const dto: any = {};
//       if (firstName && firstName !== initialData.first_name)
//         dto.first_name = firstName;
//       if (lastName && lastName !== initialData.last_name)
//         dto.last_name = lastName;
//       if (profession && profession !== initialData.profession)
//         dto.profession = profession;
//       if (fashionLevel && fashionLevel !== initialData.fashion_level)
//         dto.fashion_level = fashionLevel;

//       if (Object.keys(dto).length === 0) {
//         console.log('[PFI SAVE] nothing to update');
//         navigate('Settings');
//         return;
//       }

//       const endpoint = userId
//         ? `${API_BASE_URL}/users/${userId}`
//         : `${API_BASE_URL}/users/auth0/${sub}`;

//       console.log('[PFI SAVE] PUT', endpoint, dto);
//       const res = await fetch(endpoint, {
//         method: 'PUT',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(dto),
//       });

//       if (!res.ok) {
//         console.error('❌ Failed to update user info', res.status);
//         return;
//       }

//       const updated = await res.json();
//       console.log('[PFI SAVE] ok ->', {
//         profile_picture: updated?.profile_picture,
//       });
//       setInitialData(updated);

//       if (updated?.profile_picture) {
//         await safeSetProfile(
//           userId || sub || 'me',
//           updated.profile_picture,
//           'save',
//         );
//       }
//       navigate('Settings');
//     } catch (err) {
//       console.error('Save failed', err);
//     }
//   };

//   // ---------- UI ----------
//   if (loading) {
//     return (
//       <View style={[globalStyles.container, styles.centered]}>
//         <ActivityIndicator size="large" color={colors.primary} />
//       </View>
//     );
//   }

//   return (
//     <Animated.ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: colors.background, opacity: fadeAnim},
//       ]}
//       contentContainerStyle={styles.content}>
//       <Text style={[styles.title, {color: colors.primary}]}>
//         Personal Information
//       </Text>

//       {/* Profile Picture */}
//       <View style={styles.avatarContainer}>
//         {profilePicture ? (
//           <Image
//             source={{uri: profilePicture}}
//             style={styles.avatar}
//             resizeMode="cover"
//             onLoad={() => console.log('[IMG] onLoad', profilePicture)}
//             onError={e =>
//               console.log('[IMG] onError', profilePicture, e?.nativeEvent)
//             }
//           />
//         ) : (
//           <View style={[styles.avatar, styles.avatarPlaceholder]} />
//         )}
//         <AppleTouchFeedback
//           onPress={pickImage}
//           hapticStyle="impactLight"
//           style={[globalStyles.buttonPrimary, styles.photoButton]}>
//           <Text style={globalStyles.buttonPrimaryText}>Change Photo</Text>
//         </AppleTouchFeedback>
//       </View>

//       {/* Inputs */}
//       <View style={styles.formCard}>
//         <Text style={[styles.label, {color: colors.foreground}]}>
//           First Name
//         </Text>
//         <TextInput
//           value={firstName}
//           onChangeText={setFirstName}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your first name"
//           placeholderTextColor={colors.muted}
//         />

//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Last Name
//         </Text>
//         <TextInput
//           value={lastName}
//           onChangeText={setLastName}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your last name"
//           placeholderTextColor={colors.muted}
//         />

//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Profession
//         </Text>
//         <TextInput
//           value={profession}
//           onChangeText={setProfession}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your profession"
//           placeholderTextColor={colors.muted}
//         />
//       </View>

//       <View style={styles.buttonRow}>
//         <AppleTouchFeedback
//           onPress={
//             hasChanges ? handleSave : () => console.log('[PFI SAVE] disabled')
//           }
//           hapticStyle="impactMedium"
//           style={[
//             globalStyles.buttonPrimary,
//             {width: 120, opacity: hasChanges ? 1 : 0.5},
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>Save</Text>
//         </AppleTouchFeedback>

//         <View style={{width: 12}} />

//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={[
//             globalStyles.buttonPrimary,
//             {width: 120, backgroundColor: 'grey'},
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
//         </AppleTouchFeedback>
//       </View>
//     </Animated.ScrollView>
//   );
// }

//////////////////////

// import React, {useState, useEffect, useRef} from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   Image,
//   StyleSheet,
//   ActivityIndicator,
//   Animated,
//   PermissionsAndroid,
//   Platform,
//   Alert,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import * as ImagePicker from 'react-native-image-picker';
// import {API_BASE_URL} from '../config/api';
// import {useUUID} from '../context/UUIDContext';
// import {useAuth0} from 'react-native-auth0';

// export default function PersonalInformationScreen({navigate}: any) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID();
//   const {user} = useAuth0();
//   const sub = user?.sub;

//   const fadeAnim = useRef(new Animated.Value(0)).current;

//   useEffect(() => {
//     Animated.timing(fadeAnim, {
//       toValue: 1,
//       duration: 700,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   const styles = StyleSheet.create({
//     centered: {justifyContent: 'center', alignItems: 'center'},
//     content: {padding: 24, paddingBottom: 60},
//     title: {
//       fontSize: 28,
//       fontWeight: '700',
//       textAlign: 'center',
//       marginBottom: 28,
//     },
//     avatarContainer: {
//       alignItems: 'center',
//       marginBottom: 32,
//     },
//     avatar: {
//       width: 120,
//       height: 120,
//       borderRadius: 60,
//       marginBottom: 14,
//     },
//     avatarPlaceholder: {
//       backgroundColor: theme.colors.surface,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     photoButton: {
//       paddingHorizontal: 22,
//       borderRadius: 50,
//     },
//     formCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       padding: 18,
//       marginBottom: 32,
//       shadowColor: '#000',
//       shadowOpacity: 0.08,
//       shadowRadius: 12,
//       shadowOffset: {width: 0, height: 4},
//     },
//     label: {
//       fontSize: 15,
//       fontWeight: '600',
//       marginTop: 12,
//       marginBottom: 6,
//     },
//     input: {
//       borderWidth: theme.borderWidth.lg,
//       borderRadius: 10,
//       padding: 14,
//       fontSize: 16,
//       backgroundColor: theme.colors.surface3,
//       borderColor: theme.colors.surfaceBorder,
//       marginBottom: 10,
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//   });

//   const [firstName, setFirstName] = useState('');
//   const [lastName, setLastName] = useState('');
//   const [profession, setProfession] = useState('');
//   const [fashionLevel, setFashionLevel] = useState('');
//   const [profilePicture, setProfilePicture] = useState<string | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [initialData, setInitialData] = useState<any>({});

//   useEffect(() => {
//     const fetchUser = async () => {
//       const endpoint = userId
//         ? `${API_BASE_URL}/users/${userId}`
//         : sub
//         ? `${API_BASE_URL}/users/auth0/${sub}`
//         : null;

//       if (!endpoint) {
//         setLoading(false);
//         return;
//       }

//       try {
//         const res = await fetch(endpoint);
//         const data = await res.json();
//         setInitialData(data || {});
//         setFirstName(data?.first_name || '');
//         setLastName(data?.last_name || '');
//         setProfession(data?.profession || '');
//         setFashionLevel(data?.fashion_level || '');

//         // 🔥 PROBLEM LINE:
//         setProfilePicture(prev =>
//           prev && prev.startsWith('file')
//             ? prev
//             : data?.profile_picture || null,
//         );
//       } catch (err) {
//         console.error('Failed to load user info', err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchUser();
//   }, [userId, sub]);

//   const requestMediaPermission = async () => {
//     if (Platform.OS === 'android') {
//       await PermissionsAndroid.requestMultiple([
//         PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES ||
//           PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
//         PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
//       ]);
//     }
//   };

//   const uriToBlob = async (uri: string): Promise<Blob> => {
//     return new Promise((resolve, reject) => {
//       const xhr = new XMLHttpRequest();
//       xhr.onload = () => resolve(xhr.response);
//       xhr.onerror = () => reject(new Error('Failed to convert URI to blob'));
//       xhr.responseType = 'blob';
//       xhr.open('GET', uri, true);
//       xhr.send(null);
//     });
//   };

//   const pickImage = async () => {
//     console.log('[PFI 1] pickImage:start');
//     try {
//       await requestMediaPermission();
//       const result = await ImagePicker.launchImageLibrary({
//         mediaType: 'photo',
//         quality: 1,
//         selectionLimit: 1,
//       });

//       if (result.didCancel || !result.assets?.[0]) return;
//       const asset = result.assets[0];
//       console.log('[PFI 1] picker:result', asset);
//       const localUri = asset.uri;
//       if (!localUri) return;

//       setProfilePicture(localUri);
//       console.log('[PFI 1] ui:set local uri');

//       const filename = asset.fileName || 'profile.jpg';
//       const type = asset.type || 'image/jpeg';

//       const presignRes = await fetch(
//         `${API_BASE_URL}/profile-upload/presign?userId=${userId}&filename=${encodeURIComponent(
//           filename,
//         )}&contentType=${encodeURIComponent(type)}`,
//       );
//       if (!presignRes.ok) throw new Error('Failed to get presigned URL');
//       const {uploadUrl, publicUrl, objectKey} = await presignRes.json();
//       console.log('[PFI 1] presign:ok', {publicUrl, objectKey});

//       const blob = await uriToBlob(localUri);
//       console.log('[PFI 1] uriToBlob: success');

//       const uploadRes = await fetch(uploadUrl, {
//         method: 'PUT',
//         headers: {'Content-Type': type},
//         body: blob,
//       });
//       if (!uploadRes.ok)
//         throw new Error(`GCS upload failed: ${uploadRes.status}`);
//       console.log('[PFI 1] upload:ok');

//       const saveRes = await fetch(`${API_BASE_URL}/profile-upload/complete`, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({
//           user_id: userId,
//           image_url: publicUrl,
//           object_key: objectKey,
//         }),
//       });
//       if (!saveRes.ok) throw new Error('Failed to save profile photo');

//       const saved = await saveRes.json();
//       console.log('[PFI 1] complete:ok', saved);

//       setProfilePicture(`${publicUrl}?v=${Date.now()}`);
//       setInitialData(prev => ({
//         ...prev,
//         profile_picture: `${publicUrl}?v=${Date.now()}`,
//       }));
//     } catch (err) {
//       console.error('❌ Upload failed:', err);
//       Alert.alert('Upload Failed', 'There was an issue uploading your photo.');
//     }
//   };

//   const handleSave = async () => {
//     console.log('[SAVE] start');
//     try {
//       const dto: any = {
//         first_name: firstName,
//         last_name: lastName,
//         profession,
//         fashion_level: fashionLevel,
//         profile_picture: profilePicture, // ✅ Always send image
//       };

//       const endpoint = userId
//         ? `${API_BASE_URL}/users/${userId}`
//         : `${API_BASE_URL}/users/auth0/${sub}`;

//       console.log('[SAVE] PUT', endpoint, dto);

//       const res = await fetch(endpoint, {
//         method: 'PUT',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(dto),
//       });

//       if (!res.ok) {
//         console.error('❌ Failed to update user info', res.status);
//         return;
//       }

//       const updated = await res.json();
//       console.log('[SAVE] ok', updated);
//       setInitialData(updated);
//       setProfilePicture(updated.profile_picture || profilePicture);
//       navigate('Settings');
//     } catch (err) {
//       console.error('[SAVE] failed', err);
//     }
//   };

//   if (loading) {
//     return (
//       <View style={[globalStyles.container, styles.centered]}>
//         <ActivityIndicator size="large" color={colors.primary} />
//       </View>
//     );
//   }

//   return (
//     <Animated.ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: colors.background, opacity: fadeAnim},
//       ]}
//       contentContainerStyle={styles.content}>
//       <Text style={[styles.title, {color: colors.primary}]}>
//         Personal Information
//       </Text>

//       <View style={styles.avatarContainer}>
//         {profilePicture ? (
//           <Image
//             source={{uri: profilePicture}}
//             style={styles.avatar}
//             resizeMode="cover"
//           />
//         ) : (
//           <View style={[styles.avatar, styles.avatarPlaceholder]} />
//         )}
//         <AppleTouchFeedback
//           onPress={pickImage}
//           hapticStyle="impactLight"
//           style={[globalStyles.buttonPrimary, styles.photoButton]}>
//           <Text style={globalStyles.buttonPrimaryText}>Change Photo</Text>
//         </AppleTouchFeedback>
//       </View>

//       <View style={styles.formCard}>
//         <Text style={[styles.label, {color: colors.foreground}]}>
//           First Name
//         </Text>
//         <TextInput
//           value={firstName}
//           onChangeText={setFirstName}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your first name"
//           placeholderTextColor={colors.muted}
//         />

//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Last Name
//         </Text>
//         <TextInput
//           value={lastName}
//           onChangeText={setLastName}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your last name"
//           placeholderTextColor={colors.muted}
//         />

//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Profession
//         </Text>
//         <TextInput
//           value={profession}
//           onChangeText={setProfession}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your profession"
//           placeholderTextColor={colors.muted}
//         />
//       </View>

//       <View style={styles.buttonRow}>
//         <AppleTouchFeedback
//           onPress={handleSave}
//           hapticStyle="impactMedium"
//           style={[globalStyles.buttonPrimary, {width: 120, opacity: 1}]}>
//           <Text style={globalStyles.buttonPrimaryText}>Save</Text>
//         </AppleTouchFeedback>

//         <View style={{width: 12}} />

//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={[
//             globalStyles.buttonPrimary,
//             {width: 120, backgroundColor: 'grey'},
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
//         </AppleTouchFeedback>
//       </View>
//     </Animated.ScrollView>
//   );
// }

////////////////////

// import React, {useState, useEffect, useRef} from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   Image,
//   StyleSheet,
//   ActivityIndicator,
//   Animated,
//   PermissionsAndroid,
//   Platform,
//   Alert,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import * as ImagePicker from 'react-native-image-picker';
// import {API_BASE_URL} from '../config/api';
// import {useUUID} from '../context/UUIDContext';
// import {useAuth0} from 'react-native-auth0';

// export default function PersonalInformationScreen({navigate}: any) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID();
//   const {user} = useAuth0();
//   const sub = user?.sub;

//   // ---------- animation ----------
//   const fadeAnim = useRef(new Animated.Value(0)).current;
//   useEffect(() => {
//     Animated.timing(fadeAnim, {
//       toValue: 1,
//       duration: 700,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   // ---------- styles ----------
//   const styles = StyleSheet.create({
//     centered: {justifyContent: 'center', alignItems: 'center'},
//     content: {padding: 24, paddingBottom: 60},
//     title: {
//       fontSize: 28,
//       fontWeight: '700',
//       textAlign: 'center',
//       marginBottom: 28,
//     },
//     avatarContainer: {alignItems: 'center', marginBottom: 32},
//     avatar: {width: 120, height: 120, borderRadius: 60, marginBottom: 14},
//     avatarPlaceholder: {
//       backgroundColor: theme.colors.surface,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     photoButton: {paddingHorizontal: 22, borderRadius: 50},
//     formCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       padding: 18,
//       marginBottom: 32,
//       shadowColor: '#000',
//       shadowOpacity: 0.08,
//       shadowRadius: 12,
//       shadowOffset: {width: 0, height: 4},
//     },
//     label: {fontSize: 15, fontWeight: '600', marginTop: 12, marginBottom: 6},
//     input: {
//       borderWidth: theme.borderWidth.lg,
//       borderRadius: 10,
//       padding: 14,
//       fontSize: 16,
//       backgroundColor: theme.colors.surface3,
//       borderColor: theme.colors.surfaceBorder,
//       marginBottom: 10,
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//   });

//   // ---------- state ----------
//   const [firstName, setFirstName] = useState('');
//   const [lastName, setLastName] = useState('');
//   const [profession, setProfession] = useState('');
//   const [fashionLevel, setFashionLevel] = useState('');
//   const [profilePicture, setProfilePicture] = useState<string | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [initialData, setInitialData] = useState<any>({});

//   // run/session control to avoid races:
//   const currentRunId = useRef(0); // increments per pick
//   const fetchRunId = useRef(0); // last fetchUser run
//   const isUploadingRef = useRef(false); // guard against overwrites
//   const lastPublicUrlRef = useRef<string | null>(null); // to bust cache when same URL comes back

//   // ---------- logging helper ----------
//   const log = (id: number, ...args: any[]) =>
//     console.log(`[PFI ${id}]`, ...args);

//   // ---------- fetch user ----------
//   const fetchUser = async () => {
//     const myFetchId = ++fetchRunId.current;
//     const endpoint = userId
//       ? `${API_BASE_URL}/users/${userId}`
//       : sub
//       ? `${API_BASE_URL}/users/auth0/${sub}`
//       : null;

//     if (!endpoint) {
//       return setLoading(false);
//     }

//     try {
//       console.log(`[USR F${myFetchId}] GET ${endpoint}`);
//       const res = await fetch(endpoint);
//       const data = await res.json();
//       console.log(`[USR F${myFetchId}] ok`, data);

//       setInitialData(data || {});
//       setFirstName(data?.first_name || '');
//       setLastName(data?.last_name || '');
//       setProfession(data?.profession || '');
//       setFashionLevel(data?.fashion_level || '');

//       // DO NOT overwrite if:
//       //  - we are uploading
//       //  - the current image is a local/content URI from a recent pick
//       //  - or this fetch is stale (older than latest run)
//       const localOrContent =
//         profilePicture?.startsWith('file:') ||
//         profilePicture?.startsWith('content:');
//       if (isUploadingRef.current || localOrContent) {
//         console.log(
//           `[USR F${myFetchId}] skipped overwrite (uploading:${isUploadingRef.current}, local:${localOrContent})`,
//         );
//       } else {
//         // bust cache if backend returns same URL again
//         const incoming = data?.profile_picture || null;
//         if (incoming) {
//           if (lastPublicUrlRef.current === incoming) {
//             setProfilePicture(`${incoming}?v=${Date.now()}`);
//             console.log(`[USR F${myFetchId}] set profile (cachebust same url)`);
//           } else {
//             setProfilePicture(incoming);
//             lastPublicUrlRef.current = incoming;
//             console.log(`[USR F${myFetchId}] set profile from server`);
//           }
//         } else {
//           setProfilePicture(null);
//           lastPublicUrlRef.current = null;
//         }
//       }
//     } catch (err) {
//       console.log(`[USR F${myFetchId}] error`, err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchUser();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [userId, sub]);

//   // ---------- permissions ----------
//   const requestMediaPermission = async () => {
//     if (Platform.OS === 'android') {
//       try {
//         const results = await PermissionsAndroid.requestMultiple([
//           (PermissionsAndroid as any).PERMISSIONS.READ_MEDIA_IMAGES ||
//             PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
//         ]);
//         console.log('[PERM] results', results);
//       } catch (e) {
//         console.log('[PERM] error', e);
//       }
//     }
//   };

//   // ---------- uri -> blob ----------
//   const uriToBlob = async (uri: string, id: number): Promise<Blob> =>
//     new Promise((resolve, reject) => {
//       try {
//         const xhr = new XMLHttpRequest();
//         xhr.onload = () => {
//           log(id, 'uriToBlob: success');
//           resolve(xhr.response);
//         };
//         xhr.onerror = () => {
//           log(id, 'uriToBlob: fail');
//           reject(new Error('Failed to convert URI to blob'));
//         };
//         xhr.responseType = 'blob';
//         xhr.open('GET', uri, true);
//         xhr.send(null);
//       } catch (e) {
//         log(id, 'uriToBlob: exception', e);
//         reject(e);
//       }
//     });

//   // ---------- pick + upload ----------
//   const pickImage = async () => {
//     const id = ++currentRunId.current;
//     log(id, 'pickImage:start');

//     try {
//       await requestMediaPermission();

//       const result = await ImagePicker.launchImageLibrary({
//         mediaType: 'photo',
//         quality: 1,
//         selectionLimit: 1,
//       });

//       log(id, 'picker:result', {
//         didCancel: result.didCancel,
//         errorCode: (result as any).errorCode,
//         errorMessage: (result as any).errorMessage,
//         assetsCount: result.assets?.length,
//         uri: result.assets?.[0]?.uri,
//         type: result.assets?.[0]?.type,
//         name: result.assets?.[0]?.fileName,
//       });

//       if (result.didCancel) return;
//       const asset = result.assets?.[0];
//       if (!asset?.uri) {
//         log(id, 'picker:no-asset-uri');
//         return;
//       }

//       // lock against overwrites
//       isUploadingRef.current = true;

//       // Show immediately (local/content)
//       setProfilePicture(asset.uri);
//       log(id, 'ui:set local uri');

//       const filename = asset.fileName || 'profile.jpg';
//       const type = asset.type || 'image/jpeg';

//       // 1) presign
//       const presignUrl =
//         `${API_BASE_URL}/profile-upload/presign?` +
//         `userId=${encodeURIComponent(userId || '')}` +
//         `&filename=${encodeURIComponent(filename)}` +
//         `&contentType=${encodeURIComponent(type)}`;

//       log(id, 'presign:GET', presignUrl);
//       const presignRes = await fetch(presignUrl);
//       if (!presignRes.ok) {
//         const txt = await presignRes.text().catch(() => '');
//         log(id, 'presign:fail', presignRes.status, txt);
//         throw new Error(`presign failed ${presignRes.status}`);
//       }
//       const {uploadUrl, publicUrl, objectKey} = await presignRes.json();
//       log(id, 'presign:ok', {hasUploadUrl: !!uploadUrl, publicUrl, objectKey});

//       // stale guard
//       if (id !== currentRunId.current) {
//         log(id, 'stale after presign → abort path');
//         return;
//       }

//       // 2) blob
//       const blob = await uriToBlob(asset.uri, id);

//       // 3) upload
//       log(id, 'upload:PUT', uploadUrl);
//       const uploadRes = await fetch(uploadUrl, {
//         method: 'PUT',
//         headers: {'Content-Type': type},
//         body: blob,
//       });
//       if (!uploadRes.ok) {
//         const txt = await uploadRes.text().catch(() => '');
//         log(id, 'upload:fail', uploadRes.status, txt);
//         throw new Error(`upload failed ${uploadRes.status}`);
//       }
//       log(id, 'upload:ok');

//       if (id !== currentRunId.current) {
//         log(id, 'stale after upload → abort path');
//         return;
//       }

//       // 4) save DB
//       const completeUrl = `${API_BASE_URL}/profile-upload/complete`;
//       const completeBody = {
//         user_id: userId,
//         image_url: publicUrl,
//         object_key: objectKey,
//       };
//       log(id, 'complete:POST', completeUrl, completeBody);
//       const saveRes = await fetch(completeUrl, {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(completeBody),
//       });
//       if (!saveRes.ok) {
//         const txt = await saveRes.text().catch(() => '');
//         log(id, 'complete:fail', saveRes.status, txt);
//         throw new Error(`complete failed ${saveRes.status}`);
//       }
//       const saved = await saveRes.json().catch(() => ({} as any));
//       log(id, 'complete:ok', saved);

//       // 5) update UI with public url (cachebust if same)
//       const urlToUse =
//         lastPublicUrlRef.current === publicUrl
//           ? `${publicUrl}?v=${Date.now()}`
//           : publicUrl;

//       setProfilePicture(urlToUse);
//       lastPublicUrlRef.current = publicUrl;
//       setInitialData(prev => ({...prev, profile_picture: publicUrl}));
//       log(id, 'ui:set public url', urlToUse);

//       // unlock + done
//       isUploadingRef.current = false;
//       log(id, 'done');
//     } catch (err: any) {
//       isUploadingRef.current = false;
//       log(id, 'ERROR', err?.message || err);
//       Alert.alert(
//         'Upload Failed',
//         err?.message || 'There was an issue uploading your photo.',
//       );
//     }
//   };

//   // ---------- change detection ----------
//   const hasChanges = Boolean(
//     (firstName && firstName !== initialData.first_name) ||
//       (lastName && lastName !== initialData.last_name) ||
//       (profession && profession !== initialData.profession) ||
//       (fashionLevel && fashionLevel !== initialData.fashion_level) ||
//       (profilePicture && profilePicture !== initialData.profile_picture),
//   );

//   // ---------- save other fields ----------
//   const handleSave = async () => {
//     try {
//       const dto: any = {};
//       if (firstName && firstName !== initialData.first_name)
//         dto.first_name = firstName;
//       if (lastName && lastName !== initialData.last_name)
//         dto.last_name = lastName;
//       if (profession && profession !== initialData.profession)
//         dto.profession = profession;
//       if (fashionLevel && fashionLevel !== initialData.fashion_level)
//         dto.fashion_level = fashionLevel;
//       if (Object.keys(dto).length === 0) return;

//       const endpoint = userId
//         ? `${API_BASE_URL}/users/${userId}`
//         : `${API_BASE_URL}/users/auth0/${sub}`;

//       console.log('[SAVE]', endpoint, dto);
//       const res = await fetch(endpoint, {
//         method: 'PUT',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify(dto),
//       });

//       if (!res.ok) {
//         const txt = await res.text().catch(() => '');
//         console.log('[SAVE] fail', res.status, txt);
//         return;
//       }

//       const updated = await res.json();
//       console.log('[SAVE] ok', updated);
//       setInitialData(updated);
//       // keep whatever we already show unless backend has a *different* profile picture
//       if (
//         updated.profile_picture &&
//         updated.profile_picture !== lastPublicUrlRef.current
//       ) {
//         setProfilePicture(updated.profile_picture);
//         lastPublicUrlRef.current = updated.profile_picture;
//       }
//       navigate('Settings');
//     } catch (err) {
//       console.log('[SAVE] error', err);
//     }
//   };

//   if (loading) {
//     return (
//       <View style={[globalStyles.container, styles.centered]}>
//         <ActivityIndicator size="large" color={colors.primary} />
//       </View>
//     );
//   }

//   return (
//     <Animated.ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: colors.background, opacity: fadeAnim},
//       ]}
//       contentContainerStyle={styles.content}>
//       <Text style={[styles.title, {color: colors.primary}]}>
//         Personal Information
//       </Text>

//       {/* Profile Picture */}
//       <View style={styles.avatarContainer}>
//         {profilePicture ? (
//           <Image
//             key={profilePicture /* force re-render */}
//             source={{uri: profilePicture}}
//             style={styles.avatar}
//             resizeMode="cover"
//             onError={e => console.log('[IMG] onError', e.nativeEvent)}
//             onLoad={() => console.log('[IMG] onLoad', profilePicture)}
//           />
//         ) : (
//           <View style={[styles.avatar, styles.avatarPlaceholder]} />
//         )}
//         <AppleTouchFeedback
//           onPress={pickImage}
//           hapticStyle="impactLight"
//           style={[globalStyles.buttonPrimary, styles.photoButton]}>
//           <Text style={globalStyles.buttonPrimaryText}>Change Photo</Text>
//         </AppleTouchFeedback>
//       </View>

//       {/* Inputs */}
//       <View style={styles.formCard}>
//         <Text style={[styles.label, {color: colors.foreground}]}>
//           First Name
//         </Text>
//         <TextInput
//           value={firstName}
//           onChangeText={setFirstName}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your first name"
//           placeholderTextColor={colors.muted}
//         />

//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Last Name
//         </Text>
//         <TextInput
//           value={lastName}
//           onChangeText={setLastName}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your last name"
//           placeholderTextColor={colors.muted}
//         />

//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Profession
//         </Text>
//         <TextInput
//           value={profession}
//           onChangeText={setProfession}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your profession"
//           placeholderTextColor={colors.muted}
//         />
//       </View>

//       <View style={styles.buttonRow}>
//         <AppleTouchFeedback
//           onPress={hasChanges ? handleSave : () => {}}
//           hapticStyle="impactMedium"
//           style={[
//             globalStyles.buttonPrimary,
//             {width: 120, opacity: hasChanges ? 1 : 0.5},
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>Save</Text>
//         </AppleTouchFeedback>

//         <View style={{width: 12}} />

//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={[
//             globalStyles.buttonPrimary,
//             {width: 120, backgroundColor: 'grey'},
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
//         </AppleTouchFeedback>
//       </View>
//     </Animated.ScrollView>
//   );
// }

///////////////////

// import React, {useState, useEffect, useRef} from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   Image,
//   StyleSheet,
//   ActivityIndicator,
//   Animated,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import * as ImagePicker from 'react-native-image-picker';
// import {API_BASE_URL} from '../config/api';
// import {useUUID} from '../context/UUIDContext';
// import {useAuth0} from 'react-native-auth0'; // 👈 only used as fallback here

// export default function PersonalInformationScreen({navigate}: any) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID(); // ✅ primary source (don’t change app behavior)
//   const {user} = useAuth0(); // ✅ fallback source (only used if userId is undefined)
//   const sub = user?.sub;

//   // ✨ Fade-in animation
//   const fadeAnim = useRef(new Animated.Value(0)).current;
//   useEffect(() => {
//     Animated.timing(fadeAnim, {
//       toValue: 1,
//       duration: 700,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   const styles = StyleSheet.create({
//     centered: {justifyContent: 'center', alignItems: 'center'},
//     content: {padding: 24, paddingBottom: 60},
//     title: {
//       fontSize: 28,
//       fontWeight: '700',
//       textAlign: 'center',
//       marginBottom: 28,
//     },
//     avatarContainer: {
//       alignItems: 'center',
//       marginBottom: 32,
//     },
//     avatar: {
//       width: 120,
//       height: 120,
//       borderRadius: 60,
//       marginBottom: 14,
//     },
//     avatarPlaceholder: {
//       backgroundColor: theme.colors.surface,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     photoButton: {
//       paddingHorizontal: 22,
//       borderRadius: 50,
//     },
//     formCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       padding: 18,
//       marginBottom: 32,
//       shadowColor: '#000',
//       shadowOpacity: 0.08,
//       shadowRadius: 12,
//       shadowOffset: {width: 0, height: 4},
//     },
//     label: {
//       fontSize: 15,
//       fontWeight: '600',
//       marginTop: 12,
//       marginBottom: 6,
//     },
//     input: {
//       borderWidth: theme.borderWidth.lg,
//       borderRadius: 10,
//       padding: 14,
//       fontSize: 16,
//       backgroundColor: theme.colors.surface3,
//       borderColor: theme.colors.surfaceBorder,
//       marginBottom: 10,
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//   });

//   const [firstName, setFirstName] = useState('');
//   const [lastName, setLastName] = useState('');
//   const [profession, setProfession] = useState('');
//   const [fashionLevel, setFashionLevel] = useState('');
//   const [profilePicture, setProfilePicture] = useState<string | null>(null);

//   const [loading, setLoading] = useState(true);
//   const [initialData, setInitialData] = useState<any>({});

//   // ─────────────────────────────────────────────
//   // 📡 Pull user info directly from users table
//   // ─────────────────────────────────────────────
//   useEffect(() => {
//     const fetchUser = async () => {
//       // ✅ fallback logic only for this screen
//       const endpoint = userId
//         ? `${API_BASE_URL}/users/${userId}`
//         : sub
//         ? `${API_BASE_URL}/users/auth0/${sub}`
//         : null;

//       if (!endpoint) {
//         console.warn('❌ Neither userId nor sub is available — cannot fetch');
//         setLoading(false);
//         return;
//       }

//       try {
//         const res = await fetch(endpoint);
//         if (!res.ok) {
//           console.error('❌ Failed to fetch user info', res.status);
//           setLoading(false);
//           return;
//         }
//         const data = await res.json();
//         setInitialData(data || {});
//         setFirstName(data?.first_name || '');
//         setLastName(data?.last_name || '');
//         setProfession(data?.profession || '');
//         setFashionLevel(data?.fashion_level || '');
//         setProfilePicture(data?.profile_picture || null);
//       } catch (err) {
//         console.error('Failed to load user info', err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchUser();
//   }, [userId, sub]);

//   // const pickImage = () => {
//   //   ImagePicker.launchImageLibrary({mediaType: 'photo'}, res => {
//   //     if (!res.didCancel && res.assets?.[0]?.uri) {
//   //       setProfilePicture(res.assets[0].uri);
//   //     }
//   //   });
//   // };

//   const pickImage = async () => {
//     ImagePicker.launchImageLibrary({mediaType: 'photo'}, async res => {
//       if (res.didCancel || !res.assets?.[0]) return;

//       try {
//         const asset = res.assets[0];
//         const filename = asset.fileName || 'profile.jpg';
//         const type = asset.type || 'image/jpeg';

//         // 1️⃣ Get presigned URL from backend
//         const presignRes = await fetch(
//           `${API_BASE_URL}/profile-upload/presign?userId=${userId}&filename=${encodeURIComponent(
//             filename,
//           )}&contentType=${encodeURIComponent(type)}`,
//         );
//         if (!presignRes.ok) throw new Error('Failed to get presigned URL');
//         const {uploadUrl, publicUrl, objectKey} = await presignRes.json();

//         // 2️⃣ Convert local URI to blob
//         const fileRes = await fetch(asset.uri);
//         const blob = await fileRes.blob();

//         // 3️⃣ Upload directly to GCS
//         const uploadRes = await fetch(uploadUrl, {
//           method: 'PUT',
//           headers: {'Content-Type': type},
//           body: blob,
//         });
//         if (!uploadRes.ok) throw new Error('Failed to upload to GCS');

//         // 4️⃣ Tell backend to store public URL in DB
//         const saveRes = await fetch(`${API_BASE_URL}/profile-upload/complete`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({
//             user_id: userId,
//             image_url: publicUrl,
//             object_key: objectKey,
//           }),
//         });
//         if (!saveRes.ok) throw new Error('Failed to save profile photo');

//         // 5️⃣ Update state
//         setProfilePicture(publicUrl);
//       } catch (err) {
//         console.error('❌ Profile upload failed:', err);
//       }
//     });
//   };

//   const hasChanges = Boolean(
//     (firstName && firstName !== initialData.first_name) ||
//       (lastName && lastName !== initialData.last_name) ||
//       (profession && profession !== initialData.profession) ||
//       (fashionLevel && fashionLevel !== initialData.fashion_level) ||
//       (profilePicture && profilePicture !== initialData.profile_picture),
//   );

//   // ─────────────────────────────────────────────
//   // 💾 Save updates directly to users table
//   // ─────────────────────────────────────────────
//   const handleSave = async () => {
//     try {
//       const dto: any = {};
//       if (firstName && firstName !== initialData.first_name)
//         dto.first_name = firstName;
//       if (lastName && lastName !== initialData.last_name)
//         dto.last_name = lastName;
//       if (profession && profession !== initialData.profession)
//         dto.profession = profession;
//       if (fashionLevel && fashionLevel !== initialData.fashion_level)
//         dto.fashion_level = fashionLevel;
//       if (profilePicture && profilePicture !== initialData.profile_picture)
//         dto.profile_picture = profilePicture;

//       if (Object.keys(dto).length === 0) return;

//       const endpoint = userId
//         ? `${API_BASE_URL}/users/${userId}`
//         : `${API_BASE_URL}/users/auth0/${sub}`;

//       const res = await fetch(endpoint, {
//         method: 'PUT',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(dto),
//       });

//       if (!res.ok) {
//         console.error('❌ Failed to update user info', res.status);
//         return;
//       }

//       navigate('Settings');
//     } catch (err) {
//       console.error('Save failed', err);
//     }
//   };

//   if (loading) {
//     return (
//       <View style={[globalStyles.container, styles.centered]}>
//         <ActivityIndicator size="large" color={colors.primary} />
//       </View>
//     );
//   }

//   return (
//     <Animated.ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: colors.background, opacity: fadeAnim},
//       ]}
//       contentContainerStyle={styles.content}>
//       <Text style={[styles.title, {color: colors.primary}]}>
//         Personal Information
//       </Text>

//       {/* Profile Picture */}
//       <View style={styles.avatarContainer}>
//         {profilePicture ? (
//           <Image source={{uri: profilePicture}} style={styles.avatar} />
//         ) : (
//           <View style={[styles.avatar, styles.avatarPlaceholder]} />
//         )}
//         <AppleTouchFeedback
//           onPress={pickImage}
//           hapticStyle="impactLight"
//           style={[globalStyles.buttonPrimary, styles.photoButton]}>
//           <Text style={globalStyles.buttonPrimaryText}>Change Photo</Text>
//         </AppleTouchFeedback>
//       </View>

//       {/* Inputs */}
//       <View style={styles.formCard}>
//         <Text style={[styles.label, {color: colors.foreground}]}>
//           First Name
//         </Text>
//         <TextInput
//           value={firstName}
//           onChangeText={setFirstName}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your first name"
//           placeholderTextColor={colors.muted}
//         />

//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Last Name
//         </Text>
//         <TextInput
//           value={lastName}
//           onChangeText={setLastName}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your last name"
//           placeholderTextColor={colors.muted}
//         />

//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Profession
//         </Text>
//         <TextInput
//           value={profession}
//           onChangeText={setProfession}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your profession"
//           placeholderTextColor={colors.muted}
//         />

//         {/* <Text style={[styles.label, {color: colors.foreground}]}>
//           Fashion Level
//         </Text>
//         <TextInput
//           value={fashionLevel}
//           onChangeText={setFashionLevel}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Beginner, Intermediate, Expert..."
//           placeholderTextColor={colors.muted}
//         /> */}
//       </View>

//       <View style={styles.buttonRow}>
//         {/* Save */}
//         <AppleTouchFeedback
//           onPress={hasChanges ? handleSave : () => {}}
//           hapticStyle="impactMedium"
//           style={[
//             globalStyles.buttonPrimary,
//             {width: 120, opacity: hasChanges ? 1 : 0.5},
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>Save</Text>
//         </AppleTouchFeedback>

//         {/* Spacer */}
//         <View style={{width: 12}} />

//         {/* Cancel */}
//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={[
//             globalStyles.buttonPrimary,
//             {width: 120, backgroundColor: 'grey'},
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
//         </AppleTouchFeedback>
//       </View>
//     </Animated.ScrollView>
//   );
// }

/////////////////////

// import React, {useState, useEffect, useRef} from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   Image,
//   StyleSheet,
//   ActivityIndicator,
//   Animated,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import * as ImagePicker from 'react-native-image-picker';
// import {API_BASE_URL} from '../config/api';
// import {useUUID} from '../context/UUIDContext';
// import {useAuth0} from 'react-native-auth0'; // 👈 only used as fallback here

// export default function PersonalInformationScreen({navigate}: any) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID(); // ✅ primary source (don’t change app behavior)
//   const {user} = useAuth0(); // ✅ fallback source (only used if userId is undefined)
//   const sub = user?.sub;

//   // ✨ Fade-in animation
//   const fadeAnim = useRef(new Animated.Value(0)).current;
//   useEffect(() => {
//     Animated.timing(fadeAnim, {
//       toValue: 1,
//       duration: 700,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   const styles = StyleSheet.create({
//     centered: {justifyContent: 'center', alignItems: 'center'},
//     content: {padding: 24, paddingBottom: 60},
//     title: {
//       fontSize: 28,
//       fontWeight: '700',
//       textAlign: 'center',
//       marginBottom: 28,
//     },
//     avatarContainer: {
//       alignItems: 'center',
//       marginBottom: 32,
//     },
//     avatar: {
//       width: 120,
//       height: 120,
//       borderRadius: 60,
//       marginBottom: 14,
//     },
//     avatarPlaceholder: {
//       backgroundColor: theme.colors.surface,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     photoButton: {
//       paddingHorizontal: 22,
//       borderRadius: 50,
//     },
//     formCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       padding: 18,
//       marginBottom: 32,
//       shadowColor: '#000',
//       shadowOpacity: 0.08,
//       shadowRadius: 12,
//       shadowOffset: {width: 0, height: 4},
//     },
//     label: {
//       fontSize: 15,
//       fontWeight: '600',
//       marginTop: 12,
//       marginBottom: 6,
//     },
//     input: {
//       borderWidth: theme.borderWidth.lg,
//       borderRadius: 10,
//       padding: 14,
//       fontSize: 16,
//       backgroundColor: theme.colors.surface3,
//       borderColor: theme.colors.surfaceBorder,
//       marginBottom: 10,
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//   });

//   const [firstName, setFirstName] = useState('');
//   const [lastName, setLastName] = useState('');
//   const [profession, setProfession] = useState('');
//   const [fashionLevel, setFashionLevel] = useState('');
//   const [profilePicture, setProfilePicture] = useState<string | null>(null);

//   const [loading, setLoading] = useState(true);
//   const [initialData, setInitialData] = useState<any>({});

//   // ─────────────────────────────────────────────
//   // 📡 Pull user info directly from users table
//   // ─────────────────────────────────────────────
//   useEffect(() => {
//     const fetchUser = async () => {
//       // ✅ fallback logic only for this screen
//       const endpoint = userId
//         ? `${API_BASE_URL}/users/${userId}`
//         : sub
//         ? `${API_BASE_URL}/users/auth0/${sub}`
//         : null;

//       if (!endpoint) {
//         console.warn('❌ Neither userId nor sub is available — cannot fetch');
//         setLoading(false);
//         return;
//       }

//       try {
//         const res = await fetch(endpoint);
//         if (!res.ok) {
//           console.error('❌ Failed to fetch user info', res.status);
//           setLoading(false);
//           return;
//         }
//         const data = await res.json();
//         setInitialData(data || {});
//         setFirstName(data?.first_name || '');
//         setLastName(data?.last_name || '');
//         setProfession(data?.profession || '');
//         setFashionLevel(data?.fashion_level || '');
//         setProfilePicture(data?.profile_picture || null);
//       } catch (err) {
//         console.error('Failed to load user info', err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchUser();
//   }, [userId, sub]);

//   // const pickImage = () => {
//   //   ImagePicker.launchImageLibrary({mediaType: 'photo'}, res => {
//   //     if (!res.didCancel && res.assets?.[0]?.uri) {
//   //       setProfilePicture(res.assets[0].uri);
//   //     }
//   //   });
//   // };

//   const pickImage = async () => {
//     ImagePicker.launchImageLibrary({mediaType: 'photo'}, async res => {
//       if (res.didCancel || !res.assets?.[0]) return;

//       try {
//         const asset = res.assets[0];
//         const filename = asset.fileName || 'profile.jpg';
//         const type = asset.type || 'image/jpeg';

//         // 1️⃣ Get presigned URL from backend
//         const presignRes = await fetch(
//           `${API_BASE_URL}/profile-upload/presign?userId=${userId}&filename=${encodeURIComponent(
//             filename,
//           )}&contentType=${encodeURIComponent(type)}`,
//         );
//         if (!presignRes.ok) throw new Error('Failed to get presigned URL');
//         const {uploadUrl, publicUrl, objectKey} = await presignRes.json();

//         // 2️⃣ Convert local URI to blob
//         const fileRes = await fetch(asset.uri);
//         const blob = await fileRes.blob();

//         // 3️⃣ Upload directly to GCS
//         const uploadRes = await fetch(uploadUrl, {
//           method: 'PUT',
//           headers: {'Content-Type': type},
//           body: blob,
//         });
//         if (!uploadRes.ok) throw new Error('Failed to upload to GCS');

//         // 4️⃣ Tell backend to store public URL in DB
//         const saveRes = await fetch(`${API_BASE_URL}/profile-upload/complete`, {
//           method: 'POST',
//           headers: {'Content-Type': 'application/json'},
//           body: JSON.stringify({
//             user_id: userId,
//             image_url: publicUrl,
//             object_key: objectKey,
//           }),
//         });
//         if (!saveRes.ok) throw new Error('Failed to save profile photo');

//         // 5️⃣ Update state
//         setProfilePicture(publicUrl);
//       } catch (err) {
//         console.error('❌ Profile upload failed:', err);
//       }
//     });
//   };

//   const hasChanges = Boolean(
//     (firstName && firstName !== initialData.first_name) ||
//       (lastName && lastName !== initialData.last_name) ||
//       (profession && profession !== initialData.profession) ||
//       (fashionLevel && fashionLevel !== initialData.fashion_level) ||
//       (profilePicture && profilePicture !== initialData.profile_picture),
//   );

//   // ─────────────────────────────────────────────
//   // 💾 Save updates directly to users table
//   // ─────────────────────────────────────────────
//   const handleSave = async () => {
//     try {
//       const dto: any = {};
//       if (firstName && firstName !== initialData.first_name)
//         dto.first_name = firstName;
//       if (lastName && lastName !== initialData.last_name)
//         dto.last_name = lastName;
//       if (profession && profession !== initialData.profession)
//         dto.profession = profession;
//       if (fashionLevel && fashionLevel !== initialData.fashion_level)
//         dto.fashion_level = fashionLevel;
//       if (profilePicture && profilePicture !== initialData.profile_picture)
//         dto.profile_picture = profilePicture;

//       if (Object.keys(dto).length === 0) return;

//       const endpoint = userId
//         ? `${API_BASE_URL}/users/${userId}`
//         : `${API_BASE_URL}/users/auth0/${sub}`;

//       const res = await fetch(endpoint, {
//         method: 'PUT',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(dto),
//       });

//       if (!res.ok) {
//         console.error('❌ Failed to update user info', res.status);
//         return;
//       }

//       navigate('Settings');
//     } catch (err) {
//       console.error('Save failed', err);
//     }
//   };

//   if (loading) {
//     return (
//       <View style={[globalStyles.container, styles.centered]}>
//         <ActivityIndicator size="large" color={colors.primary} />
//       </View>
//     );
//   }

//   return (
//     <Animated.ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: colors.background, opacity: fadeAnim},
//       ]}
//       contentContainerStyle={styles.content}>
//       <Text style={[styles.title, {color: colors.primary}]}>
//         Personal Information
//       </Text>

//       {/* Profile Picture */}
//       <View style={styles.avatarContainer}>
//         {profilePicture ? (
//           <Image source={{uri: profilePicture}} style={styles.avatar} />
//         ) : (
//           <View style={[styles.avatar, styles.avatarPlaceholder]} />
//         )}
//         <AppleTouchFeedback
//           onPress={pickImage}
//           hapticStyle="impactLight"
//           style={[globalStyles.buttonPrimary, styles.photoButton]}>
//           <Text style={globalStyles.buttonPrimaryText}>Change Photo</Text>
//         </AppleTouchFeedback>
//       </View>

//       {/* Inputs */}
//       <View style={styles.formCard}>
//         <Text style={[styles.label, {color: colors.foreground}]}>
//           First Name
//         </Text>
//         <TextInput
//           value={firstName}
//           onChangeText={setFirstName}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your first name"
//           placeholderTextColor={colors.muted}
//         />

//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Last Name
//         </Text>
//         <TextInput
//           value={lastName}
//           onChangeText={setLastName}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your last name"
//           placeholderTextColor={colors.muted}
//         />

//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Profession
//         </Text>
//         <TextInput
//           value={profession}
//           onChangeText={setProfession}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your profession"
//           placeholderTextColor={colors.muted}
//         />

//         {/* <Text style={[styles.label, {color: colors.foreground}]}>
//           Fashion Level
//         </Text>
//         <TextInput
//           value={fashionLevel}
//           onChangeText={setFashionLevel}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Beginner, Intermediate, Expert..."
//           placeholderTextColor={colors.muted}
//         /> */}
//       </View>

//       <View style={styles.buttonRow}>
//         {/* Save */}
//         <AppleTouchFeedback
//           onPress={hasChanges ? handleSave : () => {}}
//           hapticStyle="impactMedium"
//           style={[
//             globalStyles.buttonPrimary,
//             {width: 120, opacity: hasChanges ? 1 : 0.5},
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>Save</Text>
//         </AppleTouchFeedback>

//         {/* Spacer */}
//         <View style={{width: 12}} />

//         {/* Cancel */}
//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={[
//             globalStyles.buttonPrimary,
//             {width: 120, backgroundColor: 'grey'},
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
//         </AppleTouchFeedback>
//       </View>
//     </Animated.ScrollView>
//   );
// }

/////////////////

// import React, {useState, useEffect, useRef} from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   Image,
//   StyleSheet,
//   ActivityIndicator,
//   Animated,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import * as ImagePicker from 'react-native-image-picker';
// import {API_BASE_URL} from '../config/api';
// import {useUUID} from '../context/UUIDContext';
// import {useAuth0} from 'react-native-auth0'; // 👈 only used as fallback here

// export default function PersonalInformationScreen({navigate}: any) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID(); // ✅ primary source (don’t change app behavior)
//   const {user} = useAuth0(); // ✅ fallback source (only used if userId is undefined)
//   const sub = user?.sub;

//   // ✨ Fade-in animation
//   const fadeAnim = useRef(new Animated.Value(0)).current;
//   useEffect(() => {
//     Animated.timing(fadeAnim, {
//       toValue: 1,
//       duration: 700,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   const styles = StyleSheet.create({
//     centered: {justifyContent: 'center', alignItems: 'center'},
//     content: {padding: 24, paddingBottom: 60},
//     title: {
//       fontSize: 28,
//       fontWeight: '700',
//       textAlign: 'center',
//       marginBottom: 28,
//     },
//     avatarContainer: {
//       alignItems: 'center',
//       marginBottom: 32,
//     },
//     avatar: {
//       width: 120,
//       height: 120,
//       borderRadius: 60,
//       marginBottom: 14,
//     },
//     avatarPlaceholder: {
//       backgroundColor: theme.colors.surface,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     photoButton: {
//       paddingHorizontal: 22,
//       borderRadius: 50,
//     },
//     formCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       padding: 18,
//       marginBottom: 32,
//       shadowColor: '#000',
//       shadowOpacity: 0.08,
//       shadowRadius: 12,
//       shadowOffset: {width: 0, height: 4},
//     },
//     label: {
//       fontSize: 15,
//       fontWeight: '600',
//       marginTop: 12,
//       marginBottom: 6,
//     },
//     input: {
//       borderWidth: theme.borderWidth.lg,
//       borderRadius: 10,
//       padding: 14,
//       fontSize: 16,
//       backgroundColor: theme.colors.surface3,
//       borderColor: theme.colors.surfaceBorder,
//       marginBottom: 10,
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//   });

//   const [firstName, setFirstName] = useState('');
//   const [lastName, setLastName] = useState('');
//   const [profession, setProfession] = useState('');
//   const [fashionLevel, setFashionLevel] = useState('');
//   const [profilePicture, setProfilePicture] = useState<string | null>(null);

//   const [loading, setLoading] = useState(true);
//   const [initialData, setInitialData] = useState<any>({});

//   // ─────────────────────────────────────────────
//   // 📡 Pull user info directly from users table
//   // ─────────────────────────────────────────────
//   useEffect(() => {
//     const fetchUser = async () => {
//       // ✅ fallback logic only for this screen
//       const endpoint = userId
//         ? `${API_BASE_URL}/users/${userId}`
//         : sub
//         ? `${API_BASE_URL}/users/auth0/${sub}`
//         : null;

//       if (!endpoint) {
//         console.warn('❌ Neither userId nor sub is available — cannot fetch');
//         setLoading(false);
//         return;
//       }

//       try {
//         const res = await fetch(endpoint);
//         if (!res.ok) {
//           console.error('❌ Failed to fetch user info', res.status);
//           setLoading(false);
//           return;
//         }
//         const data = await res.json();
//         setInitialData(data || {});
//         setFirstName(data?.first_name || '');
//         setLastName(data?.last_name || '');
//         setProfession(data?.profession || '');
//         setFashionLevel(data?.fashion_level || '');
//         setProfilePicture(data?.profile_picture || null);
//       } catch (err) {
//         console.error('Failed to load user info', err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchUser();
//   }, [userId, sub]);

//   const pickImage = () => {
//     ImagePicker.launchImageLibrary({mediaType: 'photo'}, res => {
//       if (!res.didCancel && res.assets?.[0]?.uri) {
//         setProfilePicture(res.assets[0].uri);
//       }
//     });
//   };

//   const hasChanges = Boolean(
//     (firstName && firstName !== initialData.first_name) ||
//       (lastName && lastName !== initialData.last_name) ||
//       (profession && profession !== initialData.profession) ||
//       (fashionLevel && fashionLevel !== initialData.fashion_level) ||
//       (profilePicture && profilePicture !== initialData.profile_picture),
//   );

//   // ─────────────────────────────────────────────
//   // 💾 Save updates directly to users table
//   // ─────────────────────────────────────────────
//   const handleSave = async () => {
//     try {
//       const dto: any = {};
//       if (firstName && firstName !== initialData.first_name)
//         dto.first_name = firstName;
//       if (lastName && lastName !== initialData.last_name)
//         dto.last_name = lastName;
//       if (profession && profession !== initialData.profession)
//         dto.profession = profession;
//       if (fashionLevel && fashionLevel !== initialData.fashion_level)
//         dto.fashion_level = fashionLevel;
//       if (profilePicture && profilePicture !== initialData.profile_picture)
//         dto.profile_picture = profilePicture;

//       if (Object.keys(dto).length === 0) return;

//       const endpoint = userId
//         ? `${API_BASE_URL}/users/${userId}`
//         : `${API_BASE_URL}/users/auth0/${sub}`;

//       const res = await fetch(endpoint, {
//         method: 'PUT',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(dto),
//       });

//       if (!res.ok) {
//         console.error('❌ Failed to update user info', res.status);
//         return;
//       }

//       navigate('Settings');
//     } catch (err) {
//       console.error('Save failed', err);
//     }
//   };

//   if (loading) {
//     return (
//       <View style={[globalStyles.container, styles.centered]}>
//         <ActivityIndicator size="large" color={colors.primary} />
//       </View>
//     );
//   }

//   return (
//     <Animated.ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: colors.background, opacity: fadeAnim},
//       ]}
//       contentContainerStyle={styles.content}>
//       <Text style={[styles.title, {color: colors.primary}]}>
//         Personal Information
//       </Text>

//       {/* Profile Picture */}
//       <View style={styles.avatarContainer}>
//         {profilePicture ? (
//           <Image source={{uri: profilePicture}} style={styles.avatar} />
//         ) : (
//           <View style={[styles.avatar, styles.avatarPlaceholder]} />
//         )}
//         <AppleTouchFeedback
//           onPress={pickImage}
//           hapticStyle="impactLight"
//           style={[globalStyles.buttonPrimary, styles.photoButton]}>
//           <Text style={globalStyles.buttonPrimaryText}>Change Photo</Text>
//         </AppleTouchFeedback>
//       </View>

//       {/* Inputs */}
//       <View style={styles.formCard}>
//         <Text style={[styles.label, {color: colors.foreground}]}>
//           First Name
//         </Text>
//         <TextInput
//           value={firstName}
//           onChangeText={setFirstName}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your first name"
//           placeholderTextColor={colors.muted}
//         />

//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Last Name
//         </Text>
//         <TextInput
//           value={lastName}
//           onChangeText={setLastName}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your last name"
//           placeholderTextColor={colors.muted}
//         />

//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Profession
//         </Text>
//         <TextInput
//           value={profession}
//           onChangeText={setProfession}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your profession"
//           placeholderTextColor={colors.muted}
//         />

//         {/* <Text style={[styles.label, {color: colors.foreground}]}>
//           Fashion Level
//         </Text>
//         <TextInput
//           value={fashionLevel}
//           onChangeText={setFashionLevel}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Beginner, Intermediate, Expert..."
//           placeholderTextColor={colors.muted}
//         /> */}
//       </View>

//       <View style={styles.buttonRow}>
//         {/* Save */}
//         <AppleTouchFeedback
//           onPress={hasChanges ? handleSave : () => {}}
//           hapticStyle="impactMedium"
//           style={[
//             globalStyles.buttonPrimary,
//             {width: 120, opacity: hasChanges ? 1 : 0.5},
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>Save</Text>
//         </AppleTouchFeedback>

//         {/* Spacer */}
//         <View style={{width: 12}} />

//         {/* Cancel */}
//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={[
//             globalStyles.buttonPrimary,
//             {width: 120, backgroundColor: 'grey'},
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
//         </AppleTouchFeedback>
//       </View>
//     </Animated.ScrollView>
//   );
// }

//////////////////////

// import React, {useState, useEffect, useRef} from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   Image,
//   StyleSheet,
//   ActivityIndicator,
//   Animated,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import * as ImagePicker from 'react-native-image-picker';
// import {API_BASE_URL} from '../config/api';
// import {useUUID} from '../context/UUIDContext'; // 👈 import your userId context

// export default function PersonalInformationScreen({navigate}: any) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID();

//   // ✨ Fade-in animation
//   const fadeAnim = useRef(new Animated.Value(0)).current;
//   useEffect(() => {
//     Animated.timing(fadeAnim, {
//       toValue: 1,
//       duration: 700,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   const styles = StyleSheet.create({
//     centered: {justifyContent: 'center', alignItems: 'center'},
//     content: {padding: 24, paddingBottom: 60},
//     title: {
//       fontSize: 28,
//       fontWeight: '700',
//       textAlign: 'center',
//       marginBottom: 28,
//     },
//     avatarContainer: {
//       alignItems: 'center',
//       marginBottom: 32,
//     },
//     avatar: {
//       width: 120,
//       height: 120,
//       borderRadius: 60,
//       marginBottom: 14,
//     },
//     avatarPlaceholder: {
//       backgroundColor: theme.colors.surface,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     photoButton: {
//       paddingHorizontal: 22,
//       borderRadius: 50,
//     },
//     formCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       padding: 18,
//       marginBottom: 32,
//       shadowColor: '#000',
//       shadowOpacity: 0.08,
//       shadowRadius: 12,
//       shadowOffset: {width: 0, height: 4},
//     },
//     label: {
//       fontSize: 15,
//       fontWeight: '600',
//       marginTop: 12,
//       marginBottom: 6,
//     },
//     input: {
//       borderWidth: theme.borderWidth.lg,
//       borderRadius: 10,
//       padding: 14,
//       fontSize: 16,
//       backgroundColor: theme.colors.surface3,
//       borderColor: theme.colors.surfaceBorder,
//       marginBottom: 10,
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//   });

//   const [firstName, setFirstName] = useState('');
//   const [lastName, setLastName] = useState('');
//   const [profession, setProfession] = useState('');
//   const [fashionLevel, setFashionLevel] = useState('');
//   const [profilePicture, setProfilePicture] = useState<string | null>(null);

//   const [loading, setLoading] = useState(true);
//   const [initialData, setInitialData] = useState<any>({});

//   // ─────────────────────────────────────────────
//   // 📡 Pull user info directly from users table
//   // ─────────────────────────────────────────────
//   useEffect(() => {
//     const fetchUser = async () => {
//       if (!userId) {
//         console.warn('❌ userId is undefined — cannot fetch user');
//         setLoading(false); // prevent spinner lock
//         return;
//       }

//       try {
//         const res = await fetch(`${API_BASE_URL}/users/${userId}`);
//         if (!res.ok) {
//           console.error('❌ Failed to fetch user info', res.status);
//           setLoading(false);
//           return;
//         }
//         const data = await res.json();
//         setInitialData(data || {});
//         setFirstName(data?.first_name || '');
//         setLastName(data?.last_name || '');
//         setProfession(data?.profession || '');
//         setFashionLevel(data?.fashion_level || '');
//         setProfilePicture(data?.profile_picture || null);
//       } catch (err) {
//         console.error('Failed to load user info', err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchUser();
//   }, [userId]);

//   const pickImage = () => {
//     ImagePicker.launchImageLibrary({mediaType: 'photo'}, res => {
//       if (!res.didCancel && res.assets?.[0]?.uri) {
//         setProfilePicture(res.assets[0].uri);
//       }
//     });
//   };

//   const hasChanges = Boolean(
//     (firstName && firstName !== initialData.first_name) ||
//       (lastName && lastName !== initialData.last_name) ||
//       (profession && profession !== initialData.profession) ||
//       (fashionLevel && fashionLevel !== initialData.fashion_level) ||
//       (profilePicture && profilePicture !== initialData.profile_picture),
//   );

//   // ─────────────────────────────────────────────
//   // 💾 Save updates directly to users table
//   // ─────────────────────────────────────────────
//   const handleSave = async () => {
//     try {
//       const dto: any = {};
//       if (firstName && firstName !== initialData.first_name)
//         dto.first_name = firstName;
//       if (lastName && lastName !== initialData.last_name)
//         dto.last_name = lastName;
//       if (profession && profession !== initialData.profession)
//         dto.profession = profession;
//       if (fashionLevel && fashionLevel !== initialData.fashion_level)
//         dto.fashion_level = fashionLevel;
//       if (profilePicture && profilePicture !== initialData.profile_picture)
//         dto.profile_picture = profilePicture;

//       if (Object.keys(dto).length === 0) return;

//       const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
//         method: 'PUT',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(dto),
//       });

//       if (!res.ok) {
//         console.error('❌ Failed to update user info', res.status);
//         return;
//       }

//       navigate('Settings');
//     } catch (err) {
//       console.error('Save failed', err);
//     }
//   };

//   if (loading) {
//     return (
//       <View style={[globalStyles.container, styles.centered]}>
//         <ActivityIndicator size="large" color={colors.primary} />
//       </View>
//     );
//   }

//   return (
//     <Animated.ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: colors.background, opacity: fadeAnim},
//       ]}
//       contentContainerStyle={styles.content}>
//       <Text style={[styles.title, {color: colors.primary}]}>
//         Personal Information
//       </Text>

//       {/* Profile Picture */}
//       <View style={styles.avatarContainer}>
//         {profilePicture ? (
//           <Image source={{uri: profilePicture}} style={styles.avatar} />
//         ) : (
//           <View style={[styles.avatar, styles.avatarPlaceholder]} />
//         )}
//         <AppleTouchFeedback
//           onPress={pickImage}
//           hapticStyle="impactLight"
//           style={[globalStyles.buttonPrimary, styles.photoButton]}>
//           <Text style={globalStyles.buttonPrimaryText}>Change Photo</Text>
//         </AppleTouchFeedback>
//       </View>

//       {/* Inputs */}
//       <View style={styles.formCard}>
//         <Text style={[styles.label, {color: colors.foreground}]}>
//           First Name
//         </Text>
//         <TextInput
//           value={firstName}
//           onChangeText={setFirstName}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your first name"
//           placeholderTextColor={colors.muted}
//         />

//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Last Name
//         </Text>
//         <TextInput
//           value={lastName}
//           onChangeText={setLastName}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your last name"
//           placeholderTextColor={colors.muted}
//         />

//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Profession
//         </Text>
//         <TextInput
//           value={profession}
//           onChangeText={setProfession}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your profession"
//           placeholderTextColor={colors.muted}
//         />

//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Fashion Level
//         </Text>
//         <TextInput
//           value={fashionLevel}
//           onChangeText={setFashionLevel}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Beginner, Intermediate, Expert..."
//           placeholderTextColor={colors.muted}
//         />
//       </View>

//       <View style={styles.buttonRow}>
//         {/* Save */}
//         <AppleTouchFeedback
//           onPress={hasChanges ? handleSave : () => {}}
//           hapticStyle="impactMedium"
//           style={[
//             globalStyles.buttonPrimary,
//             {width: 120, opacity: hasChanges ? 1 : 0.5},
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>Save</Text>
//         </AppleTouchFeedback>

//         {/* Spacer */}
//         <View style={{width: 12}} />

//         {/* Cancel */}
//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={[
//             globalStyles.buttonPrimary,
//             {width: 120, backgroundColor: 'grey'},
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
//         </AppleTouchFeedback>
//       </View>
//     </Animated.ScrollView>
//   );
// }

/////////////////////

// import React, {useState, useEffect, useRef} from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   Image,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
//   Animated,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import * as ImagePicker from 'react-native-image-picker';
// import {useAuth0} from 'react-native-auth0';
// import {API_BASE_URL} from '../config/api';

// export default function PersonalInformationScreen({navigate}: any) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();
//   const {getCredentials} = useAuth0();

//   // ✨ Fade-in animation
//   const fadeAnim = useRef(new Animated.Value(0)).current;
//   useEffect(() => {
//     Animated.timing(fadeAnim, {
//       toValue: 1,
//       duration: 700,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   const styles = StyleSheet.create({
//     centered: {justifyContent: 'center', alignItems: 'center'},
//     content: {padding: 24, paddingBottom: 60},
//     title: {
//       fontSize: 28,
//       fontWeight: '700',
//       textAlign: 'center',
//       marginBottom: 28,
//     },
//     avatarContainer: {
//       alignItems: 'center',
//       marginBottom: 32,
//     },
//     avatar: {
//       width: 120,
//       height: 120,
//       borderRadius: 60,
//       marginBottom: 14,
//     },
//     avatarPlaceholder: {
//       backgroundColor: theme.colors.surface,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     photoButton: {
//       paddingHorizontal: 22,
//       borderRadius: 50,
//     },
//     formCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       padding: 18,
//       marginBottom: 32,
//       shadowColor: '#000',
//       shadowOpacity: 0.08,
//       shadowRadius: 12,
//       shadowOffset: {width: 0, height: 4},
//     },
//     label: {
//       fontSize: 15,
//       fontWeight: '600',
//       marginTop: 12,
//       marginBottom: 6,
//     },
//     input: {
//       borderWidth: theme.borderWidth.lg,
//       borderRadius: 10,
//       padding: 14,
//       fontSize: 16,
//       backgroundColor: theme.colors.surface3,
//       borderColor: theme.colors.surfaceBorder,
//       marginBottom: 10,
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//   });

//   const [firstName, setFirstName] = useState('');
//   const [lastName, setLastName] = useState('');
//   const [profession, setProfession] = useState('');
//   const [fashionLevel, setFashionLevel] = useState('');
//   const [profilePicture, setProfilePicture] = useState<string | null>(null);

//   const [loading, setLoading] = useState(true);
//   const [initialData, setInitialData] = useState<any>({});

//   useEffect(() => {
//     const fetchUser = async () => {
//       try {
//         const creds = await getCredentials();
//         const res = await fetch(`${API_BASE_URL}/users/me`, {
//           headers: {Authorization: `Bearer ${creds.accessToken}`},
//         });
//         const data = await res.json();
//         setInitialData(data || {});
//         setFirstName(data?.first_name || '');
//         setLastName(data?.last_name || '');
//         setProfession(data?.profession || '');
//         setFashionLevel(data?.fashion_level || '');
//         setProfilePicture(data?.profile_picture || null);
//       } catch (err) {
//         console.error('Failed to load user info', err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchUser();
//   }, []);

//   const pickImage = () => {
//     ImagePicker.launchImageLibrary({mediaType: 'photo'}, res => {
//       if (!res.didCancel && res.assets?.[0]?.uri) {
//         setProfilePicture(res.assets[0].uri);
//       }
//     });
//   };

//   const hasChanges = Boolean(
//     (firstName && firstName !== initialData.first_name) ||
//       (lastName && lastName !== initialData.last_name) ||
//       (profession && profession !== initialData.profession) ||
//       (fashionLevel && fashionLevel !== initialData.fashion_level) ||
//       (profilePicture && profilePicture !== initialData.profile_picture),
//   );

//   const handleSave = async () => {
//     try {
//       const dto: any = {};
//       if (firstName && firstName !== initialData.first_name)
//         dto.first_name = firstName;
//       if (lastName && lastName !== initialData.last_name)
//         dto.last_name = lastName;
//       if (profession && profession !== initialData.profession)
//         dto.profession = profession;
//       if (fashionLevel && fashionLevel !== initialData.fashion_level)
//         dto.fashion_level = fashionLevel;
//       if (profilePicture && profilePicture !== initialData.profile_picture)
//         dto.profile_picture = profilePicture;

//       if (Object.keys(dto).length === 0) return;

//       const creds = await getCredentials();
//       await fetch(`${API_BASE_URL}/users/me`, {
//         method: 'PUT',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${creds.accessToken}`,
//         },
//         body: JSON.stringify(dto),
//       });

//       navigate('Settings');
//     } catch (err) {
//       console.error('Save failed', err);
//     }
//   };

//   if (loading) {
//     return (
//       <View style={[globalStyles.container, styles.centered]}>
//         <ActivityIndicator size="large" color={colors.primary} />
//       </View>
//     );
//   }

//   return (
//     <Animated.ScrollView
//       style={[
//         globalStyles.container,
//         {backgroundColor: colors.background, opacity: fadeAnim},
//       ]}
//       contentContainerStyle={styles.content}>
//       <Text style={[styles.title, {color: colors.primary}]}>
//         Personal Information
//       </Text>

//       {/* Profile Picture */}
//       <View style={styles.avatarContainer}>
//         {profilePicture ? (
//           <Image source={{uri: profilePicture}} style={styles.avatar} />
//         ) : (
//           <View style={[styles.avatar, styles.avatarPlaceholder]} />
//         )}
//         <AppleTouchFeedback
//           onPress={pickImage}
//           hapticStyle="impactLight"
//           style={[globalStyles.buttonPrimary, styles.photoButton]}>
//           <Text style={globalStyles.buttonPrimaryText}>Change Photo</Text>
//         </AppleTouchFeedback>
//       </View>

//       {/* Inputs */}
//       <View style={styles.formCard}>
//         <Text style={[styles.label, {color: colors.foreground}]}>
//           First Name
//         </Text>
//         <TextInput
//           value={firstName}
//           onChangeText={setFirstName}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your first name"
//           placeholderTextColor={colors.muted}
//         />

//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Last Name
//         </Text>
//         <TextInput
//           value={lastName}
//           onChangeText={setLastName}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your last name"
//           placeholderTextColor={colors.muted}
//         />

//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Profession
//         </Text>
//         <TextInput
//           value={profession}
//           onChangeText={setProfession}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your profession"
//           placeholderTextColor={colors.muted}
//         />

//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Fashion Level
//         </Text>
//         <TextInput
//           value={fashionLevel}
//           onChangeText={setFashionLevel}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Beginner, Intermediate, Expert..."
//           placeholderTextColor={colors.muted}
//         />
//       </View>

//       <View style={styles.buttonRow}>
//         {/* Save */}
//         <AppleTouchFeedback
//           onPress={hasChanges ? handleSave : () => {}}
//           hapticStyle="impactMedium"
//           style={[
//             globalStyles.buttonPrimary,
//             {width: 120, opacity: hasChanges ? 1 : 0.5},
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>Save</Text>
//         </AppleTouchFeedback>

//         {/* Spacer */}
//         <View style={{width: 12}} />

//         {/* Cancel */}
//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={[
//             globalStyles.buttonPrimary,
//             {width: 120, backgroundColor: 'grey'},
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
//         </AppleTouchFeedback>
//       </View>
//     </Animated.ScrollView>
//   );
// }

////////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   Image,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import * as ImagePicker from 'react-native-image-picker';
// import {useAuth0} from 'react-native-auth0';
// import {API_BASE_URL} from '../config/api';

// export default function PersonalInformationScreen({navigate}: any) {
//   const {theme} = useAppTheme();
//   const colors = theme.colors;
//   const globalStyles = useGlobalStyles();
//   const {getCredentials} = useAuth0();

//   const styles = StyleSheet.create({
//     centered: {justifyContent: 'center', alignItems: 'center'},
//     content: {padding: 24, paddingBottom: 60},
//     title: {
//       fontSize: 28,
//       fontWeight: '700',
//       textAlign: 'center',
//       marginBottom: 28,
//     },
//     avatarContainer: {
//       alignItems: 'center',
//       marginBottom: 32,
//     },
//     avatar: {
//       width: 120,
//       height: 120,
//       borderRadius: 60,
//       marginBottom: 14,
//     },
//     avatarPlaceholder: {
//       backgroundColor: theme.colors.surface,
//       borderWidth: 1,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     photoButton: {
//       paddingHorizontal: 22,
//       borderRadius: 50,
//     },
//     formCard: {
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       padding: 18,
//       marginBottom: 32,
//       shadowColor: '#000',
//       shadowOpacity: 0.08,
//       shadowRadius: 12,
//       shadowOffset: {width: 0, height: 4},
//     },
//     label: {
//       fontSize: 15,
//       fontWeight: '600',
//       marginTop: 12,
//       marginBottom: 6,
//     },
//     input: {
//       borderWidth: theme.borderWidth.lg,
//       borderRadius: 10,
//       padding: 14,
//       fontSize: 16,
//       backgroundColor: theme.colors.surface3,
//       borderColor: theme.colors.surfaceBorder,
//       marginBottom: 10,
//     },
//     buttonRow: {
//       flexDirection: 'row',
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//   });

//   const [firstName, setFirstName] = useState('');
//   const [lastName, setLastName] = useState('');
//   const [profession, setProfession] = useState('');
//   const [fashionLevel, setFashionLevel] = useState('');
//   const [profilePicture, setProfilePicture] = useState<string | null>(null);

//   const [loading, setLoading] = useState(true);
//   const [initialData, setInitialData] = useState<any>({});

//   useEffect(() => {
//     const fetchUser = async () => {
//       try {
//         const creds = await getCredentials();
//         const res = await fetch(`${API_BASE_URL}/users/me`, {
//           headers: {Authorization: `Bearer ${creds.accessToken}`},
//         });
//         const data = await res.json();
//         setInitialData(data || {});
//         setFirstName(data?.first_name || '');
//         setLastName(data?.last_name || '');
//         setProfession(data?.profession || '');
//         setFashionLevel(data?.fashion_level || '');
//         setProfilePicture(data?.profile_picture || null);
//       } catch (err) {
//         console.error('Failed to load user info', err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchUser();
//   }, []);

//   const pickImage = () => {
//     ImagePicker.launchImageLibrary({mediaType: 'photo'}, res => {
//       if (!res.didCancel && res.assets?.[0]?.uri) {
//         setProfilePicture(res.assets[0].uri);
//       }
//     });
//   };

//   const hasChanges = Boolean(
//     (firstName && firstName !== initialData.first_name) ||
//       (lastName && lastName !== initialData.last_name) ||
//       (profession && profession !== initialData.profession) ||
//       (fashionLevel && fashionLevel !== initialData.fashion_level) ||
//       (profilePicture && profilePicture !== initialData.profile_picture),
//   );

//   const handleSave = async () => {
//     try {
//       const dto: any = {};
//       if (firstName && firstName !== initialData.first_name)
//         dto.first_name = firstName;
//       if (lastName && lastName !== initialData.last_name)
//         dto.last_name = lastName;
//       if (profession && profession !== initialData.profession)
//         dto.profession = profession;
//       if (fashionLevel && fashionLevel !== initialData.fashion_level)
//         dto.fashion_level = fashionLevel;
//       if (profilePicture && profilePicture !== initialData.profile_picture)
//         dto.profile_picture = profilePicture;

//       if (Object.keys(dto).length === 0) return;

//       const creds = await getCredentials();
//       await fetch(`${API_BASE_URL}/users/me`, {
//         method: 'PUT',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${creds.accessToken}`,
//         },
//         body: JSON.stringify(dto),
//       });

//       navigate('Settings');
//     } catch (err) {
//       console.error('Save failed', err);
//     }
//   };

//   if (loading) {
//     return (
//       <View style={[globalStyles.container, styles.centered]}>
//         <ActivityIndicator size="large" color={colors.primary} />
//       </View>
//     );
//   }

//   return (
//     <ScrollView
//       style={[globalStyles.container, {backgroundColor: colors.background}]}
//       contentContainerStyle={styles.content}>
//       <Text style={[styles.title, {color: colors.primary}]}>
//         Personal Information
//       </Text>

//       {/* Profile Picture */}
//       <View style={styles.avatarContainer}>
//         {profilePicture ? (
//           <Image source={{uri: profilePicture}} style={styles.avatar} />
//         ) : (
//           <View style={[styles.avatar, styles.avatarPlaceholder]} />
//         )}
//         <AppleTouchFeedback
//           onPress={pickImage}
//           hapticStyle="impactLight"
//           style={[globalStyles.buttonPrimary, styles.photoButton]}>
//           <Text style={globalStyles.buttonPrimaryText}>Change Photo</Text>
//         </AppleTouchFeedback>
//       </View>

//       {/* Inputs */}
//       <View style={styles.formCard}>
//         <Text style={[styles.label, {color: colors.foreground}]}>
//           First Name
//         </Text>
//         <TextInput
//           value={firstName}
//           onChangeText={setFirstName}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your first name"
//           placeholderTextColor={colors.muted}
//         />

//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Last Name
//         </Text>
//         <TextInput
//           value={lastName}
//           onChangeText={setLastName}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your last name"
//           placeholderTextColor={colors.muted}
//         />

//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Profession
//         </Text>
//         <TextInput
//           value={profession}
//           onChangeText={setProfession}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Enter your profession"
//           placeholderTextColor={colors.muted}
//         />

//         <Text style={[styles.label, {color: colors.foreground}]}>
//           Fashion Level
//         </Text>
//         <TextInput
//           value={fashionLevel}
//           onChangeText={setFashionLevel}
//           style={[styles.input, {color: colors.foreground}]}
//           placeholder="Beginner, Intermediate, Expert..."
//           placeholderTextColor={colors.muted}
//         />
//       </View>

//       <View
//         style={{
//           flexDirection: 'row',
//           justifyContent: 'center',
//           alignItems: 'center',
//         }}>
//         {/* Save */}
//         <AppleTouchFeedback
//           onPress={hasChanges ? handleSave : () => {}}
//           hapticStyle="impactMedium"
//           style={[
//             globalStyles.buttonPrimary,
//             {width: 120, opacity: hasChanges ? 1 : 0.5},
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>Save</Text>
//         </AppleTouchFeedback>

//         {/* Spacer */}
//         <View style={{width: 12}} />

//         {/* Cancel */}
//         <AppleTouchFeedback
//           onPress={() => navigate('Settings')}
//           hapticStyle="impactLight"
//           style={[
//             globalStyles.buttonPrimary,
//             {width: 120, backgroundColor: 'grey'},
//           ]}>
//           <Text style={globalStyles.buttonPrimaryText}>Cancel</Text>
//         </AppleTouchFeedback>
//       </View>
//     </ScrollView>
//   );
// }
