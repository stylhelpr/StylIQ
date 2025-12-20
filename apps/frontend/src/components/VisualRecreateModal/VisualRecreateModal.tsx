/* eslint-disable react-native/no-inline-styles */
import React, {useState, useCallback} from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {tokens} from '../../styles/tokens/tokens';
import {useAppTheme} from '../../context/ThemeContext';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import IntegratedShopOverlay from '../ShopModal/IntegratedShopOverlay';

const {width: screenWidth} = Dimensions.get('window');
const CARD_WIDTH = (screenWidth - 60) / 2;

interface GoogleLensResult {
  title: string;
  image: string;
  link: string;
  brand: string | null;
  price: string | null;
  source: string | null;
}

interface VisualRecreateModalProps {
  visible: boolean;
  onClose: () => void;
  results: GoogleLensResult[];
  source_image?: string;
}

function ProductCard({
  item,
  theme,
  onPress,
}: {
  item: GoogleLensResult;
  theme: any;
  onPress: (url: string) => void;
}) {
  const handlePress = useCallback(() => {
    if (item.link) {
      ReactNativeHapticFeedback.trigger('impactMedium');
      onPress(item.link);
    }
  }, [item.link, onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      style={{
        width: CARD_WIDTH,
        marginBottom: 16,
        backgroundColor: theme.colors.surface2,
        borderRadius: tokens.borderRadius.lg,
        overflow: 'hidden',
      }}>
      {item.image ? (
        <Image
          source={{uri: item.image}}
          style={{width: CARD_WIDTH, height: CARD_WIDTH * 1.2}}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: CARD_WIDTH,
            height: CARD_WIDTH * 1.2,
            backgroundColor: theme.colors.surface3,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <MaterialIcons
            name="shopping-bag"
            size={40}
            color={theme.colors.muted}
          />
        </View>
      )}
      <View style={{padding: 10}}>
        <Text
          numberOfLines={2}
          style={{
            color: theme.colors.foreground,
            fontSize: 12,
            fontWeight: '500',
            lineHeight: 16,
          }}>
          {item.title}
        </Text>
        {item.brand && (
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.muted,
              fontSize: 11,
              marginTop: 4,
            }}>
            {item.brand}
          </Text>
        )}
        {item.price && (
          <Text
            style={{
              color: theme.colors.primary,
              fontSize: 14,
              fontWeight: '700',
              marginTop: 6,
            }}>
            {item.price}
          </Text>
        )}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 8,
          }}>
          <MaterialIcons
            name="shopping-cart"
            size={14}
            color={theme.colors.primary}
          />
          <Text
            style={{
              color: theme.colors.primary,
              fontSize: 11,
              fontWeight: '600',
              marginLeft: 4,
            }}>
            Shop Now
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function VisualRecreateModal({
  visible,
  onClose,
  results,
  source_image,
}: VisualRecreateModalProps) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const [shopUrl, setShopUrl] = useState<string | null>(null);

  const handleShopPress = useCallback((url: string) => {
    setShopUrl(url);
  }, []);

  const handleClose = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactLight');
    onClose();
  }, [onClose]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        }}>
        <View
          style={{
            width: '100%',
            height: '92%',
            backgroundColor: theme.colors.background,
            borderTopLeftRadius: tokens.borderRadius['2xl'],
            borderTopRightRadius: tokens.borderRadius['2xl'],
            overflow: 'hidden',
          }}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.surface2,
            }}>
            <Text style={[globalStyles.sectionTitle, {marginTop: 0}]}>
              SHOP THE LOOK
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              style={{
                backgroundColor: theme.colors.foreground,
                borderRadius: 20,
                padding: 6,
              }}>
              <MaterialIcons
                name="close"
                size={20}
                color={theme.colors.background}
              />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 40,
            }}>
            {/* Source Image Preview */}
            {source_image && (
              <View style={{marginBottom: 20, alignItems: 'center'}}>
                <Image
                  source={{uri: source_image}}
                  style={{
                    width: screenWidth * 0.4,
                    height: screenWidth * 0.5,
                    borderRadius: tokens.borderRadius.lg,
                  }}
                  resizeMode="cover"
                />
                <Text
                  style={{
                    color: theme.colors.muted,
                    fontSize: 11,
                    marginTop: 8,
                    textAlign: 'center',
                  }}>
                  Your saved look
                </Text>
              </View>
            )}

            {/* Results Grid */}
            {results && results.length > 0 ? (
              <>
                <Text
                  style={{
                    color: theme.colors.foreground,
                    fontSize: 14,
                    fontWeight: '600',
                    marginBottom: 16,
                  }}>
                  {results.length} similar items found
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                  }}>
                  {results.map((item, idx) => (
                    <ProductCard
                      key={`result-${idx}`}
                      item={item}
                      theme={theme}
                      onPress={handleShopPress}
                    />
                  ))}
                </View>
              </>
            ) : (
              <View style={{alignItems: 'center', paddingTop: 40}}>
                <MaterialIcons
                  name="search-off"
                  size={48}
                  color={theme.colors.muted}
                />
                <Text
                  style={{
                    color: theme.colors.muted,
                    fontSize: 14,
                    marginTop: 12,
                    textAlign: 'center',
                  }}>
                  No matching products found.{'\n'}Try a different image.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Shop Overlay WebView */}
      <IntegratedShopOverlay
        visible={!!shopUrl}
        url={shopUrl}
        onClose={() => setShopUrl(null)}
      />
    </Modal>
  );
}
