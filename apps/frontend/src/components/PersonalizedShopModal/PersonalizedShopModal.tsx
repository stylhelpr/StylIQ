/* eslint-disable react-native/no-inline-styles */
import React, {useState, useEffect} from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {tokens} from '../../styles/tokens/tokens';
import {useAppTheme} from '../../context/ThemeContext';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import IntegratedShopOverlay from '../../components/ShopModal/IntegratedShopOverlay';
import type {PersonalizedResult} from '../../hooks/useRecreateLook';

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

  if (!visible) return null;

  // 🧩 Normalize props safely: include both recreated_outfit + suggested_purchases
  const purchaseList = Array.isArray(purchases)
    ? purchases
    : (purchases as PersonalizedResult)?.suggested_purchases || [];

  const recreated = (purchases as PersonalizedResult)?.recreated_outfit || [];

  // 🪄 Merge wardrobe + purchases into one visual list
  const fullOutfit = [...recreated, ...purchaseList];
  const hasNoData = !fullOutfit || fullOutfit.length === 0;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: tokens.spacing.sm,
        }}>
        <Animatable.View
          animation="fadeInUp"
          duration={300}
          style={{
            width: '100%',
            maxWidth: 700,
            height: '90%',
            backgroundColor: theme.colors.surface,
            borderRadius: tokens.borderRadius['2xl'],
            overflow: 'hidden',
            padding: tokens.spacing.md,
          }}>
          {/* ✖️ Close */}
          <TouchableOpacity
            onPress={() => {
              ReactNativeHapticFeedback.trigger('impactLight');
              onClose();
            }}
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

          {/* 🧾 Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{paddingBottom: 80}}>
            <Text
              numberOfLines={1}
              style={[globalStyles.sectionTitle, {marginTop: 40}]}>
              Full Outfit
            </Text>

            {/* 🌀 Loading State */}
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
                {/* 📊 Gap Analysis Summary */}
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
                      🎯 What's Missing From Your Wardrobe
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

                {/* 🧥 Full Outfit (Wardrobe + Purchases) */}
                <View style={{marginTop: 20}}>
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      paddingBottom: 20,
                    }}>
                    {fullOutfit.map((p, i) => {
                      // 🧩 Enhanced image resolution logic
                      const imgUri =
                        p.previewImage &&
                        !p.previewImage.includes('No_image_available')
                          ? p.previewImage
                          : p.image ||
                            p.image_url ||
                            `https://storage.googleapis.com/stylhelpr-prod-bucket/${encodeURIComponent(
                              (p.item || p.name || 'default')
                                .toLowerCase()
                                .replace(/\s+/g, '_'),
                            )}.jpg`;

                      console.log('🖼️ Displaying', p.item, '→', imgUri);

                      return (
                        <Animatable.View
                          key={i}
                          animation="fadeInUp"
                          duration={400}
                          delay={i * 100}
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
                          <TouchableOpacity
                            onPress={() => {
                              if (p.shopUrl || p.previewUrl) {
                                ReactNativeHapticFeedback.trigger(
                                  'impactMedium',
                                );
                                setShopUrl(p.shopUrl || p.previewUrl);
                              }
                            }}
                            activeOpacity={0.9}>
                            <Image
                              source={{uri: imgUri}}
                              style={{
                                width: '100%',
                                height: 220,
                                borderTopLeftRadius: tokens.borderRadius.lg,
                                borderTopRightRadius: tokens.borderRadius.lg,
                                opacity: p.source === 'wardrobe' ? 0.85 : 1,
                              }}
                              resizeMode="cover"
                            />
                            {p.brand && (
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
                                  {p.brand}
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
                              {p.item || p.name}
                            </Text>
                            <Text
                              style={{
                                color: theme.colors.foreground,
                                opacity: 0.7,
                                fontSize: 12,
                                marginTop: 2,
                              }}>
                              {p.category} • {p.color}
                            </Text>
                            {p.reason && (
                              <Text
                                style={{
                                  color: theme.colors.primary,
                                  fontSize: 11,
                                  marginTop: 6,
                                  lineHeight: 15,
                                  fontStyle: 'italic',
                                }}>
                                💡 {p.reason}
                              </Text>
                            )}
                            {p.previewPrice ? (
                              <Text
                                style={{
                                  color: theme.colors.foreground,
                                  opacity: 0.6,
                                  fontWeight: '600',
                                  fontSize: 13,
                                  marginTop: p.reason ? 4 : 6,
                                }}>
                                {p.previewPrice}
                              </Text>
                            ) : null}
                          </View>
                        </Animatable.View>
                      );
                    })}
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
        </Animatable.View>

        {/* 🌐 In-App WebView Overlay */}
        <IntegratedShopOverlay
          visible={!!shopUrl}
          onClose={() => setShopUrl(null)}
          url={shopUrl}
        />
      </View>
    </Modal>
  );
}
