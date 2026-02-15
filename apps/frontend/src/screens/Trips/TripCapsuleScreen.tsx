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
import {adaptWardrobeItem, buildCapsule, validateCapsule, CAPSULE_VERSION, shouldRebuildCapsule, detectPresentation, buildCapsuleFingerprint, RebuildMode, inferGarmentFlags, getActivityProfile} from '../../lib/trips/capsuleEngine';
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

type Props = {
  trip: Trip;
  wardrobe: any[];
  onBack: () => void;
  onRefresh: () => void;
  userGenderPresentation?: string;
};

/** DEV failsafe: buildCapsule must never be called while an old capsule exists */
function assertCapsuleWiped(currentCapsule: TripCapsule | null, context: string) {
  if (__DEV__ && currentCapsule) {
    console.warn(
      `[TripCapsule] FAILSAFE: buildCapsule called with existing capsule — invalid rebuild (${context})`,
    );
  }
}

const TripCapsuleScreen = ({trip, wardrobe, onBack, onRefresh, userGenderPresentation}: Props) => {
  const {theme} = useAppTheme();
  const [capsule, setCapsule] = useState<TripCapsule | null>(trip.capsule);
  const [warnings, setWarnings] = useState<CapsuleWarning[]>(trip.warnings || []);
  const [replaceItem, setReplaceItem] = useState<TripPackingItem | null>(null);
  const [isRebuilding, setIsRebuilding] = useState(false);

  // Resolve presentation: explicit prop > hook > wardrobe detection
  const hookGender = useGenderPresentation();
  const rawGender = userGenderPresentation ?? hookGender;

  const adaptedWardrobe = useMemo(
    () => filterWardrobeByLocation(wardrobe, trip.startingLocationId ?? 'home').map(adaptWardrobeItem),
    [wardrobe, trip.startingLocationId],
  );

  // Fetch style profile for capsule hints (fail-open — undefined if unavailable)
  const {user} = useAuth0();
  const userId = user?.sub || '';
  const {styleProfile} = useStyleProfile(userId);
  const styleHints: TripStyleHints | undefined = useMemo(() => {
    if (!styleProfile) return undefined;
    const hints: TripStyleHints = {};
    if (Array.isArray(styleProfile.fit_preferences) && styleProfile.fit_preferences.length > 0)
      hints.fit_preferences = styleProfile.fit_preferences;
    if (Array.isArray(styleProfile.fabric_preferences) && styleProfile.fabric_preferences.length > 0)
      hints.fabric_preferences = styleProfile.fabric_preferences;
    if (Array.isArray(styleProfile.favorite_colors) && styleProfile.favorite_colors.length > 0)
      hints.favorite_colors = styleProfile.favorite_colors;
    if (Array.isArray(styleProfile.preferred_brands) && styleProfile.preferred_brands.length > 0)
      hints.preferred_brands = styleProfile.preferred_brands;
    return Object.keys(hints).length > 0 ? hints : undefined;
  }, [styleProfile]);

  // Auto-rebuild stale capsules (created before current engine version)
  const didRebuildRef = useRef(false);

  useEffect(() => {
    const presentation = normalizeGenderToPresentation(rawGender) !== 'mixed'
      ? normalizeGenderToPresentation(rawGender)
      : detectPresentation(adaptedWardrobe);
    const fingerprint = buildCapsuleFingerprint(
      adaptedWardrobe,
      trip.weather || [],
      trip.activities,
      trip.startingLocationLabel,
      presentation,
      styleHints,
    );
    const {rebuild: needsRebuild, reason, mode} = shouldRebuildCapsule(
      capsule ?? undefined,
      CAPSULE_VERSION,
      presentation,
      fingerprint,
    );

    if (__DEV__) {
      console.log(
        `[TripCapsule] trip=${trip.id} capsuleVersion=${capsule?.version ?? 0} engineVersion=${CAPSULE_VERSION} mode=${mode} action=${needsRebuild ? 'REBUILD' : 'SKIP'} reason=${reason}`,
      );
    }

 if (didRebuildRef.current) return;

// DEV: force rebuild so capsuleEngine logging runs
if (__DEV__) {
  console.log('[TripCapsule] DEV forcing rebuild for logging');
} else if (!needsRebuild) {
  return;
}

didRebuildRef.current = true;


    let cancelled = false;

    (async () => {
      try {
        // HARD RESET: delete old capsule before rebuilding
        if (__DEV__) {
          console.log('[TripCapsule] HARD RESET: deleting old capsule', trip.id);
        }
        const wipedTrip: Trip = {
          ...trip,
          capsule: null,
          warnings: undefined,
        };
        setCapsule(null);
        setWarnings([]);
        await updateTrip(wipedTrip);

        const weatherResult = await fetchRealWeather(
          trip.destination,
          trip.startDate,
          trip.endDate,
          __DEV__ ? {bypassCache: true, reason: 'DEV_FORCE_REBUILD'} : undefined,
        );
        if (cancelled) return;

        // Rebuild from clean state
        assertCapsuleWiped(wipedTrip.capsule, 'auto-rebuild');
        const newCapsule = buildCapsule(
          adaptedWardrobe,
          weatherResult.days,
          trip.activities,
          trip.startingLocationLabel,
          presentation,
          styleHints,
        );
        if (__DEV__) {
          console.log('[TripCapsule] Rebuilding fresh capsule', newCapsule.build_id, 'presentation:', presentation);
        }
        const newWarnings = validateCapsule(
          newCapsule,
          weatherResult.days,
          trip.activities,
          adaptedWardrobe,
          presentation,
        );
        if (cancelled) return;

        setCapsule(newCapsule);
        setWarnings(newWarnings);
        const updated: Trip = {
          ...wipedTrip,
          weather: weatherResult.days,
          weatherSource: weatherResult.source,
          capsule: newCapsule,
          warnings: newWarnings.length > 0 ? newWarnings : undefined,
        };
        await updateTrip(updated);
        onRefresh();
      } catch (err) {
        console.error('[TripCapsule] auto-rebuild failed:', err);
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              // FORCE REBUILD: hard reset — ignores version/fingerprint/dress-leak
              if (__DEV__) {
                console.log(`[TripCapsule] FORCE REBUILD: deleting old capsule trip=${trip.id}`);
              }
              const wipedTrip: Trip = {
                ...trip,
                capsule: null,
                warnings: undefined,
              };
              setCapsule(null);
              setWarnings([]);
              await updateTrip(wipedTrip);

              // Rebuild from clean state
              assertCapsuleWiped(wipedTrip.capsule, 'FORCE');
              const weatherResult = await fetchRealWeather(
                trip.destination,
                trip.startDate,
                trip.endDate,
                {bypassCache: true, reason: 'FORCE_REBUILD'},
              );
              const forcePresentation = normalizeGenderToPresentation(rawGender) !== 'mixed'
                ? normalizeGenderToPresentation(rawGender)
                : detectPresentation(adaptedWardrobe);
              const newCapsule = buildCapsule(
                adaptedWardrobe,
                weatherResult.days,
                trip.activities,
                trip.startingLocationLabel,
                forcePresentation,
                styleHints,
              );
              if (__DEV__) {
                console.log(`[TripCapsule] FORCE REBUILD trip=${trip.id} build=${newCapsule.build_id} presentation=${forcePresentation}`);
              }
              const newWarnings = validateCapsule(newCapsule, weatherResult.days, trip.activities, adaptedWardrobe, forcePresentation);

              const updated: Trip = {
                ...wipedTrip,
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

      persistCapsule({outfits: newOutfits, packingList: newPackingList});
      setReplaceItem(null);
    },
    [capsule, replaceItem, persistCapsule],
  );

  // Resolve presentation for replace modal filtering
  const resolvedPresentation = useMemo(() => {
    const fromProfile = normalizeGenderToPresentation(rawGender);
    return fromProfile !== 'mixed' ? fromProfile : detectPresentation(adaptedWardrobe);
  }, [rawGender, adaptedWardrobe]);

  // Does this trip include formal activities? (formality >= 2)
  const tripHasFormalActivity = useMemo(
    () => trip.activities.some(a => getActivityProfile(a).formality >= 2),
    [trip.activities],
  );

  // Get alternatives for the replace modal — filtered by eligibility + formality
  const replaceAlternatives = useMemo(() => {
    if (!replaceItem) return [];
    const cat = replaceItem.mainCategory;
    const catMatches = adaptedWardrobe.filter(
      item => (item.main_category || 'Other') === cat,
    );
    let eligible = filterEligibleItems(catMatches, resolvedPresentation);
    // If trip includes formal activities, block casual-only items from replacements
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
        <OutfitCarousel outfits={capsule.outfits} tripBackupKit={capsule.tripBackupKit} />

        {/* Packing List */}
        <View style={{marginTop: tokens.spacing.lg}}>
          <PackingListSection
            packingList={capsule.packingList}
            tripBackupKit={capsule.tripBackupKit}
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
