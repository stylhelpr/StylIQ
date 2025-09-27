import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import * as ImagePicker from 'react-native-image-picker';
import {API_BASE_URL} from '../config/api';
import {useUUID} from '../context/UUIDContext';
import {useAuth0} from 'react-native-auth0'; // 👈 only used as fallback here

export default function PersonalInformationScreen({navigate}: any) {
  const {theme} = useAppTheme();
  const colors = theme.colors;
  const globalStyles = useGlobalStyles();
  const userId = useUUID(); // ✅ primary source (don’t change app behavior)
  const {user} = useAuth0(); // ✅ fallback source (only used if userId is undefined)
  const sub = user?.sub;

  // ✨ Fade-in animation
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
      marginBottom: 28,
    },
    avatarContainer: {
      alignItems: 'center',
      marginBottom: 32,
    },
    avatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
      marginBottom: 14,
    },
    avatarPlaceholder: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.surfaceBorder,
    },
    photoButton: {
      paddingHorizontal: 22,
      borderRadius: 50,
    },
    formCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 18,
      marginBottom: 32,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: {width: 0, height: 4},
    },
    label: {
      fontSize: 15,
      fontWeight: '600',
      marginTop: 12,
      marginBottom: 6,
    },
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
  const [fashionLevel, setFashionLevel] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState<any>({});

  // ─────────────────────────────────────────────
  // 📡 Pull user info directly from users table
  // ─────────────────────────────────────────────
  useEffect(() => {
    const fetchUser = async () => {
      // ✅ fallback logic only for this screen
      const endpoint = userId
        ? `${API_BASE_URL}/users/${userId}`
        : sub
        ? `${API_BASE_URL}/users/auth0/${sub}`
        : null;

      if (!endpoint) {
        console.warn('❌ Neither userId nor sub is available — cannot fetch');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(endpoint);
        if (!res.ok) {
          console.error('❌ Failed to fetch user info', res.status);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setInitialData(data || {});
        setFirstName(data?.first_name || '');
        setLastName(data?.last_name || '');
        setProfession(data?.profession || '');
        setFashionLevel(data?.fashion_level || '');
        setProfilePicture(data?.profile_picture || null);
      } catch (err) {
        console.error('Failed to load user info', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId, sub]);

  const pickImage = () => {
    ImagePicker.launchImageLibrary({mediaType: 'photo'}, res => {
      if (!res.didCancel && res.assets?.[0]?.uri) {
        setProfilePicture(res.assets[0].uri);
      }
    });
  };

  const hasChanges = Boolean(
    (firstName && firstName !== initialData.first_name) ||
      (lastName && lastName !== initialData.last_name) ||
      (profession && profession !== initialData.profession) ||
      (fashionLevel && fashionLevel !== initialData.fashion_level) ||
      (profilePicture && profilePicture !== initialData.profile_picture),
  );

  // ─────────────────────────────────────────────
  // 💾 Save updates directly to users table
  // ─────────────────────────────────────────────
  const handleSave = async () => {
    try {
      const dto: any = {};
      if (firstName && firstName !== initialData.first_name)
        dto.first_name = firstName;
      if (lastName && lastName !== initialData.last_name)
        dto.last_name = lastName;
      if (profession && profession !== initialData.profession)
        dto.profession = profession;
      if (fashionLevel && fashionLevel !== initialData.fashion_level)
        dto.fashion_level = fashionLevel;
      if (profilePicture && profilePicture !== initialData.profile_picture)
        dto.profile_picture = profilePicture;

      if (Object.keys(dto).length === 0) return;

      const endpoint = userId
        ? `${API_BASE_URL}/users/${userId}`
        : `${API_BASE_URL}/users/auth0/${sub}`;

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dto),
      });

      if (!res.ok) {
        console.error('❌ Failed to update user info', res.status);
        return;
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

  return (
    <Animated.ScrollView
      style={[
        globalStyles.container,
        {backgroundColor: colors.background, opacity: fadeAnim},
      ]}
      contentContainerStyle={styles.content}>
      <Text style={[styles.title, {color: colors.primary}]}>
        Personal Information
      </Text>

      {/* Profile Picture */}
      <View style={styles.avatarContainer}>
        {profilePicture ? (
          <Image source={{uri: profilePicture}} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]} />
        )}
        <AppleTouchFeedback
          onPress={pickImage}
          hapticStyle="impactLight"
          style={[globalStyles.buttonPrimary, styles.photoButton]}>
          <Text style={globalStyles.buttonPrimaryText}>Change Photo</Text>
        </AppleTouchFeedback>
      </View>

      {/* Inputs */}
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

        <Text style={[styles.label, {color: colors.foreground}]}>
          Fashion Level
        </Text>
        <TextInput
          value={fashionLevel}
          onChangeText={setFashionLevel}
          style={[styles.input, {color: colors.foreground}]}
          placeholder="Beginner, Intermediate, Expert..."
          placeholderTextColor={colors.muted}
        />
      </View>

      <View style={styles.buttonRow}>
        {/* Save */}
        <AppleTouchFeedback
          onPress={hasChanges ? handleSave : () => {}}
          hapticStyle="impactMedium"
          style={[
            globalStyles.buttonPrimary,
            {width: 120, opacity: hasChanges ? 1 : 0.5},
          ]}>
          <Text style={globalStyles.buttonPrimaryText}>Save</Text>
        </AppleTouchFeedback>

        {/* Spacer */}
        <View style={{width: 12}} />

        {/* Cancel */}
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
