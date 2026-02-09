import React, {useState, useMemo, useCallback} from 'react';
import {View, Text, ScrollView, StyleSheet, Alert, ActivityIndicator} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useAppTheme} from '../../context/ThemeContext';
import {tokens} from '../../styles/tokens/tokens';
import {
  Trip,
  TripCapsule,
  TripPackingItem,
  PackingGroup,
  CapsuleWarning,
} from '../../types/trips';
import {updateTrip} from '../../lib/trips/tripsStorage';
import {adaptWardrobeItem, buildCapsule, validateCapsule} from '../../lib/trips/capsuleEngine';
import {fetchRealWeather} from '../../lib/trips/weather/realWeather';
import WeatherStrip from '../../components/Trips/WeatherStrip';
import OutfitCarousel from '../../components/Trips/OutfitCarousel';
import PackingListSection from '../../components/Trips/PackingListSection';
import ItemReplaceModal from '../../components/Trips/ItemReplaceModal';
import ConfidenceSummary from '../../components/Trips/ConfidenceSummary';
import AppleTouchFeedback from '../../components/AppleTouchFeedback/AppleTouchFeedback';

type Props = {
  trip: Trip;
  wardrobe: any[];
  onBack: () => void;
  onRefresh: () => void;
};

const TripCapsuleScreen = ({trip, wardrobe, onBack, onRefresh}: Props) => {
  const {theme} = useAppTheme();
  const [capsule, setCapsule] = useState<TripCapsule | null>(trip.capsule);
  const [warnings, setWarnings] = useState<CapsuleWarning[]>(trip.warnings || []);
  const [replaceItem, setReplaceItem] = useState<TripPackingItem | null>(null);
  const [isRebuilding, setIsRebuilding] = useState(false);

  const adaptedWardrobe = useMemo(
    () => wardrobe.map(adaptWardrobeItem),
    [wardrobe],
  );

  const start = new Date(trip.startDate + 'T00:00:00');
  const end = new Date(trip.endDate + 'T00:00:00');
  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
  const dateRange = `${formatDate(start)} – ${formatDate(end)}`;

  const persistCapsule = useCallback(
    async (newCapsule: TripCapsule, newWarnings?: CapsuleWarning[]) => {
      setCapsule(newCapsule);
      if (newWarnings !== undefined) setWarnings(newWarnings);
      const updated = {
        ...trip,
        capsule: newCapsule,
        ...(newWarnings !== undefined ? {warnings: newWarnings.length > 0 ? newWarnings : undefined} : {}),
      };
      const saved = await updateTrip(updated);
      if (!saved) {
        Alert.alert('Save Error', "Couldn't save changes. Please try again.");
      }
      onRefresh();
    },
    [trip, onRefresh],
  );

  const handleRebuild = useCallback(() => {
    Alert.alert(
      'Rebuild Capsule',
      'Rebuild your packing list? Packed checkmarks will be reset.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Rebuild',
          onPress: async () => {
            setIsRebuilding(true);
            try {
              const weatherResult = await fetchRealWeather(
                trip.destination,
                trip.startDate,
                trip.endDate,
              );
              const newCapsule = buildCapsule(
                adaptedWardrobe,
                weatherResult.days,
                trip.activities,
                trip.startingLocationLabel,
              );
              const newWarnings = validateCapsule(newCapsule, weatherResult.days, trip.activities);
              const updated: Trip = {
                ...trip,
                weather: weatherResult.days,
                weatherSource: weatherResult.source,
                capsule: newCapsule,
                warnings: newWarnings.length > 0 ? newWarnings : undefined,
              };
              const saved = await updateTrip(updated);
              if (!saved) {
                Alert.alert('Save Error', "Couldn't save rebuilt capsule. Please try again.");
              } else {
                setCapsule(newCapsule);
                setWarnings(newWarnings);
              }
              onRefresh();
            } catch (err) {
              console.error('[TripCapsule] rebuild failed:', err);
              Alert.alert('Error', 'Something went wrong rebuilding your capsule.');
            } finally {
              setIsRebuilding(false);
            }
          },
        },
      ],
    );
  }, [trip, adaptedWardrobe, onRefresh]);

  const handleTogglePacked = useCallback(
    (itemId: string) => {
      if (!capsule) return;
      const newPackingList = capsule.packingList.map(group => ({
        ...group,
        items: group.items.map(item =>
          item.id === itemId ? {...item, packed: !item.packed} : item,
        ),
      }));
      persistCapsule({...capsule, packingList: newPackingList});
    },
    [capsule, persistCapsule],
  );

  const handleReplaceItem = useCallback(
    (newItem: TripPackingItem) => {
      if (!capsule || !replaceItem) return;
      const oldWardrobeId = replaceItem.wardrobeItemId;

      // Replace in outfits
      const newOutfits = capsule.outfits.map(outfit => ({
        ...outfit,
        items: outfit.items.map(item =>
          item.wardrobeItemId === oldWardrobeId ? newItem : item,
        ),
      }));

      // Rebuild packing list from outfits
      const allItems = newOutfits.flatMap(o => o.items);
      const uniqueMap = new Map<string, TripPackingItem>();
      for (const item of allItems) {
        if (!uniqueMap.has(item.wardrobeItemId)) {
          uniqueMap.set(item.wardrobeItemId, item);
        }
      }

      const categoryOrder = [
        'Tops',
        'Bottoms',
        'Dresses',
        'Outerwear',
        'Shoes',
        'Accessories',
        'Other',
      ];
      const grouped = new Map<string, TripPackingItem[]>();
      for (const item of uniqueMap.values()) {
        const displayCat = categoryOrder.includes(item.mainCategory)
          ? item.mainCategory
          : 'Other';
        if (!grouped.has(displayCat)) grouped.set(displayCat, []);
        grouped.get(displayCat)!.push(item);
      }

      const newPackingList: PackingGroup[] = categoryOrder
        .filter(cat => grouped.has(cat))
        .map(cat => ({
          category: cat,
          items: grouped.get(cat)!,
        }));

      persistCapsule({outfits: newOutfits, packingList: newPackingList});
      setReplaceItem(null);
    },
    [capsule, replaceItem, persistCapsule],
  );

  // Get alternatives for the replace modal
  const replaceAlternatives = useMemo(() => {
    if (!replaceItem) return [];
    const cat = replaceItem.mainCategory;
    return adaptedWardrobe.filter(
      item => (item.main_category || 'Other') === cat,
    );
  }, [replaceItem, adaptedWardrobe]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
       marginTop: 100,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: tokens.spacing.lg,
      paddingTop: tokens.spacing.sm,
      paddingBottom: 4,
    },
    headerInfo: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.colors.foreground,
    },
    headerDate: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.foreground2,
      marginTop: 2,
    },
    rebuildBtn: {
      padding: 8,
    },
    scrollContent: {
      paddingBottom: 120,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.foreground,
      paddingHorizontal: tokens.spacing.md,
      marginTop: tokens.spacing.lg,
      marginBottom: tokens.spacing.sm,
    },
    warningCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: tokens.spacing.md,
      marginBottom: 6,
      padding: 10,
      backgroundColor: '#FFF8E1',
      borderRadius: tokens.borderRadius.md,
    },
    warningText: {
      fontSize: 13,
      fontWeight: '500',
      color: '#F57C00',
      flex: 1,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 100,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.foreground2,
      textAlign: 'center',
      paddingHorizontal: 40,
      marginTop: 12,
    },
    mainLooksHeader: {
      paddingHorizontal: tokens.spacing.md,
      marginTop: tokens.spacing.lg,
      marginBottom: tokens.spacing.sm,
    },
    mainLooksTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.foreground,
    },
    mainLooksSubtitle: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.foreground2,
      marginTop: 2,
    },
  });

  if (!capsule) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <AppleTouchFeedback onPress={onBack} hapticStyle="impactLight">
            <Icon
              name="arrow-back"
              size={24}
              color={theme.colors.foreground}
            />
          </AppleTouchFeedback>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{trip.destination}</Text>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <Icon name="inventory-2" size={48} color={theme.colors.foreground2} />
          <Text style={styles.emptyText}>
            No capsule generated yet. Add wardrobe items and try again.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppleTouchFeedback onPress={onBack} hapticStyle="impactLight">
          <Icon
            name="arrow-back"
            size={24}
            color={theme.colors.foreground}
          />
        </AppleTouchFeedback>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {trip.destination}
          </Text>
          <Text style={styles.headerDate}>{dateRange}</Text>
        </View>
        <AppleTouchFeedback
          onPress={isRebuilding ? () => {} : handleRebuild}
          hapticStyle="impactLight">
          <View style={styles.rebuildBtn}>
            {isRebuilding ? (
              <ActivityIndicator size="small" color={theme.colors.foreground2} />
            ) : (
              <Icon name="refresh" size={22} color={theme.colors.foreground2} />
            )}
          </View>
        </AppleTouchFeedback>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Weather Strip */}
        <Text style={styles.sectionTitle}>Weather</Text>
        <WeatherStrip weather={trip.weather} source={trip.weatherSource} />

        {/* Warnings */}
        {warnings.length > 0 && (
          <View style={{marginTop: tokens.spacing.sm}}>
            {warnings.map((w, idx) => (
              <View key={idx} style={styles.warningCard}>
                <Icon name="warning" size={16} color="#FF9500" />
                <Text style={styles.warningText}>{w.message}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Confidence Summary */}
        <ConfidenceSummary
          weather={trip.weather}
          activities={trip.activities}
          packingList={capsule.packingList}
        />

        {/* Main Looks */}
        <View style={styles.mainLooksHeader}>
          <Text style={styles.mainLooksTitle}>Your Main Looks</Text>
          <Text style={styles.mainLooksSubtitle}>
            Designed for key moments. We've packed everything else below.
          </Text>
        </View>
        <OutfitCarousel outfits={capsule.outfits} />

        {/* Packing List */}
        <View style={{marginTop: tokens.spacing.lg}}>
          <PackingListSection
            packingList={capsule.packingList}
            onTogglePacked={handleTogglePacked}
            onReplaceItem={setReplaceItem}
          />
        </View>
      </ScrollView>

      {/* Replace Modal */}
      <ItemReplaceModal
        visible={!!replaceItem}
        currentItem={replaceItem}
        alternatives={replaceAlternatives}
        locationLabel={trip.startingLocationLabel}
        onReplace={handleReplaceItem}
        onClose={() => setReplaceItem(null)}
      />
    </View>
  );
};

export default TripCapsuleScreen;
