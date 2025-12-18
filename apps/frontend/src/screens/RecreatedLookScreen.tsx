/* eslint-disable react-native/no-inline-styles */
import React, {useRef, useState, memo, useCallback} from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import {WebView} from 'react-native-webview';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {tokens} from '../styles/tokens/tokens';
import {useAppTheme} from '../context/ThemeContext';
import {useGlobalStyles} from '../styles/useGlobalStyles';
import {useSimilarLooks} from '../hooks/useSimilarLooks';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {moderateScale} from '../utils/scale';

const {width} = Dimensions.get('window');
const CARD_WIDTH = width / 2 - tokens.spacing.md * 1.5;

type WardrobeItem = {
  id: string;
  name: string;
  image?: string;
  brand?: string;
  price?: string;
  source?: string;
  shopUrl?: string;
};

type Props = {
  route: {
    params: {
      data: {
        owned?: WardrobeItem[];
        recommendations?: WardrobeItem[];
        outfit?: WardrobeItem[];
      };
    };
  };
  navigation: any;
};

// Memoized card component to prevent re-renders
const ItemCard = memo(function ItemCard({
  item,
  theme,
  isRecommended,
  onSimilarPress,
  onShopPress,
}: {
  item: WardrobeItem;
  theme: any;
  isRecommended: boolean;
  onSimilarPress: (image?: string) => void;
  onShopPress: (url?: string) => void;
}) {
  const handleSimilarPress = useCallback(() => {
    onSimilarPress(item.image);
  }, [item.image, onSimilarPress]);

  const handleShopPress = useCallback(() => {
    onShopPress(item.shopUrl);
  }, [item.shopUrl, onShopPress]);

  return (
    <View
      style={{
        width: '49.5%',
        marginBottom: tokens.spacing.nano,
        backgroundColor: theme.colors.surface,
        overflow: 'hidden',
      }}>
      {/* Product Image */}
      <View
        style={{
          width: '100%',
          aspectRatio: 3 / 4,
          backgroundColor: theme.colors.surface,
          overflow: 'hidden',
        }}>
        <Image
          source={{
            uri:
              item.image ||
              'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
          }}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
          }}
          resizeMode="cover"
        />

        {/* Similar Looks button overlay */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleSimilarPress}
          style={{
            position: 'absolute',
            bottom: 10,
            alignSelf: 'center',
            backgroundColor: 'rgba(255,255,255,0.75)',
            borderRadius: tokens.borderRadius.sm,
            borderWidth: tokens.borderWidth.hairline,
            borderColor: 'black',
            paddingVertical: 8,
            paddingHorizontal: 14,
          }}>
          <Text
            style={{
              color: 'black',
              fontWeight: '700',
              fontSize: 13,
              letterSpacing: 0.2,
            }}>
            Similar Items
          </Text>
        </TouchableOpacity>
      </View>

      {/* Card Body */}
      <View
        style={{
          paddingHorizontal: tokens.spacing.xsm,
          paddingVertical: tokens.spacing.xxs,
        }}>
        <Text
          numberOfLines={1}
          style={{
            color: theme.colors.foreground,
            fontWeight: '400',
            fontSize: 13,
          }}>
          {item.name}
        </Text>

        {item.brand && (
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.foreground,
              opacity: 0.7,
              fontSize: 11,
              marginTop: 6,
            }}>
            {item.brand}
          </Text>
        )}

        {item.price && (
          <Text
            style={{
              color: theme.colors.foreground,
              fontWeight: '700',
              fontSize: 13,
              marginTop: 6,
            }}>
            {item.price}
          </Text>
        )}

        {/* Shop CTA */}
        {isRecommended && (
          <TouchableOpacity
            onPress={handleShopPress}
            activeOpacity={0.85}
            style={{
              marginTop: 10,
              backgroundColor: theme.colors.surface2,
              borderRadius: tokens.borderRadius.lg,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 6,
              borderWidth: tokens.borderWidth.hairline,
              borderColor: theme.colors.surfaceBorder,
            }}>
            <Text
              style={{
                color: theme.colors.foreground,
                fontWeight: '600',
                fontSize: 13,
              }}>
              {item.shopUrl ? 'Shop Similar →' : 'View Details'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

// Memoized similar item card
const SimilarItemCard = memo(function SimilarItemCard({
  look,
  theme,
  onPress,
}: {
  look: any;
  theme: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{
        width: '49.5%',
        marginBottom: tokens.spacing.nano,
        backgroundColor: theme.colors.surface,
        overflow: 'hidden',
      }}>
      <View
        style={{
          width: '100%',
          aspectRatio: 3 / 4,
          backgroundColor: theme.colors.surface,
          overflow: 'hidden',
        }}>
        <Image
          source={{
            uri:
              look.image ||
              'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg',
          }}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
          }}
          resizeMode="cover"
        />

        <View
          style={{
            position: 'absolute',
            bottom: 10,
            alignSelf: 'center',
            backgroundColor: 'rgba(255,255,255,0.75)',
            borderRadius: tokens.borderRadius.sm,
            borderWidth: tokens.borderWidth.md,
            borderColor: 'black',
            paddingVertical: 8,
            paddingHorizontal: 14,
          }}>
          <Text
            style={{
              color: 'black',
              fontWeight: '700',
              fontSize: 13,
              letterSpacing: 0.2,
            }}>
            Click to Buy
          </Text>
        </View>
      </View>

      <View style={{padding: 8}}>
        <Text
          numberOfLines={1}
          style={{
            color: theme.colors.foreground,
            fontWeight: '400',
            fontSize: 13,
            textTransform: 'uppercase',
          }}>
          {look.title || 'Similar look'}
        </Text>

        {look.brand ? (
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.foreground,
              opacity: 0.7,
              marginTop: 6,
              fontSize: 11,
              fontWeight: '500',
            }}>
            {look.brand}
          </Text>
        ) : null}

        {look.price ? (
          <Text
            numberOfLines={1}
            style={{
              fontWeight: '500',
              fontSize: 12,
              marginTop: 6,
              color: theme.colors.foreground,
            }}>
            {look.price}
          </Text>
        ) : (
          <Text style={{opacity: 0, fontSize: 13, fontWeight: '700'}}>
            placeholder
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

export default function RecreatedLookScreen({route, navigation}: Props) {
  const insets = useSafeAreaInsets();
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const {outfit = [], recommendations = []} = route.params?.data || {};
  const owned = outfit.length ? outfit : route.params?.data?.owned || [];
  const {fetchSimilar, data, loading} = useSimilarLooks();

  const [shopUrl, setShopUrl] = useState<string | null>(null);
  const [showSimilarModal, setShowSimilarModal] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const translateY = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);

  const closeAllModals = useCallback(() => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setShowSimilarModal(false);
    setShopUrl(null);
  }, []);

  const handleBack = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    ReactNativeHapticFeedback.trigger('impactLight');

    Animated.timing(translateY, {
      toValue: 1000,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      navigation.goBack();
    });
  }, [navigation, translateY]);

  // PanResponder for swipe-down to close
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8,
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 100 || g.vy > 0.3) {
          handleBack();
        }
      },
    }),
  ).current;

  const openShopModal = useCallback((url?: string) => {
    if (!url) return;
    ReactNativeHapticFeedback.trigger('impactLight');
    setShowSimilarModal(false);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => setShopUrl(url), 200);
  }, []);

  const closeShopModal = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactLight');
    setShopUrl(null);
  }, []);

  const handleSimilarPress = useCallback(
    (image?: string) => {
      closeAllModals();
      if (image) {
        fetchSimilar(image);
      }
      setShowSimilarModal(true);
    },
    [closeAllModals, fetchSimilar],
  );

  const handleSimilarItemPress = useCallback(
    (link: string) => {
      setShowSimilarModal(false);
      setTimeout(() => openShopModal(link), 200);
    },
    [openShopModal],
  );

  return (
    <Modal visible animationType="slide" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 1)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: tokens.spacing.sm,
        }}>
        <Animated.View
          style={{
            width: '100%',
            maxWidth: 700,
            height: '90%',
            transform: [{translateY}],
          }}>
          <View
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: theme.colors.background,
              borderRadius: tokens.borderRadius['2xl'],
              overflow: 'hidden',
              paddingHorizontal: moderateScale(tokens.spacing.md1),
            }}>
            {/* Swipe gesture zone */}
            <View
              {...panResponder.panHandlers}
              onStartShouldSetResponder={() => true}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 80,
                zIndex: 10,
                backgroundColor: 'transparent',
              }}
            />

            {/* Close */}
            <TouchableOpacity
              onPress={handleBack}
              style={{
                position: 'absolute',
                top: 11,
                right: 18,
                zIndex: 10,
                backgroundColor: theme.colors.foreground,
                borderRadius: 24,
                padding: 6,
              }}>
              <MaterialIcons
                name="close"
                size={22}
                color={theme.colors.background}
              />
            </TouchableOpacity>

            {/* Main Scroll */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={true}
              contentContainerStyle={[
                globalStyles.centeredSection,
                {paddingTop: 20, paddingBottom: 100},
              ]}>
              <Text
                style={[
                  globalStyles.sectionTitle,
                  {marginBottom: 20, textAlign: 'left'},
                ]}>
                RECREATED LOOK
              </Text>

              {/* Owned */}
              {owned.length > 0 && (
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                  }}>
                  {owned.map((item, idx) => (
                    <ItemCard
                      key={`${item.id}-${idx}`}
                      item={item}
                      theme={theme}
                      isRecommended={false}
                      onSimilarPress={handleSimilarPress}
                      onShopPress={openShopModal}
                    />
                  ))}
                </View>
              )}

              {/* Recommended */}
              {recommendations.length > 0 && (
                <>
                  <Text
                    style={[
                      globalStyles.sectionTitle,
                      {fontSize: 20, marginTop: 30, marginBottom: 10},
                    ]}>
                    Recommended to Add
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                    }}>
                    {recommendations.map((item, idx) => (
                      <ItemCard
                        key={`rec-${item.id}-${idx}`}
                        item={item}
                        theme={theme}
                        isRecommended={true}
                        onSimilarPress={handleSimilarPress}
                        onShopPress={openShopModal}
                      />
                    ))}
                  </View>
                </>
              )}

              {/* Empty */}
              {owned.length === 0 && recommendations.length === 0 && (
                <View style={{alignItems: 'center', marginTop: 50}}>
                  <Text
                    style={{
                      color: theme.colors.foreground,
                      opacity: 0.7,
                      fontSize: 16,
                    }}>
                    No outfit data found. Try recreating another look.
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* SHOP MODAL */}
            <Modal
              visible={!!shopUrl}
              animationType="slide"
              transparent
              onRequestClose={closeShopModal}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: tokens.spacing.sm,
                }}>
                <View
                  style={{
                    width: '100%',
                    maxWidth: 700,
                    height: '90%',
                    borderRadius: tokens.borderRadius['2xl'],
                    overflow: 'hidden',
                    backgroundColor: theme.colors.surface,
                  }}>
                  {/* Close */}
                  <TouchableOpacity
                    onPress={closeShopModal}
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 20,
                      zIndex: 999,
                      backgroundColor: theme.colors.foreground,
                      borderRadius: 24,
                      padding: 6,
                    }}>
                    <MaterialIcons
                      name="close"
                      size={22}
                      color={theme.colors.background}
                    />
                  </TouchableOpacity>

                  {shopUrl ? (
                    <WebView
                      source={{uri: shopUrl}}
                      startInLoadingState
                      style={{flex: 1, backgroundColor: theme.colors.surface}}
                    />
                  ) : (
                    <View
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}>
                      <ActivityIndicator
                        size="large"
                        color={theme.colors.primary}
                      />
                    </View>
                  )}
                </View>
              </View>
            </Modal>

            {/* SIMILAR LOOKS MODAL */}
            <Modal visible={showSimilarModal} animationType="slide" transparent>
              <View
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(0,0,0,0.1)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingVertical: tokens.spacing.sm,
                }}>
                <View
                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    height: '90%',
                    borderRadius: tokens.borderRadius['2xl'],
                    overflow: 'hidden',
                    backgroundColor: theme.colors.background,
                    paddingVertical: tokens.spacing.md,
                    paddingHorizontal: moderateScale(tokens.spacing.md1),
                  }}>
                  {/* Close */}
                  <TouchableOpacity
                    onPress={closeAllModals}
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 20,
                      zIndex: 999,
                      backgroundColor: theme.colors.foreground,
                      borderRadius: 24,
                      padding: 6,
                    }}>
                    <MaterialIcons
                      name="close"
                      size={22}
                      color={theme.colors.background}
                    />
                  </TouchableOpacity>

                  {loading ? (
                    <View
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}>
                      <ActivityIndicator
                        size="large"
                        color={theme.colors.primary}
                      />
                      <Text
                        style={{
                          color: theme.colors.foreground,
                          marginTop: 12,
                          opacity: 0.7,
                        }}>
                        Finding similar looks...
                      </Text>
                    </View>
                  ) : (
                    <ScrollView
                      showsVerticalScrollIndicator={false}
                      removeClippedSubviews={true}>
                      <Text
                        style={[
                          globalStyles.sectionTitle,
                          {fontSize: 20, marginBottom: 20},
                        ]}>
                        SIMILAR ITEMS
                      </Text>

                      {data.length === 0 ? (
                        <View style={{alignItems: 'center', marginTop: 40}}>
                          <Text
                            style={{
                              color: theme.colors.foreground,
                              opacity: 0.7,
                            }}>
                            No similar items found.
                          </Text>
                        </View>
                      ) : (
                        <View
                          style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            justifyContent: 'space-between',
                            backgroundColor: theme.colors.background,
                          }}>
                          {data.map((look, idx) => (
                            <SimilarItemCard
                              key={idx}
                              look={look}
                              theme={theme}
                              onPress={() => handleSimilarItemPress(look.link)}
                            />
                          ))}
                        </View>
                      )}
                    </ScrollView>
                  )}
                </View>
              </View>
            </Modal>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
