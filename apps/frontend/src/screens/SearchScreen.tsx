import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Voice from '@react-native-voice/voice';
import {useAppTheme} from '../context/ThemeContext';
import type {WardrobeItem} from '../types/wardrobe';
import {useUUID} from '../context/UUIDContext';
import {useQuery} from '@tanstack/react-query';
import {API_BASE_URL} from '../config/api';
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

type SavedOutfit = {
  id: string;
  name?: string;
  top: WardrobeItem;
  bottom: WardrobeItem;
  shoes: WardrobeItem;
  createdAt: string;
  tags?: string[];
  notes?: string;
  rating?: number;
  favorited?: boolean;
};

export default function SearchScreen({navigate, goBack}) {
  const userId = useUUID();
  const {theme} = useAppTheme();
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);

  const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
    queryKey: ['wardrobe', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch wardrobe items');
      return await res.json();
    },
  });

  const {data: savedOutfits = []} = useQuery<SavedOutfit[]>({
    queryKey: ['savedOutfits', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE_URL}/custom-outfits?user_id=${userId}`,
      );
      if (!res.ok) throw new Error('Failed to fetch saved outfits');
      return await res.json();
    },
  });

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
      setIsListening(true);
      await Voice.start('en-US');
    } catch (e) {
      console.error('Voice start error:', e);
      setIsListening(false);
    }
  };

  const stopVoice = async () => {
    try {
      await Voice.stop();
    } catch (e) {
      console.error('Voice stop error:', e);
    }
    setIsListening(false);
  };

  const handlePressIn = () => startVoice();
  const handlePressOut = () => stopVoice();

  const matchesQuery = (text: string | undefined): boolean =>
    !!text?.toLowerCase().includes(query.toLowerCase());

  const filteredWardrobe = wardrobe.filter(item =>
    matchesQuery(
      [
        item.name,
        item.mainCategory,
        item.subCategory,
        item.color,
        item.material,
        item.fit,
        item.size,
        Array.isArray(item.tags) ? item.tags.join(' ') : '',
        item.notes,
      ]
        .filter(Boolean)
        .join(' '),
    ),
  );

  const filteredOutfits = savedOutfits.filter(outfit =>
    matchesQuery(
      [outfit.name, outfit.tags?.join(' '), outfit.notes]
        .filter(Boolean)
        .join(' '),
    ),
  );

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.colors.background}]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <AppleTouchFeedback
        onPress={goBack}
        hapticStyle="impactMedium"
        style={styles.backButton}>
        <MaterialIcons
          name="arrow-back"
          size={24}
          color={theme.colors.foreground}
        />
      </AppleTouchFeedback>

      {/* <AppleTouchFeedback
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        hapticStyle="impactLight"
        style={{alignSelf: 'center', marginBottom: 12}}>
        <Text style={{color: theme.colors.primary, fontWeight: '600'}}>
          🎤 Hold to Voice Search
        </Text>
      </AppleTouchFeedback> */}

      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{alignSelf: 'center', marginBottom: 12}}>
        <Text style={{color: theme.colors.primary, fontWeight: '600'}}>
          🎤 Hold to Voice Search
        </Text>
      </TouchableOpacity>

      <View style={styles.inputWrapper}>
        <TextInput
          placeholder="Search wardrobe, saved outfits..."
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
          <AppleTouchFeedback
            onPress={() => setQuery('')}
            hapticStyle="impactLight"
            style={styles.clearIcon}>
            <MaterialIcons
              name="close"
              size={20}
              color={theme.colors.foreground}
            />
          </AppleTouchFeedback>
        )}
      </View>

      {filteredWardrobe.length > 0 && (
        <Text style={styles.groupLabel}>👕 Wardrobe</Text>
      )}
      {filteredWardrobe.map(item => (
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

      {filteredOutfits.length > 0 && (
        <Text style={styles.groupLabel}>📦 Saved Outfits</Text>
      )}
      {filteredOutfits.map((outfit: SavedOutfit) => (
        <View
          key={outfit.id}
          style={[styles.card, {backgroundColor: theme.colors.surface}]}>
          <Text style={{color: theme.colors.foreground, fontWeight: '500'}}>
            {outfit.name?.trim() || 'Unnamed Outfit'}
          </Text>
          <View style={{flexDirection: 'row', marginTop: 6}}>
            {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
              i?.image ? (
                <Image
                  key={i.id}
                  source={{uri: i.image}}
                  style={{width: 60, height: 60, borderRadius: 8}}
                />
              ) : null,
            )}
          </View>
        </View>
      ))}

      {filteredWardrobe.length === 0 && filteredOutfits.length === 0 && (
        <Text style={{color: theme.colors.foreground, marginTop: 20}}>
          No results found.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: 16},
  backButton: {marginBottom: 12, alignSelf: 'flex-start'},
  inputWrapper: {position: 'relative', marginBottom: 16},
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    paddingRight: 40,
  },
  clearIcon: {position: 'absolute', right: 12, top: 12},
  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  groupLabel: {
    marginTop: 20,
    marginBottom: 6,
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
});

/////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   ScrollView,
//   TouchableOpacity,
//   Image,
// } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import Voice from '@react-native-voice/voice';
// import {useAppTheme} from '../context/ThemeContext';
// import type {WardrobeItem} from '../types/wardrobe';
// import {useUUID} from '../context/UUIDContext';
// import {useQuery} from '@tanstack/react-query';
// import {API_BASE_URL} from '../config/api';

// type SavedOutfit = {
//   id: string;
//   name?: string;
//   top: WardrobeItem;
//   bottom: WardrobeItem;
//   shoes: WardrobeItem;
//   createdAt: string;
//   tags?: string[];
//   notes?: string;
//   rating?: number;
//   favorited?: boolean;
// };

// export default function SearchScreen({navigate, goBack}) {
//   const userId = useUUID();
//   const {theme} = useAppTheme();
//   const [query, setQuery] = useState('');
//   const [isListening, setIsListening] = useState(false);

//   const {data: wardrobe = []} = useQuery<WardrobeItem[]>({
//     queryKey: ['wardrobe', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(`${API_BASE_URL}/wardrobe?user_id=${userId}`);
//       if (!res.ok) throw new Error('Failed to fetch wardrobe items');
//       return await res.json();
//     },
//   });

//   const {data: savedOutfits = []} = useQuery<SavedOutfit[]>({
//     queryKey: ['savedOutfits', userId],
//     enabled: !!userId,
//     queryFn: async () => {
//       const res = await fetch(
//         `${API_BASE_URL}/custom-outfits?user_id=${userId}`,
//       );
//       if (!res.ok) throw new Error('Failed to fetch saved outfits');
//       return await res.json();
//     },
//   });

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

//   const stopVoice = async () => {
//     try {
//       await Voice.stop();
//     } catch (e) {
//       console.error('Voice stop error:', e);
//     }
//     setIsListening(false);
//   };

//   const handlePressIn = () => startVoice();
//   const handlePressOut = () => stopVoice();

//   const matchesQuery = (text: string | undefined): boolean =>
//     !!text?.toLowerCase().includes(query.toLowerCase());

//   const filteredWardrobe = wardrobe.filter(item =>
//     matchesQuery(
//       [
//         item.name,
//         item.mainCategory,
//         item.subCategory,
//         item.color,
//         item.material,
//         item.fit,
//         item.size,
//         Array.isArray(item.tags) ? item.tags.join(' ') : '',
//         item.notes,
//       ]
//         .filter(Boolean)
//         .join(' '),
//     ),
//   );

//   const filteredOutfits = savedOutfits.filter(outfit =>
//     matchesQuery(
//       [outfit.name, outfit.tags?.join(' '), outfit.notes]
//         .filter(Boolean)
//         .join(' '),
//     ),
//   );

//   return (
//     <ScrollView
//       style={[styles.container, {backgroundColor: theme.colors.background}]}
//       contentContainerStyle={styles.content}
//       keyboardShouldPersistTaps="handled">
//       <TouchableOpacity onPress={goBack} style={styles.backButton}>
//         <MaterialIcons
//           name="arrow-back"
//           size={24}
//           color={theme.colors.foreground}
//         />
//       </TouchableOpacity>

//       <TouchableOpacity
//         onPressIn={handlePressIn}
//         onPressOut={handlePressOut}
//         style={{alignSelf: 'center', marginBottom: 12}}>
//         <Text style={{color: theme.colors.primary, fontWeight: '600'}}>
//           🎤 Hold to Voice Search
//         </Text>
//       </TouchableOpacity>

//       <View style={styles.inputWrapper}>
//         <TextInput
//           placeholder="Search wardrobe, saved outfits..."
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

//       {filteredWardrobe.length > 0 && (
//         <Text style={styles.groupLabel}>👕 Wardrobe</Text>
//       )}
//       {filteredWardrobe.map(item => (
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

//       {filteredOutfits.length > 0 && (
//         <Text style={styles.groupLabel}>📦 Saved Outfits</Text>
//       )}
//       {filteredOutfits.map((outfit: SavedOutfit) => (
//         <View
//           key={outfit.id}
//           style={[styles.card, {backgroundColor: theme.colors.surface}]}>
//           <Text style={{color: theme.colors.foreground, fontWeight: '500'}}>
//             {outfit.name?.trim() || 'Unnamed Outfit'}
//           </Text>
//           <View style={{flexDirection: 'row', marginTop: 6}}>
//             {[outfit.top, outfit.bottom, outfit.shoes].map(i =>
//               i?.image ? (
//                 <Image
//                   key={i.id}
//                   source={{uri: i.image}}
//                   style={{width: 60, height: 60, borderRadius: 8}}
//                 />
//               ) : null,
//             )}
//           </View>
//         </View>
//       ))}

//       {filteredWardrobe.length === 0 && filteredOutfits.length === 0 && (
//         <Text style={{color: theme.colors.foreground, marginTop: 20}}>
//           No results found.
//         </Text>
//       )}
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {flex: 1},
//   content: {padding: 16},
//   backButton: {marginBottom: 12, alignSelf: 'flex-start'},
//   inputWrapper: {position: 'relative', marginBottom: 16},
//   input: {
//     height: 48,
//     borderWidth: 1,
//     borderRadius: 12,
//     paddingHorizontal: 14,
//     fontSize: 16,
//     paddingRight: 40,
//   },
//   clearIcon: {position: 'absolute', right: 12, top: 12},
//   card: {
//     padding: 14,
//     borderRadius: 12,
//     borderWidth: 1,
//     marginBottom: 12,
//   },
//   groupLabel: {
//     marginTop: 20,
//     marginBottom: 6,
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#999',
//   },
// });
