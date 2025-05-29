import React, {useState} from 'react';
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
import type {WardrobeItem} from '../hooks/useOutfitSuggestion';

type Props = {
  navigate: (screen: string, params?: any) => void;
  wardrobe: WardrobeItem[];
};

export default function SearchScreen({navigate, wardrobe}: Props) {
  const {theme} = useAppTheme();
  const [query, setQuery] = useState('');

  const filteredItems = wardrobe.filter(item =>
    item.name?.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.colors.background}]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
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

      {filteredItems.map(item => (
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

      {filteredItems.length === 0 && (
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
    paddingRight: 40, // space for clear icon
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

//////////////

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
// import type {WardrobeItem} from '../hooks/useOutfitSuggestion';

// type Props = {
//   navigate: (screen: string, params?: any) => void;
//   wardrobe: WardrobeItem[];
// };

// export default function SearchScreen({navigate, wardrobe}: Props) {
//   const {theme} = useAppTheme();
//   const [query, setQuery] = useState('');

//   const filteredItems = wardrobe.filter(item =>
//     item.name?.toLowerCase().includes(query.toLowerCase()),
//   );

//   return (
//     <ScrollView
//       style={[styles.container, {backgroundColor: theme.colors.background}]}
//       contentContainerStyle={styles.content}>
//       <TextInput
//         placeholder="Search wardrobe..."
//         placeholderTextColor={theme.colors.foreground}
//         value={query}
//         onChangeText={setQuery}
//         style={[
//           styles.input,
//           {
//             color: theme.colors.foreground,
//             borderColor: theme.colors.foreground,
//             backgroundColor: theme.colors.surface,
//           },
//         ]}
//       />

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
//   input: {
//     height: 48,
//     borderWidth: 1,
//     borderRadius: 12,
//     paddingHorizontal: 14,
//     fontSize: 16,
//     marginBottom: 16,
//   },
//   card: {
//     padding: 14,
//     borderRadius: 12,
//     borderWidth: 1,
//     marginBottom: 12,
//   },
// });
