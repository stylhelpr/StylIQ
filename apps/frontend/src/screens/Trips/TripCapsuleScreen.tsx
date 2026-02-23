import React, {useState, useMemo, useCallback, useEffect, useRef} from 'react';
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
  TripStyleHints,
} from '../../types/trips';
import {useAuth0} from 'react-native-auth0';
import {useStyleProfile} from '../../hooks/useStyleProfile';
import {updateTrip} from '../../lib/trips/tripsStorage';
import {adaptWardrobeItem, buildCapsule, validateCapsule, detectPresentation, inferGarmentFlags, getActivityProfile} from '../../lib/trips/capsuleEngine';
import {normalizeGenderToPresentation} from '../../lib/trips/styleEligibility';
import {filterEligibleItems} from '../../lib/trips/styleEligibility';
import {PACKING_CATEGORY_ORDER} from '../../lib/trips/constants';
import {fetchRealWeather} from '../../lib/trips/weather/realWeather';
import {filterWardrobeByLocation} from '../../lib/trips/wardrobeLocationFilter';
import {useGenderPresentation} from '../../hooks/useGenderPresentation';
import WeatherStrip from '../../components/Trips/WeatherStrip';
import OutfitCarousel from '../../components/Trips/OutfitCarousel';
import PackingListSection from '../../components/Trips/PackingListSection';
import ItemReplaceModal from '../../components/Trips/ItemReplaceModal';
import ConfidenceSummary from '../../components/Trips/ConfidenceSummary';
import AppleTouchFeedback from '../../components/AppleTouchFeedback/AppleTouchFeedback';
import {apiClient} from '../../lib/apiClient';

type FashionStateSummary = {
  topBrands: string[];
  avoidBrands: string[];
  topColors: string[];
  avoidColors: string[];
  topStyles: string[];
  avoidStyles: string[];
  topCategories: string[];
  priceBracket: string | null;
  isColdStart: boolean;
};

async function getFashionStateSummary(): Promise<FashionStateSummary | null> {
  const res = await Promise.race([
    apiClient.get('/learning/summary'),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 100),
    ),
  ]);
  const data = res.data;
  if (!data.hasState) return null;
  return {
    topBrands: data.topPreferences?.brands ?? [],
    avoidBrands: data.negativePreferences?.brands ?? [],
    topColors: data.topPreferences?.colors ?? [],
    avoidColors: data.negativePreferences?.colors ?? [],
    topStyles: data.topPreferences?.styles ?? [],
    avoidStyles: data.negativePreferences?.styles ?? [],
    topCategories: [],
    priceBracket: null,
    isColdStart: data.isColdStart ?? true,
  };
}

type Props = {
  trip: Trip;
  wardrobe: any[];
  onBack: () => void;
  onRefresh: () => void;
  userGenderPresentation?: string;
};

const TripCapsuleScreen = ({trip, wardrobe, onBack, onRefresh, userGenderPresentation}: Props) => {
  const {theme} = useAppTheme();
  const [capsule, setCapsule] = useState<TripCapsule | null>(trip.capsule);
  const [warnings, setWarnings] = useState<CapsuleWarning[]>(trip.warnings || []);
  const [replaceItem, setReplaceItem] = useState<TripPackingItem | null>(null);
  const [isRebuilding, setIsRebuilding] = useState(false);

  const hookGender = useGenderPresentation();
  const rawGender = userGenderPresentation ?? hookGender;

  const adaptedWardrobe = useMemo(
    () => filterWardrobeByLocation(wardrobe, trip.startingLocationId ?? 'home').map(adaptWardrobeItem),
    [wardrobe, trip.startingLocationId],
  );

  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {styleProfile} = useStyleProfile(userId);

  const profileReady = !!styleProfile && Object.keys(styleProfile).length > 0;
  const lastProfileRef = useRef<typeof styleProfile | null>(null);

  useEffect(() => {
    if (profileReady) lastProfileRef.current = styleProfile;
  }, [profileReady, styleProfile]);

  const effectiveProfile = profileReady ? styleProfile : lastProfileRef.current;

  const styleHints: TripStyleHints | undefined = useMemo(() => {
    if (!effectiveProfile) return undefined;
    const hints: TripStyleHints = {};
    if (Array.isArray(effectiveProfile.fit_preferences) && effectiveProfile.fit_preferences.length > 0)
      hints.fit_preferences = effectiveProfile.fit_preferences;
    if (Array.isArray(effectiveProfile.fabric_preferences) && effectiveProfile.fabric_preferences.length > 0)
      hints.fabric_preferences = effectiveProfile.fabric_preferences;
    if (Array.isArray(effectiveProfile.favorite_colors) && effectiveProfile.favorite_colors.length > 0)
      hints.favorite_colors = effectiveProfile.favorite_colors;
    if (Array.isArray(effectiveProfile.preferred_brands) && effectiveProfile.preferred_brands.length > 0)
      hints.preferred_brands = effectiveProfile.preferred_brands;
    const rawDisliked = effectiveProfile.disliked_styles;
    if (typeof rawDisliked === 'string' && rawDisliked.trim()) {
      hints.disliked_styles = rawDisliked.split(/[,|]/).map((s: string) => s.trim()).filter(Boolean);
    } else if (Array.isArray(rawDisliked) && rawDisliked.length > 0) {
      hints.disliked_styles = rawDisliked.map(String).map((s: string) => s.trim()).filter(Boolean);
    }
    if (Array.isArray(effectiveProfile.avoid_colors) && effectiveProfile.avoid_colors.length > 0)
      hints.avoid_colors = effectiveProfile.avoid_colors;
    if (Array.isArray(effectiveProfile.avoid_materials) && effectiveProfile.avoid_materials.length > 0)
      hints.avoid_materials = effectiveProfile.avoid_materials;
    if (Array.isArray(effectiveProfile.avoid_patterns) && effectiveProfile.avoid_patterns.length > 0)
      hints.avoid_patterns = effectiveProfile.avoid_patterns;
    if (Array.isArray(effectiveProfile.coverage_no_go) && effectiveProfile.coverage_no_go.length > 0)
      hints.coverage_no_go = effectiveProfile.coverage_no_go;
    if (effectiveProfile.formality_floor && effectiveProfile.formality_floor !== 'No minimum')
      hints.formality_floor = effectiveProfile.formality_floor;
    if (effectiveProfile.walkability_requirement)
      hints.walkability_requirement = effectiveProfile.walkability_requirement;
    return Object.keys(hints).length > 0 ? hints : undefined;
  }, [effectiveProfile]);

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
    },
    [trip],
  );

  const handleRebuild = () => {
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
              const presentation = normalizeGenderToPresentation(rawGender) !== 'mixed'
                ? normalizeGenderToPresentation(rawGender)
                : detectPresentation(adaptedWardrobe);

              const weatherResult = await fetchRealWeather(
                trip.destination, trip.startDate, trip.endDate,
                {bypassCache: true, reason: 'FORCE_REBUILD'},
              );
              const fsSummary = await getFashionStateSummary().catch(() => null);
              const newCapsule = buildCapsule(
                adaptedWardrobe, weatherResult.days, trip.activities,
                trip.startingLocationLabel, presentation, styleHints,
                fsSummary ?? null, trip.destination,
              );
              const validationWarnings = validateCapsule(
                newCapsule, weatherResult.days, trip.activities, adaptedWardrobe, presentation,
              );
              const newWarnings = [...(newCapsule.warnings ?? []), ...validationWarnings];

              setCapsule(newCapsule);
              setWarnings(newWarnings);
              await updateTrip({
                ...trip,
                weather: weatherResult.days,
                weatherSource: weatherResult.source,
                capsule: newCapsule,
                warnings: newWarnings.length > 0 ? newWarnings : undefined,
              });
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
  };

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

      const newOutfits = capsule.outfits.map(outfit => ({
        ...outfit,
        items: outfit.items.map(item =>
          item.wardrobeItemId === oldWardrobeId ? newItem : item,
        ),
      }));

      const allItems = newOutfits.flatMap(o => o.items);
      const uniqueMap = new Map<string, TripPackingItem>();
      for (const item of allItems) {
        if (!uniqueMap.has(item.wardrobeItemId)) {
          uniqueMap.set(item.wardrobeItemId, item);
        }
      }

      const grouped = new Map<string, TripPackingItem[]>();
      for (const item of uniqueMap.values()) {
        const displayCat = PACKING_CATEGORY_ORDER.includes(item.mainCategory)
          ? item.mainCategory
          : 'Other';
        if (!grouped.has(displayCat)) grouped.set(displayCat, []);
        grouped.get(displayCat)!.push(item);
      }

      const newPackingList: PackingGroup[] = PACKING_CATEGORY_ORDER
        .filter(cat => grouped.has(cat))
        .map(cat => ({
          category: cat,
          items: grouped.get(cat)!,
        }));

      persistCapsule({...capsule, outfits: newOutfits, packingList: newPackingList});
      setReplaceItem(null);
    },
    [capsule, replaceItem, persistCapsule],
  );

  const resolvedPresentation = useMemo(() => {
    const fromProfile = normalizeGenderToPresentation(rawGender);
    return fromProfile !== 'mixed' ? fromProfile : detectPresentation(adaptedWardrobe);
  }, [rawGender, adaptedWardrobe]);

  const tripHasFormalActivity = useMemo(
    () => trip.activities.some(a => getActivityProfile(a).formality >= 2),
    [trip.activities],
  );

  const replaceAlternatives = useMemo(() => {
    if (!replaceItem) return [];
    const cat = replaceItem.mainCategory;
    const catMatches = adaptedWardrobe.filter(
      item => (item.main_category || 'Other') === cat,
    );
    let eligible = filterEligibleItems(catMatches, resolvedPresentation);
    if (tripHasFormalActivity) {
      eligible = eligible.filter(item => !inferGarmentFlags(item).isCasualOnly);
    }
    return eligible;
  }, [replaceItem, adaptedWardrobe, resolvedPresentation, tripHasFormalActivity]);

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
        <Text style={styles.sectionTitle}>Weather</Text>
        <WeatherStrip weather={trip.weather ?? []} source={trip.weatherSource} />

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

        <ConfidenceSummary
          weather={trip.weather ?? []}
          activities={trip.activities}
          packingList={capsule.packingList}
        />

        <View style={styles.mainLooksHeader}>
          <Text style={styles.mainLooksTitle}>Your Main Looks</Text>
          <Text style={styles.mainLooksSubtitle}>
            Designed for key moments. We've packed everything else below.
          </Text>
        </View>
        <OutfitCarousel outfits={capsule.outfits} tripBackupKit={capsule.tripBackupKit} />

        <View style={{marginTop: tokens.spacing.lg}}>
          <PackingListSection
            packingList={capsule.packingList}
            tripBackupKit={capsule.tripBackupKit}
            onTogglePacked={handleTogglePacked}
            onReplaceItem={setReplaceItem}
          />
        </View>
      </ScrollView>

      <ItemReplaceModal
        visible={!!replaceItem}
        currentItem={replaceItem}
        alternatives={replaceAlternatives}
        locationLabel={trip.startingLocationLabel ?? 'Home'}
        onReplace={handleReplaceItem}
        onClose={() => setReplaceItem(null)}
      />
    </View>
  );
};

export default TripCapsuleScreen;
