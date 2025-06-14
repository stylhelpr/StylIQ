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
import AppleTouchFeedback from '../components/AppleTouchFeedback/AppleTouchFeedback';

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

      {/* <Text style={[styles.sectionTitle, {color: theme.colors.primary}]}>
        Style Prompt
      </Text> */}
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
          <AppleTouchFeedback
            key={look.id}
            onPress={() => {
              /* add behavior if needed */
            }}
            style={styles.card}
            hapticStyle="impactLight">
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
          </AppleTouchFeedback>
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
        <AppleTouchFeedback
          onPress={() =>
            setWebUrl(
              'https://www.ssense.com/en-us/men/product/acne-studios/green-bomber-jacket/1234567',
            )
          }
          hapticStyle="impactLight">
          <Text
            style={{
              color: theme.colors.foreground,
              textDecorationLine: 'underline',
            }}>
            View Item
          </Text>
        </AppleTouchFeedback>
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
            <AppleTouchFeedback
              key={trend.id}
              onPress={() => setWebUrl(trend.link)}
              style={styles.gridCard}
              hapticStyle="impactLight">
              <Image source={{uri: trend.image}} style={styles.gridImage} />
              <View style={styles.gridLabelContainer}>
                <Text style={styles.gridTitle} numberOfLines={1}>
                  {trend.title}
                </Text>
                <Text style={styles.gridSource} numberOfLines={1}>
                  {trend.source}
                </Text>
              </View>
            </AppleTouchFeedback>
          ))}
        </View>
      )}

      <Modal visible={!!webUrl} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.webHeader}>
              <AppleTouchFeedback
                onPress={() => setWebUrl(null)}
                hapticStyle="impactLight">
                <Text style={styles.closeText}>Close</Text>
              </AppleTouchFeedback>
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

//////////////

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
//   Dimensions,
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

// const ITEM_MARGIN = 9.5;
// const MIN_ITEM_WIDTH = 160;
// const screenWidth = Dimensions.get('window').width;

// const numColumns =
//   Math.floor(screenWidth / (MIN_ITEM_WIDTH + ITEM_MARGIN * 2)) || 1;
// const imageSize =
//   (screenWidth - ITEM_MARGIN * (numColumns * 2 + 1)) / numColumns;

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
//     header: {
//       fontSize: 28,
//       fontWeight: '600',
//       marginBottom: 8,
//       color: theme.colors.primary,
//       paddingHorizontal: 16,
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
//       marginBottom: 12,
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
//       marginRight: 8,
//       backgroundColor: theme.colors.surface,
//       borderRadius: 16,
//       marginBottom: 20,
//     },
//     AISuggestcard: {
//       marginHorizontal: 16,
//       padding: 12,
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
//       marginBottom: 10,
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
//       paddingHorizontal: 20,
//     },
//     gridCard: {
//       width: imageSize,
//       marginBottom: ITEM_MARGIN * 0.8,
//       borderRadius: 16,
//       backgroundColor: theme.colors.surface,
//       overflow: 'hidden',
//     },
//     gridImage: {
//       width: '100%',
//       height: imageSize,
//       borderTopLeftRadius: 16,
//       borderTopRightRadius: 16,
//     },
//     gridTitle: {
//       fontSize: 14,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//     },
//     gridSource: {
//       fontSize: 12,
//       color: '#777',
//       paddingHorizontal: 8,
//       paddingBottom: 8,
//     },
//     gridLabelContainer: {
//       padding: 8,
//     },
//     inspoCard: {
//       marginBottom: 6,
//       marginRight: ITEM_MARGIN * 2,
//       borderRadius: 16,
//       alignItems: 'center',
//       backgroundColor: theme.colors.surface,
//       shadowColor: '#000',
//       shadowOpacity: 0.03,
//       shadowRadius: 4,
//       elevation: 1,
//     },
//     inspoImage: {
//       width: 120,
//       height: 120,
//       borderRadius: 14,
//       marginBottom: 6,
//       backgroundColor: theme.colors.surface,
//     },
//     inspoText: {
//       fontSize: 12,
//       fontWeight: '500',
//       color: theme.colors.foreground,
//       paddingHorizontal: 4,
//       paddingVertical: 2,
//       paddingBottom: 8,
//       textAlign: 'center',
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
//       <Text style={[styles.header, {color: theme.colors.primary}]}>
//         Explore
//       </Text>

//       {/* <Text style={[styles.sectionTitle, {color: theme.colors.primary}]}>
//         Style Prompt
//       </Text> */}
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
//         style={{paddingLeft: 20, marginBottom: 12}}>
//         {mockClothingItems.slice(0, 15).map(item => (
//           <View key={item.id} style={[styles.inspoCard]}>
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
//               style={styles.gridCard}
//               onPress={() => setWebUrl(trend.link)}>
//               <Image source={{uri: trend.image}} style={styles.gridImage} />
//               <View style={styles.gridLabelContainer}>
//                 <Text style={styles.gridTitle} numberOfLines={1}>
//                   {trend.title}
//                 </Text>
//                 <Text style={styles.gridSource} numberOfLines={1}>
//                   {trend.source}
//                 </Text>
//               </View>
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
