/* eslint-disable react-native/no-inline-styles */
import React, {
  useRef,
  useLayoutEffect,
  useCallback,
  useState,
  useMemo,
} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  PanResponder,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {tokens} from '../../styles/tokens/tokens';
import {useAppTheme} from '../../context/ThemeContext';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {useUUID} from '../../context/UUIDContext';
import {useUnsaveProduct} from '../../hooks/useSavedProducts';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {moderateScale} from '../../utils/scale';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {TooltipBubble} from '../ToolTip/ToolTip1';
import {FlashList} from '@shopify/flash-list';
import FastImage from 'react-native-fast-image';

const {height, width} = Dimensions.get('window');

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

  const [locallyRemovedIds, setLocallyRemovedIds] = useState<Set<string>>(
    new Set(),
  );

  const unsaveProductMutation = useUnsaveProduct();

  const filteredProducts = useMemo(
    () => savedProducts.filter(p => !locallyRemovedIds.has(p.product_id)),
    [savedProducts, locallyRemovedIds],
  );

  useLayoutEffect(() => {
    if (!visible) {
      setLocallyRemovedIds(new Set());
    }
  }, [visible]);

  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: 'transparent',
      justifyContent: 'flex-start',
      alignItems: 'center',
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
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
      paddingHorizontal: moderateScale(tokens.spacing.md),
    },
    closeIcon: {
      position: 'absolute',
      top: 10,
      right: 18,
      zIndex: 20,
      backgroundColor: 'white',
      borderRadius: 20,
      borderWidth: tokens.borderWidth.hairline,
      borderColor: theme.colors.muted,
      padding: 6,
    },
    gestureZone: {
      position: 'absolute',
      top: 0,
      height: 45,
      width: '100%',
      zIndex: 99999,
      backgroundColor: 'transparent',
    },
    header: {
      marginTop: 16,
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
      textTransform: 'uppercase',
    },
  });

  useLayoutEffect(() => {
    if (visible) {
      translateY.setValue(height);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    }
  }, [visible, translateY]);

  const handleClose = useCallback(
    (afterClose?: () => void) => {
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
    },
    [translateY, onClose],
  );

  const handleClosePress = useCallback(() => handleClose(), [handleClose]);

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

  const handleUnsave = useCallback(
    (productId: string) => {
      if (!userId) return;

      ReactNativeHapticFeedback.trigger('impactLight', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });

      setLocallyRemovedIds(prev => new Set(prev).add(productId));
      onUnsave?.(productId);

      unsaveProductMutation.mutate(
        {userId, productId},
        {
          onError: error => {
            console.error('Failed to unsave product:', error);
            setLocallyRemovedIds(prev => {
              const next = new Set(prev);
              next.delete(productId);
              return next;
            });
          },
        },
      );
    },
    [userId, onUnsave, unsaveProductMutation],
  );

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
    [handleUnsave],
  );

  const handleShop = useCallback(
    (link: string, title?: string) => {
      ReactNativeHapticFeedback.trigger('impactLight', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
      if (link && onOpenItem) {
        onOpenItem(link, title);
      }
    },
    [onOpenItem],
  );

  const numColumns = 2;
  const itemWidth = (width - moderateScale(tokens.spacing.md) * 2 - 4) / 2;

  const keyExtractor = useCallback(
    (item: SavedProduct, index: number) =>
      item.id?.toString() || `product-${index}`,
    [],
  );

  const renderItem = useCallback(
    ({item: product}: {item: SavedProduct}) => {
      const imageUri = product.image_url;

      return (
        <View
          style={{
            width: itemWidth,
            marginBottom: tokens.spacing.nano,
            marginHorizontal: 1,
            backgroundColor: theme.colors.surface,
            overflow: 'hidden',
          }}>
          <View
            style={{
              width: '100%',
              aspectRatio: 3 / 4,
              backgroundColor: theme.colors.surface,
            }}>
            {imageUri ? (
              <FastImage
                source={{
                  uri: imageUri,
                  priority: FastImage.priority.normal,
                  cache: FastImage.cacheControl.immutable,
                }}
                style={{width: '100%', height: '100%'}}
                resizeMode={FastImage.resizeMode.cover}
              />
            ) : (
              <View
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: theme.colors.surface2,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                <MaterialIcons
                  name="image"
                  size={32}
                  color={theme.colors.muted}
                />
              </View>
            )}

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
              disabled={
                unsaveProductMutation.isPending &&
                unsaveProductMutation.variables?.productId === product.product_id
              }>
              {unsaveProductMutation.isPending &&
              unsaveProductMutation.variables?.productId ===
                product.product_id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialIcons name="favorite" size={18} color="#ff4d6d" />
              )}
            </TouchableOpacity>

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
                paddingVertical: 10,
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

          {product.brand && (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                paddingHorizontal: 10,
                paddingTop: 8,
              }}>
              <Text
                style={{
                  color: theme.colors.foreground,
                  fontWeight: '700',
                  fontSize: 12,
                }}>
                {product.brand}
              </Text>
            </View>
          )}

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

          <Text
            style={{
              paddingHorizontal: 12,
              marginTop: 4,
              marginBottom: 10,
              color: theme.colors.primary,
              fontWeight: '600',
              fontSize: 14,
            }}>
            {product.price_raw || (product.price ? `$${product.price}` : '')}
          </Text>
        </View>
      );
    },
    [
      theme,
      itemWidth,
      confirmUnsave,
      handleShop,
      unsaveProductMutation.isPending,
      unsaveProductMutation.variables?.productId,
    ],
  );

  const ListEmptyComponent = useCallback(
    () => (
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
          No Saved Recommendations. Like a recommendation in the Home screento save it here!
        </Text>
        <View style={{marginTop: tokens.spacing.sm}}>
          <TooltipBubble
            message="Tap the heart on any recommendation to save it here."
            position="bottom"
          />
        </View>
      </View>
    ),
    [theme, globalStyles],
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
          <TouchableOpacity
            style={styles.closeIcon}
            onPress={handleClosePress}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <MaterialIcons name="close" size={20} color="#000" />
          </TouchableOpacity>

          <View
            {...panResponder.panHandlers}
            onStartShouldSetResponder={() => true}
            pointerEvents="box-only"
            style={styles.gestureZone}
          />

          <View style={styles.header}>
            <Text style={styles.title}>Saved Recommended Buys</Text>
          </View>

          <Animatable.View animation="fadeIn" duration={400} style={{flex: 1}}>
            <FlashList
              data={filteredProducts}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              numColumns={numColumns}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingTop: tokens.spacing.md,
                paddingBottom: insets.bottom + 40,
              }}
              ListEmptyComponent={ListEmptyComponent}
            />
          </Animatable.View>
        </Animated.View>
      </View>
    </Modal>
  );
}
