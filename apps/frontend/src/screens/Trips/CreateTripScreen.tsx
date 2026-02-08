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
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialIcons';
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
  saveTrip,
} from '../../lib/trips/tripsStorage';
import {fetchRealWeather} from '../../lib/trips/weather/realWeather';
import {buildCapsule, adaptWardrobeItem} from '../../lib/trips/capsuleEngine';
import ActivityChips from '../../components/Trips/ActivityChips';
import AppleTouchFeedback from '../../components/AppleTouchFeedback/AppleTouchFeedback';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

type Props = {
  wardrobe: any[];
  onBack: () => void;
  onTripCreated: (trip: Trip) => void;
};

const CreateTripScreen = ({wardrobe, onBack, onTripCreated}: Props) => {
  const {theme} = useAppTheme();

  const [destination, setDestination] = useState('');
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
    if (!newLocationName.trim()) return;
    const loc = await addClosetLocation(newLocationName);
    setLocations(prev => [...prev, loc]);
    setSelectedLocationId(loc.id);
    setNewLocationName('');
  };

  const handleBuildCapsule = async () => {
    if (!destination.trim()) return;
    setIsBuilding(true);

    // Small delay for premium feel
    await new Promise(r => setTimeout(r, 600));

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    const weather = await fetchRealWeather(destination, startStr, endStr);
    const locationLabel =
      locations.find(l => l.id === selectedLocationId)?.label || 'Home';
    const adapted = wardrobe.map(adaptWardrobeItem);
    const capsule = buildCapsule(adapted, weather, activities, locationLabel);

    const trip: Trip = {
      id: generateId(),
      destination: destination.trim(),
      startDate: startStr,
      endDate: endStr,
      activities,
      startingLocationId: selectedLocationId,
      startingLocationLabel: locationLabel,
      weather,
      capsule,
      createdAt: new Date().toISOString(),
    };

    await saveTrip(trip);
    setIsBuilding(false);
    onTripCreated(trip);
  };

  const selectedLocation = locations.find(l => l.id === selectedLocationId);
  const isValid = destination.trim().length > 0;

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
          <TextInput
            style={styles.input}
            value={destination}
            onChangeText={setDestination}
            placeholder="Where are you going?"
            placeholderTextColor={theme.colors.foreground2}
            autoCapitalize="words"
            returnKeyType="done"
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
    </View>
  );
};

export default CreateTripScreen;
