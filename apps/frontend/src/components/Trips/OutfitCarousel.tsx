import React from 'react';
import {View, Text, ScrollView, StyleSheet, Dimensions} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useAppTheme} from '../../context/ThemeContext';
import {tokens} from '../../styles/tokens/tokens';
import {CapsuleOutfit} from '../../types/trips';

const CARD_WIDTH = Dimensions.get('window').width * 0.75;
const THUMB_SIZE = (CARD_WIDTH - 48 - 10) / 2;

type Props = {
  outfits: CapsuleOutfit[];
};

const OutfitCarousel = ({outfits}: Props) => {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    scrollContent: {
      paddingHorizontal: tokens.spacing.md,
      gap: 14,
    },
    card: {
      width: CARD_WIDTH,
      backgroundColor: theme.colors.surface,
      borderRadius: tokens.borderRadius.xl,
      borderWidth: tokens.borderWidth.hairline,
      borderColor: theme.colors.surfaceBorder,
      overflow: 'hidden',
    },
    cardHeader: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 10,
    },
    dayLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.foreground,
    },
    itemCount: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.foreground2,
      marginTop: 2,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 10,
    },
    thumbWrap: {
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: tokens.borderRadius.md,
      backgroundColor: theme.colors.surface2,
      overflow: 'hidden',
    },
    thumb: {
      width: '100%',
      height: '100%',
    },
    itemLabel: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.45)',
      paddingHorizontal: 6,
      paddingVertical: 3,
    },
    itemName: {
      fontSize: 10,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    emptyCard: {
      width: CARD_WIDTH,
      height: 200,
      backgroundColor: theme.colors.surface,
      borderRadius: tokens.borderRadius.xl,
      borderWidth: tokens.borderWidth.hairline,
      borderColor: theme.colors.surfaceBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.foreground2,
    },
  });

  if (outfits.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>
          Add items to your wardrobe to see outfits
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      decelerationRate="fast"
      snapToInterval={CARD_WIDTH + 14}
      snapToAlignment="start">
      {outfits.map(outfit => (
        <View key={outfit.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.dayLabel}>{outfit.dayLabel}</Text>
            <Text style={styles.itemCount}>
              {outfit.items.length} item{outfit.items.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.grid}>
            {outfit.items.slice(0, 6).map(item => (
              <View key={item.id} style={styles.thumbWrap}>
                {item.imageUrl ? (
                  <FastImage
                    source={{
                      uri: item.imageUrl,
                      priority: FastImage.priority.normal,
                    }}
                    style={styles.thumb}
                    resizeMode={FastImage.resizeMode.contain}
                  />
                ) : null}
                <View style={styles.itemLabel}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

export default OutfitCarousel;
