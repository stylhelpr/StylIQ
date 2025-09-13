// screens/OnboardingScreen.tsx
import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import {useAppTheme} from '../context/ThemeContext';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useUUID} from '../context/UUIDContext';
import {API_BASE_URL} from '../config/api';
import {getAccessToken} from '../utils/auth';

type Props = {navigate: (screen: string, params?: any) => void};

export default function OnboardingScreen({navigate}: Props) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const userId = useUUID();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    profession: '',
    fashion_level: '',
    gender_presentation: '',
  });

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm(prev => ({...prev, [field]: value}));
  };

  const styles = StyleSheet.create({
    container: {flex: 1},
    card: {
      padding: 20,
      borderRadius: 20,
      shadowOpacity: 0.1,
      shadowRadius: 8,
      backgroundColor: theme.colors.frostedGlass,
      margin: 6,
    },
    title: {
      fontSize: 36,
      fontWeight: '600',
      marginBottom: 22,
      color: theme.colors.primary,
      textAlign: 'center',
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 8,
      color: theme.colors.primary,
      textTransform: 'capitalize',
    },
    input: {
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginBottom: 22,
      fontSize: 15,
      backgroundColor: theme.colors.surface3,
      color: theme.colors.primary,
    },
    button: {
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 20,
      backgroundColor: theme.colors.button1,
      opacity: saving ? 0.6 : 1,
    },
    buttonText: {fontSize: 16, fontWeight: '600', color: 'white'},
  });

  // Normalize to match your Postgres CHECK constraint
  const normalizeGender = (s: string) =>
    s.trim().toLowerCase().replace(/\s+/g, '_'); // ← change '_' to '-' if your DB uses hyphens

  const buildPayload = () => {
    const payload: Record<string, any> = {onboarding_complete: true};
    for (const [k, v] of Object.entries(form)) {
      if (typeof v === 'string') {
        const trimmed = v.trim();
        if (trimmed !== '') payload[k] = trimmed;
      }
    }
    if (payload.gender_presentation) {
      payload.gender_presentation = normalizeGender(
        payload.gender_presentation,
      );
    }
    return payload;
  };

  const resolveUserId = async (token: string | null) => {
    let id = userId;
    if (!id && token) {
      try {
        const profRes = await fetch(`${API_BASE_URL}/auth/profile`, {
          headers: {Authorization: `Bearer ${token}`},
        });
        const prof = await profRes.json().catch(() => ({} as any));
        id = (prof && (prof.id || prof.uuid)) || null; // your /auth/profile returns { uuid: ... }
        console.log('🔎 /auth/profile resolved id:', id, 'raw:', prof);
      } catch (e) {
        console.log('⚠️ /auth/profile failed:', e);
      }
    }
    return id;
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    console.log('🟢 SAVE BUTTON CLICKED');

    try {
      const token = await getAccessToken();
      const id = await resolveUserId(token || null);

      const payload = buildPayload();
      console.log('📤 PUT payload ->', payload);

      if (id && token) {
        const res = await fetch(`${API_BASE_URL}/users/${id}`, {
          method: 'PUT', // matches @Put(':id') on your backend
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const text = await res.text(); // ensure body is consumed exactly once
        let data: any = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          /* non-JSON; keep raw text */
        }

        console.log('📥 PUT /users/:id status:', res.status);
        console.log('📥 PUT /users/:id body:', data ?? text);

        if (!res.ok) {
          // Show quick hint to help you see DB constraint issues fast
          Alert.alert(
            'Profile Save Issue',
            data?.message || text || 'Update failed.',
          );
          console.log('❌ PUT /users/:id failed');
        } else {
          console.log('✅ Onboarding saved to DB');
        }
      } else {
        console.log('⚠️ Missing user id or token; skipping server update.');
      }

      // Local flag so RootNavigator routes to Home immediately
      await AsyncStorage.setItem('onboarding_complete', 'true');
      navigate('Home');
    } catch (err) {
      console.error('❌ Onboarding save error:', err);
      // Still unblock locally
      await AsyncStorage.setItem('onboarding_complete', 'true');
      navigate('Home');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Animatable.View animation="fadeInUp" duration={600} style={styles.card}>
        <Text style={styles.title}>Welcome to StylHelpr</Text>

        {Object.keys(form).map(field => (
          <View key={field}>
            <Text style={styles.label}>{field.replace(/_/g, ' ')}</Text>
            <TextInput
              style={styles.input}
              placeholder={`Enter ${field.replace(/_/g, ' ')}`}
              placeholderTextColor={theme.colors.inputText1}
              autoCapitalize="none"
              value={form[field as keyof typeof form]}
              onChangeText={val =>
                handleChange(field as keyof typeof form, val)
              }
            />
          </View>
        ))}

        <AppleTouchFeedback hapticStyle="impactMedium">
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={saving}>
            {saving ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.buttonText}>Save Profile</Text>
            )}
          </TouchableOpacity>
        </AppleTouchFeedback>
      </Animatable.View>
    </ScrollView>
  );
}

////////////////

// // screens/OnboardingScreen.tsx
// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {getAccessToken} from '../utils/auth';

// type Props = {navigate: (screen: string, params?: any) => void};

// export default function OnboardingScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID();
//   const [saving, setSaving] = useState(false);

//   const [form, setForm] = useState({
//     first_name: '',
//     last_name: '',
//     email: '',
//     profession: '',
//     fashion_level: '',
//     gender_presentation: '',
//   });

//   const handleChange = (field: keyof typeof form, value: string) => {
//     setForm(prev => ({...prev, [field]: value}));
//   };

//   const styles = StyleSheet.create({
//     container: {flex: 1},
//     card: {
//       padding: 20,
//       borderRadius: 20,
//       shadowOpacity: 0.1,
//       shadowRadius: 8,
//       backgroundColor: theme.colors.frostedGlass,
//       margin: 6,
//     },
//     title: {
//       fontSize: 36,
//       fontWeight: '600',
//       marginBottom: 22,
//       color: theme.colors.primary,
//       textAlign: 'center',
//     },
//     label: {
//       fontSize: 13,
//       fontWeight: '600',
//       marginBottom: 8,
//       color: theme.colors.primary,
//       textTransform: 'capitalize',
//     },
//     input: {
//       borderRadius: 12,
//       paddingHorizontal: 14,
//       paddingVertical: 14,
//       marginBottom: 22,
//       fontSize: 15,
//       backgroundColor: theme.colors.surface3,
//       color: theme.colors.primary,
//     },
//     button: {
//       borderRadius: 14,
//       paddingVertical: 16,
//       alignItems: 'center',
//       marginTop: 20,
//       backgroundColor: theme.colors.button1,
//       opacity: saving ? 0.6 : 1,
//     },
//     buttonText: {fontSize: 16, fontWeight: '600', color: 'white'},
//   });

//   const handleSave = async () => {
//     if (saving) return;
//     setSaving(true);
//     console.log('🟢 SAVE BUTTON CLICKED');
//     try {
//       const token = await getAccessToken();
//       // Resolve user id; useUUID can be briefly null on first mount
//       let id = userId;
//       if (!id && token) {
//         const profRes = await fetch(`${API_BASE_URL}/auth/profile`, {
//           headers: {Authorization: `Bearer ${token}`},
//         });
//         if (profRes.ok) {
//           const prof = await profRes.json();
//           id = prof?.id || prof?.uuid || null;
//         }
//       }

//       if (id && token) {
//         const res = await fetch(`${API_BASE_URL}/users/${id}`, {
//           method: 'PUT', // backend exposes @Put(':id')
//           headers: {
//             'Content-Type': 'application/json',
//             Authorization: `Bearer ${token}`,
//           },
//           body: JSON.stringify({
//             ...form,
//             onboarding_complete: true,
//           }),
//         });

//         if (!res.ok) {
//           const msg = await res.text();
//           console.log('❌ PUT /users/:id failed:', msg);
//         } else {
//           console.log('✅ Onboarding saved to DB');
//         }
//       } else {
//         console.log('⚠️ Missing user id or token; skipping server update.');
//       }

//       // Local flag so RootNavigator routes to Home immediately
//       await AsyncStorage.setItem('onboarding_complete', 'true');
//       navigate('Home');
//     } catch (err) {
//       console.error('❌ Onboarding save error:', err);
//       // Unblock locally even if server hiccups
//       await AsyncStorage.setItem('onboarding_complete', 'true');
//       navigate('Home');
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
//       <Animatable.View animation="fadeInUp" duration={600} style={styles.card}>
//         <Text style={styles.title}>Welcome to StylHelpr</Text>

//         {Object.keys(form).map(field => (
//           <View key={field}>
//             <Text style={styles.label}>{field.replace(/_/g, ' ')}</Text>
//             <TextInput
//               style={styles.input}
//               placeholder={`Enter ${field.replace(/_/g, ' ')}`}
//               placeholderTextColor={theme.colors.inputText1}
//               autoCapitalize="none"
//               value={form[field as keyof typeof form]}
//               onChangeText={val =>
//                 handleChange(field as keyof typeof form, val)
//               }
//             />
//           </View>
//         ))}

//         <AppleTouchFeedback hapticStyle="impactMedium">
//           <TouchableOpacity
//             style={styles.button}
//             activeOpacity={0.85}
//             onPress={handleSave}
//             disabled={saving}>
//             {saving ? (
//               <ActivityIndicator />
//             ) : (
//               <Text style={styles.buttonText}>Save Profile</Text>
//             )}
//           </TouchableOpacity>
//         </AppleTouchFeedback>
//       </Animatable.View>
//     </ScrollView>
//   );
// }

////////////////////////

// // screens/OnboardingScreen.tsx
// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   ScrollView,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {getAccessToken} from '../utils/auth';

// type Props = {navigate: (screen: string, params?: any) => void};

// export default function OnboardingScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID();

//   const [form, setForm] = useState({
//     first_name: '',
//     last_name: '',
//     email: '',
//     profession: '',
//     fashion_level: '',
//     gender_presentation: '',
//   });

//   const handleChange = (field: keyof typeof form, value: string) => {
//     setForm(prev => ({...prev, [field]: value}));
//   };

//   const styles = StyleSheet.create({
//     container: {flex: 1},
//     card: {
//       padding: 20,
//       borderRadius: 20,
//       shadowOpacity: 0.1,
//       shadowRadius: 8,
//       backgroundColor: theme.colors.frostedGlass,
//       margin: 6,
//     },
//     title: {
//       fontSize: 36,
//       fontWeight: '600',
//       marginBottom: 22,
//       color: theme.colors.primary,
//       textAlign: 'center',
//     },
//     label: {
//       fontSize: 13,
//       fontWeight: '600',
//       marginBottom: 8,
//       color: theme.colors.primary,
//       textTransform: 'capitalize',
//     },
//     input: {
//       borderRadius: 12,
//       paddingHorizontal: 14,
//       paddingVertical: 14,
//       marginBottom: 22,
//       fontSize: 15,
//       backgroundColor: theme.colors.surface3,
//       color: theme.colors.primary,
//     },
//     button: {
//       borderRadius: 14,
//       paddingVertical: 16,
//       alignItems: 'center',
//       marginTop: 20,
//       backgroundColor: theme.colors.button1,
//     },
//     buttonText: {fontSize: 16, fontWeight: '600', color: theme.colors.primary},
//   });

//   const handleSave = async () => {
//     console.log('SAVE BUTTON CLICKED');
//     try {
//       // 1) Get token
//       const token = await getAccessToken();

//       // 2) Make sure we have the user id (useUUID can be null for a moment)
//       let id = userId;
//       if (!id && token) {
//         const profRes = await fetch(`${API_BASE_URL}/auth/profile`, {
//           headers: {Authorization: `Bearer ${token}`},
//         });
//         if (profRes.ok) {
//           const prof = await profRes.json();
//           id = prof?.id || prof?.uuid || null;
//         }
//       }

//       // 3) PATCH the users table row
//       if (id && token) {
//         const res = await fetch(`${API_BASE_URL}/users/${id}`, {
//           method: 'PUT',
//           headers: {
//             'Content-Type': 'application/json',
//             Authorization: `Bearer ${token}`,
//           },
//           body: JSON.stringify({
//             ...form,
//             onboarding_complete: true,
//           }),
//         });

//         if (!res.ok) {
//           const msg = await res.text();
//           console.log('❌ Onboarding PATCH failed:', msg);
//         }
//       } else {
//         console.log('⚠️ Missing user id or token; skipping server update.');
//       }

//       // 4) Local flag so your RootNavigator routes to Home immediately
//       await AsyncStorage.setItem('onboarding_complete', 'true');
//       navigate('Home');
//     } catch (err) {
//       console.error('❌ Onboarding save failed:', err);
//       // still unblock locally
//       await AsyncStorage.setItem('onboarding_complete', 'true');
//       navigate('Home');
//     }
//   };

//   return (
//     <ScrollView style={styles.container}>
//       <Animatable.View animation="fadeInUp" duration={600} style={styles.card}>
//         <Text style={styles.title}>Welcome to StylHelpr</Text>

//         {Object.keys(form).map(field => (
//           <View key={field}>
//             <Text style={styles.label}>{field.replace(/_/g, ' ')}</Text>
//             <TextInput
//               style={styles.input}
//               placeholder={`Enter ${field.replace(/_/g, ' ')}`}
//               placeholderTextColor={theme.colors.inputText1}
//               value={form[field as keyof typeof form]}
//               onChangeText={val =>
//                 handleChange(field as keyof typeof form, val)
//               }
//             />
//           </View>
//         ))}

//         <AppleTouchFeedback onPress={handleSave}>
//           <TouchableOpacity style={styles.button}>
//             <Text style={{fontSize: 13, color: 'white', fontWeight: '600'}}>
//               Save Profile
//             </Text>
//           </TouchableOpacity>
//         </AppleTouchFeedback>
//       </Animatable.View>
//     </ScrollView>
//   );
// }

///////////////////

// // screens/OnboardingScreen.tsx
// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   ScrollView,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {getAccessToken} from '../utils/auth';

// type Props = {navigate: (screen: string, params?: any) => void};

// export default function OnboardingScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID();

//   const [form, setForm] = useState({
//     first_name: '',
//     last_name: '',
//     email: '',
//     profession: '',
//     fashion_level: '',
//     gender_presentation: '',
//   });

//   const handleChange = (field: keyof typeof form, value: string) => {
//     setForm(prev => ({...prev, [field]: value}));
//   };

//   const styles = StyleSheet.create({
//     container: {flex: 1},
//     card: {
//       padding: 20,
//       borderRadius: 20,
//       shadowOpacity: 0.1,
//       shadowRadius: 8,
//       backgroundColor: theme.colors.frostedGlass,
//       margin: 6,
//     },
//     title: {
//       fontSize: 36,
//       fontWeight: '600',
//       marginBottom: 22,
//       color: theme.colors.primary,
//       textAlign: 'center',
//     },
//     label: {
//       fontSize: 13,
//       fontWeight: '600',
//       marginBottom: 8,
//       color: theme.colors.primary,
//       textTransform: 'capitalize',
//     },
//     input: {
//       borderRadius: 12,
//       paddingHorizontal: 14,
//       paddingVertical: 14,
//       marginBottom: 22,
//       fontSize: 15,
//       backgroundColor: theme.colors.surface3,
//       color: theme.colors.primary,
//     },
//     button: {
//       borderRadius: 14,
//       paddingVertical: 16,
//       alignItems: 'center',
//       marginTop: 20,
//       backgroundColor: theme.colors.button1,
//     },
//     buttonText: {fontSize: 16, fontWeight: '600', color: theme.colors.primary},
//   });

//   const handleSave = async () => {
//     try {
//       // 1) Get token
//       const token = await getAccessToken();

//       // 2) Make sure we have the user id (useUUID can be null for a moment)
//       let id = userId;
//       if (!id && token) {
//         const profRes = await fetch(`${API_BASE_URL}/auth/profile`, {
//           headers: {Authorization: `Bearer ${token}`},
//         });
//         if (profRes.ok) {
//           const prof = await profRes.json();
//           id = prof?.id || prof?.uuid || null;
//         }
//       }

//       // 3) PATCH the users table row
//       if (id && token) {
//         const res = await fetch(`${API_BASE_URL}/users/${id}`, {
//           method: 'PATCH',
//           headers: {
//             'Content-Type': 'application/json',
//             Authorization: `Bearer ${token}`,
//           },
//           body: JSON.stringify({
//             ...form,
//             onboarding_complete: true,
//           }),
//         });

//         if (!res.ok) {
//           const msg = await res.text();
//           console.log('❌ Onboarding PATCH failed:', msg);
//         }
//       } else {
//         console.log('⚠️ Missing user id or token; skipping server update.');
//       }

//       // 4) Local flag so your RootNavigator routes to Home immediately
//       await AsyncStorage.setItem('onboarding_complete', 'true');
//       navigate('Home');
//     } catch (err) {
//       console.error('❌ Onboarding save failed:', err);
//       // still unblock locally
//       await AsyncStorage.setItem('onboarding_complete', 'true');
//       navigate('Home');
//     }
//   };

//   return (
//     <ScrollView style={styles.container}>
//       <Animatable.View animation="fadeInUp" duration={600} style={styles.card}>
//         <Text style={styles.title}>Welcome to StylHelpr</Text>

//         {Object.keys(form).map(field => (
//           <View key={field}>
//             <Text style={styles.label}>{field.replace(/_/g, ' ')}</Text>
//             <TextInput
//               style={styles.input}
//               placeholder={`Enter ${field.replace(/_/g, ' ')}`}
//               placeholderTextColor={theme.colors.inputText1}
//               value={form[field as keyof typeof form]}
//               onChangeText={val =>
//                 handleChange(field as keyof typeof form, val)
//               }
//             />
//           </View>
//         ))}

//         <AppleTouchFeedback onPress={handleSave}>
//           <TouchableOpacity style={styles.button}>
//             <Text style={{fontSize: 13, color: 'white', fontWeight: '600'}}>
//               Save Profile
//             </Text>
//           </TouchableOpacity>
//         </AppleTouchFeedback>
//       </Animatable.View>
//     </ScrollView>
//   );
// }

//////////////////

// // screens/Onboarding/OnboardingScreen.tsx
// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   ScrollView,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';

// // type Props = {onDone?: () => void};
// type Props = {navigate: (screen: string, params?: any) => void};

// export default function OnboardingScreen() {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();
//   const userId = useUUID();

//   const [form, setForm] = useState({
//     first_name: '',
//     last_name: '',
//     email: '',
//     // profile_picture: '',
//     profession: '',
//     fashion_level: '',
//     gender_presentation: '',
//   });

//   const handleChange = (field: keyof typeof form, value: string) => {
//     setForm(prev => ({...prev, [field]: value}));
//   };

//   const styles = StyleSheet.create({
//     container: {flex: 1},
//     card: {
//       padding: 20,
//       borderRadius: 20,
//       shadowOpacity: 0.1,
//       shadowRadius: 8,
//       backgroundColor: theme.colors.frostedGlass,
//       margin: 6,
//     },
//     title: {
//       fontSize: 36,
//       fontWeight: '600',
//       marginBottom: 22,
//       color: theme.colors.primary,
//       textAlign: 'center',
//     },
//     label: {
//       fontSize: 13,
//       fontWeight: '600',
//       marginBottom: 8,
//       color: theme.colors.primary,
//       textTransform: 'capitalize',
//     },
//     input: {
//       borderRadius: 12,
//       paddingHorizontal: 14,
//       paddingVertical: 14,
//       marginBottom: 22,
//       fontSize: 15,
//       backgroundColor: theme.colors.surface3,
//       color: theme.colors.primary,
//     },
//     button: {
//       borderRadius: 14,
//       paddingVertical: 16,
//       alignItems: 'center',
//       marginTop: 20,
//       backgroundColor: theme.colors.button1,
//     },
//     buttonText: {fontSize: 16, fontWeight: '600', color: theme.colors.primary},
//   });

//   return (
//     <ScrollView style={styles.container}>
//       <Animatable.View animation="fadeInUp" duration={600} style={styles.card}>
//         <Text style={styles.title}>Welcome to StylHelpr</Text>

//         {Object.keys(form).map(field => (
//           <View key={field}>
//             <Text style={styles.label}>{field.replace(/_/g, ' ')}</Text>
//             <TextInput
//               style={styles.input}
//               placeholder={`Enter ${field.replace(/_/g, ' ')}`}
//               placeholderTextColor={theme.colors.inputText1}
//               value={form[field as keyof typeof form]}
//               onChangeText={val =>
//                 handleChange(field as keyof typeof form, val)
//               }
//             />
//           </View>
//         ))}

//         <AppleTouchFeedback
//           onPress={async () => {
//             try {
//               if (userId) {
//                 await fetch(`${API_BASE_URL}/users/${userId}`, {
//                   method: 'PATCH',
//                   headers: {'Content-Type': 'application/json'},
//                   body: JSON.stringify({...form, onboarding_complete: true}),
//                 });
//               }
//               await AsyncStorage.setItem('onboarding_complete', 'true');
//               navigate('Home');
//             } catch (err) {
//               console.error('❌ Onboarding save failed:', err);
//             }
//           }}>
//           <TouchableOpacity style={styles.button}>
//             <Text style={{fontSize: 13, color: 'white', fontWeight: '600'}}>
//               Save Profile
//             </Text>
//           </TouchableOpacity>
//         </AppleTouchFeedback>
//       </Animatable.View>
//     </ScrollView>
//   );
// }

////////////////

// // screens/Onboarding/OnboardingScreen.tsx
// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   ScrollView,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import {useAppTheme} from '../context/ThemeContext';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

// export default function OnboardingScreen() {
//   const {theme} = useAppTheme();
//   const globalStyles = useGlobalStyles();

//   const [form, setForm] = useState({
//     first_name: '',
//     last_name: '',
//     email: '',
//     // profile_picture: '',
//     profession: '',
//     fashion_level: '',
//     gender_presentation: '',
//   });

//   const handleChange = (field: keyof typeof form, value: string) => {
//     setForm(prev => ({...prev, [field]: value}));
//   };

//   const styles = StyleSheet.create({
//     container: {flex: 1},
//     card: {
//       padding: 20,
//       borderRadius: 20,
//       shadowOpacity: 0.1,
//       shadowRadius: 8,
//       backgroundColor: theme.colors.frostedGlass,
//       margin: 6,
//     },
//     title: {
//       fontSize: 36,
//       fontWeight: '600',
//       marginBottom: 22,
//       color: theme.colors.primary,
//       textAlign: 'center',
//     },
//     label: {
//       fontSize: 13,
//       fontWeight: '600',
//       marginBottom: 8,
//       color: theme.colors.primary,
//       textTransform: 'capitalize',
//     },
//     input: {
//       borderRadius: 12,
//       paddingHorizontal: 14,
//       paddingVertical: 14,
//       marginBottom: 22,
//       fontSize: 15,
//       backgroundColor: theme.colors.surface3,
//       color: theme.colors.primary,
//     },
//     button: {
//       borderRadius: 14,
//       paddingVertical: 16,
//       alignItems: 'center',
//       marginTop: 20,
//       backgroundColor: theme.colors.button1,
//     },
//     buttonText: {fontSize: 16, fontWeight: '600', color: theme.colors.primary},
//   });

//   return (
//     <ScrollView style={styles.container}>
//       <Animatable.View animation="fadeInUp" duration={600} style={styles.card}>
//         <Text style={styles.title}>Welcome to StylHelpr</Text>

//         {Object.keys(form).map(field => (
//           <View key={field}>
//             <Text style={styles.label}>{field.replace(/_/g, ' ')}</Text>
//             <TextInput
//               style={styles.input}
//               placeholder={`Enter ${field.replace(/_/g, ' ')}`}
//               placeholderTextColor={theme.colors.inputText1}
//               value={form[field as keyof typeof form]}
//               onChangeText={val =>
//                 handleChange(field as keyof typeof form, val)
//               }
//             />
//           </View>
//         ))}

//         <AppleTouchFeedback onPress={() => {}}>
//           <TouchableOpacity style={styles.button}>
//             <Text style={{fontSize: 13, color: 'white', fontWeight: '600'}}>
//               Save Profile
//             </Text>
//           </TouchableOpacity>
//         </AppleTouchFeedback>
//       </Animatable.View>
//     </ScrollView>
//   );
// }
