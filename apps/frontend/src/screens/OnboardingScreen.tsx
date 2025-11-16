// // screens/OnboardingScreen.tsx
import React, {useRef, useState, useEffect} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  FlatList,
  Animated,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';

import * as Animatable from 'react-native-animatable';
import {Picker} from '@react-native-picker/picker';
import {useAppTheme} from '../context/ThemeContext';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth0} from 'react-native-auth0';
import {useUUID} from '../context/UUIDContext';
import {API_BASE_URL} from '../config/api';
import {getAccessToken} from '../utils/auth';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';

type Props = {navigate: (screen: string, params?: any) => void};

const {width} = Dimensions.get('window');
const ONBOARDING_KEY = 'stylhelpr_onboarding_complete';

export default function OnboardingScreen({navigate}: Props) {
  const {theme, setSkin} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const {user} = useAuth0();
  const userId = useUUID();

  // -----------------------------------------------------
  // STYLES
  // -----------------------------------------------------
  const styles = StyleSheet.create({
    panel: {
      width,
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },

    stepImage: {
      width: width * 0.75,
      height: width * 0.75,
      borderRadius: 20,
      marginBottom: 40,
    },

    stepTitle: {
      fontSize: 28,
      fontWeight: '700',
    },

    stepDescription: {
      fontSize: 17,
      textAlign: 'center',
      opacity: 0.7,
      paddingHorizontal: 20,
      marginTop: 20,
    },

    formContainer: {
      width,
      paddingTop: 140,
    },
    card: {
      padding: 20,
      borderRadius: 20,
      margin: 6,
    },
    title: {
      fontSize: 36,
      fontWeight: '600',
      marginBottom: 22,
      textAlign: 'center',
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 8,
      textTransform: 'capitalize',
      color: theme.colors.foreground,
    },
    input: {
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginBottom: 22,
      fontSize: 15,
      color: theme.colors.foreground,
    },
    selectorButton: {
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 16,
      marginBottom: 22,
      borderWidth: 1,
    },
    selectorText: {
      fontSize: 15,
    },
    modalRoot: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    backdropHitArea: {flex: 1},
    sheet: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 24,
    },
    sheetToolbar: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      padding: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    button: {
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 20,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },

    dotsContainer: {
      position: 'absolute',
      bottom: 105,
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    dot: {
      height: 8,
      marginHorizontal: 5,
      borderRadius: 4,
    },
  });

  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  const [index, setIndex] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // NEW → Required to prevent FlatList jumping to slide 6
  const [ready, setReady] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setReady(true));
  }, []);

  // ------------------------
  // OLD FORM STATE
  // ------------------------
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    profession: '',
    fashion_level: '',
    gender_presentation: '',
  });

  const [showFashionPicker, setShowFashionPicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);

  const handleChange = (field, val) => {
    setForm(prev => ({...prev, [field]: val}));
  };

  const normalizeGender = s => s.trim().toLowerCase().replace(/\s+/g, '_');

  const buildPayload = () => {
    const payload = {onboarding_complete: true};
    for (const [k, v] of Object.entries(form)) {
      const trimmed = typeof v === 'string' ? v.trim() : v;
      if (trimmed) payload[k] = trimmed;
    }
    if (payload.gender_presentation) {
      payload.gender_presentation = normalizeGender(
        payload.gender_presentation,
      );
    }
    return payload;
  };

  const resolveUserId = async token => {
    let id = userId;
    if (!id && token) {
      try {
        const profRes = await fetch(`${API_BASE_URL}/auth/profile`, {
          headers: {Authorization: `Bearer ${token}`},
        });
        const prof = await profRes.json().catch(() => ({}));
        id = prof?.id || prof?.uuid || null;
      } catch {}
    }
    return id;
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);

    try {
      const token = await getAccessToken();
      const id = await resolveUserId(token);
      const payload = buildPayload();

      if (id && token) {
        await fetch(`${API_BASE_URL}/users/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }

      // Mark onboarding complete
      await AsyncStorage.setItem('onboarding_complete', 'true');

      // 👇 NEW: go to the LAST CARD (index 6)
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToIndex({
          index: 6,
          animated: true,
        });
      });
    } catch (err) {
      await AsyncStorage.setItem('onboarding_complete', 'true');

      // still go to last card even if the request fails
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToIndex({
          index: 6,
          animated: true,
        });
      });
    } finally {
      setSaving(false);
    }
  };

  // ------------------------
  // OLD FORM SLIDE
  // ------------------------
  const OldFormSlide = (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      style={[styles.formContainer, {backgroundColor: theme.colors.surface}]}>
      <Animatable.View
        animation="fadeInUp"
        duration={600}
        style={[styles.card, {backgroundColor: theme.colors.surface}]}>
        <Text style={[styles.title, {color: theme.colors.button1}]}>
          Welcome to StylHelpr
        </Text>

        <Text style={styles.label}>First Name</Text>
        <TextInput
          style={[styles.input, {backgroundColor: theme.colors.surface3}]}
          placeholder="Enter first name"
          placeholderTextColor={theme.colors.inputText1}
          value={form.first_name}
          onChangeText={val => handleChange('first_name', val)}
        />

        <Text style={styles.label}>Last Name</Text>
        <TextInput
          style={[styles.input, {backgroundColor: theme.colors.surface3}]}
          placeholder="Enter last name"
          placeholderTextColor={theme.colors.inputText1}
          value={form.last_name}
          onChangeText={val => handleChange('last_name', val)}
        />

        <Text style={styles.label}>Profession</Text>
        <TextInput
          style={[styles.input, {backgroundColor: theme.colors.surface3}]}
          placeholder="Enter profession"
          placeholderTextColor={theme.colors.inputText1}
          value={form.profession}
          onChangeText={val => handleChange('profession', val)}
        />

        <Text style={styles.label}>Fashion Level</Text>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.selectorButton,
            {
              backgroundColor: theme.colors.surface3,
              borderColor: theme.colors.surfaceBorder,
            },
          ]}
          onPress={() => setShowFashionPicker(true)}>
          <Text style={[styles.selectorText, {color: theme.colors.muted}]}>
            {form.fashion_level || 'Select fashion level'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>Gender Presentation</Text>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.selectorButton,
            {
              backgroundColor: theme.colors.surface3,
              borderColor: theme.colors.surfaceBorder,
            },
          ]}
          onPress={() => setShowGenderPicker(true)}>
          <Text style={[styles.selectorText, {color: theme.colors.muted}]}>
            {form.gender_presentation || 'Select gender presentation'}
          </Text>
        </TouchableOpacity>

        <AppleTouchFeedback hapticStyle="impactMedium">
          <TouchableOpacity
            style={[styles.button, {backgroundColor: theme.colors.button1}]}
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={saving}>
            {saving ? (
              <ActivityIndicator />
            ) : (
              <Text
                style={[styles.buttonText, {color: theme.colors.buttonText1}]}>
                Save Profile
              </Text>
            )}
          </TouchableOpacity>
        </AppleTouchFeedback>
      </Animatable.View>

      {/* FASHION PICKER MODAL */}
      <Modal visible={showFashionPicker} transparent animationType="slide">
        <View style={styles.modalRoot}>
          <TouchableWithoutFeedback onPress={() => setShowFashionPicker(false)}>
            <View style={styles.backdropHitArea} />
          </TouchableWithoutFeedback>

          <View style={[styles.sheet, {backgroundColor: theme.colors.surface}]}>
            <View style={styles.sheetToolbar}>
              <TouchableOpacity onPress={() => setShowFashionPicker(false)}>
                <Text style={{color: theme.colors.button1, fontWeight: '600'}}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>

            <Picker
              selectedValue={form.fashion_level}
              onValueChange={val => handleChange('fashion_level', val)}
              itemStyle={{
                color: theme.colors.foreground,
                fontSize: 18,
                fontWeight: '500',
              }}>
              <Picker.Item label="Select fashion level" value="" />
              <Picker.Item label="Expert" value="Expert" />
              <Picker.Item label="Intermediate" value="Intermediate" />
              <Picker.Item label="Novice" value="Novice" />
            </Picker>
          </View>
        </View>
      </Modal>

      {/* GENDER PICKER MODAL */}
      <Modal visible={showGenderPicker} transparent animationType="slide">
        <View style={styles.modalRoot}>
          <TouchableWithoutFeedback onPress={() => setShowGenderPicker(false)}>
            <View style={styles.backdropHitArea} />
          </TouchableWithoutFeedback>

          <View style={[styles.sheet, {backgroundColor: theme.colors.surface}]}>
            <View style={styles.sheetToolbar}>
              <TouchableOpacity onPress={() => setShowGenderPicker(false)}>
                <Text style={{color: theme.colors.button1, fontWeight: '600'}}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>

            <Picker
              selectedValue={form.gender_presentation}
              onValueChange={val => handleChange('gender_presentation', val)}
              itemStyle={{
                color: theme.colors.foreground,
                fontSize: 18,
                fontWeight: '500',
              }}>
              <Picker.Item label="Select gender presentation" value="" />
              <Picker.Item label="Male" value="Male" />
              <Picker.Item label="Female" value="Female" />
              <Picker.Item label="Other" value="Other" />
            </Picker>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );

  // ------------------------
  // CARDS
  // ------------------------
  const Step = ({title, description, image}) => (
    <View style={[styles.panel, {backgroundColor: theme.colors.surface}]}>
      <Image source={image} style={styles.stepImage} />
      <Text style={[styles.stepTitle, {color: theme.colors.foreground}]}>
        {title}
      </Text>
      <Text style={[styles.stepDescription, {color: theme.colors.foreground}]}>
        {description}
      </Text>
    </View>
  );

  //   const handleSave = async () => {
  //     if (saving) return;
  //     setSaving(true);

  //     try {
  //       const token = await getAccessToken();
  //       const id = await resolveUserId(token || null);
  //       const payload = buildPayload();

  //       if (id && token) {
  //         await fetch(`${API_BASE_URL}/users/${id}`, {
  //           method: 'PUT',
  //           headers: {
  //             'Content-Type': 'application/json',
  //             Authorization: `Bearer ${token}`,
  //           },
  //           body: JSON.stringify(payload),
  //         });
  //       }

  //       await AsyncStorage.setItem('onboarding_complete', 'true');
  //       navigate('Home');
  //     } catch (err) {
  //       await AsyncStorage.setItem('onboarding_complete', 'true');
  //       navigate('Home');
  //     } finally {
  //       setSaving(false);
  //     }
  //   };

  const GetStarted = () => (
    <View style={[styles.panel, {backgroundColor: theme.colors.surface}]}>
      <Text style={[styles.stepTitle, {color: theme.colors.foreground}]}>
        You're all set!
      </Text>

      <TouchableOpacity onPress={() => navigate('Home')}>
        <View
          style={[
            styles.button,
            {backgroundColor: theme.colors.button1, width: 200},
          ]}>
          <Text style={{color: theme.colors.buttonText1, fontSize: 18}}>
            Let's Get Started
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const slides = [
    {
      key: '1',
      element: (
        <Step
          title="Welcome to StylHelpr"
          description="StylHelpr analyzes your wardrobe."
          image={require('../assets/images/free1.jpg')}
        />
      ),
    },
    {
      key: '2',
      element: (
        <Step
          title="AI-Powered Fits"
          description="The AI stylist creates outfits tailored to you."
          image={require('../assets/images/headshot-1.webp')}
        />
      ),
    },
    {
      key: '3',
      element: (
        <Step
          title="Daily Inspiration"
          description="Fresh outfit ideas, every day."
          image={require('../assets/images/headshot-3.jpg')}
        />
      ),
    },
    {
      key: '4',
      element: (
        <Step
          title="Travel Mode"
          description="Packing suggestions based on weather."
          image={require('../assets/images/headshot-2.webp')}
        />
      ),
    },
    {
      key: '5',
      element: (
        <Step
          title="Your Style Profile"
          description="Help the AI understand your preferences."
          image={require('../assets/images/headshot-5.jpg')}
        />
      ),
    },

    {key: '6', element: OldFormSlide},

    {key: '7', element: <GetStarted />},
  ];

  const DotIndicator = () => (
    <View style={styles.dotsContainer}>
      {slides.map((_, i) => {
        const inputRange = [(i - 1) * width, i * width, (i + 1) * width];

        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 24, 8],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                width: dotWidth,
                backgroundColor:
                  i === index
                    ? theme.colors.primary
                    : theme.colors.button1 + '55',
              },
            ]}
          />
        );
      })}
    </View>
  );

  // ------------------------
  // RENDER
  // ------------------------

  if (!ready) return null; // ← FIX: Prevent premature mount

  return (
    <View style={{flex: 1}}>
      <FlatList
        ref={flatListRef}
        horizontal
        pagingEnabled
        data={slides}
        keyExtractor={item => item.key}
        renderItem={({item}) => item.element}
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={0}
        scrollEnabled={scrollEnabled}
        getItemLayout={(data, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {x: scrollX}}}],
          {useNativeDriver: false},
        )}
        scrollEventThrottle={16}
      />

      <DotIndicator />
    </View>
  );
}

////////////////

// // // screens/OnboardingScreen.tsx
// import React, {useRef, useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   StyleSheet,
//   Dimensions,
//   FlatList,
//   Animated,
//   TextInput,
//   TouchableOpacity,
//   ScrollView,
//   ActivityIndicator,
//   Modal,
//   TouchableWithoutFeedback,
// } from 'react-native';

// import * as Animatable from 'react-native-animatable';
// import {Picker} from '@react-native-picker/picker';
// import {useAppTheme} from '../context/ThemeContext';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useAuth0} from 'react-native-auth0';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {getAccessToken} from '../utils/auth';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';

// type Props = {navigate: (screen: string, params?: any) => void};

// const {width} = Dimensions.get('window');
// const ONBOARDING_KEY = 'stylhelpr_onboarding_complete';

// export default function OnboardingScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const {user} = useAuth0();
//   const userId = useUUID();

//   const scrollX = useRef(new Animated.Value(0)).current;
//   const flatListRef = useRef(null);

//   const [index, setIndex] = useState(0);
//   const [scrollEnabled, setScrollEnabled] = useState(true);

//   // NEW → Required to prevent FlatList jumping to slide 6
//   const [ready, setReady] = useState(false);
//   useEffect(() => {
//     requestAnimationFrame(() => setReady(true));
//   }, []);

//   // ------------------------
//   // OLD FORM STATE
//   // ------------------------
//   const [saving, setSaving] = useState(false);
//   const [form, setForm] = useState({
//     first_name: '',
//     last_name: '',
//     profession: '',
//     fashion_level: '',
//     gender_presentation: '',
//   });

//   const [showFashionPicker, setShowFashionPicker] = useState(false);
//   const [showGenderPicker, setShowGenderPicker] = useState(false);

//   const handleChange = (field, val) => {
//     setForm(prev => ({...prev, [field]: val}));
//   };

//   const normalizeGender = s => s.trim().toLowerCase().replace(/\s+/g, '_');

//   const buildPayload = () => {
//     const payload = {onboarding_complete: true};
//     for (const [k, v] of Object.entries(form)) {
//       const trimmed = typeof v === 'string' ? v.trim() : v;
//       if (trimmed) payload[k] = trimmed;
//     }
//     if (payload.gender_presentation) {
//       payload.gender_presentation = normalizeGender(
//         payload.gender_presentation,
//       );
//     }
//     return payload;
//   };

//   const resolveUserId = async token => {
//     let id = userId;
//     if (!id && token) {
//       try {
//         const profRes = await fetch(`${API_BASE_URL}/auth/profile`, {
//           headers: {Authorization: `Bearer ${token}`},
//         });
//         const prof = await profRes.json().catch(() => ({}));
//         id = prof?.id || prof?.uuid || null;
//       } catch {}
//     }
//     return id;
//   };

//   const handleSave = async () => {
//     if (saving) return;
//     setSaving(true);

//     try {
//       const token = await getAccessToken();
//       const id = await resolveUserId(token);
//       const payload = buildPayload();

//       if (id && token) {
//         await fetch(`${API_BASE_URL}/users/${id}`, {
//           method: 'PUT',
//           headers: {
//             'Content-Type': 'application/json',
//             Authorization: `Bearer ${token}`,
//           },
//           body: JSON.stringify(payload),
//         });
//       }

//       // Mark onboarding complete
//       await AsyncStorage.setItem('onboarding_complete', 'true');

//       // 👇 NEW: go to the LAST CARD (index 6)
//       requestAnimationFrame(() => {
//         flatListRef.current?.scrollToIndex({
//           index: 6,
//           animated: true,
//         });
//       });
//     } catch (err) {
//       await AsyncStorage.setItem('onboarding_complete', 'true');

//       // still go to last card even if the request fails
//       requestAnimationFrame(() => {
//         flatListRef.current?.scrollToIndex({
//           index: 6,
//           animated: true,
//         });
//       });
//     } finally {
//       setSaving(false);
//     }
//   };

//   // ------------------------
//   // OLD FORM SLIDE
//   // ------------------------
//   const OldFormSlide = (
//     <ScrollView
//       keyboardShouldPersistTaps="handled"
//       style={[styles.formContainer, {backgroundColor: theme.colors.surface}]}>
//       <Animatable.View
//         animation="fadeInUp"
//         duration={600}
//         style={[styles.card, {backgroundColor: theme.colors.surface}]}>
//         <Text style={[styles.title, {color: theme.colors.button1}]}>
//           Welcome to StylHelprfghfgh
//         </Text>

//         <Text style={styles.label}>Firstfgh Name</Text>
//         <TextInput
//           style={[styles.input, {backgroundColor: theme.colors.surface3}]}
//           placeholder="Enter first name"
//           placeholderTextColor={theme.colors.inputText1}
//           value={form.first_name}
//           onChangeText={val => handleChange('first_name', val)}
//         />

//         <Text style={styles.label}>Last Namedfg</Text>
//         <TextInput
//           style={[styles.input, {backgroundColor: theme.colors.surface3}]}
//           placeholder="Enter last name"
//           placeholderTextColor={theme.colors.inputText1}
//           value={form.last_name}
//           onChangeText={val => handleChange('last_name', val)}
//         />

//         <Text style={styles.label}>Profession</Text>
//         <TextInput
//           style={[styles.input, {backgroundColor: theme.colors.surface3}]}
//           placeholder="Enter profession"
//           placeholderTextColor={theme.colors.inputText1}
//           value={form.profession}
//           onChangeText={val => handleChange('profession', val)}
//         />

//         <Text style={styles.label}>Fashion Levelsddsf</Text>
//         <TouchableOpacity
//           activeOpacity={0.8}
//           style={styles.selectorButton}
//           onPress={() => setShowFashionPicker(true)}>
//           <Text style={styles.selectorText}>
//             {form.fashion_level || 'Select fashion level'}
//           </Text>
//         </TouchableOpacity>

//         <Text style={styles.label}>Gender Presentation</Text>
//         <TouchableOpacity
//           activeOpacity={0.8}
//           style={styles.selectorButton}
//           onPress={() => setShowGenderPicker(true)}>
//           <Text style={styles.selectorText}>
//             {form.gender_presentation || 'Select gender presentation'}
//           </Text>
//         </TouchableOpacity>

//         <AppleTouchFeedback hapticStyle="impactMedium">
//           <TouchableOpacity
//             style={[styles.button, {backgroundColor: theme.colors.button1}]}
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

//       {/* FASHION PICKER MODAL */}
//       <Modal visible={showFashionPicker} transparent animationType="slide">
//         <View style={styles.modalRoot}>
//           <TouchableWithoutFeedback onPress={() => setShowFashionPicker(false)}>
//             <View style={styles.backdropHitArea} />
//           </TouchableWithoutFeedback>

//           <View style={[styles.sheet, {backgroundColor: theme.colors.surface}]}>
//             <View style={styles.sheetToolbar}>
//               <TouchableOpacity onPress={() => setShowFashionPicker(false)}>
//                 <Text style={{color: theme.colors.button1, fontWeight: '600'}}>
//                   Done
//                 </Text>
//               </TouchableOpacity>
//             </View>

//             <Picker
//               selectedValue={form.fashion_level}
//               onValueChange={val => handleChange('fashion_level', val)}>
//               <Picker.Item label="Select fashion level" value="" />
//               <Picker.Item label="Expert" value="Expert" />
//               <Picker.Item label="Intermediate" value="Intermediate" />
//               <Picker.Item label="Novice" value="Novice" />
//             </Picker>
//           </View>
//         </View>
//       </Modal>

//       {/* GENDER PICKER MODAL */}
//       <Modal visible={showGenderPicker} transparent animationType="slide">
//         <View style={styles.modalRoot}>
//           <TouchableWithoutFeedback onPress={() => setShowGenderPicker(false)}>
//             <View style={styles.backdropHitArea} />
//           </TouchableWithoutFeedback>

//           <View style={[styles.sheet, {backgroundColor: theme.colors.surface}]}>
//             <View style={styles.sheetToolbar}>
//               <TouchableOpacity onPress={() => setShowGenderPicker(false)}>
//                 <Text style={{color: theme.colors.button1, fontWeight: '600'}}>
//                   Done
//                 </Text>
//               </TouchableOpacity>
//             </View>

//             <Picker
//               selectedValue={form.gender_presentation}
//               onValueChange={val => handleChange('gender_presentation', val)}>
//               <Picker.Item label="Select gender presentation" value="" />
//               <Picker.Item label="Male" value="Male" />
//               <Picker.Item label="Female" value="Female" />
//               <Picker.Item label="Other" value="Other" />
//             </Picker>
//           </View>
//         </View>
//       </Modal>
//     </ScrollView>
//   );

//   // ------------------------
//   // CARDS
//   // ------------------------
//   const Step = ({title, description, image}) => (
//     <View style={[styles.panel, {backgroundColor: theme.colors.surface}]}>
//       <Image source={image} style={styles.stepImage} />
//       <Text style={[styles.stepTitle, {color: theme.colors.foreground}]}>
//         {title}
//       </Text>
//       <Text style={[styles.stepDescription, {color: theme.colors.foreground}]}>
//         {description}
//       </Text>
//     </View>
//   );

//   //   const handleSave = async () => {
//   //     if (saving) return;
//   //     setSaving(true);

//   //     try {
//   //       const token = await getAccessToken();
//   //       const id = await resolveUserId(token || null);
//   //       const payload = buildPayload();

//   //       if (id && token) {
//   //         await fetch(`${API_BASE_URL}/users/${id}`, {
//   //           method: 'PUT',
//   //           headers: {
//   //             'Content-Type': 'application/json',
//   //             Authorization: `Bearer ${token}`,
//   //           },
//   //           body: JSON.stringify(payload),
//   //         });
//   //       }

//   //       await AsyncStorage.setItem('onboarding_complete', 'true');
//   //       navigate('Home');
//   //     } catch (err) {
//   //       await AsyncStorage.setItem('onboarding_complete', 'true');
//   //       navigate('Home');
//   //     } finally {
//   //       setSaving(false);
//   //     }
//   //   };

//   const GetStarted = () => (
//     <View style={[styles.panel, {backgroundColor: theme.colors.surface}]}>
//       <Text style={[styles.stepTitle, {color: theme.colors.foreground}]}>
//         You're all set!
//       </Text>

//       <TouchableOpacity onPress={() => navigate('Home')}>
//         <View
//           style={[
//             styles.button,
//             {backgroundColor: theme.colors.button1, width: 200},
//           ]}>
//           <Text style={{color: theme.colors.buttonText1, fontSize: 18}}>
//             Let's Get Started
//           </Text>
//         </View>
//       </TouchableOpacity>
//     </View>
//   );

//   const slides = [
//     {
//       key: '1',
//       element: (
//         <Step
//           title="Welcome to StylHelpr"
//           description="StylHelpr analyzes your wardrobe."
//           image={require('../assets/images/free1.jpg')}
//         />
//       ),
//     },
//     {
//       key: '2',
//       element: (
//         <Step
//           title="AI-Powered Fits"
//           description="The AI stylist creates outfits tailored to you."
//           image={require('../assets/images/headshot-1.webp')}
//         />
//       ),
//     },
//     {
//       key: '3',
//       element: (
//         <Step
//           title="Daily Inspiration"
//           description="Fresh outfit ideas, every day."
//           image={require('../assets/images/headshot-3.jpg')}
//         />
//       ),
//     },
//     {
//       key: '4',
//       element: (
//         <Step
//           title="Travel Mode"
//           description="Packing suggestions based on weather."
//           image={require('../assets/images/headshot-2.webp')}
//         />
//       ),
//     },
//     {
//       key: '5',
//       element: (
//         <Step
//           title="Your Style Profile"
//           description="Help the AI understand your preferences."
//           image={require('../assets/images/headshot-5.jpg')}
//         />
//       ),
//     },

//     {key: '6', element: OldFormSlide},

//     {key: '7', element: <GetStarted />},
//   ];

//   const DotIndicator = () => (
//     <View style={styles.dotsContainer}>
//       {slides.map((_, i) => {
//         const inputRange = [(i - 1) * width, i * width, (i + 1) * width];

//         const dotWidth = scrollX.interpolate({
//           inputRange,
//           outputRange: [8, 24, 8],
//           extrapolate: 'clamp',
//         });

//         return (
//           <Animated.View
//             key={i}
//             style={[
//               styles.dot,
//               {
//                 width: dotWidth,
//                 backgroundColor:
//                   i === index
//                     ? theme.colors.primary
//                     : theme.colors.button1 + '55',
//               },
//             ]}
//           />
//         );
//       })}
//     </View>
//   );

//   // ------------------------
//   // RENDER
//   // ------------------------

//   if (!ready) return null; // ← FIX: Prevent premature mount

//   return (
//     <View style={{flex: 1}}>
//       <FlatList
//         ref={flatListRef}
//         horizontal
//         pagingEnabled
//         data={slides}
//         keyExtractor={item => item.key}
//         renderItem={({item}) => item.element}
//         showsHorizontalScrollIndicator={false}
//         initialScrollIndex={0}
//         scrollEnabled={scrollEnabled}
//         getItemLayout={(data, index) => ({
//           length: width,
//           offset: width * index,
//           index,
//         })}
//         onScroll={Animated.event(
//           [{nativeEvent: {contentOffset: {x: scrollX}}}],
//           {useNativeDriver: false},
//         )}
//         scrollEventThrottle={16}
//       />

//       <DotIndicator />
//     </View>
//   );
// }

// // -----------------------------------------------------
// // STYLES
// // -----------------------------------------------------
// const styles = StyleSheet.create({
//   panel: {
//     width,
//     padding: 24,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },

//   stepImage: {
//     width: width * 0.75,
//     height: width * 0.75,
//     borderRadius: 20,
//     marginBottom: 40,
//   },

//   stepTitle: {
//     fontSize: 28,
//     fontWeight: '700',
//   },

//   stepDescription: {
//     fontSize: 17,
//     textAlign: 'center',
//     opacity: 0.7,
//     paddingHorizontal: 20,
//     marginTop: 20,
//   },

//   formContainer: {
//     width,
//     paddingTop: 40,
//   },
//   card: {
//     padding: 20,
//     borderRadius: 20,
//     margin: 6,
//   },
//   title: {
//     fontSize: 36,
//     fontWeight: '600',
//     marginBottom: 22,
//     textAlign: 'center',
//   },
//   label: {
//     fontSize: 13,
//     fontWeight: '600',
//     marginBottom: 8,
//     textTransform: 'capitalize',
//     color: '#000',
//   },
//   input: {
//     borderRadius: 12,
//     paddingHorizontal: 14,
//     paddingVertical: 14,
//     marginBottom: 22,
//     fontSize: 15,
//     color: '#000',
//   },
//   selectorButton: {
//     borderRadius: 12,
//     paddingHorizontal: 14,
//     paddingVertical: 16,
//     marginBottom: 22,
//     borderWidth: 1,
//   },
//   selectorText: {
//     fontSize: 15,
//   },
//   modalRoot: {
//     flex: 1,
//     justifyContent: 'flex-end',
//     backgroundColor: 'rgba(0,0,0,0.4)',
//   },
//   backdropHitArea: {flex: 1},
//   sheet: {
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     paddingBottom: 24,
//   },
//   sheetToolbar: {
//     flexDirection: 'row',
//     justifyContent: 'flex-end',
//     padding: 12,
//     borderBottomWidth: 1,
//   },
//   button: {
//     borderRadius: 14,
//     paddingVertical: 16,
//     alignItems: 'center',
//     marginTop: 20,
//   },
//   buttonText: {
//     fontSize: 16,
//     fontWeight: '600',
//   },

//   dotsContainer: {
//     position: 'absolute',
//     bottom: 105,
//     width: '100%',
//     flexDirection: 'row',
//     justifyContent: 'center',
//   },
//   dot: {
//     height: 8,
//     marginHorizontal: 5,
//     borderRadius: 4,
//   },
// });

//////////////

// // WalthroughOnboardingScreen.tsx — FIXED: ALWAYS STARTS AT SLIDE 1
// import React, {useRef, useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   StyleSheet,
//   Dimensions,
//   FlatList,
//   Animated,
//   TextInput,
//   TouchableOpacity,
//   ScrollView,
//   ActivityIndicator,
//   Modal,
//   TouchableWithoutFeedback,
// } from 'react-native';

// import * as Animatable from 'react-native-animatable';
// import {Picker} from '@react-native-picker/picker';

// import {useAppTheme} from '../context/ThemeContext';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useAuth0} from 'react-native-auth0';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {getAccessToken} from '../utils/auth';

// const {width} = Dimensions.get('window');
// const ONBOARDING_KEY = 'stylhelpr_onboarding_complete';

// export default function WalthroughOnboardingScreen({navigation}) {
//   const {theme} = useAppTheme();
//   const {user} = useAuth0();
//   const userId = useUUID();

//   const scrollX = useRef(new Animated.Value(0)).current;
//   const flatListRef = useRef(null);

//   const [index, setIndex] = useState(0);
//   const [scrollEnabled, setScrollEnabled] = useState(true);

//   // NEW → Required to prevent FlatList jumping to slide 6
//   const [ready, setReady] = useState(false);
//   useEffect(() => {
//     requestAnimationFrame(() => setReady(true));
//   }, []);

//   // ------------------------
//   // OLD FORM STATE
//   // ------------------------
//   const [saving, setSaving] = useState(false);
//   const [form, setForm] = useState({
//     first_name: '',
//     last_name: '',
//     profession: '',
//     fashion_level: '',
//     gender_presentation: '',
//   });

//   const [showFashionPicker, setShowFashionPicker] = useState(false);
//   const [showGenderPicker, setShowGenderPicker] = useState(false);

//   const handleChange = (field, val) => {
//     setForm(prev => ({...prev, [field]: val}));
//   };

//   const normalizeGender = s => s.trim().toLowerCase().replace(/\s+/g, '_');

//   const buildPayload = () => {
//     const payload = {onboarding_complete: true};
//     for (const [k, v] of Object.entries(form)) {
//       const trimmed = typeof v === 'string' ? v.trim() : v;
//       if (trimmed) payload[k] = trimmed;
//     }
//     if (payload.gender_presentation) {
//       payload.gender_presentation = normalizeGender(
//         payload.gender_presentation,
//       );
//     }
//     return payload;
//   };

//   const resolveUserId = async token => {
//     let id = userId;
//     if (!id && token) {
//       try {
//         const profRes = await fetch(`${API_BASE_URL}/auth/profile`, {
//           headers: {Authorization: `Bearer ${token}`},
//         });
//         const prof = await profRes.json().catch(() => ({}));
//         id = prof?.id || prof?.uuid || null;
//       } catch {}
//     }
//     return id;
//   };

//   const handleSave = async () => {
//     if (saving) return;
//     setSaving(true);

//     try {
//       const token = await getAccessToken();
//       const id = await resolveUserId(token);
//       const payload = buildPayload();

//       if (id && token) {
//         await fetch(`${API_BASE_URL}/users/${id}`, {
//           method: 'PUT',
//           headers: {
//             'Content-Type': 'application/json',
//             Authorization: `Bearer ${token}`,
//           },
//           body: JSON.stringify(payload),
//         });
//       }

//       await AsyncStorage.setItem('onboarding_complete', 'true');
//       navigation.replace('Home');
//     } catch {
//       await AsyncStorage.setItem('onboarding_complete', 'true');
//       navigation.replace('Home');
//     } finally {
//       setSaving(false);
//     }
//   };

//   // ------------------------
//   // OLD FORM SLIDE
//   // ------------------------
//   const OldFormSlide = (
//     <ScrollView
//       keyboardShouldPersistTaps="handled"
//       style={[styles.formContainer, {backgroundColor: theme.colors.surface}]}>
//       <Animatable.View
//         animation="fadeInUp"
//         duration={600}
//         style={[styles.card, {backgroundColor: theme.colors.surface}]}>
//         <Text style={[styles.title, {color: theme.colors.button1}]}>
//           Welcome to StylHelprfghfgh
//         </Text>

//         <Text style={styles.label}>Firstfgh Name</Text>
//         <TextInput
//           style={[styles.input, {backgroundColor: theme.colors.surface3}]}
//           placeholder="Enter first name"
//           placeholderTextColor={theme.colors.inputText1}
//           value={form.first_name}
//           onChangeText={val => handleChange('first_name', val)}
//         />

//         <Text style={styles.label}>Last Namedfg</Text>
//         <TextInput
//           style={[styles.input, {backgroundColor: theme.colors.surface3}]}
//           placeholder="Enter last name"
//           placeholderTextColor={theme.colors.inputText1}
//           value={form.last_name}
//           onChangeText={val => handleChange('last_name', val)}
//         />

//         <Text style={styles.label}>Profession</Text>
//         <TextInput
//           style={[styles.input, {backgroundColor: theme.colors.surface3}]}
//           placeholder="Enter profession"
//           placeholderTextColor={theme.colors.inputText1}
//           value={form.profession}
//           onChangeText={val => handleChange('profession', val)}
//         />

//         <Text style={styles.label}>Fashion Levelsddsf</Text>
//         <TouchableOpacity
//           activeOpacity={0.8}
//           style={styles.selectorButton}
//           onPress={() => setShowFashionPicker(true)}>
//           <Text style={styles.selectorText}>
//             {form.fashion_level || 'Select fashion level'}
//           </Text>
//         </TouchableOpacity>

//         <Text style={styles.label}>Gender Presentation</Text>
//         <TouchableOpacity
//           activeOpacity={0.8}
//           style={styles.selectorButton}
//           onPress={() => setShowGenderPicker(true)}>
//           <Text style={styles.selectorText}>
//             {form.gender_presentation || 'Select gender presentation'}
//           </Text>
//         </TouchableOpacity>

//         <AppleTouchFeedback hapticStyle="impactMedium">
//           <TouchableOpacity
//             style={[styles.button, {backgroundColor: theme.colors.button1}]}
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

//       {/* FASHION PICKER MODAL */}
//       <Modal visible={showFashionPicker} transparent animationType="slide">
//         <View style={styles.modalRoot}>
//           <TouchableWithoutFeedback onPress={() => setShowFashionPicker(false)}>
//             <View style={styles.backdropHitArea} />
//           </TouchableWithoutFeedback>

//           <View style={[styles.sheet, {backgroundColor: theme.colors.surface}]}>
//             <View style={styles.sheetToolbar}>
//               <TouchableOpacity onPress={() => setShowFashionPicker(false)}>
//                 <Text style={{color: theme.colors.button1, fontWeight: '600'}}>
//                   Done
//                 </Text>
//               </TouchableOpacity>
//             </View>

//             <Picker
//               selectedValue={form.fashion_level}
//               onValueChange={val => handleChange('fashion_level', val)}>
//               <Picker.Item label="Select fashion level" value="" />
//               <Picker.Item label="Expert" value="Expert" />
//               <Picker.Item label="Intermediate" value="Intermediate" />
//               <Picker.Item label="Novice" value="Novice" />
//             </Picker>
//           </View>
//         </View>
//       </Modal>

//       {/* GENDER PICKER MODAL */}
//       <Modal visible={showGenderPicker} transparent animationType="slide">
//         <View style={styles.modalRoot}>
//           <TouchableWithoutFeedback onPress={() => setShowGenderPicker(false)}>
//             <View style={styles.backdropHitArea} />
//           </TouchableWithoutFeedback>

//           <View style={[styles.sheet, {backgroundColor: theme.colors.surface}]}>
//             <View style={styles.sheetToolbar}>
//               <TouchableOpacity onPress={() => setShowGenderPicker(false)}>
//                 <Text style={{color: theme.colors.button1, fontWeight: '600'}}>
//                   Done
//                 </Text>
//               </TouchableOpacity>
//             </View>

//             <Picker
//               selectedValue={form.gender_presentation}
//               onValueChange={val => handleChange('gender_presentation', val)}>
//               <Picker.Item label="Select gender presentation" value="" />
//               <Picker.Item label="Male" value="Male" />
//               <Picker.Item label="Female" value="Female" />
//               <Picker.Item label="Other" value="Other" />
//             </Picker>
//           </View>
//         </View>
//       </Modal>
//     </ScrollView>
//   );

//   // ------------------------
//   // CARDS
//   // ------------------------
//   const Step = ({title, description, image}) => (
//     <View style={[styles.panel, {backgroundColor: theme.colors.surface}]}>
//       <Image source={image} style={styles.stepImage} />
//       <Text style={[styles.stepTitle, {color: theme.colors.foreground}]}>
//         {title}
//       </Text>
//       <Text style={[styles.stepDescription, {color: theme.colors.foreground}]}>
//         {description}
//       </Text>
//     </View>
//   );

//   const GetStarted = (
//     <View style={[styles.panel, {backgroundColor: theme.colors.surface}]}>
//       <Text style={[styles.stepTitle, {color: theme.colors.foreground}]}>
//         You're all set!
//       </Text>

//       <AppleTouchFeedback onPress={() => navigation.replace('HomeScreen')}>
//         <View
//           style={[
//             styles.button,
//             {backgroundColor: theme.colors.button1, width: 200},
//           ]}>
//           <Text style={{color: theme.colors.buttonText1, fontSize: 18}}>
//             Let's Get Started
//           </Text>
//         </View>
//       </AppleTouchFeedback>
//     </View>
//   );

//   const slides = [
//     {
//       key: '1',
//       element: (
//         <Step
//           title="Welcome to StylHelpr"
//           description="StylHelpr analyzes your wardrobe."
//           image={require('../assets/images/free1.jpg')}
//         />
//       ),
//     },
//     {
//       key: '2',
//       element: (
//         <Step
//           title="AI-Powered Fits"
//           description="The AI stylist creates outfits tailored to you."
//           image={require('../assets/images/headshot-1.webp')}
//         />
//       ),
//     },
//     {
//       key: '3',
//       element: (
//         <Step
//           title="Daily Inspiration"
//           description="Fresh outfit ideas, every day."
//           image={require('../assets/images/headshot-3.jpg')}
//         />
//       ),
//     },
//     {
//       key: '4',
//       element: (
//         <Step
//           title="Travel Mode"
//           description="Packing suggestions based on weather."
//           image={require('../assets/images/headshot-2.webp')}
//         />
//       ),
//     },
//     {
//       key: '5',
//       element: (
//         <Step
//           title="Your Style Profile"
//           description="Help the AI understand your preferences."
//           image={require('../assets/images/headshot-5.jpg')}
//         />
//       ),
//     },

//     {key: '6', element: OldFormSlide},

//     {key: '7', element: GetStarted},
//   ];

//   const DotIndicator = () => (
//     <View style={styles.dotsContainer}>
//       {slides.map((_, i) => {
//         const inputRange = [(i - 1) * width, i * width, (i + 1) * width];

//         const dotWidth = scrollX.interpolate({
//           inputRange,
//           outputRange: [8, 24, 8],
//           extrapolate: 'clamp',
//         });

//         return (
//           <Animated.View
//             key={i}
//             style={[
//               styles.dot,
//               {
//                 width: dotWidth,
//                 backgroundColor:
//                   i === index
//                     ? theme.colors.primary
//                     : theme.colors.button1 + '55',
//               },
//             ]}
//           />
//         );
//       })}
//     </View>
//   );

//   // ------------------------
//   // RENDER
//   // ------------------------

//   if (!ready) return null; // ← FIX: Prevent premature mount

//   return (
//     <View style={{flex: 1}}>
//       <FlatList
//         ref={flatListRef}
//         horizontal
//         pagingEnabled
//         data={slides}
//         keyExtractor={item => item.key}
//         renderItem={({item}) => item.element}
//         showsHorizontalScrollIndicator={false}
//         initialScrollIndex={0}
//         scrollEnabled={scrollEnabled}
//         getItemLayout={(data, index) => ({
//           length: width,
//           offset: width * index,
//           index,
//         })}
//         onScroll={Animated.event(
//           [{nativeEvent: {contentOffset: {x: scrollX}}}],
//           {useNativeDriver: false},
//         )}
//         scrollEventThrottle={16}
//       />

//       <DotIndicator />
//     </View>
//   );
// }

// // -----------------------------------------------------
// // STYLES
// // -----------------------------------------------------
// const styles = StyleSheet.create({
//   panel: {
//     width,
//     padding: 24,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },

//   stepImage: {
//     width: width * 0.75,
//     height: width * 0.75,
//     borderRadius: 20,
//     marginBottom: 40,
//   },

//   stepTitle: {
//     fontSize: 28,
//     fontWeight: '700',
//   },

//   stepDescription: {
//     fontSize: 17,
//     textAlign: 'center',
//     opacity: 0.7,
//     paddingHorizontal: 20,
//     marginTop: 20,
//   },

//   formContainer: {
//     width,
//     paddingTop: 40,
//   },
//   card: {
//     padding: 20,
//     borderRadius: 20,
//     margin: 6,
//   },
//   title: {
//     fontSize: 36,
//     fontWeight: '600',
//     marginBottom: 22,
//     textAlign: 'center',
//   },
//   label: {
//     fontSize: 13,
//     fontWeight: '600',
//     marginBottom: 8,
//     textTransform: 'capitalize',
//     color: '#000',
//   },
//   input: {
//     borderRadius: 12,
//     paddingHorizontal: 14,
//     paddingVertical: 14,
//     marginBottom: 22,
//     fontSize: 15,
//     color: '#000',
//   },
//   selectorButton: {
//     borderRadius: 12,
//     paddingHorizontal: 14,
//     paddingVertical: 16,
//     marginBottom: 22,
//     borderWidth: 1,
//   },
//   selectorText: {
//     fontSize: 15,
//   },
//   modalRoot: {
//     flex: 1,
//     justifyContent: 'flex-end',
//     backgroundColor: 'rgba(0,0,0,0.4)',
//   },
//   backdropHitArea: {flex: 1},
//   sheet: {
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     paddingBottom: 24,
//   },
//   sheetToolbar: {
//     flexDirection: 'row',
//     justifyContent: 'flex-end',
//     padding: 12,
//     borderBottomWidth: 1,
//   },
//   button: {
//     borderRadius: 14,
//     paddingVertical: 16,
//     alignItems: 'center',
//     marginTop: 20,
//   },
//   buttonText: {
//     fontSize: 16,
//     fontWeight: '600',
//   },

//   dotsContainer: {
//     position: 'absolute',
//     bottom: 105,
//     width: '100%',
//     flexDirection: 'row',
//     justifyContent: 'center',
//   },
//   dot: {
//     height: 8,
//     marginHorizontal: 5,
//     borderRadius: 4,
//   },
// });

//////////////////

// // screens/OnboardingScreen.tsx
// import React, {useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
//   Alert,
//   Modal,
//   TouchableWithoutFeedback,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import {useAppTheme} from '../context/ThemeContext';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {getAccessToken} from '../utils/auth';
// import {Picker} from '@react-native-picker/picker';
// import {useGlobalStyles} from '../styles/useGlobalStyles';
// import {tokens} from '../styles/tokens/tokens';

// type Props = {navigate: (screen: string, params?: any) => void};

// export default function OnboardingScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const userId = useUUID();
//   const globalStyles = useGlobalStyles();
//   const [saving, setSaving] = useState(false);

//   const [form, setForm] = useState({
//     first_name: '',
//     last_name: '',
//     profession: '',
//     fashion_level: '',
//     gender_presentation: '',
//   });

//   // Picker modal state
//   const [showFashionPicker, setShowFashionPicker] = useState(false);
//   const [showGenderPicker, setShowGenderPicker] = useState(false);

//   // Track the "latest" wheel value while scrolling; commit/close on finger lift
//   const pendingFashion = useRef<string | null>(null);
//   const pendingGender = useRef<string | null>(null);

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
//       backgroundColor: theme.colors.surface,
//       margin: 6,
//     },
//     title: {
//       fontSize: 36,
//       fontWeight: '600',
//       marginBottom: 22,
//       color: theme.colors.foreground,
//       textAlign: 'center',
//     },
//     label: {
//       fontSize: 13,
//       fontWeight: '600',
//       marginBottom: 8,
//       color: theme.colors.foreground,
//       textTransform: 'capitalize',
//     },
//     input: {
//       borderRadius: 12,
//       paddingHorizontal: 14,
//       paddingVertical: 14,
//       marginBottom: 22,
//       fontSize: 15,
//       backgroundColor: theme.colors.surface3,
//       color: theme.colors.foreground,
//     },
//     selectorButton: {
//       borderRadius: 12,
//       paddingHorizontal: 14,
//       paddingVertical: 16,
//       marginBottom: 22,
//       backgroundColor: theme.colors.surface3,
//       borderWidth: theme.borderWidth.md,
//       borderColor: theme.colors.surfaceBorder,
//     },
//     selectorText: {
//       color: theme.colors.foreground,
//       fontSize: 15,
//     },
//     // Modal/backdrop/sheet
//     modalRoot: {
//       flex: 1,
//       justifyContent: 'flex-end',
//       backgroundColor: 'rgba(0,0,0,0.4)',
//     },
//     backdropHitArea: {flex: 1}, // tap to dismiss above the sheet
//     sheet: {
//       backgroundColor: theme.colors.surface,
//       borderTopLeftRadius: 20,
//       borderTopRightRadius: 20,
//       paddingBottom: 24,
//     },
//     // Save button
//     button: {
//       borderRadius: 14,
//       paddingVertical: 16,
//       alignItems: 'center',
//       marginTop: 20,
//       backgroundColor: theme.colors.button1,
//       opacity: saving ? 0.6 : 1,
//     },
//     buttonText: {
//       fontSize: 16,
//       fontWeight: '600',
//       color: theme.colors.buttonText1,
//     },
//   });

//   const normalizeGender = (s: string) =>
//     s.trim().toLowerCase().replace(/\s+/g, '_');

//   const buildPayload = () => {
//     const payload: Record<string, any> = {onboarding_complete: true};
//     for (const [k, v] of Object.entries(form)) {
//       if (typeof v === 'string') {
//         const trimmed = v.trim();
//         if (trimmed !== '') payload[k] = trimmed;
//       }
//     }
//     if (payload.gender_presentation) {
//       payload.gender_presentation = normalizeGender(
//         payload.gender_presentation,
//       );
//     }
//     return payload;
//   };

//   const resolveUserId = async (token: string | null) => {
//     let id = userId;
//     if (!id && token) {
//       try {
//         const profRes = await fetch(`${API_BASE_URL}/auth/profile`, {
//           headers: {Authorization: `Bearer ${token}`},
//         });
//         const prof = await profRes.json().catch(() => ({} as any));
//         id = (prof && (prof.id || prof.uuid)) || null;
//       } catch {}
//     }
//     return id;
//   };

//   const handleSave = async () => {
//     if (saving) return;
//     setSaving(true);

//     try {
//       const token = await getAccessToken();
//       const id = await resolveUserId(token || null);
//       const payload = buildPayload();

//       if (id && token) {
//         await fetch(`${API_BASE_URL}/users/${id}`, {
//           method: 'PUT',
//           headers: {
//             'Content-Type': 'application/json',
//             Authorization: `Bearer ${token}`,
//           },
//           body: JSON.stringify(payload),
//         });
//       }

//       await AsyncStorage.setItem('onboarding_complete', 'true');
//       navigate('Home');
//     } catch (err) {
//       await AsyncStorage.setItem('onboarding_complete', 'true');
//       navigate('Home');
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
//       <Animatable.View animation="fadeInUp" duration={600} style={styles.card}>
//         <Text style={[styles.title, {color: theme.colors.button1}]}>
//           Welcome to StylHelpr
//         </Text>

//         {/* First Name */}
//         <Text style={styles.label}>First Name</Text>
//         <TextInput
//           style={styles.input}
//           placeholder="Enter first name"
//           placeholderTextColor={theme.colors.inputText1}
//           value={form.first_name}
//           onChangeText={val => handleChange('first_name', val)}
//         />

//         {/* Last Name */}
//         <Text style={styles.label}>Last Name</Text>
//         <TextInput
//           style={styles.input}
//           placeholder="Enter last name"
//           placeholderTextColor={theme.colors.inputText1}
//           value={form.last_name}
//           onChangeText={val => handleChange('last_name', val)}
//         />

//         {/* Profession */}
//         <Text style={styles.label}>Profession</Text>
//         <TextInput
//           style={styles.input}
//           placeholder="Enter profession"
//           placeholderTextColor={theme.colors.inputText1}
//           value={form.profession}
//           onChangeText={val => handleChange('profession', val)}
//         />

//         {/* Fashion Level Selector */}
//         <Text style={styles.label}>Fashion Level</Text>
//         <TouchableOpacity
//           activeOpacity={0.8}
//           style={styles.selectorButton}
//           onPress={() => setShowFashionPicker(true)}>
//           <Text style={styles.selectorText}>
//             {form.fashion_level || 'Select fashion level'}
//           </Text>
//         </TouchableOpacity>

//         {/* Gender Presentation Selector */}
//         <Text style={styles.label}>Gender Presentation</Text>
//         <TouchableOpacity
//           activeOpacity={0.8}
//           style={styles.selectorButton}
//           onPress={() => setShowGenderPicker(true)}>
//           <Text style={styles.selectorText}>
//             {form.gender_presentation || 'Select gender presentation'}
//           </Text>
//         </TouchableOpacity>

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

//       {/* ───────── Fashion Picker Modal ───────── */}
//       <Modal visible={showFashionPicker} transparent animationType="slide">
//         <View style={styles.modalRoot}>
//           <TouchableWithoutFeedback onPress={() => setShowFashionPicker(false)}>
//             <View style={styles.backdropHitArea} />
//           </TouchableWithoutFeedback>

//           <View style={styles.sheet}>
//             {/* Toolbar */}
//             <View
//               style={{
//                 flexDirection: 'row',
//                 justifyContent: 'flex-end',
//                 padding: 12,
//                 borderBottomWidth: 1,
//                 borderColor: theme.colors.surface3,
//               }}>
//               <TouchableOpacity onPress={() => setShowFashionPicker(false)}>
//                 <Text style={{color: theme.colors.button1, fontWeight: '600'}}>
//                   Done
//                 </Text>
//               </TouchableOpacity>
//             </View>

//             {/* Picker */}
//             <Picker
//               selectedValue={form.fashion_level}
//               onValueChange={val => handleChange('fashion_level', val)}>
//               <Picker.Item
//                 label="Select fashion level"
//                 value=""
//                 color={theme.colors.foreground}
//               />
//               <Picker.Item
//                 label="Expert"
//                 value="Expert"
//                 color={theme.colors.foreground}
//               />
//               <Picker.Item
//                 label="Intermediate"
//                 value="Intermediate"
//                 color={theme.colors.foreground}
//               />
//               <Picker.Item
//                 label="Novice"
//                 value="Novice"
//                 color={theme.colors.foreground}
//               />
//             </Picker>
//           </View>
//         </View>
//       </Modal>

//       {/* ───────── Gender Picker Modal ───────── */}
//       <Modal visible={showGenderPicker} transparent animationType="slide">
//         <View style={styles.modalRoot}>
//           <TouchableWithoutFeedback onPress={() => setShowGenderPicker(false)}>
//             <View style={styles.backdropHitArea} />
//           </TouchableWithoutFeedback>

//           <View style={styles.sheet}>
//             <View
//               style={{
//                 flexDirection: 'row',
//                 justifyContent: 'flex-end',
//                 padding: 12,
//                 borderBottomWidth: 1,
//                 borderColor: theme.colors.surface3,
//               }}>
//               <TouchableOpacity onPress={() => setShowGenderPicker(false)}>
//                 <Text style={{color: theme.colors.button1, fontWeight: '600'}}>
//                   Done
//                 </Text>
//               </TouchableOpacity>
//             </View>

//             <Picker
//               selectedValue={form.gender_presentation}
//               onValueChange={val => handleChange('gender_presentation', val)}>
//               <Picker.Item
//                 label="Select gender presentation"
//                 value=""
//                 color={theme.colors.foreground}
//               />
//               <Picker.Item
//                 label="Male"
//                 value="Male"
//                 color={theme.colors.foreground}
//               />
//               <Picker.Item
//                 label="Female"
//                 value="Female"
//                 color={theme.colors.foreground}
//               />
//               <Picker.Item
//                 label="Other"
//                 value="Other"
//                 color={theme.colors.foreground}
//               />
//             </Picker>
//           </View>
//         </View>
//       </Modal>
//     </ScrollView>
//   );
// }

////////////////

// // screens/OnboardingScreen.tsx
// import React, {useState, useRef} from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
//   Alert,
//   Modal,
//   TouchableWithoutFeedback,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import {useAppTheme} from '../context/ThemeContext';
// import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {useUUID} from '../context/UUIDContext';
// import {API_BASE_URL} from '../config/api';
// import {getAccessToken} from '../utils/auth';
// import {Picker} from '@react-native-picker/picker';

// type Props = {navigate: (screen: string, params?: any) => void};

// export default function OnboardingScreen({navigate}: Props) {
//   const {theme} = useAppTheme();
//   const userId = useUUID();
//   const [saving, setSaving] = useState(false);

//   const [form, setForm] = useState({
//     first_name: '',
//     last_name: '',
//     profession: '',
//     fashion_level: '',
//     gender_presentation: '',
//   });

//   // Picker modal state
//   const [showFashionPicker, setShowFashionPicker] = useState(false);
//   const [showGenderPicker, setShowGenderPicker] = useState(false);

//   // Track the "latest" wheel value while scrolling; commit/close on finger lift
//   const pendingFashion = useRef<string | null>(null);
//   const pendingGender = useRef<string | null>(null);

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
//       backgroundColor: theme.colors.surface,
//       margin: 6,
//     },
//     title: {
//       fontSize: 36,
//       fontWeight: '600',
//       marginBottom: 22,
//       color: theme.colors.foreground,
//       textAlign: 'center',
//     },
//     label: {
//       fontSize: 13,
//       fontWeight: '600',
//       marginBottom: 8,
//       color: theme.colors.foreground,
//       textTransform: 'capitalize',
//     },
//     input: {
//       borderRadius: 12,
//       paddingHorizontal: 14,
//       paddingVertical: 14,
//       marginBottom: 22,
//       fontSize: 15,
//       backgroundColor: theme.colors.surface3,
//       color: theme.colors.foreground,
//     },
//     selectorButton: {
//       borderRadius: 12,
//       paddingHorizontal: 14,
//       paddingVertical: 16,
//       marginBottom: 22,
//       backgroundColor: theme.colors.surface,
//       borderWidth: theme.borderWidth.md,
//       borderColor: theme.colors.buttonText1,
//     },
//     selectorText: {
//       color: theme.colors.foreground,
//       fontSize: 15,
//     },
//     // Modal/backdrop/sheet
//     modalRoot: {
//       flex: 1,
//       justifyContent: 'flex-end',
//       backgroundColor: 'rgba(0,0,0,0.4)',
//     },
//     backdropHitArea: {flex: 1}, // tap to dismiss above the sheet
//     sheet: {
//       backgroundColor: theme.colors.surface,
//       borderTopLeftRadius: 20,
//       borderTopRightRadius: 20,
//       paddingBottom: 24,
//     },
//     // Save button
//     button: {
//       borderRadius: 14,
//       paddingVertical: 16,
//       alignItems: 'center',
//       marginTop: 20,
//       backgroundColor: theme.colors.button1,
//       opacity: saving ? 0.6 : 1,
//     },
//     buttonText: {
//       fontSize: 16,
//       fontWeight: '600',
//       color: theme.colors.buttonText1,
//     },
//   });

//   const normalizeGender = (s: string) =>
//     s.trim().toLowerCase().replace(/\s+/g, '_');

//   const buildPayload = () => {
//     const payload: Record<string, any> = {onboarding_complete: true};
//     for (const [k, v] of Object.entries(form)) {
//       if (typeof v === 'string') {
//         const trimmed = v.trim();
//         if (trimmed !== '') payload[k] = trimmed;
//       }
//     }
//     if (payload.gender_presentation) {
//       payload.gender_presentation = normalizeGender(
//         payload.gender_presentation,
//       );
//     }
//     return payload;
//   };

//   const resolveUserId = async (token: string | null) => {
//     let id = userId;
//     if (!id && token) {
//       try {
//         const profRes = await fetch(`${API_BASE_URL}/auth/profile`, {
//           headers: {Authorization: `Bearer ${token}`},
//         });
//         const prof = await profRes.json().catch(() => ({} as any));
//         id = (prof && (prof.id || prof.uuid)) || null;
//       } catch {}
//     }
//     return id;
//   };

//   const handleSave = async () => {
//     if (saving) return;
//     setSaving(true);

//     try {
//       const token = await getAccessToken();
//       const id = await resolveUserId(token || null);
//       const payload = buildPayload();

//       if (id && token) {
//         await fetch(`${API_BASE_URL}/users/${id}`, {
//           method: 'PUT',
//           headers: {
//             'Content-Type': 'application/json',
//             Authorization: `Bearer ${token}`,
//           },
//           body: JSON.stringify(payload),
//         });
//       }

//       await AsyncStorage.setItem('onboarding_complete', 'true');
//       navigate('Home');
//     } catch (err) {
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

//         {/* First Name */}
//         <Text style={styles.label}>First Name</Text>
//         <TextInput
//           style={styles.input}
//           placeholder="Enter first name"
//           placeholderTextColor={theme.colors.inputText1}
//           value={form.first_name}
//           onChangeText={val => handleChange('first_name', val)}
//         />

//         {/* Last Name */}
//         <Text style={styles.label}>Last Name</Text>
//         <TextInput
//           style={styles.input}
//           placeholder="Enter last name"
//           placeholderTextColor={theme.colors.inputText1}
//           value={form.last_name}
//           onChangeText={val => handleChange('last_name', val)}
//         />

//         {/* Profession */}
//         <Text style={styles.label}>Profession</Text>
//         <TextInput
//           style={styles.input}
//           placeholder="Enter profession"
//           placeholderTextColor={theme.colors.inputText1}
//           value={form.profession}
//           onChangeText={val => handleChange('profession', val)}
//         />

//         {/* Fashion Level Selector */}
//         <Text style={styles.label}>Fashion Level</Text>
//         <TouchableOpacity
//           activeOpacity={0.8}
//           style={styles.selectorButton}
//           onPress={() => setShowFashionPicker(true)}>
//           <Text style={styles.selectorText}>
//             {form.fashion_level || 'Select fashion level'}
//           </Text>
//         </TouchableOpacity>

//         {/* Gender Presentation Selector */}
//         <Text style={styles.label}>Gender Presentation</Text>
//         <TouchableOpacity
//           activeOpacity={0.8}
//           style={styles.selectorButton}
//           onPress={() => setShowGenderPicker(true)}>
//           <Text style={styles.selectorText}>
//             {form.gender_presentation || 'Select gender presentation'}
//           </Text>
//         </TouchableOpacity>

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

//       {/* ───────── Fashion Picker Modal ───────── */}
//       <Modal visible={showFashionPicker} transparent animationType="slide">
//         <View style={styles.modalRoot}>
//           <TouchableWithoutFeedback onPress={() => setShowFashionPicker(false)}>
//             <View style={styles.backdropHitArea} />
//           </TouchableWithoutFeedback>

//           <View style={styles.sheet}>
//             {/* Toolbar */}
//             <View
//               style={{
//                 flexDirection: 'row',
//                 justifyContent: 'flex-end',
//                 padding: 12,
//                 borderBottomWidth: 1,
//                 borderColor: theme.colors.surface3,
//               }}>
//               <TouchableOpacity onPress={() => setShowFashionPicker(false)}>
//                 <Text style={{color: theme.colors.primary, fontWeight: '600'}}>
//                   Done
//                 </Text>
//               </TouchableOpacity>
//             </View>

//             {/* Picker */}
//             <Picker
//               selectedValue={form.fashion_level}
//               onValueChange={val => handleChange('fashion_level', val)}>
//               <Picker.Item label="Select fashion level" value="" />
//               <Picker.Item label="Expert" value="Expert" />
//               <Picker.Item label="Intermediate" value="Intermediate" />
//               <Picker.Item label="Novice" value="Novice" />
//             </Picker>
//           </View>
//         </View>
//       </Modal>

//       {/* ───────── Gender Picker Modal ───────── */}
//       <Modal visible={showGenderPicker} transparent animationType="slide">
//         <View style={styles.modalRoot}>
//           <TouchableWithoutFeedback onPress={() => setShowGenderPicker(false)}>
//             <View style={styles.backdropHitArea} />
//           </TouchableWithoutFeedback>

//           <View style={styles.sheet}>
//             <View
//               style={{
//                 flexDirection: 'row',
//                 justifyContent: 'flex-end',
//                 padding: 12,
//                 borderBottomWidth: 1,
//                 borderColor: theme.colors.surface3,
//               }}>
//               <TouchableOpacity onPress={() => setShowGenderPicker(false)}>
//                 <Text style={{color: theme.colors.primary, fontWeight: '600'}}>
//                   Done
//                 </Text>
//               </TouchableOpacity>
//             </View>

//             <Picker
//               selectedValue={form.gender_presentation}
//               onValueChange={val => handleChange('gender_presentation', val)}>
//               <Picker.Item label="Select gender presentation" value="" />
//               <Picker.Item label="Male" value="Male" />
//               <Picker.Item label="Female" value="Female" />
//               <Picker.Item label="Other" value="Other" />
//             </Picker>
//           </View>
//         </View>
//       </Modal>
//     </ScrollView>
//   );
// }

///////////////

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
//   Alert,
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

//   // 🔥 email removed here
//   const [form, setForm] = useState({
//     first_name: '',
//     last_name: '',
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

//   const normalizeGender = (s: string) =>
//     s.trim().toLowerCase().replace(/\s+/g, '_');

//   const buildPayload = () => {
//     const payload: Record<string, any> = {onboarding_complete: true};
//     for (const [k, v] of Object.entries(form)) {
//       if (typeof v === 'string') {
//         const trimmed = v.trim();
//         if (trimmed !== '') payload[k] = trimmed;
//       }
//     }
//     if (payload.gender_presentation) {
//       payload.gender_presentation = normalizeGender(
//         payload.gender_presentation,
//       );
//     }
//     return payload;
//   };

//   const resolveUserId = async (token: string | null) => {
//     let id = userId;
//     if (!id && token) {
//       try {
//         const profRes = await fetch(`${API_BASE_URL}/auth/profile`, {
//           headers: {Authorization: `Bearer ${token}`},
//         });
//         const prof = await profRes.json().catch(() => ({} as any));
//         id = (prof && (prof.id || prof.uuid)) || null;
//         console.log('🔎 /auth/profile resolved id:', id, 'raw:', prof);
//       } catch (e) {
//         console.log('⚠️ /auth/profile failed:', e);
//       }
//     }
//     return id;
//   };

//   const handleSave = async () => {
//     if (saving) return;
//     setSaving(true);
//     console.log('🟢 SAVE BUTTON CLICKED');

//     try {
//       const token = await getAccessToken();
//       const id = await resolveUserId(token || null);
//       const payload = buildPayload();
//       console.log('📤 PUT payload ->', payload);

//       if (id && token) {
//         const res = await fetch(`${API_BASE_URL}/users/${id}`, {
//           method: 'PUT',
//           headers: {
//             'Content-Type': 'application/json',
//             Authorization: `Bearer ${token}`,
//           },
//           body: JSON.stringify(payload),
//         });

//         const text = await res.text();
//         let data: any = null;
//         try {
//           data = text ? JSON.parse(text) : null;
//         } catch {}

//         console.log('📥 PUT /users/:id status:', res.status);
//         console.log('📥 PUT /users/:id body:', data ?? text);

//         if (!res.ok) {
//           Alert.alert(
//             'Profile Save Issue',
//             data?.message || text || 'Update failed.',
//           );
//           console.log('❌ PUT /users/:id failed');
//         } else {
//           console.log('✅ Onboarding saved to DB');
//         }
//       } else {
//         console.log('⚠️ Missing user id or token; skipping server update.');
//       }

//       await AsyncStorage.setItem('onboarding_complete', 'true');
//       navigate('Home');
//     } catch (err) {
//       console.error('❌ Onboarding save error:', err);
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
//   Alert,
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

//   // Normalize to match your Postgres CHECK constraint
//   const normalizeGender = (s: string) =>
//     s.trim().toLowerCase().replace(/\s+/g, '_'); // ← change '_' to '-' if your DB uses hyphens

//   const buildPayload = () => {
//     const payload: Record<string, any> = {onboarding_complete: true};
//     for (const [k, v] of Object.entries(form)) {
//       if (typeof v === 'string') {
//         const trimmed = v.trim();
//         if (trimmed !== '') payload[k] = trimmed;
//       }
//     }
//     if (payload.gender_presentation) {
//       payload.gender_presentation = normalizeGender(
//         payload.gender_presentation,
//       );
//     }
//     return payload;
//   };

//   const resolveUserId = async (token: string | null) => {
//     let id = userId;
//     if (!id && token) {
//       try {
//         const profRes = await fetch(`${API_BASE_URL}/auth/profile`, {
//           headers: {Authorization: `Bearer ${token}`},
//         });
//         const prof = await profRes.json().catch(() => ({} as any));
//         id = (prof && (prof.id || prof.uuid)) || null; // your /auth/profile returns { uuid: ... }
//         console.log('🔎 /auth/profile resolved id:', id, 'raw:', prof);
//       } catch (e) {
//         console.log('⚠️ /auth/profile failed:', e);
//       }
//     }
//     return id;
//   };

//   const handleSave = async () => {
//     if (saving) return;
//     setSaving(true);
//     console.log('🟢 SAVE BUTTON CLICKED');

//     try {
//       const token = await getAccessToken();
//       const id = await resolveUserId(token || null);

//       const payload = buildPayload();
//       console.log('📤 PUT payload ->', payload);

//       if (id && token) {
//         const res = await fetch(`${API_BASE_URL}/users/${id}`, {
//           method: 'PUT', // matches @Put(':id') on your backend
//           headers: {
//             'Content-Type': 'application/json',
//             Authorization: `Bearer ${token}`,
//           },
//           body: JSON.stringify(payload),
//         });

//         const text = await res.text(); // ensure body is consumed exactly once
//         let data: any = null;
//         try {
//           data = text ? JSON.parse(text) : null;
//         } catch {
//           /* non-JSON; keep raw text */
//         }

//         console.log('📥 PUT /users/:id status:', res.status);
//         console.log('📥 PUT /users/:id body:', data ?? text);

//         if (!res.ok) {
//           // Show quick hint to help you see DB constraint issues fast
//           Alert.alert(
//             'Profile Save Issue',
//             data?.message || text || 'Update failed.',
//           );
//           console.log('❌ PUT /users/:id failed');
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
//       // Still unblock locally
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
