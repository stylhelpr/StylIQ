import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useAppTheme} from '../../context/ThemeContext';
import {tokens} from '../../styles/tokens/tokens';
import {BackupSuggestion, PackingGroup, TripPackingItem} from '../../types/trips';
import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';

type Props = {
  packingList: PackingGroup[];
  tripBackupKit?: BackupSuggestion[];
  onTogglePacked: (itemId: string) => void;
  onReplaceItem: (item: TripPackingItem) => void;
};

const PackingListSection = ({
  packingList,
  tripBackupKit,
  onTogglePacked,
  onReplaceItem,
}: Props) => {
  const {theme} = useAppTheme();

  const totalItems = packingList.reduce((s, g) => s + g.items.length, 0);
  const packedItems = packingList.reduce(
    (s, g) => s + g.items.filter(i => i.packed).length,
    0,
  );

  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: tokens.spacing.md,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: tokens.spacing.md,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.foreground,
    },
    packedCount: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.foreground2,
    },
    groupHeader: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.foreground,
      marginTop: tokens.spacing.md,
      marginBottom: tokens.spacing.xs,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: 8,
      marginHorizontal: -8,
      borderRadius: 10,
      borderBottomWidth: tokens.borderWidth.hairline,
      borderBottomColor: theme.colors.surfaceBorder,
    },
    itemRowPacked: {},
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: theme.colors.button1,
      borderColor: theme.colors.button1,
    },
    checkboxUnchecked: {
      backgroundColor: 'transparent',
      borderColor: theme.colors.surfaceBorder,
    },
    thumbWrap: {
      width: 48,
      height: 48,
      borderRadius: 8,
      backgroundColor: theme.colors.surface2,
      overflow: 'hidden',
    },
    thumbPacked: {
      opacity: 0.4,
    },
    thumb: {
      width: '100%',
      height: '100%',
    },
    itemInfo: {
      flex: 1,
    },
    itemName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.foreground,
    },
    itemNamePacked: {
      textDecorationLine: 'line-through',
      opacity: 0.5,
    },
    itemMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 2,
    },
    colorDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 0.5,
      borderColor: 'rgba(128,128,128,0.3)',
    },
    locationBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    locationText: {
      fontSize: 11,
      fontWeight: '500',
      color: theme.colors.foreground2,
    },
    replaceBtn: {
      padding: 6,
    },
    backupHeader: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.foreground,
      marginTop: tokens.spacing.lg,
      marginBottom: tokens.spacing.xs,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    backupRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: tokens.borderWidth.hairline,
      borderBottomColor: theme.colors.surfaceBorder,
    },
    backupLabel: {
      fontSize: 11,
      fontWeight: '500',
      color: theme.colors.foreground2,
      marginTop: 2,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Packing List</Text>
        <Text style={styles.packedCount}>
          {packedItems}/{totalItems} packed
        </Text>
      </View>

      {packingList.map(group => (
        <View key={group.category}>
          <Text style={styles.groupHeader}>{group.category}</Text>
          {group.items.map(item => (
            <AppleTouchFeedback
              key={item.id}
              onPress={() => onTogglePacked(item.id)}
              hapticStyle="impactLight">
              <View
                style={[
                  styles.itemRow,
                  item.packed && styles.itemRowPacked,
                ]}>
                <View
                  style={[
                    styles.checkbox,
                    item.packed
                      ? styles.checkboxChecked
                      : styles.checkboxUnchecked,
                  ]}>
                  {item.packed && (
                    <Icon name="check" size={16} color="#FFFFFF" />
                  )}
                </View>

                <View
                  style={[
                    styles.thumbWrap,
                    item.packed && styles.thumbPacked,
                  ]}>
                  {item.imageUrl ? (
                    <FastImage
                      source={{
                        uri: item.imageUrl,
                        priority: FastImage.priority.low,
                      }}
                      style={styles.thumb}
                      resizeMode={FastImage.resizeMode.contain}
                    />
                  ) : null}
                </View>

                <View style={styles.itemInfo}>
                  <Text
                    style={[
                      styles.itemName,
                      item.packed && styles.itemNamePacked,
                    ]}
                    numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.itemMeta}>
                    {item.color && (
                      <View
                        style={[
                          styles.colorDot,
                          {backgroundColor: item.color},
                        ]}
                      />
                    )}
                    <View style={styles.locationBadge}>
                      <Icon
                        name="place"
                        size={11}
                        color={theme.colors.foreground2}
                      />
                      <Text style={styles.locationText}>
                        {item.locationLabel}
                      </Text>
                    </View>
                  </View>
                </View>

                <AppleTouchFeedback
                  onPress={() => onReplaceItem(item)}
                  style={styles.replaceBtn}
                  hapticStyle="impactLight">
                  <Icon
                    name="swap-horiz"
                    size={20}
                    color={theme.colors.foreground2}
                  />
                </AppleTouchFeedback>
              </View>
            </AppleTouchFeedback>
          ))}
        </View>
      ))}

      {tripBackupKit && tripBackupKit.length > 0 && (
        <View>
          <Text style={styles.backupHeader}>Backup Items</Text>
          {tripBackupKit.map(b => (
            <View key={b.wardrobeItemId} style={styles.backupRow}>
              <View style={styles.thumbWrap}>
                {b.imageUrl ? (
                  <FastImage
                    source={{
                      uri: b.imageUrl,
                      priority: FastImage.priority.low,
                    }}
                    style={styles.thumb}
                    resizeMode={FastImage.resizeMode.contain}
                  />
                ) : null}
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {b.name}
                </Text>
                <Text style={styles.backupLabel}>(backup)</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default PackingListSection;
