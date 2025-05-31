import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Linking,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {WebView} from 'react-native-webview';
import {mockClothingItems} from '../components/mockClothingItems/mockClothingItems';
import {useVoiceControl} from '../hooks/useVoiceControl';
import {Pressable} from 'react-native';

type TrendArticle = {
  id: string;
  title: string;
  summary: string;
  image: string;
  source: string;
  link: string;
};

const ITEM_MARGIN = 9.5;
const MIN_ITEM_WIDTH = 160;
const screenWidth = Dimensions.get('window').width;

const numColumns =
  Math.floor(screenWidth / (MIN_ITEM_WIDTH + ITEM_MARGIN * 2)) || 1;
const imageSize =
  (screenWidth - ITEM_MARGIN * (numColumns * 2 + 1)) / numColumns;

const featuredLooks = [
  {
    id: '1',
    title: 'Summer Neutrals',
    uri: 'https://picsum.photos/id/1015/600/400',
  },
  {
    id: '2',
    title: 'Streetwear Layered',
    uri: 'https://picsum.photos/id/1027/600/400',
  },
  {
    id: '3',
    title: 'Tailored Luxury',
    uri: 'https://picsum.photos/id/1035/600/400',
  },
  {
    id: '4',
    title: 'Urban Casual',
    uri: 'https://picsum.photos/id/1043/600/400',
  },
  {
    id: '5',
    title: 'Layered Street Look',
    uri: 'https://picsum.photos/id/1050/600/400',
  },
  {
    id: '6',
    title: 'Sleek Monochrome',
    uri: 'https://picsum.photos/id/1062/600/400',
  },
  {
    id: '7',
    title: 'Summer Neutrals',
    uri: 'https://picsum.photos/id/1015/600/400',
  },
  {
    id: '8',
    title: 'Streetwear Layered',
    uri: 'https://picsum.photos/id/1027/600/400',
  },
  {
    id: '9',
    title: 'Tailored Luxury',
    uri: 'https://picsum.photos/id/1035/600/400',
  },
  {
    id: '10',
    title: 'Urban Casual',
    uri: 'https://picsum.photos/id/1043/600/400',
  },
  {
    id: '11',
    title: 'Layered Street Look',
    uri: 'https://picsum.photos/id/1050/600/400',
  },
  {
    id: '12',
    title: 'Sleek Monochrome',
    uri: 'https://picsum.photos/id/1062/600/400',
  },
];

const dummyTrends = featuredLooks.map((look, index) => ({
  id: String(index + 1),
  title: look.title,
  summary: 'Explore this curated look trending now.',
  image: look.uri,
  source: 'Explore AI',
  link: 'https://www.gq.com/story/fall-trends-2025' + (index + 1),
}));

export default function ExploreScreen() {
  const {theme} = useAppTheme();
  const [query, setQuery] = useState('');
  const [trends, setTrends] = useState<TrendArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [webUrl, setWebUrl] = useState<string | null>(null);
  const {speech, isRecording, startListening, stopListening} =
    useVoiceControl();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: 12,
      paddingBottom: 24,
    },
    header: {
      fontSize: 28,
      fontWeight: '600',
      marginBottom: 8,
      color: theme.colors.primary,
      paddingHorizontal: 16,
    },
    title: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.foreground,
      marginBottom: 12,
      letterSpacing: -0.4,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      paddingHorizontal: 20,
      marginBottom: 12,
      letterSpacing: -0.2,
    },
    promptRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 24,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 14,
      height: 44,
      marginRight: 10,
      borderColor: '#ccc',
      backgroundColor: theme.colors.surface,
      fontSize: 15,
    },
    promptButton: {
      backgroundColor: '#000',
      padding: 12,
      borderRadius: 14,
    },
    carousel: {
      paddingLeft: 20,
      paddingBottom: 0,
    },
    card: {
      marginRight: 8,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      marginBottom: 20,
    },
    AISuggestcard: {
      marginHorizontal: 16,
      padding: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      marginBottom: 20,
    },
    image: {
      width: 160,
      height: 140,
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
    },
    cardTitle: {
      padding: 10,
      fontSize: 14,
      fontWeight: '500',
      textAlign: 'center',
      color: theme.colors.foreground,
    },
    suggestionText: {
      fontSize: 14,
      fontWeight: '500',
      marginBottom: 10,
      color: theme.colors.foreground,
    },
    suggestedImage: {
      width: '100%',
      height: 160,
      borderRadius: 16,
      marginBottom: 10,
    },
    missingItem: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.foreground,
      marginBottom: 2,
    },
    price: {
      fontSize: 14,
      color: '#666',
      marginBottom: 6,
    },
    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
    },
    gridCard: {
      width: imageSize,
      marginBottom: ITEM_MARGIN * 0.8,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
    },
    gridImage: {
      width: '100%',
      height: imageSize,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
    },
    gridTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.foreground,
    },
    gridSource: {
      fontSize: 12,
      color: '#777',
      paddingHorizontal: 8,
      paddingBottom: 8,
    },
    gridLabelContainer: {
      padding: 8,
    },
    inspoCard: {
      marginBottom: 6,
      marginRight: ITEM_MARGIN * 2,
      borderRadius: 16,
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      shadowColor: '#000',
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1,
    },
    inspoImage: {
      width: 120,
      height: 120,
      borderRadius: 14,
      marginBottom: 6,
      backgroundColor: theme.colors.surface,
    },
    inspoText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.foreground,
      paddingHorizontal: 4,
      paddingVertical: 2,
      paddingBottom: 8,
      textAlign: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.9)',
      paddingTop: 64,
    },
    modalContent: {
      flex: 1,
      backgroundColor: '#000',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: 'hidden',
    },
    webHeader: {
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: '#000',
      borderBottomWidth: 0.5,
      borderColor: '#222',
    },
    closeText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '500',
      letterSpacing: 0.4,
    },
  });

  useEffect(() => {
    setTimeout(() => {
      setTrends(dummyTrends);
      setLoading(false);
    }, 1000);
  }, []);

  const handleMicPress = () => {
    setQuery(''); // ✅ Clear the input before listening starts
    startListening(); // 🎤 Begin voice recognition
  };

  // When speech result updates
  useEffect(() => {
    if (speech?.trim()) {
      console.log('🎤 Recognized:', speech);
      setQuery(speech);
    }
  }, [speech]);

  const missingItemSuggestion = {
    name: 'Olive Bomber Jacket',
    price: '$129',
    link: 'https://www.ssense.com/en-us/men/product/acne-studios/green-bomber-jacket/1234567',
    image: 'https://picsum.photos/id/1015/600/400',
  };

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <Text style={[styles.header, {color: theme.colors.primary}]}>
        Explore
      </Text>

      <Text style={[styles.sectionTitle, {color: theme.colors.primary}]}>
        Style Prompt
      </Text>
      <View style={styles.promptRow}>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.colors.foreground2,
              borderColor: theme.colors.surface,
            },
          ]}
          placeholder="What's the vibe today?"
          placeholderTextColor="#999"
          value={query}
          onChangeText={setQuery}
        />
        <Pressable
          style={styles.promptButton}
          onPressIn={() => {
            setQuery('');
            startListening();
          }}
          onPressOut={stopListening}
          android_ripple={{color: '#555'}}>
          <MaterialIcons
            name={isRecording ? 'hearing' : 'mic'}
            size={22}
            color="#405de6"
          />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.carousel}>
        {featuredLooks.map(look => (
          <TouchableOpacity key={look.id} style={[styles.card]}>
            <Image
              source={{uri: look.uri}}
              style={styles.image}
              onError={e =>
                console.log(
                  `❌ Failed to load image for ${look.title}`,
                  e.nativeEvent.error,
                )
              }
            />
            <Text style={[styles.cardTitle]}>{look.title}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={[styles.sectionTitle, {color: theme.colors.primary}]}>
        AI Suggests
      </Text>
      <View style={[styles.AISuggestcard]}>
        <Text style={[styles.suggestionText, {color: theme.colors.foreground}]}>
          Pair your navy chinos with white sneakers and a denim overshirt.
          Missing something?
        </Text>
        <Image
          source={{uri: missingItemSuggestion.image}}
          style={styles.suggestedImage}
        />
        <Text style={[styles.missingItem, {color: theme.colors.primary}]}>
          Suggested: {missingItemSuggestion.name}
        </Text>
        <Text style={[styles.price, {color: theme.colors.foreground}]}>
          {missingItemSuggestion.price}
        </Text>
        <TouchableOpacity onPress={() => setWebUrl(missingItemSuggestion.link)}>
          <Text
            style={{
              color: theme.colors.foreground,
              textDecorationLine: 'underline',
            }}>
            View Item
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, {color: theme.colors.primary}]}>
        Style Inspiration
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{paddingLeft: 20, marginBottom: 12}}>
        {mockClothingItems.slice(0, 15).map(item => (
          <View key={item.id} style={[styles.inspoCard]}>
            <Image source={{uri: item.image}} style={styles.inspoImage} />
            <Text
              style={[styles.inspoText, {color: theme.colors.foreground}]}
              numberOfLines={1}>
              {item.name}
            </Text>
          </View>
        ))}
      </ScrollView>

      <Text style={[styles.sectionTitle, {color: theme.colors.primary}]}>
        Trend Lookout
      </Text>
      {loading ? (
        <ActivityIndicator
          size="large"
          color={theme.colors.primary}
          style={{marginTop: 24}}
        />
      ) : (
        <View style={styles.gridContainer}>
          {trends.map(trend => (
            <TouchableOpacity
              key={trend.id}
              style={styles.gridCard}
              onPress={() => setWebUrl(trend.link)}>
              <Image source={{uri: trend.image}} style={styles.gridImage} />
              <View style={styles.gridLabelContainer}>
                <Text style={styles.gridTitle} numberOfLines={1}>
                  {trend.title}
                </Text>
                <Text style={styles.gridSource} numberOfLines={1}>
                  {trend.source}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Modal visible={!!webUrl} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.webHeader}>
              <TouchableOpacity onPress={() => setWebUrl(null)}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
            {webUrl && (
              <WebView
                source={{uri: webUrl}}
                style={{flex: 1}}
                startInLoadingState
                renderLoading={() => (
                  <ActivityIndicator
                    size="large"
                    color={theme.colors.primary}
                    style={{marginTop: 48}}
                  />
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

//////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   Image,
//   TouchableOpacity,
//   TextInput,
//   Linking,
//   ActivityIndicator,
//   Modal,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {WebView} from 'react-native-webview';
// import {mockClothingItems} from '../components/mockClothingItems/mockClothingItems';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import {Pressable} from 'react-native';

// type TrendArticle = {
//   id: string;
//   title: string;
//   summary: string;
//   image: string;
//   source: string;
//   link: string;
// };

// const featuredLooks = [
//   {
//     id: '1',
//     title: 'Summer Neutrals',
//     uri: 'https://picsum.photos/id/1015/600/400',
//   },
//   {
//     id: '2',
//     title: 'Streetwear Layered',
//     uri: 'https://picsum.photos/id/1027/600/400',
//   },
//   {
//     id: '3',
//     title: 'Tailored Luxury',
//     uri: 'https://picsum.photos/id/1035/600/400',
//   },
//   {
//     id: '4',
//     title: 'Urban Casual',
//     uri: 'https://picsum.photos/id/1043/600/400',
//   },
//   {
//     id: '5',
//     title: 'Layered Street Look',
//     uri: 'https://picsum.photos/id/1050/600/400',
//   },
//   {
//     id: '6',
//     title: 'Sleek Monochrome',
//     uri: 'https://picsum.photos/id/1062/600/400',
//   },
//   {
//     id: '7',
//     title: 'Summer Neutrals',
//     uri: 'https://picsum.photos/id/1015/600/400',
//   },
//   {
//     id: '8',
//     title: 'Streetwear Layered',
//     uri: 'https://picsum.photos/id/1027/600/400',
//   },
//   {
//     id: '9',
//     title: 'Tailored Luxury',
//     uri: 'https://picsum.photos/id/1035/600/400',
//   },
//   {
//     id: '10',
//     title: 'Urban Casual',
//     uri: 'https://picsum.photos/id/1043/600/400',
//   },
//   {
//     id: '11',
//     title: 'Layered Street Look',
//     uri: 'https://picsum.photos/id/1050/600/400',
//   },
//   {
//     id: '12',
//     title: 'Sleek Monochrome',
//     uri: 'https://picsum.photos/id/1062/600/400',
//   },
// ];

// const dummyTrends = featuredLooks.map((look, index) => ({
//   id: String(index + 1),
//   title: look.title,
//   summary: 'Explore this curated look trending now.',
//   image: look.uri,
//   source: 'Explore AI',
//   link: 'https://www.gq.com/story/fall-trends-2025' + (index + 1),
// }));

// export default function ExploreScreen() {
//   const {theme} = useAppTheme();
//   const [query, setQuery] = useState('');
//   const [trends, setTrends] = useState<TrendArticle[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [webUrl, setWebUrl] = useState<string | null>(null);
//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       paddingTop: 12,
//       paddingBottom: 24,
//     },
//     title: {
//       fontSize: 14,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//       marginBottom: 12,
//       letterSpacing: -0.4,
//     },
//     sectionTitle: {
//       fontSize: 18,
//       fontWeight: '600',
//       paddingHorizontal: 20,
//       marginBottom: 8,
//       marginTop: 20,
//       letterSpacing: -0.2,
//     },
//     promptRow: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       paddingHorizontal: 20,
//       marginBottom: 24,
//     },
//     input: {
//       flex: 1,
//       borderWidth: 1,
//       borderRadius: 14,
//       paddingHorizontal: 14,
//       height: 44,
//       marginRight: 10,
//       borderColor: '#ccc',
//       backgroundColor: theme.colors.surface,
//       fontSize: 15,
//     },
//     promptButton: {
//       backgroundColor: '#000',
//       padding: 12,
//       borderRadius: 14,
//     },
//     carousel: {
//       paddingLeft: 20,
//       paddingBottom: 0,
//     },
//     card: {
//       marginRight: 12,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       marginBottom: 20,
//     },
//     AISuggestcard: {
//       marginRight: 12,
//       padding: 14,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       marginBottom: 20,
//     },
//     image: {
//       width: 160,
//       height: 140,
//       borderRadius: 14,
//       backgroundColor: theme.colors.surface,
//     },
//     cardTitle: {
//       padding: 10,
//       fontSize: 14,
//       fontWeight: '500',
//       textAlign: 'center',
//       color: theme.colors.foreground,
//     },
//     suggestionText: {
//       fontSize: 14,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//     },
//     suggestedImage: {
//       width: '100%',
//       height: 160,
//       borderRadius: 16,
//       marginBottom: 10,
//     },
//     missingItem: {
//       fontSize: 14,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//       marginBottom: 2,
//     },
//     price: {
//       fontSize: 14,
//       color: '#666',
//       marginBottom: 6,
//     },
//     gridContainer: {
//       flexDirection: 'row',
//       flexWrap: 'wrap',
//       justifyContent: 'space-between',
//       paddingHorizontal: 6,
//     },
//     gridCard: {
//       width: '49%',
//       height: 320,
//       marginBottom: 8,
//       borderRadius: 16,
//       overflow: 'hidden',
//       backgroundColor: theme.colors.surface,
//       shadowColor: '#000',
//       shadowOpacity: 0.03,
//       shadowRadius: 4,
//       elevation: 1,
//     },
//     gridImage: {
//       width: '100%',
//       height: 220,

//       borderRadius: 14,
//       marginBottom: 8,
//     },
//     gridTitle: {
//       fontSize: 14,
//       fontWeight: '600',
//       marginBottom: 2,
//       paddingHorizontal: 8,
//     },
//     gridSource: {
//       fontSize: 12,
//       color: '#777',
//       paddingHorizontal: 8,
//       paddingBottom: 8,
//     },
//     inspoCard: {
//       width: 90,
//       marginRight: 14,
//       borderRadius: 16,
//       padding: 8,
//       alignItems: 'center',
//       backgroundColor: theme.colors.surface,
//       shadowColor: '#000',
//       shadowOpacity: 0.03,
//       shadowRadius: 4,
//       elevation: 1,
//     },
//     inspoImage: {
//       width: 90,
//       height: 90,
//       borderRadius: 12,
//       marginBottom: 6,
//       backgroundColor: theme.colors.surface,
//     },
//     inspoText: {
//       fontSize: 14,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//     },
//     modalOverlay: {
//       flex: 1,
//       backgroundColor: 'rgba(0,0,0,0.9)',
//       paddingTop: 64,
//     },
//     modalContent: {
//       flex: 1,
//       backgroundColor: '#000',
//       borderTopLeftRadius: 24,
//       borderTopRightRadius: 24,
//       overflow: 'hidden',
//     },
//     webHeader: {
//       paddingHorizontal: 20,
//       paddingVertical: 14,
//       backgroundColor: '#000',
//       borderBottomWidth: 0.5,
//       borderColor: '#222',
//     },
//     closeText: {
//       color: '#fff',
//       fontSize: 16,
//       fontWeight: '500',
//       letterSpacing: 0.4,
//     },
//   });

//   useEffect(() => {
//     setTimeout(() => {
//       setTrends(dummyTrends);
//       setLoading(false);
//     }, 1000);
//   }, []);

//   const handleMicPress = () => {
//     setQuery(''); // ✅ Clear the input before listening starts
//     startListening(); // 🎤 Begin voice recognition
//   };

//   // When speech result updates
//   useEffect(() => {
//     if (speech?.trim()) {
//       console.log('🎤 Recognized:', speech);
//       setQuery(speech);
//     }
//   }, [speech]);

//   const missingItemSuggestion = {
//     name: 'Olive Bomber Jacket',
//     price: '$129',
//     link: 'https://www.ssense.com/en-us/men/product/acne-studios/green-bomber-jacket/1234567',
//     image: 'https://picsum.photos/id/1015/600/400',
//   };

//   return (
//     <ScrollView
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <Text style={[styles.title, {color: theme.colors.primary}]}>Explore</Text>

//       <Text style={[styles.sectionTitle, {color: theme.colors.primary}]}>
//         Style Prompt
//       </Text>
//       <View style={styles.promptRow}>
//         <TextInput
//           style={[
//             styles.input,
//             {
//               color: theme.colors.foreground2,
//               borderColor: theme.colors.surface,
//             },
//           ]}
//           placeholder="What's the vibe today?"
//           placeholderTextColor="#999"
//           value={query}
//           onChangeText={setQuery}
//         />
//         <Pressable
//           style={styles.promptButton}
//           onPressIn={() => {
//             setQuery('');
//             startListening();
//           }}
//           onPressOut={stopListening}
//           android_ripple={{color: '#555'}}>
//           <MaterialIcons
//             name={isRecording ? 'hearing' : 'mic'}
//             size={22}
//             color="#405de6"
//           />
//         </Pressable>
//       </View>

//       <ScrollView
//         horizontal
//         showsHorizontalScrollIndicator={false}
//         style={styles.carousel}>
//         {featuredLooks.map(look => (
//           <TouchableOpacity key={look.id} style={[styles.card]}>
//             <Image
//               source={{uri: look.uri}}
//               style={styles.image}
//               onError={e =>
//                 console.log(
//                   `❌ Failed to load image for ${look.title}`,
//                   e.nativeEvent.error,
//                 )
//               }
//             />
//             <Text style={[styles.cardTitle]}>{look.title}</Text>
//           </TouchableOpacity>
//         ))}
//       </ScrollView>

//       <Text style={[styles.sectionTitle, {color: theme.colors.primary}]}>
//         AI Suggests
//       </Text>
//       <View style={[styles.AISuggestcard]}>
//         <Text style={[styles.suggestionText, {color: theme.colors.foreground}]}>
//           Pair your navy chinos with white sneakers and a denim overshirt.
//           Missing something?
//         </Text>
//         <Image
//           source={{uri: missingItemSuggestion.image}}
//           style={styles.suggestedImage}
//         />
//         <Text style={[styles.missingItem, {color: theme.colors.primary}]}>
//           Suggested: {missingItemSuggestion.name}
//         </Text>
//         <Text style={[styles.price, {color: theme.colors.foreground}]}>
//           {missingItemSuggestion.price}
//         </Text>
//         <TouchableOpacity onPress={() => setWebUrl(missingItemSuggestion.link)}>
//           <Text
//             style={{
//               color: theme.colors.foreground,
//               textDecorationLine: 'underline',
//             }}>
//             View Item
//           </Text>
//         </TouchableOpacity>
//       </View>

//       <Text style={[styles.sectionTitle, {color: theme.colors.primary}]}>
//         Style Inspiration
//       </Text>
//       <ScrollView
//         horizontal
//         showsHorizontalScrollIndicator={false}
//         style={{paddingLeft: 20, marginBottom: 32}}>
//         {mockClothingItems.slice(0, 15).map(item => (
//           <View key={item.id} style={[styles.inspoCard, ,]}>
//             <Image source={{uri: item.image}} style={styles.inspoImage} />
//             <Text
//               style={[styles.inspoText, {color: theme.colors.foreground}]}
//               numberOfLines={1}>
//               {item.name}
//             </Text>
//           </View>
//         ))}
//       </ScrollView>

//       <Text style={[styles.sectionTitle, {color: theme.colors.primary}]}>
//         Trend Lookout
//       </Text>
//       {loading ? (
//         <ActivityIndicator
//           size="large"
//           color={theme.colors.primary}
//           style={{marginTop: 24}}
//         />
//       ) : (
//         <View style={styles.gridContainer}>
//           {trends.map(trend => (
//             <TouchableOpacity
//               key={trend.id}
//               style={[styles.gridCard]}
//               onPress={() => setWebUrl(trend.link)}>
//               <Image source={{uri: trend.image}} style={styles.gridImage} />
//               <Text style={[styles.gridTitle, {color: theme.colors.primary}]}>
//                 {trend.title}
//               </Text>
//               <Text
//                 style={[styles.gridSource, {color: theme.colors.foreground2}]}
//                 numberOfLines={1}>
//                 {trend.source}
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </View>
//       )}

//       <Modal visible={!!webUrl} animationType="slide" transparent>
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContent}>
//             <View style={styles.webHeader}>
//               <TouchableOpacity onPress={() => setWebUrl(null)}>
//                 <Text style={styles.closeText}>Close</Text>
//               </TouchableOpacity>
//             </View>
//             {webUrl && (
//               <WebView
//                 source={{uri: webUrl}}
//                 style={{flex: 1}}
//                 startInLoadingState
//                 renderLoading={() => (
//                   <ActivityIndicator
//                     size="large"
//                     color={theme.colors.primary}
//                     style={{marginTop: 48}}
//                   />
//                 )}
//               />
//             )}
//           </View>
//         </View>
//       </Modal>
//     </ScrollView>
//   );
// }

/////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   Image,
//   TouchableOpacity,
//   TextInput,
//   Linking,
//   ActivityIndicator,
//   Modal,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {WebView} from 'react-native-webview';
// import {mockClothingItems} from '../components/mockClothingItems/mockClothingItems';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import {Pressable} from 'react-native';

// type TrendArticle = {
//   id: string;
//   title: string;
//   summary: string;
//   image: string;
//   source: string;
//   link: string;
// };

// const featuredLooks = [
//   {
//     id: '1',
//     title: 'Summer Neutrals',
//     uri: 'https://picsum.photos/id/1015/600/400',
//   },
//   {
//     id: '2',
//     title: 'Streetwear Layered',
//     uri: 'https://picsum.photos/id/1027/600/400',
//   },
//   {
//     id: '3',
//     title: 'Tailored Luxury',
//     uri: 'https://picsum.photos/id/1035/600/400',
//   },
//   {
//     id: '4',
//     title: 'Urban Casual',
//     uri: 'https://picsum.photos/id/1043/600/400',
//   },
//   {
//     id: '5',
//     title: 'Layered Street Look',
//     uri: 'https://picsum.photos/id/1050/600/400',
//   },
//   {
//     id: '6',
//     title: 'Sleek Monochrome',
//     uri: 'https://picsum.photos/id/1062/600/400',
//   },
//   {
//     id: '7',
//     title: 'Summer Neutrals',
//     uri: 'https://picsum.photos/id/1015/600/400',
//   },
//   {
//     id: '8',
//     title: 'Streetwear Layered',
//     uri: 'https://picsum.photos/id/1027/600/400',
//   },
//   {
//     id: '9',
//     title: 'Tailored Luxury',
//     uri: 'https://picsum.photos/id/1035/600/400',
//   },
//   {
//     id: '10',
//     title: 'Urban Casual',
//     uri: 'https://picsum.photos/id/1043/600/400',
//   },
//   {
//     id: '11',
//     title: 'Layered Street Look',
//     uri: 'https://picsum.photos/id/1050/600/400',
//   },
//   {
//     id: '12',
//     title: 'Sleek Monochrome',
//     uri: 'https://picsum.photos/id/1062/600/400',
//   },
// ];

// const dummyTrends = featuredLooks.map((look, index) => ({
//   id: String(index + 1),
//   title: look.title,
//   summary: 'Explore this curated look trending now.',
//   image: look.uri,
//   source: 'Explore AI',
//   link: 'https://www.gq.com/story/fall-trends-2025' + (index + 1),
// }));

// export default function ExploreScreen() {
//   const {theme} = useAppTheme();
//   const [query, setQuery] = useState('');
//   const [trends, setTrends] = useState<TrendArticle[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [webUrl, setWebUrl] = useState<string | null>(null);
//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();

//   useEffect(() => {
//     setTimeout(() => {
//       setTrends(dummyTrends);
//       setLoading(false);
//     }, 1000);
//   }, []);

//   const handleMicPress = () => {
//     setQuery(''); // ✅ Clear the input before listening starts
//     startListening(); // 🎤 Begin voice recognition
//   };

//   // When speech result updates
//   useEffect(() => {
//     if (speech?.trim()) {
//       console.log('🎤 Recognized:', speech);
//       setQuery(speech);
//     }
//   }, [speech]);

//   const missingItemSuggestion = {
//     name: 'Olive Bomber Jacket',
//     price: '$129',
//     link: 'https://www.ssense.com/en-us/men/product/acne-studios/green-bomber-jacket/1234567',
//     image: 'https://picsum.photos/id/1015/600/400',
//   };

//   return (
//     <ScrollView
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <Text style={[styles.title, {color: theme.colors.primary}]}>Explore</Text>

//       <Text style={[styles.sectionTitle, {color: theme.colors.primary}]}>
//         Style Prompt
//       </Text>
//       <View style={styles.promptRow}>
//         <TextInput
//           style={[
//             styles.input,
//             {
//               color: theme.colors.foreground2,
//               borderColor: theme.colors.surface,
//             },
//           ]}
//           placeholder="What's the vibe today?"
//           placeholderTextColor="#999"
//           value={query}
//           onChangeText={setQuery}
//         />
//         <Pressable
//           style={styles.promptButton}
//           onPressIn={() => {
//             setQuery('');
//             startListening();
//           }}
//           onPressOut={stopListening}
//           android_ripple={{color: '#555'}}>
//           <MaterialIcons
//             name={isRecording ? 'hearing' : 'mic'}
//             size={22}
//             color="#fff"
//           />
//         </Pressable>
//       </View>

//       <ScrollView
//         horizontal
//         showsHorizontalScrollIndicator={false}
//         style={styles.carousel}>
//         {featuredLooks.map(look => (
//           <TouchableOpacity
//             key={look.id}
//             style={[
//               styles.aiCard,
//               {backgroundColor: theme.colors.cardBackground},
//             ]}>
//             <Image
//               source={{uri: look.uri}}
//               style={styles.image}
//               onError={e =>
//                 console.log(
//                   `❌ Failed to load image for ${look.title}`,
//                   e.nativeEvent.error,
//                 )
//               }
//             />
//             <Text style={[styles.cardTitle, {color: theme.colors.foreground}]}>
//               {look.title}
//             </Text>
//           </TouchableOpacity>
//         ))}
//       </ScrollView>

//       <Text style={[styles.sectionTitle, {color: theme.colors.primary}]}>
//         AI Suggests
//       </Text>
//       <View
//         style={[styles.aiCard, {backgroundColor: theme.colors.cardBackground}]}>
//         <Text style={[styles.suggestionText, {color: theme.colors.foreground}]}>
//           Pair your navy chinos with white sneakers and a denim overshirt.
//           Missing something?
//         </Text>
//         <Image
//           source={{uri: missingItemSuggestion.image}}
//           style={styles.suggestedImage}
//         />
//         <Text style={[styles.missingItem, {color: theme.colors.primary}]}>
//           Suggested: {missingItemSuggestion.name}
//         </Text>
//         <Text style={[styles.price, {color: theme.colors.foreground}]}>
//           {missingItemSuggestion.price}
//         </Text>
//         <TouchableOpacity onPress={() => setWebUrl(missingItemSuggestion.link)}>
//           <Text
//             style={{
//               color: theme.colors.foreground,
//               textDecorationLine: 'underline',
//             }}>
//             View Item
//           </Text>
//         </TouchableOpacity>
//       </View>

//       <Text style={[styles.sectionTitle, {color: theme.colors.primary}]}>
//         Style Inspiration
//       </Text>
//       <ScrollView
//         horizontal
//         showsHorizontalScrollIndicator={false}
//         style={{paddingLeft: 20, marginBottom: 32}}>
//         {mockClothingItems.slice(0, 15).map(item => (
//           <View
//             key={item.id}
//             style={[
//               styles.inspoCard,
//               {backgroundColor: theme.colors.cardBackground},
//             ]}>
//             <Image source={{uri: item.image}} style={styles.inspoImage} />
//             <Text
//               style={[styles.inspoText, {color: theme.colors.foreground}]}
//               numberOfLines={1}>
//               {item.name}
//             </Text>
//           </View>
//         ))}
//       </ScrollView>

//       <Text style={[styles.sectionTitle, {color: theme.colors.primary}]}>
//         Trend Lookout
//       </Text>
//       {loading ? (
//         <ActivityIndicator
//           size="large"
//           color={theme.colors.primary}
//           style={{marginTop: 24}}
//         />
//       ) : (
//         <View style={styles.gridContainer}>
//           {trends.map(trend => (
//             <TouchableOpacity
//               key={trend.id}
//               style={[
//                 styles.gridCard,
//                 {backgroundColor: theme.colors.cardBackground},
//               ]}
//               onPress={() => setWebUrl(trend.link)}>
//               <Image source={{uri: trend.image}} style={styles.gridImage} />
//               <Text style={[styles.gridTitle, {color: theme.colors.primary}]}>
//                 {trend.title}
//               </Text>
//               <Text
//                 style={[styles.gridSource, {color: theme.colors.accent}]}
//                 numberOfLines={1}>
//                 {trend.source}
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </View>
//       )}

//       <Modal visible={!!webUrl} animationType="slide" transparent>
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContent}>
//             <View style={styles.webHeader}>
//               <TouchableOpacity onPress={() => setWebUrl(null)}>
//                 <Text style={styles.closeText}>Close</Text>
//               </TouchableOpacity>
//             </View>
//             {webUrl && (
//               <WebView
//                 source={{uri: webUrl}}
//                 style={{flex: 1}}
//                 startInLoadingState
//                 renderLoading={() => (
//                   <ActivityIndicator
//                     size="large"
//                     color={theme.colors.primary}
//                     style={{marginTop: 48}}
//                   />
//                 )}
//               />
//             )}
//           </View>
//         </View>
//       </Modal>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     paddingTop: 12,
//     paddingBottom: 32,
//   },
//   title: {
//     fontSize: 32,
//     fontWeight: '700',
//     paddingHorizontal: 24,
//     marginBottom: 16,
//     letterSpacing: -0.5,
//   },
//   sectionTitle: {
//     fontSize: 20,
//     fontWeight: '600',
//     paddingHorizontal: 24,
//     marginBottom: 12,
//     marginTop: 24,
//     letterSpacing: -0.2,
//   },
//   carousel: {
//     paddingLeft: 24,
//     paddingBottom: 0,
//   },
//   aiCard: {
//     marginHorizontal: 8,
//     padding: 18,
//     backgroundColor: '#f2f2f7',
//     borderRadius: 20,
//     marginBottom: 28,
//   },
//   image: {
//     width: 180,
//     height: 160,
//     borderRadius: 16,
//     backgroundColor: '#eaeaea',
//   },
//   cardTitle: {
//     paddingTop: 12,
//     fontSize: 16,
//     fontWeight: '500',
//     textAlign: 'center',
//     color: '#333',
//   },
//   suggestionText: {
//     fontSize: 15,
//     fontStyle: 'italic',
//     marginBottom: 14,
//     lineHeight: 22,
//   },
//   suggestedImage: {
//     width: '100%',
//     height: 180,
//     borderRadius: 18,
//     marginBottom: 12,
//   },
//   missingItem: {
//     fontSize: 17,
//     fontWeight: '600',
//     marginBottom: 4,
//   },
//   price: {
//     fontSize: 15,
//     color: '#666',
//     marginBottom: 8,
//   },
//   promptRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 24,
//     marginBottom: 40,
//   },
//   input: {
//     flex: 1,
//     borderWidth: 1,
//     borderRadius: 16,
//     paddingHorizontal: 16,
//     height: 48,
//     marginRight: 12,
//     borderColor: '#ccc',
//     backgroundColor: '#fff',
//     fontSize: 15,
//   },
//   promptButton: {
//     backgroundColor: '#000',
//     padding: 14,
//     borderRadius: 16,
//   },
//   gridContainer: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     justifyContent: 'space-between',
//     paddingHorizontal: 24,
//     gap: 16,
//   },
//   gridCard: {
//     width: '47%',
//     marginBottom: 20,
//     borderRadius: 20,
//     overflow: 'hidden',
//     padding: 12,
//     backgroundColor: '#f9f9fb',
//     shadowColor: '#000',
//     shadowOpacity: 0.03,
//     shadowRadius: 6,
//     elevation: 1,
//   },
//   gridImage: {
//     width: '100%',
//     height: 120,
//     borderRadius: 16,
//     marginBottom: 10,
//   },
//   gridTitle: {
//     fontSize: 15,
//     fontWeight: '600',
//     marginBottom: 2,
//   },
//   gridSource: {
//     fontSize: 13,
//     fontStyle: 'italic',
//     color: '#777',
//   },
//   inspoCard: {
//     width: 120,
//     marginRight: 16,
//     borderRadius: 18,
//     padding: 10,
//     alignItems: 'center',
//     backgroundColor: '#f9f9fb',
//     shadowColor: '#000',
//     shadowOpacity: 0.03,
//     shadowRadius: 4,
//     elevation: 1,
//   },
//   inspoImage: {
//     width: 100,
//     height: 100,
//     borderRadius: 12,
//     marginBottom: 8,
//     backgroundColor: '#eaeaea',
//   },
//   inspoText: {
//     fontSize: 13,
//     fontWeight: '500',
//     textAlign: 'center',
//     color: '#333',
//   },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.9)',
//     paddingTop: 64,
//   },
//   modalContent: {
//     flex: 1,
//     backgroundColor: '#000',
//     borderTopLeftRadius: 24,
//     borderTopRightRadius: 24,
//     overflow: 'hidden',
//   },
//   webHeader: {
//     paddingHorizontal: 20,
//     paddingVertical: 14,
//     backgroundColor: '#000',
//     borderBottomWidth: 0.5,
//     borderColor: '#222',
//   },
//   closeText: {
//     color: '#fff',
//     fontSize: 17,
//     fontWeight: '500',
//     letterSpacing: 0.5,
//   },
// });

/////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   Image,
//   TouchableOpacity,
//   TextInput,
//   Linking,
//   ActivityIndicator,
//   Modal,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {WebView} from 'react-native-webview';
// import {mockClothingItems} from '../components/mockClothingItems/mockClothingItems';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import {Pressable} from 'react-native';

// type TrendArticle = {
//   id: string;
//   title: string;
//   summary: string;
//   image: string;
//   source: string;
//   link: string;
// };

// const featuredLooks = [
//   {
//     id: '1',
//     title: 'Summer Neutrals',
//     uri: 'https://picsum.photos/id/1015/600/400',
//   },
//   {
//     id: '2',
//     title: 'Streetwear Layered',
//     uri: 'https://picsum.photos/id/1027/600/400',
//   },
//   {
//     id: '3',
//     title: 'Tailored Luxury',
//     uri: 'https://picsum.photos/id/1035/600/400',
//   },
//   {
//     id: '4',
//     title: 'Urban Casual',
//     uri: 'https://picsum.photos/id/1043/600/400',
//   },
//   {
//     id: '5',
//     title: 'Layered Street Look',
//     uri: 'https://picsum.photos/id/1050/600/400',
//   },
//   {
//     id: '6',
//     title: 'Sleek Monochrome',
//     uri: 'https://picsum.photos/id/1062/600/400',
//   },
//   {
//     id: '7',
//     title: 'Summer Neutrals',
//     uri: 'https://picsum.photos/id/1015/600/400',
//   },
//   {
//     id: '8',
//     title: 'Streetwear Layered',
//     uri: 'https://picsum.photos/id/1027/600/400',
//   },
//   {
//     id: '9',
//     title: 'Tailored Luxury',
//     uri: 'https://picsum.photos/id/1035/600/400',
//   },
//   {
//     id: '10',
//     title: 'Urban Casual',
//     uri: 'https://picsum.photos/id/1043/600/400',
//   },
//   {
//     id: '11',
//     title: 'Layered Street Look',
//     uri: 'https://picsum.photos/id/1050/600/400',
//   },
//   {
//     id: '12',
//     title: 'Sleek Monochrome',
//     uri: 'https://picsum.photos/id/1062/600/400',
//   },
// ];

// const dummyTrends = featuredLooks.map((look, index) => ({
//   id: String(index + 1),
//   title: look.title,
//   summary: 'Explore this curated look trending now.',
//   image: look.uri,
//   source: 'Explore AI',
//   link: 'https://www.gq.com/story/fall-trends-2025' + (index + 1),
// }));

// export default function ExploreScreen() {
//   const {theme} = useAppTheme();
//   const [query, setQuery] = useState('');
//   const [trends, setTrends] = useState<TrendArticle[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [webUrl, setWebUrl] = useState<string | null>(null);
//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();

//   useEffect(() => {
//     setTimeout(() => {
//       setTrends(dummyTrends);
//       setLoading(false);
//     }, 1000);
//   }, []);

//   const handleMicPress = () => {
//     setQuery(''); // ✅ Clear the input before listening starts
//     startListening(); // 🎤 Begin voice recognition
//   };

//   // When speech result updates
//   useEffect(() => {
//     if (speech?.trim()) {
//       console.log('🎤 Recognized:', speech);
//       setQuery(speech);
//     }
//   }, [speech]);

//   const missingItemSuggestion = {
//     name: 'Olive Bomber Jacket',
//     price: '$129',
//     link: 'https://www.ssense.com/en-us/men/product/acne-studios/green-bomber-jacket/1234567',
//     image: 'https://picsum.photos/id/1015/600/400',
//   };

//   return (
//     <ScrollView
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <Text style={[styles.title, {color: theme.colors.primary}]}>Explore</Text>

//       <Text style={[styles.sectionTitle, {color: theme.colors.primary}]}>
//         Style Prompt
//       </Text>
//       <View style={styles.promptRow}>
//         <TextInput
//           style={[
//             styles.input,
//             {
//               color: theme.colors.foreground2,
//               borderColor: theme.colors.surface,
//             },
//           ]}
//           placeholder="What's the vibe today?"
//           placeholderTextColor="#999"
//           value={query}
//           onChangeText={setQuery}
//         />
//         <Pressable
//           style={styles.promptButton}
//           onPressIn={() => {
//             setQuery('');
//             startListening();
//           }}
//           onPressOut={stopListening}
//           android_ripple={{color: '#555'}}>
//           <MaterialIcons
//             name={isRecording ? 'hearing' : 'mic'}
//             size={22}
//             color="#fff"
//           />
//         </Pressable>
//       </View>

//       <ScrollView
//         horizontal
//         showsHorizontalScrollIndicator={false}
//         style={styles.carousel}>
//         {featuredLooks.map(look => (
//           <TouchableOpacity
//             key={look.id}
//             style={[
//               styles.aiCard,
//               {backgroundColor: theme.colors.cardBackground},
//             ]}>
//             <Image
//               source={{uri: look.uri}}
//               style={styles.image}
//               onError={e =>
//                 console.log(
//                   `❌ Failed to load image for ${look.title}`,
//                   e.nativeEvent.error,
//                 )
//               }
//             />
//             <Text style={[styles.cardTitle, {color: theme.colors.foreground}]}>
//               {look.title}
//             </Text>
//           </TouchableOpacity>
//         ))}
//       </ScrollView>

//       <Text style={[styles.sectionTitle, {color: theme.colors.primary}]}>
//         AI Suggests
//       </Text>
//       <View
//         style={[styles.aiCard, {backgroundColor: theme.colors.cardBackground}]}>
//         <Text style={[styles.suggestionText, {color: theme.colors.foreground}]}>
//           Pair your navy chinos with white sneakers and a denim overshirt.
//           Missing something?
//         </Text>
//         <Image
//           source={{uri: missingItemSuggestion.image}}
//           style={styles.suggestedImage}
//         />
//         <Text style={[styles.missingItem, {color: theme.colors.primary}]}>
//           Suggested: {missingItemSuggestion.name}
//         </Text>
//         <Text style={[styles.price, {color: theme.colors.foreground}]}>
//           {missingItemSuggestion.price}
//         </Text>
//         <TouchableOpacity onPress={() => setWebUrl(missingItemSuggestion.link)}>
//           <Text
//             style={{
//               color: theme.colors.foreground,
//               textDecorationLine: 'underline',
//             }}>
//             View Item
//           </Text>
//         </TouchableOpacity>
//       </View>

//       <Text style={[styles.sectionTitle, {color: theme.colors.primary}]}>
//         Style Inspiration
//       </Text>
//       <ScrollView
//         horizontal
//         showsHorizontalScrollIndicator={false}
//         style={{paddingLeft: 20, marginBottom: 32}}>
//         {mockClothingItems.slice(0, 15).map(item => (
//           <View
//             key={item.id}
//             style={[
//               styles.inspoCard,
//               {backgroundColor: theme.colors.cardBackground},
//             ]}>
//             <Image source={{uri: item.image}} style={styles.inspoImage} />
//             <Text
//               style={[styles.inspoText, {color: theme.colors.foreground}]}
//               numberOfLines={1}>
//               {item.name}
//             </Text>
//           </View>
//         ))}
//       </ScrollView>

//       <Text style={[styles.sectionTitle, {color: theme.colors.primary}]}>
//         Trend Lookout
//       </Text>
//       {loading ? (
//         <ActivityIndicator
//           size="large"
//           color={theme.colors.primary}
//           style={{marginTop: 24}}
//         />
//       ) : (
//         <View style={styles.gridContainer}>
//           {trends.map(trend => (
//             <TouchableOpacity
//               key={trend.id}
//               style={[
//                 styles.gridCard,
//                 {backgroundColor: theme.colors.cardBackground},
//               ]}
//               onPress={() => setWebUrl(trend.link)}>
//               <Image source={{uri: trend.image}} style={styles.gridImage} />
//               <Text style={[styles.gridTitle, {color: theme.colors.primary}]}>
//                 {trend.title}
//               </Text>
//               <Text
//                 style={[styles.gridSource, {color: theme.colors.accent}]}
//                 numberOfLines={1}>
//                 {trend.source}
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </View>
//       )}

//       <Modal visible={!!webUrl} animationType="slide" transparent>
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContent}>
//             <View style={styles.webHeader}>
//               <TouchableOpacity onPress={() => setWebUrl(null)}>
//                 <Text style={styles.closeText}>Close</Text>
//               </TouchableOpacity>
//             </View>
//             {webUrl && (
//               <WebView
//                 source={{uri: webUrl}}
//                 style={{flex: 1}}
//                 startInLoadingState
//                 renderLoading={() => (
//                   <ActivityIndicator
//                     size="large"
//                     color={theme.colors.primary}
//                     style={{marginTop: 48}}
//                   />
//                 )}
//               />
//             )}
//           </View>
//         </View>
//       </Modal>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     paddingTop: 12,
//     paddingBottom: 32,
//   },
//   title: {
//     fontSize: 32,
//     fontWeight: '700',
//     paddingHorizontal: 24,
//     marginBottom: 16,
//     letterSpacing: -0.5,
//   },
//   sectionTitle: {
//     fontSize: 20,
//     fontWeight: '600',
//     paddingHorizontal: 24,
//     marginBottom: 12,
//     marginTop: 24,
//     letterSpacing: -0.2,
//   },
//   carousel: {
//     paddingLeft: 24,
//     paddingBottom: 0,
//   },
//   aiCard: {
//     marginHorizontal: 8,
//     padding: 18,
//     backgroundColor: '#f2f2f7',
//     borderRadius: 20,
//     marginBottom: 28,
//   },
//   image: {
//     width: 180,
//     height: 160,
//     borderRadius: 16,
//     backgroundColor: '#eaeaea',
//   },
//   cardTitle: {
//     paddingTop: 12,
//     fontSize: 16,
//     fontWeight: '500',
//     textAlign: 'center',
//     color: '#333',
//   },
//   suggestionText: {
//     fontSize: 15,
//     fontStyle: 'italic',
//     marginBottom: 14,
//     lineHeight: 22,
//   },
//   suggestedImage: {
//     width: '100%',
//     height: 180,
//     borderRadius: 18,
//     marginBottom: 12,
//   },
//   missingItem: {
//     fontSize: 17,
//     fontWeight: '600',
//     marginBottom: 4,
//   },
//   price: {
//     fontSize: 15,
//     color: '#666',
//     marginBottom: 8,
//   },
//   promptRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 24,
//     marginBottom: 40,
//   },
//   input: {
//     flex: 1,
//     borderWidth: 1,
//     borderRadius: 16,
//     paddingHorizontal: 16,
//     height: 48,
//     marginRight: 12,
//     borderColor: '#ccc',
//     backgroundColor: '#fff',
//     fontSize: 15,
//   },
//   promptButton: {
//     backgroundColor: '#000',
//     padding: 14,
//     borderRadius: 16,
//   },
//   gridContainer: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     justifyContent: 'space-between',
//     paddingHorizontal: 24,
//     gap: 16,
//   },
//   gridCard: {
//     width: '47%',
//     marginBottom: 20,
//     borderRadius: 20,
//     overflow: 'hidden',
//     padding: 12,
//     backgroundColor: '#f9f9fb',
//     shadowColor: '#000',
//     shadowOpacity: 0.03,
//     shadowRadius: 6,
//     elevation: 1,
//   },
//   gridImage: {
//     width: '100%',
//     height: 120,
//     borderRadius: 16,
//     marginBottom: 10,
//   },
//   gridTitle: {
//     fontSize: 15,
//     fontWeight: '600',
//     marginBottom: 2,
//   },
//   gridSource: {
//     fontSize: 13,
//     fontStyle: 'italic',
//     color: '#777',
//   },
//   inspoCard: {
//     width: 120,
//     marginRight: 16,
//     borderRadius: 18,
//     padding: 10,
//     alignItems: 'center',
//     backgroundColor: '#f9f9fb',
//     shadowColor: '#000',
//     shadowOpacity: 0.03,
//     shadowRadius: 4,
//     elevation: 1,
//   },
//   inspoImage: {
//     width: 100,
//     height: 100,
//     borderRadius: 12,
//     marginBottom: 8,
//     backgroundColor: '#eaeaea',
//   },
//   inspoText: {
//     fontSize: 13,
//     fontWeight: '500',
//     textAlign: 'center',
//     color: '#333',
//   },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.9)',
//     paddingTop: 64,
//   },
//   modalContent: {
//     flex: 1,
//     backgroundColor: '#000',
//     borderTopLeftRadius: 24,
//     borderTopRightRadius: 24,
//     overflow: 'hidden',
//   },
//   webHeader: {
//     paddingHorizontal: 20,
//     paddingVertical: 14,
//     backgroundColor: '#000',
//     borderBottomWidth: 0.5,
//     borderColor: '#222',
//   },
//   closeText: {
//     color: '#fff',
//     fontSize: 17,
//     fontWeight: '500',
//     letterSpacing: 0.5,
//   },
// });

////////////////

// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   Image,
//   TouchableOpacity,
//   TextInput,
//   Linking,
//   ActivityIndicator,
//   Modal,
// } from 'react-native';
// import {useAppTheme} from '../context/ThemeContext';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import {WebView} from 'react-native-webview';
// import {mockClothingItems} from '../components/mockClothingItems/mockClothingItems';
// import {useVoiceControl} from '../hooks/useVoiceControl';
// import {Pressable} from 'react-native';

// type TrendArticle = {
//   id: string;
//   title: string;
//   summary: string;
//   image: string;
//   source: string;
//   link: string;
// };

// const featuredLooks = [
//   {
//     id: '1',
//     title: 'Summer Neutrals',
//     uri: 'https://picsum.photos/id/1015/600/400',
//   },
//   {
//     id: '2',
//     title: 'Streetwear Layered',
//     uri: 'https://picsum.photos/id/1027/600/400',
//   },
//   {
//     id: '3',
//     title: 'Tailored Luxury',
//     uri: 'https://picsum.photos/id/1035/600/400',
//   },
//   {
//     id: '4',
//     title: 'Urban Casual',
//     uri: 'https://picsum.photos/id/1043/600/400',
//   },
//   {
//     id: '5',
//     title: 'Layered Street Look',
//     uri: 'https://picsum.photos/id/1050/600/400',
//   },
//   {
//     id: '6',
//     title: 'Sleek Monochrome',
//     uri: 'https://picsum.photos/id/1062/600/400',
//   },
//   {
//     id: '7',
//     title: 'Summer Neutrals',
//     uri: 'https://picsum.photos/id/1015/600/400',
//   },
//   {
//     id: '8',
//     title: 'Streetwear Layered',
//     uri: 'https://picsum.photos/id/1027/600/400',
//   },
//   {
//     id: '9',
//     title: 'Tailored Luxury',
//     uri: 'https://picsum.photos/id/1035/600/400',
//   },
//   {
//     id: '10',
//     title: 'Urban Casual',
//     uri: 'https://picsum.photos/id/1043/600/400',
//   },
//   {
//     id: '11',
//     title: 'Layered Street Look',
//     uri: 'https://picsum.photos/id/1050/600/400',
//   },
//   {
//     id: '12',
//     title: 'Sleek Monochrome',
//     uri: 'https://picsum.photos/id/1062/600/400',
//   },
// ];

// const dummyTrends = [
//   {
//     id: '1',
//     title: 'Monochrome Layers',
//     summary:
//       'Layered neutrals with contrast stitching are dominating this fall.',
//     image:
//       'https://cdn.shopify.com/s/files/1/0680/4150/7113/files/monochrome-layers.jpg?v=1700203421',
//     source: 'GQ Magazine',
//     link: 'https://www.gq.com/story/fall-trends-2025',
//   },
//   {
//     id: '2',
//     title: 'Tailored Streetwear',
//     summary:
//       'Crossovers between street style and tailoring are defining the next-gen silhouette.',
//     image:
//       'https://assets.burberry.com/is/image/Burberryltd/Burberry-tailored-streetwear.jpg',
//     source: 'Highsnobiety',
//     link: 'https://www.highsnobiety.com/tag/tailored-streetwear/',
//   },
//   {
//     id: '3',
//     title: 'Monochrome Layers',
//     summary:
//       'Layered neutrals with contrast stitching are dominating this fall.',
//     image:
//       'https://cdn.shopify.com/s/files/1/0680/4150/7113/files/monochrome-layers.jpg?v=1700203421',
//     source: 'GQ Magazine',
//     link: 'https://www.gq.com/story/fall-trends-2025',
//   },
//   {
//     id: '4',
//     title: 'Tailored Streetwear',
//     summary:
//       'Crossovers between street style and tailoring are defining the next-gen silhouette.',
//     image:
//       'https://assets.burberry.com/is/image/Burberryltd/Burberry-tailored-streetwear.jpg',
//     source: 'Highsnobiety',
//     link: 'https://www.highsnobiety.com/tag/tailored-streetwear/',
//   },
//   {
//     id: '5',
//     title: 'Monochrome Layers',
//     summary:
//       'Layered neutrals with contrast stitching are dominating this fall.',
//     image:
//       'https://cdn.shopify.com/s/files/1/0680/4150/7113/files/monochrome-layers.jpg?v=1700203421',
//     source: 'GQ Magazine',
//     link: 'https://www.gq.com/story/fall-trends-2025',
//   },
//   {
//     id: '6',
//     title: 'Tailored Streetwear',
//     summary:
//       'Crossovers between street style and tailoring are defining the next-gen silhouette.',
//     image:
//       'https://assets.burberry.com/is/image/Burberryltd/Burberry-tailored-streetwear.jpg',
//     source: 'Highsnobiety',
//     link: 'https://www.highsnobiety.com/tag/tailored-streetwear/',
//   },
//   {
//     id: '7',
//     title: 'Monochrome Layers',
//     summary:
//       'Layered neutrals with contrast stitching are dominating this fall.',
//     image:
//       'https://cdn.shopify.com/s/files/1/0680/4150/7113/files/monochrome-layers.jpg?v=1700203421',
//     source: 'GQ Magazine',
//     link: 'https://www.gq.com/story/fall-trends-2025',
//   },
//   {
//     id: '8',
//     title: 'Tailored Streetwear',
//     summary:
//       'Crossovers between street style and tailoring are defining the next-gen silhouette.',
//     image:
//       'https://assets.burberry.com/is/image/Burberryltd/Burberry-tailored-streetwear.jpg',
//     source: 'Highsnobiety',
//     link: 'https://www.highsnobiety.com/tag/tailored-streetwear/',
//   },
// ];

// export default function ExploreScreen() {
//   const {theme} = useAppTheme();
//   const [query, setQuery] = useState('');
//   const [trends, setTrends] = useState<TrendArticle[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [webUrl, setWebUrl] = useState<string | null>(null);
//   const {speech, isRecording, startListening, stopListening} =
//     useVoiceControl();

//   useEffect(() => {
//     setTimeout(() => {
//       setTrends(dummyTrends);
//       setLoading(false);
//     }, 1000);
//   }, []);

//   const handleMicPress = () => {
//     setQuery(''); // ✅ Clear the input before listening starts
//     startListening(); // 🎤 Begin voice recognition
//   };

//   // When speech result updates
//   useEffect(() => {
//     if (speech?.trim()) {
//       console.log('🎤 Recognized:', speech);
//       setQuery(speech);
//     }
//   }, [speech]);

//   const missingItemSuggestion = {
//     name: 'Olive Bomber Jacket',
//     price: '$129',
//     link: 'https://www.ssense.com/en-us/men/product/acne-studios/green-bomber-jacket/1234567',
//     image:
//       'https://images.unsplash.com/photo-1602810317165-c11629031515?auto=format&fit=crop&w=800&q=80',
//   };

//   return (
//     <ScrollView
//       style={[styles.container, {backgroundColor: theme.colors.background}]}>
//       <Text style={[styles.title, {color: theme.colors.primary}]}>Explore</Text>

//       <Text style={[styles.sectionTitle, {color: theme.colors.primary}]}>
//         Style Prompt
//       </Text>
//       <View style={styles.promptRow}>
//         <TextInput
//           style={[
//             styles.input,
//             {
//               color: theme.colors.foreground2,
//               borderColor: theme.colors.surface,
//             },
//           ]}
//           placeholder="What's the vibe today?"
//           placeholderTextColor="#999"
//           value={query}
//           onChangeText={setQuery}
//         />
//         <Pressable
//           style={styles.promptButton}
//           onPressIn={() => {
//             setQuery('');
//             startListening();
//           }}
//           onPressOut={stopListening}
//           android_ripple={{color: '#555'}}>
//           <MaterialIcons
//             name={isRecording ? 'hearing' : 'mic'}
//             size={22}
//             color="#fff"
//           />
//         </Pressable>
//       </View>

//       <ScrollView
//         horizontal
//         showsHorizontalScrollIndicator={false}
//         style={styles.carousel}>
//         {featuredLooks.map(look => (
//           <TouchableOpacity
//             key={look.id}
//             style={[
//               styles.aiCard,
//               {backgroundColor: theme.colors.cardBackground},
//             ]}>
//             <Image
//               source={{uri: look.uri}}
//               style={styles.image}
//               onError={e =>
//                 console.log(
//                   `❌ Failed to load image for ${look.title}`,
//                   e.nativeEvent.error,
//                 )
//               }
//             />
//             <Text style={[styles.cardTitle, {color: theme.colors.foreground}]}>
//               {look.title}
//             </Text>
//           </TouchableOpacity>
//         ))}
//       </ScrollView>

//       <Text style={[styles.sectionTitle, {color: theme.colors.primary}]}>
//         AI Suggests
//       </Text>
//       <View
//         style={[styles.aiCard, {backgroundColor: theme.colors.cardBackground}]}>
//         <Text style={[styles.suggestionText, {color: theme.colors.foreground}]}>
//           Pair your navy chinos with white sneakers and a denim overshirt.
//           Missing something?
//         </Text>
//         <Image
//           source={{uri: missingItemSuggestion.image}}
//           style={styles.suggestedImage}
//         />
//         <Text style={[styles.missingItem, {color: theme.colors.primary}]}>
//           Suggested: {missingItemSuggestion.name}
//         </Text>
//         <Text style={[styles.price, {color: theme.colors.foreground}]}>
//           {missingItemSuggestion.price}
//         </Text>
//         <TouchableOpacity
//           onPress={() => Linking.openURL(missingItemSuggestion.link)}>
//           <Text
//             style={{
//               color: theme.colors.foreground,
//               textDecorationLine: 'underline',
//             }}>
//             View Item
//           </Text>
//         </TouchableOpacity>
//       </View>

//       <Text style={[styles.sectionTitle, {color: theme.colors.primary}]}>
//         Style Inspiration
//       </Text>
//       <ScrollView
//         horizontal
//         showsHorizontalScrollIndicator={false}
//         style={{paddingLeft: 20, marginBottom: 32}}>
//         {mockClothingItems.slice(0, 15).map(item => (
//           <View
//             key={item.id}
//             style={[
//               styles.inspoCard,
//               {backgroundColor: theme.colors.cardBackground},
//             ]}>
//             <Image source={{uri: item.image}} style={styles.inspoImage} />
//             <Text
//               style={[styles.inspoText, {color: theme.colors.foreground}]}
//               numberOfLines={1}>
//               {item.name}
//             </Text>
//           </View>
//         ))}
//       </ScrollView>

//       <Text style={[styles.sectionTitle, {color: theme.colors.primary}]}>
//         Trend Lookout
//       </Text>
//       {loading ? (
//         <ActivityIndicator
//           size="large"
//           color={theme.colors.primary}
//           style={{marginTop: 24}}
//         />
//       ) : (
//         <View style={styles.gridContainer}>
//           {trends.map(trend => (
//             <TouchableOpacity
//               key={trend.id}
//               style={[
//                 styles.gridCard,
//                 {backgroundColor: theme.colors.cardBackground},
//               ]}
//               onPress={() => setWebUrl(trend.link)}>
//               <Image source={{uri: trend.image}} style={styles.gridImage} />
//               <Text style={[styles.gridTitle, {color: theme.colors.primary}]}>
//                 {trend.title}
//               </Text>
//               <Text
//                 style={[styles.gridSource, {color: theme.colors.accent}]}
//                 numberOfLines={1}>
//                 {trend.source}
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </View>
//       )}

//       <Modal visible={!!webUrl} animationType="slide" transparent>
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContent}>
//             <View style={styles.webHeader}>
//               <TouchableOpacity onPress={() => setWebUrl(null)}>
//                 <Text style={styles.closeText}>Close</Text>
//               </TouchableOpacity>
//             </View>
//             {webUrl && (
//               <WebView
//                 source={{uri: webUrl}}
//                 style={{flex: 1}}
//                 startInLoadingState
//                 renderLoading={() => (
//                   <ActivityIndicator
//                     size="large"
//                     color={theme.colors.primary}
//                     style={{marginTop: 48}}
//                   />
//                 )}
//               />
//             )}
//           </View>
//         </View>
//       </Modal>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     paddingTop: 12,
//     paddingBottom: 32,
//   },
//   title: {
//     fontSize: 32,
//     fontWeight: '700',
//     paddingHorizontal: 24,
//     marginBottom: 16,
//     letterSpacing: -0.5,
//   },
//   sectionTitle: {
//     fontSize: 20,
//     fontWeight: '600',
//     paddingHorizontal: 24,
//     marginBottom: 12,
//     marginTop: 24,
//     letterSpacing: -0.2,
//   },
//   carousel: {
//     paddingLeft: 24,
//     paddingBottom: 0,
//   },
//   aiCard: {
//     marginHorizontal: 8,
//     padding: 18,
//     backgroundColor: '#f2f2f7',
//     borderRadius: 20,
//     marginBottom: 28,
//   },
//   image: {
//     width: 180,
//     height: 160,
//     borderRadius: 16,
//     backgroundColor: '#eaeaea',
//   },
//   cardTitle: {
//     paddingTop: 12,
//     fontSize: 16,
//     fontWeight: '500',
//     textAlign: 'center',
//     color: '#333',
//   },
//   suggestionText: {
//     fontSize: 15,
//     fontStyle: 'italic',
//     marginBottom: 14,
//     lineHeight: 22,
//   },
//   suggestedImage: {
//     width: '100%',
//     height: 180,
//     borderRadius: 18,
//     marginBottom: 12,
//   },
//   missingItem: {
//     fontSize: 17,
//     fontWeight: '600',
//     marginBottom: 4,
//   },
//   price: {
//     fontSize: 15,
//     color: '#666',
//     marginBottom: 8,
//   },
//   promptRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 24,
//     marginBottom: 40,
//   },
//   input: {
//     flex: 1,
//     borderWidth: 1,
//     borderRadius: 16,
//     paddingHorizontal: 16,
//     height: 48,
//     marginRight: 12,
//     borderColor: '#ccc',
//     backgroundColor: '#fff',
//     fontSize: 15,
//   },
//   promptButton: {
//     backgroundColor: '#000',
//     padding: 14,
//     borderRadius: 16,
//   },
//   gridContainer: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     justifyContent: 'space-between',
//     paddingHorizontal: 24,
//     gap: 16,
//   },
//   gridCard: {
//     width: '47%',
//     marginBottom: 20,
//     borderRadius: 20,
//     overflow: 'hidden',
//     padding: 12,
//     backgroundColor: '#f9f9fb',
//     shadowColor: '#000',
//     shadowOpacity: 0.03,
//     shadowRadius: 6,
//     elevation: 1,
//   },
//   gridImage: {
//     width: '100%',
//     height: 120,
//     borderRadius: 16,
//     marginBottom: 10,
//   },
//   gridTitle: {
//     fontSize: 15,
//     fontWeight: '600',
//     marginBottom: 2,
//   },
//   gridSource: {
//     fontSize: 13,
//     fontStyle: 'italic',
//     color: '#777',
//   },
//   inspoCard: {
//     width: 120,
//     marginRight: 16,
//     borderRadius: 18,
//     padding: 10,
//     alignItems: 'center',
//     backgroundColor: '#f9f9fb',
//     shadowColor: '#000',
//     shadowOpacity: 0.03,
//     shadowRadius: 4,
//     elevation: 1,
//   },
//   inspoImage: {
//     width: 100,
//     height: 100,
//     borderRadius: 12,
//     marginBottom: 8,
//     backgroundColor: '#eaeaea',
//   },
//   inspoText: {
//     fontSize: 13,
//     fontWeight: '500',
//     textAlign: 'center',
//     color: '#333',
//   },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.9)',
//     paddingTop: 64,
//   },
//   modalContent: {
//     flex: 1,
//     backgroundColor: '#000',
//     borderTopLeftRadius: 24,
//     borderTopRightRadius: 24,
//     overflow: 'hidden',
//   },
//   webHeader: {
//     paddingHorizontal: 20,
//     paddingVertical: 14,
//     backgroundColor: '#000',
//     borderBottomWidth: 0.5,
//     borderColor: '#222',
//   },
//   closeText: {
//     color: '#fff',
//     fontSize: 17,
//     fontWeight: '500',
//     letterSpacing: 0.5,
//   },
// });
