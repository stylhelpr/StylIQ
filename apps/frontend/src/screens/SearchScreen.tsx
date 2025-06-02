import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Voice from '@react-native-voice/voice';
import type {WardrobeItem} from '../hooks/useOutfitSuggestion';

type Props = {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
  wardrobe?: WardrobeItem[];
};

export default function SearchScreen({navigate, goBack, wardrobe = []}: Props) {
  const {theme} = useAppTheme();
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    Voice.onSpeechResults = e => {
      const spokenText = e.value?.[0];
      if (spokenText) setQuery(spokenText);
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const startVoice = async () => {
    try {
      await Voice.stop(); // reset if already running
      setQuery('');
      setIsListening(true);
      await Voice.start('en-US');
    } catch (e) {
      console.error('Voice start error:', e);
    }
  };

  const stopVoice = async () => {
    try {
      await Voice.stop();
    } catch (e) {
      console.error('Voice stop error:', e);
    } finally {
      setIsListening(false);
    }
  };

  const wardrobeResults = wardrobe.filter(item =>
    [
      item.name,
      item.mainCategory,
      item.subCategory,
      item.color,
      item.material,
      item.fit,
      item.size,
      item.tags?.join(' '),
      item.notes,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.colors.background}]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      {/* Back Arrow */}
      <TouchableOpacity onPress={goBack} style={styles.backButton}>
        <MaterialIcons
          name="arrow-back"
          size={24}
          color={theme.colors.foreground}
        />
      </TouchableOpacity>

      {/* Voice Search (Hold to Speak) */}
      <TouchableOpacity
        onPressIn={startVoice}
        onPressOut={stopVoice}
        style={{alignSelf: 'center', marginBottom: 12}}>
        <Text
          style={{
            color: theme.colors.primary,
            fontWeight: '600',
            fontSize: 18,
          }}>
          {isListening ? '🎙️ Listening…' : '🎤 Hold to Speak'}
        </Text>
      </TouchableOpacity>

      {/* Search Input */}
      <View style={styles.inputWrapper}>
        <TextInput
          placeholder="Search wardrobe..."
          placeholderTextColor={theme.colors.foreground}
          value={query}
          onChangeText={setQuery}
          style={[
            styles.input,
            {
              color: theme.colors.foreground,
              borderColor: theme.colors.foreground,
              backgroundColor: theme.colors.surface,
            },
          ]}
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => setQuery('')}
            style={styles.clearIcon}>
            <MaterialIcons
              name="close"
              size={20}
              color={theme.colors.foreground}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Results Group Title */}
      {wardrobeResults.length > 0 && (
        <Text style={{color: theme.colors.foreground, marginBottom: 8}}>
          👕 Wardrobe Matches
        </Text>
      )}

      {/* Results List */}
      {wardrobeResults.map(item => (
        <TouchableOpacity
          key={item.id}
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.surface,
            },
          ]}
          onPress={() => navigate('ItemDetail', {item})}>
          <Text style={{color: theme.colors.foreground, fontWeight: '500'}}>
            {item.name}
          </Text>
        </TouchableOpacity>
      ))}

      {wardrobeResults.length === 0 && (
        <Text style={{color: theme.colors.foreground, marginTop: 20}}>
          No items found.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  backButton: {
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  inputWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    paddingRight: 40,
  },
  clearIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
});

////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   ScrollView,
//   TouchableOpacity,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import Voice from '@react-native-voice/voice';
// import type {WardrobeItem} from '../hooks/useOutfitSuggestion';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   goBack: () => void;
//   wardrobe?: WardrobeItem[];
// };

// export default function SearchScreen({navigate, goBack, wardrobe = []}: Props) {
//   const {theme} = useAppTheme();
//   const [query, setQuery] = useState('');
//   const [isListening, setIsListening] = useState(false);

//   useEffect(() => {
//     return () => {
//       Voice.destroy().then(Voice.removeAllListeners);
//     };
//   }, []);

//   const startVoice = async () => {
//     try {
//       await Voice.stop();
//       await Voice.destroy();
//       await Voice.removeAllListeners();

//       Voice.onSpeechResults = e => {
//         const spokenText = e.value?.[0];
//         if (spokenText) {
//           setQuery(spokenText);
//         }
//       };

//       setIsListening(true);
//       await Voice.start('en-US');
//     } catch (e) {
//       console.error('Voice start error:', e);
//       setIsListening(false);
//     }
//   };

//   const wardrobeResults = wardrobe.filter(item =>
//     [
//       item.name,
//       item.mainCategory,
//       item.subCategory,
//       item.color,
//       item.material,
//       item.fit,
//       item.size,
//       item.tags?.join(' '),
//       item.notes,
//     ]
//       .filter(Boolean)
//       .join(' ')
//       .toLowerCase()
//       .includes(query.toLowerCase()),
//   );

//   return (
//     <ScrollView
//       style={[styles.container, {backgroundColor: theme.colors.background}]}
//       contentContainerStyle={styles.content}
//       keyboardShouldPersistTaps="handled">
//       {/* Back Arrow */}
//       <TouchableOpacity onPress={goBack} style={styles.backButton}>
//         <MaterialIcons
//           name="arrow-back"
//           size={24}
//           color={theme.colors.foreground}
//         />
//       </TouchableOpacity>

//       {/* Voice Search */}
//       <TouchableOpacity
//         onPress={startVoice}
//         style={{alignSelf: 'center', marginBottom: 12}}>
//         <Text style={{color: theme.colors.primary, fontWeight: '600'}}>
//           🎤 Start Voice Search
//         </Text>
//       </TouchableOpacity>

//       {/* Search Input */}
//       <View style={styles.inputWrapper}>
//         <TextInput
//           placeholder="Search wardrobe..."
//           placeholderTextColor={theme.colors.foreground}
//           value={query}
//           onChangeText={setQuery}
//           style={[
//             styles.input,
//             {
//               color: theme.colors.foreground,
//               borderColor: theme.colors.foreground,
//               backgroundColor: theme.colors.surface,
//             },
//           ]}
//         />
//         {query.length > 0 && (
//           <TouchableOpacity
//             onPress={() => setQuery('')}
//             style={styles.clearIcon}>
//             <MaterialIcons
//               name="close"
//               size={20}
//               color={theme.colors.foreground}
//             />
//           </TouchableOpacity>
//         )}
//       </View>

//       {/* Results Group Title */}
//       {wardrobeResults.length > 0 && (
//         <Text style={{color: theme.colors.foreground, marginBottom: 8}}>
//           👕 Wardrobe Matches
//         </Text>
//       )}

//       {/* Results List */}
//       {wardrobeResults.map(item => (
//         <TouchableOpacity
//           key={item.id}
//           style={[
//             styles.card,
//             {
//               backgroundColor: theme.colors.surface,
//               borderColor: theme.colors.surface,
//             },
//           ]}
//           onPress={() => navigate('ItemDetail', {item})}>
//           <Text style={{color: theme.colors.foreground, fontWeight: '500'}}>
//             {item.name}
//           </Text>
//         </TouchableOpacity>
//       ))}

//       {wardrobeResults.length === 0 && (
//         <Text style={{color: theme.colors.foreground, marginTop: 20}}>
//           No items found.
//         </Text>
//       )}
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   content: {
//     padding: 16,
//   },
//   backButton: {
//     marginBottom: 12,
//     alignSelf: 'flex-start',
//   },
//   inputWrapper: {
//     position: 'relative',
//     marginBottom: 16,
//   },
//   input: {
//     height: 48,
//     borderWidth: 1,
//     borderRadius: 12,
//     paddingHorizontal: 14,
//     fontSize: 16,
//     paddingRight: 40,
//   },
//   clearIcon: {
//     position: 'absolute',
//     right: 12,
//     top: 12,
//   },
//   card: {
//     padding: 14,
//     borderRadius: 12,
//     borderWidth: 1,
//     marginBottom: 12,
//   },
// });

////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   ScrollView,
//   TouchableOpacity,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import Voice from '@react-native-voice/voice';
// import type {WardrobeItem} from '../hooks/useOutfitSuggestion';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   goBack: () => void;
//   wardrobe?: WardrobeItem[];
// };

// export default function SearchScreen({navigate, goBack, wardrobe = []}: Props) {
//   const {theme} = useAppTheme();
//   const [query, setQuery] = useState('');
//   const [isListening, setIsListening] = useState(false);

//   useEffect(() => {
//     Voice.onSpeechResults = e => {
//       const spokenText = e.value?.[0];
//       if (spokenText) setQuery(spokenText);
//     };
//     return () => {
//       Voice.destroy().then(Voice.removeAllListeners);
//     };
//   }, []);

//   const startVoice = async () => {
//     try {
//       setIsListening(true);
//       await Voice.start('en-US');
//     } catch (e) {
//       console.error('Voice start error:', e);
//       setIsListening(false);
//     }
//   };

//   const wardrobeResults = wardrobe.filter(item =>
//     [
//       item.name,
//       item.mainCategory,
//       item.subCategory,
//       item.color,
//       item.material,
//       item.fit,
//       item.size,
//       item.tags?.join(' '),
//       item.notes,
//     ]
//       .filter(Boolean)
//       .join(' ')
//       .toLowerCase()
//       .includes(query.toLowerCase()),
//   );

//   return (
//     <ScrollView
//       style={[styles.container, {backgroundColor: theme.colors.background}]}
//       contentContainerStyle={styles.content}
//       keyboardShouldPersistTaps="handled">
//       {/* Back Arrow */}
//       <TouchableOpacity onPress={goBack} style={styles.backButton}>
//         <MaterialIcons
//           name="arrow-back"
//           size={24}
//           color={theme.colors.foreground}
//         />
//       </TouchableOpacity>

//       {/* Voice Search */}
//       <TouchableOpacity
//         onPress={startVoice}
//         style={{alignSelf: 'center', marginBottom: 12}}>
//         <Text style={{color: theme.colors.primary, fontWeight: '600'}}>
//           🎤 Start Voice Search
//         </Text>
//       </TouchableOpacity>

//       {/* Search Input */}
//       <View style={styles.inputWrapper}>
//         <TextInput
//           placeholder="Search wardrobe..."
//           placeholderTextColor={theme.colors.foreground}
//           value={query}
//           onChangeText={setQuery}
//           style={[
//             styles.input,
//             {
//               color: theme.colors.foreground,
//               borderColor: theme.colors.foreground,
//               backgroundColor: theme.colors.surface,
//             },
//           ]}
//         />
//         {query.length > 0 && (
//           <TouchableOpacity
//             onPress={() => setQuery('')}
//             style={styles.clearIcon}>
//             <MaterialIcons
//               name="close"
//               size={20}
//               color={theme.colors.foreground}
//             />
//           </TouchableOpacity>
//         )}
//       </View>

//       {/* Results Group Title */}
//       {wardrobeResults.length > 0 && (
//         <Text style={{color: theme.colors.foreground, marginBottom: 8}}>
//           👕 Wardrobe Matches
//         </Text>
//       )}

//       {/* Results List */}
//       {wardrobeResults.map(item => (
//         <TouchableOpacity
//           key={item.id}
//           style={[
//             styles.card,
//             {
//               backgroundColor: theme.colors.surface,
//               borderColor: theme.colors.surface,
//             },
//           ]}
//           onPress={() => navigate('ItemDetail', {item})}>
//           <Text style={{color: theme.colors.foreground, fontWeight: '500'}}>
//             {item.name}
//           </Text>
//         </TouchableOpacity>
//       ))}

//       {wardrobeResults.length === 0 && (
//         <Text style={{color: theme.colors.foreground, marginTop: 20}}>
//           No items found.
//         </Text>
//       )}
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   content: {
//     padding: 16,
//   },
//   backButton: {
//     marginBottom: 12,
//     alignSelf: 'flex-start',
//   },
//   inputWrapper: {
//     position: 'relative',
//     marginBottom: 16,
//   },
//   input: {
//     height: 48,
//     borderWidth: 1,
//     borderRadius: 12,
//     paddingHorizontal: 14,
//     fontSize: 16,
//     paddingRight: 40, // space for clear icon
//   },
//   clearIcon: {
//     position: 'absolute',
//     right: 12,
//     top: 12,
//   },
//   card: {
//     padding: 14,
//     borderRadius: 12,
//     borderWidth: 1,
//     marginBottom: 12,
//   },
// });

/////////////

// import React, {useState} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   ScrollView,
//   TouchableOpacity,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import type {WardrobeItem} from '../hooks/useOutfitSuggestion';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   goBack: () => void;
//   wardrobe?: WardrobeItem[];
// };

// export default function SearchScreen({navigate, goBack, wardrobe = []}: Props) {
//   const {theme} = useAppTheme();
//   const [query, setQuery] = useState('');

//   const filteredItems = wardrobe.filter(item =>
//     [
//       item.name,
//       item.mainCategory,
//       item.subCategory,
//       item.color,
//       item.material,
//       item.fit,
//       item.size,
//       item.tags?.join(' '),
//       item.notes,
//     ]
//       .filter(Boolean)
//       .join(' ')
//       .toLowerCase()
//       .includes(query.toLowerCase()),
//   );

//   return (
//     <ScrollView
//       style={[styles.container, {backgroundColor: theme.colors.background}]}
//       contentContainerStyle={styles.content}
//       keyboardShouldPersistTaps="handled">
//       {/* Back Arrow */}
//       <TouchableOpacity onPress={goBack} style={styles.backButton}>
//         <MaterialIcons
//           name="arrow-back"
//           size={24}
//           color={theme.colors.foreground}
//         />
//       </TouchableOpacity>

//       <View style={styles.inputWrapper}>
//         <TextInput
//           placeholder="Search wardrobe..."
//           placeholderTextColor={theme.colors.foreground}
//           value={query}
//           onChangeText={setQuery}
//           style={[
//             styles.input,
//             {
//               color: theme.colors.foreground,
//               borderColor: theme.colors.foreground,
//               backgroundColor: theme.colors.surface,
//             },
//           ]}
//         />
//         {query.length > 0 && (
//           <TouchableOpacity
//             onPress={() => setQuery('')}
//             style={styles.clearIcon}>
//             <MaterialIcons
//               name="close"
//               size={20}
//               color={theme.colors.foreground}
//             />
//           </TouchableOpacity>
//         )}
//       </View>

//       {filteredItems.map(item => (
//         <TouchableOpacity
//           key={item.id}
//           style={[
//             styles.card,
//             {
//               backgroundColor: theme.colors.surface,
//               borderColor: theme.colors.surface,
//             },
//           ]}
//           onPress={() => navigate('ItemDetail', {item})}>
//           <Text style={{color: theme.colors.foreground, fontWeight: '500'}}>
//             {item.name}
//           </Text>
//         </TouchableOpacity>
//       ))}

//       {filteredItems.length === 0 && (
//         <Text style={{color: theme.colors.foreground, marginTop: 20}}>
//           No items found.
//         </Text>
//       )}
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   content: {
//     padding: 16,
//   },
//   backButton: {
//     marginBottom: 12,
//     alignSelf: 'flex-start',
//   },
//   inputWrapper: {
//     position: 'relative',
//     marginBottom: 16,
//   },
//   input: {
//     height: 48,
//     borderWidth: 1,
//     borderRadius: 12,
//     paddingHorizontal: 14,
//     fontSize: 16,
//     paddingRight: 40, // space for clear icon
//   },
//   clearIcon: {
//     position: 'absolute',
//     right: 12,
//     top: 12,
//   },
//   card: {
//     padding: 14,
//     borderRadius: 12,
//     borderWidth: 1,
//     marginBottom: 12,
//   },
// });
