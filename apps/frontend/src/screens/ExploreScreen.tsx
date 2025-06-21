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
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {tokens} from '../styles/tokens/tokens';
import {VibrancyView} from '@react-native-community/blur';

type TrendArticle = {
  id: string;
  title: string;
  summary: string;
  image: string;
  source: string;
  link: string;
};

const ITEM_MARGIN = 10.5;
const MIN_ITEM_WIDTH = 175;
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
  const globalStyles = useGlobalStyles();
  const [query, setQuery] = useState('');
  const [trends, setTrends] = useState<TrendArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [webUrl, setWebUrl] = useState<string | null>(null);
  const {speech, isRecording, startListening, stopListening} =
    useVoiceControl();

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    card: {
      marginRight: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: tokens.borderRadius.md,
    },
    AISuggestcard: {
      backgroundColor: theme.colors.surface,
      borderRadius: tokens.borderRadius.md,
    },
    suggestedImage: {
      width: '100%',
      height: 160,
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
    },
    gridCard: {
      width: imageSize,
      marginBottom: ITEM_MARGIN * 1.0,
      borderRadius: tokens.borderRadius.md,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
    },
    gridImage: {
      width: '100%',
      height: imageSize,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
    },
    gridTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.foreground,
    },
    gridSource: {
      fontSize: 12,
      color: '#777',
    },
    labelContainer: {
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    inspoCard: {
      marginRight: ITEM_MARGIN * 1,
      borderRadius: tokens.borderRadius.md,
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
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,

      backgroundColor: theme.colors.surface,
    },
    inspoText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.foreground,
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
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      overflow: 'hidden',
    },
    webHeader: {
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
      style={[
        globalStyles.container,
        {backgroundColor: theme.colors.background},
      ]}>
      <View style={globalStyles.sectionTitle}>
        <Text
          style={[
            globalStyles.header,
            {color: theme.colors.primary, marginBottom: 20},
          ]}>
          Explore
        </Text>
      </View>

      {/* <Text style={[globalStyles.sectionTitle, {color: theme.colors.primary}]}>
        Style Prompt
      </Text> */}

      <View style={globalStyles.section}>
        <View style={globalStyles.promptRow}>
          <TextInput
            style={[
              globalStyles.promptInput,
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
      </View>

      <View style={globalStyles.sectionScroll}>
        <Text
          style={[globalStyles.sectionTitle, {color: theme.colors.primary}]}>
          Current Picks
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
                style={globalStyles.image2}
                onError={e =>
                  console.log(
                    `❌ Failed to load image for ${look.title}`,
                    e.nativeEvent.error,
                  )
                }
              />
              <Text style={[globalStyles.labelContainer]}>
                <Text style={[globalStyles.cardLabel, {textAlign: 'center'}]}>
                  {look.title}
                </Text>
              </Text>
            </AppleTouchFeedback>
          ))}
        </ScrollView>
      </View>

      <View style={globalStyles.section}>
        <Text
          style={[[globalStyles.sectionTitle], {color: theme.colors.primary}]}>
          AI Suggests
        </Text>
        <View style={[styles.AISuggestcard]}>
          <View style={[styles.labelContainer]}>
            <Text
              style={[globalStyles.label, {color: theme.colors.foreground}]}>
              Pair your navy chinos with white sneakers and a denim overshirt.
              Missing something?
            </Text>
          </View>
          <Image
            source={{uri: missingItemSuggestion.image}}
            style={styles.suggestedImage}
          />
          <View
            style={[
              styles.labelContainer,
              {
                borderBottomLeftRadius: 12,
                borderBottomRightRadius: 12,
              },
            ]}>
            <Text
              style={[globalStyles.label, {color: theme.colors.foreground}]}>
              Suggested: {missingItemSuggestion.name}
            </Text>

            <Text
              style={[globalStyles.subLabel, {color: theme.colors.foreground}]}>
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
                style={[
                  globalStyles.label,
                  {
                    color: theme.colors.foreground2,
                    textDecorationLine: 'underline',
                    marginBottom: 4,
                  },
                ]}>
                View Item
              </Text>
            </AppleTouchFeedback>
          </View>
        </View>
      </View>

      <View style={globalStyles.sectionScroll}>
        <Text
          style={[globalStyles.sectionTitle, {color: theme.colors.primary}]}>
          Style Inspiration
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {mockClothingItems.slice(0, 15).map(item => (
            <View key={item.id} style={styles.card}>
              <Image source={{uri: item.image}} style={globalStyles.image2} />
              <Text style={[globalStyles.labelContainer]}>
                <Text
                  style={[globalStyles.cardLabel, {textAlign: 'center'}]}
                  numberOfLines={1}>
                  {item.name}
                </Text>
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={globalStyles.section}>
        <Text
          style={[globalStyles.sectionTitle, {color: theme.colors.primary}]}>
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
                <Image
                  source={{uri: trend.image}}
                  style={styles.gridImage}
                  resizeMode="cover"
                />
                <View style={globalStyles.labelContainer}>
                  <Text style={globalStyles.cardLabel} numberOfLines={1}>
                    {trend.title}
                  </Text>
                  <Text style={globalStyles.cardSubLabel} numberOfLines={1}>
                    {trend.source}
                  </Text>
                </View>
              </AppleTouchFeedback>
            ))}
          </View>
        )}
      </View>

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
