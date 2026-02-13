import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {syncTripToIOSCalendar} from '../../utils/tripCalendarSync';
import {useAppTheme} from '../../context/ThemeContext';
import {tokens} from '../../styles/tokens/tokens';
import {
  Trip,
  TripActivity,
  ClosetLocation,
} from '../../types/trips';
import {
  getClosetLocations,
  addClosetLocation,
  updateClosetLocation,
  removeClosetLocation,
  saveTrip,
} from '../../lib/trips/tripsStorage';
import {fetchRealWeather, setResolvedLocation} from '../../lib/trips/weather/realWeather';
import {buildCapsule, adaptWardrobeItem, validateCapsule, detectPresentation} from '../../lib/trips/capsuleEngine';
import {filterWardrobeByLocation} from '../../lib/trips/wardrobeLocationFilter';
import {normalizeGenderToPresentation} from '../../lib/trips/styleEligibility';
import {useGenderPresentation} from '../../hooks/useGenderPresentation';
import ActivityChips from '../../components/Trips/ActivityChips';
import AppleTouchFeedback from '../../components/AppleTouchFeedback/AppleTouchFeedback';
import DestinationInput from './DestinationInput';
import {GeocodeSuggestion} from './useGeocodeSearch';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

type Props = {
  wardrobe: any[];
  onBack: () => void;
  onTripCreated: (trip: Trip) => void;
  userGenderPresentation?: string;
};

const CreateTripScreen = ({wardrobe, onBack, onTripCreated, userGenderPresentation}: Props) => {
  const {theme} = useAppTheme();
  const hookGender = useGenderPresentation();
  const rawGender = userGenderPresentation ?? hookGender;

  const [selectedDestination, setSelectedDestination] = useState<GeocodeSuggestion | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 11);
    return d;
  });
  const [activities, setActivities] = useState<TripActivity[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState('home');
  const [locations, setLocations] = useState<ClosetLocation[]>([]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [isBuilding, setIsBuilding] = useState(false);

  // Edit-location state
  const [editingLocation, setEditingLocation] = useState<ClosetLocation | null>(null);
  const [editLocName, setEditLocName] = useState('');
  const [editLocColor, setEditLocColor] = useState('');

  useEffect(() => {
    getClosetLocations().then(setLocations);
  }, []);

  const toggleActivity = (activity: TripActivity) => {
    setActivities(prev =>
      prev.includes(activity)
        ? prev.filter(a => a !== activity)
        : [...prev, activity],
    );
  };

  const handleAddLocation = async () => {
    const trimmed = newLocationName.trim();
    if (!trimmed) return;
    const isDuplicate = locations.some(
      l => l.label.toLowerCase() === trimmed.toLowerCase(),
    );
    if (isDuplicate) {
      Alert.alert('Duplicate', 'A location with that name already exists.');
      return;
    }
    const loc = await addClosetLocation(trimmed);
    if (!loc) {
      Alert.alert('Error', "Couldn't save location. Please try again.");
      return;
    }
    setLocations(prev => [...prev, loc]);
    setSelectedLocationId(loc.id);
    setNewLocationName('');
  };

  const EDIT_COLOR_OPTIONS: {key: string; label: string}[] = [
    {key: 'success', label: 'Green'},
    {key: 'button4', label: 'Blue'},
    {key: 'warning', label: 'Yellow'},
    {key: '_pink', label: 'Pink'},
    {key: 'error', label: 'Red'},
    {key: 'secondary', label: 'Teal'},
    {key: 'muted', label: 'Gray'},
  ];
  const FIXED_COLORS: Record<string, string> = {_pink: '#FF69B4'};
  const resolveColor = (key: string) => FIXED_COLORS[key] ?? (theme.colors as any)[key] ?? theme.colors.foreground2;

  const openEditLocation = (loc: ClosetLocation) => {
    if (loc.id === 'home') return;
    // Close picker first so two Modals never overlap
    setShowLocationModal(false);
    setTimeout(() => {
      setEditLocName(loc.label);
      setEditLocColor(loc.color ?? '');
      setEditingLocation(loc);
    }, 0);
  };

  const returnToPicker = () => {
    setEditingLocation(null);
    setTimeout(() => setShowLocationModal(true), 0);
  };

  const handleSaveEditLocation = async () => {
    if (!editingLocation) return;
    const updates: {label?: string; color?: string} = {};
    const trimmedName = editLocName.trim();
    if (trimmedName && trimmedName !== editingLocation.label) {
      updates.label = trimmedName;
    }
    if (editLocColor !== (editingLocation.color ?? '')) {
      updates.color = editLocColor;
    }
    if (Object.keys(updates).length === 0) {
      returnToPicker();
      return;
    }
    const ok = await updateClosetLocation(editingLocation.id, updates);
    if (!ok) {
      Alert.alert('Error', 'Could not update. Name may already be in use.');
      return;
    }
    const fresh = await getClosetLocations();
    setLocations(fresh);
    returnToPicker();
  };

  const handleDeleteEditLocation = async () => {
    if (!editingLocation || editingLocation.id === 'home') return;
    Alert.alert(
      'Remove Location',
      `Remove "${editingLocation.label}"? Items and trips using it will be moved to Home.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeClosetLocation(editingLocation.id);
            const fresh = await getClosetLocations();
            setLocations(fresh);
            if (selectedLocationId === editingLocation.id) {
              setSelectedLocationId('home');
            }
            returnToPicker();
          },
        },
      ],
    );
  };

  const handleBuildCapsule = async () => {
    if (!selectedDestination?.lat || !selectedDestination?.lng) {
      Alert.alert('Select Destination', 'Please select a valid destination from the list.');
      return;
    }
    setIsBuilding(true);

    try {
      // Small delay for premium feel
      await new Promise(r => setTimeout(r, 600));

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      // Pre-populate resolved location cache so weather fetch uses correct coordinates
      await setResolvedLocation(selectedDestination.displayName, {
        lat: selectedDestination.lat,
        lng: selectedDestination.lng,
        resolvedCity: selectedDestination.displayName,
      });
      const weatherResult = await fetchRealWeather(selectedDestination.displayName, startStr, endStr);
      const locationLabel =
        locations.find(l => l.id === selectedLocationId)?.label || 'Home';
      const locationWardrobe = filterWardrobeByLocation(wardrobe, selectedLocationId);
      const adapted = locationWardrobe.map(adaptWardrobeItem);
      const presentation = normalizeGenderToPresentation(rawGender) !== 'mixed'
        ? normalizeGenderToPresentation(rawGender)
        : detectPresentation(adapted);
      const capsule = buildCapsule(adapted, weatherResult.days, activities, locationLabel, presentation);
      const warnings = validateCapsule(capsule, weatherResult.days, activities, adapted, presentation);

      const trip: Trip = {
        id: generateId(),
        destination: selectedDestination.displayName,
        destinationLat: selectedDestination.lat,
        destinationLng: selectedDestination.lng,
        destinationPlaceKey: selectedDestination.placeKey,
        startDate: startStr,
        endDate: endStr,
        activities,
        startingLocationId: selectedLocationId,
        startingLocationLabel: locationLabel,
        weather: weatherResult.days,
        weatherSource: weatherResult.source,
        capsule,
        warnings: warnings.length > 0 ? warnings : undefined,
        createdAt: new Date().toISOString(),
      };

      const saved = await saveTrip(trip);
      if (!saved) {
        Alert.alert('Save Error', "Couldn't save your trip. Please try again.");
        setIsBuilding(false);
        return;
      }
      try {
        await syncTripToIOSCalendar(trip);
      } catch (syncErr) {
        console.error('[CreateTrip] iOS calendar sync failed:', syncErr);
        Alert.alert(
          'Calendar Sync',
          'Trip saved, but couldn\'t add to your iOS Calendar. It will sync on next app open.',
        );
      }
      setIsBuilding(false);
      onTripCreated(trip);
    } catch (err) {
      console.error('[CreateTrip] handleBuildCapsule failed:', err);
      Alert.alert('Error', 'Something went wrong building your capsule. Please try again.');
      setIsBuilding(false);
    }
  };

  const selectedLocation = locations.find(l => l.id === selectedLocationId);
  const isValid = selectedDestination !== null;

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
      paddingBottom: tokens.spacing.md,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.colors.foreground,
    },
    scrollContent: {
      paddingHorizontal: tokens.spacing.lg,
      paddingBottom: 120,
    },
    section: {
      marginBottom: 28,
    },
    label: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.foreground2,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 10,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderRadius: tokens.borderRadius.lg,
      borderWidth: tokens.borderWidth.hairline,
      borderColor: theme.colors.surfaceBorder,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: theme.colors.foreground,
      fontWeight: '500',
    },
    dateRow: {
      flexDirection: 'row',
      gap: 14,
    },
    dateField: {
      flex: 1,
    },
    dateLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.foreground2,
      marginBottom: 6,
    },
    datePickerWrap: {
      backgroundColor: theme.colors.surface,
      borderRadius: tokens.borderRadius.lg,
      borderWidth: tokens.borderWidth.hairline,
      borderColor: theme.colors.surfaceBorder,
      paddingHorizontal: 8,
      paddingVertical: Platform.OS === 'ios' ? 4 : 10,
      alignItems: 'flex-start',
    },
    locationBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surface,
      borderRadius: tokens.borderRadius.lg,
      borderWidth: tokens.borderWidth.hairline,
      borderColor: theme.colors.surfaceBorder,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    locationText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.foreground,
    },
    ctaWrap: {
      paddingHorizontal: tokens.spacing.lg,
      paddingVertical: tokens.spacing.lg,
      position: 'absolute',
      bottom: 80,
      left: 0,
      right: 0,
    },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: theme.colors.button1,
      paddingVertical: 16,
      borderRadius: tokens.borderRadius.full,
    },
    ctaDisabled: {
      opacity: 0.4,
    },
    ctaText: {
      fontSize: 17,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    // Location modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 40,
      maxHeight: '60%',
    },
    modalHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.surfaceBorder,
      alignSelf: 'center',
      marginTop: 12,
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.foreground,
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    locationOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    locationOptionText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.foreground,
      flex: 1,
    },
    addLocationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 20,
      paddingTop: 16,
      borderTopWidth: tokens.borderWidth.hairline,
      borderTopColor: theme.colors.surfaceBorder,
      marginTop: 8,
    },
    addLocationInput: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: tokens.borderRadius.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.colors.foreground,
    },
    addBtn: {
      backgroundColor: theme.colors.button1,
      borderRadius: tokens.borderRadius.md,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    addBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });

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
        <Text style={styles.headerTitle}>New Trip</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.label}>Destination</Text>
          <DestinationInput
            value={selectedDestination}
            onSelect={setSelectedDestination}
            onClear={() => setSelectedDestination(null)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Dates</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>Start</Text>
              <View style={styles.datePickerWrap}>
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="compact"
                  minimumDate={new Date()}
                  onChange={(_e, date) => {
                    if (date) {
                      setStartDate(date);
                      if (date >= endDate) {
                        const next = new Date(date);
                        next.setDate(next.getDate() + 1);
                        setEndDate(next);
                      }
                    }
                  }}
                  accentColor={theme.colors.button1}
                />
              </View>
            </View>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>End</Text>
              <View style={styles.datePickerWrap}>
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display="compact"
                  minimumDate={
                    new Date(startDate.getTime() + 86400000)
                  }
                  onChange={(_e, date) => {
                    if (date) setEndDate(date);
                  }}
                  accentColor={theme.colors.button1}
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Starting Closet</Text>
          <AppleTouchFeedback
            onPress={() => setShowLocationModal(true)}
            hapticStyle="impactLight">
            <View style={styles.locationBtn}>
              <Text style={styles.locationText}>
                {selectedLocation?.label || 'Select location'}
              </Text>
              <Icon
                name="expand-more"
                size={20}
                color={theme.colors.foreground2}
              />
            </View>
          </AppleTouchFeedback>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Activities</Text>
          <ActivityChips selected={activities} onToggle={toggleActivity} />
        </View>
      </ScrollView>

      <View style={styles.ctaWrap}>
        <AppleTouchFeedback
          onPress={isValid && !isBuilding ? handleBuildCapsule : undefined}
          hapticStyle="impactMedium">
          <View style={[styles.cta, (!isValid || isBuilding) && styles.ctaDisabled]}>
            {isBuilding ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Icon name="auto-awesome" size={20} color="#FFFFFF" />
            )}
            <Text style={styles.ctaText}>
              {isBuilding ? 'Building...' : 'Build My Capsule'}
            </Text>
          </View>
        </AppleTouchFeedback>
      </View>

      {/* Location Picker Modal */}
      <Modal
        visible={showLocationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowLocationModal(false)}>
          <Pressable
            style={styles.modalSheet}
            onPress={e => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Starting Closet</Text>
            <ScrollView>
              {locations.map(loc => (
                <AppleTouchFeedback
                  key={loc.id}
                  onPress={() => {
                    setSelectedLocationId(loc.id);
                    setShowLocationModal(false);
                  }}
                  onLongPress={() => openEditLocation(loc)}
                  hapticStyle="impactLight">
                  <View style={styles.locationOption}>
                    <Icon
                      name={
                        loc.id === selectedLocationId
                          ? 'radio-button-checked'
                          : 'radio-button-unchecked'
                      }
                      size={20}
                      color={
                        loc.id === selectedLocationId
                          ? theme.colors.button1
                          : theme.colors.foreground2
                      }
                    />
                    <Text style={styles.locationOptionText}>{loc.label}</Text>
                    {loc.id !== 'home' && (
                      <Text style={{fontSize: 11, color: theme.colors.foreground2, opacity: 0.5}}>
                        Hold to edit
                      </Text>
                    )}
                  </View>
                </AppleTouchFeedback>
              ))}
            </ScrollView>
            <View style={styles.addLocationRow}>
              <TextInput
                style={styles.addLocationInput}
                value={newLocationName}
                onChangeText={setNewLocationName}
                placeholder="Add custom location..."
                placeholderTextColor={theme.colors.foreground2}
                returnKeyType="done"
                onSubmitEditing={handleAddLocation}
              />
              <AppleTouchFeedback
                onPress={handleAddLocation}
                hapticStyle="impactLight">
                <View style={styles.addBtn}>
                  <Text style={styles.addBtnText}>Add</Text>
                </View>
              </AppleTouchFeedback>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit Location Modal */}
      <Modal
        visible={editingLocation !== null}
        transparent
        animationType="fade"
        onRequestClose={returnToPicker}>
        <Pressable
          style={styles.modalOverlay}
          onPress={returnToPicker}>
          <Pressable
            style={[styles.modalSheet, {justifyContent: 'center', paddingHorizontal: 20, paddingTop: 20}]}
            onPress={e => e.stopPropagation()}>
            <Text style={[styles.modalTitle, {paddingHorizontal: 0}]}>Edit Location</Text>

            {/* Rename */}
            <Text style={{fontSize: 12, color: theme.colors.foreground2, marginBottom: 4}}>Name</Text>
            <TextInput
              style={[styles.addLocationInput, {marginBottom: 14}]}
              value={editLocName}
              onChangeText={setEditLocName}
              placeholder="Location name"
              placeholderTextColor={theme.colors.foreground2}
            />

            {/* Color Picker */}
            <Text style={{fontSize: 12, color: theme.colors.foreground2, marginBottom: 6}}>Color</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 16}}>
              {EDIT_COLOR_OPTIONS.map(opt => {
                const isActive = editLocColor === opt.key;
                const dotColor = resolveColor(opt.key);
                return (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => setEditLocColor(opt.key)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: dotColor,
                      marginRight: 10,
                      borderWidth: isActive ? 3 : 1,
                      borderColor: isActive ? theme.colors.foreground : theme.colors.surfaceBorder,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                    {isActive && (
                      <Icon name="check" size={16} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Delete */}
            <TouchableOpacity onPress={handleDeleteEditLocation} style={{marginBottom: 14}}>
              <Text style={{fontSize: 14, color: '#FF3B30', fontWeight: '600'}}>
                Delete Location
              </Text>
            </TouchableOpacity>

            {/* Actions */}
            <View style={{flexDirection: 'row', gap: 10}}>
              <AppleTouchFeedback
                onPress={returnToPicker}
                hapticStyle="impactLight">
                <View style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  borderRadius: tokens.borderRadius.md,
                  alignItems: 'center',
                  backgroundColor: theme.colors.surface,
                }}>
                  <Text style={{fontSize: 15, color: theme.colors.foreground, fontWeight: '600'}}>Cancel</Text>
                </View>
              </AppleTouchFeedback>
              <AppleTouchFeedback
                onPress={handleSaveEditLocation}
                hapticStyle="impactLight">
                <View style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  borderRadius: tokens.borderRadius.md,
                  alignItems: 'center',
                  backgroundColor: theme.colors.button1,
                }}>
                  <Text style={{fontSize: 15, color: '#FFFFFF', fontWeight: '600'}}>Save</Text>
                </View>
              </AppleTouchFeedback>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default CreateTripScreen;
