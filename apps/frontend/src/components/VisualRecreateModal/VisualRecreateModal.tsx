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
const SMALL_CARD_WIDTH = (screenWidth - 70) / 3;

interface Product {
  title: string;
  image: string | null;
  link: string;
  price: string | null;
  brand: string;
  source: string;
  rating?: number | null;
  reviews?: number | null;
}

interface OutfitPiece {
  category: string;
  item: string;
  color: string;
  material?: string;
  style?: string;
  searchQuery?: string;
  products: Product[];
}

interface VisualRecreateModalProps {
  visible: boolean;
  onClose: () => void;
  pieces?: OutfitPiece[];
  results?: any[]; // Legacy support
  source_image?: string;
}

// Category icons mapping
const CATEGORY_ICONS: Record<string, string> = {
  Top: 'checkroom',
  Bottom: 'straighten',
  Outerwear: 'ac-unit',
  Shoes: 'directions-walk',
  Accessories: 'watch',
  Hat: 'face',
  Bag: 'shopping-bag',
  Jewelry: 'diamond',
  default: 'style',
};

function ProductCard({
  item,
  theme,
  onPress,
  small = false,
}: {
  item: Product;
  theme: any;
  onPress: (url: string) => void;
  small?: boolean;
}) {
  const cardWidth = small ? SMALL_CARD_WIDTH : CARD_WIDTH;

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
        width: cardWidth,
        marginBottom: 12,
        marginRight: small ? 8 : 0,
        backgroundColor: theme.colors.surface2,
        borderRadius: tokens.borderRadius.lg,
        overflow: 'hidden',
      }}>
      {item.image ? (
        <Image
          source={{uri: item.image}}
          style={{width: cardWidth, height: cardWidth * (small ? 1 : 1.2)}}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: cardWidth,
            height: cardWidth * (small ? 1 : 1.2),
            backgroundColor: theme.colors.surface3,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <MaterialIcons
            name="shopping-bag"
            size={small ? 24 : 40}
            color={theme.colors.muted}
          />
        </View>
      )}
      <View style={{padding: small ? 8 : 10}}>
        <Text
          numberOfLines={2}
          style={{
            color: theme.colors.foreground,
            fontSize: small ? 10 : 12,
            fontWeight: '500',
            lineHeight: small ? 14 : 16,
          }}>
          {item.title}
        </Text>
        {item.brand && (
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.muted,
              fontSize: small ? 9 : 11,
              marginTop: 2,
            }}>
            {item.brand}
          </Text>
        )}
        {item.price && (
          <Text
            style={{
              color: theme.colors.primary,
              fontSize: small ? 12 : 14,
              fontWeight: '700',
              marginTop: 4,
            }}>
            {item.price}
          </Text>
        )}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 6,
          }}>
          <MaterialIcons
            name="shopping-cart"
            size={small ? 10 : 14}
            color={theme.colors.primary}
          />
          <Text
            style={{
              color: theme.colors.primary,
              fontSize: small ? 9 : 11,
              fontWeight: '600',
              marginLeft: 3,
            }}>
            Shop
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function PieceSection({
  piece,
  theme,
  onShopPress,
}: {
  piece: OutfitPiece;
  theme: any;
  onShopPress: (url: string) => void;
}) {
  const iconName = CATEGORY_ICONS[piece.category] || CATEGORY_ICONS.default;

  return (
    <View style={{marginBottom: 24}}>
      {/* Section Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 12,
          paddingBottom: 8,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.surface2,
        }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: theme.colors.primary + '20',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
          }}>
          <MaterialIcons name={iconName} size={20} color={theme.colors.primary} />
        </View>
        <View style={{flex: 1}}>
          <Text
            style={{
              color: theme.colors.foreground,
              fontSize: 16,
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>
            {piece.category}
          </Text>
          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 12,
              marginTop: 2,
            }}>
            {piece.color} {piece.item}
            {piece.material ? ` • ${piece.material}` : ''}
          </Text>
        </View>
      </View>

      {/* Products Grid */}
      {piece.products && piece.products.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingRight: 10}}>
          {piece.products.map((product, idx) => (
            <ProductCard
              key={`${piece.category}-product-${idx}`}
              item={product}
              theme={theme}
              onPress={onShopPress}
              small
            />
          ))}
        </ScrollView>
      ) : (
        <View
          style={{
            padding: 20,
            backgroundColor: theme.colors.surface2,
            borderRadius: tokens.borderRadius.md,
            alignItems: 'center',
          }}>
          <MaterialIcons name="search-off" size={24} color={theme.colors.muted} />
          <Text
            style={{
              color: theme.colors.muted,
              fontSize: 12,
              marginTop: 8,
              textAlign: 'center',
            }}>
            No matches found for this piece
          </Text>
        </View>
      )}
    </View>
  );
}

export default function VisualRecreateModal({
  visible,
  onClose,
  pieces,
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

  // Calculate total products found
  const totalProducts = pieces?.reduce((sum, p) => sum + (p.products?.length || 0), 0) || 0;

  // Legacy mode: if we have results but no pieces, show flat grid
  const isLegacyMode = !pieces && results && results.length > 0;

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
            <View>
              <Text style={[globalStyles.sectionTitle, {marginTop: 0}]}>
                RECREATE THIS LOOK
              </Text>
              {pieces && pieces.length > 0 && (
                <Text
                  style={{
                    color: theme.colors.muted,
                    fontSize: 12,
                    marginTop: 4,
                  }}>
                  {pieces.length} pieces identified • {totalProducts} products found
                </Text>
              )}
            </View>
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
              <View style={{marginBottom: 24, alignItems: 'center'}}>
                <Image
                  source={{uri: source_image}}
                  style={{
                    width: screenWidth * 0.35,
                    height: screenWidth * 0.45,
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
                  Your inspiration look
                </Text>
              </View>
            )}

            {/* Pieces by Category */}
            {pieces && pieces.length > 0 ? (
              pieces.map((piece, idx) => (
                <PieceSection
                  key={`piece-${idx}`}
                  piece={piece}
                  theme={theme}
                  onShopPress={handleShopPress}
                />
              ))
            ) : isLegacyMode ? (
              // Legacy flat grid for old results format
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
                  {results.map((item: any, idx: number) => (
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
                  No outfit pieces identified.{'\n'}Try a different image.
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
