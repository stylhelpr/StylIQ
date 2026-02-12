import React from 'react';
import {View, Text, ScrollView, StyleSheet, Dimensions} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useAppTheme} from '../../context/ThemeContext';
import {tokens} from '../../styles/tokens/tokens';
import {CapsuleOutfit, BackupSuggestion} from '../../types/trips';

const CARD_WIDTH = Dimensions.get('window').width * 0.75;
const THUMB_SIZE = (CARD_WIDTH - 48 - 10) / 2;
const BACKUP_KIT_IMG = 70;

type Props = {
  outfits: CapsuleOutfit[];
  tripBackupKit?: BackupSuggestion[];
};

const OutfitCarousel = ({outfits, tripBackupKit}: Props) => {
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
    supportCard: {
      width: CARD_WIDTH,
      backgroundColor: theme.colors.surface,
      borderRadius: tokens.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.surfaceBorder,
      borderStyle: 'dashed',
      overflow: 'hidden',
      opacity: 0.85,
    },
    cardHeader: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 10,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dayLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.foreground,
    },
    occasionBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      backgroundColor: theme.colors.surface2,
    },
    occasionText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.foreground2,
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
    backupKitSection: {
      paddingHorizontal: tokens.spacing.md,
      marginTop: tokens.spacing.lg,
    },
    backupKitTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.foreground,
      marginBottom: 4,
    },
    backupKitSubtitle: {
      fontSize: 12,
      fontWeight: '400',
      color: theme.colors.foreground2,
      marginBottom: 14,
    },
    backupKitItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
      paddingVertical: 12,
    },
    backupKitDivider: {
      height: tokens.borderWidth.hairline,
      backgroundColor: theme.colors.surfaceBorder,
    },
    backupKitImage: {
      width: BACKUP_KIT_IMG,
      height: BACKUP_KIT_IMG,
      borderRadius: tokens.borderRadius.md,
      backgroundColor: theme.colors.surface2,
      borderWidth: tokens.borderWidth.hairline,
      borderColor: theme.colors.surfaceBorder,
    },
    backupKitInfo: {
      flex: 1,
      paddingTop: 2,
    },
    backupKitName: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.foreground,
    },
    backupKitReason: {
      fontSize: 13,
      fontWeight: '400',
      color: theme.colors.foreground2,
      marginTop: 4,
      lineHeight: 18,
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
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + 14}
        snapToAlignment="start">
        {outfits.map(outfit => {
          const isSupport = (outfit.type ?? 'anchor') === 'support';
          return (
          <View key={outfit.id} style={isSupport ? styles.supportCard : styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.headerRow}>
                <Text style={styles.dayLabel}>
                  {outfit.dayLabel}{isSupport ? ' +' : ''}
                </Text>
                {outfit.occasion ? (
                  <View style={styles.occasionBadge}>
                    <Text style={styles.occasionText}>{outfit.occasion}</Text>
                  </View>
                ) : null}
              </View>
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
          );
        })}
      </ScrollView>
      {tripBackupKit && tripBackupKit.length > 0 && (
        <View style={styles.backupKitSection}>
          <Text style={styles.backupKitTitle}>
            {'🧳 Smart Backup Kit'}
          </Text>
          <Text style={styles.backupKitSubtitle}>
            Reusable safety pieces for your whole trip
          </Text>
          {tripBackupKit.map((b, idx) => (
            <React.Fragment key={b.wardrobeItemId}>
              {idx > 0 && <View style={styles.backupKitDivider} />}
              <View style={styles.backupKitItem}>
                {b.imageUrl ? (
                  <FastImage
                    source={{
                      uri: b.imageUrl,
                      priority: FastImage.priority.low,
                    }}
                    style={styles.backupKitImage}
                    resizeMode={FastImage.resizeMode.contain}
                  />
                ) : (
                  <View style={styles.backupKitImage} />
                )}
                <View style={styles.backupKitInfo}>
                  <Text style={styles.backupKitName}>{b.name}</Text>
                  <Text style={styles.backupKitReason}>{b.reason}</Text>
                </View>
              </View>
            </React.Fragment>
          ))}
        </View>
      )}
    </View>
  );
};

export default OutfitCarousel;
