/* eslint-disable react-native/no-inline-styles */
import React, {useRef, useLayoutEffect, useState, useCallback} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  PanResponder,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {tokens} from '../../styles/tokens/tokens';
import {useAppTheme} from '../../context/ThemeContext';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {useUUID} from '../../context/UUIDContext';
import {API_BASE_URL} from '../../config/api';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {moderateScale} from '../../utils/scale';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {TooltipBubble} from '../ToolTip/ToolTip1';

const {height} = Dimensions.get('window');

interface SavedProduct {
  id: string;
  product_id: string;
  title: string;
  brand?: string | null;
  price?: number | null;
  price_raw?: string | null;
  image_url: string;
  link: string;
  source?: string | null;
  category?: string | null;
  saved?: boolean;
  saved_at?: string | null;
}

interface SavedRecommendationsModalProps {
  visible: boolean;
  onClose: () => void;
  savedProducts: SavedProduct[];
  onUnsave?: (productId: string) => void;
  onRefresh?: () => void;
  onOpenItem?: (url: string, title?: string) => void;
}

export default function SavedRecommendationsModal({
  visible,
  onClose,
  savedProducts,
  onUnsave,
  onRefresh,
  onOpenItem,
}: SavedRecommendationsModalProps) {
  const userId = useUUID();
  const translateY = useRef(new Animated.Value(0)).current;
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const insets = useSafeAreaInsets();
  const [unsavingId, setUnsavingId] = useState<string | null>(null);

  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: 'transparent',
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingTop: tokens.spacing.sm,
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0, 0, 0, 1)',
    },
    panel: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 20,
      shadowOffset: {width: 0, height: -8},
      elevation: 12,
      alignSelf: 'center',
      paddingHorizontal: moderateScale(tokens.spacing.md1),
    },
    closeIcon: {
      position: 'absolute',
      top: 0,
      right: 18,
      zIndex: 20,
      backgroundColor: 'white',
      borderRadius: 20,
      padding: 6,
    },
    gestureZone: {
      position: 'absolute',
      top: 0,
      height: 45,
      width: '100%',
      zIndex: 2,
      backgroundColor: 'transparent',
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      borderBottomColor: 'rgba(255,255,255,0.08)',
      borderBottomWidth: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.background,
      zIndex: 5,
    },
    title: {
      color: theme.colors.foreground,
      fontWeight: '700',
      fontSize: 17,
      flex: 1,
      textAlign: 'left',
      marginTop: 8,
      textTransform: 'uppercase',
    },
    countBadge: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    countText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 13,
    },
  });

  useLayoutEffect(() => {
    if (visible) {
      // Start off-screen and animate in
      translateY.setValue(height);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    }
  }, [visible]);

  const handleClose = (afterClose?: () => void) => {
    Animated.timing(translateY, {
      toValue: height,
      duration: 220,
      useNativeDriver: true,
    }).start(({finished}) => {
      if (finished) {
        onClose();
        setTimeout(() => {
          translateY.setValue(0);
          afterClose?.();
        }, 100);
      }
    });
  };

  const handleClosePress = () => handleClose();

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8,
      onPanResponderMove: (_e, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 80) {
          handleClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const confirmUnsave = useCallback(
    (productId: string, productTitle?: string) => {
      ReactNativeHapticFeedback.trigger('impactMedium', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });

      Alert.alert(
        'Remove from Saved',
        `Are you sure you want to remove "${productTitle || 'this item'}" from your saved recommendations?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => handleUnsave(productId),
          },
        ],
      );
    },
    [],
  );

  const handleUnsave = useCallback(
    async (productId: string) => {
      if (!userId) return;

      setUnsavingId(productId);
      ReactNativeHapticFeedback.trigger('impactLight', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });

      try {
        const response = await fetch(
          `${API_BASE_URL}/discover/${userId}/unsave`,
          {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({product_id: productId}),
          },
        );

        if (response.ok) {
          onUnsave?.(productId);
          onRefresh?.();
        }
      } catch (error) {
        console.error('Failed to unsave product:', error);
      } finally {
        setUnsavingId(null);
      }
    },
    [userId, onUnsave, onRefresh],
  );

  const handleShop = useCallback(
    (link: string, title?: string) => {
      ReactNativeHapticFeedback.trigger('impactLight', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
      if (link && onOpenItem) {
        // Open the reader on top - don't close this modal
        onOpenItem(link, title);
      }
    },
    [onOpenItem],
  );

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={handleClosePress}>
      <View style={styles.modalContainer}>
        <View style={styles.backdrop} />

        <Animated.View
          style={[
            styles.panel,
            {
              transform: [{translateY}],
              width: '100%',
              height: height - insets.top - 20,
              marginTop: insets.top,
            },
          ]}>
          {/* Gesture zone for swipe down */}
          <View style={styles.gestureZone} {...panResponder.panHandlers} />

          {/* Close button */}
          <TouchableOpacity
            style={styles.closeIcon}
            onPress={handleClosePress}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <MaterialIcons name="close" size={20} color="#000" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Saved Recommendations</Text>
          </View>

          {/* Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: tokens.spacing.md,
              paddingBottom: insets.bottom + 40,
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
            }}>
            {/* Empty state */}
            {savedProducts.length === 0 && (
              <View
                style={{
                  width: '100%',
                  alignItems: 'center',
                  paddingTop: tokens.spacing.xl,
                }}>
                <MaterialIcons
                  name="favorite-border"
                  size={48}
                  color={theme.colors.muted}
                />
                <Text
                  style={[
                    globalStyles.missingDataMessage1,
                    {marginTop: tokens.spacing.md},
                  ]}>
                  No Saved Recommendations
                </Text>
                <View style={{marginTop: tokens.spacing.sm}}>
                  <TooltipBubble
                    message="Tap the heart on any recommendation to save it here."
                    position="bottom"
                  />
                </View>
              </View>
            )}

            {/* Product Grid */}
            {savedProducts.map((product, index) => (
              <Animatable.View
                key={product.id || index}
                animation="fadeInUp"
                delay={index * 60}
                useNativeDriver
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
                  }}>
                  <Image
                    source={{uri: product.image_url}}
                    style={{width: '100%', height: '100%'}}
                    resizeMode="cover"
                  />

                  {/* Heart overlay (to unsave) */}
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      borderRadius: 16,
                      padding: 6,
                    }}
                    onPress={() => confirmUnsave(product.product_id, product.title)}
                    disabled={unsavingId === product.product_id}>
                    {unsavingId === product.product_id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <MaterialIcons
                        name="favorite"
                        size={18}
                        color="#ff4d6d"
                      />
                    )}
                  </TouchableOpacity>

                  {/* Shop Now button overlay - transparent on image above site name */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPressIn={() =>
                      ReactNativeHapticFeedback.trigger('impactLight', {
                        enableVibrateFallback: true,
                        ignoreAndroidSystemSettings: false,
                      })
                    }
                    onPress={() => handleShop(product.link, product.title)}
                    style={{
                      position: 'absolute',
                      bottom: 12,
                      left: 8,
                      right: 8,
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      borderRadius: tokens.borderRadius.sm,
                      paddingVertical: 9,
                      borderColor: theme.colors.foreground,
                      borderWidth: tokens.borderWidth.hairline,
                    }}>
                    <Text
                      style={{
                        textAlign: 'center',
                        color: '#fff',
                        fontWeight: '500',
                        fontSize: 12,
                      }}>
                      Shop Now
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Brand/Source tag */}
                {product.brand && (
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      paddingHorizontal: 10,
                      paddingTop: 8,
                    }}>
                    <View
                      style={{
                        backgroundColor: theme.colors.surface2,
                        borderRadius: 12,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                      }}>
                      <Text
                        style={{
                          color: theme.colors.muted,
                          fontSize: 11,
                        }}>
                        {product.brand}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Product Title */}
                <Text
                  style={{
                    paddingHorizontal: 12,
                    marginTop: 8,
                    color: theme.colors.foreground,
                    fontWeight: '400',
                    fontSize: 13,
                  }}
                  numberOfLines={2}>
                  {product.title}
                </Text>

                {/* Price */}
                <Text
                  style={{
                    paddingHorizontal: 12,
                    marginTop: 4,
                    marginBottom: 10,
                    color: theme.colors.primary,
                    fontWeight: '600',
                    fontSize: 14,
                  }}>
                  {product.price_raw ||
                    (product.price ? `$${product.price}` : '')}
                </Text>
              </Animatable.View>
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
