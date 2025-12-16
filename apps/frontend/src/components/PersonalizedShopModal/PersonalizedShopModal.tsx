/* eslint-disable react-native/no-inline-styles */
import React, {useState, useEffect, useMemo, memo, useCallback} from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {tokens} from '../../styles/tokens/tokens';
import {useAppTheme} from '../../context/ThemeContext';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import IntegratedShopOverlay from '../../components/ShopModal/IntegratedShopOverlay';
import type {PersonalizedResult} from '../../hooks/useRecreateLook';

// Memoized outfit item card to prevent re-renders
const OutfitItemCard = memo(function OutfitItemCard({
  item,
  theme,
  onShopPress,
}: {
  item: any;
  theme: any;
  onShopPress: (url: string) => void;
}) {
  // Pre-compute image URI once
  const imgUri = useMemo(() => {
    if (item.previewImage && !item.previewImage.includes('No_image_available')) {
      return item.previewImage;
    }
    return (
      item.image ||
      item.image_url ||
      `https://storage.googleapis.com/stylhelpr-prod-bucket/${encodeURIComponent(
        (item.item || item.name || 'default').toLowerCase().replace(/\s+/g, '_'),
      )}.jpg`
    );
  }, [item.previewImage, item.image, item.image_url, item.item, item.name]);

  const handlePress = useCallback(() => {
    if (item.shopUrl || item.previewUrl) {
      ReactNativeHapticFeedback.trigger('impactMedium');
      onShopPress(item.shopUrl || item.previewUrl);
    }
  }, [item.shopUrl, item.previewUrl, onShopPress]);

  return (
    <View
      style={{
        width: '48%',
        marginBottom: tokens.spacing.lg,
        backgroundColor: theme.colors.surface2,
        borderRadius: tokens.borderRadius.lg,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 2,
      }}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
        <Image
          source={{uri: imgUri}}
          style={{
            width: '100%',
            height: 220,
            borderTopLeftRadius: tokens.borderRadius.lg,
            borderTopRightRadius: tokens.borderRadius.lg,
            opacity: item.source === 'wardrobe' ? 0.85 : 1,
          }}
          resizeMode="cover"
        />
        {item.brand && (
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'rgba(0,0,0,0.45)',
              paddingVertical: 4,
            }}>
            <Text
              numberOfLines={1}
              style={{
                color: 'white',
                fontWeight: '600',
                fontSize: 12,
                textAlign: 'center',
              }}>
              {item.brand}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={{padding: 12}}>
        <Text
          numberOfLines={1}
          style={{
            color: theme.colors.foreground,
            fontWeight: '600',
            fontSize: 14,
          }}>
          {item.item || item.name}
        </Text>
        <Text
          style={{
            color: theme.colors.foreground,
            opacity: 0.7,
            fontSize: 12,
            marginTop: 2,
          }}>
          {item.category} • {item.color}
        </Text>
        {item.reason && (
          <Text
            style={{
              color: theme.colors.primary,
              fontSize: 11,
              marginTop: 6,
              lineHeight: 15,
              fontStyle: 'italic',
            }}>
            {item.reason}
          </Text>
        )}
        {item.previewPrice ? (
          <Text
            style={{
              color: theme.colors.foreground,
              opacity: 0.6,
              fontWeight: '600',
              fontSize: 13,
              marginTop: item.reason ? 4 : 6,
            }}>
            {item.previewPrice}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

export default function PersonalizedShopModal({
  visible,
  onClose,
  purchases,
  styleNote,
  gap_analysis,
}: {
  visible: boolean;
  onClose: () => void;
} & Partial<PersonalizedResult>) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const [shopUrl, setShopUrl] = useState<string | null>(null);

  useEffect(() => {
    if (visible) ReactNativeHapticFeedback.trigger('impactLight');
  }, [visible]);

  // Memoize the full outfit array
  const fullOutfit = useMemo(() => {
    const purchaseList = Array.isArray(purchases)
      ? purchases
      : (purchases as PersonalizedResult)?.suggested_purchases || [];
    const recreated = (purchases as PersonalizedResult)?.recreated_outfit || [];
    return [...recreated, ...purchaseList];
  }, [purchases]);

  const hasNoData = fullOutfit.length === 0;

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
          justifyContent: 'center',
          alignItems: 'center',
          padding: tokens.spacing.sm,
        }}>
        <View
          style={{
            width: '100%',
            maxWidth: 700,
            height: '90%',
            backgroundColor: theme.colors.surface,
            borderRadius: tokens.borderRadius['2xl'],
            overflow: 'hidden',
            padding: tokens.spacing.md,
          }}>
          {/* Close button */}
          <TouchableOpacity
            onPress={handleClose}
            style={{
              position: 'absolute',
              top: 5,
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

          {/* Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{paddingBottom: 80}}
            removeClippedSubviews={true}>
            <Text
              numberOfLines={1}
              style={[globalStyles.sectionTitle, {marginTop: 40}]}>
              Full Outfit
            </Text>

            {/* Loading State */}
            {hasNoData ? (
              <View style={{flex: 1, alignItems: 'center', marginTop: 50}}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text
                  style={{
                    color: theme.colors.foreground,
                    marginTop: 12,
                    opacity: 0.7,
                    fontSize: 14,
                  }}>
                  Generating your personalized outfit...
                </Text>
              </View>
            ) : (
              <>
                {/* Gap Analysis Summary */}
                {gap_analysis ? (
                  <View
                    style={{
                      backgroundColor: theme.colors.surface2,
                      borderLeftWidth: 3,
                      borderLeftColor: theme.colors.primary,
                      padding: tokens.spacing.md,
                      marginBottom: tokens.spacing.md,
                      borderRadius: tokens.borderRadius.md,
                    }}>
                    <Text
                      style={{
                        color: theme.colors.primary,
                        fontWeight: '600',
                        fontSize: 13,
                        marginBottom: 6,
                      }}>
                      What's Missing From Your Wardrobe
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.foreground,
                        fontSize: 12,
                        lineHeight: 17,
                        opacity: 0.85,
                      }}>
                      {gap_analysis}
                    </Text>
                  </View>
                ) : null}

                {/* Full Outfit (Wardrobe + Purchases) */}
                <View style={{marginTop: 20}}>
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      paddingBottom: 20,
                    }}>
                    {fullOutfit.map((p, i) => (
                      <OutfitItemCard
                        key={p.id || i}
                        item={p}
                        theme={theme}
                        onShopPress={handleShopPress}
                      />
                    ))}
                  </View>

                  {styleNote ? (
                    <Text
                      style={{
                        color: theme.colors.foreground,
                        marginTop: 10,
                        fontSize: 13,
                        lineHeight: 18,
                      }}>
                      {styleNote}
                    </Text>
                  ) : null}
                </View>
              </>
            )}
          </ScrollView>
        </View>

        {/* In-App WebView Overlay */}
        <IntegratedShopOverlay
          visible={!!shopUrl}
          onClose={() => setShopUrl(null)}
          url={shopUrl}
        />
      </View>
    </Modal>
  );
}
